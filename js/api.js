/**
 * ============================================================================
 * ooG (우그) — API 경계  ·  Sprint 25
 * ----------------------------------------------------------------------------
 * "UI 와 store 는 그대로 두고, 데이터의 출처만 갈아끼운다."
 *
 * 지금 앱은 localStorage(로컬 어댑터)로 100% 돌아간다. 그런데 화면·store 가
 * 서버 주소나 fetch 를 직접 알면, 나중에 인증·지역 게시판·2시간 프로필 부스트·
 * 비밀앨범 권한을 실제 백엔드로 옮길 때 화면 코드를 다시 손봐야 한다.
 * 그래서 이 파일이 **한 겹의 비동기 경계**를 만든다.
 *
 *   화면(app.js) ──▶ store (지금 그대로, 동기)
 *        └────────▶ OOGAPI.call('album.add', …)  ◀── 서버로 바꿀 자리
 *                        │
 *                        ├─ 로컬 어댑터 : store 의 같은 규칙을 그대로 호출 (오프라인 100%)
 *                        └─ (미래) HTTP 어댑터 : fetch('/api/…')  ← 이 파일만 추가
 *
 * 계약(contract) — 모든 호출은 같은 봉투(envelope)를 쓴다.
 *   요청   { requestId, endpoint, params, idempotencyKey, at }
 *   응답   { ok, data, error:{ code, message, retryable, details }, meta:{ requestId, ms, source, attempts, queued } }
 *   오류   { code: 'validation' | 'not_found' | 'conflict' | 'unauthorized' |
 *                   'rate_limited' | 'timeout' | 'network' | 'unavailable' | 'server' }
 *
 * 함께 들어 있는 것
 *   · 엔드포인트 표(ENDPOINTS) — 이름·메서드·변경 여부·파라미터 스키마·응답 형태
 *   · 파라미터 검증과 응답 정규화(모르는 필드는 버리고, 필수 필드는 채운다)
 *   · 재시도(지수 백오프 + 지터) · 타임아웃 · 취소
 *   · 오프라인 쓰기 큐(저장 → 온라인 복귀/수동 flush 때 순서대로 재생)
 *   · 낙관적 업데이트(apply / commit / rollback) — 실패하면 화면 상태를 되돌린다
 *   · 요청 로그(최근 60건) · health()
 *   · store 연동(bindApi) + 저장 상태의 쓰기 경계(storageAdapter)
 *
 * 사용 예
 *   await OOGAPI.call('album.add', { kind: 'secret', dataUrl });
 *   await OOGAPI.optimistic({ endpoint: 'album.share.set', params, apply, rollback });
 *   OOGAPI.switchAdapter(createHttpAdapter({ baseUrl: '/api' }));   // 나중에 서버로
 * ============================================================================
 */
(function (global) {
  'use strict';

  const CONTRACT = 'ooG-api/1';
  const QUEUE_KEY = 'oog_api_queue_v1';
  const LOG_LIMIT = 60;
  const QUEUE_LIMIT = 50;

  /* ------------------------------------------------------------------
   * Sprint 26.5 — 앨범 업로드 스펙 (store.js 의 OOG_ALBUM_SPEC 과 같은 값)
   *  · 화질을 올릴 때 store.js 의 두 값만 바꾸면 이 경계도 같이 따라간다.
   *  · 여기서는 서버가 받을 상한(장당 data URL 길이)도 함께 정한다.
   * ------------------------------------------------------------------ */
  const ALBUM_SPEC = (global && global.OOG_ALBUM_SPEC) || { maxDimension: 720, jpegQuality: 0.84, max: 4 };
  const ALBUM_MAX_DIMENSION = ALBUM_SPEC.maxDimension;
  const ALBUM_JPEG_QUALITY = ALBUM_SPEC.jpegQuality;
  /* 720px JPEG 는 보통 80~180KB → data URL 로 250KB 안팎. 화질을 1080·1440으로 올려도
     6MB 를 넘지 않으므로, 그 위는 서버가 아니라 잘못된 입력으로 본다. */
  const ALBUM_DATAURL_MAX = 6 * 1024 * 1024;

  /* ------------------------------------------------------------------ 오류 */
  class ApiError extends Error {
    constructor(code, message, meta) {
      super(message || code);
      this.name = 'ApiError';
      this.code = code;
      this.details = (meta && meta.details) || null;
      this.status = (meta && meta.status) || 0;
    }
  }

  const RETRYABLE = new Set(['timeout', 'network', 'unavailable', 'rate_limited', 'server']);

  function normalizeError(err) {
    if (err instanceof ApiError) return err;
    if (!err) return new ApiError('unavailable', '요청을 처리하지 못했어요');
    if (err.code && typeof err.code === 'string') return new ApiError(err.code, err.message, { details: err.details });
    return new ApiError('server', err.message || String(err));
  }

  /* --------------------------------------------------------------- 스키마 */
  // 파라미터 스키마: { 필드: { type, required, max, min, enum, pattern } }
  const ENDPOINTS = {
    'auth.session': {
      method: 'GET', mutate: false, params: {},
      response: ['user', 'signedIn'],
      local: (store) => ({
        user: publicUser(store),
        signedIn: typeof store.isSignedIn === 'function'
          ? store.isSignedIn()
          : !!(store.state.currentUser && store.state.currentUser.signedIn)
      })
    },
    'auth.signOut': {
      method: 'POST', mutate: true, params: {},
      response: ['ok'],
      local: (store) => { store.signOut(); return { ok: true }; }
    },
    'region.list': {
      method: 'GET', mutate: false, params: { filter: { type: 'string', optional: true } },
      response: ['groups', 'districts'],
      local: (store) => ({
        groups: (store.getExploreRegionChips ? store.getExploreRegionChips('all', '', 'all') : []).map((c) => ({
          id: c.id, name: c.name, count: c.count, group: !!c.group
        })),
        districts: (store.getExploreRegions ? store.getExploreRegions() : []).map((r) => ({
          id: r.id, name: r.name, groupId: r.groupId || null
        }))
      })
    },
    'explore.board.list': {
      method: 'GET', mutate: false,
      params: {
        filter: { type: 'string', optional: true },
        query: { type: 'string', optional: true, max: 60 },
        page: { type: 'number', optional: true, min: 0, max: 200 },
        limit: { type: 'number', optional: true, min: 1, max: 60 },
        age: { type: 'string', optional: true },
        region: { type: 'string', optional: true }
      },
      response: ['items', 'page', 'limit', 'hasMore'],
      local: (store, p) => {
        const page = Number.isFinite(p.page) ? p.page : 0;
        const limit = Number.isFinite(p.limit) ? p.limit : 10;
        const all = store.getExploreFeed(p.filter || 'all', p.query || '', null, p.age || 'all', p.region || 'all') || [];
        const items = all.slice(page * limit, page * limit + limit).map(slimCard);
        return { items, page, limit, hasMore: (page + 1) * limit < all.length, total: all.length };
      }
    },
    'explore.list': {
      method: 'GET', mutate: false,
      params: {
        filter: { type: 'string', optional: true, enum: ['all', 'people', 'posts', 'groups'] },
        query: { type: 'string', optional: true, max: 60 },
        page: { type: 'number', optional: true, min: 0, max: 200 },
        limit: { type: 'number', optional: true, min: 1, max: 40 },
        age: { type: 'string', optional: true },
        region: { type: 'string', optional: true },
        radius: { type: 'string', optional: true }
      },
      response: ['items', 'page', 'limit', 'hasMore', 'total', 'filter', 'query'],
      local: (store, p) => {
        const filter = p.filter || 'all';
        const query = p.query || '';
        const page = Number.isFinite(p.page) ? p.page : 0;
        const limit = Number.isFinite(p.limit) ? p.limit : 12;
        const feed = store.getExploreFeed(filter, query, { page, limit }, p.age || 'all', p.region || 'all', p.radius || 'all');
        const raw = Array.isArray(feed) ? feed : (feed.items || []);
        const total = Array.isArray(feed) ? raw.length : (feed.total || 0);
        return {
          items: raw.map(slimExploreItem),
          page, limit, total,
          hasMore: Array.isArray(feed) ? false : !!feed.hasMore,
          filter, query
        };
      }
    },
    'explore.profile.status': {
      method: 'GET', mutate: false, params: {},
      response: ['active', 'meetStyleId', 'meetStyleLabel', 'intro', 'expiresAt', 'remainingMs', 'remainingLabel'],
      local: (store) => ({ ...store.getMyExplorePublishState() })
    },
    'explore.profile.publish': {
      method: 'POST', mutate: true, idempotent: true,
      params: {
        meetStyleId: { type: 'string', optional: true },
        intro: { type: 'string', optional: true, max: 40 }
      },
      response: ['ok', 'publish'],
      local: (store, p) => store.publishMyExploreProfile({ meetStyleId: p.meetStyleId, intro: p.intro || '' })
    },
    'explore.profile.unpublish': {
      method: 'POST', mutate: true, idempotent: true, params: {},
      response: ['ok'],
      local: (store) => store.unpublishMyExploreProfile()
    },
    'album.list': {
      method: 'GET', mutate: false, params: {},
      response: ['public', 'secret', 'max', 'sharedWith'],
      local: (store) => {
        const s = store.getAlbumSummary();
        return {
          public: s.public.photos.map(slimPhoto),
          secret: s.secret.photos.map(slimPhoto),
          max: s.public.max,
          sharedWith: s.sharedWith.slice()
        };
      }
    },
    'album.add': {
      method: 'POST', mutate: true,
      params: {
        kind: { type: 'string', required: true, enum: ['public', 'secret'] },
        dataUrl: { type: 'string', required: true, pattern: '^data:image/', max: ALBUM_DATAURL_MAX }
      },
      response: ['ok', 'photo', 'photos'],
      local: (store, p) => {
        const res = store.addMyAlbumPhoto(p.kind, p.dataUrl);
        if (!res.ok) throw new ApiError(res.reason === 'full' ? 'conflict' : 'validation', '사진을 넣지 못했어요', { details: res });
        return res;
      }
    },
    'album.remove': {
      method: 'POST', mutate: true, idempotent: true,
      params: {
        kind: { type: 'string', required: true, enum: ['public', 'secret'] },
        photoId: { type: 'string', required: true }
      },
      response: ['ok', 'photos'],
      local: (store, p) => {
        const res = store.removeMyAlbumPhoto(p.kind, p.photoId);
        if (!res.ok) throw new ApiError('not_found', '그 사진을 찾지 못했어요', { details: res });
        return res;
      }
    },
    'album.replace': {
      method: 'POST', mutate: true,
      params: {
        kind: { type: 'string', required: true, enum: ['public', 'secret'] },
        photoId: { type: 'string', required: true },
        dataUrl: { type: 'string', required: true, pattern: '^data:image/', max: ALBUM_DATAURL_MAX }
      },
      response: ['ok', 'photo', 'index'],
      local: (store, p) => {
        const res = store.replaceMyAlbumPhoto(p.kind, p.photoId, p.dataUrl);
        if (!res.ok) throw new ApiError(res.reason === 'not_found' ? 'not_found' : 'validation', '사진을 바꾸지 못했어요', { details: res });
        return res;
      }
    },
    'album.share.set': {
      method: 'POST', mutate: true, idempotent: true,
      params: {
        partnerId: { type: 'string', required: true },
        shared: { type: 'boolean', required: true }
      },
      response: ['ok', 'shared'],
      local: (store, p) => store.setSecretAlbumShared(p.partnerId, p.shared)
    },
    'album.share.get': {
      method: 'GET', mutate: false,
      params: { partnerId: { type: 'string', required: true } },
      response: ['partnerId', 'mine', 'theirs'],
      local: (store, p) => store.getSecretAlbumState(p.partnerId)
    },
    /* Sprint 31 — 앨범 순서 바꾸기(0-based 목표 자리) · 대표 사진 지정. */
    'album.reorder': {
      method: 'POST', mutate: true, idempotent: true,
      params: {
        kind: { type: 'string', required: true, enum: ['public', 'secret'] },
        photoId: { type: 'string', required: true },
        to: { type: 'number', required: true, min: 0, max: 3 }
      },
      response: ['ok', 'photos', 'index', 'from', 'to'],
      local: (store, p) => {
        const photos = store.getMyAlbum(p.kind);
        const from = photos.findIndex((x) => x.id === p.photoId);
        if (from < 0) throw new ApiError('not_found', '그 사진을 찾지 못했어요', { details: { photoId: p.photoId } });
        if (p.to >= photos.length) throw new ApiError('validation', '그 자리로는 옮길 수 없어요', { details: { to: p.to, count: photos.length } });
        if (p.to === from) return { ok: true, photos: photos.map(slimPhoto), index: from, from, to: from, moved: false };
        const res = store.moveMyAlbumPhoto(p.kind, p.photoId, p.to - from);
        if (!res.ok) throw new ApiError('conflict', '순서를 바꾸지 못했어요', { details: res });
        return { ok: true, photos: res.photos.map(slimPhoto), index: res.index, from, to: res.index, moved: true };
      }
    },
    'album.setCover': {
      method: 'POST', mutate: true, idempotent: true,
      params: {
        kind: { type: 'string', required: true, enum: ['public', 'secret'] },
        photoId: { type: 'string', required: true }
      },
      response: ['ok', 'photos', 'index', 'cover', 'already'],
      local: (store, p) => {
        if (p.kind !== 'public') throw new ApiError('validation', '대표 사진은 공개 앨범에만 있어요', { details: { field: 'kind' } });
        const photos = store.getMyAlbum('public');
        const at = photos.findIndex((x) => x.id === p.photoId);
        if (at < 0) throw new ApiError('not_found', '그 사진을 찾지 못했어요', { details: { photoId: p.photoId } });
        if (at === 0) return { ok: true, photos: photos.map(slimPhoto), index: 0, cover: slimPhoto(photos[0]), already: true };
        const res = store.setMyAlbumCover('public', p.photoId);
        if (!res.ok) throw new ApiError('conflict', '대표 사진을 바꾸지 못했어요', { details: res });
        return { ok: true, photos: res.photos.map(slimPhoto), index: 0, cover: slimPhoto(res.photos[0]), already: false };
      }
    },
    'chat.rooms.list': {
      method: 'GET', mutate: false, params: {},
      response: ['rooms', 'groupRooms', 'count', 'unread'],
      local: (store) => {
        const inbox = store.getDmInbox() || {};
        const rooms = (inbox.directRooms || []).map((it) => ({
          id: it.room.id,
          partnerId: it.room.partnerId,
          partnerName: it.room.partnerName,
          groupId: it.group ? it.group.id : null,
          unread: it.unread || 0,
          lastAt: it.lastAt ? new Date(it.lastAt).toISOString() : null
        }));
        const groupRooms = (inbox.groupRooms || []).map((it) => ({
          id: `group_${it.groupId}`, groupId: it.groupId, name: it.group ? it.group.name : '',
          unread: (it.chat && it.chat.unread) || 0
        }));
        return { rooms, groupRooms, count: rooms.length, unread: inbox.unread || 0 };
      }
    },
    'chat.messages.send': {
      method: 'POST', mutate: true,
      params: {
        roomId: { type: 'string', required: true },
        text: { type: 'string', required: true, max: 500 }
      },
      response: ['ok', 'message'],
      local: (store, p) => store.sendChatMessage(p.roomId, p.text)
    },
    /* Sprint 31 — 1:1 대화 보내기. 화면 코드가 부르는 이름(dm.send)과 같은 계약. */
    'dm.send': {
      method: 'POST', mutate: true,
      params: {
        roomId: { type: 'string', required: true },
        text: { type: 'string', required: true, max: 500 },
        /* Sprint 32 — 화면이 먼저 띄운 '전송 중' 말풍선의 id(있으면 그 말풍선을 확정한다). */
        pendingId: { type: 'string', optional: true, max: 64 }
      },
      response: ['ok', 'message'],
      local: (store, p) => {
        const message = store.sendChatMessage(p.roomId, p.text, { pendingId: p.pendingId });
        if (!message) {
          const room = store.getChatRoom ? store.getChatRoom(p.roomId) : null;
          if (!room) throw new ApiError('not_found', '그 대화방을 찾지 못했어요', { details: { roomId: p.roomId } });
          throw new ApiError('validation', '보낼 말을 적어 주세요', { details: { field: 'text' } });
        }
        return { ok: true, message: { id: message.id, text: message.text, at: message.at, from: message.from } };
      }
    },
    /* Sprint 31 — 모임 단체 채팅 보내기. */
    'group.chat.send': {
      method: 'POST', mutate: true,
      params: {
        groupId: { type: 'string', required: true },
        text: { type: 'string', required: true, max: 1000 },
        pendingId: { type: 'string', optional: true, max: 64 }
      },
      response: ['ok', 'message', 'confirmed'],
      local: (store, p) => {
        const res = store.sendGroupChatMessage(p.groupId, p.text, { pendingId: p.pendingId });
        if (!res || !res.ok) {
          const reason = res && res.reason;
          if (reason === 'not_member') throw new ApiError('unauthorized', '이 모임의 멤버만 쓸 수 있어요', { details: { groupId: p.groupId } });
          throw new ApiError('validation', '보낼 말을 적어 주세요', { details: { field: 'text' } });
        }
        const m = res.message;
        return { ok: true, confirmed: !!res.confirmed, message: { id: m.id, text: m.text, at: m.at, from: m.from, authorId: m.authorId, authorName: m.authorName } };
      }
    },
    'groups.list': {
      method: 'GET', mutate: false, params: {},
      response: ['groups', 'count'],
      local: (store) => {
        const groups = (store.getJoinedGroups ? store.getJoinedGroups() : []).map((g) => ({ id: g.id, name: g.name, members: g.memberCount || 0, hobbyId: g.hobbyId || null }));
        return { groups, count: groups.length };
      }
    },
    /* ------------------------------------------------------------------
     * Sprint 33 — 글·좋아요·댓글·참석을 경계로(2단계)
     *  · 화면이 먼저 바꿀 수 있게 **원하는 상태**를 받는 계약이다(같은 값으로 다시 불러도 결과가 같다).
     *  · 작성자는 화면이 만든 id(postId·commentId)를 그대로 보낸다 — 재시도·오프라인 큐가 중복을 만들지 않는다.
     * ------------------------------------------------------------------ */
    'post.create': {
      method: 'POST', mutate: true, idempotent: true,
      params: {
        /* v33.8 (#22181) — groupId 없이 올리는 '자유 피드' 글을 받는다(생략 가능). */
        groupId: { type: 'string', optional: true, max: 80 },
        caption: { type: 'string', optional: true, max: 500 },
        photoUrl: { type: 'string', optional: true, max: 8000000 },
        mediaCaption: { type: 'string', optional: true, max: 40 },
        tag: { type: 'string', optional: true, max: 40 },
        recommendOptIn: { type: 'boolean', optional: true },
        postId: { type: 'string', optional: true, max: 64 }
      },
      response: ['ok', 'post'],
      local: (store, p) => {
        const existing = p.postId ? store.getPost(p.postId) : null;
        const post = existing || store.createPost({
          id: p.postId || null,
          groupId: p.groupId || null,
          caption: p.caption || '',
          photoUrl: p.photoUrl || '',
          mediaCaption: p.mediaCaption || '',
          tag: p.tag || null,
          recommendOptIn: p.recommendOptIn === true
        });
        if (!post) {
          if (!p.groupId) throw new ApiError('validation', '내용이나 사진을 하나는 남겨 주세요', { details: { field: 'caption' } });
          const group = store.getGroup ? store.getGroup(p.groupId) : null;
          if (!group) throw new ApiError('not_found', '그 모임을 찾지 못했어요', { details: { groupId: p.groupId } });
          if (store.isGroupJoined && !store.isGroupJoined(p.groupId)) throw new ApiError('unauthorized', '이 모임의 멤버만 글을 쓸 수 있어요', { details: { groupId: p.groupId } });
          throw new ApiError('validation', '내용이나 사진을 하나는 남겨 주세요', { details: { field: 'caption' } });
        }
        return { ok: true, post: slimPost(post) };
      }
    },
    'post.like': {
      method: 'POST', mutate: true, idempotent: true,
      params: {
        postId: { type: 'string', required: true, max: 80 },
        liked: { type: 'boolean', required: true },
        kind: { type: 'string', optional: true, enum: ['feed', 'explore'] }
      },
      response: ['ok', 'liked', 'likes', 'changed'],
      local: (store, p) => {
        const res = store.setPostLike(p.postId, p.liked, p.kind || 'feed');
        if (!res) throw new ApiError('not_found', '그 글을 찾지 못했어요', { details: { postId: p.postId } });
        return { ok: true, liked: res.liked, likes: res.likes, changed: !!res.changed };
      }
    },
    'post.comment': {
      method: 'POST', mutate: true, idempotent: true,
      params: {
        postId: { type: 'string', required: true, max: 80 },
        text: { type: 'string', required: true, max: 300 },
        parentId: { type: 'string', optional: true, max: 80 },
        commentId: { type: 'string', optional: true, max: 64 },
        kind: { type: 'string', optional: true, enum: ['feed', 'explore'] }
      },
      response: ['ok', 'comment', 'count'],
      local: (store, p) => {
        const kind = p.kind || 'feed';
        const post = kind === 'explore' ? store.getExplorePost(p.postId) : store.getPost(p.postId);
        if (!post) throw new ApiError('not_found', '그 글을 찾지 못했어요', { details: { postId: p.postId } });
        const comment = kind === 'explore'
          ? store.addExplorePostComment(p.postId, p.text, { commentId: p.commentId })
          : store.addComment(p.postId, p.text, p.parentId || null, { commentId: p.commentId });
        if (!comment) throw new ApiError('validation', '댓글을 적어 주세요', { details: { field: 'text' } });
        return {
          ok: true,
          comment: {
            id: comment.id, text: comment.text, authorId: comment.authorId, authorName: comment.authorName,
            parentId: comment.parentId || null, createdAt: comment.createdAt
          },
          count: (post.comments || []).length
        };
      }
    },
    'event.rsvp': {
      method: 'POST', mutate: true, idempotent: true,
      params: {
        eventId: { type: 'string', required: true, max: 80 },
        status: { type: 'string', required: true, enum: ['yes', 'maybe', 'no'] }
      },
      response: ['ok', 'eventId', 'status', 'autoWait', 'promoted', 'summary'],
      local: (store, p) => {
        const res = store.setGroupEventRsvp(p.eventId, p.status);
        if (!res || !res.ok) {
          const reason = (res && res.reason) || 'not_found';
          const code = reason === 'not_member' ? 'unauthorized'
            : reason === 'past' ? 'conflict'
              : reason === 'bad_status' ? 'validation' : 'not_found';
          const message = reason === 'past' ? '이미 지난 일정이에요'
            : reason === 'not_member' ? '이 모임의 멤버만 참석할 수 있어요'
              : reason === 'bad_status' ? '참석 여부가 올바르지 않아요' : '그 일정을 찾지 못했어요';
          throw new ApiError(code, message, { details: { eventId: p.eventId, status: p.status } });
        }
        const s = res.summary || {};
        return {
          ok: true, eventId: res.eventId, status: res.status,
          autoWait: !!res.autoWait, promoted: res.promoted ? { id: res.promoted.memberId || null, name: res.promoted.name || '' } : null,
          summary: { yes: s.yes || 0, maybe: s.maybe || 0, no: s.no || 0, total: s.total || 0, capacity: s.capacity || 0, seatsLeft: s.seatsLeft || 0, myRsvp: s.myRsvp || null, full: !!s.full }
        };
      }
    },
    'profile.update': {
      method: 'POST', mutate: true,
      params: {
        nickname: { type: 'string', optional: true, max: 16 },
        bio: { type: 'string', optional: true, max: 80 },
        age: { type: 'number', optional: true, min: 14, max: 99 }
      },
      response: ['ok', 'user'],
      local: (store, p) => {
        const res = store.updateProfile(p);
        if (res && res.ok === false) throw new ApiError('validation', '프로필을 저장하지 못했어요', { details: res });
        return { ok: true, user: publicUser(store) };
      }
    }
  };

  function slimPhoto(p) {
    return { id: p.id, url: p.url, caption: p.caption || '', at: p.at || null };
  }

  /** Sprint 33 — 글의 공통 모양(다른 사람이 만든 필드가 섞여도 화면은 이 키만 본다). */
  function slimPost(post) {
    if (!post) return null;
    return {
      id: post.id,
      groupId: post.groupId || null,
      authorId: post.authorId || null,
      authorName: post.authorName || '',
      caption: post.caption || '',
      tag: post.tag || null,
      photoUrl: post.photoUrl || null,
      mediaCaption: post.mediaCaption || '',
      likes: Number(post.likes) || 0,
      likedByMe: !!post.likedByMe,
      comments: Array.isArray(post.comments) ? post.comments.length : 0,
      recommendOptIn: post.recommendOptIn === true,
      createdAt: post.createdAt || null
    };
  }

  /** Sprint 31 — 탐색 카드의 공통 모양(사람·글·모임). 화면이 타입별 분기 없이 읽게. */
  function slimExploreItem(item) {
    if (item.type === 'person') {
      const p = item.profile || {};
      return {
        id: item.id, kind: 'person',
        name: p.nickname || '', subtitle: p.bio || p.hobbyLabel || '',
        regionId: p.regionId || null, age: p.age || null,
        hobby: p.hobbyLabel || null, photo: p.photoUrl || null,
        distanceKm: Number.isFinite(item.distanceKm) ? item.distanceKm : null,
        isMe: !!item.isMe
      };
    }
    if (item.type === 'post') {
      const p = item.post || {};
      return {
        id: item.id, kind: 'post',
        name: p.authorName || '', subtitle: p.caption || '',
        regionId: p.regionId || null, age: null,
        hobby: p.hobbyLabel || null, photo: p.photoUrl || null,
        distanceKm: Number.isFinite(item.distanceKm) ? item.distanceKm : null,
        createdAt: p.createdAt || null
      };
    }
    const g = item.group || {};
    return {
      id: item.id, kind: 'group',
      name: g.name || '', subtitle: g.description || '',
      regionId: g.regionId || null, age: null,
      hobby: g.categoryName || null, photo: g.coverUrl || null,
      distanceKm: Number.isFinite(item.distanceKm) ? item.distanceKm : null,
      joined: !!item.joined
    };
  }

  function slimCard(item) {
    return {
      id: item.id,
      type: item.type,
      title: item.title || item.name || '',
      subtitle: item.subtitle || '',
      regionId: item.regionId || null,
      style: item.meetStyleLabel || null,
      photo: item.photoUrl || null
    };
  }

  function publicUser(store) {
    const u = (store && store.state && store.state.currentUser) || {};
    return {
      id: u.id || null,
      nickname: u.nickname || null,
      age: u.age || null,
      regionId: u.regionId || u.region || null,
      handle: u.handle || null
    };
  }

  /* --------------------------------------------------------------- 검증 */
  function validateParams(spec, params) {
    const clean = {};
    const given = params || {};
    Object.keys(spec || {}).forEach((key) => {
      const rule = spec[key];
      const value = given[key];
      if (value === undefined || value === null || value === '') {
        if (rule.required) throw new ApiError('validation', `${key} 값이 필요해요`, { details: { field: key } });
        return;
      }
      if (rule.type === 'string') {
        if (typeof value !== 'string') throw new ApiError('validation', `${key} 는 문자열이어야 해요`, { details: { field: key } });
        if (rule.max && value.length > rule.max) throw new ApiError('validation', `${key} 가 너무 길어요`, { details: { field: key, max: rule.max } });
        if (rule.enum && !rule.enum.includes(value)) throw new ApiError('validation', `${key} 값이 올바르지 않아요`, { details: { field: key } });
        if (rule.pattern && !new RegExp(rule.pattern).test(value)) throw new ApiError('validation', `${key} 형식이 올바르지 않아요`, { details: { field: key } });
        clean[key] = value;
      } else if (rule.type === 'number') {
        const num = Number(value);
        if (!Number.isFinite(num)) throw new ApiError('validation', `${key} 는 숫자여야 해요`, { details: { field: key } });
        if (rule.min !== undefined && num < rule.min) throw new ApiError('validation', `${key} 가 너무 작아요`, { details: { field: key } });
        if (rule.max !== undefined && num > rule.max) throw new ApiError('validation', `${key} 가 너무 커요`, { details: { field: key } });
        clean[key] = num;
      } else if (rule.type === 'boolean') {
        clean[key] = !!value;
      } else {
        clean[key] = value;
      }
    });
    return clean;
  }

  /** 응답을 계약된 키만 남겨 정규화한다(서버가 무엇을 더 보내도 화면은 흔들리지 않게). */
  function normalizeResponse(name, data) {
    const spec = ENDPOINTS[name];
    if (!spec || !spec.response) return data;
    const out = {};
    spec.response.forEach((key) => { out[key] = data ? data[key] : undefined; });
    if (data && typeof data === 'object') {
      Object.keys(data).forEach((key) => { if (!(key in out)) out[key] = data[key]; });
    }
    return out;
  }

  /* ----------------------------------------------------------- 어댑터 */
  /**
   * 로컬 어댑터 — store 의 규칙을 그대로 부른다.
   *  · 반환은 항상 Promise (경계를 건너는 순간 비동기가 된다)
   *  · 옵션 latency 는 사람이 체감하는 지연을 흉내 낼 때만(테스트·데모). 기본 0.
   */
  function createLocalAdapter(store, options) {
    const opts = options || {};
    const latency = Number.isFinite(opts.latency) ? opts.latency : 0;
    return {
      id: 'local',
      async call(name, params) {
        const spec = ENDPOINTS[name];
        if (!spec) throw new ApiError('not_found', `알 수 없는 요청이에요: ${name}`);
        if (!store) throw new ApiError('unavailable', '저장소가 아직 준비되지 않았어요');
        if (latency > 0) await new Promise((r) => setTimeout(r, latency));
        const result = spec.local(store, params);
        return result === undefined ? null : JSON.parse(JSON.stringify(result));
      }
    };
  }

  /**
   * HTTP 어댑터 — 나중에 실제 서버를 붙일 때 이 함수만 쓰면 된다.
   *  · 경로는 `/api/<endpoint>` 로 보낸다(예: POST /api/album.add)
   *  · 서버가 4xx/5xx 면 ApiError(code, status) 로 정규화한다.
   */
  function createHttpAdapter(options) {
    const opts = options || {};
    const baseUrl = (opts.baseUrl || '/api').replace(/\/$/, '');
    const fetchImpl = opts.fetch || (typeof fetch === 'function' ? fetch : null);
    return {
      id: 'http',
      async call(name, params, context) {
        if (!fetchImpl) throw new ApiError('unavailable', '네트워크를 쓸 수 없어요');
        const spec = ENDPOINTS[name];
        if (!spec) throw new ApiError('not_found', `알 수 없는 요청이에요: ${name}`);
        const ctx = context || {};
        const headers = { 'Content-Type': 'application/json', 'X-OoG-Contract': CONTRACT };
        if (ctx.requestId) headers['X-Request-Id'] = ctx.requestId;
        if (ctx.idempotencyKey) headers['Idempotency-Key'] = ctx.idempotencyKey;
        if (ctx.signal) headers['X-Cancel-Supported'] = '1';
        const res = await fetchImpl(`${baseUrl}/${name}`, {
          method: spec.method,
          headers,
          body: spec.method === 'GET' ? undefined : JSON.stringify(params || {}),
          signal: ctx.signal
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const code = res.status === 401 ? 'unauthorized'
            : res.status === 404 ? 'not_found'
              : res.status === 409 ? 'conflict'
                : res.status === 429 ? 'rate_limited'
                  : res.status >= 500 ? 'server' : 'validation';
          throw new ApiError(code, body.message || `요청이 실패했어요 (${res.status})`, { status: res.status, details: body });
        }
        return body && body.data !== undefined ? body.data : body;
      }
    };
  }

  /* --------------------------------------------------------------- 저장소 */
  function memoryStorage() {
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k)
    };
  }

  function resolveStorage(custom) {
    if (custom) return custom;
    try {
      if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (e) { /* 파일 모드·사생활 보호 모드 */ }
    return memoryStorage();
  }

  /* --------------------------------------------------------------- 클라이언트 */
  let seq = 0;

  function newId(prefix) {
    seq += 1;
    return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  }

  function createClient(options) {
    const opts = options || {};
    const adapterRef = { adapter: opts.adapter || createLocalAdapter(opts.store) };
    const storage = resolveStorage(opts.storage);
    const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 8000;
    const maxRetries = Number.isFinite(opts.maxRetries) ? opts.maxRetries : 2;
    const retryBaseMs = Number.isFinite(opts.retryBaseMs) ? opts.retryBaseMs : 120;
    const now = opts.now || (() => Date.now());
    const log = [];
    const queue = loadQueue(storage);
    let mode = opts.mode || 'local';

    function loadQueue(store) {
      try {
        const raw = store.getItem(QUEUE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.slice(0, QUEUE_LIMIT) : [];
      } catch (e) { return []; }
    }

    function saveQueue() {
      try { storage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, QUEUE_LIMIT))); } catch (e) { /* 무시 */ }
    }

    function note(entry) {
      log.unshift(entry);
      if (log.length > LOG_LIMIT) log.length = LOG_LIMIT;
    }

    /* 온라인 여부 — 테스트·시뮬레이션에서는 opts.online 으로 바꿔 끼울 수 있다. */
    function isOnline() {
      if (typeof opts.online === 'function') {
        try { return !!opts.online(); } catch (e) { return true; }
      }
      try { return typeof navigator === 'undefined' || navigator.onLine !== false; } catch (e) { return true; }
    }

    function delay(ms) {
      if (!(ms > 0)) return Promise.resolve();
      return new Promise((r) => setTimeout(r, ms));
    }

    function withTimeout(promise, ms, requestId) {
      if (!(ms > 0)) return promise;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const err = new ApiError('timeout', '응답이 늦어 요청을 멈췄어요', { details: { requestId, ms } });
          reject(err);
        }, ms);
        promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
      });
    }

    /**
     * 한 번의 호출. 실패하면 재시도 가능한 오류만 지수 백오프로 다시 보낸다.
     *  · mutate(쓰기)는 idempotencyKey 를 붙여 서버가 중복 반영하지 않게 한다.
     */
    async function execute(name, params, ctx) {
      const spec = ENDPOINTS[name];
      const started = now();
      let attempts = 0;
      let lastError = null;
      while (attempts <= maxRetries) {
        attempts += 1;
        try {
          const data = await withTimeout(
            Promise.resolve().then(() => adapterRef.adapter.call(name, params, ctx || {})),
            (ctx && ctx.timeoutMs) || timeoutMs,
            ctx && ctx.requestId
          );
          return {
            ok: true, data: normalizeResponse(name, data), error: null,
            meta: { requestId: ctx.requestId, ms: now() - started, source: adapterRef.adapter.id, attempts }
          };
        } catch (e) {
          const err = normalizeError(e);
          lastError = err;
          if (ctx && ctx.signal && ctx.signal.aborted) break;
          if (!RETRYABLE.has(err.code) && !spec.retryOnAll) break;
          if (attempts > maxRetries) break;
          await delay(retryBaseMs * Math.pow(2, attempts - 1) + Math.floor(Math.random() * 40));
        }
      }
      return {
        ok: false, data: null,
        error: { code: lastError.code, message: lastError.message, retryable: RETRYABLE.has(lastError.code), details: lastError.details },
        meta: { requestId: ctx.requestId, ms: now() - started, source: adapterRef.adapter.id, attempts }
      };
    }

    /**
     * 경계의 유일한 입구.
     * @param {string} name 엔드포인트
     * @param {object} params
     * @param {object} options { queueOffline, timeoutMs, signal, requestId }
     * @returns {Promise<{ok, data, error, meta}>}
     */
    async function call(name, params, options) {
      const opts2 = options || {};
      const spec = ENDPOINTS[name];
      const requestId = opts2.requestId || newId('req');
      if (!spec) {
        note({ id: requestId, endpoint: name, at: now(), ok: false, code: 'not_found', ms: 0, attempts: 0 });
        return { ok: false, data: null, error: { code: 'not_found', message: `알 수 없는 요청이에요: ${name}`, retryable: false, details: null }, meta: { requestId, ms: 0, source: adapterRef.adapter.id, attempts: 0 } };
      }
      let clean;
      try {
        clean = validateParams(spec.params, params);
      } catch (e) {
        const err = normalizeError(e);
        note({ id: requestId, endpoint: name, at: now(), ok: false, code: err.code, ms: 0, attempts: 0 });
        return { ok: false, data: null, error: { code: err.code, message: err.message, retryable: false, details: err.details }, meta: { requestId, ms: 0, source: adapterRef.adapter.id, attempts: 0 } };
      }

      /* 오프라인이면 쓰기는 큐에 넣고 성공으로 답한다(화면은 이미 낙관적으로 바뀐 상태). */
      if (spec.mutate && !isOnline() && opts2.queueOffline !== false) {
        const entry = {
          id: newId('q'), endpoint: name, params: clean, at: new Date(now()).toISOString(),
          idempotencyKey: spec.idempotent ? `${name}:${JSON.stringify(clean).length}:${requestId}` : null, attempts: 0
        };
        queue.unshift(entry);
        if (queue.length > QUEUE_LIMIT) queue.length = QUEUE_LIMIT;
        saveQueue();
        note({ id: requestId, endpoint: name, at: now(), ok: true, code: null, ms: 0, attempts: 0, queued: true });
        return { ok: true, data: null, error: null, meta: { requestId, ms: 0, source: adapterRef.adapter.id, attempts: 0, queued: true } };
      }

      const ctx = { requestId, idempotencyKey: spec.mutate && spec.idempotent ? `${name}:${requestId}` : null, signal: opts2.signal, timeoutMs: opts2.timeoutMs };
      const result = await execute(name, clean, ctx);
      note({ id: requestId, endpoint: name, at: now(), ok: result.ok, code: result.ok ? null : result.error.code, ms: result.meta.ms, attempts: result.meta.attempts });
      return result;
    }

    /** 실패하면 throw 하는 짧은 표기. */
    async function must(name, params, options) {
      const res = await call(name, params, options);
      if (!res.ok) throw new ApiError(res.error.code, res.error.message, { details: res.error.details });
      return res.data;
    }

    /**
     * 낙관적 업데이트 — 화면을 먼저 바꾸고(apply), 서버 응답이 오면 확정(commit),
     * 실패하면 되돌린다(rollback). 되돌릴 값은 apply 의 반환값을 그대로 넘긴다.
     */
    async function optimistic(config) {
      const cfg = config || {};
      let undo = null;
      try {
        undo = cfg.apply ? cfg.apply() : null;
      } catch (e) {
        const err = normalizeError(e);
        return { ok: false, data: null, error: { code: err.code, message: err.message, retryable: false, details: err.details }, meta: { rolledBack: false } };
      }
      const res = await call(cfg.endpoint, cfg.params, cfg.options);
      if (res.ok) {
        if (cfg.commit) {
          try { cfg.commit(res.data, undo); } catch (e) { console.warn('[ooG] commit 실패', e); }
        }
        return res;
      }
      if (cfg.rollback) {
        try { cfg.rollback(undo, res.error); } catch (e) { console.warn('[ooG] rollback 실패', e); }
      }
      return { ...res, meta: { ...(res.meta || {}), rolledBack: !!cfg.rollback } };
    }

    /** 큐에 쌓인 쓰기를 순서대로 다시 보낸다. 성공한 것만 큐에서 뺀다. */
    async function flushQueue() {
      if (!queue.length) return { ok: true, flushed: 0, remaining: 0 };
      if (!isOnline()) return { ok: false, flushed: 0, remaining: queue.length, reason: 'offline' };
      const pending = queue.slice();
      let flushed = 0;
      for (const entry of pending) {
        const res = await call(entry.endpoint, entry.params, { requestId: entry.id, queueOffline: false });
        if (res.ok) {
          flushed += 1;
          const idx = queue.findIndex((q) => q.id === entry.id);
          if (idx >= 0) queue.splice(idx, 1);
        } else if (!res.error.retryable) {
          /* 다시 보내도 안 되는 요청은 큐에서 빼서 영원히 막히지 않게 한다. */
          const idx = queue.findIndex((q) => q.id === entry.id);
          if (idx >= 0) queue.splice(idx, 1);
        } else {
          const found = queue.find((q) => q.id === entry.id);
          if (found) found.attempts = (found.attempts || 0) + 1;
        }
      }
      saveQueue();
      return { ok: queue.length === 0, flushed, remaining: queue.length };
    }

    /** 로컬 ↔ HTTP 어댑터 교체. 화면·store 는 아무것도 바뀌지 않는다. */
    function switchAdapter(next, nextMode) {
      if (!next || typeof next.call !== 'function') return { ok: false, reason: 'invalid_adapter' };
      const previous = adapterRef.adapter.id;
      adapterRef.adapter = next;
      mode = nextMode || next.id || 'custom';
      return { ok: true, from: previous, to: adapterRef.adapter.id, mode };
    }

    return {
      contract: CONTRACT,
      get mode() { return mode; },
      get adapterId() { return adapterRef.adapter.id; },
      endpointNames: () => Object.keys(ENDPOINTS),
      endpointSpec: (name) => (ENDPOINTS[name] ? { ...ENDPOINTS[name], local: undefined } : null),
      call, must, optimistic, flushQueue, switchAdapter,
      getQueue: () => queue.map((q) => ({ ...q, params: { ...q.params } })),
      getLog: () => log.map((l) => ({ ...l })),
      isOnline,
      health: () => ({
        contract: CONTRACT, adapter: adapterRef.adapter.id, mode,
        online: isOnline(), queue: queue.length, requests: log.length,
        lastOk: (log.find((l) => l.ok) || {}).at || null,
        lastError: (log.find((l) => !l.ok) || {}).code || null,
        albumSpec: { maxDimension: ALBUM_MAX_DIMENSION, jpegQuality: ALBUM_JPEG_QUALITY, maxDataUrl: ALBUM_DATAURL_MAX }
      }),
      /* 내부(테스트·디버그) */
      _endpoints: ENDPOINTS
    };
  }

  /* --------------------------------------------------------------- store 연동 */
  /**
   * store 에 API 클라이언트를 붙이고, 저장(write)도 경계를 지나게 한다.
   *  · store 의 동기 메서드는 그대로 둔다(화면이 즉시 그려져야 하므로).
   *  · 저장은 localStorage 에 먼저 쓰고, 그다음 storageAdapter(서버로 바꿀 자리)로 넘긴다.
   */
  function attach(store, options) {
    if (!store || typeof store.bindApi !== 'function') return null;
    const local = createLocalAdapter(store);
    const client = createClient({ ...(options || {}), adapter: (options && options.adapter) || local, store, mode: (options && options.mode) || 'local' });

    /* 저장 경계 — 지금은 localStorage 를 그대로 쓰고, 서버가 생기면 이 write 만 fetch 로 바뀐다. */
    const persistence = {
      writes: 0, failures: 0, lastAt: null, lastError: null, lastBytes: 0,
      write(payload) {
        try {
          persistence.writes += 1;
          persistence.lastAt = new Date().toISOString();
          persistence.lastBytes = payload ? payload.length : 0;
        } catch (e) {
          persistence.failures += 1;
          persistence.lastError = String(e && e.message || e);
          throw e;
        }
      }
    };
    store.bindApi(client);
    if (typeof store.setStorageAdapter === 'function') store.setStorageAdapter(persistence);

    /* 온라인으로 돌아오면 밀린 쓰기를 스스로 다시 보낸다. */
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('online', () => { client.flushQueue(); });
    }

    global.OOGAPI = client;
    global.OOGApi = { ApiError, ENDPOINTS, createClient, createLocalAdapter, createHttpAdapter, attach, validateParams, normalizeResponse, CONTRACT, ALBUM_MAX_DIMENSION, ALBUM_JPEG_QUALITY };
    return client;
  }

  /* ------------------------------------------------------------------ 시작 */
  const namespace = { ApiError, ENDPOINTS, createClient, createLocalAdapter, createHttpAdapter, attach, validateParams, normalizeResponse, CONTRACT, ALBUM_MAX_DIMENSION, ALBUM_JPEG_QUALITY };
  global.OOGApi = Object.assign(global.OOGApi || {}, namespace);

  if (typeof document !== 'undefined' && global.appStore) {
    /* store 가 이미 있으면(스크립트 순서 store → api) 바로 붙인다. */
    attach(global.appStore);
  } else if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
      if (global.appStore && !global.OOGAPI) attach(global.appStore);
    });
  }
})(typeof window !== 'undefined' ? window : this);
