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

/* v34.4 — 상단 바 중앙 @아이디 · 인스타그램형 프로필(왼쪽 큰 1번 사진 + 오른쪽 닉네임/3열 통계,
   그 아래 공개 사진 2~4번 + 비밀앨범 원형 → 소개 → 내 피드) · 게시물/다녀온 모임/내 그룹 숫자
   · 다음 일정 한 줄 칩(본인만) · 다녀온 모임 전체/모임별 공개(숫자까지 숨김) · 타인 프로필 숫자와 목록
   · 회원가입에서 닉네임과 사용자 아이디(@id)를 함께 정한다.
   (캐시 이름을 올려 옛 셸을 확실히 버린다.) */
const CACHE_VERSION = 'oog-shell-v34-4';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/fonts/PretendardVariable.woff2',
  './js/icons.js',
  './js/store.js',
  './js/api.js',
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
