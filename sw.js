/* ============================================================================
 * ooG (우그) — Service Worker (Sprint 5)
 * ----------------------------------------------------------------------------
 *  1) 정적 에셋 오프라인 캐시  : 앱 셸(index/css/js/폰트/아이콘/manifest)을 미리 담고
 *                               오프라인에서도 화면이 뜨게 한다.
 *  2) 푸시 수신(push)          : 서버(또는 앱)가 보낸 알림을 OS 알림으로 띄운다.
 *  3) 알림 클릭(notificationclick) : 앱 창을 찾아 포커스하고, 딥링크 정보를 postMessage 로
 *                               넘긴다. 창이 없으면 새로 연다(주소에 ?notif=... 전달).
 *
 *  · 캐시 버전을 올리면 activate 에서 옛 캐시를 자동 삭제한다(안전한 버전 관리).
 *  · index.html 을 직접 열었다면(file://) Service Worker 는 등록되지 않는다 — 그때도 앱은 그대로 동작한다.
 * ========================================================================== */

/* v34.5 — 가입 대표 사진(공개 사진 1번) · 타인 프로필 인스타형 화면(1번 큰 사진 + 닉네임/3열 통계
   + 공개 사진 원형 + 하단 3:4 격자/피드) · 상단 헤더 불투명(블러·구분선 없음) · @아이디는 본문 맨 위 중앙
   · 회원가입 아지트 통일 · 바텀시트 바깥 클릭 닫기.
   v35.1 (#23062 · #23069 · #23073 · #23087 · #23099) — 모임 피드 글자 폭 14px · @아이디를
   상단 헤더 가운데로 · 공개 사진 원형을 3열 통계 아래로 · 나이/지역 노출 제거 · 글 상세 하트 초록·
   간격·제목 · 점 세 개(⋯) 게시물 메뉴(수정·좋아요 비공개·공유) · 글 수정 화면의 글 삭제.
   v35.2 (#23147 · IMG_4588) — 모임 상단 3탭·어두운 대표 배너 제거 · 모임 전용 헤더(< · 이름 · 삼선바) ·
   모임 하단 4탭(원형 대표 이미지=모임 홈/정보 · 피드 · 게시판(공지+일정) · 채팅방(단체+1:1)) ·
   삼선바 그룹 설정(게시판 멤버 작성 허용·가입 관리·알림·나가기) · '<' 는 직전 화면으로 복귀.
   v35.3 (설정 정리 S1~S3) — 설정 17항목 → 5행 · 톱니(⚙) 전체 화면 설정 · 화면 모드/알림 하위 페이지 ·
   2시간 프로필·내 활동은 내 프로필로, 가입한 모임/신청 현황은 내 그룹 2탭으로 이동 · 데이터 도구는 ?dev=1.
   v36.0 (G1~G4) — 모임 설정 역할별 개편: 모임장·운영진·멤버 한 화면(모임 헤더 ⋯) · can() 단일 권한 ·
   드로어/중복 설정 코드 삭제 · 용어 통일(모임/모임장/운영진/멤버).
   v36.1 (#23461) — 일정 단톡방 자동 생성·참석자 자동 입장 · 게스트는 승인된 일정과 그 단톡방만 ·
   '운영진에게 멤버 관리까지' 토글이 실제 권한을 가른다 · 나갈 때 '내 글·댓글 지우기'.
   v36.2 (#23528 · IMG_4590) — 가입 전 모임 소개 화면을 모임 탭과 같은 구조로 통일
   (원형 대표 이미지·활동 요약·아지트·멤버·가입 안내 + 하단 가입 버튼, 4탭·단체 채팅 없음) ·
   피드·댓글 역할 배지 폭을 글자에 맞게(늘어짐 수정).
   v36.3 (#23599 · IMG_4591) — 모임 '모임' 탭 상단 '멤버 N' 버튼 안에 겹친 아바타 최대 3개
   (모임장 → 운영진 → 멤버) · 하단 중복 '멤버 N (전체 보기)' 카드 제거.
   v36.4 (#23649) — 내 프로필 탭에서 '2시간 프로필' 상태 행과 '내 활동' 두 줄
   (내가 좋아요한 취미친구 · 내 활동 기록)을 걷어냈다. 2시간 프로필은 탐색 탭의
   '내 프로필 올리기', 활동 기록은 모임 설정 › 내 활동 한 곳에서만 다룬다.
   v37.0 (#23667·#23749·#23791·#23815·#23827) — Supabase 실서비스 전환: 이메일 인증 회원가입·
   로그인·비밀번호 찾기·아이디 찾기, 실DB/Storage/Realtime 동기화(js/cloud.js), 예시(더미) 데이터 0건.
   v37.2 (#23942 · IMG_4593) — 계정·로컬 잔여 데이터 완전 초기화(서버 0건 · 구버전 localStorage 1회 청소,
   유효한 Supabase 세션만 유지) · '이어서 시작' 제거와 자동 로그인(세션 확인 뒤 바로 홈) ·
   회원가입 문구가 다 찍힌 뒤 입력란 카드가 한 번만 나타나게(깜빡임·이중 실행 제거).
   v37.3 (#23949 · IMG_4594·IMG_4596·IMG_4597) — 회원가입 4/4 활동 아지트를 **검색해서 고른다**
   (네이티브 목록 400여 곳 대신 검색창+결과 목록, '아지트 선택 안 함' 유지) · 가이드 취미 고르기를
   **한 구조로 단순화**(분야는 밑줄 탭 한 줄 · 카드 안 중복 질문 제거 · 고른 취미 요약 줄) ·
   직접 쓰기로 취미를 더해도 **고른 것이 초기화되지 않는다**(카드 재렌더 없음 · 빈값/중복/3개 초과만 막음 ·
   도중 답을 저장소에 보관해 앱을 다시 열어도 유지).
   v37.4 (#23956 · IMG_4600) — 라이트 모드의 가이드(스포트라이트)를 **밝게**(흰 안개 · 어두운 글자,
   다크는 그대로) · 피드 카드의 글을 **쓴 그대로**(줄바꿈 유지 · 둘째 줄부터도 보임 · 6줄 넘으면 더 보기) ·
   **태그 검색**(글쓰기 태그 검색·선택·새 태그, 모임 찾기에서 태그와 그 태그가 붙은 글·관련 모임,
   피드 카드의 #태그를 누르면 그 태그 검색 결과로 이동).
   v37.5 (#24337 · IMG_4604) — 회원탈퇴(설정 두 단계 확인 → 사진·DB·Auth 계정까지 삭제) · 프로필 사진 화질
   (256px → 1600px · 0.92, 공개/비밀 앨범도 같은 규격) · 타 이용자 @아이디에 UUID 가 새지 않음(oog#####) ·
   타인 프로필 원형은 프로필·공개 앨범 사진만(피드 글 사진 제외) · **타 이용자의 비밀앨범을 잠긴 원형으로
   노출하고 요청 → 대화방 카드에서 열기/X(거절) → 다시 닫기**.
   v37.6 (#24426) — 회원탈퇴에 **비밀번호 인증**을 넣고, 서버 계정이 실제로 지워지게 수정
   (세션이 없으면 '로컬만 지운 성공'으로 끝나던 폴백 제거 · 재인증 실패면 아무것도 지우지 않음 ·
   삭제 뒤 auth.users 에게 다시 물어 확인 · 남의 글에 단 내 댓글·일정 참석까지 삭제).
   v37.7 — 회원가입 1/4 이메일 단계에서 **이미 가입된 이메일을 바로 막는다**
   (RPC oog_email_available 로 먼저 확인 · 막힌 자리에서 로그인/비밀번호 찾기로 이어짐 ·
   가입 마지막 signUp 도 user.identities = [] 를 email_taken 으로 처리하는 2차 방어선).
   v38.0 (35일차 · Sprint 35 · #23106) — 모임 안 내정보(이 모임 기준 글·일정) · 중복 신청/처리된 결정 안내 ·
   홈 피드 추천 일정 카드의 게스트 참석 버튼 · 나가기 경계 롤백.
   v38.1 (11/26 · 6건 즉시 개편) — ①모임 헤더의 내 원형 → 모임 안 내정보 ②모임 전용 프로필(비포·애프터)
   ③다녀온 모임 기록 유지 + 개별 삭제 ④탈퇴 시 좋아요까지 완전 파기(글 행에 likedByMe 를 싣지 않음)
   ⑤@아이디 중복 검사 서버 보강 ⑥사진 위 × 제거 → 크게 보기 + ⋯(사진 바꾸기/사진 삭제).
   v37.8 (#24749) — 가이드 단순화: **분야 하나만 고르면** 그 안의 취미가 모두 담기고 바로 2단계로.
   · 가이드 중에만 보이는 **임시(가짜) 화면** — 내 모임 3곳(여행 대표 사진)·탐색 글 3개·
   디엠 2건(보낸 사람 사진 2장)을 채워 안내하고, 끝내거나 건너뛰면 즉시 실제 화면으로 돌아간다
   (저장소·DB에는 아무것도 쓰지 않는다). 스포트라이트도 그 임시 구역을 비춘다.
   v38.7 (#26108 · #26120) — 내 프로필에서 사진을 등록·변경할 때, 비밀앨범 사진을 넣거나 바꿀 때,
   모임 전용 프로필 사진을 고를 때도 **풀스크린 원형 크롭(확인/취소)** 을 거친 뒤 저장한다
   (공개 사진·비밀앨범·프로필 편집·모임 전용 프로필 네 길이 같은 판을 쓴다 · 크롭 결과는 1440px 정사각 JPEG).
   v38.8 (#26176) — 원형 크롭에서 사진을 **축소**할 수도 있다(0.35~4배) · 아래 확대 슬라이더를 걷어내고
   원 테두리(모서리 손잡이 네 개)를 끌어 자를 원의 지름을 직접 바꾼다(140~min(vw,vh)-32) ·
   축소해 원 밖이 빈 자리는 어두운 바탕(#0D1117)으로 채워 왜곡 없이 저장한다.
   (캐시 이름을 올려 옛 셸을 확실히 버린다.) */
const CACHE_VERSION = 'oog-shell-v38-8';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/fonts/PretendardVariable.woff2',
  './js/icons.js',
  './js/store.js',
  './js/api.js',
  './js/cloud.js',
  './js/app.js',
  /* H2 — 지역·아지트 목록(http 로 열렸을 때 fetch). 없으면 앱 내장본을 쓴다. */
  './data/regions.json',
  './data/hangouts.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  /* v33.3 — 예시 사진 8장(예시 모임 대표 이미지·피드 사진). 오프라인에서도 같은 화면이 뜨게 담아 둔다. */
  './assets/examples/example-dogs-walk.jpg',
  './assets/examples/example-dog-face.jpg',
  './assets/examples/example-group-character.jpg',
  './assets/examples/example-game-screen.jpg',
  './assets/examples/example-gym-mirror.jpg',
  './assets/examples/example-bbq-grill.jpg',
  './assets/examples/example-summit-view.jpg',
  './assets/examples/example-parade-day.jpg',
  /* v34.1 — 예시 이용자 프로필 사진 4장(오프라인에서도 같은 얼굴이 뜨게). */
  './assets/examples/avatar-morae.jpg',
  './assets/examples/avatar-haru.jpg',
  './assets/examples/avatar-danchu.jpg',
  './assets/examples/avatar-choko.jpg'
];

/* ---------------------------------------------------------------- 설치 */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    /* 하나가 없어도 설치 자체는 끝나게 한다(없는 파일은 다음 요청 때 채운다). */
    await Promise.all(SHELL_ASSETS.map((url) => cache.add(url).catch(() => null)));
    await self.skipWaiting();
  })());
});

/* ---------------------------------------------------------- 활성화(정리) */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) { /* 미지원 브라우저 */ }
    }
    await self.clients.claim();
  })());
});

/* ---------------------------------------------------------------- 요청 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* 외부 CDN 등은 손대지 않는다 */

  /* 화면 이동(문서) — 네트워크 우선, 끊기면 캐시된 셸로 */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  /* 정적 에셋 — 캐시 우선, 없으면 네트워크(성공하면 캐시에 담는다) */
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const hit = await cache.match(req, { ignoreSearch: false });
    if (hit) return hit;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok && fresh.type === 'basic') cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return hit || Response.error();
    }
  })());
});

/* ------------------------------------------------------- 푸시 수신 */
self.addEventListener('push', (event) => {
  let data = { title: 'ooG', body: '새 소식이 도착했어요', url: './', tag: 'oog-push' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    }
  } catch (e) {
    try { data.body = event.data.text(); } catch (e2) { /* 본문 없음 */ }
  }
  event.waitUntil(self.registration.showNotification(data.title || 'ooG', {
    body: data.body || '',
    tag: data.tag || 'oog-push',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    renotify: true,
    data: {
      url: data.url || './',
      kind: data.kind || 'system',
      roomId: data.roomId || null,
      groupId: data.groupId || null,
      postId: data.postId || null,
      source: data.source || null,
      action: data.action || null
    }
  }));
});

/* ----------------------------------------------------- 알림 클릭(딥링크) */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  const target = new URL(payload.url || './', self.registration.scope).href;

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      /* 이미 열린 ooG 창이 있으면 포커스하고, 딥링크 정보를 앱에 넘긴다. */
      if ('focus' in client) {
        client.postMessage({ type: 'oog:notification-click', data: payload });
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});

/* 앱이 "지금 이 알림을 OS 알림으로 띄워줘" 라고 부탁할 때 (창이 백그라운드일 때) */
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type !== 'oog:show-notification' || !msg.entry) return;
  const entry = msg.entry;
  event.waitUntil(self.registration.showNotification(entry.title || 'ooG', {
    body: entry.body || '',
    tag: entry.id || 'oog-push',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: {
      url: './',
      kind: entry.kind || 'system',
      roomId: entry.roomId || null,
      groupId: entry.groupId || null,
      postId: entry.postId || null,
      source: entry.source || null,
      action: entry.action || null
    }
  }));
});
