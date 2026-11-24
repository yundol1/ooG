/**
 * ============================================================================
 * ooG (우그) — Supabase 실서비스 연결  ·  v37.0
 * ----------------------------------------------------------------------------
 *  "화면(app.js)과 저장소(store.js)는 그대로 두고, 데이터가 사는 곳만 서버로 옮긴다."
 *
 *  이 파일이 하는 일
 *    1) 인증      : 이메일 인증 회원가입 · 로그인 · 인증 메일 재전송 · 비밀번호 재설정
 *    2) DB        : 표(profiles·groups·group_members·posts·events·notices·채팅·알림…)를
 *                   store 의 배열과 **1:1 로 맞춰** 올리고(upsert) 내려받는다(pull).
 *    3) Storage   : 사진(data URL)을 버킷에 올리고 공개 URL/서명 URL 로 바꾼다.
 *    4) Realtime  : 다른 기기·다른 사람의 변경을 WebSocket 으로 받아 화면에 반영한다.
 *    5) 아이디 찾기: RPC(마스킹 힌트)만 부른다. 실제 이메일·아이디는 절대 받지 않는다.
 *
 *  · 키는 **publishable(anon)** 만 쓴다. service_role(secret) 키는 이 파일에도, 번들에도 없다.
 *  · 서버가 없거나 끊겨도 앱은 localStorage 캐시로 계속 돈다(오프라인 우선).
 *    다시 연결되면 밀린 쓰기를 순서대로 올린다.
 * ============================================================================
 */
(function (global) {
  'use strict';

  const CONF = {
    url: 'https://nnzrunhjxwcspsfgsmgf.supabase.co',
    key: 'sb_publishable_fy0CjiojNNWeTVAzrflP8w_098c3T2J',
    version: 'v37.7'
  };

  const LS_SESSION = 'oog_cloud_session_v1';
  const LS_SYNC = 'oog_cloud_sync_v1';
  const AUTH = `${CONF.url}/auth/v1`;
  const REST = `${CONF.url}/rest/v1`;
  const STORAGE = `${CONF.url}/storage/v1`;

  /* ---------------------------------------------------------------- utils */
  const nowIso = () => new Date().toISOString();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
  const rid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  /* v37.5 (#24337) — handle 이 비어 있는 사람에게 보여 줄 짧은 기본 아이디(oog#####).
     UUID 를 하이픈만 떼어 `@94cfa23e5aff…` 로 노출하지 않는다(store.personHandle 과 같은 결). */
  const shortHandle = (seed) => {
    const s = String(seed == null ? '' : seed);
    let h = 0;
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100000;
    return `oog${String(h).padStart(5, '0')}`;
  };

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장이 막혀도 계속 */ }
  }

  class CloudError extends Error {
    constructor(code, message, status, detail) {
      super(message || code);
      this.name = 'CloudError';
      this.code = code;
      this.status = status || 0;
      this.detail = detail || null;
    }
  }

  /* -------------------------------------------------------------- session */
  const state = {
    session: readJson(LS_SESSION, null),   // { access_token, refresh_token, expires_at, user:{id,email} }
    meta: readJson(LS_SYNC, { pushed: {}, pulled: {} }),
    syncTimer: null,
    syncing: false,
    ws: null,
    wsRef: 0,
    wsAlive: false,
    pollTimer: null,
    status: 'idle',                        // idle | connecting | online | offline | error
    lastError: null,
    lastSyncAt: null,
    authListeners: []
  };

  function saveSession(s) {
    state.session = s;
    writeJson(LS_SESSION, s);
  }
  function clearSession() {
    state.session = null;
    try { localStorage.removeItem(LS_SESSION); } catch (e) { /* noop */ }
  }
  function hasSession() { return !!(state.session && state.session.access_token); }
  function currentUser() { return state.session ? state.session.user : null; }
  function saveMeta() { writeJson(LS_SYNC, state.meta); }

  function emitAuth(event, payload) {
    state.authListeners.forEach((fn) => { try { fn(event, payload); } catch (e) { console.warn('[ooG cloud]', e); } });
    try { global.dispatchEvent(new CustomEvent('oog:cloud-auth', { detail: { event, payload } })); } catch (e) { /* noop */ }
  }

  /* ------------------------------------------------------------ transport */
  async function request(url, options = {}) {
    const {
      method = 'GET', body, headers = {}, raw = false, prefer, retry = 1, timeout = 15000
    } = options;
    const h = { apikey: CONF.key, ...headers };
    if (state.session && state.session.access_token) h.Authorization = `Bearer ${state.session.access_token}`;
    if (body !== undefined && !(body instanceof Blob) && typeof body !== 'string') {
      h['Content-Type'] = h['Content-Type'] || 'application/json';
    }
    if (prefer) h.Prefer = prefer;

    let attempt = 0;
    for (;;) {
      attempt += 1;
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ac ? setTimeout(() => ac.abort(), timeout) : null;
      try {
        const res = await fetch(url, {
          method,
          headers: h,
          body: body === undefined ? undefined : (typeof body === 'string' || body instanceof Blob ? body : JSON.stringify(body)),
          signal: ac ? ac.signal : undefined,
          cache: 'no-store'
        });
        if (timer) clearTimeout(timer);
        if (res.status === 401 && state.session && state.session.refresh_token && !options._retriedAuth) {
          const ok = await refreshSession();
          if (ok) return request(url, { ...options, _retriedAuth: true });
        }
        if (raw) {
          if (!res.ok) throw new CloudError('http_' + res.status, `요청을 처리하지 못했어요 (${res.status})`, res.status, await res.text().catch(() => ''));
          return res;
        }
        const text = await res.text();
        let data = null;
        if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
        if (!res.ok) {
          const code = (data && (data.error_code || data.code || data.error)) || ('http_' + res.status);
          const msg = (data && (data.msg || data.message || data.error_description || data.hint)) || `요청을 처리하지 못했어요 (${res.status})`;
          const err = new CloudError(code, msg, res.status, data);
          /* 일시 오류만 한 번 더 */
          if ((res.status >= 500 || res.status === 429) && attempt <= retry) { await sleep(400 * attempt); continue; }
          throw err;
        }
        return data;
      } catch (e) {
        if (timer) clearTimeout(timer);
        if (e instanceof CloudError) throw e;
        if (attempt <= retry) { await sleep(300 * attempt); continue; }
        throw new CloudError('network', '서버에 닿지 못했어요 — 연결을 확인해 주세요', 0, e);
      }
    }
  }

  /* ---------------------------------------------------------------- auth */
  function sessionFromAuth(payload) {
    if (!payload || !payload.access_token) return null;
    return {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token || (state.session && state.session.refresh_token) || null,
      expires_at: Date.now() + (Number(payload.expires_in || 3600) * 1000) - 30000,
      user: payload.user ? { id: payload.user.id, email: payload.user.email, email_confirmed_at: payload.user.email_confirmed_at || null, user_metadata: payload.user.user_metadata || {} } : (state.session && state.session.user) || null
    };
  }

  async function refreshSession() {
    if (!state.session || !state.session.refresh_token) return false;
    try {
      const data = await request(`${AUTH}/token?grant_type=refresh_token`, {
        method: 'POST',
        body: { refresh_token: state.session.refresh_token },
        _retriedAuth: true,
        retry: 0
      });
      const s = sessionFromAuth(data);
      if (!s) return false;
      saveSession(s);
      return true;
    } catch (e) {
      /* refresh_token 만료 → 세션을 지우지 않고 '만료'로 표시해 화면이 로그인을 안내하게 한다. */
      state.status = 'expired';
      state.lastError = e;
      return false;
    }
  }

  function mapAuthError(e) {
    const code = String((e && (e.code || '')) || '');
    const msg = String((e && e.message) || '');
    if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'password_mismatch';
    if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) return 'email_unconfirmed';
    if (code === 'user_already_exists' || /already registered|already been registered/i.test(msg)) return 'email_taken';
    if (code === 'weak_password' || /password should be|password is too short/i.test(msg)) return 'password_weak';
    if (code === 'over_request_rate_limit' || /rate limit|too many requests/i.test(msg)) return 'rate_limited';
    if (code === 'validation_failed' || /unable to validate email/i.test(msg)) return 'email_invalid';
    if (code === 'network' || code === '') return 'network';
    return 'unknown';
  }

  async function signUp({ email, password, nickname, handle, age, azit, avatarGradient, photoUrl }) {
    try {
      const data = await request(`${AUTH}/signup`, {
        method: 'POST',
        body: {
          email: String(email || '').trim().toLowerCase(),
          password: String(password || ''),
          data: {
            nickname: nickname || '',
            handle: handle ? String(handle).replace(/^@+/, '').toLowerCase() : null,
            age: age == null ? null : Number(age),
            azit: azit || null,
            avatarGradient: avatarGradient || null,
            has_photo: !!photoUrl
          },
          gotrue_meta_security: {}
        }
      });
      /* v37.7 — **이미 가입된 이메일의 2차 방어선.**
         Supabase Auth 는 이메일 열거 방지 + 이메일 확인 ON 상태에서, 이미 가입된
         주소로 signup 하면 200 OK 에 user.identities = [] (빈 배열)을 돌려준다
         (계정은 새로 만들어지지 않는다). 이걸 성공으로 넘기면 '인증 메일을 보냈어요'
         화면으로 가 버리므로 email_taken 으로 돌려보낸다. */
      const signedUser = data && data.user;
      if (signedUser && Array.isArray(signedUser.identities) && signedUser.identities.length === 0) {
        return { ok: false, reason: 'email_taken', user: null, session: false };
      }
      const s = sessionFromAuth(data);
      if (s) saveSession(s);
      return {
        ok: true,
        needsVerification: !s || !(data.user && data.user.email_confirmed_at),
        user: data.user || null,
        session: !!s
      };
    } catch (e) {
      return { ok: false, reason: mapAuthError(e), error: e };
    }
  }

  async function signIn(email, password) {
    try {
      const data = await request(`${AUTH}/token?grant_type=password`, {
        method: 'POST',
        body: { email: String(email || '').trim().toLowerCase(), password: String(password || '') }
      });
      const s = sessionFromAuth(data);
      if (!s) return { ok: false, reason: 'unknown' };
      saveSession(s);
      return { ok: true, user: s.user, confirmed: !!(s.user && s.user.email_confirmed_at) };
    } catch (e) {
      return { ok: false, reason: mapAuthError(e), error: e };
    }
  }

  async function resendVerification(email) {
    try {
      await request(`${AUTH}/resend`, {
        method: 'POST',
        body: { type: 'signup', email: String(email || '').trim().toLowerCase() }
      });
      return { ok: true };
    } catch (e) {
      const r = mapAuthError(e);
      return { ok: false, reason: r === 'rate_limited' ? 'rate_limited' : r };
    }
  }

  async function recover(email) {
    try {
      await request(`${AUTH}/recover`, {
        method: 'POST',
        body: { email: String(email || '').trim().toLowerCase() }
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: mapAuthError(e) };
    }
  }

  async function updatePassword(password) {
    const data = await request(`${AUTH}/user`, { method: 'PUT', body: { password: String(password || '') } })
      .catch((e) => ({ __error: e }));
    if (data && data.__error) return { ok: false, reason: mapAuthError(data.__error) };
    return { ok: true, user: data };
  }

  async function signOut() {
    try { await request(`${AUTH}/logout`, { method: 'POST', retry: 0 }); } catch (e) { /* 서버 세션이 이미 없어도 로컬은 지운다 */ }
    clearSession();
    stopRealtime();
    emitAuth('signed_out');
    return { ok: true };
  }

  /** 메일 링크로 돌아왔을 때(#access_token=…&type=recovery|signup) 세션을 되살린다. */
  async function handleUrlCallback() {
    const hash = String(global.location.hash || '').replace(/^#/, '');
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type') || 'signup';
    if (params.get('error') || params.get('error_description')) {
      return { type: 'error', error: params.get('error_description') || params.get('error') };
    }
    if (!access_token) return null;
    saveSession({
      access_token,
      refresh_token: refresh_token || null,
      expires_at: Date.now() + Number(params.get('expires_in') || 3600) * 1000 - 30000,
      user: null
    });
    /* 주소창의 토큰은 지운다(공유·뒤로가기로 새지 않게). */
    try { global.history.replaceState(null, '', global.location.pathname + global.location.search); } catch (e) { /* noop */ }
    return { type };
  }

  /** 세션의 사용자 정보를 새로고침한다(이메일 인증 여부 확인). */
  async function getUser() {
    if (!hasSession()) return { ok: false, reason: 'no_session' };
    try {
      const u = await request(`${AUTH}/user`, { method: 'GET' });
      state.session.user = {
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at || (u.confirmed_at || null),
        user_metadata: u.user_metadata || {}
      };
      saveSession(state.session);
      return { ok: true, user: state.session.user };
    } catch (e) {
      return { ok: false, reason: mapAuthError(e) };
    }
  }

  /* ----------------------------------------------------------------- RPC */
  async function rpc(name, args) {
    try {
      const data = await request(`${REST}/rpc/${name}`, { method: 'POST', body: args || {}, retry: 0 });
      return { ok: true, data };
    } catch (e) {
      return { ok: false, reason: e.code === 'network' ? 'network' : (e.code || 'error'), error: e };
    }
  }

  /** @아이디 → 가입한 이메일 힌트(예: yu***@gmail.com) */
  async function emailHintForHandle(handle) {
    const r = await rpc('oog_email_hint_for_handle', { p_handle: String(handle || '') });
    if (!r.ok) return { ok: false, reason: r.reason };
    const d = r.data || {};
    return d.ok ? { ok: true, hint: d.hint } : { ok: false, reason: d.reason || 'not_found' };
  }

  /** 이메일 → @아이디 힌트(예: @dol***) */
  async function handleHintForEmail(email) {
    const r = await rpc('oog_handle_hint_for_email', { p_email: String(email || '') });
    if (!r.ok) return { ok: false, reason: r.reason };
    const d = r.data || {};
    return d.ok ? { ok: true, hint: d.hint } : { ok: false, reason: d.reason || 'not_found' };
  }

  async function handleAvailable(handle) {
    const r = await rpc('oog_handle_available', { p_handle: String(handle || '') });
    if (!r.ok) return { ok: false, available: false, reason: r.reason };
    return { ok: true, available: r.data === true };
  }

  /**
   * v37.7 — 이메일이 **아직 가입에 쓰이지 않았는지** 서버에 묻는다(가입 1/4 단계).
   *  · available: false = 이미 auth.users 에 있는 주소(인증 대기 계정 포함)
   *  · 서버가 답하지 못하면(네트워크·조회 제한) 흐름을 막지 않는다(available: true).
   *    진짜 중복은 가입 마지막의 signUp() 이 identities: [] 로 한 번 더 막는다.
   */
  async function checkEmail(email) {
    const mail = String(email || '').trim().toLowerCase();
    if (!mail) return { ok: true, available: true };
    const r = await rpc('oog_email_available', { p_email: mail });
    if (!r.ok) return { ok: false, available: true, reason: r.reason };
    return { ok: true, available: r.data !== false };
  }

  /* ------------------------------------------------------------- storage */
  function dataUrlToBlob(dataUrl) {
    const m = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(String(dataUrl || ''));
    if (!m) return null;
    const mime = m[1] || 'image/jpeg';
    if (m[2]) {
      const bin = atob(m[3]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }
    return new Blob([decodeURIComponent(m[3])], { type: mime });
  }

  function extFor(blob) {
    const t = (blob && blob.type) || 'image/jpeg';
    if (t.includes('png')) return 'png';
    if (t.includes('webp')) return 'webp';
    return 'jpg';
  }

  /**
   * 사진(data URL)을 버킷에 올리고 경로를 돌려준다.
   * 경로는 `<내 uuid>/<종류>/<id>.<ext>` — 스토리지 정책이 첫 폴더를 내 uuid 로 검사한다.
   */
  async function uploadPhoto(dataUrl, bucket, kind) {
    const u = currentUser();
    if (!u || !isUuid(u.id)) return { ok: false, reason: 'no_session' };
    if (!/^data:image\//.test(String(dataUrl || ''))) return { ok: false, reason: 'not_image' };
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return { ok: false, reason: 'not_image' };
    const path = `${u.id}/${kind || 'photo'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${extFor(blob)}`;
    try {
      await request(`${STORAGE}/object/${bucket}/${path}`, {
        method: 'POST',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'true' },
        retry: 1
      });
      return { ok: true, bucket, path, url: publicUrl(bucket, path) };
    } catch (e) {
      return { ok: false, reason: e.code === 'network' ? 'network' : 'upload_failed', error: e };
    }
  }

  function publicUrl(bucket, path) {
    return `${STORAGE}/object/public/${bucket}/${path}`;
  }

  async function signedUrl(bucket, path, expiresIn = 3600) {
    try {
      const d = await request(`${STORAGE}/object/sign/${bucket}/${path}`, { method: 'POST', body: { expiresIn }, retry: 0 });
      if (d && d.signedURL) return { ok: true, url: `${CONF.url}/storage/v1${d.signedURL}` };
      return { ok: false, reason: 'no_url' };
    } catch (e) {
      return { ok: false, reason: e.code || 'error' };
    }
  }

  /** data URL 이면 올려서 공개 URL 로 바꾼다(이미 http URL 이면 그대로). */
  async function ensurePhotoUrl(value, bucket, kind) {
    if (!value || typeof value !== 'string') return { ok: true, url: value || null };
    if (/^https?:\/\//.test(value)) return { ok: true, url: value };
    if (!/^data:image\//.test(value)) return { ok: true, url: null };
    if (!hasSession()) return { ok: false, reason: 'no_session', url: value };
    const up = await uploadPhoto(value, bucket, kind);
    if (!up.ok) return up;
    return { ok: true, url: up.url, path: up.path };
  }

  /* ==========================================================================
   * 동기화 — store 의 배열 ↔ 표의 data(jsonb)
   * ======================================================================== */

  const TABLES = {
    groups: {
      coll: 'groups',
      /* 모임 줄: 멤버 명단은 group_members 표가 따로 맡는다(공개 열람 시 명단 보호). */
      toRow: (g, me) => ({
        id: g.id,
        owner_id: isUuid(g.leaderId) ? g.leaderId : (isUuid(g.ownerId) ? g.ownerId : null),
        visibility: g.privacyType === 'open' ? 'public' : 'private',
        data: stripKeys(g, ['members']),
        deleted: false
      }),
      fromRow: (r) => ({ ...(r.data || {}), id: r.id }),
      writable: (g, me) => isUuid(g.leaderId) && g.leaderId === me
    },
    group_members: {
      /* 모임 멤버 줄 — groups[].members 를 펼친다. */
      expand: (st, me) => {
        const out = [];
        (st.groups || []).forEach((g) => {
          /* 모임장은 members[] 가 아니라 leaderId 로 산다 — 서버에는 'owner' 줄로 올린다.
             (그래야 다른 기기·다른 사람이 모임을 볼 때도 명단이 온전하다.) */
          if (isUuid(g.leaderId) && !(g.members || []).some((m) => m && m.id === g.leaderId)) {
            out.push({
              group_id: g.id,
              user_id: g.leaderId,
              role: 'owner',
              status: 'member',
              data: {
                nickname: g.leaderName || (g.leaderId === me ? ((st.currentUser || {}).nickname || '') : ''),
                avatarText: (g.leaderName || '?').charAt(0),
                gradient: null,
                photoUrl: (g.coverIconPreset ? null : null),
                joinedAt: g.createdAt || null
              }
            });
          }
          (g.members || []).forEach((m) => {
            if (!m || !isUuid(m.id)) return;
            out.push({
              group_id: g.id,
              user_id: m.id,
              role: m.role === 'owner' ? 'owner' : (m.role === 'staff' ? 'staff' : 'member'),
              status: m.status === 'pending' ? 'pending' : 'member',
              data: {
                nickname: m.name || m.nickname || '',
                avatarText: m.avatarText || '',
                gradient: m.gradient || m.avatarGradient || null,
                photoUrl: m.photoUrl || null,
                joinedAt: m.joinedAt || null
              }
            });
          });
        });
        return out;
      },
      key: (r) => `${r.group_id}:${r.user_id}`,
      onConflict: 'group_id,user_id',
      writable: (r, me) => r.user_id === me
    },
    posts: {
      coll: 'posts',
      /* 피드 글(feedPosts)과 탐색 글(explorePosts)을 한 표에 담고 kind 로 가른다. */
      expand: (st) => {
        const rows = [];
        (st.feedPosts || []).forEach((p) => {
          if (!p || !p.id) return;
          rows.push({ id: p.id, group_id: p.groupId || null, author_id: isUuid(p.authorId) ? p.authorId : null, kind: 'feed', data: p, deleted: false });
        });
        (st.explorePosts || []).forEach((p) => {
          if (!p || !p.id) return;
          rows.push({ id: p.id, group_id: null, author_id: isUuid(p.authorId) ? p.authorId : null, kind: 'explore', data: p, deleted: false });
        });
        return rows;
      },
      writable: (r, me) => r.author_id === me
    },
    events: {
      coll: 'events',
      expand: (st) => (st.groupEvents || []).filter((e) => e && e.id && e.groupId).map((e) => ({
        id: e.id,
        group_id: e.groupId,
        author_id: isUuid(e.createdBy) ? e.createdBy : (isUuid(e.authorId) ? e.authorId : null),
        data: e, deleted: false
      })),
      writable: (r, me) => r.author_id === me
    },
    notices: {
      coll: 'notices',
      expand: (st) => (st.groupNotices || []).filter((n) => n && n.id && n.groupId).map((n) => ({
        id: n.id,
        group_id: n.groupId,
        author_id: isUuid(n.authorId) ? n.authorId : null,
        data: n, deleted: false
      })),
      writable: (r, me) => r.author_id === me
    },
    group_chats: {
      coll: 'groupChats',
      expand: (st) => (st.groupChats || []).filter((c) => c && c.groupId).map((c) => ({
        group_id: c.groupId, data: c
      })),
      key: (r) => r.group_id,
      onConflict: 'group_id',
      fromRow: (r) => ({ ...(r.data || {}), groupId: r.group_id }),
      writable: (r, me) => true
    },
    event_chats: {
      coll: 'eventChats',
      expand: (st) => (st.eventChats || []).filter((c) => c && c.eventId).map((c) => ({
        event_id: c.eventId, group_id: c.groupId || null, data: c
      })),
      key: (r) => r.event_id,
      onConflict: 'event_id',
      fromRow: (r) => ({ ...(r.data || {}), eventId: r.event_id }),
      writable: (r, me) => true
    },
    dm_rooms: {
      coll: 'chatRooms',
      expand: (st, me) => (st.chatRooms || []).filter((c) => c && c.id).map((c) => {
        const partner = String(c.partnerId || '');
        return {
          id: c.id,
          user_a: me,
          user_b: isUuid(partner) ? partner : null,
          data: c
        };
      }),
      writable: (r, me) => r.user_a === me
    },
    stories: {
      coll: 'stories',
      expand: (st) => (st.stories || []).concat(st.storyArchive || [])
        .filter((s) => s && s.id && isUuid(s.authorId)).map((s) => ({
          id: s.id,
          group_id: s.groupId || null,
          author_id: s.authorId,
          data: s,
          deleted: false
        })),
      writable: (r, me) => r.author_id === me
    },
    group_applications: {
      coll: 'groupApplications',
      expand: (st) => (st.groupApplications || []).filter((a) => a && a.id && a.groupId).map((a) => ({
        id: a.id,
        group_id: a.groupId,
        user_id: isUuid(a.userId || a.applicantId) ? (a.userId || a.applicantId) : null,
        data: a, deleted: false
      })),
      writable: (r, me) => r.user_id === me
    },
    notifications: {
      coll: 'notifications',
      expand: (st, me) => (st.notificationLog || []).filter((n) => n && n.id).map((n) => ({
        id: n.id, user_id: me, data: n, deleted: false
      })),
      writable: (r, me) => r.user_id === me
    }
  };

  function stripKeys(obj, keys) {
    const out = {};
    Object.keys(obj || {}).forEach((k) => { if (!keys.includes(k)) out[k] = obj[k]; });
    return out;
  }

  function tableRows(name, store2, me) {
    const spec = TABLES[name];
    if (!spec) return [];
    if (spec.expand) return spec.expand(store2, me) || [];
    const list = store2[spec.coll] || [];
    return list.filter((x) => x && x.id).map((x) => spec.toRow ? spec.toRow(x, me) : { id: x.id, data: x, deleted: false });
  }

  function rowKey(name, row) {
    const spec = TABLES[name];
    if (spec && spec.key) return spec.key(row);
    return String(row.id);
  }

  async function upsertRows(table, rows) {
    if (!rows.length) return;
    const onConflict = (TABLES[table] && TABLES[table].onConflict) || 'id';
    const chunk = 80;
    for (let i = 0; i < rows.length; i += chunk) {
      await request(`${REST}/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
        method: 'POST',
        body: rows.slice(i, i + chunk),
        headers: { 'Content-Type': 'application/json' },
        prefer: 'resolution=merge-duplicates,return=minimal',
        retry: 1
      });
    }
  }

  async function deleteRow(table, keySpec) {
    const qs = Object.entries(keySpec).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    await request(`${REST}/${table}?${qs}`, { method: 'DELETE', prefer: 'return=minimal', retry: 0 });
  }

  /* --------------------------------------------------------------- 사진 */
  const BUCKET_OF = {
    profiles: 'avatars',
    groups: 'group-covers',
    posts: 'post-images',
    stories: 'post-images',
    notices: 'post-images',
    events: 'post-images',
    group_chats: 'post-images',
    event_chats: 'post-images',
    dm_rooms: 'post-images'
  };

  /**
   * 줄 안에 남아 있는 data:image/… 를 Storage 에 올리고 URL 로 바꾼다(제자리 수정).
   *  · 사진 업로드는 한 번만 일어난다 — 바뀐 값은 URL 이라 다음 저장에서 건너뛴다.
   *  · 실패하면 data URL 을 그대로 둔다(로컬 화면은 계속 보이고, 다음 저장에서 다시 시도).
   */
  async function uploadInline(value, bucket, kind) {
    if (typeof value === 'string') {
      if (!/^data:image\//.test(value)) return { value, changed: false };
      const up = await uploadPhoto(value, bucket, kind);
      return up.ok ? { value: up.url, changed: true, path: up.path } : { value, changed: false };
    }
    if (Array.isArray(value)) {
      let changed = false;
      for (let i = 0; i < value.length; i += 1) {
        const r = await uploadInline(value[i], bucket, kind);
        if (r.changed) { value[i] = r.value; changed = true; }
      }
      return { value, changed };
    }
    if (value && typeof value === 'object') {
      let changed = false;
      for (const k of Object.keys(value)) {
        const v = value[k];
        if (typeof v === 'string' && v.length > 32 && v.startsWith('data:image/')) {
          const r = await uploadPhoto(v, bucket, kind);
          if (r.ok) { value[k] = r.url; changed = true; }
        } else if (v && typeof v === 'object') {
          const r = await uploadInline(v, bucket, kind);
          if (r.changed) changed = true;
        }
      }
      return { value, changed };
    }
    return { value, changed: false };
  }

  /** 비밀 사진 — 비공개 버킷 + secret_photos 표(RLS: 본인·허용된 사람만). */
  async function syncSecretAlbum(me) {
    const store2 = global.appStore;
    if (!store2 || !store2.state.currentUser) return;
    const album = store2.state.currentUser.album || {};
    const list = Array.isArray(album.secret) ? album.secret : [];
    const keep = new Set();
    for (const photo of list) {
      if (!photo || !photo.id) continue;
      let path = photo.cloudPath || null;
      if (!path && /^data:image\//.test(String(photo.url || ''))) {
        const up = await uploadPhoto(photo.url, 'secret-photos', 'secret');
        if (up.ok) { path = up.path; photo.cloudPath = path; }
      }
      if (!path) continue;         /* 아직 못 올린 사진은 다음 저장에서 다시 */
      keep.add(photo.id);
      try {
        await request(`${REST}/secret_photos?on_conflict=id`, {
          method: 'POST',
          body: { id: photo.id, owner_id: me, path, caption: photo.caption || null },
          prefer: 'resolution=merge-duplicates,return=minimal', retry: 0
        });
      } catch (e) { /* 다음 저장에서 다시 */ }
    }
    /* 지운 사진 정리 */
    try {
      const rows = await request(`${REST}/secret_photos?select=id,path&owner_id=eq.${me}`, { retry: 0 });
      for (const r of (rows || [])) {
        if (keep.has(r.id)) continue;
        await request(`${REST}/secret_photos?id=eq.${encodeURIComponent(r.id)}`, { method: 'DELETE', retry: 0 }).catch(() => {});
        await request(`${STORAGE}/object/secret-photos/${r.path}`, { method: 'DELETE', retry: 0 }).catch(() => {});
      }
    } catch (e) { /* 무시 */ }
    /* 공유 허용(secretShares) → secret_album_grants */
    const shares = store2.state.currentUser.secretShares || {};
    const viewers = Object.keys(shares).filter((k) => shares[k] === true && isUuid(k));
    try {
      const have = await request(`${REST}/secret_album_grants?select=viewer_id&owner_id=eq.${me}`, { retry: 0 });
      const haveIds = new Set((have || []).map((r) => r.viewer_id));
      for (const v of viewers) {
        if (haveIds.has(v)) continue;
        await request(`${REST}/secret_album_grants?on_conflict=owner_id,viewer_id`, {
          method: 'POST', body: { owner_id: me, viewer_id: v },
          prefer: 'resolution=merge-duplicates,return=minimal', retry: 0
        }).catch(() => {});
      }
      for (const r of (have || [])) {
        if (viewers.includes(r.viewer_id)) continue;
        await request(`${REST}/secret_album_grants?owner_id=eq.${me}&viewer_id=eq.${r.viewer_id}`, { method: 'DELETE', retry: 0 }).catch(() => {});
      }
    } catch (e) { /* 무시 */ }
  }

  /**
   * v37.5 (#24337) — 비밀앨범 열람 요청을 서버에 반영한다(secret_album_requests).
   *  · 내가 보낸 요청: 줄이 없으면 만든다(이미 있으면 그대로 — 상대가 바꾼 상태를 덮지 않는다).
   *  · 내가 받은 요청: 주인(나)이 정한 상태로 고친다.
   */
  async function syncSecretRequests(me) {
    const store2 = global.appStore;
    if (!store2 || !store2.state || !isUuid(me)) return;
    const reqs = store2.state.secretRequests || {};
    for (const partnerId of Object.keys(reqs)) {
      const r = reqs[partnerId];
      if (!r) continue;
      const requester = isUuid(r.requesterId) ? r.requesterId : null;
      const owner = isUuid(r.ownerId) ? r.ownerId : null;
      if (!requester || !owner) continue;
      try {
        if (requester === me) {
          await request(`${REST}/secret_album_requests?on_conflict=requester_id,owner_id`, {
            method: 'POST',
            body: { id: r.id || rid('sreq'), requester_id: requester, owner_id: owner, status: 'pending' },
            prefer: 'resolution=ignore-duplicates,return=minimal', retry: 0
          });
          /* 상대가 전에 거절·다시 닫기했으면 **다시 요청**할 수 있다
             (granted 행은 절대 건드리지 않는다 — 조건부 PATCH). */
          if ((r.status || 'pending') === 'pending') {
            await request(`${REST}/secret_album_requests?requester_id=eq.${me}&owner_id=eq.${owner}&status=in.(declined,revoked)`, {
              method: 'PATCH',
              body: { status: 'pending', updated_at: nowIso() },
              prefer: 'return=minimal', retry: 0
            }).catch(() => {});
          }
        } else if (owner === me) {
          await request(`${REST}/secret_album_requests?requester_id=eq.${requester}&owner_id=eq.${me}`, {
            method: 'PATCH',
            body: { status: r.status || 'pending', updated_at: nowIso() },
            prefer: 'return=minimal', retry: 0
          });
        }
      } catch (e) { /* 다음 저장에서 다시 시도 */ }
    }
  }

  /**
   * v37.5 — 상대(ownerId)의 비밀앨범 사진을 서명 URL 로 받아 온다.
   *  · 열람 권한이 없으면 RLS 가 빈 목록을 준다(잠김 상태 그대로).
   *  · 받은 목록은 store 에 캐시하고(1시간), 앨범을 열 때마다 새로 받는다.
   */
  async function fetchSecretAlbum(ownerId) {
    const store2 = global.appStore;
    if (!ownerId || !isUuid(ownerId) || !hasSession()) return { ok: false, reason: 'no_session', photos: [] };
    try {
      const rows = await request(`${REST}/secret_photos?select=id,path,caption&owner_id=eq.${encodeURIComponent(ownerId)}&order=created_at.asc`, { retry: 0 });
      const photos = [];
      for (const r of (rows || [])) {
        if (!r || !r.path) continue;
        const signed = await signedUrl('secret-photos', r.path, 3600);
        if (signed.ok) photos.push({ id: r.id, url: signed.url, caption: r.caption || '' });
      }
      if (store2 && store2.setPersonSecretPhotos) store2.setPersonSecretPhotos(ownerId, photos);
      return { ok: true, photos };
    } catch (e) {
      return { ok: false, reason: e.code || 'error', photos: [] };
    }
  }

  /* ---------------------------------------------------------- 회원탈퇴 (v37.6) */
  const MY_BUCKETS = ['avatars', 'public-photos', 'group-covers', 'post-images', 'secret-photos'];

  /** 내 폴더(<uuid>/…) 의 파일 경로를 모은다(Storage list 는 폴더별로 한 단계씩). */
  async function listMyObjects(bucket, prefix, depth) {
    const out = [];
    const rows = await request(`${STORAGE}/object/list/${bucket}`, {
      method: 'POST',
      body: { prefix, limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } },
      retry: 0
    }).catch(() => []);
    for (const r of (Array.isArray(rows) ? rows : [])) {
      if (!r || !r.name) continue;
      const path = prefix ? `${prefix}/${r.name}` : r.name;
      if (r.id == null) {
        if (depth < 3) out.push(...await listMyObjects(bucket, path, depth + 1));
      } else out.push(path);
    }
    return out;
  }

  /** 내 사진 파일을 모든 버킷에서 지운다(세션이 살아 있을 때만 정책이 허용한다). */
  async function deleteMyStorage() {
    const me = currentUser();
    if (!me || !isUuid(me.id)) return { ok: false, reason: 'no_session', removed: 0 };
    let removed = 0;
    for (const bucket of MY_BUCKETS) {
      const paths = await listMyObjects(bucket, me.id, 0);
      for (let i = 0; i < paths.length; i += 100) {
        const chunk = paths.slice(i, i + 100);
        try {
          await request(`${STORAGE}/object/${bucket}`, { method: 'DELETE', body: { prefixes: chunk }, retry: 0 });
          removed += chunk.length;
        } catch (e) { /* 남은 파일은 관리자가 정리한다 */ }
      }
    }
    return { ok: true, removed };
  }

  /**
   * v37.6 (#24426) — 회원탈퇴 전 **비밀번호 재인증**.
   *  · 지금 로그인한 계정의 이메일에 사용자가 방금 넣은 비밀번호로 다시 로그인한다
   *    (Supabase Auth `signInWithPassword` 와 같은 `POST /auth/v1/token?grant_type=password`).
   *  · 성공하면 그 응답의 **새 세션**으로 갈아 끼운다 — 세션이 만료됐어도 이 순간부터 유효하다.
   *  · 비밀번호가 틀리면 `password_mismatch` 로 돌려주고 **아무것도 지우지 않는다**.
   */
  async function reauthenticate(password, emailOverride) {
    const me = currentUser();
    const email = (me && me.email ? String(me.email) : String(emailOverride || '')).trim().toLowerCase();
    const pw = String(password == null ? '' : password);
    if (email.indexOf('@') <= 0) return { ok: false, reason: 'no_email' };
    if (!pw) return { ok: false, reason: 'password_empty' };
    const r = await signIn(email, pw);
    if (!r.ok) return { ok: false, reason: r.reason || 'unknown' };
    if (!hasSession()) return { ok: false, reason: 'no_session' };
    return { ok: true, user: r.user, email };
  }

  /**
   * 계정이 정말 사라졌는지 서버에 되묻는다(삭제 뒤 왕복 확인).
   *  · 토큰이 아직 살아 있으면(200) 계정이 남아 있는 것이다.
   *  · 401/403 이면 세션의 주인이 사라진 것 — auth.users 에서 지워졌다는 뜻이다.
   *  · 답을 못 받으면(null) 판정하지 않는다.
   */
  async function accountGone() {
    if (!state.session || !state.session.access_token) return true;
    try {
      const res = await fetch(`${AUTH}/user`, {
        method: 'GET',
        headers: { apikey: CONF.key, Authorization: `Bearer ${state.session.access_token}` },
        cache: 'no-store'
      });
      if (res.status === 200) return false;
      if (res.status === 401 || res.status === 403) return true;
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * v37.6 (#24426) — 회원탈퇴: ① 비밀번호 재인증 → ② 내 사진 파일 → ③ RPC `delete_my_account()`
   *  (프로필·모임 멤버·글·댓글·일정·공지·대화·알림·비밀사진·권한·요청·상태 → auth.users) →
   *  ④ 계정이 사라졌는지 왕복 확인 → ⑤ 로컬 세션·동기화 기억 비우기.
   *
   *  · **세션이 없거나 만료됐다는 이유로 '로컬만 지운 성공'을 돌려주지 않는다.**
   *    (v37.5 까지는 `mode:'local'` 로 성공 처리해 서버 계정이 그대로 남았다 — 사용자가 같은
   *     이메일·비밀번호로 다시 로그인돼 버린 원인.)
   *  · 비밀번호가 틀리면 아무것도 지우지 않고 `password_mismatch` 로 돌아간다.
   *  · 서버가 지웠다고 해도 확인이 안 되면 `still_exists` 로 돌려 로컬 상태를 남긴다.
   */
  async function deleteAccount(password, emailOverride) {
    const me = currentUser();
    const raw = (me && me.email ? String(me.email) : String(emailOverride || '')).trim().toLowerCase();
    /* 이메일처럼 보이는 값(@ 포함)만 서버 계정으로 친다 — 로컬 id(guest_…)로 로그인을 시도하지 않는다. */
    const email = raw.indexOf('@') > 0 ? raw : '';
    /* 이 기기에 **서버 계정이 한 번도 붙지 않은** 경우(로컬 시연·테스트): 서버에 지울 것이 없다.
       이메일을 아는 순간부터는 세션이 없어도 아래 재인증으로 서버까지 지운다. */
    if (!email) {
      if (hasSession()) return { ok: false, reason: 'no_email' };
      clearSession();
      stopRealtime();
      resetSyncMemory();
      return { ok: true, mode: 'local', removed: 0 };
    }
    /* ① 비밀번호 재인증 — 이 단계를 지나야만 서버를 건드린다. */
    const auth = await reauthenticate(password, email);
    if (!auth.ok) return { ok: false, reason: auth.reason };
    /* ② 내 사진 파일(모든 버킷) */
    const files = await deleteMyStorage();
    /* ③ DB·Auth 계정 */
    const r = await rpc('delete_my_account', {});
    if (!r.ok) {
      return { ok: false, reason: r.reason, message: (r.error && r.error.message) || '', files };
    }
    const out = r.data || {};
    if (out && out.ok === false) {
      return { ok: false, reason: out.reason || 'server_refused', message: out.message || '', files };
    }
    /* ④ 정말 사라졌는지 왕복 확인 — 남아 있으면 완료라고 말하지 않는다. */
    const gone = await accountGone();
    if (gone === false) {
      return { ok: false, reason: 'still_exists', files, report: out };
    }
    /* ⑤ 이 기기 정리 */
    clearSession();
    stopRealtime();
    resetSyncMemory();
    return {
      ok: true,
      mode: 'server',
      removed: files.removed || 0,
      unverified: gone === null,
      report: out
    };
  }

  /* ----------------------------------------------------------- 내 프로필 */
  function profileRow(user, me) {
    const u = user || {};
    return {
      id: me,
      handle: u.handle ? String(u.handle).replace(/^@+/, '').toLowerCase() : null,
      nickname: u.nickname || '',
      avatar_url: /^https?:/.test(String(u.photoUrl || '')) ? u.photoUrl : null,
      bio: u.bio || null,
      age: Number.isFinite(Number(u.age)) && Number(u.age) > 0 ? Number(u.age) : null,
      azit: u.location || null,
      azit_id: u.azitId || null,
      region_id: u.regionId || null,
      hobbies: Array.isArray(u.hobbies) ? u.hobbies.slice(0, 20) : [],
      explore_visible: u.exploreProfileVisible === true,
      data: {
        ...stripKeys(u, ['album', 'secretShares']),
        album: { public: (u.album && u.album.public) || [], secret: [] },
        /* v37.5 (#24337) — 다른 사람 프로필의 잠긴 비밀앨범 원형이 장수를 보여 줄 수 있게
           **장수만** 공개한다(사진·경로는 절대 넣지 않는다). */
        secretCount: (u.album && Array.isArray(u.album.secret)) ? u.album.secret.length : 0
      }
    };
  }

  async function pushProfile() {
    const store2 = global.appStore;
    const me = currentUser();
    if (!store2 || !me || !isUuid(me.id)) return;
    const u = store2.state.currentUser;
    /* 사진은 Storage 로 — 프로필/아바타는 avatars, 공개 앨범은 public-photos. */
    if (u && typeof u.photoUrl === 'string' && u.photoUrl.startsWith('data:image/')) {
      const up = await uploadPhoto(u.photoUrl, 'avatars', 'avatar');
      if (up.ok) u.photoUrl = up.url;
    }
    if (u && u.album && Array.isArray(u.album.public)) {
      for (const photo of u.album.public) {
        if (photo && typeof photo.url === 'string' && photo.url.startsWith('data:image/')) {
          const up = await uploadPhoto(photo.url, 'public-photos', 'photo');
          if (up.ok) { photo.url = up.url; photo.cloudPath = up.path; }
        }
      }
    }
    const row = profileRow(store2.state.currentUser, me.id);
    await request(`${REST}/profiles?on_conflict=id`, {
      method: 'POST', body: row,
      prefer: 'resolution=merge-duplicates,return=minimal', retry: 1
    });
  }

  async function pushUserState() {
    const store2 = global.appStore;
    const me = currentUser();
    if (!store2 || !me || !isUuid(me.id)) return;
    const s = store2.state;
    const data = {
      settings: s.settings, homePrefs: s.homePrefs, galleryPrefs: s.galleryPrefs,
      notificationSettings: s.notificationSettings, explorePrefs: s.explorePrefs,
      guide: s.guide, tastePrefs: s.tastePrefs, customHobbies: s.customHobbies,
      groupVisits: s.groupVisits, matchSwipes: s.matchSwipes || [],
      onboarding: { completed: true, completedAt: s.onboarding && s.onboarding.completedAt }
    };
    await request(`${REST}/user_state?on_conflict=user_id`, {
      method: 'POST',
      body: { user_id: me.id, data: clone(data), updated_at: nowIso() },
      prefer: 'resolution=merge-duplicates,return=minimal', retry: 1
    });
  }

  /* --------------------------------------------------------------- push */
  function hashRow(row) {
    const s = JSON.stringify(row.data !== undefined ? row.data : row);
    let h = 5381;
    for (let i = 0; i < s.length; i += 1) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return `${s.length}:${h.toString(36)}`;
  }

  async function pushAll(options = {}) {
    const store2 = global.appStore;
    const me = currentUser();
    if (!store2 || !me || !isUuid(me.id) || !hasSession()) return { ok: false, reason: 'no_session' };
    if (state.syncing && !options.force) return { ok: false, reason: 'busy' };
    state.syncing = true;
    const errors = [];
    try {
      await pushProfile();
      await syncSecretAlbum(me.id);
      await syncSecretRequests(me.id);
      let mediaChanged = false;
      for (const name of Object.keys(TABLES)) {
        const spec = TABLES[name];
        const rows = tableRows(name, store2.state, me.id);
        const prev = state.meta.pushed[name] || {};
        const next = {};
        const changed = [];
        for (const row of rows) {
          if (BUCKET_OF[name]) {
            const r = await uploadInline(row.data !== undefined ? row.data : row, BUCKET_OF[name], name === 'groups' ? 'cover' : 'photo');
            if (r.changed) mediaChanged = true;
          }
          const key = rowKey(name, row);
          const h = hashRow(row);
          next[key] = h;
          if (prev[key] !== h) changed.push(row);
        }
        /* 내가 쓸 수 있는 줄만 올린다(남의 글·모임은 건드리지 않는다). */
        const writable = changed.filter((row) => {
          if (name === 'groups') return row.owner_id === me.id;
          if (!spec.writable) return false;
          try { return spec.writable(row, me.id) === true; } catch (e) { return false; }
        });
        const removed = Object.keys(prev).filter((k) => !next[k]);
        try {
          if (writable.length) {
            await upsertRows(name, writable.map((row) => (name === 'group_members' ? row : { ...row, updated_at: nowIso() })));
          }
          for (const key of removed) {
            const spec2 = TABLES[name];
            if (name === 'group_members') {
              const [gid, uidv] = key.split(':');
              await deleteRow(name, { group_id: gid, user_id: uidv });
            } else if (spec2.key) {
              const col = spec2.onConflict;
              await deleteRow(name, { [col]: key });
            } else {
              await deleteRow(name, { id: key });
            }
          }
          state.meta.pushed[name] = next;
        } catch (e) {
          /* 올리지 못한 줄은 '보냄'으로 적지 않는다 — 다음 저장에서 다시 시도한다. */
          errors.push(`${name}: ${e.message || e.code}`);
          state.meta.pushed[name] = prev;
          state.lastError = e;
        }
      }
      await pushUserState();
      if (mediaChanged) { try { store2.saveState(); } catch (e) { /* noop */ } }
      saveMeta();
      state.lastSyncAt = nowIso();
      state.status = errors.length ? 'error' : 'online';
      return { ok: errors.length === 0, errors };
    } finally {
      state.syncing = false;
    }
  }

  /* --------------------------------------------------------------- pull */
  async function selectAll(table, query = '') {
    const pageSize = 1000;
    let offset = 0;
    const out = [];
    for (;;) {
      const rows = await request(`${REST}/${table}?select=*${query}&order=updated_at.asc&limit=${pageSize}&offset=${offset}`, { retry: 1 });
      if (!Array.isArray(rows) || !rows.length) break;
      out.push(...rows);
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
    return out;
  }

  async function pullAll() {
    const store2 = global.appStore;
    const me = currentUser();
    if (!store2 || !me || !isUuid(me.id) || !hasSession()) return { ok: false, reason: 'no_session' };
    try {
      const [profiles, groups, members, posts, events, notices, gchats, echats, dms, stories, apps, notifs, ustate] = await Promise.all([
        selectAll('profiles'),
        selectAll('groups', '&deleted=eq.false'),
        selectAll('group_members'),
        selectAll('posts', '&deleted=eq.false'),
        selectAll('events', '&deleted=eq.false'),
        selectAll('notices', '&deleted=eq.false'),
        selectAll('group_chats'),
        selectAll('event_chats'),
        selectAll('dm_rooms'),
        selectAll('stories', '&deleted=eq.false'),
        selectAll('group_applications', '&deleted=eq.false'),
        selectAll('notifications', '&deleted=eq.false'),
        request(`${REST}/user_state?select=*&user_id=eq.${me.id}`, { retry: 0 }).catch(() => [])
      ]);

      const st = store2.state;
      /* --- 모임 ------------------------------------------------------- */
      const memberRowsByGroup = {};
      (members || []).forEach((m) => {
        (memberRowsByGroup[m.group_id] = memberRowsByGroup[m.group_id] || []).push(m);
      });
      const remoteGroups = (groups || []).map((r) => {
        const g = { ...(r.data || {}), id: r.id };
        g.members = (memberRowsByGroup[r.id] || [])
          .filter((m) => m.status === 'member' && m.role !== 'owner')
          .map((m) => ({
            id: m.user_id,
            name: (m.data && m.data.nickname) || '',
            avatarText: (m.data && m.data.avatarText) || ((m.data && m.data.nickname) || '?').charAt(0),
            gradient: (m.data && m.data.gradient) || null,
            photoUrl: (m.data && m.data.photoUrl) || null,
            role: m.role === 'owner' ? 'leader' : (m.role === 'staff' ? 'staff' : 'member'),
            joinedAt: (m.data && m.data.joinedAt) || null
          }));
        const mine = (memberRowsByGroup[r.id] || []).find((m) => m.user_id === me.id);
        if (mine) g.myRole = mine.role;
        if (r.owner_id) g.leaderId = r.owner_id;
        return g;
      });
      st.groups = mergeById(st.groups, remoteGroups, (item) => isUuid(item.leaderId) && item.leaderId !== me.id ? 'remote' : 'keep');
      st.currentUser.joinedGroupIds = (members || [])
        .filter((m) => m.user_id === me.id && m.status === 'member')
        .map((m) => m.group_id);

      /* --- 글 --------------------------------------------------------- */
      const remoteFeed = [];
      const remoteExplore = [];
      (posts || []).forEach((r) => {
        const p = { ...(r.data || {}), id: r.id };
        if (!p.authorId && r.author_id) p.authorId = r.author_id;
        if (r.kind === 'explore') remoteExplore.push(p); else remoteFeed.push(p);
      });
      st.feedPosts = mergeById(st.feedPosts, remoteFeed);
      st.explorePosts = mergeById(st.explorePosts, remoteExplore);

      /* --- 일정 · 공지 ------------------------------------------------ */
      st.groupEvents = mergeById(st.groupEvents, (events || []).map((r) => ({ ...(r.data || {}), id: r.id, groupId: r.group_id })));
      st.groupNotices = mergeById(st.groupNotices, (notices || []).map((r) => ({ ...(r.data || {}), id: r.id, groupId: r.group_id })));

      /* --- 채팅 ------------------------------------------------------- */
      st.groupChats = mergeByKey(st.groupChats, (gchats || []).map((r) => ({ ...(r.data || {}), groupId: r.group_id })), 'groupId');
      st.eventChats = mergeByKey(st.eventChats, (echats || []).map((r) => ({ ...(r.data || {}), eventId: r.event_id })), 'eventId');
      st.chatRooms = mergeById(st.chatRooms, (dms || []).map((r) => {
        const data = { ...(r.data || {}), id: r.id };
        /* v37.5 — 남이 만든 1:1 방은 data.partnerId 가 '나' 로 저장되어 있다(그 사람 기기 기준).
           내 쪽에서 보면 상대는 **그 방을 만든 사람**이다 — 프로필로 이름·사진을 맞춘다. */
        let partnerId = data.partnerId;
        if (!partnerId || partnerId === me.id) {
          partnerId = (r.user_a === me.id ? r.user_b : r.user_a) || null;
        }
        if (!partnerId || partnerId === me.id) return data;
        const prof = (profiles || []).find((p) => p.id === partnerId);
        return {
          ...data,
          partnerId,
          partnerName: (prof && prof.nickname) || data.partnerName || '메이트',
          partnerHandle: prof && prof.handle ? `@${prof.handle}` : (data.partnerHandle || `@${shortHandle(partnerId)}`),
          partnerAvatarText: (prof && prof.data && prof.data.avatarText)
            || data.partnerAvatarText || ((prof && prof.nickname) || '?').charAt(0),
          partnerGradient: (prof && prof.data && prof.data.avatarGradient) || data.partnerGradient || null,
          partnerHobby: data.partnerHobby || '취미 메이트'
        };
      }));

      /* --- 스토리 · 신청 · 알림 --------------------------------------- */
      const remoteStories = (stories || []).map((r) => ({ ...(r.data || {}), id: r.id, authorId: r.author_id, groupId: r.group_id }));
      const live = remoteStories.filter((s) => !s.archivedAt);
      const archived = remoteStories.filter((s) => s.archivedAt);
      st.stories = mergeById(st.stories, live);
      st.storyArchive = mergeById(st.storyArchive, archived);
      st.groupApplications = mergeById(st.groupApplications, (apps || []).map((r) => ({ ...(r.data || {}), id: r.id, groupId: r.group_id })));
      st.notificationLog = mergeById(st.notificationLog, (notifs || []).map((r) => ({ ...(r.data || {}), id: r.id })));

      /* --- 사람(탐색) — 공개한 프로필만 ------------------------------ */
      const people = (profiles || [])
        .filter((p) => p.id !== me.id && p.explore_visible === true)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname || '',
          /* v37.5 (#24337) — handle 이 비어 있어도 UUID 를 아이디로 쓰지 않는다. */
          handle: p.handle ? `@${p.handle}` : `@${shortHandle(p.id)}`,
          avatarText: (p.data && p.data.avatarText) || (p.nickname || '?').charAt(0),
          avatarGradient: (p.data && p.data.avatarGradient) || null,
          photoUrl: p.avatar_url || null,
          bio: p.bio || '',
          age: p.age || null,
          location: p.azit || '',
          regionId: p.region_id || null,
          hobbyIds: p.hobbies || [],
          hobbies: p.hobbies || [],
          /* v37.5 (#24337 · IMG_4604) — 프로필 상단 원형은 **프로필·공개 앨범 사진만**이다.
             예전에는 이 앨범 목록이 아예 오지 않아 화면이 피드 글 사진을 끌어다 썼다. */
          publicPhotos: ((p.data && p.data.album && Array.isArray(p.data.album.public)) ? p.data.album.public : [])
            .map((ph) => (ph && ph.url) || '')
            .filter((u) => /^https?:/i.test(u)),
          /* 잠긴 비밀앨범 원형의 장수(+N) — 사진은 오지 않는다. */
          secretCount: Math.max(0, Number(p.data && p.data.secretCount) || 0),
          /* v37.0 (#23868) — 상대가 공개를 켠 경우에만 프로필의 '다음 일정' 한 줄이 보인다. */
          upcomingMeetingsPublic: !!(p.data && p.data.upcomingMeetingsPublic === true),
          profileNextEvent: (p.data && p.data.profileNextEvent) || null,
          pastMeetingsPublic: !(p.data && p.data.pastMeetingsPublic === false),
          pastMeetingVisibility: (p.data && p.data.pastMeetingVisibility) || {},
          sample: false
        }));
      if (people.length) st.matchProfiles = mergeById((st.matchProfiles || []).filter((x) => !x.sample), people);

      /* --- 내 프로필 -------------------------------------------------- */
      const mine = (profiles || []).find((p) => p.id === me.id);
      if (mine) {
        const u = st.currentUser;
        u.id = me.id;
        u.nickname = mine.nickname || u.nickname;
        u.handle = mine.handle ? `@${mine.handle}` : u.handle;
        u.photoUrl = mine.avatar_url || u.photoUrl;
        u.bio = mine.bio || u.bio;
        u.age = mine.age == null ? u.age : mine.age;
        u.regionId = mine.region_id || u.regionId;
        u.azitId = mine.azit_id || u.azitId;
        u.location = mine.azit || u.location;
        u.exploreProfileVisible = mine.explore_visible === true;
        u.registered = true;
        if (Array.isArray(mine.hobbies) && mine.hobbies.length) u.hobbies = mine.hobbies;
      }

      /* --- 개인 설정 -------------------------------------------------- */
      const ust = Array.isArray(ustate) ? ustate[0] : null;
      if (ust && ust.data) {
        const d = ust.data;
        if (d.settings) Object.assign(st.settings, d.settings);
        if (d.homePrefs) st.homePrefs = { ...st.homePrefs, ...d.homePrefs };
        if (d.galleryPrefs) st.galleryPrefs = { ...st.galleryPrefs, ...d.galleryPrefs };
        if (d.notificationSettings) st.notificationSettings = { ...st.notificationSettings, ...d.notificationSettings };
        if (d.explorePrefs) st.explorePrefs = { ...st.explorePrefs, ...d.explorePrefs };
        if (d.guide) st.guide = { ...st.guide, ...d.guide };
        if (d.tastePrefs) st.tastePrefs = { ...st.tastePrefs, ...d.tastePrefs };
        if (Array.isArray(d.customHobbies)) st.customHobbies = d.customHobbies;
        if (d.groupVisits) st.groupVisits = { ...st.groupVisits, ...d.groupVisits };
      }

      /* --- 내 비밀 앨범 (서명 URL 로만 보인다) ---------------------- */
      try {
        const sp = await request(`${REST}/secret_photos?select=id,path,caption&owner_id=eq.${me.id}`, { retry: 0 });
        if (Array.isArray(sp)) {
          const local = (st.currentUser.album && st.currentUser.album.secret) || [];
          const byId = new Map(local.map((p) => [p.id, p]));
          const next = [];
          for (const r of sp) {
            const cur = byId.get(r.id);
            if (cur && cur.url && !/^data:/.test(cur.url) && cur.cloudPath === r.path) {
              next.push(cur);
              continue;
            }
            const signed = await signedUrl('secret-photos', r.path, 3600);
            next.push({
              id: r.id,
              url: signed.ok ? signed.url : ((cur && cur.url) || null),
              caption: r.caption || (cur && cur.caption) || '',
              at: (cur && cur.at) || null,
              cloudPath: r.path
            });
          }
          /* 아직 못 올린 이 기기의 사진은 그대로 남긴다. */
          local.forEach((p) => {
            if (p && p.url && String(p.url).startsWith('data:') && !sp.some((r) => r.id === p.id)) next.push(p);
          });
          if (!st.currentUser.album) st.currentUser.album = { public: [], secret: [] };
          st.currentUser.album.secret = next.slice(0, 4);
        }
        const grants = await request(`${REST}/secret_album_grants?select=viewer_id&owner_id=eq.${me.id}`, { retry: 0 });
        if (Array.isArray(grants)) {
          const mine = {};
          grants.forEach((g) => { mine[g.viewer_id] = true; });
          st.currentUser.secretShares = mine;
        }
        /* v37.5 (#24337) — 내가 **열람 허락을 받은** 남의 비밀앨범 (grants.viewer_id = me). */
        const grantedToMe = await request(`${REST}/secret_album_grants?select=owner_id&viewer_id=eq.${me.id}`, { retry: 0 });
        if (Array.isArray(grantedToMe)) {
          const access = {};
          grantedToMe.forEach((g) => { access[g.owner_id] = true; });
          st.secretAlbumAccess = access;
        }
      } catch (e) { /* 비밀 앨범은 없어도 나머지 동기화는 계속 */ }

      /* v37.5 (#24337) — 비밀앨범 열람 요청(내가 보낸 것 + 받은 것) */
      try {
        const reqs = await request(`${REST}/secret_album_requests?select=*&or=(requester_id.eq.${me.id},owner_id.eq.${me.id})`, { retry: 0 });
        if (Array.isArray(reqs)) reqs.forEach((row) => store2.applySecretRequestRow(row));
      } catch (e) { /* 요청 표가 없어도 나머지는 계속 */ }

      /* 내가 가입한 모임 중 서버에 없는 것(아직 못 올린 것)은 남긴다. */
      st.currentUser.joinedGroupIds = Array.from(new Set([
        ...st.currentUser.joinedGroupIds,
        ...(st.groups || []).filter((g) => isUuid(g.leaderId) && g.leaderId === me.id).map((g) => g.id)
      ]));
      if (!st.homePrefs.groupId || !st.currentUser.joinedGroupIds.includes(st.homePrefs.groupId)) {
        st.homePrefs.groupId = st.currentUser.joinedGroupIds[0] || null;
      }

      store2.saveState();
      try { store2.emit && store2.emit(); } catch (e) { /* 구독자 갱신은 app.js 가 한다 */ }
      state.lastSyncAt = nowIso();
      state.status = 'online';
      return { ok: true };
    } catch (e) {
      state.status = e && e.code === 'network' ? 'offline' : 'error';
      state.lastError = e;
      return { ok: false, reason: e.code || 'error', error: e };
    }
  }

  /** id 기준 병합 — 서버에 있는 줄은 서버 값, 아직 못 올린 내 줄은 남긴다. */
  function mergeById(local, remote) {
    const base = Array.isArray(local) ? local : [];
    const byId = new Map(base.map((x) => [x.id, x]));
    (remote || []).forEach((r) => {
      if (!r || !r.id) return;
      const cur = byId.get(r.id);
      byId.set(r.id, cur ? { ...cur, ...r } : r);
    });
    return Array.from(byId.values());
  }

  function mergeByKey(local, remote, key) {
    const base = Array.isArray(local) ? local : [];
    const map = new Map(base.map((x) => [x[key], x]));
    (remote || []).forEach((r) => {
      if (!r || !r[key]) return;
      const cur = map.get(r[key]);
      map.set(r[key], cur ? { ...cur, ...r } : r);
    });
    return Array.from(map.values());
  }

  /* ---------------------------------------------------------- realtime */
  const RT_TABLES = ['profiles', 'groups', 'group_members', 'posts', 'events', 'notices',
    'group_chats', 'event_chats', 'dm_rooms', 'stories', 'group_applications', 'notifications',
    'secret_album_requests'];

  function stopRealtime() {
    if (state.ws) {
      try { state.ws.close(); } catch (e) { /* noop */ }
      state.ws = null;
    }
    state.wsAlive = false;
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  }

  function startRealtime() {
    if (!hasSession() || typeof WebSocket === 'undefined') { startPolling(); return; }
    const token = state.session.access_token;
    const wsUrl = `${CONF.url.replace('https://', 'wss://')}/realtime/v1/websocket?apikey=${encodeURIComponent(CONF.key)}&vsn=1.0.0`;
    try {
      const ws = new WebSocket(wsUrl);
      state.ws = ws;
      ws.onopen = () => {
        state.wsAlive = true;
        state.status = 'online';
        const payload = {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
            postgres_changes: RT_TABLES.map((t) => ({ event: '*', schema: 'public', table: t }))
          },
          access_token: token
        };
        ws.send(JSON.stringify({ topic: 'realtime:oog', event: 'phx_join', payload, ref: String(++state.wsRef), join_ref: String(state.wsRef) }));
        if (state.realtimeTimer) clearInterval(state.realtimeTimer);
        state.realtimeTimer = setInterval(() => {
          if (ws.readyState === 1) ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++state.wsRef) }));
        }, 25000);
      };
      ws.onmessage = (ev) => {
        let msg = null;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (msg.event === 'postgres_changes' && msg.payload) applyRealtime(msg.payload);
        if (msg.event === 'phx_reply' && msg.payload && msg.payload.status === 'error') {
          /* 권한·토큰 문제면 소켓을 버리고 폴링으로 내려간다(같은 오류를 반복하지 않는다). */
          stopRealtime();
          startPolling();
        }
      };
      ws.onerror = () => { /* onclose 가 정리한다 */ };
      ws.onclose = () => {
        state.wsAlive = false;
        if (state.ws) { state.ws = null; startPolling(); }
      };
    } catch (e) {
      startPolling();
    }
  }

  function startPolling() {
    if (state.pollTimer) return;
    state.pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (!hasSession()) return;
      pullAll().then(() => { if (global.oogRefresh) global.oogRefresh(); }).catch(() => {});
    }, 45000);
  }

  function applyRealtime(payload) {
    const store2 = global.appStore;
    if (!store2) return;
    const type = payload.type || payload.eventType;
    const table = payload.table;
    const rec = payload.record || payload.new;
    const old = payload.old_record || payload.old;
    if (!table) return;
    const st = store2.state;
    try {
      if (table === 'posts' && rec) {
        const p = { ...(rec.data || {}), id: rec.id };
        if (rec.kind === 'explore') st.explorePosts = mergeById(st.explorePosts, [p]);
        else st.feedPosts = mergeById(st.feedPosts, [p]);
      } else if (table === 'groups' && rec) {
        const g = { ...(rec.data || {}), id: rec.id };
        const cur = (st.groups || []).find((x) => x.id === rec.id);
        if (cur) Object.assign(cur, g);
        else st.groups = [...(st.groups || []), g];
      } else if (table === 'group_members' && rec) {
        const g = (st.groups || []).find((x) => x.id === rec.group_id);
        if (g) {
          const list = (g.members || []).filter((m) => m.id !== rec.user_id);
          if (type !== 'DELETE') {
            list.push({
              id: rec.user_id, name: (rec.data && rec.data.nickname) || '',
              avatarText: (rec.data && rec.data.avatarText) || '', gradient: (rec.data && rec.data.gradient) || null,
              photoUrl: (rec.data && rec.data.photoUrl) || null,
              role: rec.role === 'owner' ? 'leader' : (rec.role === 'staff' ? 'staff' : 'member')
            });
          }
          g.members = list;
        }
      } else if (table === 'events' && rec) {
        st.groupEvents = mergeById(st.groupEvents, [{ ...(rec.data || {}), id: rec.id, groupId: rec.group_id }]);
      } else if (table === 'notices' && rec) {
        st.groupNotices = mergeById(st.groupNotices, [{ ...(rec.data || {}), id: rec.id, groupId: rec.group_id }]);
      } else if (table === 'group_chats' && rec) {
        st.groupChats = mergeByKey(st.groupChats, [{ ...(rec.data || {}), groupId: rec.group_id }], 'groupId');
      } else if (table === 'event_chats' && rec) {
        st.eventChats = mergeByKey(st.eventChats, [{ ...(rec.data || {}), eventId: rec.event_id }], 'eventId');
      } else if (table === 'dm_rooms' && rec) {
        st.chatRooms = mergeById(st.chatRooms, [{ ...(rec.data || {}), id: rec.id }]);
      } else if (table === 'stories' && rec) {
        const s = { ...(rec.data || {}), id: rec.id };
        if (s.archivedAt) st.storyArchive = mergeById(st.storyArchive, [s]);
        else st.stories = mergeById(st.stories, [s]);
      } else if (table === 'group_applications' && rec) {
        st.groupApplications = mergeById(st.groupApplications, [{ ...(rec.data || {}), id: rec.id, groupId: rec.group_id }]);
      } else if (table === 'notifications' && rec) {
        st.notificationLog = mergeById(st.notificationLog, [{ ...(rec.data || {}), id: rec.id }]);
      } else if (table === 'secret_album_requests' && rec) {
        /* v37.5 — 요청이 오가면 그 자리에서 반영한다(받은 요청이면 대화방도 열어 준다). */
        store2.applySecretRequestRow(rec);
      } else if (table === 'profiles' && rec && old && old.id) {
        /* 다른 사람 프로필 갱신 — 탐색 카드만 가볍게 맞춘다. */
      }
      if (type === 'DELETE' && old) {
        const id = old.id || old.event_id || old.group_id;
        if (table === 'posts') { st.feedPosts = st.feedPosts.filter((x) => x.id !== id); st.explorePosts = st.explorePosts.filter((x) => x.id !== id); }
        if (table === 'events') st.groupEvents = st.groupEvents.filter((x) => x.id !== id);
        if (table === 'notices') st.groupNotices = st.groupNotices.filter((x) => x.id !== id);
        if (table === 'group_members' && old.group_id) {
          const g = (st.groups || []).find((x) => x.id === old.group_id);
          if (g) g.members = (g.members || []).filter((m) => m.id !== old.user_id);
        }
      }
      store2.saveState();
      if (global.oogRefresh) global.oogRefresh();
    } catch (e) {
      console.warn('[ooG cloud] realtime 적용 실패', e);
    }
  }

  /* ------------------------------------------------------------- lifecycle */
  function scheduleSync(delay = 700) {
    if (state.syncTimer) clearTimeout(state.syncTimer);
    state.syncTimer = setTimeout(() => {
      state.syncTimer = null;
      pushAll().catch(() => {});
    }, delay);
  }

  /** 로그인 직후 — 내 프로필·설정을 받아오고, 내 기기에만 있던 것을 올린다. */
  async function bootstrap() {
    const store2 = global.appStore;
    const me = currentUser();
    if (!store2 || !me) return { ok: false, reason: 'no_session' };
    if (!me.email_confirmed_at) {
      const fresh = await getUser();
      if (fresh.ok && fresh.user && !fresh.user.email_confirmed_at) return { ok: false, reason: 'email_unconfirmed' };
    }
    const u = store2.state.currentUser || {};
    /* 서버에 이미 내 프로필이 있으면 서버 값이 우선(다른 기기에서 고친 이름·사진). */
    const pulled = await pullAll();
    if (!pulled.ok && pulled.reason === 'network') return { ok: false, reason: 'network' };
    /* 세션 uuid 를 내 프로필 id 로 맞춘다. */
    store2.state.currentUser.id = me.id;
    store2.state.currentUser.registered = true;
    if (!store2.state.currentUser.photoUrl && u.photoUrl) store2.state.currentUser.photoUrl = u.photoUrl;
    store2.saveState();
    await pushAll({ force: true });
    startRealtime();
    return { ok: true };
  }

  /** 로그아웃·계정 전환 — 서버 동기화 기억을 비운다(내 줄을 남의 계정에 올리지 않게). */
  function resetSyncMemory() {
    state.meta = { pushed: {}, pulled: {} };
    saveMeta();
  }

  const api = {
    CONF,
    state,
    // auth
    signUp, signIn, signOut, resendVerification, recover, updatePassword,
    handleUrlCallback, getUser, hasSession, currentUser, refreshSession,
    onAuth(fn) { state.authListeners.push(fn); },
    // data
    rpc, emailHintForHandle, handleHintForEmail, handleAvailable,
    /* v37.7 — 가입 이메일 중복 확인 */
    checkEmail,
    uploadPhoto, ensurePhotoUrl, publicUrl, signedUrl, dataUrlToBlob,
    /* v37.5 (#24337) */
    fetchSecretAlbum, deleteAccount, deleteMyStorage, reauthenticate, accountGone, shortHandle,
    // sync
    pushAll, pullAll, bootstrap, scheduleSync, resetSyncMemory,
    startRealtime, stopRealtime,
    get status() { return state.status; },
    get lastSyncAt() { return state.lastSyncAt; },
    TABLES
  };

  global.OOGCloud = api;
})(typeof window !== 'undefined' ? window : this);
