/**
 * ============================================================================
 * ooG (우그) — Custom Icon System  ·  Sprint R4 (2px 선 · 카테고리 문양)
 * ----------------------------------------------------------------------------
 * 11/16 16:16 사용자: "이모지말고 우그만의 아이콘으로 해줘 이모지는 사용하지말아주고.."
 * R4: 아이콘 2px 통일(클레이 3겹 입체 제거) · 카테고리 표지 문양 7종
 *
 * 우그의 아이콘은 **이모지가 아니라 직접 그린 선**이다. 규칙은 하나다.
 *   · 24×24 격자 · 도형은 2~22px 안쪽 · 둥근 끝(round cap/join)
 *   · **선 두께 2px 한 가지** — 그라데이션·다중 그림자·하이라이트 겹침은 쓰지 않는다.
 *     (Sprint 21 의 클레이 3겹 입체는 R4 에서 걷어냈다.)
 *   · 채움은 **활성 상태에서만** — 하단 탭 활성은 채움형(gridFill·searchFill·chatFill·
 *     personFill·homeFill·noteFill), 좋아요·북마크는 { filled: true }.
 *     그 밖의 아이콘은 모두 선이다.
 *   · 색은 currentColor — 일반 아이콘은 --text/--text-sub, 활성은 --green(또는 그 상태의 색),
 *     카테고리 문양은 --tone-ink(=--cat-N). 아이콘은 색을 스스로 정하지 않는다.
 *   · 크기는 1em — 글자 크기를 따라가므로 라벨·칩·버튼 어디에 넣어도 정렬이 흐트러지지 않는다
 *
 * 쓰는 법
 *   OOGIcons.svg('heart')                     → <svg class="oo-ic" stroke-width="2" …>
 *   OOGIcons.svg('heart', { filled: true })   → 눌린 하트(채움)
 *   OOGIcons.render('heart')                  → 아이콘 키 또는 옛 상태의 이모지를 아이콘으로
 *   OOGIcons.emblemName('violet')             → 'catGame' (대분류 색조 → 표지 문양)
 *   OOGIcons.badge('dumbbell', 'mint')        → 배지(민트 바탕 + 선 아이콘)
 *   OOGIcons.label('location', '강남')         → 아이콘 + 글자 한 묶음
 *
 * 카테고리 표지 문양 7종(catSports·catGame·catRead·catFood·catTravel·catCulture·catDaily)만
 * 2px 선이 아니라 **단색 큰 문양(면)** 이다 — 모임 카드 표지에서 멀리서도 대분류가 읽히게.
 *
 * 옛 저장 상태(이모지가 든 v16 이전 데이터)는 LEGACY 표로 조용히 아이콘으로 바꾼다.
 * ============================================================================
 */
window.OOGIcons = (function () {
  'use strict';

  /* 선 한 가지 — 24 격자에서 2px. 이 값을 바꾸면 세트 전체가 함께 움직인다. */
  const STROKE = 2;

  /* --------------------------------------------------------------- 도형 */
  const PATHS = {
    /* 브랜드 · 기본 */
    dot: '<circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>',
    sparkle: '<path d="M12 3.6l1.7 4.4 4.4 1.7-4.4 1.7L12 15.8l-1.7-4.4L5.9 9.7l4.4-1.7z"/><path d="M18.4 15.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',

    /* 탐색 · 알림 */
    search: '<circle cx="11" cy="11" r="7"/><path d="M16.2 16.2 21 21"/>',
    bell: '<path d="M18 8.4a6 6 0 0 0-12 0c0 6.4-2.6 8.1-2.6 8.1h17.2S18 14.8 18 8.4z"/><path d="M13.7 20.2a2 2 0 0 1-3.4 0"/>',
    heart: '<path d="M20.7 5.1a5.1 5.1 0 0 0-7.2 0L12 6.6l-1.5-1.5a5.1 5.1 0 0 0-7.2 7.2l8.7 8.7 8.7-8.7a5.1 5.1 0 0 0 0-7.2z"/>',
    heartFilled: '<path d="M20.7 5.1a5.1 5.1 0 0 0-7.2 0L12 6.6l-1.5-1.5a5.1 5.1 0 0 0-7.2 7.2l8.7 8.7 8.7-8.7a5.1 5.1 0 0 0 0-7.2z"/>',
    comment: '<path d="M4.4 6.8A2.8 2.8 0 0 1 7.2 4h9.6a2.8 2.8 0 0 1 2.8 2.8v6.4a2.8 2.8 0 0 1-2.8 2.8H9.6L4.4 20.4z"/><path d="M8.4 9.2h7.2M8.4 12.4h4.4"/>',
    chat: '<path d="M4.2 6.6A3.2 3.2 0 0 1 7.4 3.4h9.2a3.2 3.2 0 0 1 3.2 3.2v7.2a3.2 3.2 0 0 1-3.2 3.2H9.4L4.2 20.6z"/>'
      + '<circle cx="8.6" cy="10.4" r="1.15" fill="currentColor" stroke="none"/>'
      + '<circle cx="12" cy="10.4" r="1.15" fill="currentColor" stroke="none"/>'
      + '<circle cx="15.4" cy="10.4" r="1.15" fill="currentColor" stroke="none"/>',
    users: '<circle cx="9.2" cy="8" r="3.2"/><path d="M3.4 19.6c0-3.2 2.6-5.4 5.8-5.4s5.8 2.2 5.8 5.4"/><path d="M16.2 5.6a3.2 3.2 0 0 1 0 6.2"/><path d="M17.6 14.6c1.9.7 3 2.4 3 5"/>',
    person: '<circle cx="12" cy="7.6" r="3.4"/><path d="M5.2 19.8c0-3.7 3-6.2 6.8-6.2s6.8 2.5 6.8 6.2"/>',
    fire: '<path d="M12.2 3.2c.7 2.7-1.3 3.9-2.6 5.7-1.2 1.7-1.5 3-1.5 4.2a4.9 4.9 0 0 0 9.8 0c0-1.4-.4-2.6-1-3.6-.2 1.1-.8 1.9-1.6 2.3.5-3-.5-5.6-1.6-8.6z"/><path d="M12 12.2c.9.9.9 2.3 0 3.4-1-.9-1.1-2.3 0-3.4z"/>',
    check: '<path d="M4.8 12.6 9.6 17.4 19.4 6.6"/>',
    checkCircle: '<circle cx="12" cy="12" r="8.6"/><path d="M8.2 12.4 10.8 15 16 9.4"/>',
    close: '<path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6"/>',
    closeCircle: '<circle cx="12" cy="12" r="8.6"/><path d="M9 9l6 6M15 9l-6 6"/>',
    plus: '<path d="M12 5.4v13.2M5.4 12h13.2"/>',
    trash: '<path d="M4.6 7h14.8M9.6 7V5.3A1.3 1.3 0 0 1 10.9 4h2.2a1.3 1.3 0 0 1 1.3 1.3V7"/><path d="M6.6 7l.8 11.1a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.4 7"/><path d="M10.2 10.8v5.4M13.8 10.8v5.4"/>',
    pencil: '<path d="M16.6 4.5a2.1 2.1 0 0 1 3 3L8.2 18.9l-4.7 1.4 1.4-4.7z"/><path d="M14.4 6.7l2.9 2.9"/>',
    pin: '<path d="M12 21.2s6.6-5.9 6.6-10.7A6.6 6.6 0 0 0 5.4 10.5c0 4.8 6.6 10.7 6.6 10.7z"/><circle cx="12" cy="10.4" r="2.4"/>',
    pushpin: '<path d="M12 14.6v6.2"/><path d="M8.2 4.4h7.6l-.9 5.4 3.1 2.2-.6 1.8H6.6l-.6-1.8 3.1-2.2z"/>',
    sliders: '<path d="M4 7.2h4.4M13.4 7.2H20M4 12h8.2M17.2 12H20M4 16.8h2.6M11.6 16.8H20"/><circle cx="10.9" cy="7.2" r="2.1"/><circle cx="14.6" cy="12" r="2.1"/><circle cx="8.9" cy="16.8" r="2.1"/>',
    calendar: '<rect x="4" y="5.6" width="16" height="14.4" rx="3"/><path d="M8.2 3.4v4.2M15.8 3.4v4.2M4 10.2h16"/>',
    calendarWeek: '<rect x="4" y="5.6" width="16" height="14.4" rx="3"/><path d="M8.2 3.4v4.2M15.8 3.4v4.2M4 10.2h16"/><path d="M8 14h2.4M12.6 14H16M8 17.2h3.6"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.3 2.1"/>',
    hourglass: '<path d="M7.2 4.2h9.6M7.2 19.8h9.6"/><path d="M8.2 4.2v3.2c0 2 3.8 3.2 3.8 4.6s-3.8 2.6-3.8 4.6v3.2M15.8 4.2v3.2c0 2-3.8 3.2-3.8 4.6s3.8 2.6 3.8 4.6v3.2"/>',
    maybe: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 1.9v.4"/><circle cx="12" cy="16.8" r="1.1" fill="currentColor" stroke="none"/>',
    folder: '<path d="M3.6 7.4A2.6 2.6 0 0 1 6.2 4.8h3l1.9 2.5H17.8a2.6 2.6 0 0 1 2.6 2.6v6.7a2.6 2.6 0 0 1-2.6 2.6H6.2a2.6 2.6 0 0 1-2.6-2.6z"/>',
    layers: '<path d="M12 3.8 3.6 8.2 12 12.6l8.4-4.4z"/><path d="M3.8 12.4 12 16.8l8.2-4.4M3.8 16.4 12 20.8l8.2-4.4"/>',
    note: '<path d="M6.2 4.6A1.6 1.6 0 0 1 7.8 3h9.4a1.6 1.6 0 0 1 1.6 1.6v14.8a1.6 1.6 0 0 1-1.6 1.6H7.8a1.6 1.6 0 0 1-1.6-1.6z"/><path d="M9 7.8h6M9 11.4h6M9 15h3.6"/>',
    book: '<path d="M5.2 5.2A1.8 1.8 0 0 1 7 3.4h12v16H7a1.8 1.8 0 0 0-1.8 1.8z"/><path d="M5.2 18.8A1.8 1.8 0 0 1 7 17h12"/>',
    clipboard: '<rect x="5.4" y="4.8" width="13.2" height="15.8" rx="2.6"/><rect x="8.6" y="2.8" width="6.8" height="3.2" rx="1.2"/><path d="M9 10.8h6M9 14.4h4.2"/>',
    file: '<path d="M6 4.6A1.6 1.6 0 0 1 7.6 3h6L19 8.6v10.8A1.6 1.6 0 0 1 17.4 21H7.6A1.6 1.6 0 0 1 6 19.4z"/><path d="M13.2 3.2v5.6h5.4"/>',
    download: '<path d="M12 4v10.6M7.8 10.4 12 14.6l4.2-4.2"/><path d="M4.8 19.6h14.4"/>',
    image: '<rect x="3.8" y="4.8" width="16.4" height="14.4" rx="3.2"/><circle cx="8.8" cy="9.6" r="1.6"/><path d="M4.4 16.6 9.6 12l3.4 3.2 2.4-2.2 4.2 3.8"/>',
    camera: '<path d="M3.9 8.8A2.6 2.6 0 0 1 6.5 6.2h1.6l1.2-1.8h5.4l1.2 1.8h1.6a2.6 2.6 0 0 1 2.6 2.6v7.4a2.6 2.6 0 0 1-2.6 2.6H6.5a2.6 2.6 0 0 1-2.6-2.6z"/><circle cx="12" cy="12.4" r="3.2"/>',
    send: '<path d="M21 3.4 2.8 9.9l7.1 2.9 2.8 7.1z"/><path d="M9.9 12.8 21 3.4"/>',
    bookmark: '<path d="M18.6 20.6 12 15.4l-6.6 5.2V5.4a2.2 2.2 0 0 1 2.2-2.2h8.8a2.2 2.2 0 0 1 2.2 2.2z"/>',

    /* 이동 · 장소 */
    walk: '<circle cx="12.4" cy="4.8" r="1.9"/><path d="M12.2 7.6v5M12.2 12.6 9.4 20M12.2 12.6l2.8 6.2M12.2 9.4 9 11.8M12.2 9.4l3.2 2.2"/>',
    bike: '<circle cx="6.2" cy="16.8" r="3.4"/><circle cx="17.8" cy="16.8" r="3.4"/><path d="M6.2 16.8 9.8 9.8h3.4l2.6 7M9.8 9.8h4.4M14.4 6.4h2.6l1.4 3.4"/>',
    bus: '<rect x="4" y="4.2" width="16" height="12.2" rx="3"/><path d="M4 10.2h16"/><path d="M7.2 16.4v2.6M16.8 16.4v2.6"/><circle cx="8.2" cy="13.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.8" cy="13.2" r="1.1" fill="currentColor" stroke="none"/>',
    train: '<rect x="5" y="3.8" width="14" height="12.8" rx="3.4"/><path d="M5 10.6h14"/><circle cx="9" cy="13.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="13.4" r="1.1" fill="currentColor" stroke="none"/><path d="M8.6 19.4 6.4 21.2M15.4 19.4l2.2 1.8"/>',
    compass: '<circle cx="12" cy="12" r="8.6"/><path d="M15.4 8.6 13.2 13.2 8.6 15.4 10.8 10.8z"/>',
    map: '<path d="M9 4.2 3.6 6.4v13.4L9 17.6l6 2.2 5.4-2.2V4.2L15 6.4z"/><path d="M9 4.2v13.4M15 6.4v13.4"/>',
    globe: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2"/><path d="M12 3.4c2.3 2.4 3.5 5.3 3.5 8.6s-1.2 6.2-3.5 8.6c-2.3-2.4-3.5-5.3-3.5-8.6S9.7 5.8 12 3.4z"/>',
    tree: '<path d="M12 3.4 8.6 8.6h1.8L7 13.2h3.2L6.4 17.4h11.2L13.8 13.2H17l-3.4-4.6h1.8z"/><path d="M12 17.4v3.2"/>',
    building: '<path d="M3.8 20.6V6.2A1.8 1.8 0 0 1 5.6 4.4h5.6a1.8 1.8 0 0 1 1.8 1.8v14.4"/><path d="M13 10.4h5.2a1.8 1.8 0 0 1 1.8 1.8v8.4"/><path d="M2.6 20.6h18.8"/><path d="M6.8 8h2M6.8 11.4h2M6.8 14.8h2M16 13.6h1.4M16 16.8h1.4"/>',
    palette: '<path d="M12 3.6a8.4 8.4 0 0 0 0 16.8c1.3 0 1.9-.8 1.9-1.7 0-1.4-1.3-1.7-1.3-3 0-1 .8-1.7 2-1.7h1.7a4.8 4.8 0 0 0 4.1-4.8c0-3.1-3.8-5.6-8.4-5.6z"/><circle cx="8.2" cy="9.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="11.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="8.2" r="1.1" fill="currentColor" stroke="none"/>',
    bridge: '<path d="M2.8 18.6h18.4"/><path d="M3.8 18.6v-4.8a8.2 8.2 0 0 1 16.4 0v4.8"/><path d="M8 18.6v-3.8M16 18.6v-3.8M12 8.4v10.2"/>',
    temple: '<path d="M4 10.4 12 4l8 6.4"/><path d="M5.6 10.4h12.8V13H5.6z"/><path d="M6.8 13h10.4v7.6H6.8z"/><path d="M3.4 20.6h17.2M10.2 16.6h3.6"/>',
    leaf: '<path d="M19.6 4.4C11 4.4 4.8 8 4.8 14.2a4.9 4.9 0 0 0 4.9 4.9c6.3 0 9.9-6.1 9.9-14.7z"/><path d="M8.8 19c1.5-4.1 4.2-7 7.6-8.8"/>',
    riverside: '<path d="M2.8 16.2c2.4-2.5 4.8-2.5 7.2 0s4.8 2.5 7.2 0 3.2-1.4 4 0"/><path d="M2.8 20.4c2.4-2.5 4.8-2.5 7.2 0s4.8 2.5 7.2 0 3.2-1.4 4 0"/><path d="M6.4 11.6 9 7.2l2.6 4.4"/>',
    home: '<path d="M3.8 10.8 12 3.8l8.2 7v8.4a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6z"/><path d="M9.6 20.8v-6h4.8v6"/>',

    /* 시간 */
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/>',
    sunrise: '<path d="M3 18.8h18"/><path d="M6.4 15.4a5.6 5.6 0 0 1 11.2 0"/><path d="M12 3.2v3.2M5.6 6.8 7 8.2M18.4 6.8 17 8.2M2.8 12.2h1.8M19.4 12.2h1.8"/>',
    sunset: '<path d="M2.8 20.6h18.4"/><path d="M5.6 20.6v-5.2h4v5.2M11 20.6V9.4h4v11.2M16.6 20.6v-3.4h4v3.4"/><circle cx="12" cy="5" r="1.9"/>',
    moon: '<path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8z"/>',
    night: '<path d="M19 13.6A7.2 7.2 0 0 1 10.4 5a7.2 7.2 0 1 0 8.6 8.6z"/><path d="M16.4 4.2l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z"/>',
    repeat: '<path d="M4.4 10.4V9a3.6 3.6 0 0 1 3.6-3.6h9.4"/><path d="M14.8 2.8 17.6 5.6l-2.8 2.8"/><path d="M19.6 13.6V15a3.6 3.6 0 0 1-3.6 3.6H6.6"/><path d="M9.2 21.2 6.4 18.4l2.8-2.8"/>',

    /* 사람 · 감정 */
    install: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.4"/><path d="M12 8v8M8 12h8"/>',
    lock: '<rect x="5" y="10.4" width="14" height="9.6" rx="2.8"/><path d="M8.2 10.4V8a3.8 3.8 0 0 1 7.6 0v2.4"/><circle cx="12" cy="15.2" r="1.2" fill="currentColor" stroke="none"/>',
    unlock: '<rect x="5" y="10.4" width="14" height="9.6" rx="2.8"/><path d="M8.2 10.4V8a3.8 3.8 0 0 1 7.2-1.6"/><circle cx="12" cy="15.2" r="1.2" fill="currentColor" stroke="none"/>',
    door: '<path d="M6.2 20.6V4.6A1.6 1.6 0 0 1 7.8 3h8.4a1.6 1.6 0 0 1 1.6 1.6v16"/><path d="M4 20.6h16"/><circle cx="13.8" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
    phone: '<rect x="6.6" y="2.8" width="10.8" height="18.4" rx="3"/><path d="M10.6 5.2h2.8"/><circle cx="12" cy="18" r="1.1" fill="currentColor" stroke="none"/>',
    flask: '<path d="M9.6 3.4h4.8M10.4 3.4v5.2L5.8 17a2.4 2.4 0 0 0 2.1 3.6h8.2a2.4 2.4 0 0 0 2.1-3.6L13.6 8.6V3.4"/><path d="M8.2 14.2h7.6"/>',
    mail: '<rect x="3.6" y="5.6" width="16.8" height="12.8" rx="3"/><path d="M4.4 7.6 12 13l7.6-5.4"/>',
    target: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
    headphones: '<path d="M5 15v-2.6a7 7 0 0 1 14 0V15"/><rect x="3.4" y="14.2" width="3.6" height="6.2" rx="1.8"/><rect x="17" y="14.2" width="3.6" height="6.2" rx="1.8"/>',
    idea: '<path d="M9.4 18.4h5.2M10.2 20.8h3.6"/><path d="M12 3.4a5.6 5.6 0 0 0-3.4 10.1c.5.4.8 1 .8 1.6v1.3h5.2v-1.3c0-.6.3-1.2.8-1.6A5.6 5.6 0 0 0 12 3.4z"/>',
    cake: '<path d="M3.8 20.4h16.4"/><path d="M6.2 20.4v-4.4c0-3.1 2.6-5.6 5.8-5.6s5.8 2.5 5.8 5.6v4.4"/><path d="M6.2 16.2c1.9 1.5 3.8 1.5 5.8 0s3.9-1.5 5.8 0"/><path d="M12 10.4V8.2"/><circle cx="12" cy="6.6" r="1.1"/>',

    /* 취미 */
    dumbbell: '<path d="M3.4 9.2v5.6M20.6 9.2v5.6"/><path d="M7.2 5.8v12.4M16.8 5.8v12.4"/><path d="M7.2 12h9.6"/>',
    barbell: '<path d="M3 12h18"/><path d="M7 5.4v13.2M17 5.4v13.2"/><path d="M4.4 8.4v7.2M19.6 8.4v7.2"/>',
    run: '<circle cx="15" cy="4.8" r="1.9"/><path d="M14.4 7.6 11.2 11.4l2.6 2.6-.6 4.4"/><path d="M11.2 11.4 7.6 12.6M14.6 9.2l3.2 1.4 1 3.2M13.8 14 9.8 16.6l.4 3.6"/>',
    swim: '<circle cx="16" cy="7" r="2"/><path d="M2.8 12.6c1.8-1.4 3.4-1.4 5 0l2.8 2.4c1.2 1 2.6 1 3.8.2l3.4-2.2"/><path d="M2.8 17.6c1.9-1.6 3.8-1.6 5.6 0s3.8 1.6 5.6 0 3.8-1.6 5.6 0"/>',
    climb: '<path d="M4.2 20.4V6.8A2.6 2.6 0 0 1 6.8 4.2h10.4A2.6 2.6 0 0 1 19.8 6.8v13.6"/><path d="M2.8 20.4h18.4"/><circle cx="8.8" cy="9.8" r="1.4"/><circle cx="15.2" cy="13.4" r="1.4"/><path d="M9.6 10.6 14.2 12.6"/><path d="M12 16.8v-1.8"/>',
    mountain: '<path d="M2.6 19.6 9 7.8l3.2 5.6 1.8-2.6 7.4 8.8z"/><path d="M6.8 12.4 9 14.2l2.2-1.8"/>',
    gamepad: '<path d="M8.4 7.4h7.2a4.7 4.7 0 0 1 4.6 3.8l.6 4.1a2.7 2.7 0 0 1-4.8 2.1L14.4 15H9.6l-1.6 2.4a2.7 2.7 0 0 1-4.8-2.1l.6-4.1a4.7 4.7 0 0 1 4.6-3.8z"/><path d="M8.2 10.4v2.8M6.8 11.8h2.8"/><circle cx="15.4" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="17.2" cy="12.8" r="1.1" fill="currentColor" stroke="none"/>',
    dice: '<rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4.2"/><circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none"/>',
    movie: '<path d="M3.6 9.4 19.4 5.4l.9 3.4L4.4 12.8z"/><rect x="4" y="11.8" width="16" height="8.4" rx="2.6"/><path d="M8.2 7.6 9.9 4.4M13 6.2 14.7 3"/>',
    film: '<rect x="3.8" y="4.8" width="16.4" height="14.4" rx="3.2"/><path d="M8 4.8v14.4M16 4.8v14.4M3.8 9.6H8M3.8 14.4H8M16 9.6h4.2M16 14.4h4.2"/>',
    cup: '<path d="M5.4 8.6h11.2v5.4a4.6 4.6 0 0 1-4.6 4.6h-2a4.6 4.6 0 0 1-4.6-4.6z"/><path d="M16.6 10.2h1.6a2.4 2.4 0 0 1 0 4.8h-1.6"/><path d="M8.6 3.4c-.8.9-.8 1.7 0 2.6M12.4 3.4c-.8.9-.8 1.7 0 2.6"/>',
    meal: '<path d="M3.4 11.6h17.2a8.6 8.6 0 0 1-8.6 8.4 8.6 8.6 0 0 1-8.6-8.4z"/><path d="M9.2 8.4c-.9-1-.9-1.9 0-2.9M13.2 8.4c-.9-1-.9-1.9 0-2.9M17.2 8.4c-.9-1-.9-1.9 0-2.9"/>',
    beer: '<path d="M6.2 9.2h7.2v10.4a1.6 1.6 0 0 1-1.6 1.6H7.8a1.6 1.6 0 0 1-1.6-1.6z"/><path d="M13.4 11.4h2.4a1.9 1.9 0 0 1 1.9 1.9v3a1.9 1.9 0 0 1-1.9 1.9h-2.4"/><path d="M6.2 9.2c0-1.6 1.3-2.5 2.7-2.5.4-1.4 1.7-2.1 2.9-1.8 1.2.3 1.9 1.5 1.6 2.8z"/>',
    music: '<circle cx="8" cy="17.4" r="2.6"/><circle cx="18" cy="15.4" r="2.6"/><path d="M10.6 17.4V7.2l10-2v10.2"/>',
    /* Sprint 21 — 취미 대분류·세부 취미를 덮는 아이콘 */
    yoga: '<circle cx="12" cy="5.6" r="1.9"/><path d="M12 8.4v5.4M6.4 10.4c1.8 1.1 3.6 1.6 5.6 1.6s3.8-.5 5.6-1.6"/><path d="M12 13.8 7.6 20.4M12 13.8l4.4 6.6"/>',
    tennis: '<ellipse cx="9.4" cy="9.4" rx="4.6" ry="5.4" transform="rotate(-38 9.4 9.4)"/><path d="M6.4 5.4l5.8 5.8M12 12.6 19.4 20"/><circle cx="17.6" cy="15.6" r="2.6"/>',
    shuttle: '<ellipse cx="12" cy="18.2" rx="3.4" ry="2.6"/><path d="M9.4 16.2 7 4.4M11 15.8 10.6 3.4M13 15.8l.4-12.4M14.6 16.2 17 4.4"/><path d="M7.8 10.2h8.4"/>',
    soccer: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2l3.4 2.4-1.3 4h-4.2l-1.3-4z"/><path d="M12 7.2V3.8M15.4 9.6l3.2-1.2M14.1 13.6l2 2.8M9.9 13.6l-2 2.8M8.6 9.6 5.4 8.4"/>',
    basketball: '<circle cx="12" cy="12" r="8.4"/><path d="M3.8 10.2c4.6 1 12 1 16.4 0M3.8 13.8c4.6-1 12-1 16.4 0"/><path d="M12 3.6v16.8"/><path d="M6.6 5.4c2.8 3.8 2.8 9.4 0 13.2M17.4 5.4c-2.8 3.8-2.8 9.4 0 13.2"/>',
    golf: '<path d="M8.4 3.8v14.8"/><path d="M8.4 3.8 17 6.8 8.4 9.8z"/><ellipse cx="12" cy="19.4" rx="6" ry="1.8"/><circle cx="19.4" cy="15.4" r="1.6"/>',
    bowling: '<circle cx="11" cy="11" r="7.4"/><circle cx="8.8" cy="8.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.4" cy="7.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="10.4" cy="11.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="19.4" cy="17.6" r="2.4"/>',
    pcgame: '<rect x="3.4" y="4.4" width="13.2" height="9.6" rx="2.2"/><path d="M8 18.6h4M10 14v4.6"/><path d="M17.4 11.4h1.4a2 2 0 0 1 2 2v5.2a2 2 0 0 1-2 2h-1.4z"/><path d="M6.4 8v3M4.9 9.5h3"/>',
    wine: '<path d="M7.4 3.8h9.2v4.4a4.6 4.6 0 0 1-9.2 0z"/><path d="M7.4 7h9.2"/><path d="M12 12.8v6M8.6 20.4h6.8"/>',
    cook: '<ellipse cx="11" cy="15.6" rx="7.4" ry="3.6"/><path d="M3.6 15.6v1.4a3 3 0 0 0 3 3h8.8"/><path d="M19.4 16.8h1.4"/><path d="M8 12.6c-.9-1.2-.4-2.4.6-3.2M12 12.6c-.9-1.2-.4-2.4.6-3.2"/>',
    tent: '<path d="M12 4.4 3.6 19.8h16.8z"/><path d="M12 4.4v15.4"/><path d="M12 11.6 8.6 19.8M12 11.6l3.4 8.2"/>',
    car: '<path d="M4.4 13.6l1.7-5a2.4 2.4 0 0 1 2.3-1.6h7.2a2.4 2.4 0 0 1 2.3 1.6l1.7 5"/><rect x="3.4" y="12.8" width="17.2" height="5.6" rx="2.2"/><circle cx="7.4" cy="18.6" r="1.8"/><circle cx="16.6" cy="18.6" r="1.8"/><path d="M6.6 15.6h2M15.4 15.6h2"/>',
    fishing: '<path d="M3.4 8.6c4.4 0 8 3.4 8 7.8"/><path d="M11.4 16.4a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0"/><path d="M13.4 14.4 21 4.4M17.4 6.2l2.6 2"/><circle cx="5.4" cy="7.6" r="1.6"/>',
    ski: '<circle cx="9" cy="5" r="1.9"/><path d="M9 7.6 6.4 13.4l3 2.2-.6 4.4"/><path d="M6.4 13.4 3.4 12M9.4 9.4l3.4 1.4 1.4 3"/><path d="M15.4 4.4 18.6 20M19.4 5.4 22 19.6"/>',
    theater: '<path d="M4.4 5.4h6.2v9.2a3.1 3.1 0 0 1-6.2 0z"/><path d="M13.4 5.4h6.2v9.2a3.1 3.1 0 0 1-6.2 0z"/><path d="M6.4 9.2c.6.7 1.6.7 2.2 0M15.4 9.2c.6.7 1.6.7 2.2 0"/><path d="M6.6 12.2c.8-.7 1.6-.7 2.4 0M15.6 12.2c.8-.7 1.6-.7 2.4 0"/><path d="M6 18.6v2M16.2 18.6v2"/>',
    dance: '<circle cx="14.6" cy="4.8" r="1.9"/><path d="M13.4 7.6 10 11.4l3 2 .4 4.4"/><path d="M10 11.4 6 10.4M14.6 9l4 1.4 1.4 3.4M13.4 13.4l-4.2 2.4.4 4"/><path d="M3.6 19.4h2M19 19.4h2"/>',
    paw: '<ellipse cx="12" cy="15.6" rx="4.2" ry="3.6"/><circle cx="7" cy="10.4" r="2.1"/><circle cx="11.4" cy="8" r="2.1"/><circle cx="16.2" cy="9.2" r="2.1"/><circle cx="19.4" cy="13.4" r="1.9"/>',
    shirt: '<path d="M8.6 4.4 12 6.4l3.4-2 4.4 2.6-2.2 3.8-2-.6v9.4H7.4v-9.4l-2 .6-2.2-3.8z"/>',
    study: '<path d="M3.8 6.4h6.6a2 2 0 0 1 2 2v11a1.8 1.8 0 0 0-1.8-1.8H3.8z"/><path d="M20.2 6.4h-6.6a2 2 0 0 0-2 2v11a1.8 1.8 0 0 1 1.8-1.8h6.8z"/>',

    /* 내정보 · 설정 */
    menu: '<circle cx="12" cy="5.4" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="18.6" r="1.5" fill="currentColor" stroke="none"/>',
    timeline: '<path d="M6.2 3.8v16.4"/><circle cx="6.2" cy="8.2" r="2.2"/><circle cx="6.2" cy="16" r="2.2"/><path d="M11 8.2h9M11 16h6.4"/>',
    grid: '<rect x="4" y="4" width="6.6" height="6.6" rx="2"/><rect x="13.4" y="4" width="6.6" height="6.6" rx="2"/><rect x="4" y="13.4" width="6.6" height="6.6" rx="2"/><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="2"/>',
    chevronLeft: '<path d="M14.4 5.4 7.8 12l6.6 6.6"/>',
    chevronDown: '<path d="M5.4 9.6 12 16.2l6.6-6.6"/>',
    chevronUp: '<path d="M5.4 14.4 12 7.8l6.6 6.6"/>',
    star: '<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.8l5.9-.8z"/>',
    handshake: '<path d="M3.4 10.4 7 6.8l3.2 3.2-2 2"/><path d="M20.6 10.4 17 6.8l-4.4 4.4 2.2 2.2 1.8-1.8 1.4 1.4"/><path d="M10.2 10 12.4 7.8M8.2 12l3.4 3.4M11.4 14.2l2 2"/>',

    /* ---------------------------------------------------------------
       R4 — 활성 상태 전용 **채움형** (하단 탭 활성에서만 보인다)
       · 선 아이콘을 CSS 로 통째로 채우면 세부 선까지 뭉개진다.
         그래서 활성용은 채움 실루엣을 따로 그려 두고, 탭이 활성일 때
         index.html 의 .tab-ic-line ↔ .tab-ic-fill 을 CSS 로 맞바꾼다.
       --------------------------------------------------------------- */
    gridFill: '<rect x="4" y="4" width="6.6" height="6.6" rx="2" fill="currentColor" stroke="none"/>'
      + '<rect x="13.4" y="4" width="6.6" height="6.6" rx="2" fill="currentColor" stroke="none"/>'
      + '<rect x="4" y="13.4" width="6.6" height="6.6" rx="2" fill="currentColor" stroke="none"/>'
      + '<rect x="13.4" y="13.4" width="6.6" height="6.6" rx="2" fill="currentColor" stroke="none"/>',
    searchFill: '<circle cx="11" cy="11" r="6.4" fill="currentColor" stroke="none"/>'
      + '<path d="M15.6 15.6 20.6 20.6" fill="none" stroke="currentColor"/>',
    chatFill: '<path fill-rule="evenodd" fill="currentColor" stroke="none"'
      + ' d="M4.2 6.6A3.2 3.2 0 0 1 7.4 3.4h9.2a3.2 3.2 0 0 1 3.2 3.2v7.2a3.2 3.2 0 0 1-3.2 3.2H9.4L4.2 20.6z'
      + ' M7.45 10.4a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 1 0-2.3 0z'
      + ' M10.85 10.4a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 1 0-2.3 0z'
      + ' M14.25 10.4a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 1 0-2.3 0z"/>',
    personFill: '<circle cx="12" cy="7.6" r="4.1" fill="currentColor" stroke="none"/>'
      + '<path d="M4.8 19.8c0-4.1 3.3-7 7.2-7s7.2 2.9 7.2 7z" fill="currentColor" stroke="none"/>',
    homeFill: '<path fill-rule="evenodd" fill="currentColor" stroke="none"'
      + ' d="M3.2 10.6 12 3.2l8.8 7.4v8.4a1.8 1.8 0 0 1-1.8 1.8H5a1.8 1.8 0 0 1-1.8-1.8z'
      + ' M9.6 20.8v-6.2a1.4 1.4 0 0 1 1.4-1.4h2a1.4 1.4 0 0 1 1.4 1.4v6.2z"/>',
    noteFill: '<path fill-rule="evenodd" fill="currentColor" stroke="none"'
      + ' d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8v14.4A1.8 1.8 0 0 1 16.2 21H7.8A1.8 1.8 0 0 1 6 19.2z'
      + ' M8.8 8h6.4v1.6H8.8z M8.8 11.2h6.4v1.6H8.8z M8.8 14.4h4.2v1.6H8.8z"/>',

    /* ---------------------------------------------------------------
       R4 — 카테고리 표지 문양 7종 (HOBBY_TAXONOMY 대분류)
       · 여기만 2px 선이 아니라 **단색 큰 문양(면)** 이다. 모임 카드 표지에서
         32~66px 로 커도 한눈에 대분류가 읽히게, 격자 3~21px 을 꽉 채웠다.
       · 색은 색조 클래스(.tone-*)가 정하는 --tone-ink(=--cat-N) 를 currentColor 로 받는다.
       · stroke="none" — 면 문양이라 테두리를 두르지 않는다(구멍은 evenodd 로 뚫는다).
       --------------------------------------------------------------- */
    catSports: /* 운동 — 덤벨 */
      '<g fill="currentColor" stroke="none">'
      + '<rect x="3" y="8.6" width="3.4" height="6.8" rx="1.5"/>'
      + '<rect x="6.2" y="5.4" width="3.8" height="13.2" rx="1.6"/>'
      + '<rect x="14" y="5.4" width="3.8" height="13.2" rx="1.6"/>'
      + '<rect x="17.6" y="8.6" width="3.4" height="6.8" rx="1.5"/>'
      + '<rect x="9.4" y="10.7" width="5.2" height="2.6" rx="1.3"/>'
      + '</g>',
    catGame: /* 게임 — 패드(십자키·버튼은 뚫린 구멍) */
      '<path fill-rule="evenodd" fill="currentColor" stroke="none"'
      + ' d="M8.6 6.6h6.8c2.8 0 5.1 2 5.5 4.8l.7 4.3c.4 2.4-1.6 4.4-4 3.8-1.4-.3-2.5-1.2-3.1-2.4l-.5-1.1H9.9l-.5 1.1'
      + 'c-.6 1.2-1.7 2.1-3.1 2.4-2.4.6-4.4-1.4-4-3.8l.7-4.3C3.5 8.6 5.8 6.6 8.6 6.6z'
      + ' M7.1 8.1h2.2v2.2h2.1v2.2h-2.1v2.2H7.1v-2.2H5V10.3h2.1z'
      + ' M14.4 10.4a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0z'
      + ' M16.6 12.6a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0z"/>',
    catRead: /* 독서 — 펼친 책 두 쪽(페이지 선은 뚫린 홈) */
      '<path fill-rule="evenodd" fill="currentColor" stroke="none"'
      + ' d="M2.4 6.6c0-1.1.9-2 2-2h5.2a2 2 0 0 1 2 2v11.6a2.6 2.6 0 0 0-2.6-2.6H4.4a2 2 0 0 1-2-2z'
      + ' M4.6 7.4h4v1.1h-4z M4.6 10.2h4v1.1h-4z'
      + ' M21.6 6.6c0-1.1-.9-2-2-2h-5.2a2 2 0 0 0-2 2v11.6a2.6 2.6 0 0 1 2.6-2.6h4.6a2 2 0 0 0 2-2z'
      + ' M15.2 7.2h4.4v1.6h-4.4z M15.2 10.4h4.4v1.6h-4.4z"/>',
    catFood: /* 맛집 — 컵과 손잡이·받침 */
      '<path fill-rule="evenodd" fill="currentColor" stroke="none"'
      + ' d="M5.2 7h11.6v6.6a5 5 0 0 1-5 5h-1.6a5 5 0 0 1-5-5z'
      + ' M7.6 9.4h6.8v1.6H7.6z"/>'
      + '<path d="M16.8 9.2h1.8a3 3 0 0 1 0 6h-1.8" fill="none" stroke="currentColor" stroke-width="2"/>'
      + '<rect x="3" y="19.2" width="14.4" height="1.8" rx=".9" fill="currentColor" stroke="none"/>',
    catTravel: /* 여행 — 종이비행기(두 날개 사이의 틈이 접힌 선) */
      '<g fill="currentColor" stroke="none">'
      + '<path d="M21.6 2.4 2.4 9.3l8.4 2.9z"/>'
      + '<path d="M21.6 2.4 11.4 14.2l1.8 7z"/>'
      + '</g>',
    catCulture: /* 문화 — 팔레트(물감 구멍) */
      '<path fill-rule="evenodd" fill="currentColor" stroke="none"'
      + ' d="M12 3.2c-5 0-8.9 3.7-8.9 8.3 0 4.5 3.9 8.3 8.9 8.3 1.8 0 2.7-1.1 2.7-2.3 0-1.6-1.6-2-1.6-3.5'
      + ' 0-1.2 1-2 2.4-2h1.7c3.2 0 5.6-2.5 5.6-5.2C21.8 4.3 17.4 3.2 12 3.2z'
      + ' M8.4 8.9a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0z'
      + ' M11.6 6.2a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0z'
      + ' M15.4 7.6a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0z'
      + ' M7.4 13.2a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0z"/>',
    catDaily: /* 일상 — 반짝임 하나 */
      '<path fill="currentColor" stroke="none"'
      + ' d="M12 2.2 14.6 9.4 21.8 12 14.6 14.6 12 21.8 9.4 14.6 2.2 12 9.4 9.4z"/>',

  };

  /* ------------------------------------------------------------------
   * 28.5 — 지금 화면에서 쓰지 않는 아이콘은 지우지 않고 여기로 옮겼다.
   *  (레거시 이모지 호환표가 참조할 수 있어 render 는 여기까지 찾는다.)
   * ------------------------------------------------------------------ */
  const UNUSED = {
    logo: '<path d="M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6z"/><path d="M8.6 14.4a4.4 4.4 0 0 1 6.8 0"/>',
    minus: '<path d="M5.4 12h13.2"/>',
    filter: '<path d="M4.2 5.4h15.6L14 12.4v6.2L10 21v-8.6z"/>',
    calendarMonth: '<rect x="4" y="5.6" width="16" height="14.4" rx="3"/><path d="M8.2 3.4v4.2M15.8 3.4v4.2M4 10.2h16"/><path d="M7.8 13.4h.1M12 13.4h.1M16.2 13.4h.1M7.8 16.8h.1M12 16.8h.1M16.2 16.8h.1"/>',
    link: '<path d="M9.4 14.6 14.6 9.4"/><path d="M11.2 6.8l1.4-1.4a3.7 3.7 0 0 1 5.2 5.2l-1.4 1.4M12.8 17.2l-1.4 1.4a3.7 3.7 0 0 1-5.2-5.2l1.4-1.4"/>',
    eye: '<path d="M2.8 12S6.4 5.8 12 5.8 21.2 12 21.2 12 17.6 18.2 12 18.2 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="3"/>',
    history: '<path d="M3.8 12a8.2 8.2 0 1 0 2.4-5.8"/><path d="M3.4 4.2v4.2h4.2"/><path d="M12 8v4.4l3 1.8"/>',
    crown: '<path d="M4 18.6h16"/><path d="M4.2 15.6 5.8 7l3.9 3.4L12 5.2l2.3 5.2L18.2 7l1.6 8.6z"/>',
    shield: '<path d="M12 3.4 5.4 6v5.2c0 4 2.7 7.4 6.6 9 3.9-1.6 6.6-5 6.6-9V6z"/><path d="M9.2 11.8 11.4 14 15 10.4"/>',
    logout: '<path d="M13.8 5.4H6.6a2 2 0 0 0-2 2v9.2a2 2 0 0 0 2 2h7.2"/><path d="M16.8 8.4 20.4 12l-3.6 3.6"/><path d="M9.6 12h10.8"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20.4 4.2v4.4h-4.4"/>',
    megaphone: '<path d="M4.4 10.4 15 6.2v11.6L4.4 13.6z"/><path d="M15 9.4h2.4a2.6 2.6 0 0 1 0 5.2H15"/><path d="M7.4 13.8v4a2 2 0 0 0 4 0v-2.4"/>',
    gem: '<path d="M7.4 4.2h9.2l4 5.6-8.6 10-8.6-10z"/><path d="M3.4 9.8h17.2M9 4.2 7.2 9.8 12 19.8l4.8-10L15 4.2"/>',
    trophy: '<path d="M8 4.4h8v5.2a4 4 0 0 1-8 0z"/><path d="M8 6H4.8v1.6a3.2 3.2 0 0 0 3.2 3.2M16 6h3.2v1.6a3.2 3.2 0 0 1-3.2 3.2"/><path d="M12 13.6v3.2M8.8 20h6.4M9.8 16.8h4.4"/>',
    idcard: '<rect x="3.2" y="5.4" width="17.6" height="13.2" rx="3"/><circle cx="8.8" cy="10.8" r="2"/><path d="M5.8 15.8c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4"/><path d="M14.6 9.6h4M14.6 12.4h4M14.6 15.2h2.6"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.6"/><path d="M12 2.6v1.8M12 19.6v1.8M2.6 12h1.8M19.6 12h1.8M5.4 5.4 6.7 6.7M17.3 17.3l1.3 1.3M18.6 5.4 17.3 6.7M6.7 17.3l-1.3 1.3"/>',
    chart: '<path d="M4 3.8v16.4h16.2"/><path d="M8.2 16.4v-4.2M12.2 16.4V7.8M16.2 16.4v-6.2"/>',
    arrowLeft: '<path d="M19.4 12H4.6"/><path d="M10.6 5.8 4.4 12l6.2 6.2"/>',
    arrowRight: '<path d="M4.6 12h14.8"/><path d="M13.4 5.8 19.6 12l-6.2 6.2"/>',
    chevronRight: '<path d="M9.6 5.4 16.2 12l-6.6 6.6"/>',
    swap: '<path d="M7.4 4.2v13.2M4.2 14.2l3.2 3.2 3.2-3.2"/><path d="M16.6 19.8V6.6M13.4 9.8l3.2-3.2 3.2 3.2"/>',
    flag: '<path d="M5.4 21V3.8"/><path d="M5.4 4.4h10.2l-1.6 3.6 1.6 3.6H5.4z"/>',
    circleDot: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>',
    people2: '<path d="M4.4 18.6a7.6 7.6 0 0 1 15.2 0"/><circle cx="12" cy="7.4" r="3.4"/>',
  };

  /* 채워야 하는 아이콘 — { filled: true } 또는 이름 자체가 채움형일 때 */
  const SOLID = { heart: true, heartFilled: true, bookmark: false };

  /* 대분류 색조 키 → 표지 문양. 색은 .tone-* 클래스가 --cat-N 으로 정한다. */
  const CATEGORY_EMBLEM = {
    green: 'catSports', violet: 'catGame', teal: 'catRead', amber: 'catFood',
    sky: 'catTravel', coral: 'catCulture', mint: 'catDaily', neutral: 'catDaily'
  };

  /* --------------------------------------------------------------- API */
  const NAMES = Object.keys(PATHS);
  const UNUSED_NAMES = Object.keys(UNUSED);

  /**
   * 아이콘 SVG.
   *  24×24 · 선 2px(둥근 끝) · 색은 currentColor.
   *  { filled } 채운 하트·북마크 · { size } 크기(기본 1em) · { cls } 추가 클래스
   *  { stroke } 선 두께 예외(작은 자리 광학 보정용, 기본 2)
   */
  function svg(name, opts) {
    opts = opts || {};
    const body = PATHS[name] || UNUSED[name] || PATHS.dot;
    const solid = opts.filled === true || (SOLID[name] === true && name === 'heartFilled');
    const cls = 'oo-ic' + (solid ? ' is-solid' : '') + (opts.cls ? ' ' + opts.cls : '');
    const size = opts.size || '1em';
    const width = opts.stroke || STROKE;
    const fill = solid ? 'currentColor' : 'none';
    return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24"`
      + ` fill="${fill}" stroke="currentColor" stroke-width="${width}"`
      + ` stroke-linecap="round" stroke-linejoin="round"`
      + ` aria-hidden="true" focusable="false">${body}</svg>`;
  }

  /* 옛 상태(이모지) 호환 — 저장된 예전 데이터도 아이콘으로 그린다 */
  const LEGACY = {
    '\u{1F3CB}\uFE0F': 'dumbbell', '\u{1F3CB}': 'dumbbell', '\u{1F4AA}': 'barbell', '\u{1F3C3}': 'run',
    '\u{1F9D7}': 'climb', '\u{1F3CA}': 'swim', '\u{1F3AE}': 'gamepad', '\u{1F3B2}': 'dice',
    '\u{1F3AC}': 'movie', '\u2615': 'cup', '\u26F0\uFE0F': 'mountain', '\u26F0': 'mountain',
    '\u{1F97D}': 'swim', '\u{1F3A7}': 'headphones', '\u{1F37B}': 'beer', '\u{1F35A}': 'meal',
    '\u{1F4CC}': 'pushpin', '\u{1F370}': 'cake', '\u{1F4F7}': 'camera', '\u{1F5BC}\uFE0F': 'image',
    '\u{1F5BC}': 'image', '\u{1F39E}\uFE0F': 'film', '\u{1F39E}': 'film', '\u{1F4DA}': 'book',
    '\u{1F9E0}': 'idea', '\u{1F3AF}': 'target', '\u{1F5FA}\uFE0F': 'map', '\u{1F5FA}': 'map',
    '\u{1F4C5}': 'calendar', '\u{1F5D3}\uFE0F': 'calendar', '\u{1F5D3}': 'calendar', '\u23F1': 'clock',
    '\u2795': 'plus', '\u{1F551}': 'clock', '\u{1F552}': 'clock', '\u{1F319}': 'moon',
    '\u{1F303}': 'night', '\u{1F305}': 'sunrise', '\u2600\uFE0F': 'sun', '\u2600': 'sun',
    '\u{1F306}': 'sunset', '\u{1F501}': 'repeat', '\u2705': 'checkCircle', '\u2716\uFE0F': 'closeCircle',
    '\u2716': 'closeCircle', '\u{1F914}': 'maybe', '\u2764\uFE0F': 'heart', '\u2764': 'heart',
    '\u2661': 'heart', '\u{1F49A}': 'heart', '\u{1F4AC}': 'chat', '\u{1F5E8}\uFE0F': 'comment',
    '\u{1F5E8}': 'comment', '\u{1F514}': 'bell', '\u{1F525}': 'fire', '\u{1F465}': 'users',
    '\u{1F64B}': 'person', '\u{1F389}': 'sparkle', '\u2728': 'sparkle', '\u{1F4E8}': 'mail',
    '\u{1F4DD}': 'note', '\u{1F5C2}\uFE0F': 'layers', '\u{1F5C2}': 'layers', '\u{1F4C1}': 'folder',
    '\u{1F9FE}': 'layers', '\u{1F4CB}': 'clipboard', '\u{1F4C4}': 'file', '\u2B07\uFE0F': 'download',
    '\u2B07': 'download', '\u{1F4CD}': 'pin', '\u{1F39B}\uFE0F': 'sliders', '\u{1F39B}': 'sliders',
    '\u{1F9ED}': 'compass', '\u{1F6B6}': 'walk', '\u{1F6B2}': 'bike', '\u{1F68C}': 'bus',
    '\u{1F687}': 'train', '\u{1F333}': 'tree', '\u{1F3D9}\uFE0F': 'building', '\u{1F3D9}': 'building',
    '\u{1F3A8}': 'palette', '\u{1F309}': 'bridge', '\u{1F3EF}': 'temple', '\u{1F33F}': 'leaf',
    '\u{1F3DE}\uFE0F': 'riverside', '\u{1F3DE}': 'riverside', '\u{1F310}': 'globe', '\u{1F382}': 'cake',
    '\u{1F512}': 'lock', '\u{1F513}': 'unlock', '\u{1F6AA}': 'door', '\u{1F34E}': 'phone',
    '\u{1F9EA}': 'flask', '\u26A0': 'flag', '\u{1F44F}': 'sparkle', '\u{1F64C}': 'sparkle',
    '\u{1F60A}': 'sparkle', '\u270F\uFE0F': 'pencil', '\u270F': 'pencil', '\u{1F451}': 'crown',
    '\u25AA': 'dot', '\u2022': 'dot', '\u00B7': 'dot',
  };

  function render(value, opts) {
    if (!value) return '';
    if (PATHS[value] || UNUSED[value]) return svg(value, opts);
    if (LEGACY[value]) return svg(LEGACY[value], opts);
    /* 알 수 없는 글자(옛 저장값)는 조용히 점으로 — 이모지가 새어 나가지 않게 한다 */
    return svg('dot', opts);
  }

  /** 대분류 색조 키('green' … 'neutral') → 표지 문양 이름. 모르는 값은 catDaily. */
  function emblemName(tone) {
    return CATEGORY_EMBLEM[tone] || 'catDaily';
  }

  function badge(name, tone, opts) {
    opts = opts || {};
    return `<span class="oo-icbadge oo-ictone-${tone || 'mint'}">${render(name, opts)}</span>`;
  }

  function label(name, text, opts) {
    return `${render(name, opts)}<span class="oo-iclabel">${text}</span>`;
  }

  function has(name) { return !!(PATHS[name] || UNUSED[name]); }

  return { svg, render, badge, label, has, emblemName, names: NAMES, unusedNames: UNUSED_NAMES,
    all: NAMES.concat(UNUSED_NAMES), legacy: LEGACY,
    stroke: STROKE, style: 'line', version: 3 };
})();
