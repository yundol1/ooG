/**
 * ============================================================================
 * ooG (우그) — Application Controller  ·  Sprint 7
 * ----------------------------------------------------------------------------
 * 담당 범위
 *   1) 하단 4탭 라우팅 (탐색 · 피드 · 채팅 · 프로필)
 *   2) 탐색: 2열 메이슨리 3대 카드(사람·소모임·게시글) · 검색 · 취미 필터 · 무한 스크롤
 *   3) 모임 상세 시트 + 그룹장 전용 '말머리 태그 관리'
 *   4) 인스타그램형 1:1 프라이빗 피드 (좋아요·댓글·북마크·모임 필터)
 *   5) 글쓰기 FAB + 작성 모달 (모임/말머리/사진/캡션 → store 즉시 반영)
 *   6) 카드 하트(LIKE) ↔ 관심 취소 → 상호 LIKE 축하 팝업 → 1:1 대화방
 *   7) 인앱 1:1 대화방(메시지·읽음·취미 답장·취미 프로필) · 게시글 상세/작성
 *   8) 마이프로필 수정 · 새 소모임 개설 폼
 *   9) Sprint 7 — 내 나이 맞춤 · 지역(생활권) 탐색 · 실시간 베스트 · 알림함 필터 ·
 *      활동 로그 주/월 요약 + 바로 취소 · 탐색 필터 기억 · 로딩 스켈레톤
 *
 * 렌더링 원칙
 *   - 데이터는 오직 `store`에서만 읽고, 화면은 store의 상태를 그린다.
 *   - 좋아요·댓글처럼 애니메이션이 중요한 상호작용은 전체 재렌더 대신
 *     해당 DOM만 갱신하고, 글 작성·가입처럼 구조가 바뀌는 동작만 다시 그린다.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const store = window.appStore;
  /* Sprint 20 — 이모지 대신 **우그가 직접 그린 아이콘**. 화면의 모든 아이콘은 이 두 함수로만 그린다. */
  const ic = (name, opts) => window.OOGIcons.render(name, opts);
  /* 정적 마크업(index.html)의 [data-oog-icon] 도 같은 아이콘으로 채운다 — HTML 에 이모지를 두지 않기 위함. */
  function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-oog-icon]').forEach((node) => {
      if (node.getAttribute('data-oog-ready') === '1') return;
      node.innerHTML = ic(node.getAttribute('data-oog-icon'));
      node.setAttribute('data-oog-ready', '1');
    });
  }
  hydrateIcons();
  /* Sprint 17 — 테스트·미리보기 전용 #demo: 예전 데모 계정(내 모임·글·디엠)으로 시작한다.
     실사용 배포 주소(해시 없음)는 언제나 회원가입 화면부터 시작한다. */
  if (window.location.hash === '#demo' && !store.isDemoAccount()) store.seedDemoAccount();
  /* 해시만 바뀌어 들어온 경우(#demo)에도 한 번 새로 열어 데모 상태로 맞춘다. */
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#demo' && !window.appStore.isDemoAccount()) window.location.reload();
  });
  const timeAgo = window.oogTimeAgo;

  /* ------------------------------------------------------------------ 상태 */
  const ui = {
    activeTab: 'tab-home',
    feedFilter: 'my',            // 'my' | 'popular'
    feedGroupId: null,           // null = 모든 가입 모임
    exploreFilter: 'all',        // 'all' | 'people' | 'groups' | 취미 id
    exploreAge: 'all',           // Sprint 6~7 — 나이 필터 ('all'|'for_me'|'none'|'20s'|'2030'|'30plus')
    exploreRegion: 'all',        // Sprint 7 — 지역(생활권) 필터
    exploreRadius: 'all',        // Sprint 8 — 내 동네 반경 필터 ('all'|'1'|'3'|'5'|'10')
    exploreQuery: '',            // 탐색 검색어
    /* Sprint 9 — 통합 필터 시트: 시트 안에서 고른 값(드래프트)은 [적용하기]에서 한 번에 반영된다. */
    filterDraft: { filter: 'all', age: 'all', radius: 'all' },
    filterSheetOpen: false,
    filterChipFlash: null,       // Sprint 10 — 방금 붙은 조건 칩을 잠시 반짝이게(재렌더에도 유지)
    notifExpanded: [],           // Sprint 10 — 펼쳐 둔 알림 묶음 키(기본은 1줄 요약)
    filterChipKeys: [],          // Sprint 10 — 방금 새로 생긴 요약 칩에만 등장 애니메이션
    notifGroupMap: {},           // 알림함 묶음 키 → 원본 알림 id (묶음 단위 읽음/지우기용)
    expandedComments: new Set(), // 댓글 전체 보기 상태
    lastTap: null,               // 더블 탭 좋아요 판정용
    scrollByTab: {},             // 탭별 스크롤 위치 기억 (탭 전환 시 복원)
    composer: { groupId: null, tag: null, photoUrl: null },
    lastCreatedPostId: null,
    toastTimer: null,
    /* Sprint 3.5 — 카드 하트 · 상호 LIKE 팝업 */
    personSheetId: null,         // 지금 열린 프로필 상세 시트의 대상
    matchPopupRoomId: null,      // 방금 열린 대화방 (축하 팝업의 '대화방 열기' 대상)
    matchPopupProfileId: null,
    highlightRoomId: null,       // 채팅 탭에서 방금 열린 방을 강조

    /* Sprint 4 — 3대 카드 · 무한 스크롤 · 1:1 대화방 · 폼 */
    explorePage: 0,              // 지금까지 불러온 페이지 수
    exploreLoading: false,
    exploreRendered: false,
    exploreCols: null,           // [{node, height}, {node, height}] 메이슨리 열 상태
    openRoomId: null,            // 열려 있는 1:1 대화방
    typingRoomId: null,          // 상대가 답장을 쓰는 중인 방 (인디케이터)
    replyTimer: null,
    postSheetId: null,           // 열린 게시글 상세
    exploreCompose: { hobbyId: null, regionId: null, meetStyle: null, photoUrl: null },
    edit: { hobbyIds: [], activity: '' },   // 프로필 수정 드래프트
    groupDraft: { hobbyId: null, privacyType: 'open', ageLimit: 'all', question: '' },

    /* Sprint 4.5 — 알림 파이프라인 · 가입 심사 */
    applyGroupId: null,          // 지금 신청서를 쓰는 모임
    applyAnswers: [],            // 신청서 답변 드래프트

    /* Sprint 6 — 내 활동 로그 */
    activityType: 'all',         // 'all' | 'like' | 'post' | 'comment' | 'group'
    activityRange: 'all',        // Sprint 8 — 'all' | '7d' | '30d'
    activityView: 'timeline',    // Sprint 8 — 'timeline' | 'group'

    /* Sprint 7 — 실시간 베스트 · 알림함 필터 */
    hotSheetOpen: false,         // 실베 시트 열림 여부
    notifFilter: 'all',          // 'all' | chat | like | comment | join_request | join_result
    notifUnreadOnly: false,      // '안 읽은 것만 보기' 토글
    notifSessionUnread: []       // 알림함을 연 순간의 안 읽은 id (열면 읽음처리되므로 스냅샷을 둔다)
    ,
    /* Sprint 8 — 알림함 2차(스와이프·예시) · 실베 순위 · 다음 페이지 프리페치 */
    notifPreview: null,          // 예시 미리보기를 펼친 알림 종류 id
    hotRendered: false,          // 실베 스트립을 한 번이라도 그렸는지(첫 렌더 지연)
    exploreBuffer: null,         // { key, page, items } — 다음 페이지 프리페치
    feedRenderedOnce: false,     // 피드 첫 렌더 여부(첫 화면 경량화)

    /* Sprint 14 — 홈 = 내 모임 허브 · 단체 채팅 · 일정(RSVP) · 전체 멤버 */
    homeGroupId: null,           // 홈에서 보고 있는 모임(저장된 homePrefs 를 따른다)
    homeView: 'feed',            // 'feed'(인스타형 스크롤 피드) | 'grid'(사진 격자) | 'popular'(인기)
    homeTag: null,               // 사진 격자 말머리 필터(null = 전체)
    openGroupChatId: null,       // 열려 있는 모임 단체 채팅
    groupChatTimer: null,        // 멤버 답장(시연) 예약
    membersGroupId: null,        // 전체 멤버 시트의 모임
    memberDetailId: null,        // 멤버 시트에서 펼쳐 둔 멤버
    eventGroupId: null,          // 일정 만들기 대상 모임
    eventDraft: { kind: 'drink', when: null },

    /* Sprint 15 — 인스타그램형 4탭: 피드(공지·일정 + 스크롤 피드) · 돋보기 · 디엠 · 내정보 */
    noticeGroupId: null,         // 공지 시트를 열어 둔 모임
    noticeEditingId: null,       // 공지 수정 중인 공지 id
    openEventId: null,           // 일정 상세 시트의 일정
    pastEventsOpen: false,       // 지난 일정 펼쳤는지
    replyTo: null,               // 답글 대상 댓글({postId, commentId, name})

    /* Sprint 16 — 바깥 3탭(홈 갤러리 · 탐색 · 전체 디엠함) + 그룹 전용 4탭 */
    groupSpaceId: null,          // null = 바깥 홈(내 그룹 갤러리) · 값이 있으면 그 모임 안
    boardTag: null,              // 게시판 말머리 필터(null = 전체)
    storyId: null,               // 보고 있는 스토리 id
    storyGroupId: null,          // 스토리를 연 모임
    storyPhotoUrl: null,         // 스토리 올리기에서 앨범/카메라로 고른 사진(Data URL)
    storyTimer: null,            // 스토리 자동 넘김 예약
    dmTargetId: null,            // 쪽지 보내는 상대(id)
    ageMin: 0,                   // Sprint 16 — 나이 슬라이더 왼쪽
    ageMax: 99,                  //                나이 슬라이더 오른쪽
    /* 가입 후 스포트라이트 가이드 */
    guide: null,

    /* Sprint 17 — 회원가입 · 스토리 링/보관함 · 공지 읽음 · 표지 · 디엠 정렬 */
    /* Sprint 22 — 스토리텔링 회원가입: 한 화면에 질문 하나.
       'signup' = 이메일 → 인증 → 비밀번호 → 닉네임 → 사진 → 나이 → 지역
       'login'  = 이메일·비밀번호 한 화면 · 'reset' = 이메일 → 인증 → 새 비밀번호 */
    onboardingMode: 'signup',    // 'signup' | 'login' | 'reset'
    onboardingStep: 0,           // signup 0~6 · reset 0~2
    onboardingDraft: null,       // 입력 중인 가입서(메모리)
    obDir: 'next',               // 단계 전환 방향(애니메이션)
    obError: '',                 // 지금 단계의 안내 문구
    obBusy: false,               // 인증번호 발송/확인 중
    obCode: null,                // 화면의 모의 메일함이 보여줄 { code, email, expiresAt }
    storyRingId: null,           // 지금 보고 있는 스토리 링의 멤버 id
    storyArchiveView: false,     // 보관함에서 연 스토리인지
    boardNoticeExpanded: false,  // 지난 공지 펼침
    noticeReadId: null,          // 읽음 상태를 연 공지
    coverGroupId: null,          // 표지를 고르는 모임
    coverDraft: [],              // 고른 표지 프리셋(최대 2)
    /* Sprint 24 — 내 프로필 올리기 시트 드래프트 · 비밀앨범 시트 상태 */
    publishStyleId: 'now',
    publishEditing: false,
    secretAlbumPartnerId: null,
    dmView: 'recent',            // 'recent' | 'group'
    dmUnreadOnly: false,         // 안 읽은 대화만
    dmSent: null,                // 방금 쪽지를 보낸 상대 {partnerId, name, roomId}
    confirmAction: null,         // 확인 시트에서 실행할 동작

    /* Sprint 18 — 사이드바(Drawer): 모임 멤버·설정 / 내정보 설정 */
    drawerOpen: null,            // null | 'group' | 'profile'
    drawerMemberId: null         // 모임 사이드바에서 펼쳐 둔 멤버
  };

  /* Sprint 7 — 마지막 탐색 필터 복원: 앱을 다시 열어도 나이·지역·종류 조건이 그대로다. */
  const savedExplorePrefs = store.getExplorePrefs();
  ui.exploreFilter = savedExplorePrefs.filter;
  ui.exploreAge = savedExplorePrefs.age;
  ui.exploreRegion = savedExplorePrefs.region;
  ui.exploreRadius = savedExplorePrefs.radius;
  /* Sprint 16 — 나이 슬라이더는 저장된 0~99 범위로 시작한다. */
  ui.ageMin = savedExplorePrefs.ageMin == null ? 0 : savedExplorePrefs.ageMin;
  ui.ageMax = savedExplorePrefs.ageMax == null ? 99 : savedExplorePrefs.ageMax;

  /* ------------------------------------------------------------- DOM 캐시 */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* Sprint 12 — 손맛 있는 모션의 공통 전제.
     사용자가 OS에서 '동작 줄이기'를 켜 두었으면 시트·카드·하트 애니메이션을
     재생하지 않고 결과만 즉시 보여준다(어지럼·멀미 방지). */
  const motionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  function prefersReducedMotion() { return !!(motionQuery && motionQuery.matches); }

  /* 렌더 성능을 한 곳에 기록한다(개발 편의 + 회귀 테스트). */
  function notePerf(key, value) {
    window.oogPerf = window.oogPerf || {};
    window.oogPerf[key] = Math.round(value * 10) / 10;
  }

  const el = {
    main: $('#main-content'),
    bottomNavEl: $('#bottom-nav'),
    navButtons: $$('.nav-tab-item'),
    navIndicator: $('#nav-indicator'),
    tabViews: $$('.tab-view'),
    /* Sprint 16 — 바깥 홈 갤러리 · 그룹 전용 공간 · 스토리 · 게시판 · 나이 슬라이더 · 쪽지 */
    groupGallery: $('#group-gallery'),
    galleryGrid: $('#group-gallery-grid'),
    gallerySub: $('#gallery-sub'),
    galleryEmpty: $('#group-gallery-empty'),
    /* Sprint 21 — 홈 하단 추천 모임 · 가입 후 스포트라이트 가이드 */
    homeRecommend: $('#home-recommend'),
    homeRecommendSub: $('#home-recommend-sub'),
    homeRecommendGrid: $('#home-recommend-grid'),
    btnHomeRecommendTaste: $('#btn-home-recommend-taste'),
    /* Sprint 22 — 홈의 '모임 둘러보기'(탐색에서 옮겨온 모임 목록·검색·필터·정렬) */
    homeBrowse: $('#home-browse'),
    homeBrowseSub: $('#home-browse-sub'),
    homeBrowseSearch: $('#home-browse-search'),
    homeBrowseClear: $('#home-browse-clear'),
    homeBrowseChips: $('#home-browse-chips'),
    homeBrowseSorts: $('#home-browse-sorts'),
    homeBrowseGrid: $('#home-browse-grid'),
    btnHomeBrowseMore: $('#btn-home-browse-more'),
    btnHomeBrowseNew: $('#btn-home-browse-new'),
    spotlight: $('#spotlight'),
    spotlightHole: $('#spotlight-hole'),
    spotlightVeil: $('#spotlight-veil'),
    spotlightBubble: $('#spotlight-bubble'),
    spotlightStep: $('#spotlight-step'),
    spotlightTitle: $('#spotlight-title'),
    spotlightDesc: $('#spotlight-desc'),
    spotlightBody: $('#spotlight-body'),
    spotlightNext: $('#btn-spotlight-next'),
    spotlightPrev: $('#btn-spotlight-prev'),
    spotlightSkip: $('#btn-spotlight-skip'),
    gallerySort: $('#gallery-sort'),
    btnNoticeMore: $('#btn-notice-more'),
    btnBoardPhoto: $('#btn-board-photo'),
    btnBoardReview: $('#btn-board-review'),
    exploreSummary: $('#explore-summary'),
    /* Sprint 24 — 내 프로필 올리기 시트(만남 목적 · 한 줄 소개 · 2시간) */
    publishModal: $('#explore-publish-modal'),
    publishStyleList: $('#publish-style-list'),
    publishIntro: $('#publish-intro'),
    publishConfirm: $('#btn-publish-confirm'),
    /* Sprint 24 — 내 프로필 탭 · 앨범 */
    myProfileAvatar: $('#myprofile-avatar'),
    myProfileAvatarLetter: $('#myprofile-avatar-letter'),
    myProfileAvatarImg: $('#myprofile-avatar-img'),
    myProfileName: $('#myprofile-name'),
    myProfileMeta: $('#myprofile-meta'),
    albumPublicGrid: $('#album-public-grid'),
    albumSecretGrid: $('#album-secret-grid'),
    albumPublicCount: $('#album-public-count'),
    albumSecretCount: $('#album-secret-count'),
    albumShareNote: $('#album-share-note'),
    albumPublicAlbum: $('#album-public-album'),
    albumPublicCamera: $('#album-public-camera'),
    albumSecretAlbum: $('#album-secret-album'),
    albumSecretCamera: $('#album-secret-camera'),
    myProfileStats: $('#myprofile-stats'),
    /* Sprint 24 — 화면 설정(다크모드) */
    menuDarkMode: $('#menu-dark-mode'),
    menuDarkModeState: $('#menu-dark-mode-state'),
    /* Sprint 24 — 1:1 대화방 비밀앨범 */
    chatAlbumBtn: $('#btn-chat-album'),
    secretAlbumModal: $('#secret-album-modal'),
    secretAlbumBody: $('#secret-album-body'),
    secretAlbumShare: $('#btn-secret-album-share'),
    /* Sprint 25 — 앨범 확대 보기(라이트박스) */
    albumViewer: $('#album-viewer'),
    albumViewerImg: $('#album-viewer-img'),
    albumViewerCount: $('#album-viewer-count'),
    albumViewerHint: $('#album-viewer-hint'),
    albumViewerMenu: $('#album-viewer-menu'),
    albumViewerPrev: $('#btn-album-viewer-prev'),
    albumViewerNext: $('#btn-album-viewer-next'),
    albumViewerReplace: $('#btn-album-viewer-replace'),
    albumViewerDelete: $('#btn-album-viewer-delete'),
    albumViewerClose: $('#btn-album-viewer-close'),
    headerHomeBtn: $('#btn-header-home'),
    dmViewSeg: $('#dm-view-seg'),
    dmUnreadToggle: $('#dm-unread-toggle'),
    dmSentBanner: $('#dm-sent-banner'),
    /* Sprint 17 — 게시물·스토리·오픈 글 사진(앨범/카메라) */
    composerPhotoPreview: $('#composer-photo-preview'),
    composerPhotoImg: $('#composer-photo-img'),
    composerPhotoNote: $('#composer-photo-note'),
    composerPhotoAlbum: $('#composer-photo-album'),
    composerPhotoCamera: $('#composer-photo-camera'),
    storyPhotoPreview: $('#story-photo-preview'),
    storyPhotoImg: $('#story-photo-img'),
    storyPhotoNote: $('#story-photo-note'),
    storyPhotoAlbum: $('#story-photo-album'),
    storyPhotoCamera: $('#story-photo-camera'),
    explorePhotoPreview: $('#explore-photo-preview'),
    explorePhotoImg: $('#explore-photo-img'),
    explorePhotoNote: $('#explore-photo-note'),
    explorePhotoAlbum: $('#explore-photo-album'),
    explorePhotoCamera: $('#explore-photo-camera'),
    onboarding: $('#onboarding'),
    onboardingBody: $('#onboarding-body'),
    onboardingPanel: $('#onboarding-panel'),
    storyReplyForm: $('#story-reply-form'),
    storyReplyInput: $('#story-reply-input'),
    btnStoryArchive: $('#btn-story-archive'),
    storyArchiveModal: $('#story-archive-modal'),
    storyArchiveGrid: $('#story-archive-grid'),
    coverModal: $('#cover-modal'),
    coverGrid: $('#cover-grid'),
    noticeReadModal: $('#notice-read-modal'),
    noticeReadList: $('#notice-read-list'),
    noticeReadSub: $('#notice-read-sub'),
    confirmModal: $('#confirm-modal'),
    confirmTitle: $('#confirm-title'),
    confirmDesc: $('#confirm-desc'),
    confirmOk: $('#btn-confirm-ok'),
    profileAvatarImg: $('#profile-avatar-img'),
    menuStoryArchiveCount: $('#menu-story-archive-count'),
    menuPhotoState: $('#menu-photo-state'),
    /* Sprint 26.5 — 설정 아코디언의 요약 값 */
    menuAlbumsState: $('#menu-albums-state'),
    menuProfileStatusVal: $('#menu-profile-status-val'),
    accMetaDisplay: $('#acc-meta-display'),
    accMetaAlerts: $('#acc-meta-alerts'),
    accMetaGroups: $('#acc-meta-groups'),
    menuSampleData: $('#menu-sample-data'),
    menuSampleState: $('#menu-sample-state'),
    menuSampleRestore: $('#menu-sample-restore'),
    profilePhotoInput: $('#profile-photo-input'),
    groupSpace: $('#group-space'),
    groupSpaceName: $('#group-space-name'),
    groupSpaceMeta: $('#group-space-meta'),
    groupDrawerBtn: $('#btn-group-drawer'),
    boardDrawerBtn: $('#btn-board-drawer'),
    profileDrawerBtn: $('#btn-profile-drawer'),
    groupDrawer: $('#group-drawer'),
    groupDrawerBody: $('#group-drawer-body'),
    groupDrawerName: $('#group-drawer-name'),
    groupDrawerMeta: $('#group-drawer-meta'),
    groupDrawerAvatar: $('#group-drawer-avatar'),
    profileDrawer: $('#profile-drawer'),
    profileDrawerName: $('#profile-drawer-name'),
    profileDrawerMeta: $('#profile-drawer-meta'),
    profileDrawerAvatar: $('#profile-drawer-avatar'),
    profileTopbarTitle: $('#profile-topbar-title'),
    profileTopbarSub: $('#profile-topbar-sub'),
    storyBar: $('#story-bar'),
    storyModal: $('#story-modal'),
    storyCaption: $('#story-caption'),
    storyMediaCaption: $('#story-media-caption'),
    storyPublish: $('#btn-story-publish'),
    storyViewer: $('#story-viewer'),
    storyViewerBody: $('#story-viewer-body'),
    storyViewerProgress: $('#story-viewer-progress'),
    storyViewerAvatar: $('#story-viewer-avatar'),
    storyViewerName: $('#story-viewer-name'),
    storyViewerTime: $('#story-viewer-time'),
    btnStoryDelete: $('#btn-story-delete'),
    btnStoryPrev: $('#btn-story-prev'),
    btnStoryNext: $('#btn-story-next'),
    boardSpaceName: $('#board-space-name'),
    boardSpaceMeta: $('#board-space-meta'),
    boardNoticeList: $('#board-notice-list'),
    boardPostList: $('#board-posts'),
    boardPostCount: $('#board-post-count'),
    boardFilterChips: $('#board-filter-chips'),
    btnNoticeOpen: $('#btn-notice-open'),
    ageRangeMin: $('#age-range-min'),
    ageRangeMax: $('#age-range-max'),
    ageRangeFill: $('#age-range-fill'),
    ageRangeLabel: $('#age-range-label'),
    btnAgeClear: $('#btn-age-range-clear'),
    filterAgeNote: $('#filter-age-note'),
    exploreProfileToggle: $('#explore-profile-toggle'),
    eppDesc: $('#epp-desc'),
    dmComposeModal: $('#dm-compose-modal'),
    dmTarget: $('#dm-target'),
    dmMessage: $('#dm-message'),
    dmSend: $('#btn-dm-send'),
    dmCaptionCount: $('#dm-caption-count'),
    dmScope: $('#dm-scope'),
    dmScopeName: $('#dm-scope-name'),
    dmTitle: $('#dm-title'),
    dmSub: $('#dm-sub'),
    profileGroupContext: $('#profile-group-context'),
    profileGroupContextName: $('#profile-group-context-name'),
    groupNav: $('#group-nav'),
    navIndicatorGroup: $('#nav-indicator-group'),
    bottomNav: $('#bottom-nav'),
    // explore (토스쇼핑형 2열 메이슨리)
    exploreInput: $('#explore-search-input'),
    exploreClear: $('#explore-search-clear'),
    exploreTypeSeg: $('#explore-type-seg'),
    /* Sprint 25 — 탐색에서 취미·반경 칩을 없앴다(지역 가로 칩 + 나이 슬라이더만) */
    exploreAgeChips: null,   // Sprint 16 — 고정 칩 제거(0~99 슬라이더로 대체)
    exploreActiveFilters: $('#explore-active-filters'),
    exploreFilterBtn: $('#btn-explore-filter'),
    exploreFilterCount: $('#explore-filter-count'),
    filterModal: $('#filter-modal'),
    filterResult: $('#filter-result'),
    filterApply: $('#btn-filter-apply'),
    filterReset: $('#btn-filter-reset'),
    exploreMasonry: $('#explore-masonry'),
    exploreCount: $('#explore-count'),
    exploreTitle: $('#explore-title'),
    /* Sprint 11 — 활동 로그 내보내기 */
    activityExportText: $('#btn-activity-export-text'),
    activityExportCsv: $('#btn-activity-export-csv'),
    activityExportDownload: $('#btn-activity-export-download'),
    /* Sprint 25 — 지역은 상단/시트의 가로 칩 두 줄이 전부다(드롭다운·지역 시트 없음) */
    filterRegionChips: $('#filter-region-chips'),
    filterRegionSub: $('#filter-region-sub'),
    filterNearbyChip: $('#filter-nearby-chip'),
    /* 실시간 베스트 */
    hotStrip: $('#hot-strip'),
    hotRail: $('#hot-rail'),
    hotSub: $('#hot-sub'),
    btnHotMore: $('#btn-hot-more'),
    hotModal: $('#hot-modal'),
    hotList: $('#hot-list'),
    hotSheetSub: $('#hot-sheet-sub'),
    // feed
    subtabs: $$('#feed-subtabs .feed-subtab'),
    feedList: $('#feed-posts-container'),
    fab: $('#fab-write'),
    /* Sprint 14 — 홈(내 모임 허브) · 단체 채팅 · 일정 · 전체 멤버 */
    homeHero: $('#home-hero'),
    homeEvents: $('#home-events'),
    homeEventNew: $('#btn-home-event-new'),
    homeViewSeg: $('#home-view-seg'),
    homeTagChips: $('#home-tag-chips'),
    homePhotoGrid: $('#home-photo-grid'),
    homePhotoCount: $('#home-photo-count'),
    homeChatPreview: $('#home-chat-preview'),
    homeChatOpen: $('#btn-home-chat-open'),
    navHomeBadge: $('#nav-home-badge'),
    /* Sprint 15 — 공지 바 · 일정 상세 · 내 피드 */
    homePinned: $('#home-pinned'),
    homeNoticeBar: $('#home-notice-bar'),
    noticeModal: $('#notice-modal'),
    noticeList: $('#notice-list'),
    noticeEditor: $('#notice-editor'),
    noticeTitle: $('#notice-title'),
    noticeSub: $('#notice-sub'),
    eventDetailModal: $('#event-detail-modal'),
    eventDetailBody: $('#event-detail-body'),
    profileFeedGrid: $('#profile-feed-grid'),
    profileFeedCount: $('#profile-feed-count'),
    profileFeedSub: $('#profile-feed-sub'),
    chatDmPolicy: $('#chat-dm-policy'),
    groupChatModal: $('#group-chat-modal'),
    groupChatMessages: $('#group-chat-messages'),
    groupChatAvatar: $('#group-chat-avatar'),
    groupChatName: $('#group-chat-name'),
    groupChatSub: $('#group-chat-sub'),
    groupChatInput: $('#group-chat-input'),
    groupChatForm: $('#group-chat-form'),
    chatGroupRooms: $('#chat-group-rooms'),
    chatGroupCount: $('#chat-group-count'),
    chatDmCount: $('#chat-dm-count'),
    membersModal: $('#group-members-modal'),
    membersBody: $('#group-members-body'),
    membersTitle: $('#group-members-title'),
    membersSub: $('#group-members-sub'),
    eventModal: $('#event-modal'),
    eventTitle: $('#event-title'),
    eventKinds: $('#event-kinds'),
    eventDate: $('#event-date'),
    eventTime: $('#event-time'),
    eventQuickWhen: $('#event-quick-when'),
    eventPlace: $('#event-place'),
    eventNote: $('#event-note'),
    eventSubmit: $('#btn-event-submit'),
    eventGroupNote: $('#event-group-note'),
    // modals
    groupModal: $('#group-detail-modal'),
    groupModalBody: $('#group-detail-body'),
    composerModal: $('#composer-modal'),
    joinedModal: $('#joined-modal'),
    joinedBody: $('#joined-groups-body'),
    composerGroupList: $('#composer-group-list'),
    composerTagList: $('#composer-tag-list'),
    composerCaption: $('#composer-caption'),
    composerPhotoUrl: $('#composer-photo-url'),
    photoPreview: $('#photo-preview'),
    photoPreviewImg: $('#photo-preview-img'),
    photoPreviewNote: $('#photo-preview-note'),
    composerMediaCaption: $('#composer-media-caption'),
    captionCount: $('#caption-count'),
    publishBtn: $('#btn-publish'),
    // misc
    toast: $('#toast'),
    statPosts: $('#stat-posts'),
    statLikes: $('#stat-likes'),
    statComments: $('#stat-comments'),
    notifDot: $('#notif-dot'),
    joinedCount: $('#menu-joined-count'),
    menuLikedCount: $('#menu-liked-count'),
    menuActivityCount: $('#menu-activity-count'),
    /* Sprint 13 — 프로필 밀도(내 모임·저장한 글·최근 활동) */
    profileGroupStrip: $('#profile-group-strip'),
    profileGroupsCount: $('#profile-groups-count'),
    profileSavedList: $('#profile-saved-list'),
    profileSavedCount: $('#profile-saved-count'),
    profileRecentList: $('#profile-recent-list'),
    activityModal: $('#activity-modal'),
    activityBody: $('#activity-body'),
    activityFilters: $('#activity-filters'),
    activityRange: $('#activity-range'),
    activityView: $('#activity-view'),
    activitySummary: $('#activity-summary'),
    personDetailModal: $('#match-detail-modal'),
    personDetailBody: $('#match-detail-body'),
    matchPopup: $('#match-popup'),
    popupAvatarThem: $('#popup-avatar-them'),
    popupNames: $('#popup-names'),
    popupCommon: $('#popup-common'),
    popupConfetti: $('#match-popup-confetti'),
    btnOpenChatRoom: $('#btn-open-chat-room'),
    btnKeepSwiping: $('#btn-keep-swiping'),
    chatRooms: $('#chat-rooms-container'),
    chatRoomCount: $('#chat-room-count'),
    menuChatCount: $('#menu-chat-count'),
    navChatBadge: $('#nav-chat-badge'),
    /* Sprint 4 — 무한 스크롤 · 게시글 · 대화방 · 폼 */
    exploreLoader: $('#explore-loader'),
    exploreSentinel: $('#explore-sentinel'),
    exploreComposeBtn: $('#btn-explore-compose'),
    exploreHead: $('#explore-head'),
    postModal: $('#explore-post-modal'),
    postBody: $('#explore-post-body'),
    exploreComposeModal: $('#explore-compose-modal'),
    exploreRegionChips: $('#explore-region-chips'),
    exploreRegionSub: $('#explore-region-sub'),
    exploreComposeRegion: $('#explore-compose-region'),
    exploreComposeStyles: $('#explore-compose-styles'),
    exploreComposeCaption: $('#explore-compose-caption'),
    exploreCaptionCount: $('#explore-caption-count'),
    explorePublish: $('#btn-explore-publish'),
    profileEditModal: $('#profile-edit-modal'),
    editNickname: $('#edit-nickname'),
    editBio: $('#edit-bio'),
    editHobbies: $('#edit-hobbies'),
    editLocation: $('#edit-location'),
    editActivity: $('#edit-activity'),
    groupCreateModal: $('#group-create-modal'),
    createGroupName: $('#create-group-name'),
    createGroupHobbies: $('#create-group-hobbies'),
    createGroupDesc: $('#create-group-desc'),
    createGroupMeet: $('#create-group-meet'),
    createGroupLocation: $('#create-group-location'),
    createGroupPrivacy: $('#create-group-privacy'),
    chatRoomModal: $('#chat-room-modal'),
    chatMessages: $('#chat-messages'),
    chatRoomAvatar: $('#chat-room-avatar'),
    chatRoomName: $('#chat-room-name'),
    chatRoomHobby: $('#chat-room-hobby'),
    chatInput: $('#chat-input'),
    chatForm: $('#chat-form'),
    profileNickname: $('#profile-nickname'),
    profileBio: $('#profile-bio'),
    profileSpecs: $('#profile-specs'),
    profileAvatarLetter: $('#profile-avatar-letter'),
    /* Sprint 4.5 — 알림 · 가입 신청 */
    pushPermissionBanner: $('#push-permission-banner'),
    btnPushAllow: $('#btn-push-allow'),
    btnPushDismiss: $('#btn-push-dismiss'),
    pushBannerStack: $('#push-banner-stack'),
    notifSettingsBody: $('#notif-settings-body'),
    notifPermissionState: $('#notif-permission-state'),
    menuMyApplications: $('#menu-my-applications'),
    menuMyApplicationsCount: $('#menu-my-applications-count'),
    groupApplyModal: $('#group-apply-modal'),
    groupApplyBody: $('#group-apply-body'),
    myApplicationsModal: $('#my-applications-modal'),
    myApplicationsBody: $('#my-applications-body'),
    notifModal: $('#notif-modal'),
    notifBody: $('#notif-body'),
    notifHeadNote: $('#notif-head-note'),
    notifFilters: $('#notif-filters'),
    notifUnreadToggle: $('#notif-unread-toggle'),
    notifReadAll: $('#notif-read-all'),
    notifCollapseAll: $('#notif-collapse-all'),
    activityStats: $('#activity-stats'),
    createGroupAge: $('#create-group-age'),
    createGroupQuestion: $('#create-group-question'),
    createGroupQuestionPresets: $('#create-group-question-presets'),
    /* Sprint 5 — PWA(홈 화면 설치) */
    pwaCard: $('#pwa-card'),
    pwaCardState: $('#pwa-card-state'),
    pwaCardDesc: $('#pwa-card-desc'),
    pwaCardActions: $('#pwa-card-actions')
  };

  /* ------------------------------------------------------------- 유틸 */
  const escapeHtml = (str) => String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const fmtCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

  /* ==========================================================================
   * Sprint 17 — 회원가입(온보딩) · 아바타(프로필 사진) · 로그아웃 · 데이터 초기화
   * --------------------------------------------------------------------------
   * 11/15 21:32 사용자: "회원가입 기능도 넣어주소 프로필 사진 등록하는거 닉넴까지 다 해주고
   * 이제 데이터는 초기화해줘 실사용해보게".
   *  · 가입 전이면 앱 대신 회원가입 화면(body.onboarding-mode)만 보인다.
   *  · 정한 닉네임·사진이 헤더·내정보·스토리·피드·디엠·탐색 카드에 그대로 쓰인다.
   * ========================================================================== */
  const SIGNUP_FALLBACK_GRADIENT = 'linear-gradient(135deg, #10B981 0%, #059669 55%, #047857 100%)';

  function myAvatarText() {
    const u = store.currentUser || {};
    return u.avatarText || (u.nickname || '?').charAt(0) || '?';
  }

  function avatarImgHTML(photoUrl, alt) {
    if (!photoUrl) return '';
    return `<img class="avatar-img" src="${escapeHtml(photoUrl)}" alt="${escapeHtml(alt || '')}" loading="lazy" decoding="async">`;
  }

  /** 헤더·내정보 아바타를 내 사진/이니셜로 맞춘다. */
  function paintMyAvatars() {
    const u = store.currentUser || {};
    const text = myAvatarText();
    const header = $('#header-avatar');
    if (header) {
      if (u.photoUrl) {
        header.innerHTML = avatarImgHTML(u.photoUrl, u.nickname);
        header.classList.add('has-photo');
        header.style.background = 'transparent';
      } else {
        header.textContent = text;
        header.classList.remove('has-photo');
        header.style.background = u.avatarGradient || SIGNUP_FALLBACK_GRADIENT;
      }
    }
    if (el.profileAvatarLetter) {
      el.profileAvatarLetter.hidden = !!u.photoUrl;
      el.profileAvatarLetter.textContent = u.photoUrl ? '' : text;
    }
    if (el.profileAvatarImg) {
      if (u.photoUrl) {
        el.profileAvatarImg.src = u.photoUrl;
        el.profileAvatarImg.alt = u.nickname || '내 사진';
        el.profileAvatarImg.hidden = false;
      } else {
        el.profileAvatarImg.removeAttribute('src');
        el.profileAvatarImg.hidden = true;
      }
    }
    if (el.menuPhotoState) el.menuPhotoState.textContent = u.photoUrl ? '등록됨' : '기본 아바타';
    if (el.menuStoryArchiveCount) {
      el.menuStoryArchiveCount.textContent = `${store.getStoryArchiveStats().count}개`;
    }
  }

  /** 사진 파일 → 최대 max(기본 256)px JPEG Data URL (저장 용량·속도 고려).
   *  Sprint 17 — 게시물·스토리 사진은 1080px, 프로필 사진은 256px로 줄인다.
   *  Sprint 26.5 — 앨범은 store 의 업로드 스펙(720px · 0.84)을 그대로 따른다. */
  function readImageFile(file, onDone, max = 256, quality = 0.84) {
    if (!file) return;
    if (!/^image\//.test(file.type || '')) {
      showToast('이미지 파일만 올릴 수 있어요', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round((img.width || 1) * scale));
        const h = Math.max(1, Math.round((img.height || 1) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        onDone(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => showToast('사진을 읽지 못했어요', 'warning');
      img.src = reader.result;
    };
    reader.onerror = () => showToast('사진을 읽지 못했어요', 'warning');
    reader.readAsDataURL(file);
  }

  /** Sprint 26.5 — 앨범 사진의 업로드 스펙(화질을 올릴 때 store 한 곳만 고치면 된다). */
  function albumUploadSpec() {
    const fallback = { maxDimension: 720, jpegQuality: 0.84, max: 4 };
    try {
      const spec = store.getAlbumUploadSpec ? store.getAlbumUploadSpec() : null;
      return spec && spec.maxDimension ? spec : fallback;
    } catch (e) {
      return fallback;
    }
  }

  /* ------------------------------------------------------------------
   * Sprint 17 — 사진 올리기(앨범/카메라) 공통 처리
   *   · 고른 사진은 최대 1080px JPEG Data URL 로 줄여 저장한다(localStorage 보호).
   *   · 미리보기·삭제·바꾸기가 가능하고, 프리셋(예시 사진)은 보조 옵션으로 남긴다.
   * ---------------------------------------------------------------- */
  const PHOTO_KINDS = {
    composer: {
      max: 1080, refs: () => ({ preview: el.composerPhotoPreview, img: el.composerPhotoImg, note: el.composerPhotoNote }),
      get: () => ui.composer.photoUrl,
      set: (url) => { ui.composer.photoUrl = url; updatePublishState(); }
    },
    story: {
      max: 1080, refs: () => ({ preview: el.storyPhotoPreview, img: el.storyPhotoImg, note: el.storyPhotoNote }),
      get: () => ui.storyPhotoUrl,
      set: (url) => { ui.storyPhotoUrl = url; updateStoryPublish(); }
    },
    explore: {
      max: 1080, refs: () => ({ preview: el.explorePhotoPreview, img: el.explorePhotoImg, note: el.explorePhotoNote }),
      get: () => ui.exploreCompose.photoUrl,
      set: (url) => { ui.exploreCompose.photoUrl = url; updateExplorePublishState(); }
    }
  };

  function renderPhotoPreview(kind) {
    const conf = PHOTO_KINDS[kind];
    if (!conf) return;
    const { preview, img, note } = conf.refs();
    const url = conf.get();
    if (!preview) return;
    if (!url) {
      preview.hidden = true;
      if (img) img.removeAttribute('src');
      return;
    }
    preview.hidden = false;
    if (img) img.src = url;
    if (note) note.textContent = '앨범·카메라에서 고른 사진 · 올리면 이 사진으로 게시돼요';
  }

  function applyPhotoPick(kind, file) {
    const conf = PHOTO_KINDS[kind];
    if (!conf || !file) return;
    readImageFile(file, (url) => {
      conf.set(url);
      renderPhotoPreview(kind);
      showToast('사진을 준비했어요', 'info');
    }, conf.max);
  }

  function clearPhoto(kind) {
    const conf = PHOTO_KINDS[kind];
    if (!conf) return;
    conf.set(null);
    renderPhotoPreview(kind);
  }

  function wirePhotoPicker(kind, albumInput, cameraInput, albumBtn, cameraBtn, removeBtn) {
    albumBtn && albumBtn.addEventListener('click', () => albumInput && albumInput.click());
    cameraBtn && cameraBtn.addEventListener('click', () => cameraInput && cameraInput.click());
    [albumInput, cameraInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (file) applyPhotoPick(kind, file);
        input.value = '';
      });
    });
    removeBtn && removeBtn.addEventListener('click', () => clearPhoto(kind));
  }

  function newOnboardingDraft() {
    return {
      email: '', code: '', emailVerified: false,
      loginId: '', password: '', passwordConfirm: '', quickStart: false,
      nickname: '', photoUrl: null,
      avatarGradient: (store.getOnboardingState().avatarGradients || [SIGNUP_FALLBACK_GRADIENT])[0],
      age: '', regionId: '', hobbies: []
    };
  }

  function onboardingError(reason) {
    return ({
      nickname_short: '닉네임을 2자 이상 입력해 주세요',
      nickname_long: '닉네임은 12자까지 쓸 수 있어요',
      login_id_short: '아이디를 3자 이상 입력해 주세요',
      password_short: '비밀번호를 4자 이상 입력해 주세요',
      password_long: '비밀번호가 너무 길어요',
      password_mismatch: '비밀번호가 서로 달라요',
      age_range: '나이는 14~99세 사이로 입력해 주세요',
      no_account: '저장된 계정이 없어요 — 새로 가입해 주세요',
      login_mismatch: '이메일을 확인해 주세요',
      email_invalid: '이메일 주소를 다시 확인해 주세요',
      email_unverified: '이메일 인증을 먼저 마쳐주세요',
      email_mismatch: '인증번호를 받은 이메일과 달라요',
      no_email_account: '이 계정에는 등록된 이메일이 없어요',
      no_code: '인증번호가 없어요 — 다시 받아주세요',
      code_mismatch: '인증번호가 맞지 않아요',
      code_expired: '인증번호가 만료됐어요 — 다시 받아주세요',
      too_many_tries: '시도 횟수를 넘었어요 — 인증번호를 다시 받아주세요'
    }[reason] || '가입 정보를 다시 확인해 주세요');
  }

  /* Sprint 22 — 스토리텔링 회원가입의 질문 순서(한 화면에 하나씩). */
  const SIGNUP_FLOW = ['email', 'code', 'password', 'nickname', 'photo', 'age', 'region'];
  const RESET_FLOW = ['reset-email', 'reset-code', 'reset-password'];

  function obFlow() { return ui.onboardingMode === 'reset' ? RESET_FLOW : SIGNUP_FLOW; }
  function obStepId() {
    const flow = obFlow();
    return flow[Math.min(ui.onboardingStep, flow.length - 1)];
  }

  /** 진행 표시 — 지금 몇 번째 질문인지 막대와 숫자로 보여준다. */
  function onboardingProgress() {
    const node = $('#onboarding-steps');
    if (!node) return;
    const flow = obFlow();
    const index = Math.min(ui.onboardingStep, flow.length - 1);
    const pct = Math.round(((index + 1) / flow.length) * 100);
    node.innerHTML = `
      <span class="ob-progress-track" role="progressbar" aria-valuemin="1" aria-valuemax="${flow.length}"
            aria-valuenow="${index + 1}" aria-label="가입 진행 ${index + 1} / ${flow.length}">
        <span class="ob-progress-fill" style="width:${pct}%"></span>
      </span>
      <span class="ob-progress-text">${index + 1} / ${flow.length}</span>`;
  }

  /* ----------------------------------------------------------------
   * Sprint 22 — 스토리텔링 회원가입
   * ------------------------------------------------------------------
   *  11/16 루키 님: "회원가입할때 스토리텔링식으로 하고싶어 모두 입력란이 바로 다 나오는게아니라
   *   스토리텔링 즉 묻고 답하는식으로 … 한단계씩 … 프로필사진도 등록가능하게끔"
   *   · 한 화면에 질문 하나 · 진행 막대 · 이전/다음 · 부드러운 전환.
   *   · 이메일 인증(6자리) → 비밀번호 → 닉네임 → 사진 → 나이 → 지역.
   * ---------------------------------------------------------------- */
  const OB_KICKERS = {
    email: '이메일', code: '인증', password: '비밀번호', nickname: '닉네임',
    photo: '프로필 사진', age: '나이', region: '동네',
    'reset-email': '비밀번호 찾기', 'reset-code': '인증', 'reset-password': '새 비밀번호'
  };

  /** 질문 위의 작은 표시 — 지금 무엇을 묻는지 한 단어로만(진행은 위 막대가 보여준다). */
  function obKicker(stepId) {
    return `<p class="ob-kicker"><span class="ob-kicker-label">${escapeHtml(OB_KICKERS[stepId] || '')}</span></p>`;
  }

  /** 모의 메일함 — 실제 SMTP 가 없으니 인증번호를 화면에서 보여줄다(숨기지 않는다). */
  function obMailCard(stepId) {
    const pending = store.getPendingEmailCode();
    const fallback = ui.obCode && ui.obCode.code ? ui.obCode : null;
    const email = (pending && pending.email) || (fallback && fallback.email) || (ui.onboardingDraft || {}).email || '';
    const expired = pending ? pending.expired : true;
    const code = pending && !pending.expired ? pending.code : (fallback && !expired ? fallback.code : '');
    return `
      <div class="ob-mailcard" data-ob-mailcard="${stepId}" aria-label="모의 메일함">
        <div class="ob-mailcard-top">
          <span class="ob-mailcard-title">모의 메일함</span>
          <span class="ob-mailcard-tag">체험용</span>
        </div>
        <p class="ob-mailcard-row">받는 사람 <b>${escapeHtml(email)}</b></p>
        <p class="ob-mailcard-row">제목 · 우그 인증번호 안내</p>
        <div class="ob-mailcard-body">
          <span class="ob-mailcard-label">인증번호</span>
          <strong class="ob-mailcard-code">${code || '——'}</strong>
          <span class="ob-mailcard-exp ${expired ? 'is-expired' : ''}">${expired ? '만료됨 · 다시 받기' : '10분 안에 입력'}</span>
        </div>
        <p class="ob-mailcard-note">실제 메일 서버는 아직 연결되지 않았어요. 이 화면에 코드를 보여드리고, 서버를 붙이면 같은 자리에서 진짜 메일이 갑니다.</p>
      </div>`;
  }

  /** 진행 막대 — 로그인·재설정 화면에서는 숨긴다. */
  function onboardingProgressVisible(show) {
    const steps = $('#onboarding-steps');
    if (steps) steps.hidden = !show;
    if (!show) {
      const node = $('#onboarding-steps');
      if (node) node.innerHTML = '';
    }
  }

  /* ------------------------------------------------------------------
   * Sprint 23 → 26.5 — 스토리텔링 문구 먼저 → 입력란 등장 (읽는 호흡으로)
   * ------------------------------------------------------------------
   * 11/16 23:47 사용자: "먼저 질문/내레이션 문구만 출력하고, 문구가 끝나면
   * 아래 입력란·버튼이 스프링으로 딱 등장. 문구 영역을 탭하면 즉시 스킵."
   * 11/17 08:05 사용자: "스토리텔링의 글이 너무 빨리 나와 천천히 나와야지"
   *
   *  · 제목은 한 글자씩, 쉼표·마침표·줄바꿈에서 사람이 숨 쉬는 만큼 멈춘다.
   *  · 제목이 끝나면 한 숨(약 0.4초) 뒤 설명이 떠오르고, **설명을 읽을 만큼**
   *    (글자수 × 24ms, 0.76~1.7초) 기다린 뒤에야 입력란이 나타난다.
   *  · 27.5 — 26.5의 92ms/3.2~3.5초는 "살짝 빠르게"(11/17 11:16 지시)에 맞춰
   *    글자 68ms · 문장부호 쉼 축소로 **약 2.5초**가 되게 조였다. 단계가 넘어간
   *    두 번째 화면부터는 스킵 힌트를 0.8초 앞당겨(1.5초 → 0.7초) 기다림을 줄였다.
   *  · 문구(제목·설명·힌트)를 탭하면 기다리지 않고 바로 답이 나온다.
   *  · prefers-reduced-motion · 자동 테스트(webdriver) 에서는 기다리지 않고 바로 보여준다.
   *    (?narr=1 로 강제, ?narr=0 으로 끔 · window.oog.setNarration)
   * ---------------------------------------------------------------- */
  const NARRATION_TIMING = {
    char: 68,          // 한 글자 (약 14.7자/초 · 읽어 주는 속도)
    brHold: 210,       // 줄바꿈에서 한 숨
    commaHold: 110,    // 쉼표
    periodHold: 190,   // 마침표 · 물음표
    breath: 400,       // 제목 → 설명
    descFade: 420,     // 설명이 떠오르는 시간
    descRead: 24,      // 설명 한 글자를 읽는 시간
    descMin: 760,
    descMax: 1700,
    hintDelay: 1500,   // 첫 화면 — '문구를 탭하면' 힌트가 나타나는 시점
    hintDelayNext: 700 // 두 번째 화면부터 — 0.8초 앞당김
  };

  /** 지금 화면이 첫 단계인지 — 스킵 힌트·기다림을 줄일지 정한다. */
  function narrationHintDelay(isFirst) {
    return isFirst ? NARRATION_TIMING.hintDelay : NARRATION_TIMING.hintDelayNext;
  }

  function narrationEnabled() {
    if (!ui.narration || ui.narration.enabled === false) return false;
    /* 동작 줄이기는 강제 설정보다 먼저다 — 기다림 없이 바로 답을 보여준다. */
    if (prefersReducedMotion()) return false;
    if (ui.narration.force === true) return true;
    if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
    return true;
  }

  function clearNarrationTimers() {
    (ui.narrationTimers || []).forEach((t) => { clearTimeout(t); clearInterval(t); });
    ui.narrationTimers = [];
  }

  function narrationState() {
    return ui.narration || (ui.narration = { enabled: true, force: null });
  }

  /** 제목을 한 글자씩 찍는다 — 쉼표·마침표·줄바꿈에서 잠깐 멈춘다.
   *  반환값 finish(true) 는 남은 글자를 채우되 다음 단계는 부르지 않는다(스킵). */
  function typeNarrationTitle(node, onDone) {
    if (!node) { if (onDone) onDone(); return { finish: () => {}, chars: 0 }; }
    const raw = node.innerHTML;
    const tokens = raw.match(/<br\s*\/?>|&[a-zA-Z#0-9]+;|[\s\S]/g) || [];
    node.innerHTML = tokens.map((t, i) => (/^<br/i.test(t)
      ? '<br>'
      : `<span class="ob-type-char" data-i="${i}">${t === ' ' ? '&nbsp;' : t}</span>`)).join('');
    const chars = Array.from(node.querySelectorAll('.ob-type-char'));
    let i = 0;
    let timer = null;
    let typed = false;
    const finish = (silent) => {
      if (timer) { clearTimeout(timer); timer = null; }
      chars.forEach((c) => c.classList.add('on'));
      if (!typed) {
        typed = true;
        if (!silent && onDone) onDone();
      }
    };
    const tick = () => {
      if (i >= chars.length) { finish(); return; }
      const token = tokens[i];
      chars[i].classList.add('on');
      i += 1;
      let wait = NARRATION_TIMING.char;
      if (/^<br/i.test(token)) wait = NARRATION_TIMING.brHold;
      else if (/^[,，·、]$/.test(token)) wait = NARRATION_TIMING.commaHold;
      else if (/^[.!?…]$/.test(token)) wait = NARRATION_TIMING.periodHold;
      timer = setTimeout(() => {
        timer = null;
        if (i >= chars.length) finish();
        else tick();
      }, wait);
      ui.narrationTimers = (ui.narrationTimers || []).concat(timer);
    };
    tick();
    return { finish, chars: chars.length };
  }

  /**
   * 내레이션 한 번 — 제목 타이핑 → 한 숨 → 설명 등장 → 읽을 만큼 기다림 → 답 등장.
   *  cfg { titleNode, descNode, hintNode, onStart, onDescIn, onReveal, hold }
   *  반환값: 즉시 끝내는 함수(탭 스킵).
   */
  function playNarration(cfg) {
    const st = narrationState();
    clearNarrationTimers();
    const reveal = () => {
      if (st.done) return;
      clearNarrationTimers();
      st.active = false; st.done = true; st.answerShown = true;
      if (cfg.onReveal) cfg.onReveal();
    };
    if (!narrationEnabled()) {
      if (cfg.onReveal) cfg.onReveal();
      return reveal;
    }
    const after = (ms, fn) => {
      const t = setTimeout(fn, ms);
      ui.narrationTimers = (ui.narrationTimers || []).concat(t);
      return t;
    };
    st.active = true; st.done = false; st.answerShown = false;
    if (cfg.onStart) cfg.onStart();
    const descChars = cfg.descNode ? String(cfg.descNode.textContent || '').replace(/\s/g, '').length : 0;
    const descHold = Math.max(NARRATION_TIMING.descMin,
      Math.min(NARRATION_TIMING.descMax, Math.round(descChars * NARRATION_TIMING.descRead)));
    const typing = typeNarrationTitle(cfg.titleNode, () => {
      after(NARRATION_TIMING.breath, () => {
        if (st.done) return;
        if (cfg.onDescIn) cfg.onDescIn();
        after(cfg.hold != null ? cfg.hold : descHold + NARRATION_TIMING.descFade, reveal);
      });
    });
    if (cfg.hintNode) {
      after(cfg.hintDelay != null ? cfg.hintDelay : NARRATION_TIMING.hintDelay, () => {
        if (st.done) return;
        cfg.hintNode.classList.add('is-on');
      });
    }
    ui.narrationFinishTyping = () => typing.finish(true);
    ui.narrationReveal = () => { typing.finish(true); reveal(); };
    return ui.narrationReveal;
  }

  /** 문구 뒤의 모든 것(입력란·안내·버튼)을 하나의 '답' 카드로 묶는다. */
  function wrapOnboardingAnswer(step) {
    if (!step) return null;
    const existing = step.querySelector('.ob-answer');
    if (existing) return existing;
    const hero = step.querySelector('.ob-hero');
    if (!hero) return null;
    const answer = document.createElement('div');
    answer.className = 'ob-answer';
    let node = hero.nextSibling;
    while (node) { const next = node.nextSibling; answer.appendChild(node); node = next; }
    step.appendChild(answer);
    return answer;
  }

  /** 온보딩 단계 하나에 내레이션을 건다 — 답(입력란·버튼)은 문구를 다 읽은 뒤 나타난다. */
  function applyOnboardingNarration(stepId) {
    const step = el.onboardingBody && el.onboardingBody.querySelector('.ob-step');
    if (!step) return;
    const hero = step.querySelector('.ob-hero');
    const answer = wrapOnboardingAnswer(step);
    clearNarrationTimers();
    const st = narrationState();
    st.active = false; st.done = true; st.step = stepId; st.answerShown = true;
    if (!hero || !answer) return;

    let hint = hero.querySelector('.ob-skip-hint');
    if (!hint) {
      hint = document.createElement('p');
      hint.className = 'ob-skip-hint';
      hint.innerHTML = `<span class="ob-skip-line" aria-hidden="true"></span><span>문구를 탭하면 바로 시작해요</span>`;
      hero.appendChild(hint);
    }
    hint.classList.remove('is-on');
    const titleNode = hero.querySelector('.ob-title');
    const descNode = hero.querySelector('.ob-desc');

    const reveal = () => {
      step.classList.remove('is-narrating');
      step.classList.add('narr-done');
      answer.hidden = false;
      answer.classList.add('is-arriving');
      setTimeout(() => answer.classList.remove('is-arriving'), 560);
    };

    /* 동작 줄이기·자동 테스트 — 기다림 없이 답을 보여준다(문구는 그대로 남는다). */
    if (!narrationEnabled()) {
      step.classList.add('narr-done');
      answer.hidden = false;
      hint.remove();
      return;
    }

    step.classList.add('is-narrating');
    step.classList.remove('narr-done', 'narr-desc-in');
    answer.hidden = true;
    const stepIndex = Math.min(ui.onboardingStep, obFlow().length - 1);
    playNarration({
      titleNode,
      descNode,
      hintNode: hint,
      hintDelay: narrationHintDelay(stepIndex === 0),
      onStart: () => { answer.hidden = true; },
      onDescIn: () => step.classList.add('narr-desc-in'),
      onReveal: reveal
    });

    /* 문구 영역 탭 → 즉시 완결 */
    const skip = (e) => {
      if (!st.active) return;
      if (e && e.target.closest('.ob-answer')) return;
      if (e) e.preventDefault();
      if (typeof ui.narrationReveal === 'function') ui.narrationReveal();
    };
    hero.addEventListener('click', skip);
  }

  function renderOnboarding() {
    if (!el.onboardingBody) return;
    const ob = store.getOnboardingState();
    const d = ui.onboardingDraft || (ui.onboardingDraft = newOnboardingDraft());
    const loginMode = ui.onboardingMode === 'login' && ob.hasAccount;
    const stepId = obStepId();
    const errHTML = '<p class="ob-error" id="ob-error" hidden></p>';
    let body = '';

    if (loginMode) {
      onboardingProgressVisible(false);
      body = `
        <div class="ob-hero">
          <h1 class="ob-title">다시 만나요</h1>
          <p class="ob-desc">${escapeHtml((ob.email || ob.nickname) ? `${ob.email || ob.nickname} 계정으로 이어서 시작해요.` : '저장된 계정으로 이어서 시작해요.')}</p>
        </div>
        <div class="ob-field">
          <label class="ob-label" for="ob-email">${ob.hasEmail ? '이메일' : '아이디'}</label>
          <input class="ob-input ob-input-lg" id="ob-email" type="text" autocomplete="username" value="${escapeHtml(ob.email || ob.loginId)}" placeholder="${ob.hasEmail ? 'me@example.com' : '아이디'}">
        </div>
        <div class="ob-field">
          <label class="ob-label" for="ob-login-pw">비밀번호</label>
          <input class="ob-input ob-input-lg" id="ob-login-pw" type="password" autocomplete="current-password" placeholder="비밀번호">
        </div>
        ${errHTML}
        <div class="ob-actions">
          <button class="ob-btn primary" id="ob-login-submit" type="button">이어서 시작</button>
          <button class="ob-btn ghost" id="ob-forgot" type="button">비밀번호를 잊으셨나요?</button>
          <button class="ob-btn ghost" id="ob-restart-signup" type="button">새 계정 만들기</button>
        </div>`;
    } else if (stepId === 'email' || stepId === 'reset-email') {
      onboardingProgressVisible(true);
      onboardingProgress();
      const reset = stepId === 'reset-email';
      body = `
        ${obKicker(stepId)}
        <div class="ob-hero">
          <h1 class="ob-title">${reset ? '비밀번호를<br>잊으셨나요?' : '어떤 이메일로<br>시작할까요?'}</h1>
          <p class="ob-desc">${reset
            ? '가입한 이메일을 알려주세요. 인증번호를 통해 새 비밀번호를 정할 수 있어요.'
            : '인증번호를 보내 드릴게요. 계정을 찾거나 비밀번호를 잊었을 때도 이 주소를 씁니다.'}</p>
        </div>
        <div class="ob-field">
          <label class="ob-label" for="ob-email">이메일</label>
          <input class="ob-input ob-input-lg" id="ob-email" type="email" inputmode="email" autocomplete="email"
                 value="${escapeHtml(d.email)}" placeholder="me@example.com">
        </div>
        ${errHTML}
        <p class="ob-note">${reset
          ? '인증번호는 가입한 이메일하고만 대조해요.'
          : '이 기기에서 도는 체험판이라 실제 메일은 보내지 않아요 — 다음 화면의 모의 메일함에서 인증번호를 확인하세요.'}</p>
        <div class="ob-actions">
          <button class="ob-btn primary" id="ob-next" type="button">인증번호 받기</button>
          ${reset
            ? '<button class="ob-btn ghost" id="ob-to-login" type="button">로그인으로 돌아가기</button>'
            : (ob.hasAccount ? '<button class="ob-btn ghost" id="ob-to-login" type="button">이미 계정이 있어요</button>' : '')}
        </div>`;
    } else if (stepId === 'code' || stepId === 'reset-code') {
      onboardingProgressVisible(true);
      onboardingProgress();
      body = `
        ${obKicker(stepId)}
        <div class="ob-hero">
          <h1 class="ob-title">메일로 온 6자리를<br>알려주세요</h1>
          <p class="ob-desc"><b>${escapeHtml(d.email)}</b> 로 인증번호를 보냈어요.</p>
        </div>
        ${obMailCard(stepId)}
        <div class="ob-field">
          <label class="ob-label" for="ob-code">인증번호 <span class="ob-hint">6자리</span></label>
          <input class="ob-input ob-input-lg ob-num-input" id="ob-code" type="text" inputmode="numeric"
                 maxlength="6" autocomplete="one-time-code" placeholder="000000" value="">
        </div>
        ${errHTML}
        <div class="ob-actions">
          <button class="ob-btn primary" id="ob-verify" type="button">확인</button>
          <button class="ob-btn ghost" id="ob-resend" type="button">인증번호 다시 받기</button>
          <button class="ob-btn ghost" id="ob-back" type="button">이메일 바꾸기</button>
        </div>`;
    } else if (stepId === 'password' || stepId === 'reset-password') {
      onboardingProgressVisible(true);
      onboardingProgress();
      const reset = stepId === 'reset-password';
      body = `
        ${obKicker(stepId)}
        <div class="ob-hero">
          <h1 class="ob-title">${reset ? '새 비밀번호를<br>정해주세요' : '비밀번호를<br>정해주세요'}</h1>
          <p class="ob-desc">4자 이상이면 돼요. 비밀번호를 잊으면 이메일 인증으로 다시 찾을 수 있어요.</p>
        </div>
        <div class="ob-field">
          <label class="ob-label" for="ob-password">비밀번호</label>
          <input class="ob-input ob-input-lg" id="ob-password" type="password" autocomplete="new-password" placeholder="4자 이상">
        </div>
        ${reset ? `
        <div class="ob-field">
          <label class="ob-label" for="ob-password-confirm">비밀번호 확인</label>
          <input class="ob-input ob-input-lg" id="ob-password-confirm" type="password" autocomplete="new-password" placeholder="한 번 더 입력">
        </div>` : ''}
        ${errHTML}
        <div class="ob-actions">
          <button class="ob-btn primary" id="${reset ? 'ob-submit' : 'ob-next'}" type="button">${reset ? '비밀번호 바꾸고 로그인' : '다음'}</button>
          <button class="ob-btn ghost" id="ob-back" type="button">이전</button>
        </div>`;
    } else if (stepId === 'nickname') {
      onboardingProgressVisible(true);
      onboardingProgress();
      body = `
        ${obKicker('nickname')}
        <div class="ob-hero">
          <h1 class="ob-title">뭐라고<br>부를까요?</h1>
          <p class="ob-desc">당신의 이름(닉네임)은 무엇인가요? 다른 사람들이 어떻게 불렀으면 좋겠나요?<br>
            피드·스토리·디엠·탐색 카드에 이 이름이 보여요.</p>
        </div>
        <div class="ob-name-row">
          <span class="ob-name-avatar" id="ob-name-avatar" style="background:${d.photoUrl ? 'transparent' : d.avatarGradient}">
            ${d.photoUrl ? avatarImgHTML(d.photoUrl, '내 사진') : escapeHtml((d.nickname || '').charAt(0) || '?')}
          </span>
          <div class="ob-field ob-field-grow">
            <label class="ob-label" for="ob-nickname">닉네임 <span class="ob-hint">2~12자</span></label>
            <input class="ob-input ob-input-lg" id="ob-nickname" type="text" maxlength="12" autocomplete="nickname"
                   value="${escapeHtml(d.nickname)}" placeholder="예: 러닝준">
          </div>
        </div>
        ${errHTML}
        <div class="ob-actions">
          <button class="ob-btn primary" id="ob-next" type="button">다음</button>
          <button class="ob-btn ghost" id="ob-back" type="button">이전</button>
        </div>`;
    } else if (stepId === 'photo') {
      onboardingProgressVisible(true);
      onboardingProgress();
      body = `
        ${obKicker('photo')}
        <div class="ob-hero">
          <h1 class="ob-title">프로필 사진을<br>올려볼까요?</h1>
          <p class="ob-desc">얼굴이 아니어도 괜찮아요. 좋아하는 취미 사진이면 충분해요. 사진 없이 넘어가도 돼요.</p>
        </div>
        <div class="ob-photo-stage">
          <div class="ob-photo-preview ob-photo-preview-lg ${d.avatarGradient === SIGNUP_FALLBACK_GRADIENT ? 'brand' : ''}" id="ob-photo-preview"
               style="background:${d.photoUrl ? 'transparent' : d.avatarGradient}">
            ${d.photoUrl ? avatarImgHTML(d.photoUrl, '프로필 사진 미리보기') : escapeHtml((d.nickname || '').charAt(0) || 'ooG')}
          </div>
          <div class="ob-photo-btns">
            <button class="ob-btn ghost" id="ob-photo-album" type="button">앨범에서 고르기</button>
            <button class="ob-btn ghost" id="ob-photo-camera-btn" type="button">사진 찍기</button>
          </div>
          <input class="ob-file-hidden" id="ob-photo-input" type="file" accept="image/*" aria-label="앨범에서 프로필 사진 고르기">
          <input class="ob-file-hidden" id="ob-photo-camera" type="file" accept="image/*" capture="environment" aria-label="카메라로 프로필 사진 찍기">
          <div class="ob-swatches" id="ob-swatches" role="group" aria-label="기본 아바타 색">
            ${(ob.avatarGradients || []).map((g, i) =>
              `<button class="ob-swatch ${d.avatarGradient === g ? 'on' : ''}" data-ob-gradient="${i}" type="button" style="background:${g}" aria-label="기본 아바타 ${i + 1}"></button>`).join('')}
          </div>
        </div>
        ${errHTML}
        <div class="ob-actions">
          <button class="ob-btn primary" id="ob-next" type="button">${d.photoUrl ? '다음' : '사진 없이 다음'}</button>
          <button class="ob-btn ghost" id="ob-back" type="button">이전</button>
        </div>`;
    } else if (stepId === 'age') {
      onboardingProgressVisible(true);
      onboardingProgress();
      body = `
        ${obKicker('age')}
        <div class="ob-hero">
          <h1 class="ob-title">나이가<br>어떻게 되세요?</h1>
          <p class="ob-desc">2030만·30대+ 처럼 나이 제한이 있는 모임을 가려내는 데만 써요. 나중에 내정보에서 바꿀 수 있어요.</p>
        </div>
        <div class="ob-field">
          <label class="ob-label" for="ob-age">나이 <span class="ob-hint">14~99세 · 선택</span></label>
          <input class="ob-input ob-input-lg ob-num-input" id="ob-age" type="number" min="14" max="99" inputmode="numeric"
                 value="${d.age === null ? '' : escapeHtml(String(d.age || ''))}" placeholder="예: 26">
        </div>
        ${errHTML}
        <div class="ob-actions">
          <button class="ob-btn primary" id="ob-next" type="button">${String(d.age || '').trim() ? '다음' : '건너뛰기'}</button>
          <button class="ob-btn ghost" id="ob-back" type="button">이전</button>
        </div>`;
    } else {
      onboardingProgressVisible(true);
      onboardingProgress();
      body = `
        ${obKicker('region')}
        <div class="ob-hero">
          <h1 class="ob-title">어디서 취미를<br>즐기세요?</h1>
          <p class="ob-desc">동네를 알려주면 가까운 모임을 먼저 보여드려요. 나중에 언제든 바꿀 수 있어요.</p>
        </div>
        <div class="ob-field">
          <label class="ob-label" for="ob-region">활동 지역</label>
          <select class="ob-input ob-input-lg" id="ob-region">
            <option value="">지역 선택 안 함</option>
            ${regionSelectHTML(d.regionId || '').replace('<option value="">동네 선택</option>', '')}
          </select>
        </div>
        ${errHTML}
        <p class="ob-note">다음 화면에서 취미를 여쭤볼게요 — 무엇을 좋아하는지 몰라도 괜찮아요.</p>
        <div class="ob-actions">
          <button class="ob-btn primary" id="ob-submit" type="button">우그 시작하기</button>
          <button class="ob-btn ghost" id="ob-back" type="button">이전</button>
        </div>`;
    }

    el.onboardingBody.className = `onboarding-body ob-step-${ui.obDir}`;
    el.onboardingBody.dataset.obMode = ui.onboardingMode;
    el.onboardingBody.innerHTML = `<div class="ob-step" data-ob-step="${stepId}" data-ob-mode="${ui.onboardingMode}">${body}</div>`;
    /* Sprint 26.5 — 문구(배경 위 글자)와 답(입력란 카드)을 늘 나눠 둔다.
       내레이션이 꺼진 화면(로그인·동작 줄이기)에서도 답은 같은 카드로 보인다. */
    wrapOnboardingAnswer(el.onboardingBody.querySelector('.ob-step'));
    if (loginMode) el.onboardingBody.querySelector('.ob-step').classList.add('narr-done');
    /* Sprint 23 — 문구가 먼저, 입력란은 문구를 다 읽은 뒤(로그인·재설정 화면은 바로).
       같은 단계의 재렌더(사진 미리보기 등)에서는 다시 가리지 않는다. */
    const narrKey = `${ui.onboardingMode}:${stepId}`;
    if (!loginMode && ui.obNarrKey !== narrKey) {
      ui.obNarrKey = narrKey;
      applyOnboardingNarration(stepId);
    }
  }

  /** 온보딩 입력은 단계마다 새로 그려지므로 id 로 찾는 헬퍼. */
  const obField = (id) => document.querySelector(`[id="${id}"]`);

  function collectOnboardingInputs() {
    const d = ui.onboardingDraft || (ui.onboardingDraft = newOnboardingDraft());
    const val = (id) => { const n = obField(id); return n ? n.value : undefined; };
    if (obField('ob-email')) d.email = val('ob-email');
    if (obField('ob-code')) d.code = val('ob-code');
    if (obField('ob-login-pw')) d.password = d.password || '';
    if (obField('ob-password')) d.password = val('ob-password');
    if (obField('ob-password-confirm')) d.passwordConfirm = val('ob-password-confirm');
    if (obField('ob-nickname')) d.nickname = val('ob-nickname');
    if (obField('ob-age')) d.age = val('ob-age');
    if (obField('ob-region')) d.regionId = val('ob-region');
    return d;
  }

  /** 다음 단계로 — 방향을 기억해 두어 전환 애니메이션이 앞/뒤를 구분한다. */
  function obGo(step) {
    const flow = obFlow();
    ui.onboardingStep = Math.max(0, Math.min(flow.length - 1, step));
    ui.obDir = 'next';
    ui.obError = '';
    renderOnboarding();
  }

  /** 이메일 화면에서 → 인증번호 발송 → 인증 화면으로. */
  function obSendCode() {
    const d = collectOnboardingInputs();
    const purpose = ui.onboardingMode === 'reset' ? 'reset' : 'signup';
    const res = purpose === 'reset'
      ? store.requestPasswordReset({ email: d.email })
      : store.requestEmailCode({ email: d.email, purpose: 'signup' });
    if (!res.ok) return showOnboardingError(onboardingError(res.reason));
    d.email = res.email;
    d.emailVerified = false;
    ui.obCode = res;
    showToast('인증번호를 만들었어요 · 아래 모의 메일함에서 확인하세요', 'info');
    obGo(1);
  }

  /** 인증번호 확인 → 성공하면 다음 질문(가입=비밀번호 / 재설정=새 비밀번호)으로. */
  function obVerifyCode() {
    const d = collectOnboardingInputs();
    const purpose = ui.onboardingMode === 'reset' ? 'reset' : 'signup';
    const res = store.verifyEmailCode({ email: d.email, code: d.code, purpose });
    if (!res.ok) {
      const msg = res.reason === 'code_mismatch' && res.triesLeft != null
        ? `인증번호가 맞지 않아요 · ${res.triesLeft}번 더 시도할 수 있어요`
        : onboardingError(res.reason);
      return showOnboardingError(msg);
    }
    d.emailVerified = true;
    showToast('이메일 인증을 마쳤어요', 'success');
    obGo(2);
  }

  function onboardingNext() {
    const d = collectOnboardingInputs();
    const stepId = obStepId();
    if (stepId === 'email' || stepId === 'reset-email') return obSendCode();
    if (stepId === 'code' || stepId === 'reset-code') return obVerifyCode();
    if (stepId === 'password') {
      if (String(d.password || '').length < 4) return showOnboardingError('비밀번호를 4자 이상 입력해 주세요');
      return obGo(3);
    }
    if (stepId === 'nickname') {
      const name = String(d.nickname || '').trim();
      if (name.length < 2) return showOnboardingError('닉네임을 2자 이상 입력해 주세요');
      if (name.length > 12) return showOnboardingError('닉네임은 12자까지 쓸 수 있어요');
      d.nickname = name;
      return obGo(4);
    }
    if (stepId === 'photo') return obGo(5);
    if (stepId === 'age') {
      if (String(d.age || '').trim() !== '') {
        const n = Number(d.age);
        if (!Number.isFinite(n) || n < 14 || n > 99) return showOnboardingError('나이는 14~99세 사이로 입력해 주세요');
      }
      return obGo(6);
    }
    if (stepId === 'region') return submitOnboarding();
    return undefined;
  }

  function showOnboardingError(text) {
    ui.obError = String(text || '');
    const node = obField('ob-error');
    if (node) { node.hidden = false; node.textContent = text; }
    else showToast(text, 'warning');
  }

  function onboardingBack() {
    ui.obDir = 'prev';
    ui.obError = '';
    ui.onboardingStep = Math.max(0, ui.onboardingStep - 1);
    renderOnboarding();
  }

  function submitOnboarding() {
    const d = collectOnboardingInputs();
    const region = d.regionId ? store.getRegion(d.regionId) : null;
    const res = store.signUp({
      email: d.email, password: d.password, passwordConfirm: d.passwordConfirm || d.password,
      quickStart: d.quickStart === true,
      nickname: d.nickname, photoUrl: d.photoUrl, avatarGradient: d.avatarGradient,
      age: String(d.age || '').trim() === '' ? null : Number(d.age),
      location: region ? `${region.name.split('·')[0]} ${region.short}` : '',
      hobbies: d.hobbies
    });
    if (!res.ok) return showOnboardingError(onboardingError(res.reason));
    ui.onboardingDraft = null;
    ui.obCode = null;
    return finishSignup();
  }

  /** 비밀번호 재설정 완료 — 새 비밀번호로 바로 로그인해 앱으로 들어간다. */
  function submitPasswordReset() {
    const d = collectOnboardingInputs();
    const res = store.resetPassword({
      email: d.email, code: d.code, password: d.password, passwordConfirm: d.passwordConfirm
    });
    if (!res.ok) return showOnboardingError(onboardingError(res.reason));
    const sign = store.signIn({ email: d.email, password: d.password });
    if (!sign.ok) return showOnboardingError(onboardingError(sign.reason));
    ui.onboardingMode = 'signup';
    ui.onboardingStep = 0;
    ui.onboardingDraft = null;
    ui.obCode = null;
    showToast('비밀번호를 바꿨어요 · 새 비밀번호로 로그인했어요', 'success');
    return finishSignup();
  }

  function submitOnboardingLogin() {
    const idNode = obField('ob-email');
    const pwNode = obField('ob-login-pw');
    const identifier = idNode ? idNode.value : '';
    const pw = pwNode ? pwNode.value : '';
    const res = store.signIn({ email: identifier, loginId: identifier, password: pw });
    if (!res.ok) return showOnboardingError(onboardingError(res.reason));
    ui.onboardingDraft = null;
    return finishSignup();
  }

  /** 가입/로그인 완료 → 앱 화면으로. 정한 닉네임·사진을 전체에 반영한다. */
  function finishSignup() {
    applySignInGate();
    paintMyAvatars();
    renderHome();
    renderGallery();
    renderExplore();
    renderChatRooms();
    renderProfileHeader();
    renderProfileMyFeed();
    updateBadges();
    /* Sprint 21 — 가입 직후에는 홈(내 모임 갤러리)으로 들어가 스포트라이트 가이드를 본다.
       가이드 안에서 취향을 묻고, 홈 하단 추천 모임이 그 답을 따라 고른다. */
    switchTab('tab-home');
    const u = store.currentUser;
    showToast(`${u.nickname}님, ooG에 오신 걸 환영해요`, 'success');
    /* Sprint 22 — 가이드는 **처음 가입한 사람에게만** 자동으로 뜬다.
       로그인·비밀번호 재설정으로 다시 들어온 사람에게 또 띄우면 방해가 된다. */
    if (!store.isDemoAccount() && store.getGuideState().needed) startGuide();
  }

  /** 가입 전에는 앱을 가리고 회원가입만 보여준다. */
  function applySignInGate() {
    const signedIn = store.isSignedIn();
    document.body.classList.toggle('onboarding-mode', !signedIn);
    if (el.onboarding) el.onboarding.hidden = signedIn;
    if (!signedIn) {
      const ob = store.getOnboardingState();
      ui.onboardingMode = ob.hasAccount && !ob.completed ? 'login' : 'signup';
      /* 로그인 화면은 질문 단계가 아니라 한 화면이므로 진행 위치를 처음으로 둔다 */
      if (ui.onboardingMode === 'login') ui.onboardingStep = 0;
      if (ui.onboardingMode !== 'login' && !ui.onboardingDraft) ui.onboardingDraft = newOnboardingDraft();
      renderOnboarding();
    }
  }

  /** 확인 시트 — 로그아웃/초기화처럼 되돌리기 어려운 동작 앞에서 한 번 물어본다. */
  function askConfirm(title, desc, okLabel, onOk) {
    ui.confirmAction = typeof onOk === 'function' ? onOk : null;
    if (el.confirmTitle) el.confirmTitle.textContent = title;
    if (el.confirmDesc) el.confirmDesc.textContent = desc;
    if (el.confirmOk) el.confirmOk.textContent = okLabel || '확인';
    openModal(el.confirmModal);
  }

  function runSignOut() {
    store.signOut();
    ui.onboardingStep = 0;
    ui.onboardingDraft = newOnboardingDraft();
    ui.groupSpaceId = null;
    closeAllModals();
    applySignInGate();
    switchTab('tab-home');
    showToast('로그아웃했어요 · 다시 로그인할 수 있어요', 'info');
  }

  function runResetData() {
    store.resetAllData();
    closeAllModals();
    ui.onboardingStep = 0;
    ui.onboardingDraft = newOnboardingDraft();
    ui.groupSpaceId = null;
    switchTab('tab-home');
    applySignInGate();
    renderHome();
    renderExplore();
    renderProfileHeader();
    updateBadges();
    showToast('모든 데이터를 비웠어요 · 회원가입부터 다시 시작해요', 'info');
  }

  /** 모달을 모두 닫는다(로그아웃·초기화 때 화면 정리). */
  function closeAllModals() {
    $$('.modal-overlay.active').forEach((m) => closeModal(m));
    if (el.storyViewer && !el.storyViewer.hidden) closeStoryViewer();
  }

  /** Sprint 27.5 — 예시 데이터만 비운다(내 모임·글은 그대로). */
  function runClearSampleData() {
    const res = store.clearSampleData();
    closeAllModals();
    /* 예시 모임 안을 보고 있었다면 그 자리를 정리한다(없는 모임에 머물지 않게). */
    if (ui.groupSpaceId && !store.isGroupJoined(ui.groupSpaceId)) {
      ui.groupSpaceId = null;
      if (typeof syncNavMode === 'function') syncNavMode();
    }
    renderHome();
    renderExplore();
    renderChatRooms();
    updateBadges();
    renderProfileDrawer();
    showToast('예시 데이터를 비웠어요 · 내가 만든 것은 그대로예요', 'info');
  }

  /** Sprint 27.5 — 예시 데이터를 다시 넣는다(가이드·기능 체험용). */
  function runRestoreSampleData() {
    store.seedSampleData();
    closeAllModals();
    renderHome();
    renderExplore();
    renderChatRooms();
    updateBadges();
    renderProfileDrawer();
    showToast('예시 데이터를 다시 넣었어요', 'success');
  }


  /* ------------------------------------------------------------------
   * Sprint 11 — 알림함 펼침 상태 (11/15 02:07 사용자 결정: "이건 네가 알아서").
   *  · 펼친 묶음은 **이번에 앱을 쓴 동안에만** 유지한다(메모리 상태).
   *  · 앱을 다시 열면 언제나 1줄 요약으로 돌아온다 — 지난 펼침이 쌓여 화면이 길어지지 않게.
   * ------------------------------------------------------------------ */

  function showToast(message, type = 'success', action = null) {
    if (!el.toast) return;
    el.toast.innerHTML = '<span class="toast-msg"></span>';
    el.toast.querySelector('.toast-msg').textContent = message;

    if (action) {
      const btn = document.createElement('button');
      btn.className = 'toast-action';
      btn.type = 'button';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        clearTimeout(ui.toastTimer);
        el.toast.className = 'toast';
        action.onClick();
      });
      el.toast.appendChild(btn);
    }

    el.toast.className = `toast show ${type}`;
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => { el.toast.className = 'toast'; }, action ? 4200 : 2200);
  }

  let lastFocused = null;

  /**
   * Sprint 9 — 시트 포커스 복귀 2차: 모달마다 **연 그 요소**를 기억해 두고,
   * 닫힐 때 그 자리로 초점을 돌려준다. 그 사이 화면이 다시 그려져 요소가 사라졌으면
   * 같은 역할의 버튼(예: 필터 버튼)이나 본문으로 되돌아가 키보드 사용자가 길을 잃지 않는다.
   */
  function rememberOpener(node, opener) {
    node._oogOpener = opener || null;
  }

  function restoreFocus(node) {
    const opener = node._oogOpener || lastFocused;
    node._oogOpener = null;
    lastFocused = null;
    const alive = (n) => !!n && typeof n.focus === 'function' && n.isConnected !== false
      && !(n.closest && n.closest('[hidden]'));
    if (alive(opener)) { opener.focus({ preventScroll: true }); return true; }
    const fallback = node.id === 'filter-modal' ? el.exploreFilterBtn : null;
    if (alive(fallback)) { fallback.focus({ preventScroll: true }); return true; }
    if (el.main) { el.main.setAttribute('tabindex', '-1'); el.main.focus({ preventScroll: true }); }
    return false;
  }

  function openModal(node) {
    closeAllPostMenus();
    /* Sprint 18 — 사이드바에서 연 시트가 사이드바 뒤에 가리지 않게 먼저 접는다. */
    if (ui.drawerOpen) closeDrawer({ silent: true });
    /* Sprint 12 — 닫히는 중인 다른 시트가 남아 있으면 즉시 정리한다
       (닫자마자 다른 시트를 열면 겹쳐 보이지 않게). */
    document.querySelectorAll('.modal-overlay.is-closing').forEach((other) => {
      clearTimeout(other._closeTimer);
      other._closeTimer = null;
      other.classList.remove('is-closing');
      const sheet = other.querySelector('.modal-sheet');
      if (sheet) sheet.style.transform = '';
    });
    if (node._closeTimer) { clearTimeout(node._closeTimer); node._closeTimer = null; }
    node.classList.remove('is-closing');
    lastFocused = document.activeElement;
    rememberOpener(node, document.activeElement);
    node.classList.add('active');
    document.body.classList.add('modal-open');
    if (el.main) el.main.style.overflow = 'hidden';   // 배경 스크롤 잠금
    const sheet = node.querySelector('.modal-sheet');
    if (sheet) setTimeout(() => sheet.focus({ preventScroll: true }), 60);
  }

  function closeModal(node) {
    const wasActive = node.classList.contains('active');
    node.classList.remove('active');
    /* Sprint 13 — 당기는 중에 닫히면(Escape 등) 시트가 어중간하게 내려간 채 남지 않게 정리 */
    cancelSheetDragFor(node);
    /* Sprint 12 — 닫힘도 보이게: 시트가 아래로 미끄러진 뒤 display 가 풀린다.
       포커스·상태는 즉시 원래대로 돌려 놓아 빠른 연속 조작에도 어긋나지 않는다. */
    if (wasActive && !prefersReducedMotion()) {
      node.classList.add('is-closing');
      clearTimeout(node._closeTimer);
      node._closeTimer = setTimeout(() => {
        node.classList.remove('is-closing');
        node._closeTimer = null;
        const sheet = node.querySelector('.modal-sheet');
        if (sheet) sheet.style.transform = '';
      }, 240);
    } else {
      node.classList.remove('is-closing');
    }
    if (node === el.filterModal) {
      ui.filterSheetOpen = false;
      if (el.exploreFilterBtn) el.exploreFilterBtn.setAttribute('aria-expanded', 'false');
    }
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.classList.remove('modal-open');
      if (el.main) el.main.style.overflow = '';
    }
    restoreFocus(node);
  }

  /* 모달 안에서 Tab 이 밖으로 나가지 않도록 순환시킨다 */
  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const activeModal = document.querySelector('.modal-overlay.active');
    if (!activeModal) return;
    const nodes = Array.from(activeModal.querySelectorAll(FOCUSABLE))
      .filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
  function scrollTop() { if (el.main) el.main.scrollTop = 0; }

  /* ==========================================================================
   * 1. 탭 라우팅
   * ======================================================================== */
  function switchTab(tabId) {
    closeAllPostMenus();
    /* Sprint 16 — 그룹게시판(tab-board)은 모임 안에서만 볼 수 있다. 갤러리로 나가면 피드로 돌린다. */
    if (tabId === 'tab-board' && !ui.groupSpaceId) tabId = 'tab-home';
    /* 떠나는 탭의 스크롤 위치를 기억하고, 돌아올 때 그 자리로 복원한다 */
    if (el.main && ui.activeTab && ui.activeTab !== tabId) {
      ui.scrollByTab[ui.activeTab] = el.main.scrollTop;
    }
    const prevTab = ui.activeTab;
    ui.activeTab = tabId;
    el.navButtons.forEach((b) => {
      const on = b.dataset.tab === tabId;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    el.tabViews.forEach((v) => v.classList.toggle('active', v.id === tabId));
    moveNavIndicator();

    /* 탭별 부가 렌더링 (필요할 때만)
       Sprint 16 — 홈은 '갤러리 ↔ 그룹 피드' 두 화면을 한 탭 안에서 오간다. */
    if (tabId === 'tab-home') { renderHome(); }
    if (tabId === 'tab-board') { renderBoard(); }
    if (tabId === 'tab-explore' && !ui.exploreRendered) { renderExplore(); }
    if (tabId === 'tab-chat') { renderChatRooms(); }
    if (tabId === 'tab-profile') {
      renderChatRooms(); renderProfileHeader(); renderNotificationSettings(); renderProfileGroupContext();
    }
    if (tabId === 'tab-myprofile') { renderMyProfileTab(); }

    /* 글쓰기 FAB은 그 모임 피드·게시판에서만 노출 (바깥 갤러리에는 없다) */
    el.fab.classList.toggle('visible',
      tabId === 'tab-board' || (tabId === 'tab-home' && isGroupMode()));

    /* 같은 탭 재선택이면 맨 위로, 탭 전환이면 기억한 위치로 (Sprint 9 — 복원 정확도 2차) */
    const saved = prevTab === tabId ? 0 : (ui.scrollByTab[tabId] || 0);
    restoreScroll(saved);
  }

  /**
   * Sprint 9 — 스크롤 복원 정확도 2차.
   * 탭 화면은 전환 뒤에 다시 그려지면서 높이가 달라진다(피드 지연 렌더·실베 스트립).
   * 그래서 ① 지금 가능한 위치로 바로 ② 다음 프레임 ③ 60ms 뒤 한 번 더 맞추고,
   * 매번 남은 스크롤 높이로 잘라 넣어 '빈 아래로 튀는' 현상을 막는다.
   */
  function restoreScroll(target) {
    if (!el.main) return;
    const apply = () => {
      const max = Math.max(0, el.main.scrollHeight - el.main.clientHeight);
      const y = Math.max(0, Math.min(Number(target) || 0, max));
      if (Math.abs(el.main.scrollTop - y) > 1) el.main.scrollTop = y;
    };
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 60);
  }

  /**
   * Sprint 12 — 활성 탭 아래로 미끄러지는 인디케이터.
   * 탭 폭이 화면에 따라 달라지므로(4등분·safe-area) 버튼의 실제 위치를 재서 옮긴다.
   * 첫 배치는 애니메이션 없이(왼쪽에서 날아오지 않게) 놓는다.
   */
  function moveNavIndicator(options = {}) {
    /* Sprint 16 — 바깥 탭과 그룹 탭은 서로 다른 탭바를 쓴다. 보이는 쪽 인디케이터만 옮긴다. */
    const navs = [el.navIndicator, el.navIndicatorGroup].filter(Boolean);
    let moved = 0;
    navs.forEach((ind) => {
      const bar = ind.parentElement;
      if (!bar || !bar.offsetWidth) return;
      const active = Array.from(bar.querySelectorAll('.nav-tab-item')).find((b) => b.classList.contains('active'));
      if (!active || !active.offsetWidth) return;
      const cx = active.offsetLeft + active.offsetWidth / 2;
      if (options.instant || !ind.classList.contains('is-ready')) {
        ind.style.transition = 'none';
        ind.style.setProperty('--nav-cx', `${cx}px`);
        void ind.offsetWidth;
        ind.style.transition = '';
        ind.classList.add('is-ready');
      } else {
        ind.style.setProperty('--nav-cx', `${cx}px`);
      }
      moved += 1;
    });
    return moved;
  }

  el.navButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  window.addEventListener('resize', () => moveNavIndicator({ instant: true }));

  /* ==========================================================================
   * 1-B. Sprint 14 — 홈: 내 모임 허브 (모임 전환 · 사진 피드 · 일정 · 단체 채팅)
   * --------------------------------------------------------------------------
   * 11/15 14:55 사용자 지시: "탐색도 중요하지만 내 그룹에서의 활동이나 그룹의
   * 모임 등 그런것도 중요해 … 홈이 우리 그룹의 사진 피드가 보이고 멤버들의
   * 단체 채팅 아니면 술모임이나 그런게 중요하지".
   *  · 맨 위: 가입한 모임 스위처(밴드의 밴드 전환) → 그 모임의 홈으로 바로 이동
   *  · 모임 헤더(커버/이름/인원/다음 약속) + [단체 채팅][사진 올리기][멤버]
   *  · 이번 주 모임: 술모임·번개 카드 + 참석/대기/불참(RSVP) + 참석자 아바타
   *  · 우리 모임 사진: 3열 사진 그리드(말머리 칩·리스트/인기 보기 전환)
   *  · 모임 단체 채팅 미리보기 → 전체 화면 단체방
   * 탐색은 이제 '부가'다. 홈이 앱을 열었을 때의 첫 화면이다.
   * ======================================================================== */
  function homeGroup() {
    const id = (ui.groupSpaceId && store.isGroupJoined(ui.groupSpaceId)) ? ui.groupSpaceId
      : (ui.homeGroupId || store.getHomeGroupId());
    ui.homeGroupId = id;
    return id ? store.getGroup(id) : null;
  }

  /** Sprint 16 — 지금 '모임 안'에 들어와 있는가 (바깥은 내 그룹 갤러리). */
  function isGroupMode() {
    return !!(ui.groupSpaceId && store.isGroupJoined(ui.groupSpaceId));
  }

  /** 탭바를 바꾼다 — 바깥은 3탭(홈·탐색·전체 디엠함), 모임 안은 4탭(피드·게시판·디엠·내정보). */
  function syncNavMode() {
    const on = isGroupMode();
    document.body.classList.toggle('group-mode', on);
    if (el.groupNav) el.groupNav.setAttribute('aria-hidden', String(!on));
    if (el.bottomNavEl) el.bottomNavEl.setAttribute('aria-hidden', String(on));
    moveNavIndicator({ instant: true });
  }

  /**
   * 모임 안으로 들어간다 — 그 모임 전용 공간(피드·게시판·디엠·내정보)으로 전환.
   * 상단 뒤로가기(data-group-back)로 갤러리로 돌아온다.
   */
  function enterGroupSpace(groupId, tabId) {
    if (!store.isGroupJoined(groupId)) {
      showToast('가입한 모임만 들어갈 수 있어요', 'warning');
      return { ok: false, reason: 'not_member' };
    }
    ui.groupSpaceId = groupId;
    ui.homeGroupId = groupId;
    ui.feedGroupId = groupId;
    ui.homeTag = null;
    ui.homeView = 'feed';
    ui.boardTag = null;
    store.setHomeGroupId(groupId);
    syncNavMode();
    switchTab(tabId || 'tab-home');
    updateBadges();
    if (el.main) el.main.scrollTop = 0;
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(6);
    return { ok: true, groupId };
  }

  /** 갤러리로 돌아가기 — 모임 안 4탭이 바깥 3탭으로 돌아온다. */
  function exitGroupSpace() {
    ui.groupSpaceId = null;
    syncNavMode();
    switchTab('tab-home');
    updateBadges();
    if (el.main) el.main.scrollTop = 0;
  }

  /** 예전 이름 호환 — 모임 전환도 '그 모임 들어가기'와 같은 동작이다. */
  function switchHomeGroup(groupId) {
    return enterGroupSpace(groupId, ui.activeTab === 'tab-board' ? 'tab-board' : 'tab-home');
  }

  /* ------------------------------------------------------------------
   * 홈 = 내 그룹 2열 갤러리 (바깥) / 그룹 공간 (안)
   * ---------------------------------------------------------------- */
  function renderHome() {
    if (!isGroupMode()) { renderGallery(); return; }
    const grp = homeGroup();
    if (!grp) { renderGallery(); return; }
    ui.feedGroupId = grp.id;
    renderGroupSpaceTop(grp);
    renderStoryBar(grp);
    renderHomeHero(grp);
    renderHomeNoticeBar(grp);
    renderHomeEvents(grp);
    renderHomeFeed(grp);
    renderHomeChatPreview(grp);
    if (el.navHomeBadge) {
      const upcoming = isGroupMode() ? store.getUpcomingGroupEvents(grp.id, 9).length : 0;
      el.navHomeBadge.textContent = String(upcoming);
      el.navHomeBadge.classList.toggle('hide', upcoming === 0);
    }
  }

  /** 모임 안 상단 ?/이름/인원 — 뒤로가기·멤버 버튼이 산다. */
  function renderGroupSpaceTop(grp) {
    if (el.groupSpaceName) el.groupSpaceName.textContent = grp.name;
    if (el.groupSpaceMeta) {
      const story = store.getGroupStoryStats(grp.id);
      el.groupSpaceMeta.textContent = `멤버 ${grp.memberCount}명 · 사진 ${store.getGroupPhotoPosts(grp.id).filter((p) => p.photoUrl).length}장 · 스토리 ${story.total}`;
    }
  }

  /** 바깥 홈 — 내가 가입한 그룹이 2열만 가득 차 늘어선다(ㅁ ㅁ / ㅁ ㅁ).
   *  Sprint 17 — 정렬(최근 활동순/가나다순/내가 그룹장) + 갤러리 안 '새 모임 만들기'. */
  function renderGallery() {
    if (!el.galleryGrid) return;
    renderHomeRecommend();
    renderHomeBrowse();
    const items = store.getGroupGallery();
    const stories = items.reduce((sum, it) => sum + it.storyCount, 0);
    if (el.gallerySub) {
      el.gallerySub.textContent = items.length
        ? `${items.length}개 모임 · 지금 올라온 스토리 ${stories}개`
        : '아직 가입한 모임이 없어요';
    }
    renderGallerySort(items.length > 0);
    if (!items.length) {
      el.galleryGrid.innerHTML = '';
      if (el.galleryEmpty) {
        el.galleryEmpty.hidden = false;
        el.galleryEmpty.innerHTML = `
          <div class="home-empty">
            ${emptyArt('explore')}
            <p class="empty-title">아직 내 모임이 없어요</p>
            <p class="empty-desc">취미가 맞는 모임에 가입하면 이곳이 우리 모임의 사진과 약속으로 채워져요.</p>
            <div class="empty-actions">
              <button class="btn-primary" data-home-find="1" type="button">모임 둘러보기</button>
              <button class="btn-secondary" data-gallery-new="1" type="button">새 모임 만들기</button>
            </div>
          </div>`;
      }
      return;
    }
    if (el.galleryEmpty) { el.galleryEmpty.hidden = true; el.galleryEmpty.innerHTML = ''; }
    el.galleryGrid.innerHTML = items.map(galleryCardHTML).join('') + newGroupTileHTML();
  }

  /** Sprint 17 — 갤러리 정렬 세그먼트. */
  function renderGallerySort(visible) {
    if (!el.gallerySort) return;
    el.gallerySort.hidden = visible === false;
    const sort = store.getGallerySort();
    el.gallerySort.innerHTML = store.getGallerySortOptions().map((o) => `
      <button class="gallery-sort-btn ${sort === o.id ? 'active' : ''}" data-gallery-sort="${o.id}"
              type="button" aria-pressed="${sort === o.id}">${escapeHtml(o.label)}</button>`).join('');
  }

  /** Sprint 17 — 2열 갤러리 안의 '새 모임 만들기' 타일. */
  function newGroupTileHTML() {
    return `
      <button class="gallery-new" data-gallery-new="1" type="button" aria-label="새 모임 만들기">
        <span class="gallery-new-plus" aria-hidden="true">${ic('plus')}</span>
        <span class="gallery-new-title">새 모임 만들기</span>
        <span class="gallery-new-desc">취미가 맞는 사람들과 바로 시작</span>
      </button>`;
  }

  /** 갤러리 카드 하나 — 표지(사진 2장 또는 그라디언트) · 이름 · 멤버·사진·스토리 · 다음 약속. */
  function galleryCardHTML(item) {
    const grp = item.group;
    const coverPhotos = (item.coverPhotos || []).filter(Boolean);
    const cover = coverPhotos.length
      ? `<span class="gallery-cover-photos">${coverPhotos.map((url, i) =>
          `<span class="gallery-cover-photo"><img src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async"></span>`).join('')}</span>`
      : `<span class="gallery-cover-emoji" aria-hidden="true">${ic(grp.icon)}</span>`;
    const next = item.nextEvent;
    /* Sprint 21 — 사진이 없으면 취미 대분류 색조(운동=그린 · 게임=보라 …)로 표지를 구분한다. */
    const tone = store.getHobbyTone(grp.hobbyId || grp.category);
    return `
      <article class="gallery-card tone-${escapeHtml(tone)}" data-open-group="${grp.id}" role="button" tabindex="0"
               aria-label="${escapeHtml(grp.name)} 모임 열기">
        <div class="gallery-cover${coverPhotos.length ? '' : ' is-plain'}"${coverPhotos.length ? ` style="background:${grp.coverGradient || 'linear-gradient(135deg,#ECFDF5,#D1FAE5)'}"` : ''}>
          ${cover}
          <span class="gallery-cover-veil" aria-hidden="true"></span>
          ${item.storyCount ? `<span class="gallery-story-badge">스토리 ${item.storyCount}</span>` : ''}
          ${item.isLeader ? '<span class="gallery-leader">그룹장</span>' : ''}
        </div>
        <div class="gallery-body">
          <h3 class="gallery-name">${escapeHtml(grp.name)}</h3>
          <p class="gallery-meta">멤버 ${item.memberCount} · 사진 ${item.photoCount}</p>
          <p class="gallery-next ${next ? '' : 'quiet'}">${next
            ? `${escapeHtml(next.title)} · ${escapeHtml(next.whenLabel)}`
            : '다가오는 약속 없음'}</p>
          ${item.storyAuthors.length ? `<div class="gallery-rings">${item.storyAuthors.map((a) =>
            `<span class="gallery-ring" style="background:${a.gradient}">${escapeHtml(a.avatarText || a.name.charAt(0))}</span>`).join('')}</div>` : ''}
        </div>
      </article>`;
  }

  /* ==========================================================================
   * Sprint 21 — 홈 하단 추천 모임 · 가입 후 스포트라이트 가이드 · 취향 질문
   * ------------------------------------------------------------------------
   *  11/16 18:42 사용자 지시
   *   · \"추천모임이 노출되도록 가입하면 모임이 없으니깐 처음에 어떤취향인지 물어보고 …\"
   *   · \"홈 탭 하단에 추천 모임이 뜨도록 그리고 모임찾기는 추천모임 아래로 내리면서 볼거아니야?
   *      좀만 내리면 더 많은 모임을 확인하세요! 나 더 많은 모임 둘러보기 이런식으로 버튼을 이동해줘\"
   *   · \"스포트라이트 효과로 이용자가 처음에 익숙할 수 있게 가이드를 넣어주었으면 해\"
   * ======================================================================== */

  /** 추천 모임 카드 — 사진이 없으면 취미 대분류 색조(.tone-*)의 점토 타일로 표지를 만든다. */
  function recommendCardHTML(item, index) {
    const g = item.group;
    const chip = store.getHobbyChip(g.hobbyId);
    const icon = g.icon || (chip && chip.icon) || 'sparkle';
    return `
      <article class="recommend-card tone-${escapeHtml(item.tone)}" data-open-group="${g.id}"
               data-rail-index="${index || 0}"
               role="button" tabindex="0"
               aria-label="${escapeHtml(g.name)} 추천 모임 · ${escapeHtml(item.hobbyName)}">
        <div class="recommend-cover">
          ${g.photoUrl
            ? `<img class="recommend-photo" src="${escapeHtml(g.photoUrl)}" alt="" loading="lazy" decoding="async">`
            : `<span class="recommend-clay" aria-hidden="true">${ic(icon)}</span>`}
          <span class="recommend-hobby">${ic(icon)} ${escapeHtml(item.hobbyName)}</span>
        </div>
        <div class="recommend-body">
          <h4 class="recommend-name">${escapeHtml(g.name)}</h4>
          <p class="recommend-meta">${escapeHtml(g.location || '온라인')} · 멤버 ${g.memberCount}명</p>
          <p class="recommend-reason">${escapeHtml(item.reason)}</p>
        </div>
      </article>`;
  }

  /** 홈 하단 '추천 모임' — 취향 답변(없으면 프로필 취미)으로 고른다. */
  function renderHomeRecommend() {
    if (!el.homeRecommendGrid) return;
    const taste = store.getTaste();
    const picked = (taste.goalIds.length ? taste.goalIds : taste.hobbyIds.length ? taste.hobbyIds : store.getTasteHobbyIds());
    const names = picked.map((id) => store.getHobbyChip(id)).filter(Boolean).map((h) => h.name).slice(0, 2);
    if (el.homeRecommendSub) {
      el.homeRecommendSub.textContent = names.length
        ? `${names.join(' · ')} 취미로 골랐어요`
        : '취미를 고르면 잘 맞는 모임을 골라드려요';
    }
    const items = store.getRecommendedGroups({ limit: 6 });
    /* Sprint 23 — 추천이 0개면 위쪽 슬라이드만 조용히 접고, 아래 '모임 둘러보기'가 바로 이어진다. */
    const recommendBlock = $('#home-recommend');
    const moreBlock = $('#home-recommend-more');
    if (!items.length) {
      if (recommendBlock) recommendBlock.hidden = true;
      if (moreBlock) moreBlock.hidden = true;
      if (el.homeRecommendGrid) el.homeRecommendGrid.innerHTML = '';
      if (el.homeRecommendSub) el.homeRecommendSub.textContent = '아직 추천할 모임이 없어요 — 아래에서 찾아보세요';
      return;
    }
    if (recommendBlock) recommendBlock.hidden = false;
    if (moreBlock) moreBlock.hidden = false;
    el.homeRecommendGrid.innerHTML = items.map((it, i) => recommendCardHTML(it, i)).join('');
  }

  /* ==========================================================================
   * Sprint 22 — 홈의 '모임 둘러보기' (탐색에서 옮겨온 모임 목록)
   * ------------------------------------------------------------------------
   *  11/16 사용자: "탐색탭의 모임은 그냥 홈탭으로 보내줘"
   *   · 홈에서 내 모임 → 추천 모임 → **모임 둘러보기** 순으로 내려가며 본다.
   *   · 검색어·취미 대분류·정렬을 고르면 즉시 목록이 바뀌고, '모임 더 보기'로 이어 붙인다.
   * ======================================================================== */
  const HOME_BROWSE_PAGE = 6;

  function homeBrowseState() {
    if (!ui.homeBrowse) {
      ui.homeBrowse = { categoryId: 'all', sort: 'recommend', query: '', limit: HOME_BROWSE_PAGE };
    }
    return ui.homeBrowse;
  }

  function renderHomeBrowse() {
    if (!el.homeBrowseGrid) return;
    const s = homeBrowseState();
    if (el.homeBrowseChips) {
      el.homeBrowseChips.innerHTML = store.getGroupBrowseCategories().map((c) => `
        <button class="home-browse-chip ${s.categoryId === c.id ? 'active' : ''}" data-browse-cat="${escapeHtml(c.id)}"
                type="button" aria-pressed="${s.categoryId === c.id}">${ic(c.icon)}<span>${escapeHtml(c.name)}</span></button>`).join('');
    }
    if (el.homeBrowseSorts) {
      el.homeBrowseSorts.innerHTML = store.getGroupBrowseSorts().map((o) => `
        <button class="home-browse-sort ${s.sort === o.id ? 'active' : ''}" data-browse-sort="${escapeHtml(o.id)}"
                type="button" aria-pressed="${s.sort === o.id}">${escapeHtml(o.label)}</button>`).join('');
    }
    if (el.homeBrowseClear) el.homeBrowseClear.classList.toggle('hide', !s.query);
    const res = store.getGroupBrowse({
      query: s.query, categoryId: s.categoryId, sort: s.sort, limit: s.limit
    });
    const cat = store.getGroupBrowseCategories().find((c) => c.id === s.categoryId);
    if (el.btnHomeBrowseNew) el.btnHomeBrowseNew.hidden = res.total === 0 && !s.query && s.categoryId === 'all';
    if (el.homeBrowseSub) {
      el.homeBrowseSub.textContent = res.total
        ? `${s.query ? `'${s.query}' · ` : ''}${cat && cat.id !== 'all' ? `${cat.name} · ` : ''}모임 ${res.total}개`
        : '아직 둘러볼 모임이 없어요';
    }
    if (!res.items.length) {
      const filtering = !!(s.query || s.categoryId !== 'all');
      /* Sprint 26.5 — 세상이 비었을 때는 위 '내 그룹' 카드가 이미 모임 만들기를 권한다.
         여기서 또 버튼을 두면 같은 행동이 세 번 반복되므로, 조건에 걸린 0건일 때만 버튼을 둔다. */
      el.homeBrowseGrid.innerHTML = `
        <div class="home-browse-empty">
          <p class="home-browse-empty-title">${filtering ? '조건에 맞는 모임이 없어요' : '아직 둘러볼 모임이 없어요'}</p>
          <p class="home-browse-empty-desc">${filtering
            ? '검색어를 짧게 바꾸거나 다른 분야를 골라보세요.'
            : '모임이 생기면 이 자리에 보여요.'}</p>
          ${filtering ? `<div class="home-browse-empty-actions">
            <button class="btn-secondary" data-browse-reset="1" type="button">조건 초기화</button>
          </div>` : ''}
        </div>`;
    } else {
      el.homeBrowseGrid.innerHTML = res.items.map((item) => groupTileHTML(item)).join('');
    }
    if (el.btnHomeBrowseMore) {
      el.btnHomeBrowseMore.hidden = !res.hasMore;
      el.btnHomeBrowseMore.textContent = `모임 더 보기 (${Math.max(0, res.total - res.items.length)}개)`;
    }
  }

  /** 홈의 '모임 둘러보기'로 시선을 옮긴다(탐색에 있던 모임 찾기의 새 자리). */
  function focusHomeBrowse() {
    if (ui.activeTab !== 'tab-home') switchTab('tab-home');
    if (isGroupMode()) exitGroupSpace();
    renderHomeRecommend();
    renderHomeBrowse();
    const target = $('#home-browse') || $('#home-discover');
    if (target) {
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /** 홈 모임 둘러보기의 검색·분야 칩·정렬·더 보기·카드 열기 */
  function bindHomeBrowse() {
    const s = homeBrowseState();
    if (el.homeBrowseSearch) {
      let timer = null;
      el.homeBrowseSearch.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          s.query = el.homeBrowseSearch.value.trim();
          s.limit = HOME_BROWSE_PAGE;
          renderHomeBrowse();
        }, 160);
      });
    }
    if (el.homeBrowseClear) {
      el.homeBrowseClear.addEventListener('click', () => {
        s.query = '';
        if (el.homeBrowseSearch) el.homeBrowseSearch.value = '';
        s.limit = HOME_BROWSE_PAGE;
        renderHomeBrowse();
      });
    }
    if (el.homeBrowseChips) {
      el.homeBrowseChips.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-browse-cat]');
        if (!btn) return;
        s.categoryId = btn.dataset.browseCat;
        s.limit = HOME_BROWSE_PAGE;
        renderHomeBrowse();
      });
    }
    if (el.homeBrowseSorts) {
      el.homeBrowseSorts.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-browse-sort]');
        if (!btn) return;
        s.sort = btn.dataset.browseSort;
        renderHomeBrowse();
      });
    }
    if (el.btnHomeBrowseMore) {
      el.btnHomeBrowseMore.addEventListener('click', () => {
        s.limit += HOME_BROWSE_PAGE;
        renderHomeBrowse();
      });
    }
    if (el.btnHomeBrowseNew) el.btnHomeBrowseNew.addEventListener('click', () => openGroupCreate());
    if (el.homeBrowseGrid) {
      el.homeBrowseGrid.addEventListener('click', (e) => {
        if (e.target.closest('[data-browse-reset]')) {
          s.categoryId = 'all'; s.query = ''; s.limit = HOME_BROWSE_PAGE;
          if (el.homeBrowseSearch) el.homeBrowseSearch.value = '';
          renderHomeBrowse();
          return;
        }
        const openBtn = e.target.closest('[data-group-open]');
        if (openBtn) { openGroupDetail(openBtn.dataset.groupOpen); return; }
        const card = e.target.closest('[data-group-id]');
        if (card) openGroupDetail(card.dataset.groupId);
      });
      el.homeBrowseGrid.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest('button')) return;
        const card = e.target.closest('[data-group-id]');
        if (!card) return;
        e.preventDefault();
        openGroupDetail(card.dataset.groupId);
      });
    }
  }

  /* ---------------------------------------------------- 스포트라이트 가이드 */

  /* ==========================================================================
   * Sprint 21~22 — 가입 후 스포트라이트 가이드
   * ------------------------------------------------------------------------
   *  11/16 사용자: "처음 취미 묻는것도 그래 입력할게 많아 스토리텔링식으로 했으면좋겠어
   *   그리고 탐색탭이랑 디엠탭 설명할때 해당 메뉴에 들어가서 알려줘야지"
   *   · 취향은 **한 질문씩** — ① 분야 고르기 ② 세부 취미 ③ 해보고 싶은 것.
   *   · 탐색·디엠을 설명할 때는 **그 탭으로 실제로 이동한 화면**을 짚어 준다(tab).
   * ======================================================================== */
  const GUIDE_STEPS = [
    {
      id: 'welcome', target: null, tab: 'tab-home',
      title: '우그에 오신 걸 환영해요',
      desc: '1분만 따라오세요. 화면을 짚어가며 어디서 무엇을 하는지 알려드릴게요.'
    },
    {
      id: 'taste-category', target: null, tab: 'tab-home', body: 'taste-category',
      title: '어떤 분야가 끌리나요?',
      desc: '큰 분야 하나를 골라 주세요. 다음 화면에서 그 안의 취미를 하나씩 물어볼게요.'
    },
    {
      id: 'taste-hobby', target: null, tab: 'tab-home', body: 'taste-hobby',
      title: '그중 무엇을 좋아하나요?',
      desc: '당신의 취미는 무엇인가요? 최대 3개까지 고를 수 있고, 목록에 없으면 직접 써도 돼요.'
    },
    {
      id: 'taste-goal', target: null, tab: 'tab-home', body: 'taste-goal',
      title: '우그에서 어떤 걸 해보고 싶나요?',
      desc: '함께 해보고 싶은 것을 고르면 홈의 추천 모임이 그 취미로 채워져요. 건너뛰어도 괜찮아요.'
    },
    {
      id: 'gallery', targets: ['#group-gallery-grid .gallery-card'], tab: 'tab-home',
      title: '여기가 내 모임 자리예요',
      desc: '지금 보이는 두 모임은 둘러보기용 예시예요. 카드를 누르면 그 모임만의 피드·게시판·디엠으로 들어가요.'
    },
    {
      id: 'recommend', targets: ['#home-recommend-grid .recommend-card', '#home-browse-grid > *'], tab: 'tab-home',
      title: '취향에 맞는 모임을 모아뒀어요',
      desc: '취미를 고르면 맞는 모임을 골라드리고, 아래 「모임 둘러보기」에서 예시 모임에 바로 가입 신청해 볼 수 있어요.'
    },
    {
      id: 'explore', targets: ['#explore-board .board-row'], tab: 'tab-explore',
      title: '탐색은 사람과 글을 보는 곳이에요',
      desc: '지금 보이는 사람 4명과 동네 글 4개는 예시예요. 우리 동네를 골라 보고, 마음에 들면 바로 쪽지를 보내요.'
    },
    {
      id: 'dm', target: '#dm-head', tab: 'tab-chat',
      title: '전체 디엠함이에요',
      desc: '예시 대화 2개가 모여 있어요. 지금 보고 계신 이 탭에서 메시지를 보내고 비밀앨범 공개도 시험해 볼 수 있어요.'
    }
  ];

  /** 가이드 단계가 가리키는 탭 — 단계를 옮길 때 그 탭으로 실제로 이동한다. */
  function guideStepTab(step) {
    return (step && step.tab) || 'tab-home';
  }

  function guideState() {
    if (!ui.guide) {
      ui.guide = {
        open: false, step: 0, mode: 'onboarding',
        hobbyIds: [], goalIds: [], category: 'sports'
      };
    }
    return ui.guide;
  }

  /** 가이드를 연다. step 을 주면 그 단계부터(취미 다시 고르기 = 'taste-category'). */
  function startGuide(options = {}) {
    const g = guideState();
    const taste = store.getTaste();
    g.open = true;
    g.mode = options.mode || 'onboarding';
    g.hobbyIds = taste.hobbyIds.slice(0, 3);
    g.goalIds = taste.goalIds.slice(0, 3);
    g.category = (store.getHobbyChip((g.hobbyIds[0] || g.goalIds[0])) || {}).categoryId || 'sports';
    const wanted = options.step === 'taste' ? 'taste-category' : options.step;
    const found = wanted ? GUIDE_STEPS.findIndex((s) => s.id === wanted) : -1;
    const stepIndex = found >= 0 ? found : Math.max(0, store.getGuideState().step || 0);
    g.step = stepIndex;
    store.startGuide(options.step === 'welcome' || stepIndex === 0);
    renderGuide();
  }

  /** 가이드를 닫는다 — 마지막 단계면 'done', 건너뛰기면 'skipped'. */
  function closeGuide(status) {
    const g = guideState();
    if (status !== 'hidden') store.finishGuide(status === 'skipped' ? 'skipped' : 'done');
    g.open = false;
    if (el.spotlight) {
      el.spotlight.hidden = true;
      el.spotlight.classList.remove('is-open');
    }
    if (el.spotlightVeil) el.spotlightVeil.hidden = true;
    document.body.classList.remove('spotlight-open');
    if (ui.activeTab === 'tab-home') {
      renderHomeRecommend();
      renderHomeBrowse();
    }
  }

  /** 취향 선택을 저장한다 — 프로필 취미(최대 3)와 추천 기준(goal) 둘 다. */
  function saveGuideTaste() {
    const g = guideState();
    const res = store.saveTaste({ hobbyIds: g.hobbyIds, goalIds: g.goalIds });
    renderHomeRecommend();
    renderHomeBrowse();
    renderExploreToolbar();
    if (el.main) el.main.scrollTop = 0;
    return res;
  }

  /** 스포트라이트가 비출 타겟의 화면 좌표(없으면 null = 가운데 카드).
   *  Sprint 27.5 — targets 후보 중 **지금 보이는 첫 번째**를 쓴다(추천이 비었으면 둘러보기). */
  function guideTargetRect(step) {
    if (!step) return null;
    const list = Array.isArray(step.targets) ? step.targets : (step.target ? [step.target] : []);
    for (const selector of list) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const r = node.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }
    return null;
  }

  function placeSpotlight() {
    const g = guideState();
    if (!g.open || !el.spotlight) return;
    const step = GUIDE_STEPS[g.step] || GUIDE_STEPS[0];
    const rect = guideTargetRect(step);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect) {
      const pad = 6;
      el.spotlightHole.hidden = false;
      el.spotlightHole.style.left = `${Math.max(0, rect.x - pad)}px`;
      el.spotlightHole.style.top = `${Math.max(0, rect.y - pad)}px`;
      el.spotlightHole.style.width = `${rect.w + pad * 2}px`;
      el.spotlightHole.style.height = `${rect.h + pad * 2}px`;
      el.spotlightHole.style.borderRadius = step.id === 'recommend' ? '26px' : (step.id === 'gallery' ? '24px' : '18px');
    } else {
      el.spotlightHole.hidden = true;
      el.spotlightHole.style.width = '0px';
      el.spotlightHole.style.height = '0px';
    }
    const bubble = el.spotlightBubble;
    if (!bubble) return;
    bubble.classList.toggle('is-center', !rect);
    bubble.classList.remove('above', 'below');
    el.spotlight.classList.toggle('is-center', !rect);
    if (!rect) {
      /* Sprint 26.5 — 가운데 정렬 대신 위쪽에 고정한다. 문구가 다 찍히고 답이 나타날 때
         블록이 위아래로 흔들리지 않고 아래로만 자란다(읽는 순서가 눈에 남는다). */
      bubble.style.left = '50%';
      bubble.style.top = `${Math.max(56, Math.round(vh * 0.15))}px`;
      bubble.style.transform = 'translateX(-50%)';
      bubble.style.maxHeight = `${Math.round(vh * 0.78)}px`;
      placeSpotlightVeil(bubble);
      return;
    }
    const margin = 12;
    /* 하단 탭바(약 76px)를 가리지 않게 그 위까지만 쓴다. */
    const safeBottom = vh - 78;
    const bubbleH = Math.min(bubble.offsetHeight || 220, (safeBottom - 12) * 0.86);
    const below = rect.y + rect.h + margin;
    const above = rect.y - bubbleH - margin;
    const putAbove = below + bubbleH > safeBottom && above > 12;
    bubble.classList.add(putAbove ? 'above' : 'below');
    bubble.style.transform = 'none';
    const top = putAbove ? Math.max(12, above) : Math.max(12, Math.min(safeBottom - bubbleH, below));
    bubble.style.top = `${top}px`;
    bubble.style.left = `${Math.max(10, Math.min(vw - 10 - 350, (vw - 350) / 2))}px`;
    bubble.style.maxHeight = `${Math.round((safeBottom - 12) * 0.86)}px`;
    placeSpotlightVeil(bubble);
  }

  /** 문구 뒤의 흐림 막을 말풍선 크기에 맞춘다(문구가 움직이면 함께). */
  function placeSpotlightVeil(bubble) {
    const veil = el.spotlightVeil;
    if (!veil || !bubble) return;
    const r = bubble.getBoundingClientRect();
    if (!r.width) { veil.hidden = true; return; }
    veil.hidden = false;
    veil.style.left = `${r.left - 18}px`;
    veil.style.top = `${r.top - 14}px`;
    veil.style.width = `${r.width + 36}px`;
    veil.style.height = `${r.height + 36}px`;
  }

  /**
   * Sprint 23 — 가이드의 취향 질문도 문구 먼저, 선택 카드는 문구가 끝난 뒤.
   *  · 단계가 바뀔 때만 재생한다(같은 단계에서 취미를 고르면 다시 가리지 않는다).
   *  · 말풍선 제목/설명을 누르면 즉시 완결.
   */
  function applyGuideNarration(step) {
    if (!el.spotlightBubble) return;
    const st = narrationState();
    const body = el.spotlightBody;
    const titleNode = el.spotlightTitle;
    const descNode = el.spotlightDesc;
    const bubble = el.spotlightBubble;
    const key = `guide:${step ? step.id : ''}`;
    /* 같은 단계를 다시 그린 것(취미 하나를 골랐을 때) — 진행 중인 연출은 건드리지 않는다. */
    if (ui.guideNarrKey === key && st.active) return;
    clearNarrationTimers();
    bubble.classList.remove('is-narrating', 'narr-done', 'narr-desc-in');
    if (titleNode && titleNode.dataset.narrTitle) {
      titleNode.textContent = titleNode.dataset.narrTitle;
      delete titleNode.dataset.narrTitle;
    }
    st.active = false; st.done = true; st.answerShown = true; st.step = step ? step.id : null;
    if (body && step && step.body) body.hidden = false;
    if (!step || !narrationEnabled()) return;

    ui.guideNarrKey = key;
    bubble.classList.add('is-narrating');
    if (body) body.hidden = true;
    if (titleNode) titleNode.dataset.narrTitle = titleNode.textContent;

    playNarration({
      titleNode,
      descNode,
      hintDelay: narrationHintDelay(false),
      onStart: () => { if (body) body.hidden = true; },
      onDescIn: () => bubble.classList.add('narr-desc-in'),
      onReveal: () => {
        bubble.classList.remove('is-narrating');
        bubble.classList.add('narr-done');
        if (titleNode && titleNode.dataset.narrTitle) {
          titleNode.textContent = titleNode.dataset.narrTitle;
          delete titleNode.dataset.narrTitle;
        }
        if (body && step && step.body) {
          body.hidden = false;
          body.classList.add('is-arriving');
          setTimeout(() => body.classList.remove('is-arriving'), 560);
        }
      }
    });

    if (!bubble.dataset.narrBound) {
      bubble.dataset.narrBound = '1';
      bubble.addEventListener('click', (e) => {
        if (!st.active) return;
        if (e.target.closest('.spotlight-body') || e.target.closest('.spotlight-actions')) return;
        if (typeof ui.narrationReveal === 'function') ui.narrationReveal();
      });
    }
  }

  /**
   * 스포트라이트는 스크롤을 따라간다 — 부드러운 스크롤로 카드가 움직이는 동안
   * 구멍·말풍선이 옛 자리에 남아 있으면 엉뚱한 곳을 비춘다(Sprint 27.5).
   */
  (function wireGuideScrollFollow() {
    if (!el.main) return;
    let frame = null;
    const follow = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const g = guideState();
        if (g.open && el.spotlight && !el.spotlight.hidden) placeSpotlight();
      });
    };
    el.main.addEventListener('scroll', follow, { passive: true });
    window.addEventListener('resize', follow, { passive: true });
    /* 문구(답 카드)가 나타나 말풍선이 커지면 흐림 막도 함께 자란다. */
    if (el.spotlightBubble && typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => {
        const g = guideState();
        if (g.open && el.spotlight && !el.spotlight.hidden) placeSpotlight();
      });
      ro.observe(el.spotlightBubble);
    }
  })();

  /** 비출 대상이 화면 밖이면 그 카드가 보이도록 부드럽게 스크롤한다. */
  function ensureGuideTargetVisible(step) {
    if (!el.main) return false;
    const list = Array.isArray(step.targets) ? step.targets : (step.target ? [step.target] : []);
    const node = list.map((s) => document.querySelector(s)).find(Boolean);
    if (!node) return false;
    const mainRect = el.main.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    const topInMain = r.top - mainRect.top;
    const tooHigh = topInMain < 60;
    const tooLow = r.bottom > window.innerHeight - 96;
    if (!tooHigh && !tooLow) return false;
    const target = el.main.scrollTop + topInMain - Math.max(80, mainRect.height * 0.24);
    el.main.scrollTo({ top: Math.max(0, target), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    return true;
  }

  /** 가이드 한 단계를 그린다 — 그 단계가 설명하는 **탭으로 실제 이동**한 뒤 짚어 준다. */
  function renderGuide() {
    const g = guideState();
    if (!el.spotlight) return;
    const step = GUIDE_STEPS[g.step] || GUIDE_STEPS[0];
    const tab = guideStepTab(step);
    if (ui.activeTab !== tab) {
      switchTab(tab);
      document.body.classList.add('spotlight-open');
    }
    el.spotlight.hidden = false;
    el.spotlight.classList.add('is-open');
    document.body.classList.add('spotlight-open');
    if (el.spotlightStep) el.spotlightStep.textContent = `${g.step + 1} / ${GUIDE_STEPS.length}`;
    if (el.spotlightTitle) el.spotlightTitle.textContent = step.title;
    if (el.spotlightDesc) el.spotlightDesc.textContent = step.desc;
    if (el.spotlightPrev) el.spotlightPrev.hidden = g.step === 0;
    if (el.spotlightNext) {
      el.spotlightNext.textContent = g.step === GUIDE_STEPS.length - 1 ? '시작하기' : '다음';
    }
    if (el.spotlightBody) {
      el.spotlightBody.innerHTML = step.body ? guideBodyHTML(step.body) : '';
      el.spotlightBody.hidden = !step.body;
    }
    applyGuideNarration(step);
    store.setGuideStep(g.step);
    if (step.target || step.targets) {
      /* 탐색처럼 목록이 늦게 그려지는 화면은 스크롤 시점을 몇 번 더 잡아 준다. */
      [0, 260, 720, 1200].forEach((delay) => {
        setTimeout(() => {
          const g2 = guideState();
          if (!g2.open || g2.step !== g.step) return;
          ensureGuideTargetVisible(step);
          placeSpotlight();
        }, delay);
      });
    } else if (el.main) {
      el.main.scrollTop = 0;
    }
    requestAnimationFrame(placeSpotlight);
    setTimeout(placeSpotlight, 240);
    /* 탭을 막 바꾼 경우엔 카드가 늦게 그려질 수 있어 한 번 더 맞춘다 */
    setTimeout(placeSpotlight, 620);
    /* 키보드 사용자를 위해 말풍선으로 포커스를 옮긴다(포커스 링은 CSS 에서 지운다) */
    if (el.spotlightBubble) {
      try { el.spotlightBubble.focus({ preventScroll: true }); } catch (e) { /* 구형 브라우저 */ }
    }
  }

  /** 취향 단계의 본문 — 단계마다 질문 하나씩. */
  function guideBodyHTML(kind) {
    if (kind === 'taste-category') return guideCategoryHTML();
    if (kind === 'taste-hobby') return guidePickHTML('hobby');
    if (kind === 'taste-goal') return guidePickHTML('goal');
    return '';
  }

  /** 1단계 — 관심 분야(대분류) 하나를 고른다. */
  function guideCategoryHTML() {
    const g = guideState();
    const cats = store.getHobbyCategories();
    return `
      <div class="guide-cats guide-cats-cards" role="group" aria-label="취미 대분류">
        ${cats.map((c) => `<button class="guide-cat-card ${c.id === g.category ? 'on' : ''}" data-guide-cat="${c.id}"
            type="button" aria-pressed="${c.id === g.category}">
            <span class="guide-cat-icon" aria-hidden="true">${ic(c.icon)}</span>
            <span class="guide-cat-name">${escapeHtml(c.name)}</span>
            <span class="guide-cat-count">${c.hobbies.length}가지</span>
          </button>`).join('')}
      </div>
      <p class="guide-hint">나중에 다른 분야도 얼마든지 골라 더할 수 있어요.</p>`;
  }

  /** 2·3단계 — 고른 분야의 세부 취미(최대 3개) + 직접 쓰기. */
  function guidePickHTML(kind) {
    const g = guideState();
    const cats = store.getHobbyCategories();
    const cat = cats.find((c) => c.id === g.category) || cats[0];
    const selected = kind === 'goal' ? g.goalIds : g.hobbyIds;
    const chips = cat.hobbies.map((h) => {
      const on = selected.includes(h.id);
      const full = !on && selected.length >= 3;
      return `<button class="guide-chip ${on ? 'on' : ''}" data-guide-pick="${kind}" data-guide-hobby="${h.id}"
                type="button" aria-pressed="${on}" ${full ? 'aria-disabled="true"' : ''}>
                ${ic(h.icon)}<span>${escapeHtml(h.name)}</span>
              </button>`;
    }).join('');
    const title = kind === 'goal' ? '우그에서 어떤 걸 해보고 싶나요?' : '당신의 취미는 무엇인가요?';
    return `
      <div class="guide-cats" role="group" aria-label="취미 대분류">
        ${cats.map((c) => `<button class="guide-cat ${c.id === cat.id ? 'on' : ''}" data-guide-cat="${c.id}"
            type="button" aria-pressed="${c.id === cat.id}">${ic(c.icon)}<span>${escapeHtml(c.name)}</span></button>`).join('')}
      </div>
      <div class="guide-q">
        <p class="guide-q-title">${title} <span class="guide-q-count">${selected.length}/3</span></p>
        <div class="guide-chips" role="group" aria-label="${kind === 'goal' ? '해보고 싶은 취미' : '내 취미'}">${chips}</div>
      </div>
      <div class="guide-custom">
        <input class="guide-custom-input" id="guide-custom-input" type="text" maxlength="12"
               placeholder="목록에 없으면 직접 쓰기 (예: 파쿠르)" autocomplete="off">
        <button class="guide-custom-add" id="btn-guide-custom-add" type="button">추가</button>
      </div>`;
  }

  /** 취미 하나를 취향 답변에서 켜고 끈다(한 질문당 최대 3개). */
  function toggleGuidePick(kind, hobbyId) {
    const g = guideState();
    const key = kind === 'goal' ? 'goalIds' : 'hobbyIds';
    const list = g[key];
    if (list.includes(hobbyId)) g[key] = list.filter((id) => id !== hobbyId);
    else if (list.length < 3) g[key] = list.concat(hobbyId);
    else {
      showToast('한 질문에는 3개까지 고를 수 있어요', 'info');
      return;
    }
    renderGuide();
  }

  /** 목록에 없는 취미를 직접 써서 취향에 더한다. */
  function addGuideCustomHobby(kind) {
    const input = document.querySelector('.guide-custom-input');
    const value = input ? input.value : '';
    const res = store.addCustomHobby(value, guideState().category);
    if (!res.ok) {
      showToast(res.reason === 'duplicate' ? '이미 있는 취미예요' : '취미 이름을 1자 이상 적어주세요', 'warning');
      return;
    }
    const key = kind === 'goal' ? 'goalIds' : 'hobbyIds';
    const g = guideState();
    if (g[key].length >= 3) g[key] = g[key].slice(0, 2);
    g[key] = g[key].concat(res.hobby.id);
    showToast(`'${res.hobby.name}' 취미를 더했어요`, 'success');
    renderGuide();
  }

  function guideNext() {
    const g = guideState();
    const step = GUIDE_STEPS[g.step];
    if (step && step.id === 'taste-goal') saveGuideTaste();
    if (g.step >= GUIDE_STEPS.length - 1) {
      closeGuide('done');
      switchTab('tab-home');
      showToast('준비 끝! 내 취미에 맞는 모임부터 보여드릴게요', 'success');
      return;
    }
    g.step += 1;
    renderGuide();
  }

  function guidePrev() {
    const g = guideState();
    if (g.step <= 0) return;
    g.step -= 1;
    renderGuide();
  }

  /** 직접 쓴 취미를 어느 질문에 더할지 — 지금 단계가 정한다. */
  function guideCurrentPickKind() {
    const step = GUIDE_STEPS[guideState().step] || {};
    return step.body === 'taste-goal' ? 'goal' : 'hobby';
  }

  function bindGuide() {
    el.spotlightNext && el.spotlightNext.addEventListener('click', guideNext);
    el.spotlightPrev && el.spotlightPrev.addEventListener('click', guidePrev);
    el.spotlightSkip && el.spotlightSkip.addEventListener('click', () => {
      closeGuide('skipped');
      showToast('가이드는 내정보 › 가이드 다시 보기에서 언제든 볼 수 있어요', 'info');
    });
    el.spotlightBody && el.spotlightBody.addEventListener('click', (e) => {
      const cat = e.target.closest('[data-guide-cat]');
      if (cat) {
        const g = guideState();
        g.category = cat.dataset.guideCat;
        /* 분야를 고르면 그 분야의 세부 취미 질문으로 넘어간다(한 질문씩). */
        if ((GUIDE_STEPS[g.step] || {}).id === 'taste-category') {
          g.step += 1;
          renderGuide();
          return;
        }
        renderGuide();
        return;
      }
      const pick = e.target.closest('[data-guide-pick]');
      if (pick) { toggleGuidePick(pick.dataset.guidePick, pick.dataset.guideHobby); return; }
      if (e.target.closest('#btn-guide-custom-add')) {
        addGuideCustomHobby(guideCurrentPickKind());
        e.stopPropagation();
      }
    });
    el.spotlightBody && el.spotlightBody.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const input = e.target.closest('#guide-custom-input');
      if (!input) return;
      e.preventDefault();
      addGuideCustomHobby(guideCurrentPickKind());
    });
    /* 가이드가 열려 있는 동안 탭·모달이 뒤에서 움직이지 않게 앞에서 막는다 */
    el.spotlight && el.spotlight.addEventListener('click', (e) => {
      if (e.target === el.spotlight) return;   /* 바깥을 눌러도 닫지 않는다(단계 안내) */
    });
    window.addEventListener('resize', () => { if (guideState().open) placeSpotlight(); });
    el.main && el.main.addEventListener('scroll', () => { if (guideState().open) placeSpotlight(); }, { passive: true });
    document.addEventListener('keydown', (e) => {
      if (!guideState().open) return;
      if (e.key === 'Escape') { closeGuide('skipped'); return; }
      if (e.key === 'ArrowRight') guideNext();
      if (e.key === 'ArrowLeft') guidePrev();
    });
  }
  bindGuide();

  /* ------------------------------------------------------------------
   * 1-C. Sprint 16 — 인스타그램형 24시간 스토리
   * ---------------------------------------------------------------- */
  function storyTimeLabel(iso) {
    return `${Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / (60 * 1000)))}분 전`;
  }

  /** 모임 피드 맨 위 스토리 바 — [올리기] + 사람별 링(멤버당 1개) + [보관함].
   *  Sprint 17 — 인스타그램처럼 한 사람 링을 누르면 그 사람 스토리가 연속 재생된다. */
  function renderStoryBar(grp) {
    if (!el.storyBar || !grp) return;
    const rings = store.getStoryRings(grp.id);
    const archive = store.getStoryArchiveStats();
    const item = (ring) => `
      <button class="story-item ${ring.isMine ? 'is-mine' : ''}" data-story-ring="${ring.authorId}"
              data-story-open="${ring.stories[0].id}" type="button"
              aria-label="${escapeHtml(ring.isMine ? '내' : ring.authorName + '님의')} 스토리 ${ring.count}개 보기">
        <span class="story-ring ${ring.isMine ? 'mine' : ''}">
          <span class="story-avatar" ${ring.photoUrl ? 'data-photo="1"' : `style="background:${ring.gradient || 'linear-gradient(135deg,#10B981,#047857)'}"`}>
            ${ring.photoUrl ? avatarImgHTML(ring.photoUrl, ring.authorName) : escapeHtml(ring.avatarText || ring.authorName.charAt(0))}
          </span>
        </span>
        ${ring.count > 1 ? `<span class="story-count">${ring.count}</span>` : ''}
        <span class="story-name">${ring.isMine ? '내 스토리' : escapeHtml(ring.authorName)}</span>
      </button>`;
    el.storyBar.innerHTML = `
      <div class="story-rail" role="list">
        <button class="story-item story-add" data-story-new="1" type="button" aria-label="스토리 올리기">
          <span class="story-ring add"><span class="story-add-icon" aria-hidden="true">${ic('plus')}</span></span>
          <span class="story-name">스토리 올리기</span>
        </button>
        ${rings.map(item).join('')}
        <button class="story-item story-archive-item" data-story-archive-open="1" type="button"
                aria-label="내 스토리 보관함 열기">
          <span class="story-ring archive"><span class="story-archive-icon" aria-hidden="true">${ic('grid')}</span></span>
          <span class="story-name">보관함</span>
          ${archive.count ? `<span class="story-count">${archive.count}</span>` : ''}
        </button>
      </div>`;
  }

  /* 스토리 올리기 시트 */
  function openStoryComposer() {
    if (!isGroupMode()) return;
    ui.storyPhotoUrl = null;
    ui.storyGroupId = ui.groupSpaceId;
    renderPhotoPreview('story');
    if (el.storyCaption) el.storyCaption.value = '';
    if (el.storyMediaCaption) el.storyMediaCaption.value = '';
    renderStoryMediaPicker();
    updateStoryPublish();
    openModal(el.storyModal);
  }

  /** Sprint 18 — 예시 사진 고르기는 없앴다. 스토리는 앨범·카메라로 올린 사진만 쓴다. */
  function renderStoryMediaPicker() { /* 예시 사진 없음 — 남길 것이 없다 */ }

  function updateStoryPublish() {
    if (!el.storyPublish) return;
    const has = !!ui.storyPhotoUrl || (el.storyCaption && el.storyCaption.value.trim());
    el.storyPublish.disabled = !has;
    el.storyPublish.classList.toggle('ready', has);
  }

  function submitStory() {
    const res = store.addGroupStory({
      groupId: ui.storyGroupId || ui.groupSpaceId,
      photoUrl: ui.storyPhotoUrl,
      caption: el.storyCaption ? el.storyCaption.value : '',
      mediaCaption: el.storyMediaCaption ? el.storyMediaCaption.value : ''
    });
    if (!res.ok) {
      showToast(res.reason === 'empty' ? '사진이나 한 줄을 남겨주세요' : '스토리를 올리지 못했어요', 'warning');
      return;
    }
    closeModal(el.storyModal);
    renderHome();
    showToast('스토리를 올렸어요 · 24시간 뒤에 사라져요');
  }

  /* 스토리 뷰어 (전체화면) — Sprint 17: 사람별 링의 스토리를 연속 재생한다. */
  function openStoryRing(authorId) {
    if (!ui.groupSpaceId) return;
    const ring = store.getStoryRing(ui.groupSpaceId, authorId);
    if (!ring || !ring.count) {
      showToast('이미 사라졌거나 24시간이 지난 스토리예요', 'info');
      renderHome();
      return;
    }
    ui.storyGroupId = ui.groupSpaceId;
    ui.storyRingId = authorId;
    ui.storyArchiveView = false;
    ui.storyId = ring.stories[0].id;
    if (el.storyViewer) {
      el.storyViewer.hidden = false;
      el.storyViewer.classList.add('active');
    }
    renderStoryViewer();
  }

  function openStoryViewer(storyId) {
    if (ui.drawerOpen) closeDrawer({ silent: true });
    const story = store.getStory(storyId);
    if (!story) {
      showToast('이미 사라졌거나 24시간이 지난 스토리예요', 'info');
      renderHome();
      return;
    }
    ui.storyGroupId = story.groupId;
    ui.storyRingId = story.authorId;
    ui.storyArchiveView = false;
    ui.storyId = storyId;
    if (el.storyViewer) {
      el.storyViewer.hidden = false;
      el.storyViewer.classList.add('active');
    }
    renderStoryViewer();
  }

  /** 보관함에서 지난 내 스토리를 다시 본다(24시간이 지나도 볼 수 있다). */
  function openArchivedStory(storyId) {
    const story = store.getMyStoryArchive().find((s) => s.id === storyId);
    if (!story) { showToast('보관함에서 찾지 못했어요', 'warning'); return; }
    closeModal(el.storyArchiveModal);
    ui.storyGroupId = story.groupId;
    ui.storyRingId = null;
    ui.storyArchiveView = true;
    ui.storyId = storyId;
    if (el.storyViewer) {
      el.storyViewer.hidden = false;
      el.storyViewer.classList.add('active');
    }
    renderStoryViewer();
  }

  function currentStoryList() {
    if (ui.storyArchiveView) return store.getMyStoryArchive();
    if (ui.storyRingId && ui.storyGroupId) {
      const ring = store.getStoryRing(ui.storyGroupId, ui.storyRingId);
      return ring ? ring.stories : [];
    }
    return ui.storyGroupId ? store.getGroupStories(ui.storyGroupId) : [];
  }

  function renderStoryViewer() {
    if (!el.storyViewerBody) return;
    const list = currentStoryList();
    const story = list.find((s) => s.id === ui.storyId) || list[0];
    if (!story) { closeStoryViewer(); return; }
    ui.storyId = story.id;
    const idx = list.findIndex((s) => s.id === story.id);
    const media = story.photoUrl
      ? `<img class="story-photo-img" src="${escapeHtml(story.photoUrl)}" alt="스토리 사진" loading="lazy" decoding="async">`
      : `<span class="story-photo-empty" aria-hidden="true"></span>`;
    const mine = story.authorId === store.currentUser.id;
    const rings = (!ui.storyArchiveView && ui.storyGroupId) ? store.getStoryRings(ui.storyGroupId) : [];
    const ringIdx = rings.findIndex((r) => r.authorId === story.authorId);
    el.storyViewerBody.innerHTML = `
      <div class="story-photo">${media}
        ${story.mediaCaption ? `<span class="story-photo-caption">${escapeHtml(story.mediaCaption)}</span>` : ''}
      </div>
      ${story.caption ? `<p class="story-viewer-caption">${escapeHtml(story.caption)}</p>` : ''}
      <p class="story-viewer-note">${storyTimeLabel(story.createdAt)} · 24시간 뒤 자동 삭제
        ${ui.storyArchiveView ? ' · 보관함에서 다시 보는 중' : ''}</p>
      ${!mine ? `<p class="story-reply-hint">답장을 보내면 ${escapeHtml(story.authorName)}님과 1:1 대화가 열려요</p>` : ''}`;
    if (el.storyViewerProgress) {
      el.storyViewerProgress.innerHTML = list.map((s, i) =>
        `<span class="story-seg ${i < idx ? 'done' : ''} ${i === idx ? 'on' : ''}"><span></span></span>`).join('');
    }
    if (el.storyViewerAvatar) {
      el.storyViewerAvatar.innerHTML = story.authorPhotoUrl
        ? avatarImgHTML(story.authorPhotoUrl, story.authorName)
        : escapeHtml(story.authorAvatarText || story.authorName.charAt(0));
      el.storyViewerAvatar.style.background = story.authorPhotoUrl ? 'transparent' : (story.authorGradient || 'linear-gradient(135deg,#10B981,#047857)');
    }
    if (el.storyViewerName) el.storyViewerName.textContent = story.authorName;
    if (el.storyViewerTime) {
      el.storyViewerTime.textContent = `${idx + 1}/${list.length}${ringIdx >= 0 ? ` · 링 ${ringIdx + 1}/${rings.length}` : ''}`;
    }
    if (el.btnStoryDelete) el.btnStoryDelete.hidden = !mine;
    if (el.btnStoryPrev) el.btnStoryPrev.disabled = idx <= 0;
    if (el.btnStoryNext) el.btnStoryNext.disabled = idx >= list.length - 1 && ringIdx >= rings.length - 1;
    if (el.storyReplyForm) el.storyReplyForm.hidden = mine || ui.storyArchiveView;
    scheduleStoryAdvance();
  }

  function scheduleStoryAdvance() {
    clearStoryTimer();
    /* 보관함에서 다시 볼 때는 자동으로 넘기지 않는다(내 기록을 천천히 본다). */
    if (ui.storyArchiveView) return;
    ui.storyTimer = setTimeout(() => storyStep(1), 6000);
  }

  function clearStoryTimer() {
    if (ui.storyTimer) { clearTimeout(ui.storyTimer); ui.storyTimer = null; }
  }

  /** 링 안에서는 다음 스토리로, 링이 끝나면 다음 사람 링으로 넘어간다(인스타그램 결). */
  function storyStep(dir) {
    const list = currentStoryList();
    const idx = list.findIndex((s) => s.id === ui.storyId);
    const next = idx + dir;
    if (next >= 0 && next < list.length) {
      ui.storyId = list[next].id;
      renderStoryViewer();
      return;
    }
    if (ui.storyArchiveView || dir < 0) { if (dir < 0) renderStoryViewer(); else closeStoryViewer(); return; }
    const rings = store.getStoryRings(ui.storyGroupId);
    const ringIdx = rings.findIndex((r) => r.authorId === ui.storyRingId);
    const nextRing = rings[ringIdx + 1];
    if (!nextRing) { closeStoryViewer(); return; }
    ui.storyRingId = nextRing.authorId;
    ui.storyId = nextRing.stories[0].id;
    renderStoryViewer();
  }

  function closeStoryViewer() {
    clearStoryTimer();
    ui.storyId = null;
    ui.storyRingId = null;
    ui.storyArchiveView = false;
    if (el.storyViewer) {
      el.storyViewer.hidden = true;
      el.storyViewer.classList.remove('active');
    }
  }

  function deleteCurrentStory() {
    if (!ui.storyId) return;
    const res = ui.storyArchiveView
      ? store.deleteArchivedStory(ui.storyId) : store.deleteStory(ui.storyId);
    if (!res.ok) { showToast('내 스토리만 지울 수 있어요', 'warning'); return; }
    showToast('스토리를 지웠어요', 'info');
    closeStoryViewer();
    renderHome();
    paintMyAvatars();
  }

  /** 스토리에 짧은 답장 — 그 모임의 1:1 대화로 이어진다. */
  function sendStoryReply() {
    if (!ui.storyId || !el.storyReplyInput) return;
    const text = el.storyReplyInput.value.trim();
    if (!text) { showToast('답장을 한 줄 적어주세요', 'warning'); return; }
    const res = store.replyToStory(ui.storyId, text);
    if (!res.ok) {
      showToast(res.reason === 'dm_disabled'
        ? '이 모임은 그룹장이 1:1 대화를 꺼두었어요'
        : '답장을 보내지 못했어요', 'warning');
      return;
    }
    el.storyReplyInput.value = '';
    clearStoryTimer();
    showToast(`${res.partnerName}님에게 답장을 보냈어요`, 'success',
      { label: '대화 보기', onClick: () => { closeStoryViewer(); openChatRoom(res.room.id); } });
  }

  /* ------------------------ Sprint 17 — 내 스토리 보관함 */
  function openStoryArchive() {
    renderStoryArchive();
    openModal(el.storyArchiveModal);
  }

  function renderStoryArchive() {
    if (!el.storyArchiveGrid) return;
    const list = store.getMyStoryArchive();
    if (!list.length) {
      el.storyArchiveGrid.innerHTML = `
        <div class="archive-empty">
          ${emptyArt('explore')}
          <p class="empty-title">보관함이 비어 있어요</p>
          <p class="empty-desc">스토리가 24시간을 지나면 지우지 않고 이곳에 모아 둡니다.</p>
        </div>`;
      return;
    }
    el.storyArchiveGrid.innerHTML = list.map((s) => `
      <article class="archive-card" data-archive-id="${s.id}">
        <button class="archive-thumb" data-archive-open="${s.id}" type="button"
                aria-label="${escapeHtml(s.caption || '내 스토리')} 다시 보기">
          ${s.photoUrl
            ? `<img class="story-photo-img" src="${escapeHtml(s.photoUrl)}" alt="보관한 스토리 사진" loading="lazy" decoding="async">`
            : `<span class="archive-text">${escapeHtml(s.caption || '스토리')}</span>`}
        </button>
        <div class="archive-meta">
          <span class="archive-group">${escapeHtml(s.groupName)}</span>
          <span class="archive-date">${formatShortDate(s.createdAt)}</span>
        </div>
        <p class="archive-caption">${escapeHtml(s.caption || s.mediaCaption || '')}</p>
        <button class="archive-del" data-archive-del="${s.id}" type="button">지우기</button>
      </article>`).join('');
  }

  function formatShortDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  /* ------------------------------------------------------------------
   * 1-D. Sprint 16 — 그룹게시판 (공지 · 일정 · 자유/후기 글)
   * ---------------------------------------------------------------- */
  function renderBoard() {
    if (!isGroupMode()) { renderHome(); return; }
    const grp = homeGroup();
    if (!grp) { renderGallery(); return; }
    ui.feedGroupId = grp.id;
    if (el.boardSpaceName) el.boardSpaceName.textContent = grp.name;
    if (el.boardSpaceMeta) el.boardSpaceMeta.textContent = '공지 · 일정 · 자유/후기 글';
    renderHomeNoticeBar(grp);
    renderHomeEvents(grp);
    renderBoardNotices(grp);
    renderBoardPosts(grp);
    if (el.navHomeBadge) {
      const upcoming = store.getUpcomingGroupEvents(grp.id, 9).length;
      el.navHomeBadge.textContent = String(upcoming);
      el.navHomeBadge.classList.toggle('hide', upcoming === 0);
    }
  }

  /** 게시판의 공지 목록 — 고정 → 최신 순. Sprint 17: 읽음 수 표시 + 지난 공지 접기. */
  function renderBoardNotices(grp) {
    if (!el.boardNoticeList) return;
    const groups = store.getGroupNoticeGroups(grp.id, { recentCount: 1 });
    const rows = groups.recent.concat(ui.boardNoticeExpanded ? groups.past : []);
    const rowHTML = (n) => {
      const role = n.authorRole === 'deputy' ? '부방장' : (n.authorRole === 'leader' ? '그룹장' : '멤버');
      const read = store.getNoticeReadState(n.id) || { readCount: 0, total: 0, iRead: false };
      return `
        <article class="board-notice ${n.pinned ? 'is-pinned' : ''} ${read.iRead ? 'is-read' : ''}"
                 data-notice-read="${n.id}" role="button" tabindex="0"
                 aria-label="${escapeHtml(n.text.slice(0, 20))}… 공지 읽음 ${read.readCount}명 보기">
          <div class="board-notice-top">
            ${n.pinned ? '<span class="board-notice-pin">고정</span>' : ''}
            <span class="board-notice-who">${escapeHtml(n.authorName)} ${role}</span>
            <span class="board-notice-time" data-created="${n.at}">${timeAgo(n.at)}</span>
          </div>
          <p class="board-notice-text">${escapeHtml(n.text)}</p>
          <div class="board-notice-foot">
            <span class="notice-read-chip ${read.iRead ? 'mine' : ''}">읽음 ${read.readCount}/${read.total}${read.iRead ? ' · 나 읽음' : ''}</span>
            <span class="notice-read-hint">누가 읽었는지 보기</span>
          </div>
        </article>`;
    };
    if (!rows.length) {
      el.boardNoticeList.innerHTML = `<p class="board-empty">${groups.pinned
        ? '고정 공지 외에 다른 공지는 아직 없어요.'
        : '아직 공지가 없어요. 그룹장과 부방장이 공지를 남길 수 있어요.'}</p>`;
    } else {
      el.boardNoticeList.innerHTML = rows.map(rowHTML).join('');
    }
    if (el.btnNoticeMore) {
      const hasPast = groups.past.length > 0;
      el.btnNoticeMore.hidden = !hasPast;
      el.btnNoticeMore.textContent = ui.boardNoticeExpanded
        ? `지난 공지 접기 (${groups.past.length})` : `지난 공지 더 보기 (${groups.past.length})`;
      el.btnNoticeMore.setAttribute('aria-expanded', String(ui.boardNoticeExpanded));
    }
  }

  /** 공지 읽음 상태 시트 — 읽은 사람 명단(알림 없이 기록만). */
  function openNoticeRead(noticeId) {
    const notice = store.getGroupNotice(noticeId);
    if (!notice) return;
    ui.noticeReadId = noticeId;
    if (store.isGroupJoined(notice.groupId)) store.markNoticeRead(noticeId);
    const read = store.getNoticeReadState(noticeId);
    if (el.noticeReadSub) {
      el.noticeReadSub.textContent = read
        ? `멤버 ${read.total}명 중 ${read.readCount}명이 읽었어요 (${read.percent}%) · 읽음 표시는 알림을 만들지 않아요`
        : '읽은 사람을 볼 수 있어요';
    }
    if (el.noticeReadList) {
      el.noticeReadList.innerHTML = `
        <p class="notice-read-quote">${escapeHtml(notice.text)}</p>
        <div class="notice-read-bar" aria-hidden="true"><span style="width:${read ? read.percent : 0}%"></span></div>
        <h4 class="notice-read-title">읽은 사람 ${read ? read.readers.length : 0}</h4>
        <div class="notice-read-people">
          ${read && read.readers.length ? read.readers.map((r) => `
            <span class="notice-reader">
              <span class="notice-reader-avatar" style="background:${r.gradient || '#10B981'}">${r.photoUrl ? avatarImgHTML(r.photoUrl, r.name) : escapeHtml(r.avatarText || r.name.charAt(0))}</span>
              <span class="notice-reader-name">${escapeHtml(r.name)}</span>
            </span>`).join('')
            : '<p class="board-empty">아직 읽은 사람이 없어요.</p>'}
        </div>
        ${read && read.unread.length ? `<h4 class="notice-read-title">아직 안 읽은 사람 ${read.unread.length}</h4>
          <p class="notice-read-unread">${read.unread.slice(0, 12).map((m) => escapeHtml(m.name)).join(' · ')}${read.unread.length > 12 ? ' …' : ''}</p>` : ''}`;
    }
    openModal(el.noticeReadModal);
    if (ui.activeTab === 'tab-board' && ui.groupSpaceId) renderBoardNotices(store.getGroup(ui.groupSpaceId));
  }

  /** 자유·후기 게시판 — 모임 피드의 글을 글로만 간추린 목록(말머리·후기로 거른다). */
  function renderBoardPosts(grp) {
    if (!el.boardPostList) return;
    const all = store.getGroupPhotoPosts(grp.id);
    const tags = store.getGroupPhotoTags(grp.id);
    const reviews = store.getGroupReviewPosts(grp.id);
    if (el.boardFilterChips) {
      el.boardFilterChips.innerHTML = [
        `<button class="board-chip ${ui.boardTag ? '' : 'active'}" data-board-tag="" aria-pressed="${!ui.boardTag}" type="button">전체 ${all.length}</button>`,
        `<button class="board-chip review ${ui.boardTag === '후기' ? 'active' : ''}" data-board-tag="후기" aria-pressed="${ui.boardTag === '후기'}" type="button">후기 모아보기 ${reviews.length}</button>`,
        ...tags.filter((t) => !(t.tag === '후기' && reviews.length)).map((t) => `<button class="board-chip ${ui.boardTag === t.tag ? 'active' : ''}" data-board-tag="${escapeHtml(t.tag)}" aria-pressed="${ui.boardTag === t.tag}" type="button">#${escapeHtml(t.tag)} ${t.count}</button>`)
      ].join('');
    }
    const list = ui.boardTag === '후기' ? reviews
      : (ui.boardTag ? all.filter((p) => p.tag === ui.boardTag) : all);
    if (el.boardPostCount) el.boardPostCount.textContent = String(list.length);
    if (!list.length) {
      el.boardPostList.innerHTML = ui.boardTag === '후기'
        ? '<p class="board-empty">아직 후기가 없어요. 다녀온 모임 후기를 #후기로 남겨보세요.</p>'
        : '<p class="board-empty">아직 글이 없어요. [글쓰기]로 첫 글을 남겨보세요.</p>';
      return;
    }
    el.boardPostList.innerHTML = list.map((p) => `
      <article class="board-post" data-board-post="${p.id}" role="button" tabindex="0" aria-label="${escapeHtml(firstSentence(p.caption) || '모임 글')} 열기">
        <div class="board-post-main">
          <div class="board-post-head">
            ${p.tag ? `<span class="board-post-tag">#${escapeHtml(p.tag)}</span>` : ''}
            <span class="board-post-name">${escapeHtml(p.authorName)}</span>
            <span class="board-post-time" data-created="${p.createdAt}">${timeAgo(p.createdAt)}</span>
          </div>
          <h4 class="board-post-title">${escapeHtml(firstSentence(p.caption) || '(사진만 올린 글)')}</h4>
          <p class="board-post-meta">좋아요 ${p.likes || 0} · 댓글 ${(p.comments || []).length}</p>
        </div>
        ${p.photoUrl ? `<span class="board-post-thumb"><img src="${escapeHtml(p.photoUrl)}" alt="" loading="lazy" decoding="async"></span>` : ''}
      </article>`).join('');
  }

  /* ------------------------------------------------------------------
   * 1-D-2. Sprint 17 — 갤러리 표지 고르기 · 탐색 한 줄 요약
   * ---------------------------------------------------------------- */
  function openCoverPicker(groupId) {
    if (!store.isGroupLeader(groupId)) {
      showToast('카드 표지는 그룹장만 고를 수 있어요', 'warning');
      return;
    }
    const cover = store.getGroupCover(groupId);
    if (!cover) return;
    ui.coverGroupId = groupId;
    ui.coverDraft = (cover.photos || []).slice(0, 2);
    renderCoverGrid();
    openModal(el.coverModal);
  }

  /** Sprint 18 — 표지는 이 모임에 올라온 **실제 사진** 중에서 고른다(예시 그림 없음). */
  function renderCoverGrid() {
    if (!el.coverGrid) return;
    const cover = store.getGroupCover(ui.coverGroupId);
    if (!cover) return;
    if (!cover.options.length) {
      el.coverGrid.innerHTML = '<p class="cover-empty">이 모임에 올린 사진이 아직 없어요.<br>사진을 한 장 올리면 그것으로 표지를 만들 수 있어요.</p>';
      return;
    }
    el.coverGrid.innerHTML = cover.options.map((opt) => {
      const url = opt.photoUrl;
      const idx = ui.coverDraft.indexOf(url);
      return `
        <button class="cover-option ${idx >= 0 ? 'on' : ''}" data-cover-photo="${escapeHtml(url)}" type="button"
                aria-pressed="${idx >= 0}" aria-label="표지 사진 ${idx >= 0 ? (idx + 1) + '번째로 선택됨' : '선택'}">
          <span class="cover-thumb"><img src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async"></span>
          ${idx >= 0 ? `<span class="cover-order">${idx + 1}</span>` : ''}
        </button>`;
    }).join('');
  }

  function toggleCoverPreset(url) {
    const i = ui.coverDraft.indexOf(url);
    if (i >= 0) ui.coverDraft.splice(i, 1);
    else {
      if (ui.coverDraft.length >= 2) ui.coverDraft.shift();
      ui.coverDraft.push(url);
    }
    renderCoverGrid();
  }

  function saveCover() {
    if (!ui.coverGroupId) return;
    const res = store.setGroupCoverPhotos(ui.coverGroupId, ui.coverDraft);
    if (!res.ok) {
      showToast(res.reason === 'empty' ? '표지 사진을 한 장 이상 골라주세요' : '표지를 저장하지 못했어요', 'warning');
      return;
    }
    closeModal(el.coverModal);
    renderGallery();
    if (store.isGroupJoined(ui.coverGroupId) && isGroupMode() && ui.groupSpaceId === ui.coverGroupId) {
      renderHomeHero(homeGroup());
    }
    showToast('모임 카드 표지를 바꿨어요');
  }

  /** 탐색 조건 한 줄 요약 — 취미 · 나이 · 거리 · 지역. */
  function renderExploreSummary() {
    if (!el.exploreSummary) return;
    const s = store.getExploreSummary();
    el.exploreSummary.textContent = s.text;
    el.exploreSummary.classList.toggle('is-filtered', s.activeCount > 0);
    el.exploreSummary.setAttribute('aria-label', `지금 탐색 조건 · ${s.text}`);
  }

  /** 모임 안 내정보 상단 한 줄 — 어느 모임의 내정보인지. */
  function renderProfileGroupContext() {
    if (!el.profileGroupContext) return;
    const on = isGroupMode();
    el.profileGroupContext.hidden = !on;
    if (on && el.profileGroupContextName) {
      const grp = homeGroup();
      el.profileGroupContextName.textContent = grp ? grp.name : '모임';
    }
  }

  /* ------------------------------------------------------------------
   * 1-E. Sprint 16 — 매칭 없이 바로 쪽지(디엠)
   * ---------------------------------------------------------------- */
  function openDmComposer(profileId) {
    const profile = store.getMatchProfile(profileId);
    if (!profile) { showToast('프로필을 찾지 못했어요', 'warning'); return; }
    ui.dmTargetId = profileId;
    if (el.dmTarget) el.dmTarget.textContent = `${profile.nickname}님에게 쪽지`;
    if (el.dmMessage) el.dmMessage.value = '';
    if (el.dmCaptionCount) el.dmCaptionCount.textContent = '0';
    openModal(el.dmComposeModal);
  }

  function sendDm() {
    if (!ui.dmTargetId) return;
    const text = el.dmMessage ? el.dmMessage.value : '';
    const targetId = ui.dmTargetId;
    const res = store.startDirectMessage(targetId, text);
    if (!res.ok) { showToast('쪽지를 보내지 못했어요', 'warning'); return; }
    const name = res.room ? res.room.partnerName : '상대';
    closeModal(el.dmComposeModal);
    if (el.personDetailModal && el.personDetailModal.classList.contains('active')) closeModal(el.personDetailModal);
    ui.dmTargetId = null;
    ui.highlightRoomId = res.room ? res.room.id : null;
    /* Sprint 17 — 쪽지를 보낸 직후 상대 프로필로 바로 갈 수 있게 기억한다. */
    ui.dmSent = { partnerId: targetId, name, roomId: res.room ? res.room.id : null };
    /* 그룹 안에 있었어도 쪽지는 '전체 디엠함'에 곧바로 보인다. */
    ui.groupSpaceId = null;
    syncNavMode();
    renderChatRooms();
    updateBadges();
    switchTab('tab-chat');
    showToast(`${name}님에게 쪽지를 보냈어요 · 전체 디엠함에 있어요`);
  }

  /** Sprint 17 — 방금 보낸 쪽지 띠: 상대 프로필/대화로 바로 이동. */
  function renderDmSentBanner() {
    if (!el.dmSentBanner) return;
    if (!ui.dmSent || isGroupMode()) {
      el.dmSentBanner.hidden = true;
      el.dmSentBanner.innerHTML = '';
      return;
    }
    const { partnerId, name, roomId } = ui.dmSent;
    el.dmSentBanner.hidden = false;
    el.dmSentBanner.innerHTML = `
      <span class="dmsb-text"><b>${escapeHtml(name)}</b>님에게 쪽지를 보냈어요</span>
      <span class="dmsb-actions">
        ${partnerId ? `<button class="dmsb-btn" data-dm-profile="${escapeHtml(partnerId)}" type="button">프로필 보기</button>` : ''}
        ${roomId ? `<button class="dmsb-btn ghost" data-dm-open-room="${escapeHtml(roomId)}" type="button">대화 보기</button>` : ''}
        <button class="dmsb-close" data-dm-sent-close="1" type="button" aria-label="안내 닫기">&times;</button>
      </span>`;
  }

  function renderHomeHero(grp) {
    if (!el.homeHero) return;
    const info = store.getHomeGroups().find((g) => g.id === grp.id) || {};
    const next = info.nextEvent;
    const chat = info.chat || { count: 0 };
    el.homeHero.innerHTML = `
      <div class="home-hero-cover${info.photoCount ? '' : ' is-plain'}"${info.photoCount ? ` style="background:${grp.coverGradient || 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'}"` : ''}>
        <span class="home-hero-emoji" aria-hidden="true">${ic(grp.icon)}</span>
        <span class="home-hero-shade" aria-hidden="true"></span>
        <div class="home-hero-text">
          <span class="home-hero-kicker">${ic(grp.icon)} ${escapeHtml(grp.categoryName)} · ${escapeHtml(grp.location)}</span>
          <h2 class="home-hero-name">${escapeHtml(grp.name)}</h2>
          <p class="home-hero-meta">멤버 ${grp.memberCount}명 · 사진 ${info.photoCount || 0}장 · 대화 ${chat.count}개</p>
          <p class="home-hero-next">${next
            ? `<span class="home-hero-next-dot" aria-hidden="true"></span>${escapeHtml(next.title)} · ${escapeHtml(next.whenLabel)} · 참석 ${next.yes}명`
            : '<span class="home-hero-next-dot quiet" aria-hidden="true"></span>이번 주 약속은 아직 없어요'}</p>
        </div>
      </div>
      <div class="home-hero-actions">
        <button class="home-hero-btn primary" data-home-chat="${grp.id}" type="button">단체 채팅</button>
        <button class="home-hero-btn" data-home-write="${grp.id}" type="button">사진 올리기</button>
        <button class="home-hero-btn" data-home-members="${grp.id}" type="button">멤버</button>
      </div>`;
  }

  /** 모임 상단 공지 바 — 고정 공지를 한 줄로. 누르면 공지 전체·작성 시트가 열린다. */
  function renderHomeNoticeBar(grp) {
    if (!el.homeNoticeBar) return;
    const perm = store.getGroupNoticePermission(grp.id);
    const pinned = store.getPinnedGroupNotice(grp.id);
    const total = store.getGroupNotices(grp.id).length;
    if (!pinned) {
      el.homeNoticeBar.innerHTML = `
        <button class="home-notice-line is-empty" data-notice-open="${grp.id}" type="button">
          <span class="notice-pin-body">
            <span class="notice-pin-text">아직 공지가 없어요${perm.canManage ? ' · 첫 공지를 남겨보세요' : ''}</span>
          </span>
          <span class="notice-pin-more">${perm.canManage ? '쓰기' : '전체'} ›</span>
        </button>`;
      return;
    }
    const roleLabel = pinned.authorRole === 'deputy' ? '부방장'
      : (pinned.authorRole === 'leader' ? '그룹장' : '멤버');
    el.homeNoticeBar.innerHTML = `
      <button class="home-notice-line" data-notice-open="${grp.id}" type="button"
              aria-label="${grp.name} 공지 전체 보기">
        <span class="notice-pin-body">
          <span class="notice-pin-label">${pinned.pinned ? '고정 공지' : '공지'} · ${escapeHtml(pinned.authorName)} ${roleLabel}</span>
          <span class="notice-pin-text">${escapeHtml(pinned.text)}</span>
        </span>
        <span class="notice-pin-more">${total > 1 ? `${total}개` : '전체'} ›</span>
      </button>`;
  }

  /** 참석자 아바타 겹침 — 최대 4명 + 외 N명. */
  function eventAvatarStack(attendees, total) {
    const shown = attendees.slice(0, 4);
    const rest = Math.max(0, total - shown.length);
    return `${shown.map((a) => `<span class="event-avatar" style="background:${a.gradient}">${escapeHtml(a.avatarText || a.name.charAt(0))}</span>`).join('')}
      ${rest > 0 ? `<span class="event-avatar more">+${rest}</span>` : ''}`;
  }

  function eventCardHTML(ev) {
    const kind = ev.kindMeta;
    const rsvps = store.getGroupEventRsvpOptions();
    const full = !!ev.full;
    const myMeta = ev.myRsvp ? rsvps.find((r) => r.id === ev.myRsvp) : null;
    const myBadge = ev.myRsvp === 'maybe' && ev.myWaitOrder
      ? `대기 ${ev.myWaitOrder}순위`
      : (myMeta ? `${ic(myMeta.icon)} ${myMeta.label}` : '');
    const yesLabel = full && ev.myRsvp !== 'yes';
    const labelOf = (r) => (r.id === 'yes' && yesLabel ? '대기 신청' : r.label);
    const iconOf = (r) => (r.id === 'yes' && yesLabel ? 'hourglass' : '');
    return `
      <article class="event-card tone-${kind.tone} ${ev.myRsvp ? 'is-joined' : ''} ${ev.past ? 'is-past' : ''} ${full ? 'is-full' : ''}"
               data-event-id="${ev.id}" aria-label="${escapeHtml(kind.label)} ${escapeHtml(ev.title)}">
        <div class="event-top">
          <span class="event-kind">${escapeHtml(kind.label)}</span>
          <span class="event-when">${escapeHtml(ev.whenLabel)}</span>
          ${ev.past ? '<span class="event-past">지난 일정</span>'
            : (myBadge ? `<span class="event-my rs-${ev.myRsvp}">${myBadge}</span>` : '')}
        </div>
        <button class="event-open" data-event-open="${ev.id}" type="button"
                aria-label="${escapeHtml(ev.title)} 일정 상세 열기">
          <h4 class="event-title">${escapeHtml(ev.title)}</h4>
          ${ev.place ? `<p class="event-place">${escapeHtml(ev.place)}</p>` : ''}
          ${ev.note ? `<p class="event-note">${escapeHtml(ev.note)}</p>` : ''}
        </button>
        <div class="event-attend">
          <span class="event-avatars">${eventAvatarStack(ev.attendees, ev.yes)}</span>
          <span class="event-counts">참석 ${ev.yes}${ev.capacity ? `/${ev.capacity}` : ''} · 대기 ${ev.maybe}${full ? ' · <b class="event-full-badge">마감</b>' : ''}</span>
        </div>
        ${ev.past ? '' : `
        <div class="event-rsvp" role="group" aria-label="${escapeHtml(ev.title)} 참석 여부">
          ${rsvps.map((r) => `
            <button class="rsvp-btn rs-${r.id} ${ev.myRsvp === r.id ? 'active' : ''}"
                    data-rsvp-status="${r.id}" data-rsvp-event="${ev.id}"
                    aria-pressed="${ev.myRsvp === r.id}" type="button">
              ${iconOf(r) ? `<span class="rsvp-icon" aria-hidden="true">${ic(iconOf(r))}</span>` : ''}${labelOf(r)}
            </button>`).join('')}
        </div>`}
      </article>`;
  }

  function renderHomeEvents(grp) {
    if (!el.homeEvents) return;
    const all = store.getGroupEvents(grp.id);
    const upcoming = all.filter((e) => !e.past);
    const past = all.filter((e) => e.past);
    if (!all.length) {
      el.homeEvents.innerHTML = `
        <div class="event-empty">
          ${emptyArt('feed')}
          <p class="empty-title">이번 주 약속이 없어요</p>
          <p class="empty-desc">술모임이나 운동 번개를 올리면 멤버들이 참석을 눌러 답해요.</p>
          <div class="empty-actions">
            <button class="btn-primary" data-home-event-new="${grp.id}" type="button">일정 만들기</button>
          </div>
        </div>`;
      return;
    }
    const showing = ui.pastEventsOpen ? upcoming.concat(past) : upcoming;
    let html = showing.map(eventCardHTML).join('');
    if (!upcoming.length) {
      html = `<p class="event-strip-empty">다가오는 약속은 아직 없어요 · 지난 일정만 있어요</p>` + html;
    }
    if (past.length) {
      html += `
        <button class="event-past-toggle" data-past-events="1" type="button"
                aria-expanded="${ui.pastEventsOpen}">
          ${ui.pastEventsOpen ? '지난 일정 접기' : `지난 일정 ${past.length}개 보기`}
        </button>`;
    }
    el.homeEvents.innerHTML = html;
  }

  function homePhotoTileHTML(post) {
    const media = post.photoUrl
      ? `<img class="home-photo-img" src="${escapeHtml(post.photoUrl)}" alt="모임 사진" loading="lazy" decoding="async">`
      : `<span class="home-photo-empty" aria-hidden="true">${escapeHtml(firstSentence(post.caption) || '글')}</span>`;
    return `
      <button class="home-photo" data-home-post="${post.id}" type="button"
              aria-label="${escapeHtml(post.authorName)}님의 사진 · 좋아요 ${post.likes}">
        ${media}
        <span class="home-photo-veil" aria-hidden="true"></span>
        ${post.tag ? `<span class="home-photo-tag">#${escapeHtml(post.tag)}</span>` : ''}
        <span class="home-photo-foot">
          <span class="home-photo-like"><span aria-hidden="true">${ic('heart', { filled: true })}</span> ${fmtCount(post.likes)}</span>
          ${post.comments.length ? `<span class="home-photo-comment">댓글 ${post.comments.length}</span>` : ''}
        </span>
        ${post.authorId === store.currentUser.id ? '<span class="home-photo-mine">나</span>' : ''}
      </button>`;
  }

  function renderHomeFeed(grp) {
    if (!el.homeViewSeg || !el.homePhotoGrid) return;
    /* Sprint 15 — 기본은 '피드'(아래로 스크롤하는 인스타형 카드). 사진 격자는 보조 보기. */
    const views = [
      { id: 'feed', label: '피드' },
      { id: 'grid', label: '격자' },
      { id: 'popular', label: '인기' }
    ];
    el.homeViewSeg.innerHTML = views.map((v) => `
      <button class="home-view-btn ${ui.homeView === v.id ? 'active' : ''}" data-home-view="${v.id}"
              aria-pressed="${ui.homeView === v.id}" type="button">${v.label}</button>`).join('');

    const tags = store.getGroupPhotoTags(grp.id);
    const tagOn = ui.homeView === 'grid' && tags.length;
    if (el.homeTagChips) {
      el.homeTagChips.hidden = !tagOn;
      el.homeTagChips.innerHTML = !tagOn ? '' : `
        <button class="home-tag ${ui.homeTag ? '' : 'active'}" data-home-tag="" aria-pressed="${!ui.homeTag}" type="button">전체 ${store.getGroupPhotoPosts(grp.id).length}</button>
        ${tags.map((t) => `<button class="home-tag ${ui.homeTag === t.tag ? 'active' : ''}" data-home-tag="${escapeHtml(t.tag)}"
                aria-pressed="${ui.homeTag === t.tag}" type="button">#${escapeHtml(t.tag)} ${t.count}</button>`).join('')}`;
    }

    if (ui.homeView === 'grid') {
      const posts = store.getGroupPhotoPosts(grp.id, ui.homeTag);
      if (el.homePhotoCount) el.homePhotoCount.textContent = String(posts.length);
      el.homePhotoGrid.hidden = false;
      if (el.feedList) el.feedList.hidden = true;
      el.homePhotoGrid.innerHTML = posts.length
        ? posts.map(homePhotoTileHTML).join('') + `
          <button class="home-photo home-photo-add" data-home-write="${grp.id}" type="button" aria-label="사진 올리기">
            <span class="home-photo-add-icon" aria-hidden="true">${ic('plus')}</span>
            <span class="home-photo-add-text">사진 올리기</span>
          </button>`
        : `<div class="home-photo-empty">
             ${emptyArt('feed')}
             <p class="empty-title">아직 사진이 없어요</p>
             <p class="empty-desc">첫 사진을 올리면 멤버들이 좋아요와 댓글로 답해요.</p>
             <div class="empty-actions"><button class="btn-primary" data-home-write="${grp.id}" type="button">첫 사진 올리기</button></div>
           </div>`;
      return;
    }

    /* 피드/인기 — 인스타그램처럼 한 장씩 큰 카드로 이어지는 스크롤 피드. */
    el.homePhotoGrid.hidden = true;
    if (el.feedList) el.feedList.hidden = false;
    ui.feedFilter = ui.homeView === 'popular' ? 'popular' : 'my';
    ui.feedGroupId = ui.homeView === 'popular' ? null : grp.id;
    if (el.homePhotoCount) el.homePhotoCount.textContent = String(store.getGroupPhotoPosts(grp.id).length);
    renderFeed();
  }

  function renderHomeChatPreview(grp) {
    if (!el.homeChatPreview) return;
    const preview = store.getGroupChatPreview(grp.id);
    const last = preview.lastMessage
      ? `${preview.lastAuthor}: ${preview.lastMessage}`
      : '아직 대화가 없어요 · 첫 인사를 남겨보세요';
    el.homeChatPreview.innerHTML = `
      <button class="home-chat-open" data-home-chat="${grp.id}" type="button">
        <span class="home-chat-icon" aria-hidden="true">${ic(grp.icon)}</span>
        <span class="home-chat-body">
          <span class="home-chat-title">${escapeHtml(grp.name)} 단체방</span>
          <span class="home-chat-last">${escapeHtml(last)}</span>
        </span>
        <span class="home-chat-meta">
          <span class="home-chat-count">${preview.count}</span>
          <span class="home-chat-go" aria-hidden="true">›</span>
        </span>
      </button>`;
  }

  /* -------------------------------------------------- 모임 단체 채팅 (전체 화면) */
  const GROUP_CHAT_REPLIES = [
    '좋아요! 저도 갈게요',
    'ㅋㅋㅋ 완전 좋아요',
    '저는 조금 늦어도 될까요?',
    '그때 봬요!',
    '사진 올려주셔서 감사해요',
    '오늘 와드 진짜 빡셌는데 다들 수고하셨어요'
  ];

  function openGroupChat(groupId) {
    if (ui.drawerOpen) closeDrawer({ silent: true });
    const grp = store.getGroup(groupId);
    if (!grp || !el.groupChatModal) return;
    if (!store.isGroupJoined(groupId)) {
      showToast('가입한 모임만 단체 채팅에 들어갈 수 있어요', 'warning');
      return;
    }
    ui.openGroupChatId = groupId;
    el.groupChatAvatar.innerHTML = ic(grp.icon);
    el.groupChatAvatar.style.background = grp.coverGradient || 'linear-gradient(135deg,#ECFDF5,#D1FAE5)';
    el.groupChatName.textContent = grp.name;
    el.groupChatSub.textContent = `멤버 ${grp.memberCount}명 · 단체 채팅`;
    if (el.groupChatInput) el.groupChatInput.value = '';
    el.groupChatModal.hidden = false;
    document.body.classList.add('modal-open');
    renderGroupChatMessages();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(6);
    setTimeout(() => el.groupChatInput && el.groupChatInput.focus({ preventScroll: true }), 120);
  }

  function closeGroupChat() {
    if (!el.groupChatModal || el.groupChatModal.hidden) return;
    clearTimeout(ui.groupChatTimer);
    ui.groupChatTimer = null;
    ui.openGroupChatId = null;
    el.groupChatModal.hidden = true;
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.classList.remove('modal-open');
    }
    if (ui.activeTab === 'tab-home') renderHome();
    else renderChatRooms();
  }

  function renderGroupChatMessages() {
    if (!el.groupChatMessages) return;
    const grp = store.getGroup(ui.openGroupChatId);
    if (!grp) { el.groupChatMessages.innerHTML = ''; return; }
    const messages = store.getGroupChatMessages(grp.id);
    if (!messages.length) {
      el.groupChatMessages.innerHTML = `
        <div class="chat-day"><span>오늘</span></div>
        <p class="post-comment-empty">아직 대화가 없어요. 모임원에게 첫 인사를 남겨보세요.</p>`;
      return;
    }
    let lastDay = null;
    el.groupChatMessages.innerHTML = messages.map((msg) => {
      const day = chatDayLabel(msg.at);
      const divider = day !== lastDay ? `<div class="chat-day"><span>${day}</span></div>` : '';
      lastDay = day;
      const mine = msg.from === 'me';
      return `${divider}
        <div class="chat-msg group-chat-msg ${mine ? 'mine' : 'them'}">
          ${mine ? '' : `<span class="chat-msg-avatar" style="background:${msg.authorGradient || 'linear-gradient(135deg,#10B981,#047857)'}">${escapeHtml(msg.authorAvatarText || msg.authorName.charAt(0))}</span>`}
          <div class="chat-bubble-wrap">
            ${mine ? '' : `<span class="chat-sender">${escapeHtml(msg.authorName)}</span>`}
            <div class="chat-bubble">${escapeHtml(msg.text)}</div>
          </div>
          <span class="chat-msg-foot"><span>${chatTimeLabel(msg.at)}</span></span>
        </div>`;
    }).join('');
    el.groupChatMessages.scrollTop = el.groupChatMessages.scrollHeight;
  }

  function sendGroupChatMessage() {
    if (!ui.openGroupChatId || !el.groupChatInput) return;
    const text = el.groupChatInput.value;
    const res = store.sendGroupChatMessage(ui.openGroupChatId, text);
    if (!res.ok) {
      if (res.reason === 'empty') showToast('메시지를 입력해 주세요', 'warning');
      return;
    }
    el.groupChatInput.value = '';
    renderGroupChatMessages();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
    /* 시연용: 모임원 한 명이 잠시 뒤 답한다(알림은 만들지 않는다). */
    const groupId = ui.openGroupChatId;
    const roster = store.getGroupRoster(groupId).members.filter((m) => !m.isMe);
    if (roster.length && Math.random() < 0.8) {
      clearTimeout(ui.groupChatTimer);
      ui.groupChatTimer = setTimeout(() => {
        if (ui.openGroupChatId !== groupId) return;
        const speaker = roster[Math.floor(Math.random() * Math.min(4, roster.length))];
        store.receiveGroupChatMessage(groupId, speaker.id,
          GROUP_CHAT_REPLIES[Math.floor(Math.random() * GROUP_CHAT_REPLIES.length)]);
        renderGroupChatMessages();
        if (ui.activeTab === 'tab-home') renderHomeChatPreview(store.getGroup(groupId));
      }, 1500);
    }
  }

  /** 채팅 탭의 '모임 단체방' 목록 — 가입한 모임 전부, 최근 대화 순. */
  function renderChatGroupRooms() {
    if (!el.chatGroupRooms) return;
    /* Sprint 16 — 모임 안에서는 그 모임 방만, 바깥 '전체 디엠함'에서는 모든 모임 방 */
    const scope = isGroupMode() ? ui.groupSpaceId : null;
    const groups = store.getHomeGroups()
      .filter((it) => !scope || it.group.id === scope)
      .slice().sort((a, b) => {
        const ta = a.chat.lastAt ? new Date(a.chat.lastAt).getTime() : 0;
        const tb = b.chat.lastAt ? new Date(b.chat.lastAt).getTime() : 0;
        return tb - ta;
      });
    if (el.chatGroupCount) el.chatGroupCount.textContent = `${groups.length}곳`;
    const shownGroups = ui.dmUnreadOnly ? groups.filter((g) => (g.chat.unread || 0) > 0) : groups;
    el.chatGroupRooms.innerHTML = shownGroups.map(({ group, chat, nextEvent }) => `
      <article class="chat-group-item" data-home-chat="${group.id}" role="button" tabindex="0"
               aria-label="${escapeHtml(group.name)} 단체 채팅방 열기">
        <span class="chat-group-emoji" style="background:${group.coverGradient || 'linear-gradient(135deg,#ECFDF5,#D1FAE5)'}">${escapeHtml((group.name || '?').charAt(0))}</span>
        <span class="chat-group-body">
          <span class="chat-group-name-row">
            <span class="chat-group-name">${escapeHtml(group.name)}</span>
            <span class="chat-group-members">멤버 ${group.memberCount}</span>
          </span>
          <span class="chat-group-last">${chat.lastMessage
            ? `${escapeHtml(chat.lastAuthor)}: ${escapeHtml(chat.lastMessage)}`
            : '아직 대화가 없어요'}</span>
          ${nextEvent ? `<span class="chat-group-next">${escapeHtml(nextEvent.kindMeta.label)} · ${escapeHtml(nextEvent.title)} · ${escapeHtml(nextEvent.whenLabel)}</span>` : ''}
        </span>
        <span class="chat-group-count">${chat.count}</span>
      </article>`).join('');
  }

  /* -------------------------------------------------------- 전체 멤버 시트 */
  function openGroupMembers(groupId) {
    const grp = store.getGroup(groupId);
    if (!grp || !el.membersModal) return;
    ui.membersGroupId = groupId;
    ui.memberDetailId = null;
    renderMembersSheet();
    openModal(el.membersModal);
  }

  function memberRowHTML(member, grp) {
    const groupName = grp.name;
    /* 그룹장이 곧 나인 모임도 있다 — 역할 배지와 '나' 배지를 함께 붙여 구분한다. */
    const isDeputy = store.isGroupDeputy(grp.id, member.id);
    const roleBadge = `${member.role === 'leader' ? '<span class="member-role-badge leader">그룹장</span>' : ''}`
      + `${isDeputy ? '<span class="member-role-badge deputy">부방장</span>' : ''}`
      + `${member.isMe ? '<span class="member-role-badge me">나</span>' : ''}`
      + `${!member.isMe && member.role !== 'leader' && !isDeputy ? '<span class="member-role-badge member">멤버</span>' : ''}`;
    const open = ui.memberDetailId === member.id;
    const hobbyTags = (member.hobbies || []).map((h) => `<span class="member-hobby">${escapeHtml(h.name)}</span>`).join('');
    const dmEnabled = store.getGroupDmPolicy(grp.id).enabled;
    const iAmLeader = store.isGroupLeader(grp.id);
    return `
      <div class="member-row-wrap ${open ? 'is-open' : ''}">
        <button class="member-row" data-member-open="${member.id}" type="button"
                aria-expanded="${open}">
          <span class="member-row-avatar" style="background:${member.gradient}">${escapeHtml(member.avatarText)}</span>
          <span class="member-row-body">
            <span class="member-row-name">${escapeHtml(member.name)} ${roleBadge}</span>
            <span class="member-row-meta">${hobbyTags || `<span class="member-hobby">${escapeHtml(groupName)} 멤버</span>`}</span>
          </span>
          <span class="member-row-joined">${escapeHtml(member.joinedLabel)}</span>
          <span class="member-row-caret" aria-hidden="true">${ic(open ? 'chevronUp' : 'chevronDown')}</span>
        </button>
        ${open ? `
        <div class="member-detail">
          <div class="member-detail-grid">
            <span class="member-detail-cell"><span class="member-detail-label">취미</span><span class="member-detail-value">${(member.hobbies || []).map((h) => h.name).join(' · ') || groupName}</span></span>
            <span class="member-detail-cell"><span class="member-detail-label">가입</span><span class="member-detail-value">${escapeHtml(member.joinedLabel)}</span></span>
            <span class="member-detail-cell"><span class="member-detail-label">역할</span><span class="member-detail-value">${member.role === 'leader' ? '그룹장' : (isDeputy ? '부방장' : (member.isMe ? '나' : '멤버'))}</span></span>
          </div>
          <div class="member-detail-actions">
            ${member.isMe
              ? '<span class="member-detail-note">내 프로필은 내정보 탭에서 볼 수 있어요</span>'
              : `${dmEnabled
                  ? `<button class="btn-secondary" data-member-chat="${member.id}" type="button">1:1 대화</button>`
                  : `<button class="btn-secondary is-locked" data-member-chat-locked="1" type="button" disabled aria-disabled="true">1:1 대화 꺼둠</button>`}
                 <button class="btn-primary" data-member-profile="${member.id}" type="button">프로필 보기</button>
                 ${iAmLeader && member.role !== 'leader'
                   ? `<button class="btn-secondary deputy-btn ${isDeputy ? 'on' : ''}" data-member-deputy="${member.id}" type="button">${isDeputy ? '부방장 해제' : '부방장 지정'}</button>`
                   : ''}`}
          </div>
          ${!member.isMe && !dmEnabled
            ? '<p class="member-dm-note">이 모임은 그룹장이 1:1 대화를 꺼두었어요. 모임 전체방에서 이야기해 주세요.</p>'
            : ''}
        </div>` : ''}
      </div>`;
  }

  function renderMembersSheet() {
    if (!el.membersBody) return;
    const grp = store.getGroup(ui.membersGroupId);
    if (!grp) return;
    const roster = store.getGroupRoster(grp.id);
    const perm = store.getGroupNoticePermission(grp.id);
    const dm = store.getGroupDmPolicy(grp.id);
    if (el.membersTitle) el.membersTitle.textContent = `${grp.name} 멤버`;
    if (el.membersSub) {
      const leader = roster.members.find((m) => m.role === 'leader');
      const deputies = store.getGroupDeputies(grp.id).map((d) => d.name).join(', ');
      el.membersSub.textContent = `전체 ${roster.total}명 · 그룹장 ${leader ? leader.name : '-'}`
        + `${deputies ? ` · 부방장 ${deputies}` : ''}`
        + ` · 1:1 대화 ${dm.enabled ? '허용' : '꺼둠'}`;
    }
    el.membersBody.innerHTML = roster.members.map((m) => memberRowHTML(m, grp)).join('');
  }

  /* ==========================================================================
   * Sprint 18 — 사이드바(Drawer)
   * --------------------------------------------------------------------------
   * 11/16 사용자: "그룹내 멤버, 설정 등 사이드바에 넣어줄 수 있어? 내정보에 설정들도
   * 사이드바에 넣어주고 …".
   *  · 모임 안: 상단 메뉴 아이콘 → **모임 사이드바**(멤버 명단·부방장 지정·1:1 대화·모임 설정)
   *  · 내정보: 상단 메뉴 아이콘 → **내정보 사이드바**(프로필·알림·설치·활동·계정)
   *  · 오른쪽에서 슬라이드로 열리고, 바깥을 누르거나 Esc 로 닫힌다. 모션 줄이기에서는 즉시.
   * ========================================================================== */
  function drawerKindOf(node) {
    if (!node) return null;
    if (node === el.groupDrawer) return 'group';
    if (node === el.profileDrawer) return 'profile';
    return null;
  }

  function openDrawer(kind) {
    const node = kind === 'profile' ? el.profileDrawer : el.groupDrawer;
    if (!node) return;
    if (kind === 'group') {
      const gid = (ui.groupSpaceId && store.isGroupJoined(ui.groupSpaceId)) ? ui.groupSpaceId : store.getHomeGroupId();
      const grp = gid ? store.getGroup(gid) : null;
      if (!grp) { showToast('모임을 먼저 열어 주세요', 'info'); return; }
      ui.drawerMemberId = null;
      renderGroupDrawer(grp);
    } else {
      renderProfileDrawer();
      restoreSettingsGroup();
    }
    ui.drawerOpen = kind;
    node.hidden = false;
    node.classList.remove('is-closing');
    /* 다음 프레임에 is-open 을 붙여야 transform 트랜지션이 걸린다. */
    requestAnimationFrame(() => node.classList.add('is-open'));
    document.body.classList.add('drawer-open');
    const btn = kind === 'profile' ? el.profileDrawerBtn : el.groupDrawerBtn;
    if (btn) btn.setAttribute('aria-expanded', 'true');
    const panel = node.querySelector('.drawer');
    if (panel && typeof panel.focus === 'function') {
      try { panel.focus({ preventScroll: true }); } catch (e) { panel.focus(); }
    }
  }

  function closeDrawer(options = {}) {
    const kind = ui.drawerOpen;
    const node = kind === 'profile' ? el.profileDrawer : (kind === 'group' ? el.groupDrawer : null);
    ui.drawerOpen = null;
    document.body.classList.remove('drawer-open');
    [el.groupDrawerBtn, el.boardDrawerBtn, el.profileDrawerBtn].forEach((btn) => {
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
    if (!node) return;
    if (options.silent || prefersReducedMotion()) {
      node.hidden = true;
      node.classList.remove('is-open', 'is-closing');
      return;
    }
    node.classList.remove('is-open');
    node.classList.add('is-closing');
    setTimeout(() => {
      if (ui.drawerOpen) return;          // 그 사이 다시 열렸으면 그대로 둔다
      node.hidden = true;
      node.classList.remove('is-closing');
    }, 220);
  }

  /** 모임 사이드바 — 멤버 명단 + 모임 설정. */
  function renderGroupDrawer(grp) {
    if (!el.groupDrawerBody || !grp) return;
    const roster = store.getGroupRoster(grp.id);
    const isLeader = store.isGroupLeader(grp.id);
    const dm = store.getGroupDmPolicy(grp.id);
    const perms = store.getDeputyPermissions(grp.id);
    const joinMode = store.getGroupJoinMode(grp);
    const ageLimit = store.getGroupAgeLimit(grp.id);
    const cover = store.getGroupCover(grp.id);
    const leader = roster.members.find((m) => m.isLeader) || roster.members[0];

    if (el.groupDrawerAvatar) el.groupDrawerAvatar.innerHTML = ic(grp.icon || 'dot');
    if (el.groupDrawerName) el.groupDrawerName.textContent = grp.name;
    if (el.groupDrawerMeta) {
      el.groupDrawerMeta.textContent = `멤버 ${roster.total}명 · ${isLeader ? '내가 그룹장' : `${leader ? leader.name : '그룹장'} 그룹장`}`;
    }

    const memberRow = (m) => {
      const isDeputy = store.isGroupDeputy(grp.id, m.id);
      const badges = `${m.role === 'leader' ? '<span class="drawer-badge leader">그룹장</span>' : ''}`
        + `${isDeputy ? '<span class="drawer-badge deputy">부방장</span>' : ''}`
        + `${m.isMe ? '<span class="drawer-badge me">나</span>' : ''}`;
      const dmDisabled = !dm.enabled;
      const actions = m.isMe ? ''
        : `<span class="drawer-member-actions">
             <button class="drawer-mini ${dmDisabled ? 'is-locked' : ''}" data-drawer-chat="${m.id}" type="button"
                     ${dmDisabled ? 'disabled aria-disabled="true" title="그룹장이 1:1 대화를 꺼두었어요"' : ''}>1:1</button>
             ${isLeader && m.role !== 'leader'
               ? `<button class="drawer-mini ${isDeputy ? 'on' : ''}" data-drawer-deputy="${m.id}" type="button">${isDeputy ? '부방장 해제' : '부방장'}</button>`
               : ''}
           </span>`;
      return `
        <div class="drawer-member ${m.isMe ? 'is-me' : ''}">
          <span class="drawer-member-avatar" style="background:${m.gradient}">${escapeHtml(m.avatarText)}</span>
          <span class="drawer-member-name">${escapeHtml(m.name)} ${badges}</span>
          ${actions}
        </div>`;
    };

    el.groupDrawerBody.innerHTML = `
      <section class="drawer-section" aria-labelledby="drawer-members-title">
        <div class="drawer-section-head">
          <h3 class="drawer-section-title" id="drawer-members-title">멤버 <span class="section-count">${roster.total}</span></h3>
          <button class="drawer-link" data-drawer-members="1" type="button">전체 멤버 보기</button>
        </div>
        <div class="drawer-members">
          ${roster.members.slice(0, 6).map(memberRow).join('')}
        </div>
        ${roster.total > 6 ? `<button class="drawer-more" data-drawer-members="1" type="button">외 ${roster.total - 6}명 더 보기</button>` : ''}
        ${roster.total === 1 ? '<p class="drawer-note">아직 나 혼자예요 · 탐색에서 모임을 알리거나 친구를 초대해 보세요.</p>' : ''}
      </section>

      <section class="drawer-section" aria-labelledby="drawer-settings-title">
        <div class="drawer-section-head">
          <h3 class="drawer-section-title" id="drawer-settings-title">모임 설정</h3>
          <span class="drawer-role ${isLeader ? 'is-leader' : ''}">${isLeader ? '그룹장' : '멤버'}</span>
        </div>

        <div class="drawer-setting">
          <span class="drawer-setting-label">가입 방식</span>
          ${isLeader
            ? `<span class="drawer-seg" role="group" aria-label="가입 방식">
                 <button class="drawer-seg-btn ${joinMode === 'open' ? 'active' : ''}" data-drawer-join="open" type="button" aria-pressed="${joinMode === 'open'}">자유 가입</button>
                 <button class="drawer-seg-btn ${joinMode === 'approval' ? 'active' : ''}" data-drawer-join="approval" type="button" aria-pressed="${joinMode === 'approval'}">승인제</button>
               </span>`
            : `<span class="drawer-setting-value">${joinMode === 'open' ? '자유 가입' : '승인제'}</span>`}
        </div>

        <div class="drawer-setting is-wrap">
          <span class="drawer-setting-label">나이 제한</span>
          <span class="drawer-chips" role="group" aria-label="나이 제한">
            ${store.getAgeLimitOptions().map((o) => isLeader
              ? `<button class="drawer-chip ${ageLimit.id === o.id ? 'active' : ''}" data-drawer-age="${o.id}" type="button" aria-pressed="${ageLimit.id === o.id}">${escapeHtml(o.short)}</button>`
              : `<span class="drawer-chip ${ageLimit.id === o.id ? 'active' : ''}">${escapeHtml(o.short)}</span>`).join('')}
          </span>
        </div>

        <div class="drawer-toggle-row">
          <span class="drawer-toggle-text">
            <span class="drawer-toggle-title">그룹 내 1:1 대화 허용</span>
            <span class="drawer-toggle-desc">끄면 멤버끼리 1:1을 시작할 수 없어요 · 전체방은 그대로</span>
          </span>
          ${isLeader
            ? `<button class="switch-toggle ${dm.enabled ? 'on' : ''}" data-drawer-dm="1" role="switch"
                       aria-checked="${dm.enabled}" type="button" aria-label="그룹 내 1:1 대화 허용">
                 <span class="switch-knob" aria-hidden="true"></span></button>`
            : `<span class="drawer-setting-value">${dm.enabled ? '허용' : '꺼둠'}</span>`}
        </div>

        <div class="drawer-toggle-row">
          <span class="drawer-toggle-text">
            <span class="drawer-toggle-title">부방장에게 멤버 승인·강퇴까지</span>
            <span class="drawer-toggle-desc">끄면 부방장은 공지·일정만 쓸 수 있어요</span>
          </span>
          ${isLeader
            ? `<button class="switch-toggle ${perms.deputyCanModerate ? 'on' : ''}" data-drawer-deputy-mod="1" role="switch"
                       aria-checked="${perms.deputyCanModerate}" type="button" aria-label="부방장에게 멤버 승인·강퇴 권한">
                 <span class="switch-knob" aria-hidden="true"></span></button>`
            : `<span class="drawer-setting-value">${perms.deputyCanModerate ? '함께 관리' : '그룹장만'}</span>`}
        </div>

        <div class="drawer-menu">
          <button class="drawer-menu-item" data-drawer-cover="1" type="button">
            <span>표지 사진</span>
            <span class="drawer-menu-value">${cover && cover.custom ? '직접 고름' : '최근 사진'}</span>
          </button>
          <button class="drawer-menu-item" data-drawer-info="1" type="button">
            <span>모임 정보 · 규칙 · 말머리</span>
            <span class="drawer-menu-value">›</span>
          </button>
          ${isLeader
            ? `<button class="drawer-menu-item danger" data-drawer-delete="1" type="button">
                 <span>모임 삭제</span><span class="drawer-menu-value">되돌릴 수 없어요</span></button>`
            : `<button class="drawer-menu-item danger" data-drawer-leave="1" type="button">
                 <span>모임 나가기</span><span class="drawer-menu-value">›</span></button>`}
        </div>
      </section>`;
  }

  /** 내정보 사이드바 — 계정·활동·알림·설치·계정 정리. */
  /* ==========================================================================
   * Sprint 26.5 — 설정 사이드바: 카테고리별 접기/펼치기
   * ------------------------------------------------------------------------
   * 11/17 사용자: "사이드바에 있는 설정들은 접고 접을 수 있게해줘 다 펼쳐져있으니
   * 너무 많아보여 … 이반시티나 잭디 그런걸 확인해줘"
   *  · 한 번에 한 묶음만 펼친다(다른 묶음을 열면 앞의 것이 접힌다).
   *  · 처음에는 '계정 및 보안' 하나만 열려 있어, 사이드바가 짧고 읽기 쉽다.
   *  · 접힌 묶음은 hidden 이라 화면 낭독기·Tab 순서에서도 빠진다.
   * ======================================================================== */
  const SETTINGS_GROUPS = ['account', 'profile', 'groups', 'talk', 'alerts', 'display', 'data'];

  function settingsSection(key) {
    return el.profileDrawer ? el.profileDrawer.querySelector(`.drawer-section[data-acc="${key}"]`) : null;
  }

  function setSettingsGroup(key, open) {
    const sec = settingsSection(key);
    if (!sec) return { ok: false, reason: 'not_found', key };
    const head = sec.querySelector('.acc-head');
    const body = sec.querySelector('.acc-body');
    const next = open == null ? !sec.classList.contains('is-open') : !!open;
    sec.classList.toggle('is-open', next);
    if (head) head.setAttribute('aria-expanded', String(next));
    if (body) {
      body.hidden = !next;
      body.classList.remove('is-opening');
      if (next) {
        /* 펼칠 때만 짧게 떠오르게(접을 때는 즉시) */
        void body.offsetHeight;
        body.classList.add('is-opening');
      }
    }
    return { ok: true, key, open: next };
  }

  /** 테스트·딥링크용 — 사이드바를 열고 그 묶음을 펼친다. */
  function openSettingsGroup(key) {
    if (ui.drawerOpen !== 'profile') openDrawer('profile');
    SETTINGS_GROUPS.forEach((k) => { if (k !== key) setSettingsGroup(k, false); });
    const res = setSettingsGroup(key, true);
    /* 테스트·딥링크로 열어도 '마지막에 펼친 묶음' 기억에 남긴다. */
    if (SETTINGS_GROUPS.includes(key)) store.setLastSettingsGroup(key);
    return res;
  }

  function getSettingsState() {
    return {
      open: ui.drawerOpen,
      lastGroup: store.getLastSettingsGroup(),
      groups: SETTINGS_GROUPS.map((key) => {
        const sec = settingsSection(key);
        return { key, open: !!(sec && sec.classList.contains('is-open')) };
      })
    };
  }

  /** 사이드바를 열 때 마지막에 펼쳤던 묶음을 그대로 펼친다(27.5). */
  function restoreSettingsGroup() {
    const key = store.getLastSettingsGroup();
    const target = SETTINGS_GROUPS.includes(key) ? key : 'account';
    SETTINGS_GROUPS.forEach((k) => setSettingsGroup(k, k === target));
    return target;
  }

  /** 아코디언 헤더의 요약 — 펼치지 않아도 지금 상태가 보이게. */
  function renderSettingsSummary() {
    try {
      const albums = store.getAlbumSummary();
      if (el.menuAlbumsState) {
        el.menuAlbumsState.textContent = `공개 ${albums.public.count}/${ALBUM_MAX} · 비밀 ${albums.secret.count}/${ALBUM_MAX}`;
      }
      const pub = store.getMyExplorePublishState ? store.getMyExplorePublishState() : { active: false };
      if (el.menuProfileStatusVal) {
        el.menuProfileStatusVal.textContent = pub.active
          ? `${pub.meetStyleLabel || '올림'} · ${pub.remainingLabel}`
          : '내려감';
      }
    } catch (e) { /* 값이 아직 없을 때는 요약을 건너뛴다 */ }
    if (el.accMetaDisplay) el.accMetaDisplay.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '다크' : '라이트';
    if (el.accMetaAlerts) {
      const ns = store.notificationSettings || {};
      const channels = ns.channels || {};
      const on = Object.keys(channels).filter((k) => channels[k]).length;
      el.accMetaAlerts.textContent = on ? `켜짐 ${on}` : '꺼짐';
    }
    /* Sprint 27.5 — '모임' 묶음 요약: 가입 N · 신청 N */
    if (el.accMetaGroups) {
      const joined = (store.currentUser.joinedGroupIds || []).length;
      const pending = store.getMyPendingApplicationCount();
      el.accMetaGroups.textContent = `가입 ${joined} · 신청 ${pending}`;
    }
    /* Sprint 27.5 — 예시 데이터 요약과 비우기/다시 넣기 줄 */
    const sample = store.getSampleSummary();
    if (el.menuSampleState) {
      el.menuSampleState.textContent = sample.seeded
        ? `모임 ${sample.counts.groups} · 사람 ${sample.counts.people}`
        : '없음';
    }
    if (el.menuSampleData) el.menuSampleData.hidden = !sample.seeded;
    if (el.menuSampleRestore) el.menuSampleRestore.hidden = sample.seeded;
  }

  function renderProfileDrawer() {
    const me = store.currentUser;
    if (el.profileDrawerName) el.profileDrawerName.textContent = me.nickname || '내정보';
    if (el.profileDrawerMeta) {
      el.profileDrawerMeta.textContent = [me.handle, me.location].filter(Boolean).join(' · ') || '내 설정';
    }
    renderSettingsSummary();
    if (el.profileDrawerAvatar) {
      el.profileDrawerAvatar.innerHTML = me.photoUrl
        ? `<img src="${escapeHtml(me.photoUrl)}" alt="">`
        : escapeHtml(me.avatarText || (me.nickname || '·').charAt(0));
      el.profileDrawerAvatar.style.background = me.photoUrl ? 'transparent' : (me.avatarGradient || '');
    }
    updateBadges();
    renderNotificationSettings();
    renderPwaCard();
  }

  function memberOf(groupId, memberId) {
    return store.getGroupRoster(groupId).members.find((m) => m.id === memberId) || null;
  }

  function goMemberChat(groupId, memberId) {
    const res = store.ensureMemberChat(groupId, memberId);
    if (!res.ok) {
      const messages = {
        me: '나와의 대화는 만들 수 없어요',
        dm_disabled: '이 모임은 그룹장이 1:1 대화를 꺼두었어요 · 모임 전체방에서 이야기해 주세요'
      };
      showToast(messages[res.reason] || '대화방을 열지 못했어요', 'warning');
      return;
    }
    const memberName = (memberOf(groupId, memberId) || {}).name || '멤버';
    if (el.membersModal && el.membersModal.classList.contains('active')) closeModal(el.membersModal);
    switchTab('tab-chat');
    openChatRoom(res.roomId);
    updateBadges();
    if (res.created) showToast(`${memberName}님과의 1:1 대화방을 열었어요`);
  }

  function goMemberProfile(groupId, memberId) {
    const member = memberOf(groupId, memberId);
    if (!member) return;
    const profile = (store.state.matchProfiles || []).find((p) => p.nickname === member.name);
    if (!profile) {
      showToast(`${member.name}님의 상세 프로필은 모임 안에서만 공개돼요 · 1:1 대화로 말을 걸어보세요`, 'info');
      return;
    }
    closeModal(el.membersModal);
    openPersonDetail(profile.id);
  }

  /* ------------------------------------------------ 모임 공지 시트 (Sprint 15) */
  function openNoticeSheet(groupId) {
    const grp = store.getGroup(groupId);
    if (!grp || !el.noticeModal) return;
    if (!store.isGroupJoined(groupId)) {
      showToast('가입한 모임의 공지만 볼 수 있어요', 'warning');
      return;
    }
    ui.noticeGroupId = groupId;
    ui.noticeEditingId = null;
    renderNoticeSheet();
    openModal(el.noticeModal);
  }

  function noticeRoleLabel(role) {
    return role === 'deputy' ? '부방장' : (role === 'leader' ? '그룹장' : '멤버');
  }

  function renderNoticeSheet() {
    const grp = store.getGroup(ui.noticeGroupId);
    if (!grp || !el.noticeList) return;
    const perm = store.getGroupNoticePermission(grp.id);
    const notices = store.getGroupNotices(grp.id);
    if (el.noticeTitle) el.noticeTitle.textContent = `${grp.name} 공지`;
    if (el.noticeSub) {
      /* Sprint 24 — 설명 대신 개수만. 권한은 버튼이 보이고 사라지는 것으로 이미 안다. */
      el.noticeSub.textContent = `공지 ${notices.length}개`;
    }
    el.noticeList.innerHTML = notices.length ? notices.map((n) => {
      const editing = ui.noticeEditingId === n.id;
      return `
        <article class="notice-item ${n.pinned ? 'is-pinned' : ''}" data-notice-item="${n.id}">
          <div class="notice-item-head">
            <span class="notice-item-author">${n.pinned ? '[고정] ' : ''}${escapeHtml(n.authorName)} · ${noticeRoleLabel(n.authorRole)}</span>
            <span class="notice-item-time" data-created="${n.at}">${timeAgo(n.at)}</span>
          </div>
          ${editing
            ? `<form class="notice-edit-form" data-notice-edit-form="${n.id}">
                 <textarea class="text-area" maxlength="120" aria-label="공지 수정">${escapeHtml(n.text)}</textarea>
                 <div class="notice-edit-actions">
                   <button type="button" class="text-btn ghost" data-notice-cancel="1">취소</button>
                   <button type="submit" class="btn-primary">저장</button>
                 </div>
               </form>`
            : `<p class="notice-item-text">${escapeHtml(n.text)}</p>`}
          ${perm.canManage && !editing ? `
            <div class="notice-item-actions">
              <button class="notice-act read" data-notice-read="${n.id}" type="button">읽음 ${(store.getNoticeReadState(n.id) || {}).readCount || 0}/${(store.getNoticeReadState(n.id) || {}).total || 0}</button>
              <button class="notice-act ${n.pinned ? 'on' : ''}" data-notice-pin="${n.id}" type="button">${n.pinned ? '고정 해제' : '상단 고정'}</button>
              <button class="notice-act" data-notice-edit="${n.id}" type="button">수정</button>
              <button class="notice-act danger" data-notice-delete="${n.id}" type="button">삭제</button>
            </div>` : ''}
        </article>`;
    }).join('') : '<p class="notice-empty">아직 공지가 없어요. 첫 공지를 남겨보세요.</p>';

    if (el.noticeEditor) {
      el.noticeEditor.innerHTML = perm.canManage ? `
        <form class="notice-form" data-notice-form="${grp.id}">
          <label class="field-label">새 공지 <span class="field-hint">2~120자 · 멤버 모두에게 보여요</span></label>
          <textarea class="text-area notice-input" maxlength="120" aria-label="새 공지" placeholder="예: 금요일 와드 끝나고 단체 사진 찍어요"></textarea>
          <div class="notice-form-actions">
            <label class="notice-pin-check"><input type="checkbox" class="notice-pin-input"> 상단에 고정</label>
            <button type="submit" class="btn-primary">공지 올리기</button>
          </div>
        </form>`
        : '<p class="notice-lock">공지는 그룹장과 그룹장이 지정한 부방장만 쓸 수 있어요.</p>';
    }
  }

  /* ------------------------------------------------ 일정 상세 시트 (Sprint 15) */
  function openEventDetail(eventId) {
    if (!el.eventDetailModal) return;
    ui.openEventId = eventId;
    renderEventDetail(eventId);
    openModal(el.eventDetailModal);
  }

  function renderEventDetail(eventId) {
    if (!el.eventDetailBody) return;
    const ev = store.getGroupEvent(eventId);
    if (!ev) return;
    const s = store.getGroupEventSummary(eventId);
    const kind = store.getGroupEventKindsLabel(ev.kind);
    const rsvps = store.getGroupEventRsvpOptions();
    const full = s.full;
    const grp = store.getGroup(ev.groupId);
    const labelOf = (r) => (r.id === 'yes' && full && s.myRsvp !== 'yes' ? '대기 신청' : r.label);
    const iconOf = (r) => (r.id === 'yes' && full && s.myRsvp !== 'yes' ? 'hourglass' : r.icon);
    const people = (list, cls) => list.length
      ? `<div class="event-people">${list.map((p) => `
          <span class="event-person ${cls}">
            <span class="event-person-avatar" style="background:${p.gradient}">${escapeHtml(p.avatarText || p.name.charAt(0))}</span>
            <span class="event-person-name">${escapeHtml(p.name)}${p.order ? `<b class="event-wait-order">${p.order}순위</b>` : ''}</span>
          </span>`).join('')}</div>`
      : `<p class="event-people-empty">아직 없어요</p>`;
    el.eventDetailBody.innerHTML = `
      <div class="event-detail-head tone-${kind.tone}">
        <div class="event-detail-top">
          <span class="event-kind">${escapeHtml(kind.label)}</span>
          <span class="event-when">${escapeHtml(s.whenLabel)}</span>
        </div>
        <h2 class="sheet-title">${escapeHtml(ev.title)}</h2>
        ${grp ? `<p class="event-detail-group">${ic(grp.icon)} ${escapeHtml(grp.name)}</p>` : ''}
        ${ev.place ? `<p class="event-detail-place">${escapeHtml(ev.place)}</p>` : ''}
        ${ev.note ? `<p class="event-detail-note">${escapeHtml(ev.note)}</p>` : ''}
        <div class="event-detail-stats">
          <span class="event-stat"><b>${s.yes}</b><span>참석</span></span>
          <span class="event-stat"><b>${s.maybe}</b><span>대기</span></span>
          <span class="event-stat ${full ? 'is-full' : ''}"><b>${s.capacity ? s.seatsLeft : '∞'}</b><span>${full ? '정원 마감' : '남은 자리'}</span></span>
        </div>
      </div>
      ${new Date(ev.when).getTime() < Date.now()
        ? '<p class="event-detail-past">지난 일정이에요 · 참석을 바꿀 수 없어요</p>'
        : `<div class="event-rsvp event-rsvp-detail" role="group" aria-label="참석 여부">
            ${rsvps.map((r) => `
              <button class="rsvp-btn rs-${r.id} ${s.myRsvp === r.id ? 'active' : ''}"
                      data-rsvp-status="${r.id}" data-rsvp-event="${ev.id}"
                      aria-pressed="${s.myRsvp === r.id}" type="button">
                ${iconOf(r) ? `<span class="rsvp-icon" aria-hidden="true">${ic(iconOf(r))}</span>` : ''}${labelOf(r)}
              </button>`).join('')}
          </div>
          <p class="event-detail-hint">${full
            ? '정원이 찾아요 · 참석을 누르면 대기 명단에 들어가고, 자리가 나면 1순위부터 자동으로 올라가요.'
            : '참석을 누르면 명단에 올라가요.'}</p>`}
      <section class="event-detail-block">
        <h4 class="event-detail-title">참석 ${s.yes}${s.capacity ? ` / ${s.capacity}` : ''}</h4>
        ${people(s.attendees, 'is-yes')}
      </section>
      <section class="event-detail-block">
        <h4 class="event-detail-title">대기 ${s.maybe}</h4>
        ${people(s.waiters, 'is-maybe')}
      </section>
      <section class="event-detail-block">
        <h4 class="event-detail-title">${ic('closeCircle')} 불참 ${s.no}</h4>
        ${people(s.noList, 'is-no')}
      </section>`;
  }

  /* -------------------------------------------- 모임 일정 만들기(술모임·번개) */
  function localDateInput(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function localTimeInput(date) {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function eventDraftIso() {
    if (!el.eventDate || !el.eventTime) return null;
    const day = el.eventDate.value;
    const time = el.eventTime.value || '19:00';
    if (!day) return null;
    const iso = new Date(`${day}T${time}:00`);
    return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
  }

  function renderEventForm() {
    if (!el.eventKinds) return;
    el.eventKinds.innerHTML = store.getGroupEventKinds().map((k) => `
      <button class="tag-pick ${ui.eventDraft.kind === k.id ? 'active' : ''}" data-event-kind="${k.id}"
              aria-pressed="${ui.eventDraft.kind === k.id}" type="button">${ic(k.icon)} ${k.label}</button>`).join('');
    const quick = [
      { label: '오늘 저녁 7시', hours: 0, h: 19 },
      { label: '내일 저녁 7시', hours: 24, h: 19 },
      { label: '내일 아침 8시', hours: 24, h: 8 },
      { label: '이번 주말 10시', hours: null, h: 10 }
    ];
    el.eventQuickWhen.innerHTML = quick.map((q, i) => `
      <button class="tag-pick" data-event-quick="${i}" type="button">${q.label}</button>`).join('');
    el.eventSubmit.disabled = !(el.eventTitle && el.eventTitle.value.trim().length >= 2);
  }

  function applyQuickWhen(index) {
    const now = new Date();
    const presets = [
      { addDays: 0, h: 19 }, { addDays: 1, h: 19 }, { addDays: 1, h: 8 }, { addDays: null, h: 10 }
    ];
    const preset = presets[Number(index)] || presets[0];
    let target;
    if (preset.addDays === null) {
      /* 이번 주 토요일 오전 10시 (오늘이 토요일이면 다음 주) */
      target = new Date(now);
      const delta = (6 - now.getDay() + 7) % 7 || 7;
      target.setDate(now.getDate() + delta);
      target.setHours(preset.h, 0, 0, 0);
    } else {
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + preset.addDays, preset.h, 0, 0, 0);
      if (target.getTime() < Date.now()) target.setDate(target.getDate() + 1);
    }
    if (el.eventDate) el.eventDate.value = localDateInput(target);
    if (el.eventTime) el.eventTime.value = localTimeInput(target);
    ui.eventDraft.when = target.toISOString();
  }

  function openEventForm(groupId) {
    const grp = store.getGroup(groupId || store.getHomeGroupId());
    if (!grp || !el.eventModal) return;
    if (!store.isGroupJoined(grp.id)) {
      showToast('가입한 모임에만 일정을 올릴 수 있어요', 'warning');
      return;
    }
    ui.eventGroupId = grp.id;
    ui.eventDraft = { kind: 'drink', when: null };
    if (el.eventGroupNote) el.eventGroupNote.textContent = `${grp.name} 멤버 ${grp.memberCount}명에게 보입니다.`;
    if (el.eventTitle) el.eventTitle.value = '';
    if (el.eventPlace) el.eventPlace.value = '';
    if (el.eventNote) el.eventNote.value = '';
    applyQuickWhen(0);
    renderEventForm();
    openModal(el.eventModal);
  }

  function submitGroupEvent() {
    if (!el.eventTitle) return;
    const when = eventDraftIso();
    const res = store.createGroupEvent(ui.eventGroupId, {
      title: el.eventTitle.value,
      kind: ui.eventDraft.kind,
      when,
      place: el.eventPlace ? el.eventPlace.value : '',
      note: el.eventNote ? el.eventNote.value : '',
      capacity: 12
    });
    if (!res.ok) {
      const messages = {
        title_short: '일정 이름을 2자 이상 적어주세요',
        title_long: '일정 이름은 30자까지 가능해요',
        bad_when: '날짜와 시각을 골라주세요',
        past_when: '지난 시각으로는 일정을 만들 수 없어요',
        not_member: '가입한 모임에만 일정을 올릴 수 있어요'
      };
      showToast(messages[res.reason] || '일정을 올리지 못했어요', 'warning');
      return;
    }
    closeModal(el.eventModal);
    ui.homeGroupId = res.event.groupId;
    renderHome();
    updateBadges();
    showToast(`'${res.event.title}' 일정을 올렸어요 · 참석으로 표시했어요`);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
  }

  /* ------------------------------------------------- 게시글(모임 사진) 상세 */
  function renderGroupPostDetail(postId) {
    const post = store.getPost(postId);
    if (!post || !el.postBody) return;
    ui.postSheetId = post.id;
    const grp = store.getGroup(post.groupId);
    const comments = post.comments || [];
    el.postBody.innerHTML = `
      <div class="post-detail-head">
        <span class="post-detail-avatar" style="background:${post.authorGradient}">${escapeHtml(post.authorAvatarText || post.authorName.charAt(0))}</span>
        <div class="post-detail-who">
          <div class="post-detail-name">${escapeHtml(post.authorName)}${post.authorId === store.currentUser.id ? ' <span class="me-badge">나</span>' : ''}</div>
          <div class="post-detail-sub">
            ${grp ? `${ic(grp.icon)} ${escapeHtml(grp.name)} · ` : ''}
            <span data-created="${post.createdAt}">${timeAgo(post.createdAt)}</span>
          </div>
        </div>
        ${post.tag ? `<span class="detail-hobby-pill">#${escapeHtml(post.tag)}</span>` : ''}
      </div>
      ${post.photoUrl
        ? `<div class="post-detail-media ratio-${post.ratio || 'wide'}"><img class="media-img" src="${escapeHtml(post.photoUrl)}" alt="게시물 사진" loading="lazy" decoding="async"></div>`
        : ''}
      ${post.mediaCaption ? `<p class="post-detail-media-caption">${escapeHtml(post.mediaCaption)}</p>` : ''}
      <p class="post-detail-caption">${escapeHtml(post.caption)}</p>
      <div class="post-detail-stats">
        <span>${ic('heart')} 좋아요 ${fmtCount(post.likes)}</span>
        <span>댓글 ${comments.length}</span>
        ${grp ? `<span class="post-detail-group-chip">${escapeHtml(grp.name)} 멤버 공개</span>` : ''}
      </div>
      <div class="post-detail-actions">
        <button class="post-detail-like ${post.likedByMe ? 'liked' : ''}" data-feed-post-like="${post.id}"
                aria-pressed="${post.likedByMe}" type="button">
          ${HEART_SVG(post.likedByMe)} ${post.likedByMe ? '좋아요 취소' : '좋아요'}
        </button>
        ${grp ? `<button class="post-detail-group" data-feed-post-group="${grp.id}" type="button">모임 보기</button>` : ''}
      </div>
      <div class="post-comment-head">
        <h4 class="post-comment-title">댓글 <span class="section-count">${comments.length}</span></h4>
        <span class="post-comment-privacy">모임원만 볼 수 있는 반응이에요</span>
      </div>
      <div class="post-comment-list">
        ${comments.length
          ? comments.map((c) => `
              <div class="post-comment">
                <span class="post-comment-avatar" style="background:${commentAvatarTint(c.authorName)}" aria-hidden="true">${escapeHtml(String(c.authorName || '?').charAt(0))}</span>
                <div class="post-comment-body">
                  <div class="post-comment-top">
                    <span class="post-comment-name">${escapeHtml(c.authorName)}</span>
                    ${c.createdAt ? `<span class="post-comment-time" data-created="${c.createdAt}">${timeAgo(c.createdAt)}</span>` : ''}
                  </div>
                  <p class="post-comment-text">${escapeHtml(c.text)}</p>
                </div>
              </div>`).join('')
          : '<p class="post-comment-empty">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>'}
      </div>
      <form class="comment-form" data-feed-comment-form="${post.id}">
        <input type="text" class="comment-input" aria-label="댓글 입력" placeholder="댓글 달기..." maxlength="200" autocomplete="off">
        <button type="submit" class="comment-submit" disabled>게시</button>
      </form>`;
  }

  function openHomePost(postId) {
    const post = store.getPost(postId);
    if (!post || !el.postModal) return;
    renderGroupPostDetail(postId);
    if (!el.postModal.classList.contains('active')) openModal(el.postModal);
  }


  /* ------------------------------------------------------------------
   * Sprint 16 배선 — 갤러리 · 그룹 뒤로가기 · 스토리 · 게시판 · 쪽지 · 나이 슬라이더
   * ---------------------------------------------------------------- */
  function bindGallery() {
    const openFromCard = (node) => { if (node) enterGroupSpace(node.dataset.openGroup, 'tab-home'); };
    if (el.galleryGrid) {
      el.galleryGrid.addEventListener('click', (e) => {
        if (e.target.closest('[data-home-find]')) { focusHomeBrowse(); return; }
        if (e.target.closest('[data-gallery-new]')) { openGroupCreate(); return; }
        openFromCard(e.target.closest('[data-open-group]'));
      });
      el.galleryGrid.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('[data-open-group]');
        if (!card) return;
        e.preventDefault();
        openFromCard(card);
      });
    }
    if (el.galleryEmpty) {
      el.galleryEmpty.addEventListener('click', (e) => {
        if (e.target.closest('[data-home-find]')) focusHomeBrowse();
        if (e.target.closest('[data-gallery-new]')) openGroupCreate();
      });
    }
    /* Sprint 21 — 추천 모임 카드 · 더 많은 모임 둘러보기 · 취미 다시 고르기 */
    if (el.homeRecommendGrid) {
      el.homeRecommendGrid.addEventListener('click', (e) => {
        if (e.target.closest('[data-gallery-new]')) { openGroupCreate(); return; }
        openFromCard(e.target.closest('[data-open-group]'));
      });
      el.homeRecommendGrid.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('[data-open-group]');
        if (!card) return;
        e.preventDefault();
        openFromCard(card);
      });
    }
    if (el.btnHomeMoreGroups) {
      el.btnHomeMoreGroups.addEventListener('click', () => {
        /* Sprint 22 — '더 많은 모임 둘러보기'는 탐색이 아니라 **바로 아래 홈의 모임 둘러보기**로. */
        renderHomeBrowse();
        if (el.homeBrowse) el.homeBrowse.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      });
    }
    bindHomeBrowse();
    if (el.btnHomeRecommendTaste) {
      el.btnHomeRecommendTaste.addEventListener('click', () => startGuide({ mode: 'taste', step: 'taste-category' }));
    }
    /* Sprint 17 — 갤러리 정렬 */
    if (el.gallerySort) {
      el.gallerySort.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-gallery-sort]');
        if (!btn) return;
        store.setGallerySort(btn.dataset.gallerySort);
        renderGallery();
      });
    }
  }
  bindGallery();

  /* 모임 안 상단 뒤로가기 — 피드·게시판 어디서든 갤러리로 */
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-group-back]')) { exitGroupSpace(); }
  });

  /* Sprint 16 — 바깥 3탭에는 내정보가 없으므로 헤더 프로필로 연다(모임 안에서는 4탭에 이미 있다). */
  $('#btn-header-profile') && $('#btn-header-profile').addEventListener('click', () => {
    switchTab('tab-profile');
  });

  /* Sprint 18 — 모임·내정보 사이드바 열기 */
  el.groupDrawerBtn && el.groupDrawerBtn.addEventListener('click', () => openDrawer('group'));
  el.boardDrawerBtn && el.boardDrawerBtn.addEventListener('click', () => openDrawer('group'));
  el.profileDrawerBtn && el.profileDrawerBtn.addEventListener('click', () => openDrawer('profile'));

  /* 사이드바 닫기 — 바깥(스크림)·닫기 버튼 */
  [el.groupDrawer, el.profileDrawer].forEach((node) => {
    node && node.addEventListener('click', (e) => {
      if (e.target.closest('[data-drawer-close]')) closeDrawer();
    });
  });

  /* 내정보 사이드바: 항목을 누르면 사이드바를 접고 그 화면(시트)을 연다 */
  if (el.profileDrawer) {
    el.profileDrawer.addEventListener('click', (e) => {
      if (e.target.closest('.menu-item')) closeDrawer({ silent: true });
    });
    /* Sprint 26.5 — 아코디언 헤더: 한 번에 한 묶음만 펼친다. */
    el.profileDrawer.querySelectorAll('.drawer-section[data-acc] .acc-head').forEach((head) => {
      head.addEventListener('click', () => {
        const sec = head.closest('.drawer-section');
        const key = sec && sec.dataset.acc;
        if (!key) return;
        const willOpen = !sec.classList.contains('is-open');
        if (willOpen) SETTINGS_GROUPS.forEach((k) => { if (k !== key) setSettingsGroup(k, false); });
        setSettingsGroup(key, willOpen);
        /* Sprint 27.5 — 마지막에 펼친 묶음을 기억한다(앱을 다시 열어도 그 자리로). */
        if (willOpen) store.setLastSettingsGroup(key);
      });
    });
    /* 헤더를 키보드(Enter·Space)로도 — button 이라 기본 동작이지만, 포커스 이동을 보장 */
    el.profileDrawer.querySelectorAll('.acc-head').forEach((head) => {
      head.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        head.click();
      });
    });
  }

  /* 모임 사이드바 안의 동작들 */
  el.groupDrawerBody && el.groupDrawerBody.addEventListener('click', (e) => {
    const gid = ui.groupSpaceId || store.getHomeGroupId();
    const grp = gid ? store.getGroup(gid) : null;
    if (!grp) return;
    const t = e.target.closest('button');
    if (!t) return;
    const rerender = () => renderGroupDrawer(store.getGroup(grp.id) || grp);

    if (t.dataset.drawerMembers) { closeDrawer({ silent: true }); openGroupMembers(grp.id); return; }
    if (t.dataset.drawerChat) { closeDrawer({ silent: true }); goMemberChat(grp.id, t.dataset.drawerChat); return; }
    if (t.dataset.drawerDeputy) {
      const on = !store.isGroupDeputy(grp.id, t.dataset.drawerDeputy);
      const res = store.setGroupDeputy(grp.id, t.dataset.drawerDeputy, on);
      if (!res.ok) { showToast(res.reason === 'limit' ? '부방장은 최대 5명이에요' : '부방장을 바꾸지 못했어요', 'warning'); return; }
      showToast(on ? '부방장으로 지정했어요' : '부방장에서 내렸어요');
      rerender();
      return;
    }
    if (t.dataset.drawerJoin) {
      const res = store.updateGroupJoinPolicy(grp.id, { joinMode: t.dataset.drawerJoin });
      if (!res.ok) { showToast('그룹장만 바꿀 수 있어요', 'warning'); return; }
      showToast(t.dataset.drawerJoin === 'open' ? '누구나 자유롭게 가입하는 모임이에요' : '소개서를 보고 승인하는 모임이에요');
      rerender();
      return;
    }
    if (t.dataset.drawerAge) {
      const res = store.updateGroupJoinPolicy(grp.id, { ageLimit: t.dataset.drawerAge });
      if (!res.ok) { showToast('그룹장만 바꿀 수 있어요', 'warning'); return; }
      rerender();
      return;
    }
    if (t.dataset.drawerDm) {
      const cur = store.getGroupDmPolicy(grp.id).enabled;
      const res = store.updateGroupDmPolicy(grp.id, !cur);
      if (!res.ok) { showToast('그룹장만 바꿀 수 있어요', 'warning'); return; }
      showToast(cur ? '그룹 내 1:1 대화를 껐어요' : '그룹 내 1:1 대화를 허용했어요');
      rerender();
      return;
    }
    if (t.dataset.drawerDeputyMod) {
      const cur = store.getDeputyPermissions(grp.id).deputyCanModerate;
      const res = store.setDeputyModeratePermission(grp.id, !cur);
      if (!res.ok) { showToast('그룹장만 바꿀 수 있어요', 'warning'); return; }
      showToast(cur ? '승인·강퇴는 그룹장만 하게 바꿨어요' : '부방장도 승인·강퇴를 맡을 수 있어요');
      rerender();
      return;
    }
    if (t.dataset.drawerCover) { closeDrawer({ silent: true }); openCoverPicker(grp.id); return; }
    if (t.dataset.drawerInfo) { closeDrawer({ silent: true }); openGroupDetail(grp.id); return; }
    if (t.dataset.drawerLeave) {
      askConfirm('모임을 나갈까요?', `'${grp.name}' 피드와 대화가 더 이상 보이지 않아요.`, '나가기', () => {
        const res = store.leaveGroup(grp.id);
        if (!res.ok) { showToast('모임을 나가지 못했어요', 'warning'); return; }
        closeDrawer({ silent: true });
        exitGroupSpace();
        renderGallery();
        updateBadges();
        showToast(`'${grp.name}'에서 나왔어요`, 'info');
      });
      return;
    }
    if (t.dataset.drawerDelete) {
      askConfirm('모임을 삭제할까요?', `'${grp.name}'의 글·사진·공지·일정·대화가 모두 지워지고 되돌릴 수 없어요.`, '삭제', () => {
        const res = store.deleteGroup(grp.id);
        if (!res.ok) { showToast('모임을 삭제하지 못했어요', 'warning'); return; }
        closeDrawer({ silent: true });
        exitGroupSpace();
        renderGallery();
        updateBadges();
        showToast('모임을 삭제했어요', 'info');
      });
    }
  });

  /* 스토리 바 */
  if (el.storyBar) {
    el.storyBar.addEventListener('click', (e) => {
      if (e.target.closest('[data-story-new]')) { openStoryComposer(); return; }
      if (e.target.closest('[data-story-archive-open]')) { openStoryArchive(); return; }
      const ring = e.target.closest('[data-story-ring]');
      if (ring) { openStoryRing(ring.dataset.storyRing); return; }
      const item = e.target.closest('[data-story-open]');
      if (item) openStoryViewer(item.dataset.storyOpen);
    });
  }
  /* Sprint 17 — 스토리 답장 */
  if (el.storyReplyForm) {
    el.storyReplyForm.addEventListener('submit', (e) => { e.preventDefault(); sendStoryReply(); });
  }
  el.btnStoryArchive && el.btnStoryArchive.addEventListener('click', openStoryArchive);
  $('#btn-close-archive') && $('#btn-close-archive').addEventListener('click', () => closeModal(el.storyArchiveModal));
  if (el.storyArchiveGrid) {
    el.storyArchiveGrid.addEventListener('click', (e) => {
      const del = e.target.closest('[data-archive-del]');
      if (del) {
        const res = store.deleteArchivedStory(del.dataset.archiveDel);
        if (res.ok) { renderStoryArchive(); paintMyAvatars(); showToast('보관함에서 지웠어요', 'info'); }
        return;
      }
      const open = e.target.closest('[data-archive-open]');
      if (open) openArchivedStory(open.dataset.archiveOpen);
    });
  }

  el.storyCaption && el.storyCaption.addEventListener('input', updateStoryPublish);
  el.storyPublish && el.storyPublish.addEventListener('click', submitStory);
  $('#btn-story-cancel') && $('#btn-story-cancel').addEventListener('click', () => closeModal(el.storyModal));

  $('#btn-story-close') && $('#btn-story-close').addEventListener('click', closeStoryViewer);
  el.btnStoryPrev && el.btnStoryPrev.addEventListener('click', () => storyStep(-1));
  el.btnStoryNext && el.btnStoryNext.addEventListener('click', () => storyStep(1));
  el.btnStoryDelete && el.btnStoryDelete.addEventListener('click', deleteCurrentStory);
  document.addEventListener('keydown', (e) => {
    if (!el.storyViewer || el.storyViewer.hidden) return;
    if (e.key === 'Escape') closeStoryViewer();
    else if (e.key === 'ArrowLeft') storyStep(-1);
    else if (e.key === 'ArrowRight') storyStep(1);
  });

  /* 그룹게시판 */
  if (el.boardFilterChips) {
    el.boardFilterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-board-tag]');
      if (!chip) return;
      ui.boardTag = chip.dataset.boardTag || null;
      renderBoardPosts(homeGroup());
    });
  }
  if (el.boardPostList) {
    el.boardPostList.addEventListener('click', (e) => {
      const row = e.target.closest('[data-board-post]');
      if (row) openHomePost(row.dataset.boardPost);
    });
    el.boardPostList.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('[data-board-post]');
      if (!row) return;
      e.preventDefault();
      openHomePost(row.dataset.boardPost);
    });
  }
  const boardWrite = (id) => {
    const btn = $(id);
    btn && btn.addEventListener('click', () => openComposer(ui.groupSpaceId));
  };
  boardWrite('#btn-board-write');
  boardWrite('#btn-board-write-2');
  el.btnNoticeOpen && el.btnNoticeOpen.addEventListener('click', () => {
    if (ui.groupSpaceId) openNoticeSheet(ui.groupSpaceId);
  });
  /* Sprint 17 — 게시판에서 바로 사진 올리기 · 후기 모아보기 · 지난 공지 · 공지 읽음 */
  el.btnBoardPhoto && el.btnBoardPhoto.addEventListener('click', () => {
    if (!isGroupMode()) return;
    openComposer(ui.groupSpaceId);
    /* 게시판에서 '사진 올리기'를 누르면 곧바로 앨범이 열린다(사진부터 고르는 흐름). */
    setTimeout(() => {
      const album = $('#composer-photo-album');
      const row = $('#composer-photo-upload');
      if (row) row.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      if (album) album.click();
    }, 200);
  });
  el.btnBoardReview && el.btnBoardReview.addEventListener('click', () => {
    ui.boardTag = '후기';
    renderBoardPosts(homeGroup());
  });
  el.btnNoticeMore && el.btnNoticeMore.addEventListener('click', () => {
    ui.boardNoticeExpanded = !ui.boardNoticeExpanded;
    renderBoardNotices(homeGroup());
  });
  /* 공지 읽음 — 게시판 목록과 공지 시트 어디서 눌러도 같은 시트가 열린다. */
  document.addEventListener('click', (e) => {
    const row = e.target.closest('[data-notice-read]');
    if (row) openNoticeRead(row.dataset.noticeRead);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('[data-notice-read]');
    if (!row) return;
    e.preventDefault();
    openNoticeRead(row.dataset.noticeRead);
  });
  $('#btn-close-notice-read') && $('#btn-close-notice-read').addEventListener('click', () => closeModal(el.noticeReadModal));
  /* 표지 고르기 */
  $('#btn-close-cover') && $('#btn-close-cover').addEventListener('click', () => closeModal(el.coverModal));
  if (el.coverGrid) {
    el.coverGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cover-photo]');
      if (btn) toggleCoverPreset(btn.dataset.coverPhoto);
    });
  }
  $('#btn-cover-save') && $('#btn-cover-save').addEventListener('click', saveCover);
  $('#btn-cover-reset') && $('#btn-cover-reset').addEventListener('click', () => {
    const res = store.clearGroupCover(ui.coverGroupId);
    if (res.ok) { ui.coverDraft = (res.cover.photos || []).slice(0, 2); renderCoverGrid(); renderGallery(); }
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cover-open]');
    if (btn) openCoverPicker(btn.dataset.coverOpen);
  });

  /* ==========================================================================
   * Sprint 24 — 탐색 '내 프로필 올리기'
   * ------------------------------------------------------------------------
   * 11/17 00:30 루키 님: "토글을 켜는 순간 ① 어떤 만남을 찾을지 선택 ② 한줄소개 입력
   * 시트를 거쳐 올라가게, 올린 프로필은 2시간만 유지되고 2시간이 지나면 자동으로 꺼진다."
   *  · 대표 사진을 고르는 꾸미기는 없앴다(같은 지적).
   *  · 올린 상태에서는 토글 옆에 '만남 목적 · 1시간 59분 남음'만 남긴다.
   * ======================================================================== */
  function renderExploreProfileToggle() {
    if (!el.exploreProfileToggle) return;
    const pub = store.getMyExplorePublishState();
    el.exploreProfileToggle.setAttribute('aria-checked', String(pub.active));
    el.exploreProfileToggle.classList.toggle('on', pub.active);
    if (el.eppDesc) {
      el.eppDesc.textContent = pub.active
        ? `${pub.meetStyleLabel || '지금 번개'} · ${pub.remainingLabel}`
        : '';
    }
  }

  function renderPublishSheet() {
    if (!el.publishStyleList) return;
    const styles = store.getMeetStyles();
    const picked = ui.publishStyleId || 'now';
    el.publishStyleList.innerHTML = styles.map((s) => `
      <button class="composer-tag ${s.id === picked ? 'active' : ''}" data-publish-style="${s.id}" type="button"
              aria-pressed="${s.id === picked}">${s.name}</button>`).join('');
    const pub = store.getMyExplorePublishState();
    if (el.publishIntro && !ui.publishEditing) {
      el.publishIntro.value = pub.active ? (pub.intro || '') : '';
      ui.publishEditing = true;
    }
  }

  function openPublishSheet() {
    const pub = store.getMyExplorePublishState();
    ui.publishStyleId = (pub.active && pub.meetStyleId) || 'now';
    ui.publishEditing = false;
    renderPublishSheet();
    if (el.publishIntro) el.publishIntro.value = pub.intro || '';
    openModal(el.publishModal);
    setTimeout(() => el.publishIntro && el.publishIntro.focus({ preventScroll: true }), 160);
  }

  function submitPublishSheet() {
    const intro = el.publishIntro ? el.publishIntro.value.trim() : '';
    const res = store.publishMyExploreProfile({ meetStyleId: ui.publishStyleId, intro });
    if (!res.ok) {
      showToast('로그인한 뒤에 올릴 수 있어요', 'warning');
      return;
    }
    closeModal(el.publishModal);
    renderExploreProfileToggle();
    ui.exploreBuffer = null;
    renderExploreWithSkeleton();
    showToast(`내 프로필을 올렸어요 · ${res.publish.remainingLabel}`, 'success');
  }

  function setExploreProfileVisible(on) {
    if (on === false) {
      const res = store.unpublishMyExploreProfile();
      renderExploreProfileToggle();
      ui.exploreBuffer = null;
      renderExploreWithSkeleton();
      showToast('내 프로필을 탐색에서 내렸어요', 'info');
      return res;
    }
    openPublishSheet();
    return { ok: true, opened: true };
  }

  el.exploreProfileToggle && el.exploreProfileToggle.addEventListener('click', () => {
    if (store.isMyProfileExploreVisible()) { setExploreProfileVisible(false); return; }
    openPublishSheet();
  });

  el.publishStyleList && el.publishStyleList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-publish-style]');
    if (!btn) return;
    ui.publishStyleId = btn.dataset.publishStyle;
    renderPublishSheet();
  });
  el.publishConfirm && el.publishConfirm.addEventListener('click', submitPublishSheet);
  $('#btn-publish-cancel') && $('#btn-publish-cancel').addEventListener('click', () => closeModal(el.publishModal));
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-explore-profile-publish]')) openPublishSheet();
  });
  /* Sprint 26.5 — 프로필 올리기 줄의 글자도 버튼처럼(키보드 Enter·Space) */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('[data-explore-profile-publish]');
    if (!row) return;
    e.preventDefault();
    openPublishSheet();
  });

  /* 쪽지 보내기 */
  el.dmSend && el.dmSend.addEventListener('click', sendDm);
  $('#btn-dm-cancel') && $('#btn-dm-cancel').addEventListener('click', () => closeModal(el.dmComposeModal));
  el.dmMessage && el.dmMessage.addEventListener('input', () => {
    if (el.dmCaptionCount) el.dmCaptionCount.textContent = String(el.dmMessage.value.length);
  });
  el.dmScope && el.dmScope.addEventListener('click', (e) => {
    if (e.target.closest('#btn-dm-scope-all')) {
      exitGroupSpace();
      switchTab('tab-chat');
    }
  });

  /* ==================================================================
   * Sprint 17 — 디엠함 정렬/안 읽은 대화 · 쪽지 후 프로필 · 탐색 카드 · 계정
   * ================================================================== */
  if (el.dmViewSeg) {
    el.dmViewSeg.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dm-view]');
      if (!btn) return;
      ui.dmView = btn.dataset.dmView === 'group' ? 'group' : 'recent';
      renderChatRooms();
    });
  }
  el.dmUnreadToggle && el.dmUnreadToggle.addEventListener('click', () => {
    ui.dmUnreadOnly = !ui.dmUnreadOnly;
    renderChatRooms();
  });
  if (el.dmSentBanner) {
    el.dmSentBanner.addEventListener('click', (e) => {
      if (e.target.closest('[data-dm-sent-close]')) { ui.dmSent = null; renderDmSentBanner(); return; }
      const profile = e.target.closest('[data-dm-profile]');
      if (profile) {
        const id = profile.dataset.dmProfile;
        if (store.getMatchProfile(id)) openPersonDetail(id);
        else showToast('이 대화 상대는 모임 멤버예요 · 대화에서 프로필을 볼 수 있어요', 'info');
        return;
      }
      const room = e.target.closest('[data-dm-open-room]');
      if (room && room.dataset.dmOpenRoom) openChatRoom(room.dataset.dmOpenRoom);
    });
  }

  /* 계정 — 로그아웃 · 데이터 초기화 · 프로필 사진 등록/변경 · 스토리 보관함 */
  $('#menu-logout') && $('#menu-logout').addEventListener('click', () => {
    askConfirm('로그아웃할까요?', '이 기기에 계정과 프로필은 남고, 회원가입(로그인) 화면으로 돌아가요.', '로그아웃', runSignOut);
  });
  $('#menu-reset-data') && $('#menu-reset-data').addEventListener('click', () => {
    askConfirm('데이터를 초기화할까요?', '내 계정·모임·글·스토리·디엠·알림 기록이 모두 비워지고 회원가입부터 다시 시작해요. 되돌릴 수 없어요.',
      '초기화', runResetData);
  });
  /* Sprint 27.5 — 예시 데이터 비우기 / 다시 넣기 */
  $('#menu-sample-data') && $('#menu-sample-data').addEventListener('click', () => {
    const sum = store.getSampleSummary();
    askConfirm('예시 데이터를 비울까요?',
      `예시 모임 ${sum.counts.groups} · 사람 ${sum.counts.people} · 글 ${sum.counts.posts}만 사라지고, 내가 만든 모임·글·대화는 그대로 남아요.`, '비우기', runClearSampleData);
  });
  $('#menu-sample-restore') && $('#menu-sample-restore').addEventListener('click', () => runRestoreSampleData());
  $('#menu-story-archive') && $('#menu-story-archive').addEventListener('click', openStoryArchive);
  $('#menu-edit-photo') && $('#menu-edit-photo').addEventListener('click', () => {
    el.profilePhotoInput && el.profilePhotoInput.click();
  });
  el.profilePhotoInput && el.profilePhotoInput.addEventListener('change', () => {
    const file = el.profilePhotoInput.files && el.profilePhotoInput.files[0];
    if (!file) return;
    readImageFile(file, (url) => {
      store.updateProfilePhoto(url);
      paintMyAvatars();
      renderProfileHeader();
      renderHome();
      ui.exploreBuffer = null;
      renderExploreWithSkeleton();
      showToast('프로필 사진을 등록했어요');
    });
    el.profilePhotoInput.value = '';
  });
  el.confirmOk && el.confirmOk.addEventListener('click', () => {
    const fn = ui.confirmAction;
    ui.confirmAction = null;
    closeModal(el.confirmModal);
    if (fn) fn();
  });
  $('#btn-confirm-cancel') && $('#btn-confirm-cancel').addEventListener('click', () => {
    ui.confirmAction = null;
    closeModal(el.confirmModal);
  });

  /* ==================================================================
   * Sprint 17/22 — 회원가입 화면 이벤트(위임) — 스토리텔링 단계 이동·인증·사진
   * ================================================================== */
  if (el.onboardingBody) {
    el.onboardingBody.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      const id = target.id;
      if (id === 'ob-to-login') {
        ui.onboardingMode = 'login'; ui.onboardingStep = 0; ui.obError = '';
        renderOnboarding(); return;
      }
      if (id === 'ob-restart-signup') {
        store.clearEmailVerification();
        ui.onboardingMode = 'signup'; ui.onboardingStep = 0;
        ui.onboardingDraft = newOnboardingDraft(); ui.obError = ''; ui.obCode = null;
        renderOnboarding(); return;
      }
      if (id === 'ob-forgot') {
        ui.onboardingMode = 'reset'; ui.onboardingStep = 0;
        ui.onboardingDraft = newOnboardingDraft(); ui.obError = ''; ui.obCode = null;
        renderOnboarding(); return;
      }
      if (id === 'ob-next') { collectOnboardingInputs(); onboardingNext(); return; }
      if (id === 'ob-verify') { collectOnboardingInputs(); obVerifyCode(); return; }
      if (id === 'ob-resend') { collectOnboardingInputs(); obSendCode(); return; }
      if (id === 'ob-back') { collectOnboardingInputs(); onboardingBack(); return; }
      if (id === 'ob-submit') {
        collectOnboardingInputs();
        if (ui.onboardingMode === 'reset') submitPasswordReset(); else submitOnboarding();
        return;
      }
      if (id === 'ob-login-submit') { submitOnboardingLogin(); return; }
      if (id === 'ob-photo-album') { const node = obField('ob-photo-input'); if (node) node.click(); return; }
      if (id === 'ob-photo-camera-btn') { const node = obField('ob-photo-camera'); if (node) node.click(); return; }
      const swatch = target.closest('[data-ob-gradient]');
      if (swatch) {
        collectOnboardingInputs();
        const list = store.getOnboardingState().avatarGradients || [];
        const d = ui.onboardingDraft || (ui.onboardingDraft = newOnboardingDraft());
        d.avatarGradient = list[Number(swatch.dataset.obGradient)] || d.avatarGradient;
        d.photoUrl = null;
        renderOnboarding();
      }
    });
    el.onboardingBody.addEventListener('change', (e) => {
      const input = e.target.closest('#ob-photo-input, #ob-photo-camera');
      if (!input) return;
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      collectOnboardingInputs();
      readImageFile(file, (url) => {
        const d = ui.onboardingDraft || (ui.onboardingDraft = newOnboardingDraft());
        d.photoUrl = url;
        renderOnboarding();
        showToast('프로필 사진을 준비했어요', 'success');
      });
    });
    el.onboardingBody.addEventListener('input', (e) => {
      const node = e.target;
      if (node.id === 'ob-code') {
        node.value = String(node.value || '').replace(/\D/g, '').slice(0, 6);
      }
      if (node.id === 'ob-nickname') {
        const av = obField('ob-name-avatar');
        if (av) av.textContent = String(node.value || '').charAt(0) || '?';
      }
      if (node.id === 'ob-age') {
        const btn = obField('ob-next');
        if (btn) btn.textContent = String(node.value || '').trim() ? '다음' : '건너뛰기';
      }
    });
    el.onboardingBody.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const step = obStepId();
      collectOnboardingInputs();
      if (ui.onboardingMode === 'login') { submitOnboardingLogin(); return; }
      if (step === 'code' || step === 'reset-code') { obVerifyCode(); return; }
      if (ui.onboardingMode === 'reset') {
        if (step === 'reset-password') submitPasswordReset(); else onboardingNext();
        return;
      }
      if (step === 'region') { submitOnboarding(); return; }
      onboardingNext();
    });
  }

  /* ------------------------------------------------------------------
   * 홈 이벤트 배선 (Sprint 14) — 위임 한 곳에서 처리
   * ---------------------------------------------------------------- */
  function refreshHome() {
    if (ui.activeTab === 'tab-home') renderHome();
    updateBadges();
  }

  if (el.homeHero) {
    el.homeHero.addEventListener('click', (e) => {
      const chat = e.target.closest('[data-home-chat]');
      if (chat) { openGroupChat(chat.dataset.homeChat); return; }
      const write = e.target.closest('[data-home-write]');
      if (write) { openComposer(write.dataset.homeWrite); return; }
      const members = e.target.closest('[data-home-members]');
      if (members) { openGroupMembers(members.dataset.homeMembers); return; }
      if (e.target.closest('[data-home-find]')) focusHomeBrowse();
    });
  }

  if (el.homeEvents) {
    el.homeEvents.addEventListener('click', (e) => {
      const rsvp = e.target.closest('[data-rsvp-status]');
      if (rsvp) {
        const eventId = rsvp.dataset.rsvpEvent;
        const res = store.setGroupEventRsvp(eventId, rsvp.dataset.rsvpStatus);
        if (!res.ok) {
          showToast(res.reason === 'past' ? '지난 일정은 참석을 바꿀 수 없어요' : '참석 표시를 바꾸지 못했어요', 'warning');
          return;
        }
        renderHomeEvents(homeGroup());
        renderHomeHero(homeGroup());
        updateBadges();
        if (res.autoWait) {
          showToast(`정원이 찾아요 · 대기 ${res.summary.myWaitOrder || res.summary.maybe}순위로 들어갔어요`, 'info');
        } else if (res.promoted) {
          showToast(`자리가 나서 ${res.promoted.name}님이 참석으로 올라갔어요`, 'info');
        } else {
          const labels = { yes: '참석', maybe: '대기', no: '불참' };
          showToast(`'${labels[res.status] || res.status}'으로 표시했어요 · 참석 ${res.summary.yes}명`);
        }
        if (el.eventDetailModal && el.eventDetailModal.classList.contains('active') && ui.openEventId === eventId) {
          renderEventDetail(eventId);
        }
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
        return;
      }
      const openBtn = e.target.closest('[data-event-open]');
      if (openBtn) { openEventDetail(openBtn.dataset.eventOpen); return; }
      if (e.target.closest('[data-past-events]')) {
        ui.pastEventsOpen = !ui.pastEventsOpen;
        renderHomeEvents(homeGroup());
        return;
      }
      const newBtn = e.target.closest('[data-home-event-new]');
      if (newBtn) openEventForm(newBtn.dataset.homeEventNew);
    });
  }

  if (el.homeViewSeg) {
    el.homeViewSeg.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-home-view]');
      if (!btn) return;
      ui.homeView = btn.dataset.homeView;
      renderHomeFeed(homeGroup());
    });
  }

  if (el.homeTagChips) {
    el.homeTagChips.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-home-tag]');
      if (!chip) return;
      ui.homeTag = chip.dataset.homeTag || null;
      renderHomeFeed(homeGroup());
      if (el.main) el.main.scrollTop = 0;
    });
  }

  if (el.homePhotoGrid) {
    el.homePhotoGrid.addEventListener('click', (e) => {
      const write = e.target.closest('[data-home-write]');
      if (write) { openComposer(write.dataset.homeWrite); return; }
      const tile = e.target.closest('[data-home-post]');
      if (tile) openHomePost(tile.dataset.homePost);
    });
  }

  if (el.homeChatPreview) {
    el.homeChatPreview.addEventListener('click', (e) => {
      const open = e.target.closest('[data-home-chat]');
      if (open) openGroupChat(open.dataset.homeChat);
    });
  }

  el.homeChatOpen && el.homeChatOpen.addEventListener('click', () => openGroupChat(ui.homeGroupId || store.getHomeGroupId()));
  el.homeEventNew && el.homeEventNew.addEventListener('click', () => openEventForm(ui.homeGroupId || store.getHomeGroupId()));

  if (el.chatGroupRooms) {
    const openFromRow = (node) => { if (node) openGroupChat(node.dataset.homeChat); };
    el.chatGroupRooms.addEventListener('click', (e) => openFromRow(e.target.closest('[data-home-chat]')));
    el.chatGroupRooms.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('[data-home-chat]');
      if (!row) return;
      e.preventDefault();
      openFromRow(row);
    });
  }

  /* 단체 채팅 화면 */
  el.groupChatForm && el.groupChatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendGroupChatMessage();
  });
  const groupChatBack = $('#btn-group-chat-back');
  groupChatBack && groupChatBack.addEventListener('click', closeGroupChat);
  const groupChatInfo = $('#btn-group-chat-info');
  groupChatInfo && groupChatInfo.addEventListener('click', () => {
    const grp = store.getGroup(ui.openGroupChatId);
    if (!grp) return;
    closeGroupChat();
    openGroupDetail(grp.id);
  });

  /* 전체 멤버 시트 */
  if (el.membersBody) {
    el.membersBody.addEventListener('click', (e) => {
      const deputyBtn = e.target.closest('[data-member-deputy]');
      if (deputyBtn) {
        const memberId = deputyBtn.dataset.memberDeputy;
        const on = !store.isGroupDeputy(ui.membersGroupId, memberId);
        const res = store.setGroupDeputy(ui.membersGroupId, memberId, on);
        if (!res.ok) {
          const messages = { permission: '그룹장만 부방장을 지정할 수 있어요', leader: '그룹장은 부방장이 될 수 없어요', too_many: '부방장은 최대 5명까지 지정할 수 있어요' };
          showToast(messages[res.reason] || '부방장을 바꾸지 못했어요', 'warning');
          return;
        }
        renderMembersSheet();
        if (el.groupModal && el.groupModal.classList.contains('active')) {
          renderGroupDetail(store.getGroup(ui.membersGroupId));
        }
        showToast(res.designated
          ? `${res.member.name}님을 부방장으로 지정했어요 · 이제 공지를 쓸 수 있어요`
          : `${res.member.name}님의 부방장을 해제했어요`, 'info');
        return;
      }
      if (e.target.closest('[data-member-chat-locked]')) {
        showToast('이 모임은 그룹장이 1:1 대화를 꺼두었어요 · 모임 전체방을 이용해 주세요', 'info');
        return;
      }
      const chatBtn = e.target.closest('[data-member-chat]');
      if (chatBtn) { goMemberChat(ui.membersGroupId, chatBtn.dataset.memberChat); return; }
      const profileBtn = e.target.closest('[data-member-profile]');
      if (profileBtn) { goMemberProfile(ui.membersGroupId, profileBtn.dataset.memberProfile); return; }
      const row = e.target.closest('[data-member-open]');
      if (row) {
        ui.memberDetailId = ui.memberDetailId === row.dataset.memberOpen ? null : row.dataset.memberOpen;
        renderMembersSheet();
      }
    });
  }
  const membersClose = $('#btn-close-members');
  membersClose && membersClose.addEventListener('click', () => closeModal(el.membersModal));

  /* ---------------------------------------------------- 공지 바 → 공지 시트 */
  if (el.homeNoticeBar) {
    el.homeNoticeBar.addEventListener('click', (e) => {
      const open = e.target.closest('[data-notice-open]');
      if (open) openNoticeSheet(open.dataset.noticeOpen);
    });
  }

  if (el.noticeList) {
    el.noticeList.addEventListener('click', (e) => {
      const pin = e.target.closest('[data-notice-pin]');
      if (pin) {
        const notice = store.getGroupNotice(pin.dataset.noticePin);
        const res = store.setGroupNoticePinned(pin.dataset.noticePin, !(notice && notice.pinned));
        if (!res.ok) { showToast('공지를 고정할 권한이 없어요', 'warning'); return; }
        renderNoticeSheet();
        renderHomeNoticeBar(homeGroup());
        showToast(res.pinned ? '공지를 상단에 고정했어요' : '공지 고정을 풀었어요', 'info');
        return;
      }
      const edit = e.target.closest('[data-notice-edit]');
      if (edit) {
        ui.noticeEditingId = edit.dataset.noticeEdit;
        renderNoticeSheet();
        return;
      }
      if (e.target.closest('[data-notice-cancel]')) {
        ui.noticeEditingId = null;
        renderNoticeSheet();
        return;
      }
      const del = e.target.closest('[data-notice-delete]');
      if (del) {
        const res = store.deleteGroupNotice(del.dataset.noticeDelete);
        if (!res.ok) { showToast('공지를 삭제할 권한이 없어요', 'warning'); return; }
        renderNoticeSheet();
        renderHomeNoticeBar(homeGroup());
        showToast('공지를 삭제했어요', 'info');
      }
    });
    el.noticeList.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-notice-edit-form]');
      if (!form) return;
      e.preventDefault();
      const area = form.querySelector('textarea');
      const res = store.updateGroupNotice(form.dataset.noticeEditForm, area ? area.value : '');
      if (!res.ok) {
        showToast(res.reason === 'long' ? '공지는 120자까지 가능해요'
          : (res.reason === 'short' ? '공지를 2자 이상 적어주세요' : '공지를 수정할 권한이 없어요'), 'warning');
        return;
      }
      ui.noticeEditingId = null;
      renderNoticeSheet();
      renderHomeNoticeBar(homeGroup());
      showToast('공지를 수정했어요');
    });
  }

  if (el.noticeEditor) {
    el.noticeEditor.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-notice-form]');
      if (!form) return;
      e.preventDefault();
      const area = form.querySelector('.notice-input');
      const pin = form.querySelector('.notice-pin-input');
      const res = store.createGroupNotice(form.dataset.noticeForm, area ? area.value : '', { pinned: !!(pin && pin.checked) });
      if (!res.ok) {
        const messages = {
          permission: '그룹장과 부방장만 공지를 쓸 수 있어요',
          short: '공지를 2자 이상 적어주세요',
          long: '공지는 120자까지 가능해요'
        };
        showToast(messages[res.reason] || '공지를 올리지 못했어요', 'warning');
        return;
      }
      renderNoticeSheet();
      renderHomeNoticeBar(homeGroup());
      showToast('공지를 올렸어요');
    });
  }

  const noticeClose = $('#btn-close-notice');
  noticeClose && noticeClose.addEventListener('click', () => closeModal(el.noticeModal));

  /* ------------------------------------------------ 일정 상세 시트 이벤트 */
  if (el.eventDetailBody) {
    el.eventDetailBody.addEventListener('click', (e) => {
      const rsvp = e.target.closest('[data-rsvp-status]');
      if (!rsvp) return;
      const eventId = rsvp.dataset.rsvpEvent;
      const res = store.setGroupEventRsvp(eventId, rsvp.dataset.rsvpStatus);
      if (!res.ok) { showToast('참석 표시를 바꾸지 못했어요', 'warning'); return; }
      renderEventDetail(eventId);
      renderHomeEvents(homeGroup());
      renderHomeHero(homeGroup());
      updateBadges();
      if (res.autoWait) showToast(`정원이 찾아요 · 대기 ${res.summary.myWaitOrder || res.summary.maybe}순위로 들어갔어요`, 'info');
      else if (res.promoted) showToast(`자리가 나서 ${res.promoted.name}님이 참석으로 올라갔어요`, 'info');
      else showToast('참석 표시를 바꿨어요');
    });
  }
  const eventDetailClose = $('#btn-close-event-detail');
  eventDetailClose && eventDetailClose.addEventListener('click', () => closeModal(el.eventDetailModal));

  /* 일정 만들기 폼 */
  if (el.eventKinds) {
    el.eventKinds.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-event-kind]');
      if (!chip) return;
      ui.eventDraft.kind = chip.dataset.eventKind;
      renderEventForm();
    });
  }
  if (el.eventQuickWhen) {
    el.eventQuickWhen.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-event-quick]');
      if (!chip) return;
      applyQuickWhen(chip.dataset.eventQuick);
    });
  }
  [el.eventTitle, el.eventDate, el.eventTime].forEach((node) => {
    node && node.addEventListener('input', () => {
      if (el.eventSubmit) el.eventSubmit.disabled = !(el.eventTitle && el.eventTitle.value.trim().length >= 2 && eventDraftIso());
    });
  });
  el.eventSubmit && el.eventSubmit.addEventListener('click', submitGroupEvent);
  const eventCancel = $('#btn-event-cancel');
  eventCancel && eventCancel.addEventListener('click', () => closeModal(el.eventModal));

  /* 모임 사진 상세(피드 글) — 좋아요·댓글 */
  if (el.postBody) {
    el.postBody.addEventListener('click', (e) => {
      const likeBtn = e.target.closest('[data-feed-post-like]');
      if (likeBtn) {
        const res = store.toggleLike(likeBtn.dataset.feedPostLike);
        if (!res) return;
        renderGroupPostDetail(likeBtn.dataset.feedPostLike);
        if (ui.activeTab === 'tab-home') renderHomeFeed(homeGroup());
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
        return;
      }
      const groupBtn = e.target.closest('[data-feed-post-group]');
      if (groupBtn) {
        closeModal(el.postModal);
        openGroupDetail(groupBtn.dataset.feedPostGroup);
      }
    });
    el.postBody.addEventListener('input', (e) => {
      const input = e.target.closest('[data-feed-comment-form] .comment-input');
      if (!input) return;
      const submit = input.closest('form').querySelector('.comment-submit');
      if (submit) submit.disabled = input.value.trim().length === 0;
    });
    el.postBody.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-feed-comment-form]');
      if (!form) return;
      e.preventDefault();
      const input = form.querySelector('.comment-input');
      const comment = store.addComment(form.dataset.feedCommentForm, input ? input.value : '');
      if (!comment) { showToast('댓글을 남기지 못했어요', 'warning'); return; }
      renderGroupPostDetail(form.dataset.feedCommentForm);
      if (ui.activeTab === 'tab-home') renderHomeFeed(homeGroup());
      showToast('댓글을 남겼어요');
    });
  }

  /* ==========================================================================
   * 2. 탐색 탭 — 토스쇼핑형 2열 메이슨리 (사람 카드 + 소모임 카드)
   * ------------------------------------------------------------------------
   *  · store.getExploreFeed()가 사람·모임을 타입 교차로 섞어 주면, 화면은
   *    '더 짧은 열 먼저' 넣는 그리디로 2열에 배분한다. 카드 높이가 제각각이어도
   *    아래가 비지 않고 퍼즐처럼 맞물린다 (토스쇼핑 스타일).
   *  · 사람 카드: 미디어가 카드 전체를 채우고(3:4·4:5·1:1) 하단 그라디언트 위에
   *    닉네임·나이·거리·활동 시간대, 좌상단 취미 배지, 우하단 퀵 하트.
   *  · 소모임 카드: 화이트 카드 + 커버 일러스트 + 에메랄드 '소모임' 배지 + 참여 버튼.
   *  · 적합도 %, 매칭 이유 같은 수치·문구는 Sprint 3.5에서 전면 삭제했다.
   * ======================================================================== */

  /** 카드 예상 높이(열 폭 = 1). 짧은 열부터 채우는 배분에만 쓴다. */
  const CARD_HEIGHT_UNITS = {
    person: { tall: 1.34, mid: 1.25, square: 1.0 },
    group: { wide: 1.24, square: 1.50 },
    post: { wide: 1.34, square: 1.56 }
  };

  function cardHeightUnits(item) {
    const table = CARD_HEIGHT_UNITS[item.type] || CARD_HEIGHT_UNITS.person;
    return table[item.ratio] || Object.values(table)[0] || 1.2;
  }

  /* ==========================================================================
   * 2-0. Sprint 9 — 탐색 필터 UI 대폭 단순화
   * ------------------------------------------------------------------------
   *  11/15 00:23 사용자 지시: "탐색에 카테고리 선택이 너무 많은데 복잡해".
   *   · 상단에는 **핵심 1줄**만: 종류 세그먼트(전체/사람/모임/글) + 지역 + 필터(N).
   *   · 취미·나이·반경 칩은 통합 필터 시트로 접었다. 시트에서 고른 값은 드래프트로 두고
   *     [적용하기]를 눌렀을 때만 탐색에 반영한다(여러 조건을 한 번에 바꿀 수 있게).
   *   · 적용된 세부 조건은 상단에 작은 칩 1줄로만 남기고, 칩을 누르면 그 조건만 해제된다.
   *   · 기능은 그대로다: 취미 8종 · 나이 6종(내 나이 맞춤) · 반경 5종 · 지역 9생활권 ·
   *     상태 기억(store.explorePrefs) · 빈 상태 안내.
   * ======================================================================== */

  /** 상단 종류 세그먼트 — 전체 / 사람 / 글 (Sprint 22: 모임은 홈으로 옮겼다) */
  function renderExploreTypeSeg() {
    if (!el.exploreTypeSeg) return;
    const names = { all: '전체', people: '사람', posts: '글' };
    el.exploreTypeSeg.innerHTML = store.getExploreTypeFilters().map((f) => {
      const on = ui.exploreFilter === f.id;
      return `<button class="explore-type-btn ${on ? 'active' : ''}" data-explore-filter="${f.id}"
                      aria-pressed="${on}" type="button">${escapeHtml(names[f.id] || f.name)}</button>`;
    }).join('');
  }

  /**
   * 칩이 보여줄 조건 — 시트가 열려 있으면 **드래프트**(아직 적용 전), 닫혀 있으면 적용 상태.
   * 덕분에 시트를 열지 않은 화면에서도 칩의 aria-pressed 가 실제 조건과 어긋나지 않는다.
   */
  function draftOrApplied() {
    if (ui.filterSheetOpen && ui.filterDraft) return ui.filterDraft;
    return { filter: ui.exploreFilter, age: ui.exploreAge, region: ui.exploreRegion };
  }

  /**
   * Sprint 25 — 지역 가로 칩 줄(상단·필터 시트 공용).
   *  이반시티 '우리동네'처럼 [전체][서울][경기]…[베어] 를 왼쪽에서 오른쪽으로 넘겨 고르고,
   *  큰 분류를 고르면 바로 아래 줄에 그 하위 권역이 같은 방식으로 펼쳐진다.
   * @param {HTMLElement} chipsEl 큰 분류 칩을 그릴 곳
   * @param {HTMLElement} subEl 하위 권역 칩을 그릴 곳
   * @param {string} region 지금 고른 지역 id
   * @param {(id:string)=>string} dataAttr 칩의 data 속성 이름
   */
  /**
   * Sprint 25 — 가로 칩 줄이 화면보다 길 때만 오른쪽을 부드럽게 흐려 '더 있다'를 알린다.
   *  (짧은 줄까지 흐려지면 마지막 칩이 흐린 것처럼 보인다.)
   */
  function markChipScroller(node) {
    if (!node) return;
    const apply = () => {
      const more = node.scrollWidth - node.clientWidth - node.scrollLeft > 4;
      node.classList.toggle('is-scrollable', more);
    };
    apply();
    if (node.dataset.scrollBound !== '1') {
      node.dataset.scrollBound = '1';
      node.addEventListener('scroll', apply, { passive: true });
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(apply).observe(node);
    }
    requestAnimationFrame(apply);
  }

  function paintRegionChips(chipsEl, subEl, region) {
    if (!chipsEl) return;
    const selected = store.getRegion(region);
    const selectedGroupId = selected ? (selected.group ? selected.id : selected.groupId) : null;
    const chips = store.getExploreRegionChips(ui.exploreFilter, ui.exploreQuery, ui.exploreAge);
    chipsEl.innerHTML = chips.map((c) => {
      const on = c.id === 'all' ? region === 'all' : (c.group ? selectedGroupId === c.id : region === c.id);
      return `<button class="explore-region-chip ${on ? 'active' : ''}" data-region-chip="${escapeHtml(c.id)}"
                      type="button" aria-pressed="${on}">
                ${ic(c.icon || (c.id === 'all' ? 'grid' : 'pin'))}
                <span>${escapeHtml(c.name)}</span>
                <span class="explore-region-chip-count${c.count ? '' : ' is-zero'}">${c.count}</span>
              </button>`;
    }).join('');
    keepChipVisible(chipsEl, '.explore-region-chip.active');
    markChipScroller(chipsEl);

    /* 하위 권역이 둘 이상인 큰 분류만 둘째 줄 — [전체] + 권역들 (제주·해외·베어는 없음) */
    if (!subEl) return;
    const subs = selectedGroupId ? store.getSubRegions(selectedGroupId) : [];
    if (subs.length > 1) {
      subEl.hidden = false;
      subEl.innerHTML = [
        `<button class="explore-sub-chip ${region === selectedGroupId ? 'active' : ''}"
                 data-region-sub="${escapeHtml(selectedGroupId)}" type="button"
                 aria-pressed="${region === selectedGroupId}">전체</button>`,
        ...subs.map((r) => `<button class="explore-sub-chip ${region === r.id ? 'active' : ''}"
                 data-region-sub="${escapeHtml(r.id)}" type="button"
                 aria-pressed="${region === r.id}">${escapeHtml(r.name)}</button>`)
      ].join('');
      keepChipVisible(subEl, '.explore-sub-chip.active');
      markChipScroller(subEl);
    } else {
      subEl.hidden = true;
      subEl.innerHTML = '';
    }
  }

  /** Sprint 16 — 0~99세 듀얼 레인지 슬라이더의 바늘·폭·문구를 맞춘다. */
  function renderAgeRange() {
    const range = store.getExploreAgeRange();
    ui.ageMin = range.min;
    ui.ageMax = range.max;
    if (el.ageRangeMin && String(el.ageRangeMin.value) !== String(range.min)) el.ageRangeMin.value = String(range.min);
    if (el.ageRangeMax && String(el.ageRangeMax.value) !== String(range.max)) el.ageRangeMax.value = String(range.max);
    if (el.ageRangeFill) {
      el.ageRangeFill.style.left = `${range.min}%`;
      el.ageRangeFill.style.width = `${Math.max(0, range.max - range.min)}%`;
    }
    if (el.ageRangeLabel) {
      el.ageRangeLabel.textContent = range.active ? `나이 ${range.min}~${range.max}세` : '나이 0~99세 (전체)';
    }
    if (el.btnAgeClear) el.btnAgeClear.hidden = !range.active;
    if (el.filterAgeNote) {
      el.filterAgeNote.textContent = range.active
        ? `${range.min}~${range.max}세만`
        : '';
    }
  }

  /** 슬라이더를 끌 때 — 두 바늘이 서로를 넘지 않게 하고 바로 저장(기억)한다. */
  function applyAgeRange(lo, hi, options = {}) {
    const min = Math.max(0, Math.min(99, Number(lo)));
    const max = Math.max(0, Math.min(99, Number(hi)));
    if (Number.isNaN(min) || Number.isNaN(max)) return;
    const left = Math.min(min, max);
    const right = Math.max(min, max);
    store.setExploreAgeRange(left, right);
    ui.ageMin = left;
    ui.ageMax = right;
    renderAgeRange();
    if (options.commit === false) return;
    ui.exploreBuffer = null;
    if (el.main && ui.activeTab === 'tab-explore') el.main.scrollTop = 0;
    renderExploreWithSkeleton();
    const range = store.getExploreAgeRange();
    showToast(range.active ? `나이 ${range.min}~${range.max}세로 볼게요` : '나이 조건 없이 전체를 볼게요', 'info');
  }

  /** 지금 적용된 세부 조건(나이·내 주변) — 상단 요약 칩과 필터 배지가 함께 쓴다.
   *  Sprint 25 — 지역은 바로 위 가로 칩에, 나이는 시트에 있다. 같은 말을 두 번 하지 않는다. */
  function activeFilterChips() {
    const list = [];
    const range = store.getExploreAgeRange();
    if (range.active) list.push({ key: 'age', icon: 'cake', name: `${range.min}~${range.max}세` });
    if (ui.exploreRegion !== 'all') {
      list.push({ key: 'region', icon: ui.exploreRegion === 'nearby' ? 'walk' : 'pin',
        name: store.getRegionLabel(ui.exploreRegion) });
    }
    return list;
  }

  /** 상단 1줄(종류 세그먼트·필터 버튼) + 지역 가로 칩 + 적용 조건 1줄을 다시 그린다. */
  function renderExploreToolbar() {
    renderExploreTypeSeg();
    paintRegionChips(el.exploreRegionChips, el.exploreRegionSub, ui.exploreRegion);
    renderExploreSummary();
    const chips = activeFilterChips();
    if (el.exploreFilterCount) {
      el.exploreFilterCount.textContent = String(chips.length);
      el.exploreFilterCount.hidden = chips.length === 0;
    }
    if (el.exploreFilterBtn) {
      el.exploreFilterBtn.classList.toggle('is-filtering', chips.length > 0);
      el.exploreFilterBtn.setAttribute('aria-label',
        chips.length ? `상세 필터 열기 · ${chips.length}개 조건 적용됨` : '상세 필터 열기');
    }
    if (!el.exploreActiveFilters) return;
    if (!chips.length) {
      el.exploreActiveFilters.hidden = true;
      el.exploreActiveFilters.innerHTML = '';
      ui.filterChipKeys = [];
      return;
    }
    el.exploreActiveFilters.hidden = false;
    /* Sprint 10 — 방금 새로 붙은 조건 칩만 살짝 등장시킨다(재렌더에도 잠시 유지). */
    const flashKeys = ui.filterChipFlash && ui.filterChipFlash.until > Date.now()
      ? ui.filterChipFlash.keys : [];
    el.exploreActiveFilters.innerHTML = chips.map((c) => `
        <button class="active-filter-chip${flashKeys.includes(c.key) ? ' is-new' : ''}" type="button" data-filter-clear="${c.key}"
                aria-label="${escapeHtml(c.name)} 조건 해제">
          <span class="active-filter-chip-emoji" aria-hidden="true">${ic(c.icon)}</span>
          <span>${escapeHtml(c.name)}</span>
          <span class="active-filter-x" aria-hidden="true">×</span>
        </button>`).join('')
      + (chips.length > 1
        ? '<button class="active-filter-reset" type="button" data-filter-clear="all">모두 해제</button>'
        : '');
    ui.filterChipKeys = chips.map((c) => c.key);
  }

  /* ---------------------------------------------------- 통합 필터 시트(드래프트) */

  /** 시트를 지금 적용 상태로 되돌려 놓고 연다. */
  function openFilterSheet() {
    if (!el.filterModal) return;
    ui.filterDraft = { filter: ui.exploreFilter, age: ui.exploreAge, region: ui.exploreRegion };
    ui.filterSheetOpen = true;
    renderFilterSheet();
    if (el.exploreFilterBtn) el.exploreFilterBtn.setAttribute('aria-expanded', 'true');
    openModal(el.filterModal);
  }

  function closeFilterSheet() {
    ui.filterSheetOpen = false;
    if (el.exploreFilterBtn) el.exploreFilterBtn.setAttribute('aria-expanded', 'false');
    if (el.filterModal && el.filterModal.classList.contains('active')) closeModal(el.filterModal);
  }

  function renderFilterSheet() {
    const draft = draftOrApplied();
    paintRegionChips(el.filterRegionChips, el.filterRegionSub, draft.region);
    if (el.filterNearbyChip) {
      const on = draft.region === 'nearby';
      el.filterNearbyChip.classList.toggle('active', on);
      el.filterNearbyChip.setAttribute('aria-pressed', on);
    }
    renderAgeRange();
    updateFilterPreview();
  }

  /** 적용 전에 "이 조건이면 카드 N장"을 미리 보여준다. */
  function updateFilterPreview() {
    const draft = draftOrApplied();
    const items = store.getExploreFeed(draft.filter, ui.exploreQuery, null, draft.age, draft.region) || [];
    if (el.filterResult) {
      el.filterResult.textContent = items.length
        ? `이 조건이면 카드 ${items.length}장`
        : '이 조건에 맞는 카드가 없어요';
      el.filterResult.classList.toggle('is-empty', items.length === 0);
    }
    if (el.filterApply) el.filterApply.textContent = items.length ? `적용하기 · ${items.length}장` : '적용하기';
    /* Sprint 10 — 시트에서 무언가 바뀌었으면 [적용하기]가 눈에 띄게(dirty). */
    const dirty = draft.age !== ui.exploreAge || draft.region !== ui.exploreRegion;
    if (el.filterApply) {
      el.filterApply.classList.toggle('is-dirty', dirty);
      el.filterApply.dataset.dirty = dirty ? 'true' : 'false';
    }
    /* 결과 문구를 살짝 반짝여 조건을 바꾼 것을 알아채게 한다. */
    if (el.filterResult && ui.filterSheetOpen) {
      el.filterResult.classList.remove('flash');
      void el.filterResult.offsetWidth;
      el.filterResult.classList.add('flash');
    }
  }

  /** 시트 안 칩 하나를 드래프트에서 켜고/끈다(같은 칩을 다시 누르면 전체로). */
  function toggleFilterDraft(key, value) {
    const draft = draftOrApplied();
    const current = draft[key];
    const next = current === value && value !== 'all' ? 'all' : value;
    ui.filterDraft = { ...draft, [key]: next };
    renderFilterSheet();
  }

  /** [적용하기] — 시트에서 고른 조건(지역·나이)을 한 번에 반영하고 저장(기억)한다. */
  function applyFilterDraft() {
    const draft = draftOrApplied();
    if (draft.age !== ui.exploreAge || draft.region !== ui.exploreRegion) {
      /* Sprint 10 — 적용 전/후 조건을 비교해 '새로 붙은 칩'만 반짝이게 표시해 둔다. */
      const beforeKeys = activeFilterChips().map((c) => c.key);
      ui.exploreAge = draft.age;
      ui.exploreRegion = draft.region;
      ui.exploreBuffer = null;
      const newKeys = activeFilterChips().map((c) => c.key).filter((k) => !beforeKeys.includes(k));
      ui.filterChipFlash = newKeys.length ? { keys: newKeys, until: Date.now() + 900 } : null;
      store.updateExplorePrefs({ age: draft.age, region: draft.region });
      closeFilterSheet();
      if (el.main) el.main.scrollTop = 0;
      renderExploreWithSkeleton();
      const chips = activeFilterChips();
      const regionLabel = store.getRegionLabel(ui.exploreRegion);
      showToast(chips.length
        ? `${regionLabel} · ${chips.map((c) => c.name).join(' · ')}`
        : '모든 조건을 풀고 전체 탐색으로 돌아왔어요', 'info');
      return;
    }
    closeFilterSheet();
    showToast('필터를 그대로 뒀어요', 'info');
  }

  /** [초기화] — 시트 안의 드래프트만 비운다(적용은 [적용하기]에서). */
  function resetFilterDraft() {
    ui.filterDraft = { filter: 'all', age: 'all', region: 'all' };
    renderFilterSheet();
  }

  /** 상단 요약 칩에서 조건 하나만 해제 — 바로 적용된다. */
  function clearFilterCondition(key) {
    if (key === 'all') {
      ui.exploreFilter = 'all';
      ui.exploreAge = 'all';
      ui.exploreRegion = 'all';
      ui.exploreBuffer = null;
      store.updateExplorePrefs({ filter: 'all', age: 'all', region: 'all' });
      /* Sprint 16 — 나이 범위도 함께 0~99 로 되돌린다 */
      store.setExploreAgeRange(0, 99);
      renderAgeRange();
      if (el.main) el.main.scrollTop = 0;
      renderExplore();
      renderExploreToolbar();
      showToast('세부 조건을 모두 해제했어요', 'info');
      return;
    }
    if (key === 'age') {
      ui.exploreAge = 'all';
      /* Sprint 16 — 나이 조건 해제는 0~99 로 되돌린다 */
      store.setExploreAgeRange(0, 99);
      renderAgeRange();
      store.updateExplorePrefs({ age: 'all' });
    } else if (key === 'region') {
      ui.exploreRegion = 'all';
      store.updateExplorePrefs({ region: 'all' });
    }
    ui.exploreBuffer = null;
    if (el.main) el.main.scrollTop = 0;
    renderExploreWithSkeleton();
  }

  /** 거리 표기(1km 미만은 m) — 사람·모임·글 카드가 같은 자를 쓴다. */
  function distLabel(km) {
    return km == null ? '' : store.formatDistance(km);
  }

  /**
   * 빈 상태 — Sprint 18: 기본 일러스트(예시 그림)를 모두 없앴다.
   *  · 빈 화면에는 그림 대신 **한 줄 안내와 다음 행동 버튼**만 둔다(깔끔한 텍스트 중심).
   *  · kind 는 호출부 호환을 위해 남겨 두되 그림은 그리지 않는다.
   */
  function emptyArt(kind) {
    return '';
  }

  /** 가로 스크롤 칩 줄에서 선택된 칩이 잘려 보이지 않게 최소한만 스크롤한다. */
  function keepChipVisible(box, selector) {
    if (!box) return;
    const active = box.querySelector(selector);
    if (!active) return;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    if (left < box.scrollLeft) box.scrollLeft = Math.max(0, left - 4);
    else if (right > box.scrollLeft + box.clientWidth) box.scrollLeft = right - box.clientWidth + 4;
  }

  /* ------------------------------------------------------------ 사람 카드 */
  function personCardHTML(item) {
    const p = item.profile;
    const liked = store.isProfileLiked(p.id);
    const matched = !!store.findChatRoomByPartner(p.id);
    return `
      <article class="masonry-card person-card ratio-${item.ratio} ${liked ? 'is-liked' : ''}"
               data-person-id="${p.id}" data-card-type="person" role="button" tabindex="0"
               aria-label="${escapeHtml(p.nickname)} ${p.age}세 · ${escapeHtml(p.hobbyStyle)} 프로필 보기">
        <div class="person-media">
          ${p.photoUrl
            ? `<img class="person-photo-img" src="${escapeHtml(p.photoUrl)}" alt="${escapeHtml(p.nickname)} 프로필 사진" loading="lazy" decoding="async">`
            : `<span class="person-photo-empty" style="background:${p.avatarGradient || 'linear-gradient(135deg,#10B981,#047857)'}" aria-hidden="true">${escapeHtml(p.avatarText || String(p.nickname).charAt(0))}</span>`}
          <span class="person-badge">${p.badge ? escapeHtml(p.badge) : `${ic(p.hobbyIcon)} ${escapeHtml(p.hobbyLabel)}`}</span>
          <span class="person-fade" aria-hidden="true"></span>
          <div class="person-info">
            <div class="person-name-row">
              <span class="person-name">${escapeHtml(p.nickname)}</span>
              <span class="person-age">${p.age}</span>
              ${p.verified ? `<span class="person-verified" title="취미 인증 완료" aria-label="취미 인증 완료">${ic('check')}</span>` : ''}
            </div>
            <span class="person-meta">${escapeHtml(p.location)}${item.distanceKm != null ? ` · ${distLabel(item.distanceKm)}` : ''}</span>
            <span class="person-meta person-cycle">${ic(p.cycleIcon)} ${escapeHtml(p.cycle)}</span>
            ${p.isMe && p.meetStyleLabel
              ? `<span class="person-publish">${escapeHtml(p.meetStyleLabel)}${p.intro ? ` · ${escapeHtml(p.intro)}` : ''}</span>`
              : ''}
          </div>
          <button class="quick-like ${liked ? 'liked' : ''}" data-like-person="${p.id}"
                  aria-pressed="${liked}" type="button"
                  aria-label="${escapeHtml(p.nickname)}님에게 ${liked ? '보낸 관심 취소' : '좋아요 보내기'}">
            ${HEART_SVG(liked)}
          </button>
          <button class="card-dm" data-dm-person="${p.id}" type="button"
                  aria-label="${escapeHtml(p.nickname)}님에게 쪽지 보내기">쪽지</button>
          ${matched ? '<span class="person-matched">대화 중</span>' : ''}
        </div>
      </article>`;
  }

  /* ---------------------------------------------------------- 소모임 카드 */
  function groupTileHTML(item) {
    const g = item.group;
    const joinState = store.getJoinState(g.id);
    const isMine = store.isGroupLeader(g.id);
    const badges = store.getGroupPolicyBadges(g.id);
    /* Sprint 5 — 나이 제한은 카드 '겉면'(커버 우상단)에 크게 붙여 한눈에 보이게 한다.
       11/14 03:01 피드백: '2030만' · '20대만' · '30대+' 표기를 그대로 유지/강조. */
    const ageBadge = store.getGroupAgeBadge(g.id);
    const ageEligible = store.isAgeEligible(g.id).ok;
    const joinLabel = joinState === 'member' ? `${ic('check')} 가입중`
      : joinState === 'pending' ? `${ic('hourglass')} 승인 대기`
        : (store.isGroupFull(g.id) ? '정원 마감'
          : (store.getGroupJoinMode(g) === 'approval' ? '가입 신청' : '참여하기'));
    /* Sprint 21 — 사진 없는 모임 표지는 취미 대분류 색조로 (한눈에 모임 성격이 드러나게) */
    const tone = store.getHobbyTone(g.hobbyId || g.category);
    const coverBg = g.photoUrl ? null : store.getHobbyCoverGradient(g.hobbyId || g.category);
    return `
      <article class="masonry-card group-tile tone-${escapeHtml(tone)} ratio-${item.ratio}"
               data-group-id="${g.id}" data-card-type="group" role="button" tabindex="0"
               data-age-limit="${escapeHtml(g.ageLimit || 'all')}"
               aria-label="${escapeHtml(g.name)} 소모임 상세 보기${ageBadge ? ` · ${escapeHtml(ageBadge.text)} 가입` : ''}">
        <div class="group-tile-cover"${coverBg ? ` style="background:${coverBg}"` : ''}>
          ${g.photoUrl
            ? `<img class="group-tile-photo" src="${escapeHtml(g.photoUrl)}" alt="" loading="lazy" decoding="async">`
            : `<span class="group-tile-emoji" aria-hidden="true">${ic(g.icon || 'dot')}</span>`}
          <span class="group-tile-badge">소모임</span>
          ${ageBadge
            ? `<span class="group-age-badge age-${escapeHtml(ageBadge.tone)} ${ageEligible ? '' : 'is-blocked'}"
                     title="${escapeHtml(ageBadge.label)} 가입">
                 ${escapeHtml(ageBadge.text)}
               </span>`
            : ''}
          ${isMine ? '<span class="group-tile-crown" aria-label="내가 그룹장">내 모임</span>' : ''}
        </div>
        <div class="group-tile-body">
          <h4 class="group-tile-name">${escapeHtml(g.name)}</h4>
          <p class="group-tile-member">멤버 ${g.memberCount}명 활동 중</p>
          <p class="group-tile-meta">${escapeHtml(g.location)}${item.distanceKm != null ? ` · ${distLabel(item.distanceKm)}` : ''}</p>
          <p class="group-tile-meta group-tile-meet">${escapeHtml(g.meetLabel || g.categoryName)}</p>
          <div class="group-tile-policy">
            ${badges.map((b) => `<span class="group-tile-pill ${b.kind === 'age' ? 'age-pill' : ''}">${escapeHtml(b.label)}</span>`).join('')}
            ${joinState === 'pending' ? `<span class="group-tile-pill pending-pill">${ic('hourglass')} 승인 대기</span>` : ''}
          </div>
          <div class="group-tile-foot">
            <span class="group-tile-cat">${ic(g.icon)} ${escapeHtml(g.categoryName)}</span>
            <button class="group-tile-join ${joinState !== 'none' ? 'joined' : ''}" data-group-open="${g.id}" type="button">
              ${joinLabel}
            </button>
          </div>
        </div>
      </article>`;
  }

  /* ---------------------------------------------------------- 게시글 카드 */
  /**
   * Sprint 13 — 겉면은 사진·제목·핵심 메타만.
   *  · 사진이 있는 글: 본문을 카드에서 감추고 상세 시트에서 전문을 읽는다.
   *  · 글만 있는 글: 사진이 없으니 본문 미리보기를 그대로 남긴다(빈 카드가 되지 않게).
   * 11/15 03:37 사용자: "사진이있는 게시글 … 굳이 본문의 글을 다 보여야 하나?"
   */
  /** 카드 겉면에 남길 '첫 문장' — 첫 줄에서 마침표/물음표까지, 길면 60자에서 자른다. */
  function firstSentence(text) {
    const line = String(text || '').trim().split(/\n/)[0].trim();
    if (!line) return '';
    const hit = line.match(/^(.{1,90}?[.!?…。])(\s|$)/);
    const cut = hit ? hit[1] : line;
    return cut.length > 60 ? `${cut.slice(0, 60).trim()}…` : cut;
  }

  /** 글의 만남 스타일 — meetStyleLabel → (옛 글) 취미 라벨 순으로 읽는다. */
  function postStyleLabel(post) {
    return (post && (post.meetStyleLabel || post.hobbyLabel)) || '동네 글';
  }

  /** 글의 동네 이름 — '서울 · 성수·성동·동작' 처럼 큰 분류까지. */
  function postRegionLabel(post) {
    const id = store.getExplorePostRegionId(post);
    return id ? store.getRegionLabel(id) : '전체 지역';
  }

  function explorePostCardHTML(item) {
    const p = item.post;
    const hasMedia = !!p.photoUrl;
    const caption = (p.caption || '').trim();
    const preview = firstSentence(caption);
    const regionName = postRegionLabel(p);
    const styleName = postStyleLabel(p);
    const styleDef = p.meetStyle ? store.getMeetStyle(p.meetStyle) : null;
    /* Sprint 24 — 한 줄 리스트: 제목(첫 문장) · 지역 배지 · 만남 태그 · 시간/좋아요/댓글.
       사진이 있으면 오른쪽에 작은 썸네일만 붙는다(2열 카드 그리드가 아니라 게시판 행). */
    return `
      <article class="masonry-card post-card board-row ${p.likedByMe ? 'is-liked' : ''} ${hasMedia ? 'has-media' : 'is-text-only'}"
               data-post-card="${p.id}" data-card-type="post" data-has-media="${hasMedia ? '1' : '0'}"
               data-region-id="${escapeHtml(store.getExplorePostRegionId(p) || '')}"
               role="button" tabindex="0"
               aria-label="${escapeHtml(regionName)} · ${escapeHtml(p.authorName)}님의 ${escapeHtml(styleName)} 글 · ${escapeHtml(preview.slice(0, 34))}${hasMedia ? ' · 첫 문장만 보이고 본문은 상세에서' : ''}">
        <span class="board-row-body">
          <header class="post-head">
            <span class="post-avatar" style="background:${p.authorGradient}">${escapeHtml(p.authorAvatarText || p.authorName.charAt(0))}</span>
            <div class="post-author-block">
              <span class="post-author">${escapeHtml(p.authorName)}${p.isMine ? ' <span class="me-badge">나</span>' : ''}</span>
              <span class="post-meta">
                ${p.tag ? `<span class="post-tag">#${escapeHtml(p.tag)}</span>` : ''}
                <span class="post-region">${ic('pin')} ${escapeHtml(regionName)}</span>
                <span class="post-style">${ic(styleDef ? styleDef.icon : 'sparkle')} ${escapeHtml(styleName)}</span>
                ${item.distanceKm != null ? `<span class="post-distance">${distLabel(item.distanceKm)}</span>` : ''}
              </span>
            </div>
          </header>
          ${caption ? `<p class="post-caption${hasMedia ? ' post-caption-preview' : ''}">${escapeHtml(hasMedia ? preview : caption)}</p>` : ''}
          <div class="post-foot">
            <button class="post-like ${p.likedByMe ? 'liked' : ''}" data-like-post="${p.id}"
                    aria-pressed="${p.likedByMe}" aria-label="게시글 좋아요" type="button">
              ${HEART_SVG(p.likedByMe)}<span>${fmtCount(p.likes)}</span>
            </button>
            <span class="post-stat">${COMMENT_SVG} ${p.comments.length}</span>
            <span class="post-group">${escapeHtml(p.groupName || regionName)}</span>
            <span class="post-time" data-created="${p.createdAt}">${timeAgo(p.createdAt)}</span>
          </div>
        </span>
        ${hasMedia
          ? `<span class="post-media"><img class="media-img" src="${escapeHtml(p.photoUrl)}" alt="게시글 사진" loading="lazy" decoding="async"></span>`
          : ''}
        <span class="board-row-chevron" aria-hidden="true">›</span>
      </article>`;
  }

  /* ==========================================================================
   * 2-2. 2열 메이슨리 무한 스크롤 (Sprint 4)
   * ------------------------------------------------------------------------
   *  · store.getExploreFeed(filter, query, {page, limit}) 가 사람·모임·게시글을
   *    섞은 한 페이지를 돌려준다. 화면은 '더 짧은 열 먼저' 넣는 그리디로 이어 붙인다.
   *  · 하단 센티넬(#explore-sentinel)이 보이면 다음 페이지를 부드러운 스피너와 함께 로드.
   *  · 필터/검색이 바뀌면 페이지를 0으로 되돌리고, 하트·가입·댓글처럼 카드만 바뀌는
   *    동작은 { preserve: true } 로 다시 그려 스크롤 위치를 지킨다.
   * ======================================================================== */
  const EXPLORE_PAGE_SIZE = 12;
  let exploreObserver = null;
  let exploreLoadTimer = null;

  function exploreCardHTML(item) {
    if (item.type === 'person') return personCardHTML(item);
    if (item.type === 'group') return groupTileHTML(item);
    return explorePostCardHTML(item);
  }

  /**
   * Sprint 24 — 탐색은 두 모양을 한 화면에 둔다.
   *   · 사람(그리고 홈에서만 쓰는 모임) → 2열 비주얼 카드(.masonry-col)
   *   · 글·실시간 베스트 → 커뮤니티 게시판 같은 **한 줄 리스트**(.explore-board)
   * 11/17 00:30 루키 님: "글 영역이 토스쇼핑 같은 2열 카드 그리드로 나오지 않고
   * 커뮤니티 게시판 글처럼 한 줄 리스트형으로 보이게."
   */
  function resetExploreColumns() {
    if (!el.exploreMasonry) return;
    el.exploreMasonry.innerHTML = `
      <div class="explore-board" id="explore-board"></div>
      <div class="masonry-cols">
        <div class="masonry-col" data-column="0"></div>
        <div class="masonry-col" data-column="1"></div>
      </div>`;
    ui.exploreCols = Array.from(el.exploreMasonry.querySelectorAll('.masonry-col'))
      .map((node) => ({ node, height: 0 }));
    ui.exploreBoardNode = el.exploreMasonry.querySelector('.explore-board');
    ui.explorePage = 0;
  }

  function appendExploreItems(items) {
    if (!items.length) return;
    if (!ui.exploreCols) return;
    items.forEach((item) => {
      if (item.type === 'post') {
        if (ui.exploreBoardNode) ui.exploreBoardNode.insertAdjacentHTML('beforeend', explorePostCardHTML(item));
        return;
      }
      const target = ui.exploreCols[0].height <= ui.exploreCols[1].height
        ? ui.exploreCols[0] : ui.exploreCols[1];
      target.node.insertAdjacentHTML('beforeend', exploreCardHTML(item));
      target.height += cardHeightUnits(item);
    });
  }

  /** 탐색 필터의 현재 조합 키 — 프리페치한 페이지가 지금 조건과 맞는지 확인한다. */
  function exploreKey() {
    return [ui.exploreFilter, ui.exploreQuery, ui.exploreAge, ui.exploreRegion, ui.exploreRadius].join('|');
  }

  /** 다음 페이지를 미리 받아 둔다 — 센티넬에 닿으면 지연 없이 붙인다(Sprint 8 성능). */
  function prefetchExplorePage() {
    if (!ui.exploreRendered || ui.exploreSkeleton) return;
    const page = ui.explorePage;
    const key = exploreKey();
    const res = store.getExploreFeed(ui.exploreFilter, ui.exploreQuery, {
      page, limit: EXPLORE_PAGE_SIZE
    }, ui.exploreAge, ui.exploreRegion, ui.exploreRadius);
    const items = (res && res.items) || [];
    if (!items.length) { ui.exploreBuffer = null; return; }
    ui.exploreBuffer = { key, page, items };
  }

  /**
   * 다음 페이지를 이어 붙인다.
   * @param {{instant?:boolean}} options instant=true → 재렌더 복원용으로 지연 없이.
   */
  function loadExplorePage(options = {}) {
    if (!el.exploreMasonry) return;
    if (ui.exploreLoading && !options.instant) return;
    const page = ui.explorePage;
    const key = exploreKey();
    const buffered = !options.instant && ui.exploreBuffer
      && ui.exploreBuffer.page === page && ui.exploreBuffer.key === key;
    let items = buffered ? ui.exploreBuffer.items : null;
    if (buffered) ui.exploreBuffer = null;
    if (!items) {
      const res = store.getExploreFeed(ui.exploreFilter, ui.exploreQuery, {
        page, limit: EXPLORE_PAGE_SIZE
      }, ui.exploreAge, ui.exploreRegion, ui.exploreRadius);
      items = (res && res.items) || [];
    }
    if (!items.length) {
      if (el.exploreLoader) el.exploreLoader.hidden = true;
      return;
    }

    const run = () => {
      appendExploreItems(items);
      ui.explorePage = page + 1;
      ui.exploreLoading = false;
      if (el.exploreLoader) el.exploreLoader.hidden = true;
      /* 붙인 직후 다음 페이지를 조용히 받아 둔다. */
      setTimeout(prefetchExplorePage, 0);
    };

    if (options.instant || buffered) {
      /* 재렌더 복원 · 프리페치 적중 — 예약된 로딩을 정리하고 바로 그린다(지연 0ms). */
      clearTimeout(exploreLoadTimer);
      ui.exploreLoading = false;
      run();
      return;
    }
    ui.exploreLoading = true;
    if (el.exploreLoader) el.exploreLoader.hidden = false;
    clearTimeout(exploreLoadTimer);
    exploreLoadTimer = setTimeout(run, 260);      // 스피너가 보이는 최소 시간
  }

  /** 필터에 걸리는 전체 카드 수 (헤더 문구용) */
  function exploreTotals() {
    const items = store.getExploreFeed(ui.exploreFilter, ui.exploreQuery, null, ui.exploreAge, ui.exploreRegion, ui.exploreRadius);
    const count = (type) => items.filter((it) => it.type === type).length;
    return { items, people: count('person'), groups: count('group'), posts: count('post') };
  }

  /* ==========================================================================
   * 2-1b. Sprint 7 — 지역 드롭다운 · 실시간 베스트(실베) · 로딩 스켈레톤
   * ------------------------------------------------------------------------
   *  · 지역을 고르면 그 지역의 사람·모임·글이 함께 모인다(store.getExploreFeed 의 region).
   *  · 실베 = store.getHotPosts() — 좋아요·댓글과 최신성으로 계산한 순위 1~5위 스트립(더보기 1~10위).
   *    스트립·시트는 반경 필터와 무관한 전체/지역 기준이다(Sprint 9).
   *    카드를 누르면 그 게시글 상세로 딥링크한다(더보기 → 상위 10위 시트).
   * ======================================================================== */
  const HOT_STRIP_LIMIT = 5;
  const HOT_SHEET_LIMIT = 10;

  /** 지역 드롭다운 버튼의 현재 값 표시 */
  /** 지역 선택 → 저장(기억) → 탐색 다시 그리기
   *  Sprint 25 — 지역 고르는 곳은 **가로 칩 두 줄**(상단·필터 시트)뿐이다. */
  /** 지역 선택 → 저장(기억) → 탐색 다시 그리기 */
  function selectRegion(regionId) {
    const known = regionId === 'all' || regionId === 'nearby' || store.getRegion(regionId);
    const next = known ? regionId : 'all';
    ui.exploreRegion = next;
    ui.exploreBuffer = null;
    store.updateExplorePrefs({ region: next });
    renderExplore();
    if (el.main) el.main.scrollTop = 0;
    const region = store.getRegion(next);
    if (next === 'nearby') showToast('내 주변 5km 안의 사람과 글을 모아 볼게요', 'info');
    else showToast(region
      ? `${store.getRegionLabel(next)} 사람과 글을 모아 볼게요`
      : '전체 지역으로 돌아왔어요 · 이 선택도 기억해 둘게요', 'info');
  }

  /** 순위 변동 배지 — 위/아래 화살표 + 계단수, NEW (그대로면 생략) */
  function hotMoveHTML(it, compact) {
    const mv = it && it.movement;
    if (!mv || mv === 'same') return compact ? '' : '<span class="hot-move same" aria-hidden="true">–</span>';
    if (mv === 'new') {
      return `<span class="hot-move new" aria-label="지난 집계에 없던 글이에요">NEW</span>`;
    }
    const up = mv === 'up';
    const steps = Math.abs(it.delta || 0);
    return `<span class="hot-move ${up ? 'up' : 'down'}"
                  aria-label="지난 집계보다 ${steps}계단 ${up ? '상승' : '하락'}">${up ? ic('chevronUp') : ic('chevronDown')}${steps}</span>`;
  }

  /** 내 글이 실베에 새로 들어왔으면 알림을 보낸다(실제 반응·시뮬레이션 공통 경로).
   *  · 기준은 **전체 실베 Top 10** 이고(11/15 지시) 화면의 지역·반경 필터와 무관하다 — 같은 글로 다시 알리지 않는다. */
  function syncHotEntryNotifications() {
    let res = null;
    try {
      res = store.checkHotEntryNotifications({});
    } catch (e) {
      return;
    }
    if (!res || !res.results || !res.results.length) return;
    res.results.forEach((r) => deliverNotification(r));
    updateBadges();
    renderNotificationList();
    const first = res.entered[0];
    if (first) {
      showToast(`내 글이 실베 Top 10에 들었어요 · ${(first.caption || '내 글').slice(0, 14)}`, 'success');
    }
  }

  /** 실시간 베스트 스트립 (순위 1~5) */
  function renderHotStrip() {
    if (!el.hotRail) return;
    const list = store.getHotPosts({ limit: HOT_STRIP_LIMIT, regionId: ui.exploreRegion });
    if (el.hotSub) el.hotSub.textContent = '';
    if (!list.length) {
      el.hotRail.innerHTML = '<div class="hot-empty">아직 반응이 모인 글이 없어요 · 첫 글의 주인공이 되어보세요</div>';
      return;
    }
    /* Sprint 24 — 실베도 카드 가로 슬라이드가 아니라 게시판 순위 행으로 한 줄씩. */
    el.hotRail.innerHTML = list.map((it) => {
      const p = it.post;
      return `<button class="hot-card rank-${it.rank}" data-hot-post="${p.id}" type="button"
                      aria-label="실시간 베스트 ${it.rank}위 · ${escapeHtml(p.authorName)}님의 ${escapeHtml(postStyleLabel(p))} 글 보기">
        <span class="hot-rank" aria-hidden="true">${it.rank}</span>
        <span class="hot-card-body">
          <span class="hot-card-hobby">${it.regionName ? `${ic('pin')} ${escapeHtml(it.regionName)} · ` : ''}${escapeHtml(postStyleLabel(p))}</span>
          <span class="hot-card-caption">${escapeHtml(firstSentence(p.caption || ''))}</span>
          <span class="hot-card-meta">${ic('heart')} ${fmtCount(it.likes)} · ${ic('comment')} ${it.comments} · ${timeAgo(p.createdAt)}${hotMoveHTML(it, true)}</span>
        </span>
        <span class="hot-card-media">
          ${p.photoUrl ? `<img class="media-img" src="${escapeHtml(p.photoUrl)}" alt="" loading="lazy" decoding="async">` : `<span class="hot-card-noimg" aria-hidden="true">${ic(p.hobbyIcon || 'note')}</span>`}
        </span>
        <span class="hot-heat" aria-hidden="true"><span class="hot-heat-bar" style="width:${it.heat}%"></span></span>
      </button>`;
    }).join('');
    /* 내 글이 방금 실베에 들어왔는지 확인 → 들어왔으면 알림(같은 글로 반복 없음). */
    syncHotEntryNotifications();
  }

  /** 실베 상위 10위 시트 */
  function renderHotSheet() {
    if (!el.hotList) return;
    const list = store.getHotPosts({ limit: HOT_SHEET_LIMIT, regionId: ui.exploreRegion });
    const region = store.getRegion(ui.exploreRegion);
    if (el.hotSheetSub) {
      el.hotSheetSub.textContent = region ? `${region.name}` : '';
    }
    if (!list.length) {
      el.hotList.innerHTML = `<div class="empty-state">${emptyArt('explore')}<p class="empty-title">아직 반응이 모인 글이 없어요</p><p class="empty-desc">좋아요와 댓글이 모이면 여기에 순위가 생깁니다.</p></div>`;
      return;
    }
    el.hotList.innerHTML = list.map((it) => {
      const p = it.post;
      return `<button class="hot-row rank-${it.rank}" data-hot-post="${p.id}" type="button"
                      aria-label="${it.rank}위 ${escapeHtml(p.caption || '')} 글 보기">
        <span class="hot-row-rank" aria-hidden="true">${it.rank}</span>
        <span class="hot-row-thumb">${p.photoUrl ? `<img class="media-img" src="${escapeHtml(p.photoUrl)}" alt="" loading="lazy" decoding="async">` : ''}</span>
        <span class="hot-row-main">
          <span class="hot-row-hobby">${ic('pin')} ${escapeHtml(postStyleLabel(p))}${it.regionName ? ` · ${escapeHtml(it.regionName)}` : ''}</span>
          <span class="hot-row-caption">${escapeHtml(p.caption || '')}</span>
          <span class="hot-row-meta">${escapeHtml(p.authorName)} · ${ic('heart')} ${fmtCount(it.likes)} · ${ic('comment')} ${it.comments} · ${timeAgo(p.createdAt)}${hotMoveHTML(it, true)}</span>
        </span>
        <span class="hot-row-heat" aria-hidden="true"><span style="width:${it.heat}%"></span></span>
      </button>`;
    }).join('');
  }

  function openHotSheet() {
    if (!el.hotModal) return;
    ui.hotSheetOpen = true;
    renderHotSheet();
    openModal(el.hotModal);
  }

  /**
   * 로딩 스켈레톤 — Sprint 11 정교화.
   *  · 상단 1줄(종류 세그먼트 · 지역 · 필터)은 그대로 두고 **카드 영역만** 골격으로 갈아끼운다.
   *    (필터·지역을 바꿀 때 화면 전체가 깜박이지 않도록.)
   *  · 골격은 실제 2열 메이슨리의 생김새를 따라간다 — 사람(미디어 큰 카드) · 모임(화이트 카드) ·
   *    글(작성자 줄+미디어). 그래서 로딩이 끝나도 카드 높이가 튀지 않는다.
   *  · 움직임을 싫어하는 설정(reduced-motion)에서는 반짝임 없이 정지한 골격만 보인다.
   */
  function renderExploreSkeleton() {
    if (!el.exploreMasonry) return;
    const person = (h) => `<article class="skeleton-card is-person" style="height:${h}px" aria-hidden="true">
      <span class="skeleton-block skeleton-media"></span>
      <span class="skeleton-line w-60 on-media"></span>
      <span class="skeleton-line w-35 on-media"></span>
    </article>`;
    const group = (h) => `<article class="skeleton-card is-group" style="height:${h}px" aria-hidden="true">
      <span class="skeleton-block skeleton-cover"></span>
      <span class="skeleton-line w-70"></span>
      <span class="skeleton-line w-45"></span>
      <span class="skeleton-pill"></span>
    </article>`;
    const post = (h) => `<article class="skeleton-card is-post" style="height:${h}px" aria-hidden="true">
      <span class="skeleton-head"><span class="skeleton-avatar"></span><span class="skeleton-line w-45"></span></span>
      <span class="skeleton-block skeleton-media short"></span>
      <span class="skeleton-line w-70"></span>
      <span class="skeleton-line w-35"></span>
    </article>`;
    ui.exploreSkeleton = true;
    el.exploreMasonry.innerHTML = `<div class="masonry-skeleton" data-skeleton="1">
      <span class="sr-only" role="status" aria-live="polite">카드를 불러오는 중이에요</span>
      <div class="masonry-col">${person(214)}${post(172)}${group(140)}</div>
      <div class="masonry-col">${group(148)}${person(196)}${post(158)}</div>
    </div>`;
    ui.exploreRendered = false;
  }

  let exploreSkeletonTimer = null;

  /** 필터·지역·나이를 바꿀 때: 스켈레톤 → 잠깐 뒤 실제 결과 */
  function renderExploreWithSkeleton() {
    renderExploreSkeleton();
    clearTimeout(exploreSkeletonTimer);
    exploreSkeletonTimer = setTimeout(() => renderExplore(), 90);
  }

  function renderExplore(options = {}) {
    if (!el.exploreMasonry) return;
    const renderStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const wasSkeleton = !!ui.exploreSkeleton;
    renderExploreToolbar();
    renderExploreProfileToggle();
    /* 닫힌 시트의 칩도 적용 상태를 그대로 반영해 둔다(다시 열면 그 상태에서 시작). */
    renderAgeRange();
    /* 첫 렌더 경량화 — 실베 스트립은 카드가 먼저 그려진 다음 프레임에 그린다. */
    if (ui.hotRendered) {
      renderHotStrip();
    } else if (!ui.hotScheduled) {
      ui.hotScheduled = true;
      requestAnimationFrame(() => {
        ui.hotScheduled = false;
        renderHotStrip();
        ui.hotRendered = true;
      });
    }

    const { items, people, groups, posts } = exploreTotals();
    const activeFilter = store.getExploreFilters().find((f) => f.id === ui.exploreFilter);
    const ageRange = store.getExploreAgeRange();
    const ageOn = ageRange.active;
    const ageFilter = ageOn ? { id: 'range', name: `${ageRange.min}~${ageRange.max}세` } : null;
    const region = store.getRegion(ui.exploreRegion);
    const radiusOn = false;   // Sprint 25 — 반경 칩은 탐색에서 뺐다(지역이 그 역할을 한다)

    const regionLabel = region ? store.getRegionLabel(ui.exploreRegion) : '';
    if (el.exploreCount) {
      if (ui.exploreQuery) {
        el.exploreCount.textContent = `'${ui.exploreQuery}' 결과 · 사람 ${people} · 글 ${posts}`;
      } else if (ui.exploreFilter === 'people') {
        el.exploreCount.textContent = `${people}명이 이 동네에서 만날 사람을 찾고 있어요`;
      } else if (ui.exploreFilter === 'posts') {
        el.exploreCount.textContent = `${posts}개의 동네 글이 올라와 있어요`;
      } else {
        el.exploreCount.textContent = `사람 ${people} · 글 ${posts}`;
      }
      if (region && !ui.exploreQuery) {
        el.exploreCount.textContent += ` · ${regionLabel}`;
      }
      if (ageOn && ageFilter && !ui.exploreQuery) {
        el.exploreCount.textContent += ` · ${ageFilter.name}`;
      }
    }
    if (el.exploreTitle) {
      const baseLabel = region
        ? (ui.exploreRegion === 'nearby' ? '내 주변' : regionLabel)
        : '';
      if (ui.exploreQuery) {
        el.exploreTitle.textContent = '검색 결과';
      } else if (ageOn && ageFilter) {
        el.exploreTitle.textContent = `${baseLabel ? `${baseLabel} · ` : ''}${ageFilter.name} 사람과 번개`;
      } else if (baseLabel) {
        el.exploreTitle.textContent = `${baseLabel} 사람과 번개`;
      } else if (activeFilter && activeFilter.id !== 'all') {
        el.exploreTitle.textContent = `${activeFilter.name === 'people' ? '사람' : '글'}만 모아 보기`;
      } else {
        el.exploreTitle.textContent = '우리 동네 사람과 번개';
      }
    }

    if (!items.length) {
      /* Sprint 18 — 세상이 아직 비어 있는 경우(새 계정·완전 초기화)에는 필터 안내 대신 첫 행동을 안내한다. */
      const fieldEmpty = !store.state.matchProfiles.length && !store.state.groups.length
        && !store.state.explorePosts.length;
      /* Sprint 25 — 첫 화면에서는 바로 위의 '글쓰기' 줄·프로필 올리기 줄을 접는다.
         같은 행동을 두 곳에서 권하면 오히려 무엇을 눌러야 할지 흐려진다. */
      const exploreSection = document.getElementById('tab-explore');
      if (exploreSection) exploreSection.classList.toggle('is-field-empty', fieldEmpty);
      if (fieldEmpty && !ui.exploreQuery && !radiusOn && !ageOn && (!activeFilter || activeFilter.id === 'all')) {
        /* Sprint 26.5 — 첫 화면은 '첫 글' 하나로 모은다. 위의 프로필 올리기 스위치는
           이때 접히므로(CSS .is-field-empty), 같은 행동을 두 곳에서 권하지 않는다. */
        el.exploreMasonry.innerHTML = `
          <div class="empty-state explore-empty is-field-empty">
            <p class="empty-kicker">비어 있는 우리 동네</p>
            <p class="empty-title">첫 글을 남겨 볼까요?</p>
            <p class="empty-desc">동네 인사나 지금 만나고 싶은 이야기를 한 줄 남기면<br>이 자리에서 사람들이 보이기 시작해요.</p>
            <div class="empty-actions">
              <button class="btn-primary empty-primary" data-explore-compose-here="1" type="button">첫 글 쓰기</button>
            </div>
          </div>`;
        ui.exploreRendered = true;
        return;
      }
      const nearest = store.nearestDistanceKm(ui.exploreFilter, ui.exploreQuery, ui.exploreAge, ui.exploreRegion);
      const reason = ui.exploreRegion === 'nearby'
        ? (nearest != null
          ? `가장 가까운 카드가 ${distLabel(nearest)} 거리에 있어요. 다른 동네를 골라보세요.`
          : '다른 동네를 골라보세요.')
        : (ageOn
          ? `‘${escapeHtml((ageFilter || {}).name || '')}’ 조건을 풀거나 다른 동네를 골라보세요.`
          : (region ? `‘${escapeHtml(store.getRegionLabel(ui.exploreRegion))}’에는 아직 글이 없어요. 첫 글을 남기거나 다른 동네를 골라보세요.` : '검색어를 짧게 바꾸거나 다른 동네를 골라보세요.'));
      el.exploreMasonry.innerHTML = `
        <div class="empty-state explore-empty">
          ${emptyArt(ui.exploreQuery ? 'search' : 'explore')}
          <p class="empty-title">${region
            ? `${escapeHtml(store.getRegionLabel(ui.exploreRegion))}는 아직 조용해요`
            : '조건에 맞는 카드가 없어요'}</p>
          <p class="empty-desc">${reason}</p>
          <div class="empty-actions">
            <button class="btn-primary" data-explore-create="1" type="button">이 동네에 모임 만들기</button>
            <button class="btn-secondary" data-explore-compose-here="1" type="button">첫 글 쓰기</button>
            <button class="btn-secondary" data-explore-reset="1" type="button">필터 초기화</button>
          </div>
        </div>`;
      ui.exploreRendered = true;
      ui.explorePage = 0;
      ui.exploreBuffer = null;
      notePerf('lastExploreRenderMs', (typeof performance !== 'undefined' ? performance.now() : Date.now()) - renderStart);
      return;
    }

    const exploreSectionReset = document.getElementById('tab-explore');
    if (exploreSectionReset) exploreSectionReset.classList.remove('is-field-empty');

    const keepPages = options.preserve ? Math.max(1, ui.explorePage) : 1;
    const keepScroll = options.preserve && el.main ? el.main.scrollTop : 0;

    ui.exploreSkeleton = false;
    resetExploreColumns();
    ui.exploreBuffer = null;
    ui.exploreLoading = false;
    clearTimeout(exploreLoadTimer);
    for (let i = 0; i < keepPages; i += 1) loadExplorePage({ instant: true });
    ui.exploreRendered = true;
    if (el.exploreLoader) el.exploreLoader.hidden = true;
    if (options.preserve && el.main) el.main.scrollTop = keepScroll;
    /* Sprint 12 — 스켈레톤이 진짜 카드로 바뀔 때만 짧게 페이드해 튀지 않게 */
    if (wasSkeleton && !prefersReducedMotion()) {
      el.exploreMasonry.classList.remove('just-loaded');
      void el.exploreMasonry.offsetWidth;
      el.exploreMasonry.classList.add('just-loaded');
      clearTimeout(ui.exploreFadeTimer);
      ui.exploreFadeTimer = setTimeout(() => el.exploreMasonry.classList.remove('just-loaded'), 360);
    }
    notePerf('lastExploreRenderMs', (typeof performance !== 'undefined' ? performance.now() : Date.now()) - renderStart);
    notePerf('exploreCards', el.exploreMasonry.querySelectorAll('.masonry-card').length);
  }

  /** 하단 센티넬 감시 — 탐색 탭에서 바닥 근처에 오면 다음 페이지를 붙인다. */
  function setupExploreObserver() {
    if (!el.exploreSentinel || typeof IntersectionObserver === 'undefined') return;
    if (exploreObserver) exploreObserver.disconnect();
    exploreObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (ui.exploreLoading) return;
        if (ui.exploreSkeleton) return;
        if (ui.activeTab !== 'tab-explore') return;
        if (document.querySelector('.modal-overlay.active')) return;
        if (el.chatRoomModal && !el.chatRoomModal.hidden) return;
        loadExplorePage();
      });
    }, { root: el.main, rootMargin: '420px 0px 0px 0px' });
    exploreObserver.observe(el.exploreSentinel);
  }

  /* --- 탐색 이벤트 (위임) ---
     Sprint 9 — 상단 종류 세그먼트는 바로 적용, 시트 안 취미·나이·반경은 드래프트만 바꾼다. */
  el.exploreTypeSeg && el.exploreTypeSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-explore-filter]');
    if (!btn || ui.exploreFilter === btn.dataset.exploreFilter) return;
    ui.exploreFilter = btn.dataset.exploreFilter;
    ui.exploreBuffer = null;
    store.updateExplorePrefs({ filter: ui.exploreFilter });   // Sprint 7 — 필터 기억
    if (el.main) el.main.scrollTop = 0;
    renderExploreWithSkeleton();
  });

  /* Sprint 16 — 나이 슬라이더 (0~99세 듀얼 레인지). 끌면 바로 저장하고 다시 그린다. */
  let ageCommitTimer = null;
  function scheduleAgeCommit() {
    clearTimeout(ageCommitTimer);
    ageCommitTimer = setTimeout(() => {
      applyAgeRange(el.ageRangeMin.value, el.ageRangeMax.value);
    }, 220);
  }
  el.ageRangeMin && el.ageRangeMin.addEventListener('input', () => {
    applyAgeRange(el.ageRangeMin.value, el.ageRangeMax.value, { commit: false });
    scheduleAgeCommit();
  });
  el.ageRangeMin && el.ageRangeMin.addEventListener('change', () => {
    applyAgeRange(el.ageRangeMin.value, el.ageRangeMax.value);
  });
  el.ageRangeMax && el.ageRangeMax.addEventListener('input', () => {
    applyAgeRange(el.ageRangeMin.value, el.ageRangeMax.value, { commit: false });
    scheduleAgeCommit();
  });
  el.ageRangeMax && el.ageRangeMax.addEventListener('change', () => {
    applyAgeRange(el.ageRangeMin.value, el.ageRangeMax.value);
  });
  el.btnAgeClear && el.btnAgeClear.addEventListener('click', () => {
    applyAgeRange(0, 99);
  });

  /* 필터 시트 열기 · 적용 · 초기화 · 닫기 */
  el.exploreFilterBtn && el.exploreFilterBtn.addEventListener('click', openFilterSheet);
  el.filterApply && el.filterApply.addEventListener('click', applyFilterDraft);
  el.filterReset && el.filterReset.addEventListener('click', resetFilterDraft);
  const btnCloseFilter = $('#btn-close-filter');
  btnCloseFilter && btnCloseFilter.addEventListener('click', closeFilterSheet);

  /* 상단 요약 칩 — 누르면 그 조건만 해제 */
  el.exploreActiveFilters && el.exploreActiveFilters.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter-clear]');
    if (!chip) return;
    clearFilterCondition(chip.dataset.filterClear);
  });

  /* Sprint 23 — 상단 지역 카테고리 칩 + 서울 안쪽 동네 줄 */
  el.exploreRegionChips && el.exploreRegionChips.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-region-chip]');
    if (!chip) return;
    const id = chip.dataset.regionChip;
    if (id === ui.exploreRegion) return;
    selectRegion(id);
  });
  el.exploreRegionSub && el.exploreRegionSub.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-region-sub]');
    if (!chip) return;
    const id = chip.dataset.regionSub;
    if (id === ui.exploreRegion) return;
    selectRegion(id);
  });
  /* Sprint 25 — 필터 시트 안 지역 가로 칩(큰 분류·하위 권역) + 내 주변.
     시트 안에서는 드래프트만 바꾸고 [적용하기]에서 한 번에 반영한다. */
  el.filterModal && el.filterModal.addEventListener('click', (e) => {
    const sub = e.target.closest('[data-region-sub]');
    if (sub && el.filterRegionSub && el.filterRegionSub.contains(sub)) {
      toggleFilterDraft('region', sub.dataset.regionSub); return;
    }
    const chip = e.target.closest('[data-region-chip]');
    if (chip && el.filterRegionChips && el.filterRegionChips.contains(chip)) {
      toggleFilterDraft('region', chip.dataset.regionChip); return;
    }
    const near = e.target.closest('#filter-nearby-chip');
    if (near) toggleFilterDraft('region', 'nearby');
  });

  /* 실시간 베스트 */
  el.btnHotMore && el.btnHotMore.addEventListener('click', openHotSheet);
  const btnCloseHot = $('#btn-close-hot');
  btnCloseHot && btnCloseHot.addEventListener('click', () => closeModal(el.hotModal));

  /* 실베 카드(스트립·시트) → 게시글 상세 딥링크 */
  function handleHotCardClick(e) {
    const card = e.target.closest('[data-hot-post]');
    if (!card) return;
    const postId = card.dataset.hotPost;
    if (!store.getExplorePost(postId)) {
      showToast('이 글은 지금 볼 수 없어요', 'warning');
      return;
    }
    if (el.hotModal && el.hotModal.classList.contains('active')) closeModal(el.hotModal);
    openPostDetail(postId);
  }
  el.hotRail && el.hotRail.addEventListener('click', handleHotCardClick);
  el.hotList && el.hotList.addEventListener('click', handleHotCardClick);

  el.exploreMasonry && el.exploreMasonry.addEventListener('click', (e) => {
    if (e.target.closest('[data-explore-reset]')) {
      ui.exploreFilter = 'all';
      ui.exploreAge = 'all';
      ui.exploreRegion = 'all';
      ui.exploreRadius = 'all';
      ui.exploreQuery = '';
      ui.exploreBuffer = null;
      store.updateExplorePrefs({ filter: 'all', age: 'all', region: 'all', radius: 'all' });
      /* Sprint 16 — 나이 범위(0~99)도 함께 되돌린다 */
      store.setExploreAgeRange(0, 99);
      renderAgeRange();
      if (el.exploreInput) el.exploreInput.value = '';
      syncExploreSearchClear();
      renderExplore();
      return;
    }
    /* Sprint 8 — 빈 반경/지역에서 '반경 넓히기' · '이 동네에 모임 만들기' */
    if (e.target.closest('[data-explore-create]')) {
      openGroupCreate();
      return;
    }
    if (e.target.closest('[data-explore-compose-here]')) {
      openExploreCompose();
      return;
    }
    if (e.target.closest('[data-explore-profile-publish]')) {
      setExploreProfileVisible(true);
      return;
    }
    const likeBtn = e.target.closest('[data-like-person]');
    if (likeBtn) {
      quickLike(likeBtn.dataset.likePerson, likeBtn);
      return;
    }
    /* Sprint 16 — 카드에서 바로 쪽지(디엠) 보내기 — 매칭을 기다리지 않는다 */
    const dmBtn = e.target.closest('[data-dm-person]');
    if (dmBtn) {
      openDmComposer(dmBtn.dataset.dmPerson);
      return;
    }
    /* 게시글 카드의 하트 — 카드 안에서 숫자·하트만 바뀌다 */
    const postLike = e.target.closest('[data-like-post]');
    if (postLike) {
      togglePostLike(postLike.dataset.likePost, postLike);
      return;
    }
    const openBtn = e.target.closest('[data-group-open]');
    if (openBtn) {
      openGroupDetail(openBtn.dataset.groupOpen);
      return;
    }
    const postCard = e.target.closest('[data-post-card]');
    if (postCard) {
      openPostDetail(postCard.dataset.postCard);
      return;
    }
    const personCard = e.target.closest('[data-person-id]');
    if (personCard) {
      openPersonDetail(personCard.dataset.personId);
      return;
    }
    const groupCard = e.target.closest('[data-group-id]');
    if (groupCard) openGroupDetail(groupCard.dataset.groupId);
  });

  el.exploreMasonry && el.exploreMasonry.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('button')) return;              // 하트·참여 버튼은 기본 동작
    const card = e.target.closest('[data-card-type]');
    if (!card) return;
    e.preventDefault();
    if (card.dataset.personId) openPersonDetail(card.dataset.personId);
    else if (card.dataset.groupId) openGroupDetail(card.dataset.groupId);
    else if (card.dataset.postCard) openPostDetail(card.dataset.postCard);
  });

  /* 검색 — 입력이 멈추면 그려준다(짧게 디바운스) */
  let exploreSearchTimer = null;

  function syncExploreSearchClear() {
    if (!el.exploreClear) return;
    const has = !!(el.exploreInput && el.exploreInput.value.trim());
    el.exploreClear.classList.toggle('hide', !has);
  }

  el.exploreInput && el.exploreInput.addEventListener('input', () => {
    ui.exploreQuery = el.exploreInput.value.trim();
    ui.exploreBuffer = null;
    syncExploreSearchClear();
    clearTimeout(exploreSearchTimer);
    exploreSearchTimer = setTimeout(() => renderExplore(), 130);
  });

  el.exploreClear && el.exploreClear.addEventListener('click', () => {
    if (el.exploreInput) el.exploreInput.value = '';
    ui.exploreQuery = '';
    ui.exploreBuffer = null;
    syncExploreSearchClear();
    renderExplore();
    if (el.exploreInput) el.exploreInput.focus();
  });

  /* --------------------------------------------------------- 퀵 하트 (LIKE) */
  function markCardLiked(profileId) {
    const btn = el.exploreMasonry && el.exploreMasonry.querySelector(`[data-like-person="${profileId}"]`);
    const card = btn ? btn.closest('.person-card') : null;
    if (card) card.classList.add('is-liked');
    if (!btn) return;
    btn.classList.add('liked');
    btn.setAttribute('aria-pressed', 'true');
    btn.innerHTML = HEART_SVG(true);
    btn.classList.remove('pop');
    void btn.offsetWidth;                        // reflow → 애니메이션 재시작
    btn.classList.add('pop');
    const burst = document.createElement('span');
    burst.className = 'like-burst';
    burst.innerHTML = ic('heart');
    btn.appendChild(burst);
    setTimeout(() => burst.remove(), 700);
  }

  function quickLike(profileId, btn) {
    const profile = store.getMatchProfile(profileId);
    if (!profile) return;

    /* 이미 하트를 보낸 카드 — 다시 누르면 '관심 취소(되돌리기)' */
    if (store.isProfileLiked(profileId)) {
      undoLike(profileId);
      return;
    }

    const res = store.recordMatchSwipe(profileId, 'like');
    if (!res.ok) {
      if (res.reason === 'already') showToast('이미 좋아요를 보낸 친구예요', 'info');
      return;
    }

    markCardLiked(profileId);
    if (navigator.vibrate) navigator.vibrate(10);

    if (res.matched) {
      renderChatRooms();
      updateBadges();
      openMatchPopup(res.profile, res.room);
    } else {
      showToast(`${profile.nickname}님에게 좋아요를 보냈어요 · 한 번 더 누르면 취소돼요`, 'success');
      updateBadges();
    }
  }

  /** 하트 취소 — 카드·상세 시트 어디서 눌러도 같은 상태로 돌아간다. */
  function undoLike(profileId) {
    const res = store.toggleMatchLike(profileId);
    if (!res.ok) return;
    const nickname = res.profile ? res.profile.nickname : '취미친구';
    renderExplore({ preserve: true });
    if (el.personDetailModal.classList.contains('active') && ui.personSheetId === profileId) {
      openPersonDetail(profileId);
    }
    renderChatRooms();
    updateBadges();
    if (res.roomKept) {
      showToast('관심을 취소했어요 · 이미 대화가 시작된 방은 그대로 둘게요', 'info');
    } else {
      showToast(`${nickname}님에게 보낸 관심을 취소했어요`, 'info');
    }
  }

  /* ------------------------------------------------- 취미친구 프로필 상세 시트 */
  function openPersonDetail(profileId) {
    const p = store.getPersonProfile(profileId);
    if (!p || !el.personDetailBody) return;
    ui.personSheetId = p.id;
    const liked = store.isProfileLiked(p.id);
    const room = store.findChatRoomByPartner(p.id);

    let primary;
    if (room) {
      primary = `<button class="detail-btn like" data-person-action="chat" type="button">대화 이어가기</button>`;
    } else {
      /* Sprint 16 — 매칭(상호 하트)을 기다리지 않고 바로 쪽지를 보낸다 */
      primary = `<button class="detail-btn like" data-person-action="dm" type="button">쪽지 보내기</button>`;
    }
    const secondary = liked
      ? `<button class="detail-btn ghost" data-person-action="unlike" type="button">보낸 관심 취소</button>`
      : `<button class="detail-btn ghost" data-person-action="like" type="button">관심만 보내기</button>`;
    const closeAction = `<button class="detail-btn ghost" data-person-action="close" type="button">닫기</button>`;

    const metaBadges = [
      p.location ? `<span class="detail-badge">${escapeHtml(p.location)}${p.distanceKm != null ? ` · ${p.distanceKm}km` : ''}</span>` : '',
      p.cycle ? `<span class="detail-badge">${escapeHtml(p.cycle)}</span>` : ''
    ].filter(Boolean).join('');

    const specChips = p.specChips || [];
    const specBlock = specChips.length ? `
      <div class="detail-spec-title">취미 스펙</div>
      <div class="detail-spec-grid">
        ${specChips.map((s) => `
          <div class="detail-spec-cell">
            <span class="detail-spec-icon" aria-hidden="true">${ic(s.icon)}</span>
            <span class="detail-spec-label">${escapeHtml(s.label)}</span>
            <strong class="detail-spec-value">${escapeHtml(s.value)}</strong>
          </div>`).join('')}
      </div>` : '';

    el.personDetailBody.innerHTML = `
      <div class="detail-photo" ${p.photoUrl ? '' : `style="background:${p.avatarGradient || 'linear-gradient(135deg,#10B981,#047857)'}"`}>
        ${p.photoUrl
          ? `<img class="detail-photo-img" src="${escapeHtml(p.photoUrl)}" alt="${escapeHtml(p.nickname)} 프로필 사진" loading="lazy" decoding="async">`
          : `<span class="detail-photo-initial" aria-hidden="true">${escapeHtml(p.avatarText || String(p.nickname).charAt(0))}</span>`}
        <span class="person-badge detail-photo-badge">${escapeHtml(p.badge || '')}</span>
      </div>
      <div class="detail-head">
        <div class="detail-name-row">
          <h2 class="detail-name">${escapeHtml(p.nickname)}</h2>
          ${p.age ? `<span class="detail-age">${p.age}세</span>` : ''}
          ${p.verified ? `<span class="detail-verified">${ic('check')} 취미 인증</span>` : ''}
        </div>
        <p class="detail-style">${escapeHtml(p.hobbyStyle || p.hobbyLabel || '')}</p>
        ${metaBadges ? `<div class="detail-badges">${metaBadges}</div>` : ''}
      </div>
      <p class="detail-bio">${escapeHtml(p.bio || '')}</p>
      ${specBlock}
      ${(p.hobbies || []).length ? `
      <div class="detail-hobby-list">
        ${p.hobbies.map((h) => `<span class="detail-hobby-pill">#${escapeHtml(h)}</span>`).join('')}
      </div>` : ''}
      <div class="detail-actions">
        ${primary}
        ${secondary}
        ${closeAction}
      </div>`;
    openModal(el.personDetailModal);
  }

  el.personDetailBody && el.personDetailBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-person-action]');
    if (!btn) return;
    const action = btn.dataset.personAction;
    const profileId = ui.personSheetId;
    if (action === 'close' || action === 'none') {
      closeModal(el.personDetailModal);
      return;
    }
    if (action === 'dm' && profileId) {
      /* Sprint 16 — 상세에서 바로 쪽지 시트로 */
      openDmComposer(profileId);
      return;
    }
    if (action === 'chat') {
      const room = profileId ? store.findChatRoomByPartner(profileId) : null;
      /* 대화방 안에서 프로필을 열었다면 시트만 닫고 대화로 돌아간다 */
      if (ui.openRoomId) { closeModal(el.personDetailModal); return; }
      closeModal(el.personDetailModal);
      if (room) goToChatRoom(room.id);
      return;
    }
    if (action === 'unlike' && profileId) {
      undoLike(profileId);
      return;
    }
    if (action === 'like' && profileId) {
      closeModal(el.personDetailModal);
      quickLike(profileId, null);
    }
  });

  /* ------------------------------------------------------------- 매칭 축하 팝업 */
  function buildConfetti() {
    if (!el.popupConfetti) return;
    const colors = ['#10B981', '#34D399', '#FBBF24', '#F472B6', '#60A5FA', '#A78BFA', '#FFFFFF'];
    el.popupConfetti.innerHTML = Array.from({ length: 30 }, (_, i) => {
      const left = Math.round(Math.random() * 100);
      const delay = (Math.random() * 1.1).toFixed(2);
      const dur = (1.8 + Math.random() * 1.4).toFixed(2);
      const size = 6 + Math.round(Math.random() * 8);
      const color = colors[i % colors.length];
      const rot = Math.round(Math.random() * 360);
      return `<span class="confetti-piece" style="left:${left}%;animation-delay:${delay}s;animation-duration:${dur}s;` +
        `width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px;background:${color};--rot:${rot}deg"></span>`;
    }).join('');
  }

  function openMatchPopup(profile, room) {
    if (!el.matchPopup) return;
    ui.matchPopupRoomId = room ? room.id : null;
    ui.matchPopupProfileId = profile.id;

    el.popupNames.textContent = `${store.currentUser.nickname} × ${profile.nickname}`;
    /* 매칭 이유 문구 대신 프로필의 사실 정보만 보여준다 (적합도·AI 이유 없음) */
    el.popupCommon.textContent = `${profile.hobbyStyle} · ${profile.location}`;
    if (el.popupAvatarThem) {
      el.popupAvatarThem.textContent = profile.avatarText || profile.nickname.charAt(0);
      el.popupAvatarThem.style.background = profile.avatarGradient;
    }
    buildConfetti();
    el.matchPopup.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => el.matchPopup.classList.add('show'));
    if (navigator.vibrate) navigator.vibrate([12, 40, 12, 40, 20]);
    setTimeout(() => el.btnOpenChatRoom && el.btnOpenChatRoom.focus({ preventScroll: true }), 220);
  }

  function closeMatchPopup() {
    if (!el.matchPopup || el.matchPopup.hidden) return;
    el.matchPopup.classList.remove('show');
    document.body.classList.remove('modal-open');
    window.setTimeout(() => {
      el.matchPopup.hidden = true;
      if (el.popupConfetti) el.popupConfetti.innerHTML = '';
    }, 240);
  }

  function goToChatRoom(roomId) {
    const room = roomId ? store.getChatRoom(roomId) : null;
    closeMatchPopup();
    ui.highlightRoomId = room ? room.id : null;
    switchTab('tab-chat');
    renderChatRooms();
    /* '대화방 열기'는 목록으로 가지 않고 곷바로 1:1 대화 화면을 열다 (Sprint 4) */
    if (room) openChatRoom(room.id);
  }

  /* 축하 팝업 버튼 */
  el.btnOpenChatRoom && el.btnOpenChatRoom.addEventListener('click', () => goToChatRoom(ui.matchPopupRoomId));
  el.btnKeepSwiping && el.btnKeepSwiping.addEventListener('click', closeMatchPopup);
  el.matchPopup && el.matchPopup.addEventListener('click', (e) => {
    if (e.target === el.matchPopup) closeMatchPopup();
  });

  const btnClosePersonDetail = $('#btn-close-match-detail');
  btnClosePersonDetail && btnClosePersonDetail.addEventListener('click', () => closeModal(el.personDetailModal));

  /* ==========================================================================
   * 3. 모임 상세 시트 + 말머리 태그 관리 (그룹장 전용)
   * ======================================================================== */
  function openGroupDetail(groupId) {
    const grp = store.getGroup(groupId);
    if (!grp) return;
    renderGroupDetail(grp);
    openModal(el.groupModal);
  }

  /** Sprint 13 — 모임 상세의 '일정' 구획 (정기 모임 + 함께 하는 날) */
  function renderGroupScheduleBlock(grp) {
    const rows = store.getGroupSchedule(grp.id);
    if (!rows.length) return '';
    return `
      <section class="sheet-block" data-sheet-block="schedule">
        <h4 class="sheet-section-title">일정</h4>
        <ul class="schedule-list">
          ${rows.map((row) => `
            <li class="schedule-row tone-${escapeHtml(row.tone)}">
              <span class="schedule-icon" aria-hidden="true">${ic(row.icon)}</span>
              <span class="schedule-label">${escapeHtml(row.label)}</span>
              <span class="schedule-value">${escapeHtml(row.value)}</span>
            </li>`).join('')}
        </ul>
      </section>`;
  }

  /** Sprint 13 — 모임 상세의 '멤버' 구획 (그룹장 · 글 쓴 사람 · 나) */
  function renderGroupMemberBlock(grp) {
    const info = store.getGroupMembers(grp.id);
    if (!info.people.length) return '';
    return `
      <section class="sheet-block" data-sheet-block="members">
        <div class="sheet-section-head">
          <h4 class="sheet-section-title">멤버 <span class="section-count">${info.total}명</span></h4>
          <button class="text-btn" data-open-members="${grp.id}" type="button">전체 보기</button>
        </div>
        <div class="member-strip">
          ${info.people.slice(0, 6).map((p) => `
            <button class="member-chip" data-open-members="${grp.id}" data-member-focus="${escapeHtml(p.name)}" type="button"
                    title="${escapeHtml(p.name)}${p.role === 'leader' ? ' · 그룹장' : ''}">
              <span class="member-avatar" style="background:${p.gradient}">${escapeHtml(p.avatarText)}</span>
              <span class="member-name">${escapeHtml(p.name)}</span>
              ${p.role === 'leader' ? '<span class="member-role" aria-label="그룹장">그룹장</span>' : ''}
              ${p.role === 'me' ? '<span class="member-role member-role-me" aria-label="나">나</span>' : ''}
            </button>`).join('')}
          ${info.hidden > 0 ? `<button class="member-more" data-open-members="${grp.id}" type="button">외 ${info.hidden}명</button>` : ''}
        </div>
      </section>`;
  }

  /* Sprint 15 — 모임 운영: 공지 권한 · 부방장 · 그룹 내 1:1 대화 허용 */
  function renderGroupOpsBlock(grp, isLeader, joined) {
    const perm = store.getGroupNoticePermission(grp.id);
    const deputies = store.getGroupDeputies(grp.id);
    const dm = store.getGroupDmPolicy(grp.id);
    /* Sprint 16 — 부방장에게 '멤버 승인·강퇴'까지 맡길지(그룹장만 바꿈) */
    const perms = store.getDeputyPermissions(grp.id);
    return `
      <section class="sheet-block group-ops" data-sheet-block="ops">
        <div class="sheet-section-head">
          <h4 class="sheet-section-title">모임 운영</h4>
          ${isLeader ? '<span class="leader-badge">그룹장</span>'
            : `<span class="ops-role">${escapeHtml(perm.label)}</span>`}
        </div>
        <div class="ops-row">
          <span class="ops-label">공지·일정 작성</span>
          <span class="ops-value">${perm.canManage ? '쓸 수 있어요' : '그룹장·부방장만'}</span>
        </div>
        <div class="ops-row">
          <span class="ops-label">부방장</span>
          <span class="ops-value">${deputies.length
            ? deputies.map((d) => `${escapeHtml(d.name)}${d.isMe ? ' (나)' : ''}`).join(', ')
            : '아직 없음'}</span>
        </div>
        ${isLeader && joined
          ? `<button class="btn-secondary ops-deputy-btn" data-open-members="${grp.id}" type="button">멤버에서 부방장 지정</button>`
          : ''}
        <div class="ops-toggle-row">
          <span class="ops-toggle-text">
            <span class="ops-toggle-title">부방장에게 멤버 승인·강퇴까지 맡기기</span>
            <span class="ops-toggle-desc">끄면 부방장은 공지·일정만 쓸 수 있고, 승인·강퇴는 그룹장만 해요</span>
          </span>
          ${isLeader
            ? `<button class="switch-toggle ${perms.deputyCanModerate ? 'on' : ''}" data-deputy-moderate-toggle="${grp.id}"
                       role="switch" aria-checked="${perms.deputyCanModerate}" type="button"
                       aria-label="부방장에게 멤버 승인·강퇴 권한 주기"><span class="switch-knob" aria-hidden="true"></span></button>`
            : `<span class="ops-state ${perms.deputyCanModerate ? 'on' : 'off'}'>${perms.deputyCanModerate ? '함께 관리' : '그룹장만'}</span>`}
        </div>
        <div class="ops-toggle-row">
          <span class="ops-toggle-text">
            <span class="ops-toggle-title">그룹 내 1:1 대화 허용</span>
            <span class="ops-toggle-desc">끄면 멤버끼리 1:1 대화를 시작할 수 없어요 · 모임 전체방은 그대로예요</span>
          </span>
          ${isLeader
            ? `<button class="switch-toggle ${dm.enabled ? 'on' : ''}" data-group-dm-toggle="${grp.id}"
                       role="switch" aria-checked="${dm.enabled}" type="button"
                       aria-label="그룹 내 1:1 대화 허용"><span class="switch-knob" aria-hidden="true"></span></button>`
            : `<span class="ops-state ${dm.enabled ? 'on' : 'off'}">${dm.enabled ? '허용' : '꺼둠'}</span>`}
        </div>
        <div class="ops-toggle-row">
          <span class="ops-toggle-text">
            <span class="ops-toggle-title">가입 카드 표지 사진</span>
            <span class="ops-toggle-desc">갤러리 카드에 보일 사진을 그룹장이 직접 고를 수 있어요</span>
          </span>
          ${isLeader
            ? `<button class="btn-secondary ops-cover-btn" data-cover-open="${grp.id}" type="button">표지 고르기</button>`
            : `<span class="ops-state">${(store.getGroupCover(grp.id) || {}).custom ? '그룹장이 고름' : '최근 사진'}</span>`}
        </div>
      </section>`;
  }

  function renderGroupDetail(grp) {
    const joined = store.isGroupJoined(grp.id);
    const isLeader = store.isGroupLeader(grp.id);
    const posts = store.state.feedPosts.filter((p) => p.groupId === grp.id);
    const joinState = store.getJoinState(grp.id);
    const pending = isLeader ? store.getPendingApplications(grp.id) : [];
    const mode = store.getGroupJoinMode(grp);

    el.groupModalBody.innerHTML = `
      ${isLeader ? `
      <div class="admin-mode-bar">
        <span class="admin-mode-badge">관리자 모드</span>
        <span class="admin-pending-count">신청 대기 ${pending.length}명</span>
      </div>` : ''}
      <div class="sheet-group-header">
        <div class="sheet-emoji-badge">${ic(grp.icon)}</div>
        <span class="group-category-tag">
          <span>${grp.categoryName}</span>
        </span>
        <h2 class="sheet-title">${escapeHtml(grp.name)}</h2>
        <div class="sheet-meta">
          <span>${escapeHtml(grp.location)} · ${grp.distanceKm}km</span>
          <span>멤버 ${grp.memberCount}/${grp.maxMembers}명</span>
          <span>그룹장 ${escapeHtml(grp.leaderName)}${isLeader ? ' (나)' : ''}</span>
        </div>
        <p class="sheet-desc">${escapeHtml(grp.description)}</p>
      </div>

      <!-- Sprint 13 — 상세는 구획으로: 일정 · 멤버 · 규칙 · 가입 -->
      ${renderGroupScheduleBlock(grp)}
      ${renderGroupMemberBlock(grp)}
      ${renderGroupOpsBlock(grp, isLeader, joined)}

      <div class="sheet-rule-card">
        <div class="rule-title"><span>모임 규칙 및 프라이버시</span></div>
        <p class="rule-desc">${escapeHtml(grp.rules)}</p>
      </div>

      ${renderJoinPolicySection(grp, isLeader)}
      ${isLeader ? renderApplicationList(grp) : ''}

      <!-- ===== 말머리 태그 관리 ===== -->
      <section class="tag-manager ${isLeader ? 'editable' : 'readonly'}" data-tag-manager="${grp.id}">
        <div class="tag-manager-head">
          <div>
            <h4 class="tag-manager-title">말머리 태그</h4>
            <p class="tag-manager-sub">${isLeader
              ? '그룹장만 만들고 지울 수 있어요. 멤버는 글 쓸 때 이 중에서 골라요.'
              : '그룹장이 관리하는 말머리입니다. 글 쓸 때 골라 쓸 수 있어요.'}</p>
          </div>
          ${isLeader ? '<span class="leader-badge">그룹장</span>' : ''}
        </div>

        <div class="managed-tag-list">
          ${grp.customTags.length
            ? grp.customTags.map((t) => `
                <span class="managed-tag">
                  <span>#${escapeHtml(t)}</span>
                  ${isLeader ? `<button class="tag-remove" data-remove-tag="${escapeHtml(t)}" aria-label="${escapeHtml(t)} 삭제">×</button>` : ''}
                </span>`).join('')
            : '<span class="tag-empty">아직 말머리가 없어요</span>'}
        </div>

        ${isLeader ? `
          <form class="tag-add-form" data-tag-form="${grp.id}">
            <input type="text" class="tag-add-input" maxlength="10" aria-label="새 말머리 태그" placeholder="새 말머리 (예: 새벽와드)">
            <button type="submit" class="btn-tag-add">추가</button>
          </form>
          <p class="tag-manager-hint">이미 올린 글에 달린 태그는 글 기록으로 그대로 남습니다.</p>
        ` : ''}
      </section>

      <div class="sheet-feed-preview">
        <h4 class="sheet-section-title">이 모임의 프라이빗 피드</h4>
        <div class="sheet-feed-preview-body">
          ${joined
            ? `<strong>${posts.length}개의 글</strong>이 그룹원에게만 공개되고 있어요.`
            : '가입 승인된 그룹원에게만 사진과 글이 공개됩니다.'}
        </div>
        ${joined && posts.length ? `
          <div class="sheet-thumbs">
            ${posts.slice(0, 3).map((p) => `
              <button class="sheet-thumb" data-open-feed="${grp.id}" aria-label="피드에서 보기">
                ${p.photoUrl
                  ? `<img class="media-img" src="${escapeHtml(p.photoUrl)}" alt="게시물 사진" loading="lazy" decoding="async">`
                  : `<span class="thumb-text">${escapeHtml((p.caption || '').slice(0, 30))}</span>`}
              </button>`).join('')}
          </div>` : ''}
        ${joined ? '<button class="text-btn sheet-feed-link" data-open-feed="' + grp.id + '">피드에서 보기 →</button>' : ''}
      </div>

      <div class="sheet-actions">
        ${renderJoinCta(grp)}
        ${joinState === 'none' && mode === 'approval'
          ? `<p class="join-cta-hint">소개서를 보고 그룹장이 수락하면 멤버가 돼요.</p>`
          : ''}
      </div>
    `;
  }

  /* 모임 상세 시트 이벤트 (위임) */
  el.groupModalBody && el.groupModalBody.addEventListener('click', (e) => {
    /* Sprint 14 — '전체 보기' → 전체 멤버 시트(멤버 칩을 누르면 그 멤버를 펼친다) */
    const membersBtn = e.target.closest('[data-open-members]');
    if (membersBtn) {
      const groupId = membersBtn.dataset.openMembers;
      if (el.groupModal && el.groupModal.classList.contains('active')) closeModal(el.groupModal);
      openGroupMembers(groupId);
      const focusName = membersBtn.dataset.memberFocus;
      if (focusName) {
        const member = store.getGroupRoster(groupId).members.find((m) => m.name === focusName);
        if (member) { ui.memberDetailId = member.id; renderMembersSheet(); }
      }
      return;
    }

    /* 그룹장 — 부방장에게 멤버 승인·강퇴 권한 주기 (Sprint 16) */
    const deputyMod = e.target.closest('[data-deputy-moderate-toggle]');
    if (deputyMod) {
      const groupId = deputyMod.dataset.deputyModerateToggle;
      const current = store.getDeputyPermissions(groupId).deputyCanModerate;
      const res = store.setDeputyModeratePermission(groupId, !current);
      if (!res.ok) {
        showToast('그룹장만 바꿀 수 있어요', 'warning');
        return;
      }
      renderGroupDetail(res.groupId ? store.getGroup(res.groupId) : null);
      showToast(res.deputyCanModerate
        ? '부방장에게 멤버 승인·강퇴까지 맡겼어요'
        : '부방장은 공지·일정만 쓸 수 있어요 · 승인·강퇴는 그룹장만', 'info');
      return;
    }

    /* 그룹장 — 그룹 내 1:1 대화 허용 ON/OFF */
    const dmToggle = e.target.closest('[data-group-dm-toggle]');
    if (dmToggle) {
      const groupId = dmToggle.dataset.groupDmToggle;
      const current = store.getGroupDmPolicy(groupId).enabled;
      const res = store.updateGroupDmPolicy(groupId, !current);
      if (!res.ok) {
        showToast('그룹장만 1:1 대화 허용을 바꿀 수 있어요', 'warning');
        return;
      }
      renderGroupDetail(res.group);
      showToast(res.enabled
        ? '그룹 내 1:1 대화를 허용했어요'
        : '그룹 내 1:1 대화를 꺼두었어요 · 지금 열려 있는 방은 그대로 남아요', 'info');
      return;
    }

    /* 말머리 삭제 */
    const removeBtn = e.target.closest('[data-remove-tag]');
    if (removeBtn) {
      const manager = removeBtn.closest('[data-tag-manager]');
      const groupId = manager.dataset.tagManager;
      const tag = removeBtn.dataset.removeTag;
      const result = store.deleteGroupCustomTag(groupId, tag);
      if (result.ok) {
        renderGroupDetail(store.getGroup(groupId));
        showToast(`'#${tag}' 말머리를 삭제했어요`, 'info');
      } else if (result.reason === 'permission') {
        showToast('그룹장만 말머리를 삭제할 수 있어요', 'warning');
      }
      return;
    }

    /* 피드로 이동 */
    const feedLink = e.target.closest('[data-open-feed]');
    if (feedLink) {
      const groupId = feedLink.dataset.openFeed;
      closeModal(el.groupModal);
      goGroupFeed(groupId, 'feed');
      return;
    }

    /* 가입 토글 (자유 가입 모임 / 탈퇴) */
    const joinBtn = e.target.closest('[data-modal-join]');
    if (joinBtn) {
      const groupId = joinBtn.dataset.modalJoin;
      const wasJoined = store.isGroupJoined(groupId);
      const ok = store.toggleJoinGroup(groupId);
      if (!ok && !wasJoined) {
        const age = store.isAgeEligible(groupId);
        showToast(!age.ok ? age.message : '이 모임은 승인제예요 · 가입 신청서를 내 주세요', 'warning');
        renderGroupDetail(store.getGroup(groupId));
        return;
      }
      renderGroupDetail(store.getGroup(groupId));
      renderExplore();
      renderFeed();
      updateBadges();
      return;
    }

    /* 가입 신청서 열기 (승인제) */
    const applyBtn = e.target.closest('[data-apply-group]');
    if (applyBtn) {
      openApplyModal(applyBtn.dataset.applyGroup);
      return;
    }

    /* 내 대기 신청 취소 */
    const cancelBtn = e.target.closest('[data-cancel-application]');
    if (cancelBtn) {
      const res = store.cancelApplication(cancelBtn.dataset.cancelApplication);
      if (res.ok) {
        renderGroupDetail(res.group || store.getGroup(ui.applyGroupId));
        renderExplore({ preserve: true });
        updateBadges();
        showToast('가입 신청을 취소했어요', 'info');
      }
      return;
    }

    /* 그룹장 — 신청 수락 */
    const approveBtn = e.target.closest('[data-approve-app]');
    if (approveBtn) {
      const res = store.approveApplication(approveBtn.dataset.approveApp);
      if (!res.ok) {
        showToast(res.reason === 'permission' ? '그룹장만 수락할 수 있어요' : '이미 처리된 신청서예요', 'warning');
        return;
      }
      renderGroupDetail(res.group);
      renderExplore({ preserve: true });
      updateBadges();
      showToast(`${res.application.applicantName}님을 멤버로 수락했어요 · 승인 환영 알림을 보냈어요`);
      if (navigator.vibrate) navigator.vibrate(12);
      return;
    }

    /* 그룹장 — 신청 거절 */
    const rejectBtn = e.target.closest('[data-reject-app]');
    if (rejectBtn) {
      const res = store.rejectApplication(rejectBtn.dataset.rejectApp);
      if (!res.ok) {
        showToast(res.reason === 'permission' ? '그룹장만 거절할 수 있어요' : '이미 처리된 신청서예요', 'warning');
        return;
      }
      renderGroupDetail(res.group);
      renderExplore({ preserve: true });
      updateBadges();
      showToast(`${res.application.applicantName}님의 신청을 정중히 거절했어요`, 'info');
      return;
    }

    /* 그룹장 — 가입 방식 변경 */
    const modeBtn = e.target.closest('[data-policy-mode]');
    if (modeBtn) {
      const groupId = modeBtn.closest('[data-join-policy]').dataset.joinPolicy;
      const res = store.updateGroupJoinPolicy(groupId, { joinMode: modeBtn.dataset.policyMode });
      if (!res.ok) {
        showToast(res.reason === 'questions' ? '승인제로 바꾸려면 가입 질문이 하나는 필요해요' : '가입 방식을 바꾸지 못했어요', 'warning');
        return;
      }
      renderGroupDetail(res.group);
      renderExplore({ preserve: true });
      const stillPending = store.getPendingApplications(groupId).length;
      if (res.group.joinMode === 'open') {
        showToast(stillPending
          ? `가입 방식을 자유 가입으로 바꿨어요 · 대기 중인 신청서 ${stillPending}건은 직접 처리해 주세요`
          : '가입 방식을 자유 가입으로 바꿨어요 · 누구나 바로 참여해요');
      } else {
        showToast('가입 방식을 승인제로 바꿨어요 · 소개서를 보고 직접 고를게요');
      }
      return;
    }

    /* 그룹장 — 나이 제한 변경 */
    const ageBtn = e.target.closest('[data-policy-age]');
    if (ageBtn) {
      const groupId = ageBtn.closest('[data-join-policy]').dataset.joinPolicy;
      const res = store.updateGroupJoinPolicy(groupId, { ageLimit: ageBtn.dataset.policyAge });
      if (!res.ok) {
        showToast('나이 제한을 바꾸지 못했어요', 'warning');
        return;
      }
      renderGroupDetail(res.group);
      renderExplore({ preserve: true });
      const option = store.getGroupAgeLimit(groupId);
      showToast(option.id === 'all' ? '나이 제한을 없앴어요' : `나이 제한을 ${option.label} 으로 바꿨어요`);
      return;
    }

    /* 그룹장 — 가입 질문 삭제 */
    const qDel = e.target.closest('[data-policy-qdel]');
    if (qDel) {
      const groupId = qDel.closest('[data-join-policy]').dataset.joinPolicy;
      const questions = store.getGroupJoinQuestions(groupId).slice();
      questions.splice(Number(qDel.dataset.policyQdel), 1);
      const res = store.updateGroupJoinPolicy(groupId, { joinQuestions: questions });
      if (!res.ok) {
        showToast('질문은 최소 하나는 있어야 해요', 'warning');
        return;
      }
      renderGroupDetail(res.group);
      showToast('가입 질문을 삭제했어요', 'info');
      return;
    }
  });

  el.groupModalBody && el.groupModalBody.addEventListener('submit', (e) => {
    const policyForm = e.target.closest('[data-policy-qform]');
    if (policyForm) {
      e.preventDefault();
      const groupId = policyForm.closest('[data-join-policy]').dataset.joinPolicy;
      const input = policyForm.querySelector('.policy-question-input');
      const questions = store.getGroupJoinQuestions(groupId).concat(String(input.value || '').trim()).filter(Boolean);
      const res = store.updateGroupJoinPolicy(groupId, { joinQuestions: questions });
      if (!res.ok) {
        showToast(res.reason === 'question_long' ? '질문은 60자까지 가능해요' : '질문을 추가하지 못했어요', 'warning');
        return;
      }
      renderGroupDetail(res.group);
      showToast('가입 질문을 추가했어요');
      return;
    }
    const form = e.target.closest('[data-tag-form]');
    if (!form) return;
    e.preventDefault();
    const groupId = form.dataset.tagForm;
    const input = form.querySelector('.tag-add-input');
    const result = store.addGroupCustomTag(groupId, input.value);

    if (result.ok) {
      renderGroupDetail(store.getGroup(groupId));
      showToast(`'#${result.tag}' 말머리를 추가했어요`);
    } else {
      const messages = {
        empty: '태그 이름을 입력해 주세요',
        duplicate: '이미 있는 말머리예요',
        too_long: '말머리는 10자까지 가능해요',
        too_many: '말머리는 최대 12개까지 만들 수 있어요',
        permission: '그룹장만 말머리를 만들 수 있어요'
      };
      showToast(messages[result.reason] || '추가하지 못했어요', 'warning');
      input.focus();
    }
  });

  /* ==========================================================================
   * 4. 프라이빗 피드 (인스타그램형)
   * ======================================================================== */
  const HEART_SVG = (filled) => filled
    ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;

  const COMMENT_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
  const SEND_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
  const BOOKMARK_SVG = (filled) => `<svg viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;

  function renderFeedChips() {
    if (!el.feedChips) return;
    const joined = store.getJoinedGroups();
    const myCount = store.getPosts('my').length;

    let html = `
      <button class="feed-chip ${!ui.feedGroupId ? 'active' : ''}" data-feed-group="all">
        전체 <span class="chip-count">${myCount}</span>
      </button>`;

    html += joined.map((g) => {
      const count = store.state.feedPosts.filter((p) => p.groupId === g.id).length;
      return `<button class="feed-chip ${ui.feedGroupId === g.id ? 'active' : ''}" data-feed-group="${g.id}">
                <span class="chip-emoji">${ic(g.icon)}</span> ${escapeHtml(g.categoryName)}
                <span class="chip-count">${count}</span>
              </button>`;
    }).join('');

    el.feedChips.innerHTML = html;
  }

  function renderComments(post, expanded) {
    const comments = post.comments;
    if (!comments.length) return '';
    const shown = expanded ? comments : comments.slice(-2);
    const meId = store.currentUser.id;
    return `
      <div class="comment-list">
        ${comments.length > 2 && !expanded
          ? `<button class="comment-more" data-action="expand-comments">댓글 ${comments.length}개 모두 보기</button>`
          : ''}
        ${shown.map((c) => `
          <div class="comment-item ${c.parentId ? 'is-reply' : ''}">
            <span class="comment-author">${c.parentId && c.replyToName ? `<span class="comment-reply-to">↳ ${escapeHtml(c.replyToName)}</span> ` : ''}${escapeHtml(c.authorName)}${c.authorId === meId ? '<span class="me-badge">나</span>' : ''}</span>
            <span class="comment-text">${escapeHtml(c.text)}</span>
            <span class="comment-time" data-created="${c.createdAt}">${timeAgo(c.createdAt)}</span>
            <button class="comment-like ${c.likedByMe ? 'liked' : ''}" data-action="comment-like" data-comment-id="${c.id}"
                    aria-pressed="${!!c.likedByMe}" type="button"
                    aria-label="${escapeHtml(c.authorName)}님 댓글 좋아요"><span aria-hidden="true">${ic('heart', { filled: c.likedByMe })}</span>${c.likes ? ` ${c.likes}` : ''}</button>
            ${c.parentId ? '' : `<button class="comment-reply" data-action="reply" data-comment-id="${c.id}" data-comment-author="${escapeHtml(c.authorName)}" type="button">답글</button>`}
          </div>`).join('')}
        ${expanded && comments.length > 2
          ? '<button class="comment-more collapse" data-action="collapse-comments">댓글 접기</button>' : ''}
      </div>`;
  }

  function postCardHTML(post) {
    const grp = store.getGroup(post.groupId);
    /* 인기 탭에서는 반응 점수 순위를 배지로 보여준다 */
    const rank = ui.feedFilter === 'popular'
      ? store.getPosts('popular', ui.feedGroupId).findIndex((p) => p.id === post.id) + 1
      : 0;
    const expanded = ui.expandedComments.has(post.id);
    const isNew = post.id === ui.lastCreatedPostId;
    const media = post.photoUrl
      ? `<img class="media-img" src="${escapeHtml(post.photoUrl)}" alt="게시물 사진" loading="lazy" decoding="async" width="400" height="400">`
      : '';

    return `
      <article class="feed-card ${isNew ? 'is-new' : ''} ${media ? 'has-media' : 'is-text-only'}" data-post-id="${post.id}" data-has-media="${media ? '1' : '0'}">
        <header class="feed-card-header">
          <button class="feed-avatar" style="background:${post.authorGradient}" data-author="${escapeHtml(post.authorName)}">
            ${escapeHtml(post.authorAvatarText)}
          </button>
          <div class="feed-author-block">
            <div class="feed-author-line">
              <span class="feed-author-name">${escapeHtml(post.authorName)}</span>
              ${post.authorId === store.currentUser.id ? '<span class="me-badge">나</span>' : ''}
            </div>
            <button class="feed-group-badge" data-open-group="${post.groupId}">
              ${grp ? ic(grp.icon) : ic('folder')} ${grp ? escapeHtml(grp.name) : '모임'}
            </button>
          </div>
          <div class="feed-header-right">
            <div class="feed-time" data-created="${post.createdAt}">${timeAgo(post.createdAt)}</div>
            ${post.authorId === store.currentUser.id ? `
              <div class="post-menu-wrap">
                <button class="post-more" data-action="more" aria-label="게시물 메뉴" aria-expanded="false">⋯</button>
              </div>` : ''}
          </div>
        </header>

        ${rank > 0 && rank <= 3 ? `<div class="feed-rank-row"><span class="rank-badge">인기 ${rank}위</span></div>` : ''}
        ${(post.tag || post.mediaCaption) ? `
        <div class="feed-tag-row">
          ${post.tag ? `<span class="feed-tag">#${escapeHtml(post.tag)}</span>` : ''}
          ${post.mediaCaption ? `<span class="feed-media-meta">${escapeHtml(post.mediaCaption)}</span>` : ''}
        </div>` : ''}

        ${media ? `
        <div class="feed-media">
          ${media}
        </div>` : ''}

        <div class="feed-actions">
          <div class="feed-actions-left">
            <button class="feed-action like ${post.likedByMe ? 'liked' : ''}" data-action="like" aria-label="좋아요" aria-pressed="${post.likedByMe}">
              <span class="heart-wrap">${HEART_SVG(post.likedByMe)}</span>
            </button>
            <button class="feed-action" data-action="comment" aria-label="댓글">${COMMENT_SVG}</button>
            <button class="feed-action" data-action="share" aria-label="공유">${SEND_SVG}</button>
          </div>
          <button class="feed-action bookmark ${post.bookmarkedByMe ? 'saved' : ''}" data-action="bookmark" aria-label="북마크">
            ${BOOKMARK_SVG(post.bookmarkedByMe)}
          </button>
        </div>

        <div class="feed-likes"><strong>좋아요 ${fmtCount(post.likes)}개</strong></div>

        ${post.caption ? `
          <p class="feed-caption"><span class="caption-author">${escapeHtml(post.authorName)}</span> ${escapeHtml(post.caption)}</p>` : ''}

        ${renderComments(post, expanded)}

        <form class="comment-form" data-comment-form="${post.id}">
          <input type="text" class="comment-input" aria-label="댓글 입력" placeholder="댓글 달기..." maxlength="300" autocomplete="off">
          <button type="submit" class="comment-submit" disabled>게시</button>
        </form>
      </article>`;
  }

  function renderFeed() {
    if (!el.feedList) return;
    closeAllPostMenus();
    /* 탈퇴한 모임이 필터에 남아 있으면 전체 보기로 되돌린다 */
    if (ui.feedGroupId && !store.isGroupJoined(ui.feedGroupId)) ui.feedGroupId = null;
    el.subtabs.forEach((t) => {
      const on = t.dataset.filter === ui.feedFilter;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    renderFeedChips();

    const posts = store.getPosts(ui.feedFilter, ui.feedGroupId);

    if (!posts.length) {
      const isPopular = ui.feedFilter === 'popular';
      el.feedList.innerHTML = `
        <div class="empty-state feed-empty">
          ${emptyArt(isPopular ? 'explore' : 'feed')}
          <p class="empty-title">${isPopular ? '아직 인기 글이 없어요' : '아직 이 피드에 글이 없어요'}</p>
          <p class="empty-desc">${isPopular
            ? '모임원들의 반응이 쌓이면 인기 오운완이 여기에 모여요.'
            : '첫 오운완 사진을 올려 모임원에게 인사해보세요.'}</p>
          ${isPopular ? '' : '<button class="btn-secondary" data-empty-write="1">첫 글 쓰기</button>'}
        </div>`;
      return;
    }

    el.feedList.innerHTML = posts.map(postCardHTML).join('');
    ui.lastCreatedPostId = null;
  }

  /* --- 피드 이벤트 (위임) --- */
  el.feedList && el.feedList.addEventListener('click', (e) => {
    const card = e.target.closest('[data-post-id]');
    if (!card) {
      const writeBtn = e.target.closest('[data-empty-write]');
      if (writeBtn) openComposer();
      return;
    }
    const postId = card.dataset.postId;
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;

      if (action === 'like') {
        animateLike(card, postId);
        return;
      }
      if (action === 'comment') {
        const input = card.querySelector('.comment-input');
        if (input) { input.focus(); input.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        return;
      }
      if (action === 'share') {
        sharePost(postId);
        return;
      }
      if (action === 'more') {
        openPostMenu(actionBtn, postId);
        return;
      }
      if (action === 'bookmark') {
        const saved = store.toggleBookmark(postId);
        actionBtn.classList.toggle('saved', !!saved);
        actionBtn.innerHTML = BOOKMARK_SVG(!!saved);
        showToast(saved ? '북마크에 저장했어요' : '북마크를 해제했어요', 'info');
        return;
      }
      if (action === 'comment-like') {
        const res = store.toggleCommentLike(postId, actionBtn.dataset.commentId);
        if (!res) return;
        rerenderCard(card, postId);
        if (res.liked) {
          showToast('댓글에 좋아요를 눌렀어요', 'info');
          if (navigator.vibrate) navigator.vibrate(6);
        }
        return;
      }
      if (action === 'reply') {
        ui.replyTo = { postId, commentId: actionBtn.dataset.commentId, name: actionBtn.dataset.commentAuthor || '' };
        const input = card.querySelector('.comment-input');
        if (input) {
          input.placeholder = `${ui.replyTo.name}님에게 답글...`;
          input.dataset.replyTo = ui.replyTo.commentId;
          input.focus();
          input.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        return;
      }
      if (action === 'expand-comments') {
        ui.expandedComments.add(postId);
        rerenderCard(card, postId);
        return;
      }
      if (action === 'collapse-comments') {
        ui.expandedComments.delete(postId);
        rerenderCard(card, postId);
        return;
      }
    }

    /* 미디어 더블 탭 → 인스타그램식 좋아요 */
    const mediaEl = e.target.closest('.feed-media');
    if (mediaEl) {
      const now = Date.now();
      if (ui.lastTap && ui.lastTap.postId === postId && now - ui.lastTap.time < 340) {
        ui.lastTap = null;
        const post = store.getPost(postId);
        if (post && !post.likedByMe) animateLike(card, postId);
        showLove(card);
        return;
      }
      ui.lastTap = { postId, time: now };
      return;
    }

    const groupBadge = e.target.closest('[data-open-group]');
    if (groupBadge) { openGroupDetail(groupBadge.dataset.openGroup); return; }

    const authorBtn = e.target.closest('[data-author]');
    if (authorBtn) {
      showToast(`${authorBtn.dataset.author}님의 프로필은 다음 업데이트에서 열려요`, 'info');
    }
  });

  /* 댓글 입력 → 게시 버튼 활성화 / 전송 */
  el.feedList && el.feedList.addEventListener('input', (e) => {
    const input = e.target.closest('.comment-input');
    if (!input) return;
    const submit = input.closest('form').querySelector('.comment-submit');
    submit.disabled = input.value.trim().length === 0;
  });

  el.feedList && el.feedList.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-comment-form]');
    if (!form) return;
    e.preventDefault();
    const postId = form.dataset.commentForm;
    const input = form.querySelector('.comment-input');
    const parentId = input && input.dataset.replyTo && ui.replyTo && ui.replyTo.postId === postId
      ? input.dataset.replyTo : null;
    const comment = store.addComment(postId, input.value, parentId);
    if (!comment) return;
    if (input) { input.dataset.replyTo = ''; input.placeholder = '댓글 달기...'; }
    ui.replyTo = null;

    const card = form.closest('[data-post-id]');
    ui.expandedComments.add(postId);
    rerenderCard(card, postId);
    showToast(comment.parentId ? '답글을 남겼어요' : '댓글을 남겼어요');

    const fresh = el.feedList.querySelector(`[data-post-id="${postId}"]`);
    const freshInput = fresh && fresh.querySelector('.comment-input');
    if (freshInput) freshInput.focus();
  });

  /* 게시물 링크 공유 — 클립보드 복사(가능한 경우) 후 안내.
     실제 서비스에서는 이 링크가 로그인/모임 가입 여부를 검사하는 딥링크가 된다. */
  function sharePost(postId) {
    const base = location.href.split('#')[0];
    const link = `${base}#${postId}`;
    const done = () => {
      showToast('이 글의 링크를 복사했어요 · 모임원만 열람할 수 있어요', 'info');
      if (navigator.vibrate) navigator.vibrate(8);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done).catch(() => {
        showToast(link, 'info');
      });
    } else {
      showToast(link, 'info');
    }
  }

  /* 게시물 삭제 — 실수 방지를 위해 '되돌리기' 토스트를 함께 제공 */
  function deletePostWithUndo(postId) {
    const removed = store.deletePost(postId);
    if (!removed) {
      showToast('내가 쓴 글만 삭제할 수 있어요', 'warning');
      return;
    }
    closeAllPostMenus();
    renderFeed();
    updateBadges();
    showToast('게시물을 삭제했어요', 'info', {
      label: '되돌리기',
      onClick: () => {
        store.restorePost(removed.post, removed.index);
        renderFeed();
        updateBadges();
        showToast('게시물을 되살렸어요');
      }
    });
  }

  /* 게시물 메뉴는 body 에 붙는 포털로 띄운다.
     (피드 카드의 overflow/transform 에 좌표가 영향받지 않도록) */
  function openPostMenu(anchor, postId) {
    const wasOpen = document.querySelector('.post-menu');
    closeAllPostMenus();
    if (wasOpen) return;                       // 열린 상태에서 다시 누르면 닫기만

    const menu = document.createElement('div');
    menu.className = 'post-menu';
    menu.setAttribute('role', 'menu');
    const item = document.createElement('button');
    item.className = 'post-menu-item danger';
    item.type = 'button';
    item.setAttribute('data-delete-post', postId);
    item.textContent = '게시물 삭제';
    menu.appendChild(item);
    document.body.appendChild(menu);

    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${Math.min(window.innerHeight - 58, rect.bottom + 6)}px`;
    menu.style.left = `${Math.max(8, Math.min(window.innerWidth - 140, rect.right - 132))}px`;
    anchor.setAttribute('aria-expanded', 'true');
    item.focus({ preventScroll: true });
  }

  function closeAllPostMenus() {
    document.querySelectorAll('.post-menu').forEach((m) => m.remove());
    document.querySelectorAll('.post-more').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  /* 바깥 클릭: 메뉴가 열려 있으면 닫고, 메뉴 항목 클릭은 삭제로 처리 */
  document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-delete-post]');
    if (deleteBtn) {
      e.preventDefault();
      deletePostWithUndo(deleteBtn.dataset.deletePost);
      return;
    }
    if (e.target.closest('[data-action="more"]')) return;   // 방금 연 메뉴는 유지
    if (!e.target.closest('.post-menu')) closeAllPostMenus();
  });


  function rerenderCard(cardNode, postId) {
    const post = store.getPost(postId);
    if (!post || !cardNode) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = postCardHTML(post);
    const newCard = wrapper.firstElementChild;
    /* 같은 위치에서 교체해 스크롤 위치를 유지한다 */
    cardNode.replaceWith(newCard);
  }

  function showLove(card) {
    const media = card.querySelector('.feed-media');
    if (!media) return;
    const heart = document.createElement('span');
    heart.className = 'love-overlay';
    heart.innerHTML = ic('heart');
    media.appendChild(heart);
    setTimeout(() => heart.remove(), 850);
  }

  function animateLike(card, postId) {
    const result = store.toggleLike(postId);
    if (!result) return;
    const btn = card.querySelector('[data-action="like"]');
    const heartWrap = btn.querySelector('.heart-wrap');
    const likesEl = card.querySelector('.feed-likes strong');

    btn.classList.toggle('liked', result.liked);
    btn.setAttribute('aria-pressed', String(result.liked));
    heartWrap.innerHTML = HEART_SVG(result.liked);
    likesEl.textContent = `좋아요 ${fmtCount(result.likes)}개`;

    btn.classList.remove('pop');
    void btn.offsetWidth;            // reflow → 애니메이션 재시작
    btn.classList.add('pop');

    if (navigator.vibrate) navigator.vibrate(8);

    if (result.liked) {
      const burst = document.createElement('span');
      burst.className = 'heart-burst';
      burst.innerHTML = ic('heart');
      btn.appendChild(burst);
      setTimeout(() => burst.remove(), 700);
    }
  }

  /* 피드 서브탭 & 모임 칩 */
  el.subtabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      ui.feedFilter = tab.dataset.filter;
      renderFeed();
      scrollTop();
    });
  });

  el.feedChips && el.feedChips.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-feed-group]');
    if (!chip) return;
    const value = chip.dataset.feedGroup;
    ui.feedGroupId = value === 'all' ? null : value;
    renderFeed();
  });

  /* ==========================================================================
   * 5. 글쓰기 (FAB + 작성 모달)
   * ======================================================================== */
  function openComposer(prefillGroupId) {
    const joined = store.getJoinedGroups();
    if (!joined.length) {
      showToast('글을 쓰려면 먼저 소모임에 가입해 주세요', 'warning');
      return;
    }
    /* Sprint 15 — 보고 있던 모임을 알아서 골라 둔다(모임 선택 한 번 줄임). */
    const viewing = ui.activeTab === 'tab-home' ? (ui.homeGroupId || store.getHomeGroupId()) : null;
    const startGroup = store.getGroup(prefillGroupId || viewing || ui.feedGroupId) || joined[0];
    ui.composer = { groupId: startGroup.id, tag: null, photoUrl: null };
    renderPhotoPreview('composer');
    composerResetFields();
    renderComposerGroups();
    renderComposerTags();
    renderMediaPicker();
    updatePublishState();
    openModal(el.composerModal);
  }

  /* (DOM 초기화 헬퍼) 캡션/사진문구 비우기 */
  function composerResetFields() {
    if (el.composerCaption) { el.composerCaption.value = ''; }
    if (el.composerMediaCaption) { el.composerMediaCaption.value = ''; }
    if (el.composerPhotoUrl) { el.composerPhotoUrl.value = ''; }
    if (el.captionCount) el.captionCount.textContent = '0';
  }
  function renderComposerGroups() {
    const joined = store.getJoinedGroups();
    el.composerGroupList.innerHTML = joined.map((g) => `
      <button class="composer-group-chip ${ui.composer.groupId === g.id ? 'active' : ''}" data-pick-group="${g.id}">
        <span class="chip-thumb">${ic(g.icon)}</span>
        <span class="chip-text">
          <strong>${escapeHtml(g.name)}</strong>
          <span>${escapeHtml(g.categoryName)} · 멤버 ${g.memberCount}명</span>
        </span>
        <span class="chip-check">${ic('check')}</span>
      </button>
    `).join('');
  }

  function renderComposerTags() {
    const grp = store.getGroup(ui.composer.groupId);
    const tags = grp ? grp.customTags : [];
    let html = `<button class="tag-pick ${!ui.composer.tag ? 'active' : ''}" data-pick-tag="">말머리 없음</button>`;
    if (!tags.length) {
      html += '<span class="tag-pick-empty">이 모임에는 아직 말머리가 없어요. 그룹장이 만들면 여기에 나타나요.</span>';
    }
    html += tags.map((t) => `
      <button class="tag-pick ${ui.composer.tag === t ? 'active' : ''}" data-pick-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>
    `).join('');
    el.composerTagList.innerHTML = html;
  }

  /** Sprint 18 — 예시 사진 선택기는 없앴다. 사진은 앨범·카메라로 올린 것만 쓴다. */
  function renderMediaPicker() { /* 예시 사진 없음 — 남길 것이 없다 */ }

  /* 이미지 URL 미리보기 — 게시 전에 주소가 실제로 열리는지 눈으로 확인 */
  function updatePhotoPreview() {
    if (!el.photoPreview) return;
    const url = (el.composerPhotoUrl.value || '').trim();
    if (!/^https?:\/\//i.test(url)) {
      el.photoPreview.hidden = true;
      el.photoPreview.classList.remove('failed');
      el.photoPreviewImg.removeAttribute('src');
      return;
    }
    el.photoPreview.hidden = false;
    el.photoPreview.classList.remove('failed');
    el.photoPreviewImg.onerror = () => {
      el.photoPreview.classList.add('failed');
      el.photoPreviewNote.textContent = '이미지를 불러올 수 없어요. 주소를 확인해 주세요.';
    };
    el.photoPreviewImg.onload = () => {
      el.photoPreview.classList.remove('failed');
      el.photoPreviewNote.textContent = '미리보기 · 이 사진으로 게시됩니다';
    };
    el.photoPreviewNote.textContent = '이미지 불러오는 중...';
    el.photoPreviewImg.src = url;
  }

  function updatePublishState() {
    const caption = el.composerCaption.value.trim();
    const hasUrl = /^https?:\/\//i.test((el.composerPhotoUrl ? el.composerPhotoUrl.value : '').trim());
    const hasPhoto = !!ui.composer.photoUrl;
    el.publishBtn.disabled = !(ui.composer.groupId && (caption || hasUrl || hasPhoto));
    el.publishBtn.classList.toggle('ready', !el.publishBtn.disabled);
  }

  el.composerGroupList && el.composerGroupList.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-pick-group]');
    if (!chip) return;
    ui.composer.groupId = chip.dataset.pickGroup;
    ui.composer.tag = null;          // 모임이 바뀌면 말머리 선택도 초기화
    renderComposerGroups();
    renderComposerTags();
    updatePublishState();
  });

  el.composerTagList && el.composerTagList.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-pick-tag]');
    if (!chip) return;
    const value = chip.dataset.pickTag;
    ui.composer.tag = value || null;
    renderComposerTags();
  });

  /* Sprint 17 — 앨범/카메라 사진 (게시물·스토리·오픈 글) */
  wirePhotoPicker('composer', el.composerPhotoAlbum, el.composerPhotoCamera,
    $('#btn-composer-album'), $('#btn-composer-camera'), $('#btn-composer-photo-remove'));
  wirePhotoPicker('story', el.storyPhotoAlbum, el.storyPhotoCamera,
    $('#btn-story-album'), $('#btn-story-camera'), $('#btn-story-photo-remove'));
  wirePhotoPicker('explore', el.explorePhotoAlbum, el.explorePhotoCamera,
    $('#btn-explore-album'), $('#btn-explore-camera'), $('#btn-explore-photo-remove'));

  el.composerPhotoUrl && el.composerPhotoUrl.addEventListener('input', () => {
    updatePublishState();
    updatePhotoPreview();
  });

  el.composerCaption && el.composerCaption.addEventListener('input', () => {
    el.captionCount.textContent = String(el.composerCaption.value.length);
    updatePublishState();
  });

  el.publishBtn && el.publishBtn.addEventListener('click', () => {
    const post = store.createPost({
      groupId: ui.composer.groupId,
      tag: ui.composer.tag,
      caption: el.composerCaption.value,
      mediaCaption: el.composerMediaCaption ? el.composerMediaCaption.value : '',
      photoUrl: ui.composer.photoUrl || (el.composerPhotoUrl ? el.composerPhotoUrl.value : '')
    });
    if (!post) {
      showToast('모임과 내용을 확인해 주세요', 'warning');
      return;
    }
    closeModal(el.composerModal);
    ui.lastCreatedPostId = post.id;
    goGroupFeed(post.groupId, 'feed');
    updateBadges();
    const grp = store.getGroup(post.groupId);
    showToast(`'${grp ? grp.name : '모임'}'에 게시했어요 · 이 모임 피드에만 보여요`);
    scrollTop();
  });

  el.fab && el.fab.addEventListener('click', () => openComposer());

  /* ==========================================================================
   * 6-2. 채팅 탭 — 1:1 대화방 목록 + 인앱 대화방 상세 (Sprint 4)
   * ======================================================================== */
  function renderChatRooms() {
    if (!el.chatRooms) return;
    /* Sprint 16 — 바깥 3번째 탭 = '전체 디엠함'. 모임 안에서는 그 모임 대화만. */
    const inGroup = isGroupMode();
    const scopeGroup = inGroup ? store.getGroup(ui.groupSpaceId) : null;
    renderChatGroupRooms();
    const allRooms = store.state.chatRooms;
    /* 모임 안에서는 그 모임에서 시작한 1:1 방만 보인다. Sprint 17 — 안 읽은 것만 필터. */
    const roomsAll = inGroup
      ? allRooms.filter((r) => store.getChatRoomGroupId(r.id) === ui.groupSpaceId)
      : allRooms;
    const rooms = ui.dmUnreadOnly ? roomsAll.filter((r) => (r.unreadCount || 0) > 0) : roomsAll;
    /* Sprint 17 — 모임별/최근순 전환 · 안 읽은 대화만 */
    if (el.dmViewSeg) {
      el.dmViewSeg.innerHTML = [
        { id: 'recent', label: '최근순' },
        { id: 'group', label: '모임별' }
      ].map((o) => `<button class="dm-view-btn ${ui.dmView === o.id ? 'active' : ''}" data-dm-view="${o.id}"
        type="button" aria-pressed="${ui.dmView === o.id}">${o.label}</button>`).join('');
      el.dmViewSeg.hidden = inGroup;
    }
    if (el.dmUnreadToggle) {
      el.dmUnreadToggle.setAttribute('aria-pressed', String(ui.dmUnreadOnly));
      el.dmUnreadToggle.classList.toggle('on', ui.dmUnreadOnly);
    }
    renderDmSentBanner();
    if (el.dmScope) {
      el.dmScope.hidden = !inGroup;
      if (inGroup && el.dmScopeName) {
        el.dmScopeName.textContent = `${scopeGroup ? scopeGroup.name : '모임'} 대화만 모아 봐요`;
      }
    }
    if (el.dmTitle) el.dmTitle.textContent = inGroup ? '모임 디엠' : '전체 디엠함';
    if (el.dmSub) {
      el.dmSub.textContent = inGroup ? '이 모임의 전체방과 1:1 대화' : '';
    }
    if (el.chatRoomCount) el.chatRoomCount.textContent = String(rooms.length);
    if (el.chatDmCount) el.chatDmCount.textContent = `${rooms.length}명`;
    if (el.menuChatCount) el.menuChatCount.textContent = `${allRooms.length}개`;

    /* Sprint 15 — 1:1 대화를 꺼둔 모임이 있으면 여기서 먼저 알려준다. */
    if (el.chatDmPolicy) {
      /* Sprint 24 — 기본 상태는 설명하지 않는다. 꺼둔 모임이 있을 때만 그 사실을 적는다. */
      const off = store.getJoinedGroups().filter((g) => g.dmEnabled === false);
      el.chatDmPolicy.className = `chat-dm-policy ${off.length ? 'is-off' : 'is-on'}`;
      el.chatDmPolicy.hidden = off.length === 0;
      el.chatDmPolicy.innerHTML = off.length
        ? `${off.map((g) => escapeHtml(g.name)).join(', ')}는 1:1 대화가 꺼져 있어요`
        : '';
    }

    if (!rooms.length) {
      el.chatRooms.innerHTML = `
        <div class="empty-state chat-empty">
          ${emptyArt('chat')}
          <p class="empty-title">${ui.dmUnreadOnly ? '안 읽은 대화가 없어요' : '아직 대화방이 없어요'}</p>
          <p class="empty-desc">${ui.dmUnreadOnly
            ? '모든 대화를 다 읽었어요. 탐색에서 새 사람에게 인사해 보세요.'
            : '탐색에서 마음에 드는 사람에게 바로 쪽지를 보내보세요.<br>보낸 쪽지는 이곳에 바로 올라옵니다.'}</p>
          <div class="empty-actions">
            <button class="btn-primary" data-go-match="1">취미친구 보러 가기</button>
          </div>
        </div>`;
      return;
    }

    /* Sprint 13 — 최근 대화 순서로 묶어 준다(오늘 · 어제 · 그 이전).
       방의 마지막 메시지 시각을 기준으로 정렬해 "누가 먼저인지"가 한눈에 보이게. */
    const lastAtOf = (room) => {
      const msgs = room.messages || [];
      const last = msgs.reduce((max, m) => {
        const t = new Date(m.at).getTime();
        return Number.isFinite(t) && t > max ? t : max;
      }, 0);
      return last;
    };
    const startOf = (offsetDays) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - offsetDays);
      return d.getTime();
    };
    const todayStart = startOf(0);
    const yesterdayStart = startOf(1);
    const buckets = [
      { id: 'today', label: '오늘', test: (t) => t >= todayStart },
      { id: 'yesterday', label: '어제', test: (t) => t >= yesterdayStart && t < todayStart },
      { id: 'older', label: '그 이전', test: () => true }
    ];
    const sorted = rooms.slice().sort((a, b) => lastAtOf(b) - lastAtOf(a));

    /* 목록의 시각은 방의 마지막 메시지에서 바로 만든다 — 저장된 문구('어제 22:40')와
       실제 시각이 어긋나 '오늘' 묶음에 '어제'라고 적히는 일을 막는다. */
    const listTimeLabel = (t) => {
      if (!t) return '';
      if (t >= todayStart) {
        if (Date.now() - t < 10 * 60 * 1000) return '방금';
        const d = new Date(t);
        const h = d.getHours();
        return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      if (t >= yesterdayStart) return '어제';
      const d = new Date(t);
      return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`;
    };

    const itemHtml = (room) => {
      const isHot = room.id === ui.highlightRoomId;
      return `
      <article class="chat-room-item ${isHot ? 'highlight' : ''}" data-room-id="${room.id}" data-partner-id="${room.partnerId}" role="button" tabindex="0" aria-label="${escapeHtml(room.partnerName)}님과의 대화방">
        <div class="chat-avatar" style="background:${room.partnerGradient || 'linear-gradient(135deg,#10B981,#047857)'}">
          ${escapeHtml(room.partnerAvatarText || room.partnerName.charAt(0))}
        </div>
        <div class="chat-content">
          <div class="chat-name-row">
            <span class="chat-name">${escapeHtml(room.partnerName)}</span>
            ${room.isNewMatch ? '<span class="chat-new-badge">새 매칭</span>' : ''}
            <span class="chat-time">${escapeHtml(listTimeLabel(lastAtOf(room)) || room.lastTime || '')}</span>
          </div>
          <p class="chat-last-msg">${escapeHtml(room.lastMessage || '')}</p>
          <span class="chat-hobby">${escapeHtml(room.partnerHobby || '')}</span>
        </div>
        ${room.unreadCount > 0 ? `<span class="unread-badge">${room.unreadCount}</span>` : ''}
      </article>`;
    };

    const used = new Set();
    const chunks = [];
    /* Sprint 17 — '모임별' 보기: 모임마다 단체방 + 그 모임 1:1 을 한 묶음으로. */
    const grouped = ui.dmView === 'group' && !inGroup;
    if (grouped) {
      const sections = store.getDmInboxSections();
      sections.sections.forEach((section) => {
        const list = ui.dmUnreadOnly ? section.directs.filter((r) => r.unread > 0) : section.directs;
        if (!list.length) return;
        chunks.push(`<div class="chat-day-head dm-group-head">
          <span>${section.group ? escapeHtml(section.group.name) : '모임 밖 대화'}</span>
          <span class="chat-day-count">${list.length}</span>
        </div>`);
        list.forEach((it) => chunks.push(itemHtml(it.room)));
      });
      if (!chunks.length) {
        chunks.push('<p class="board-empty">안 읽은 1:1 대화가 없어요.</p>');
      }
      el.chatRooms.innerHTML = chunks.join('');
      return;
    }
    buckets.forEach((bucket, i) => {
      const group = sorted.filter((room) => {
        if (used.has(room.id)) return false;
        const t = lastAtOf(room);
        const hit = i === buckets.length - 1 ? true : bucket.test(t);
        if (hit) used.add(room.id);
        return hit;
      });
      if (!group.length) return;
      chunks.push(`<div class="chat-day-head"><span>${bucket.label}</span><span class="chat-day-count">${group.length}</span></div>`);
      group.forEach((room) => chunks.push(itemHtml(room)));
    });
    el.chatRooms.innerHTML = chunks.join('');
  }

  /* ---------------------------------------------------- 대화방 상세(전체 화면) */

  /** ISO 시각 → '오늘' | '어제' | 'M월 D일' (날짜 구분선) */
  function chatDayLabel(iso) {
    const date = new Date(iso);
    const now = new Date();
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOf(now) - startOf(date)) / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return '오늘';
    if (diffDays === 1) return '어제';
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  function chatTimeLabel(iso) {
    const date = new Date(iso);
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    const ampm = h < 12 ? '오전' : '오후';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${ampm} ${hour12}:${m}`;
  }

  function renderChatMessages() {
    if (!el.chatMessages) return;
    const room = ui.openRoomId ? store.getChatRoom(ui.openRoomId) : null;
    if (!room) { el.chatMessages.innerHTML = ''; return; }

    const messages = store.getChatMessages(room.id);
    let lastDay = null;
    const rows = messages.map((msg, index) => {
      const day = chatDayLabel(msg.at);
      const divider = day !== lastDay ? `<div class="chat-day"><span>${day}</span></div>` : '';
      lastDay = day;
      const mine = msg.from === 'me';
      /* 내 말풍선의 '읽음' — 뒤에 상대 메시지가 있으면 읽은 것으로 본다 */
      const read = mine && messages.slice(index + 1).some((m) => m.from === 'them');
      const avatar = mine ? '' : `
        <span class="chat-msg-avatar" style="background:${room.partnerGradient || 'linear-gradient(135deg,#10B981,#047857)'}">
          ${escapeHtml(room.partnerAvatarText || room.partnerName.charAt(0))}
        </span>`;
      return `${divider}
        <div class="chat-msg ${mine ? 'mine' : 'them'}">
          ${avatar}
          <div class="chat-bubble">${escapeHtml(msg.text)}</div>
          <span class="chat-msg-foot">
            ${read ? '<span class="chat-read">읽음</span>' : ''}
            <span>${chatTimeLabel(msg.at)}</span>
          </span>
        </div>`;
    }).join('');

    const typing = ui.typingRoomId === room.id
      ? `<div class="chat-typing">${escapeHtml(room.partnerName)}님이 답장을 쓰는 중…</div>`
      : '';

    const empty = messages.length
      ? ''
      : `<div class="chat-day"><span>오늘</span></div>
         <p class="post-comment-empty">첫 메시지를 보내 대화를 시작해 보세요. 상대가 취미에 맞춰 답장해요.</p>`;

    el.chatMessages.innerHTML = rows + typing + empty;
    el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
  }

  function openChatRoom(roomId) {
    if (ui.drawerOpen) closeDrawer({ silent: true });
    const room = roomId ? store.getChatRoom(roomId) : null;
    if (!room || !el.chatRoomModal) return;
    ui.openRoomId = room.id;
    ui.highlightRoomId = room.id;
    store.markChatRoomRead(room.id);

    el.chatRoomAvatar.textContent = room.partnerAvatarText || room.partnerName.charAt(0);
    el.chatRoomAvatar.style.background = room.partnerGradient || 'linear-gradient(135deg,#10B981,#047857)';
    el.chatRoomName.textContent = room.partnerName;
    el.chatRoomHobby.textContent = room.partnerHobby || '취미 메이트';
    if (el.chatInput) el.chatInput.value = '';

    el.chatRoomModal.hidden = false;
    document.body.classList.add('modal-open');
    syncChatAlbumBtn();
    renderChatMessages();
    renderChatRooms();
    updateBadges();
    setTimeout(() => el.chatInput && el.chatInput.focus({ preventScroll: true }), 120);
  }

  function closeChatRoom() {
    if (!el.chatRoomModal || el.chatRoomModal.hidden) return;
    ui.openRoomId = null;
    /* 예약된 답장은 지우지 않는다 — 화면을 닫아도 답장은 도착하고,
       그 순간이 바로 푸시 알림이 필요한 순간이다 (Sprint 4.5). */
    ui.typingRoomId = null;
    el.chatRoomModal.hidden = true;
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.classList.remove('modal-open');
    }
    renderChatRooms();
    updateBadges();
  }

  /** 상대의 취미 기반 답장을 1~2초 뒤 도착시킨다 (웰컴 인터랙션)
   *  · 화면이 닫힌 뒤에 도착하면 그 순간이 푸시 알림이 필요한 순간이다:
   *    store.notifyChatReply() 가 채널(시스템 푸시 / 앱 배너 / 조용히 저장)을 정한다. */
  function schedulePartnerReply(roomId) {
    const room = store.getChatRoom(roomId);
    if (!room) return;
    if (ui.replyTimer) clearTimeout(ui.replyTimer);
    ui.typingRoomId = roomId;
    renderChatMessages();
    const delay = 1100 + Math.round(Math.random() * 600);
    ui.replyTimer = setTimeout(() => {
      const watching = ui.openRoomId === roomId;
      const message = store.receiveChatMessage(roomId, { active: watching });
      ui.typingRoomId = null;
      if (watching) renderChatMessages();
      renderChatRooms();
      updateBadges();
      if (!watching && message) {
        const res = store.notifyChatReply(roomId, message, {
          watching: false,
          visible: document.visibilityState === 'visible'
        });
        deliverNotification(res);
      }
    }, delay);
  }

  function sendChatMessage() {
    if (!el.chatInput || !ui.openRoomId) return;
    const text = el.chatInput.value;
    const message = store.sendChatMessage(ui.openRoomId, text);
    if (!message) {
      showToast('메시지를 입력해 주세요', 'warning');
      return;
    }
    el.chatInput.value = '';
    renderChatMessages();
    renderChatRooms();
    updateBadges();
    const roomId = ui.openRoomId;
    if (navibrateAvailable()) navigator.vibrate(8);
    schedulePartnerReply(roomId);
  }

  function navibrateAvailable() { return typeof navigator !== 'undefined' && !!navigator.vibrate; }

  el.chatRooms && el.chatRooms.addEventListener('click', (e) => {
    const goMatch = e.target.closest('[data-go-match]');
    if (goMatch) { switchTab('tab-explore'); return; }
    const room = e.target.closest('[data-room-id]');
    if (!room) return;
    openChatRoom(room.dataset.roomId);
  });

  el.chatRooms && el.chatRooms.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const room = e.target.closest('[data-room-id]');
    if (!room) return;
    e.preventDefault();
    openChatRoom(room.dataset.roomId);
  });

  const btnChatBack = $('#btn-chat-back');
  btnChatBack && btnChatBack.addEventListener('click', closeChatRoom);

  const btnChatProfile = $('#btn-chat-profile');
  btnChatProfile && btnChatProfile.addEventListener('click', () => {
    const room = ui.openRoomId ? store.getChatRoom(ui.openRoomId) : null;
    if (room) openPersonDetail(room.partnerId);
  });

  el.chatForm && el.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendChatMessage();
  });

  el.chatInput && el.chatInput.addEventListener('keydown', (e) => {
    /* Enter 전송(한글 조합 중에는 무시), Shift+Enter 는 줄바꿈 없음(한 줄 입력) */
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    sendChatMessage();
  });

  /* Sprint 26.5 — 새 설정 행: 앨범 · 2시간 프로필 상태 */
  const menuMyAlbums = $('#menu-my-albums');
  menuMyAlbums && menuMyAlbums.addEventListener('click', () => {
    switchTab('tab-profile');
    const block = document.querySelector('#tab-myprofile .album-block');
    if (block) block.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  });
  const menuProfileStatus = $('#menu-profile-status');
  menuProfileStatus && menuProfileStatus.addEventListener('click', () => {
    switchTab('tab-explore');
    setTimeout(openPublishSheet, 120);
  });

  const menuOpenChat = $('#menu-open-chat');
  menuOpenChat && menuOpenChat.addEventListener('click', () => switchTab('tab-chat'));
  const menuLikedPeople = $('#menu-liked-people');
  menuLikedPeople && menuLikedPeople.addEventListener('click', () => {
    const liked = store.getLikedProfiles();
    if (!liked.length) {
      showToast('아직 좋아요를 보낸 취미친구가 없어요', 'info');
      switchTab('tab-explore');
      return;
    }
    showToast(`좋아요를 보낸 취미친구 ${liked.length}명 · ${liked.map((p) => p.nickname).join(', ')}`, 'info');
  });

  /* ==========================================================================
   * 6-3. 가입한 소모임 관리 (프로필 탭 메뉴)
   * ======================================================================== */
  function openJoinedGroups() {
    renderJoinedGroups();
    openModal(el.joinedModal);
  }

  function renderJoinedGroups() {
    const joined = store.getJoinedGroups();
    if (!el.joinedBody) return;

    if (!joined.length) {
      el.joinedBody.innerHTML = `
        <div class="joined-empty">아직 가입한 소모임이 없어요.<br>소모임 탭에서 관심 가는 모임을 찾아보세요.</div>`;
      return;
    }

    el.joinedBody.innerHTML = joined.map((g) => `
      <div class="joined-item" data-joined-id="${g.id}">
        <span class="joined-emoji">${ic(g.icon)}</span>
        <div class="joined-info">
          <div class="joined-name">${escapeHtml(g.name)}</div>
          <div class="joined-meta">
            ${escapeHtml(g.categoryName)} · 멤버 ${g.memberCount}명
            ${store.isGroupLeader(g.id) ? ' · 그룹장' : ''}
          </div>
        </div>
        <div class="joined-actions">
          <button class="joined-btn primary" data-jump-feed="${g.id}">피드</button>
          <button class="joined-btn danger" data-leave-group="${g.id}">나가기</button>
        </div>
      </div>
    `).join('');
  }

  el.joinedBody && el.joinedBody.addEventListener('click', (e) => {
    const jump = e.target.closest('[data-jump-feed]');
    if (jump) {
      const groupId = jump.dataset.jumpFeed;
      closeModal(el.joinedModal);
      goGroupFeed(groupId, 'feed');
      return;
    }

    const leave = e.target.closest('[data-leave-group]');
    if (leave) {
      const groupId = leave.dataset.leaveGroup;
      const grp = store.getGroup(groupId);
      store.toggleJoinGroup(groupId);
      renderJoinedGroups();
      renderExplore();
      renderFeed();
      updateBadges();
      showToast(`'${grp ? grp.name : '모임'}'에서 나왔어요`, 'info');
    }
  });

  const joinedClose = $('#btn-close-joined');
  joinedClose && joinedClose.addEventListener('click', () => closeModal(el.joinedModal));

  const menuJoined = $('#menu-joined-manage');
  menuJoined && menuJoined.addEventListener('click', openJoinedGroups);

  /* Sprint 13 — 프로필 섹션(내 모임·저장한 글·최근 활동) */
  const btnProfileGroups = $('#btn-profile-groups');
  btnProfileGroups && btnProfileGroups.addEventListener('click', openJoinedGroups);
  const btnProfileActivity = $('#btn-profile-activity');
  btnProfileActivity && btnProfileActivity.addEventListener('click', openActivityLog);

  el.profileGroupStrip && el.profileGroupStrip.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-profile-group]');
    if (chip) openGroupDetail(chip.dataset.profileGroup);
  });
  el.profileSavedList && el.profileSavedList.addEventListener('click', (e) => {
    const item = e.target.closest('[data-profile-saved]');
    if (item) openPostInFeed(item.dataset.profileSaved);
  });
  el.profileRecentList && el.profileRecentList.addEventListener('click', (e) => {
    const item = e.target.closest('[data-profile-activity]');
    if (item) openActivityLog();
  });

  /* Sprint 15 — 내정보 '내 피드' 타일 → 그 글 상세 */
  el.profileFeedGrid && el.profileFeedGrid.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-my-post]');
    if (tile) openHomePost(tile.dataset.myPost);
  });

  /* Sprint 15 — 돋보기 그리드 타일 → 모임 글 / 취미 글 상세 */

  /* ==========================================================================
   * 5-2. 동네 글 상세 + 공개 글 작성 (Sprint 4 · 23)
   * ------------------------------------------------------------------------
   *  · 게시글 카드를 탭하면 상세 시트가 열린다 (본문 전문·좋아요·댓글·소속 모임).
   *  · 탐색 상단 '우리 동네 글 쓰기'는 모임 프라이빗 피드와 분리된 공개 글을 쓴다.
   * ======================================================================== */
  function postGroupOf(post) {
    return store.state.groups.find((g) => g.name === post.groupName) || null;
  }

  /** 댓글 아바타 바탕 — 이름에서 색을 정해 같은 사람은 항상 같은 색. */
  function commentAvatarTint(name) {
    let hash = 0;
    const text = String(name || '?');
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 360;
    return `linear-gradient(135deg, hsl(${hash} 62% 58%) 0%, hsl(${(hash + 28) % 360} 58% 42%) 100%)`;
  }

  function renderPostDetail(postId) {
    const post = store.getExplorePost(postId);
    if (!post || !el.postBody) return;
    ui.postSheetId = post.id;
    const group = postGroupOf(post);
    const comments = post.comments || [];

    el.postBody.innerHTML = `
      <div class="post-detail-head">
        <span class="post-detail-avatar" style="background:${post.authorGradient}">${escapeHtml(post.authorAvatarText || post.authorName.charAt(0))}</span>
        <div class="post-detail-who">
          <div class="post-detail-name">${escapeHtml(post.authorName)}</div>
          <div class="post-detail-sub">
            ${ic('pin')} ${escapeHtml(postRegionLabel(post))} ·
            <span class="post-detail-style">${escapeHtml(postStyleLabel(post))}</span> ·
            <span data-created="${post.createdAt}">${timeAgo(post.createdAt)}</span>
          </div>
        </div>
        ${post.tag ? `<span class="detail-hobby-pill">#${escapeHtml(post.tag)}</span>` : ''}
      </div>
      ${post.photoUrl
        ? `<div class="post-detail-media ratio-${post.ratio || 'wide'}"><img class="media-img" src="${escapeHtml(post.photoUrl)}" alt="게시글 사진" loading="lazy" decoding="async"></div>`
        : ''}
      <p class="post-detail-caption">${escapeHtml(post.caption)}</p>
      <div class="post-detail-stats">
        <span>${ic('heart')} 좋아요 ${fmtCount(post.likes)}</span>
        <span>댓글 ${comments.length}</span>
        ${group ? `<span class="post-detail-group-chip">${ic(group.icon)} ${escapeHtml(group.name)}</span>` : ''}
      </div>
      <div class="post-detail-actions">
        <button class="post-detail-like ${post.likedByMe ? 'liked' : ''}" data-post-like="${post.id}"
                aria-pressed="${post.likedByMe}" type="button">
          ${HEART_SVG(post.likedByMe)} ${post.likedByMe ? '좋아요 취소' : '좋아요'}
        </button>
        ${group ? `<button class="post-detail-group" data-post-group="${group.id}" type="button">모임 보기</button>` : ''}
        ${post.authorId !== store.currentUser.id
          ? `<button class="post-detail-dm" data-post-dm="${escapeHtml(post.authorId)}" type="button">
               ${ic('send')} ${escapeHtml(post.authorName)}님에게 쪽지
             </button>` : ''}
      </div>
      <div class="post-comment-head">
        <h4 class="post-comment-title">댓글 <span class="section-count">${comments.length}</span></h4>
        <span class="post-comment-privacy">멤버만 볼 수 있는 반응이에요</span>
      </div>
      <div class="post-comment-list">
        ${comments.length
          ? comments.map((c) => `
              <div class="post-comment">
                <span class="post-comment-avatar" style="background:${commentAvatarTint(c.authorName)}" aria-hidden="true">${escapeHtml(String(c.authorName || '?').charAt(0))}</span>
                <div class="post-comment-body">
                  <div class="post-comment-top">
                    <span class="post-comment-name">${escapeHtml(c.authorName)}</span>
                    ${c.createdAt ? `<span class="post-comment-time" data-created="${c.createdAt}">${timeAgo(c.createdAt)}</span>` : ''}
                  </div>
                  <p class="post-comment-text">${escapeHtml(c.text)}</p>
                </div>
              </div>`).join('')
          : '<p class="post-comment-empty">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>'}
      </div>
      <form class="comment-form" data-post-comment-form="${post.id}">
        <input type="text" class="comment-input" aria-label="댓글 입력" placeholder="댓글 달기..." maxlength="200" autocomplete="off">
        <button type="submit" class="comment-submit" disabled>게시</button>
      </form>`;
  }

  function openPostDetail(postId) {
    if (!store.getExplorePost(postId) || !el.postModal) return;
    renderPostDetail(postId);
    if (!el.postModal.classList.contains('active')) openModal(el.postModal);
  }

  /** 게시글 좋아요 — 카드·상세 시트의 같은 글을 모두 같은 상태로 맞춘다. */
  function togglePostLike(postId, btn) {
    const result = store.toggleExplorePostLike(postId);
    if (!result) return;
    const paint = (node) => {
      node.classList.toggle('liked', result.liked);
      node.setAttribute('aria-pressed', String(result.liked));
      node.innerHTML = `${HEART_SVG(result.liked)}<span>${fmtCount(result.likes)}</span>`;
      if (result.liked) {
        node.classList.remove('pop');
        void node.offsetWidth;
        node.classList.add('pop');
      }
      /* Sprint 12 — 숫자도 같이 살짝 튄다(버튼만 움직이면 따로 논다) */
      const card = node.closest('.feed-card');
      const likes = card && card.querySelector('.feed-likes');
      if (likes) {
        likes.classList.remove('beat');
        void likes.offsetWidth;
        likes.classList.add('beat');
        setTimeout(() => likes.classList.remove('beat'), 480);
      }
    };
    document.querySelectorAll(`[data-like-post="${postId}"]`).forEach(paint);
    if (btn) paint(btn);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
    if (el.postModal && el.postModal.classList.contains('active')) renderPostDetail(postId);
    /* Sprint 8 — 내 글 반응이 순위를 밀어올렸으면 실베 진입 알림 */
    syncHotEntryNotifications();
  }

  el.postBody && el.postBody.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('[data-post-like]');
    if (likeBtn) { togglePostLike(likeBtn.dataset.postLike, likeBtn); return; }
    const groupBtn = e.target.closest('[data-post-group]');
    if (groupBtn) {
      closeModal(el.postModal);
      openGroupDetail(groupBtn.dataset.postGroup);
      return;
    }
    /* Sprint 23 — 동네 글에서 작성자에게 바로 1:1 쪽지 */
    const dmBtn = e.target.closest('[data-post-dm]');
    if (dmBtn) {
      closeModal(el.postModal);
      openDmComposer(dmBtn.dataset.postDm);
    }
  });

  el.postBody && el.postBody.addEventListener('input', (e) => {
    const input = e.target.closest('.comment-input');
    if (!input) return;
    const submit = input.closest('form').querySelector('.comment-submit');
    submit.disabled = input.value.trim().length === 0;
  });

  el.postBody && el.postBody.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-post-comment-form]');
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector('.comment-input');
    const comment = store.addExplorePostComment(form.dataset.postCommentForm, input.value);
    if (!comment) return;
    renderPostDetail(form.dataset.postCommentForm);
    renderExplore({ preserve: true });
    syncHotEntryNotifications();
    showToast('댓글을 남겼어요');
  });

  /* --------------------------------------------------------- 공개 글 작성 */
  /** Sprint 23 — 지역 게시판: **동네를 고르고** 내용이나 사진이 있으면 올릴 수 있다. 취미는 묻지 않는다. */
  function updateExplorePublishState() {
    if (!el.explorePublish) return;
    const caption = el.exploreComposeCaption ? el.exploreComposeCaption.value.trim() : '';
    const regionId = ui.exploreCompose.regionId;
    const ready = !!(regionId && (caption || ui.exploreCompose.photoUrl));
    el.explorePublish.disabled = !ready;
    el.explorePublish.classList.toggle('ready', ready);
    el.explorePublish.setAttribute('aria-label', ready ? '동네 글 게시' : '동네와 내용을 먼저 골라주세요');
  }

  /** 글쓰기 시트의 동네 select — 큰 분류(서울·경기 …)로 묶어 optgroup 으로 보여준다. */
  /**
   * Sprint 25 — 지역 고르기(글쓰기·가입)는 이반시티 우리동네와 같은 2단 체계.
   *  · 하위 권역이 여럿인 큰 분류: <optgroup label="서울"> + 권역들
   *  · 하위 권역이 없는 곳(제주·해외·베어): optgroup 없이 큰 분류 이름 그대로
   */
  function regionSelectHTML(selectedId) {
    const selected = selectedId || '';
    return `<option value="">동네 선택</option>` + store.getRegionGroups().map((g) => {
      const leaves = store.getSubRegions(g.id);
      if (leaves.length <= 1) {
        const r = leaves[0];
        const id = r ? r.id : g.id;
        return `<option value="${escapeHtml(id)}" ${selected === id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`;
      }
      return `<optgroup label="${escapeHtml(g.name)}">${leaves.map((r) =>
        `<option value="${escapeHtml(r.id)}" ${selected === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}</optgroup>`;
    }).join('');
  }


  /* ==========================================================================
   * Sprint 21 — 취미 고르기 공통 부품 (프로필 수정 · 모임 개설 · 오픈 글)
   * ------------------------------------------------------------------------
   *  · 대분류 7개로 묶어 보여주고, 목록에 없으면 그 자리에서 직접 쓴다.
   *  · 화면마다 따로 목록을 만들지 않고 store.getHobbyCategories() 하나를 쓴다.
   * ======================================================================== */
  function hobbyPickerHTML(scope, selectedId, options = {}) {
    const customTag = options.customTag || scope;
    return store.getHobbyCategories().map((cat) => `
      <div class="hobby-pick-group">
        <span class="hobby-pick-cat">${ic(cat.icon)}<span>${escapeHtml(cat.name)}</span></span>
        <div class="hobby-pick-row">
          ${cat.hobbies.map((h) => `
            <button class="tag-pick ${selectedId === h.id ? 'active' : ''}" data-hobby-pick="${h.id}"
                    data-hobby-scope="${scope}" type="button">
              ${ic(h.icon || 'sparkle')} ${escapeHtml(h.name)}
            </button>`).join('')}
        </div>
      </div>`).join('')
      + (options.withCustom === false ? '' : `
        <div class="hobby-custom hobby-custom-inline" ${customTag ? `data-hobby-custom-scope="${customTag}"` : ''}>
          <div class="hobby-custom-row">
            <input class="hobby-custom-input" data-hobby-custom-input="${customTag}" type="text" maxlength="12"
                   placeholder="목록에 없으면 직접 쓰기 (예: 파쿠르)" autocomplete="off">
            <button class="hobby-custom-add" data-hobby-custom-add="${customTag}" type="button">추가</button>
          </div>
        </div>`);
  }

  /** 공통 부품의 '직접 쓰기' — 어느 화면에서 눌렀든 그 대분류… 는 기본 '일상·기타'에 담는다. */
  function addHobbyInline(scope) {
    const input = document.querySelector(`[data-hobby-custom-input="${scope}"]`);
    const picked = scope === 'group' ? store.getHobbyChip(ui.groupDraft.hobbyId) : null;
    const res = store.addCustomHobby(input ? input.value : '', picked ? picked.categoryId : 'daily');
    if (!res.ok) {
      showToast(res.reason === 'duplicate' ? '이미 있는 취미예요' : '취미 이름을 1~12자로 적어주세요', 'warning');
      return;
    }
    if (input) input.value = '';
    if (scope === 'edit') {
      if (ui.edit.hobbyIds.length >= 3) ui.edit.hobbyIds = ui.edit.hobbyIds.slice(0, 2);
      ui.edit.hobbyIds = ui.edit.hobbyIds.concat(res.hobby.id);
      renderEditHobbies();
    } else if (scope === 'group') {
      ui.groupDraft.hobbyId = res.hobby.id;
      renderGroupDraft();
    } else if (scope === 'compose') {
      ui.exploreCompose.hobbyId = res.hobby.id;
      renderExploreCompose();
    }
    showToast(`'${res.hobby.name}' 취미를 더했어요`, 'success');
  }

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-hobby-custom-add]');
    if (add) { addHobbyInline(add.dataset.hobbyCustomAdd); return; }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const input = e.target.closest('[data-hobby-custom-input]');
    if (!input) return;
    e.preventDefault();
    addHobbyInline(input.dataset.hobbyCustomInput);
  });

  function renderExploreCompose() {
    if (el.exploreComposeRegion) {
      el.exploreComposeRegion.innerHTML = regionSelectHTML(ui.exploreCompose.regionId);
      el.exploreComposeRegion.value = ui.exploreCompose.regionId || '';
    }
    if (el.exploreComposeStyles) {
      const picked = ui.exploreCompose.meetStyle;
      el.exploreComposeStyles.innerHTML = store.getMeetStyles().map((style) => `
        <button class="tag-pick meet-style-pick ${picked === style.id ? 'active' : ''}"
                data-meet-style="${style.id}" type="button" aria-pressed="${picked === style.id}">
          ${ic(style.icon)} ${escapeHtml(style.name)}
        </button>`).join('');
    }
    if (el.exploreCaptionCount && el.exploreComposeCaption) {
      el.exploreCaptionCount.textContent = String(el.exploreComposeCaption.value.length);
    }
    updateExplorePublishState();
  }

  function openExploreCompose() {
    /* 내 동네를 기본값으로 채운다 — 대부분은 우리 동네에 글을 쓴다. */
    ui.exploreCompose = {
      hobbyId: null, photoUrl: null, meetStyle: null,
      regionId: store.currentUser.regionId || 'seoul-dongjak-gwanak'
    };
    if (el.exploreComposeCaption) el.exploreComposeCaption.value = '';
    renderPhotoPreview('explore');
    renderExploreCompose();
    openModal(el.exploreComposeModal);
  }

  el.exploreComposeRegion && el.exploreComposeRegion.addEventListener('change', () => {
    ui.exploreCompose.regionId = el.exploreComposeRegion.value || null;
    updateExplorePublishState();
  });

  el.exploreComposeStyles && el.exploreComposeStyles.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-meet-style]');
    if (!chip) return;
    const id = chip.dataset.meetStyle;
    ui.exploreCompose.meetStyle = ui.exploreCompose.meetStyle === id ? null : id;
    renderExploreCompose();
  });

  el.exploreComposeCaption && el.exploreComposeCaption.addEventListener('input', () => {
    if (el.exploreCaptionCount) el.exploreCaptionCount.textContent = String(el.exploreComposeCaption.value.length);
    updateExplorePublishState();
  });

  el.explorePublish && el.explorePublish.addEventListener('click', () => {
    const result = store.createExplorePost({
      regionId: ui.exploreCompose.regionId,
      meetStyle: ui.exploreCompose.meetStyle,
      caption: el.exploreComposeCaption ? el.exploreComposeCaption.value : '',
      photoUrl: ui.exploreCompose.photoUrl
    });
    if (!result.ok) {
      showToast(result.reason === 'region' ? '동네를 먼저 골라주세요' : '내용이나 사진을 넣어주세요', 'warning');
      return;
    }
    closeModal(el.exploreComposeModal);
    /* 보던 동네를 그대로 둔다 — 다른 동네에 올렸으면 토스트로 어디에 올라갔는지 알려준다. */
    renderExplore();
    switchTab('tab-explore');
    scrollTop();
    showToast(`${store.getRegionLabel(ui.exploreRegion)}에 글을 올렸어요 · 맨 위에 있어요`);
    if (navigator.vibrate) navigator.vibrate(10);
  });

  /* ==========================================================================
   * 5-3. 마이프로필 수정 · 새 소모임 개설 (Sprint 4)
   * ======================================================================== */
  function renderProfileHeader() {
    const u = store.currentUser;
    if (el.profileNickname) el.profileNickname.textContent = u.nickname || '내 닉네임';
    paintMyAvatars();
    if (el.profileBio) el.profileBio.textContent = u.bio || '한 줄 소개를 채워보세요';
    if (el.profileSpecs) {
      const chips = [`<span class="spec-chip">${escapeHtml(u.location || '동네 미설정')}</span>`];
      (u.hobbyIds || []).forEach((id) => {
        const chip = store.getHobbyChip(id);
        if (chip) chips.push(`<span class="spec-chip">${ic(chip.icon)} ${escapeHtml(chip.name)}</span>`);
      });
      if (u.age) chips.push(`<span class="spec-chip">${u.age}세</span>`);
      chips.push(`<span class="spec-chip">${ic(u.activityIcon || 'repeat')} ${escapeHtml(u.activity || '상시')}</span>`);
      el.profileSpecs.innerHTML = chips.join('');
    }
    /* Sprint 18 — 내정보 상단 한 줄(설정은 사이드바로) */
    if (el.profileTopbarTitle) el.profileTopbarTitle.textContent = u.nickname || '내정보';
    if (el.profileTopbarSub) {
      const counts = store.getMyFeedStats();
      el.profileTopbarSub.textContent = `${counts.total}개 글 · ${counts.photos}장 사진`;
    }
  }

  function renderEditHobbies() {
    if (!el.editHobbies) return;
    el.editHobbies.innerHTML = store.getHobbyCategories().map((cat) => `
      <div class="hobby-pick-group">
        <span class="hobby-pick-cat">${ic(cat.icon)}<span>${escapeHtml(cat.name)}</span></span>
        <div class="hobby-pick-row">
          ${cat.hobbies.map((h) => `
            <button class="tag-pick ${ui.edit.hobbyIds.includes(h.id) ? 'active' : ''}"
                    data-edit-hobby="${h.id}" type="button">${ic(h.icon || 'sparkle')} ${escapeHtml(h.name)}</button>`).join('')}
        </div>
      </div>`).join('')
      + `<div class="hobby-custom hobby-custom-inline">
           <div class="hobby-custom-row">
             <input class="hobby-custom-input" data-hobby-custom-input="edit" type="text" maxlength="12"
                    placeholder="목록에 없으면 직접 쓰기" autocomplete="off">
             <button class="hobby-custom-add" data-hobby-custom-add="edit" type="button">추가</button>
           </div>
         </div>`;
  }

  function renderEditActivity() {
    if (!el.editActivity) return;
    el.editActivity.innerHTML = store.state.activityOptions.map((o) => `
      <button class="tag-pick ${ui.edit.activity === o.label ? 'active' : ''}"
              data-edit-activity="${escapeHtml(o.label)}" type="button">${ic(o.icon)} ${escapeHtml(o.label)}</button>`).join('');
  }

  function openProfileEdit() {
    const u = store.currentUser;
    ui.edit = { hobbyIds: (u.hobbyIds || []).slice(0, 3), activity: u.activity || '평일 저녁' };
    if (el.editNickname) el.editNickname.value = u.nickname;
    if (el.editBio) el.editBio.value = u.bio || '';
    if (el.editLocation) el.editLocation.value = u.location || '';
    renderEditHobbies();
    renderEditActivity();
    openModal(el.profileEditModal);
  }

  el.editHobbies && el.editHobbies.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-edit-hobby]');
    if (!chip) return;
    const id = chip.dataset.editHobby;
    if (ui.edit.hobbyIds.includes(id)) {
      ui.edit.hobbyIds = ui.edit.hobbyIds.filter((h) => h !== id);
    } else if (ui.edit.hobbyIds.length >= 3) {
      showToast('대표 취미는 3개까지 고를 수 있어요', 'warning');
      return;
    } else {
      ui.edit.hobbyIds = ui.edit.hobbyIds.concat(id);
    }
    renderEditHobbies();
  });

  el.editActivity && el.editActivity.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-edit-activity]');
    if (!chip) return;
    ui.edit.activity = chip.dataset.editActivity;
    renderEditActivity();
  });

  const btnSaveProfile = $('#btn-save-profile');
  btnSaveProfile && btnSaveProfile.addEventListener('click', () => {
    const result = store.updateProfile({
      nickname: el.editNickname ? el.editNickname.value : '',
      bio: el.editBio ? el.editBio.value : '',
      hobbyIds: ui.edit.hobbyIds,
      location: el.editLocation ? el.editLocation.value : '',
      activity: ui.edit.activity
    });
    if (!result.ok) {
      const messages = {
        nickname: '닉네임은 2~12자로 정해주세요',
        hobby: '대표 취미를 하나 이상 골라주세요',
        too_many_hobbies: '대표 취미는 3개까지예요',
        location: '활동 지역을 적어주세요'
      };
      showToast(messages[result.reason] || '저장하지 못했어요', 'warning');
      return;
    }
    closeModal(el.profileEditModal);
    renderProfileHeader();
    renderFeed();
    renderExplore({ preserve: true });
    updateBadges();
    showToast('프로필을 저장했어요');
  });

  const btnEditProfile = $('#menu-edit-profile');
  btnEditProfile && btnEditProfile.addEventListener('click', openProfileEdit);
  const btnEditCancel = $('#btn-edit-cancel');
  btnEditCancel && btnEditCancel.addEventListener('click', () => closeModal(el.profileEditModal));

  /* ------------------------------------------------------------ 모임 개설 */
  function renderGroupDraft() {
    if (el.createGroupHobbies) {
      el.createGroupHobbies.innerHTML = hobbyPickerHTML('group', ui.groupDraft.hobbyId);
    }
    if (el.createGroupPrivacy) {
      const options = [
        { id: 'open', label: '자유 가입', icon: 'leaf', hint: '누구나 바로 참여' },
        { id: 'approval_private', label: '승인제', hint: '소개서 심사' }
      ];
      el.createGroupPrivacy.innerHTML = options.map((o) => `
        <button class="tag-pick ${ui.groupDraft.privacyType === o.id ? 'active' : ''}"
                data-create-privacy="${o.id}" type="button">${o.label}</button>`).join('');
    }
    if (el.createGroupAge) {
      el.createGroupAge.innerHTML = store.getAgeLimitOptions().map((o) => `
        <button class="tag-pick ${ui.groupDraft.ageLimit === o.id ? 'active' : ''}"
                data-create-age="${o.id}" type="button">${escapeHtml(o.badge)}</button>`).join('');
    }
    if (el.createGroupQuestionPresets) {
      el.createGroupQuestionPresets.innerHTML = (store.state.joinQuestionPresets || []).map((q, i) => `
        <button class="tag-pick preset-pick" data-create-qpreset="${i}" type="button">${escapeHtml(q)}</button>`).join('');
    }
    const questionField = el.createGroupQuestion && el.createGroupQuestion.closest('.field-group');
    if (questionField) {
      questionField.classList.toggle('policy-field-hidden', ui.groupDraft.privacyType !== 'approval_private');
    }
  }

  function openGroupCreate() {
    ui.groupDraft = { hobbyId: null, privacyType: 'open', ageLimit: 'all', question: '' };
    if (el.createGroupName) el.createGroupName.value = '';
    if (el.createGroupDesc) el.createGroupDesc.value = '';
    if (el.createGroupMeet) el.createGroupMeet.value = '';
    if (el.createGroupLocation) el.createGroupLocation.value = store.currentUser.location || '';
    if (el.createGroupQuestion) el.createGroupQuestion.value = '';
    renderGroupDraft();
    openModal(el.groupCreateModal);
  }

  el.createGroupHobbies && el.createGroupHobbies.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-hobby-pick]');
    if (!chip || chip.dataset.hobbyScope !== 'group') return;
    ui.groupDraft.hobbyId = chip.dataset.hobbyPick;
    renderGroupDraft();
  });

  el.createGroupPrivacy && el.createGroupPrivacy.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-create-privacy]');
    if (!chip) return;
    ui.groupDraft.privacyType = chip.dataset.createPrivacy;
    renderGroupDraft();
  });

  el.createGroupAge && el.createGroupAge.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-create-age]');
    if (!chip) return;
    ui.groupDraft.ageLimit = chip.dataset.createAge;
    renderGroupDraft();
  });

  el.createGroupQuestionPresets && el.createGroupQuestionPresets.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-create-qpreset]');
    if (!chip) return;
    const preset = (store.state.joinQuestionPresets || [])[Number(chip.dataset.createQpreset)];
    if (preset && el.createGroupQuestion) el.createGroupQuestion.value = preset;
  });

  const btnCreateGroupSubmit = $('#btn-create-group-submit');
  btnCreateGroupSubmit && btnCreateGroupSubmit.addEventListener('click', () => {
    const result = store.createGroup({
      name: el.createGroupName ? el.createGroupName.value : '',
      hobbyId: ui.groupDraft.hobbyId,
      description: el.createGroupDesc ? el.createGroupDesc.value : '',
      meetLabel: el.createGroupMeet ? el.createGroupMeet.value : '',
      location: el.createGroupLocation ? el.createGroupLocation.value : '',
      privacyType: ui.groupDraft.privacyType,
      joinMode: ui.groupDraft.privacyType === 'approval_private' ? 'approval' : 'open',
      ageLimit: ui.groupDraft.ageLimit,
      joinQuestions: el.createGroupQuestion && el.createGroupQuestion.value.trim()
        ? [el.createGroupQuestion.value.trim()] : []
    });
    if (!result.ok) {
      const messages = {
        name: '모임명은 2~30자로 정해주세요',
        hobby: '취미 카테고리를 골라주세요'
      };
      showToast(messages[result.reason] || '모임을 만들지 못했어요', 'warning');
      return;
    }
    closeModal(el.groupCreateModal);
    renderExplore();
    renderFeed();
    updateBadges();
    /* Sprint 22 — 모임은 이제 홈의 '모임 둘러보기' 에 있다. 만든 모임을 바로 보여준다. */
    homeBrowseState().categoryId = 'all';
    homeBrowseState().query = result.group.name;
    homeBrowseState().limit = Math.max(HOME_BROWSE_PAGE, 12);
    if (el.homeBrowseSearch) el.homeBrowseSearch.value = result.group.name;
    switchTab('tab-home');
    renderGallery();
    renderHomeBrowse();
    scrollTop();
    showToast(result.group.joinMode === 'approval'
      ? `'${result.group.name}' 승인제 모임을 만들었어요 · 신청서를 보고 직접 고를게요`
      : `'${result.group.name}' 모임을 만들었어요 · 그룹장이 되었습니다`);
  });

  const btnCreateGroupCancel = $('#btn-create-group-cancel');
  btnCreateGroupCancel && btnCreateGroupCancel.addEventListener('click', () => closeModal(el.groupCreateModal));

  /* ==========================================================================
   * 6-4. 푸시 알림 파이프라인 (Sprint 4.5)
   * ------------------------------------------------------------------------
   *  채널 결정은 store.dispatchNotification() 한 곳에서만 한다.
   *    system     → 실제 OS 푸시(new Notification) — 창이 비활성일 때
   *    inapp      → 앱 상단 배너 — 지금 앱을 보고 있거나 권한이 없을 때
   *    suppressed → 알림함에만 조용히 쌓인다 (푸시 OFF · 방해 금지 시간)
   *  어떤 경우에도 알림함(notificationLog)에는 기록이 남아 나중에 확인할 수 있다.
   * ======================================================================== */
  const PUSH_ICON = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Crect width=\'64\' height=\'64\' rx=\'16\' fill=\'%2310B981\'/%3E%3Ctext x=\'32\' y=\'42\' font-family=\'sans-serif\' font-size=\'30\' font-weight=\'800\' fill=\'white\' text-anchor=\'middle\'%3EooG%3C/text%3E%3C/svg%3E';

  const supportsNotifications = () => typeof Notification !== 'undefined';

  function pushKindIcon(kind) {
    if (kind === 'chat') return 'chat';
    if (kind === 'like') return 'heart';
    if (kind === 'comment') return 'comment';
    if (kind === 'join_request' || kind === 'group') return 'users';
    if (kind === 'join_result') return 'checkCircle';
    if (kind === 'hot_entry') return 'fire';
    return 'bell';
  }

  /** 알림 종류 하나의 예시 미리보기 — 실제 알림과 같은 모양으로 그린다(Sprint 8). */
  function notifPreviewHTML(categoryId) {
    const p = store.getNotificationPreview(categoryId);
    if (!p) return '';
    return `<div class="notif-preview" data-notif-preview="${p.category}" role="note"
                 aria-label="${escapeHtml(p.label)} 예시 알림">
      <span class="notif-preview-tag">이런 알림이 와요</span>
      <div class="notif-preview-item tone-${escapeHtml(p.category)}">
        <span class="notif-emoji" aria-hidden="true">${ic(pushKindIcon(p.kind))}</span>
        <div class="notif-main">
          <span class="notif-title">${escapeHtml(p.title)}</span>
          <p class="notif-body">${escapeHtml(p.body)}</p>
          <span class="notif-time">방금 전 · 앱 알림
            <span class="notif-cat-chip">${ic(p.icon)} ${escapeHtml(p.label)}</span>
          </span>
        </div>
      </div>
    </div>`;
  }

  function categoryLabel(entry) {
    const cat = store.getNotificationCategories().find((c) => c.id === entry.category);
    if (cat) return cat.label;
    /* Sprint 6 — 옛 기록(v7 이하)의 reaction/membership 도 읽힐 수 있게 kind 로 되메운다 */
    const legacy = { like: '좋아요', comment: '댓글', chat: '1:1 대화', join_request: '모임 가입 신청', join_result: '모임 가입 결과', hot_entry: '실베 진입', group: '모임' };
    return legacy[entry.kind] || '알림';
  }

  function channelLabel(entry) {
    if (entry.dndExempt && entry.channel !== 'suppressed') return '야간에도 즉시';
    if (entry.channel === 'system') return '푸시';
    if (entry.channel === 'suppressed') {
      return entry.reason === 'category_off' ? '종류 꺼짐 · 알림함에만' : '조용히 저장됨';
    }
    return '앱 알림';
  }

  /** 브라우저의 실제 권한을 스토어에 미러링한다 (앱을 다시 열어도 상태가 맞는다). */
  function syncNotificationPermission() {
    if (!supportsNotifications()) {
      store.updateNotificationSettings({ permission: 'unsupported' });
      return 'unsupported';
    }
    return store.updateNotificationSettings({ permission: Notification.permission }).settings.permission;
  }

  /**
   * 아이폰 사파리는 '홈 화면에 추가한 웹앱(standalone)'에서만 시스템 푸시를 허용한다.
   * 일반 탭에서는 권한을 받아도 푸시가 뜨지 않으므로, 그 사실을 카드에 적어 둔다.
   */
  function isIosBrowserTab() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIos = /iPhone|iPad|iPod/.test(ua);
    const standalone = navigator.standalone === true
      || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    return isIos && !standalone;
  }

  function renderNotificationSettings() {
    if (!el.notifSettingsBody) return;
    const s = store.notificationSettings;
    const supported = supportsNotifications();
    const permLabel = !supported ? '지원 안 함'
      : s.permission === 'granted' ? '허용됨'
        : s.permission === 'denied' ? '차단됨' : '미설정';

    if (el.notifPermissionState) {
      el.notifPermissionState.textContent = `권한 ${permLabel}`;
      el.notifPermissionState.classList.toggle('granted', s.permission === 'granted');
    }

    const lastTest = s.lastTestAt
      ? `마지막 테스트 ${timeAgo(s.lastTestAt)}`
      : '아직 테스트하지 않았어요';
    /* 지금이 실제로 방해 금지 시간인지 — 사용자가 "켜뒀는데 왜 안 와?"를 바로 알 수 있게 */
    const dndOnNow = s.dndEnabled && store.isDndActive();
    /* Sprint 7 — 야간 예외(모임 가입 결과는 방해 금지 시간에도 즉시) */
    const joinExempt = store.isDndExempt('join_result');
    /* Sprint 5 — 알림 종류별 토글 (1:1 메시지 / 좋아요·댓글 / 모임 가입 신청·결과) */
    const categories = store.getNotificationCategories();

    el.notifSettingsBody.innerHTML = `
      <div class="notif-row">
        <div class="notif-row-main">
          <span class="notif-row-label">푸시 알림</span>
          <span class="notif-row-desc">${supported
            ? '앱을 꺼도 새 메시지를 알려드려요'
            : '이 브라우저는 시스템 알림을 지원하지 않아요'}</span>
        </div>
        <button class="notif-switch ${s.pushEnabled ? 'on' : ''}" data-notif-action="toggle-push"
                role="switch" aria-checked="${s.pushEnabled ? 'true' : 'false'}"
                aria-label="푸시 알림 ${s.pushEnabled ? '끄기' : '켜기'}" type="button">
          <span class="notif-switch-knob"></span>
        </button>
      </div>
      ${s.permission === 'denied'
        ? `<p class="notif-denied-note">${isIosBrowserTab()
          ? '아이폰 설정 › 알림에서 이 브라우저(또는 홈 화면의 ooG) 알림을 허용해 주세요.'
          : '브라우저에서 알림을 차단했어요. 주소창의 자물쇠 아이콘에서 허용으로 바꾸면 푸시로 받을 수 있어요.'}</p>`
        : ''}
      ${supported && s.permission !== 'granted'
        ? `<button class="notif-permission-btn" data-notif-action="request-permission" type="button">${ic('unlock')} 브라우저 알림 권한 허용하기</button>`
        : ''}
      ${isIosBrowserTab()
        ? `<p class="notif-ios-hint">${ic('phone')} 아이폰 사파리는 <strong>홈 화면에 추가한 웹앱</strong>에서만 푸시를 받을 수 있어요. 아래 <strong>홈 화면에 추가</strong>를 먼저 해두면 앱을 꺼도 알림이 와요.</p>`
        : ''}
      <div class="notif-section-title">받을 알림 종류 <span class="notif-section-hint">6종 각각 켜고 끌 수 있어요</span></div>
      <div class="notif-cat-list" role="group" aria-label="알림 종류별 설정">
        ${categories.map((c) => `
          <div class="notif-cat-item tone-${escapeHtml(c.tone || 'chat')} ${c.enabled ? '' : 'off'}" data-cat-item="${c.id}">
            <span class="notif-cat-emoji" aria-hidden="true">${ic(c.icon)}</span>
            <div class="notif-cat-main">
              <span class="notif-cat-label">${escapeHtml(c.label)}</span>
              <span class="notif-cat-desc">${escapeHtml(c.desc)}</span>
            </div>
            <button class="notif-cat-preview-btn" type="button" data-notif-action="toggle-preview" data-cat="${c.id}"
                    aria-expanded="${ui.notifPreview === c.id ? 'true' : 'false'}"
                    aria-controls="notif-preview-${c.id}">${ui.notifPreview === c.id ? '닫기' : '예시'}</button>
            <span class="notif-cat-state">${c.enabled ? 'ON' : 'OFF'}</span>
            <button class="notif-switch ${c.enabled ? 'on' : ''}" type="button"
                    data-notif-action="toggle-cat" data-cat="${c.id}"
                    role="switch" aria-checked="${c.enabled ? 'true' : 'false'}"
                    aria-label="${escapeHtml(c.label)} 알림 ${c.enabled ? '끄기' : '켜기'}">
              <span class="notif-switch-knob"></span>
            </button>
          </div>
          ${ui.notifPreview === c.id ? `<div id="notif-preview-${c.id}">${notifPreviewHTML(c.id)}</div>` : ''}`).join('')}
      </div>
      <div class="notif-row">
        <div class="notif-row-main">
          <span class="notif-row-label">방해 금지 (야간)</span>
          <span class="notif-row-desc">${escapeHtml(s.dndStart)}~${escapeHtml(s.dndEnd)} 에는 알림을 조용히 모아둬요</span>
        </div>
        <button class="notif-switch ${s.dndEnabled ? 'on' : ''}" data-notif-action="toggle-dnd"
                role="switch" aria-checked="${s.dndEnabled ? 'true' : 'false'}"
                aria-label="방해 금지 모드 ${s.dndEnabled ? '끄기' : '켜기'}" type="button">
          <span class="notif-switch-knob"></span>
        </button>
      </div>
      <div class="notif-dnd-row">
        <label class="notif-time-label" for="dnd-start">시작</label>
        <input class="notif-time-input" id="dnd-start" data-dnd="start" type="time" value="${escapeHtml(s.dndStart)}" aria-label="방해 금지 시작 시각">
        <label class="notif-time-label" for="dnd-end">종료</label>
        <input class="notif-time-input" id="dnd-end" data-dnd="end" type="time" value="${escapeHtml(s.dndEnd)}" aria-label="방해 금지 종료 시각">
      </div>
      ${dndOnNow
        ? `<p class="notif-dnd-now">${ic('moon')} 지금은 방해 금지 시간이에요 — 가입 결과를 뺀 알림은 조용히 모이고 있어요</p>`
        : ''}
      <div class="notif-row notif-exception-row">
        <div class="notif-row-main">
          <span class="notif-row-label">${ic('checkCircle')} 모임 가입 결과는 밤에도 알림</span>
          <span class="notif-row-desc">방해 금지 시간이어도 수락·거절 소식은 바로 보내드려요</span>
        </div>
        <button class="notif-switch ${joinExempt ? 'on' : ''}" data-notif-action="toggle-dnd-exception"
                data-cat="join_result" role="switch" aria-checked="${joinExempt ? 'true' : 'false'}"
                aria-label="모임 가입 결과 야간 예외 ${joinExempt ? '끄기' : '켜기'}" type="button">
          <span class="notif-switch-knob"></span>
        </button>
      </div>
      <button class="notif-test-btn" data-notif-action="test" type="button">${ic('bell')} 푸시 알림 테스트하기</button>
      <p class="notif-test-result" id="notif-test-result">${lastTest}</p>
      <div class="notif-section-title">${ic('flask')} 알림 종류 시험해 보기</div>
      <div class="notif-sim-row">
        <button class="notif-sim-btn" data-notif-action="sim-chat" type="button">${ic('chat')} 1:1 대화</button>
        <button class="notif-sim-btn" data-notif-action="sim-like" type="button">${ic('heart')} 좋아요</button>
        <button class="notif-sim-btn" data-notif-action="sim-comment" type="button">${ic('comment')} 댓글</button>
        <button class="notif-sim-btn" data-notif-action="sim-join" type="button">${ic('users')} 가입 신청</button>
        <button class="notif-sim-btn" data-notif-action="sim-result" type="button">${ic('checkCircle')} 가입 결과</button>
        <button class="notif-sim-btn" data-notif-action="sim-hot" type="button">${ic('fire')} 실베 진입</button>
      </div>
      <p class="notif-sim-note">실제 이벤트와 <strong>똑같은 경로</strong>로 알림을 보내 봅니다. 대화는 첫 1:1 방에, 좋아요·댓글은 내가 올린 동네 글에, 가입 신청은 내가 그룹장인 모임에, 실베 진입은 내 최신 글이 Top 10에 들면 도착해요.</p>`;
  }

  /** 권한 안내 배너 — 아직 허용하지 않았고 '나중에'를 누르지 않았을 때만 보인다. */
  function renderPushPrompt() {
    if (!el.pushPermissionBanner) return;
    const s = store.notificationSettings;
    const show = supportsNotifications() && s.permission !== 'granted' && !s.promptDismissed;
    el.pushPermissionBanner.hidden = !show;
  }

  /**
   * 권한 요청 → 허용되면 즉시 테스트 푸시를 보낸다.
   * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
   */
  async function requestPushPermission() {
    if (!supportsNotifications()) {
      showToast('이 브라우저는 시스템 알림을 지원하지 않아요 · 앱 안 알림으로 알려드릴게요', 'warning');
      return 'unsupported';
    }
    let result = Notification.permission;
    if (result === 'default') {
      try {
        result = await Notification.requestPermission();
      } catch (e) {
        result = 'denied';
      }
    }
    store.updateNotificationSettings({
      permission: result,
      pushEnabled: true,
      lastPermissionRequestAt: new Date().toISOString()
    });
    renderNotificationSettings();
    renderPushPrompt();
    updateBadges();

    if (result === 'granted') {
      showToast('ooG 푸시 알림이 활성화되었어요! 새 메시지를 놓치지 않게 알려드릴게요');
      sendTestPush();
    } else if (result === 'denied') {
      showToast('알림 권한이 거부되어 앱 안 알림으로 대신 알려드릴게요', 'warning');
    } else {
      showToast('알림 권한을 허용하면 앱을 꺼도 알려드려요', 'info');
    }
    return result;
  }

  function sendTestPush() {
    const res = store.sendTestNotification({ visible: document.visibilityState === 'visible' });
    deliverNotification(res);
    if (el.notifSettingsBody) {
      const note = el.notifSettingsBody.parentElement.querySelector('#notif-test-result');
      if (note) note.textContent = `마지막 테스트 ${timeAgo(store.notificationSettings.lastTestAt)}`;
    }
    return res;
  }

  /** 알림이 실제로 어디로 갔는지 토스트에 덧붙일 짧은 설명 (Sprint 5). */
  function deliveryNote(res) {
    if (!res) return '';
    if (res.channel === 'suppressed') return ' · 알림함에만 쌓였어요';
    if (res.delivered === 'banner') return ' · 상단 알림으로 도착';
    if (res.delivered === 'system') return ' · 푸시로 도착';
    return '';
  }

  /** store 가 정한 채널대로 실제 전달한다. res.delivered 에 실제로 나간 방식을 남긴다. */
  function deliverNotification(res) {
    if (!res) return null;
    if (res.channel === 'system') {
      const ok = showSystemNotification(res.entry);
      res.delivered = ok ? 'system' : 'banner';
      if (!ok) showPushBanner(res.entry);      // 시스템 알림이 막혔으면 배너로 대신
    } else if (res.channel === 'inapp') {
      res.delivered = 'banner';
      showPushBanner(res.entry);
    } else {
      res.delivered = 'none';                  // 조용히 저장만
    }
    renderNotificationList();
    updateBadges();
    return res;
  }

  /** 실제 OS 알림 — 홈 화면 웹앱에서는 Service Worker 의 showNotification 이 정석이다. */
  function showSystemNotification(entry) {
    if (!supportsNotifications() || Notification.permission !== 'granted') return false;
    /* Service Worker 가 준비된 경우(홈 화면 설치 웹앱 · 일반 탭 포함) SW 로 띄운다. */
    if (swRegistration && typeof swRegistration.showNotification === 'function') {
      try {
        swRegistration.showNotification(entry.title, {
          body: entry.body,
          tag: entry.id,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          data: {
            url: './', kind: entry.kind, roomId: entry.roomId,
            groupId: entry.groupId, postId: entry.postId,
            source: entry.source, action: entry.action
          }
        });
        return true;
      } catch (e) { /* 아래 new Notification 으로 대체 */ }
    }
    try {
      const n = new Notification(entry.title, {
        body: entry.body,
        tag: entry.id,
        icon: PUSH_ICON,
        badge: PUSH_ICON
      });
      n.onclick = () => {
        window.focus();
        openFromNotification(entry);
        n.close();
      };
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 앱 안 상단 푸시 배너 — 클릭하면 해당 화면으로 이동. */
  function showPushBanner(entry) {
    if (!el.pushBannerStack || !entry) return null;
    const node = document.createElement('div');
    node.className = `push-banner kind-${entry.kind}`;
    node.dataset.notifId = entry.id;
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.innerHTML = `
      <span class="push-banner-icon" aria-hidden="true">${ic(pushKindIcon(entry.kind))}</span>
      <div class="push-banner-main">
        <span class="push-banner-title">${escapeHtml(entry.title)}</span>
        <span class="push-banner-body">${escapeHtml(entry.body)}</span>
        <span class="push-banner-meta">ooG · 방금</span>
      </div>
      <button class="push-banner-close" type="button" aria-label="알림 닫기">&times;</button>`;
    el.pushBannerStack.appendChild(node);
    while (el.pushBannerStack.children.length > 3) {
      el.pushBannerStack.firstElementChild.remove();
    }
    requestAnimationFrame(() => node.classList.add('show'));

    const timer = setTimeout(() => dismissPushBanner(node), 6000);
    node.addEventListener('click', (e) => {
      if (e.target.closest('.push-banner-close')) {
        clearTimeout(timer);
        dismissPushBanner(node);
        return;
      }
      clearTimeout(timer);
      dismissPushBanner(node);
      openFromNotification(entry);
    });
    node.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      clearTimeout(timer);
      dismissPushBanner(node);
      openFromNotification(entry);
    });
    return node;
  }

  function dismissPushBanner(node) {
    if (!node || !node.parentElement) return;
    node.classList.remove('show');
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 220);
  }

  function dismissAllPushBanners() {
    if (!el.pushBannerStack) return;
    Array.from(el.pushBannerStack.children).forEach(dismissPushBanner);
  }

  /** 알림 클릭 → 해당 1:1 대화방 / 게시글 / 모임 관리로 딥링크. */
  function openFromNotification(entry) {
    if (!entry) return;
    if (el.notifModal && el.notifModal.classList.contains('active')) closeModal(el.notifModal);
    if (entry.kind === 'chat' && entry.roomId && store.getChatRoom(entry.roomId)) {
      switchTab('tab-chat');
      renderChatRooms();
      openChatRoom(entry.roomId);
      return;
    }
    /* Sprint 5 — 내 글의 좋아요·댓글 → 그 게시글(상세 시트 / 피드 카드)로 */
    if ((entry.kind === 'like' || entry.kind === 'comment' || entry.kind === 'hot_entry') && entry.postId) {
      if (entry.source === 'feed') {
        const post = store.getPost(entry.postId);
        goGroupFeed(post ? post.groupId : null, 'feed');
        focusFeedPost(entry.postId);
        return;
      }
      if (store.getExplorePost(entry.postId)) {
        switchTab('tab-explore');
        openPostDetail(entry.postId);
        return;
      }
      switchTab('tab-explore');
      return;
    }
    /* 가입 신청 도착 · 결과 → 그 모임(그룹장이면 관리자 모드)으로 */
    if ((entry.kind === 'join_request' || entry.kind === 'join_result' || entry.kind === 'group')
        && entry.groupId && store.getGroup(entry.groupId)) {
      openGroupDetail(entry.groupId);
      return;
    }
    switchTab('tab-explore');
  }

  /** 모임 피드에서 알림이 가리키는 글을 잠깐 강조해 스크롤한다. */
  function focusFeedPost(postId) {
    const node = document.querySelector(`.feed-card[data-post-id="${postId}"]`);
    if (!node) return;
    node.classList.add('is-highlight');
    if (node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => node.classList.remove('is-highlight'), 2600);
  }

  function openNotificationCenter() {
    if (!el.notifModal) return;
    /* Sprint 7 — 열 때 안 읽은 알림을 기억해 둔다(아래에서 읽음 처리되지만,
       '안 읽은 것만 보기'가 방금 도착한 알림을 그대로 보여줄 수 있어야 한다). */
    ui.notifSessionUnread = store.getNotifications().filter((n) => !n.read).map((n) => n.id);
    ui.notifFilter = 'all';
    ui.notifUnreadOnly = false;
    renderNotificationList();
    store.markNotificationsRead();
    updateBadges();
    openModal(el.notifModal);
  }

  /** 알림 종류 필터 칩 + 안 읽은 것만 토글 상태 */
  function renderNotifFilters() {
    if (el.notifFilters) {
      const stats = store.getNotificationStats();
      const cats = [
        { id: 'all', label: '전체', icon: 'bell' },
        ...store.getNotificationCategories().map((c) => ({ id: c.id, label: c.label, icon: c.icon }))
      ];
      el.notifFilters.innerHTML = cats.map((c) => {
        const on = ui.notifFilter === c.id;
        const count = c.id === 'all' ? stats.total : (stats.byCategory[c.id] || 0);
        return `<button class="notif-filter ${on ? 'active' : ''}" data-notif-filter="${c.id}"
                        aria-pressed="${on}" type="button">
          <span aria-hidden="true">${ic(c.icon)}</span><span>${escapeHtml(c.label)}</span>
          <span class="notif-filter-count">${count}</span>
        </button>`;
      }).join('');
    }
    if (el.notifUnreadToggle) {
      const unread = store.getUnreadNotificationCount();
      el.notifUnreadToggle.classList.toggle('active', ui.notifUnreadOnly);
      el.notifUnreadToggle.setAttribute('aria-pressed', String(ui.notifUnreadOnly));
      el.notifUnreadToggle.innerHTML = `<span class="notif-unread-dot" aria-hidden="true"></span> 안 읽은 것만 보기${unread ? ` ${unread}` : ''}`;
    }
  }

  /** 지금 '안 읽음'으로 볼 알림 id — 이번에 열면서 읽음 처리된 것도 포함한다. */
  function notifUnreadSet() {
    const set = new Set(ui.notifSessionUnread || []);
    store.getNotifications().forEach((n) => { if (!n.read) set.add(n.id); });
    return set;
  }

  /**
   * Sprint 9 — 알림함을 **묶음 단위**로 그린다(11/15 00:23).
   *  · 같은 글의 좋아요·댓글은 한 줄로 묶여 건수 배지와 함께 보인다.
   *  · 맨 위에는 이번 주 요약 카드(종류별 건수 · 가장 반응 많은 내 글).
   *  · 스와이프·액션 버튼·키보드는 모두 묶음 단위로 동작한다(원본 알림 전부에 적용).
   */
  function renderNotificationList() {
    if (!el.notifBody) return;
    renderNotifFilters();
    const unread = notifUnreadSet();
    /* Sprint 11 — 실베 진입·시스템 알림은 한 칸으로 접어 모아 본다(알림함 4차). */
    const groups = store.getGroupedNotifications({ category: ui.notifFilter, mergeRoutine: true });
    ui.notifGroupMap = {};
    groups.forEach((g) => { ui.notifGroupMap[g.key] = g; });
    const list = ui.notifUnreadOnly ? groups.filter((g) => g.ids.some((id) => unread.has(id))) : groups;

    /* 펼친 묶음이 있을 때만 '모두 접기'를 보여준다. */
    const anyExpandable = list.some((g) => g.expandable);
    if (el.notifCollapseAll) {
      el.notifCollapseAll.hidden = !anyExpandable;
      const openCount = (ui.notifExpanded || []).length;
      el.notifCollapseAll.textContent = openCount ? `모두 접기 ${openCount}` : '모두 접기';
      el.notifCollapseAll.disabled = !openCount;
    }

    if (!list.length) {
      const filtered = ui.notifFilter !== 'all' || ui.notifUnreadOnly;
      el.notifBody.innerHTML = `
        <div class="empty-state notif-empty">
          ${emptyArt('notifications')}
          <p class="empty-title">${ui.notifUnreadOnly ? '안 읽은 알림이 없어요' : '아직 알림이 없어요'}</p>
          <p class="empty-desc">${filtered
            ? '다른 종류를 골라보거나 ‘안 읽은 것만’을 꺼보세요.'
            : '대화 답장·모임 가입 소식이 도착하면 여기에 쌓여요.'}</p>
          ${filtered ? '<button class="btn-secondary" data-notif-reset="1" type="button">전체 알림 보기</button>' : ''}
        </div>`;
      return;
    }

    el.notifBody.innerHTML = list.map((g) => {
      const isUnread = g.ids.some((id) => unread.has(id));
      const entry = g.entry;
      const merged = g.count > 1;
      const expanded = !!(ui.notifExpanded || []).includes(g.key);
      const routine = g.type === 'routine';
      /* Sprint 11 — 접근성: 펼침 버튼과 펼쳐진 목록을 id·aria-controls 로 잇는다. */
      const itemsId = `notif-items-${String(g.key).replace(/[^A-Za-z0-9_-]/g, '-')}`;
      const mergeChips = merged
        ? `${g.likeCount ? `<span class="notif-merge-chip">${ic('heart')} 좋아요 ${g.likeCount}</span>` : ''}`
          + `${g.commentCount ? `<span class="notif-merge-chip">${ic('comment')} 댓글 ${g.commentCount}</span>` : ''}`
        : '';
      return `
      <div class="notif-swipe" data-swipe-item="${g.key}">
        <span class="notif-swipe-hint hint-right" aria-hidden="true">${ic('check')} 읽음</span>
        <span class="notif-swipe-hint hint-left" aria-hidden="true">${ic('trash')} 지우기</span>
        <article class="notif-item ${isUnread ? 'unread' : ''} ${merged ? 'is-merged' : ''} ${routine ? 'is-routine' : ''}" data-notif-item="${g.key}"
                 role="button" tabindex="0"
                 aria-label="${escapeHtml(g.title)} 알림 열기${merged ? ` · ${g.count}건 모음` : ''}">
          <span class="notif-emoji">${ic(pushKindIcon(entry.kind))}${merged ? `<span class="notif-merge-count" aria-hidden="true">${g.count}</span>` : ''}</span>
          <div class="notif-main">
            <span class="notif-title">${escapeHtml(g.title)}${isUnread ? '<span class="notif-new-dot" aria-hidden="true"></span>' : ''}</span>
            <p class="notif-body">${escapeHtml(g.body)}</p>
            <span class="notif-time">${timeAgo(g.at)} · ${channelLabel(entry)}${merged ? '' : `<span class="notif-cat-chip">${escapeHtml(categoryLabel(entry))}</span>`}${mergeChips}${merged ? `<span class="notif-merge-note">${routine ? `${g.count}건 모아보기` : `${g.count}건 묶음`}</span>` : ''}</span>
          </div>
        </article>
        ${g.expandable ? `<div class="notif-expand-row">
          <button class="notif-expand ${expanded ? 'is-open' : ''}" type="button"
                  data-notif-expand="${g.key}" aria-expanded="${expanded}" aria-controls="${itemsId}"
                  aria-label="${escapeHtml(g.title)} ${g.count}건 ${expanded ? '접기' : '펼쳐보기'}">
            <span class="notif-expand-caret" aria-hidden="true">${ic('chevronDown')}</span>
            ${expanded ? '접기' : (routine ? `펼쳐보기 · ${g.count}건` : `펼쳐보기 · 누가 남겼는지 ${g.count}`)}
          </button>
          <div class="notif-items" id="${itemsId}" role="group" aria-label="${escapeHtml(g.title)} 상세" ${expanded ? '' : 'hidden'}>
            ${g.items.map((it) => `
              <div class="notif-detail-row ${it.read ? '' : 'unread'}">
                <span class="notif-detail-emoji" aria-hidden="true">${ic(it.icon)}</span>
                <span class="notif-detail-actor">${escapeHtml(it.actorName || '취미친구')}</span>
                <span class="notif-detail-text">${escapeHtml(routine ? (it.text || '').slice(0, 90) : notifDetailText(it))}</span>
                <span class="notif-detail-time">${timeAgo(it.at)}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}
        <div class="notif-item-actions">
          <button class="notif-act" type="button" data-notif-mark="${g.key}"
                  aria-label="${escapeHtml(g.title)} 알림을 읽음으로 표시">${ic('check')} 읽음</button>
          <button class="notif-act danger" type="button" data-notif-delete="${g.key}"
                  aria-label="${escapeHtml(g.title)} 알림 지우기">${ic('trash')} 지우기</button>
        </div>
      </div>`;
    }).join('');
  }

  /**
   * 묶음 펼치기 한 줄의 문장 — 누가 · 무슨 반응 · 언제 (Sprint 10).
   *  · 좋아요는 종류가 이미 말해 주므로 짧게, 댓글은 남긴 문장만 발췌한다.
   */
  function notifDetailText(item) {
    const text = String(item.text || '');
    if (item.category === 'like') return '내 글에 하트를 남겼어요';
    if (item.category === 'comment') {
      const actor = item.actorName ? `${item.actorName}: ` : null;
      const body = actor && text.startsWith(actor) ? text.slice(actor.length) : text;
      return `“${body.slice(0, 70)}”`;
    }
    return text.slice(0, 90);
  }

  /** 묶음 펼치기/접기 — 보이는 방식만 바꾼다(읽음·지우기는 원본 단위 그대로).
   *  Sprint 11: 펼친 키를 세션 저장소에 남겨, 필터를 오가거나 새로고침해도 펼침이 유지된다. */
  function toggleNotifExpand(key) {
    const set = new Set(ui.notifExpanded || []);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    ui.notifExpanded = Array.from(set);
    renderNotificationList();
    const btn = el.notifBody ? el.notifBody.querySelector(`[data-notif-expand="${key}"]`) : null;
    if (btn) btn.focus({ preventScroll: true });
  }

  /** 펼친 묶음을 한 번에 접는다(알림함 도구 줄의 '모두 접기'). */
  function collapseAllNotifExpand() {
    if (!(ui.notifExpanded || []).length) return;
    ui.notifExpanded = [];
    renderNotificationList();
    showToast('펼친 알림을 모두 접었어요', 'success');
  }

  /* ==========================================================================
   * Sprint 8 — 알림함 2차: 스와이프로 읽음/지우기 · 접근성용 버튼
   * ------------------------------------------------------------------------
   *  · 오른쪽으로 밀면 읽음, 왼쪽으로 밀면 지우기(64px 이상).
   *  · 키보드·스크린리더는 항목 아래의 '읽음 / 지우기' 버튼을 쓰면 된다.
   *  · 지운 알림은 토스트의 '되돌리기'로 원래 순서에 되살아난다.
   * ======================================================================== */

  /** 묶음 키('post:...' · 'single:...') 또는 알림 id → 묶음 정보(원본 알림 id 목록 포함) */
  function resolveNotifGroup(keyOrId) {
    const mapped = ui.notifGroupMap && ui.notifGroupMap[keyOrId];
    if (mapped) return mapped;
    const entry = store.getNotifications().find((n) => n.id === keyOrId);
    if (!entry) return null;
    return {
      key: `single:${entry.id}`, type: 'single', entry, entries: [entry],
      ids: [entry.id], count: 1, postId: entry.postId || null
    };
  }

  /** 묶음(원본 알림 여러 개)을 한 번에 읽음 처리한다. */
  function markNotifRead(keyOrId) {
    const group = resolveNotifGroup(keyOrId);
    if (!group) return;
    const changed = store.markNotificationsReadByIds(group.ids);
    ui.notifSessionUnread = (ui.notifSessionUnread || []).filter((x) => !group.ids.includes(x));
    renderNotificationList();
    updateBadges();
    if (changed) {
      showToast(group.ids.length > 1
        ? `묶인 알림 ${group.ids.length}건을 읽음으로 표시했어요`
        : '읽음으로 표시했어요', 'info');
    }
  }

  /** 묶음(원본 알림 여러 개)을 한 번에 지우고, 토스트의 '되돌리기'로 전부 되살린다. */
  function removeNotif(keyOrId) {
    const group = resolveNotifGroup(keyOrId);
    if (!group) return;
    const del = store.deleteNotificationsByIds(group.ids);
    if (!del) return;
    ui.notifSessionUnread = (ui.notifSessionUnread || []).filter((x) => !group.ids.includes(x));
    renderNotificationList();
    updateBadges();
    showToast(del.removed.length > 1
      ? `묶인 알림 ${del.removed.length}건을 지웠어요`
      : '알림을 지웠어요', 'info', {
      label: '되돌리기',
      onClick: () => {
        store.restoreNotifications(del.removed);
        renderNotificationList();
        updateBadges();
        showToast('알림을 되살렸어요', 'info');
      }
    });
  }

  /* 스와이프 제스처 — 포인터 이벤트(터치·마우스 공통) */
  let notifSwipe = null;
  const NOTIF_SWIPE_COMMIT = 64;

  el.notifBody && el.notifBody.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('[data-notif-item]');
    if (!item || e.target.closest('button')) return;
    notifSwipe = {
      item, id: item.dataset.notifItem,
      startX: e.clientX, startY: e.clientY, dx: 0, active: false
    };
  });

  el.notifBody && el.notifBody.addEventListener('pointermove', (e) => {
    if (!notifSwipe) return;
    const dx = e.clientX - notifSwipe.startX;
    const dy = e.clientY - notifSwipe.startY;
    if (!notifSwipe.active) {
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;   // 세로 스크롤이 먼저
      notifSwipe.active = true;
      notifSwipe.item.classList.add('is-swiping');
      if (notifSwipe.item.parentElement) notifSwipe.item.parentElement.classList.add('is-swiping');
    }
    notifSwipe.dx = Math.max(-120, Math.min(120, dx));
    notifSwipe.item.style.transform = `translateX(${notifSwipe.dx}px)`;
    notifSwipe.item.classList.toggle('will-read', notifSwipe.dx > 40);
    notifSwipe.item.classList.toggle('will-delete', notifSwipe.dx < -40);
  });

  function endNotifSwipe(commit) {
    if (!notifSwipe) return;
    const { item, id, dx, active } = notifSwipe;
    notifSwipe = null;
    item.classList.remove('is-swiping', 'will-read', 'will-delete');
    if (item.parentElement) item.parentElement.classList.remove('is-swiping');
    item.style.transform = '';
    if (!active || !commit) return;
    ui.suppressNotifClickUntil = Date.now() + 350;   // 스와이프 직후의 클릭은 무시
    if (dx >= NOTIF_SWIPE_COMMIT) markNotifRead(id);
    else if (dx <= -NOTIF_SWIPE_COMMIT) removeNotif(id);
  }

  document.addEventListener('pointerup', () => endNotifSwipe(true));
  document.addEventListener('pointercancel', () => endNotifSwipe(false));

  el.notifSettingsBody && el.notifSettingsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-notif-action]');
    if (!btn) return;
    const action = btn.dataset.notifAction;
    if (action === 'toggle-push') {
      const next = !store.notificationSettings.pushEnabled;
      store.updateNotificationSettings({ pushEnabled: next });
      renderNotificationSettings();
      showToast(next ? '푸시 알림을 켰어요' : '푸시 알림을 껐어요 · 알림은 알림함에만 쌓여요', next ? 'success' : 'info');
      if (next && store.notificationSettings.permission !== 'granted') requestPushPermission();
      return;
    }
    if (action === 'toggle-dnd') {
      const next = !store.notificationSettings.dndEnabled;
      store.updateNotificationSettings({ dndEnabled: next });
      renderNotificationSettings();
      const nowQuiet = next && store.isDndActive();
      showToast(next
        ? (nowQuiet ? '방해 금지 시간이에요 · 가입 결과를 뺀 알림은 조용히 모여요' : '방해 금지 모드를 켰어요')
        : '방해 금지 모드를 껐어요', 'info');
      return;
    }
    /* Sprint 7 — 야간 예외(모임 가입 결과) 토글 */
    if (action === 'toggle-dnd-exception') {
      const id = btn.dataset.cat || 'join_result';
      const next = !store.isDndExempt(id);
      store.updateNotificationSettings({ dndExceptions: { [id]: next } });
      renderNotificationSettings();
      showToast(next
        ? '모임 가입 결과는 방해 금지 시간에도 바로 알려드릴게요'
        : '모임 가입 결과도 방해 금지 시간에는 조용히 모아둘게요', 'info');
      return;
    }
    if (action === 'request-permission') {
      requestPushPermission();
      return;
    }
    /* Sprint 5 — 알림 종류별 ON/OFF */
    if (action === 'toggle-cat') {
      const id = btn.dataset.cat;
      const next = !store.isCategoryEnabled(id);
      store.updateNotificationSettings({ channels: { [id]: next } });
      renderNotificationSettings();
      const cat = store.getNotificationCategories().find((c) => c.id === id);
      const label = cat ? cat.label : '알림';
      showToast(next
        ? `${label} 알림을 켰어요`
        : `${label} 알림을 껐어요 · 알림함에만 쌓여요`, next ? 'success' : 'info');
      if (next && store.notificationSettings.permission !== 'granted') requestPushPermission();
      return;
    }
    /* Sprint 5~6 — 알림 종류 시험 (실제 이벤트와 같은 dispatchNotification 경로) */
    if (action === 'sim-chat') {
      const res = store.simulateChatReply();
      if (!res.ok) {
        showToast('아직 1:1 대화방이 없어요 · 탐색에서 하트를 보내 매칭을 만들어 보세요', 'warning');
        switchTab('tab-explore');
        return;
      }
      deliverNotification(res.res);
      renderChatRooms();
      updateBadges();
      showToast(`${res.room.partnerName}님에게 새 메시지가 도착했어요${deliveryNote(res.res)}`);
      return;
    }
    if (action === 'sim-like' || action === 'sim-comment') {
      const isLike = action === 'sim-like';
      const res = store.simulateIncomingReaction(isLike ? 'like' : 'comment');
      if (!res.ok) {
        showToast('먼저 내 동네 글을 하나 올려 주세요 · 탐색 탭에서 쓸 수 있어요', 'warning');
        switchTab('tab-explore');
        return;
      }
      deliverNotification(res.res);
      renderExplore({ preserve: true });
      showToast(`${res.persona.name}님이 내 글에 ${isLike ? '좋아요를 남겼어요' : '댓글을 남겼어요'}${deliveryNote(res.res)}`);
      return;
    }
    if (action === 'sim-join') {
      const res = store.simulateJoinRequest();
      if (!res.ok) {
        showToast('내가 그룹장인 모임이 없어요', 'warning');
        return;
      }
      deliverNotification(res.res);
      renderExplore({ preserve: true });
      showToast(`${res.application.applicantName}님이 '${res.group.name}' 가입을 신청했어요${deliveryNote(res.res)}`);
      return;
    }
    if (action === 'sim-result') {
      const res = store.simulateJoinDecision(true);
      if (!res.ok) {
        showToast('승인 대기 중인 내 신청이 없어요 · 모임 상세에서 가입 신청을 먼저 해보세요', 'warning');
        return;
      }
      deliverNotification(res.res);
      renderExplore({ preserve: true });
      updateBadges();
      showToast(`'${res.application.groupName}' 가입이 수락되었어요${deliveryNote(res.res)}`);
      return;
    }
    /* Sprint 8 — 종류별 예시 알림 미리보기 (펼치기/닫기) */
    if (action === 'toggle-preview') {
      const id = btn.dataset.cat;
      ui.notifPreview = ui.notifPreview === id ? null : id;
      renderNotificationSettings();
      const reopened = document.querySelector(`[data-notif-action="toggle-preview"][data-cat="${id}"]`);
      if (reopened && ui.notifPreview === id) reopened.focus({ preventScroll: true });
      return;
    }
    /* Sprint 8 — 실베 진입 시뮬레이션 (내 글에 반응이 몰린 상황) */
    if (action === 'sim-hot') {
      const res = store.simulateHotEntry({ regionId: ui.exploreRegion });
      if (!res.ok) {
        showToast('먼저 내 동네 글을 하나 올려 주세요 · 탐색 탭에서 쓸 수 있어요', 'warning');
        switchTab('tab-explore');
        return;
      }
      if (res.res) deliverNotification(res.res);
      ui.hotRendered = true;
      renderHotStrip();
      renderExplore({ preserve: true });
      updateBadges();
      showToast(res.rank && res.rank <= 10
        ? `내 글이 실베 ${res.rank}위에 올랐어요 (Top 10 진입 알림)${deliveryNote(res.res)}`
        : '반응이 몰렸지만 아직 10위 밖이에요 · 조금 더 반응이 필요해요', res.rank && res.rank <= 10 ? 'success' : 'info');
      return;
    }
    if (action === 'test') sendTestPush();
  });

  el.notifSettingsBody && el.notifSettingsBody.addEventListener('change', (e) => {
    const input = e.target.closest('[data-dnd]');
    if (!input) return;
    const key = input.dataset.dnd === 'start' ? 'dndStart' : 'dndEnd';
    const res = store.updateNotificationSettings({ [key]: input.value });
    if (!res.ok) {
      const messages = {
        dnd_start: '시작 시각을 다시 골라주세요',
        dnd_end: '종료 시각을 다시 골라주세요',
        dnd_same: '시작과 종료 시각이 같으면 방해 금지가 동작하지 않아요'
      };
      showToast(messages[res.reason] || '시간을 저장하지 못했어요', 'warning');
      renderNotificationSettings();
      return;
    }
    renderNotificationSettings();
    showToast(`방해 금지 시간을 ${res.settings.dndStart}~${res.settings.dndEnd} 로 저장했어요`, 'info');
  });

  el.btnPushAllow && el.btnPushAllow.addEventListener('click', () => requestPushPermission());
  el.btnPushDismiss && el.btnPushDismiss.addEventListener('click', () => {
    store.updateNotificationSettings({ promptDismissed: true });
    renderPushPrompt();
    showToast('프로필 → 알림 설정에서 언제든 켤 수 있어요', 'info');
  });

  /* Sprint 7 — 알림함 종류 필터·안 읽은 것만·모두 읽음 */
  el.notifFilters && el.notifFilters.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-notif-filter]');
    if (!chip) return;
    ui.notifFilter = chip.dataset.notifFilter;
    renderNotificationList();
  });

  el.notifUnreadToggle && el.notifUnreadToggle.addEventListener('click', () => {
    ui.notifUnreadOnly = !ui.notifUnreadOnly;
    renderNotificationList();
    if (ui.notifUnreadOnly) {
      const count = notifUnreadSet().size;
      showToast(count ? `이번에 도착한 알림 ${count}건만 보여드려요` : '지금은 새로 온 알림이 없어요', 'info');
    }
  });

  el.notifReadAll && el.notifReadAll.addEventListener('click', () => {
    const changed = store.markNotificationsRead();
    ui.notifSessionUnread = [];
    renderNotificationList();
    updateBadges();
    showToast(changed ? `알림 ${changed}건을 모두 읽음으로 표시했어요` : '이미 모든 알림을 읽었어요', 'info');
  });

  /* Sprint 11 — 펼친 알림 묶음을 한 번에 접기 */
  el.notifCollapseAll && el.notifCollapseAll.addEventListener('click', collapseAllNotifExpand);

  el.notifBody && el.notifBody.addEventListener('click', (e) => {
    if (e.target.closest('[data-notif-reset]')) {
      ui.notifFilter = 'all';
      ui.notifUnreadOnly = false;
      renderNotificationList();
      return;
    }
    /* Sprint 10 — 묶음 펼치기/접기 (기본은 1줄 요약, 필요하면 누가·언제를 한 줄씩) */
    const expandBtn = e.target.closest('[data-notif-expand]');
    if (expandBtn) {
      e.preventDefault();
      toggleNotifExpand(expandBtn.dataset.notifExpand);
      return;
    }
    /* Sprint 8 — 접근성용 액션 버튼 */
    const markBtn = e.target.closest('[data-notif-mark]');
    if (markBtn) { markNotifRead(markBtn.dataset.notifMark); return; }
    const delBtn = e.target.closest('[data-notif-delete]');
    if (delBtn) { removeNotif(delBtn.dataset.notifDelete); return; }
    if (ui.suppressNotifClickUntil && Date.now() < ui.suppressNotifClickUntil) return;   // 스와이프 직후
    const item = e.target.closest('[data-notif-item]');
    if (!item) return;
    /* 묶음이면 원본 알림을 모두 읽음 처리하고, 대표 알림으로 이동한다. */
    const group = resolveNotifGroup(item.dataset.notifItem);
    if (!group) return;
    store.markNotificationsReadByIds(group.ids);
    ui.notifSessionUnread = (ui.notifSessionUnread || []).filter((x) => !group.ids.includes(x));
    openFromNotification(group.entry);
  });

  el.notifBody && el.notifBody.addEventListener('keydown', (e) => {
    const item = e.target.closest('[data-notif-item]');
    if (!item) return;
    /* Sprint 8 — Delete/Backspace 로도 지울 수 있다 */
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeNotif(item.dataset.notifItem);
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const group = resolveNotifGroup(item.dataset.notifItem);
    if (!group) return;
    store.markNotificationsReadByIds(group.ids);
    ui.notifSessionUnread = (ui.notifSessionUnread || []).filter((x) => !group.ids.includes(x));
    openFromNotification(group.entry);
  });

  /* ==========================================================================
   * 6-5. 내 활동 로그 (Sprint 6)
   * ------------------------------------------------------------------------
   *  11/14 21:24 사용자 지시: "디자인이나 로그 기능 등등 다 해야지".
   *  · 데이터는 store.getActivityLogs() 하나에서만 온다(하트·글·댓글·모임).
   *  · 종류 칩으로 걸러 보고, 항목을 누르면 그 대상(사람·대화방·게시글·모임)으로 바로 간다.
   *  · 로그는 저장된 상태에서 파생되므로 하트를 취소하면 그 항목도 사라진다(서로 어긋나지 않음).
   * ======================================================================== */

  /** 날짜 구분선 문구 — 오늘 / 어제 / M월 D일 (요일) */
  function activityDayLabel(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '기록';
    const today = new Date();
    const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((startOf(today) - startOf(d)) / 86400000);
    if (diff <= 0) return '오늘';
    if (diff === 1) return '어제';
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  }

  function activityClock(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
  }

  function renderActivityFilters() {
    if (!el.activityFilters) return;
    const stats = store.getActivityStats();
    el.activityFilters.innerHTML = store.getActivityTypes().map((t) => {
      const on = ui.activityType === t.id;
      const count = t.id === 'all' ? stats.total : (stats[t.id] || 0);
      return `<button class="activity-filter ${on ? 'active' : ''}" data-activity-type="${t.id}"
                      aria-pressed="${on}" type="button">
                <span aria-hidden="true">${ic(t.icon)}</span>
                <span>${escapeHtml(t.name)}</span>
                <span class="activity-filter-count">${count}</span>
              </button>`;
    }).join('');
    keepChipVisible(el.activityFilters, '.activity-filter.active');
  }

  /** Sprint 7 — 이번 주 / 이번 달 요약 카드 */
  function renderActivityStats() {
    if (!el.activityStats) return;
    const s = store.getActivityStats();
    const cells = (bucket) => `
      <div class="activity-stat-cells">
        <div class="activity-stat-cell"><strong>${bucket.like}</strong><span>${ic('heart')} 하트</span></div>
        <div class="activity-stat-cell"><strong>${bucket.post}</strong><span>글</span></div>
        <div class="activity-stat-cell"><strong>${bucket.comment}</strong><span>댓글</span></div>
        <div class="activity-stat-cell"><strong>${bucket.group}</strong><span>모임</span></div>
      </div>`;
    el.activityStats.innerHTML = `
      <div class="activity-stat-group">
        <span class="activity-stat-head">이번 주 <span>${s.week.total}건</span></span>
        ${cells(s.week)}
      </div>
      <div class="activity-stat-group month">
        <span class="activity-stat-head">이번 달 <span>${s.month.total}건</span></span>
        ${cells(s.month)}
      </div>`;
  }

  /** Sprint 8 — 기간 필터 칩 (전체 / 최근 7일 / 최근 30일) */
  function renderActivityRange() {
    if (!el.activityRange) return;
    el.activityRange.innerHTML = store.getActivityRangeOptions().map((r) => {
      const on = ui.activityRange === r.id;
      return `<button class="activity-range-chip ${on ? 'active' : ''}" data-activity-range="${r.id}"
                      aria-pressed="${on}" type="button">${ic(r.icon)} ${escapeHtml(r.name)}</button>`;
    }).join('');
  }

  /** Sprint 8 — 보기 방식 (타임라인 / 모임별) */
  function renderActivityView() {
    if (!el.activityView) return;
    const modes = [
      { id: 'timeline', name: '타임라인', icon: 'timeline' },
      { id: 'group', name: '모임별', icon: 'users' }
    ];
    el.activityView.innerHTML = modes.map((m) => {
      const on = ui.activityView === m.id;
      return `<button class="activity-view-chip ${on ? 'active' : ''}" data-activity-view="${m.id}"
                      aria-pressed="${on}" type="button">${ic(m.icon)} ${m.name}</button>`;
    }).join('');
  }

  /** 활동 로그 한 항목의 마크업 (타임라인·모임별 공용) */
  function activityItemHTML(entry) {
    return `<article class="activity-item tone-${escapeHtml(entry.tone || 'green')}"
                 data-activity-item="${escapeHtml(entry.id)}" role="button" tabindex="0"
                 aria-label="${escapeHtml(entry.title)} · ${escapeHtml(activityClock(entry.at))} 상세 보기">
      <span class="activity-emoji" aria-hidden="true">${ic(entry.icon || 'dot')}</span>
      <div class="activity-main">
        <span class="activity-title">${escapeHtml(entry.title)}</span>
        ${entry.body ? `<p class="activity-body-text">${escapeHtml(entry.body)}</p>` : ''}
        <span class="activity-meta">${escapeHtml(activityClock(entry.at))}
          <span class="activity-type-chip">${escapeHtml((store.getActivityTypes().find((t) => t.id === entry.type) || {}).name || '활동')}</span>
        </span>
      </div>
      ${entry.actionable
        ? `<button class="activity-action" type="button" data-activity-action="${entry.actionable}"
                   data-activity-id="${escapeHtml(entry.id)}">${entry.actionable === 'unlike' ? '하트 취소' : '신청 취소'}</button>`
        : '<span class="activity-go" aria-hidden="true">›</span>'}
    </article>`;
  }

  function renderActivityLog() {
    if (!el.activityBody) return;
    renderActivityFilters();
    renderActivityRange();
    renderActivityView();
    renderActivityStats();
    const logs = store.getActivityLogs({ type: ui.activityType, range: ui.activityRange });
    const stats = store.getActivityStats();
    if (el.activitySummary) {
      const rangeOpt = store.getActivityRangeOptions().find((r) => r.id === ui.activityRange);
      const rangeText = rangeOpt && rangeOpt.id !== 'all' ? ` · ${rangeOpt.name} ${logs.length}건` : '';
      el.activitySummary.textContent = stats.total
        ? `하트 ${stats.like} · 글 ${stats.post} · 댓글 ${stats.comment} · 모임 ${stats.group}`
          + (stats.today ? ` · 오늘 ${stats.today}건` : '') + rangeText
        : '아직 기록이 없어요';
    }
    if (!logs.length) {
      el.activityBody.innerHTML = `
        <div class="empty-state activity-empty">
          ${emptyArt('activity')}
          <p class="empty-title">${ui.activityRange === 'all' ? '아직 이 종류의 활동이 없어요' : '이 기간에는 활동이 없어요'}</p>
          <p class="empty-desc">탐색에서 하트를 보내거나 글·댓글을 남기면 여기에 차곡차곡 쌓여요.</p>
          <button class="btn-secondary" data-activity-reset="1" type="button">${ui.activityRange === 'all' ? '전체 보기' : '기간 전체 보기'}</button>
        </div>`;
      return;
    }

    /* 모임별 묶어보기 — 같은 모임의 기록을 하나로 묶고, 묶음 안은 최신순 */
    if (ui.activityView === 'group') {
      const groups = store.getActivityGroups({ type: ui.activityType, range: ui.activityRange });
      el.activityBody.innerHTML = groups.map((g) => `
        <section class="activity-group" data-activity-group="${escapeHtml(g.groupId || g.groupName)}">
          <header class="activity-group-head">
            <span class="activity-group-emoji" aria-hidden="true">${ic(g.icon || 'users')}</span>
            <span class="activity-group-name">${escapeHtml(g.groupName)}</span>
            <span class="activity-group-count">${g.count}건</span>
          </header>
          ${g.logs.map(activityItemHTML).join('')}
        </section>`).join('');
      return;
    }

    let lastDay = null;
    el.activityBody.innerHTML = logs.map((entry) => {
      const day = activityDayLabel(entry.at);
      const divider = day !== lastDay
        ? `<div class="activity-day"><span>${escapeHtml(day)}</span></div>` : '';
      lastDay = day;
      return divider + activityItemHTML(entry);
    }).join('');
  }

  function openActivityLog() {
    if (!el.activityModal) return;
    ui.activityType = 'all';
    renderActivityLog();
    openModal(el.activityModal);
    /* 시트를 열면 목록 맨 위(가장 최근)부터 보이게 */
    if (el.activityBody && el.activityBody.scrollIntoView) {
      el.activityBody.scrollIntoView({ block: 'nearest' });
    }
  }

  /* ==========================================================================
   * 6-5b. Sprint 9 — 내 활동 로그 내보내기 (텍스트 / CSV)
   * ------------------------------------------------------------------------
   *  11/15 00:23 사용자 지시: 기간별 활동을 텍스트/CSV로 복사·내보내기.
   *  · 클립보드는 Clipboard API → 막히면 textarea+execCommand 폴백(retina에서도 동작).
   *  · CSV는 UTF-8 BOM을 붙여 엑셀·구글시트에서 한글이 깨지지 않게 한다.
   *  · 지금 보고 있는 기간·종류 필터를 그대로 반영한다(사용자가 보는 것 = 내보내는 것).
   * ======================================================================== */

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* 아래 폴백으로 */ }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0, area.value.length);
      const ok = !!(document.execCommand && document.execCommand('copy'));
      document.body.removeChild(area);
      return ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * 지금 기간·종류의 활동 로그를 텍스트/CSV로 복사한다.
   * @param {'text'|'csv'} format
   */
  async function exportActivity(format) {
    const kind = format === 'csv' ? 'csv' : 'text';
    const res = store.exportActivityLog({ type: ui.activityType, range: ui.activityRange, format: kind });
    if (!res.count) {
      showToast('내보낼 활동이 없어요 · 기간이나 종류를 바꿔보세요', 'warning');
      return { ok: false, count: 0, format: kind, text: res.text, filename: res.filename };
    }
    const copied = await copyToClipboard(kind === 'csv' ? `\ufeff${res.text}` : res.text);
    showToast(copied
      ? `${kind === 'csv' ? 'CSV' : '텍스트'}로 ${res.count}건을 복사했어요 · 메모·노션에 붙여넣어 보세요`
      : `${kind === 'csv' ? 'CSV' : '텍스트'} 준비 완료 · 브라우저가 복사를 막았다면 'CSV 저장'을 눌러주세요`,
    copied ? 'success' : 'warning');
    return { ok: copied, count: res.count, format: kind, text: res.text, filename: res.filename };
  }

  /** CSV 파일로 저장 — 파일 이름에 오늘 날짜·기간·종류가 들어간다. */
  function downloadActivityCsv() {
    const res = store.exportActivityLog({ type: ui.activityType, range: ui.activityRange, format: 'csv' });
    if (!res.count) {
      showToast('내보낼 활동이 없어요 · 기간이나 종류를 바꿔보세요', 'warning');
      return null;
    }
    try {
      const blob = new Blob([`\ufeff${res.text}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
      showToast(`CSV 파일로 저장했어요 · ${res.filename}`, 'success');
      return res;
    } catch (e) {
      showToast('이 브라우저에서는 파일 저장이 막혀 있어요 · CSV 복사를 써주세요', 'warning');
      return null;
    }
  }

  el.activityExportText && el.activityExportText.addEventListener('click', () => { exportActivity('text'); });
  el.activityExportCsv && el.activityExportCsv.addEventListener('click', () => { exportActivity('csv'); });
  el.activityExportDownload && el.activityExportDownload.addEventListener('click', downloadActivityCsv);

  /** 활동 항목 → 그 대상으로 딥링크. 닫고 이동한다. */
  function openActivityTarget(entry) {
    if (!entry) return;
    closeModal(el.activityModal);
    if (entry.targetType === 'chat' && entry.roomId && store.getChatRoom(entry.roomId)) {
      switchTab('tab-chat');
      renderChatRooms();
      openChatRoom(entry.roomId);
      return;
    }
    if (entry.targetType === 'person' && entry.personId) {
      switchTab('tab-explore');
      openPersonDetail(entry.personId);
      return;
    }
    if (entry.targetType === 'explore_post' && entry.postId && store.getExplorePost(entry.postId)) {
      switchTab('tab-explore');
      openPostDetail(entry.postId);
      return;
    }
    if (entry.targetType === 'feed_post' && entry.postId) {
      const post = store.getPost(entry.postId);
      goGroupFeed(post ? post.groupId : null, 'feed');
      focusFeedPost(entry.postId);
      return;
    }
    if (entry.targetType === 'group' && entry.groupId && store.getGroup(entry.groupId)) {
      openGroupDetail(entry.groupId);
      return;
    }
    switchTab('tab-explore');
  }

  el.activityFilters && el.activityFilters.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-activity-type]');
    if (!chip) return;
    ui.activityType = chip.dataset.activityType;
    renderActivityLog();
  });

  /* Sprint 8 — 기간 필터 · 타임라인/모임별 보기 */
  el.activityRange && el.activityRange.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-activity-range]');
    if (!chip) return;
    ui.activityRange = chip.dataset.activityRange;
    renderActivityLog();
  });

  el.activityView && el.activityView.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-activity-view]');
    if (!chip) return;
    ui.activityView = chip.dataset.activityView;
    renderActivityLog();
    showToast(ui.activityView === 'group'
      ? '같은 모임에 남긴 기록을 묶어서 보여드려요'
      : '최신순 타임라인으로 보여드려요', 'info');
  });

  el.activityBody && el.activityBody.addEventListener('click', (e) => {
    if (e.target.closest('[data-activity-reset]')) {
      ui.activityType = 'all';
      ui.activityRange = 'all';
      renderActivityLog();
      return;
    }
    /* Sprint 7 — 로그에서 바로 하트 취소 · 신청 취소 */
    const actionBtn = e.target.closest('[data-activity-action]');
    if (actionBtn) {
      e.stopPropagation();
      const entry = store.getActivityLogs({}).find((x) => x.id === actionBtn.dataset.activityId);
      if (!entry) return;
      if (entry.actionable === 'unlike' && entry.personId) {
        const res = store.toggleMatchLike(entry.personId);
        if (!res.ok) {
          showToast('이미 취소된 하트예요', 'info');
          return;
        }
        renderActivityLog();
        renderExplore({ preserve: true });
        renderChatRooms();
        updateBadges();
        const nickname = res.profile ? res.profile.nickname : '취미친구';
        showToast(res.roomKept
          ? `${nickname}님 하트를 취소했어요 · 대화가 시작된 방은 그대로 둘게요`
          : `${nickname}님에게 보낸 하트를 취소했어요`, 'info');
        return;
      }
      if (entry.actionable === 'cancel_application' && entry.applicationId) {
        const res = store.cancelApplication(entry.applicationId);
        if (!res.ok) {
          showToast('이미 처리된 신청이에요', 'warning');
          return;
        }
        renderActivityLog();
        renderExplore({ preserve: true });
        updateBadges();
        showToast(`'${res.application.groupName}' 가입 신청을 취소했어요`, 'info');
        return;
      }
    }
    const item = e.target.closest('[data-activity-item]');
    if (!item) return;
    const entry = store.getActivityLogs({}).find((x) => x.id === item.dataset.activityItem);
    openActivityTarget(entry);
  });

  el.activityBody && el.activityBody.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('button')) return;          // 취소 버튼은 기본 동작
    const item = e.target.closest('[data-activity-item]');
    if (!item) return;
    e.preventDefault();
    const entry = store.getActivityLogs({}).find((x) => x.id === item.dataset.activityItem);
    openActivityTarget(entry);
  });

  const menuActivityLog = $('#menu-activity-log');
  menuActivityLog && menuActivityLog.addEventListener('click', openActivityLog);
  const activityClose = $('#btn-close-activity');
  activityClose && activityClose.addEventListener('click', () => closeModal(el.activityModal));

  /* Sprint 11 — 월간 리포트는 사용자 지시(11/15 "리포트는 아예 없애")로 제거했다. */

  /* ==========================================================================
   * 6-4b. PWA — 홈 화면에 추가 · Service Worker · 오프라인 (Sprint 5)
   * ------------------------------------------------------------------------
   *  · manifest.json + 아이콘은 정적 파일이고, 여기서는
   *    ① 설치 안내 카드(프로필 탭) ② SW 등록 ③ SW 가 보내는 알림 클릭 수신
   *    을 맡는다.
   *  · file:// (index.html 직접 열기) 나 단일 HTML 번들에서는 SW 등록을 **건너뛴다**.
   *    그렇게 해야 파일로 열 때도 콘솔 오류 없이 앱이 그대로 동작한다.
   * ======================================================================== */
  const isStandalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true;
  const isIosDevice = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent || '');

  let deferredInstallPrompt = null;
  let swRegistration = null;
  let swStatus = 'idle';          /* idle | registering | ready | unsupported | protocol | bundle | error */

  function swStatusLabel() {
    if (swStatus === 'ready') return '오프라인 준비됨';
    if (swStatus === 'registering') return '준비 중';
    if (swStatus === 'protocol' || swStatus === 'bundle') return '설치 안내';
    if (swStatus === 'error') return '오프라인 미지원';
    return '확인 중';
  }

  function renderPwaCard() {
    if (!el.pwaCard) return;
    const installed = isStandalone();
    const dismissed = !!store.pwaState.installDismissed;
    /* 홈 화면에서 이미 앱으로 실행 중이면 계속 보여준다(상태 확인용). 닫았으면 숨긴다. */
    el.pwaCard.hidden = installed ? false : dismissed;
    if (el.pwaCard.hidden) return;

    const stateEl = el.pwaCardState;
    const descEl = el.pwaCardDesc;
    const actions = el.pwaCardActions;

    if (stateEl) {
      stateEl.textContent = installed ? '설치됨' : (deferredInstallPrompt ? '설치 가능' : swStatusLabel());
      stateEl.classList.toggle('ready', installed || !!deferredInstallPrompt || swStatus === 'ready');
    }

    if (installed) {
      if (descEl) descEl.textContent = '홈 화면에서 ooG 앱으로 실행 중이에요. 이제 앱을 꺼도 푸시 알림을 받을 수 있고, 오프라인에서도 화면이 열려요.';
      if (actions) actions.innerHTML = `<p class="pwa-steps">${swStatus === 'ready'
        ? '오프라인 캐시가 준비되어 있어요'
        : '오프라인 캐시를 준비하려면 한 번 더 열어 주세요'}</p>`;
      return;
    }

    if (deferredInstallPrompt) {
      if (descEl) descEl.textContent = '앱처럼 전체 화면으로 열리고, 홈 화면 아이콘으로 바로 시작할 수 있어요.';
      if (actions) actions.innerHTML = `
        <button class="pwa-install-btn" data-pwa-action="install" type="button">홈 화면에 추가하기</button>
        <p class="pwa-steps">설치하면 앱을 꺼도 푸시 알림을 받을 수 있어요.</p>`;
      return;
    }

    if (isIosDevice()) {
      if (descEl) descEl.textContent = '아이폰은 사파리에서 홈 화면에 추가하면 앱처럼 열려요.';
      if (actions) actions.innerHTML = `
        <ol class="pwa-steps">
          <li>사파리 <strong>공유 버튼</strong>(네모에 화살표)을 눌러요</li>
          <li><strong>‘홈 화면에 추가’</strong>를 고르고 <strong>추가</strong>를 누르면 끝!</li>
        </ol>`;
      return;
    }

    if (descEl) descEl.textContent = '브라우저 메뉴에서 설치하면 앱처럼 열리고 오프라인에서도 화면이 떠요.';
    if (actions) actions.innerHTML = `
      <p class="pwa-steps">주소창 오른쪽 <strong>설치 아이콘</strong> 또는 메뉴 › <strong>‘ooG 설치’</strong> 를 눌러 주세요.</p>`;
  }

  async function promptInstall() {
    if (!deferredInstallPrompt) {
      renderPwaCard();
      showToast(isIosDevice()
        ? '사파리 공유 버튼 → 홈 화면에 추가를 눌러 주세요'
        : '브라우저 메뉴에서 ooG를 설치할 수 있어요', 'info');
      return 'no_prompt';
    }
    const prompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    try { await prompt.prompt(); } catch (e) { /* 사용자가 취소 */ }
    const choice = await (prompt.userChoice || Promise.resolve({ outcome: 'dismissed' }));
    renderPwaCard();
    if (choice && choice.outcome === 'accepted') showToast('ooG를 홈 화면에 추가했어요');
    return choice && choice.outcome;
  }

  /**
   * Service Worker 등록. 반환값은 상태 문자열('ready' | 'protocol' | 'bundle' | 'unsupported' | 'error').
   * 파일로 연 경우(file://)와 단일 번들에서는 등록하지 않는다 — 그래도 앱은 그대로 동작해야 한다.
   */
  async function registerServiceWorker() {
    if (document.documentElement.dataset.bundle === 'true') {
      swStatus = 'bundle';
      renderPwaCard();
      return 'bundle';
    }
    if (location.protocol !== 'http:' && location.protocol !== 'https:') {
      swStatus = 'protocol';
      renderPwaCard();
      return 'protocol';
    }
    if (!('serviceWorker' in navigator)) {
      swStatus = 'unsupported';
      renderPwaCard();
      return 'unsupported';
    }
    swStatus = 'registering';
    renderPwaCard();
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
      swRegistration = reg;
      swStatus = 'ready';
      renderPwaCard();
      return 'ready';
    } catch (e) {
      swStatus = 'error';
      renderPwaCard();
      return 'error';
    }
  }

  /* SW 가 보낸 알림 클릭 → 앱 안에서 같은 딥링크로 이동 */
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const msg = event.data || {};
      if (msg.type === 'oog:notification-click' && msg.data) openFromNotification(msg.data);
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    renderPwaCard();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    store.updatePwa({ installed: true, installDismissed: true });
    renderPwaCard();
    showToast('ooG를 홈 화면에 추가했어요 · 이제 앱을 꺼도 알림을 받을 수 있어요');
  });

  el.pwaCardActions && el.pwaCardActions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pwa-action]');
    if (!btn) return;
    if (btn.dataset.pwaAction === 'install') promptInstall();
    if (btn.dataset.pwaAction === 'dismiss') {
      store.updatePwa({ installDismissed: true });
      renderPwaCard();
    }
  });

  if (isStandalone()) store.updatePwa({ installed: true });

  /* ==========================================================================
   * 6-5. 모임 가입 심사 (Sprint 4.5) — 신청서 · 대기 목록 · 내 신청 현황
   * ======================================================================== */
  function policyBadgesHTML(groupId) {
    return store.getGroupPolicyBadges(groupId)
      .map((b) => {
        const cls = b.kind === 'age' ? 'policy-age' : (b.kind === 'pending' ? 'policy-pending' : 'policy-mode');
        return `<span class="policy-badge ${cls}">${escapeHtml(b.label)}</span>`;
      })
      .join('');
  }

  function renderJoinPolicySection(grp, isLeader) {
    const mode = store.getGroupJoinMode(grp);
    const age = store.getGroupAgeLimit(grp.id);
    const questions = store.getGroupJoinQuestions(grp.id);

    const questionList = questions.length
      ? `<ul class="policy-question-list">
           ${questions.map((q, i) => `
             <li class="policy-question-item">
               <span class="policy-question-text">Q${i + 1}. ${escapeHtml(q)}</span>
               ${isLeader ? `<button class="policy-question-del" data-policy-qdel="${i}" type="button" aria-label="질문 삭제">×</button>` : ''}
             </li>`).join('')}
         </ul>`
      : '<p class="policy-note">가입 질문 없이 바로 참여할 수 있어요.</p>';

    const editor = isLeader ? `
      <div class="policy-editor">
        <div class="policy-editor-row">
          <span class="policy-editor-label">가입 방식</span>
          <div class="policy-options">
            <button class="policy-option ${mode === 'open' ? 'active' : ''}" data-policy-mode="open" type="button">${ic('leaf')} 자유 가입</button>
            <button class="policy-option ${mode === 'approval' ? 'active' : ''}" data-policy-mode="approval" type="button">승인제</button>
          </div>
        </div>
        <div class="policy-editor-row">
          <span class="policy-editor-label">나이 제한</span>
          <div class="policy-options">
            ${store.getAgeLimitOptions().map((o) => `
              <button class="policy-option ${age.id === o.id ? 'active' : ''}" data-policy-age="${o.id}" type="button">${escapeHtml(o.badge)}</button>`).join('')}
          </div>
        </div>
        <div class="policy-editor-row column">
          <span class="policy-editor-label">가입 질문 (${questions.length}/2)</span>
          ${questionList}
          ${questions.length < 2 ? `
            <form class="policy-question-form" data-policy-qform="1">
              <input type="text" class="policy-question-input" maxlength="60" aria-label="새 가입 질문" placeholder="새 가입 질문">
              <button type="submit" class="policy-question-add">추가</button>
            </form>` : ''}
          <p class="policy-hint">신청자는 모든 질문에 답해야 신청서를 낼 수 있어요.</p>
        </div>
      </div>` : `
      <div class="policy-readonly">
        <p class="policy-note">${mode === 'approval'
          ? '그룹장이 소개서를 읽고 수락하면 멤버가 돼요. 나이 제한을 확인해 주세요.'
          : '누구나 바로 참여할 수 있는 모임이에요.'}</p>
        ${questionList}
      </div>`;

    return `
      <section class="join-policy-card" data-join-policy="${grp.id}">
        <div class="join-policy-head">
          <h4 class="join-policy-title">가입 안내</h4>
          <div class="join-policy-badges">${policyBadgesHTML(grp.id)}</div>
        </div>
        ${editor}
      </section>`;
  }

  function renderApplicationList(grp) {
    const pending = store.getPendingApplications(grp.id);
    if (!pending.length) {
      return `<section class="apply-section">
        <h4 class="sheet-section-title">신청 대기 (0명)</h4>
        <p class="apply-empty">지금은 기다리는 신청서가 없어요. 설정을 승인제로 두면 이곳에 쌓여요.</p>
      </section>`;
    }
    return `
      <section class="apply-section">
        <h4 class="sheet-section-title">신청 대기 (${pending.length}명)</h4>
        <div class="apply-list">
          ${pending.map((a) => `
            <article class="apply-card" data-apply-card="${a.id}">
              <div class="apply-head">
                <span class="apply-avatar" style="background:${a.applicantGradient}">${escapeHtml(a.applicantAvatarText || a.applicantName.charAt(0))}</span>
                <div class="apply-main">
                  <div class="apply-name-row">
                    <span class="apply-name">${escapeHtml(a.applicantName)}</span>
                    <span class="apply-age">${a.applicantAge}세</span>
                  </div>
                  <span class="apply-meta">${escapeHtml(a.applicantHobby || '')}</span>
                </div>
                <span class="apply-time">${timeAgo(a.createdAt)}</span>
              </div>
              <div class="apply-answers">
                ${(a.answers || []).map((ans) => `
                  <div class="apply-answer">
                    <span class="apply-q">Q. ${escapeHtml(ans.question)}</span>
                    <p class="apply-a">${escapeHtml(ans.answer)}</p>
                  </div>`).join('')}
              </div>
              <div class="apply-actions">
                <button class="apply-btn accept" data-approve-app="${a.id}" type="button">${ic('check')} 수락</button>
                <button class="apply-btn reject" data-reject-app="${a.id}" type="button">거절</button>
              </div>
            </article>`).join('')}
        </div>
      </section>`;
  }

  function renderJoinCta(grp) {
    const joinState = store.getJoinState(grp.id);
    const mode = store.getGroupJoinMode(grp);
    const ageCheck = store.isAgeEligible(grp.id);

    if (joinState === 'member') {
      return `<button class="btn-primary-action leave" data-modal-join="${grp.id}">가입 탈퇴하기</button>`;
    }
    if (joinState === 'pending') {
      const app = store.getApplicationForGroup(grp.id);
      return `<div class="join-state-wrap">
        <button class="btn-join-pending" type="button" disabled>${ic('hourglass')} 승인 대기 중</button>
        ${app ? `<button class="btn-join-cancel" data-cancel-application="${app.id}" type="button">신청 취소</button>` : ''}
      </div>`;
    }
    if (!ageCheck.ok) {
      return `<div class="join-state-wrap">
        <button class="btn-join-blocked" type="button" disabled>${ic('lock')} ${escapeHtml(ageCheck.message)}</button>
        <p class="join-cta-hint">이 모임은 <strong>${escapeHtml(store.getGroupAgeLimit(grp.id).label)}</strong> 이용자를 위한 모임이에요. 나이 제한이 없는 모임을 찾아보세요.</p>
      </div>`;
    }
    if (store.isGroupFull(grp.id)) {
      return `<div class="join-state-wrap">
        <button class="btn-join-blocked" type="button" disabled>${ic('door')} 정원이 가득 찼어요 (${grp.memberCount}/${grp.maxMembers})</button>
        <p class="join-cta-hint">자리가 나면 다시 도전해 보세요.</p>
      </div>`;
    }
    if (mode === 'approval') {
      return `<button class="btn-primary-action" data-apply-group="${grp.id}">
        ${joinState === 'rejected' ? '가입 신청 다시 하기' : '가입 신청하기'} · 소개서 심사
      </button>`;
    }
    return `<button class="btn-primary-action" data-modal-join="${grp.id}">참여하기</button>`;
  }

  /* 가입 신청서 모달 */
  function applyReady() {
    const values = ui.applyAnswers.map((a) => String(a || '').trim());
    return values.every((v) => v.length > 0) && values.join('').length >= 10;
  }

  function renderApplyModal() {
    const grp = store.getGroup(ui.applyGroupId);
    if (!grp || !el.groupApplyBody) return;
    const questions = store.getGroupJoinQuestions(grp.id);
    const ready = applyReady();

    el.groupApplyBody.innerHTML = `
      <div class="apply-modal-head">
        <span class="apply-modal-emoji">${ic(grp.icon)}</span>
        <h2 class="sheet-title">가입 신청서</h2>
        <p class="apply-modal-group">${escapeHtml(grp.name)}</p>
        <div class="join-policy-badges">${policyBadgesHTML(grp.id)}</div>
        <p class="apply-modal-note">그룹장 <strong>${escapeHtml(grp.leaderName)}</strong>님이 소개서를 읽고 수락하면 멤버가 돼요. 정성껏 쓸수록 수락이 빨라요.</p>
      </div>
      <div class="apply-form">
        ${questions.map((q, i) => `
          <div class="apply-form-field">
            <label class="apply-question" for="apply-answer-${i}">Q${i + 1}. ${escapeHtml(q)}</label>
            <textarea class="apply-textarea" id="apply-answer-${i}" data-apply-answer="${i}" maxlength="300"
                      placeholder="여기에 답을 적어주세요">${escapeHtml(ui.applyAnswers[i] || '')}</textarea>
            <div class="caption-counter"><span data-apply-count="${i}">${String(ui.applyAnswers[i] || '').length}</span> / 300</div>
          </div>`).join('')}
        <p class="apply-ready-note ${ready ? 'ok' : ''}">${ready ? '신청서가 준비됐어요' : 'ⓘ 모든 질문에 10자 이상 답해 주세요'}</p>
      </div>
      <div class="sheet-actions">
        <button class="btn-primary-action" data-submit-apply="1" type="button" ${ready ? '' : 'disabled'}>가입 신청서 보내기</button>
      </div>`;
  }

  function openApplyModal(groupId) {
    const grp = store.getGroup(groupId);
    if (!grp) return;
    const ageCheck = store.isAgeEligible(groupId);
    if (!ageCheck.ok) {
      showToast(ageCheck.message, 'warning');
      return;
    }
    if (store.getJoinState(groupId) === 'pending') {
      showToast('이미 승인을 기다리는 신청서가 있어요', 'info');
      return;
    }
    ui.applyGroupId = groupId;
    ui.applyAnswers = store.getGroupJoinQuestions(groupId).map(() => '');
    renderApplyModal();
    openModal(el.groupApplyModal);
  }

  function submitApplication() {
    const groupId = ui.applyGroupId;
    const res = store.applyToGroup(groupId, ui.applyAnswers);
    if (!res.ok) {
      const messages = {
        age: res.message || '이 모임은 나이 제한이 있어요',
        answer_empty: '모든 질문에 답해 주세요',
        answer_short: '소개서가 너무 짧아요 · 10자 이상 적어 주세요',
        already_pending: '이미 승인을 기다리는 신청서가 있어요',
        already_member: '이미 이 모임의 멤버예요',
        full: '모임 정원이 가득 찼어요'
      };
      showToast(messages[res.reason] || '신청서를 보내지 못했어요', 'warning');
      return;
    }
    closeModal(el.groupApplyModal);
    if (res.joined) {
      showToast(`'${res.group.name}' 모임에 바로 참여했어요`);
    } else {
      showToast('가입 신청서를 보냈어요 · 그룹장이 수락하면 알려드릴게요');
    }
    if (navigator.vibrate) navigator.vibrate(10);
    renderGroupDetail(store.getGroup(groupId));
    renderExplore({ preserve: true });
    renderFeed();
    updateBadges();
  }

  el.groupApplyBody && el.groupApplyBody.addEventListener('input', (e) => {
    const ta = e.target.closest('[data-apply-answer]');
    if (!ta) return;
    const index = Number(ta.dataset.applyAnswer);
    ui.applyAnswers[index] = ta.value;
    const counter = el.groupApplyBody.querySelector(`[data-apply-count="${index}"]`);
    if (counter) counter.textContent = String(ta.value.length);
    const btn = el.groupApplyBody.querySelector('[data-submit-apply]');
    const ready = applyReady();
    if (btn) {
      btn.disabled = !ready;
      btn.classList.toggle('ready', ready);
    }
    const note = el.groupApplyBody.querySelector('.apply-ready-note');
    if (note) {
      note.textContent = ready ? '신청서가 준비됐어요' : '모든 질문에 10자 이상 답해 주세요';
      note.classList.toggle('ok', ready);
    }
  });

  el.groupApplyBody && el.groupApplyBody.addEventListener('click', (e) => {
    if (e.target.closest('[data-submit-apply]')) submitApplication();
  });

  $('#btn-close-apply') && $('#btn-close-apply').addEventListener('click', () => closeModal(el.groupApplyModal));

  /* 내 가입 신청 현황 */
  function renderMyApplications() {
    if (!el.myApplicationsBody) return;
    const apps = store.getMyApplications();
    if (!apps.length) {
      el.myApplicationsBody.innerHTML = `
        <div class="empty-state myapp-empty">
          ${emptyArt('applications')}
          <p class="empty-title">아직 낸 신청서가 없어요</p>
          <p class="empty-desc">승인제 모임에 가입 신청하면 진행 상황이 여기에 보여요.</p>
        </div>`;
      return;
    }
    const statusMap = {
      pending: ['승인 대기 중', 'pending'],
      approved: ['승인됨', 'approved'],
      rejected: ['거절됨', 'rejected'],
      canceled: ['취소됨', 'canceled']
    };
    el.myApplicationsBody.innerHTML = apps.map((a) => {
      const st = statusMap[a.status] || statusMap.pending;
      const decided = a.decidedAt ? ` · ${timeAgo(a.decidedAt)} 처리` : '';
      return `
      <div class="myapp-item" data-myapp="${a.id}">
        <span class="myapp-emoji">${ic(a.groupIcon || 'users')}</span>
        <div class="myapp-info">
          <div class="myapp-name">${escapeHtml(a.groupName)}</div>
          <div class="myapp-meta">${timeAgo(a.createdAt)} 신청 · 질문 ${(a.answers || []).length}개 응답${decided}</div>
          ${a.status === 'rejected' && a.decisionNote
            ? `<p class="myapp-note">그룹장: ${escapeHtml(a.decisionNote)}</p>`
            : ''}
        </div>
        <span class="myapp-status ${a.status === 'pending' ? 'pending' : (a.status === 'approved' ? 'approved' : 'rejected')}">${st[0]}</span>
        ${a.status === 'pending' ? `<button class="myapp-cancel" data-myapp-cancel="${a.id}" type="button">취소</button>` : ''}
      </div>`;
    }).join('');
  }

  function openMyApplications() {
    renderMyApplications();
    openModal(el.myApplicationsModal);
  }

  el.menuMyApplications && el.menuMyApplications.addEventListener('click', openMyApplications);
  el.menuMyApplications && el.menuMyApplications.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openMyApplications();
  });

  el.myApplicationsBody && el.myApplicationsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-myapp-cancel]');
    if (!btn) return;
    const res = store.cancelApplication(btn.dataset.myappCancel);
    if (!res.ok) {
      showToast('신청을 취소하지 못했어요', 'warning');
      return;
    }
    renderMyApplications();
    renderGroupDetail(res.group);
    renderExplore({ preserve: true });
    updateBadges();
    showToast('가입 신청을 취소했어요', 'info');
  });

  $('#btn-close-my-applications') && $('#btn-close-my-applications').addEventListener('click', () => closeModal(el.myApplicationsModal));
  $('#btn-close-notif') && $('#btn-close-notif').addEventListener('click', () => closeModal(el.notifModal));

  /* ==========================================================================
   * 7. 공통 배지/카운터 갱신
   * ======================================================================== */
  /* 프로필 탭 활동 요약 (내 글 · 받은 좋아요 · 내 댓글) */
  function renderProfileStats() {
    if (!el.statPosts) return;
    const me = store.currentUser;
    const mine = store.state.feedPosts.filter((p) => p.authorId === me.id);
    const likes = mine.reduce((sum, p) => sum + p.likes, 0);
    const comments = store.state.feedPosts.reduce(
      (sum, p) => sum + p.comments.filter((c) => c.authorId === me.id).length, 0);
    el.statPosts.textContent = String(mine.length);
    el.statLikes.textContent = String(likes);
    el.statComments.textContent = String(comments);
  }

  /* ==========================================================================
   * Sprint 13 — 프로필을 빈 화면이 아니라 '내 것으로 찬 화면'으로.
   *  · 내 모임: 가입한 모임을 가로 스트립으로(카드와 같은 커버 일러스트 재사용)
   *  · 저장한 글: 북마크한 글을 3줄까지. 누르면 피드의 그 글로 데려간다.
   *  · 최근 활동: 활동 로그의 최신 3건(전체는 '전체 보기')
   *  모두 저장된 상태에서 파생한다(별도 저장 없음).
   * ======================================================================== */
  /** Sprint 15 — 내정보 탭 '내 피드': 내가 올린 사진·글을 인스타 프로필처럼 3열로. */
  function renderProfileMyFeed() {
    if (!el.profileFeedGrid) return;
    const posts = store.getMyFeedPosts();
    const stats = store.getMyFeedStats();
    if (el.profileFeedCount) el.profileFeedCount.textContent = String(stats.total);
    if (el.profileFeedSub) {
      el.profileFeedSub.innerHTML = `사진 <b>${stats.photos}</b> · 글 <b>${stats.total - stats.photos}</b>`;
    }
    el.profileFeedGrid.innerHTML = posts.length
      ? posts.slice(0, 9).map((p) => `
        <button class="profile-feed-tile" data-my-post="${p.id}" type="button"
                aria-label="내가 올린 글 열기">
          <span class="profile-feed-thumb">${p.photoUrl
            ? `<img class="media-img" src="${escapeHtml(p.photoUrl)}" alt="내 사진" loading="lazy" decoding="async">`
            : `<span class="profile-feed-text">${escapeHtml(String(p.caption || '').slice(0, 40) || '글')}</span>`}</span>
          <span class="profile-feed-meta">
            <span class="profile-feed-like"><span aria-hidden="true">${ic('heart', { filled: true })}</span> ${fmtCount(p.likes || 0)}</span>
          </span>
        </button>`).join('')
      : '<p class="profile-block-empty">아직 올린 피드가 없어요 · 피드 탭에서 첫 사진을 올려보세요.</p>';
  }

  function renderProfileBlocks() {
    if (!el.profileGroupStrip || !el.profileSavedList || !el.profileRecentList) return;
    renderProfileMyFeed();

    const groups = store.getJoinedGroups();
    if (el.profileGroupsCount) el.profileGroupsCount.textContent = `${groups.length}`;
    el.profileGroupStrip.innerHTML = groups.length
      ? groups.slice(0, 8).map((g) => `
        <button class="profile-group-chip" data-profile-group="${g.id}" type="button"
                aria-label="${escapeHtml(g.name)} 모임 상세 보기">
          <span class="profile-group-cover" style="background:${g.coverGradient || 'linear-gradient(135deg,#ECFDF5,#D1FAE5)'}">${g.photoUrl
            ? `<img src="${escapeHtml(g.photoUrl)}" alt="" loading="lazy" decoding="async">`
            : `<span aria-hidden="true">${ic(g.icon || 'dot')}</span>`}</span>
          <span class="profile-group-text">
            <span class="profile-group-name">${escapeHtml(g.name)}</span>
            <span class="profile-group-sub">멤버 ${g.memberCount} · ${escapeHtml(g.meetLabel || g.categoryName)}</span>
          </span>
        </button>`).join('')
      : '<p class="profile-block-empty">아직 가입한 모임이 없어요 · 탐색에서 마음에 드는 모임을 찾아보세요.</p>';

    /* 저장한 글 — Sprint 14: 목록 3줄 → 3장 썸네일 그리드(내 모임 스트립과 균형).
       사진·글 어느 쪽이든 같은 정사각 타일로 두고, 캡션은 타일 아래 한 줄만. */
    const saved = store.getSavedPosts();
    if (el.profileSavedCount) el.profileSavedCount.textContent = `${saved.length}`;
    el.profileSavedList.innerHTML = saved.length
      ? saved.slice(0, 6).map((p) => `
        <button class="profile-saved-tile" data-profile-saved="${p.id}" type="button"
                aria-label="${escapeHtml(p.authorName)}님의 저장한 글 보기">
          <span class="profile-saved-thumb">${p.photoUrl
            ? `<img class="media-img" src="${escapeHtml(p.photoUrl)}" alt="" loading="lazy" decoding="async">`
            : `<span class="profile-saved-text">${escapeHtml(String(p.caption || '').trim().slice(0, 40) || '저장한 글')}</span>`}</span>
          <span class="profile-saved-meta">
            <span class="profile-saved-author">${escapeHtml(p.authorName)}</span>
            <span class="profile-saved-time" data-created="${p.createdAt}">${timeAgo(p.createdAt)}</span>
          </span>
        </button>`).join('')
      : '<p class="profile-block-empty">북마크한 글이 여기에 모여요 · 모임 피드에서 저장을 누르면 모입니다.</p>';

    const recent = store.getActivityLogs({ limit: 3 });
    el.profileRecentList.innerHTML = recent.length
      ? recent.map((entry) => `
        <button class="profile-recent-item" data-profile-activity="${entry.id}" type="button">
          <span class="profile-recent-emoji" aria-hidden="true">${ic(entry.icon)}</span>
          <span class="profile-recent-body">
            <span class="profile-recent-title">${escapeHtml(entry.title)}</span>
            ${entry.body ? `<span class="profile-recent-sub">${escapeHtml(entry.body)}</span>` : ''}
          </span>
          <span class="profile-recent-time" data-created="${entry.at}">${timeAgo(entry.at)}</span>
        </button>`).join('')
      : '<p class="profile-block-empty">하트·글·댓글·모임 활동이 여기에 쌓여요.</p>';
  }

  /** 프로필의 저장한 글 → 피드에서 그 글을 바로 펼친다. */
  function openPostInFeed(postId) {
    const post = store.getPost(postId);
    /* Sprint 14~15 — 저장한 글은 그 글이 있는 모임의 피드에서 펼친다. */
    if (post && store.isGroupJoined(post.groupId)) {
      ui.homeGroupId = post.groupId;
      ui.homeView = 'feed';
      ui.homeTag = null;
    }
    ui.feedFilter = 'my';
    ui.feedGroupId = post ? post.groupId : null;
    ui.lastCreatedPostId = null;
    switchTab('tab-home');
    renderHome();
    const card = el.feedList && el.feedList.querySelector(`[data-post-id="${postId}"]`);
    if (!card) { showToast('이 글은 지금 피드에 없어요', 'info'); return; }
    card.classList.add('is-new');
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => card.classList.remove('is-new'), 1600);
  }


  /** 그 모임의 피드로 이동 — 기본은 '피드' 보기(인스타형 카드·댓글까지 한 번에). */
  function goGroupFeed(groupId, view = 'feed') {
    const gid = groupId || store.getHomeGroupId();
    if (gid && store.isGroupJoined(gid)) {
      ui.homeGroupId = gid;
      ui.groupSpaceId = gid;
      ui.homeView = view;
      ui.homeTag = null;
      ui.feedGroupId = gid;
      syncNavMode();
    }
    ui.feedFilter = 'my';
    switchTab('tab-home');
    renderHome();
    scrollTop();
  }

  function updateBadges() {
    renderProfileStats();
    renderProfileBlocks();
    /* Sprint 14~16 — 홈 배지 = 그 모임의 다가오는 약속 수 (바깥 갤러리에서는 숨김) */
    if (el.navHomeBadge) {
      const homeId = isGroupMode() ? store.getHomeGroupId() : null;
      const upcoming = homeId ? store.getUpcomingGroupEvents(homeId, 9).length : 0;
      el.navHomeBadge.textContent = String(upcoming);
      el.navHomeBadge.classList.toggle('hide', upcoming === 0);
    }
    if (el.joinedCount) el.joinedCount.textContent = `${store.currentUser.joinedGroupIds.length}개`;
    if (el.menuLikedCount) el.menuLikedCount.textContent = `${store.getLikedProfiles().length}명`;
    if (el.menuActivityCount) {
      el.menuActivityCount.textContent = `${store.getActivityStats().total}건`;
    }
    if (el.menuMyApplicationsCount) {
      el.menuMyApplicationsCount.textContent = `${store.getMyPendingApplicationCount()}건`;
    }
    /* 채팅 미읽음 배지 */
    const unread = store.getUnreadChatCount();
    if (el.navChatBadge) {
      el.navChatBadge.textContent = String(unread);
      el.navChatBadge.classList.toggle('hide', unread === 0);
    }
    /* 헤더 알림 점 — 읽지 않은 알림·그룹장 대기 신청 */
    const unreadNotif = store.getUnreadNotificationCount();
    if (el.notifDot) el.notifDot.classList.toggle('hide', unreadNotif === 0);
  }

  /* ==========================================================================
   * 8. 모달 닫기 / 헤더 버튼 / 초기 마운트
   * ======================================================================== */
  const closeGroupModalBtn = $('#btn-close-modal');
  closeGroupModalBtn && closeGroupModalBtn.addEventListener('click', () => closeModal(el.groupModal));

  [el.groupModal, el.composerModal, el.joinedModal, el.personDetailModal,
   el.postModal, el.exploreComposeModal, el.profileEditModal, el.groupCreateModal,
   el.groupApplyModal, el.myApplicationsModal, el.notifModal, el.activityModal,
   el.hotModal, el.filterModal].forEach((overlay) => {
    overlay && overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  /* ==========================================================================
   * Sprint 12·13 — 시트를 아래로 당겨 닫기.
   *  · 손잡이(.sheet-grabber): 잡는 순간부터 시트가 따라온다.
   *  · 본문: **스크롤이 맨 위(scrollTop === 0)일 때** 아래로 당기면 시트 전체가 따라온다.
   *    스크롤이 내려가 있으면 평소처럼 그대로 스크롤한다(스크롤 충돌 없음).
   *    가로로 더 움직였거나(칩·스트립 가로 스크롤) 위로 올렸으면 손을 뗀다.
   *  · 놓을 때 110px 이상 또는 빠른 튕김 → 닫기, 아니면 제자리로 스프링 복귀.
   *  · '동작 줄이기' 사용자는 끌기 대신 닫기 버튼을 쓴다(애니메이션 없음).
   * ========================================================================== */
  const SHEET_PULL_SLOP = 7;        // 이만큼 내려야 '당김'으로 인정
  const SHEET_PULL_CLOSE = 110;     // 이만큼 내리고 놓으면 닫힘
  let sheetDrag = null;
  let sheetDragSuppressClickUntil = 0;

  /** 폼 입력·명시적으로 끌기를 막은 곳에서는 시트 당김을 시작하지 않는다. */
  function sheetDragBlocked(target) {
    if (!target || !target.closest) return true;
    return !!target.closest('input, textarea, select, [contenteditable="true"]');
  }

  function openSheetAt(target) {
    const sheet = target && target.closest ? target.closest('.modal-sheet') : null;
    if (!sheet) return null;
    const overlay = sheet.closest('.modal-overlay');
    if (!overlay || !overlay.classList.contains('active')) return null;
    return { sheet, overlay };
  }

  function startSheetDrag(sheet, overlay, x, y, pointerId, kind) {
    sheetDrag = {
      sheet, overlay, startX: x, startY: y, pointerId, kind,
      dy: 0, startedAt: Date.now(), active: kind === 'grabber'
    };
    if (kind === 'grabber') paintSheetDrag(0);
  }

  function paintSheetDrag(dy) {
    if (!sheetDrag) return;
    sheetDrag.dy = dy;
    sheetDrag.sheet.classList.remove('is-snapping');
    sheetDrag.sheet.classList.add('is-dragging');
    sheetDrag.sheet.style.transform = `translateY(${dy}px)`;
    sheetDrag.overlay.style.background = `rgba(15, 23, 42, ${Math.max(0.06, 0.34 - dy / 900).toFixed(3)})`;
  }

  /**
   * 움직임을 판정해 당김을 시작/취소한다.
   * @returns {boolean} 이번 움직임을 시트 당김으로 소비했는지
   */
  function trackSheetDrag(x, y) {
    if (!sheetDrag) return false;
    const dy = y - sheetDrag.startY;
    const dx = x - sheetDrag.startX;
    if (!sheetDrag.active) {
      /* 스크롤이 내려가 있으면 시트는 건드리지 않고 스크롤에 맡긴다. */
      if (sheetDrag.sheet.scrollTop > 0) { sheetDrag = null; return false; }
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { sheetDrag = null; return false; }
      if (dy < -6) { sheetDrag = null; return false; }
      if (dy < SHEET_PULL_SLOP) return false;
      sheetDrag.active = true;
      sheetDragSuppressClickUntil = Date.now() + 600;
    }
    paintSheetDrag(Math.max(0, dy));
    return true;
  }

  /* 시트가 닫힐 때 당김 상태를 함께 정리한다(닫힌 시트에 transform 이 남지 않게). */
  function cancelSheetDragFor(node) {
    if (!sheetDrag || sheetDrag.overlay !== node) return;
    const sheet = sheetDrag.sheet;
    sheetDrag = null;
    detachSheetTouch();
    node.style.background = '';
    sheet.classList.remove('is-dragging', 'is-snapping');
    sheet.style.transform = '';
  }

  function endSheetDrag() {
    const drag = sheetDrag;
    sheetDrag = null;
    if (!drag || !drag.active) { if (drag) drag.overlay.style.background = ''; return; }
    const { sheet, overlay, dy, startedAt } = drag;
    const flick = dy > 32 && Date.now() - startedAt < 260;
    overlay.style.background = '';
    sheetDragSuppressClickUntil = Date.now() + 320;
    if (dy > SHEET_PULL_CLOSE || flick) {
      sheet.classList.remove('is-dragging');
      sheet.style.transform = '';
      closeModal(overlay);
      return;
    }
    sheet.classList.add('is-snapping');
    sheet.style.transform = 'translateY(0px)';
    setTimeout(() => {
      sheet.classList.remove('is-snapping');
      if (!sheet.classList.contains('is-dragging')) sheet.style.transform = '';
    }, 320);
  }

  /* --- 마우스·펜: 손잡이는 즉시, 본문은 '내릴 때만' 당김으로 승격 --- */
  document.addEventListener('pointerdown', (e) => {
    if (prefersReducedMotion()) return;
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    const grab = e.target && e.target.closest ? e.target.closest('.sheet-grabber') : null;
    const place = openSheetAt(grab || e.target);
    if (!place) return;
    if (!grab && sheetDragBlocked(e.target)) return;
    startSheetDrag(place.sheet, place.overlay, e.clientX, e.clientY, e.pointerId,
      grab ? 'grabber' : 'body');
    if (grab) {
      try { grab.setPointerCapture(e.pointerId); } catch (err) { /* 구형 브라우저 무시 */ }
    }
  });

  document.addEventListener('pointermove', (e) => {
    if (!sheetDrag || (e.pointerId !== undefined && e.pointerId !== sheetDrag.pointerId)) return;
    if (!trackSheetDrag(e.clientX, e.clientY)) return;
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  document.addEventListener('pointerup', endSheetDrag);
  document.addEventListener('pointercancel', endSheetDrag);

  /* --- 터치: 스크롤과의 충돌을 피하려고 손가락 제스처만 따로 본다.
         문서 스크롤 성능을 건드리지 않도록 touchmove 는 당길 때만 붙였다 뗀다. --- */
  function onSheetTouchMove(e) {
    if (!sheetDrag || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!trackSheetDrag(touch.clientX, touch.clientY)) return;
    if (e.cancelable) e.preventDefault();
  }

  function detachSheetTouch() {
    document.removeEventListener('touchmove', onSheetTouchMove);
    document.removeEventListener('touchend', endSheetTouch);
    document.removeEventListener('touchcancel', endSheetTouch);
  }

  function endSheetTouch() {
    detachSheetTouch();
    endSheetDrag();
  }

  document.addEventListener('touchstart', (e) => {
    if (prefersReducedMotion()) return;
    if (e.touches.length !== 1) return;
    if (e.target && e.target.closest && e.target.closest('.sheet-grabber')) return;
    const place = openSheetAt(e.target);
    if (!place || sheetDragBlocked(e.target)) return;
    const t = e.touches[0];
    startSheetDrag(place.sheet, place.overlay, t.clientX, t.clientY, null, 'touch');
    document.addEventListener('touchmove', onSheetTouchMove, { passive: false });
    document.addEventListener('touchend', endSheetTouch);
    document.addEventListener('touchcancel', endSheetTouch);
  }, { passive: true });

  /* 당겨서 닫은 뒤 손을 떼면 click 이 남아 카드/버튼이 눌린 것처럼 동작한다 → 한 번만 삼킨다 */
  document.addEventListener('click', (e) => {
    if (!sheetDragSuppressClickUntil || Date.now() > sheetDragSuppressClickUntil) return;
    sheetDragSuppressClickUntil = 0;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  const composerCancel = $('#btn-composer-cancel');
  composerCancel && composerCancel.addEventListener('click', () => closeModal(el.composerModal));

  const postDetailClose = $('#btn-close-post-detail');
  postDetailClose && postDetailClose.addEventListener('click', () => closeModal(el.postModal));

  const exploreComposeCancel = $('#btn-explore-compose-cancel');
  exploreComposeCancel && exploreComposeCancel.addEventListener('click', () => closeModal(el.exploreComposeModal));

  el.exploreComposeBtn && el.exploreComposeBtn.addEventListener('click', openExploreCompose);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    /* 0) 사이드바가 열려 있으면 그것부터 닫는다 */
    if (ui.drawerOpen) { closeDrawer(); return; }
    /* 1) 떠 있는 모달/시트가 있으면 그것만 닫는다 (대화방 위의 프로필 시트 등) */
    const openSheet = document.querySelector('.modal-overlay.active');
    if (openSheet) {
      closeModal(openSheet);
      return;
    }
    closeMatchPopup();
    /* 2) 모달이 없을 때만 전체 화면 대화방을 닫는다 */
    if (el.chatRoomModal && !el.chatRoomModal.hidden) closeChatRoom();
    if (el.groupChatModal && !el.groupChatModal.hidden) closeGroupChat();
  });

  const headerSearch = $('#btn-header-search');
  headerSearch && headerSearch.addEventListener('click', () => {
    switchTab('tab-explore');
    setTimeout(() => el.exploreInput && el.exploreInput.focus(), 120);
  });

  const headerNotif = $('#btn-header-notif');
  headerNotif && headerNotif.addEventListener('click', openNotificationCenter);

  /* 홈의 '모임 만들기'(#btn-home-browse-new · 갤러리 타일)가 같은 모임 개설 폼을 연다.
     Sprint 26.5 — 설정 사이드바의 중복 '새 모임 만들기' 항목은 없앴다. */

  /* --- 저장 실패(용량 초과 등) 안내 --- */
  window.addEventListener('oog:storage-error', () => {
    showToast('변경 내용을 저장하지 못했어요. 저장 공간을 확인해 주세요', 'warning');
  });

  /* --- 다른 탭에서 상태가 바뀌면 이 화면도 따라간다 (A-C-D 동기화) --- */
  window.addEventListener('storage', (e) => {
    if (!e.key || !/_oog_app_state_v([4-9]|1[0-2])$/.test(e.key)) return;
    store.state = store.loadState();
    renderHome();
    renderExplore();
    renderFeed();
    renderChatRooms();
    renderProfileHeader();
    renderNotificationSettings();
    renderPushPrompt();
    renderNotificationList();
    renderPwaCard();
    updateBadges();
  });

  /* 창 크기가 바뀌면 떠 있던 메뉴는 닫는다 (좌표가 어긋나므로) */
  window.addEventListener('resize', closeAllPostMenus);

  /* --- 스크롤이 내려가면 헤더에 옅은 그림자 (경계 인지) --- */
  const headerEl = document.querySelector('.app-header');
  el.main && el.main.addEventListener('scroll', () => {
    headerEl && headerEl.classList.toggle('scrolled', el.main.scrollTop > 6);
  }, { passive: true });

  /* --- 1분마다 '15분 전' 같은 상대 시간만 조용히 갱신 --- */
  setInterval(() => {
    if ((ui.activeTab === 'tab-home' || ui.activeTab === 'tab-explore') && !document.querySelector('.modal-overlay.active')) {
      document.querySelectorAll('[data-created]').forEach((node) => {
        node.textContent = timeAgo(node.dataset.created);
      });
    }
  }, 60000);

  /* ------------------------------------------------------------------------
     Sprint 19 — 접속 시 '우그' 클레이 로고 스플래시
     11/16 14:29 사용자: "접속시 우그라는 로고가 잠깐 로딩되도록 해주고".
       · 1.05초 동안 점토 로고가 통통 튀며 떠 있다가 부드럽게 사라진다.
       · 화면을 누르거나 키를 누르면 즉시 건너뛴다(원하면 바로 앱으로).
       · OS '동작 줄이기'에서는 140ms 만에, 자동화 테스트(navigator.webdriver)에서는
         기다리지 않고 바로 통과한다 — 테스트·접근성을 해치지 않는다.
       · 주소에 ?splash=1 을 붙이면 강제로 보여 주고, ?splash=hold 는 직접 끌 때까지,
         ?splash=0 은 끈다(미리보기·촬영용).
     ------------------------------------------------------------------------ */
  const splash = (() => {
    const node = document.getElementById('oog-splash');
    const params = new URLSearchParams(window.location.search || '');
    const param = params.get('splash');
    const hold = param === 'hold';
    const force = param === '1' || hold;
    const off = param === '0';
    const reduced = prefersReducedMotion();
    const automated = !force && typeof navigator !== 'undefined' && navigator.webdriver === true;
    const skipNow = off || automated;
    const stayMs = reduced ? 140 : 1050;
    const leaveMs = reduced ? 0 : 240;
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const state = {
      present: !!node,
      mode: hold ? 'hold' : skipNow ? (off ? 'off' : 'auto') : (reduced ? 'reduced' : 'full'),
      visible: !!node && !skipNow,
      stayMs: skipNow ? 0 : stayMs,
      ms: 0,
      reason: null
    };
    function record() {
      state.ms = Math.round(((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started) * 10) / 10;
      window.oogPerf = window.oogPerf || {};
      window.oogPerf.splash = { ms: state.ms, mode: state.mode, reason: state.reason };
    }
    function markDone(reason) {
      state.reason = reason || state.reason;
      state.visible = false;
      if (node) {
        node.hidden = true;
        node.setAttribute('aria-hidden', 'true');
      }
      record();
    }
    const listeners = [];
    function detach() {
      listeners.forEach(([type, fn, opts]) => window.removeEventListener(type, fn, opts));
      listeners.length = 0;
    }
    function finish(reason) {
      state.reason = reason || state.reason;
      if (!node) { markDone(state.reason); return; }
      if (node.hidden || node.classList.contains('is-leaving')) return;
      detach();
      node.classList.add('is-leaving');
      if (leaveMs <= 0) { markDone(state.reason); return; }
      window.setTimeout(() => markDone(state.reason), leaveMs + 30);
    }
    if (!node || skipNow) {
      markDone(off ? 'off' : automated ? 'auto' : 'absent');
    } else {
      const onInput = () => finish('input');
      [['pointerdown', { passive: true, capture: true }],
        ['keydown', true],
        ['touchstart', { passive: true, capture: true }],
        ['wheel', { passive: true, capture: true }]].forEach(([type, opts]) => {
        window.addEventListener(type, onInput, opts);
        listeners.push([type, onInput, opts]);
      });
      if (!hold) window.setTimeout(() => finish('timeout'), stayMs);
    }
    return {
      skip: (reason) => finish(reason || 'api'),
      getState: () => Object.assign({}, state, { hold, leaving: !!(node && node.classList.contains('is-leaving')) })
    };
  })();

  /* ==========================================================================
   * Sprint 23 — 하단 탭바 자동 숨김
   * ------------------------------------------------------------------------
   * 11/16 23:47 사용자: "화면에 움직임이 없으면 탭바가 아래로 사라지고,
   * 스크롤·터치·포인터 이동이 있으면 즉시 다시 나타나게."
   *
   *  · 마지막 움직임에서 2.5초가 지나면 내려가고, 무엇이든 움직이면 즉시 올라온다.
   *  · 스포트라이트 가이드 진행 중 · 모달 열림 · 탭바 안에 포커스가 있으면 멈춘다
   *    (사용자가 길을 잃지 않게).
   *  · 동작 줄이기 · 자동 테스트(webdriver)에서는 기본으로 끄고,
   *    ?tabhide=1 · window.oog.setTabBarAutoHide(true) 로 켜서 확인할 수 있다.
   * ======================================================================== */
  const TAB_AUTOHIDE_MS = 2500;
  const tabBar = { enabled: true, force: null, hidden: false, timer: null, bound: false };

  function tabBarNodes() {
    return [el.bottomNav, el.groupNav].filter(Boolean);
  }

  function tabBarAutoHideAllowed() {
    if (!tabBar.enabled) return false;
    if (tabBar.force !== true) {
      if (prefersReducedMotion()) return false;
      if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
    }
    if (ui.guide && ui.guide.open) return false;
    if (document.body.classList.contains('spotlight-open')) return false;
    if (document.querySelector('.modal-overlay.active')) return false;
    if (document.querySelector('.chat-room-view:not([hidden])')) return false;
    const nodes = tabBarNodes();
    const focused = document.activeElement;
    if (focused && nodes.some((n) => n.contains(focused))) return false;
    return true;
  }

  function setTabBarHidden(hidden) {
    const nodes = tabBarNodes();
    if (!nodes.length) return;
    if (hidden && !tabBarAutoHideAllowed()) hidden = false;
    tabBar.hidden = !!hidden;
    nodes.forEach((node) => {
      node.classList.toggle('is-autohidden', !!hidden);
      if (hidden) {
        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('inert', '');
      } else {
        node.removeAttribute('aria-hidden');
        node.removeAttribute('inert');
      }
    });
  }

  function scheduleTabBarHide() {
    clearTimeout(tabBar.timer);
    if (tabBar.hidden) setTabBarHidden(false);
    if (!tabBarAutoHideAllowed()) return;
    tabBar.timer = setTimeout(() => {
      if (tabBarAutoHideAllowed()) setTabBarHidden(true);
    }, TAB_AUTOHIDE_MS);
  }

  /** 움직임이 있었다 — 즉시 올리고 다시 2.5초를 센다. */
  function noteUserActivity() {
    scheduleTabBarHide();
  }

  function initTabBarAutoHide() {
    if (tabBar.bound) return;
    tabBar.bound = true;
    ['pointerdown', 'touchstart', 'keydown', 'wheel', 'mousemove'].forEach((type) => {
      document.addEventListener(type, noteUserActivity, { passive: true, capture: true });
    });
    if (el.main) el.main.addEventListener('scroll', noteUserActivity, { passive: true });
    document.addEventListener('focusin', () => {
      /* 탭바로 포커스가 오면 멈추고, 아니면 다시 센다 */
      if (tabBarAutoHideAllowed()) scheduleTabBarHide();
      else { clearTimeout(tabBar.timer); setTabBarHidden(false); }
    });
    scheduleTabBarHide();
  }

  function setTabBarAutoHide(on) {
    tabBar.enabled = on !== false;
    tabBar.force = true;
    if (!tabBar.enabled) { clearTimeout(tabBar.timer); setTabBarHidden(false); }
    else scheduleTabBarHide();
    return { enabled: tabBar.enabled, hidden: tabBar.hidden };
  }

  function getTabBarState() {
    return {
      enabled: tabBar.enabled, hidden: tabBar.hidden,
      paused: !tabBarAutoHideAllowed(), delay: TAB_AUTOHIDE_MS
    };
  }

  /* Sprint 23 — URL 플래그: ?narr=0|1 (스토리텔링 문구 연출) · ?tabhide=0|1 (탭바 자동 숨김) */
  (function readInteractionFlags() {
    try {
      const q = new URLSearchParams(location.search || '');
      if (q.has('narr')) narrationState().enabled = q.get('narr') !== '0';
      if (q.get('narr') === '1') narrationState().force = true;
      if (q.has('tabhide')) {
        tabBar.enabled = q.get('tabhide') !== '0';
        tabBar.force = q.get('tabhide') === '1' ? true : tabBar.force;
      }
    } catch (e) { /* URLSearchParams 없음 */ }
  })();

  /* ==========================================================================
   * Sprint 24 — 다크모드 · 내 프로필 탭(공개 4장 / 비밀 4장) · 대화방 비밀앨범
   * ------------------------------------------------------------------------
   * 11/17 00:30 루키 님 지시 8건 중 1·3·5·6·7·8번의 화면 쪽 구현.
   *  · 다크모드: 설정 › 화면 › 다크모드. 값은 저장 상태(settings.darkMode)에 남는다.
   *  · 로고: 어디에 있든 처음 화면(바깥 홈 탭 최상단)으로.
   *  · 내 프로필 탭: 공개 사진 4칸 · 비밀앨범 4칸(앨범/카메라).
   *  · 1:1 대화방: 비밀앨범 공개/해제 · 공개 전에는 잠금.
   * ======================================================================== */
  const ALBUM_MAX = albumUploadSpec().max;   // Sprint 26.5 — store 업로드 스펙 한 곳에서

  /** 저장된 값을 화면에 반영한다(부팅·토글 공용). */
  function applyThemeDom(dark) {
    const on = !!dark;
    document.documentElement.setAttribute('data-theme', on ? 'dark' : 'light');
    document.body.classList.toggle('theme-dark', on);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', on ? '#10161B' : '#10B981');
    if (el.menuDarkMode) {
      el.menuDarkMode.setAttribute('aria-checked', String(on));
      el.menuDarkMode.classList.toggle('on', on);
    }
    if (el.menuDarkModeState) el.menuDarkModeState.textContent = on ? '켜짐' : '꺼짐';
    return on;
  }

  function applyThemePreference(on) {
    const dark = on === undefined ? !store.isDarkMode() : !!on;
    store.setDarkMode(dark);
    applyThemeDom(dark);
    showToast(dark ? '다크모드로 바꿨어요' : '크림 모드로 바꿨어요', 'info');
    return { darkMode: dark };
  }

  /** 로고 → 처음 화면. 모임 안·다른 탭 어디에 있든 갤러리 홈 맨 위로. */
  function goHomeTop() {
    closeDrawer({ silent: true });
    if (ui.groupSpaceId) { ui.groupSpaceId = null; syncNavMode(); }
    switchTab('tab-home');
    if (el.main) el.main.scrollTop = 0;
    requestAnimationFrame(() => { if (el.main) el.main.scrollTop = 0; });
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(6);
  }

  /* ---------------------------------------------- 내 프로필 탭 · 앨범 */
  function albumFilledHTML(kind, photo, index) {
    const label = kind === 'secret' ? '비밀앨범' : '공개';
    /* Sprint 27.5 — 공개 앨범 첫 장이 대표 사진 — 칸에 표시를 붙인다. */
    const cover = kind === 'public' && index === 0;
    return `<figure class="album-slot is-filled${cover ? ' is-cover' : ''}" data-album-photo="${escapeHtml(photo.id)}" data-album-kind="${kind}">
      <img class="album-img" src="${escapeHtml(photo.url)}" alt="${label} 사진 ${index + 1}" loading="lazy" decoding="async">
      <button class="album-open" data-album-open="${escapeHtml(photo.id)}" data-album-kind="${kind}" data-album-index="${index}" type="button"
              aria-label="${label} 사진 ${index + 1} 크게 보기"></button>
      ${cover ? '<span class="album-cover-badge">대표</span>' : ''}
      <button class="album-remove" data-album-remove="${escapeHtml(photo.id)}" data-album-kind="${kind}" type="button"
              aria-label="${label} 사진 ${index + 1} 지우기">&times;</button>
    </figure>`;
  }

  function albumEmptyHTML(kind, index) {
    return `<button class="album-slot is-empty" data-album-add="${kind}" type="button"
              aria-label="${kind === 'secret' ? '비밀앨범' : '공개'} 사진 ${index + 1}칸 — 사진 추가">
      <span class="album-plus" aria-hidden="true">+</span>
    </button>`;
  }

  function renderAlbumGrid(node, kind) {
    if (!node) return;
    const photos = store.getMyAlbum(kind);
    const slots = photos.map((p, i) => albumFilledHTML(kind, p, i));
    for (let i = photos.length; i < ALBUM_MAX; i += 1) slots.push(albumEmptyHTML(kind, i));
    node.innerHTML = slots.join('');
  }

  function renderMyProfileTab() {
    const me = store.currentUser || {};
    if (el.myProfileName) el.myProfileName.textContent = me.nickname || '내 프로필';
    if (el.myProfileMeta) {
      const bits = [me.age ? `${me.age}세` : '', me.location || '', me.handle || ''].filter(Boolean);
      el.myProfileMeta.textContent = bits.join(' · ');
    }
    if (el.myProfileAvatarLetter) el.myProfileAvatarLetter.textContent = me.avatarText || (me.nickname || '나').charAt(0);
    if (el.myProfileAvatarImg) {
      const photo = (store.getMyAlbum('public')[0] || {}).url || me.photoUrl || '';
      el.myProfileAvatarImg.hidden = !photo;
      if (photo) el.myProfileAvatarImg.src = photo;
      if (photo) el.myProfileAvatarLetter.hidden = true;
      else el.myProfileAvatarLetter.hidden = false;
    }
    renderAlbumGrid(el.albumPublicGrid, 'public');
    renderAlbumGrid(el.albumSecretGrid, 'secret');
    const summary = store.getAlbumSummary();
    if (el.albumPublicCount) el.albumPublicCount.textContent = `${summary.public.count} / ${ALBUM_MAX}`;
    if (el.albumSecretCount) el.albumSecretCount.textContent = `${summary.secret.count} / ${ALBUM_MAX}`;
    if (el.albumShareNote) {
      const n = summary.sharedWith.length;
      el.albumShareNote.textContent = n
        ? `대화방 ${n}곳에 공개 중 · 나머지는 잠겨 있어요`
        : '1:1 대화방에서 공개한 상대만 볼 수 있어요';
    }
    if (el.myProfileStats) {
      const stats = store.getProfileStats ? store.getProfileStats() : null;
      const posts = stats ? stats.posts : store.getMyFeedPosts().length;
      const likes = stats ? stats.likes : 0;
      const groups = store.getJoinedGroups().length;
      el.myProfileStats.innerHTML = `
        <span class="myprofile-stat"><strong>${posts}</strong><span>내 글</span></span>
        <span class="myprofile-stat"><strong>${likes}</strong><span>받은 좋아요</span></span>
        <span class="myprofile-stat"><strong>${groups}</strong><span>내 모임</span></span>`;
    }
  }

  /**
   * 사진 한 장 넣기 — Sprint 25 부터는 **API 경계**를 지난다(js/api.js).
   *  · 경계가 없으면(스크립트를 못 읽은 오프라인 사본 등) store 를 바로 부른다.
   *  · 경계의 로컬 어댑터는 결국 같은 store 규칙을 쓰므로 결과는 같다.
   */
  function pickAlbumPhoto(kind, file) {
    if (!file) return;
    readImageFile(file, (url) => {
      const done = () => {
        afterAlbumChange(kind);
        showToast(kind === 'secret' ? '비밀앨범에 사진을 넣었어요' : '공개 사진에 넣었어요', 'success');
      };
      const fail = (reason) => {
        showToast(reason === 'full' ? '사진은 4장까지 올릴 수 있어요' : '사진을 올리지 못했어요', 'warning');
      };
      if (window.OOGAPI) {
        window.OOGAPI.call('album.add', { kind, dataUrl: url }).then((env) => {
          if (!env.ok) { fail((env.error && env.error.details && env.error.details.reason) || ''); return; }
          done();
        }).catch(() => fail(''));
        return;
      }
      const res = store.addMyAlbumPhoto(kind, url);
      if (!res.ok) { fail(res.reason); return; }
      done();
    }, albumUploadSpec().maxDimension, albumUploadSpec().jpegQuality);
  }

  function openAlbumPicker(kind, camera) {
    const input = camera
      ? (kind === 'secret' ? el.albumSecretCamera : el.albumPublicCamera)
      : (kind === 'secret' ? el.albumSecretAlbum : el.albumPublicAlbum);
    if (input) input.click();
  }

  [[el.albumPublicAlbum, 'public'], [el.albumPublicCamera, 'public'],
   [el.albumSecretAlbum, 'secret'], [el.albumSecretCamera, 'secret']].forEach(([input, kind]) => {
    if (!input) return;
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      /* 확대 보기에서 연 사진 고르기는 '추가'가 아니라 '그 자리 교체'다. */
      if (file && albumViewer.open && albumViewer.kind === kind) replaceAlbumViewerPhoto(file);
      else if (file) pickAlbumPhoto(kind, file);
      input.value = '';
    });
  });

  /* ------------------------------------------- Sprint 25 · 앨범 확대 보기
   * 사진을 탭하면 화면 가득 보여주고, 그 자리에서 넘기기·바꾸기·지우기를 한다.
   *  · 칸 순서는 그대로 두고(바꾸기는 같은 자리 교체), 좌우 스와이프·화살표 키를 지원한다.
   *  · 닫으면 원래 앨범(내 프로필 탭 또는 1:1 대화방 시트)으로 정확히 돌아간다.
   * ====================================================================== */
  const albumViewer = {
    kind: 'public',
    index: 0,
    open: false,
    from: 'profile'       // 'profile' | 'secret'
  };

  function albumViewerPhotos(kind) {
    return store.getMyAlbum(kind).slice();
  }

  function renderAlbumViewer() {
    if (!el.albumViewer || !albumViewer.open) return;
    const photos = albumViewerPhotos(albumViewer.kind);
    if (!photos.length) { closeAlbumViewer(); return; }
    albumViewer.index = Math.max(0, Math.min(photos.length - 1, albumViewer.index));
    const photo = photos[albumViewer.index];
    const kindLabel = albumViewer.kind === 'secret' ? '비밀앨범' : '공개 사진';
    if (el.albumViewerImg) {
      el.albumViewerImg.src = photo.url;
      el.albumViewerImg.alt = `${kindLabel} ${albumViewer.index + 1}`;
    }
    if (el.albumViewerCount) {
      el.albumViewerCount.innerHTML = `<span class="album-viewer-kind">${kindLabel}</span> ${albumViewer.index + 1} / ${photos.length}`;
    }
    const single = photos.length < 2;
    if (el.albumViewerPrev) el.albumViewerPrev.disabled = single;
    if (el.albumViewerNext) el.albumViewerNext.disabled = single;
    /* Sprint 26.5 — 길게 누르기 메뉴를 알리는 한 줄(버튼은 보조용으로 남긴다). */
    if (el.albumViewerHint) {
      el.albumViewerHint.textContent = single
        ? '사진을 길게 누르면 대표·바꾸기·지우기가 열려요'
        : '좌우로 넘기기 · 길게 누르면 대표·순서·바꾸기·지우기';
    }
    /* Sprint 27.5 — 메뉴 항목의 가능 여부(대표는 공개 앨범에만, 끝에서는 이동 불가) */
    syncAlbumViewerMenuState(photos.length);
  }

  /** 길게 누르기 메뉴의 항목 상태 — 지금 사진으로 할 수 있는 것만 활성화한다. */
  function syncAlbumViewerMenuState(total) {
    const menu = el.albumViewerMenu;
    if (!menu) return;
    const count = total == null ? albumViewerPhotos(albumViewer.kind).length : total;
    const atFirst = albumViewer.index <= 0;
    const atLast = albumViewer.index >= count - 1;
    const cover = menu.querySelector('[data-viewer-menu="cover"]');
    const prev = menu.querySelector('[data-viewer-menu="prev"]');
    const next = menu.querySelector('[data-viewer-menu="next"]');
    if (cover) {
      /* 대표 사진 = 공개 앨범 첫 장. 이미 맨 앞이면 할 일이 없다. */
      cover.hidden = albumViewer.kind !== 'public';
      cover.disabled = atFirst;
    }
    if (prev) prev.disabled = atFirst;
    if (next) next.disabled = atLast;
  }

  /** Sprint 27.5 — 지금 사진을 공개 앨범 대표(첫 장)로 옮긴다. */
  function setAlbumViewerCover() {
    const photos = albumViewerPhotos(albumViewer.kind);
    const photo = photos[albumViewer.index];
    if (!photo) return { ok: false, reason: 'not_found' };
    const res = store.setMyAlbumCover(albumViewer.kind, photo.id);
    if (!res.ok) { showToast('이미 대표 사진이에요', 'info'); return res; }
    albumViewer.index = 0;
    afterAlbumChange(albumViewer.kind);
    renderAlbumViewer();
    showToast('대표 사진으로 정했어요', 'success');
    return res;
  }

  /** Sprint 27.5 — 앨범 안에서 앞/뒤로 한 칸 옮긴다. */
  function moveAlbumViewerPhoto(delta) {
    const photos = albumViewerPhotos(albumViewer.kind);
    const photo = photos[albumViewer.index];
    if (!photo) return { ok: false, reason: 'not_found' };
    const res = store.moveMyAlbumPhoto(albumViewer.kind, photo.id, delta);
    if (!res.ok) {
      showToast(delta < 0 ? '첫 사진이에요' : '마지막 사진이에요', 'info');
      return res;
    }
    albumViewer.index = res.index;
    afterAlbumChange(albumViewer.kind);
    renderAlbumViewer();
    showToast(delta < 0 ? '앞으로 옮겼어요' : '뒤로 옮겼어요', 'success');
    return res;
  }

  function openAlbumViewer(kind, index, from) {
    if (!el.albumViewer) return { ok: false, reason: 'no_viewer' };
    const photos = albumViewerPhotos(kind);
    if (!photos.length) return { ok: false, reason: 'empty' };
    albumViewer.kind = kind === 'secret' ? 'secret' : 'public';
    albumViewer.index = Number.isFinite(Number(index)) ? Number(index) : 0;
    albumViewer.from = from || 'profile';
    albumViewer.open = true;
    closeAlbumViewerMenu();
    el.albumViewer.hidden = false;
    el.albumViewer.classList.add('is-open');
    document.body.classList.add('is-album-viewing');
    renderAlbumViewer();
    syncProfilesBackdrop();
    if (el.albumViewerClose) el.albumViewerClose.focus({ preventScroll: true });
    return { ok: true, index: albumViewer.index, kind: albumViewer.kind };
  }

  function closeAlbumViewer() {
    if (!el.albumViewer || !albumViewer.open) return { open: false };
    closeAlbumViewerMenu();
    albumViewer.open = false;
    el.albumViewer.hidden = true;
    el.albumViewer.classList.remove('is-open');
    document.body.classList.remove('is-album-viewing');
    if (el.albumViewerImg) el.albumViewerImg.removeAttribute('src');
    syncProfilesBackdrop();
    return { open: false };
  }

  function stepAlbumViewer(delta) {
    closeAlbumViewerMenu();
    const photos = albumViewerPhotos(albumViewer.kind);
    if (photos.length < 2) return { index: albumViewer.index };
    albumViewer.index = (albumViewer.index + delta + photos.length) % photos.length;
    renderAlbumViewer();
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(4);
    return { index: albumViewer.index, total: photos.length };
  }

  /** 확대 보기에서 '사진 바꾸기' — 같은 칸의 사진만 교체한다(칸 순서 유지). */
  function replaceAlbumViewerPhoto(file) {
    if (!file) return { ok: false, reason: 'no_file' };
    const photos = albumViewerPhotos(albumViewer.kind);
    const photo = photos[albumViewer.index];
    if (!photo) return { ok: false, reason: 'not_found' };
    const kind = albumViewer.kind;
    readImageFile(file, (url) => {
      const apply = () => {
        afterAlbumChange(kind);
        renderAlbumViewer();
        showToast('사진을 바꿨어요', 'success');
      };
      if (window.OOGAPI) {
        window.OOGAPI.call('album.replace', { kind, photoId: photo.id, dataUrl: url })
          .then((env) => {
            if (!env.ok) { showToast('사진을 바꾸지 못했어요', 'warning'); return; }
            apply();
          })
          .catch(() => showToast('사진을 바꾸지 못했어요', 'warning'));
        return;
      }
      const res = store.replaceMyAlbumPhoto(kind, photo.id, url);
      if (!res.ok) { showToast('사진을 바꾸지 못했어요', 'warning'); return; }
      apply();
    }, albumUploadSpec().maxDimension, albumUploadSpec().jpegQuality);
    return { ok: true };
  }

  function deleteAlbumViewerPhoto() {
    const photos = albumViewerPhotos(albumViewer.kind);
    const photo = photos[albumViewer.index];
    if (!photo) return { ok: false, reason: 'not_found' };
    const kind = albumViewer.kind;
    const finish = () => {
      afterAlbumChange(kind);
      if (!albumViewerPhotos(kind).length) { closeAlbumViewer(); showToast('사진을 지웠어요', 'info'); return; }
      renderAlbumViewer();
      showToast('사진을 지웠어요', 'info');
    };
    /* 지우기는 화면에서 즉시(동기) 반영한다 — 실수로 지운 사진이 잠깐 남아 보이지 않게.
       (서버가 붙으면 api.call('album.remove') 로 바꾸고, 실패 시 되돌리는 자리는 finish() 다.) */
    const res = store.removeMyAlbumPhoto(kind, photo.id);
    if (!res.ok) return res;
    finish();
    return res;
  }

  /** 앨범이 바뀌면 그 앨범을 보여주던 화면들을 함께 다시 그린다. */
  function afterAlbumChange(kind) {
    renderMyProfileTab();
    if (kind === 'secret' && ui.secretAlbumPartnerId) renderSecretAlbumBody();
  }

  function syncProfilesBackdrop() {
    document.documentElement.classList.toggle('is-album-viewing', !!albumViewer.open);
  }

  el.albumViewerClose && el.albumViewerClose.addEventListener('click', () => closeAlbumViewer());
  el.albumViewer && el.albumViewer.addEventListener('click', (e) => {
    if (e.target.closest('[data-album-viewer-close]')) { closeAlbumViewerMenu(); closeAlbumViewer(); return; }
    const menuItem = e.target.closest('[data-viewer-menu]');
    if (menuItem) {
      const act = menuItem.dataset.viewerMenu;
      closeAlbumViewerMenu();
      if (act === 'delete') deleteAlbumViewerPhoto();
      else if (act === 'cover') setAlbumViewerCover();
      else if (act === 'prev') moveAlbumViewerPhoto(-1);
      else if (act === 'next') moveAlbumViewerPhoto(1);
      else openAlbumPicker(albumViewer.kind, false);
      return;
    }
    /* 메뉴 밖을 누르면 메뉴부터 닫는다 */
    closeAlbumViewerMenu();
    const prev = e.target.closest('#btn-album-viewer-prev');
    if (prev) { stepAlbumViewer(-1); return; }
    const next = e.target.closest('#btn-album-viewer-next');
    if (next) { stepAlbumViewer(1); return; }
    if (e.target.closest('#btn-album-viewer-delete')) { deleteAlbumViewerPhoto(); return; }
    if (e.target.closest('#btn-album-viewer-replace')) {
      openAlbumPicker(albumViewer.kind, false);
    }
  });

  /* 좌우 스와이프 */
  (function wireAlbumViewerSwipe() {
    if (!el.albumViewer) return;
    let startX = 0, startY = 0, tracking = false;
    el.albumViewer.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    el.albumViewer.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) stepAlbumViewer(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  /* ---------------------------------------- Sprint 26.5 · 길게 눌러 사진 메뉴
   * 11/17 사용자: "길게눌러 메뉴가 나오도록" (Sprint 25 질문 1 답변)
   *  · 사진을 약 450ms 누르고 있으면 그 자리에 '사진 바꾸기 / 사진 지우기'가 뜬다.
   *  · 데스크톱은 우클릭(컨텍스트 메뉴)도 같은 메뉴를 연다.
   *  · 하단 버튼은 키보드·보조기기용으로 그대로 둔다(같은 동작).
   * ====================================================================== */
  const ALBUM_LONG_PRESS_MS = 450;

  function albumViewerMenuOpen() {
    return !!(el.albumViewerMenu && !el.albumViewerMenu.hidden);
  }

  function openAlbumViewerMenu(x, y) {
    const menu = el.albumViewerMenu;
    if (!menu || !albumViewer.open) return { open: false };
    menu.hidden = false;
    menu.classList.add('is-open');
    const vw = window.innerWidth || 390;
    const vh = window.innerHeight || 844;
    const mw = menu.offsetWidth || 178;
    const mh = menu.offsetHeight || 108;
    const left = Math.max(10, Math.min(vw - mw - 10, (x || vw / 2) - mw / 2));
    const top = Math.max(10, Math.min(vh - mh - 10, (y || vh / 2) + 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    /* 메뉴 자체에 포커스(테두리 없음) — Tab 으로 항목을 고를 수 있고, 터치에서도 선택 표시가 남지 않는다. */
    if (typeof menu.focus === 'function') {
      try { menu.focus({ preventScroll: true }); } catch (err) { /* 구형 */ }
    }
    return { open: true, left, top };
  }

  function closeAlbumViewerMenu() {
    const menu = el.albumViewerMenu;
    if (!menu || menu.hidden) return { open: false };
    menu.hidden = true;
    menu.classList.remove('is-open');
    return { open: false };
  }

  (function wireAlbumViewerLongPress() {
    const frame = el.albumViewer && el.albumViewer.querySelector('.album-viewer-frame');
    if (!frame) return;
    let timer = null;
    let startX = 0, startY = 0;
    let fired = false;
    const cancel = () => {
      if (timer) { clearTimeout(timer); timer = null; }
    };
    frame.addEventListener('pointerdown', (e) => {
      if (!albumViewer.open) return;
      if (e.button != null && e.button !== 0) return;   // 오른쪽·가운데 버튼은 contextmenu 담당
      if (e.target.closest('button')) return;           // 화살표·닫기 버튼 위에서는 길게 누르기 없음
      startX = e.clientX; startY = e.clientY;
      fired = false;
      cancel();
      timer = setTimeout(() => {
        timer = null;
        fired = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
        openAlbumViewerMenu(e.clientX, e.clientY);
      }, ALBUM_LONG_PRESS_MS);
    });
    frame.addEventListener('pointermove', (e) => {
      if (!timer) return;
      if (Math.abs(e.clientX - startX) > 12 || Math.abs(e.clientY - startY) > 12) cancel();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => frame.addEventListener(type, cancel));
    frame.addEventListener('contextmenu', (e) => {
      if (!albumViewer.open) return;
      e.preventDefault();
      cancel();
      openAlbumViewerMenu(e.clientX, e.clientY);
    });
    /* 길게 눌러 메뉴를 연 뒤 손을 떼면 그 클릭이 뒤쪽으로 새지 않게 */
    frame.addEventListener('click', (e) => {
      if (!fired) return;
      fired = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
  })();

  /* 메뉴 안에서는 ↑↓·Home·End 로 항목을 옮긴다(role=menu 규칙). */
  el.albumViewerMenu && el.albumViewerMenu.addEventListener('keydown', (e) => {
    const items = [...el.albumViewerMenu.querySelectorAll('.avm-item')];
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next = index < 0 ? (step > 0 ? 0 : items.length - 1) : (index + step + items.length) % items.length;
      items[next].focus();
    } else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
  });

  document.addEventListener('keydown', (e) => {
    if (!albumViewer.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (albumViewerMenuOpen()) { closeAlbumViewerMenu(); return; }
      closeAlbumViewer();
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); stepAlbumViewer(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); stepAlbumViewer(1); }
  });

  const myProfileTabNode = $('#tab-myprofile');
  myProfileTabNode && myProfileTabNode.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-album-remove]');
    if (rm) {
      const kind = rm.dataset.albumKind === 'secret' ? 'secret' : 'public';
      store.removeMyAlbumPhoto(kind, rm.dataset.albumRemove);
      afterAlbumChange(kind);
      if (albumViewer.open) renderAlbumViewer();
      showToast('사진을 지웠어요', 'info');
      return;
    }
    const open = e.target.closest('[data-album-open]');
    if (open) {
      openAlbumViewer(open.dataset.albumKind === 'secret' ? 'secret' : 'public',
        Number(open.dataset.albumIndex || 0), 'profile');
      return;
    }
    const add = e.target.closest('[data-album-add]');
    if (add) { openAlbumPicker(add.dataset.albumAdd === 'secret' ? 'secret' : 'public', false); }
  });
  $('#btn-album-public-add') && $('#btn-album-public-add').addEventListener('click', () => openAlbumPicker('public', false));
  $('#btn-album-secret-add') && $('#btn-album-secret-add').addEventListener('click', () => openAlbumPicker('secret', false));
  $('#btn-myprofile-settings') && $('#btn-myprofile-settings').addEventListener('click', () => openDrawer('profile'));

  /* ---------------------------------------------- 1:1 대화방 비밀앨범 */
  function syncChatAlbumBtn() {
    if (!el.chatAlbumBtn) return;
    const room = ui.openRoomId ? store.getChatRoom(ui.openRoomId) : null;
    const shared = !!(room && store.isSecretAlbumSharedWith(room.partnerId));
    el.chatAlbumBtn.classList.toggle('is-shared', shared);
    el.chatAlbumBtn.setAttribute('aria-label', shared ? '비밀앨범 — 공개 중' : '비밀앨범 — 잠김');
  }

  function openSecretAlbum(partnerId) {
    if (!partnerId) return;
    ui.secretAlbumPartnerId = partnerId;
    renderSecretAlbumBody();
    openModal(el.secretAlbumModal);
  }

  function renderSecretAlbumBody() {
    if (!el.secretAlbumBody) return;
    const pid = ui.secretAlbumPartnerId;
    const room = pid ? store.findChatRoomByPartner(pid) : null;
    const st = store.getSecretAlbumState(pid);
    const name = room ? room.partnerName : '상대';
    el.secretAlbumBody.innerHTML = `
      <section class="secret-block">
        <h4 class="secret-title">내 비밀앨범 <span class="album-count">${st.mine.photos.length} / ${ALBUM_MAX}</span></h4>
        <div class="album-grid is-secret">
          ${st.mine.photos.length
            ? st.mine.photos.map((p, i) => albumFilledHTML('secret', p, i)).join('')
            : '<p class="secret-empty">내 프로필 탭에서 비밀앨범 사진을 먼저 넣어주세요.</p>'}
        </div>
      </section>
      <section class="secret-block">
        <h4 class="secret-title">${escapeHtml(name)}님의 앨범</h4>
        <div class="secret-locked">
          <span class="secret-lock" aria-hidden="true">${ic('lock')}</span>
          <p class="secret-empty">${st.mine.shared ? '내 앨범만 공개했어요 · 상대 앨범은 아직 잠겨 있어요' : '공개하면 서로의 비밀앨범이 열려요'}</p>
        </div>
      </section>`;
    if (el.secretAlbumShare) el.secretAlbumShare.textContent = st.mine.shared ? '공개 해제' : '공개하기';
    syncChatAlbumBtn();
  }

  function toggleSecretAlbumShare(on) {
    const pid = ui.secretAlbumPartnerId;
    if (!pid) return { ok: false, reason: 'no_partner' };
    const next = on === undefined ? !store.isSecretAlbumSharedWith(pid) : !!on;
    store.setSecretAlbumShared(pid, next);
    renderSecretAlbumBody();
    syncChatAlbumBtn();
    showToast(next ? '이 대화 상대에게 비밀앨범을 공개했어요' : '비밀앨범 공개를 해제했어요', 'info');
    return { ok: true, shared: next };
  }

  el.secretAlbumShare && el.secretAlbumShare.addEventListener('click', () => toggleSecretAlbumShare());
  $('#btn-secret-album-close') && $('#btn-secret-album-close').addEventListener('click', () => closeModal(el.secretAlbumModal));
  el.secretAlbumModal && el.secretAlbumModal.addEventListener('click', (e) => {
    const open = e.target.closest('[data-album-open]');
    if (open) {
      /* 대화방 시트 위에서 열린 확대 보기는 닫았을 때 이 시트로 돌아온다. */
      openAlbumViewer('secret', Number(open.dataset.albumIndex || 0), 'secret');
      return;
    }
    const rm = e.target.closest('[data-album-remove]');
    if (rm) {
      store.removeMyAlbumPhoto(rm.dataset.albumKind === 'secret' ? 'secret' : 'public', rm.dataset.albumRemove);
      renderSecretAlbumBody();
      renderMyProfileTab();
    }
  });

  /* 2시간이 지난 프로필은 화면에서도 조용히 내린다(20초마다 확인 — 남은 시간 표기도 함께 갱신). */
  let publishWasActive = store.isMyProfileExploreVisible();
  setInterval(() => {
    const active = store.isMyProfileExploreVisible();
    renderExploreProfileToggle();
    if (publishWasActive && !active) {
      ui.exploreBuffer = null;
      if (ui.exploreRendered) renderExploreWithSkeleton();
      renderMyProfileTab();
      showToast('2시간이 지나 내 프로필이 자동으로 내려갔어요', 'info');
    }
    publishWasActive = active;
  }, 20000);

  /* ---------------------------------------------- 탐색 상단: 아래로 스크롤하면 숨김 */
  function initExploreTopHide() {
    if (!el.main) return;
    const top = document.querySelector('.explore-top');
    if (!top) return;
    let lastY = 0;
    el.main.addEventListener('scroll', () => {
      if (ui.activeTab !== 'tab-explore') return;
      const y = el.main.scrollTop;
      const dy = y - lastY;
      if (y <= 24) top.classList.remove('is-tucked');
      else if (dy > 6 && y > 72) top.classList.add('is-tucked');
      else if (dy < -6) top.classList.remove('is-tucked');
      lastY = y;
    }, { passive: true });
    /* 탭을 벗어나면 다시 보이게 해 둔다(돌아왔을 때 검색창이 사라져 있지 않게). */
    el.navButtons.forEach((btn) => btn.addEventListener('click', () => top.classList.remove('is-tucked')));
  }

  /* ---------------------------------------------- 이벤트 배선 */
  el.headerHomeBtn && el.headerHomeBtn.addEventListener('click', goHomeTop);
  el.menuDarkMode && el.menuDarkMode.addEventListener('click', () => applyThemePreference());
  el.menuDarkMode && el.menuDarkMode.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    applyThemePreference();
  });
  el.chatAlbumBtn && el.chatAlbumBtn.addEventListener('click', () => {
    const room = ui.openRoomId ? store.getChatRoom(ui.openRoomId) : null;
    if (room) openSecretAlbum(room.partnerId);
  });

  /* --- 초기 마운트 --- */
  const bootStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
  /* Sprint 11 — 펼쳐 둔 알림 묶음을 세션에서 복원 */
  /* Sprint 8 — 첫 렌더 경량화: 탐색 탭만 먼저 그린다.
     피드·대화방·알림 목록은 그 탭을 처음 열 때(또는 알림이 바뀔 때) 그린다. */
  /* Sprint 14 — 첫 화면은 홈(내 그룹 갤러리). 탐색은 그 다음에 그려 둔다(탭을 열면 바로). */
  /* Sprint 24 — 저장된 다크모드를 첫 화면부터 적용하고, 내 프로필 탭을 그려 둔다. */
  applyThemeDom(store.isDarkMode());
  renderMyProfileTab();
  initExploreTopHide();
  syncNavMode();
  renderHome();
  renderExplore();
  renderProfileHeader();
  paintMyAvatars();
  /* Sprint 17 — 가입 전이면 회원가입 화면만 보인다(입구). */
  applySignInGate();
  /* Sprint 21 — 아직 가이드를 보지 않은 계정은 앱을 열 때 이어서 보여준다(도중에 닫아도 다음에 이어서). */
  if (store.isSignedIn() && store.getGuideState().needed && !store.isDemoAccount()) {
    setTimeout(() => startGuide(), 420);
  }
  updateBadges();
  syncExploreSearchClear();
  setupExploreObserver();
  moveNavIndicator({ instant: true });
  initTabBarAutoHide();
  /* Sprint 4.5 — 알림: 브라우저 권한 미러링 → 설정 카드 · 권한 배너 · 알림함 */
  syncNotificationPermission();
  renderNotificationSettings();
  renderPushPrompt();
  /* Sprint 10 — 주간 요약 알림: 한 주에 한 번만, 첫 실행은 조용히 기록만 한다. */
  /* Sprint 5 — PWA: 설치 카드 + Service Worker 등록(오프라인 캐시·푸시 기반) */
  renderPwaCard();
  registerServiceWorker();
  /* Sprint 16 — 첫 화면은 바깥 갤러리라 FAB 은 모임 안에서만 켠다 */
  el.fab.classList.toggle('visible', isGroupMode());

  /* Sprint 8 — 첫 렌더 계측(성능 회귀 확인용): 경과·DOM 노드 수 */
  const bootMs = Math.round(((typeof performance !== 'undefined' ? performance.now() : Date.now()) - bootStart) * 10) / 10;
  window.oogPerf = Object.assign(window.oogPerf || {}, {
    bootMs,
    domNodes: document.querySelectorAll('*').length,
    deferred: ['tab-home', 'tab-chat', 'notification-center', 'hot-strip'],
    /* Sprint 12 — 모션·렌더 계측 (renderExplore 가 기록한 값은 그대로 둔다) */
    motion: prefersReducedMotion() ? 'reduced' : 'full',
    exploreCards: el.exploreMasonry ? el.exploreMasonry.querySelectorAll('.masonry-card').length : 0,
    prefetch: () => (ui.exploreBuffer ? { page: ui.exploreBuffer.page, items: ui.exploreBuffer.items.length } : null)
  });

  /* 창이 다시 보이면 권한 상태를 다시 확인한다(브라우저 설정에서 바꿨을 수 있다). */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    syncNotificationPermission();
    renderNotificationSettings();
    renderPushPrompt();
  });

  /* 디버그용(개발 편의): 콘솔에서 oog.ui 로 현재 화면 상태 확인 가능 */
  window.oog = {
    store, ui, switchTab, openComposer, openGroupDetail, openPersonDetail,
    renderFeed, renderExplore, openPostDetail, openChatRoom, openExploreCompose,
    openProfileEdit, openGroupCreate, togglePostLike, quickLike, undoLike,
    /* Sprint 4.5 */
    openNotificationCenter, requestPushPermission, sendTestPush, deliverNotification,
    openApplyModal, openMyApplications, submitApplication, showPushBanner,
    dismissAllPushBanners, renderNotificationSettings,
    /* Sprint 5 — 알림 범위 확장 · PWA */
    renderPwaCard, registerServiceWorker, promptInstall, openFromNotification,
    simulateIncomingReaction: (kind) => store.simulateIncomingReaction(kind),
    simulateJoinRequest: () => store.simulateJoinRequest(),
    simulateJoinDecision: (approved) => store.simulateJoinDecision(approved),
    /* Sprint 6 — 나이 필터 · 알림 5종 · 활동 로그 */
    renderAgeRange, setExploreAge: (id) => { ui.exploreAge = id; renderExplore(); },
    openActivityLog, renderActivityLog, openActivityTarget,
    simulateChatReply: () => store.simulateChatReply(),
    /* Sprint 7 — 내 나이 맞춤 · 지역 탐색 · 실시간 베스트 · 필터 기억 */
    selectRegion,
    openHotSheet, renderHotSheet, renderHotStrip,
    setExploreRegion: (id) => selectRegion(id),
    getNotifState: () => ({
      filter: ui.notifFilter, unreadOnly: ui.notifUnreadOnly,
      sessionUnread: (ui.notifSessionUnread || []).slice()
    }),
    /* Sprint 8 — 내 동네 반경 · 실베 2차 · 알림함/활동 로그 2차 · 성능 */
    syncHotEntryNotifications, hotMoveHTML,
    simulateHotEntry: (opts) => store.simulateHotEntry(opts),
    markNotifRead, removeNotif,
    renderNotificationList,
    setNotifPreview: (id) => { ui.notifPreview = ui.notifPreview === id ? null : id; renderNotificationSettings(); },
    setActivityView: (v) => { ui.activityView = v; renderActivityLog(); },
    setActivityRange: (r) => { ui.activityRange = r; renderActivityLog(); },
    prefetchExplorePage,
    /* Sprint 9 — 통합 필터 시트 · 알림 묶음 · 활동 로그 내보내기 */
    openFilterSheet, closeFilterSheet, applyFilterDraft, resetFilterDraft, clearFilterCondition,
    toggleFilterDraft, renderFilterSheet, renderExploreToolbar, updateFilterPreview,
    getFilterState: () => ({ applied: { filter: ui.exploreFilter, age: ui.exploreAge, region: ui.exploreRegion, range: store.getExploreAgeRange() }, draft: { ...(ui.filterDraft || {}) }, open: !!ui.filterSheetOpen }),
    getNotifGroups: () => (ui.notifGroupMap || {}),
    resolveNotifGroup, markNotifGroupRead: (key) => markNotifRead(key), removeNotifGroup: (key) => removeNotif(key),
    exportActivity, downloadActivityCsv,
    /* Sprint 10 — 조용한 첫 실행 · 알림 펼치기 */
    toggleNotifExpand,
    /* Sprint 11 — 알림함 4차(실베·시스템 모아보기 · 펼침/접기 · 모두 접기) */
    collapseAllNotifExpand,
    /* Sprint 12 — 타이포·카드·시트 모션 */
    moveNavIndicator,
    prefersReducedMotion,
    closeModal,
    getNavIndicator: () => {
      const ind = el.navIndicator;
      if (!ind) return null;
      const active = el.navButtons.find((b) => b.classList.contains('active'));
      return {
        cx: ind.style.getPropertyValue('--nav-cx'),
        ready: ind.classList.contains('is-ready'),
        activeTab: active ? active.dataset.tab : null
      };
    },
    getNotifExpanded: () => (ui.notifExpanded || []).slice(),
    getNotifGroupsMerged: () => store.getGroupedNotifications({ mergeRoutine: true }),
    getHotBaseline: () => store.getHotEntryBaseline(),
    showExploreSkeleton: () => renderExploreSkeleton(),
    perf: () => window.oogPerf,
    /* Sprint 14 — 홈(내 모임 허브) · 단체 채팅 · 일정(RSVP) · 전체 멤버 */
    renderHome, switchHomeGroup, goGroupFeed,
    setHomeView: (v) => { ui.homeView = v; renderHomeFeed(homeGroup()); },
    setHomeTag: (t) => { ui.homeTag = t || null; renderHomeFeed(homeGroup()); },
    openGroupChat, closeGroupChat, renderGroupChatMessages, sendGroupChatMessage,
    /* Sprint 15 — 공지 · 일정 상세 · 부방장 · 그룹 내 1:1 · 돋보기 · 내 피드 */
    openNoticeSheet, renderNoticeSheet, openEventDetail, renderEventDetail,
    openGroupMembers: (gid) => openGroupMembers(gid),
    renderProfileMyFeed,
    setPastEventsOpen: (on) => { ui.pastEventsOpen = !!on; renderHomeEvents(homeGroup()); },
    openGroupMembers, renderMembersSheet, goMemberChat, goMemberProfile,
    openEventForm, submitGroupEvent,
    setRsvp: (eventId, status) => store.setGroupEventRsvp(eventId, status),
    openHomePost,
    getHomeState: () => ({
      groupId: ui.homeGroupId || store.getHomeGroupId(),
      view: ui.homeView,
      tag: ui.homeTag,
      openChat: ui.openGroupChatId,
      membersGroup: ui.membersGroupId,
      memberDetail: ui.memberDetailId
    }),
    /* Sprint 16 — 바깥 3탭 · 그룹 4탭 · 스토리 · 게시판 · 나이 슬라이더 · 쪽지 */
    enterGroupSpace, exitGroupSpace, isGroupMode, renderGallery,
    getGallery: () => store.getGroupGallery().map((it) => ({
      id: it.id, name: it.name, photos: it.photoCount, stories: it.storyCount, leader: it.isLeader
    })),
    renderStoryBar, openStoryComposer, submitStory, openStoryViewer, closeStoryViewer,
    storyStep, deleteCurrentStory, renderStoryViewer,
    getStoryState: () => ({ groupId: ui.storyGroupId, storyId: ui.storyId, open: !!(el.storyViewer && !el.storyViewer.hidden) }),
    renderBoard, renderBoardPosts, renderBoardNotices, setBoardTag: (t) => { ui.boardTag = t || null; renderBoardPosts(homeGroup()); },
    getBoardState: () => ({ tag: ui.boardTag, posts: el.boardPostList ? el.boardPostList.querySelectorAll('.board-post').length : 0 }),
    renderAgeRange, applyAgeRange,
    getAgeRange: () => store.getExploreAgeRange(),
    toggleExploreProfile: (on) => setExploreProfileVisible(on === undefined ? !store.isMyProfileExploreVisible() : on),
    openDmComposer, sendDm, startDirectMessage: (id, text) => store.startDirectMessage(id, text),
    getDmInbox: () => store.getDmInbox(),
    getSpaceState: () => ({ groupSpaceId: ui.groupSpaceId, groupMode: isGroupMode(), tab: ui.activeTab }),
    /* Sprint 17 — 회원가입 · 스토리 링/보관함 · 공지 읽음 · 표지 · 디엠 정렬 */
    applySignInGate, renderOnboarding, submitOnboarding, submitOnboardingLogin,
    signOut: runSignOut, resetAllData: runResetData, askConfirm,
    getOnboardingDraft: () => ({ ...(ui.onboardingDraft || {}), step: ui.onboardingStep, mode: ui.onboardingMode }),
    setOnboardingStep: (n) => { ui.onboardingStep = Math.max(0, Math.min(2, n)); renderOnboarding(); },
    getStoryRings: (gid) => store.getStoryRings(gid || ui.groupSpaceId),
    openStoryRing, openStoryArchive, renderStoryArchive, sendStoryReply, openArchivedStory,
    getStoryViewerState: () => ({
      open: !!(el.storyViewer && !el.storyViewer.hidden), ring: ui.storyRingId,
      archive: ui.storyArchiveView, storyId: ui.storyId,
      segments: document.querySelectorAll('#story-viewer-progress .story-seg').length
    }),
    getStoryArchiveState: () => ({ count: store.getStoryArchiveStats().count, items: store.getMyStoryArchive().length }),
    openNoticeRead, getNoticeRead: (id) => store.getNoticeReadState(id),
    openCoverPicker, renderCoverGrid, toggleCoverPreset, saveCover,
    getCoverState: () => ({ groupId: ui.coverGroupId, draft: ui.coverDraft.slice() }),
    renderGallerySort, renderExploreSummary,
    /* Sprint 24 — 내 프로필 올리기(2시간) · 프로필 탭 · 앨범 · 다크모드 */
    openPublishSheet, submitPublishSheet, renderExploreProfileToggle,
    getExplorePublishState: () => store.getMyExplorePublishState(),
    renderMyProfileTab, setDarkMode: (on) => applyThemePreference(on), getDarkMode: () => store.isDarkMode(),
    openSecretAlbum: (partnerId) => openSecretAlbum(partnerId), setSecretAlbumShared: (on) => toggleSecretAlbumShare(on === undefined ? undefined : on),
    /* Sprint 25 — 앨범 확대 보기(라이트박스) */
    openAlbumViewer: (kind, index, from) => openAlbumViewer(kind, index, from),
    closeAlbumViewer: () => closeAlbumViewer(),
    stepAlbumViewer: (delta) => stepAlbumViewer(delta),
    deleteAlbumViewerPhoto: () => deleteAlbumViewerPhoto(),
    getAlbumViewerState: () => ({
      open: !!albumViewer.open,
      kind: albumViewer.kind,
      index: albumViewer.index,
      total: albumViewerPhotos(albumViewer.kind).length,
      count: el.albumViewerCount ? el.albumViewerCount.textContent : '',
      src: el.albumViewerImg ? el.albumViewerImg.getAttribute('src') : null,
      hidden: !!(el.albumViewer && el.albumViewer.hidden)
    }),
    /* Sprint 18 — 사이드바(모임 멤버·설정 / 내정보 설정) */
    openDrawer, closeDrawer, renderGroupDrawer, renderProfileDrawer,
    getDrawerState: () => ({ open: ui.drawerOpen }),
    /* Sprint 26.5 — 설정 아코디언 · 라이트박스 길게 누르기 메뉴 */
    openSettingsGroup: (key) => openSettingsGroup(key),
    setSettingsGroup: (key, open) => setSettingsGroup(key, open),
    getSettingsState: () => getSettingsState(),
    /* Sprint 27.5 — 가이드 단계 바로 열기(스포트라이트 확인·테스트) */
    openGuideAt: (stepId) => startGuide({ step: stepId }),
    closeGuide: (status) => closeGuide(status),
    getGuideView: () => ({
      open: !!(ui.guide && ui.guide.open),
      step: ui.guide ? GUIDE_STEPS[ui.guide.step] && GUIDE_STEPS[ui.guide.step].id : null,
      target: guideTargetRect(GUIDE_STEPS[ui.guide ? ui.guide.step : 0] || GUIDE_STEPS[0]),
      hole: el.spotlightHole ? { w: el.spotlightHole.style.width, h: el.spotlightHole.style.height, hidden: !!el.spotlightHole.hidden } : null
    }),
    openAlbumViewerMenu: (x, y) => openAlbumViewerMenu(x, y),
    closeAlbumViewerMenu: () => closeAlbumViewerMenu(),
    /* Sprint 27.5 — 대표 사진·앨범 순서·예시 데이터 */
    setAlbumViewerCover: () => setAlbumViewerCover(),
    moveAlbumViewerPhoto: (delta) => moveAlbumViewerPhoto(delta),
    getSampleState: () => store.getSampleSummary(),
    clearSampleData: () => runClearSampleData(),
    restoreSampleData: () => runRestoreSampleData(),
    getAlbumViewerMenuState: () => ({
      open: albumViewerMenuOpen(),
      items: el.albumViewerMenu
        ? [...el.albumViewerMenu.querySelectorAll('.avm-item')].map((b) => b.textContent.trim())
        : [],
      left: el.albumViewerMenu ? el.albumViewerMenu.style.left : '',
      top: el.albumViewerMenu ? el.albumViewerMenu.style.top : ''
    }),
    /* Sprint 21 — 점토 아이콘 · 취미 분류 · 추천 모임 · 스포트라이트 가이드 */
    renderHomeRecommend,
    /* Sprint 22 — 홈 '모임 둘러보기'(탐색에서 옮겨온 모임 목록). 테스트·미리보기가 한 번에 펼친다. */
    renderHomeBrowse, focusHomeBrowse,
    getHomeBrowseState: () => ({ ...homeBrowseState() }),
    setHomeBrowse: (patch) => {
      Object.assign(homeBrowseState(), patch || {});
      renderHomeBrowse();
      return { ...homeBrowseState() };
    },
    getRecommend: () => store.getRecommendedGroups({ limit: 6 }).map((it) => ({ id: it.group.id, name: it.group.name, tone: it.tone, reason: it.reason })),
    startGuide, closeGuide, renderGuide, nextGuide: guideNext, prevGuide: guidePrev,
    saveGuideTaste, toggleGuidePick, addGuideCustomHobby,
    getGuideUi: () => {
      const g = guideState();
      return {
        open: g.open, step: g.step, mode: g.mode,
        stepId: (GUIDE_STEPS[g.step] || {}).id || null,
        total: GUIDE_STEPS.length,
        hobbyIds: g.hobbyIds.slice(), goalIds: g.goalIds.slice(),
        title: el.spotlightTitle ? el.spotlightTitle.textContent : '',
        hole: el.spotlightHole && !el.spotlightHole.hidden
          ? { w: el.spotlightHole.style.width, h: el.spotlightHole.style.height } : null
      };
    },
    addCustomHobby: (name, categoryId) => store.addCustomHobby(name, categoryId),
    /* Sprint 19 — '우그' 클레이 로고 스플래시 · 클레이 모션 */
    splash,
    getSplashState: () => splash.getState(),
    setDmView: (v) => { ui.dmView = v === 'group' ? 'group' : 'recent'; renderChatRooms(); },
    setDmUnreadOnly: (on) => { ui.dmUnreadOnly = !!on; renderChatRooms(); },
    getDmViewState: () => ({ view: ui.dmView, unreadOnly: ui.dmUnreadOnly, sent: ui.dmSent }),
    /* Sprint 23 — 지역 게시판 · 통합 모임 찾기 · 스토리텔링 문구 연출 · 탭바 자동 숨김 */
    renderExploreCompose, postStyleLabel, postRegionLabel,
    getRegionState: () => ({
      region: ui.exploreRegion,
      label: store.getRegionLabel(ui.exploreRegion),
      sub: store.getRegion(ui.exploreRegion) ? (store.getRegion(ui.exploreRegion).groupId || null) : null,
      chips: store.getExploreRegionChips(ui.exploreFilter, ui.exploreQuery, ui.exploreAge, ui.exploreRadius).map((c) => c.id)
    }),
    setExploreRegion: (id) => selectRegion(id),
    getComposeState: () => ({ ...(ui.exploreCompose || {}) }),
    setComposeRegion: (id) => { ui.exploreCompose.regionId = id; renderExploreCompose(); },
    setComposeStyle: (id) => { ui.exploreCompose.meetStyle = id; renderExploreCompose(); },
    getNarration: () => ({
      enabled: narrationState().enabled, active: !!narrationState().active,
      done: narrationState().done !== false, step: narrationState().step || null,
      answerShown: narrationState().answerShown !== false,
      guide: ui.guideNarrKey || null
    }),
    setNarration: (on) => {
      narrationState().enabled = on !== false;
      narrationState().force = true;
      return { enabled: narrationState().enabled };
    },
    skipNarration: () => {
      if (typeof ui.narrationReveal === 'function') ui.narrationReveal();
      return { done: narrationState().done !== false };
    },
    setTabBarAutoHide, getTabBarState, noteUserActivity,
    getHomeDiscoverState: () => {
      const rail = $('#home-recommend-grid');
      return {
        merged: !!$('#home-discover'),
        recommendHidden: !!($('#home-recommend') || {}).hidden,
        cards: rail ? rail.querySelectorAll('.recommend-card').length : 0,
        scrollSnap: rail ? getComputedStyle(rail).scrollSnapType : '',
        overflowX: rail ? getComputedStyle(rail).overflowX : '',
        browseCards: document.querySelectorAll('#home-browse-grid .group-tile').length
      };
    }
  };
});
