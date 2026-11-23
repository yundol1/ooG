/**
 * ============================================================================
 * ooG (우그) — Central Reactive Data Store  ·  Sprint 6
 * ----------------------------------------------------------------------------
 * "Unified State Tree for Seamless A-C-D Modular Integration"
 *
 *   A (프로필)  ──┐
 *   B (모임)    ──┼──·  feedPosts / customTags  ──·  D (1:1 매칭) ──· E (채팅)
 *   C (피드)    ──┘
 *
 * 모든 화면(탭)은 이 저장소 하나만 바라보고, 저장소가 바뀌면 구독자(화면)가
 * 자동으로 다시 그려집니다. 새 기능(매칭·채팅·결제·알림)을 붙일 때도
 * 화면 코드를 고치지 않고 여기에 상태 + 액션만 추가하면 됩니다.
 *
 * · 사용법
 *   const store = window.appStore;
 *   store.subscribe(state => { ... });            // 상태 변경 구독
 *   store.getPosts('my');                         // 필터별 피드 조회
 *   store.toggleLike('post_cf_01');               // 좋아요
 *   store.createPost({ ... });                    // 글 작성
 *   store.addGroupCustomTag(gid, '태그');          // 모임장 말머리 추가
 *   store.getExploreFeed('all');                  // 2열 메이슨리 피드(사람+모임+게시글) 항목
 *   store.getExploreFeed('game', '성수');          // 필터 + 검색어
 *   store.getExploreFeed('all', '', {page, limit}); // 무한 스크롤 페이지
 *   store.recordMatchSwipe(id, 'like');            // 카드 하트 → 상호 LIKE면 대화방 생성
 *   store.toggleMatchLike(id);                    // 하트 취소(되돌리기)
 *   store.isProfileLiked(id);                     // 내가 이미 좋아요한 사람인지
 *   store.sendChatMessage(roomId, '안녕하세요');    // 1:1 대화 전송
 *   store.receiveChatMessage(roomId);              // 상대 답장(웰컴 인터랙션)
 *   store.updateProfile({nickname, bio, ...});     // 마이프로필 수정
 *   store.createGroup({name, hobbyId, ...});       // 새 소모임 개설
 *
 * · Sprint 4.5 — 알림 · 가입 심사
 *   store.dispatchNotification({kind, title, body, roomId, context});
 *                                                 // 푸시 채널 결정(system/inapp/suppressed)
 *   store.isDndActive();                          // 지금이 야간 방해 금지 시간인가
 *   store.getJoinState(groupId);                  // member / pending / rejected / none
 *   store.applyToGroup(groupId, answers);         // 승인제 가입 신청서 제출
 *   store.getPendingApplications(groupId);        // 모임장: 신청 대기 목록
 *   store.approveApplication(appId);              // 모임장: 수락(멤버 추가 + 환영 알림)
 *   store.rejectApplication(appId);               // 모임장: 거절
 *   store.getMyApplications();                    // 내가 낸 신청 + 취소
 *   store.updateGroupJoinPolicy(groupId, {...});  // 가입 방식·나이 제한·가입 질문 변경
 *
 * · Sprint 5 — 알림 범위 확장 · 알림 종류별 토글 · PWA
 *   store.getNotificationCategories();            // 알림 종류 3종(chat/reaction/membership) 메타
 *   store.updateNotificationSettings({channels:{reaction:false}});   // 종류별 ON/OFF
 *   store.notifyPostReaction({source, postId, kind});  // 내 글의 좋아요·댓글 알림
 *   store.notifyJoinRequest(applicationId);      // 모임장: 새 가입 신청 도착 알림
 *   store.notifyJoinDecision(application, true); // 신청자: 수락/거절 결과 알림
 *   store.simulateIncomingReaction('like');      // 시뮬레이션 트리거(실제 이벤트와 같은 경로)
 *   store.simulateJoinRequest(groupId);          // 시뮬레이션: 새 신청서 도착
 *   store.getGroupAgeBadge(groupId);             // 카드 겉면 나이 배지('2030만' …)
 *
 * · Sprint 6 — 탐색 나이 필터 · 알림 5종 세분화 · 활동 로그
 *   store.getExploreAgeFilters();                 // 탐색 나이 필터 메타
 *   store.getExploreFeed('all', '', {page, limit}, '2030');  // 나이 조건까지 걸러 보기
 *   store.getNotificationCategories();            // 알림 종류 5종(chat/like/comment/join_request/join_result)
 *   store.getActivityLogs({type:'like'});         // 내 활동 로그(하트·글·댓글·모임)
 *   store.getActivityStats();                     // 활동 요약(종류별 건수 · 이번 주/이번 달)
 *   store.simulateChatReply();                    // 시뮬레이션: 새 1:1 메시지 도착
 *
 * · Sprint 7 — 내 나이 맞춤 · 지역 탐색 · 실시간 베스트 · 필터 기억 · 알림함 강화
 *   store.getExploreAgeFilters();                 // + 'for_me'(내 나이에 맞는 모임만)
 *   store.getForMeAgeProfile();                   // 내 나이 기준 가입 가능 나이대
 *   store.getExploreRegions();                    // 지역(권역) 메타 — 이반시티 우리동네와 같은 2단 체계
 *   store.getExploreRegionStats(filter, q, age);  // 지역별 사람·모임·글 수
 *   store.getExploreFeed(f, q, opts, age, region); // 지역까지 걸러 보기
 *   store.getHotPosts({limit:5});                 // 실시간 베스트(반응 점수 순위)
 *   store.getExplorePrefs();                      // 마지막 탐색 필터(나이·지역·종류) 기억
 *   store.updateExplorePrefs({age:'for_me'});     // 필터 상태 저장(앱 재실행에도 유지)
 *   store.getNotifications({category, unreadOnly}); // 알림함 종류 필터 · 안 읽은 것만
 *   store.updateNotificationSettings({dndExceptions:{join_result:true}}); // 야간 예외
 *
 * · Sprint 9 — 알림 묶음·주간 요약 · 활동 로그 내보내기 · Top 10 진입 알림
 *   store.getExploreTypeFilters();                // 상단 1줄 종류 세그먼트(전체/사람/모임/글)
 *   store.getExploreHobbyFilters();              // 통합 필터 시트의 취미 8종
 *   store.checkHotEntryNotifications();           // 내 글 실베 **Top 10** 진입 시 1회 알림
 *   store.getGroupedNotifications({category});   // 같은 글의 좋아요·댓글을 한 줄로 묶은 알림함
 *   store.getGroupedNotifications({mergeRoutine:true});  // + 실베 진입·시스템은 한 칸으로(Sprint 11)
 *   store.deleteNotificationsByIds([...]);       // 묶음 단위 지우기(되돌리기 지원)
 *   store.exportActivityLog({range:'7d', format:'csv'});  // 활동 로그 텍스트/CSV 내보내기
 *
 * · Sprint 10 — 첫 실행은 조용히 · 알림 묶음 펼치기
 *   store.primeHotEntryBaseline();                // 첫 실행 기준선: 이미 Top 10 안인 내 글은 조용히 기록만
 *   store.checkHotEntryNotifications();           // **새로** Top 10에 든 내 글만 알림(기준선 제외)
 *   store.getHotEntryBaseline();                  // 기준선 기록(언제·몇 건을 조용히 넘겼는지)
 *   store.getGroupedNotifications({category});   // + items[](누가·무슨 반응·언제) — 펼쳐보기용
 *
 * · Sprint 11 — 알림함 4차 (11/15 "리포트는 아예 없애" · "주간 알림도 필요없어" 반영)
 *   store.getGroupedNotifications({mergeRoutine:true});  // 실베 진입·시스템을 종류별 한 칸으로
 *   주간 알림 요약·활동 월간 리포트는 **사용자 지시로 제거**했다(다시 만들지 않는다).
 *
 * · Sprint 15 — 인스타그램형 4탭 (피드 · 탐색 · 디엠 · 내정보)
 *   store.getGroupNotices(groupId);               // 모임 공지(고정 우선) — 작성·고정은 모임장+운영진
 *   store.getGroupNoticePermission(groupId);      // { role:'leader'|'deputy'|'member', canManage }
 *   store.createGroupNotice(groupId, '공지 문구');  // 모임장·운영진만
 *   store.setGroupNoticePinned(noticeId, true);   // 공지 고정/해제
 *   store.setGroupDeputy(groupId, memberId, true);// 모임장이 운영진 지정/해제
 *   store.getGroupDmPolicy(groupId);              // { enabled } 모임 내 1:1 대화 허용 여부
 *   store.updateGroupDmPolicy(groupId, false);    // 모임장만 ON/OFF
 *   store.getGroupBoardPolicy(groupId);           // { canWrite, memberCanWrite } 게시판 작성 권한
 *   store.updateGroupBoardPolicy(groupId, true);  // 모임장만 — 멤버 게시판 작성 허용
 *   store.getGroupNotifySetting(groupId);         // { enabled } 이 모임 알림 받기
 *   store.updateGroupNotifySetting(groupId, false); // 멤버 누구나 — 나에게 오는 모임 알림
 *   store.getMyFeedPosts();                       // 내정보 탭 '내 피드'(내가 올린 글)
 *   store.setGroupEventRsvp(id, 'yes');           // 정원이 차면 자동으로 '대기'로 들어간다
 *
 * · Sprint 14 — 홈 = 내 모임 허브 (11/15 14:55 "홈이 우리 모임의 사진 피드·단체 채팅·술모임")
 *   store.getHomeGroupId();                       // 홈에서 보고 있는 모임(마지막으로 열었던 모임)
 *   store.setHomeGroupId(groupId);                // 홈 모임 전환(가입한 모임만)
 *   store.getHomeGroups();                        // 내 모임 + 다음 일정·단체 채팅·사진 수
 *   store.getGroupChatMessages(groupId);          // 모임 단체 채팅 내역
 *   store.sendGroupChatMessage(groupId, '안녕');   // 단체 채팅 보내기(내 이름으로)
 *   store.receiveGroupChatMessage(groupId, memberId, 'text');  // 멤버 말풍선(시연용)
 *   store.getGroupChatPreview(groupId);           // 마지막 메시지·참여 인원(홈/채팅 목록)
 *   store.getGroupEvents(groupId);                // 오프라인 모임·술모임 일정(다가오는 순)
 *   store.createGroupEvent(groupId, {title, kind, when, place, note});
 *   store.setGroupEventRsvp(eventId, 'yes'|'maybe'|'no');  // 참석/대기/불참
 *   store.getGroupEventSummary(eventId);          // 참석·대기·불참 수와 참석자 목록
 *   store.getGroupRoster(groupId);                // 전체 멤버(모임장·나·멤버, 취미·가입 시점)
 *   store.ensureMemberChat(groupId, memberId);    // 멤버 → 1:1 대화방(없으면 연다)
 * ============================================================================
 */

const STORAGE_KEY = 'oog_app_state_v16';
const STORAGE_SCHEMA_VERSION = 17;
/* v36.0 — 한 모임의 운영진은 모임장 포함 최대 3명까지 임명한다. */
const GROUP_STAFF_MAX = 3;

/* v36.0 — 모임 역할별 권한표. can(groupId, action) 이 이 표 하나만 본다.
   owner(모임장) ⊃ staff(운영진) ⊃ member(멤버) 순으로 넓어지고, guest 는 아무것도 못 한다. */
const GROUP_ACTION_ROLES = {
  /* 멤버라면 누구나 */
  view_group_info: ['member', 'staff', 'owner'],
  view_feed: ['member', 'staff', 'owner'],
  view_member_list: ['member', 'staff', 'owner'],
  write_post: ['member', 'staff', 'owner'],
  write_comment: ['member', 'staff', 'owner'],
  report: ['member', 'staff', 'owner'],
  block_member: ['member', 'staff', 'owner'],
  leave_group: ['member', 'staff', 'owner'],
  /* 운영진 이상 */
  write_notice: ['staff', 'owner'],
  manage_board: ['staff', 'owner'],
  manage_posts: ['staff', 'owner'],
  manage_events: ['staff', 'owner'],
  approve_guests: ['staff', 'owner'],
  approve_applications: ['staff', 'owner'],
  handle_reports: ['staff', 'owner'],
  mute_member: ['staff', 'owner'],
  warn_member: ['staff', 'owner'],
  kick_member: ['staff', 'owner'],
  view_modlog: ['staff', 'owner'],
  /* 모임장만 */
  edit_group: ['owner'],
  edit_join_policy: ['owner'],
  edit_defaults: ['owner'],
  manage_staff: ['owner'],
  transfer_ownership: ['owner'],
  archive_group: ['owner'],
  delete_group: ['owner']
};
/* v36.1 (#23461) — 모임장이 '운영진에게 멤버 관리까지'를 켜야만 운영진이 쓸 수 있는 일.
   끄면 운영진은 공지·일정·가입 승인까지만 하고, 멤버 음소거·경고·강퇴는 모임장만 한다.
   (모임장은 이 스위치와 관계없이 늘 할 수 있다.) */
const STAFF_DELEGATED_ACTIONS = ['mute_member', 'warn_member', 'kick_member'];
/* v33.7 — 한 글에 붙일 수 있는 사진 수(인스타그램과 같은 10장). */
const MAX_POST_IMAGES = 10;
/* v33.7 — 글 사진으로 받는 앱 안 상대 경로(예시 사진 폴더 · 아이콘 폴더). */
const RELATIVE_IMAGE_RE = /^(?:\.\/)?(?:assets|icons)\/[A-Za-z0-9_.\/-]+$/;
/* Sprint 17 — v14 이하 저장 상태는 '내 활동'이 남아 있다. v15 는 클린 스타트(회원가입부터)라
   옛 키를 읽어도 개인 데이터를 물려받지 않고 새 상태로 시작한다(아래 loadState 참고). */
const LEGACY_KEYS = ['oog_app_state_v15', 'oog_app_state_v14', 'oog_app_state_v13', 'oog_app_state_v12', 'oog_app_state_v11', 'oog_app_state_v10', 'oog_app_state_v9', 'oog_app_state_v8', 'oog_app_state_v7', 'oog_app_state_v6', 'oog_app_state_v5', 'oog_app_state_v4'];   // 이전 저장 상태 마이그레이션용
/* 데모 개발용 페르소나(예전 '나') — 클린 스타트의 기준 id. 이 id 로 남은 개인 데이터는 모두 지운다. */
const LEGACY_PERSONA_ID = 'user_rookie';

/* 최초 실행 시점 기준 상대 시간(분)으로 시드 데이터의 작성 시각을 만든다. */
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const ago = (ms) => new Date(Date.now() - ms).toISOString();
/* Sprint 14 — 앞으로의 일정 시각(모임·술모임 카드).
   시드는 '오늘로부터 며칠 뒤 몇 시'로 잡아 항상 다가오는 약속이 되게 한다. */
const atClock = (daysFromToday, hour, minute = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  if (daysFromToday === 0 && d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
};

/* Sprint 14 — 홈(내 모임 허브)의 오프라인 모임·술모임 종류.
   네이버 밴드·당근모임처럼 '모임 안의 약속'을 카드로 올리고 참석을 누른다. */
const GROUP_EVENT_KINDS = [
  { id: 'drink', label: '술모임', icon: 'beer', tone: 'drink' },
  { id: 'workout', label: '운동·번개', icon: 'run', tone: 'workout' },
  { id: 'meal', label: '밥모임', icon: 'meal', tone: 'meal' },
  { id: 'etc', label: '기타', icon: 'pushpin', tone: 'etc' }
];

/* 참석 상태 — 홈의 일정 카드에서 누르는 세 가지. */
const GROUP_EVENT_RSVPS = [
  { id: 'yes', label: '참석', icon: 'checkCircle', tone: 'yes' },
  { id: 'maybe', label: '대기', icon: 'maybe', tone: 'maybe' },
  { id: 'no', label: '불참', icon: 'closeCircle', tone: 'no' }
];

/* Sprint 15 — 모임 공지(고정) · 운영진 · 모임 내 1:1 대화 정책.
   11/15 16:00 사용자: "공지는 모임장 또는 모임장이 지정한 자(운영진 개념)",
   "디엠(전체방) 및 모임내 개인적인 1:1대화 이때는 모임장이 1:1대화 기능을 on/off할 수 있음".
   · 공지 작성·수정·고정은 **모임장 + 모임장이 지정한 운영진**만 할 수 있다.
   · 운영진은 저장 상태(groups[].deputyIds)에 남고, 공지가 누가 쓴 것인지(authorRole)도 함께 남긴다. */
const GROUP_NOTICE_SEED = [
  {
    id: 'ntc_cf_1',
    groupId: 'grp_crossfit_1',
    text: '이번 주 금요일 와드 끝나고 단체 사진 찍어요 운동복 맞춰 입고 와주세요!',
    pinned: true,
    authorId: 'user_rookie',
    authorName: '루키',
    authorRole: 'leader',
    /* Sprint 17 — 공지 읽음 표시(누가 읽었는지). 알림은 만들지 않는다. */
    readers: [
      { memberId: 'user_kettle', name: '케틀벨러버', avatarText: '케', at: ago(5 * HOUR) },
      { memberId: 'user_toe', name: '오늘의 토우', avatarText: '토', at: ago(4 * HOUR) },
      { memberId: 'user_iron', name: '아이언', avatarText: '아', at: ago(3 * HOUR) }
    ],
    at: ago(6 * HOUR)
  },
  {
    id: 'ntc_cf_2',
    groupId: 'grp_crossfit_1',
    text: '토요일 3대 측정 신청은 아래 일정 카드 [참석]으로 남겨주세요. 순서표는 금요일에 올릴게요.',
    pinned: false,
    authorId: 'user_kettle',
    authorName: '케틀벨러버',
    authorRole: 'deputy',
    at: ago(28 * HOUR)
  },
  {
    id: 'ntc_ft_1',
    groupId: 'grp_fitness_1',
    text: '주말 원정은 토요일 오전 10시 서울숲역 3번 출구에서 모입니다. 스팟 서로 봐주세요.',
    pinned: true,
    authorId: 'user_iron',
    authorName: '아이언',
    authorRole: 'leader',
    at: ago(2 * 24 * HOUR)
  },
  {
    id: 'ntc_cl_1',
    groupId: 'grp_climbing_1',
    text: '블록스 성수점 새 벽 세팅 완료! 초보자 환영, 암벽화 대여 가능합니다.',
    pinned: true,
    authorId: 'match_junseo',
    authorName: '준서',
    authorRole: 'leader',
    at: ago(3 * 24 * HOUR)
  }
];

/* 운영진 시드 — 모임장이 지정한 사람만 공지를 쓸 수 있다. */
const GROUP_DEPUTY_SEED = {
  grp_crossfit_1: ['user_kettle'],
  grp_climbing_1: ['match_junseo']
};

/* ===== Sprint 16 — 인스타그램형 24시간 스토리 =====
   11/15 19:05 사용자: "피드는 인스타그램처럼 상단에 이용자들이 스토리를 올릴 수 있도록 하자
   24시간이 지나면 지워지도록".
   · 스토리는 **모임 단위**다(groupId). 그 모임 피드 맨 위 스토리 바에만 나온다.
   · 저장은 남겨도 되지만 **읽을 때 24시간이 지난 것은 절대 보이지 않는다**
     (앱을 다시 열었을 때도 만료된 스토리가 되살아나지 않게 pruneExpiredStories 가 정리한다). */
/* H4 — 모임 나이 제한은 **19~99세 듀얼 레인지 슬라이더**로 고른다(앱의 성인 기준과 같은 아래·위 끝).
 *      양끝(19~99)이면 '제한 없음'이고, 저장은 ageMin·ageMax 두 숫자 + 옛 코드 호환이자 배지용 ageLimit id. */
const GROUP_AGE_MIN = 19;
const GROUP_AGE_MAX = 99;

const STORY_TTL_HOURS = 24;
const STORY_SEED = [
  {
    id: 'story_cf_1',
    groupId: 'grp_crossfit_1',
    authorId: 'leader_jun',
    authorName: '코치준',
    authorAvatarText: '준',
    authorGradient: 'linear-gradient(135deg, #8098D2, #C5CEDC)',
    mediaCaption: '오늘 와드',
    caption: '19:10반 와드 브리핑 짧게 올려요',
    createdAt: ago(2 * HOUR)
  },
  {
    id: 'story_cf_2',
    groupId: 'grp_crossfit_1',
    authorId: 'user_kettle',
    authorName: '케틀벨러버',
    authorAvatarText: '케',
    authorGradient: 'linear-gradient(135deg, #CF9604, #F3700C)',
    mediaCaption: '케틀벨 스윙',
    caption: '오늘 스윙 100개 채웠습니다',
    createdAt: ago(6 * HOUR)
  },
  {
    id: 'story_cf_3',
    groupId: 'grp_crossfit_1',
    authorId: 'user_rookie',
    authorName: '루키',
    authorAvatarText: '루',
    authorGradient: 'linear-gradient(135deg, #0FB57E, #06AE7E)',
    mediaCaption: '오운완',
    caption: '샤워하고 나오는 길, 오늘도 해냈다',
    createdAt: ago(11 * HOUR)
  },
  {
    id: 'story_ft_1',
    groupId: 'grp_fitness_1',
    authorId: 'user_iron',
    authorName: '아이언',
    authorAvatarText: '아',
    authorGradient: 'linear-gradient(135deg, #E1E5EA, #8098D2)',
    mediaCaption: '벤치 100',
    caption: '주말 원정 준비 중',
    createdAt: ago(4 * HOUR)
  },
  {
    id: 'story_cl_1',
    groupId: 'grp_climbing_1',
    authorId: 'match_junseo',
    authorName: '준서',
    authorAvatarText: '준',
    authorGradient: 'linear-gradient(135deg, #15B1F7, #05A1F6)',
    mediaCaption: 'V4 도전',
    caption: '새 벽 세팅 진짜 좋네요',
    createdAt: ago(9 * HOUR)
  },
  {
    /* 24시간이 지난 스토리 — 화면에는 절대 나오지 않는다(만료 검증용) */
    id: 'story_cf_expired',
    groupId: 'grp_crossfit_1',
    authorId: 'user_toe',
    authorName: '오늘의토우',
    authorAvatarText: '오',
    authorGradient: 'linear-gradient(135deg, #C8B6FC, #AB83E9)',
    mediaCaption: '어제 와드',
    caption: '어제 기록 (24시간 지나 사라짐)',
    createdAt: ago(26 * HOUR)
  }
];

/* 모임 내 1:1 대화 정책 시드 — 기본은 허용(true).
   금지 사례를 하나 둬서 OFF 안내가 어떻게 보이는지 홈에서 바로 볼 수 있게 한다. */
const GROUP_DM_SEED = { grp_climbing_1: false };

/* 멤버 아바타의 기본 색조 — 이름을 지어내지 않고, 실제 멤버의 이니셜 원에만 쓴다. */
const GROUP_ROSTER_HOBBIES = [
  { name: '크로스핏', icon: 'dumbbell' }, { name: '러닝', icon: 'run' },
  { name: '클라이밍', icon: 'climb' }, { name: '헬스', icon: 'barbell' },
  { name: '수영', icon: 'swim' }, { name: '보드게임', icon: 'dice' },
  { name: '영화', icon: 'movie' }, { name: '카페', icon: 'cup' },
  { name: '게임', icon: 'gamepad' }, { name: '등산', icon: 'mountain' }
];
const GROUP_ROSTER_GRADIENTS = [
  'linear-gradient(135deg, #16EBA4 0%, #06AE7E 100%)',
  'linear-gradient(135deg, #AFE3FA 0%, #7994E2 100%)',
  'linear-gradient(135deg, #F8B74B 0%, #F3700C 100%)',
  'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)',
  'linear-gradient(135deg, #DFE3E9 0%, #8098D2 100%)'
];

/* Sprint 8 — 실시간 베스트(실베) 2차: 순위 변동 · 내 글 진입 알림 */
const HOT_SNAPSHOT_DEPTH = 20;      // 직전 집계에 남기는 순위 깊이
const HOT_BASELINE_HOURS = 3;       // 첫 화면의 기준선(저장된 집계가 없을 때만)
const HOT_SNAPSHOT_TTL = 10 * MINUTE;  // 직전 집계를 이만큼은 고정(화면을 다시 그린다고 변동이 사라지지 않게)
/* Sprint 9 — 11/15 00:23 사용자 지시("알림은 탑10에 들때 1회")로 5 → 10.
   진입 판정은 화면의 지역·반경 필터와 무관한 **전체 실베** 기준이다. */
const HOT_ENTRY_TOP_N = 10;         // 이 순위 안에 내 글이 들어오면 한 번 알린다

/* ---------------------------------------------------------------------------
 * Sprint 5 — 알림 종류(카테고리) 메타데이터
 * ---------------------------------------------------------------------------
 * 프로필 탭 알림 설정의 '종류별 ON/OFF' 토글이 이 목록으로 그려지고,
 * dispatchNotification() 이 kind → category 를 이 표로 해석해 켜짐/꺼짐을 판단한다.
 * Sprint 6 — 11/14 21:24 사용자 지시("응 쪼개줘")로 3종 → **5종**으로 나눴다.
 *   chat        : 1:1 대화 답장
 *   like        : 내 게시글의 좋아요
 *   comment     : 내 게시글의 댓글
 *   join_request: 내가 모임장인 모임에 가입 신청이 도착
 *   join_result : 내가 낸 가입 신청의 수락/거절 결과
 *   hot         : 내가 쓴 공개 글이 실시간 베스트(실베)에 진입 (Sprint 8)
 * system(테스트 푸시)은 사용자가 끌 수 없는 알림이라 토글이 없다.
 */
const NOTIFICATION_CATEGORIES = [
  {
    id: 'chat',
    label: '1:1 대화',
    icon: 'chat',
    desc: '대화방에 새 메시지가 도착하면 알려드려요',
    kinds: ['chat'],
    tone: 'chat'
  },
  {
    id: 'like',
    label: '좋아요',
    icon: 'heart',
    desc: '내 게시글에 하트가 달리면 알려드려요',
    kinds: ['like'],
    tone: 'like'
  },
  {
    id: 'comment',
    label: '댓글',
    icon: 'comment',
    desc: '내 게시글에 댓글이 달리면 알려드려요',
    kinds: ['comment'],
    tone: 'comment'
  },
  {
    id: 'join_request',
    label: '모임 가입 신청',
    icon: 'users',
    desc: '내 모임에 새 가입 신청서가 도착하면 알려드려요',
    kinds: ['join_request'],
    tone: 'join_request'
  },
  {
    id: 'join_result',
    label: '모임 가입 결과',
    icon: 'checkCircle',
    desc: '내가 낸 가입 신청이 수락·거절되면 알려드려요',
    kinds: ['join_result'],
    tone: 'join_result'
  },
  {
    id: 'hot',
    label: '실베 진입',
    icon: 'fire',
    desc: '내 글이 실베 Top 10에 **새로** 들어오면 한 번 알려드려요 (첫 실행은 조용히 넘어가요)',
    kinds: ['hot_entry'],
    tone: 'hot'
  }
];

/** 알림 kind → 카테고리 id. 표에 없으면 'system'(항상 전달). */
const NOTIFICATION_CATEGORY_OF_KIND = NOTIFICATION_CATEGORIES.reduce((map, c) => {
  c.kinds.forEach((k) => { map[k] = c.id; });
  return map;
}, { system: 'system' });

/* Sprint 6 — 옛 저장 상태(v7 이하)의 3종 카테고리를 5종으로 옮기는 표.
 *   reaction(좋아요·댓글)  → kind 가 comment 면 comment, 아니면 like
 *   membership(신청·결과)   → action 이 join_result 면 join_result, 아니면 join_request
 * 알림 기록 하나를 5종 중 하나로 해석하는 단일 함수가 이 표를 쓴다. */
const LEGACY_CATEGORY_MAP = {
  reaction: { comment: 'comment', like: 'like' },
  membership: { join_result: 'join_result', join_request: 'join_request' }
};

/**
 * 저장된 알림 하나의 5종 카테고리를 확정한다(옛 기록 포함).
 * @param {object} entry notificationLog 항목
 * @returns {string} chat | like | comment | join_request | join_result | system
 */
function resolveNotificationCategory(entry) {
  const e = entry || {};
  const byKind = NOTIFICATION_CATEGORY_OF_KIND[e.kind];
  /* 이미 5종 중 하나로 저장된 기록은 그대로 신뢰한다. */
  if (NOTIFICATION_CATEGORIES.some((c) => c.id === e.category)) {
    /* 단, kind 가 더 구체적이면 kind 를 우선한다(예: category=membership, kind=like). */
    if (byKind && byKind !== 'system') return byKind;
    return e.category;
  }
  if (byKind && byKind !== 'system') return byKind;
  if (e.action === 'join_result') return 'join_result';
  if (e.action === 'join_request') return 'join_request';
  const legacy = LEGACY_CATEGORY_MAP[e.category];
  if (legacy) return legacy[e.kind] || legacy[e.action] || Object.values(legacy)[0];
  return 'system';
}

/**
 * 알림 하나를 남긴 사람의 이름을 알아낸다 (Sprint 10 — 묶음 펼쳐보기).
 *  · 새 알림은 dispatchNotification 이 actorName 을 남기지만, 옛 저장 상태의 알림은 없다.
 *    그때는 문장에서 해석한다: '준호님이 내 글에…' / '도현: 좋은 글이에요' / 대화 알림은 title.
 * @param {object} entry notificationLog 항목
 * @returns {string|null}
 */
function resolveNotificationActor(entry) {
  const e = entry || {};
  if (e.actorName) return String(e.actorName).slice(0, 20);
  const body = String(e.body || '');
  const cat = resolveNotificationCategory(e);
  if (cat === 'chat') return e.title ? String(e.title).slice(0, 20) : null;
  const named = body.match(/^(.{1,20}?)님이/);
  if (named) return named[1];
  const colon = body.match(/^([^:]{1,20}):\s/);
  if (colon) return colon[1].trim();
  return null;
}

/* ---------------------------------------------------------------------------
 * Sprint 7 — 지역(생활권) 축
 * ---------------------------------------------------------------------------
 * 11/14 22:24 사용자 지시: "이반시티마냥 지역별로 게시글 및 사람을 확인 할 수 있으면 좋을거같아".
 *
 * · 모든 사람(matchProfile·partnerProfile) · 모임 · 글에 `regionId` 를 둔다.
 * · 시드 데이터는 `location` 한 문장만 적어도 아래 keywords 로 생활권이 해석된다
 *   (`applyRegionIds()` 가 부팅·마이그레이션 때 한 번 정리).
 * · 지역은 '실제 생활권' 기준이다 — 행정구 하나가 아니라 사람들이 발로 묶는 동네
 *   (성동·동작의 성수/왕십리, 성동·건대의 성수/건대 …).
 * ------------------------------------------------------------------------- */
/* Sprint 25 — 지역 카테고리(2단) — 이반시티 '우리동네'와 **똑같은** 체계
 * ---------------------------------------------------------------------------
 * 11/17 01:05 사용자 지시: "탐색탭의 필터안에 취미는 없애고 이반시티 우리동네
 * 지역으로 넣으면 될거같아. 베어도 포함해서" · "선택 하는것또한 똑같으
 * 왼쪽에서 오른쪽으로 터치하도록".
 *
 *  · 큰 분류(EXPLORE_REGION_GROUPS) 9개: 서울 · 경기 · 강원 · 충청 · 전라 ·
 *    경상 · 제주 · 해외 · 베어  (이반시티 우리동네와 같은 순서)
 *  · 서울 12권역 · 경기 14권역 · 강원 5 · 충청 6 · 전라 4 · 경상 5 로 나뉘고,
 *    제주·해외·베어는 하위 권역 없이 큰 분류 하나가 곧 동네다.
 *  · 사람·모임·글은 **권역 id** 하나를 갖는다(regionId). 큰 분류는 그 권역의 groupId 다.
 *  · '전체'와 '내 주변'은 화면 전용 조건이다 — 데이터에는 저장하지 않는다.
 *  · 옛 생활권 id(gwanak·gangnam·mapo …)와 Sprint 23 의 서울 7동네 id 는
 *    REGION_ALIASES 로 지금 권역에 이어 붙인다(저장 상태 마이그레이션 안전).
 * ------------------------------------------------------------------------- */
const EXPLORE_REGION_GROUPS = [
  { id: 'seoul', name: '서울', short: '서울', icon: 'building', label: '종로·중구 · 마포·용산 · 서초·강남 …' },
  { id: 'gyeonggi', name: '경기', short: '경기', icon: 'train', label: '수원·용인 · 성남·광주 · 고양·파주 …' },
  { id: 'gangwon', name: '강원', short: '강원', icon: 'tent', label: '춘천 · 원주 · 속초 · 강릉' },
  { id: 'chungcheong', name: '충청', short: '충청', icon: 'leaf', label: '대전 · 세종 · 천안·아산 · 청주' },
  { id: 'jeolla', name: '전라', short: '전라', icon: 'tree', label: '광주 · 전주 · 전남 · 전북' },
  { id: 'gyeongsang', name: '경상', short: '경상', icon: 'compass', label: '부산 · 대구 · 울산 · 경남 · 경북' },
  { id: 'jeju', name: '제주', short: '제주', icon: 'palette', label: '제주시 · 서귀포' },
  { id: 'overseas', name: '해외', short: '해외', icon: 'globe', label: '일본 · 미국 · 유럽 · 유학' },
  { id: 'bear', name: '베어', short: '베어', icon: 'paw', label: '베어 커뮤니티' }
];

const EXPLORE_REGIONS = [
  /* ------------------------------------------------ 서울 12권역 */
  {
    id: 'seoul-jongno-junggu', groupId: 'seoul', name: '종로.중구', short: '종로', icon: 'temple',
    label: '종로 · 을지로 · 광화문 · 명동 · 충무로 · 시청',
    keywords: ['종로', '중구', '을지로', '광화문', '명동', '충무로', '시청', '청계', '남대문', '회현', '서울역']
  },
  {
    id: 'seoul-dongdaemun-seongbuk', groupId: 'seoul', name: '동대문.성북', short: '동대문', icon: 'building',
    label: '동대문 · 성북 · 장안 · 길음 · 정릉 · 안암',
    keywords: ['동대문', '성북', '장안', '전농', '답십리', '휘경', '이문', '석관', '안암', '종암', '길음', '정릉', '월곡', '돈암']
  },
  {
    id: 'seoul-mapo-yongsan', groupId: 'seoul', name: '마포.용산', short: '마포', icon: 'palette',
    label: '마포 · 용산 · 홍대 · 합정 · 이태원 · 한남',
    keywords: ['마포', '용산', '홍대', '합정', '연남', '상수', '공덕', '서교', '망원', '신촌', '이대', '이태원', '한남', '경리단', '이촌', '삼각지', '남영', '노고산']
  },
  {
    id: 'seoul-seodaemun-eunpyeong', groupId: 'seoul', name: '서대문.은평', short: '서대문', icon: 'home',
    label: '서대문 · 은평 · 연희 · 홍제 · 불광 · 연신내',
    keywords: ['서대문', '은평', '연희', '홍제', '홍은', '북가좌', '남가좌', '응암', '불광', '연신내', '갈현', '녹번', '무악']
  },
  {
    id: 'seoul-seongdong-gwangjin', groupId: 'seoul', name: '성동.광진', short: '성동', icon: 'leaf',
    label: '성수 · 뚝섬 · 왕십리 · 건대 · 자양 · 구의',
    keywords: ['성동', '광진', '성수', '뚝섬', '왕십리', '건대', '자양', '구의', '화양', '응봉', '금호', '옥수', '서울숲']
  },
  {
    id: 'seoul-gangbuk-dobong', groupId: 'seoul', name: '강북.도봉', short: '강북', icon: 'tree',
    label: '수유 · 미아 · 번동 · 쌍문 · 방학 · 창동',
    keywords: ['강북', '도봉', '수유', '미아', '번동', '쌍문', '방학', '창동', '우이']
  },
  {
    id: 'seoul-nowon-jungnang', groupId: 'seoul', name: '노원.중랑', short: '노원', icon: 'home',
    label: '노원 · 상계 · 중랑 · 면목 · 공릉 · 신내',
    keywords: ['노원', '중랑', '상계', '중계', '하계', '공릉', '월계', '면목', '상봉', '묵동', '신내', '먹골']
  },
  {
    id: 'seoul-seocho-gangnam', groupId: 'seoul', name: '서초.강남', short: '강남', icon: 'building',
    label: '강남 · 역삼 · 서초 · 신논현 · 청담 · 양재',
    keywords: ['서초', '강남', '역삼', '선릉', '신논현', '양재', '청담', '논현', '교대', '삼성', '반포', '방배', '압구정', '신사', '도곡', '대치', '학동']
  },
  {
    id: 'seoul-gangdong-songpa', groupId: 'seoul', name: '강동.송파', short: '강동', icon: 'riverside',
    label: '강동 · 천호 · 송파 · 잠실 · 문정 · 가락',
    keywords: ['강동', '송파', '천호', '잠실', '가락', '문정', '석촌', '방이', '강일', '둔촌', '성내', '풍납']
  },
  {
    id: 'seoul-gangseo-yangcheon', groupId: 'seoul', name: '강서.양천', short: '강서', icon: 'riverside',
    label: '강서 · 양천 · 마곡 · 화곡 · 목동 · 신월',
    keywords: ['강서', '양천', '마곡', '화곡', '등촌', '발산', '가양', '목동', '신월', '신정', '염창']
  },
  {
    id: 'seoul-dongjak-gwanak', groupId: 'seoul', name: '동작.관악', short: '동작', icon: 'tree',
    label: '신림 · 봉천 · 낙성대 · 사당 · 노량진 · 흑석',
    keywords: ['동작', '관악', '신림', '봉천', '낙성대', '서울대입구', '사당', '보라매', '흑석', '신대방', '상도', '노량진', '대방', '남성', '이수']
  },
  {
    id: 'seoul-yeongdeungpo-guro-geumcheon', groupId: 'seoul', name: '영등포.구로.금천', short: '영등포', icon: 'building',
    label: '영등포 · 여의도 · 구로 · 금천 · 신도림 · 가산',
    keywords: ['영등포', '구로', '금천', '여의도', '당산', '신도림', '문래', '가산', '독산', '대림', '화곡동', '구디']
  },
  /* ------------------------------------------------ 경기 14권역 (인천 포함) */
  {
    id: 'gyeonggi-incheon-bucheon-gimpo', groupId: 'gyeonggi', name: '인천.부천.김포', short: '인천', icon: 'bridge',
    label: '인천 · 송도 · 부평 · 부천 · 김포',
    keywords: ['인천', '부천', '김포', '송도', '부평', '구월', '남동', '검단', '계양', '원미', '상동', '장기동']
  },
  {
    id: 'gyeonggi-suwon-yongin-uiwang', groupId: 'gyeonggi', name: '수원.용인.의왕', short: '수원', icon: 'train',
    label: '수원 · 영통 · 광교 · 용인 · 수지 · 의왕',
    keywords: ['수원', '용인', '의왕', '영통', '광교', '팔달', '권선', '기흥', '수지', '처인']
  },
  {
    id: 'gyeonggi-goyang-paju', groupId: 'gyeonggi', name: '고양.파주', short: '고양', icon: 'tree',
    label: '일산 · 고양 · 파주 · 운정 · 킨텍스',
    keywords: ['고양', '파주', '일산', '킨텍스', '운정', '금촌', '화정', '백석', '주엽', '탄현']
  },
  {
    id: 'gyeonggi-ansan-siheung-gwangmyeong', groupId: 'gyeonggi', name: '안산.시흥.광명', short: '안산', icon: 'building',
    label: '안산 · 시흥 · 광명 · 배곧 · 정왕 · 철산',
    keywords: ['안산', '시흥', '광명', '단원', '상록', '배곧', '정왕', '철산', '하안', '오이도']
  },
  {
    id: 'gyeonggi-seongnam-gwangju', groupId: 'gyeonggi', name: '성남.광주', short: '성남', icon: 'building',
    label: '분당 · 판교 · 성남 · 광주 · 위례 · 모란',
    keywords: ['성남', '광주', '분당', '판교', '정자', '서현', '위례', '모란', '야탑', '경안', '곤지암', '오포']
  },
  {
    id: 'gyeonggi-anyang-gunpo-gwacheon', groupId: 'gyeonggi', name: '안양.군포.과천', short: '안양', icon: 'train',
    label: '안양 · 범계 · 평촌 · 군포 · 과천',
    keywords: ['안양', '군포', '과천', '범계', '평촌', '산본', '인덕원', '동안', '만안']
  },
  {
    id: 'gyeonggi-hwaseong-osan', groupId: 'gyeonggi', name: '화성.오산', short: '화성', icon: 'tree',
    label: '동탄 · 병점 · 화성 · 오산 · 향남',
    keywords: ['화성', '오산', '동탄', '병점', '향남', '봉담', '세교']
  },
  {
    id: 'gyeonggi-pyeongtaek-anseong', groupId: 'gyeonggi', name: '평택.안성', short: '평택', icon: 'train',
    label: '평택 · 송탄 · 안성 · 공도',
    keywords: ['평택', '안성', '송탄', '고덕', '공도', '비전']
  },
  {
    id: 'gyeonggi-guri-hanam-namyangju', groupId: 'gyeonggi', name: '구리.하남.남양주', short: '남양주', icon: 'riverside',
    label: '구리 · 하남 · 미사 · 남양주 · 다산 · 별내',
    keywords: ['구리', '하남', '남양주', '미사', '다산', '별내', '교산', '덕소', '와부', '진접', '오남', '호평']
  },
  {
    id: 'gyeonggi-uijeongbu-yangju-dongducheon', groupId: 'gyeonggi', name: '의정부.양주.동두천', short: '의정부', icon: 'tree',
    label: '의정부 · 양주 · 동두천 · 회룡 · 덕정',
    keywords: ['의정부', '양주', '동두천', '회룡', '호원', '덕정', '보산', '소요']
  },
  {
    id: 'gyeonggi-yeoju-icheon', groupId: 'gyeonggi', name: '여주.이천', short: '이천', icon: 'leaf',
    label: '여주 · 이천 · 부발 · 장호원',
    keywords: ['여주', '이천', '부발', '장호원']
  },
  {
    id: 'gyeonggi-pocheon-yeoncheon', groupId: 'gyeonggi', name: '포천.연천', short: '포천', icon: 'mountain',
    label: '포천 · 연천 · 소흘 · 송우',
    keywords: ['포천', '연천', '소흘', '송우']
  },
  {
    id: 'gyeonggi-yangpyeong-gapyeong', groupId: 'gyeonggi', name: '양평.가평', short: '가평', icon: 'tent',
    label: '양평 · 가평 · 청평 · 남이섬',
    keywords: ['양평', '가평', '청평', '남이섬', '용문', '양서']
  },
  {
    id: 'gyeonggi-etc', groupId: 'gyeonggi', name: '기타', short: '경기', icon: 'map',
    label: '그 밖의 경기',
    keywords: ['경기']
  },
  /* ------------------------------------------------ 강원 5권역 */
  {
    id: 'gangwon-chuncheon', groupId: 'gangwon', name: '춘천', short: '춘천', icon: 'tree',
    label: '춘천 · 강촌', keywords: ['춘천', '강촌']
  },
  {
    id: 'gangwon-wonju', groupId: 'gangwon', name: '원주', short: '원주', icon: 'building',
    label: '원주 · 혁신도시 · 무실', keywords: ['원주', '혁신도시', '무실']
  },
  {
    id: 'gangwon-sokcho', groupId: 'gangwon', name: '속초', short: '속초', icon: 'riverside',
    label: '속초 · 설악 · 청호', keywords: ['속초', '설악', '청호']
  },
  {
    id: 'gangwon-gangneung', groupId: 'gangwon', name: '강릉', short: '강릉', icon: 'sunrise',
    label: '강릉 · 경포 · 안목', keywords: ['강릉', '경포', '안목']
  },
  {
    id: 'gangwon-etc', groupId: 'gangwon', name: '강원', short: '강원', icon: 'mountain',
    label: '그 밖의 강원', keywords: ['강원']
  },
  /* ------------------------------------------------ 충청 6권역 */
  {
    id: 'chungcheong-daejeon', groupId: 'chungcheong', name: '대전', short: '대전', icon: 'building',
    label: '대전 · 둔산 · 유성 · 대전역', keywords: ['대전', '둔산', '유성', '은행동']
  },
  {
    id: 'chungcheong-sejong', groupId: 'chungcheong', name: '세종', short: '세종', icon: 'building',
    label: '세종 · 나성 · 조치원', keywords: ['세종', '나성', '조치원']
  },
  {
    id: 'chungcheong-cheonan-asan', groupId: 'chungcheong', name: '천안.아산', short: '천안', icon: 'train',
    label: '천안 · 아산 · 불당 · 배방 · 신창',
    keywords: ['천안', '아산', '불당', '배방', '신창', '쌍용']
  },
  {
    id: 'chungcheong-cheongju', groupId: 'chungcheong', name: '청주', short: '청주', icon: 'building',
    label: '청주 · 사창 · 성안길 · 오창', keywords: ['청주', '사창', '성안길', '오창']
  },
  {
    id: 'chungcheong-chungbuk', groupId: 'chungcheong', name: '충북', short: '충북', icon: 'leaf',
    label: '충주 · 제천 · 음성', keywords: ['충북', '충주', '제천', '음성']
  },
  {
    id: 'chungcheong-chungnam', groupId: 'chungcheong', name: '충남', short: '충남', icon: 'leaf',
    label: '공주 · 보령 · 서산 · 논산', keywords: ['충남', '공주', '보령', '서산', '논산', '당진']
  },
  /* ------------------------------------------------ 전라 4권역 */
  {
    id: 'jeolla-gwangju', groupId: 'jeolla', name: '광주', short: '광주', icon: 'palette',
    label: '광주 · 충장로 · 상무지구 · 첨단', keywords: ['광주', '충장로', '상무지구', '첨단']
  },
  {
    id: 'jeolla-jeonju', groupId: 'jeolla', name: '전주', short: '전주', icon: 'home',
    label: '전주 · 한옥마을 · 객사', keywords: ['전주', '한옥마을', '객사', '덕진']
  },
  {
    id: 'jeolla-jeonnam', groupId: 'jeolla', name: '전남', short: '전남', icon: 'riverside',
    label: '순천 · 목포 · 여수', keywords: ['전남', '순천', '목포', '여수']
  },
  {
    id: 'jeolla-jeonbuk', groupId: 'jeolla', name: '전북', short: '전북', icon: 'leaf',
    label: '익산 · 군산 · 정읍', keywords: ['전북', '익산', '군산', '정읍']
  },
  /* ------------------------------------------------ 경상 5권역 */
  {
    id: 'gyeongsang-busan', groupId: 'gyeongsang', name: '부산', short: '부산', icon: 'riverside',
    label: '서면 · 해운대 · 광안리 · 부산대', keywords: ['부산', '서면', '해운대', '광안리', '부산대']
  },
  {
    id: 'gyeongsang-daegu', groupId: 'gyeongsang', name: '대구', short: '대구', icon: 'building',
    label: '동성로 · 수성 · 범어 · 성서', keywords: ['대구', '동성로', '수성', '범어', '성서']
  },
  {
    id: 'gyeongsang-ulsan', groupId: 'gyeongsang', name: '울산', short: '울산', icon: 'building',
    label: '울산 · 삼산 · 성남동', keywords: ['울산', '삼산', '성남동']
  },
  {
    id: 'gyeongsang-gyeongnam', groupId: 'gyeongsang', name: '경남', short: '경남', icon: 'train',
    label: '창원 · 김해 · 진주', keywords: ['경남', '창원', '김해', '진주', '양산']
  },
  {
    id: 'gyeongsang-gyeongbuk', groupId: 'gyeongsang', name: '경북', short: '경북', icon: 'tree',
    label: '포항 · 구미 · 경주', keywords: ['경북', '포항', '구미', '경주', '안동']
  },
  /* ------------------------------------------------ 한 곳뿐인 지역 (하위 권역 없음) */
  {
    id: 'jeju', groupId: 'jeju', name: '제주', short: '제주', icon: 'palette',
    label: '제주시 · 서귀포 · 애월 · 성산', keywords: ['제주', '서귀포', '애월', '성산', '한림']
  },
  {
    id: 'overseas', groupId: 'overseas', name: '해외', short: '해외', icon: 'globe',
    label: '일본 · 미국 · 유럽 · 유학',
    keywords: ['해외', '일본', '도쿄', '오사카', '미국', '뉴욕', 'LA', '유럽', '호주', '중국', '태국', '베트남', '대만', '유학', '밴쿠버', '전국', '디스코드', '온라인']
  },
  {
    id: 'bear', groupId: 'bear', name: '베어', short: '베어', icon: 'paw',
    label: '베어 커뮤니티 · 곰', keywords: ['베어', '곰돌', '곰']
  }
];

/**
 * 옛 지역 id → 지금 권역 id (저장 상태를 버리지 않고 이어 붙인다).
 *  · 9생활권(gwanak·gangnam·mapo·yongsan·jongno·seongdong·yeongdeungpo)
 *  · Sprint 23 의 2단 분류(서울 7동네 + 지역 12)
 *  · 옛 '전국·온라인'은 해외로 모은다.
 */
const REGION_ALIASES = {
  /* 9생활권 */
  gwanak: 'seoul-dongjak-gwanak',
  gangnam: 'seoul-seocho-gangnam',
  mapo: 'seoul-mapo-yongsan',
  yongsan: 'seoul-mapo-yongsan',
  jongno: 'seoul-jongno-junggu',
  seongdong: 'seoul-seongdong-gwangjin',
  yeongdeungpo: 'seoul-yeongdeungpo-guro-geumcheon',
  /* Sprint 23 — 서울 7동네 */
  'seoul-seongsu': 'seoul-dongjak-gwanak',
  'seoul-gangnam': 'seoul-seocho-gangnam',
  'seoul-hongdae': 'seoul-mapo-yongsan',
  'seoul-jongno': 'seoul-jongno-junggu',
  'seoul-gangdong': 'seoul-gangdong-songpa',
  'seoul-yeongdeungpo': 'seoul-yeongdeungpo-guro-geumcheon',
  'seoul-nowon': 'seoul-nowon-jungnang',
  /* Sprint 23 — 지역 12 (지금은 큰 분류 안의 권역으로) */
  incheon: 'gyeonggi-incheon-bucheon-gimpo',
  busan: 'gyeongsang-busan',
  daegu: 'gyeongsang-daegu',
  daejeon: 'chungcheong-daejeon',
  gwangju: 'jeolla-gwangju',
  'ulsan-sejong': 'gyeongsang-ulsan',
  chungcheong: 'chungcheong-chungnam',
  jeolla: 'jeolla-jeonnam',
  gyeongsang: 'gyeongsang-gyeongnam',
  online: 'overseas'
};

/** 내 주변 — 기본 5km 안. (반경 필터를 직접 고르면 그 값이 우선한다) */
const NEARBY_KM = 5;

/** Sprint 24 — 탐색에 올린 내 프로필의 수명(2시간)과 앨범 한 종류의 최대 장수(4장). */
const EXPLORE_PUBLISH_HOURS = 2;
const ALBUM_MAX = 4;

/* ---------------------------------------------------------------------------
 * Sprint 26.5 — 앨범 사진 업로드 스펙 (11/17 사용자: "일단은 720으로하자 추후 화질은 높일거야")
 * -------------------------------------------------------------------------
 * 화질을 올릴 때는 **아래 두 값만** 바꾼다. 앱(app.js)도 서버 경계(api.js)도 이 값을 읽는다.
 *   · maxDimension — 긴 변 기준 최대 픽셀. 1440으로 올리면 저장 용량이 약 4배가 된다.
 *   · jpegQuality  — 0~1. 0.9 이상은 눈에 잘 띄지 않고 용량만 는다.
 * ------------------------------------------------------------------------- */
const ALBUM_MAX_DIMENSION = 720;
const ALBUM_JPEG_QUALITY = 0.84;   // 720px · 저장 용량 보호(localStorage 4장×2종)
const ALBUM_UPLOAD_SPEC = { maxDimension: ALBUM_MAX_DIMENSION, jpegQuality: ALBUM_JPEG_QUALITY, max: ALBUM_MAX };

/** 만남 스타일 — 글을 올릴 때 하나 고르면 카드에 그대로 붙는다(선택). */
const EXPLORE_MEET_STYLES = [
  { id: 'now', name: '지금 번개', icon: 'sparkle', desc: '바로 만나요' },
  { id: 'drink', name: '술번개', icon: 'wine', desc: '한잔하면서' },
  { id: 'comfortable', name: '편한 만남', icon: 'chat', desc: '부담 없이' },
  { id: 'dm', name: '1:1 대화', icon: 'send', desc: '둘이서 이야기' }
];

/* ---------------------------------------------------------------------------
 * Sprint 32.5 — '아지트' : 모임이 만나는 곳을 고르는 목록
 * -------------------------------------------------------------------------
 * 11/21 16:41 루키 님 지시(#21060, 네이버 카페 참고):
 *  "활동 지역을 자유롭게 적게 하면 집 주소까지 적히고, 가까운 모임을 찾기도 어렵다.
 *   사생활을 지키면서 가까운 모임을 찾을 수 있게 '아지트'로 고르게 하자."
 *  · 큰 분류(구·권역, 기존 지역 분류 그대로) → 그 안의 **지하철역 · 대학교 · 랜드마크 · 동네**.
 *  · 모임은 아지트를 하나 고르고, 찾는 사람은 아지트로 가까운 모임을 거른다.
 *  · 좌표·집 주소는 받지 않는다. 이름만 고른다(사생활 보호).
 * ------------------------------------------------------------------------- */
/* ==== GEO DATA BEGIN (tools/gen_geo_data.py 가 data/*.json 에서 만든 내장본 — 손으로 고치지 말 것) ==== */
/* 시·도 17곳 · 시·군·구 229곳 · 아지트 150곳 — data/regions.json · data/hangouts.json 과 같은 내용 */
const GEO_REGIONS = {"version":2,"updatedAt":"2026-11-21","sido":[{"id":"seoul","name":"서울특별시","short":"서울","lat":37.566,"lng":126.978,"sigungu":[{"id":"seoul-jongno","name":"종로구","regionId":"seoul-jongno-junggu","lat":37.573,"lng":126.979},{"id":"seoul-jung","name":"중구","regionId":"seoul-jongno-junggu","lat":37.564,"lng":126.998},{"id":"seoul-yongsan","name":"용산구","regionId":"seoul-mapo-yongsan","lat":37.532,"lng":126.99},{"id":"seoul-seongdong","name":"성동구","regionId":"seoul-seongdong-gwangjin","lat":37.563,"lng":127.037},{"id":"seoul-gwangjin","name":"광진구","regionId":"seoul-seongdong-gwangjin","lat":37.538,"lng":127.082},{"id":"seoul-dongdaemun","name":"동대문구","regionId":"seoul-dongdaemun-seongbuk","lat":37.574,"lng":127.04},{"id":"seoul-jungnang","name":"중랑구","regionId":"seoul-nowon-jungnang","lat":37.606,"lng":127.093},{"id":"seoul-seongbuk","name":"성북구","regionId":"seoul-dongdaemun-seongbuk","lat":37.589,"lng":127.017},{"id":"seoul-gangbuk","name":"강북구","regionId":"seoul-gangbuk-dobong","lat":37.64,"lng":127.026},{"id":"seoul-dobong","name":"도봉구","regionId":"seoul-gangbuk-dobong","lat":37.669,"lng":127.047},{"id":"seoul-nowon","name":"노원구","regionId":"seoul-nowon-jungnang","lat":37.654,"lng":127.057},{"id":"seoul-eunpyeong","name":"은평구","regionId":"seoul-seodaemun-eunpyeong","lat":37.603,"lng":126.929},{"id":"seoul-seodaemun","name":"서대문구","regionId":"seoul-seodaemun-eunpyeong","lat":37.579,"lng":126.937},{"id":"seoul-mapo","name":"마포구","regionId":"seoul-mapo-yongsan","lat":37.566,"lng":126.902},{"id":"seoul-yangcheon","name":"양천구","regionId":"seoul-gangseo-yangcheon","lat":37.517,"lng":126.866},{"id":"seoul-gangseo","name":"강서구","regionId":"seoul-gangseo-yangcheon","lat":37.551,"lng":126.85},{"id":"seoul-guro","name":"구로구","regionId":"seoul-yeongdeungpo-guro-geumcheon","lat":37.495,"lng":126.887},{"id":"seoul-geumcheon","name":"금천구","regionId":"seoul-yeongdeungpo-guro-geumcheon","lat":37.457,"lng":126.895},{"id":"seoul-yeongdeungpo","name":"영등포구","regionId":"seoul-yeongdeungpo-guro-geumcheon","lat":37.526,"lng":126.896},{"id":"seoul-dongjak","name":"동작구","regionId":"seoul-dongjak-gwanak","lat":37.512,"lng":126.939},{"id":"seoul-seocho","name":"서초구","regionId":"seoul-seocho-gangnam","lat":37.484,"lng":127.032},{"id":"seoul-gangnam","name":"강남구","regionId":"seoul-seocho-gangnam","lat":37.517,"lng":127.047},{"id":"seoul-songpa","name":"송파구","regionId":"seoul-gangdong-songpa","lat":37.514,"lng":127.106},{"id":"seoul-gangdong","name":"강동구","regionId":"seoul-gangdong-songpa","lat":37.53,"lng":127.124}]},{"id":"busan","name":"부산광역시","short":"부산","lat":35.18,"lng":129.076,"sigungu":[{"id":"busan-jung","name":"중구","regionId":"gyeongsang-busan"},{"id":"busan-seo","name":"서구","regionId":"gyeongsang-busan"},{"id":"busan-dong","name":"동구","regionId":"gyeongsang-busan"},{"id":"busan-yeongdo","name":"영도구","regionId":"gyeongsang-busan"},{"id":"busan-busanjin","name":"부산진구","regionId":"gyeongsang-busan"},{"id":"busan-dongnae","name":"동래구","regionId":"gyeongsang-busan"},{"id":"busan-nam","name":"남구","regionId":"gyeongsang-busan"},{"id":"busan-buk","name":"북구","regionId":"gyeongsang-busan"},{"id":"busan-haeundae","name":"해운대구","regionId":"gyeongsang-busan"},{"id":"busan-saha","name":"사하구","regionId":"gyeongsang-busan"},{"id":"busan-geumjeong","name":"금정구","regionId":"gyeongsang-busan"},{"id":"busan-gangseo","name":"강서구","regionId":"gyeongsang-busan"},{"id":"busan-yeonje","name":"연제구","regionId":"gyeongsang-busan"},{"id":"busan-suyeong","name":"수영구","regionId":"gyeongsang-busan"},{"id":"busan-sasang","name":"사상구","regionId":"gyeongsang-busan"},{"id":"busan-gijang","name":"기장군","regionId":"gyeongsang-busan"}]},{"id":"daegu","name":"대구광역시","short":"대구","lat":35.871,"lng":128.601,"sigungu":[{"id":"daegu-jung","name":"중구","regionId":"gyeongsang-daegu"},{"id":"daegu-dong","name":"동구","regionId":"gyeongsang-daegu"},{"id":"daegu-seo","name":"서구","regionId":"gyeongsang-daegu"},{"id":"daegu-nam","name":"남구","regionId":"gyeongsang-daegu"},{"id":"daegu-buk","name":"북구","regionId":"gyeongsang-daegu"},{"id":"daegu-suseong","name":"수성구","regionId":"gyeongsang-daegu"},{"id":"daegu-dalseo","name":"달서구","regionId":"gyeongsang-daegu"},{"id":"daegu-dalseong","name":"달성군","regionId":"gyeongsang-daegu"},{"id":"daegu-gunwi","name":"군위군","regionId":"gyeongsang-daegu"}]},{"id":"incheon","name":"인천광역시","short":"인천","lat":37.456,"lng":126.705,"sigungu":[{"id":"incheon-jung","name":"중구","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.474,"lng":126.621},{"id":"incheon-dong","name":"동구","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.474,"lng":126.643},{"id":"incheon-michuhol","name":"미추홀구","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.464,"lng":126.65},{"id":"incheon-yeonsu","name":"연수구","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.418,"lng":126.664},{"id":"incheon-namdong","name":"남동구","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.42,"lng":126.72},{"id":"incheon-bupyeong","name":"부평구","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.507,"lng":126.722},{"id":"incheon-gyeyang","name":"계양구","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.537,"lng":126.738},{"id":"incheon-seo","name":"서구","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.545,"lng":126.676},{"id":"incheon-ganghwa","name":"강화군","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.746,"lng":126.488},{"id":"incheon-ongjin","name":"옹진군","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.447,"lng":126.637}]},{"id":"gwangju","name":"광주광역시","short":"광주","lat":35.16,"lng":126.853,"sigungu":[{"id":"gwangju-dong","name":"동구","regionId":"jeolla-gwangju"},{"id":"gwangju-seo","name":"서구","regionId":"jeolla-gwangju"},{"id":"gwangju-nam","name":"남구","regionId":"jeolla-gwangju"},{"id":"gwangju-buk","name":"북구","regionId":"jeolla-gwangju"},{"id":"gwangju-gwangsan","name":"광산구","regionId":"jeolla-gwangju"}]},{"id":"daejeon","name":"대전광역시","short":"대전","lat":36.35,"lng":127.385,"sigungu":[{"id":"daejeon-dong","name":"동구","regionId":"chungcheong-daejeon"},{"id":"daejeon-jung","name":"중구","regionId":"chungcheong-daejeon"},{"id":"daejeon-seo","name":"서구","regionId":"chungcheong-daejeon"},{"id":"daejeon-yuseong","name":"유성구","regionId":"chungcheong-daejeon"},{"id":"daejeon-daedeok","name":"대덕구","regionId":"chungcheong-daejeon"}]},{"id":"ulsan","name":"울산광역시","short":"울산","lat":35.538,"lng":129.311,"sigungu":[{"id":"ulsan-jung","name":"중구","regionId":"gyeongsang-ulsan"},{"id":"ulsan-nam","name":"남구","regionId":"gyeongsang-ulsan"},{"id":"ulsan-dong","name":"동구","regionId":"gyeongsang-ulsan"},{"id":"ulsan-buk","name":"북구","regionId":"gyeongsang-ulsan"},{"id":"ulsan-ulju","name":"울주군","regionId":"gyeongsang-ulsan"}]},{"id":"sejong","name":"세종특별자치시","short":"세종","lat":36.48,"lng":127.289,"sigungu":[{"id":"sejong-sejong","name":"세종시","regionId":"chungcheong-sejong"}]},{"id":"gyeonggi","name":"경기도","short":"경기","lat":37.264,"lng":127.029,"sigungu":[{"id":"gyeonggi-suwon","name":"수원시","regionId":"gyeonggi-suwon-yongin-uiwang","lat":37.264,"lng":127.029},{"id":"gyeonggi-seongnam","name":"성남시","regionId":"gyeonggi-seongnam-gwangju","lat":37.42,"lng":127.126},{"id":"gyeonggi-uijeongbu","name":"의정부시","regionId":"gyeonggi-uijeongbu-yangju-dongducheon","lat":37.738,"lng":127.034},{"id":"gyeonggi-anyang","name":"안양시","regionId":"gyeonggi-anyang-gunpo-gwacheon","lat":37.392,"lng":126.927},{"id":"gyeonggi-bucheon","name":"부천시","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.503,"lng":126.766},{"id":"gyeonggi-gwangmyeong","name":"광명시","regionId":"gyeonggi-ansan-siheung-gwangmyeong","lat":37.479,"lng":126.865},{"id":"gyeonggi-pyeongtaek","name":"평택시","regionId":"gyeonggi-pyeongtaek-anseong","lat":36.992,"lng":127.113},{"id":"gyeonggi-dongducheon","name":"동두천시","regionId":"gyeonggi-uijeongbu-yangju-dongducheon","lat":37.904,"lng":127.061},{"id":"gyeonggi-ansan","name":"안산시","regionId":"gyeonggi-ansan-siheung-gwangmyeong","lat":37.322,"lng":126.831},{"id":"gyeonggi-goyang","name":"고양시","regionId":"gyeonggi-goyang-paju","lat":37.658,"lng":126.832},{"id":"gyeonggi-gwacheon","name":"과천시","regionId":"gyeonggi-anyang-gunpo-gwacheon","lat":37.429,"lng":126.988},{"id":"gyeonggi-guri","name":"구리시","regionId":"gyeonggi-guri-hanam-namyangju","lat":37.594,"lng":127.13},{"id":"gyeonggi-namyangju","name":"남양주시","regionId":"gyeonggi-guri-hanam-namyangju","lat":37.636,"lng":127.216},{"id":"gyeonggi-osan","name":"오산시","regionId":"gyeonggi-hwaseong-osan","lat":37.152,"lng":127.07},{"id":"gyeonggi-siheung","name":"시흥시","regionId":"gyeonggi-ansan-siheung-gwangmyeong","lat":37.38,"lng":126.803},{"id":"gyeonggi-gunpo","name":"군포시","regionId":"gyeonggi-anyang-gunpo-gwacheon","lat":37.362,"lng":126.935},{"id":"gyeonggi-uiwang","name":"의왕시","regionId":"gyeonggi-suwon-yongin-uiwang","lat":37.345,"lng":126.968},{"id":"gyeonggi-hanam","name":"하남시","regionId":"gyeonggi-guri-hanam-namyangju","lat":37.539,"lng":127.215},{"id":"gyeonggi-yongin","name":"용인시","regionId":"gyeonggi-suwon-yongin-uiwang","lat":37.241,"lng":127.178},{"id":"gyeonggi-paju","name":"파주시","regionId":"gyeonggi-goyang-paju","lat":37.76,"lng":126.78},{"id":"gyeonggi-icheon","name":"이천시","regionId":"gyeonggi-yeoju-icheon","lat":37.272,"lng":127.435},{"id":"gyeonggi-anseong","name":"안성시","regionId":"gyeonggi-pyeongtaek-anseong","lat":37.008,"lng":127.28},{"id":"gyeonggi-gimpo","name":"김포시","regionId":"gyeonggi-incheon-bucheon-gimpo","lat":37.615,"lng":126.716},{"id":"gyeonggi-hwaseong","name":"화성시","regionId":"gyeonggi-hwaseong-osan","lat":37.2,"lng":126.831},{"id":"gyeonggi-gwangju","name":"광주시","regionId":"gyeonggi-seongnam-gwangju","lat":37.429,"lng":127.255},{"id":"gyeonggi-yangju","name":"양주시","regionId":"gyeonggi-uijeongbu-yangju-dongducheon","lat":37.785,"lng":127.046},{"id":"gyeonggi-pocheon","name":"포천시","regionId":"gyeonggi-pocheon-yeoncheon","lat":37.895,"lng":127.201},{"id":"gyeonggi-yeoju","name":"여주시","regionId":"gyeonggi-yeoju-icheon","lat":37.298,"lng":127.637},{"id":"gyeonggi-yeoncheon","name":"연천군","regionId":"gyeonggi-pocheon-yeoncheon","lat":38.097,"lng":127.075},{"id":"gyeonggi-gapyeong","name":"가평군","regionId":"gyeonggi-yangpyeong-gapyeong","lat":37.831,"lng":127.51},{"id":"gyeonggi-yangpyeong","name":"양평군","regionId":"gyeonggi-yangpyeong-gapyeong","lat":37.492,"lng":127.488}]},{"id":"gangwon","name":"강원특별자치도","short":"강원","lat":37.881,"lng":127.73,"sigungu":[{"id":"gangwon-chuncheon","name":"춘천시","regionId":"gangwon-chuncheon"},{"id":"gangwon-wonju","name":"원주시","regionId":"gangwon-wonju"},{"id":"gangwon-gangneung","name":"강릉시","regionId":"gangwon-gangneung"},{"id":"gangwon-donghae","name":"동해시","regionId":"gangwon-etc"},{"id":"gangwon-taebaek","name":"태백시","regionId":"gangwon-etc"},{"id":"gangwon-sokcho","name":"속초시","regionId":"gangwon-sokcho"},{"id":"gangwon-samcheok","name":"삼척시","regionId":"gangwon-etc"},{"id":"gangwon-hongcheon","name":"홍천군","regionId":"gangwon-etc"},{"id":"gangwon-hoengseong","name":"횡성군","regionId":"gangwon-etc"},{"id":"gangwon-yeongwol","name":"영월군","regionId":"gangwon-etc"},{"id":"gangwon-pyeongchang","name":"평창군","regionId":"gangwon-etc"},{"id":"gangwon-jeongseon","name":"정선군","regionId":"gangwon-etc"},{"id":"gangwon-cheorwon","name":"철원군","regionId":"gangwon-etc"},{"id":"gangwon-hwacheon","name":"화천군","regionId":"gangwon-etc"},{"id":"gangwon-yanggu","name":"양구군","regionId":"gangwon-etc"},{"id":"gangwon-inje","name":"인제군","regionId":"gangwon-etc"},{"id":"gangwon-goseong","name":"고성군","regionId":"gangwon-etc"},{"id":"gangwon-yangyang","name":"양양군","regionId":"gangwon-etc"}]},{"id":"chungbuk","name":"충청북도","short":"충북","lat":36.642,"lng":127.489,"sigungu":[{"id":"chungbuk-cheongju","name":"청주시","regionId":"chungcheong-cheongju"},{"id":"chungbuk-chungju","name":"충주시","regionId":"chungcheong-chungbuk"},{"id":"chungbuk-jecheon","name":"제천시","regionId":"chungcheong-chungbuk"},{"id":"chungbuk-boeun","name":"보은군","regionId":"chungcheong-chungbuk"},{"id":"chungbuk-okcheon","name":"옥천군","regionId":"chungcheong-chungbuk"},{"id":"chungbuk-yeongdong","name":"영동군","regionId":"chungcheong-chungbuk"},{"id":"chungbuk-jeungpyeong","name":"증평군","regionId":"chungcheong-chungbuk"},{"id":"chungbuk-jincheon","name":"진천군","regionId":"chungcheong-chungbuk"},{"id":"chungbuk-goesan","name":"괴산군","regionId":"chungcheong-chungbuk"},{"id":"chungbuk-eumseong","name":"음성군","regionId":"chungcheong-chungbuk"},{"id":"chungbuk-danyang","name":"단양군","regionId":"chungcheong-chungbuk"}]},{"id":"chungnam","name":"충청남도","short":"충남","lat":36.601,"lng":126.661,"sigungu":[{"id":"chungnam-cheonan","name":"천안시","regionId":"chungcheong-cheonan-asan"},{"id":"chungnam-gongju","name":"공주시","regionId":"chungcheong-chungnam"},{"id":"chungnam-boryeong","name":"보령시","regionId":"chungcheong-chungnam"},{"id":"chungnam-asan","name":"아산시","regionId":"chungcheong-cheonan-asan"},{"id":"chungnam-seosan","name":"서산시","regionId":"chungcheong-chungnam"},{"id":"chungnam-nonsan","name":"논산시","regionId":"chungcheong-chungnam"},{"id":"chungnam-gyeryong","name":"계룡시","regionId":"chungcheong-chungnam"},{"id":"chungnam-dangjin","name":"당진시","regionId":"chungcheong-chungnam"},{"id":"chungnam-geumsan","name":"금산군","regionId":"chungcheong-chungnam"},{"id":"chungnam-buyeo","name":"부여군","regionId":"chungcheong-chungnam"},{"id":"chungnam-seocheon","name":"서천군","regionId":"chungcheong-chungnam"},{"id":"chungnam-cheongyang","name":"청양군","regionId":"chungcheong-chungnam"},{"id":"chungnam-hongseong","name":"홍성군","regionId":"chungcheong-chungnam"},{"id":"chungnam-yesan","name":"예산군","regionId":"chungcheong-chungnam"},{"id":"chungnam-taean","name":"태안군","regionId":"chungcheong-chungnam"}]},{"id":"jeonbuk","name":"전북특별자치도","short":"전북","lat":35.824,"lng":127.148,"sigungu":[{"id":"jeonbuk-jeonju","name":"전주시","regionId":"jeolla-jeonju"},{"id":"jeonbuk-gunsan","name":"군산시","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-iksan","name":"익산시","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-jeongeup","name":"정읍시","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-namwon","name":"남원시","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-gimje","name":"김제시","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-wanju","name":"완주군","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-jinan","name":"진안군","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-muju","name":"무주군","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-jangsu","name":"장수군","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-imsil","name":"임실군","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-sunchang","name":"순창군","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-gochang","name":"고창군","regionId":"jeolla-jeonbuk"},{"id":"jeonbuk-buan","name":"부안군","regionId":"jeolla-jeonbuk"}]},{"id":"jeonnam","name":"전라남도","short":"전남","lat":34.99,"lng":126.482,"sigungu":[{"id":"jeonnam-mokpo","name":"목포시","regionId":"jeolla-jeonnam"},{"id":"jeonnam-yeosu","name":"여수시","regionId":"jeolla-jeonnam"},{"id":"jeonnam-suncheon","name":"순천시","regionId":"jeolla-jeonnam"},{"id":"jeonnam-naju","name":"나주시","regionId":"jeolla-jeonnam"},{"id":"jeonnam-gwangyang","name":"광양시","regionId":"jeolla-jeonnam"},{"id":"jeonnam-damyang","name":"담양군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-gokseong","name":"곡성군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-gurye","name":"구례군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-goheung","name":"고흥군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-boseong","name":"보성군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-hwasun","name":"화순군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-jangheung","name":"장흥군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-gangjin","name":"강진군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-haenam","name":"해남군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-yeongam","name":"영암군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-muan","name":"무안군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-hampyeong","name":"함평군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-yeonggwang","name":"영광군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-jangseong","name":"장성군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-wando","name":"완도군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-jindo","name":"진도군","regionId":"jeolla-jeonnam"},{"id":"jeonnam-sinan","name":"신안군","regionId":"jeolla-jeonnam"}]},{"id":"gyeongbuk","name":"경상북도","short":"경북","lat":36.568,"lng":128.729,"sigungu":[{"id":"gyeongbuk-pohang","name":"포항시","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-gyeongju","name":"경주시","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-gimcheon","name":"김천시","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-andong","name":"안동시","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-gumi","name":"구미시","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-yeongju","name":"영주시","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-yeongcheon","name":"영천시","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-sangju","name":"상주시","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-mungyeong","name":"문경시","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-gyeongsan","name":"경산시","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-uiseong","name":"의성군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-cheongsong","name":"청송군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-yeongyang","name":"영양군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-yeongdeok","name":"영덕군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-cheongdo","name":"청도군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-goryeong","name":"고령군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-seongju","name":"성주군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-chilgok","name":"칠곡군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-yecheon","name":"예천군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-bonghwa","name":"봉화군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-uljin","name":"울진군","regionId":"gyeongsang-gyeongbuk"},{"id":"gyeongbuk-ulleung","name":"울릉군","regionId":"gyeongsang-gyeongbuk"}]},{"id":"gyeongnam","name":"경상남도","short":"경남","lat":35.228,"lng":128.681,"sigungu":[{"id":"gyeongnam-changwon","name":"창원시","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-jinju","name":"진주시","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-tongyeong","name":"통영시","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-sacheon","name":"사천시","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-gimhae","name":"김해시","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-miryang","name":"밀양시","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-geoje","name":"거제시","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-yangsan","name":"양산시","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-uiryeong","name":"의령군","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-haman","name":"함안군","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-changnyeong","name":"창녕군","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-goseong","name":"고성군","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-namhae","name":"남해군","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-hadong","name":"하동군","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-sancheong","name":"산청군","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-hamyang","name":"함양군","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-geochang","name":"거창군","regionId":"gyeongsang-gyeongnam"},{"id":"gyeongnam-hapcheon","name":"합천군","regionId":"gyeongsang-gyeongnam"}]},{"id":"jeju","name":"제주특별자치도","short":"제주","lat":33.5,"lng":126.531,"sigungu":[{"id":"jeju-jejusi","name":"제주시","regionId":"jeju"},{"id":"jeju-seogwipo","name":"서귀포시","regionId":"jeju"}]}]};
const GEO_HANGOUTS = {"version":2,"updatedAt":"2026-11-21","kinds":["station","university","landmark"],"hangouts":[{"id":"azit-gwanghwamun","name":"광화문역","kind":"station","sidoId":"seoul","sigunguId":"seoul-jongno","lat":37.572,"lng":126.977,"aliases":["광화문","5호선","시청"]},{"id":"azit-gyeongbokgung","name":"경복궁역","kind":"station","sidoId":"seoul","sigunguId":"seoul-jongno","lat":37.576,"lng":126.974,"aliases":["경복궁","3호선"]},{"id":"azit-jongno3ga","name":"종로3가역","kind":"station","sidoId":"seoul","sigunguId":"seoul-jongno","lat":37.571,"lng":126.992,"aliases":["종로","익선동","1호선","3호선"]},{"id":"azit-bukchon","name":"북촌한옥마을","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-jongno","lat":37.582,"lng":126.985,"aliases":["북촌","한옥마을","삼청동"]},{"id":"azit-daehakro","name":"대학로","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-jongno","lat":37.582,"lng":127.002,"aliases":["대학로","혜화","연극"]},{"id":"azit-seoulstation","name":"서울역","kind":"station","sidoId":"seoul","sigunguId":"seoul-jung","lat":37.555,"lng":126.972,"aliases":["서울역","1호선","4호선","KTX"]},{"id":"azit-myeongdong","name":"명동역","kind":"station","sidoId":"seoul","sigunguId":"seoul-jung","lat":37.563,"lng":126.985,"aliases":["명동","4호선"]},{"id":"azit-euljiro","name":"을지로입구역","kind":"station","sidoId":"seoul","sigunguId":"seoul-jung","lat":37.566,"lng":126.982,"aliases":["을지로","2호선"]},{"id":"azit-ddp","name":"동대문역사문화공원역","kind":"station","sidoId":"seoul","sigunguId":"seoul-jung","lat":37.565,"lng":127.007,"aliases":["동대문","DDP","2호선"]},{"id":"azit-dongguk","name":"동국대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-jung","lat":37.558,"lng":127.0,"aliases":["동국대","충무로"]},{"id":"azit-yongsan","name":"용산역","kind":"station","sidoId":"seoul","sigunguId":"seoul-yongsan","lat":37.529,"lng":126.965,"aliases":["용산","1호선","아이파크몰"]},{"id":"azit-itaewon","name":"이태원역","kind":"station","sidoId":"seoul","sigunguId":"seoul-yongsan","lat":37.534,"lng":126.995,"aliases":["이태원","6호선","경리단"]},{"id":"azit-hangangjin","name":"한강진역","kind":"station","sidoId":"seoul","sigunguId":"seoul-yongsan","lat":37.539,"lng":127.001,"aliases":["한강진","6호선","리움"]},{"id":"azit-namsan","name":"남산공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-yongsan","lat":37.551,"lng":126.988,"aliases":["남산","N서울타워","케이블카"]},{"id":"azit-seongsu","name":"성수역","kind":"station","sidoId":"seoul","sigunguId":"seoul-seongdong","lat":37.544,"lng":127.056,"aliases":["성수","성수동","2호선"]},{"id":"azit-seoulforest","name":"서울숲","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-seongdong","lat":37.544,"lng":127.037,"aliases":["서울숲","뚝섬","수변공원"]},{"id":"azit-wangsimni","name":"왕십리역","kind":"station","sidoId":"seoul","sigunguId":"seoul-seongdong","lat":37.561,"lng":127.037,"aliases":["왕십리","2호선","5호선","경의중앙"]},{"id":"azit-ttukseom","name":"뚝섬한강공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-seongdong","lat":37.53,"lng":127.067,"aliases":["뚝섬","한강공원","자벌레"]},{"id":"azit-kondae","name":"건대입구역","kind":"station","sidoId":"seoul","sigunguId":"seoul-gwangjin","lat":37.54,"lng":127.07,"aliases":["건대","건국대","2호선","7호선"]},{"id":"azit-childrenpark","name":"어린이대공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-gwangjin","lat":37.548,"lng":127.074,"aliases":["어린이대공원","능동"]},{"id":"azit-jayang","name":"자양한강공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-gwangjin","lat":37.527,"lng":127.086,"aliases":["자양","한강","구의"]},{"id":"azit-cheongnyangni","name":"청량리역","kind":"station","sidoId":"seoul","sigunguId":"seoul-dongdaemun","lat":37.58,"lng":127.047,"aliases":["청량리","1호선","경의중앙","KTX"]},{"id":"azit-janghanpyeong","name":"장한평역","kind":"station","sidoId":"seoul","sigunguId":"seoul-dongdaemun","lat":37.561,"lng":127.065,"aliases":["장한평","5호선"]},{"id":"azit-kyunghee","name":"경희대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-dongdaemun","lat":37.596,"lng":127.052,"aliases":["경희대","회기"]},{"id":"azit-uos","name":"서울시립대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-dongdaemun","lat":37.584,"lng":127.059,"aliases":["시립대","전농"]},{"id":"azit-sangbong","name":"상봉역","kind":"station","sidoId":"seoul","sigunguId":"seoul-jungnang","lat":37.596,"lng":127.085,"aliases":["상봉","7호선","경의중앙","경춘선"]},{"id":"azit-mangu","name":"망우역","kind":"station","sidoId":"seoul","sigunguId":"seoul-jungnang","lat":37.6,"lng":127.102,"aliases":["망우","경의중앙","경춘선"]},{"id":"azit-sungshin","name":"성신여대입구역","kind":"station","sidoId":"seoul","sigunguId":"seoul-seongbuk","lat":37.593,"lng":127.016,"aliases":["성신여대","4호선","우이신설"]},{"id":"azit-anam","name":"안암역","kind":"station","sidoId":"seoul","sigunguId":"seoul-seongbuk","lat":37.586,"lng":127.029,"aliases":["안암","고려대","6호선"]},{"id":"azit-korea-univ","name":"고려대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-seongbuk","lat":37.589,"lng":127.032,"aliases":["고대","안암"]},{"id":"azit-gireum","name":"길음역","kind":"station","sidoId":"seoul","sigunguId":"seoul-seongbuk","lat":37.603,"lng":127.025,"aliases":["길음","4호선"]},{"id":"azit-kookmin","name":"국민대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-seongbuk","lat":37.61,"lng":126.997,"aliases":["국민대","정릉"]},{"id":"azit-hansung","name":"한성대입구역","kind":"station","sidoId":"seoul","sigunguId":"seoul-seongbuk","lat":37.588,"lng":127.006,"aliases":["한성대","4호선","삼선교"]},{"id":"azit-suyu","name":"수유역","kind":"station","sidoId":"seoul","sigunguId":"seoul-gangbuk","lat":37.639,"lng":127.025,"aliases":["수유","4호선"]},{"id":"azit-ui","name":"우이동","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-gangbuk","lat":37.663,"lng":127.011,"aliases":["우이동","북한산","솔밭공원"]},{"id":"azit-dobongsan","name":"도봉산역","kind":"station","sidoId":"seoul","sigunguId":"seoul-dobong","lat":37.689,"lng":127.046,"aliases":["도봉산","1호선","7호선"]},{"id":"azit-changdong","name":"창동역","kind":"station","sidoId":"seoul","sigunguId":"seoul-dobong","lat":37.653,"lng":127.047,"aliases":["창동","1호선","4호선"]},{"id":"azit-nowon","name":"노원역","kind":"station","sidoId":"seoul","sigunguId":"seoul-nowon","lat":37.655,"lng":127.061,"aliases":["노원","4호선","7호선"]},{"id":"azit-gongneung","name":"공릉역","kind":"station","sidoId":"seoul","sigunguId":"seoul-nowon","lat":37.626,"lng":127.073,"aliases":["공릉","7호선"]},{"id":"azit-seoultech","name":"서울과학기술대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-nowon","lat":37.632,"lng":127.077,"aliases":["과기대","공릉"]},{"id":"azit-kwangwoon","name":"광운대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-nowon","lat":37.62,"lng":127.058,"aliases":["광운대","월계"]},{"id":"azit-yonsinnae","name":"연신내역","kind":"station","sidoId":"seoul","sigunguId":"seoul-eunpyeong","lat":37.619,"lng":126.921,"aliases":["연신내","3호선","6호선"]},{"id":"azit-bulgwang","name":"불광역","kind":"station","sidoId":"seoul","sigunguId":"seoul-eunpyeong","lat":37.61,"lng":126.929,"aliases":["불광","3호선","6호선"]},{"id":"azit-eunpyeonghanok","name":"은평한옥마을","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-eunpyeong","lat":37.638,"lng":126.94,"aliases":["한옥마을","진관동"]},{"id":"azit-sinchon","name":"신촌역","kind":"station","sidoId":"seoul","sigunguId":"seoul-seodaemun","lat":37.555,"lng":126.937,"aliases":["신촌","2호선","연세대"]},{"id":"azit-yonsei","name":"연세대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-seodaemun","lat":37.559,"lng":126.942,"aliases":["연대","신촌"]},{"id":"azit-hongje","name":"홍제역","kind":"station","sidoId":"seoul","sigunguId":"seoul-seodaemun","lat":37.589,"lng":126.944,"aliases":["홍제","3호선"]},{"id":"azit-ewha","name":"이대역","kind":"station","sidoId":"seoul","sigunguId":"seoul-seodaemun","lat":37.557,"lng":126.946,"aliases":["이대","이화여대","2호선"]},{"id":"azit-hongdae","name":"홍대입구역","kind":"station","sidoId":"seoul","sigunguId":"seoul-mapo","lat":37.557,"lng":126.924,"aliases":["홍대","2호선","공항철도"]},{"id":"azit-hapjeong","name":"합정역","kind":"station","sidoId":"seoul","sigunguId":"seoul-mapo","lat":37.55,"lng":126.914,"aliases":["합정","2호선","6호선"]},{"id":"azit-sangsu","name":"상수역","kind":"station","sidoId":"seoul","sigunguId":"seoul-mapo","lat":37.548,"lng":126.923,"aliases":["상수","6호선"]},{"id":"azit-mangwon","name":"망원한강공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-mapo","lat":37.555,"lng":126.896,"aliases":["망원","한강","한강공원"]},{"id":"azit-hongik","name":"홍익대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-mapo","lat":37.55,"lng":126.925,"aliases":["홍익대","홍대"]},{"id":"azit-gongdeok","name":"공덕역","kind":"station","sidoId":"seoul","sigunguId":"seoul-mapo","lat":37.544,"lng":126.951,"aliases":["공덕","5호선","6호선","공항철도"]},{"id":"azit-worldcup","name":"월드컵공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-mapo","lat":37.568,"lng":126.883,"aliases":["월드컵","하늘공원","난지"]},{"id":"azit-mokdong","name":"목동역","kind":"station","sidoId":"seoul","sigunguId":"seoul-yangcheon","lat":37.526,"lng":126.875,"aliases":["목동","5호선"]},{"id":"azit-omokgyo","name":"오목교역","kind":"station","sidoId":"seoul","sigunguId":"seoul-yangcheon","lat":37.524,"lng":126.875,"aliases":["오목교","5호선"]},{"id":"azit-magong","name":"마곡나루역","kind":"station","sidoId":"seoul","sigunguId":"seoul-gangseo","lat":37.567,"lng":126.827,"aliases":["마곡","9호선","공항철도"]},{"id":"azit-gimpoairport","name":"김포공항역","kind":"station","sidoId":"seoul","sigunguId":"seoul-gangseo","lat":37.562,"lng":126.801,"aliases":["김포공항","5호선","9호선","공항철도"]},{"id":"azit-botanic","name":"서울식물원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-gangseo","lat":37.569,"lng":126.833,"aliases":["식물원","마곡","호수공원"]},{"id":"azit-hwagok","name":"화곡역","kind":"station","sidoId":"seoul","sigunguId":"seoul-gangseo","lat":37.541,"lng":126.84,"aliases":["화곡","5호선"]},{"id":"azit-gurodigital","name":"구로디지털단지역","kind":"station","sidoId":"seoul","sigunguId":"seoul-guro","lat":37.485,"lng":126.902,"aliases":["구디","구로디지털","2호선"]},{"id":"azit-sindorim","name":"신도림역","kind":"station","sidoId":"seoul","sigunguId":"seoul-guro","lat":37.508,"lng":126.891,"aliases":["신도림","1호선","2호선","디큐브시티"]},{"id":"azit-gocheok","name":"고척스카이돔","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-guro","lat":37.498,"lng":126.867,"aliases":["고척","야구장","스카이돔"]},{"id":"azit-gasan","name":"가산디지털단지역","kind":"station","sidoId":"seoul","sigunguId":"seoul-geumcheon","lat":37.481,"lng":126.882,"aliases":["가산","구디","1호선","7호선"]},{"id":"azit-doksan","name":"독산역","kind":"station","sidoId":"seoul","sigunguId":"seoul-geumcheon","lat":37.466,"lng":126.887,"aliases":["독산","1호선"]},{"id":"azit-yeouido","name":"여의도한강공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-yeongdeungpo","lat":37.528,"lng":126.933,"aliases":["여의도","한강","한강공원"]},{"id":"azit-yeongdeungpo","name":"영등포역","kind":"station","sidoId":"seoul","sigunguId":"seoul-yeongdeungpo","lat":37.516,"lng":126.907,"aliases":["영등포","1호선","타임스퀘어"]},{"id":"azit-dangsan","name":"당산역","kind":"station","sidoId":"seoul","sigunguId":"seoul-yeongdeungpo","lat":37.534,"lng":126.902,"aliases":["당산","2호선","9호선"]},{"id":"azit-mullae","name":"문래역","kind":"station","sidoId":"seoul","sigunguId":"seoul-yeongdeungpo","lat":37.512,"lng":126.9,"aliases":["문래","문래창작촌","2호선"]},{"id":"azit-noryangjin","name":"노량진역","kind":"station","sidoId":"seoul","sigunguId":"seoul-dongjak","lat":37.514,"lng":126.942,"aliases":["노량진","1호선","9호선"]},{"id":"azit-sadang","name":"왕십리역","kind":"station","sidoId":"seoul","sigunguId":"seoul-dongjak","lat":37.476,"lng":126.981,"aliases":["왕십리","2호선","4호선"]},{"id":"azit-boramae","name":"뚝섬한강공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-dongjak","lat":37.492,"lng":126.925,"aliases":["뚝섬한강","공원","신대방"]},{"id":"azit-cau","name":"중앙대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-dongjak","lat":37.504,"lng":126.957,"aliases":["중앙대","옥수"]},{"id":"azit-ssu","name":"숭실대학교","kind":"university","sidoId":"seoul","sigunguId":"seoul-dongjak","lat":37.496,"lng":126.957,"aliases":["숭실대","상도"]},{"id":"azit-gyodae","name":"교대역","kind":"station","sidoId":"seoul","sigunguId":"seoul-seocho","lat":37.493,"lng":126.994,"aliases":["교대","2호선","3호선"]},{"id":"azit-banpo","name":"반포한강공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-seocho","lat":37.512,"lng":126.995,"aliases":["반포","한강","달빛무지개분수"]},{"id":"azit-yangjae","name":"양재시민의숲","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-seocho","lat":37.47,"lng":127.038,"aliases":["양재","시민의숲","매헌"]},{"id":"azit-seocho-art","name":"예술의전당","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-seocho","lat":37.479,"lng":126.981,"aliases":["예술의전당","서초","공연"]},{"id":"azit-gangnam","name":"강남역","kind":"station","sidoId":"seoul","sigunguId":"seoul-gangnam","lat":37.498,"lng":127.028,"aliases":["강남","2호선","신분당선"]},{"id":"azit-seolleung","name":"선릉역","kind":"station","sidoId":"seoul","sigunguId":"seoul-gangnam","lat":37.504,"lng":127.049,"aliases":["선릉","2호선","수인분당"]},{"id":"azit-sinnonhyeon","name":"신논현역","kind":"station","sidoId":"seoul","sigunguId":"seoul-gangnam","lat":37.504,"lng":127.024,"aliases":["신논현","9호선","논현"]},{"id":"azit-coex","name":"코엑스","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-gangnam","lat":37.512,"lng":127.059,"aliases":["코엑스","삼성동","별마당"]},{"id":"azit-jamsil","name":"잠실역","kind":"station","sidoId":"seoul","sigunguId":"seoul-songpa","lat":37.513,"lng":127.1,"aliases":["잠실","2호선","8호선","롯데월드"]},{"id":"azit-seokchon","name":"석촌호수","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-songpa","lat":37.508,"lng":127.104,"aliases":["석촌","호수","잠실"]},{"id":"azit-munjeong","name":"문정역","kind":"station","sidoId":"seoul","sigunguId":"seoul-songpa","lat":37.486,"lng":127.122,"aliases":["문정","8호선","가든파이브"]},{"id":"azit-olympic","name":"올림픽공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-songpa","lat":37.52,"lng":127.121,"aliases":["올림픽공원","몽촌","방이"]},{"id":"azit-cheonho","name":"천호역","kind":"station","sidoId":"seoul","sigunguId":"seoul-gangdong","lat":37.538,"lng":127.123,"aliases":["천호","5호선","8호선"]},{"id":"azit-gangdonggu","name":"강동구청역","kind":"station","sidoId":"seoul","sigunguId":"seoul-gangdong","lat":37.531,"lng":127.127,"aliases":["강동구청","8호선"]},{"id":"azit-gwangnaru","name":"광나루한강공원","kind":"landmark","sidoId":"seoul","sigunguId":"seoul-gangdong","lat":37.545,"lng":127.118,"aliases":["광나루","한강","자전거"]},{"id":"azit-ilsanlake","name":"일산호수공원","kind":"landmark","sidoId":"gyeonggi","sigunguId":"gyeonggi-goyang","lat":37.658,"lng":126.77,"aliases":["일산","호수공원","고양"]},{"id":"azit-baekseok","name":"백석역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-goyang","lat":37.641,"lng":126.787,"aliases":["백석","3호선","일산"]},{"id":"azit-kintex","name":"킨텍스","kind":"landmark","sidoId":"gyeonggi","sigunguId":"gyeonggi-goyang","lat":37.668,"lng":126.748,"aliases":["킨텍스","일산","전시장"]},{"id":"azit-unjeong","name":"운정역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-paju","lat":37.725,"lng":126.767,"aliases":["운정","파주","경의중앙"]},{"id":"azit-geumchon","name":"금촌역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-paju","lat":37.766,"lng":126.774,"aliases":["금촌","파주","경의중앙"]},{"id":"azit-sau","name":"사우역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-gimpo","lat":37.719,"lng":126.719,"aliases":["사우","김포","김포골드라인"]},{"id":"azit-janggi","name":"장기역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-gimpo","lat":37.652,"lng":126.671,"aliases":["장기","김포","김포골드라인"]},{"id":"azit-bucheon","name":"부천역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-bucheon","lat":37.484,"lng":126.783,"aliases":["부천","1호선","부천대"]},{"id":"azit-sangdong","name":"상동역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-bucheon","lat":37.506,"lng":126.752,"aliases":["상동","7호선","부천시청"]},{"id":"azit-suwon","name":"수원역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-suwon","lat":37.266,"lng":127.0,"aliases":["수원","1호선","수인분당"]},{"id":"azit-gwanggyo","name":"광교호수공원","kind":"landmark","sidoId":"gyeonggi","sigunguId":"gyeonggi-suwon","lat":37.285,"lng":127.057,"aliases":["광교","호수공원","경기대"]},{"id":"azit-suwonhwaseong","name":"수원화성","kind":"landmark","sidoId":"gyeonggi","sigunguId":"gyeonggi-suwon","lat":37.287,"lng":127.014,"aliases":["화성","수원","행궁동"]},{"id":"azit-skkku","name":"성균관대역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-suwon","lat":37.3,"lng":126.971,"aliases":["성균관대","율전","1호선"]},{"id":"azit-dongtan","name":"동탄역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-hwaseong","lat":37.201,"lng":127.096,"aliases":["동탄","SRT","GTX"]},{"id":"azit-byeongjeom","name":"병점역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-hwaseong","lat":37.207,"lng":127.033,"aliases":["병점","1호선"]},{"id":"azit-pyeongtaek","name":"평택역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-pyeongtaek","lat":36.992,"lng":127.085,"aliases":["평택","1호선","SRT"]},{"id":"azit-jije","name":"평택지제역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-pyeongtaek","lat":37.018,"lng":127.07,"aliases":["지제","평택","SRT"]},{"id":"azit-suji","name":"수지구청역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-yongin","lat":37.322,"lng":127.095,"aliases":["수지","신분당선","용인"]},{"id":"azit-giheung","name":"기흥역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-yongin","lat":37.275,"lng":127.115,"aliases":["기흥","용인","에버라인"]},{"id":"azit-everland","name":"에버랜드","kind":"landmark","sidoId":"gyeonggi","sigunguId":"gyeonggi-yongin","lat":37.294,"lng":127.203,"aliases":["에버랜드","용인","놀이공원"]},{"id":"azit-pangyo","name":"판교역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-seongnam","lat":37.394,"lng":127.111,"aliases":["판교","신분당선","경강선"]},{"id":"azit-seohyeon","name":"서현역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-seongnam","lat":37.385,"lng":127.123,"aliases":["서현","분당","수인분당"]},{"id":"azit-moran","name":"모란역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-seongnam","lat":37.432,"lng":127.129,"aliases":["모란","성남","8호선"]},{"id":"azit-yatap","name":"야탑역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-seongnam","lat":37.411,"lng":127.128,"aliases":["야탑","분당","수인분당"]},{"id":"azit-hanam-city","name":"하남시청역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-hanam","lat":37.542,"lng":127.207,"aliases":["하남","5호선","미사"]},{"id":"azit-dasan","name":"다산역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-namyangju","lat":37.608,"lng":127.156,"aliases":["다산","남양주","경의중앙"]},{"id":"azit-byeollae","name":"별내역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-namyangju","lat":37.642,"lng":127.127,"aliases":["별내","남양주","경춘선"]},{"id":"azit-uijeongbu","name":"의정부역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-uijeongbu","lat":37.738,"lng":127.046,"aliases":["의정부","1호선","의정부경전철"]},{"id":"azit-hoeryong","name":"회룡역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-uijeongbu","lat":37.724,"lng":127.047,"aliases":["회룡","1호선","의정부경전철"]},{"id":"azit-gapyeong","name":"가평역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-gapyeong","lat":37.814,"lng":127.511,"aliases":["가평","경춘선","남이섬"]},{"id":"azit-yangpyeong","name":"양평역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-yangpyeong","lat":37.492,"lng":127.492,"aliases":["양평","경의중앙","두물머리"]},{"id":"azit-beomgye","name":"범계역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-anyang","lat":37.39,"lng":126.951,"aliases":["범계","평촌","4호선"]},{"id":"azit-anyang","name":"안양역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-anyang","lat":37.401,"lng":126.922,"aliases":["안양","1호선"]},{"id":"azit-seoulgrand","name":"서울대공원역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-gwacheon","lat":37.427,"lng":127.017,"aliases":["대공원","과천","동물원"]},{"id":"azit-siheung-city","name":"시흥시청역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-siheung","lat":37.383,"lng":126.803,"aliases":["시흥","서해선","배곧"]},{"id":"azit-jungang","name":"중앙역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-ansan","lat":37.316,"lng":126.838,"aliases":["중앙","안산","4호선"]},{"id":"azit-hanyang-erica","name":"한양대에리카","kind":"university","sidoId":"gyeonggi","sigunguId":"gyeonggi-ansan","lat":37.3,"lng":126.835,"aliases":["한양대","에리카","안산"]},{"id":"azit-gwangmyeong","name":"광명역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-gwangmyeong","lat":37.416,"lng":126.885,"aliases":["광명","KTX","1호선"]},{"id":"azit-guri","name":"구리역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-guri","lat":37.603,"lng":127.143,"aliases":["구리","경의중앙","8호선"]},{"id":"azit-osan","name":"오산역","kind":"station","sidoId":"gyeonggi","sigunguId":"gyeonggi-osan","lat":37.146,"lng":127.067,"aliases":["오산","1호선","SRT"]},{"id":"azit-incheon","name":"인천역","kind":"station","sidoId":"incheon","sigunguId":"incheon-jung","lat":37.476,"lng":126.616,"aliases":["인천","1호선","수인분당"]},{"id":"azit-wolmido","name":"월미도","kind":"landmark","sidoId":"incheon","sigunguId":"incheon-jung","lat":37.476,"lng":126.596,"aliases":["월미도","인천","바다"]},{"id":"azit-chinatown","name":"인천차이나타운","kind":"landmark","sidoId":"incheon","sigunguId":"incheon-jung","lat":37.475,"lng":126.618,"aliases":["차이나타운","인천","송월동"]},{"id":"azit-dongincheon","name":"동인천역","kind":"station","sidoId":"incheon","sigunguId":"incheon-dong","lat":37.473,"lng":126.632,"aliases":["동인천","1호선"]},{"id":"azit-juan","name":"주안역","kind":"station","sidoId":"incheon","sigunguId":"incheon-michuhol","lat":37.465,"lng":126.681,"aliases":["주안","1호선","2호선"]},{"id":"azit-inha","name":"인하대학교","kind":"university","sidoId":"incheon","sigunguId":"incheon-michuhol","lat":37.45,"lng":126.654,"aliases":["인하대","용현동"]},{"id":"azit-songdo","name":"송도센트럴파크","kind":"landmark","sidoId":"incheon","sigunguId":"incheon-yeonsu","lat":37.392,"lng":126.638,"aliases":["송도","센트럴파크","인천"]},{"id":"azit-incheon-univ","name":"인천대학교","kind":"university","sidoId":"incheon","sigunguId":"incheon-yeonsu","lat":37.375,"lng":126.634,"aliases":["인천대","송도"]},{"id":"azit-guweol","name":"구월동","kind":"landmark","sidoId":"incheon","sigunguId":"incheon-namdong","lat":37.45,"lng":126.701,"aliases":["구월","인천","롯데백화점"]},{"id":"azit-incheon-cityhall","name":"인천시청역","kind":"station","sidoId":"incheon","sigunguId":"incheon-namdong","lat":37.457,"lng":126.702,"aliases":["인천시청","1호선","2호선"]},{"id":"azit-bupyeong","name":"부평역","kind":"station","sidoId":"incheon","sigunguId":"incheon-bupyeong","lat":37.489,"lng":126.724,"aliases":["부평","1호선","인천1호선"]},{"id":"azit-bupyeong-gu","name":"부평구청역","kind":"station","sidoId":"incheon","sigunguId":"incheon-bupyeong","lat":37.507,"lng":126.721,"aliases":["부평구청","7호선","인천1호선"]},{"id":"azit-gyeyang","name":"계양역","kind":"station","sidoId":"incheon","sigunguId":"incheon-gyeyang","lat":37.571,"lng":126.737,"aliases":["계양","공항철도","인천1호선"]},{"id":"azit-geomam","name":"검암역","kind":"station","sidoId":"incheon","sigunguId":"incheon-seo","lat":37.569,"lng":126.673,"aliases":["검암","공항철도","인천2호선"]},{"id":"azit-arabetgil","name":"아라뱃길","kind":"landmark","sidoId":"incheon","sigunguId":"incheon-seo","lat":37.556,"lng":126.677,"aliases":["아라뱃길","인천","자전거"]}]};
/* ==== GEO DATA END ==== */

const AZIT_KINDS = {
  station: { label: '지하철역', icon: 'train' },
  school: { label: '대학교', icon: 'building' },
  landmark: { label: '랜드마크', icon: 'map' },
  area: { label: '동네', icon: 'home' }
};

/** 아지트의 큰 분류 — 기존 지역 권역 id 를 그대로 쓴다(지역 필터와 같은 자). */
const AZIT_LEGACY_AREAS = [
  { id: 'seoul-jongno-junggu', name: '종로·중구', groupId: 'seoul' },
  { id: 'seoul-dongdaemun-seongbuk', name: '동대문·성북', groupId: 'seoul' },
  { id: 'seoul-mapo-yongsan', name: '마포·용산', groupId: 'seoul' },
  { id: 'seoul-seodaemun-eunpyeong', name: '서대문·은평', groupId: 'seoul' },
  { id: 'seoul-seongdong-gwangjin', name: '성동·광진', groupId: 'seoul' },
  { id: 'seoul-gangbuk-dobong', name: '강북·도봉', groupId: 'seoul' },
  { id: 'seoul-nowon-jungnang', name: '노원·중랑', groupId: 'seoul' },
  { id: 'seoul-seocho-gangnam', name: '서초·강남', groupId: 'seoul' },
  { id: 'seoul-gangdong-songpa', name: '강동·송파', groupId: 'seoul' },
  { id: 'seoul-gangseo-yangcheon', name: '강서·양천', groupId: 'seoul' },
  { id: 'seoul-dongjak-gwanak', name: '동작·성동', groupId: 'seoul' },
  { id: 'seoul-yeongdeungpo-guro-geumcheon', name: '영등포·구로·금천', groupId: 'seoul' },
  { id: 'gyeonggi-incheon-bucheon-gimpo', name: '인천·부천·김포', groupId: 'gyeonggi' },
  { id: 'gyeonggi-suwon-yongin-uiwang', name: '수원·용인·의왕', groupId: 'gyeonggi' },
  { id: 'gyeonggi-goyang-paju', name: '고양·파주', groupId: 'gyeonggi' },
  { id: 'gyeonggi-seongnam-gwangju', name: '성남·광주', groupId: 'gyeonggi' },
  { id: 'gyeonggi-anyang-gunpo-gwacheon', name: '안양·군포·과천', groupId: 'gyeonggi' },
  { id: 'gyeonggi-hwaseong-osan', name: '화성·오산', groupId: 'gyeonggi' },
  { id: 'gyeonggi-pyeongtaek-anseong', name: '평택·안성', groupId: 'gyeonggi' },
  { id: 'gyeongsang-busan', name: '부산', groupId: 'gyeongsang' },
  { id: 'gyeongsang-daegu', name: '대구', groupId: 'gyeongsang' },
  { id: 'chungcheong-daejeon', name: '대전', groupId: 'chungcheong' },
  { id: 'jeolla-gwangju', name: '광주', groupId: 'jeolla' },
  { id: 'gangwon-chuncheon', name: '춘천', groupId: 'gangwon' },
  { id: 'jeolla-jeonbuk', name: '전주·전북', groupId: 'jeolla' },
  { id: 'jeju', name: '제주', groupId: 'jeju' }
];

/**
 * 아지트 한 곳 — 이름만 고른다. 좌표·주소는 저장하지 않는다.
 * aliases 는 검색어(옛 동네 이름·노선 이름)다.
 */
const AZIT_LEGACY_SPOTS = [
  /* ---------------------------------------------- 서울 · 종로·중구 */
  { id: 'azit-gwanghwamun', areaId: 'seoul-jongno-junggu', name: '광화문역', kind: 'station', aliases: ['광화문', '5호선', '시청'] },
  { id: 'azit-euljiro', areaId: 'seoul-jongno-junggu', name: '을지로입구역', kind: 'station', aliases: ['을지로', '2호선'] },
  { id: 'azit-seoulstation', areaId: 'seoul-jongno-junggu', name: '서울역', kind: 'station', aliases: ['서울역', '1호선', '4호선', 'KTX'] },
  { id: 'azit-myeongdong', areaId: 'seoul-jongno-junggu', name: '명동역', kind: 'station', aliases: ['명동', '4호선'] },
  { id: 'azit-cheonggyecheon', areaId: 'seoul-jongno-junggu', name: '청계천', kind: 'landmark', aliases: ['청계천', '광장시장'] },
  /* ---------------------------------------------- 서울 · 동대문·성북 */
  { id: 'azit-ddp', areaId: 'seoul-dongdaemun-seongbuk', name: '동대문역사문화공원역', kind: 'station', aliases: ['동대문', 'DDP', '2호선'] },
  { id: 'azit-anam', areaId: 'seoul-dongdaemun-seongbuk', name: '안암역', kind: 'station', aliases: ['안암', '고려대', '6호선'] },
  { id: 'azit-korea-univ', areaId: 'seoul-dongdaemun-seongbuk', name: '고려대학교', kind: 'school', aliases: ['고대', '안암'] },
  { id: 'azit-sungshin', areaId: 'seoul-dongdaemun-seongbuk', name: '성신여대입구역', kind: 'station', aliases: ['성신여대', '4호선', '우이신설'] },
  { id: 'azit-janghanpyeong', areaId: 'seoul-dongdaemun-seongbuk', name: '장한평역', kind: 'station', aliases: ['장한평', '5호선'] },
  /* ---------------------------------------------- 서울 · 마포·용산 */
  { id: 'azit-hongdae', areaId: 'seoul-mapo-yongsan', name: '홍대입구역', kind: 'station', aliases: ['홍대', '2호선', '공항철도'] },
  { id: 'azit-hapjeong', areaId: 'seoul-mapo-yongsan', name: '합정역', kind: 'station', aliases: ['합정', '2호선', '6호선'] },
  { id: 'azit-yeonnam', areaId: 'seoul-mapo-yongsan', name: '연남동', kind: 'area', aliases: ['연남', '연트럴파크'] },
  { id: 'azit-itaewon', areaId: 'seoul-mapo-yongsan', name: '이태원역', kind: 'station', aliases: ['이태원', '6호선', '경리단'] },
  { id: 'azit-mangwon', areaId: 'seoul-mapo-yongsan', name: '망원한강공원', kind: 'landmark', aliases: ['망원', '한강', '한강공원'] },
  /* ---------------------------------------------- 서울 · 서대문·은평 */
  { id: 'azit-sinchon', areaId: 'seoul-seodaemun-eunpyeong', name: '신촌역', kind: 'station', aliases: ['신촌', '2호선', '연세대'] },
  { id: 'azit-yonsei', areaId: 'seoul-seodaemun-eunpyeong', name: '연세대학교', kind: 'school', aliases: ['연대', '신촌'] },
  { id: 'azit-yeonhui', areaId: 'seoul-seodaemun-eunpyeong', name: '연희동', kind: 'area', aliases: ['연희', '연희숲속'] },
  { id: 'azit-bulgwang', areaId: 'seoul-seodaemun-eunpyeong', name: '불광역', kind: 'station', aliases: ['불광', '6호선', '3호선'] },
  { id: 'azit-yonsinnae', areaId: 'seoul-seodaemun-eunpyeong', name: '연신내역', kind: 'station', aliases: ['연신내', '3호선', '6호선'] },
  /* ---------------------------------------------- 서울 · 성동·광진 */
  { id: 'azit-seongsu', areaId: 'seoul-seongdong-gwangjin', name: '성수역', kind: 'station', aliases: ['성수', '성수동', '2호선'] },
  { id: 'azit-seoulforest', areaId: 'seoul-seongdong-gwangjin', name: '서울숲', kind: 'landmark', aliases: ['서울숲', '뚝섬', '수변공원'] },
  { id: 'azit-kondae', areaId: 'seoul-seongdong-gwangjin', name: '건대입구역', kind: 'station', aliases: ['건대', '건국대', '2호선', '7호선'] },
  { id: 'azit-wangsimni', areaId: 'seoul-seongdong-gwangjin', name: '왕십리역', kind: 'station', aliases: ['왕십리', '2호선', '5호선', '경의중앙'] },
  { id: 'azit-ttukseom', areaId: 'seoul-seongdong-gwangjin', name: '뚝섬한강공원', kind: 'landmark', aliases: ['뚝섬', '한강공원', '자벌레'] },
  /* ---------------------------------------------- 서울 · 강북·도봉 */
  { id: 'azit-suyu', areaId: 'seoul-gangbuk-dobong', name: '수유역', kind: 'station', aliases: ['수유', '4호선'] },
  { id: 'azit-mia', areaId: 'seoul-gangbuk-dobong', name: '미아사거리역', kind: 'station', aliases: ['미아', '4호선'] },
  { id: 'azit-dreamforest', areaId: 'seoul-gangbuk-dobong', name: '북서울꿈의숲', kind: 'landmark', aliases: ['꿈의숲', '번동'] },
  /* ---------------------------------------------- 서울 · 노원·중랑 */
  { id: 'azit-nowon', areaId: 'seoul-nowon-jungnang', name: '노원역', kind: 'station', aliases: ['노원', '4호선', '7호선'] },
  { id: 'azit-gongneung', areaId: 'seoul-nowon-jungnang', name: '공릉역', kind: 'station', aliases: ['공릉', '서울과기대', '7호선'] },
  { id: 'azit-sangbong', areaId: 'seoul-nowon-jungnang', name: '상봉역', kind: 'station', aliases: ['상봉', '7호선', '경의중앙', '경춘선'] },
  { id: 'azit-gyeongchun', areaId: 'seoul-nowon-jungnang', name: '경춘선숲길', kind: 'landmark', aliases: ['경춘선', '숲길', '화랑대'] },
  /* ---------------------------------------------- 서울 · 서초·강남 */
  { id: 'azit-gangnam', areaId: 'seoul-seocho-gangnam', name: '강남역', kind: 'station', aliases: ['강남', '2호선', '신분당선'] },
  { id: 'azit-yeoksam', areaId: 'seoul-seocho-gangnam', name: '대치역', kind: 'station', aliases: ['대치', '2호선', '테헤란로'] },
  { id: 'azit-seolleung', areaId: 'seoul-seocho-gangnam', name: '선릉역', kind: 'station', aliases: ['선릉', '2호선', '수인분당'] },
  { id: 'azit-yangjae', areaId: 'seoul-seocho-gangnam', name: '양재시민의숲', kind: 'landmark', aliases: ['양재', '시민의숲', '매헌'] },
  { id: 'azit-sinnonhyeon', areaId: 'seoul-seocho-gangnam', name: '신논현역', kind: 'station', aliases: ['신논현', '9호선', '논현'] },
  /* ---------------------------------------------- 서울 · 강동·송파 */
  { id: 'azit-jamsil', areaId: 'seoul-gangdong-songpa', name: '잠실역', kind: 'station', aliases: ['잠실', '2호선', '8호선', '롯데월드'] },
  { id: 'azit-seokchon', areaId: 'seoul-gangdong-songpa', name: '석촌호수', kind: 'landmark', aliases: ['석촌', '호수', '잠실'] },
  { id: 'azit-cheonho', areaId: 'seoul-gangdong-songpa', name: '천호역', kind: 'station', aliases: ['천호', '5호선', '8호선'] },
  { id: 'azit-munjeong', areaId: 'seoul-gangdong-songpa', name: '문정역', kind: 'station', aliases: ['문정', '8호선', '가든파이브'] },
  /* ---------------------------------------------- 서울 · 강서·양천 */
  { id: 'azit-magong', areaId: 'seoul-gangseo-yangcheon', name: '마곡나루역', kind: 'station', aliases: ['마곡', '9호선', '공항철도'] },
  { id: 'azit-mokdong', areaId: 'seoul-gangseo-yangcheon', name: '목동역', kind: 'station', aliases: ['목동', '5호선'] },
  { id: 'azit-hwagok', areaId: 'seoul-gangseo-yangcheon', name: '화곡역', kind: 'station', aliases: ['화곡', '5호선'] },
  { id: 'azit-botanic', areaId: 'seoul-gangseo-yangcheon', name: '서울식물원', kind: 'landmark', aliases: ['식물원', '마곡', '호수공원'] },
  /* ---------------------------------------------- 서울 · 동작·성동 (루키 님 동네) */
  { id: 'azit-sillim', areaId: 'seoul-dongjak-gwanak', name: '성수역', kind: 'station', aliases: ['성수', '성수동', '2호선', '성수선'] },
  { id: 'azit-seouluniv', areaId: 'seoul-dongjak-gwanak', name: '한양대역', kind: 'station', aliases: ['한양대', '서울숲', '2호선'] },
  { id: 'azit-snu', areaId: 'seoul-dongjak-gwanak', name: '서울대학교', kind: 'school', aliases: ['서울대', '성동', '샤로수길'] },
  { id: 'azit-nakseongdae', areaId: 'seoul-dongjak-gwanak', name: '뚝섬역', kind: 'station', aliases: ['뚝섬', '2호선'] },
  { id: 'azit-boramae', areaId: 'seoul-dongjak-gwanak', name: '뚝섬한강공원', kind: 'landmark', aliases: ['뚝섬한강', '공원', '신대방'] },
  { id: 'azit-sadang', areaId: 'seoul-dongjak-gwanak', name: '왕십리역', kind: 'station', aliases: ['왕십리', '2호선', '4호선'] },
  /* ---------------------------------------------- 서울 · 영등포·구로·금천 */
  { id: 'azit-yeouido', areaId: 'seoul-yeongdeungpo-guro-geumcheon', name: '여의도한강공원', kind: 'landmark', aliases: ['여의도', '한강', '한강공원'] },
  { id: 'azit-yeongdeungpo', areaId: 'seoul-yeongdeungpo-guro-geumcheon', name: '영등포역', kind: 'station', aliases: ['영등포', '1호선', '타임스퀘어'] },
  { id: 'azit-sindorim', areaId: 'seoul-yeongdeungpo-guro-geumcheon', name: '신도림역', kind: 'station', aliases: ['신도림', '1호선', '2호선', '디큐브시티'] },
  { id: 'azit-mullae', areaId: 'seoul-yeongdeungpo-guro-geumcheon', name: '문래동', kind: 'area', aliases: ['문래', '문래창작촌', '철공소'] },
  { id: 'azit-gasan', areaId: 'seoul-yeongdeungpo-guro-geumcheon', name: '가산디지털단지역', kind: 'station', aliases: ['가산', '구디', '1호선', '7호선'] },
  /* ---------------------------------------------- 경기 · 인천·부천·김포 */
  { id: 'azit-bupyeong', areaId: 'gyeonggi-incheon-bucheon-gimpo', name: '부평역', kind: 'station', aliases: ['부평', '1호선', '인천1호선'] },
  { id: 'azit-songdo', areaId: 'gyeonggi-incheon-bucheon-gimpo', name: '송도센트럴파크', kind: 'landmark', aliases: ['송도', '센트럴파크', '인천'] },
  { id: 'azit-bucheon', areaId: 'gyeonggi-incheon-bucheon-gimpo', name: '부천역', kind: 'station', aliases: ['부천', '1호선', '부천대'] },
  { id: 'azit-gimpoairport', areaId: 'gyeonggi-incheon-bucheon-gimpo', name: '김포공항역', kind: 'station', aliases: ['김포공항', '5호선', '9호선', '공항철도'] },
  /* ---------------------------------------------- 경기 · 수원·용인·의왕 */
  { id: 'azit-suwon', areaId: 'gyeonggi-suwon-yongin-uiwang', name: '수원역', kind: 'station', aliases: ['수원', '1호선', '수인분당'] },
  { id: 'azit-gwanggyo', areaId: 'gyeonggi-suwon-yongin-uiwang', name: '광교호수공원', kind: 'landmark', aliases: ['광교', '호수공원', '경기대'] },
  { id: 'azit-suji', areaId: 'gyeonggi-suwon-yongin-uiwang', name: '수지구청역', kind: 'station', aliases: ['수지', '신분당선', '용인'] },
  { id: 'azit-yeongtong', areaId: 'gyeonggi-suwon-yongin-uiwang', name: '영통역', kind: 'station', aliases: ['영통', '수인분당'] },
  /* ---------------------------------------------- 경기 · 고양·파주 */
  { id: 'azit-ilsanlake', areaId: 'gyeonggi-goyang-paju', name: '일산호수공원', kind: 'landmark', aliases: ['일산', '호수공원', '고양'] },
  { id: 'azit-baekseok', areaId: 'gyeonggi-goyang-paju', name: '백석역', kind: 'station', aliases: ['백석', '3호선', '일산'] },
  { id: 'azit-unjeong', areaId: 'gyeonggi-goyang-paju', name: '운정역', kind: 'station', aliases: ['운정', '파주', '경의중앙'] },
  { id: 'azit-kintex', areaId: 'gyeonggi-goyang-paju', name: '킨텍스', kind: 'landmark', aliases: ['킨텍스', '일산', '전시장'] },
  /* ---------------------------------------------- 경기 · 성남·광주 */
  { id: 'azit-pangyo', areaId: 'gyeonggi-seongnam-gwangju', name: '판교역', kind: 'station', aliases: ['판교', '신분당선', '경강선'] },
  { id: 'azit-seohyeon', areaId: 'gyeonggi-seongnam-gwangju', name: '서현역', kind: 'station', aliases: ['서현', '분당', '수인분당'] },
  { id: 'azit-moran', areaId: 'gyeonggi-seongnam-gwangju', name: '모란역', kind: 'station', aliases: ['모란', '성남', '8호선'] },
  { id: 'azit-wirye', areaId: 'gyeonggi-seongnam-gwangju', name: '위례신도시', kind: 'area', aliases: ['위례', '신도시'] },
  /* ---------------------------------------------- 경기 · 안양·군포·과천 */
  { id: 'azit-beomgye', areaId: 'gyeonggi-anyang-gunpo-gwacheon', name: '범계역', kind: 'station', aliases: ['범계', '평촌', '4호선'] },
  { id: 'azit-pyeongchon', areaId: 'gyeonggi-anyang-gunpo-gwacheon', name: '평촌역', kind: 'station', aliases: ['평촌', '4호선', '안양'] },
  { id: 'azit-indeogwon', areaId: 'gyeonggi-anyang-gunpo-gwacheon', name: '인덕원역', kind: 'station', aliases: ['인덕원', '4호선', '과천'] },
  { id: 'azit-seoulgrand', areaId: 'gyeonggi-anyang-gunpo-gwacheon', name: '서울대공원', kind: 'landmark', aliases: ['대공원', '과천', '동물원'] },
  /* ---------------------------------------------- 경기 · 화성·오산 */
  { id: 'azit-dongtan', areaId: 'gyeonggi-hwaseong-osan', name: '동탄역', kind: 'station', aliases: ['동탄', 'SRT', 'GTX'] },
  { id: 'azit-byeongjeom', areaId: 'gyeonggi-hwaseong-osan', name: '병점역', kind: 'station', aliases: ['병점', '1호선'] },
  { id: 'azit-osan', areaId: 'gyeonggi-hwaseong-osan', name: '오산역', kind: 'station', aliases: ['오산', '1호선'] },
  /* ---------------------------------------------- 경기 · 평택·안성 */
  { id: 'azit-pyeongtaek', areaId: 'gyeonggi-pyeongtaek-anseong', name: '평택역', kind: 'station', aliases: ['평택', '1호선', 'SRT'] },
  { id: 'azit-godeok', areaId: 'gyeonggi-pyeongtaek-anseong', name: '고덕신도시', kind: 'area', aliases: ['고덕', '평택'] },
  { id: 'azit-songtan', areaId: 'gyeonggi-pyeongtaek-anseong', name: '송탄역', kind: 'station', aliases: ['송탄', '평택', '1호선'] },
  /* ---------------------------------------------- 부산·대구·대전·광주·춘천·전주·제주 */
  { id: 'azit-seomyeon', areaId: 'gyeongsang-busan', name: '서면역', kind: 'station', aliases: ['서면', '부산', '1호선', '2호선'] },
  { id: 'azit-haeundae', areaId: 'gyeongsang-busan', name: '해운대해수욕장', kind: 'landmark', aliases: ['해운대', '부산', '바다'] },
  { id: 'azit-gwangalli', areaId: 'gyeongsang-busan', name: '광안리해수욕장', kind: 'landmark', aliases: ['광안리', '부산', '광안대교'] },
  { id: 'azit-dongseongno', areaId: 'gyeongsang-daegu', name: '동성로', kind: 'area', aliases: ['동성로', '대구', '중앙로'] },
  { id: 'azit-seongseo', areaId: 'gyeongsang-daegu', name: '성서산업단지', kind: 'area', aliases: ['성서', '대구', '계명대'] },
  { id: 'azit-daejeon', areaId: 'chungcheong-daejeon', name: '대전역', kind: 'station', aliases: ['대전', 'KTX', '1호선'] },
  { id: 'azit-yuseong', areaId: 'chungcheong-daejeon', name: '유성온천역', kind: 'station', aliases: ['유성', '대전', '온천'] },
  { id: 'azit-chungjangro', areaId: 'jeolla-gwangju', name: '충장로', kind: 'area', aliases: ['충장로', '광주', '동명동'] },
  { id: 'azit-sangmu', areaId: 'jeolla-gwangju', name: '상무지구', kind: 'area', aliases: ['상무', '광주', '시청'] },
  { id: 'azit-chuncheon', areaId: 'gangwon-chuncheon', name: '춘천역', kind: 'station', aliases: ['춘천', 'ITX', '강촌'] },
  { id: 'azit-soyang', areaId: 'gangwon-chuncheon', name: '소양강댐', kind: 'landmark', aliases: ['소양강', '춘천', '의암호'] },
  { id: 'azit-hanok', areaId: 'jeolla-jeonbuk', name: '전주한옥마을', kind: 'landmark', aliases: ['한옥마을', '전주', '전동성당'] },
  { id: 'azit-jeonju', areaId: 'jeolla-jeonbuk', name: '전주역', kind: 'station', aliases: ['전주', 'KTX'] },
  { id: 'azit-jejucity', areaId: 'jeju', name: '제주시청', kind: 'area', aliases: ['제주시', '제주', '시청'] },
  { id: 'azit-aewol', areaId: 'jeju', name: '애월해안도로', kind: 'landmark', aliases: ['애월', '제주', '해안도로'] },
  { id: 'azit-seogwipo', areaId: 'jeju', name: '서귀포', kind: 'area', aliases: ['서귀포', '제주', '중문'] }
];

/* ---------------------------------------------------------------------------
 * H2 (11/21) — 지역(시·도 → 시·군·구)과 아지트 150곳
 * -------------------------------------------------------------------------
 *  루키 님 지시서 2단계(H2): 활동 지역은 **목록에서만** 고르고(시·도 → 시·군·구),
 *  만나는 곳은 **아지트 1~3곳**을 고른다. 정확한 주소·집 주소는 받지 않는다.
 *
 *  · 원본은 `data/regions.json` · `data/hangouts.json` 이고, 이 파일의 GEO_REGIONS ·
 *    GEO_HANGOUTS 는 같은 내용의 내장본이다(단일 HTML 번들·file:// 에서 fetch 가 막혀도
 *    그대로 동작해야 하므로). tools/gen_geo_data.py 가 둘을 함께 만든다.
 *  · http 로 열리면 loadGeoData() 가 data/*.json 을 fetch 해 같은 값으로 다시 채운다.
 *  · 옛 아지트(AZIT_LEGACY_SPOTS)는 새 목록에 없는 것만 'legacy'로 남긴다 — 예전에
 *    만들어진 모임의 azitId 가 가리키는 곳이 사라지면 그 모임이 깨지기 때문이다.
 *  · 좌표는 소수점 3자리 대략값(약 100m)이다. 주소 필드는 만들지도 저장하지도 않는다.
 * ------------------------------------------------------------------------- */

/** 시·군·구 하나 — 시·도 이름까지 붙여 둔다. */
function geoBuildSigungu(regions) {
  const map = {};
  (regions && regions.sido ? regions.sido : []).forEach((s) => {
    (s.sigungu || []).forEach((g) => {
      map[g.id] = {
        id: g.id, name: g.name, regionId: g.regionId,
        sidoId: s.id, sidoName: s.name, sidoShort: s.short,
        lat: g.lat == null ? s.lat : g.lat,
        lng: g.lng == null ? s.lng : g.lng,
        sidoLat: s.lat, sidolng: s.lng
      };
    });
  });
  return map;
}

/** 아지트 한 곳을 내부 모양으로 — 좌표는 대략값, areaId 는 탐색 권역 id. */
function geoHangoutRow(h, sigunguMap) {
  const sg = sigunguMap[h.sigunguId] || null;
  return {
    id: h.id, name: h.name, kind: h.kind,
    aliases: h.aliases || [],
    sidoId: h.sidoId || (sg ? sg.sidoId : null),
    sigunguId: h.sigunguId || null,
    lat: h.lat == null ? null : Number(h.lat),
    lng: h.lng == null ? null : Number(h.lng),
    areaId: sg ? sg.regionId : (h.areaId || null),
    legacy: false
  };
}

/** 지금 쓰는 지역·아지트 묶음 — loadGeoData() 가 fetch 로 갈아 끼울 수 있게 let. */
let GEO_CURRENT = { regions: GEO_REGIONS, hangouts: GEO_HANGOUTS.hangouts || [] };
let GEO_SIGUNGU_MAP = geoBuildSigungu(GEO_REGIONS);
let AZIT_SPOTS = [];
let AZIT_AREAS = [];

function geoRebuild() {
  const sigunguMap = geoBuildSigungu(GEO_CURRENT.regions);
  GEO_SIGUNGU_MAP = sigunguMap;
  const primary = (GEO_CURRENT.hangouts || []).map((h) => geoHangoutRow(h, sigunguMap));
  const taken = new Set(primary.map((p) => p.id));
  const takenNames = new Set(primary.map((p) => p.name));
  const legacy = AZIT_LEGACY_SPOTS
    .filter((s) => !taken.has(s.id) && !takenNames.has(s.name))
    .map((s) => ({
      id: s.id, name: s.name, kind: s.kind, aliases: s.aliases || [],
      sidoId: null, sigunguId: null, lat: null, lng: null,
      areaId: s.areaId, legacy: true
    }));
  AZIT_SPOTS = primary.concat(legacy);
  /* 큰 분류(권역) — 아지트가 있는 권역만, 탐색 지역 이름 그대로. */
  const byRegion = {};
  AZIT_SPOTS.forEach((s) => {
    if (!s.areaId) return;
    byRegion[s.areaId] = (byRegion[s.areaId] || 0) + 1;
  });
  AZIT_AREAS = EXPLORE_REGIONS
    .filter((r) => byRegion[r.id])
    .map((r) => ({ id: r.id, name: r.name.replace(/\./g, '·'), groupId: r.groupId, count: byRegion[r.id] }));
}

geoRebuild();

/**
 * http 로 열렸을 때 data/*.json 을 읽어 내장본을 같은 값으로 맞춘다.
 *  · file:// · 단일 번들에서는 fetch 가 실패하므로 조용히 내장본을 그대로 쓴다.
 *  · 값이 다르면(데이터를 고친 뒤) 다시 그려야 하므로 true 를 돌려준다.
 */
async function loadGeoData() {
  if (typeof fetch !== 'function') return false;
  try {
    const [rr, hr] = await Promise.all([
      fetch('data/regions.json', { cache: 'no-store' }),
      fetch('data/hangouts.json', { cache: 'no-store' })
    ]);
    if (!rr.ok || !hr.ok) return false;
    const regions = await rr.json();
    const hangouts = await hr.json();
    if (!regions || !Array.isArray(regions.sido) || !hangouts || !Array.isArray(hangouts.hangouts)) return false;
    GEO_CURRENT = { regions, hangouts: hangouts.hangouts };
    geoRebuild();
    return true;
  } catch (e) {
    return false;
  }
}

/** 시·군·구 하나(id) */
function geoAreaView(areaId) {
  if (!areaId) return null;
  const g = GEO_SIGUNGU_MAP[areaId];
  return g ? {
    id: g.id, sigunguId: g.id, name: g.name, sidoId: g.sidoId, sidoName: g.sidoName,
    sidoShort: g.sidoShort, regionId: g.regionId, lat: g.lat, lng: g.lng,
    label: `${g.sidoShort} ${g.name}`
  } : null;
}

/** 주소 글과 권역 id 로 시·군·구를 찾는다(' 서울 성동구 성수동' → seoul-gwanak). */
function geoAreaIdFor(location, regionId) {
  const loc = String(location || '');
  if (loc) {
    const rows = Object.keys(GEO_SIGUNGU_MAP).map((id) => GEO_SIGUNGU_MAP[id]);
    const named = rows.filter((g) => loc.includes(g.name));
    if (named.length) {
      const both = named.find((g) => loc.includes(g.sidoShort) || loc.includes(g.sidoName));
      return (both || named[0]).id;
    }
  }
  if (regionId) {
    const spot = AZIT_SPOTS.find((s) => !s.legacy && s.sigunguId && s.areaId === regionId);
    if (spot) return spot.sigunguId;
  }
  return null;
}

/** 두 좌표 사이 대략 거리(km) — 하버사인. */
function geoKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null || !Number.isFinite(Number(v)))) return null;
  const R = 6371;
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const dLat = toRad(lat2) - toRad(lat1);
  const dLng = toRad(lng2) - toRad(lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 거리 구간 표기 — 정확한 km 대신 '약 1~2km' 처럼 구간으로만 보여 준다. */
function distanceBucket(km) {
  if (km == null || !Number.isFinite(Number(km))) return '';
  const d = Number(km);
  if (d < 1) return '1km 이내';
  if (d < 2) return '약 1~2km';
  if (d < 3) return '약 2~3km';
  if (d < 5) return '약 3~5km';
  if (d < 10) return '약 5~10km';
  return '10km 이상';
}

/** 아지트 큰 분류 하나 */
function azitAreaDef(areaId) {
  return AZIT_AREAS.find((a) => a.id === areaId) || null;
}

/** 아지트 한 곳(없으면 null). */
function azitDef(azitId) {
  if (!azitId) return null;
  return AZIT_SPOTS.find((s) => s.id === azitId) || null;
}

/** 글에 들어 있는 아지트 이름·별칭으로 한 곳 찾기(옛 모임의 활동 지역 글). */
function azitFromText(text) {
  const hay = String(text || '').toLowerCase().trim();
  if (!hay) return null;
  return AZIT_SPOTS.find((s) => !s.legacy && hay.includes(s.name.toLowerCase()))
    || AZIT_SPOTS.find((s) => !s.legacy && (s.aliases || []).some((a) => a.length >= 2 && hay.includes(a.toLowerCase())))
    || null;
}

/** 아지트 표시 정보 — 이름·큰 분류·종류 라벨. */
function azitView(spot) {
  if (!spot) return null;
  const area = azitAreaDef(spot.areaId);
  const kind = AZIT_KINDS[spot.kind] || AZIT_KINDS.area;
  const sg = spot.sigunguId ? geoAreaView(spot.sigunguId) : null;
  return {
    id: spot.id,
    name: spot.name,
    kind: spot.kind,
    kindLabel: kind.label,
    icon: kind.icon,
    areaId: spot.areaId,
    areaName: area ? area.name : '우리 동네',
    regionId: spot.areaId,
    /* H2 — 시·도/시·군·구와 대략 좌표(주소 아님). */
    sidoId: spot.sidoId || (sg ? sg.sidoId : null),
    sidoName: sg ? sg.sidoName : null,
    sigunguId: spot.sigunguId || null,
    sigunguName: sg ? sg.name : null,
    lat: spot.lat == null ? null : spot.lat,
    lng: spot.lng == null ? null : spot.lng,
    legacy: spot.legacy === true
  };
}

/** 지역 id → 동네 정의(옛 id 는 지금 id 로 바꿔 찾는다). */
function regionDef(regionId) {
  const id = REGION_ALIASES[regionId] || regionId;
  return EXPLORE_REGIONS.find((r) => r.id === id) || null;
}

/** 큰 분류 정의 */
function regionGroupDef(groupId) {
  return EXPLORE_REGION_GROUPS.find((g) => g.id === groupId) || null;
}

/** 만남 스타일 정의 */
function meetStyleDef(styleId) {
  return EXPLORE_MEET_STYLES.find((s) => s.id === styleId) || null;
}

/* ---------------------------------------------------------------------------
 * Sprint 8 — 내 동네 반경(거리) 축
 * ---------------------------------------------------------------------------
 * 11/14 22:59 사용자 지시: "내 동네 반경 필터 넣어줘".
 *
 * · 반경은 '내 동네(성수동) 중심에서의 거리'다. 사람은 프로필의 distanceKm 를 그대로 쓰고,
 *   모임·글은 명시 거리가 없으면 그 생활권의 대표 거리(+아이디 기반의 작은 오프셋)로 계산한다.
 * · REGION_DISTANCE_KM: 생활권 중심까지의 대략 거리(km). null = 거리 개념이 없는 온라인.
 *   한 곳(measureDistanceKm)에서만 계산해 사람·모임·글이 같은 자로 재어진다.
 * · RADIUS 옵션은 저장 상태(exploreRadiusOptions)에 두어 마이그레이션·검증에서 함께 쓴다.
 * ------------------------------------------------------------------------- */
const REGION_DISTANCE_KM = {
  /* 서울 12권역 — 내 동네(동작.성동) 중심 */
  'seoul-dongjak-gwanak': 0.6, 'seoul-seocho-gangnam': 7.4, 'seoul-yeongdeungpo-guro-geumcheon': 8.4,
  'seoul-mapo-yongsan': 9.6, 'seoul-jongno-junggu': 10.4, 'seoul-seodaemun-eunpyeong': 11.4,
  'seoul-dongdaemun-seongbuk': 12.6, 'seoul-seongdong-gwangjin': 13.2, 'seoul-gangseo-yangcheon': 13.2,
  'seoul-gangdong-songpa': 14.6, 'seoul-gangbuk-dobong': 15.4, 'seoul-nowon-jungnang': 16.8,
  /* 경기 14권역 */
  'gyeonggi-anyang-gunpo-gwacheon': 22, 'gyeonggi-guri-hanam-namyangju': 24,
  'gyeonggi-seongnam-gwangju': 26, 'gyeonggi-ansan-siheung-gwangmyeong': 26,
  'gyeonggi-incheon-bucheon-gimpo': 28, 'gyeonggi-goyang-paju': 30,
  'gyeonggi-uijeongbu-yangju-dongducheon': 32, 'gyeonggi-suwon-yongin-uiwang': 34,
  'gyeonggi-hwaseong-osan': 42, 'gyeonggi-yangpyeong-gapyeong': 48, 'gyeonggi-pocheon-yeoncheon': 55,
  'gyeonggi-pyeongtaek-anseong': 62, 'gyeonggi-yeoju-icheon': 70, 'gyeonggi-etc': 45,
  /* 강원 5권역 */
  'gangwon-chuncheon': 78, 'gangwon-wonju': 96, 'gangwon-etc': 120,
  'gangwon-sokcho': 158, 'gangwon-gangneung': 165,
  /* 충청 6권역 */
  'chungcheong-cheonan-asan': 92, 'chungcheong-sejong': 130, 'chungcheong-cheongju': 120,
  'chungcheong-chungbuk': 140, 'chungcheong-chungnam': 140, 'chungcheong-daejeon': 162,
  /* 전라 4권역 */
  'jeolla-jeonju': 214, 'jeolla-jeonbuk': 220, 'jeolla-gwangju': 268, 'jeolla-jeonnam': 300,
  /* 경상 5권역 */
  'gyeongsang-daegu': 238, 'gyeongsang-gyeongbuk': 260, 'gyeongsang-ulsan': 307,
  'gyeongsang-gyeongnam': 320, 'gyeongsang-busan': 325,
  /* 한 곳뿐인 지역 */
  jeju: 452, overseas: null, bear: null
};

const EXPLORE_RADIUS_OPTIONS = [
  { id: 'all', name: '전체', km: null, icon: 'compass', desc: '거리 제한 없이' },
  { id: '1', name: '1km', km: 1, icon: 'walk', desc: '걸어서 10분' },
  { id: '3', name: '3km', km: 3, icon: 'bike', desc: '자전거 10분' },
  { id: '5', name: '5km', km: 5, icon: 'bus', desc: '버스 20분' },
  { id: '10', name: '10km', km: 10, icon: 'train', desc: '지하철 30분' }
];

/** 반경 옵션 id 가 실제 정의된 값인가. */
function isKnownRadius(radiusId) {
  return EXPLORE_RADIUS_OPTIONS.some((r) => r.id === radiusId);
}

/** Sprint 16 — 0~99세 범위 값 보정. 숫자가 아니면 fallback, 범위 밖은 잘라낸다. */
function clampAge(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(99, Math.round(n)));
}

/** 반경 옵션 id → km (전체 = null). */
function radiusKmOf(radiusId) {
  const hit = EXPLORE_RADIUS_OPTIONS.find((r) => r.id === radiusId);
  return hit ? hit.km : null;
}

/** 아이디에서 나오는 결정적 오프셋(0.3~1.7km) — 시드에 거리가 없는 항목도 흩어지게. */
function fallbackDistanceKm(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return Math.round((0.3 + (h % 140) / 100) * 10) / 10;
}

/** km → '850m' / '1.2km' (1km 미만은 m 로, 일관되게). */
function distanceLabel(km) {
  if (km == null || Number.isNaN(Number(km))) return '';
  const n = Number(km);
  if (n < 1) return `${Math.max(10, Math.round(n * 1000 / 10) * 10)}m`;
  return `${(Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '')}km`;
}

/** 동네 id 가 실제 정의된 동네인가. */
function isKnownRegion(regionId) {
  return !!regionDef(regionId);
}

/** 큰 분류 id 인가 (서울·경기·부산 …). */
function isKnownRegionGroup(groupId) {
  return !!regionGroupDef(groupId);
}

/** 옛 id 를 지금 id 로. 모르는 값은 null. */
function normalizeRegionId(regionId) {
  if (regionId == null || regionId === '') return null;
  const id = REGION_ALIASES[regionId] || regionId;
  return isKnownRegion(id) ? id : null;
}

/** 고른 지역 조건이 항목의 동네를 포함하는가 — 동네 id·큰 분류 id·'all' 을 모두 받는다. */
function regionFilterMatches(filterId, itemRegionId) {
  const id = normalizeRegionId(itemRegionId);
  if (!filterId || filterId === 'all') return true;
  if (filterId === 'nearby') return true;                 // 거리로 따로 판정한다
  const group = regionGroupDef(filterId);
  if (group) {
    const def = regionDef(id);
    return !!def && (def.groupId === group.id || def.id === group.id);
  }
  return id === normalizeRegionId(filterId);
}

/**
 * 자유 문장(활동 지역·모임 지역·태그)에서 동네 id 를 해석한다. 못 찾으면 null.
 * @param {string} text
 * @returns {string|null}
 */
function deriveRegionId(text) {
  const hay = String(text || '');
  if (!hay.trim()) return null;
  /* 가장 **긴** 키워드가 이긴다 — '인천 중구'처럼 짧은 동네 이름이 겹치는 문장에서
     '중구'(서울) 보다 '인천'(경기 권역)을 고르게 하려면 긴 쪽을 먼저 봐야 한다. */
  let best = null;
  let bestLen = 0;
  EXPLORE_REGIONS.forEach((r) => {
    (r.keywords || []).forEach((k) => {
      if (!k || k.length <= bestLen) return;
      if (hay.includes(k)) { best = r.id; bestLen = k.length; }
    });
  });
  return best;
}

/**
 * 저장 상태의 모든 사람·모임·글에 regionId 를 일관되게 채운다 (Sprint 7 · 23 개편).
 * - 명시된 regionId 가 유효하면 그대로 존중한다(옛 id 는 새 동네 id 로 옮긴다).
 * - 없으면 location/태그 문장에서 해석하고, 글은 작성자·소속 모임의 지역을 따른다.
 * 부팅·마이그레이션·프로필 수정·개설/작성 직후 같은 함수를 쓴다 → 데이터가 어긋나지 않는다.
 * @param {object} state 저장 상태(직접 변경한다)
 * @returns {object} state
 */
function applyRegionIds(state) {
  if (!state) return state;
  const fallback = 'seoul-dongjak-gwanak';
  const pick = (explicit, ...texts) => {
    const known = normalizeRegionId(explicit);
    if (known) return known;
    for (const t of texts) {
      const id = deriveRegionId(t);
      if (id) return id;
    }
    return null;
  };

  (state.matchProfiles || []).forEach((p) => {
    p.regionId = pick(p.regionId, p.location) || fallback;
  });
  (state.partnerProfiles || []).forEach((p) => {
    p.regionId = pick(p.regionId, p.location) || fallback;
  });
  (state.groups || []).forEach((g) => {
    g.regionId = pick(g.regionId, g.location, (g.tags || []).join(' ')) || fallback;
  });

  const personRegion = (authorId) => {
    const person = (state.matchProfiles || []).find((p) => p.id === authorId)
      || (state.partnerProfiles || []).find((p) => p.id === authorId);
    return person ? person.regionId : null;
  };
  const uid = (state.currentUser || {}).id;
  if (state.currentUser) {
    state.currentUser.regionId = pick(state.currentUser.regionId, state.currentUser.location) || fallback;
  }
  (state.explorePosts || []).forEach((post) => {
    post.regionId = pick(post.regionId, post.location, post.groupName)
      || (post.authorId === uid ? state.currentUser.regionId : personRegion(post.authorId))
      || fallback;
  });
  (state.feedPosts || []).forEach((post) => {
    const group = (state.groups || []).find((g) => g.id === post.groupId);
    post.regionId = pick(post.regionId, group ? group.location : '')
      || (group ? group.regionId : null)
      || (post.authorId === uid ? state.currentUser.regionId : personRegion(post.authorId))
      || fallback;
  });
  return state;
}

/* 시뮬레이션 트리거가 쓰는 '다른 이용자' 페르소나 (시드 인물과 겹치지 않게 고른다) */
const SIMULATED_PERSONAS = [
  { id: 'user_kettle', name: '케틀벨러버', age: 28, avatarText: '케', gradient: 'linear-gradient(135deg, #05AF7A 0%, #0FAB78 100%)', hobby: '크로스핏' },
  { id: 'user_night', name: '야간비행', age: 32, avatarText: '야', gradient: 'linear-gradient(135deg, #7994E2 0%, #76CFF6 100%)', hobby: '러닝' },
  { id: 'user_faker', name: '미드장인', age: 26, avatarText: '미', gradient: 'linear-gradient(135deg, #AA83E7 0%, #E0D0FB 100%)', hobby: '게임' },
  { id: 'user_iron', name: '아이언', age: 34, avatarText: '아', gradient: 'linear-gradient(135deg, #DFE3E9 0%, #8098D2 100%)', hobby: '헬스' },
  { id: 'user_hold', name: '홀드', age: 29, avatarText: '홀', gradient: 'linear-gradient(135deg, #14A5CC 0%, #10B0C8 100%)', hobby: '클라이밍' }
];

/* ---------------------------------------------------------------------------
 * 0. 표준 데이터 모델 (Standard Schemas) — 주석으로 규격을 고정해 둔다.
 * ---------------------------------------------------------------------------
 * currentUser : { id, nickname, handle, role, membership, avatarGradient,
 *                 location, coords, hobbies, workoutSpec, bio,
 *                 joinedGroupIds[] }
 * group       : { id, name, category, categoryName, hobbyId, icon,
 *                 location, distanceKm, memberCount, maxMembers, meetLabel,
 *                 privacyType, privacyLabel, description, tags[], rules,
 *                 leaderId, leaderName, customTags[], ratio, members[] }
 *                 ← hobbyId: 탐색 취미 필터와 맞물리는 키 (category 와 별개로 정규화)
 *                 ← members: 실제로 승인된 멤버(없으면 모임장·나만) — 지어낸 이름은 쓰지 않는다
 *                 ← ratio: 'wide'(4:3) | 'square'(1:1) — 2열 메이슨리의 높이 변주
 * post        : { id, groupId, authorId, authorName, authorAvatarText,
 *                 authorGradient, tag, caption, photoUrl, mediaCaption,
 *                 likes, likedByMe, bookmarkedByMe,
 *                 comments[{ id, authorId, authorName, text, createdAt }],
 *                 createdAt }               ← createdAt 은 ISO 문자열
 * comment     : { id, authorId, authorName, text, createdAt }
 * matchProfile: { id, nickname, age, distanceKm, location,
 *                 hobbyIds[], hobbyLabel, hobbyIcon,   ← 탐색 취미 필터의 기준
 *                 badge,                                ← 카드 좌상단 감각 배지 (아이콘 + '롤 다이아몬드')
 *                 hobbyStyle,                           ← A: 취미 스타일·구력 ("롤 다이아 · 원딜")
 *                 cycle, cycleIcon,                    ← 선호 활동 주기·시간대
 *                 hobbies[], specChips[{icon,label,value}], bio,
 *                 photoUrl, avatarText, avatarGradient, ratio,
 *                 likesMe, verified }
 *                 ← ratio: 'tall'(3:4) | 'mid'(4:5) | 'square'(1:1) — 메이슨리 높이 변주
 *                 ← likesMe: 이미 나를 LIKE한 상대 (상호 LIKE 판정의 유일한 근거)
 * matchSwipe  : { profileId, direction:'like'|'pass'|'super', at, roomId }
 *                 ← roomId: 이 스와이프로 '새로' 열린 대화방 id
 * chatRoom    : { id, partnerId, partnerName, partnerHobby, partnerAvatarText,
 *                 partnerGradient, lastMessage, lastTime, unreadCount,
 *                 isNewMatch, matchedAt,
 *                 messages[{ id, from:'me'|'them', text, at }] }
 *                 ← Sprint 4: 인앱 1:1 대화방의 실제 메시지 내역
 * chatMessage : { id, from, text, at }
 * explorePost : { id, authorId, authorName, authorAvatarText, authorGradient,
 *                 hobbyId, hobbyLabel, tag, caption, photoUrl, mediaCaption,
 *                 ratio:'wide'(4:3)|'square'(1:1), groupName,
 *                 likes, likedByMe, comments[{ id, authorName, text, createdAt }],
 *                 createdAt, isMine }
 *                 ← Sprint 4: 탐색 피드의 '게시글' 카드. 모임 프라이빗 피드(feedPosts)와
 *                   분리된 **공개** 취미 커뮤니티 글이다(프라이버시 원칙 유지).
 * partnerProfile: matchProfile 과 같은 규격의 보조 프로필(모임에서 만난 동료 등).
 *                 대화방 헤더의 '취미 프로필 보기'가 이 규격을 그대로 재사용한다.
 * ------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
 * Sprint 21 — 취미 분류 체계 (대분류 → 세부 취미 → 이용자 직접 작성)
 * ---------------------------------------------------------------------------
 * 11/16 18:42 사용자: "현재 취미는 없는거들이 많아 일단 큰틀인 운동, 게임, 독서,
 * 맛집, 여행 등 넣고 안에 세부적인것좀 채워주고 없는거는 이용자가 작성하게끔".
 *
 *  · 7개 대분류 아래 42개 세부 취미를 기본으로 둔다. id 는 옛 데이터(모임 hobbyId·
 *    사람 카드 hobbyIds·게시글 hobbyId)와 그대로 이어진다 — 기존 id 는 이름만 다듬었다.
 *  · core:true 인 8종은 탐색 필터의 '핵심 취미'로 위에 놓인다(옛 칩 8종과 같은 id).
 *  · tone 은 사진 없는 모임 표지·배지의 점토 색조다(운동=그린 · 게임=보라 · 독서=틸 ·
 *    맛집=앰버 · 여행=스카이 · 문화=코랄 · 일상=민트).
 *  · 목록에 없는 취미는 state.customHobbies 에 쌓이고, 같은 곳에서 필터·프로필·모임
 *    개설이 함께 읽는다(모듈마다 따로 두지 않는다).
 * ------------------------------------------------------------------------- */
const HOBBY_TAXONOMY = [
  {
    id: 'sports', name: '운동·스포츠', icon: 'dumbbell', tone: 'green',
    hobbies: [
      { id: 'fitness', name: '헬스·크로스핏', icon: 'dumbbell', core: true },
      { id: 'run', name: '러닝', icon: 'run', core: true },
      { id: 'swim', name: '수영', icon: 'swim', core: true },
      { id: 'climb', name: '클라이밍', icon: 'climb', core: true },
      { id: 'hike', name: '등산·트레킹', icon: 'mountain' },
      { id: 'yoga', name: '요가·필라테스', icon: 'yoga' },
      { id: 'tennis', name: '테니스', icon: 'tennis' },
      { id: 'badminton', name: '배드민턴', icon: 'shuttle' },
      { id: 'soccer', name: '축구', icon: 'soccer' },
      { id: 'basketball', name: '농구', icon: 'basketball' },
      { id: 'bike', name: '자전거', icon: 'bike' },
      { id: 'golf', name: '골프', icon: 'golf' },
      { id: 'bowling', name: '볼링', icon: 'bowling' },
      /* v33.5 — 11/22 01:02 루키 님: "이름이나 설명에 영화나 당구, 롤, 하스스톤 같은 게
         언급되면 다음에 자동 추천" — 당구는 목록에 없어 운동·스포츠의 '볼링'으로 밀리던 것을
         제 취미로 세웠다(당구·포켓볼). */
      { id: 'billiards', name: '당구·포켓볼', icon: 'circleDot' },
      { id: 'ski', name: '스키·보드', icon: 'ski' }
    ]
  },
  {
    id: 'game', name: '게임', icon: 'gamepad', tone: 'violet',
    hobbies: [
      { id: 'game', name: '게임', icon: 'gamepad', core: true },
      { id: 'pcgame', name: 'PC·e스포츠', icon: 'pcgame' },
      { id: 'boardgame', name: '보드게임', icon: 'dice', core: true },
      { id: 'console', name: '콘솔 게임', icon: 'gamepad' },
      { id: 'trpg', name: 'TRPG', icon: 'dice' }
    ]
  },
  {
    id: 'read', name: '독서·글', icon: 'book', tone: 'teal',
    hobbies: [
      { id: 'novel', name: '소설', icon: 'book' },
      { id: 'essay', name: '에세이', icon: 'note' },
      { id: 'bookclub', name: '독서모임', icon: 'book' },
      { id: 'comics', name: '만화·웹툰', icon: 'image' },
      { id: 'writing', name: '글쓰기', icon: 'pencil' }
    ]
  },
  {
    id: 'food', name: '맛집·카페', icon: 'cup', tone: 'amber',
    hobbies: [
      { id: 'cafe', name: '카페·맛집', icon: 'cup', core: true },
      { id: 'cooking', name: '요리', icon: 'cook' },
      { id: 'baking', name: '베이킹', icon: 'cake' },
      { id: 'wine', name: '와인·술', icon: 'wine' },
      { id: 'brunch', name: '브런치', icon: 'meal' }
    ]
  },
  {
    id: 'travel', name: '여행·야외', icon: 'globe', tone: 'sky',
    hobbies: [
      { id: 'domestic', name: '국내여행', icon: 'train' },
      { id: 'travel', name: '해외여행', icon: 'globe' },
      { id: 'camping', name: '캠핑', icon: 'tent' },
      { id: 'drive', name: '드라이브', icon: 'car' },
      { id: 'fishing', name: '낚시', icon: 'fishing' },
      { id: 'photo', name: '사진', icon: 'camera' }
    ]
  },
  {
    id: 'culture', name: '문화·예술', icon: 'palette', tone: 'coral',
    hobbies: [
      { id: 'movie', name: '영화·전시', icon: 'movie', core: true },
      { id: 'performance', name: '공연·뮤지컬', icon: 'theater' },
      { id: 'music', name: '음악·밴드', icon: 'music' },
      { id: 'dance', name: '댄스', icon: 'dance' },
      { id: 'gallery', name: '미술·전시', icon: 'palette' }
    ]
  },
  {
    id: 'daily', name: '일상·기타', icon: 'sparkle', tone: 'mint',
    hobbies: [
      { id: 'pet', name: '반려동물', icon: 'paw' },
      { id: 'plant', name: '식물·정원', icon: 'leaf' },
      { id: 'fashion', name: '패션', icon: 'shirt' },
      { id: 'volunteer', name: '봉사', icon: 'handshake' },
      { id: 'study', name: '스터디·언어', icon: 'study' }
    ]
  }
];

/* 대분류 색조 키 → 카테고리 토큰 번호.
   색의 정의는 CSS 의 --cat-1~7 · --cat-1-soft~7-soft · --cat-neutral 한 곳뿐이고,
   JS 는 그 토큰 이름만 돌려준다(라이트·다크가 같은 토큰으로 함께 움직인다).
   · 순서 = HOBBY_TAXONOMY 순서: 운동 1 · 게임 2 · 독서 3 · 맛집 4 · 여행 5 · 문화 6 · 일상 7
   · 옛 색조 이름(green·violet·teal·amber·sky·coral·mint)은 CSS 클래스(.tone-*)와 함께 쓰는 별칭이다. */
const TONE_CAT = {
  green: 1, violet: 2, teal: 3, amber: 4, sky: 5, coral: 6, mint: 7
};

/** 세부 취미 한 줄 — 대분류 id 를 붙인 평면 목록(필터·칩·프로필 공용). */
const HOBBY_FLAT = HOBBY_TAXONOMY.reduce((list, cat) => list.concat(
  cat.hobbies.map((h) => ({
    id: h.id, name: h.name, icon: h.icon, categoryId: cat.id,
    categoryName: cat.name, tone: cat.tone, core: h.core === true
  }))
), []);

/* ============================================================================
 * v33.5 — 이름·한 줄 소개에서 취미를 찾는다 (2단계 자동 추천)
 * ----------------------------------------------------------------------------
 * 11/22 01:02 루키 님: "모임 이름이나 설명에 영화나 당구, 롤, 하스스톤 이런 것처럼
 * 언급이 되면 다음 눌렀을 때 카테고리에 자동으로 추천되는 카테고리로 해줄 수 있어?"
 *
 *  · 기획: **글자 그대로 찾는다.** 형태소 분석기 없이, 사용자가 실제로 쓰는 말
 *    (롤·하스스톤·당구·넷플릭스·크로스핏 …)을 취미마다 모아 두고 부분 문자열로 본다.
 *  · 한국어는 조사가 붙어('롤을', '당구치러') 띄어쓰기로 자를 수 없으므로 부분 일치가 기본이다.
 *    대신 짧은 말('롤' ← 컨트롤, '술' ← 기술·미술, '마크' ← 북마크)은
 *    SUGGEST_BLOCKERS 로 **오해할 말을 지운 사본**에서 다시 찾는다.
 *  · 고르는 법: **긴 말이 이긴다**(보드게임 > 게임 · 스크린골프 > 골프), 같으면 **앞에 나온 말**.
 *  · 세부 취미가 아니라 대분류만 걸리는 말('여행', '운동')은 대분류만 추천한다(세부는 이용자가 고른다).
 * ========================================================================== */
const HOBBY_SUGGEST_RULES = [
  /* ---- 운동·스포츠 ---- */
  { hobbyId: 'billiards', keywords: ['당구', '당구장', '포켓볼', '큐대', '쓰리쿠션', '3쿠션', '4구'] },
  { hobbyId: 'fitness', keywords: ['헬스', '헬스장', '크로스핏', '웨이트', '웨이트트레이닝', '데드리프트', '스쿼트', '벤치프레스', '벤치', '3대', '보디빌딩', '피트니스', '근력', '운동'] },
  { hobbyId: 'run', keywords: ['러닝', '달리기', '마라톤', '조깅', '뛰기', '러너', '하프마라톤', '트레일런', '한강런', '10k', '5k'] },
  { hobbyId: 'swim', keywords: ['수영', '수영장', '자유형', '평영', '접영', '실내수영', '오픈워터'] },
  { hobbyId: 'climb', keywords: ['클라이밍', '클라임', '볼더링', '볼더', '암벽', '인공암벽', '클라이머'] },
  { hobbyId: 'hike', keywords: ['등산', '등반', '산행', '트레킹', '백패킹', '둘레길', '산정상'] },
  { hobbyId: 'yoga', keywords: ['요가', '필라테스', '스트레칭', '명상'] },
  { hobbyId: 'tennis', keywords: ['테니스', '테니스장', '테니스화'] },
  { hobbyId: 'badminton', keywords: ['배드민턴', '셔틀콕'] },
  { hobbyId: 'soccer', keywords: ['축구', '풋살', '조기축구', '축구화', '축구장'] },
  { hobbyId: 'basketball', keywords: ['농구', '농구장', '농구공', '3on3', '3대3'] },
  { hobbyId: 'bike', keywords: ['자전거', '라이딩', '사이클', '로드바이크', 'mtb', '자출', '자출족'] },
  { hobbyId: 'golf', keywords: ['골프', '스크린골프', '골프장', '라운딩', '퍼팅', '티샷', '골프채'] },
  { hobbyId: 'bowling', keywords: ['볼링', '볼링장', '볼링공'] },
  { hobbyId: 'ski', keywords: ['스키', '스키장', '스노보드', '스노우보드', '슬로프'] },

  /* ---- 게임 ---- */
  { hobbyId: 'pcgame', keywords: ['리그오브레전드', '롤토체스', '하스스톤', '배틀그라운드', '스타크래프트', '오버워치', '발로란트', '서든어택', '던전앤파이터', '로스트아크', '마인크래프트', 'fc온라인', 'e스포츠', '이스포츠', 'pc방',
    '롤', '협곡', '랭크', '배그', '옵치', '서든', '피파', '메이플', '던파', '로아', '원신', '마크', '스팀', '스타', 'lol', 'tft'] },
  { hobbyId: 'boardgame', keywords: ['보드게임', '보드카페', '보드', '마작', '체스', '카탄', '루미큐브', '할리갈리', '젠가', '다이스', '주사위'] },
  { hobbyId: 'console', keywords: ['닌텐도', '플레이스테이션', '스위치', '플스', '엑스박스', '엑박', '콘솔', '젤다', '포켓몬', '마리오', '동물의숲', '모동숲', 'ps5', 'ps4'] },
  { hobbyId: 'trpg', keywords: ['trpg', '던전앤드래곤', '크툴루', '테이블탑', 'd&d'] },
  { hobbyId: 'game', keywords: ['게임', '게이머', '게임방', '겜'] },

  /* ---- 독서·글 ---- */
  { hobbyId: 'novel', keywords: ['소설', '소설책', '장편소설', '웹소설'] },
  { hobbyId: 'essay', keywords: ['에세이', '수필', '산문'] },
  { hobbyId: 'bookclub', keywords: ['독서모임', '독서토론', '책모임', '북클럽', '독서', '완독', '책읽기', '책'] },
  { hobbyId: 'comics', keywords: ['만화', '웹툰', '코믹스', '만화책'] },
  { hobbyId: 'writing', keywords: ['글쓰기', '필사', '작문', '시나리오', '블로그', '글쓰는'] },

  /* ---- 맛집·카페 ---- */
  { hobbyId: 'cafe', keywords: ['카페투어', '카페거리', '맛집투어', '카페', '커피', '맛집', '디저트', '라떼', '에스프레소', '삼겹살', '고기집', '초밥', '국밥', '떡볶이', '파스타', '냉면', '치킨', '먹방', '맛집탐방'] },
  { hobbyId: 'cooking', keywords: ['자취요리', '요리모임', '요리', '집밥', '레시피', '쿡방', '반찬'] },
  { hobbyId: 'baking', keywords: ['홈베이킹', '베이킹', '제과', '제빵', '쿠키', '브라우니', '마카롱', '케이크'] },
  { hobbyId: 'wine', keywords: ['와인', '위스키', '맥주', '소주', '칵테일', '사케', '하이볼', '술'] },
  { hobbyId: 'brunch', keywords: ['브런치', '조식', '아침식사'] },

  /* ---- 여행·야외 ---- */
  { hobbyId: 'camping', keywords: ['캠핑', '차박', '글램핑', '오토캠핑', '캠핑장', '캠핑카'] },
  { hobbyId: 'fishing', keywords: ['낚시', '낚시터', '배스낚시', '루어', '찌낚시', '바다낚시', '낚시대'] },
  { hobbyId: 'photo', keywords: ['사진', '카메라', '출사', '스냅', '필름카메라', '인생샷', '사진관'] },
  { hobbyId: 'drive', keywords: ['드라이브코스', '로드트립', '드라이브'] },
  { hobbyId: 'domestic', keywords: ['국내여행', '제주여행', '강릉여행', '부산여행', '기차여행', '당일치기', '제주도', '국내'] },
  { hobbyId: 'travel', keywords: ['해외여행', '유럽여행', '일본여행', '배낭여행', '세계여행', '동남아', '해외'] },

  /* ---- 문화·예술 ---- */
  { hobbyId: 'movie', keywords: ['영화관', '영화모임', '영화제', '애니메이션', '넷플릭스', '디즈니', '스타워즈', '영화', '극장', '시네마', '왓챠', '티빙', '마블', 'ott', '팝콘'] },
  { hobbyId: 'performance', keywords: ['뮤지컬', '연극', '공연장', '공연'] },
  { hobbyId: 'music', keywords: ['인디밴드', '기타연주', '페스티벌', '콘서트', '클래식', '재즈', '힙합', '음악', '밴드', '드럼', '피아노', '작곡', '보컬', '합주'] },
  { hobbyId: 'dance', keywords: ['스트리트댄스', '커버댄스', '댄스', '안무', '춤'] },
  { hobbyId: 'gallery', keywords: ['미술관', '전시회', '갤러리', '드로잉', '도슨트', '수채화', '크로키', '미술', '전시', '그림', '유화', '아트'] },

  /* ---- 일상·기타 ---- */
  { hobbyId: 'pet', keywords: ['반려동물', '반려견', '반려묘', '반려식물', '강아지', '고양이', '댕댕이', '냥이', '멍냥', '애견', '반려', '펫'] },
  { hobbyId: 'plant', keywords: ['가드닝', '플랜테리어', '반려식물', '식물', '화분', '원예', '다육', '텃밭', '정원'] },
  { hobbyId: 'fashion', keywords: ['스타일링', '패션모임', '패션', '코디', '빈티지', '옷장'] },
  { hobbyId: 'volunteer', keywords: ['자원봉사', '봉사활동', '재능기부', '봉사', '기부', '나눔'] },
  { hobbyId: 'study', keywords: ['스터디모임', '언어교환', '자격증', '스터디', '공부', '영어', '일본어', '중국어', '코딩', '토익', '오픽', '회화'] }
];

/** 대분류만 걸리는 말 — 세부 취미는 이용자가 고른다. */
const HOBBY_SUGGEST_CATEGORIES = [
  { categoryId: 'sports', keywords: ['스포츠', '체육', '운동'] },
  { categoryId: 'game', keywords: ['게임', '겜'] },
  { categoryId: 'read', keywords: ['독서', '책', '글'] },
  { categoryId: 'food', keywords: ['맛집', '먹방', '음식', '요리', '카페'] },
  { categoryId: 'travel', keywords: ['여행', '여행지', '나들이'] },
  { categoryId: 'culture', keywords: ['문화', '예술', '공연', '전시'] },
  { categoryId: 'daily', keywords: ['일상', '취미'] }
];

/** 짧은 말이 다른 낱말 안에 들어 있을 때 — 그 낱말을 지운 사본에서 다시 찾는다. */
const SUGGEST_BLOCKERS = {
  '롤': ['컨트롤', '롤러', '롤케이크', '롤케익', '롤모델', '롤스로이스', '롤링'],
  '스타': ['스타벅스', '스타트업', '스타일', '스타킹', '스타필드', '스타디움', '스타트', '스타강사', '슈퍼스타'],
  '마크': ['북마크', '마크업'],
  '술': ['기술', '예술', '미술', '술어', '술사', '요술'],
  '그림': ['그림자'],
  '아트': ['스마트', '아트웍'],
  '춤': ['맞춤', '춤법'],
  '보드': ['키보드', '스노보드', '스노우보드', '마더보드', '스키보드', '화이트보드', '사운드보드'],
  '카페': ['카페인'],
  '코디': ['코디네이터'],
  '드라이브': ['하드드라이브', '외장드라이브', 'usb드라이브', '드라이브설치'],
  '스키': ['스키니'],
  '책': ['산책', '정책', '책임', '대책', '문책', '과책'],
  '글': ['글자', '글쎄', '글씨', '글귀'],
  '3대': ['3대째']
};

/** 검색용 색인 — 한 번만 만든다(말 → 취미). */
const HOBBY_SUGGEST_INDEX = HOBBY_SUGGEST_RULES.reduce((rows, rule) => rows.concat(
  rule.keywords.map((k) => ({ k: String(k).toLowerCase(), hobbyId: rule.hobbyId }))
), []);

/** 비교용으로 글자를 낮추고 공백을 하나로 — 저장된 이름·소개는 건드리지 않는다. */
function normalizeSuggestText(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 말 하나를 찾는다. 오해할 낱말(블로커)은 지운 사본에서 본다. */
function findSuggestKeyword(text, keyword) {
  const k = String(keyword == null ? '' : keyword).toLowerCase();
  if (!k) return -1;
  let copy = text;
  const blockers = SUGGEST_BLOCKERS[k];
  if (blockers && blockers.length) blockers.forEach((b) => { copy = copy.split(b).join(' '); });
  return copy.indexOf(k);
}

/* ============================================================================
 * Sprint 25 — 지역 시드 (데모 계정 · 테스트 · #demo 미리보기 전용)
 * ----------------------------------------------------------------------------
 * 11/17 01:05 사용자 지시로 탐색 지역을 이반시티 '우리동네'와 같은 2단 체계로
 * 바꾸면서, **모든 권역에 최소 한 건씩** 공개 글과 사람을 두었다.
 *  · 어느 지역 칩을 눌러도 빈 화면이 아니라 그 동네의 글이 보인다.
 *  · 실제 방문자(새 계정)는 여전히 빈 앱에서 시작한다 — buildCleanState 가 지운다.
 *  · 표: [권역 id, 취미 id, 만남 스타일, 글 한 줄]
 * ========================================================================== */
const REGION_SEED_POSTS = [
  ['seoul-jongno-junggu', 'wine', 'drink', '을지로 노포에서 퇴근 한잔 하실 분. 금요일 8시, 조용한 데로 골라둘게요.'],
  ['seoul-dongdaemun-seongbuk', 'movie', 'comfortable', '성북예술창작센터 근처에서 같이 영화 볼 분. 이번 주 토요일 낮이에요.'],
  ['seoul-mapo-yongsan', 'cafe', 'comfortable', '연남동 카페 한 바퀴 같이 도실 분. 커피 이야기 좋아해요.'],
  ['seoul-seodaemun-eunpyeong', 'hike', 'now', '안산 자락길 지금 가볍게 걷고 오실 분. 한 시간 반이면 충분해요.'],
  ['seoul-seongdong-gwangjin', 'climb', 'now', '뚝섬 볼더링 지금 가시는 분? 저는 V3 정도 풀어요.'],
  ['seoul-gangbuk-dobong', 'run', 'comfortable', '수유천 따라 저녁 러닝 하실 분. 5K, 대화 되는 속도로요.'],
  ['seoul-nowon-jungnang', 'boardgame', 'comfortable', '노원 보드게임카페에서 주말 오후 가볍게 한 판 하실 분.'],
  ['seoul-seocho-gangnam', 'fitness', 'drink', '대치 21시 헬스 끝나고 단백질 한 잔 하실 분.'],
  ['seoul-gangdong-songpa', 'swim', 'comfortable', '잠실 실내수영장 평일 아침 같이 다니실 분 찾아요.'],
  ['seoul-gangseo-yangcheon', 'bike', 'now', '마곡 발산천 자전거 지금 한 시간만 타실 분.'],
  ['seoul-dongjak-gwanak', 'drink', 'drink', '성수역 근처 지금 가볍게 한잔하실 분. 저는 21시쯤 시간 돼요.'],
  ['seoul-yeongdeungpo-guro-geumcheon', 'cafe', 'comfortable', '여의도 점심시간에 짧게 커피 하실 분. 12시 반이요.'],
  ['gyeonggi-incheon-bucheon-gimpo', 'boardgame', 'comfortable', '부평 보드게임카페 주말 오후에 4인 모집해요.'],
  ['gyeonggi-suwon-yongin-uiwang', 'climb', 'comfortable', '광교 볼더링 같이 가실 분. 평일 저녁도 좋아요.'],
  ['gyeonggi-goyang-paju', 'movie', 'comfortable', '일산 웨스턴돔에서 영화 보고 간단히 한잔 하실 분.'],
  ['gyeonggi-ansan-siheung-gwangmyeong', 'run', 'now', '배곧 해안길 저녁 러닝 5K 같이 뛰실 분.'],
  ['gyeonggi-seongnam-gwangju', 'cafe', 'comfortable', '분당 정자동 카페에서 주말 낮에 수다 떨 분.'],
  ['gyeonggi-anyang-gunpo-gwacheon', 'fitness', 'comfortable', '평촌 20시 헬스 같이 다니실 분 찾아요.'],
  ['gyeonggi-hwaseong-osan', 'soccer', 'comfortable', '동탄 풋살 정기 모임에 한 자리 있어요. 수요일 밤이요.'],
  ['gyeonggi-pyeongtaek-anseong', 'hike', 'comfortable', '평택 진위천 둘레길 가볍게 걷실 분.'],
  ['gyeonggi-guri-hanam-namyangju', 'bike', 'comfortable', '미사 한강 자전거길 주말 오전 같이 타실 분.'],
  ['gyeonggi-uijeongbu-yangju-dongducheon', 'bowling', 'now', '의정부 볼링장 평일 저녁에 가볍게 한 게임 하실 분.'],
  ['gyeonggi-yeoju-icheon', 'camping', 'comfortable', '이천 캠핑장 주말 자리가 남아서 같이 가실 분.'],
  ['gyeonggi-pocheon-yeoncheon', 'hike', 'comfortable', '포천 산정호수 둘레길 주말에 걷실 분.'],
  ['gyeonggi-yangpyeong-gapyeong', 'drive', 'comfortable', '가평 드라이브 코스 같이 돌 분. 커피 한 잔 들고요.'],
  ['gyeonggi-etc', 'cafe', 'comfortable', '경기 어디든 퇴근 후 만나서 수다 떨 분.'],
  ['gangwon-chuncheon', 'hike', 'now', '춘천 봉의산 아침 산책 같이 하실 분.'],
  ['gangwon-wonju', 'cafe', 'comfortable', '원주 혁신도시 근처 카페에서 저녁에 이야기 나눌 분.'],
  ['gangwon-sokcho', 'swim', 'comfortable', '속초 바다 수영 주말 아침 같이 하실 분.'],
  ['gangwon-gangneung', 'camping', 'comfortable', '강릉 경포 캠핑장 이번 주말 같이 가실 분.'],
  ['gangwon-etc', 'hike', 'comfortable', '강원 어디든 설악 쪽 등산 같이 가실 분.'],
  ['chungcheong-daejeon', 'boardgame', 'comfortable', '둔산동 보드게임카페 주말 오후에 한 판 하실 분.'],
  ['chungcheong-sejong', 'run', 'comfortable', '세종 호수공원 저녁 러닝 같이 뛰실 분.'],
  ['chungcheong-cheonan-asan', 'swim', 'comfortable', '천안 불당 수영장 평일 아침 같이 다니실 분.'],
  ['chungcheong-cheongju', 'cafe', 'comfortable', '청주 사창에서 커피 하실 분. 주말 낮 좋아요.'],
  ['chungcheong-chungbuk', 'hike', 'comfortable', '충주 계명산 가볍게 오르실 분.'],
  ['chungcheong-chungnam', 'fishing', 'comfortable', '서산 해미 쪽 낚시 같이 가실 분.'],
  ['jeolla-gwangju', 'wine', 'drink', '광주 상무지구 금요일 한잔 하실 분.'],
  ['jeolla-jeonju', 'cafe', 'comfortable', '전주 한옥마을 카페 한 바퀴 같이 도실 분.'],
  ['jeolla-jeonnam', 'fishing', 'comfortable', '순천만 근처 낚시 주말에 같이 하실 분.'],
  ['jeolla-jeonbuk', 'movie', 'comfortable', '익산 영화관 주말 낮에 같이 보실 분.'],
  ['gyeongsang-busan', 'soccer', 'comfortable', '서면 풋살 수요일 밤에 한 자리 있어요.'],
  ['gyeongsang-daegu', 'cafe', 'comfortable', '동성로에서 커피 하실 분. 저는 주말 오후에 시간 돼요.'],
  ['gyeongsang-ulsan', 'run', 'comfortable', '울산 태화강 저녁 러닝 같이 하실 분.'],
  ['gyeongsang-gyeongnam', 'hike', 'comfortable', '창원 장복산 주말 아침 가볍게 오르실 분.'],
  ['gyeongsang-gyeongbuk', 'bike', 'comfortable', '포항 환호공원 자전거 같이 타실 분.'],
  ['jeju', 'drive', 'comfortable', '제주 한 바퀴 같이 돌 분. 주말 하루 비워두세요.'],
  ['overseas', 'travel', 'comfortable', '다음 달 도쿄 가는데 같이 다닐 분 있나요.'],
  ['bear', 'wine', 'drink', '베어 모임 사람들끼리 와인 한잔 어때요. 이번 주 토요일 저녁이요.'],
];

/** 지역 시드 인물 — 큰 분류마다 한 명씩(서울은 셋). */
const REGION_SEED_PEOPLE = [
  {
    id: 'match_area_taeo', nickname: '태오', age: 29, regionId: 'seoul-dongjak-gwanak',
    hobbyId: 'fitness', hobbyStyle: '크로스핏 3년 · 평일 저녁 20시', location: '성수동', cycle: '평일 저녁',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '크로스핏 3년' },
        { icon: 'clock', label: '활동 시간', value: '클린 70kg' },
        { icon: 'pin', label: '주 활동지', value: '퇴근 후 20시' }
    ],
    bio: '성수에서 크로스핏 3년 했어요. 운동 끝나고 단백질 한 잔 하면서 이야기하는 걸 좋아합니다.'
  },
  {
    id: 'match_area_sion', nickname: '시온', age: 27, regionId: 'seoul-seongdong-gwangjin',
    hobbyId: 'cafe', hobbyStyle: '성수 카페투어 · 핸드드립', location: '성수동', cycle: '주말 낮',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '핸드드립 4년차' },
        { icon: 'clock', label: '활동 시간', value: '카페 30곳' },
        { icon: 'pin', label: '주 활동지', value: '주말 12시~' }
    ],
    bio: '성수동 산책하면서 카페 한두 곳 들르는 게 요즘 낙이에요.'
  },
  {
    id: 'match_area_gyumin', nickname: '규민', age: 32, regionId: 'seoul-seocho-gangnam',
    hobbyId: 'run', hobbyStyle: '한강 나이트런 · 10K 5분 10초', location: '대치동', cycle: '평일 밤',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '10K 51분' },
        { icon: 'clock', label: '활동 시간', value: '평일 22시' },
        { icon: 'pin', label: '주 활동지', value: '한강 코스' }
    ],
    bio: '대치에서 일하고 밤에 한강 달립니다. 같이 뛸 페이스 맞는 분 찾아요.'
  },
  {
    id: 'match_area_doyeong', nickname: '도영', age: 30, regionId: 'gyeonggi-suwon-yongin-uiwang',
    hobbyId: 'climb', hobbyStyle: '광교 볼더링 · V4', location: '수원 영통', cycle: '주말 오전',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '볼더링 2년' },
        { icon: 'clock', label: '활동 시간', value: 'V4' },
        { icon: 'pin', label: '주 활동지', value: '광교 클라이밍장' }
    ],
    bio: '광교 쪽 볼더링장 다녀요. 주말 오전에 같이 가실 분 환영입니다.'
  },
  {
    id: 'match_area_jaeha', nickname: '재하', age: 26, regionId: 'gyeonggi-incheon-bucheon-gimpo',
    hobbyId: 'boardgame', hobbyStyle: '부평 보드게임 · 전략게임', location: '부평', cycle: '주말 오후',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '아그리콜라' },
        { icon: 'clock', label: '활동 시간', value: '브라스' },
        { icon: 'pin', label: '주 활동지', value: '4인 모임' }
    ],
    bio: '부평에서 보드게임 모임 해요. 무거운 전략게임 좋아합니다.'
  },
  {
    id: 'match_area_hangyeol', nickname: '한결', age: 31, regionId: 'gangwon-chuncheon',
    hobbyId: 'hike', hobbyStyle: '강촌·춘천 등산', location: '춘천', cycle: '주말',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '주말 등산' },
        { icon: 'clock', label: '활동 시간', value: '춘천 봉의산' },
        { icon: 'pin', label: '주 활동지', value: '커피' }
    ],
    bio: '춘천 살아요. 주말마다 가볍게 산 걷고 커피 마시는 루틴입니다.'
  },
  {
    id: 'match_area_minseo', nickname: '민서', age: 28, regionId: 'chungcheong-cheonan-asan',
    hobbyId: 'swim', hobbyStyle: '천안 불당 수영 · 평영', location: '천안 불당', cycle: '평일 아침',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '평영 1km' },
        { icon: 'clock', label: '활동 시간', value: '평일 07시' },
        { icon: 'pin', label: '주 활동지', value: '불당 수영장' }
    ],
    bio: '천안 불당에서 평일 아침 수영해요. 같이 다니실 분 있으면 좋겠어요.'
  },
  {
    id: 'match_area_ideun', nickname: '이든', age: 33, regionId: 'jeolla-jeonju',
    hobbyId: 'cafe', hobbyStyle: '전주 카페 · 한옥마을', location: '전주', cycle: '주말 낮',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '카페 투어' },
        { icon: 'clock', label: '활동 시간', value: '한옥마을' },
        { icon: 'pin', label: '주 활동지', value: '사진' }
    ],
    bio: '전주에서 카페 도는 걸 좋아해요. 한옥마을 코스 추천해 드릴게요.'
  },
  {
    id: 'match_area_sihyeon', nickname: '시현', age: 29, regionId: 'gyeongsang-busan',
    hobbyId: 'soccer', hobbyStyle: '서면 풋살 · 수요일', location: '부산 서면', cycle: '수요일 밤',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '풋살 5년' },
        { icon: 'clock', label: '활동 시간', value: '수요일 21시' },
        { icon: 'pin', label: '주 활동지', value: '서면 구장' }
    ],
    bio: '서면에서 수요일 밤 풋살 정기 모임 해요. 한두 자리 늘 비워둡니다.'
  },
  {
    id: 'match_area_woojin', nickname: '우진', age: 34, regionId: 'jeju',
    hobbyId: 'drive', hobbyStyle: '제주 드라이브 · 사진', location: '제주 제주시', cycle: '주말',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '제주 5년' },
        { icon: 'clock', label: '활동 시간', value: '드라이브' },
        { icon: 'pin', label: '주 활동지', value: '사진' }
    ],
    bio: '제주에 산 지 5년이에요. 주말에 같이 돌아다닐 분 좋아요.'
  },
  {
    id: 'match_area_haram', nickname: '하람', age: 27, regionId: 'overseas',
    hobbyId: 'travel', hobbyStyle: '도쿄 유학 중 · 여행', location: '일본 도쿄', cycle: '주말',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '도쿄 2년' },
        { icon: 'clock', label: '활동 시간', value: '여행' },
        { icon: 'pin', label: '주 활동지', value: '카페' }
    ],
    bio: '도쿄에 유학 중이에요. 이쪽 오시면 같이 다닐 수 있어요.'
  },
  {
    id: 'match_area_gomjun', nickname: '곰준', age: 35, regionId: 'bear',
    hobbyId: 'wine', hobbyStyle: '베어 모임 · 와인', location: '마포', cycle: '격주 토요일',
    specChips: [
        { icon: 'target', label: '취미 깊이', value: '와인' },
        { icon: 'clock', label: '활동 시간', value: '베어 모임' },
        { icon: 'pin', label: '주 활동지', value: '토요일' }
    ],
    bio: '베어 모임에서 사람들 만나요. 와인 한잔 하면서 이야기 나누는 걸 좋아합니다.'
  }
];

const REGION_SEED_GRADIENTS = [
  'linear-gradient(135deg, #16EBA4 0%, #06AE7E 100%)',
  'linear-gradient(135deg, #AFE3FA 0%, #7994E2 100%)',
  'linear-gradient(135deg, #F8B74B 0%, #F3700C 100%)',
  'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)',
  'linear-gradient(135deg, #FAD1E5 0%, #EA6EA0 100%)',
  'linear-gradient(135deg, #14A5CC 0%, #60DFF3 100%)'
];

/** 지역 시드 사람 한 명을 프로필 모양으로 만든다. */
function regionSeedProfileOf(p, index) {
  const hobby = HOBBY_FLAT.find((h) => h.id === p.hobbyId) || HOBBY_FLAT[0];
  return {
    id: p.id,
    nickname: p.nickname,
    age: p.age,
    regionId: p.regionId,
    location: p.location,
    hobbyIds: [p.hobbyId],
    hobbyLabel: hobby.name,
    hobbyIcon: hobby.icon,
    hobbyStyle: p.hobbyStyle,
    cycle: p.cycle,
    cycleIcon: 'repeat',
    hobbies: [hobby.name],
    specChips: p.specChips.map((c) => ({ ...c })),
    bio: p.bio,
    avatarText: p.nickname.slice(0, 1),
    avatarGradient: REGION_SEED_GRADIENTS[index % REGION_SEED_GRADIENTS.length],
    badge: hobby.name,
    ratio: ['tall', 'mid', 'square'][index % 3],
    likesMe: false,
    verified: true
  };
}

/** 지역 시드 사람들(프로필) — matchProfiles 뒤에 붙는다. */
function regionSeedProfiles() {
  return REGION_SEED_PEOPLE.map((p, i) => regionSeedProfileOf(p, i));
}

/** 권역 id → 그 지역 글을 쓴 사람(같은 권역 → 같은 큰 분류 → 첫 사람). */
function regionSeedAuthorFor(regionId) {
  const region = EXPLORE_REGIONS.find((r) => r.id === regionId) || {};
  const idx = REGION_SEED_PEOPLE.findIndex((p) => p.regionId === regionId);
  const sameGroup = idx < 0
    ? REGION_SEED_PEOPLE.findIndex((p) => (EXPLORE_REGIONS.find((r) => r.id === p.regionId) || {}).groupId === region.groupId)
    : -1;
  const pick = idx >= 0 ? idx : (sameGroup >= 0 ? sameGroup : 0);
  return regionSeedProfileOf(REGION_SEED_PEOPLE[pick], pick);
}

/** 지역 시드 글 — explorePosts 뒤에 붙는다. */
function regionSeedExplorePosts() {
  const styleTag = { now: '번개', drink: '한잔', comfortable: '편한만남', dm: '1:1' };
  return REGION_SEED_POSTS.map((row, i) => {
    const regionId = row[0];
    const hobbyId = row[1];
    const styleId = row[2];
    const caption = row[3];
    const region = EXPLORE_REGIONS.find((r) => r.id === regionId) || EXPLORE_REGIONS[0];
    const hobby = HOBBY_FLAT.find((h) => h.id === hobbyId) || HOBBY_FLAT[0];
    const style = EXPLORE_MEET_STYLES.find((s) => s.id === styleId) || EXPLORE_MEET_STYLES[0];
    const author = regionSeedAuthorFor(regionId);
    return {
      id: 'pub_area_' + regionId,
      regionId,
      meetStyle: style.id,
      meetStyleLabel: style.name,
      authorId: author.id,
      authorName: author.nickname,
      authorAvatarText: author.avatarText,
      authorGradient: author.avatarGradient,
      hobbyId: hobby.id,
      hobbyLabel: hobby.name,
      tag: styleTag[style.id] || '모임',
      caption,
      mediaCaption: '',
      ratio: ['wide', 'square'][i % 2],
      groupName: region.name + ' ' + hobby.name,
      likes: 4 + ((i * 7) % 27),
      likedByMe: false,
      comments: [],
      createdAt: ago(((i % 9) + 1) * HOUR + ((i * 13) % 50) * MINUTE)
    };
  });
}

const defaultInitialState = {
  /* 저장 스키마 버전 — 마이그레이션 판단에만 쓴다. */
  schemaVersion: STORAGE_SCHEMA_VERSION,

  /* ---------------- Sprint 17 — 회원가입(온보딩) 상태 ----------------
   * completed=false 면 앱 대신 **회원가입 화면**이 뜨고, 계정·프로필은 가입에서 정한다.
   * account: { loginId, passwordHash, createdAt } — 로컬 데모 인증(서버 인증으로 교체 예정).
   * ------------------------------------------------------------------------- */
  onboarding: { completed: false, completedAt: null, step: 0 },
  account: null,
  sessionActive: false,

  /* ---------------- 현재 로그인 유저 : 루키 (데모 계정) ---------------- */
  currentUser: {
    id: 'user_rookie',
    nickname: '루키',
    handle: '@rookie',
    role: 'ADMIN',
    membership: 'plus',
    avatarText: '루',
    avatarGradient: 'linear-gradient(135deg, #0FB57E 0%, #06B881 55%, #06AE7E 100%)',
    /* Sprint 17 — 가입 시 올린 프로필 사진(Data URL) · 가입 완료 여부 */
    photoUrl: null,
    registered: true,
    /* Sprint 17 — 탐색 사람 카드 꾸미기(대표 사진 프리셋 · 한 줄 소개) */
    exploreCard: { photoUrl: null, intro: '주 3회 크로스핏 · 퇴근 후 땀' },
    location: '서울 성동구 성수동',
    coords: { lat: 37.5446, lng: 127.0560 },
    /* Sprint 7 — 내 생활권 (탐색 지역 필터·새 글/모임 작성 시 기본 지역) */
    regionId: 'gwanak',
    /* Sprint 4.5 — 모임 나이 제한 판정의 기준 (프로필 수정에서 바꿀 수 있다) */
    age: 26,
    hobbies: ['크로스핏', '클라이밍'],
    hobbyIds: ['fitness', 'climb'],
    activity: '평일 저녁',
    activityIcon: '',
    workoutSpec: '크로스핏 6개월차 · 푸시업 정자세 훈련 중',
    bio: '성수동 거주. 퇴근 후 레벨업 크로스핏 박스에서 땀 흘립니다. 잡생각 없애는 덴 운동이 최고!',
    /* 루키이 '모임장'인 모임 + 단순 가입 모임을 함께 둔다 (권한 분기 검증용) */
    joinedGroupIds: ['grp_crossfit_1', 'grp_fitness_1', 'grp_climbing_1'],
    /* Sprint 16 — 내 프로필을 탐색 '사람' 카드로 공개할지 (기본 OFF · 내가 켤 때만) */
    exploreProfileVisible: false,
    /* Sprint 24 — 탐색에 올린 내 프로필: 만남 목적 + 한 줄 소개 + 2시간 만료 */
    explorePublish: null,
    /* Sprint 24 — 내 프로필 앨범: 공개 최대 4장 · 비밀 최대 4장 */
    album: { public: [], secret: [] },
    /* Sprint 24 — 1:1 대화 상대별 비밀앨범 공개 여부 { partnerId: true } */
    secretShares: {}
  },

  /* ---------------- 탐색 탭 취미 필터 (사람·모임 카드 공용 키) ----------------
   * group.hobbyId / matchProfile.hobbyIds 가 이 키를 쓴다. 모임은 category 와 달라도
   * 같은 취미로 묶인다(예: 크로스핏 모임과 헬스 모임이 모두 'fitness').
   * Sprint 21 — 대분류 7개 아래 세부 취미 45종 전체를 담는다(옛 8종 id 그대로 유지).
   *   필터 시트는 대분류로 묶어 보여주고, 이용자가 직접 쓴 취미는 customHobbies 에 쌓인다.
   * ------------------------------------------------------------------------- */
  exploreHobbyChips: JSON.parse(JSON.stringify(HOBBY_FLAT)),

  /* ---------------- Sprint 21 — 이용자가 직접 쓴 취미 ----------------
   * { id:'custom_xxx', name, icon, categoryId, custom:true }
   * getHobbyChips() 가 기본 목록 뒤에 이어 붙여 필터·프로필·모임 개설이 함께 본다.
   * ------------------------------------------------------------------------- */
  customHobbies: [],

  /* ---------------- Sprint 21 — 가입 후 스포트라이트 가이드 ----------------
   * status: 'pending'(아직 안 봄) | 'done'(끝까지 봄) | 'skipped'(건너뜀)
   * step  : 마지막으로 보던 단계(도중에 앱을 닫아도 이어서)
   * ------------------------------------------------------------------------- */
  guide: { status: 'pending', step: 0, startedAt: null, finishedAt: null },

  /* ---------------- Sprint 21 — 취향 질문 답변 ----------------
   * hobbyIds : "당신의 취미는 무엇인가요?" 에서 고른 취미(내 프로필 취미에도 반영)
   * goalIds  : "우그에서 어떤 걸 해보고 싶나요?" 에서 고른 취미(추천 모임의 기준)
   * ------------------------------------------------------------------------- */
  tastePrefs: { hobbyIds: [], goalIds: [], updatedAt: null },

  /* ---------------- 탐색 지역(생활권) — Sprint 7 ----------------
   * '이반시티처럼 지역별로 사람과 글을 모아 보기'의 기준 목록.
   * 각 항목은 사람·모임·글의 regionId 와 맞물린다(applyRegionIds 참고).
   * ------------------------------------------------------------------------- */
  exploreRegions: JSON.parse(JSON.stringify(EXPLORE_REGIONS)),

  /* ---------------- 지역 큰 분류(서울·경기·인천 …) — Sprint 23 ----------------
   * 서울은 안쪽에 7개 동네를 두고, 나머지 지역은 큰 분류 하나가 동네 하나다.
   * ------------------------------------------------------------------------- */
  exploreRegionGroups: JSON.parse(JSON.stringify(EXPLORE_REGION_GROUPS)),

  /* ---------------- 내 동네 반경 옵션 — Sprint 8 ----------------
   * 11/14 22:59 사용자 지시: "내 동네 반경 필터 넣어줘".
   * 전체 / 1km / 3km / 5km / 10km — 사람·모임·글의 거리를 같은 자로 재어 거른다.
   * ------------------------------------------------------------------------- */
  exploreRadiusOptions: JSON.parse(JSON.stringify(EXPLORE_RADIUS_OPTIONS)),

  /* ---------------- 마지막 탐색 필터 기억 — Sprint 7 ----------------
   * 11/14 22:24 사용자 지시: "마지막 탐색 필터 상태(나이·지역 등)를 저장해 앱 재실행 시 기억".
   * 화면(state)이 아니라 **저장 상태**에 두어 앱을 다시 열어도 같은 조건으로 열린다.
   *  filter : 'all' | 'people' | 'groups' | 'posts' | 취미 id
   *  age    : 'all' | 'for_me' | 'none' | '20s' | '2030' | '30plus'
   *  region : 'all' | 지역 id
   *  radius : 'all' | '1' | '3' | '5' | '10'   (Sprint 8 — 내 동네 반경 km)
   * ------------------------------------------------------------------------- */
  explorePrefs: { filter: 'all', age: 'all', region: 'all', radius: 'all', ageMin: 0, ageMax: 99 },

  /* ---------------- Sprint 16 — 0~99세 듀얼 레인지 나이 슬라이더 ----------------
   * 11/15 19:05 사용자: "나이는 0~99세 드래그 슬라이더로".
   * 예전 4구간 고정 칩 대신 explorePrefs.ageMin/ageMax(0~99)로 거른다.
   * ageMin 0 · ageMax 99 는 '나이 조건 없음'이다.
   * ------------------------------------------------------------------------- */
  ageRangeBounds: { min: 19, max: 99 },

  /* ---------------- Sprint 16 — 24시간 스토리 (모임 단위) ----------------
   * 위 STORY_SEED 참고. 읽을 때 24시간 지난 것은 걸러낸다.
   * ------------------------------------------------------------------------- */
  stories: JSON.parse(JSON.stringify(STORY_SEED)),

  /* ---------------- Sprint 17 — 내 스토리 보관함 ----------------
   * 24시간이 지난 **내** 스토리는 지우지 않고 이곳으로 옮긴다(인스타그램 보관함).
   * 스토리 바에는 나오지 않고, 내정보 › 스토리 보관함에서만 다시 본다.
   * ------------------------------------------------------------------------- */
  storyArchive: [],

  /* ---------------- Sprint 17 — 내 모임 갤러리 정렬 기억 ----------------
   * 'recent'(최근 활동순) | 'name'(가나다순) | 'leader'(내가 모임장 먼저)
   * ------------------------------------------------------------------------- */
  galleryPrefs: { sort: 'recent' },

  /* ---------------- Sprint 32.5 — 마지막으로 모임을 열어 본 시각 -------------
   * 홈 '내 모임' 원형 아이콘의 빨간 점(새 글·일정·채팅)을 판단한다.
   * { [groupId]: ISO } — 없으면 한 번도 들어가지 않은 모임(새 소식이 있으면 점).
   * ------------------------------------------------------------------------- */
  groupVisits: {},

  /* ---------------- Sprint 24 — 화면 설정 ----------------
   * 11/17 00:30 루키 님: "설정 안에 다크모드 ON/OFF".
   *  · darkMode: 크림 클레이 ↔ 다크 클레이. 기기에 남고(저장 상태), 첫 화면부터 적용된다.
   * ------------------------------------------------------------------------- */
  /* Sprint 28.5 — null = 아직 고르지 않음 → 기기 설정(prefers-color-scheme)을 따른다. */
  settings: { darkMode: null },

  /* ---------------- 모임 나이 제한 옵션 (Sprint 4.5 · Sprint 5 강조) ----------------
   * 모임장이 개설·설정에서 고르는 4가지. min·max 는 신청자 나이 판정에 쓴다.
   * badge     : 상세 시트의 정책 배지(아이콘 포함)
   * cardBadge : **모임 카드 겉면**에 붙는 짧고 직관적인 표기 ('2030만' / '20대만' / '30대+')
   * tone      : 배지 색조 키 (CSS .age-badge.age-2030 …)
   * ------------------------------------------------------------------------- */
  ageLimitOptions: [
    { id: 'all', label: '제한 없음 (전 연령)', short: '전 연령', badge: '전 연령', cardBadge: '전 연령', tone: 'all', min: 0, max: 200 },
    { id: '20s', label: '20대만 (20~29세)', short: '20대', badge: '20대만', cardBadge: '20대만', tone: '20s', min: 20, max: 29 },
    { id: '2030', label: '2030 (20~39세)', short: '2030', badge: '2030만', cardBadge: '2030만', tone: '2030', min: 20, max: 39 },
    { id: '30plus', label: '30대 이상 (30세~)', short: '30대 이상', badge: '30대+', cardBadge: '30대+', tone: '30plus', min: 30, max: 200 }
  ],

  /* ---------------- 가입 질문 프리셋 (Sprint 4.5) ----------------
   * 승인제 모임을 만들 때 모임장이 그대로 고를 수 있는 기본 질문 네 가지.
   * ------------------------------------------------------------------------- */
  joinQuestionPresets: [
    '취미 구력이나 선호 요일을 적어주세요!',
    '이 모임에서 함께하고 싶은 걸 한 줄로 적어주세요',
    '편하게 참여할 수 있는 시간대를 알려주세요',
    '이 취미를 시작한 계기가 있나요?'
  ],

  /* ---------------- 소모임(모임) ---------------- */
  groups: [
    {
      id: 'grp_crossfit_1',
      name: '성수 레벨업 퇴근 와드팟',
      category: 'crossfit',
      categoryName: '크로스핏',
      hobbyId: 'fitness',
      meetLabel: '월·수·금 19:10',
      ratio: 'wide',
      icon: 'dumbbell',
      coverGradient: 'linear-gradient(135deg, #0E814A 0%, #0E8146 100%)',
      location: '성동구 성수동',
      distanceKm: 0.2,
      memberCount: 28,
      maxMembers: 40,
      privacyType: 'approval_private',
      privacyLabel: '비공개 승인제',
      description: '평일 퇴근 후 19:10 수업 같이 듣고 레벨업 성수 박스에서 오운완 인증해요! 초보자 대환영.',
      tags: ['#성수동', '#크로스핏', '#19시10분반', '#오운완인증'],
      rules: '모임 피드 사진은 운동 인증/바디체크 위주 권장. 아웃팅 방지 규칙 엄수.',
      leaderId: 'user_rookie',
      leaderName: '루키',
      customTags: ['오운완', 'WOD기록', 'PR달성', '식단인증', '주말번개'],
      joinPolicy: ['월·수·금 19:10 정규반', '주말 자유 와드'],
      /* Sprint 6 — 활동 로그에 '모임 개설' 이력이 보이도록 만든 시각을 둔다 */
      createdAt: ago(96 * 24 * HOUR)
    },
    {
      id: 'grp_fitness_1',
      name: '성동 3대 400+ 쇠질 소모임',
      category: 'fitness',
      categoryName: '헬스·웨이트',
      hobbyId: 'fitness',
      meetLabel: '주말 원정 · 상시',
      ratio: 'square',
      icon: 'barbell',
      coverGradient: 'linear-gradient(135deg, #4675A4 0%, #52739F 100%)',
      location: '성동구 서울숲/한양대',
      distanceKm: 1.8,
      memberCount: 45,
      maxMembers: 50,
      privacyType: 'open',
      privacyLabel: '자유 가입',
      description: '주말 원정 헬스장 털기, 벤치/데드 자세 피드백 나누는 성동구 헬스인 모임입니다.',
      tags: ['#서울숲동', '#한양대', '#3대운동', '#주말원정'],
      rules: '서로의 운동 루틴 존중. 상호 매너 기본 탑재.',
      leaderId: 'user_iron',
      leaderName: '아이언',
      customTags: ['3대측정', '오운완', '루틴공유', '식단인증'],
      joinPolicy: ['자유 가입', '주말 원정 번개']
    },
    {
      id: 'grp_climbing_1',
      name: '블록스 성수 볼더링 원정대',
      category: 'climb',
      categoryName: '클라이밍',
      hobbyId: 'climb',
      meetLabel: '평일 저녁 · 주말 낮',
      ratio: 'wide',
      icon: 'climb',
      coverGradient: 'linear-gradient(135deg, #0E814A 0%, #118134 100%)',
      location: '성동구 성수역',
      distanceKm: 0.5,
      memberCount: 34,
      maxMembers: 50,
      privacyType: 'approval_private',
      privacyLabel: '비공개 승인제',
      description: '성수 블록스에서 평일 저녁/주말 낮에 파랑·빨강 레벨 같이 깨실 분들 환영합니다!',
      tags: ['#성수역', '#블록스', '#볼더링', '#초중급환영'],
      rules: '부상 방지 우선! 안전한 등반 약속.',
      leaderId: 'user_hold',
      leaderName: '루프홀드',
      customTags: ['완등인증', '루트공유', '장비후기', '주말번개'],
      joinPolicy: ['평일 저녁반', '주말 낮반']
    },
    {
      id: 'grp_run_1',
      name: '한강 나이트 러닝 크루',
      category: 'run',
      categoryName: '러닝',
      hobbyId: 'run',
      meetLabel: '화·목 20:00',
      ratio: 'square',
      icon: 'run',
      coverGradient: 'linear-gradient(135deg, #4676A4 0%, #0678C4 100%)',
      location: '여의도 한강공원',
      distanceKm: 6.4,
      memberCount: 63,
      maxMembers: 100,
      privacyType: 'open',
      privacyLabel: '자유 가입',
      description: '매주 화·목 저녁 8시 여의도 샛강 10K. 페이스 상관없이 같이 달리고 치맥은 덤.',
      tags: ['#여의도', '#나이트런', '#10K', '#자유페이스'],
      rules: '무리한 페이스 금지, 뒤처진 사람 없이 함께 들어오기.',
      leaderId: 'user_night',
      leaderName: '야간비행',
      customTags: ['오운완', '기록인증', '주말번개', '코스공유'],
      joinPolicy: ['화·목 20:00 정기런']
    },
    {
      id: 'grp_swim_1',
      name: '성동구민센터 새벽 모닝스윔',
      category: 'swim',
      categoryName: '수영',
      hobbyId: 'swim',
      meetLabel: '월·수·금 06:00',
      ratio: 'wide',
      icon: 'swim',
      coverGradient: 'linear-gradient(135deg, #007F86 0%, #037984 100%)',
      location: '성동구 뚝섬',
      distanceKm: 3.2,
      memberCount: 19,
      maxMembers: 30,
      privacyType: 'open',
      privacyLabel: '자유 가입',
      description: '월수금 06:00~07:00 중급레인 자수/강습 같이 돌고 출근길 커피 한잔 하실 분!',
      tags: ['#새벽수영', '#뚝섬', '#오운완', '#출근전수영'],
      rules: '새벽 운동 의지 충만하신 분!',
      leaderId: 'user_aqua',
      leaderName: '돌고래',
      customTags: ['오운완', '강습후기', '기록인증'],
      joinPolicy: ['월·수·금 06:00']
    },
    {
      id: 'grp_game_1',
      name: '심야 롤 칼바람 & 자랭 소환사들',
      category: 'game',
      categoryName: '롤·e스포츠',
      hobbyId: 'game',
      meetLabel: '상시 · 디스코드',
      ratio: 'square',
      icon: 'gamepad',
      coverGradient: 'linear-gradient(135deg, #6D50FF 0%, #7557F7 100%)',
      location: '전국 / 디스코드',
      distanceKm: 0,
      memberCount: 52,
      maxMembers: 100,
      privacyType: 'open',
      privacyLabel: '자유 가입',
      description: '퇴근 후 음성 켜고 즐겜 칼바람/자랭 돌릴 소환사 구합니다. 롤드컵 결승 뷰잉파티도 해요.',
      tags: ['#리그오브레전드', '#칼바람나락', '#자유랭크', '#디스코드'],
      rules: '남탓·정치질 금지! 지더라도 유쾌하게.',
      leaderId: 'user_faker',
      leaderName: '미드장인',
      customTags: ['승급전', '칼바람', '내전', '클립'],
      joinPolicy: ['상시 자유 가입']
    },
    {
      id: 'grp_hike_1',
      name: '주말 아차산/청계산 트레킹팟',
      category: 'hike',
      categoryName: '등산·트레킹',
      hobbyId: 'hike',
      meetLabel: '토 08:00 출발',
      ratio: 'wide',
      icon: 'mountain',
      coverGradient: 'linear-gradient(135deg, #118134 0%, #0B8636 100%)',
      location: '서울 아차산/왕십리',
      distanceKm: 2.1,
      memberCount: 31,
      maxMembers: 45,
      privacyType: 'approval_private',
      privacyLabel: '비공개 승인제',
      description: '토요일 아침 상쾌하게 서울 둘레길 & 아차산 연주대 오르고 하산 막걸리/맛집 코스.',
      tags: ['#아차산', '#왕십리역', '#주말트레킹', '#하산맛집'],
      rules: '무리한 산행 지양, 페이스 조절 동행.',
      leaderId: 'user_peak',
      leaderName: '산들바람',
      customTags: ['정상인증', '코스공유', '하산맛집'],
      joinPolicy: ['토요일 08:00 출발']
    },
    {
      id: 'grp_boardgame_1',
      name: '강남·왕십리 전략 보드게임 클럽',
      category: 'boardgame',
      categoryName: '보드게임',
      hobbyId: 'boardgame',
      meetLabel: '토·일 14:00',
      ratio: 'square',
      icon: 'dice',
      coverGradient: 'linear-gradient(135deg, #856A00 0%, #866C02 100%)',
      location: '서초구 왕십리/강남',
      distanceKm: 4.5,
      memberCount: 22,
      maxMembers: 30,
      privacyType: 'approval_private',
      privacyLabel: '비공개 승인제',
      description: '아그리콜라, 테라포밍 마스, 스플렌더 등 주말 낮 보드게임 카페에서 뇌지컬 풀가동!',
      tags: ['#왕십리역', '#강남역', '#전략게임', '#주말여가'],
      rules: '설명 친절하게 해드립니다. 뉴비 환영.',
      leaderId: 'user_dice',
      leaderName: '미플',
      customTags: ['게임후기', '신작소개', '모임후기'],
      joinPolicy: ['토·일 14:00']
    },
    {
      id: 'grp_movie_1',
      name: '영등포/용산 심야 시네마 & 전시',
      category: 'movie',
      categoryName: '영화·전시',
      hobbyId: 'movie',
      meetLabel: '금·토 심야',
      ratio: 'wide',
      icon: 'movie',
      coverGradient: 'linear-gradient(135deg, #4675A4 0%, #52739F 100%)',
      location: '영등포/용산',
      distanceKm: 5.1,
      memberCount: 40,
      maxMembers: 60,
      privacyType: 'open',
      privacyLabel: '자유 가입',
      description: 'CGV 아이맥스 대작 및 아트하우스 독립영화 같이 보고 카페에서 감상 나누는 모임.',
      tags: ['#영등포CGV', '#용산아이맥스', '#영화토크', '#주말전시'],
      rules: '스포일러 엄금! 열린 감상 대화.',
      leaderId: 'user_film',
      leaderName: '시네필',
      customTags: ['관람후기', '스포주의', '전시추천'],
      joinPolicy: ['상시 자유 가입']
    },
    {
      id: 'grp_cafe_1',
      name: '성수 카페투어 & 디저트 크루',
      category: 'cafe',
      categoryName: '카페/맛집',
      hobbyId: 'cafe',
      meetLabel: '주말 11:00~15:00',
      ratio: 'square',
      icon: 'cup',
      coverGradient: 'linear-gradient(135deg, #856A00 0%, #866C02 100%)',
      location: '성동구 성수·서울숲',
      distanceKm: 1.1,
      memberCount: 24,
      maxMembers: 30,
      privacyType: 'open',
      privacyLabel: '자유 가입',
      description: '성수·서울숲 골목 카페를 주말마다 두세 곳씩 도는 모임. 원두 이야기, 디저트 맛집 공유해요.',
      tags: ['#성수카페', '#주말카페투어', '#디저트', '#핸드드립'],
      rules: '조용한 카페 매너 지키기. 사진은 서로 동의한 것만.',
      leaderId: 'user_bean',
      leaderName: '원두콩',
      customTags: ['카페후기', '디저트', '원두추천'],
      joinPolicy: ['토·일 11:00']
    },
    /* ===== Sprint 7 — 다른 생활권의 모임 (지역 탐색이 빈 지역 없이 동작하도록) ===== */
    {
      id: 'grp_mapo_movie',
      name: '홍대 심야영화 & 전시 크루',
      category: 'movie',
      categoryName: '영화·전시',
      hobbyId: 'movie',
      meetLabel: '금·토 심야',
      ratio: 'wide',
      icon: 'movie',
      coverGradient: 'linear-gradient(135deg, #4675A4 0%, #52739F 100%)',
      location: '마포구 홍대/합정',
      regionId: 'mapo',
      distanceKm: 7.8,
      memberCount: 26,
      maxMembers: 40,
      privacyType: 'approval_private',
      privacyLabel: '비공개 승인제',
      description: '합정 아트하우스 심야 상영과 홍대 전시를 같이 보고, 근처 카페에서 감상 나누는 모임이에요.',
      tags: ['#홍대', '#합정', '#심야영화', '#전시'],
      rules: '스포 금지, 서로의 감상을 존중합니다.',
      leaderId: 'match_jiwoo',
      leaderName: '지우',
      customTags: ['관람후기', '전시추천', '심야번개'],
      joinPolicy: ['금·토 심야'],
      createdAt: ago(41 * 24 * HOUR)
    },
    {
      id: 'grp_seongdong_run',
      name: '성수·뚝섬 새벽 러닝',
      category: 'run',
      categoryName: '러닝',
      hobbyId: 'run',
      meetLabel: '화·목 06:30',
      ratio: 'square',
      icon: 'run',
      coverGradient: 'linear-gradient(135deg, #4676A4 0%, #0678C4 100%)',
      location: '성동구 성수/뚝섬',
      regionId: 'seongdong',
      distanceKm: 8.6,
      memberCount: 21,
      maxMembers: 30,
      privacyType: 'open',
      privacyLabel: '자유 가입',
      description: '출근 전 뚝섬 한강으로 5K만 가볍게. 거리보다 꾸준함이 목표인 아침 러닝 모임입니다.',
      tags: ['#성수', '#뚝섬', '#새벽러닝', '#5K'],
      rules: '뒤처진 사람 없이 함께 들어옵니다.',
      leaderId: 'match_gyeom',
      leaderName: '겨울',
      customTags: ['오운완', '기록인증'],
      joinPolicy: ['화·목 06:30'],
      createdAt: ago(30 * 24 * HOUR)
    },
    {
      id: 'grp_jongno_board',
      name: '종로 전략 보드게임 & 독서',
      category: 'boardgame',
      categoryName: '보드게임',
      hobbyId: 'boardgame',
      meetLabel: '일 15:00',
      ratio: 'square',
      icon: 'dice',
      coverGradient: 'linear-gradient(135deg, #856A00 0%, #866C02 100%)',
      location: '종로구 을지로/광화문',
      regionId: 'jongno',
      distanceKm: 9.4,
      memberCount: 17,
      maxMembers: 24,
      privacyType: 'approval_private',
      privacyLabel: '비공개 승인제',
      description: '을지로 보드게임방에서 무거운 전략게임 한 판, 끝나고는 서점 얘기. 3040 위주로 천천히 갑니다.',
      tags: ['#종로', '#을지로', '#전략게임', '#독서'],
      rules: '룰 설명은 번갈아 맡고, 기다림은 서로 배려합니다.',
      leaderId: 'match_taeho',
      leaderName: '태호',
      customTags: ['게임후기', '독서모임'],
      joinPolicy: ['일 15:00'],
      createdAt: ago(58 * 24 * HOUR)
    },
    {
      id: 'grp_yongsan_climb',
      name: '이태원·한남 클라이밍 크루',
      category: 'climb',
      categoryName: '클라이밍',
      hobbyId: 'climb',
      meetLabel: '평일 20:00',
      ratio: 'wide',
      icon: 'climb',
      coverGradient: 'linear-gradient(135deg, #0E814A 0%, #118134 100%)',
      location: '용산구 이태원/한남',
      regionId: 'yongsan',
      distanceKm: 6.9,
      memberCount: 23,
      maxMembers: 30,
      privacyType: 'open',
      privacyLabel: '자유 가입',
      description: '이태원 클라이밍짐 평일 저녁 모임. 초보자도 루트 읽기부터 같이 합니다.',
      tags: ['#이태원', '#한남', '#볼더링'],
      rules: '안전 매트 위에서만, 부상 방지 우선.',
      leaderId: 'match_iseul',
      leaderName: '이슬',
      customTags: ['완등인증', '루트공유'],
      joinPolicy: ['평일 20:00'],
      createdAt: ago(22 * 24 * HOUR)
    },
    {
      id: 'grp_gyeonggi_run',
      name: '판교·분당 퇴근 러닝',
      category: 'run',
      categoryName: '러닝',
      hobbyId: 'run',
      meetLabel: '월·수 20:00',
      ratio: 'square',
      icon: 'run',
      coverGradient: 'linear-gradient(135deg, #006DF9 0%, #076CF2 100%)',
      location: '경기 성남 판교/분당',
      regionId: 'gyeonggi',
      distanceKm: 24,
      memberCount: 38,
      maxMembers: 60,
      privacyType: 'open',
      privacyLabel: '자유 가입',
      description: '판교에서 일하는 사람들끼리 퇴근하고 탄천 6K. 끝나고 치맥은 반만 참석해요.',
      tags: ['#판교', '#분당', '#탄천', '#퇴근런'],
      rules: '페이스 2조로 나눠서 각자 속도로.',
      leaderId: 'match_junseo',
      leaderName: '준서',
      customTags: ['오운완', '기록인증', '번개'],
      joinPolicy: ['월·수 20:00'],
      createdAt: ago(70 * 24 * HOUR)
    }
  ],

  /* ---------------- 프라이빗 피드 (Sprint 2) ---------------- */
  feedPosts: [
    {
      id: 'post_cf_01',
      groupId: 'grp_crossfit_1',
      authorId: 'user_rookie',
      authorName: '루키',
      authorAvatarText: '루',
      authorGradient: 'linear-gradient(135deg, #0FB57E, #06AE7E)',
      tag: 'WOD기록',
      caption: '오늘 19:10 WOD 완주! 물구나무 푸시업은 아직 무리지만 정자세 푸시업 50개는 다 채웠습니다 샤워하고 나오니 잡생각이 싹 사라지네요.',
      mediaCaption: '20.11 WOD · 22분 캡',
      likes: 14,
      likedByMe: false,
      bookmarkedByMe: false,
      recommendOptIn: true,
      comments: [
        { id: 'c_cf_01_1', authorId: 'leader_jun', authorName: '코치준', text: '오늘 푸시업 자세 진짜 좋아졌어요. 내일 스쿼트 클린 가봅시다', createdAt: ago(12 * MINUTE) },
        { id: 'c_cf_01_2', authorId: 'user_kettle', authorName: '케틀벨러버', text: '50개 채우셨다고요? 저는 30개에서 뻗었는데 ㅋㅋㅋ', createdAt: ago(8 * MINUTE) },
        { id: 'c_cf_01_3', authorId: 'user_toe', authorName: '오늘의토우', text: '내일 같이 가요! 저 19시 반에 도착합니다', createdAt: ago(3 * MINUTE) }
      ],
      createdAt: ago(15 * MINUTE)
    },
    {
      id: 'post_cf_02',
      groupId: 'grp_crossfit_1',
      authorId: 'leader_jun',
      authorName: '코치준',
      authorAvatarText: '준',
      authorGradient: 'linear-gradient(135deg, #8098D2, #C5CEDC)',
      tag: '오운완',
      caption: '데드리프트 140kg 3회 성공. 무게보다 등 각도가 먼저라는 말, 이제 좀 알 것 같습니다. 다들 부상 없이 갑시다',
      mediaCaption: '3RM 갱신',
      likes: 32,
      likedByMe: true,
      bookmarkedByMe: true,
      comments: [
        { id: 'c_cf_02_1', authorId: 'user_rookie', authorName: '루키', text: '코치님 등 각도 영상 보고 저도 한번 찍어봐야겠어요', createdAt: ago(50 * MINUTE) },
        { id: 'c_cf_02_2', authorId: 'user_iron', authorName: '아이언', text: '140이면 3대 400 진입이네요 축하드립니다', createdAt: ago(40 * MINUTE) }
      ],
      createdAt: ago(1 * HOUR)
    },
    {
      id: 'post_cf_03',
      groupId: 'grp_crossfit_1',
      authorId: 'user_kettle',
      authorName: '케틀벨러버',
      authorAvatarText: '케',
      authorGradient: 'linear-gradient(135deg, #05AF7A, #0FAB78)',
      tag: 'PR달성',
      caption: '파머스 워크 24kg 왕복 4세트. 전완근이 터지는 줄 알았지만 PR 갱신해서 기분 좋습니다 ㅋㅋ 내일도 출석 도장 찍어요!',
      mediaCaption: '왕복 4세트',
      likes: 11,
      likedByMe: false,
      bookmarkedByMe: false,
      recommendOptIn: true,
      comments: [
        { id: 'c_cf_03_1', authorId: 'user_toe', authorName: '오늘의토우', text: '악력 미쳤다... 저는 16kg도 무서워요', createdAt: ago(2 * HOUR) }
      ],
      createdAt: ago(3 * HOUR)
    },
    {
      id: 'post_cf_04',
      groupId: 'grp_crossfit_1',
      authorId: 'user_toe',
      authorName: '오늘의토우',
      authorAvatarText: '토',
      authorGradient: 'linear-gradient(135deg, #17AC68, #0FB07B)',
      tag: '후기',
      caption: '입문 한 달 후기. 처음엔 스케일드로 따라갔는데 이제 RX로 두 개는 완주해요. 코치님이 자세를 계속 봐주셔서 어깨가 편해졌습니다.',
      mediaCaption: '한 달 기록',
      likes: 8,
      likedByMe: false,
      bookmarkedByMe: false,
      recommendOptIn: true,
      comments: [],
      createdAt: ago(5 * HOUR)
    },
    {
      id: 'post_ft_01',
      groupId: 'grp_fitness_1',
      authorId: 'user_iron',
      authorName: '아이언',
      authorAvatarText: '아',
      authorGradient: 'linear-gradient(135deg, #C5CEDC, #8098D2)',
      tag: '3대측정',
      caption: '3대 500 도전 8주차. 스쿼트 170 / 벤치 115 / 데드 175 = 460kg. 다음 달에 500 찍고 인증샷 올립니다',
      mediaCaption: '8주차 · 460kg',
      likes: 41,
      likedByMe: false,
      bookmarkedByMe: false,
      comments: [
        { id: 'c_ft_01_1', authorId: 'user_rookie', authorName: '루키', text: '벤치 115면 저한테는 상상도 못 할 무게... 존경합니다', createdAt: ago(1 * HOUR) },
        { id: 'c_ft_01_2', authorId: 'user_kettle', authorName: '케틀벨러버', text: '8주에 40kg 올리신 속도가 더 무섭네요', createdAt: ago(55 * MINUTE) }
      ],
      createdAt: ago(2 * HOUR)
    },
    {
      id: 'post_cl_01',
      groupId: 'grp_climbing_1',
      authorId: 'user_hold',
      authorName: '루프홀드',
      authorAvatarText: '루',
      authorGradient: 'linear-gradient(135deg, #06AE7E, #0FB57E)',
      tag: '완등인증',
      caption: '성수 블록스 빨강 V4 완등! 마지막 홀드에서 두 번 떨어지고 세 번째에 붙었습니다. 손가락 살리느라 테이핑 필수예요.',
      mediaCaption: '빨강 3트라이',
      likes: 19,
      likedByMe: true,
      bookmarkedByMe: false,
      recommendOptIn: true,
      comments: [
        { id: 'c_cl_01_1', authorId: 'user_rookie', authorName: '루키', text: '이번 주말에 같이 가요! 저는 아직 파랑이에요', createdAt: ago(3 * HOUR) }
      ],
      createdAt: ago(4 * HOUR)
    },
    {
      id: 'post_run_01',
      groupId: 'grp_run_1',
      authorId: 'user_night',
      authorName: '야간비행',
      authorAvatarText: '야',
      authorGradient: 'linear-gradient(135deg, #7994E2, #76CFF6)',
      tag: '기록인증',
      caption: '여의도 샛강 10K 52분 31초. 밤에 달리면 강바람이 등에 붙어서 낮보다 30초는 빨라지는 것 같아요. 다음 주 화요일도 나옵니다.',
      mediaCaption: '샛강 코스',
      likes: 47,
      likedByMe: false,
      bookmarkedByMe: false,
      recommendOptIn: true,
      comments: [
        { id: 'c_run_01_1', authorId: 'user_rookie', authorName: '루키', text: '여의도까지 가는 게 관건이네요 ㅋㅋ 다음 주 한번 가볼게요', createdAt: ago(4 * HOUR) }
      ],
      createdAt: ago(6 * HOUR)
    },
    {
      id: 'post_game_01',
      groupId: 'grp_game_1',
      authorId: 'user_faker',
      authorName: '미드장인',
      authorAvatarText: '미',
      authorGradient: 'linear-gradient(135deg, #AA83E7, #E0D0FB)',
      tag: '승급전',
      caption: '3연패 뒤에 3연승으로 골드 승급했습니다. 새벽 2시에 이기고 자면 다음 날이 제일 개운해요 ㅋㅋ 다들 승급전 화이팅!',
      mediaCaption: '승급전 3연승',
      likes: 23,
      likedByMe: false,
      bookmarkedByMe: false,
      comments: [
        { id: 'c_game_01_1', authorId: 'user_rookie', authorName: '루키', text: '축하합니다 ㅋㅋ 다음 판은 저랑 칼바람 가요', createdAt: ago(10 * HOUR) }
      ],
      createdAt: ago(20 * HOUR)
    }
  ],

  /* ---------------- 공개 취미 게시글 (Sprint 4 — 탐색 피드의 세 번째 카드) ----------------
   * 주의 — 프라이버시 원칙: feedPosts 는 '가입한 모임원에게만' 보이는 사진·글이고,
   *    explorePosts 는 모임 밖에서도 보이는 **공개 커뮤니티 글**이다. 두 컬렉션을 분리해
   *    모임 사진이 탐색 피드로 새어 나가지 않는다.
   * 작성자 중 일부(match_junho, match_minwoo …)는 탐색 피드의 '사람 카드'와 같은 사람이라
   * 카드 → 프로필 → 게시글 → 대화가 하나의 흐름으로 이어진다(A-C-D 연동).
   * ------------------------------------------------------------------------- */
  explorePosts: [
    /* Sprint 8 — 내가 쓴 공개 글 2건.
     * 11/14 22:59 "내 글 실베 진입 알림"을 바로 확인할 수 있도록 루키의 글이 실베 근처(6위)에 둔다.
     * 알림 설정의 '실베 진입' 시뮬레이션을 누르면 반응이 몰려 10위 안으로 들어온다. */
    {
      id: 'pub_mine_wod',
      regionId: 'seoul-seongsu',
      meetStyle: 'drink',
      meetStyleLabel: '술번개',
      authorId: 'user_rookie',
      authorName: '루키',
      authorAvatarText: '루',
      authorGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)',
      hobbyId: 'fitness',
      hobbyLabel: '크로스핏',
      tag: '한잔',
      caption: '성수역 근처 지금 가볍게 한잔하실 분. 오늘 19:10 운동 끝나고 21시쯤 시간 됩니다. 편하게 말 걸어주세요.',
      mediaCaption: '클린 60kg · 5x3',
      ratio: 'wide',
      groupName: '성수 레벨업 퇴근 와드팟',
      likes: 46,
      likedByMe: false,
      comments: [
        { id: 'pc_mw1', authorName: '코치준', text: '오늘 자세 좋았어요. 다음 주에 65 가봅시다', createdAt: ago(2 * HOUR + 10 * MINUTE) },
        { id: 'pc_mw2', authorName: '준호', text: '이거 보고 저도 오늘 가야겠습니다', createdAt: ago(1 * HOUR + 40 * MINUTE) }
      ],
      createdAt: ago(3 * HOUR + 20 * MINUTE),
      isMine: true
    },
    {
      id: 'pub_mine_climb',
      regionId: 'seoul-seongsu',
      meetStyle: 'now',
      meetStyleLabel: '지금 번개',
      authorId: 'user_rookie',
      authorName: '루키',
      authorAvatarText: '루',
      authorGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)',
      hobbyId: 'climb',
      hobbyLabel: '클라이밍',
      tag: '번개',
      caption: '성수 볼더링 끝나고 국수 한 그릇 하실 분. 오늘 21시까지 이 근처에 있어요.',
      mediaCaption: 'V2 첫 완등',
      ratio: 'square',
      groupName: '블록스 성수 볼더링 원정대',
      likes: 5,
      likedByMe: false,
      comments: [
        { id: 'pc_mc1', authorName: '성민', text: 'V2 축하드려요! 발끝만 잡히면 금방 올라갑니다', createdAt: ago(24 * HOUR) }
      ],
      createdAt: ago(27 * HOUR),
      isMine: true
    },
    {
      id: 'pub_game_01',
      regionId: 'seoul-gangnam',
      meetStyle: 'comfortable',
      meetStyleLabel: '편한 만남',
      authorId: 'match_junho',
      authorName: '준호',
      authorAvatarText: '준',
      authorGradient: 'linear-gradient(135deg, #E0D0FB 0%, #AA83E7 100%)',
      hobbyId: 'game',
      hobbyLabel: '게임',
      tag: '퇴근후',
      caption: '강남 퇴근 후 편하게 만날 분. 9시 이후 대치 근처에서 게임 한 판이나 맥주 한 잔 어때요.',
      mediaCaption: '5인 내전 3연승',
      ratio: 'wide',
      groupName: '심야 롤 칼바람 & 자랭 소환사들',
      likes: 34,
      likedByMe: false,
      comments: [
        { id: 'pc_g1', authorName: '미드장인', text: '주말에 저도 끼워주세요 ㅋㅋ', createdAt: ago(40 * MINUTE) },
        { id: 'pc_g2', authorName: '하람', text: '칼바람만 하는데 내전은 처음이에요', createdAt: ago(22 * MINUTE) }
      ],
      createdAt: ago(1 * HOUR)
    },
    {
      id: 'pub_run_01',
      regionId: 'seoul-seongsu',
      meetStyle: 'now',
      meetStyleLabel: '지금 번개',
      authorId: 'match_minwoo',
      authorName: '민우',
      authorAvatarText: '민',
      authorGradient: 'linear-gradient(135deg, #76CFF6 0%, #7994E2 100%)',
      hobbyId: 'run',
      hobbyLabel: '러닝',
      tag: '지금번개',
      caption: '성수천 5K 같이 뛰실 분. 퇴근하고 8시에 한양대에서 출발합니다. 대화 되는 속도로 갑니다.',
      mediaCaption: '10K · 51분 12초',
      ratio: 'square',
      groupName: '한강 나이트 러닝 크루',
      likes: 41,
      likedByMe: true,
      comments: [
        { id: 'pc_r1', authorName: '야간비행', text: '샛강 코스도 한번 와보세요 밤에 시원합니다', createdAt: ago(3 * HOUR) },
        { id: 'pc_r2', authorId: 'user_rookie', authorName: '루키', text: '토요일 아침에 같이 뛰어요! 페이스 맞춰서 갈게요', createdAt: ago(2 * HOUR + 10 * MINUTE) }
      ],
      createdAt: ago(3 * HOUR)
    },
    {
      id: 'pub_cafe_01',
      regionId: 'seoul-hongdae',
      meetStyle: 'dm',
      meetStyleLabel: '1:1 대화',
      authorId: 'match_dohyun',
      authorName: '도현',
      authorAvatarText: '도',
      authorGradient: 'linear-gradient(135deg, #F7A928 0%, #EB762F 100%)',
      hobbyId: 'cafe',
      hobbyLabel: '카페/맛집',
      tag: '1:1대화',
      caption: '홍대 20대 대화/번개. 연남동 카페에서 8시쯤 커피 한 잔 하실 분, 편하게 쪽지 주세요.',
      mediaCaption: '연남동 · 핸드드립',
      ratio: 'wide',
      groupName: '성수 카페투어 & 디저트 크루',
      likes: 27,
      likedByMe: false,
      comments: [
        { id: 'pc_c1', authorName: '원두콩', text: '주말에 같이 가요! 저 산미 좋아합니다', createdAt: ago(4 * HOUR) }
      ],
      createdAt: ago(4 * HOUR)
    },
    {
      id: 'pub_climb_01',
      regionId: 'seoul-seongsu',
      meetStyle: 'now',
      meetStyleLabel: '지금 번개',
      authorId: 'match_seongmin',
      authorName: '성민',
      authorAvatarText: '성',
      authorGradient: 'linear-gradient(135deg, #E1E5EA 0%, #8098BE 100%)',
      hobbyId: 'climb',
      hobbyLabel: '클라이밍',
      tag: '지금번개',
      caption: '성수에서 클라이밍 같이 하실 분. 오늘 저녁 8시 볼더링장 앞에서 만나요.',
      mediaCaption: '빨강 루트 3트라이',
      ratio: 'square',
      groupName: '블록스 성수 볼더링 원정대',
      likes: 22,
      likedByMe: false,
      comments: [],
      createdAt: ago(5 * HOUR)
    },
    {
      id: 'pub_swim_01',
      regionId: 'seoul-seongsu',
      meetStyle: 'now',
      meetStyleLabel: '지금 번개',
      authorId: 'match_taemin',
      authorName: '태민',
      authorAvatarText: '태',
      authorGradient: 'linear-gradient(135deg, #10B0C8 0%, #14A5CC 100%)',
      hobbyId: 'swim',
      hobbyLabel: '수영',
      tag: '새벽',
      caption: '성수 새벽 수영 같이 하실 분. 6시 레인에서 만나서 1,500m 하고 같이 출근해요.',
      mediaCaption: '1,500m · 29분',
      ratio: 'wide',
      groupName: '성동구민센터 새벽 모닝스윔',
      likes: 18,
      likedByMe: false,
      comments: [
        { id: 'pc_s1', authorName: '돌고래', text: '내일 같이 들어가요 저도 06시반이요', createdAt: ago(6 * HOUR) }
      ],
      createdAt: ago(7 * HOUR)
    },
    {
      id: 'pub_movie_01',
      regionId: 'seoul-yeongdeungpo',
      meetStyle: 'comfortable',
      meetStyleLabel: '편한 만남',
      authorId: 'match_seojun',
      authorName: '서준',
      authorAvatarText: '서',
      authorGradient: 'linear-gradient(135deg, #C5CEDC 0%, #8098D2 100%)',
      hobbyId: 'movie',
      hobbyLabel: '영화·전시',
      tag: '영화',
      caption: '영등포 퇴근 후 편하게 영화 보실 분. 금요일 심야 21:40, 끝나고 5분만 이야기해요.',
      mediaCaption: '금요 심야 · 21:40',
      ratio: 'square',
      groupName: '영등포/용산 심야 시네마 & 전시',
      likes: 25,
      likedByMe: false,
      comments: [],
      createdAt: ago(9 * HOUR)
    },
    {
      id: 'pub_board_01',
      regionId: 'seoul-seongsu',
      meetStyle: 'now',
      meetStyleLabel: '지금 번개',
      authorId: 'match_hyunwoo',
      authorName: '현우',
      authorAvatarText: '현',
      authorGradient: 'linear-gradient(135deg, #F7A15F 0%, #E6783A 100%)',
      hobbyId: 'boardgame',
      hobbyLabel: '보드게임',
      tag: '번개',
      caption: '왕십리 보드게임카페에서 아그리콜라 4인 번개. 토요일 14시, 뉴비 환영, 두 자리 남았습니다.',
      mediaCaption: '토 14:00 · 왕십리',
      ratio: 'wide',
      groupName: '강남·왕십리 전략 보드게임 클럽',
      likes: 12,
      likedByMe: false,
      comments: [
        { id: 'pc_b1', authorName: '미플', text: '한 자리 저 주세요!', createdAt: ago(10 * HOUR) },
        { id: 'pc_b2', authorName: '하람', text: '가벼운 파티게임만 해봤는데 괜찮을까요?', createdAt: ago(9 * HOUR) }
      ],
      createdAt: ago(11 * HOUR)
    },
    {
      id: 'pub_wod_01',
      regionId: 'seoul-seongsu',
      meetStyle: 'drink',
      meetStyleLabel: '술번개',
      authorId: 'match_jihun',
      authorName: '지훈',
      authorAvatarText: '지',
      authorGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)',
      hobbyId: 'fitness',
      hobbyLabel: '크로스핏',
      tag: '운동후',
      caption: '성수 19:10 운동 끝나고 단백질 한 잔 같이 하실 분. 오늘 클린 60kg 처음 성공했습니다.',
      mediaCaption: '클린 60kg PR',
      ratio: 'square',
      groupName: '성수 레벨업 퇴근 와드팟',
      likes: 30,
      likedByMe: true,
      comments: [
        { id: 'pc_w1', authorName: '코치준', text: '각도 좋았어요. 다음 주에 65 가봅시다', createdAt: ago(12 * HOUR) }
      ],
      createdAt: ago(13 * HOUR)
    },
    {
      id: 'pub_food_01',
      regionId: 'seoul-seongsu',
      meetStyle: 'comfortable',
      meetStyleLabel: '편한 만남',
      authorId: 'match_haram',
      authorName: '하람',
      authorAvatarText: '하',
      authorGradient: 'linear-gradient(135deg, #FB9D5C 0%, #EB7750 100%)',
      hobbyId: 'cafe',
      hobbyLabel: '카페/맛집',
      tag: '아침',
      caption: '성수 순대국 골목 아침 같이 가실 분. 9시까지 편하게, 말 걸어주세요.',
      mediaCaption: '성수 순대국',
      ratio: 'wide',
      groupName: '성수 카페투어 & 디저트 크루',
      likes: 9,
      likedByMe: false,
      comments: [],
      createdAt: ago(16 * HOUR)
    },
    {
      id: 'pub_lol_01',
      regionId: 'online',
      meetStyle: 'dm',
      meetStyleLabel: '1:1 대화',
      authorId: 'user_faker',
      authorName: '미드장인',
      authorAvatarText: '미',
      authorGradient: 'linear-gradient(135deg, #AA83E7 0%, #E0D0FB 100%)',
      hobbyId: 'game',
      hobbyLabel: '게임',
      tag: '심야',
      caption: '새벽 2시까지 롤 하실 분. 디스코드로 들어와서 편하게 한 판 하실 분 구해요.',
      mediaCaption: '승급전 3연승',
      ratio: 'square',
      groupName: '심야 롤 칼바람 & 자랭 소환사들',
      likes: 23,
      likedByMe: false,
      comments: [],
      createdAt: ago(20 * HOUR)
    },
    {
      id: 'pub_kettle_01',
      regionId: 'seoul-seongsu',
      meetStyle: 'comfortable',
      meetStyleLabel: '편한 만남',
      authorId: 'user_kettle',
      authorName: '케틀벨러버',
      authorAvatarText: '케',
      authorGradient: 'linear-gradient(135deg, #05AF7A 0%, #0FAB78 100%)',
      hobbyId: 'fitness',
      hobbyLabel: '크로스핏',
      tag: '수다',
      caption: '성수 운동 끝나고 20분만 수다 떨실 분. 편하게 나오세요.',
      mediaCaption: '24kg · 왕복 4세트',
      ratio: 'wide',
      groupName: '성수 레벨업 퇴근 와드팟',
      likes: 14,
      likedByMe: false,
      comments: [
        { id: 'pc_k1', authorName: '오늘의토우', text: '저는 16kg도 무서운데 대단하세요', createdAt: ago(21 * HOUR) }
      ],
      createdAt: ago(22 * HOUR)
    },
    {
      id: 'pub_night_01',
      regionId: 'seoul-yeongdeungpo',
      meetStyle: 'now',
      meetStyleLabel: '지금 번개',
      authorId: 'user_night',
      authorName: '야간비행',
      authorAvatarText: '야',
      authorGradient: 'linear-gradient(135deg, #7994E2 0%, #76CFF6 100%)',
      hobbyId: 'run',
      hobbyLabel: '러닝',
      tag: '야간런',
      caption: '여의도 밤에 같이 뛰실 분. 9시 샛강에서 10K, 속도 맞춰 갑니다.',
      mediaCaption: '샛강 코스 · 야간런',
      ratio: 'square',
      groupName: '한강 나이트 러닝 크루',
      likes: 47,
      likedByMe: false,
      comments: [],
      createdAt: ago(26 * HOUR)
    },
    /* ===== Sprint 7 — 지역별로 모아 보는 공개 글 (다른 생활권 6건) ===== */
    {
      id: 'pub_mapo_01',
      regionId: 'seoul-hongdae',
      meetStyle: 'dm',
      meetStyleLabel: '1:1 대화',
      authorId: 'match_jiwoo',
      authorName: '지우',
      authorAvatarText: '지',
      authorGradient: 'linear-gradient(135deg, #D9D7F4 0%, #9792D8 100%)',
      hobbyId: 'movie',
      hobbyLabel: '영화·전시',
      tag: '1:1대화',
      caption: '합정 20대 대화/번개. 영화 보고 나와서 30분만 이야기하실 분 구해요.',
      mediaCaption: '합정 · 재개봉작',
      ratio: 'wide',
      groupName: '홍대 심야영화 & 전시 크루',
      likes: 58,
      likedByMe: false,
      comments: [
        { id: 'pc_mp1', authorName: '서준', text: '저도 그거 봤어요. 마지막 5분이 다 했죠', createdAt: ago(26 * MINUTE) },
        { id: 'pc_mp2', authorName: '태호', text: '이번 주말에 같이 가실 분 있나요', createdAt: ago(12 * MINUTE) },
        { id: 'pc_mp3', authorName: '지훈', text: '스포 없이 궁금합니다 ㅋㅋ', createdAt: ago(6 * MINUTE) }
      ],
      createdAt: ago(2 * HOUR)
    },
    {
      id: 'pub_seongdong_01',
      regionId: 'seoul-gangdong',
      meetStyle: 'comfortable',
      meetStyleLabel: '편한 만남',
      authorId: 'match_seungho',
      authorName: '성호',
      authorAvatarText: '성',
      authorGradient: 'linear-gradient(135deg, #F7A15F 0%, #E6783A 100%)',
      hobbyId: 'cafe',
      hobbyLabel: '카페/맛집',
      tag: '카페',
      caption: '성수 오후 3시 카페에서 편하게 이야기하실 분. 조용한 로스터리 알아요.',
      mediaCaption: '성수 · 케냐 AA',
      ratio: 'square',
      groupName: '성수 카페투어 & 디저트 크루',
      likes: 31,
      likedByMe: false,
      comments: [
        { id: 'pc_sd1', authorName: '도현', text: '주말에 성수 갈 일 있는데 저장해둘게요', createdAt: ago(1 * HOUR) }
      ],
      createdAt: ago(4 * HOUR)
    },
    {
      id: 'pub_jongno_01',
      regionId: 'seoul-jongno',
      meetStyle: 'now',
      meetStyleLabel: '지금 번개',
      authorId: 'match_taeho',
      authorName: '태호',
      authorAvatarText: '태',
      authorGradient: 'linear-gradient(135deg, #ED9D70 0%, #F67029 100%)',
      hobbyId: 'boardgame',
      hobbyLabel: '보드게임',
      tag: '번개',
      caption: '종로·을지로 일요일 4인 보드게임 번개. 헤비게임 좋아하시면 편하게 오세요.',
      mediaCaption: '을지로 · 4인 전략',
      ratio: 'wide',
      groupName: '종로 전략 보드게임 & 독서',
      likes: 24,
      likedByMe: false,
      comments: [
        { id: 'pc_jn1', authorName: '현우', text: '2점 차면 거의 이긴 거예요 ㅋㅋ', createdAt: ago(3 * HOUR) },
        { id: 'pc_jn2', authorName: '동현', text: '다음 판에 저도 끼워주세요', createdAt: ago(2 * HOUR) }
      ],
      createdAt: ago(7 * HOUR)
    },
    {
      id: 'pub_yongsan_01',
      regionId: 'seoul-jongno',
      meetStyle: 'drink',
      meetStyleLabel: '술번개',
      authorId: 'match_iseul',
      authorName: '이슬',
      authorAvatarText: '이',
      authorGradient: 'linear-gradient(135deg, #1CDACB 0%, #29A8A0 100%)',
      hobbyId: 'climb',
      hobbyLabel: '클라이밍',
      tag: '한잔',
      caption: '이태원 저녁에 클라이밍 같이 하실 분. 끝나고 한 잔도 좋아요.',
      mediaCaption: 'V3 첫 완등',
      ratio: 'square',
      groupName: '이태원·한남 클라이밍 크루',
      likes: 19,
      likedByMe: false,
      comments: [
        { id: 'pc_ys1', authorName: '성민', text: 'V3 축하드려요! 발쓰기만 잡히면 금방 늘어요', createdAt: ago(5 * HOUR) }
      ],
      createdAt: ago(9 * HOUR)
    },
    {
      id: 'pub_gyeonggi_01',
      regionId: 'gyeonggi',
      meetStyle: 'now',
      meetStyleLabel: '지금 번개',
      authorId: 'match_junseo',
      authorName: '준서',
      authorAvatarText: '준',
      authorGradient: 'linear-gradient(135deg, #C1C9D5 0%, #8098BE 100%)',
      hobbyId: 'run',
      hobbyLabel: '러닝',
      tag: '퇴근후',
      caption: '판교 퇴근 후 6K 같이 뛰실 분. 탄천 7시, 편하게요.',
      mediaCaption: '탄천 · 6K',
      ratio: 'square',
      groupName: '판교·분당 퇴근 러닝',
      likes: 27,
      likedByMe: false,
      comments: [],
      createdAt: ago(12 * HOUR)
    },
    {
      id: 'pub_yeongdeungpo_01',
      regionId: 'seoul-yeongdeungpo',
      meetStyle: 'comfortable',
      meetStyleLabel: '편한 만남',
      authorId: 'match_boram',
      authorName: '보람',
      authorAvatarText: '보',
      authorGradient: 'linear-gradient(135deg, #0EC6F4 0%, #25A3CB 100%)',
      hobbyId: 'swim',
      hobbyLabel: '수영',
      tag: '저녁',
      caption: '여의도 저녁 수영 같이 하실 분. 8시 레인에서 1,000m 하고 근처서 국수 어때요.',
      mediaCaption: '1,000m · 24분',
      ratio: 'wide',
      groupName: '성동구민센터 새벽 모닝스윔',
      likes: 16,
      likedByMe: false,
      comments: [
        { id: 'pc_yd1', authorName: '태민', text: '여의도 레인 좋죠. 주말에 한번 가볼게요', createdAt: ago(8 * HOUR) }
      ],
      createdAt: ago(15 * HOUR)
    }
  ],

  /* ---------------- 모임에서 만난 동료의 취미 프로필 (Sprint 4) ----------------
   * 매칭 프로필 10인 밖의 사람(코치·모임원)과도 대화방이 열리므로, 대화방 헤더의
   * '취미 프로필 보기'가 같은 규격(matchProfile)으로 열릴 수 있게 보조 프로필을 둔다.
   * ------------------------------------------------------------------------- */
  partnerProfiles: [
    {
      id: 'user_jun',
      nickname: '코치준',
      age: 31,
      distanceKm: 0.2,
      location: '성수동',
      hobbyIds: ['fitness'],
      hobbyLabel: '크로스핏',
      hobbyIcon: '',
      hobbyStyle: '레벨업 박스 성수점 코치 · 8년차',
      cycle: '평일 19시',
      cycleIcon: '',
      hobbies: ['크로스핏', '역도', '자세교정'],
      specChips: [
        { icon: 'dumbbell', label: '경력', value: '코치 8년차' },
        { icon: 'clock', label: '수업', value: '평일 19:10반' },
        { icon: 'target', label: '전문', value: '클린 · 스내치' }
      ],
      bio: '성수박스에서 19:10반을 맡고 있습니다. 무게보다 자세 먼저, 부상 없이 오래 가는 게 목표예요.',
      avatarText: '준',
      avatarGradient: 'linear-gradient(135deg, #8098D2 0%, #C5CEDC 100%)',
      badge: '박스 코치 8년차',
      ratio: 'tall',
      likesMe: false,
      verified: true,
      isPartner: true
    },
    {
      id: 'user_faker',
      nickname: '미드장인',
      age: 27,
      distanceKm: 0,
      location: '전국 / 디스코드',
      hobbyIds: ['game'],
      hobbyLabel: '게임',
      hobbyIcon: '',
      hobbyStyle: '롤 골드 · 미드 · 칼바람 전문',
      cycle: '평일 심야',
      cycleIcon: '',
      hobbies: ['롤', '칼바람', '내전'],
      specChips: [
        { icon: 'gamepad', label: '티어', value: '골드 Ⅱ · 미드' },
        { icon: 'moon', label: '주 활동', value: '평일 밤 11시~' },
        { icon: 'headphones', label: '성향', value: '즐겜 · 디스코드' }
      ],
      bio: '퇴근하면 디스코드부터 켭니다. 랭겜은 진지하게, 칼바람은 웃으면서 해요.',
      avatarText: '미',
      avatarGradient: 'linear-gradient(135deg, #AA83E7 0%, #E0D0FB 100%)',
      badge: '골드 미드 · 칼바람',
      ratio: 'mid',
      likesMe: false,
      verified: false,
      isPartner: true
    }
  ],

  /* ---------------- 실시간 베스트(실베) 순위 기억 — Sprint 8 ----------------
   * 11/14 22:59 사용자 지시: "아니 그냥 알림만 보내도록" · 순위 변동(위·아래 화살표/NEW) 표시.
   * hotRankSnapshots : { '지역|취미': { at, ranks: {postId: 순위} } } — 직전 집계.
   *                    저장된 스냅샷이 없으면 '3시간 전' 집계를 기준선으로 계산한다(아래 getHotPosts).
   * hotEntryState    : { postId: { inside, rank, notifiedAt, baseline } } — 내 글의 실베 진입 알림 중복 방지.
   * hotEntryBaseline : { at, topN, count } — **첫 실행 기준선**. 11/15 01:18 사용자 지시
   *                    "1. 그냥 조용히 넘어가" → 앱을 처음 켰을 때 이미 Top 10 안에 있던 시드 글은
   *                    알림을 띄우지 않고 이 기준선에 조용히 등록만 한다(표식이 없으면 첫 확인 때 기록).
   * ------------------------------------------------------------------------- */
  hotRankSnapshots: {},
  hotEntryState: {},
  hotEntryBaseline: null,

  /* ---------------- 1:1 매칭 프로필 (Sprint 3 — 다양한 취미 10인) ----------------
   * 운동 편향 탈피: 게임·러닝·카페·영화·보드게임·크로스핏·수영·클라이밍·등산을 고루 배치.
   * 모든 프로필은 「대표 취미 + 취미 스타일·구력 + 선호 활동 시간대 + 한 줄 소개」 구조를 따른다.
   * ratio 는 메이슨리 카드의 높이 변주(3:4 tall / 4:5 mid / 1:1 square),
   * badge 는 카드 좌상단의 감각적인 취미 배지다.
   * likesMe: true 인 두 명(준호·도현)은 이미 나를 LIKE한 상태라 카드 하트를 누르면
   * '상호 LIKE' 축하 팝업이 뜨고 대화방이 열린다. (Sprint 3.5에서 적합도 %는 삭제)
   * ------------------------------------------------------------------------- */
  matchProfiles: [
    {
      id: 'match_junho',
      nickname: '준호',
      age: 26,
      distanceKm: 1.2,
      location: '성수동',
      hobbyIds: ['game'],
      hobbyLabel: '게임',
      hobbyIcon: '',
      hobbyStyle: '롤 다이아몬드 · 원딜',
      cycle: '평일 심야',
      cycleIcon: '',
      hobbies: ['롤', '칼바람', '디스코드'],
      specChips: [
        { icon: 'gamepad', label: '롤 티어', value: '다이아 Ⅳ · 원딜' },
        { icon: 'night', label: '플레이 시간', value: '평일 밤 11시~' },
        { icon: 'headphones', label: '성향', value: '승패보다 분위기' }
      ],
      bio: '퇴근하고 디스코드 켜서 칼바람 몇 판 하실 분? 랭겜은 진지하게, 칼바람은 웃으면서 해요.',
      avatarText: '준',
      avatarGradient: 'linear-gradient(135deg, #E0D0FB 0%, #AA83E7 100%)',
      badge: '롤 다이아 원딜',
      ratio: 'tall',
      likesMe: true,
      verified: true
    },
    {
      id: 'match_minwoo',
      nickname: '민우',
      age: 28,
      distanceKm: 2.4,
      location: '뚝섬한강',
      hobbyIds: ['run'],
      hobbyLabel: '러닝',
      hobbyIcon: '',
      hobbyStyle: '한강 나이트런 · 10K 5분 20초',
      cycle: '화·목 저녁',
      cycleIcon: '',
      hobbies: ['나이트런', '10K', '러닝크루'],
      specChips: [
        { icon: 'run', label: '페이스', value: '10K 52분 (5:20/km)' },
        { icon: 'sunset', label: '러닝 시간', value: '화·목 20:00' },
        { icon: 'map', label: '주 코스', value: '뚝섬한강 · 샛강' }
      ],
      bio: '뚝섬한강공원에서 화·목 저녁에 달려요. 같이 뛰면서 대화가 되는 속도로만 갑니다.',
      avatarText: '민',
      avatarGradient: 'linear-gradient(135deg, #76CFF6 0%, #7994E2 100%)',
      badge: '10K 52분 러너',
      ratio: 'mid',
      likesMe: false,
      verified: true
    },
    {
      id: 'match_dohyun',
      nickname: '도현',
      age: 25,
      distanceKm: 1.8,
      location: '한양대',
      hobbyIds: ['cafe'],
      hobbyLabel: '카페/맛집',
      hobbyIcon: '',
      hobbyStyle: '성수·연남 카페투어 · 핸드드립',
      cycle: '주말 낮',
      cycleIcon: '',
      hobbies: ['카페투어', '핸드드립', '베이커리'],
      specChips: [
        { icon: 'cup', label: '취미 깊이', value: '핸드드립 3년차' },
        { icon: 'camera', label: '부수기술', value: '인생샷 잘 찍어줌' },
        { icon: 'sun', label: '탐방 시간', value: '주말 11시~17시' }
      ],
      bio: '주말마다 카페 두세 곳 돌면서 원두 이야기 하는 게 낙이에요. 사진은 제가 찍어드릴게요.',
      avatarText: '도',
      avatarGradient: 'linear-gradient(135deg, #F7A928 0%, #EB762F 100%)',
      badge: '핸드드립 3년차',
      ratio: 'square',
      likesMe: true,
      verified: true
    },
    {
      id: 'match_seojun',
      nickname: '서준',
      age: 27,
      distanceKm: 5.8,
      location: '대치동',
      hobbyIds: ['movie'],
      hobbyLabel: '영화·전시',
      hobbyIcon: '',
      hobbyStyle: '독립영화관 · 국립현대미술관',
      cycle: '금요 심야',
      cycleIcon: '',
      hobbies: ['독립영화', '전시', '필름카메라'],
      specChips: [
        { icon: 'film', label: '관람 기록', value: '올해 84편' },
        { icon: 'image', label: '전시', value: '월 1~2회' },
        { icon: 'night', label: '관람 시간', value: '금요 심야 ~ 21시' }
      ],
      bio: '금요일 밤 심야 영화 보고 근처 포차에서 30분만 이야기하는 코스 좋아해요. 스포는 안 합니다.',
      avatarText: '서',
      avatarGradient: 'linear-gradient(135deg, #C5CEDC 0%, #8098D2 100%)',
      badge: '올해 84편 관람',
      ratio: 'tall',
      likesMe: false,
      verified: false
    },
    {
      id: 'match_hyunwoo',
      nickname: '현우',
      age: 29,
      distanceKm: 3.5,
      location: '왕십리동',
      hobbyIds: ['boardgame'],
      hobbyLabel: '보드게임',
      hobbyIcon: '',
      hobbyStyle: '아그리콜라 · 테라포밍마스',
      cycle: '주말 오후',
      cycleIcon: '',
      hobbies: ['전략게임', '2인게임', '룰 설명'],
      specChips: [
        { icon: 'idea', label: '선호 장르', value: '전략 · 일꾼 놓기' },
        { icon: 'users', label: '인원', value: '2~4인' },
        { icon: 'clock', label: '모임 시간', value: '주말 14시~' }
      ],
      bio: '설명은 제가 친절하게 해드려요. 2인 전략게임 진지하게 꼬박 3시간 앉아 있을 수 있는 분 환영.',
      avatarText: '현',
      avatarGradient: 'linear-gradient(135deg, #F7A15F 0%, #E6783A 100%)',
      badge: '아그리콜라 러버',
      ratio: 'square',
      likesMe: false,
      verified: true
    },
    {
      id: 'match_jihun',
      nickname: '지훈',
      age: 24,
      distanceKm: 0.8,
      location: '성수동',
      hobbyIds: ['fitness', 'run'],
      hobbyLabel: '헬스/크로스핏',
      hobbyIcon: '',
      hobbyStyle: '성수박스 6개월차 · 19시반',
      cycle: '평일 19시',
      cycleIcon: '',
      hobbies: ['크로스핏', '하이록스', '오운완'],
      specChips: [
        { icon: 'dumbbell', label: '경력', value: '크로스핏 6개월차' },
        { icon: 'clock', label: '수업', value: '평일 19:10' },
        { icon: 'target', label: '목표', value: '푸시업 50개 · 클린 60kg' }
      ],
      bio: '레벨업 박스 19:10반 레귤러예요. 운동 끝나고 단백질 한 잔 같이 하실 분, 어색해도 먼저 말 걸게요.',
      avatarText: '지',
      avatarGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)',
      badge: '크로스핏 6개월차',
      ratio: 'tall',
      likesMe: false,
      verified: true
    },
    {
      id: 'match_taemin',
      nickname: '태민',
      age: 26,
      distanceKm: 2.1,
      location: '뚝섬',
      hobbyIds: ['swim'],
      hobbyLabel: '수영',
      hobbyIcon: '',
      hobbyStyle: '성동구민센터 상급반 · 자유형 1,500m',
      cycle: '평일 06시',
      cycleIcon: '',
      hobbies: ['자유형', '새벽수영', '오픈워터'],
      specChips: [
        { icon: 'swim', label: '최고 기록', value: '1,500m 29분' },
        { icon: 'sunrise', label: '수영 시간', value: '월·수·금 06:00' },
        { icon: 'swim', label: '레벨', value: '상급반' }
      ],
      bio: '새벽 6시에 물에 들어가면 하루가 달라집니다. 같이 출근 전에 수영하실 분.',
      avatarText: '태',
      avatarGradient: 'linear-gradient(135deg, #10B0C8 0%, #14A5CC 100%)',
      badge: '자유형 1,500m',
      ratio: 'mid',
      likesMe: false,
      verified: true
    },
    {
      id: 'match_seongmin',
      nickname: '성민',
      age: 30,
      distanceKm: 6.2,
      location: '신논현',
      hobbyIds: ['climb'],
      hobbyLabel: '클라이밍',
      hobbyIcon: '',
      hobbyStyle: '블록스 V4 · 주 3회',
      cycle: '주 3회 저녁',
      cycleIcon: '',
      hobbies: ['볼더링', '리드', '루트읽기'],
      specChips: [
        { icon: 'climb', label: '난이도', value: 'V4 (빨강)' },
        { icon: 'calendar', label: '번도', value: '주 3회' },
        { icon: 'pin', label: '주 지점', value: '신사 · 성수' }
      ],
      bio: '발쓰기만 제대로 해도 반은 먹고 들어가요. 성수 블록스 갈 때 같이 가실 분, 루트 읽어드립니다.',
      avatarText: '성',
      avatarGradient: 'linear-gradient(135deg, #E1E5EA 0%, #8098BE 100%)',
      badge: 'V4 볼더러',
      ratio: 'tall',
      likesMe: false,
      verified: true
    },
    {
      id: 'match_haram',
      nickname: '하람',
      age: 27,
      distanceKm: 1.0,
      location: '성수동',
      hobbyIds: ['cafe', 'boardgame'],
      hobbyLabel: '카페/맛집',
      hobbyIcon: '',
      hobbyStyle: '동네 맛집 탐방 · 보드게임 카페',
      cycle: '주말 오후',
      cycleIcon: '',
      hobbies: ['맛집탐방', '보드게임카페', '소설'],
      specChips: [
        { icon: 'cup', label: '탐방 범위', value: '성수 · 서울숲 · 왕십리' },
        { icon: 'dice', label: '같이 할 게임', value: '가벼운 파티게임' },
        { icon: 'clock', label: '모임 시간', value: '주말 15시~' }
      ],
      bio: '성수에서 태어나서 성수만 아는 사람입니다. 순대국부터 보드게임까지 코스 찍어드릴게요.',
      avatarText: '하',
      avatarGradient: 'linear-gradient(135deg, #FB9D5C 0%, #EB7750 100%)',
      badge: '성수 맛집 지도',
      ratio: 'square',
      likesMe: false,
      verified: false
    },
    {
      id: 'match_woojin',
      nickname: '우진',
      age: 25,
      distanceKm: 7.4,
      location: '강남역',
      hobbyIds: ['fitness', 'hike'],
      hobbyLabel: '헬스/크로스핏',
      hobbyIcon: '',
      hobbyStyle: '3대 420 · 주말 아차산',
      cycle: '주말 오전',
      cycleIcon: '',
      hobbies: ['웨이트', '등산', '새벽운동'],
      specChips: [
        { icon: 'barbell', label: '3대 합계', value: '420kg' },
        { icon: 'mountain', label: '산행', value: '아차산 · 청계산' },
        { icon: 'clock', label: '운동 시간', value: '주말 07:00' }
      ],
      bio: '주말 아침에 산 오르고 내려와서 국밥 먹는 게 최고예요. 강남에서 출발해도 괜찮아요.',
      avatarText: '우',
      avatarGradient: 'linear-gradient(135deg, #1BD0C2 0%, #0DAD83 100%)',
      badge: '3대 420 · 아차산',
      ratio: 'mid',
      likesMe: false,
      verified: true
    },
    /* ===== Sprint 7 — 다른 생활권의 취미친구 8인 (지역 탐색 + 30대 이상 나이대 보강) ===== */
    {
      id: 'match_jiwoo',
      nickname: '지우',
      age: 31,
      distanceKm: 7.8,
      location: '합정동',
      regionId: 'mapo',
      hobbyIds: ['movie'],
      hobbyLabel: '영화·전시',
      hobbyIcon: '',
      hobbyStyle: '합정 아트하우스 · 홍대 전시',
      cycle: '금요 심야',
      cycleIcon: '',
      hobbies: ['독립영화', '전시', '필름카메라'],
      specChips: [
        { icon: 'film', label: '관람 기록', value: '올해 96편' },
        { icon: 'image', label: '전시', value: '월 2회' },
        { icon: 'night', label: '관람 시간', value: '금·토 심야' }
      ],
      bio: '합정에서 심야 상영 보고 걸어서 집에 오는 코스가 좋아요. 보고 나서 30분은 이야기하고 싶습니다.',
      avatarText: '지',
      avatarGradient: 'linear-gradient(135deg, #D9D7F4 0%, #9792D8 100%)',
      badge: '올해 96편',
      ratio: 'mid',
      likesMe: false,
      verified: true
    },
    {
      id: 'match_seungho',
      nickname: '성호',
      age: 34,
      distanceKm: 8.6,
      location: '성수동',
      regionId: 'seongdong',
      hobbyIds: ['cafe'],
      hobbyLabel: '카페/맛집',
      hobbyIcon: '',
      hobbyStyle: '성수 카페 도장깨기 · 핸드드립 5년',
      cycle: '주말 낮',
      cycleIcon: '',
      hobbies: ['핸드드립', '베이커리', '사진'],
      specChips: [
        { icon: 'cup', label: '취미 깊이', value: '핸드드립 5년차' },
        { icon: 'pin', label: '주 무대', value: '성수 · 서울숲' },
        { icon: 'sun', label: '탐방 시간', value: '주말 12~18시' }
      ],
      bio: '성수에서 5년 살았습니다. 줄 서는 집보다 조용한 집을 알아요. 같이 도장깨기 하실 분.',
      avatarText: '성',
      avatarGradient: 'linear-gradient(135deg, #F7A15F 0%, #E6783A 100%)',
      badge: '핸드드립 5년차',
      ratio: 'tall',
      likesMe: false,
      verified: true
    },
    {
      id: 'match_donghyun',
      nickname: '동현',
      age: 29,
      distanceKm: 7.5,
      location: '홍대입구',
      regionId: 'mapo',
      hobbyIds: ['boardgame', 'game'],
      hobbyLabel: '보드게임',
      hobbyIcon: '',
      hobbyStyle: '홍대 보드게임카페 · 전략게임',
      cycle: '주말 오후',
      cycleIcon: '',
      hobbies: ['전략게임', '파티게임', '보드게임카페'],
      specChips: [
        { icon: 'idea', label: '선호 장르', value: '전략 · 협력' },
        { icon: 'users', label: '인원', value: '2~5인' },
        { icon: 'clock', label: '모임 시간', value: '주말 15시~' }
      ],
      bio: '홍대 보드게임카페 단골입니다. 뉴비한테 설명하는 거 좋아해요. 무거운 게임도 천천히 같이 가요.',
      avatarText: '동',
      avatarGradient: 'linear-gradient(135deg, #37C5EC 0%, #2EA3CF 100%)',
      badge: '홍대 보겜 단골',
      ratio: 'square',
      likesMe: false,
      verified: false
    },
    {
      id: 'match_gyeom',
      nickname: '겨울',
      age: 23,
      distanceKm: 9.1,
      location: '건대입구',
      regionId: 'seongdong',
      hobbyIds: ['run'],
      hobbyLabel: '러닝',
      hobbyIcon: '',
      hobbyStyle: '건대 러닝크루 · 10K 5분 40초',
      cycle: '화·목 아침',
      cycleIcon: '',
      hobbies: ['아침러닝', '한강', '기록'],
      specChips: [
        { icon: 'run', label: '페이스', value: '10K 57분 (5:40/km)' },
        { icon: 'sunset', label: '러닝 시간', value: '화·목 06:30' },
        { icon: 'map', label: '주 코스', value: '뚝섬 · 건대' }
      ],
      bio: '아침에 5K만 뛰고 하루를 시작합니다. 속도보다 같이 나오는 게 어려운 거더라고요.',
      avatarText: '겨',
      avatarGradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)',
      badge: '아침 5K 습관',
      ratio: 'mid',
      likesMe: false,
      verified: true
    },
    {
      id: 'match_taeho',
      nickname: '태호',
      age: 37,
      distanceKm: 9.4,
      location: '종로3가',
      regionId: 'jongno',
      hobbyIds: ['boardgame', 'movie'],
      hobbyLabel: '보드게임',
      hobbyIcon: '',
      hobbyStyle: '을지로 전략게임 · 고전명작',
      cycle: '일요 오후',
      cycleIcon: '',
      hobbies: ['전략게임', '고전영화', '독서'],
      specChips: [
        { icon: 'idea', label: '선호 장르', value: '헤비 전략' },
        { icon: 'book', label: '요즘 읽는 것', value: 'SF 단편' },
        { icon: 'clock', label: '모임 시간', value: '일 15시~' }
      ],
      bio: '말 없이 한 판 두 시간 앉아 있는 걸 좋아합니다. 끝나고 한 잔 하면서 복기하는 것도요.',
      avatarText: '태',
      avatarGradient: 'linear-gradient(135deg, #ED9D70 0%, #F67029 100%)',
      badge: '헤비 전략파',
      ratio: 'square',
      likesMe: false,
      verified: false
    },
    {
      id: 'match_iseul',
      nickname: '이슬',
      age: 24,
      distanceKm: 6.9,
      location: '이태원',
      regionId: 'yongsan',
      hobbyIds: ['climb'],
      hobbyLabel: '클라이밍',
      hobbyIcon: '',
      hobbyStyle: '이태원 클라이밍 · V3',
      cycle: '평일 저녁',
      cycleIcon: '',
      hobbies: ['볼더링', '요가', '루트읽기'],
      specChips: [
        { icon: 'climb', label: '난이도', value: 'V3 (파랑)' },
        { icon: 'calendar', label: '빈도', value: '주 2회' },
        { icon: 'pin', label: '주 지점', value: '이태원 · 한남' }
      ],
      bio: '이태원에서 클라이밍 1년차예요. 잘하는 사람보다 꾸준한 사람이랑 같이 하고 싶습니다.',
      avatarText: '이',
      avatarGradient: 'linear-gradient(135deg, #1CDACB 0%, #29A8A0 100%)',
      badge: 'V3 1년차',
      ratio: 'tall',
      likesMe: false,
      verified: true
    },
    {
      id: 'match_junseo',
      nickname: '준서',
      age: 32,
      distanceKm: 24,
      location: '판교',
      regionId: 'gyeonggi',
      hobbyIds: ['fitness', 'run'],
      hobbyLabel: '헬스/크로스핏',
      hobbyIcon: '',
      hobbyStyle: '판교 헬스 · 3대 380',
      cycle: '평일 20시',
      cycleIcon: '',
      hobbies: ['웨이트', '탄천러닝', '오운완'],
      specChips: [
        { icon: 'barbell', label: '3대 합계', value: '380kg' },
        { icon: 'clock', label: '운동 시간', value: '평일 20시' },
        { icon: 'map', label: '주 코스', value: '탄천 · 판교' }
      ],
      bio: '판교에서 일합니다. 퇴근하고 6K 뛰고 집에 가는 게 하루 마무리예요. 주말엔 서울 나갑니다.',
      avatarText: '준',
      avatarGradient: 'linear-gradient(135deg, #C1C9D5 0%, #8098BE 100%)',
      badge: '3대 380 · 퇴근런',
      ratio: 'mid',
      likesMe: false,
      verified: true
    },
    {
      id: 'match_boram',
      nickname: '보람',
      age: 26,
      distanceKm: 6.4,
      location: '여의도',
      regionId: 'yeongdeungpo',
      hobbyIds: ['swim'],
      hobbyLabel: '수영',
      hobbyIcon: '',
      hobbyStyle: '여의도 수영장 · 자유형 1,000m',
      cycle: '평일 저녁',
      cycleIcon: '',
      hobbies: ['자유형', '평영', '한강산책'],
      specChips: [
        { icon: 'swim', label: '최고 기록', value: '1,000m 24분' },
        { icon: 'sunrise', label: '수영 시간', value: '평일 20:00' },
        { icon: 'swim', label: '레벨', value: '중급반' }
      ],
      bio: '여의도에서 일하고 수영장 들렀다 집에 갑니다. 같이 레인 쓰실 분, 페이스 맞춰요.',
      avatarText: '보',
      avatarGradient: 'linear-gradient(135deg, #0EC6F4 0%, #25A3CB 100%)',
      badge: '자유형 1,000m',
      ratio: 'square',
      likesMe: false,
      verified: false
    }
  ],

  /* ---------------- 하트(LIKE) 기록 (중복 방지·카드 상태의 근거) ---------------- */
  matchSwipes: [],

  /* v33.4 — 피드·댓글에서 알게 된 사람(모임 명부·이름만 아는 사람)의 최소 프로필.
     프로필 시트를 열 때 한 번씩 적히고, id 로 다시 찾을 수 있다. */
  personas: {},

  /* ---------------- 1:1 채팅방 (Sprint 4에서 메시지 송수신 구현) ----------------
   * 매칭으로 새로 열린 방은 isNewMatch: true → 채팅 탭에서 '새 매칭' 배지
   * ------------------------------------------------------------------------- */
  chatRooms: [
    {
      id: 'chat_jun',
      partnerId: 'user_jun',
      partnerName: '코치준',
      partnerHobby: '크로스핏 코치',
      partnerAvatarText: '준',
      partnerGradient: 'linear-gradient(135deg, #8098D2 0%, #C5CEDC 100%)',
      lastMessage: '내일 스쿼트 클린 가요! 무게 조절해서 콜해드릴게요',
      lastTime: '어제 22:40',
      unreadCount: 1,
      isNewMatch: false,
      messages: [
        { id: 'm_jun_1', from: 'them', text: '루키님 어제 19:10반 푸시업 자세 많이 좋아졌어요', at: ago(26 * HOUR) },
        { id: 'm_jun_2', from: 'me', text: '감사합니다! 물구나무는 아직 무서워서요 ㅋㅋ', at: ago(25 * HOUR + 40 * MINUTE) },
        { id: 'm_jun_3', from: 'them', text: '내일 스쿼트 클린 가요! 무게 조절해서 콜해드릴게요', at: ago(2 * HOUR + 20 * MINUTE) }
      ]
    },
    {
      id: 'chat_faker',
      partnerId: 'user_faker',
      partnerName: '미드장인',
      partnerHobby: '롤 소환사',
      partnerAvatarText: '미',
      partnerGradient: 'linear-gradient(135deg, #AA83E7 0%, #E0D0FB 100%)',
      lastMessage: '오늘 롤드컵 결승 보고 칼바람 팟 짰습니다 ㅋㅋㅋ',
      lastTime: '11/09',
      unreadCount: 0,
      isNewMatch: false,
      messages: [
        { id: 'm_faker_1', from: 'them', text: '모임에서 봤어요! 칼바람 좋아하시죠?', at: ago(5 * 24 * HOUR) },
        { id: 'm_faker_2', from: 'me', text: '네 ㅋㅋ 퇴근하고 한두 판씩 돌립니다', at: ago(5 * 24 * HOUR - 12 * MINUTE) },
        { id: 'm_faker_3', from: 'them', text: '오늘 롤드컵 결승 보고 칼바람 팟 짰습니다 ㅋㅋㅋ', at: ago(4 * 24 * HOUR) }
      ]
    }
  ],

  /* ---------------- 1:1 대화방의 웰컴 답장 풀 (Sprint 4) ----------------
   * 메시지를 보내면 1~2초 뒤 상대가 취미에 맞는 답장을 보낸다.
   * 실제 서비스에서는 이 자리에 상대방의 실제 메시지(소켓)가 들어온다.
   * ------------------------------------------------------------------------- */
  chatReplyPools: [
    { key: 'fitness', match: ['크로스핏', '헬스', '와드', '박스'], replies: [
      '반가워요! 이번 주 19:10반 같이 들어요',
      '오늘 WOD 봤어요? 스쿼트 클린 있어서 무게 조절했어요',
      '운동 끝나고 단백질 한 잔 하실래요? 박스 앞에 편한 데 알아요',
      '푸시업 50개 목표시면 제가 자세 봐드릴게요. 부상 없이 갑시다!'
    ] },
    { key: 'run', match: ['러닝', '런', '10K', '페이스'], replies: [
      '반가워요! 이번 주말에 운동 같이 하실래요?',
      '뚝섬한강공원 코스 좋아해요. 5분 30초 페이스로 가볍게 돌아요',
      '저는 화·목 저녁에 달려요. 시간 맞으면 같이 뛰어요!'
    ] },
    { key: 'game', match: ['게임', '롤', '소환사', '칼바람', '디스코드'], replies: [
      '반가워요! 오늘 밤에 칼바람 몇 판 하실래요?',
      '디스코드 켜두고 있어요. 퇴근하면 한 판 콜해주세요 ㅋㅋ',
      '랭겜보다 칼바람이 편하더라고요. 같이 가요!'
    ] },
    { key: 'cafe', match: ['카페', '맛집', '핸드드립', '디저트'], replies: [
      '반가워요! 이번 주말에 카페 한 곳 같이 가실래요?',
      '성수에 새로 생긴 데 가보고 싶었어요. 시간 맞춰볼까요?',
      '저는 핸드드립 좋아해요. 원두 추천해드릴게요!'
    ] },
    { key: 'movie', match: ['영화', '전시', '시네마'], replies: [
      '반가워요! 금요일 심야 영화 어떠세요?',
      '지금 상영 중인 독립영화 같이 보실래요? 스포는 안 합니다 ㅋㅋ',
      '근처 전시도 보고 커피 한 잔 하면 좋을 것 같아요'
    ] },
    { key: 'boardgame', match: ['보드게임', '아그리콜라'], replies: [
      '반가워요! 주말에 보드게임 한 판 어때요?',
      '설명은 제가 친절하게 해드려요. 2인 전략게임 좋아하세요?',
      '왕십리 쪽에 자리 좋은 데 알아요. 토요일 14시 어떠세요?'
    ] },
    { key: 'swim', match: ['수영', '레인', '자유형'], replies: [
      '반가워요! 새벽 6시 레인 같이 들어가실래요?',
      '월·수·금 중급레인에서 봬요. 출근 전에 한 시간이면 충분해요',
      '저는 자유형 위주로 갑니다. 페이스 맞춰볼까요?'
    ] },
    { key: 'climb', match: ['클라이밍', '볼더링', 'V4', '루트'], replies: [
      '반가워요! 이번 주말에 블록스 같이 가실래요?',
      '파랑 레벨부터 같이 보면 좋을 것 같아요. 루트 읽어드릴게요',
      '발쓰기만 잡히면 금방 늘어요. 편한 시간 알려주세요!'
    ] }
  ],

  /* ---------------- 모임 가입 신청서 (Sprint 4.5) ----------------
   * 승인제 모임에 들어온 신청 한 건. 모임장이 수락/거절하고, 신청자는 취소할 수 있다.
   *
   * groupApplication : { id, groupId, groupName, groupIcon,
   *                      applicantId, applicantName, applicantAge, applicantHobby,
   *                      applicantAvatarText, applicantGradient,
   *                      answers[{question, answer}],
   *                      status:'pending'|'approved'|'rejected'|'canceled',
   *                      createdAt, decidedAt, decisionNote }
   *
   * 시드: 내가 모임장인 '성수 레벨업 퇴근 와드팟'에 대기 신청자 2명을 두어
   *       수락·거절 UI를 바로 시험해 볼 수 있게 했다.
   * ------------------------------------------------------------------------- */
  groupApplications: [
    {
      id: 'app_seed_kettle',
      groupId: 'grp_crossfit_1',
      groupName: '성수 레벨업 퇴근 와드팟',
      groupIcon: '',
      applicantId: 'user_kettle',
      applicantName: '케틀벨러버',
      applicantAge: 28,
      applicantHobby: '크로스핏 · 파머스워크 24kg',
      applicantAvatarText: '케',
      applicantGradient: 'linear-gradient(135deg, #05AF7A, #0FAB78)',
      answers: [
        { question: '취미 구력이나 참여 가능한 요일을 적어주세요!', answer: '성수동 28세 크로스핏터입니다. 주 3회 참여 희망합니다! 월·수·금 19:10반 위주로 나갈 수 있어요.' },
        { question: '이 모임에서 함께하고 싶은 걸 한 줄로 적어주세요', answer: '파머스워크 악력 훈련 같이 하고 오운완 인증 나누고 싶어요.' }
      ],
      status: 'pending',
      createdAt: ago(3 * HOUR),
      decidedAt: null,
      decisionNote: null
    },
    {
      id: 'app_seed_toe',
      groupId: 'grp_crossfit_1',
      groupName: '성수 레벨업 퇴근 와드팟',
      groupIcon: '',
      applicantId: 'user_toe',
      applicantName: '오늘의토우',
      applicantAge: 31,
      applicantHobby: '크로스핏 · 푸시업 정자세 연습',
      applicantAvatarText: '토',
      applicantGradient: 'linear-gradient(135deg, #17AC68, #0FB07B)',
      answers: [
        { question: '취미 구력이나 참여 가능한 요일을 적어주세요!', answer: '크로스핏 4개월차입니다. 19시 반에 도착해서 같이 WOD 돌고 싶습니다.' },
        { question: '이 모임에서 함께하고 싶은 걸 한 줄로 적어주세요', answer: '물구나무 푸시업이 목표예요. 자세 봐주시면 열심히 따라갈게요!' }
      ],
      status: 'pending',
      createdAt: ago(26 * HOUR),
      decidedAt: null,
      decisionNote: null
    }
  ],

  /* ---------------- 알림 설정 · 알림함 (Sprint 4.5) ----------------
   * permission : 브라우저 Notification.permission 미러링 ('default'|'granted'|'denied')
   * pushEnabled: 앱 안의 마스터 스위치 (꺼두면 어떤 채널로도 알리지 않는다)
   * dndEnabled : 야간 방해 금지 (dndStart~dndEnd 사이에는 알림함에만 쌓인다)
   * ------------------------------------------------------------------------- */
  notificationSettings: {
    pushEnabled: true,
    permission: 'default',
    dndEnabled: false,
    dndStart: '22:00',
    dndEnd: '08:00',
    promptDismissed: false,
    lastTestAt: null,
    lastPermissionRequestAt: null,
    /* Sprint 6 — 알림 종류별 ON/OFF 5종. 꺼둔 종류는 알림함에만 남는다(suppressed). */
    channels: { chat: true, like: true, comment: true, join_request: true, join_result: true },
    /* Sprint 7 — 방해 금지(야간) 시간에도 **즉시** 보내는 예외 종류.
       11/14 22:24 "방해 금지 시간에도 모임 가입 결과(join_result)는 즉시 알림 예외 적용".
       가입 결과는 기다리던 소식이라 밤에 조용히 쌓아두면 의미가 없다 → 기본 ON. */
    dndExceptions: { join_result: true }
  },

  /* notification : { id, kind:'chat'|'like'|'comment'|'join_request'|'join_result'|'system', category,
   *                  title, body, roomId, groupId, postId, source, action,
   *                  at, read, channel:'system'|'inapp'|'suppressed', reason } */
  notificationLog: [
    {
      id: 'ntf_seed_jun',
      kind: 'chat',
      category: 'chat',
      title: '코치준',
      body: '내일 스쿼트 클린 가요! 무게 조절해서 콜해드릴게요',
      roomId: 'chat_jun',
      groupId: null,
      postId: null,
      at: ago(2 * HOUR + 20 * MINUTE),
      read: false,
      channel: 'system',
      reason: null
    },
    {
      id: 'ntf_seed_apply',
      kind: 'join_request',
      category: 'join_request',
      title: '가입 신청',
      body: '케틀벨러버님이 "성수 레벨업 퇴근 와드팟" 가입을 신청했어요',
      roomId: null,
      groupId: 'grp_crossfit_1',
      postId: null,
      action: 'join_request',
      at: ago(3 * HOUR),
      read: false,
      channel: 'inapp',
      reason: null
    }
  ],

  /* ---------------- 프로필 수정 폼의 선택지 (Sprint 4) ---------------- */
  activityOptions: [
    { icon: 'sunrise', label: '새벽' },
    { icon: 'sun', label: '주말 오전' },
    { icon: 'sunset', label: '평일 저녁' },
    { icon: 'moon', label: '평일 심야' },
    { icon: 'clock', label: '주말 오후' },
    { icon: 'repeat', label: '상시' }
  ],

  /* =======================================================================
   * Sprint 14 — 홈 = 내 모임 허브
   * -----------------------------------------------------------------------
   * 11/15 14:55 사용자: "탐색도 중요하지만 내 모임에서의 활동이나 모임의 모임 등
   * 그런것도 중요해 … 홈이 우리 모임의 사진 피드가 보이고 멤버들의 단체 채팅
   * 아니면 술모임이나 그런게 중요하지".
   *   homePrefs  : 홈에서 마지막으로 열어 둔 모임(앱을 다시 열어도 그 모임으로)
   *   groupChats : 모임 단체 채팅방 — groupId 마다 messages[] (1:1 chatRooms 와 별개)
   *   groupEvents: 모임 안의 오프라인 약속(술모임·번개) + 참석/대기/불참(RSVP)
   * ======================================================================= */
  homePrefs: { groupId: 'grp_crossfit_1' },

  groupChats: [
    {
      groupId: 'grp_crossfit_1',
      messages: [
        { id: 'gcm_cf_1', from: 'member', authorId: 'leader_jun', authorName: '코치준', authorAvatarText: '준', authorGradient: 'linear-gradient(135deg, #8098D2, #C5CEDC)', text: '오늘 19:10 정규반 그대로 갑니다. 와드 화이트보드 사진 먼저 올려둘게요', at: ago(96 * MINUTE) },
        { id: 'gcm_cf_2', from: 'member', authorId: 'user_kettle', authorName: '케틀벨러버', authorAvatarText: '케', authorGradient: 'linear-gradient(135deg, #05AF7A, #0FAB78)', text: '저 오늘 10분 늦어요ㅠㅠ 스트레칭 먼저 하고 계세요', at: ago(78 * MINUTE) },
        { id: 'gcm_cf_3', from: 'member', authorId: 'user_toe', authorName: '오늘의토우', authorAvatarText: '오', authorGradient: 'linear-gradient(135deg, #76CFF6, #7994E2)', text: '끝나고 다들 술 한잔 어때요? 수요일이니까', at: ago(41 * MINUTE) },
        { id: 'gcm_cf_4', from: 'member', authorId: 'leader_jun', authorName: '코치준', authorAvatarText: '준', authorGradient: 'linear-gradient(135deg, #8098D2, #C5CEDC)', text: '좋아요. 아래 일정 카드에 [참석] 눌러주면 인원 맞춰서 자리 잡을게요', at: ago(36 * MINUTE) }
      ]
    },
    {
      groupId: 'grp_fitness_1',
      messages: [
        { id: 'gcm_ft_1', from: 'member', authorId: 'user_iron', authorName: '아이언', authorAvatarText: '아', authorGradient: 'linear-gradient(135deg, #DFE3E9, #8098D2)', text: '이번 주 토요일 3대 측정 같이 하실 분? 스팟 서로 봐드려요', at: ago(5 * HOUR) },
        { id: 'gcm_ft_2', from: 'member', authorId: 'user_hold', authorName: '홀드', authorAvatarText: '홀', authorGradient: 'linear-gradient(135deg, #14A5CC, #10B0C8)', text: '저 갈게요! 10시 어때요', at: ago(4 * HOUR) }
      ]
    },
    {
      groupId: 'grp_climbing_1',
      messages: [
        { id: 'gcm_cl_1', from: 'member', authorId: 'match_junseo', authorName: '준서', authorAvatarText: '준', authorGradient: 'linear-gradient(135deg, #0FB57E, #06AE7E)', text: '블록스 성수 새 벽 세팅됐대요. 수요일 저녁에 갈 사람?', at: ago(9 * HOUR) }
      ]
    }
  ],

  /* v36.1 (#23461) — 일정 단톡방: 일정(eventId) 마다 하나. 참석자·승인 게스트가 자동으로 들어간다. */
  eventChats: [],

  groupEvents: [
    {
      id: 'evt_cf_drink',
      groupId: 'grp_crossfit_1',
      kind: 'drink',
      title: '수요일 와드 끝 술모임',
      when: atClock(3, 20, 30),
      place: '성수 포차거리 · 2차는 노래방',
      note: '와드 끝나고 20:30에 모여요. 1인 2만원 안쪽으로 맞춰볼게요.',
      capacity: 12,
      guestOpen: true,
      createdBy: 'leader_jun',
      createdByName: '코치준',
      rsvps: [
        { memberId: 'leader_jun', name: '코치준', avatarText: '준', gradient: 'linear-gradient(135deg, #8098D2, #C5CEDC)', status: 'yes' },
        { memberId: 'user_kettle', name: '케틀벨러버', avatarText: '케', gradient: 'linear-gradient(135deg, #05AF7A, #0FAB78)', status: 'yes' },
        { memberId: 'user_toe', name: '오늘의토우', avatarText: '오', gradient: 'linear-gradient(135deg, #76CFF6, #7994E2)', status: 'yes' },
        { memberId: 'user_iron', name: '아이언', avatarText: '아', gradient: 'linear-gradient(135deg, #DFE3E9, #8098D2)', status: 'maybe' }
      ]
    },
    {
      id: 'evt_cf_full',
      groupId: 'grp_crossfit_1',
      kind: 'workout',
      title: '금요일 4인 소규모 자세 클래스',
      when: atClock(4, 19, 30),
      place: '레벨업 박스 성수점 2층',
      note: '정원 3명 마감된 클래스예요. 참석을 누르면 대기 명단에 들어가고, 자리가 나면 자동으로 올라갑니다.',
      capacity: 3,
      guestOpen: true,
      createdBy: 'leader_jun',
      createdByName: '코치준',
      rsvps: [
        { memberId: 'leader_jun', name: '코치준', avatarText: '준', gradient: 'linear-gradient(135deg, #8098D2, #C5CEDC)', status: 'yes' },
        { memberId: 'user_kettle', name: '케틀벨러버', avatarText: '케', gradient: 'linear-gradient(135deg, #05AF7A, #0FAB78)', status: 'yes' },
        { memberId: 'user_toe', name: '오늘의토우', avatarText: '오', gradient: 'linear-gradient(135deg, #76CFF6, #7994E2)', status: 'yes' }
      ]
    },
    {
      id: 'evt_cf_run',
      groupId: 'grp_crossfit_1',
      kind: 'workout',
      title: '토요일 아침 한강 러닝 번개',
      when: atClock(6, 8, 0),
      place: '여의나루 한강공원 3번 출구',
      note: '5K 가볍게 뜁니다. 페이스 상관없이 끝나고 커피',
      capacity: 20,
      createdBy: 'user_rookie',
      createdByName: '루키',
      rsvps: [
        { memberId: 'user_rookie', name: '루키', avatarText: '루', gradient: 'linear-gradient(135deg, #0FAB78, #05AF7A)', status: 'yes' },
        { memberId: 'user_toe', name: '오늘의토우', avatarText: '오', gradient: 'linear-gradient(135deg, #76CFF6, #7994E2)', status: 'yes' }
      ]
    },
    {
      id: 'evt_ft_meal',
      groupId: 'grp_fitness_1',
      kind: 'meal',
      title: '일요일 삼겹살 먹방',
      when: atClock(7, 18, 30),
      place: '서울숲동 고기집',
      note: '운동은 반, 고기는 두 배. 4명 이상 모이면 예약할게요.',
      capacity: 8,
      createdBy: 'user_iron',
      createdByName: '아이언',
      rsvps: [
        { memberId: 'user_iron', name: '아이언', avatarText: '아', gradient: 'linear-gradient(135deg, #DFE3E9, #8098D2)', status: 'yes' },
        { memberId: 'user_hold', name: '홀드', avatarText: '홀', gradient: 'linear-gradient(135deg, #14A5CC, #10B0C8)', status: 'maybe' }
      ]
    },
    {
      id: 'evt_cl_boulder',
      groupId: 'grp_climbing_1',
      kind: 'etc',
      title: '수요일 볼더링 번개',
      when: atClock(3, 20, 0),
      place: '블록스 성수점',
      note: '초보자 환영! 암벽화 없으신 분은 빌려드려요.',
      capacity: 10,
      createdBy: 'match_junseo',
      createdByName: '준서',
      rsvps: [
        { memberId: 'match_junseo', name: '준서', avatarText: '준', gradient: 'linear-gradient(135deg, #0FB57E, #06AE7E)', status: 'yes' }
      ]
    }
  ],

  /* Sprint 15 — 모임 공지. pinned 된 공지가 상단 바에 한 줄로 고정된다. */
  groupNotices: GROUP_NOTICE_SEED
};

/* ---------------------------------------------------------------------------
 * Sprint 4.5 — 모임별 가입 정책 시드
 * ---------------------------------------------------------------------------
 * joinMode      : 'open'(자유 가입·항시 오픈) | 'approval'(소개서 심사·승인제)
 * ageLimit      : ageLimitOptions 의 id ('all'|'20s'|'2030'|'30plus')
 * joinQuestions : 승인제일 때 신청서에 묻는 질문 (1~2개, 모임장이 직접 쓴다)
 *
 * privacyType 과 joinMode 는 같은 뜻을 두 이름으로 쓴다 (기존 저장 상태 호환).
 *   open ↔ privacyType:'open'   /   approval ↔ privacyType:'approval_private'
 * ------------------------------------------------------------------------- */
const JOIN_POLICY_SEED = {
  grp_crossfit_1: {
    joinMode: 'approval', ageLimit: '2030',
    joinQuestions: [
      '취미 구력이나 참여 가능한 요일을 적어주세요!',
      '이 모임에서 함께하고 싶은 걸 한 줄로 적어주세요'
    ]
  },
  grp_fitness_1: { joinMode: 'open', ageLimit: 'all' },
  grp_climbing_1: {
    joinMode: 'approval', ageLimit: '2030',
    joinQuestions: ['클라이밍 구력과 주로 가는 지점을 적어주세요!']
  },
  grp_run_1: { joinMode: 'open', ageLimit: 'all' },
  grp_swim_1: { joinMode: 'open', ageLimit: 'all' },
  grp_game_1: { joinMode: 'open', ageLimit: 'all' },
  /* 30대 이상 · 승인제 — 26세 루키이 '나이 제한'에 막히는 사례 */
  grp_hike_1: {
    joinMode: 'approval', ageLimit: '30plus',
    joinQuestions: ['등산 경험과 선호하는 산행 시간대를 알려주세요!']
  },
  grp_boardgame_1: {
    joinMode: 'approval', ageLimit: '2030',
    joinQuestions: ['좋아하는 보드게임과 주로 하는 인원수를 적어주세요!']
  },
  /* 자유 가입이지만 나이 제한이 있는 사례 — 26세 루키은 버튼으로 들어갈 수 없다 */
  grp_movie_1: { joinMode: 'open', ageLimit: '30plus' },
  /* 20대만 · 자유 가입 — 나이 제한이 개설 직후 가입을 막는 사례 */
  grp_cafe_1: { joinMode: 'open', ageLimit: '20s' },
  /* Sprint 7 — 다른 생활권 모임 */
  grp_mapo_movie: {
    joinMode: 'approval', ageLimit: '2030',
    joinQuestions: ['요즘 본 영화 한 편과 좋아하는 감독을 적어주세요!']
  },
  grp_seongdong_run: { joinMode: 'open', ageLimit: 'all' },
  grp_jongno_board: {
    joinMode: 'approval', ageLimit: '30plus',
    joinQuestions: ['좋아하는 전략게임과 보통 모이는 인원을 적어주세요!']
  },
  grp_yongsan_climb: { joinMode: 'open', ageLimit: 'all' },
  grp_gyeonggi_run: { joinMode: 'open', ageLimit: 'all' }
};

defaultInitialState.groups.forEach((g) => {
  const seed = JOIN_POLICY_SEED[g.id] || {};
  g.joinMode = seed.joinMode || (g.privacyType === 'open' ? 'open' : 'approval');
  g.ageLimit = seed.ageLimit || 'all';
  g.joinQuestions = seed.joinQuestions
    || (g.joinMode === 'approval' ? ['취미 구력이나 선호 요일을 적어주세요!'] : []);
  /* Sprint 15 — 운영진 · 모임 내 1:1 대화 허용 여부 */
  g.deputyIds = (GROUP_DEPUTY_SEED[g.id] || []).slice();
  g.dmEnabled = GROUP_DM_SEED[g.id] === false ? false : true;
  /* v35.2 — 게시판 멤버 작성 허용(기본 꺼짐) · 모임 알림 받기(기본 켜짐). */
  if (g.memberBoardWrite !== true) g.memberBoardWrite = false;
  if (g.notifyEnabled === undefined) g.notifyEnabled = true;
  if (!Array.isArray(g.members)) g.members = [];
});

/** Sprint 17 — '후기' 말머리 판정(후기 · 리뷰 · 후기/리뷰). */
function isReviewTag(tag) {
  const t = String(tag || '').trim();
  return t === '후기' || t === '리뷰' || t === '후기/리뷰' || t.indexOf('후기') >= 0;
}

/* Sprint 25 — 이반시티 우리동네의 모든 권역에 글 한 건·사람 한 명씩 (데모 전용).
 *  실사용 계정은 buildCleanState() 가 이 내용을 모두 지운다. */
defaultInitialState.explorePosts = defaultInitialState.explorePosts.concat(regionSeedExplorePosts());
defaultInitialState.matchProfiles = defaultInitialState.matchProfiles.concat(regionSeedProfiles());

/* Sprint 7 — 시드 전체에 regionId 를 채운다(사람·모임·글). */
applyRegionIds(defaultInitialState);

/* ============================================================================
 * Sprint 17 — 회원가입(온보딩) · 클린 스타트
 * ----------------------------------------------------------------------------
 * 11/15 21:32 사용자: "회원가입 기능도 넣어주소 프로필 사진 등록하는거 닉넴까지 다 해주고
 *  이제 데이터는 초기화해줘 실사용해보게".
 *  · 실사용자는 **회원가입 화면**에서 시작한다 — 내 계정·내 모임·내 글·내 스토리·
 *    내 디엠·내 알림·내 활동이 모두 비어 있는 상태.
 *  · 앱이 백지가 되지 않도록 탐색에 구경할 **타인·공개 모임·공개 글**은 남긴다.
 *  · 테스트·미리보기는 seedDemoAccount() 로 예전 데모 계정(#demo)을 되살린다.
 * ========================================================================== */
const SIGNUP_AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #16EBA4 0%, #07CC8F 55%, #06AE7E 100%)',
  'linear-gradient(135deg, #AFE3FA 0%, #7994E2 100%)',
  'linear-gradient(135deg, #F8B74B 0%, #F3700C 100%)',
  'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)',
  'linear-gradient(135deg, #FAD1E5 0%, #EA6EA0 100%)',
  'linear-gradient(135deg, #DFE3E9 0%, #8098D2 100%)'
];
const SIGNUP_LIMITS = {
  nicknameMin: 2, nicknameMax: 12, passwordMin: 4, passwordMax: 64, ageMin: 14, ageMax: 99,
  emailMax: 120, codeLength: 6
};

/* Sprint 22 — 이메일 인증 경계.
 *  · 메일 발송은 아직 없다(정적 SPA). 코드는 **이 기기 안에서만** 만들어지고,
 *    화면의 '모의 메일함'이 같은 코드를 보여준다. 서버 인증으로 옮길 때
 *    requestEmailCode 하나만 서버 발송 API 로 바꾸면 나머지 흐름은 그대로다. */
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;   // 인증번호 유효 10분
const EMAIL_CODE_MAX_TRIES = 6;             // 확인 시도 6회

/** 이메일 형식 검사(로컬 검증 — 서버에서도 같은 규칙을 다시 확인해야 한다). */
function oogIsEmail(text) {
  const v = String(text == null ? '' : text).trim();
  if (!v || v.length > SIGNUP_LIMITS.emailMax) return false;
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v);
}

/** 6자리 인증번호 — 앞자리 0 이 나오지 않게 100000~999999. */
function oogMakeEmailCode() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

/** 가입 전의 빈 내 계정 — 닉네임·사진·나이·지역·취미가 모두 비어 있다. */
function blankCurrentUser() {
  return {
    id: 'user_me',
    nickname: '',
    handle: '@me',
    role: 'MEMBER',
    membership: 'free',
    avatarText: '',
    avatarGradient: SIGNUP_AVATAR_GRADIENTS[0],
    photoUrl: null,
    registered: false,
    location: '',
    coords: null,
    regionId: null,
    age: null,
    hobbies: [],
    hobbyIds: [],
    activity: '',
    activityIcon: '',
    workoutSpec: '',
    bio: '',
    joinedGroupIds: [],
    exploreProfileVisible: false,
    /* v34.4 (#22760·#22772) — 다녀온 모임을 타인에게 보일지 · 어떤 모임을 보일지.
       pastMeetingsPublic=false 면 숫자까지 통째로 숨기고, true 면 pastMeetingVisibility 에서
       false 로 둔 모임만 빼고 보여 준다. */
    pastMeetingsPublic: true,
    pastMeetingVisibility: {},
    /* Sprint 17 — 탐색 사람 카드 꾸미기(대표 사진·한 줄 소개) */
    exploreCard: { photoUrl: null, intro: '' },
    /* Sprint 24 — 2시간 탐색 프로필 · 공개/비밀 앨범 · 비밀앨범 공개 대상 */
    explorePublish: null,
    album: { public: [], secret: [] },
    secretShares: {}
  };
}

/**
 * 콘텐츠를 **전부 비운다** — Sprint 18의 '아예 싹 처음부터'.
 * 11/16 사용자: "게시판내 데이터도 초기로해줘 아예 싹 처음으로 지금 시뢩해".
 *  · 남기는 것은 선택지(취미 칩·지역·나이 제한·알림 종류) 같은 **도구**뿐이다.
 *  · 모임·피드·게시판 글·공지·일정·스토리·사람·쪽지·알림·가입 신청은 하나도 남기지 않는다.
 *    (예전에는 '구경용' 타인 데이터를 남겼지만, 이제는 새 계정이 진짜 빈 앱에서 시작한다.)
 * @param {object} state buildCleanState() 안에서만 쓰는 사본
 */
function stripAllContent(state) {
  state.groups = [];
  state.feedPosts = [];
  state.explorePosts = [];
  state.matchProfiles = [];
  state.partnerProfiles = [];
  state.personas = {};
  state.chatRooms = [];
  state.chatReplyPools = [];
  state.stories = [];
  state.storyArchive = [];
  state.groupNotices = [];
  state.groupEvents = [];
  state.groupChats = [];
  state.eventChats = [];
  state.groupApplications = [];
  state.notificationLog = [];
  state.matchSwipes = [];
  state.hotEntryState = {};
  state.hotRankSnapshots = {};
  state.hotEntryBaseline = null;
  /* 내 프로필·세션·마지막 위치 */
  state.currentUser = blankCurrentUser();
  state.homePrefs = { groupId: null };
  state.explorePrefs = { filter: 'all', age: 'all', region: 'all', radius: 'all', ageMin: 0, ageMax: 99 };
  return state;
}

/* ============================================================================
 * Sprint 27 — 최소 예시 데이터(샘플)
 * ----------------------------------------------------------------------------
 * 11/17 11:16 루키 님: 가이드 5/8("여기가 내 모임 자리예요")·7/8("탐색은 사람과 글을
 * 보는 곳이에요") 뒤로 **텅 빈 화면**이 비쳐서 무엇을 하는 곳인지 알 수 없다는 지적.
 *  · 가이드 중은 물론, 가입 직후 실사용 상태에서도 기능을 바로 눌러 볼 수 있게
 *    **최소한의 예시 데이터**를 채운다(내 모임 2 · 둘러볼 모임 3 · 탐색 사람 4 ·
 *    동네 글 4 · 1:1 대화 2 · 공지·일정·단체방).
 *  · 예시는 모두 `sample: true` 로 표시해 한 번에 걷어낼 수 있다
 *    (설정 › 데이터 관리 › 예시 데이터 비우기).
 *  · 사람·동네는 가상의 가명이다.
 *  · v33.3(11/22) — 예시 모임 대표 이미지 · 예시 피드 글 사진으로 **실제 사진 8장**을 쓴다.
 *    사용자가 보낸 사진을 EXIF(위치·기기) 없이 4:3 · 긴 변 960px 로 다시 저장한 것이라
 *    사진 자체에는 개인 정보가 남지 않는다(tools/prepare_example_images.py).
 *  · v33.7(11/22) — 사용자가 이어서 보낸 사진 10장을 더해 **모두 18장**.
 *    대표 이미지 5곳과 피드 글 6곳에 **한 장씩만** 쓴다(같은 사진이 두 곳에 나오지 않는다).
 *    tools/prepare_example_images_v337.py
 *  · `#demo` 시드(예전 데모 계정)와는 id 접두사(sample_)로 분리해 서로 덮지 않는다.
 * ========================================================================== */
const SAMPLE_DATA_VERSION = 6;
const SAMPLE_FALLBACK_REGION = 'seoul-seongdong-gwangjin';
/* 예시 중 **내가 가입한 모임** 두 곳 — 나머지 셋은 둘러보기용이다. */
const SAMPLE_JOINED_GROUP_IDS = ['sample_grp_run', 'sample_grp_board'];

/**
 * v33.3 · v33.7 — 예시 사진 18장(assets/examples, 4:3 960px · EXIF/ICC/XMP 없음).
 *  · 단일 HTML 번들(file://)에서는 build_bundle.py 가 이 경로들을 data URI 로 바꿔 넣는다.
 *  · 공개 사본(deploy/oog-site)에는 assets/ 가 그대로 복사된다.
 *  · 한 사진은 앱 안에서 한 곳에만 쓴다(대표 이미지·피드 글이 같은 사진으로 겹치지 않게).
 */
const EXAMPLE_PHOTOS = {
  dogsWalk: 'assets/examples/example-dogs-walk.jpg',           /* 아침 산책 · 강아지 두 마리 */
  dogFace: 'assets/examples/example-dog-face.jpg',             /* 강아지 얼굴 */
  groupCharacter: 'assets/examples/example-group-character.jpg', /* 손그림 캐릭터 */
  gameScreen: 'assets/examples/example-game-screen.jpg',       /* 게임 화면 */
  gymMirror: 'assets/examples/example-gym-mirror.jpg',         /* 운동(거울 셀카) */
  bbqGrill: 'assets/examples/example-bbq-grill.jpg',           /* 고기 굽는 자리 */
  summitView: 'assets/examples/example-summit-view.jpg',       /* 산 정상 풍경 */
  paradeDay: 'assets/examples/example-parade-day.jpg',         /* 거리 축제 */
  /* v33.7 — 사용자가 이어서 보낸 10장 */
  gymLocker: 'assets/examples/example-gym-locker.jpg',         /* 운동 — 헬스장 락커룸 */
  nightSelfie: 'assets/examples/example-night-selfie.jpg',     /* 밤 — 붉은 조명 */
  pullUp: 'assets/examples/example-pullup.jpg',                /* 크로스핏 풀업 */
  ridgeHike: 'assets/examples/example-ridge-hike.jpg',         /* 등산 — 계곡길 */
  poolLap: 'assets/examples/example-pool-lap.jpg',             /* 수영 — 야외 수영장 */
  handstand: 'assets/examples/example-handstand.jpg',          /* 물구나무 */
  seoulPattern: 'assets/examples/example-seoul-pattern.jpg',   /* 붉은 패턴 원단 */
  keyring: 'assets/examples/example-keyring.jpg',              /* 근육 근질이 키링 */
  samgyeopsal: 'assets/examples/example-samgyeopsal.jpg',      /* 삼겹살 */
  groupDinner: 'assets/examples/example-group-dinner.jpg'      /* 모임 회식 */
};

/**
 * v34.1 (#22485) — 예시 이용자 **프로필 사진** 4장(이름·이니셜만 있던 자리).
 *  · 실제 인물 사진이 아니라 **그린 그림**(지어낸 사람)이라 개인정보·가명 원칙에 걸리지 않는다.
 *  · 글 사진(우그 갤러리)과 섞이지 않도록 EXAMPLE_PHOTOS 와 따로 둔다.
 */
const EXAMPLE_AVATARS = {
  morae: 'assets/examples/avatar-morae.jpg',
  haru: 'assets/examples/avatar-haru.jpg',
  danchu: 'assets/examples/avatar-danchu.jpg',
  choko: 'assets/examples/avatar-choko.jpg'
};

/** 예시 사람 id → 프로필 사진 (시드·마이그레이션이 같은 표를 쓴다). */
const EXAMPLE_PERSON_AVATARS = {
  sample_p_mora: EXAMPLE_AVATARS.morae,
  sample_p_haru: EXAMPLE_AVATARS.haru,
  sample_p_danchu: EXAMPLE_AVATARS.danchu,
  sample_p_choko: EXAMPLE_AVATARS.choko
};

/* 예시 사진이 놓인 폴더 — 문자열을 이어 붙여 만든다(단일 HTML 번들에서 경로를 잘못 찾지 않게). */
const EXAMPLE_PHOTO_DIR = ['assets', 'examples', ''].join('/');

/** 모임 id → 예시 대표 이미지 (마이그레이션과 시드가 같은 표를 쓴다). */
const EXAMPLE_GROUP_COVERS = {
  sample_grp_run: EXAMPLE_PHOTOS.dogsWalk,
  sample_grp_board: EXAMPLE_PHOTOS.groupCharacter,
  sample_grp_climb: EXAMPLE_PHOTOS.pullUp,
  sample_grp_cafe: EXAMPLE_PHOTOS.groupDinner,
  sample_grp_hike: EXAMPLE_PHOTOS.ridgeHike
};

/** 가상의 예시 이웃 4명 — 이름·나이·동네 모두 지어낸 값이다. */
function samplePeople(regionId) {
  const area = (regionDef(regionId) || {}).name || '우리 동네';
  const rows = [
    {
      id: 'sample_p_mora', nickname: '모래', handle: '@mora.run', age: 28, hobbyIds: ['run'], hobbyLabel: '러닝',
      photoUrl: EXAMPLE_AVATARS.morae,
      hobbyStyle: '아침 러닝 · 5K', badge: '아침 러닝 3년', ratio: 'mid',
      avatarText: '모', avatarGradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)',
      bio: '출근 전에 5K만 뛰고 하루를 시작해요. 속도보다 같이 나오는 게 어려운 거더라고요.',
      hobbies: ['아침러닝', '한강', '기록'],
      specChips: [
        { icon: 'run', label: '페이스', value: '5K 27분' },
        { icon: 'clock', label: '러닝 시간', value: '화·목 07:00' },
        { icon: 'map', label: '주 코스', value: '동네 한 바퀴' }
      ],
      verified: true
    },
    {
      id: 'sample_p_haru', nickname: '하루', handle: '@haru.wod', age: 31, hobbyIds: ['fitness'], hobbyLabel: '크로스핏',
      photoUrl: EXAMPLE_AVATARS.haru,
      hobbyStyle: '퇴근 후 와드 · 3년차', badge: '와드 3년차', ratio: 'square',
      avatarText: '하', avatarGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)',
      bio: '퇴근하고 한 시간 땀 흘리면 그날 있었던 일이 다 정리돼요. 초보자 질문 환영합니다.',
      hobbies: ['크로스핏', '오운완', '스쿼트'],
      specChips: [
        { icon: 'dumbbell', label: '주 운동', value: '주 4회' },
        { icon: 'clock', label: '운동 시간', value: '평일 19시' },
        { icon: 'fire', label: '요즘 목표', value: '데드 120kg' }
      ],
      verified: false
    },
    {
      id: 'sample_p_danchu', nickname: '단추', handle: '@danchu.play', age: 26, hobbyIds: ['boardgame'], hobbyLabel: '보드게임',
      photoUrl: EXAMPLE_AVATARS.danchu,
      hobbyStyle: '전략게임 · 뉴비 환영', badge: '설명 잘해요', ratio: 'wide',
      avatarText: '단', avatarGradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)',
      bio: '주말 오후에 보드게임 카페에서 두어 판 합니다. 처음 하는 사람에게 설명하는 걸 좋아해요.',
      hobbies: ['전략게임', '파티게임', '보드게임카페'],
      specChips: [
        { icon: 'idea', label: '선호 장르', value: '전략 · 협력' },
        { icon: 'users', label: '인원', value: '3~5인' },
        { icon: 'clock', label: '모임 시간', value: '토·일 15시' }
      ],
      verified: true
    },
    {
      id: 'sample_p_choko', nickname: '초코', handle: '@choko.hike', age: 33, hobbyIds: ['hike'], hobbyLabel: '등산',
      photoUrl: EXAMPLE_AVATARS.choko,
      hobbyStyle: '주말 산행 · 천천히', badge: '하산 맛집 담당', ratio: 'square',
      avatarText: '초', avatarGradient: 'linear-gradient(135deg, #DE8E08 0%, #F3700C 100%)',
      bio: '일요일 아침에 가까운 산 하나 오르고 내려와서 국밥 한 그릇. 그게 제 주말입니다.',
      hobbies: ['주말산행', '둘레길', '하산맛집'],
      specChips: [
        { icon: 'mountain', label: '주 코스', value: '동네 뒷산' },
        { icon: 'clock', label: '산행 시간', value: '일 08:00' },
        { icon: 'meal', label: '하산 메뉴', value: '국밥' }
      ],
      verified: false
    }
  ];
  return rows.map((p) => ({
    ...p,
    sample: true,
    location: area,
    regionId,
    distanceKm: 0.6 + (rows.indexOf(p) * 0.7),
    cycle: '주 2~3회',
    cycleIcon: '',
    likesMe: false
  }));
}

/** 예시 모임 — 내가 가입한 2개(run·boardgame)와 둘러볼 3개(climb·cafe·hike). */
function sampleGroups(regionId, areaId) {
  const area = (regionDef(regionId) || {}).name || '우리 동네';
  /* H2 — 예시 모임도 가입 동네의 아지트 1~2곳에서 만난다(고정 좌표·주소 없음).
     같은 시·군·구 아지트를 먼저 쓰고, 모자라면 같은 권역의 다른 구를 쓴다. */
  const allSpots = AZIT_SPOTS.filter((s) => !s.legacy && s.areaId === regionId && s.sigunguId);
  const mineSpots = areaId ? allSpots.filter((s) => s.sigunguId === areaId) : [];
  const spots = mineSpots.length >= 3
    ? mineSpots.concat(allSpots.filter((s) => s.sigunguId !== areaId))
    : allSpots;
  const pick = (i, n = 1) => {
    const out = [];
    for (let k = 0; k < n && spots.length; k += 1) {
      const s = spots[(i + k) % spots.length];
      if (s && !out.some((x) => x.id === s.id)) out.push(s);
    }
    if (!out.length) {
      const fallback = AZIT_SPOTS.find((s) => s.id === 'azit-sillim');
      if (fallback) out.push(fallback);
    }
    return out;
  };
  const azitOf = (i, n = 1) => {
    const hs = pick(i, n);
    const first = hs[0];
    const sg = first && first.sigunguId ? geoAreaView(first.sigunguId) : null;
    return {
      hangouts: hs.map((s) => ({ id: s.id, name: s.name, kind: s.kind })),
      azitId: first ? first.id : null,
      azitName: first ? first.name : null,
      hangoutNames: hs.map((s) => s.name),
      location: first ? first.name.slice(0, 24) : area,
      regionId: first ? first.areaId : regionId,
      region: sg ? { sidoId: sg.sidoId, sidoName: sg.sidoName, sigunguId: sg.sigunguId, sigunguName: sg.name } : null
    };
  };
  /* H2 — 예시 모임도 기본 대표 이미지(점토 프리셋)를 갖는다. 사진은 사용자가 올린다. */
  const PRESETS = {
    'green-run': { id: 'green-run', icon: 'run', tone: 'green' },
    'violet-game': { id: 'violet-game', icon: 'gamepad', tone: 'violet' },
    'amber-cup': { id: 'amber-cup', icon: 'cup', tone: 'amber' },
    'sky-mountain': { id: 'sky-mountain', icon: 'mountain', tone: 'sky' },
    'neutral-star': { id: 'neutral-star', icon: 'sparkle', tone: 'neutral' }
  };
  const presetOf = (id) => PRESETS[id] || PRESETS['neutral-star'];
  /* v33.3 — 예시 모임 대표 이미지(사진이 있으면 기본 프리셋 그림보다 사진이 먼저 보인다). */
  const exampleCover = (id) => {
    const url = EXAMPLE_GROUP_COVERS[id];
    return url ? { photoUrl: url, coverCircle: url, coverImage: { circle: url, card: url } } : {};
  };
  const base = {
    location: area, regionId, sample: true, ageLimit: 'all', joinMode: 'approval',
    deputyIds: [], dmEnabled: true, deputyCanModerate: false, members: [],
    defaultGuestOpen: false, defaultRecommendOptIn: false, coverImage: null,
    /* v36.0 — 모임 설정 기본값(추천 노출 두 가지는 기본 꺼짐). */
    settings: { listedInSearch: true, memberListVisibility: 'members', defaultGuestEvents: false, defaultFeedRecommend: false },
    joinQuestions: ['이 취미는 얼마나 해보셨어요? 편한 요일도 알려주세요']
  };
  return [
    {
      ...base,
      ...azitOf(0),
      ...exampleCover('sample_grp_run'),
      id: 'sample_grp_run', name: '토요일 아침 동네 러닝팟', category: 'run', categoryName: '러닝',
      hobbyId: 'run', meetLabel: '토 08:00 · 5K', ratio: 'wide', icon: 'run',
      coverIconPreset: presetOf('green-run'),
      coverGradient: 'linear-gradient(135deg, #4676A4 0%, #0678C4 100%)',
      distanceKm: 0.5, memberCount: 8, maxMembers: 20, privacyType: 'open', privacyLabel: '자유 가입',
      description: '토요일 아침에 동네 한 바퀴 5K 가볍게 뛰고 커피 한 잔 합니다. 페이스는 각자.',
      tags: ['#아침러닝', '#5K', '#동네한바퀴'], rules: '뒤처진 사람 없이 함께 들어와요.',
      leaderId: 'sample_p_mora', leaderName: '모래', customTags: ['오운완', '기록인증', '주말번개'],
      joinPolicy: ['토 08:00 정기런'], joinMode: 'open', joinQuestions: [],
      createdAt: ago(42 * 24 * HOUR),
      members: [
        { id: 'sample_p_haru', name: '하루', role: 'staff', avatarText: '하', photoUrl: EXAMPLE_AVATARS.haru, gradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)', hobbies: ['크로스핏'], joinedAt: ago(21 * 24 * HOUR) },
        { id: 'sample_p_danchu', name: '단추', role: 'member', avatarText: '단', photoUrl: EXAMPLE_AVATARS.danchu, gradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)', hobbies: ['보드게임'], joinedAt: ago(9 * 24 * HOUR) }
      ]
    },
    {
      ...base,
      ...azitOf(1, 2),
      ...exampleCover('sample_grp_board'),
      coverIconPreset: presetOf('violet-game'),
      id: 'sample_grp_board', name: '동네 보드게임 한 판', category: 'boardgame', categoryName: '보드게임',
      hobbyId: 'boardgame', meetLabel: '토·일 15:00', ratio: 'square', icon: 'dice',
      coverGradient: 'linear-gradient(135deg, #856A00 0%, #866C02 100%)',
      distanceKm: 0.9, memberCount: 6, maxMembers: 12, privacyType: 'approval_private',
      privacyLabel: '비공개 승인제',
      description: '주말 오후 동네 보드게임 카페에서 2~3판. 뉴비도 설명 들으면서 바로 끼어요.',
      tags: ['#보드게임', '#주말', '#뉴비환영'], rules: '이긴 사람이 다음 판 설명을 맡아요.',
      leaderId: 'sample_p_danchu', leaderName: '단추', customTags: ['게임후기', '신작소개'],
      joinPolicy: ['토·일 15:00'],
      createdAt: ago(60 * 24 * HOUR),
      members: [
        { id: 'sample_p_choko', name: '초코', avatarText: '초', photoUrl: EXAMPLE_AVATARS.choko, gradient: 'linear-gradient(135deg, #DE8E08 0%, #F3700C 100%)', hobbies: ['등산'], joinedAt: ago(30 * 24 * HOUR) }
      ]
    },
    {
      ...base,
      ...azitOf(2),
      ...exampleCover('sample_grp_climb'),
      coverIconPreset: presetOf('neutral-star'),
      id: 'sample_grp_climb', name: '퇴근 후 볼더링 같이', category: 'climb', categoryName: '클라이밍',
      hobbyId: 'climb', meetLabel: '평일 20:00', ratio: 'wide', icon: 'climb',
      coverGradient: 'linear-gradient(135deg, #0E814A 0%, #118134 100%)',
      distanceKm: 1.4, memberCount: 11, maxMembers: 20, privacyType: 'approval_private',
      privacyLabel: '비공개 승인제',
      description: '평일 저녁에 동네 클라이밍장에서 만나요. 초보자는 루트 읽기부터 같이 합니다.',
      tags: ['#볼더링', '#평일저녁', '#초보환영'], rules: '안전 매트 위에서만, 부상 방지 우선.',
      leaderId: 'sample_p_haru', leaderName: '하루', customTags: ['완등인증', '루트공유'],
      joinPolicy: ['평일 20:00'], createdAt: ago(18 * 24 * HOUR)
    },
    {
      ...base,
      ...azitOf(4),
      ...exampleCover('sample_grp_cafe'),
      coverIconPreset: presetOf('amber-cup'),
      id: 'sample_grp_cafe', name: '주말 카페 한 곳씩', category: 'cafe', categoryName: '카페/맛집',
      hobbyId: 'cafe', meetLabel: '일 11:00', ratio: 'square', icon: 'cup',
      coverGradient: 'linear-gradient(135deg, #856A00 0%, #866C02 100%)',
      distanceKm: 2.2, memberCount: 9, maxMembers: 15, privacyType: 'open', privacyLabel: '자유 가입',
      description: '일요일 낮에 동네 카페 한 곳을 골라 가서 한 시간 이야기해요. 조용한 곳 위주.',
      tags: ['#카페투어', '#일요일', '#조용한곳'], rules: '조용한 카페 매너 지키기.',
      leaderId: 'sample_p_choko', leaderName: '초코', customTags: ['카페후기', '원두추천'],
      joinPolicy: ['일 11:00'], joinMode: 'open', joinQuestions: [],
      createdAt: ago(12 * 24 * HOUR)
    },
    {
      ...base,
      ...azitOf(3, 2),
      ...exampleCover('sample_grp_hike'),
      coverIconPreset: presetOf('sky-mountain'),
      id: 'sample_grp_hike', name: '일요 아침 가까운 산', category: 'hike', categoryName: '등산·트레킹',
      hobbyId: 'hike', meetLabel: '일 08:00', ratio: 'square', icon: 'mountain',
      coverGradient: 'linear-gradient(135deg, #118134 0%, #0B8636 100%)',
      distanceKm: 3.1, memberCount: 13, maxMembers: 25, privacyType: 'approval_private',
      privacyLabel: '비공개 승인제',
      description: '일요일 아침 가까운 산 하나 오르고 내려와 국밥 한 그릇. 무리하지 않는 코스로 다녀요.',
      tags: ['#주말산행', '#둘레길', '#하산맛집'], rules: '페이스는 느린 사람에 맞춰요.',
      leaderId: 'sample_p_choko', leaderName: '초코', customTags: ['정상인증', '코스공유'],
      joinPolicy: ['일 08:00'], createdAt: ago(25 * 24 * HOUR)
    }
  ];
}

/** 예시 피드 글 — 내 모임 두 곳 + 둘러보기 모임 셋에 고루. 글마다 사진 1장(같은 사진 재사용 없음). */
function sampleFeedPosts() {
  return [
    {
      id: 'sample_post_run_1', groupId: 'sample_grp_run', authorId: 'sample_p_mora',
      authorName: '모래', authorAvatarText: '모', authorGradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)',
      tag: '오운완', caption: '오늘 아침 5K 완주. 어제보다 20초 빨랐습니다. 같이 나온 강아지도 신나서 앞장섰네요. 다음 주 토요일도 같은 시간에 출발해요.',
      photoUrl: EXAMPLE_PHOTOS.dogFace, mediaCaption: '같이 뛴 강아지',
      likes: 6, likedByMe: false, bookmarkedByMe: false,
      comments: [
        { id: 'sample_c_run_1', authorId: 'sample_p_danchu', authorName: '단추', text: '이번 주는 저도 나가볼게요', createdAt: ago(3 * HOUR) }
      ],
      recommendOptIn: true,
      sample: true, createdAt: ago(5 * HOUR)
    },
    {
      id: 'sample_post_run_2', groupId: 'sample_grp_run', authorId: 'sample_p_haru',
      authorName: '하루', authorAvatarText: '하', authorGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)',
      tag: '후기', caption: '러닝 끝나고 다 같이 커피 마셨는데 그 10분이 제일 좋네요. 다음엔 코스 좀 길게 가요.',
      mediaCaption: '', likes: 4, likedByMe: false, bookmarkedByMe: false, comments: [],
      sample: true, createdAt: ago(28 * HOUR)
    },
    {
      id: 'sample_post_board_1', groupId: 'sample_grp_board', authorId: 'sample_p_danchu',
      authorName: '단추', authorAvatarText: '단', authorGradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)',
      tag: '게임후기', caption: '오늘 3인 전략게임 한 판. 처음 하신 분이 마지막에 1등 했습니다. 설명이 통했네요.',
      photoUrl: EXAMPLE_PHOTOS.gameScreen, mediaCaption: '마지막 판',
      likes: 5, likedByMe: false, bookmarkedByMe: false,
      comments: [
        { id: 'sample_c_board_1', authorId: 'sample_p_choko', authorName: '초코', text: '다음엔 저도 끼워주세요', createdAt: ago(20 * HOUR) }
      ],
      recommendOptIn: true,
      sample: true, createdAt: ago(26 * HOUR)
    },
    /* v33.7 — 사진 10장을 한 곳씩. 모임 공간 피드(모임별)와 홈 추천 피드가 서로 다른 사진으로 찬다. */
    {
      id: 'sample_post_run_3', groupId: 'sample_grp_run', authorId: 'sample_p_mora',
      authorName: '모래', authorAvatarText: '모', authorGradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)',
      tag: '오운완', caption: '밤 9시에 동네 한 바퀴 #야간러닝 #오운완. 가로등 불빛 때문에 사진이 다 붉게 나왔네요. 다음 주는 코스를 조금 늘려볼게요.',
      photoUrl: EXAMPLE_PHOTOS.nightSelfie, mediaCaption: '밤 러닝',
      likes: 5, likedByMe: false, bookmarkedByMe: false,
      comments: [
        { id: 'sample_c_run_3', authorId: 'sample_p_danchu', authorName: '단추', text: '밤에 뛰면 한결 시원하죠', createdAt: ago(2 * HOUR) }
      ],
      recommendOptIn: true,
      sample: true, createdAt: ago(20 * HOUR)
    },
    {
      id: 'sample_post_run_4', groupId: 'sample_grp_run', authorId: 'sample_p_haru',
      authorName: '하루', authorAvatarText: '하', authorGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)',
      tag: '회복', caption: '오늘은 러닝 대신 수영 #회복수영. 무릎이 한결 편해졌어요. 다들 회복도 운동이에요.',
      photoUrl: EXAMPLE_PHOTOS.poolLap, mediaCaption: '회복 수영',
      likes: 3, likedByMe: false, bookmarkedByMe: false, comments: [],
      recommendOptIn: true,
      sample: true, createdAt: ago(2 * 24 * HOUR)
    },
    {
      id: 'sample_post_run_5', groupId: 'sample_grp_run', authorId: 'sample_p_mora',
      authorName: '모래', authorAvatarText: '모', authorGradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)',
      tag: '장비', caption: '새로 산 레깅스 #야간러닝. 밤에 뛰어도 잘 보여요.',
      photoUrl: EXAMPLE_PHOTOS.seoulPattern, mediaCaption: '새 레깅스',
      likes: 4, likedByMe: false, bookmarkedByMe: false, comments: [],
      recommendOptIn: false,
      sample: true, createdAt: ago(3 * 24 * HOUR)
    },
    {
      id: 'sample_post_board_2', groupId: 'sample_grp_board', authorId: 'sample_p_danchu',
      authorName: '단추', authorAvatarText: '단', authorGradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)',
      tag: '굿즈', caption: '게임방 앞 뽑기에서 건진 근육 근질이 #굿즈. 오늘의 승리 요정입니다.',
      photoUrl: EXAMPLE_PHOTOS.keyring, mediaCaption: '오늘의 승리 요정',
      likes: 7, likedByMe: false, bookmarkedByMe: false,
      comments: [
        { id: 'sample_c_board_2', authorId: 'sample_p_choko', authorName: '초코', text: '이건 좀 갖고 싶네요', createdAt: ago(4 * HOUR) }
      ],
      recommendOptIn: true,
      sample: true, createdAt: ago(8 * HOUR)
    },
    {
      id: 'sample_post_climb_1', groupId: 'sample_grp_climb', authorId: 'sample_p_haru',
      authorName: '하루', authorAvatarText: '하', authorGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)',
      tag: '오운완', caption: '물구나무 30초 붙었어요 #물구나무. 와드 끝나고 코어 운동.',
      photoUrl: EXAMPLE_PHOTOS.handstand, mediaCaption: '물구나무 30초',
      likes: 6, likedByMe: false, bookmarkedByMe: false, comments: [],
      recommendOptIn: true,
      sample: true, createdAt: ago(14 * HOUR)
    },
    {
      id: 'sample_post_climb_2', groupId: 'sample_grp_climb', authorId: 'sample_p_haru',
      authorName: '하루', authorAvatarText: '하', authorGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)',
      tag: '후기', caption: '클라이밍장 락커룸에서 한 컷. 오늘은 완등 두 개. 같이 오실 분은 평일 저녁에 모여요.',
      photoUrl: EXAMPLE_PHOTOS.gymLocker, mediaCaption: '오늘의 락커룸',
      likes: 4, likedByMe: false, bookmarkedByMe: false, comments: [],
      recommendOptIn: false,
      sample: true, createdAt: ago(4 * 24 * HOUR)
    },
    {
      id: 'sample_post_cafe_1', groupId: 'sample_grp_cafe', authorId: 'sample_p_choko',
      authorName: '초코', authorAvatarText: '초', authorGradient: 'linear-gradient(135deg, #DE8E08 0%, #F3700C 100%)',
      tag: '맛집', caption: '오늘은 카페 대신 고기 #회식. 모임 회식으로 마무리했습니다.',
      photoUrl: EXAMPLE_PHOTOS.samgyeopsal, mediaCaption: '오늘의 고기',
      likes: 5, likedByMe: false, bookmarkedByMe: false,
      comments: [
        { id: 'sample_c_cafe_1', authorId: 'sample_p_mora', authorName: '모래', text: '다음엔 저도 불러주세요', createdAt: ago(6 * HOUR) }
      ],
      recommendOptIn: true,
      sample: true, createdAt: ago(30 * HOUR)
    }
  ];
}

/**
 * Sprint 32.5 — 예전에 넣어 둔 예시 데이터(v1)를 지금 모양으로 손본다.
 *  · 예시 모임에 아지트 · 예시 일정에 '게스트 참여 가능' · 예시 글에 '추천 피드 공개'.
 *  · 새로 넣지 않고 **있던 것만 고친다**(사용자가 지운 것을 되살리지 않는다).
 */
function upgradeSampleData(state) {
  if (!state) return state;
  const regionId = (state.sampleData && state.sampleData.regionId)
    || (state.currentUser && state.currentUser.regionId) || SAMPLE_FALLBACK_REGION;
  const spots = AZIT_SPOTS.filter((s) => !s.legacy && s.areaId === regionId && s.sigunguId);
  let i = 0;
  (state.groups || []).filter((g) => g && g.sample === true).forEach((g) => {
    /* H2 — 예전 예시 모임에 아지트 1~3곳 · 지역 · 기본값을 채운다(있던 것은 그대로). */
    if (!Array.isArray(g.hangouts) || !g.hangouts.length) {
      const keep = g.azitId ? azitDef(g.azitId) : null;
      const list = keep && !keep.legacy ? [keep]
        : (spots.length ? [spots[i % spots.length]] : [azitDef('azit-seongsu')]);
      g.hangouts = list.filter(Boolean).map((s) => ({ id: s.id, name: s.name, kind: s.kind }));
      const first = g.hangouts[0];
      if (first) {
        g.azitId = first.id;
        g.azitName = first.name;
        if (!g.location) g.location = first.name.slice(0, 24);
      }
      i += 1;
    }
    if (!g.region && g.hangouts && g.hangouts[0]) {
      const spot = azitDef(g.hangouts[0].id);
      const sg = spot && spot.sigunguId ? geoAreaView(spot.sigunguId) : null;
      if (sg) g.region = { sidoId: sg.sidoId, sidoName: sg.sidoName, sigunguId: sg.sigunguId, sigunguName: sg.name };
    }
    if (g.defaultGuestOpen == null) g.defaultGuestOpen = false;
    if (g.defaultRecommendOptIn == null) g.defaultRecommendOptIn = false;
    if (g.regionId == null && g.azitId) {
      const spot = azitDef(g.azitId);
      if (spot) g.regionId = spot.areaId;
    }
  });
  (state.feedPosts || []).filter((p) => p && p.sample === true).forEach((p, idx) => {
    if (p.recommendOptIn == null) p.recommendOptIn = idx < 2;
  });
  (state.groupEvents || []).filter((e) => e && e.sample === true).forEach((e) => {
    if (e.guestOpen == null) e.guestOpen = true;
  });
  /* 게스트 일정을 한 곳 더 — 모임 밖 모임에서도 추천 일정이 보이게. */
  const hasHike = (state.groupEvents || []).some((e) => e && e.id === 'sample_evt_hike');
  const hasHikeGroup = (state.groups || []).some((g) => g && g.id === 'sample_grp_hike');
  if (!hasHike && hasHikeGroup) {
    state.groupEvents = (state.groupEvents || []).concat(sampleGroupEvents().filter((e) => e.id === 'sample_evt_hike'));
  }
  /* v34.4 — 예시 사람들의 '다녀온 모임' 기록(지난 일정)을 한 번 채운다. */
  const hasPastRecords = (state.groupEvents || []).some((e) => e && e.id === 'sample_evt_run_past');
  const sampleGroupIds = new Set((state.groups || []).filter((g) => g && g.sample === true).map((g) => g.id));
  if (!hasPastRecords && sampleGroupIds.size) {
    state.groupEvents = (state.groupEvents || []).concat(
      samplePastGroupEvents().filter((e) => sampleGroupIds.has(e.groupId))
    );
  }
  /* 지난 일정은 게스트 참여 대상이 아니다(추천 일정·게스트 신청에 오르지 않는다). */
  (state.groupEvents || []).forEach((e) => {
    if (e && /^sample_evt_.*_past$/.test(e.id)) e.guestOpen = false;
  });
  return state;
}

/**
 * v34.1 (#22485) — 예전에 저장된 예시 이용자에게 **프로필 사진**을 붙인다.
 *  · 이름·이니셜만 있던 자리가 불편하다는 지시로 예시 사람 4명(모래·하루·단추·초코)에
 *    그린 그림 아바타(avatar-*.jpg 예시 그림)를 연결한다.
 *  · 내가 넣은 사진(photoUrl 이 이미 있는 사람)은 건드리지 않는다.
 */
function upgradeSampleAvatars(state) {
  if (!state) return state;
  const fill = (person) => {
    if (!person || person.photoUrl) return;
    const url = EXAMPLE_PERSON_AVATARS[person.id];
    if (url) person.photoUrl = url;
  };
  (state.matchProfiles || []).forEach(fill);
  (state.partnerProfiles || []).forEach(fill);
  (state.groups || []).forEach((g) => {
    if (!g) return;
    (g.members || []).forEach((m) => fill(m));
  });
  (state.feedPosts || []).forEach((p) => {
    if (p && !p.authorPhotoUrl) {
      const url = EXAMPLE_PERSON_AVATARS[p.authorId];
      if (url) p.authorPhotoUrl = url;
    }
  });
  return state;
}

/**
 * v33.3 — 예전에 저장된 예시 데이터(v2)에 **예시 사진 8장**을 붙인다.
 *  · 이미 사진이 있는 모임·글은 건드리지 않는다(내가 올린 사진을 덮지 않는다).
 *  · 예시 글 sample_ex_3 은 사진에 맞춰 '거리 축제 · 사진' 글로 바뀌었다(예시 글이라 함께 맞춘다).
 */
function upgradeSampleImages(state) {
  if (!state) return state;
  (state.groups || []).forEach((g) => {
    if (!g || g.sample !== true) return;
    const url = EXAMPLE_GROUP_COVERS[g.id];
    if (!url) return;
    /* v33.7 — 예시 사진 경로면 새 세트로 갈아 끼운다. 내가 올린 사진(data:/http)은 그대로 둔다. */
    const isExamplePath = (u) => typeof u === 'string' && u.indexOf(EXAMPLE_PHOTO_DIR) === 0;
    if (!g.photoUrl || isExamplePath(g.photoUrl)) g.photoUrl = url;
    if (!g.coverCircle || isExamplePath(g.coverCircle)) g.coverCircle = url;
    if (!g.coverImage || (!g.coverImage.card && !g.coverImage.circle)
      || isExamplePath(g.coverImage.card) || isExamplePath(g.coverImage.circle)) {
      g.coverImage = { circle: url, card: url };
    }
  });
  const postFix = {
    sample_post_run_1: {
      photoUrl: EXAMPLE_PHOTOS.dogFace, mediaCaption: '같이 뛴 강아지',
      caption: '오늘 아침 5K 완주. 어제보다 20초 빨랐습니다. 같이 나온 강아지도 신나서 앞장섰네요. 다음 주 토요일도 같은 시간에 출발해요.'
    },
    sample_post_board_1: { photoUrl: EXAMPLE_PHOTOS.gameScreen, mediaCaption: '마지막 판' }
  };
  (state.feedPosts || []).forEach((p) => {
    if (!p || p.sample !== true) return;
    const fix = postFix[p.id];
    if (!fix) return;
    if (!p.photoUrl) {
      p.photoUrl = fix.photoUrl;
      p.mediaCaption = p.mediaCaption || fix.mediaCaption;
    }
    if (fix.caption) p.caption = fix.caption;
  });
  /* v33.7 — v33.3 예시 데이터에 없던 새 예시 글을 더한다(지운 글은 되살리지 않는다: 없는 id만).
     사진이 비어 있는 예시 글은 원래 사진을 되돌린다(내가 다른 사진을 넣었으면 건드리지 않는다). */
  if (state.sampleData && state.sampleData.seeded === true && !state.sampleData.clearedAt) {
    const has = new Set((state.feedPosts || []).map((p) => p && p.id));
    const templates = sampleFeedPosts();
    const missing = templates.filter((p) => !has.has(p.id));
    if (missing.length) state.feedPosts = (state.feedPosts || []).concat(missing);
    const byId = new Map(templates.map((p) => [p.id, p]));
    (state.feedPosts || []).forEach((p) => {
      if (!p || p.sample !== true || p.photoUrl) return;
      const t = byId.get(p.id);
      if (!t || !t.photoUrl) return;
      p.photoUrl = t.photoUrl;
      p.mediaCaption = p.mediaCaption || t.mediaCaption;
    });
  }
  (state.explorePosts || []).forEach((p) => {
    if (!p || p.sample !== true || p.id !== 'sample_ex_3' || p.photoUrl) return;
    p.photoUrl = EXAMPLE_PHOTOS.paradeDay;
    p.mediaCaption = p.mediaCaption || '주말 거리 풍경';
    p.hobbyId = 'photo';
    p.hobbyLabel = '사진';
    p.caption = '주말 거리 축제 사진 찍으러 같이 가실 분. 사람 많은 시간은 피해 낮에 천천히 돌아요.';
    p.groupName = `${p.location || '우리 동네'} 사진`;
  });
  return state;
}

/**
 * H2 — 예전에 저장된 모임(아지트·지역·기본값 없음)을 지금 모양으로 손본다.
 *  · 활동 지역 글에 아지트 이름이 있으면 그 아지트로 잇는다(주소를 새로 받지 않는다).
 *  · 이름을 못 찾으면 건드리지 않는다 — 엉뚱한 곳으로 옮기지 않기 위해서.
 */
function upgradeGroupGeo(state) {
  if (!state) return state;
  (state.groups || []).forEach((g) => {
    if (!g) return;
    if (!Array.isArray(g.hangouts) || !g.hangouts.length) {
      const hit = azitFromText(g.location);
      if (hit) {
        g.hangouts = [{ id: hit.id, name: hit.name, kind: hit.kind }];
        g.azitId = g.azitId || hit.id;
        g.azitName = g.azitName || hit.name;
        g.regionId = g.regionId || hit.areaId;
      }
    }
    if (!g.region && g.hangouts && g.hangouts[0]) {
      const spot = azitDef(g.hangouts[0].id);
      const sg = spot && spot.sigunguId ? geoAreaView(spot.sigunguId) : null;
      if (sg) {
        g.region = { sidoId: sg.sidoId, sidoName: sg.sidoName, sigunguId: sg.sigunguId, sigunguName: sg.name };
      }
    }
    if (g.defaultGuestOpen == null) g.defaultGuestOpen = false;
    if (g.defaultRecommendOptIn == null) g.defaultRecommendOptIn = false;
  });
  return state;
}

function sampleGroupNotices() {
  return [
    {
      id: 'sample_notice_run', groupId: 'sample_grp_run', text: '이번 주 토요일 08:00 동네 공원 입구에서 출발해요. 늦으시면 단체방에 남겨주세요.',
      pinned: true, authorId: 'sample_p_mora', authorName: '모래', authorRole: 'leader',
      readers: [{ memberId: 'sample_p_haru', name: '하루', avatarText: '하', at: ago(2 * HOUR) }],
      sample: true, at: ago(9 * HOUR)
    },
    {
      id: 'sample_notice_board', groupId: 'sample_grp_board', text: '이번 주말은 토요일 15시로 잡았습니다. 처음 오시는 분은 편한 복장으로 오세요.',
      pinned: true, authorId: 'sample_p_danchu', authorName: '단추', authorRole: 'leader',
      readers: [], sample: true, at: ago(2 * 24 * HOUR)
    }
  ];
}

/* v34.4 (#22762) — 예시 사람들의 '다녀온 모임' 기록.
 * 타인 프로필에서 다녀온 모임 숫자를 눌렀을 때 빈 화면만 나오지 않도록,
 * 예시 모임마다 지난 일정 1건과 그 자리에 참석한 예시 사람들을 둔다(모두 sample). */
function samplePastGroupEvents() {
  return [
    {
      id: 'sample_evt_run_past', groupId: 'sample_grp_run', kind: 'workout', title: '지난주 토요일 5K',
      when: ago(12 * 24 * HOUR), place: '', note: '같이 뛰고 커피 한 잔. 다음 주에도 같은 시간에 만나요.',
      capacity: 10, createdBy: 'sample_p_mora', createdByName: '모래',
      rsvps: [
        { memberId: 'sample_p_mora', name: '모래', avatarText: '모', gradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)', status: 'yes' },
        { memberId: 'sample_p_haru', name: '하루', avatarText: '하', gradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)', status: 'yes' },
        { memberId: 'sample_p_danchu', name: '단추', avatarText: '단', gradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)', status: 'yes' }
      ],
      guestOpen: false, sample: true, createdAt: ago(18 * 24 * HOUR)
    },
    {
      id: 'sample_evt_board_past', groupId: 'sample_grp_board', kind: 'etc', title: '보드게임 정기전',
      when: ago(19 * 24 * HOUR), place: '', note: '신작 두 개 돌려 보고, 다음 모임 날짜를 정했어요.',
      capacity: 8, createdBy: 'sample_p_danchu', createdByName: '단추',
      rsvps: [
        { memberId: 'sample_p_danchu', name: '단추', avatarText: '단', gradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)', status: 'yes' },
        { memberId: 'sample_p_choko', name: '초코', avatarText: '초', gradient: 'linear-gradient(135deg, #DE8E08 0%, #F3700C 100%)', status: 'yes' }
      ],
      guestOpen: false, sample: true, createdAt: ago(25 * 24 * HOUR)
    },
    {
      id: 'sample_evt_climb_past', groupId: 'sample_grp_climb', kind: 'workout', title: '평일 저녁 볼더링',
      when: ago(6 * 24 * HOUR), place: '', note: '초보 루트부터 차근차근. 끝나고 다 같이 스트레칭했어요.',
      capacity: 10, createdBy: 'sample_p_haru', createdByName: '하루',
      rsvps: [
        { memberId: 'sample_p_haru', name: '하루', avatarText: '하', gradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)', status: 'yes' },
        { memberId: 'sample_p_mora', name: '모래', avatarText: '모', gradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)', status: 'yes' }
      ],
      guestOpen: false, sample: true, createdAt: ago(11 * 24 * HOUR)
    },
    {
      id: 'sample_evt_cafe_past', groupId: 'sample_grp_cafe', kind: 'meal', title: '주말 카페 한 곳',
      when: ago(9 * 24 * HOUR), place: '', note: '조용한 카페에서 한 시간 수다. 다음엔 원두 사러 같이 가요.',
      capacity: 6, createdBy: 'sample_p_choko', createdByName: '초코',
      rsvps: [
        { memberId: 'sample_p_choko', name: '초코', avatarText: '초', gradient: 'linear-gradient(135deg, #DE8E08 0%, #F3700C 100%)', status: 'yes' },
        { memberId: 'sample_p_danchu', name: '단추', avatarText: '단', gradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)', status: 'yes' }
      ],
      guestOpen: false, sample: true, createdAt: ago(14 * 24 * HOUR)
    }
  ];
}

function sampleGroupEvents() {
  return samplePastGroupEvents().concat([
    {
      id: 'sample_evt_run', groupId: 'sample_grp_run', kind: 'workout', title: '토요일 아침 5K',
      when: atClock(3, 8, 0), place: '동네 공원 입구', note: '가볍게 5K. 끝나고 근처에서 커피 한 잔 해요.',
      capacity: 10, createdBy: 'sample_p_mora', createdByName: '모래',
      rsvps: [
        { memberId: 'sample_p_mora', name: '모래', avatarText: '모', gradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)', status: 'yes' },
        { memberId: 'sample_p_haru', name: '하루', avatarText: '하', gradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)', status: 'yes' }
      ],
      guestOpen: true,
      sample: true, createdAt: ago(30 * HOUR)
    },
    {
      id: 'sample_evt_board', groupId: 'sample_grp_board', kind: 'etc', title: '주말 보드게임 한 판',
      when: atClock(4, 15, 0), place: '동네 보드게임 카페', note: '2~3판 예정. 처음 오셔도 설명 들으면서 바로 하실 수 있어요.',
      capacity: 6, createdBy: 'sample_p_danchu', createdByName: '단추',
      rsvps: [
        { memberId: 'sample_p_danchu', name: '단추', avatarText: '단', gradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)', status: 'yes' },
        { memberId: 'sample_p_choko', name: '초코', avatarText: '초', gradient: 'linear-gradient(135deg, #DE8E08 0%, #F3700C 100%)', status: 'maybe' }
      ],
      guestOpen: true,
      sample: true, createdAt: ago(2 * 24 * HOUR)
    },
    {
      id: 'sample_evt_hike', groupId: 'sample_grp_hike', kind: 'etc', title: '일요 아침 가벼운 등산',
      when: atClock(6, 8, 30), place: '동네 뒷산 입구', note: '1시간 반 코스로 천천히 올라요. 처음 오셔도 괜찮습니다.',
      capacity: 8, createdBy: 'sample_p_choko', createdByName: '초코',
      rsvps: [
        { memberId: 'sample_p_choko', name: '초코', avatarText: '초', gradient: 'linear-gradient(135deg, #DE8E08 0%, #F3700C 100%)', status: 'yes' }
      ],
      guestOpen: true,
      sample: true, createdAt: ago(20 * HOUR)
    }
  ]);
}

function sampleGroupChats() {
  return [
    {
      groupId: 'sample_grp_run', sample: true,
      messages: [
        { id: 'sample_gc_run_1', from: 'member', authorId: 'sample_p_mora', authorName: '모래', authorAvatarText: '모', authorGradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)', text: '토요일 08시 공원 입구요. 날씨 괜찮대요', at: ago(3 * HOUR) },
        { id: 'sample_gc_run_2', from: 'member', authorId: 'sample_p_haru', authorName: '하루', authorAvatarText: '하', authorGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)', text: '저는 5분 일찍 나가서 스트레칭하고 있을게요', at: ago(2 * HOUR) }
      ]
    },
    {
      groupId: 'sample_grp_board', sample: true,
      messages: [
        { id: 'sample_gc_board_1', from: 'member', authorId: 'sample_p_danchu', authorName: '단추', authorAvatarText: '단', authorGradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)', text: '토요일 15시, 카페 자리 미리 잡아둘게요', at: ago(20 * HOUR) }
      ]
    }
  ];
}

/**
 * v36.1 — 예시 일정 단톡방 2곳.
 *  일정을 만들면 방이 자동으로 생기고 참석자가 들어온다는 규칙을 첫 화면에서 눌러 볼 수 있게 한다.
 */
function sampleEventChats() {
  return [
    {
      eventId: 'sample_evt_run', groupId: 'sample_grp_run', sample: true,
      messages: [
        { id: 'sample_ec_run_1', from: 'member', authorId: 'sample_p_mora', authorName: '모래', authorAvatarText: '모', authorGradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)', text: '이번 주 5K는 공원 입구에서 8시에 출발해요. 늦어도 같이 출발해요!', at: ago(5 * HOUR) },
        { id: 'sample_ec_run_2', from: 'member', authorId: 'sample_p_haru', authorName: '하루', authorAvatarText: '하', authorGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)', text: '끝나고 커피는 제가 살게요', at: ago(4 * HOUR) }
      ]
    },
    {
      eventId: 'sample_evt_board', groupId: 'sample_grp_board', sample: true,
      messages: [
        { id: 'sample_ec_board_1', from: 'member', authorId: 'sample_p_danchu', authorName: '단추', authorAvatarText: '단', authorGradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)', text: '초보 게임 2개 먼저 하고, 익숙해지면 긴 게임 한 판 해요', at: ago(18 * HOUR) }
      ]
    }
  ];
}

/** 동네 글 4개 — 지역 게시판의 필터·좋아요·댓글·글쓰기를 바로 시험할 수 있게. */
function sampleExplorePosts(regionId) {
  const area = (regionDef(regionId) || {}).name || '우리 동네';
  const style = (id) => {
    const s = EXPLORE_MEET_STYLES.find((x) => x.id === id) || EXPLORE_MEET_STYLES[0];
    return { meetStyle: s.id, meetStyleLabel: s.name };
  };
  const rows = [
    {
      id: 'sample_ex_1', authorId: 'sample_p_mora', authorName: '모래', authorAvatarText: '모',
      authorGradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)', hobbyId: 'run', hobbyLabel: '러닝',
      ...style('now'), tag: '번개',
      caption: '지금 동네 공원 한 바퀴 가볍게 뛰실 분? 30분이면 끝나요.',
      likes: 7, comments: [{ id: 'sample_ex_c1', authorId: 'sample_p_haru', authorName: '하루', text: '지금 나갈 수 있어요!', createdAt: ago(20 * MINUTE) }],
      createdAt: ago(40 * MINUTE)
    },
    {
      id: 'sample_ex_2', authorId: 'sample_p_haru', authorName: '하루', authorAvatarText: '하',
      authorGradient: 'linear-gradient(135deg, #0FB57E 0%, #06AE7E 100%)', hobbyId: 'fitness', hobbyLabel: '크로스핏',
      ...style('comfortable'), tag: '편한만남',
      caption: '퇴근하고 같이 운동하실 분 있나요. 저는 초보라 무게보다 자세 위주로 해요.',
      likes: 5, comments: [], createdAt: ago(4 * HOUR)
    },
    {
      /* v33.3 — 거리 축제 사진(예시 사진 8장 중 하나)을 쓴 동네 글. 1:1 디엠 답장 유도 샘플은 그대로. */
      id: 'sample_ex_3', authorId: 'sample_p_danchu', authorName: '단추', authorAvatarText: '단',
      authorGradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)', hobbyId: 'photo', hobbyLabel: '사진',
      ...style('dm'), tag: '1:1',
      caption: '주말 거리 축제 사진 찍으러 같이 가실 분. 사람 많은 시간은 피해 낮에 천천히 돌아요.',
      photoUrl: EXAMPLE_PHOTOS.paradeDay, mediaCaption: '주말 거리 풍경',
      likes: 3, comments: [], createdAt: ago(9 * HOUR)
    },
    {
      id: 'sample_ex_4', authorId: 'sample_p_choko', authorName: '초코', authorAvatarText: '초',
      authorGradient: 'linear-gradient(135deg, #DE8E08 0%, #F3700C 100%)', hobbyId: 'hike', hobbyLabel: '등산',
      ...style('drink'), tag: '한잔',
      caption: '일요일 산행 끝나고 국밥 드실 분. 코스는 짧게 잡아요.',
      likes: 4, comments: [], createdAt: ago(22 * HOUR)
    }
  ];
  return rows.map((row, i) => ({
    ...row, sample: true, regionId, location: area, groupName: `${area} ${row.hobbyLabel}`,
    mediaCaption: row.mediaCaption || '', photoUrl: row.photoUrl || null, ratio: ['wide', 'square'][i % 2], likedByMe: false,
    comments: (row.comments || []).map((c) => ({ ...c, createdAt: c.createdAt }))
  }));
}

/** 1:1 대화 2개 — 메시지 보내기·비밀앨범 공개/해제를 바로 시험할 수 있게. */
function sampleChatRooms() {
  return [
    {
      id: 'sample_chat_mora', partnerId: 'sample_p_mora', partnerName: '모래', partnerHobby: '러닝',
      partnerAvatarText: '모', partnerGradient: 'linear-gradient(135deg, #20B0F1 0%, #05A1F6 100%)',
      lastMessage: '토요일 아침 같이 뛰어요!', lastTime: '오늘', unreadCount: 1, isNewMatch: false, sample: true,
      messages: [
        { id: 'sample_m_mora_1', from: 'them', text: '같은 동네라 반가워요. 토요일 아침 러닝 같이 하실래요?', at: ago(3 * HOUR + 20 * MINUTE) },
        { id: 'sample_m_mora_2', from: 'me', text: '좋아요. 08시 공원 입구 맞죠?', at: ago(2 * HOUR) },
        { id: 'sample_m_mora_3', from: 'them', text: '네! 토요일 아침 같이 뛰어요!', at: ago(95 * MINUTE) }
      ]
    },
    {
      id: 'sample_chat_danchu', partnerId: 'sample_p_danchu', partnerName: '단추', partnerHobby: '보드게임',
      partnerAvatarText: '단', partnerGradient: 'linear-gradient(135deg, #DDCFFC 0%, #AA83E7 100%)',
      lastMessage: '설명은 제가 할게요, 편하게 오세요', lastTime: '어제', unreadCount: 0, isNewMatch: false, sample: true,
      messages: [
        { id: 'sample_m_dan_1', from: 'them', text: '보드게임 처음이시라고 들었어요. 어려운 게임은 빼고 갈게요', at: ago(28 * HOUR) },
        { id: 'sample_m_dan_2', from: 'me', text: '감사합니다 ㅎㅎ 주말에 뵐게요', at: ago(27 * HOUR) },
        { id: 'sample_m_dan_3', from: 'them', text: '설명은 제가 할게요, 편하게 오세요', at: ago(26 * HOUR) }
      ]
    }
  ];
}

/** 예시 한 묶음 — regionId 의 동네로 사람·글·모임의 지역을 맞춘다. */
function buildSampleContent(regionId, areaId) {
  return {
    groups: sampleGroups(regionId, areaId),
    feedPosts: sampleFeedPosts(),
    explorePosts: sampleExplorePosts(regionId),
    matchProfiles: samplePeople(regionId),
    chatRooms: sampleChatRooms(),
    groupChats: sampleGroupChats(),
    eventChats: sampleEventChats(),
    groupNotices: sampleGroupNotices(),
    groupEvents: sampleGroupEvents(),
    joinedGroupIds: SAMPLE_JOINED_GROUP_IDS.slice(),
    firstGroupId: 'sample_grp_run'
  };
}

/**
 * 예시 데이터를 상태에 넣는다(이미 있으면 지우고 새로 넣는다).
 *  · `sample: true` 로 표시해 두고, 사람·글·모임 모두 **가입한 모임 2개**와 이어진다.
 *  · 동네는 지금 내 지역(없으면 기본 지역)으로 맞춰 '우리 동네'에서 바로 보이게 한다.
 */
function applySampleData(state, options = {}) {
  if (!state) return state;
  stripSampleData(state);
  const me = state.currentUser || {};
  const regionId = options.regionId
    || (me.registered && me.regionId ? me.regionId : null)
    || SAMPLE_FALLBACK_REGION;
  const areaId = options.areaId || geoAreaIdFor(me.location, regionId);
  const block = buildSampleContent(regionId, areaId);
  state.groups = (state.groups || []).concat(block.groups);
  state.feedPosts = (state.feedPosts || []).concat(block.feedPosts);
  state.explorePosts = (state.explorePosts || []).concat(block.explorePosts);
  state.matchProfiles = (state.matchProfiles || []).concat(block.matchProfiles);
  state.chatRooms = (state.chatRooms || []).concat(block.chatRooms);
  state.groupChats = (state.groupChats || []).concat(block.groupChats);
  state.eventChats = (state.eventChats || []).concat(block.eventChats);
  state.groupNotices = (state.groupNotices || []).concat(block.groupNotices);
  state.groupEvents = (state.groupEvents || []).concat(block.groupEvents);
  if (!state.currentUser) state.currentUser = blankCurrentUser();
  const joined = Array.isArray(state.currentUser.joinedGroupIds) ? state.currentUser.joinedGroupIds : [];
  block.joinedGroupIds.forEach((id) => { if (!joined.includes(id)) joined.push(id); });
  state.currentUser.joinedGroupIds = joined;
  state.homePrefs = state.homePrefs || { groupId: null };
  if (!state.homePrefs.groupId) state.homePrefs.groupId = block.firstGroupId;
  state.sampleData = {
    seeded: true,
    version: SAMPLE_DATA_VERSION,
    regionId,
    seededAt: new Date().toISOString(),
    clearedAt: null
  };
  return state;
}

/** 예시 데이터만 걷어낸다 — 내가 만든 모임·글·대화는 건드리지 않는다. */
function stripSampleData(state) {
  if (!state) return { ok: false, removed: 0 };
  let removed = 0;
  const keep = (list) => (Array.isArray(list) ? list.filter((item) => {
    if (item && item.sample === true) { removed += 1; return false; }
    return true;
  }) : []);
  state.groups = keep(state.groups);
  state.feedPosts = keep(state.feedPosts);
  state.explorePosts = keep(state.explorePosts);
  state.matchProfiles = keep(state.matchProfiles);
  state.chatRooms = keep(state.chatRooms);
  state.groupChats = keep(state.groupChats);
  state.eventChats = keep(state.eventChats);
  state.groupNotices = keep(state.groupNotices);
  state.groupEvents = keep(state.groupEvents);
  const sampleIds = SAMPLE_JOINED_GROUP_IDS;
  if (state.currentUser) {
    state.currentUser.joinedGroupIds = (state.currentUser.joinedGroupIds || [])
      .filter((id) => !sampleIds.includes(id));
  }
  if (state.homePrefs && sampleIds.includes(state.homePrefs.groupId)) {
    state.homePrefs.groupId = (state.currentUser.joinedGroupIds || [])[0] || null;
  }
  return { ok: true, removed };
}

/** 지금 예시 데이터가 얼마나 들어 있는지(설정 › 데이터 관리 요약용). */
function sampleSummaryOf(state) {
  const count = (list) => (Array.isArray(list) ? list.filter((x) => x && x.sample === true).length : 0);
  const meta = (state && state.sampleData) || {};
  const counts = {
    groups: count(state.groups),
    posts: count(state.feedPosts) + count(state.explorePosts),
    people: count(state.matchProfiles),
    chats: count(state.chatRooms) + count(state.groupChats),
    eventChats: count(state.eventChats),
    events: count(state.groupEvents)
  };
  return {
    seeded: meta.seeded === true && counts.groups + counts.posts + counts.people + counts.chats > 0,
    cleared: !!meta.clearedAt,
    version: meta.version || null,
    counts,
    total: counts.groups + counts.posts + counts.people + counts.chats + counts.events
  };
}

/** 가입에서 동네를 골랐을 때 — 예시의 동네를 그 지역으로 옮긴다. */
function retargetSampleRegion(state, regionId) {
  if (!state || !state.sampleData || !state.sampleData.seeded || !regionId) return state;
  const area = (regionDef(regionId) || {}).name || '';
  (state.explorePosts || []).forEach((p) => {
    if (p.sample) { p.regionId = regionId; p.location = area; p.groupName = `${area} ${p.hobbyLabel || ''}`.trim(); }
  });
  (state.matchProfiles || []).forEach((p) => { if (p.sample) { p.regionId = regionId; p.location = area; } });
  /* H2 — 예시 모임의 아지트도 가입한 동네(같은 시·군·구 우선) 아지트 1~2곳으로 옮긴다. */
  const areaId = geoAreaIdFor(state.currentUser && state.currentUser.location, regionId);
  const regionSpots = AZIT_SPOTS.filter((s) => !s.legacy && s.areaId === regionId && s.sigunguId);
  const mineSpots = areaId ? regionSpots.filter((s) => s.sigunguId === areaId) : [];
  const spots = mineSpots.length >= 3
    ? mineSpots.concat(regionSpots.filter((s) => s.sigunguId !== areaId))
    : regionSpots;
  let i = 0;
  (state.groups || []).forEach((g) => {
    if (!g.sample) return;
    g.regionId = regionId;
    if (spots.length) {
      const list = [spots[i % spots.length]];
      const second = spots.length > 2 ? spots[(i + 2) % spots.length] : null;
      if (second && second.id !== list[0].id) list.push(second);
      g.hangouts = list.map((s) => ({ id: s.id, name: s.name, kind: s.kind }));
      g.azitId = list[0].id;
      g.azitName = list[0].name;
      g.location = list[0].name;
      const sg = geoAreaView(list[0].sigunguId);
      if (sg) g.region = { sidoId: sg.sidoId, sidoName: sg.sidoName, sigunguId: sg.sigunguId, sigunguName: sg.name };
      i += 1;
    } else {
      g.location = area;
    }
  });
  (state.groupEvents || []).forEach((e) => {
    if (!e.sample) return;
    const g = (state.groups || []).find((x) => x.id === e.groupId);
    if (g && g.azitName && !e.place) e.place = g.azitName;
  });
  state.sampleData.regionId = regionId;
  return state;
}

/** 클린 스타트 상태 — 앱을 처음 연 사람이 보는 상태(회원가입 전, 예시 데이터만). */
function buildCleanState() {
  const state = JSON.parse(JSON.stringify(defaultInitialState));
  stripAllContent(state);
  state.schemaVersion = STORAGE_SCHEMA_VERSION;
  state.onboarding = { completed: false, completedAt: null, step: 0 };
  state.account = null;
  state.sessionActive = false;
  state.galleryPrefs = { sort: 'recent' };
  /* Sprint 21 — 새 계정은 가입 직후 스포트라이트 가이드를 본다(취향은 아직 비어 있다). */
  state.guide = { status: 'pending', step: 0, startedAt: null, finishedAt: null };
  state.tastePrefs = { hobbyIds: [], goalIds: [], updatedAt: null };
  state.customHobbies = [];
  applyRegionIds(state);
  /* Sprint 27 — 텅 빈 화면 대신 최소 예시 데이터로 시작한다(가입 후 바로 눌러 볼 수 있게). */
  applySampleData(state);
  return state;
}

/** 데모 계정 상태 — 테스트·미리보기(#demo) 전용. 예전 '루키' 계정을 되살린다. */
function buildDemoState() {
  const state = JSON.parse(JSON.stringify(defaultInitialState));
  state.schemaVersion = STORAGE_SCHEMA_VERSION;
  state.onboarding = { completed: true, completedAt: ago(2 * HOUR), step: 3, demo: true };
  state.account = { loginId: 'demo', passwordHash: oogHashPassword('demo'), createdAt: ago(30 * 24 * HOUR) };
  state.sessionActive = true;
  state.storyArchive = JSON.parse(JSON.stringify(STORY_ARCHIVE_SEED));
  state.galleryPrefs = { sort: 'recent' };
  state.currentUser.registered = true;
  state.currentUser.photoUrl = null;
  if (!state.currentUser.exploreCard) state.currentUser.exploreCard = { photoUrl: null, intro: '' };
  applyRegionIds(state);
  return state;
}

/** 로컬 데모용 비밀번호 해시 — 서버 인증으로 바꿀 때 서버 해시로 대체한다(STORE_API.md). */
function oogHashPassword(text) {
  const src = String(text == null ? '' : text);
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < src.length; i += 1) {
    const c = src.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c * (i + 7), 2246822519) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}

/* Sprint 17 — 내 스토리 보관함 시드(데모 계정 전용). 24시간이 지난 내 스토리 두 개. */
const STORY_ARCHIVE_SEED = [
  {
    id: 'story_arc_1',
    groupId: 'grp_crossfit_1',
    authorId: 'user_rookie',
    authorName: '루키',
    authorAvatarText: '루',
    authorGradient: 'linear-gradient(135deg, #0FB57E, #06AE7E)',
    mediaCaption: '10월 마지막 와드',
    caption: '10월 마지막 날 와드 완주 기록',
    createdAt: ago(30 * HOUR),
    archivedAt: ago(6 * HOUR)
  },
  {
    id: 'story_arc_2',
    groupId: 'grp_crossfit_1',
    authorId: 'user_rookie',
    authorName: '루키',
    authorAvatarText: '루',
    authorGradient: 'linear-gradient(135deg, #0FB57E, #06AE7E)',
    mediaCaption: 'PR 90kg',
    caption: '데드리프트 90kg 갱신한 날',
    createdAt: ago(58 * HOUR),
    archivedAt: ago(34 * HOUR)
  }
];

/* ============================================================================
 * Store
 * ========================================================================== */
class Store {
  constructor() {
    this.state = this.loadState();
    this.listeners = [];
    /* v36.1 — 일정 단톡방은 모든 일정에 하나씩 있다(샘플·옛 저장 상태 포함). */
    this.eventChatSync = this.syncEventChats();
    /* Sprint 25 — 서버 API 경계(js/api.js). 붙기 전에는 null 이고, 붙어도 화면은
       지금처럼 동기 store 를 그대로 쓴다(경계는 데이터 출처를 바꾸는 자리다). */
    this.api = null;
    this.storageAdapter = null;
    this.persistence = { writes: 0, failures: 0, lastAt: null, lastError: null, lastBytes: 0 };
  }

  /* ==========================================================================
   * Sprint 25 — API 경계 연결 (js/api.js)
   * ------------------------------------------------------------------------
   *  · bindApi(client)         : api 클라이언트를 store 에 붙인다
   *  · apiCall(name, params)   : 화면이 경계를 직접 부르고 싶을 때(비동기)
   *  · setStorageAdapter(adapter) : 저장(write)만 다른 곳으로 넘긴다(서버로 바꿀 자리)
   *  · getApiState()           : 지금 경계가 어디를 보고 있는지(테스트·설정 화면)
   * ======================================================================== */
  bindApi(client) {
    if (!client || typeof client.call !== 'function') return { ok: false, reason: 'invalid_client' };
    this.api = client;
    return { ok: true, contract: client.contract, adapter: client.adapterId, mode: client.mode };
  }

  apiCall(name, params, options) {
    if (!this.api) return Promise.resolve({ ok: false, data: null, error: { code: 'unavailable', message: 'API 경계가 연결되지 않았어요', retryable: false, details: null }, meta: { source: null, attempts: 0 } });
    return this.api.call(name, params, options);
  }

  setStorageAdapter(adapter) {
    if (adapter && typeof adapter.write === 'function') {
      this.storageAdapter = adapter;
      return { ok: true, adapter: 'custom' };
    }
    this.storageAdapter = null;
    return { ok: true, adapter: 'localStorage' };
  }

  getApiState() {
    const p = this.persistence || {};
    return {
      bound: !!this.api,
      contract: this.api ? this.api.contract : null,
      adapter: this.api ? this.api.adapterId : null,
      mode: this.api ? this.api.mode : null,
      storageAdapter: !!this.storageAdapter,
      persistence: { writes: p.writes || 0, failures: p.failures || 0, lastAt: p.lastAt || null, lastError: p.lastError || null, lastBytes: p.lastBytes || 0 }
    };
  }

  /* ---------------- persistence ---------------- */
  /**
   * 저장 상태 불러오기.
   * Sprint 18(v16) — **콘텐츠는 저장된 것만 쓴다.**
   *  · v16 이전(더미 모임·피드·게시판 글·사람이 섞인 상태)은 옮기지 않고 회원가입 전 빈 상태로 시작한다.
   *  · 불러올 때 시드로 빈 배열을 다시 채우지 않는다(예전에는 빈 배열을 시드로 보정해
   *    사용자가 지운 데이터가 되살아났다). 빈 모임·빈 게시판이 정상 상태다.
   *  · 서버 API 로 교체할 때 이 함수 하나만 fetch 로 바꾸면 된다(STORE_API.md).
   */
  loadState() {
    const raw = this.readRawState();
    if (!raw) return buildCleanState();
    try {
      const parsed = JSON.parse(raw);
      /* v16 이전 저장 상태는 병합하지 않는다 — 더미 콘텐츠·예전 계정을 물려받지 않는다.
         schemaVersion 이 아예 없는 아주 옛 저장 상태도 '이전'으로 본다. */
      const savedVersion = Number(parsed.schemaVersion);
      if (!Number.isFinite(savedVersion) || savedVersion < STORAGE_SCHEMA_VERSION) return buildCleanState();

      const merged = {
        ...defaultInitialState,
        ...parsed,
        currentUser: { ...defaultInitialState.currentUser, ...(parsed.currentUser || {}) }
      };
      /* 콘텐츠 컬렉션은 저장된 그대로 — 없거나 타입이 틀리면 '빈 것'으로 본다. */
      ['groups', 'feedPosts', 'explorePosts', 'matchProfiles', 'partnerProfiles', 'chatRooms',
        'stories', 'storyArchive', 'groupNotices', 'groupEvents', 'groupChats', 'eventChats',
        'groupApplications', 'notificationLog', 'matchSwipes'
      ].forEach((key) => { if (!Array.isArray(merged[key])) merged[key] = []; });
      if (!Array.isArray(merged.currentUser.joinedGroupIds)) merged.currentUser.joinedGroupIds = [];
      if (!Array.isArray(merged.currentUser.hobbies)) merged.currentUser.hobbies = [];
      if (!Array.isArray(merged.currentUser.hobbyIds)) merged.currentUser.hobbyIds = [];

      /* 설정·선택지는 기본값 위에 저장값을 덮는다(사용자가 고른 값만 이어간다). */
      merged.notificationSettings = {
        ...defaultInitialState.notificationSettings,
        ...(parsed.notificationSettings || {})
      };
      merged.notificationSettings.dndExceptions = {
        ...defaultInitialState.notificationSettings.dndExceptions,
        ...((parsed.notificationSettings && parsed.notificationSettings.dndExceptions) || {})
      };
      merged.notificationSettings.channels = Store.migrateNotificationChannels(
        parsed.notificationSettings && parsed.notificationSettings.channels
      );
      merged.pwa = { ...defaultInitialState.pwa, ...(parsed.pwa || {}) };
      merged.settings = { ...defaultInitialState.settings, ...(parsed.settings || {}) };
      /* true/false 는 사용자가 고른 값, 그 외(null)는 '기기 설정 따르기'로 남긴다. */
      merged.settings.darkMode = typeof merged.settings.darkMode === 'boolean' ? merged.settings.darkMode : null;
      merged.homePrefs = { ...defaultInitialState.homePrefs, ...(parsed.homePrefs || {}) };
      merged.galleryPrefs = { ...defaultInitialState.galleryPrefs, ...(parsed.galleryPrefs || {}) };
      /* Sprint 32.5 — 마지막으로 연 모임 시각(내 모임 빨간 점) */
      merged.groupVisits = (parsed.groupVisits && typeof parsed.groupVisits === 'object' && !Array.isArray(parsed.groupVisits))
        ? parsed.groupVisits : {};
      merged.ageRangeBounds = { min: 0, max: 99 };
      /* Sprint 21 — 취미 분류 체계는 **코드가 가진 선택지**다(사용자 콘텐츠가 아니다).
         저장 상태에 옛 8종 칩이 남아 있어도 지금의 42종으로 맞춘다. */
      merged.exploreHobbyChips = JSON.parse(JSON.stringify(HOBBY_FLAT));
      /* Sprint 23 — 지역 분류도 코드가 가진 선택지다. 저장 상태에 옛 9생활권이 남아 있어도
         지금의 2단 분류(서울 7동네 + 12지역)로 맞춘다. 옛 regionId 값은 applyRegionIds 가 옮긴다. */
      merged.exploreRegions = JSON.parse(JSON.stringify(EXPLORE_REGIONS));
      merged.exploreRegionGroups = JSON.parse(JSON.stringify(EXPLORE_REGION_GROUPS));
      merged.customHobbies = Array.isArray(parsed.customHobbies)
        ? parsed.customHobbies.filter((h) => h && h.id && h.name).slice(0, 20) : [];
      const gd = parsed.guide && typeof parsed.guide === 'object' ? parsed.guide : {};
      merged.guide = {
        status: ['pending', 'running', 'done', 'skipped'].includes(gd.status) ? gd.status : 'pending',
        step: Number.isFinite(gd.step) ? gd.step : 0,
        startedAt: gd.startedAt || null,
        finishedAt: gd.finishedAt || null
      };
      const tp = parsed.tastePrefs && typeof parsed.tastePrefs === 'object' ? parsed.tastePrefs : {};
      const tasteIds = (list) => (Array.isArray(list) ? list : []).filter((id) => typeof id === 'string').slice(0, 8);
      merged.tastePrefs = {
        hobbyIds: tasteIds(tp.hobbyIds),
        goalIds: tasteIds(tp.goalIds),
        updatedAt: tp.updatedAt || null
      };
      merged.hotRankSnapshots = (merged.hotRankSnapshots && typeof merged.hotRankSnapshots === 'object') ? merged.hotRankSnapshots : {};
      merged.hotEntryState = (merged.hotEntryState && typeof merged.hotEntryState === 'object') ? merged.hotEntryState : {};
      if (!merged.hotEntryBaseline || typeof merged.hotEntryBaseline !== 'object') merged.hotEntryBaseline = null;
      if ('weeklyDigest' in merged) delete merged.weeklyDigest;

      const storedPrefs = parsed.explorePrefs && typeof parsed.explorePrefs === 'object' ? parsed.explorePrefs : {};
      merged.explorePrefs = Store.normalizeExplorePrefs(storedPrefs, merged);

      /* 모임마다 설정 기본값을 갖춘다(가입 방식·나이 제한·운영진·1:1 허용). */
      merged.groups = merged.groups.map((g) => ({
        ...g,
        joinMode: g.joinMode || (g.privacyType === 'open' ? 'open' : 'approval'),
        ageLimit: g.ageLimit || 'all',
        joinQuestions: Array.isArray(g.joinQuestions) ? g.joinQuestions
          : ((g.joinMode || g.privacyType !== 'open') ? ['취미 구력이나 선호 요일을 적어주세요!'] : []),
        deputyIds: Array.isArray(g.deputyIds) ? g.deputyIds : [],
        dmEnabled: g.dmEnabled !== false,
        /* v35.2 — 게시판 멤버 작성 허용(기본 꺼짐) · 모임 알림 받기(기본 켜짐) */
        memberBoardWrite: g.memberBoardWrite === true,
        notifyEnabled: g.notifyEnabled !== false,
        deputyCanModerate: g.deputyCanModerate === true,
        members: Array.isArray(g.members) ? g.members : []
      }));
      merged.feedPosts = merged.feedPosts.map((p) => ({
        ...p,
        comments: Array.isArray(p.comments) ? p.comments : []
      }));
      /* H3 — 일정마다 게스트 신청 목록을 갖춘다(옛 저장 상태에는 없다).
         guestOpen 은 **켜 둔 일정만** 홈 추천 일정에 오르도록 true/false 로 맞춘다. */
      merged.groupEvents = merged.groupEvents.map((e) => ({
        ...e,
        rsvps: Array.isArray(e.rsvps) ? e.rsvps : [],
        guestRequests: Array.isArray(e.guestRequests) ? e.guestRequests : [],
        guestOpen: e.guestOpen === true
      }));
      merged.explorePosts = merged.explorePosts.map((p) => ({
        ...p,
        comments: Array.isArray(p.comments) ? p.comments : []
      }));
      /* v36.1 — 모든 일정에 단톡방이 있다(샘플·이전 저장 상태 모두). */
      merged.eventChats = merged.eventChats
        .filter((c) => c && c.eventId)
        .map((c) => ({
          ...c,
          groupId: ((merged.groupEvents || []).find((e) => e.id === c.eventId) || {}).groupId || c.groupId || null,
          messages: Array.isArray(c.messages) ? c.messages : []
        }));
      {
        const haveEventChat = new Set(merged.eventChats.map((c) => c.eventId));
        merged.groupEvents.forEach((e) => {
          if (e && e.id && !haveEventChat.has(e.id)) {
            merged.eventChats.push({ eventId: e.id, groupId: e.groupId, createdAt: new Date().toISOString(), messages: [] });
            haveEventChat.add(e.id);
          }
        });
        const eventIds = new Set(merged.groupEvents.map((e) => e && e.id));
        merged.eventChats = merged.eventChats.filter((c) => eventIds.has(c.eventId));
      }
      /* 홈 모임이 내 모임이 아니면(탈퇴 등) 첫 가입 모임으로 돌린다. */
      const homeValid = merged.homePrefs.groupId
        && merged.currentUser.joinedGroupIds.includes(merged.homePrefs.groupId);
      if (!homeValid) merged.homePrefs.groupId = merged.currentUser.joinedGroupIds[0] || null;

      applyRegionIds(merged);

      /* 회원가입(온보딩)·세션 상태 */
      const prevOnb = merged.onboarding || {};
      merged.onboarding = {
        completed: !!prevOnb.completed,
        completedAt: prevOnb.completedAt || null,
        step: prevOnb.step || 0
      };
      if (prevOnb.demo) merged.onboarding.demo = true;
      if (typeof merged.sessionActive !== 'boolean') {
        merged.sessionActive = merged.onboarding.completed === true;
      }
      merged.currentUser.registered = merged.currentUser.registered !== false;
      if (!merged.currentUser.exploreCard || typeof merged.currentUser.exploreCard !== 'object') {
        merged.currentUser.exploreCard = { photoUrl: null, intro: '' };
      }
      /* Sprint 24 — 2시간 프로필 · 앨범 · 비밀앨범 공개 대상(옛 저장 상태에는 없으므로 기본값을 채운다) */
      const cu = merged.currentUser;
      cu.explorePublish = (cu.explorePublish && typeof cu.explorePublish === 'object') ? cu.explorePublish : null;
      if (!cu.album || typeof cu.album !== 'object') cu.album = { public: [], secret: [] };
      ['public', 'secret'].forEach((kind) => {
        cu.album[kind] = Array.isArray(cu.album[kind])
          ? cu.album[kind].filter((p) => p && p.url).slice(0, 4) : [];
      });
      cu.secretShares = (cu.secretShares && typeof cu.secretShares === 'object') ? cu.secretShares : {};
      /* v34.4 — 다녀온 모임 공개 범위(옛 저장 상태에는 없으므로 '전체 공개'로 시작한다). */
      cu.pastMeetingsPublic = cu.pastMeetingsPublic !== false;
      if (!cu.pastMeetingVisibility || typeof cu.pastMeetingVisibility !== 'object'
        || Array.isArray(cu.pastMeetingVisibility)) cu.pastMeetingVisibility = {};
      /* Sprint 27 — 예전에 저장된 '텅 빈' 계정에도 최소 예시 데이터를 넣는다.
         (가이드가 빈 화면을 비추던 문제) 내가 만든 내용이 하나라도 있으면 건드리지 않고,
         '예시 데이터 비우기'를 누른 상태(cleared)도 다시 넣지 않는다. */
      const sd = parsed.sampleData && typeof parsed.sampleData === 'object' ? parsed.sampleData : {};
      const emptyContent = merged.groups.length === 0 && merged.feedPosts.length === 0
        && merged.explorePosts.length === 0 && merged.matchProfiles.length === 0;
      if (sd.seeded !== true && !sd.clearedAt && emptyContent) applySampleData(merged);
      /* Sprint 32.5 — v1 예시 데이터는 아지트·게스트 일정·추천 피드가 비어 있다. 있던 것만 손본다. */
      if (merged.sampleData && merged.sampleData.seeded === true
        && Number(merged.sampleData.version || 1) < SAMPLE_DATA_VERSION) {
        upgradeSampleData(merged);
        upgradeSampleImages(merged);
        upgradeSampleAvatars(merged);
      }
      /* H2 — 저장된 모임에 아지트·지역·기본값이 없으면(옛 상태) 조용히 채운다. */
      upgradeGroupGeo(merged);
      merged.sampleData = {
        seeded: merged.sampleData ? merged.sampleData.seeded === true : false,
        version: merged.sampleData ? SAMPLE_DATA_VERSION : SAMPLE_DATA_VERSION,
        regionId: merged.sampleData ? (merged.sampleData.regionId || null) : null,
        seededAt: (merged.sampleData && merged.sampleData.seededAt) || null,
        clearedAt: (merged.sampleData && merged.sampleData.clearedAt) || (sd.clearedAt || null)
      };
      merged.schemaVersion = STORAGE_SCHEMA_VERSION;
      return merged;
    } catch (e) {
      console.warn('[ooG] 저장된 상태를 불러오지 못했습니다.', e);
    }
    return buildCleanState();
  }

  /** 현재 키 → (없으면) 이전 버전 키 순서로 원본 JSON 문자열을 찾는다. */
  readRawState() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) return current;
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) return legacy;
      }
    } catch (e) {
      console.warn('[ooG] 저장소를 읽지 못했습니다.', e);
    }
    return null;
  }

  saveState() {
    let payload = null;
    try {
      payload = JSON.stringify(this.state);
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (e) {
      console.warn('[ooG] 상태를 저장하지 못했습니다.', e);
      /* 화면(app.js)이 사용자에게 안내할 수 있도록 이벤트로 알린다 */
      window.dispatchEvent(new CustomEvent('oog:storage-error', { detail: String(e) }));
    }
    /* Sprint 25 — 저장 경계. localStorage 는 그대로 쓰고, 그다음 어댑터(서버로 바꿀 자리)에 넘긴다.
       어댑터가 실패해도 화면·저장은 멈추지 않는다(실패는 세어 두었다가 다음 저장에서 다시 시도). */
    if (this.storageAdapter && payload) {
      try {
        this.storageAdapter.write(payload, { at: Date.now() });
        if (this.persistence) {
          this.persistence.writes += 1;
          this.persistence.lastAt = new Date().toISOString();
          this.persistence.lastBytes = payload.length;
        }
      } catch (e) {
        if (this.persistence) {
          this.persistence.failures += 1;
          this.persistence.lastError = String(e && e.message || e);
        }
      }
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }

  notify() {
    this.listeners.forEach((fn) => {
      try { fn(this.state); } catch (e) { console.warn('[ooG] 구독자 렌더링 오류', e); }
    });
  }

  /* ---------------- 조회 (Selectors) ---------------- */
  get currentUser() { return this.state.currentUser; }

  getGroup(groupId) {
    return this.state.groups.find((g) => g.id === groupId) || null;
  }

  getJoinedGroups() {
    return this.state.groups.filter((g) => this.isGroupJoined(g.id));
  }

  /**
   * 모임 상세의 '멤버' 구획 — 저장된 것에서 파생한다(새 시드 없음).
   *  1) 모임장  2) 이 모임 프라이빗 피드에 글을 쓴 사람들  3) 내가 가입했으면 나
   * 겉면 카드는 인원만 보여주고, 실제 이름은 상세에서만 꺼낸다.
   * @returns {{people:Array, hidden:number, total:number}}
   */
  getGroupMembers(groupId) {
    const group = this.getGroup(groupId);
    if (!group) return { people: [], hidden: 0, total: 0 };
    const roster = this.getGroupRoster(groupId);
    const people = roster.members.slice(0, 8).map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role === 'leader' ? 'leader' : (m.isMe ? 'me' : 'member'),
      gradient: m.gradient,
      avatarText: m.avatarText,
      photoUrl: m.photoUrl || null
    }));
    return { people, hidden: Math.max(0, roster.total - people.length), total: roster.total };
  }

  /**
   * 모임 상세의 '일정' 구획 — meetLabel + 가입 정책의 정기 일정을 한 줄씩.
   * 글자가 아니라 화면이 읽기 좋게 잘라 둔다(상세에서만 쓰는 파생 데이터).
   */
  getGroupSchedule(groupId) {
    const group = this.getGroup(groupId);
    if (!group) return [];
    const rows = [];
    if (group.meetLabel) {
      rows.push({ icon: 'calendar', label: '정기 모임', value: group.meetLabel, tone: 'regular' });
    }
    const core = String(group.meetLabel || '').replace(/\s+/g, '');
    (group.joinPolicy || []).forEach((line, i) => {
      if (!line || line === group.meetLabel) return;
      /* 정기 모임 줄과 같은 요일·시각을 다시 적은 줄은 중복이니 건너뛴다. */
      if (core && String(line).replace(/\s+/g, '').includes(core)) return;
      rows.push({ icon: i === 0 ? 'clock' : 'plus', label: i === 0 ? '모임 일정' : '함께 하는 날',
        value: line, tone: 'extra' });
    });
    return rows;
  }
  isGroupJoined(groupId) {
    return this.state.currentUser.joinedGroupIds.includes(groupId);
  }

  /* ==========================================================================
   * v36.0 — 모임 역할(모임장·운영진·멤버)과 권한 검사 한 곳
   * --------------------------------------------------------------------------
   *  · 역할은 셋뿐이다: owner(모임장) · staff(운영진) · member(멤버).
   *    가입하지 않았으면 guest.
   *  · 화면도 액션 함수도 **can(groupId, action)** 하나만 본다. 화면에서 숨긴 일을
   *    store 액션이 다시 검사하므로, 화면을 거치지 않은 호출도 같은 선에서 막힌다.
   *  · 모임장은 탈퇴할 수 없고(위임 먼저), 운영진은 모임장·다른 운영진을 건드릴 수 없다.
   * ========================================================================== */
  /** 현재 로그인 유저가 그 모임의 멤버인가(모임장 포함). */
  isGroupMember(groupId, memberId) {
    const group = this.getGroup(groupId);
    if (!group) return false;
    const who = memberId || (this.state.currentUser && this.state.currentUser.id);
    if (!who) return false;
    if (group.leaderId === who) return true;
    if (Array.isArray(group.deputyIds) && group.deputyIds.indexOf(who) >= 0) return true;
    if (who === this.state.currentUser.id && this.isGroupJoined(groupId)) return true;
    return (group.members || []).some((m) => m.id === who);
  }

  /**
   * 역할 판별 — 'owner' | 'staff' | 'member' | 'guest'.
   * memberId 를 주지 않으면 '나'로 본다.
   */
  roleOf(groupId, memberId) {
    const group = this.getGroup(groupId);
    if (!group) return 'guest';
    const me = this.state.currentUser;
    const who = memberId || (me && me.id);
    if (!who) return 'guest';
    /* ?dev=1 역할 보기 — 그 모임에서 나를 지정한 역할로 본다(세션 한정, 저장 안 함). */
    if (this.rolePreview && this.rolePreview.groupId === groupId
        && me && who === me.id && this.rolePreview.role) {
      return this.rolePreview.role;
    }
    if (!this.isGroupMember(groupId, who)) return 'guest';
    if (group.leaderId === who) return 'owner';
    if (Array.isArray(group.deputyIds) && group.deputyIds.indexOf(who) >= 0) return 'staff';
    const entry = (group.members || []).find((m) => m.id === who);
    if (entry && entry.role === 'owner') return 'owner';
    if (entry && entry.role === 'staff') return 'staff';
    return 'member';
  }

  /** 역할 이름 — 화면 문구는 이 세 단어만 쓴다. */
  roleLabel(role) {
    if (role === 'owner') return '모임장';
    if (role === 'staff') return '운영진';
    if (role === 'member') return '멤버';
    return '비멤버';
  }

  /**
   * 권한 검사 — 화면과 액션이 함께 보는 유일한 함수.
   * @param {string} groupId
   * @param {string} action GROUP_ACTION_ROLES 의 키
   * @param {string} [memberId] 없으면 나
   */
  can(groupId, action, memberId) {
    const allowed = GROUP_ACTION_ROLES[action];
    if (!allowed) return false;
    const role = this.roleOf(groupId, memberId);
    if (allowed.indexOf(role) < 0) return false;
    /* v36.1 — 멤버 관리는 모임장이 운영진에게 넘긴 경우에만 운영진에게 열린다. */
    if (role === 'staff' && STAFF_DELEGATED_ACTIONS.indexOf(action) >= 0) {
      const group = this.getGroup(groupId);
      return !!(group && group.deputyCanModerate === true);
    }
    return true;
  }

  /** 운영진이 손댈 수 있는 대상인가 — 대상은 멤버만(모임장·운영진·나 자신은 불가). */
  canManageMember(groupId, targetId) {
    if (!this.can(groupId, 'mute_member')) return false;
    const me = this.state.currentUser && this.state.currentUser.id;
    if (!targetId || targetId === me) return false;
    return this.roleOf(groupId, targetId) === 'member';
  }

  /** 모임장 권한 판별 — 예전 이름. 역할 판별로 위임한다. */
  isGroupLeader(groupId) {
    return this.roleOf(groupId) === 'owner';
  }

  /** ?dev=1 역할 보기 전환 — 세션에서만 쓰고 저장하지 않는다. */
  setRolePreview(groupId, role) {
    if (['owner', 'staff', 'member'].indexOf(role) < 0) {
      this.rolePreview = null;
      return { ok: true, preview: null };
    }
    this.rolePreview = { groupId, role };
    return { ok: true, preview: this.rolePreview };
  }

  clearRolePreview() {
    this.rolePreview = null;
  }

  getRolePreview() {
    return this.rolePreview || null;
  }

  /** 역할별 멤버 수 — 멤버 관리 머리말. */
  getGroupRoleCounts(groupId) {
    const roster = this.getGroupRoster(groupId);
    const counts = { owner: 0, staff: 0, member: 0 };
    roster.members.forEach((m) => {
      const role = this.roleOf(groupId, m.id);
      if (counts[role] != null) counts[role] += 1;
    });
    return counts;
  }

  /**
   * 피드 조회.
   * @param {'all'|'my'|'popular'} filterType
   *        all     : 내가 볼 수 있는 모든 글(가입 모임 + 공개 모임)
   *        my      : 내가 가입한 소모임의 글만
   *        popular : 좋아요·댓글 반응이 좋은 '오운완' 인기 글 (공개 모임 포함)
   * @param {string|null} groupId 특정 모임으로 좁히기
   */
  getPosts(filterType = 'my', groupId = null) {
    const joined = this.state.currentUser.joinedGroupIds;
    const blocked = this.state.blockedMemberIds || [];
    let posts = this.state.feedPosts.filter((p) => blocked.indexOf(p.authorId) < 0);
    /* v36.1 — 승인된 게스트(비멤버)는 그 모임의 글을 피드 어디에서도 볼 수 없다. */
    posts = posts.filter((p) => !p.groupId || !this.isApprovedGuestOf(p.groupId));

    if (filterType === 'my') {
      posts = posts.filter((p) => joined.includes(p.groupId));
    } else if (filterType === 'popular') {
      /* 프라이버시 원칙: 비공개 모임의 글은 인기 피드에도 노출하지 않는다.
         (가입했거나, 자유 가입(open) 모임인 경우에만 노출) */
      posts = posts.filter((p) => {
        const g = this.getGroup(p.groupId);
        return g && (joined.includes(g.id) || g.privacyType === 'open');
      });
    } else {
      posts = posts.filter((p) => {
        /* v33.8 — 모임 없이 올린 자유 피드 글은 홈 피드에 공개되는 글이므로 함께 보인다. */
        if (!p.groupId) return true;
        const g = this.getGroup(p.groupId);
        return g && (joined.includes(g.id) || g.privacyType === 'open');
      });
    }

    if (groupId) posts = posts.filter((p) => p.groupId === groupId);

    if (filterType === 'popular') {
      posts.sort((a, b) => this.engagementScore(b) - this.engagementScore(a));
    } else {
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return posts;
  }

  engagementScore(post) {
    return post.likes + post.comments.length * 2;
  }

  getPost(postId) {
    return this.state.feedPosts.find((p) => p.id === postId) || null;
  }

  /* ---------------- 액션 (Actions) ---------------- */
  /**
   * 가입/탈퇴 토글.
   *  · 나가기는 언제든 가능하다.
   *  · 들어가기는 **자유 가입(joinMode:'open')** 모임에서만 바로 된다.
   *    승인제 모임은 `applyToGroup()` 로 신청서를 내야 하고,
   *    나이 제한에 걸리면 가입할 수 없다 → false 를 돌려준다.
   */
  toggleJoinGroup(groupId) {
    const user = this.state.currentUser;
    const grp0 = this.getGroup(groupId);
    const isJoined = user.joinedGroupIds.includes(groupId);
    if (isJoined) {
      user.joinedGroupIds = user.joinedGroupIds.filter((id) => id !== groupId);
    } else {
      if (!grp0) return false;
      if (this.getGroupJoinMode(grp0) === 'approval') return false;      // 승인제는 신청서 필요
      if (grp0.memberCount >= grp0.maxMembers) return false;            // 정원 마감
      if (!this.ageAllowed(user.age, this.getGroupAgeLimit(groupId).id).ok) return false;
      user.joinedGroupIds.push(groupId);
    }
    const grp = this.getGroup(groupId);
    if (grp) grp.memberCount = Math.max(1, grp.memberCount + (isJoined ? -1 : 1));
    /* Sprint 14 — 새로 들어온 모임에는 단체 채팅방을 하나 열어 둔다(첫 인사 자리).
       나갈 때는 대화 기록을 지우지 않는다 — 다시 들어오면 이어서 본다. */
    if (!isJoined) this.ensureGroupChat(groupId);
    this.saveState();
    return !isJoined;
  }

  /**
   * 모임 나가기 — Sprint 18 사이드바 '모임 설정'의 탈퇴.
   * 내 가입 목록·멤버 수·홈 모임에서 빠지고, 그 모임의 단체방은 목록에서 사라진다.
   * 모임장은 나갈 수 없다(모임을 지우는 deleteGroup 을 쓴다).
   */
  leaveGroup(groupId, options) {
    const group = this.getGroup(groupId);
    if (!group) return { ok: false, reason: 'not_found' };
    if (!this.isGroupJoined(groupId)) return { ok: false, reason: 'not_member' };
    /* v36.0 — 모임장은 탈퇴할 수 없다. 먼저 위임해야 한다. */
    if (this.roleOf(groupId) === 'owner') {
      return { ok: false, reason: 'owner', message: '모임장은 탈퇴할 수 없어요. 먼저 모임장을 다른 멤버에게 넘겨 주세요.' };
    }
    if (!this.can(groupId, 'leave_group')) return { ok: false, reason: 'permission' };
    const keepPosts = !options || options.keepPosts !== false;
    const me = this.currentUser;
    let removedPosts = 0;
    let removedComments = 0;
    if (!keepPosts) {
      /* v36.1 (#23461) — '내 글 지우기'는 **내 글과 내 댓글을 함께** 지운다.
         · 이 모임의 내 글은 통째로 사라진다.
         · 남의 글에 내가 남긴 댓글도 지운다(다른 모임·동네 글의 댓글은 건드리지 않는다).
         · 다른 사람이 내 댓글에 달은 답글은 지우지 않고 맨 댓글로 올린다(남의 말은 남긴다). */
      const myCommentIds = new Set();
      this.state.feedPosts = (this.state.feedPosts || []).filter((p) => {
        const mine = p.groupId === groupId && p.authorId === me.id;
        if (mine) removedPosts += 1;
        return !mine;
      });
      this.state.feedPosts.forEach((p) => {
        if (p.groupId !== groupId || !Array.isArray(p.comments)) return;
        p.comments = p.comments.filter((c) => {
          const mine = c && c.authorId === me.id;
          if (mine) { myCommentIds.add(c.id); removedComments += 1; }
          return !mine;
        });
      });
      if (myCommentIds.size) {
        this.state.feedPosts.forEach((p) => {
          if (p.groupId !== groupId || !Array.isArray(p.comments)) return;
          p.comments.forEach((c) => {
            if (c && c.parentId && myCommentIds.has(c.parentId)) {
              c.parentId = null;
              c.replyToName = null;
            }
          });
        });
      }
    }
    this.state.currentUser.joinedGroupIds = this.state.currentUser.joinedGroupIds.filter((id) => id !== groupId);
    group.members = (group.members || []).filter((m) => m.id !== me.id);
    if (Array.isArray(group.deputyIds)) group.deputyIds = group.deputyIds.filter((id) => id !== me.id);
    group.memberCount = Math.max(1, (group.memberCount || 1) - 1);
    if (this.state.groupMembership && this.state.groupMembership[groupId]) {
      delete this.state.groupMembership[groupId][me.id];
    }
    if (this.state.homePrefs && this.state.homePrefs.groupId === groupId) {
      this.state.homePrefs.groupId = this.state.currentUser.joinedGroupIds[0] || null;
    }
    this.logGroupMod(groupId, 'leave', { targetId: me.id, targetName: me.nickname });
    this.saveState();
    return {
      ok: true, groupId, keepPosts,
      removedPosts,
      removedComments,
      removedItems: removedPosts + removedComments,
      nextGroupId: this.state.homePrefs ? this.state.homePrefs.groupId : null
    };
  }

  /** 모임장이 모임을 지운다 — 모임·그 모임의 글·공지·일정·단체방·스토리까지 함께 정리한다. */
  deleteGroup(groupId) {
    const group = this.getGroup(groupId);
    if (!group) return { ok: false, reason: 'not_found' };
    if (!this.can(groupId, 'delete_group') && group.leaderId !== this.currentUser.id) {
      return { ok: false, reason: 'permission' };
    }
    this.state.groups = this.state.groups.filter((g) => g.id !== groupId);
    this.state.currentUser.joinedGroupIds = this.state.currentUser.joinedGroupIds.filter((id) => id !== groupId);
    this.state.feedPosts = (this.state.feedPosts || []).filter((p) => p.groupId !== groupId);
    this.state.groupNotices = (this.state.groupNotices || []).filter((n) => n.groupId !== groupId);
    this.state.groupEvents = (this.state.groupEvents || []).filter((e) => e.groupId !== groupId);
    this.state.groupChats = (this.state.groupChats || []).filter((c) => c.groupId !== groupId);
    /* v36.1 — 이 모임 일정들의 단톡방도 함께 정리한다. */
    this.state.eventChats = (this.state.eventChats || []).filter((c) => c.groupId !== groupId
      && (this.state.groupEvents || []).some((e) => e.id === c.eventId));
    this.state.stories = (this.state.stories || []).filter((s) => s.groupId !== groupId);
    if (this.state.groupMembership) delete this.state.groupMembership[groupId];
    if (Array.isArray(this.state.groupReports)) {
      this.state.groupReports = this.state.groupReports.filter((r) => r.groupId !== groupId);
    }
    if (this.state.homePrefs && this.state.homePrefs.groupId === groupId) {
      this.state.homePrefs.groupId = this.state.currentUser.joinedGroupIds[0] || null;
    }
    this.saveState();
    return { ok: true, groupId };
  }

  /**
   * 좋아요 토글. 화면에서 하트 애니메이션을 위해 변경된 상태를 함께 돌려준다.
   * @returns {{liked:boolean, likes:number}|null}
   */
  toggleLike(postId) {
    const post = this.getPost(postId);
    if (!post) return null;
    post.likedByMe = !post.likedByMe;
    post.likes = Math.max(0, post.likes + (post.likedByMe ? 1 : -1));
    this.saveState();
    return { liked: post.likedByMe, likes: post.likes };
  }

  /**
   * Sprint 33 — 좋아요를 **원하는 상태**로 맞춘다(API 경계 `post.like` 와 화면이 같은 규칙을 쓴다).
   *  같은 값으로 두 번 불러도 결과가 같다(재시도·오프라인 큐 flush 안전).
   * @param {string} postId
   * @param {boolean} liked 원하는 상태
   * @param {'feed'|'explore'} kind
   */
  setPostLike(postId, liked, kind) {
    const post = kind === 'explore' ? this.getExplorePost(postId) : this.getPost(postId);
    if (!post) return null;
    const want = !!liked;
    const before = { liked: !!post.likedByMe, likes: Math.max(0, Number(post.likes) || 0) };
    if (!!post.likedByMe !== want) {
      post.likedByMe = want;
      post.likes = Math.max(0, (Number(post.likes) || 0) + (want ? 1 : -1));
      this.saveState();
    }
    return { liked: !!post.likedByMe, likes: Math.max(0, Number(post.likes) || 0), changed: before.liked !== want, before, kind: kind || 'feed' };
  }

  /**
   * v35.1 (#23087) — 글쓴이가 자기 글의 **좋아요 수·누른 사람**을 비공개로 둔다.
   *  · 글쓴이만 바꿀 수 있다(다른 사람 글은 권한 없음).
   *  · 값은 글 객체의 `likesHidden` 하나다 — 화면은 볼 사람이 글쓴이인지 보고 그린다.
   * @param {string} postId
   * @param {boolean} hidden
   */
  setPostLikesHidden(postId, hidden, kind) {
    const post = kind === 'explore'
      ? (this.getExplorePost ? this.getExplorePost(postId) : null)
      : (this.getPost(postId) || (this.getExplorePost ? this.getExplorePost(postId) : null));
    if (!post) return { ok: false, reason: 'not_found' };
    if (post.authorId !== this.state.currentUser.id) return { ok: false, reason: 'permission' };
    post.likesHidden = !!hidden;
    this.saveState();
    return { ok: true, postId, hidden: post.likesHidden };
  }

  /** v35.1 — 이 글의 좋아요가 비공개인가(글 객체 값 그대로). */
  isPostLikesHidden(postId) {
    const post = this.getPost(postId) || (this.getExplorePost ? this.getExplorePost(postId) : null);
    return !!(post && post.likesHidden);
  }

  /** Sprint 33 — 경계가 실패했을 때 되돌릴 좋아요 상태 복원. */
  restorePostLike(postId, before, kind) {
    if (!before) return null;
    return this.setPostLike(postId, !!before.liked, kind);
  }

  toggleBookmark(postId) {
    const post = this.getPost(postId);
    if (!post) return null;
    post.bookmarkedByMe = !post.bookmarkedByMe;
    this.saveState();
    return post.bookmarkedByMe;
  }

  /** 댓글 추가 — 빈 문자열은 무시. 성공 시 새 댓글 객체 반환.
   *  Sprint 15 — parentId 를 주면 답글(1단계까지)이다. */
  addComment(postId, text, parentId = null, options = {}) {
    const post = this.getPost(postId);
    const body = (text || '').trim();
    if (!post || !body) return null;
    if (!Array.isArray(post.comments)) post.comments = [];
    /* Sprint 33 — 경계가 같은 commentId 로 다시 부르면 같은 댓글을 돌려준다(중복 없음). */
    const wanted = options && options.commentId;
    if (wanted) {
      const already = post.comments.find((c) => c.id === wanted);
      if (already) return already;
    }
    const user = this.state.currentUser;
    let parent = null;
    if (parentId) {
      const found = (post.comments || []).find((c) => c.id === parentId);
      /* 답글은 1단계까지만 — 답글에 답글을 달면 원래 댓글에 붙는다. */
      parent = found ? (found.parentId ? (post.comments || []).find((c) => c.id === found.parentId) || found : found) : null;
    }
    const comment = {
      id: (options && options.commentId) || `c_${postId}_${Date.now()}`,
      authorId: user.id,
      authorName: user.nickname,
      text: body.slice(0, 300),
      parentId: parent ? parent.id : null,
      replyToName: parent ? parent.authorName : null,
      likes: 0,
      likedByMe: false,
      createdAt: new Date().toISOString()
    };
    post.comments.push(comment);
    this.saveState();
    return comment;
  }

  /** Sprint 33 — 댓글을 걷어낸다(경계 실패 롤백). */
  removeComment(postId, commentId) {
    const post = this.getPost(postId);
    if (!post || !Array.isArray(post.comments)) return { ok: false, reason: 'not_found' };
    const idx = post.comments.findIndex((c) => c.id === commentId);
    if (idx < 0) return { ok: false, reason: 'not_found' };
    const [removed] = post.comments.splice(idx, 1);
    this.saveState();
    return { ok: true, comment: removed, index: idx };
  }

  /** Sprint 33 — 동네 글 댓글 걷어내기(롤백). */
  removeExplorePostComment(postId, commentId) {
    const post = this.getExplorePost(postId);
    if (!post || !Array.isArray(post.comments)) return { ok: false, reason: 'not_found' };
    const idx = post.comments.findIndex((c) => c.id === commentId);
    if (idx < 0) return { ok: false, reason: 'not_found' };
    const [removed] = post.comments.splice(idx, 1);
    this.saveState();
    return { ok: true, comment: removed, index: idx };
  }

  /** Sprint 33 — 글을 걷어낸다(글 작성 경계 실패 롤백). */
  removePost(postId) {
    const list = this.state.feedPosts || [];
    const idx = list.findIndex((p) => p.id === postId);
    if (idx < 0) return { ok: false, reason: 'not_found' };
    const [removed] = list.splice(idx, 1);
    this.saveState();
    return { ok: true, post: removed, index: idx };
  }

  /** Sprint 33 — 걷어낸 글을 원래 자리로 되돌린다. */
  restorePost(post, index) {
    if (!post) return { ok: false, reason: 'not_found' };
    const list = this.state.feedPosts || (this.state.feedPosts = []);
    if (list.some((p) => p.id === post.id)) return { ok: true, post, index: list.findIndex((p) => p.id === post.id) };
    const at = Number.isFinite(index) ? Math.max(0, Math.min(index, list.length)) : 0;
    list.splice(at, 0, post);
    this.saveState();
    return { ok: true, post, index: at };
  }

  /**
   * 새 글 작성 (인스타형 피드).
   * @param {{groupId:string, tag:string|null, caption:string, photoUrl?:string, mediaCaption?:string}} data
   * @returns {object|null} 생성된 post
   */
  /** v33.7 — 우그 자체 갤러리에서 함께 보여 줄 예시 사진 목록(앱에 들어 있는 18장). */
  getExamplePhotos() {
    return Object.keys(EXAMPLE_PHOTOS).map((key) => ({ id: `example_${key}`, url: EXAMPLE_PHOTOS[key], example: true }));
  }

  /**
   * v33.7 — 글 한 건의 사진 목록. 새 글은 `images: [...]`, 옛 글은 `photoUrl` 하나.
   *  카드·상세·캐러셀이 모두 이 한 곳을 본다.
   */
  getPostImages(post) {
    if (!post) return [];
    const list = Array.isArray(post.images) ? post.images.filter((u) => typeof u === 'string' && u) : [];
    if (list.length) return list.slice(0, MAX_POST_IMAGES);
    return post.photoUrl ? [post.photoUrl] : [];
  }

  /** 사진 주소 하나를 받아들일 수 있는지 — https · 기기에서 고른 Data URL · 앱 예시 사진(assets/). */
  normalizePostImages(raw) {
    const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    const out = [];
    list.forEach((u) => {
      const url = String(u || '').trim();
      /* v33.7 — 우그 갤러리의 예시 사진은 앱 안 상대 경로(예시 사진 폴더)다. 이 경로도 받는다. */
      if (!/^https?:\/\//i.test(url) && !/^data:image\//i.test(url) && !RELATIVE_IMAGE_RE.test(url)) return;
      if (out.includes(url)) return;
      if (out.length >= MAX_POST_IMAGES) return;
      out.push(url);
    });
    return out;
  }

  createPost(data) {
    const groupId = (data && data.groupId) || null;
    const group = groupId ? this.getGroup(groupId) : null;
    /* v33.8 (#22181 · 11/22 12:43 사용자: "홈탭에서 그룹에 안들어가도 즉 그룹이 없어도 됨.
       피드를 올릴수 있게해줄래? 이거는 추천피드에 무조건 떠야해") — 모임을 고르지 않은 글은
       '자유 피드' 글로 저장하고 추천(홈) 피드에 **무조건** 노출한다. */
    const freePost = !groupId;
    if (!freePost) {
      if (!group) return null;
      if (!this.isGroupJoined(groupId)) return null;          // 가입한 모임에만 작성
      if (group.archived) return null;                        // v36.0 — 보관된 모임은 새 글을 받지 않는다
    }
    /* Sprint 33 — 경계(`post.create`)가 같은 postId 로 다시 부르면 그 글을 돌려준다(중복 없음). */
    const wantedId = data && data.id;
    if (wantedId) {
      const already = (this.state.feedPosts || []).find((p) => p.id === wantedId);
      if (already) return already;
    }
    const caption = (data.caption || '').trim();
    /* Sprint 17 · v33.7 — **여러 장**(최대 10)까지. 첫 장이 대표(photoUrl)이고
       옛 단일 사진 글도 그대로 읽힌다(images 없으면 photoUrl). */
    const images = this.normalizePostImages(data.images != null ? data.images : data.photoUrl);
    const photoUrl = images[0] || null;
    if (!caption && !images.length) return null;

    const tag = (data.tag && group && group.customTags.includes(data.tag)) ? data.tag : null;
    const user = this.state.currentUser;
    const regionName = freePost ? this.getRegionLabel((user && user.regionId) || '') : '';
    const post = {
      /* 같은 1ms 안에 두 글을 써도 id 가 겹치지 않게 뒤에 짧은 난수를 붙인다(32.5).
         Sprint 33 — 화면이 먼저 만든 글(낙관적 업데이트)의 id 를 그대로 쓴다. */
      id: wantedId || `post_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      groupId: freePost ? null : groupId,
      /* 모임 없이 올린 글 — '자유 피드'. 카드 머리말과 홈 노출 판단이 이 값을 본다. */
      freePost,
      regionName,
      authorId: user.id,
      authorName: user.nickname,
      authorAvatarText: user.avatarText,
      authorGradient: user.avatarGradient,
      authorPhotoUrl: user.photoUrl || null,
      tag,
      caption: caption.slice(0, 500),
      /* 사진 없이 글만 쓰는 것도 허용한다 — 사진은 사용자가 올린 것만 쓴다(예시 이미지 없음). */
      images,
      photoUrl,
      mediaCaption: (data.mediaCaption || '').trim().slice(0, 40),
      likes: 0,
      likedByMe: false,
      bookmarkedByMe: false,
      comments: [],
      /* Sprint 32.5 — 홈 '추천 피드'에 보여도 된다고 고른 글만 (기본은 모임 안에만).
         H3(11/21) — **모임 기본값을 따르지 않는다.** 글을 쓸 때마다 기본은 꺼짐(false)이고,
         '추천 피드에 노출해도 괜찮아요'를 체크한 글만 홈 추천 피드에 오른다. */
      recommendOptIn: freePost ? true : data.recommendOptIn === true,
      /* 모임 없이 올린 글은 홈 피드에 무조건 — 화면·감사가 읽는 이름 그대로 남긴다. */
      showInHomeFeed: freePost ? true : data.recommendOptIn === true,
      createdAt: new Date().toISOString()
    };
    this.state.feedPosts.unshift(post);
    this.saveState();
    return post;
  }

  /**
   * H3 — 글 수정(작성자 본인만). 올린 뒤에도 '추천 피드에 노출해도 괜찮아요'를 바꿀 수 있고,
   * 저장하면 홈 추천 피드에 바로 나타나거나 바로 빠진다.
   * @returns {{ok:boolean, post?:object, reason?:string}}
   */
  updatePost(postId, patch = {}) {
    const post = (this.state.feedPosts || []).find((p) => p.id === postId);
    if (!post) return { ok: false, reason: 'not_found' };
    if (post.authorId !== this.state.currentUser.id) return { ok: false, reason: 'permission' };
    const group = this.getGroup(post.groupId);
    const caption = patch.caption == null ? post.caption : String(patch.caption).trim();
    const images = patch.images != null
      ? this.normalizePostImages(patch.images)
      : (patch.photoUrl != null ? this.normalizePostImages(patch.photoUrl) : this.getPostImages(post));
    const photoUrl = images[0] || null;
    if (!caption && !images.length) return { ok: false, reason: 'empty' };
    post.caption = caption.slice(0, 500);
    if (patch.mediaCaption != null) post.mediaCaption = String(patch.mediaCaption).trim().slice(0, 40);
    post.images = images;
    post.photoUrl = photoUrl;
    if (patch.tag !== undefined) {
      post.tag = patch.tag && group && group.customTags.includes(patch.tag) ? patch.tag : null;
    }
    if (patch.recommendOptIn != null) {
      /* 자유 피드 글은 홈 노출을 끌 수 없다(무조건 노출). */
      const on = post.freePost === true ? true : patch.recommendOptIn === true;
      post.recommendOptIn = on;
      post.showInHomeFeed = on;
    }
    post.editedAt = new Date().toISOString();
    this.saveState();
    return { ok: true, post };
  }

  /**
   * 게시물 삭제 (작성자 본인만). 되돌리기를 위해 삭제된 글과 원래 위치를 돌려준다.
   * @returns {{post:object, index:number}|null}
   */
  deletePost(postId) {
    const index = this.state.feedPosts.findIndex((p) => p.id === postId);
    if (index < 0) return null;
    const post = this.state.feedPosts[index];
    if (post.authorId !== this.state.currentUser.id) return null;   // 내 글만
    this.state.feedPosts.splice(index, 1);
    this.saveState();
    return { post, index };
  }

  /** 삭제 되돌리기 — 원래 위치에 다시 끼워 넣는다. */
  restorePost(post, index) {
    if (!post) return false;
    this.state.feedPosts.splice(Math.max(0, Math.min(index, this.state.feedPosts.length)), 0, post);
    this.saveState();
    return true;
  }

  /** 모임장 전용 — 말머리 태그 추가. 중복/형식 검증 후 저장. */
  addGroupCustomTag(groupId, tagName) {
    const group = this.getGroup(groupId);
    if (!group || !this.can(groupId, 'edit_group')) return { ok: false, reason: 'permission' };

    const clean = String(tagName || '').replace(/^#+/, '').replace(/\s+/g, '').trim();
    if (!clean) return { ok: false, reason: 'empty' };
    if (clean.length > 10) return { ok: false, reason: 'too_long' };
    if (group.customTags.length >= 12) return { ok: false, reason: 'too_many' };
    if (group.customTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      return { ok: false, reason: 'duplicate' };
    }

    group.customTags.push(clean);
    this.saveState();
    return { ok: true, tag: clean };
  }

  /** 모임장 전용 — 말머리 태그 삭제. 이미 글에 달린 태그는 글에 그대로 남는다(기록 보존). */
  deleteGroupCustomTag(groupId, tagName) {
    const group = this.getGroup(groupId);
    if (!group || !this.can(groupId, 'edit_group')) return { ok: false, reason: 'permission' };
    const before = group.customTags.length;
    group.customTags = group.customTags.filter((t) => t !== tagName);
    if (group.customTags.length === before) return { ok: false, reason: 'not_found' };
    this.saveState();
    return { ok: true };
  }

  /* ==========================================================================
   * 탐색 피드 (Sprint 4) — 토스쇼핑형 2열 메이슨리 · 사람 · 모임 · 게시글
   * ------------------------------------------------------------------------
   *  화면(app.js)은 아래 셀렉터/액션만 알면 된다.
   *    getExploreFilters()   필터 칩 정의 (전체 · 취미친구 · 소모임 · 게시글 · 취미 8종)
   *    getExploreFeed(f,t)   필터/검색을 적용한 카드 배열 (사람·모임·게시글 타입 교차)
   *    getExploreFeed(f,t,{page,limit})  무한 스크롤 페이지
   *    getExploreStats()     카드 수 요약 (사람 N · 모임 N · 글 N)
   *    recordMatchSwipe()    카드 하트 → LIKE 기록, 상호면 대화방 생성
   *    toggleMatchLike()     하트 취소(되돌리기)
   *    isProfileLiked()      이미 하트를 누른 사람인지 (카드 상태 표시)
   * ======================================================================== */

  /** 탐색 필터 칩 — '전체' / 타입 2종 / 세부 취미 45종.
   *  Sprint 22 — 모임(groups)은 홈의 '모임 둘러보기'로 옮겼다. 탐색 칩에도 두지 않는다. */
  getExploreFilters() {
    return [
      { id: 'all', name: '전체', kind: 'type' },
      { id: 'people', name: '취미친구', icon: 'person', kind: 'type' },
      { id: 'posts', name: '게시글', icon: 'image', kind: 'type' },
      ...(this.state.exploreHobbyChips || []).map((h) => Object.assign({}, h, { kind: 'hobby' }))
    ];
  }

  /** Sprint 9~22 — 종류 세그먼트(상단 1줄)에 쓰는 타입 3종.
   *  Sprint 22 — 모임은 홈 탭으로 옮겼다(11/16 지시: "탐색탭의 모임은 그냥 홈탭으로 보내줘").
   *  그래서 탐색은 **전체(사람+글) · 사람 · 글** 세 칸만 쓴다. */
  getExploreTypeFilters() {
    return this.getExploreFilters().filter((f) => f.kind === 'type');
  }

  /** Sprint 9~21 — 탐색 필터의 '핵심 취미' 8종(‘전체’ 제외). 세부 취미는 대분류로 고른다. */
  getExploreHobbyFilters() {
    return this.getCoreHobbyChips().map((h) => Object.assign({}, h, { kind: 'hobby' }));
  }

  /* ==========================================================================
   * Sprint 7 — A. 탐색 필터 기억 (나이 · 지역 · 종류)
   * ------------------------------------------------------------------------
   *  11/14 22:24 사용자 지시: "마지막 탐색 필터 상태(나이·지역 등)를 저장해 앱 재실행 시 기억."
   *  · 화면 상태가 아니라 **저장 상태(state.explorePrefs)** 에 두어 새로고침·재실행에도 남는다.
   *  · 검색어(query)는 기억하지 않는다 — 다시 열었을 때 결과가 비어 보이면 안 되니까.
   *  · 값은 항상 검증해서 모르는 값이면 기본값('all')으로 되돌린다.
   * ======================================================================== */

  /**
   * 저장된 탐색 필터를 이 저장 상태 기준으로 검증해 정규화한다.
   * Sprint 25 — 탐색에서 **취미를 완전히 뺐다**(사용자 지시). 저장 상태에 옛 취미 필터가
   * 남아 있어도 '전체'로 돌린다. 반경도 화면에서 뺐으므로('지역'이 그 역할을 한다)
   * 항상 'all' 로 되돌려 **보이지 않는 조건**이 남지 않게 한다.
   * @param {object} prefs 후보 값 {filter, age, region, radius}
   * @param {object} [state] 검증 기준이 될 상태(기본: 현재 상태 · 마이그레이션에서는 merged)
   */
  static normalizeExplorePrefs(prefs, state) {
    const s = state || (window.appStore ? window.appStore.state : null) || {};
    const p = prefs || {};
    const typeIds = ['all', 'people', 'posts'];
    const ageIds = ['all', 'for_me', 'none', ...(s.ageLimitOptions || []).filter((o) => o.id !== 'all').map((o) => o.id)];
    /* 지역 조건은 권역 id · 큰 분류 id · 내 주변 을 모두 받는다. */
    const regionIds = ['all', 'nearby',
      ...(s.exploreRegionGroups || EXPLORE_REGION_GROUPS).map((g) => g.id),
      ...(s.exploreRegions || EXPLORE_REGIONS).map((r) => r.id),
      ...Object.keys(REGION_ALIASES)];
    const regionValue = regionIds.includes(p.region) ? p.region : 'all';
    const region = regionValue === 'all' || regionValue === 'nearby' || isKnownRegionGroup(regionValue)
      ? regionValue : (normalizeRegionId(regionValue) || 'all');
    return {
      filter: typeIds.includes(p.filter) ? p.filter : 'all',
      age: ageIds.includes(p.age) ? p.age : 'all',
      region,
      radius: 'all',
      /* Sprint 16 — 0~99세 듀얼 레인지. 두 값이 뒤집혔으면 바로잡고, 범위 밖은 잘라낸다. */
      ageMin: clampAge(Math.max(19, Number(p.ageMin) || 19), 19),
      ageMax: clampAge(p.ageMax, 99)
    };
  }

  /** Sprint 16 — 지금 고른 나이 범위(0~99). active = 실제로 걸러야 하는 상태인지. */
  getExploreAgeRange() {
    const prefs = this.getExplorePrefs();
    /* Sprint 28.5 — 탐색 나이 필터는 성인 기준 19~99세. */
    const max = Math.max(19, Math.min(99, Math.max(prefs.ageMin, prefs.ageMax)));
    const min = Math.max(19, Math.min(max, Math.min(prefs.ageMin, prefs.ageMax)));
    return { min, max, active: !(min === 19 && max === 99), bounds: { min: 19, max: 99 } };
  }

  /**
   * 나이 범위를 저장한다(기억됨). 0~99 를 벗어나는 값은 잘라내고, 최소>최대면 바꿔 넣는다.
   * @returns {{ok:boolean, range:object, prefs:object}}
   */
  setExploreAgeRange(min, max) {
    const lo = clampAge(Math.max(19, Number(min) || 19), 19);
    const hi = clampAge(max, 99);
    const prefs = this.updateExplorePrefs({
      ageMin: Math.min(lo, hi),
      ageMax: Math.max(lo, hi),
      /* 슬라이더를 쓰면 예전 4구간 칩 조건은 풀린다(두 조건이 서로를 가리지 않게). */
      age: 'all'
    });
    return { ok: true, range: this.getExploreAgeRange(), prefs: prefs.prefs };
  }

  /** 나이 범위 필터가 사람·글쓴이의 나이를 허용하는가(범위가 0~99면 모두 통과). */
  ageRangeAllows(age) {
    const range = this.getExploreAgeRange();
    if (!range.active) return true;
    if (age == null || Number.isNaN(Number(age))) return false;
    const n = Number(age);
    return n >= range.min && n <= range.max;
  }

  /** 나이 범위 필터가 모임의 가입 나이 제한과 겹치는가(모임은 제한 구간과 범위가 겹치면 보인다). */
  ageRangeAllowsGroup(group) {
    const range = this.getExploreAgeRange();
    if (!range.active) return true;
    const limit = this.getGroupAgeRange(group);   // H4 — 슬라이더로 정한 범위도 같은 기준
    return range.min <= limit.max && range.max >= limit.min;
  }

  /** 마지막으로 고른 탐색 필터(나이·지역·종류·반경) — 새로고침해도 유지된다. */
  getExplorePrefs() {
    if (!this.state.explorePrefs || typeof this.state.explorePrefs !== 'object') {
      this.state.explorePrefs = { filter: 'all', age: 'all', region: 'all', radius: 'all', ageMin: 0, ageMax: 99 };
    }
    this.state.explorePrefs = Store.normalizeExplorePrefs(this.state.explorePrefs, this.state);
    return { ...this.state.explorePrefs };
  }

  /**
   * 탐색 필터를 저장한다. 넘기지 않은 항목은 그대로 둔다.
   * @param {{filter?:string, age?:string, region?:string, radius?:string}} patch
   * @returns {{ok:boolean, prefs:object}}
   */
  updateExplorePrefs(patch) {
    const current = this.getExplorePrefs();
    const next = Store.normalizeExplorePrefs({ ...current, ...(patch || {}) }, this.state);
    const changed = next.filter !== current.filter || next.age !== current.age
      || next.region !== current.region || next.radius !== current.radius
      || next.ageMin !== current.ageMin || next.ageMax !== current.ageMax;
    this.state.explorePrefs = next;
    if (changed) this.saveState();
    return { ok: true, prefs: { ...next }, changed };
  }

  /* ==========================================================================
   * Sprint 7 — B. 지역(생활권) 탐색
   * ------------------------------------------------------------------------
   *  · 사람·모임·글마다 regionId 가 있다(applyRegionIds 가 일관되게 채운다).
   *  · getExploreRegionStats() 는 **지금 고른 종류·취미·나이·검색 조건 안에서**
   *    지역별 사람·모임·글 수를 돌려준다 → 칩/드로운다운에 숫자를 그대로 쓴다.
   * ======================================================================== */

  /** 동네 메타 목록 — 서울 12 · 경기 14 · 강원 5 · 충청 6 · 전라 4 · 경상 5 · 제주 · 해외 · 베어. */
  getExploreRegions() {
    return (this.state.exploreRegions || EXPLORE_REGIONS).map((r) => ({ ...r }));
  }

  /** 화면에 세우는 동네 목록(숨은 online 제외). */
  getVisibleRegions() {
    return this.getExploreRegions().filter((r) => !r.hidden);
  }

  /** 큰 분류(서울·경기·부산 …) 목록. */
  getRegionGroups() {
    return (this.state.exploreRegionGroups || EXPLORE_REGION_GROUPS).map((g) => ({ ...g }));
  }

  /** 큰 분류 하나에 속한 동네들 — 서울이면 7개, 나머지는 자기 하나. */
  getSubRegions(groupId) {
    return this.getVisibleRegions().filter((r) => r.groupId === groupId);
  }

  /**
   * 지역 id 해석 — 동네 id · 큰 분류 id · 'all' · 'nearby' 를 모두 같은 모양으로 돌려준다.
   * @returns {object|null} { id, name, short, icon, label, groupId?, group:boolean }
   */
  getRegion(regionId) {
    if (!regionId) return null;
    if (regionId === 'nearby') {
      return { id: 'nearby', name: '내 주변', short: '내 주변', icon: 'walk',
        label: `내 동네 ${NEARBY_KM}km 안`, nearby: true };
    }
    const group = regionGroupDef(regionId);
    if (group) {
      return { ...group, group: true, label: `${group.label}` };
    }
    const id = normalizeRegionId(regionId);
    return this.getExploreRegions().find((r) => r.id === id) || null;
  }

  /** 지역 표시 이름 — '서울 · 성수·성동·동작' 처럼 큰 분류를 앞에 붙인다. */
  getRegionLabel(regionId) {
    const region = this.getRegion(regionId);
    if (!region) return '전체 지역';
    if (region.group || region.nearby) return region.name;
    const group = regionGroupDef(region.groupId);
    return group && group.name !== region.name ? `${group.name} · ${region.name}` : region.name;
  }

  /**
   * 지역 칩 — 이반시티 '우리동네'와 같은 대분류 순서
   * [전체] [서울] [경기] [강원] [충청] [전라] [경상] [제주] [해외] [베어] (+ 건수).
   * 서울·경기·강원·충청·전라·경상은 안쪽 권역을 따로 고를 수 있다(getSubRegions).
   */
  getExploreRegionChips(filter = 'all', query = '', ageFilter = 'all', radius = 'all') {
    const stats = this.getExploreRegionStats(filter, query, ageFilter, radius);
    const byId = stats.reduce((map, s2) => { map[s2.id] = s2; return map; }, {});
    return [
      { id: 'all', name: '전체', icon: 'grid', count: byId.all ? byId.all.total : 0 },
      ...this.getRegionGroups().map((g) => ({
        id: g.id, name: g.name, icon: g.icon, group: true,
        count: byId[g.id] ? byId[g.id].total : 0
      }))
    ];
  }

  /** 필터 시트의 '내 주변' 칩 — 거리 기준 바로가기(5km). */
  getNearbyChip(filter = 'all', query = '', ageFilter = 'all', radius = 'all') {
    const stats = this.getExploreRegionStats(filter, query, ageFilter, radius);
    const near = stats.find((s2) => s2.id === 'nearby');
    return { id: 'nearby', name: '내 주변', icon: 'walk',
      label: `내 동네 ${NEARBY_KM}km 안`, count: near ? near.total : 0 };
  }

  /** 만남 스타일 목록 — 글 쓸 때 하나 고른다(선택). */
  getMeetStyles() {
    return EXPLORE_MEET_STYLES.map((s) => ({ ...s }));
  }

  getMeetStyle(styleId) {
    return meetStyleDef(styleId);
  }

  /** 사람 카드의 지역 */
  getPersonRegionId(profile) {
    if (!profile) return null;
    return profile.regionId || deriveRegionId(profile.location);
  }

  /** 모임의 지역 */
  getGroupRegionId(group) {
    if (!group) return null;
    return group.regionId || deriveRegionId(group.location) || deriveRegionId((group.tags || []).join(' '));
  }

  /** 공개 글의 지역 — 글이 명시한 지역 → 작성자 → 소속 모임 순으로 해석한다. */
  getExplorePostRegionId(post) {
    if (!post) return null;
    if (post.regionId) return post.regionId;
    const byText = deriveRegionId(post.location) || deriveRegionId(post.groupName);
    if (byText) return byText;
    if (post.authorId === this.state.currentUser.id) return this.state.currentUser.regionId || null;
    const person = this.getPersonProfile(post.authorId);
    return person ? this.getPersonRegionId(person) : null;
  }

  /** 탐색 피드 항목(사람·모임·글)의 지역 id */
  itemRegionId(item) {
    if (!item) return null;
    if (item.type === 'person') return this.getPersonRegionId(item.profile);
    if (item.type === 'group') return this.getGroupRegionId(item.group);
    if (item.type === 'post') return this.getExplorePostRegionId(item.post);
    return null;
  }

  /* ==========================================================================
   * Sprint 8 — C. 내 동네 반경(N km) 필터
   * ------------------------------------------------------------------------
   * 11/14 22:59 사용자 지시: "내 동네 반경 필터 넣어줘".
   *
   *  · 거리는 한 곳에서만 계산해 사람·모임·글이 같은 자로 재어진다.
   *    - 사람 : 프로필의 distanceKm(시드·매칭 프로필이 이미 갖고 있다)
   *    - 모임 : 설정된 distanceKm → 없으면 생활권 대표 거리 + 아이디 기반 오프셋
   *    - 글   : 내 글이면 내 동네(0.3km) · 아니면 작성자 거리 → 글의 생활권
   *  · 온라인 생활권(전국·디스코드)은 물리적 거리가 없어 null 이고, 반경을 고르면 빠진다.
   *  · 반경은 나이·지역·취미·검색·무한 스크롤과 동시에 걸린다(getExploreFeed 의 radius).
   * ======================================================================== */

  /** 반경 옵션 5종(전체·1km·3km·5km·10km) */
  getExploreRadiusOptions() {
    return (this.state.exploreRadiusOptions || EXPLORE_RADIUS_OPTIONS).map((r) => ({ ...r }));
  }

  getRadiusOption(radiusId) {
    return this.getExploreRadiusOptions().find((r) => r.id === radiusId) || null;
  }

  /** 사람 카드까지의 거리(km). 온라인 생활권은 거리 개념이 없어 null. */
  getPersonDistanceKm(profile) {
    if (!profile) return null;
    const regionId = this.getPersonRegionId(profile);
    if (regionId === 'online') return null;
    const explicit = Number(profile.distanceKm);
    if (profile.distanceKm != null && Number.isFinite(explicit)) return explicit;
    const base = REGION_DISTANCE_KM[regionId];
    return base == null ? null : base;
  }

  /** 모임 카드까지의 거리(km) — H2 는 내 동네 기준점과 모임 아지트 좌표로 계산. */
  getGroupDistanceKm(group) {
    if (!group) return null;
    const regionId = this.getGroupRegionId(group);
    if (regionId === 'online') return null;
    /* H2 — 아지트(1~3곳)의 대략 좌표 중 내 동네와 가장 가까운 곳. */
    const hs = this.getGroupHangouts(group).filter((h) => h.lat != null && h.lng != null);
    const anchor = this.getMyAnchorCoords();
    if (hs.length && anchor) {
      const dists = hs.map((h) => geoKm(anchor.lat, anchor.lng, h.lat, h.lng)).filter((v) => v != null);
      if (dists.length) return Math.round(Math.min(...dists) * 10) / 10;
    }
    const explicit = Number(group.distanceKm);
    if (group.distanceKm != null && Number.isFinite(explicit)) {
      return Math.round(explicit * 10) / 10;
    }
    const base = REGION_DISTANCE_KM[regionId];
    if (base == null) return null;
    return Math.round((base + fallbackDistanceKm(group.id) * 0.6) * 10) / 10;
  }

  /** 거리 구간 표기 — 화면에는 '약 1~2km' 처럼 구간만 (정확한 거리 금지). */
  getGroupDistanceLabel(group) {
    return distanceBucket(this.getGroupDistanceKm(group));
  }

  /** 공개 글까지의 거리(km) — 작성자 거리(내 글이면 내 동네) → 글의 생활권. */
  getExplorePostDistanceKm(post) {
    if (!post) return null;
    if (post.distanceKm != null && Number.isFinite(Number(post.distanceKm))) return Number(post.distanceKm);
    const uid = this.state.currentUser.id;
    if (post.isMine || post.authorId === uid) return 0.3;
    const person = this.getPersonProfile(post.authorId);
    if (person) {
      const d = this.getPersonDistanceKm(person);
      if (d != null) return d;
    }
    const regionId = this.getExplorePostRegionId(post);
    if (regionId === 'online') return null;
    const base = REGION_DISTANCE_KM[regionId];
    return base == null ? null : base;
  }

  /** 탐색 피드 항목(사람·모임·글)의 거리 km */
  itemDistanceKm(item) {
    if (!item) return null;
    if (item.type === 'person') return this.getPersonDistanceKm(item.profile);
    if (item.type === 'group') return this.getGroupDistanceKm(item.group);
    if (item.type === 'post') return this.getExplorePostDistanceKm(item.post);
    return null;
  }

  /** 고른 반경 안에 들어오는가 (전체는 항상 true, 거리 없음은 false). */
  radiusAllows(radiusId, km) {
    const limit = radiusKmOf(radiusId || 'all');
    if (limit == null) return true;
    return km != null && Number.isFinite(Number(km)) && Number(km) <= limit;
  }

  /** km → '850m' / '1.2km' */
  formatDistance(km) { return distanceLabel(km); }

  /**
   * 반경별 카드 수 — 지금 고른 조건(종류·취미·검색·나이·지역) 안에서 센다.
   * @returns {Array<{id,name,km,icon,desc,count,people,groups,posts}>}
   */
  getExploreRadiusStats(filter = 'all', query = '', ageFilter = 'all', region = 'all') {
    const items = this.getExploreFeed(filter, query, null, ageFilter, region, 'all');
    return this.getExploreRadiusOptions().map((opt) => {
      const hits = (items || []).filter((it) => this.radiusAllows(opt.id, it.distanceKm));
      return {
        ...opt,
        count: hits.length,
        people: hits.filter((it) => it.type === 'person').length,
        groups: hits.filter((it) => it.type === 'group').length,
        posts: hits.filter((it) => it.type === 'post').length
      };
    });
  }

  /** 지금 조건 안에서 가장 가까운 카드의 거리 — 빈 반경에서 '얼마나 넓히면 보이나'를 알려준다. */
  nearestDistanceKm(filter = 'all', query = '', ageFilter = 'all', region = 'all') {
    const items = this.getExploreFeed(filter, query, null, ageFilter, region, 'all') || [];
    const list = items.map((it) => it.distanceKm)
      .filter((d) => d != null && Number.isFinite(Number(d))).map(Number);
    return list.length ? Math.min(...list) : null;
  }

  /**
   * 지역별 카드 수 — 지금 고른 조건(종류·취미·검색·나이·반경) 안에서 센다.
   * @param {string} filter getExploreFilters() 의 id
   * @param {string} query 검색어
   * @param {string} ageFilter 나이 필터 id
   * @param {string} radius 반경 필터 id ('all'|'1'|'3'|'5'|'10')
   * @returns {Array<{id,name,short,icon,label,people,groups,posts,total,active}>}
   *          첫 항목은 항상 '전체 지역'(id: 'all')
   */
  getExploreRegionStats(filter = 'all', query = '', ageFilter = 'all', radius = 'all') {
    const items = this.getExploreFeed(filter, query, null, ageFilter, 'all', radius);
    const regions = this.getVisibleRegions();
    const groups = this.getRegionGroups();
    const seed = regions.reduce((map, r) => {
      map[r.id] = { id: r.id, name: r.name, short: r.short, icon: r.icon, label: r.label,
        groupId: r.groupId, people: 0, groups: 0, posts: 0, total: 0 };
      return map;
    }, {});
    const groupSeed = groups.reduce((map, g) => {
      map[g.id] = { id: g.id, name: g.name, short: g.short, icon: g.icon, label: g.label,
        group: true, people: 0, groups: 0, posts: 0, total: 0 };
      return map;
    }, {});
    let total = { people: 0, groups: 0, posts: 0 };
    let nearby = { people: 0, groups: 0, posts: 0 };
    (items || []).forEach((item) => {
      const id = normalizeRegionId(this.itemRegionId(item));
      const kind = item.type === 'person' ? 'people' : item.type === 'group' ? 'groups' : 'posts';
      total[kind] += 1;
      if (this.radiusAllows(String(NEARBY_KM), item.distanceKm)) nearby[kind] += 1;
      const bucket = seed[id];
      if (!bucket) return;
      bucket[kind] += 1;
      const g = groupSeed[bucket.groupId];
      if (g) g[kind] += 1;
    });
    const list = regions.map((r) => {
      const b = seed[r.id];
      b.total = b.people + b.groups + b.posts;
      return b;
    });
    const groupList = groups.map((g) => {
      const b = groupSeed[g.id];
      b.total = b.people + b.groups + b.posts;
      return b;
    });
    return [
      { id: 'all', name: '전체', short: '전체', icon: 'map', label: '모든 지역',
        ...total, total: total.people + total.groups + total.posts },
      { id: 'nearby', name: '내 주변', short: '내 주변', icon: 'walk', label: `내 동네 ${NEARBY_KM}km 안`,
        ...nearby, total: nearby.people + nearby.groups + nearby.posts },
      ...groupList,
      ...list
    ];
  }

  /* ==========================================================================
   * Sprint 6 — 탐색 탭 나이 제한 필터
   * ------------------------------------------------------------------------
   * 11/14 21:24 사용자 지시: "필터가 있으면 좋지" (카드 겉면 배지 유지 + 탐색에서 걸러 보기).
   *
   *  · 옵션 5종: 전체(all) · 제한없음(none) · 20대만(20s) · 2030만(2030) · 30대+(30plus)
   *  · 모임: 그 모임의 ageLimit 이 고른 조건과 **같을 때만** 보인다
   *          (제한없음 = ageLimit 'all' 인 모임).
   *  · 사람: 그 사람의 나이가 고른 조건의 범위(min~max)에 들어야 보인다.
   *          (제한없음은 범위 제한이 없으므로 모두 보인다 — 사람에게는 '제한'이 없으니까)
   *  · 게시글: 작성자의 나이를 알 수 있으면 범위로 거르고, 모르면 '전체·제한없음'일 때만 보인다.
   * ======================================================================== */
  getExploreAgeFilters() {
    const limits = this.getAgeLimitOptions();
    const me = this.getForMeAgeProfile();
    return [
      { id: 'all', name: '전체', icon: 'cake', tone: 'all', desc: '나이 조건 없이 모든 카드' },
      /* Sprint 7 — "내 나이(26)에 맞는 모임만" — 내가 가입할 수 있는 나이 제한의 모임과
         그 나이대 사람·글만 모아 본다. 나이가 바뀌면 기준도 같이 움직인다. */
      {
        id: 'for_me',
        name: '내 나이 맞춤',
        icon: 'person',
        tone: 'me',
        myAge: me.myAge,
        desc: `${me.myAge}세인 내가 가입할 수 있는 모임 + ${me.minAge}~${me.maxAge}세 친구`
      },
      { id: 'none', name: '제한없음', icon: 'unlock', tone: 'none', desc: '나이 제한을 두지 않은 모임' },
      ...limits.filter((o) => o.id !== 'all').map((o) => ({
        id: o.id,
        name: o.cardBadge,
        icon: 'lock',
        tone: o.tone,
        desc: `${o.label} 모임`
      }))
    ];
  }

  /**
   * 내 나이 기준 '가입 가능한 나이대' (Sprint 7).
   * · limitIds : 내가 가입할 수 있는 모임의 ageLimit id ('all' + 내 나이를 포함하는 제한들)
   * · minAge/maxAge : 그 제한들이 허용하는 사람 나이의 합집합
   *   (예: 26세 → 20대만(20~29) · 2030(20~39) → 20~39세)
   * 나이를 바꾸면 이 값도 함께 바뀌므로 '26세'를 코드에 박지 않는다.
   * @param {number} [age] 기준 나이(기본: 내 프로필 나이)
   */
  getForMeAgeProfile(age) {
    const myAge = Number(age == null ? this.state.currentUser.age : age) || 0;
    const bands = this.getAgeLimitOptions()
      .filter((o) => o.id !== 'all' && myAge >= o.min && myAge <= o.max);
    if (!bands.length) {
      /* 어떤 제한에도 걸리지 않는 나이라면(예: 50세) 사람은 나이로 거르지 않는다. */
      return { myAge, limitIds: ['all'], bands: [], minAge: 0, maxAge: 200 };
    }
    return {
      myAge,
      limitIds: ['all', ...bands.map((b) => b.id)],
      bands: bands.map((b) => b.id),
      minAge: Math.min.apply(null, bands.map((b) => b.min)),
      maxAge: Math.max.apply(null, bands.map((b) => b.max))
    };
  }

  /**
   * 나이 필터가 사람(또는 게시글 작성자)의 나이를 허용하는가.
   * @param {string} ageFilter all | for_me | none | 20s | 2030 | 30plus
   * @param {number|null} age
   */
  ageFilterAllowsAge(ageFilter, age) {
    if (!ageFilter || ageFilter === 'all' || ageFilter === 'none') return true;
    if (age == null || Number.isNaN(Number(age))) return false;
    const n = Number(age);
    if (ageFilter === 'for_me') {
      const me = this.getForMeAgeProfile();
      if (!me.bands.length) return true;
      return n >= me.minAge && n <= me.maxAge;
    }
    const opt = this.getAgeLimit(ageFilter);
    if (!opt) return true;
    return n >= opt.min && n <= opt.max;
  }

  /** 나이 필터가 모임의 가입 나이 제한과 일치하는가 ('전체'는 모두 통과). */
  ageFilterAllowsGroup(ageFilter, group) {
    if (!ageFilter || ageFilter === 'all') return true;
    const limit = (group && group.ageLimit) || 'all';
    if (ageFilter === 'none') return limit === 'all';
    if (ageFilter === 'for_me') {
      const me = this.getForMeAgeProfile();
      if (!me.bands.length) return true;
      /* H4 — 직접 정한 범위는 '내 나이가 그 안에 있는가'로 본다. */
      if (limit === 'custom') {
        const r = this.getGroupAgeRange(group);
        return me.myAge >= r.min && me.myAge <= r.max;
      }
      return me.limitIds.includes(limit);
    }
    if (limit === ageFilter) return true;
    /* H4 — 슬라이더 범위(예: 20~35세)는 필터 구간(2030)과 **겹치면** 보여 준다. */
    if (limit === 'custom') {
      const opt = this.getAgeLimit(ageFilter);
      if (!opt) return true;
      const r = this.getGroupAgeRange(group);
      return r.min <= opt.max && r.max >= opt.min;
    }
    return false;
  }

  /** 게시글 작성자의 나이 — 내 글이면 내 나이, 아니면 매칭 프로필에서 찾는다. 없으면 null. */
  getPostAuthorAge(post) {
    if (!post) return null;
    if (post.authorAge != null) return Number(post.authorAge);
    if (post.authorId === this.state.currentUser.id) return Number(this.state.currentUser.age);
    const profile = (this.state.matchProfiles || []).find((p) => p.id === post.authorId);
    return profile && profile.age != null ? Number(profile.age) : null;
  }

  getMatchProfile(profileId) {
    return this.state.matchProfiles.find((p) => p.id === profileId) || null;
  }

  /** 검색어가 사람 카드에 걸리는지 — 닉네임·동네·취미·스타일·배지 */
  matchPersonQuery(profile, q) {
    if (!q) return true;
    const hay = [
      profile.nickname, profile.location, profile.hobbyLabel,
      profile.hobbyStyle, profile.badge, (profile.hobbies || []).join(' '),
      profile.age ? `${profile.age}세` : ''
    ].join(' ').toLowerCase();
    return hay.includes(q);
  }

  /** 검색어가 모임 카드에 걸리는지 — 모임명·지역·카테고리·요일·태그 */
  matchGroupQuery(group, q) {
    if (!q) return true;
    const azit = this.getGroupAzit(group);
    const hay = [
      group.name, group.location, group.categoryName, group.meetLabel,
      azit ? `${azit.name} ${azit.areaName} ${azit.kindLabel}` : '',
      (group.tags || []).join(' '), group.description
    ].join(' ').toLowerCase();
    return hay.includes(q);
  }

  /**
   * 탐색 피드 항목. 사람·모임·게시글을 번갈아 섞어(타입 교차) 2열 메이슨리에서
   * 한쪽 열에 한 종류만 몰리는 일이 없게 한다.
   *
   * @param {'all'|'people'|'groups'|'posts'|string} filter  취미 id 도 받는다
   * @param {string} query  검색어
   * @param {{page:number, limit:number}|null} options
   *        null  → 필터에 맞는 **전체** 카드(1 라운드). 검색 결과 수·통계에 쓴다.
   *        객체  → 무한 스크롤용 페이지. 기존 풀을 다 보여준 뒤에는 라운드를 바꿔
   *               (사람·모임·게시글을 서로 다른 순서로 회전) 끊김 없이 이어진다.
   *               각 항목의 uid 는 `id#라운드`라 같은 사람이라도 카드가 중복 키가 되지 않고,
   *               하트·가입 상태는 id 기준이라 어느 카드에서 눌러도 같은 사람으로 기록된다.
   * @param {'all'|'none'|'20s'|'2030'|'30plus'|'for_me'} ageFilter
   *        Sprint 6~7 — 탐색 나이 제한 필터. getExploreAgeFilters() 의 id.
   *        'all' 이면 나이로 거르지 않고, 'for_me' 는 내 나이로 가입할 수 있는 나이대만 본다.
   * @param {'all'|string} region
   *        Sprint 7 — 지역(생활권) id. getExploreRegions() 의 id.
   * @returns {Array|{items:Array, page:number, hasMore:boolean, total:number, round:number}}
   */
  /**
   * Sprint 22 — 홈의 '모임 둘러보기'.
   * ------------------------------------------------------------------
   * 11/16 사용자: "탐색탭의 모임은 그냥 홈탭으로 보내줘" — 모임 목록·검색·필터·
   * 더 보기를 탐색에서 홈 안으로 옮겼다. 필터 규칙은 탐색과 같은 자를 쓴다
   * (지역·나이 범위·반경·검색). 다만 **취미는 대분류로** 좁힌다 — 모임은 분야로 찾는 게 빠르다.
   * @param {{query?:string, categoryId?:string, hobbyId?:string, region?:string,
   *          age?:string, radius?:string, sort?:string, offset?:number, limit?:number}} options
   * @returns {{items:Array, total:number, hasMore:boolean}}
   */
  /**
   * H2 — 모임 찾기의 지역(시·도/시·군·구)·아지트 필터와 거리 구간 정렬을 더한다.
   * @param {{query?:string, categoryId?:string, hobbyId?:string, region?:string,
   *          sidoId?:string, sigunguId?:string, hangoutId?:string, azitId?:string,
   *          age?:string, radius?:string, sort?:string, offset?:number, limit?:number}} options
   * @returns {{items:Array, total:number, hasMore:boolean}}
   */
  getGroupBrowse(options = {}) {
    const o = options || {};
    const q = String(o.query || '').trim().toLowerCase();
    const categoryId = o.categoryId && o.categoryId !== 'all' ? o.categoryId : 'all';
    const hobbyId = o.hobbyId && o.hobbyId !== 'all' ? o.hobbyId : 'all';
    /* Sprint 32.5 — 아지트로 가까운 모임만 (없는 id 는 전체). */
    const azitId = o.azitId && azitDef(o.azitId) ? o.azitId : 'all';
    const azit = azitId === 'all' ? null : this.findAzit(azitId);
    /* H2 — 지역(시·도 · 시·군·구) 필터와 아지트(한 곳) 필터. */
    const sidoId = o.sidoId && this.getRegionSido().some((s) => s.id === o.sidoId) ? o.sidoId : 'all';
    const sigunguId = o.sigunguId && GEO_SIGUNGU_MAP[o.sigunguId] ? o.sigunguId : 'all';
    const hangoutId = o.hangoutId && o.hangoutId !== 'all' && azitDef(o.hangoutId) ? o.hangoutId : 'all';
    const azitMatch = (g) => {
      if (azitId === 'all') return true;
      const mine = this.getGroupAzit(g);
      if (mine && mine.id === azitId) return true;
      /* 아지트를 안 골랐던 옛 모임 — 같은 권역이면 그 아지트 모임으로 본다. */
      return !mine && azit != null && this.getGroupRegionId(g) === azit.areaId;
    };
    const geoMatch = (g) => {
      if (sidoId === 'all' && sigunguId === 'all' && hangoutId === 'all') return true;
      const hs = this.getGroupHangouts(g);
      if (hangoutId !== 'all' && !hs.some((h) => h.id === hangoutId)) return false;
      if (sidoId === 'all' && sigunguId === 'all') return true;
      const area = this.getGroupRegion(g);
      if (sidoId !== 'all' && (!area || area.sidoId !== sidoId)) return false;
      if (sigunguId !== 'all' && (!area || area.sigunguId !== sigunguId)) return false;
      return true;
    };
    const regionArg = o.region || 'all';
    const regionId = regionArg === 'all' || regionArg === 'nearby'
      || isKnownRegion(regionArg) || isKnownRegionGroup(regionArg) ? regionArg : 'all';
    const radiusId = isKnownRadius(o.radius) ? o.radius : 'all';
    const age = this.getExploreAgeFilters().some((f) => f.id === o.age) ? o.age : 'all';
    const inRegion = (id) => regionFilterMatches(regionId, id);
    const nearbyOk = (km) => regionId !== 'nearby' || this.radiusAllows(String(NEARBY_KM), km);
    const mine = this.getTasteHobbyIds();
    const myCats = mine.map((id) => this.getHobbyTone(id));
    const joined = this.state.currentUser ? this.currentUser.joinedGroupIds || [] : [];

    const list = (this.state.groups || []).filter((g) => {
      const chip = this.getHobbyChip(g.hobbyId || g.category);
      if (categoryId !== 'all' && (!chip || chip.categoryId !== categoryId)) return false;
      if (hobbyId !== 'all' && g.hobbyId !== hobbyId) return false;
      if (!azitMatch(g)) return false;
      if (!geoMatch(g)) return false;
      if (!this.ageFilterAllowsGroup(age, g)) return false;
      if (!this.ageRangeAllowsGroup(g)) return false;
      if (!inRegion(this.getGroupRegionId(g))) return false;
      if (!this.radiusAllows(radiusId, this.getGroupDistanceKm(g))) return false;
      if (!nearbyOk(this.getGroupDistanceKm(g))) return false;
      if (!this.matchGroupQuery(g, q)) return false;
      return true;
    }).map((g) => {
      const chip = this.getHobbyChip(g.hobbyId || g.category);
      const sameHobby = mine.includes(g.hobbyId);
      const sameTone = !!(chip && myCats.includes(chip.tone));
      let score = sameHobby ? 3 : (sameTone ? 1 : 0);
      score += Math.min(2, Math.floor((g.memberCount || 0) / 12));
      const distanceKm = this.getGroupDistanceKm(g);
      return {
        type: 'group', id: g.id, ratio: g.ratio || 'wide', group: g,
        joined: joined.includes(g.id),
        distanceKm,
        distanceLabel: distanceBucket(distanceKm),
        tone: this.getHobbyTone(g.hobbyId || g.category),
        hobbyName: chip ? chip.name : (g.categoryName || '취미'),
        azit: this.getGroupAzit(g),
        hangouts: this.getGroupHangouts(g),
        region: this.getGroupRegion(g),
        score
      };
    });

    const sort = ['recommend', 'near', 'members', 'new', 'name'].includes(o.sort) ? o.sort : 'recommend';
    list.sort((a, b) => {
      if (sort === 'near') return ((a.distanceKm == null ? 99 : a.distanceKm) - (b.distanceKm == null ? 99 : b.distanceKm))
        || ((b.group.memberCount || 0) - (a.group.memberCount || 0));
      if (sort === 'members') return (b.group.memberCount || 0) - (a.group.memberCount || 0);
      if (sort === 'new') return new Date(b.group.createdAt || 0).getTime() - new Date(a.group.createdAt || 0).getTime();
      if (sort === 'name') return String(a.group.name).localeCompare(String(b.group.name), 'ko');
      return (b.score - a.score)
        || ((a.distanceKm || 99) - (b.distanceKm || 99))
        || ((b.group.memberCount || 0) - (a.group.memberCount || 0));
    });

    const offset = Math.max(0, Number(o.offset) || 0);
    const limit = o.limit == null ? list.length : Math.max(1, Number(o.limit));
    const items = list.slice(offset, offset + limit);
    return { items, total: list.length, hasMore: offset + items.length < list.length };
  }

  /** 홈 모임 둘러보기의 취미 대분류 칩 — [전체] + 큰틀 7개. */
  getGroupBrowseCategories() {
    return [{ id: 'all', name: '전체', icon: 'grid' }].concat(this.getHobbyCategories().map((c) => ({
      id: c.id, name: c.name.split('·')[0], icon: c.icon
    })));
  }

  /** 홈 모임 둘러보기 정렬 4종. */
  getGroupBrowseSorts() {
    return [
      { id: 'recommend', label: '추천순' },
      { id: 'near', label: '가까운순' },
      { id: 'members', label: '인원순' },
      { id: 'new', label: '새로 생긴' },
      { id: 'name', label: '이름순' }
    ];
  }

  /* ==========================================================================
   * Sprint 32.5 — '아지트' 로 모임 장소 고르기 · 아지트로 가까운 모임 찾기
   * ------------------------------------------------------------------------
   *  · 모임을 만들 때 자유 입력 대신 아지트(역·대학교·랜드마크·동네)를 고른다.
   *  · 찾는 사람은 '내 아지트 근처' 칩으로 그 아지트 모임만 본다.
   *  · 예전에 만든 모임(아지트 없음)은 지역으로 같은 권역에 묶는다 — 목록에서 사라지지 않게.
   * ========================================================================== */

  /** 아지트 종류 4가지(고르는 화면의 안내에 쓴다). */
  getAzitKinds() {
    return Object.keys(AZIT_KINDS).map((id) => ({ id, ...AZIT_KINDS[id] }));
  }

  /** 아지트 큰 분류 — 서울 12권역 + 경기·지방. 그 안에 아지트가 있는 곳만. */
  getAzitAreas() {
    return AZIT_AREAS.map((a) => {
      const group = regionGroupDef(a.groupId);
      return {
        id: a.id,
        name: a.name,
        groupId: a.groupId,
        groupName: group ? group.name : '지역',
        count: AZIT_SPOTS.filter((s) => s.areaId === a.id).length
      };
    });
  }

  /**
   * 아지트 목록 — 큰 분류·시·도·시·군·구·검색어로 좁힌다. (H2 는 getHangouts 를 쓴다 — 이 메서드는 호환용)
   * @param {{areaId?:string, query?:string, limit?:number}} options
   * @returns {Array} 아지트 표시 정보 + 내 동네 여부
   */
  getAzitSpots(options = {}) {
    /* 같은 이름의 아지트가 둘 이상이면 앞의 하나만 보여준다(공개용 사본의 가명 치환 뒤에도 목록이 깔끔하게). */
    const o = options || {};
    const q = String(o.query || '').trim().toLowerCase();
    /* 검색어가 있으면 권역을 넘어 전부에서 찾는다('성수'를 기본 권역 안에서만 뒤지지 않게). */
    const areaId = (!q && o.areaId && o.areaId !== 'all') ? o.areaId : null;
    const my = this.getMyArea();
    const list = AZIT_SPOTS.filter((s) => {
      if (s.legacy && o.includeLegacy !== true) return false;
      if (areaId && s.areaId !== areaId) return false;
      if (!q) return true;
      const hay = [s.name, ...(s.aliases || []), azitView(s).areaName].join(' ').toLowerCase();
      return hay.includes(q);
    }).map((s) => ({
      ...azitView(s),
      isMyArea: !!(my && s.sigunguId === my.sigunguId)
        || (!s.legacy && !!this.currentUser.regionId && s.areaId === this.currentUser.regionId),
      groupCount: (this.state.groups || []).filter((g) => {
        const a = this.getGroupAzit(g);
        return !!a && a.id === s.id;
      }).length
    }));
    const seen = new Set();
    const unique = list.filter((a) => {
      if (seen.has(a.name)) return false;
      seen.add(a.name);
      return true;
    });
    const limit = o.limit == null ? unique.length : Math.max(1, Number(o.limit));
    return unique.slice(0, limit);
  }

  /** 아지트 하나 찾기(모임 만들기·표시 공통). */
  findAzit(azitId) {
    return azitView(azitDef(azitId));
  }

  /** 내 동네의 첫 아지트 — '내 아지트' 기본값. 같은 시·군·구 → 같은 권역 → 성수역 순. */
  getMyAzit() {
    const u = this.currentUser || {};
    /* v34.5 (#22899) — 가입할 때 고른 아지트가 있으면 그것을 먼저 쓴다. */
    if (u.azitId) {
      const picked = azitView(azitDef(u.azitId));
      if (picked) return picked;
    }
    const area = this.getMyArea();
    const primary = AZIT_SPOTS.filter((s) => !s.legacy);
    const sameArea = area ? primary.filter((s) => s.sigunguId === area.sigunguId) : [];
    if (sameArea.length) return azitView(sameArea[0]);
    const regionId = this.currentUser.regionId || null;
    const sameRegion = primary.filter((s) => s.areaId === regionId);
    if (sameRegion.length) return azitView(sameRegion[0]);
    return azitView(primary.find((s) => s.id === 'azit-sillim') || primary[0]);
  }

  /**
   * 모임의 아지트 — 저장된 id → (옛 모임) 활동 지역 글에서 이름으로 찾기.
   * 글에도 없으면 '온라인'·null.
   */
  getGroupAzit(group) {
    if (!group) return null;
    const first = this.getGroupHangouts(group)[0];
    if (first) return first;
    const hay = String(group.location || '').toLowerCase();
    if (!hay) return null;
    const hit = AZIT_SPOTS.find((s) => hay.includes(s.name.toLowerCase())
      || (s.aliases || []).some((a) => a.length >= 2 && hay.includes(a.toLowerCase())));
    return hit ? azitView(hit) : null;
  }

  /** 홈 '모임 찾기' 의 아지트 칩 — 내 동네 먼저, 그다음 모임이 있는 아지트. */
  getAzitChips(limit = 8) {
    const my = this.getMyArea();
    const mine = this.getMyAzit();
    const rows = AZIT_SPOTS.filter((s) => !s.legacy).map((s) => {
      const view = azitView(s);
      const groupCount = (this.state.groups || []).filter((g) => {
        const a = this.getGroupAzit(g);
        return !!a && a.id === s.id;
      }).length;
      return { ...view, isMyArea: !!(my && s.sigunguId === my.sigunguId), groupCount };
    });
    rows.sort((a, b) => ((b.isMyArea ? 1 : 0) - (a.isMyArea ? 1 : 0))
      || (b.groupCount - a.groupCount)
      || (a.id === (mine && mine.id) ? -1 : 0) - (b.id === (mine && mine.id) ? -1 : 0));
    const seen = new Set();
    return rows.filter((a) => {
      if (seen.has(a.name)) return false;
      seen.add(a.name);
      return true;
    }).slice(0, Math.max(1, limit));
  }

  /** 모임 대표 이미지로 쓸 기본 프리셋 8종 — 사진이 없을 때의 점토 타일(사진 라이브러리 아님). */
  getCoverIconPresets() {
    return [
      { id: 'green-run', icon: 'run', tone: 'green', label: '러닝' },
      { id: 'violet-game', icon: 'gamepad', tone: 'violet', label: '게임' },
      { id: 'teal-book', icon: 'book', tone: 'teal', label: '독서' },
      { id: 'amber-cup', icon: 'cup', tone: 'amber', label: '카페' },
      { id: 'sky-mountain', icon: 'mountain', tone: 'sky', label: '산' },
      { id: 'coral-music', icon: 'music', tone: 'coral', label: '음악' },
      { id: 'mint-leaf', icon: 'leaf', tone: 'mint', label: '일상' },
      { id: 'neutral-star', icon: 'sparkle', tone: 'neutral', label: '취미' }
    ];
  }

  /** 프리셋 하나 */
  getCoverIconPreset(presetId) {
    return this.getCoverIconPresets().find((p) => p.id === presetId) || null;
  }

  /* ==========================================================================
   * H2 — 지역(시·도 → 시·군·구) · 아지트 1~3곳 · 거리 구간
   * ------------------------------------------------------------------------
   *  · 활동 지역은 목록에서만 고른다(직접 입력 없음).
   *  · 아지트는 지하철역·대학교·랜드마크 150곳 중 1~3곳. 정확한 주소는 받지 않는다.
   *  · 거리는 대략 좌표(소수점 3자리)로 계산하고, 화면에는 '약 1~2km' 같은 구간만 쓴다.
   * ========================================================================== */

  /** 시·도 목록 — 시·군·구 수를 함께. */
  getRegionSido() {
    return (GEO_CURRENT.regions.sido || []).map((s) => ({
      id: s.id, name: s.name, short: s.short, count: (s.sigungu || []).length
    }));
  }

  /** 한 시·도의 시·군·구 목록 */
  getRegionSigungu(sidoId) {
    const sido = (GEO_CURRENT.regions.sido || []).find((s) => s.id === sidoId);
    if (!sido) return [];
    return (sido.sigungu || []).map((g) => geoAreaView(g.id)).filter(Boolean);
  }

  /** 시·군·구 하나 */
  findSigungu(sigunguId) {
    return geoAreaView(sigunguId);
  }

  /** http 로 열렸을 때 data/regions.json · data/hangouts.json 을 다시 읽어 내장본을 맞춘다. */
  async loadGeoData() {
    const changed = await loadGeoData();
    return { ok: changed !== false, data: { regions: GEO_CURRENT.regions, hangouts: GEO_CURRENT.hangouts } };
  }

  /**
   * 내 동네(가입 때 고른 지역)의 시·군·구.
   *  저장된 areaId → 주소 글의 구 이름 → 내 아지트 순서로 찾는다.
   */
  getMyArea() {
    const u = this.currentUser || {};
    if (u.areaId && GEO_SIGUNGU_MAP[u.areaId]) return geoAreaView(u.areaId);
    const areaId = geoAreaIdFor(u.location, u.regionId)
      || (AZIT_SPOTS.find((s) => !s.legacy && s.id === 'azit-sillim') || {}).sigunguId;
    return areaId ? geoAreaView(areaId) : null;
  }

  /** 거리 계산의 기준점 — 내 동네 대표 아지트(같은 시·군·구) 아니면 시·군·구 중심. */
  getMyAnchorCoords() {
    const area = this.getMyArea();
    if (!area) return null;
    const spot = AZIT_SPOTS.find((s) => !s.legacy && s.sigunguId === area.sigunguId && s.lat != null)
      || AZIT_SPOTS.find((s) => !s.legacy && s.areaId === area.regionId && s.lat != null);
    if (spot && spot.sigunguId === area.sigunguId) return { lat: spot.lat, lng: spot.lng, name: spot.name };
    return area.lat == null ? null : { lat: area.lat, lng: area.lng, name: area.name };
  }

  /** 아지트 종류 3가지(지하철역·대학교·랜드마크) */
  getHangoutKinds() {
    return ['station', 'university', 'landmark'].map((id) => ({ id, ...AZIT_KINDS[id] }));
  }

  /**
   * 아지트 목록 — 시·도/시·군·구·검색어로 좁힌다. 4단계에서 고른 지역 후보를 먼저 보여 준다.
   * @param {{sidoId?:string, sigunguId?:string, areaId?:string, query?:string,
   *          limit?:number, includeLegacy?:boolean}} options
   */
  getHangouts(options = {}) {
    const o = options || {};
    const q = String(o.query || '').trim().toLowerCase();
    const sidoId = o.sidoId && o.sidoId !== 'all' ? o.sidoId : null;
    const sigunguId = o.sigunguId && o.sigunguId !== 'all' ? o.sigunguId : null;
    const areaId = (!q && o.areaId && o.areaId !== 'all') ? o.areaId : null;
    const my = this.getMyArea();
    return AZIT_SPOTS
      .filter((s) => {
        if (s.legacy && o.includeLegacy !== true) return false;
        if (sidoId && s.sidoId !== sidoId) return false;
        if (sigunguId && s.sigunguId !== sigunguId) return false;
        if (areaId && s.areaId !== areaId) return false;
        if (!q) return true;
        const hay = [s.name, ...(s.aliases || []), azitView(s).areaName].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .map((s) => ({
        ...azitView(s),
        isMyArea: !!(my && s.sigunguId === my.sigunguId),
        groupCount: (this.state.groups || []).filter((g) => {
          const a = this.getGroupAzit(g);
          return !!a && a.id === s.id;
        }).length
      }))
      .sort((a, b) => ((b.isMyArea ? 1 : 0) - (a.isMyArea ? 1 : 0))
        || (b.groupCount - a.groupCount)
        || ((b.id === (my && my.id) ? 1 : 0) - (a.id === (my && my.id) ? 1 : 0))
        || String(a.name).localeCompare(String(b.name), 'ko'))
      .slice(0, o.limit == null ? undefined : Math.max(1, Number(o.limit)));
  }

  /** 모임의 아지트들 — 저장된 hangouts(1~3) → 옛 azitId 순. */
  getGroupHangouts(group) {
    if (!group) return [];
    const rows = Array.isArray(group.hangouts) ? group.hangouts : [];
    const out = [];
    rows.forEach((h) => {
      const view = azitView(azitDef(typeof h === 'string' ? h : (h && h.id)));
      if (view && !out.some((x) => x.id === view.id)) out.push(view);
    });
    if (!out.length && group.azitId) {
      const view = azitView(azitDef(group.azitId));
      if (view) out.push(view);
    }
    /* H2 — 아지트 없이 저장된 옛 모임: 활동 지역 글에 아지트 이름이 있으면 그곳으로 본다. */
    if (!out.length) {
      const hit = azitFromText(group.location);
      if (hit) out.push(azitView(hit));
    }
    return out.slice(0, 3);
  }

  /**
   * v35.2 — 모임장이 활동 아지트를 바꾼다(1~3곳). 이름·종류만 저장하고 주소는 저장하지 않는다.
   * @param {string} groupId
   * @param {string[]} ids 아지트 id 목록(1~3)
   */
  updateGroupHangouts(groupId, ids) {
    if (!this.can(groupId, 'edit_group')) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    const list = [];
    (Array.isArray(ids) ? ids : []).forEach((id) => {
      const view = this.findAzit(id);
      if (view && !list.some((x) => x.id === view.id)) list.push(view);
    });
    if (!list.length) return { ok: false, reason: 'hangout' };
    if (list.length > 3) return { ok: false, reason: 'too_many_hangouts' };
    g.hangouts = list.map((h) => ({ id: h.id, name: h.name, kind: h.kind }));
    g.azitId = list[0].id;
    g.azitName = list[0].name;
    g.location = list[0].name.slice(0, 24);
    const first = list[0];
    if (first.sigunguId) {
      const area = geoAreaView(first.sigunguId);
      if (area) {
        g.region = { sidoId: area.sidoId, sidoName: area.sidoName, sigunguId: area.sigunguId, sigunguName: area.name };
      }
    }
    if (first.areaId) g.regionId = first.areaId;
    this.saveState();
    return { ok: true, group: g, hangouts: list };
  }

  /** 모임의 지역(시·도/시·군·구) — 저장된 region → 첫 아지트 → 권역 순. */
  getGroupRegion(group) {
    if (!group) return null;
    if (group.region && group.region.sigunguId) {
      const view = geoAreaView(group.region.sigunguId);
      if (view) return view;
    }
    const hs = this.getGroupHangouts(group);
    const withArea = hs.find((h) => !!h.sigunguId);
    if (withArea) return geoAreaView(withArea.sigunguId);
    const regionId = this.getGroupRegionId(group);
    const spot = AZIT_SPOTS.find((s) => !s.legacy && s.sigunguId && s.areaId === regionId);
    return spot ? geoAreaView(spot.sigunguId) : null;
  }

  /**
   * H3 — 게스트 신청 상태 한 사람분: 'pending'(승인 대기) | 'approved'(승인됨) | 'rejected'(거절) | null.
   *  · 승인되면 참석 명단(rsvps, guest:true)에 오르고, 대기 신청은 guestRequests 에 남긴다.
   */
  getMyGuestStatus(ev) {
    if (!ev) return null;
    const me = this.currentUser;
    const seated = (Array.isArray(ev.rsvps) ? ev.rsvps : [])
      .find((r) => r.memberId === me.id && r.guest === true && r.status === 'yes');
    if (seated) return 'approved';
    const req = (Array.isArray(ev.guestRequests) ? ev.guestRequests : [])
      .find((r) => r.memberId === me.id);
    return req ? req.status : null;
  }

  /** 일정의 게스트 신청 목록 — 모임장이 보는 승인 대기/처리 결과. */
  getGuestRequests(eventId) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return [];
    return (Array.isArray(ev.guestRequests) ? ev.guestRequests : []).map((r) => ({ ...r }));
  }

  /** 이 일정의 게스트 신청을 내가 처리할 수 있나 — 모임장 · (허용된) 운영진 · 일정 만든 사람. */
  canReviewGuestRequests(eventId) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return false;
    if (ev.createdBy === this.currentUser.id) return true;
    if (this.isGroupLeader(ev.groupId)) return true;
    const grp = this.getGroup(ev.groupId);
    return !!grp && grp.deputyCanModerate === true
      && Array.isArray(grp.deputyIds) && grp.deputyIds.includes(this.currentUser.id);
  }

  /**
   * 홈 '추천 일정' — **게스트 참여 가능**을 켠 일정만.
   * 모임에 가입하지 않은 사람도 참석을 **신청**할 수 있고, 모임장이 수락해야 참석이 된다(H3).
   */
  getRecommendedEvents(options = {}) {
    const o = options || {};
    const limit = o.limit == null ? 4 : Math.max(1, Number(o.limit));
    const joined = this.currentUser ? this.currentUser.joinedGroupIds || [] : [];
    return (this.state.groupEvents || [])
      .filter((e) => e && e.guestOpen === true)
      .filter((e) => new Date(e.when).getTime() > Date.now() - 60 * 1000)
      .map((e) => {
        const grp = this.getGroup(e.groupId);
        const chip = grp ? this.getHobbyChip(grp.hobbyId) : null;
        const azit = grp ? this.getGroupAzit(grp) : null;
        const summary = this.getGroupEventSummary(e.id);
        return {
          event: e,
          group: grp,
          groupName: grp ? grp.name : '모임',
          /* H3 — 추천 일정에는 아지트 이름만. 정확한 주소(place)는 넣지 않는다. */
          azitName: azit ? azit.name : '',
          azit,
          hobbyName: chip ? chip.name : (grp ? grp.categoryName : '취미'),
          tone: grp ? this.getHobbyTone(grp.hobbyId || grp.category) : 'neutral',
          joined: grp ? joined.includes(grp.id) : false,
          myRsvp: summary.myRsvp === 'yes' ? 'yes' : null,
          myGuestStatus: this.getMyGuestStatus(e),
          guestPending: summary.guestPending,
          whenLabel: summary.whenLabel
        };
      })
      .sort((a, b) => new Date(a.event.when).getTime() - new Date(b.event.when).getTime())
      .slice(0, limit);
  }

  /**
   * H3 — 게스트 참석 **신청**(가입 없이). 바로 참석이 아니라 '승인 대기'로 들어가고,
   * 모임장이 수락하면 그때 참석 명단에 오른다. 서버 없이 로컬 상태로 도는 흐름이다.
   */
  requestGuestSeat(eventId) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return { ok: false, reason: 'not_found' };
    if (ev.guestOpen !== true) return { ok: false, reason: 'guest_closed' };
    if (new Date(ev.when).getTime() < Date.now()) return { ok: false, reason: 'past' };
    if (this.isGroupJoined(ev.groupId)) return { ok: false, reason: 'member' };
    const me = this.currentUser;
    const rsvps = Array.isArray(ev.rsvps) ? ev.rsvps : [];
    const already = rsvps.find((r) => r.memberId === me.id && r.guest === true && r.status === 'yes');
    if (already) {
      return { ok: true, already: true, status: 'approved', eventId, summary: this.getGroupEventSummary(eventId) };
    }
    const requests = Array.isArray(ev.guestRequests) ? ev.guestRequests : [];
    const prev = requests.find((r) => r.memberId === me.id);
    if (prev && prev.status === 'pending') {
      return { ok: true, already: true, status: 'pending', eventId, summary: this.getGroupEventSummary(eventId) };
    }
    const capacity = Number(ev.capacity) || 0;
    const yes = rsvps.filter((r) => r.status === 'yes').length;
    if (capacity && yes >= capacity) return { ok: false, reason: 'full' };
    const entry = {
      memberId: me.id,
      name: me.nickname,
      avatarText: me.avatarText,
      gradient: me.avatarGradient,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    ev.guestRequests = requests.filter((r) => r.memberId !== me.id).concat(entry);
    this.saveState();
    return { ok: true, status: 'pending', pending: true, eventId, summary: this.getGroupEventSummary(eventId) };
  }

  /** 모임장 — 게스트 신청 수락. 자리가 있으면 참석, 정원이 찾으면 대기 1순위로 올린다. */
  approveGuestSeat(eventId, memberId) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return { ok: false, reason: 'not_found' };
    if (!this.canReviewGuestRequests(eventId)) return { ok: false, reason: 'permission' };
    const requests = Array.isArray(ev.guestRequests) ? ev.guestRequests : [];
    const req = requests.find((r) => r.memberId === memberId && r.status === 'pending');
    if (!req) return { ok: false, reason: 'no_request' };
    const rsvps = Array.isArray(ev.rsvps) ? ev.rsvps : [];
    const capacity = Number(ev.capacity) || 0;
    const yes = rsvps.filter((r) => r.status === 'yes').length;
    const status = capacity && yes >= capacity ? 'maybe' : 'yes';
    const seat = {
      memberId: req.memberId,
      name: req.name,
      avatarText: req.avatarText,
      gradient: req.gradient,
      status,
      guest: true,
      approvedAt: new Date().toISOString()
    };
    if (status === 'maybe') seat.waitingAt = new Date().toISOString();
    ev.rsvps = rsvps.filter((r) => r.memberId !== memberId).concat(seat);
    req.status = 'approved';
    req.decidedAt = new Date().toISOString();
    req.decidedBy = this.currentUser.id;
    /* v36.1 — 승인된 게스트는 그 일정 단톡방에 바로 들어간다. */
    this.ensureEventChat(eventId);
    this.saveState();
    return { ok: true, eventId, memberId, status, summary: this.getGroupEventSummary(eventId) };
  }

  /** 모임장 — 게스트 신청 거절. 신청자에게 '거절됨'으로 남는다. */
  rejectGuestSeat(eventId, memberId) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return { ok: false, reason: 'not_found' };
    if (!this.canReviewGuestRequests(eventId)) return { ok: false, reason: 'permission' };
    const req = (Array.isArray(ev.guestRequests) ? ev.guestRequests : [])
      .find((r) => r.memberId === memberId && r.status === 'pending');
    if (!req) return { ok: false, reason: 'no_request' };
    req.status = 'rejected';
    req.decidedAt = new Date().toISOString();
    req.decidedBy = this.currentUser.id;
    this.saveState();
    return { ok: true, eventId, memberId, summary: this.getGroupEventSummary(eventId) };
  }

  /** 게스트 신청 취소 — 승인 대기든, 이미 수락된 참석이든. */
  cancelGuestSeat(eventId) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return { ok: false, reason: 'not_found' };
    const me = this.currentUser;
    const before = (Array.isArray(ev.rsvps) ? ev.rsvps : []).length;
    ev.rsvps = (ev.rsvps || []).filter((r) => !(r.memberId === me.id && r.guest === true));
    const hadRequest = (Array.isArray(ev.guestRequests) ? ev.guestRequests : [])
      .some((r) => r.memberId === me.id);
    ev.guestRequests = (Array.isArray(ev.guestRequests) ? ev.guestRequests : [])
      .filter((r) => r.memberId !== me.id);
    if (ev.rsvps.length === before && !hadRequest) return { ok: false, reason: 'not_guest' };
    this.saveState();
    return { ok: true, eventId };
  }

  /**
   * 시연·데모용 — **다른 사람이** 게스트 참석을 신청한 것처럼 만든다.
   *  · 서버가 없는 지금은 모임장 화면(게스트 승인 대기)을 확인할 방법이 이것뿐이다.
   *  · 실제 서비스에서는 이 자리를 서버가 채운다(다른 사람의 신청은 내 기기에서 생기지 않는다).
   * @param {string} eventId
   * @param {{memberId?:string, name?:string, avatarText?:string, gradient?:string}|string} guest
   */
  simulateGuestRequest(eventId, guest) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return { ok: false, reason: 'not_found' };
    if (ev.guestOpen !== true) return { ok: false, reason: 'guest_closed' };
    const g = typeof guest === 'string' ? { name: guest } : (guest || {});
    const name = String(g.name || '모래').trim().slice(0, 12) || '모래';
    const memberId = g.memberId || `guest_${name}_${Date.now().toString(36)}`;
    const requests = Array.isArray(ev.guestRequests) ? ev.guestRequests : [];
    if (requests.some((r) => r.memberId === memberId && r.status === 'pending')) {
      return { ok: true, already: true, memberId, status: 'pending' };
    }
    ev.guestRequests = requests.filter((r) => r.memberId !== memberId).concat({
      memberId,
      name,
      avatarText: g.avatarText || name.charAt(0),
      gradient: g.gradient || 'linear-gradient(135deg, #0B7CAF 0%, #0369A1 100%)',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      simulated: true
    });
    this.saveState();
    return { ok: true, memberId, status: 'pending', summary: this.getGroupEventSummary(eventId) };
  }

  /**
   * 홈 '추천 피드' — 글을 쓸 때 **추천 피드에 공개해도 된다**고 고른 글만.
   * 모임 밖 사람도 보는 자리라 기본값은 꺼짐(false)이다.
   */
  getRecommendedFeed(options = {}) {
    const o = options || {};
    const limit = o.limit == null ? 6 : Math.max(1, Number(o.limit));
    return (this.state.feedPosts || [])
      /* v33.8 — 자유 피드(모임 없이 올린 글)는 showInHomeFeed 로도 받아 준다(무조건 노출). */
      .filter((p) => p && (p.recommendOptIn === true || p.showInHomeFeed === true))
      .map((p) => {
        const grp = this.getGroup(p.groupId);
        const azit = grp ? this.getGroupAzit(grp) : null;
        const hangouts = grp ? this.getGroupHangouts(grp) : [];
        const freePost = !grp;
        const regionName = freePost
          ? (p.regionName || this.getRegionLabel((this.state.currentUser || {}).regionId || '') || '')
          : '';
        return {
          post: p,
          group: grp,
          freePost,
          groupName: grp ? grp.name : '자유 피드',
          azitName: azit ? azit.name : (freePost ? (regionName || '내 동네') : ''),
          regionName,
          azit,
          hangouts,
          region: grp ? this.getGroupRegion(grp) : null,
          hobbyName: grp ? grp.categoryName : '자유 피드',
          hobbyIcon: grp ? ((this.getHobbyChip(grp.hobbyId) || {}).icon || grp.icon || 'sparkle') : 'sparkle',
          tone: grp ? this.getHobbyTone(grp.hobbyId || grp.category) : 'neutral',
          likeCount: p.likes || 0,
          likedByMe: p.likedByMe === true,
          commentCount: (p.comments || []).length,
          /* 방금 올린 글(30분 안)은 추천 순서와 상관없이 맨 위에 — 올린 사람이 바로 확인할 수 있게. */
          fresh: Date.now() - new Date(p.createdAt).getTime() < 30 * 60 * 1000,
          score: (p.likes || 0) * 2 + (p.comments || []).length * 3
        };
      })
      .sort((a, b) => ((b.fresh ? 1 : 0) - (a.fresh ? 1 : 0))
        || (b.score - a.score)
        || (new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime()))
      .slice(0, limit);
  }

  /**
   * H2 — 홈 추천 피드를 **무제한으로 이어 보는** 페이지.
   *  · 글을 다 보여 준 뒤에는 같은 글을 다른 순서로 돌려(순환) 끊김 없이 이어진다.
   *  · 같은 글이라도 카드 키(uid)가 라운드마다 달라서 목록이 중복으로 깨지지 않는다.
   *  · 라운드 상한(25)은 실수로 끝없이 그리지 않도록 둔 안전판이다(글 1개면 100장).
   * @returns {{items:Array, page:number, round:number, total:number, hasMore:boolean}}
   */
  getRecommendedFeedPage(options = {}) {
    const o = options || {};
    const limit = Math.max(1, Math.min(10, Number(o.limit) || 4));
    const page = Math.max(0, Number(o.page) || 0);
    const all = this.getRecommendedFeed({ limit: 9999 });
    const total = all.length;
    const maxRounds = 25;
    if (!total) return { items: [], page, round: 0, total: 0, hasMore: false, nextOffset: 0 };
    /* offset 이 있으면 그 자리에서 이어 붙인다(배치가 라운드 경계에서 잘려도 다음 시작이 정확). */
    const start = Math.max(0, o.offset != null ? Number(o.offset) || 0 : page * limit);
    const items = [];
    const startRound = Math.floor(start / total);
    /* 한 배치가 라운드 경계를 넘지 않게 한다 — 글 수보다 배치가 크면 첫 화면에 같은 글이 두 번 나온다. */
    const room = Math.max(0, (startRound + 1) * total - start);
    const size = Math.min(limit, room);
    for (let i = 0; i < size; i += 1) {
      const idx = start + i;
      const round = startRound;
      const src = all[(idx - round) % total];
      items.push({ ...src, uid: `${src.post.id}#${round}`, round, index: idx });
    }
    return {
      items, page, total,
      round: startRound,
      nextOffset: start + items.length,
      hasMore: (startRound + 1) < maxRounds || (start + items.length) < total * maxRounds
    };
  }

  getExploreFeed(filter = 'all', query = '', options = null, ageFilter = 'all', region = 'all', radius = 'all') {
    const kind = filter || 'all';
    const q = String(query || '').trim().toLowerCase();
    const age = this.getExploreAgeFilters().some((f) => f.id === ageFilter) ? ageFilter : 'all';
    const regionRaw = region && (region === 'all' || region === 'nearby'
      || isKnownRegion(region) || isKnownRegionGroup(region)) ? region : 'all';
    const regionId = regionRaw === 'all' || regionRaw === 'nearby'
      ? 'all' : (isKnownRegionGroup(regionRaw) ? regionRaw : (normalizeRegionId(regionRaw) || 'all'));
    const nearbyOnly = regionRaw === 'nearby';
    const radiusId = nearbyOnly ? 'all' : (isKnownRadius(radius) ? radius : 'all');
    /* 동네 id 하나 · 서울 같은 큰 분류 · 내 주변(5km) 을 같은 자로 판정한다. */
    const inRegion = (id) => regionFilterMatches(regionId, id);
    const nearbyOk = (km) => !nearbyOnly || this.radiusAllows(String(NEARBY_KM), km);
    const hobbyIds = (this.state.exploreHobbyChips || []).map((h) => h.id);
    const isHobby = hobbyIds.includes(kind);

    const people = [];
    if (kind === 'all' || kind === 'people' || isHobby) {
      /* Sprint 16 — 내가 탐색에 올린 프로필도 '사람' 카드로 보인다(내 카드 표시). */
      const myCard = this.getMyExploreProfile();
      if (myCard && (!isHobby || (myCard.hobbyIds || []).includes(kind))) {
        people.push({ type: 'person', id: myCard.id, ratio: myCard.ratio || 'mid', profile: myCard, distanceKm: 0, isMe: true });
      }
      (this.state.matchProfiles || []).forEach((p) => {
        if (isHobby && !(p.hobbyIds || []).includes(kind)) return;
        if (!this.ageFilterAllowsAge(age, p.age)) return;
        if (!this.ageRangeAllows(p.age)) return;
        if (!inRegion(this.getPersonRegionId(p))) return;
        const distanceKm = this.getPersonDistanceKm(p);
        if (!this.radiusAllows(radiusId, distanceKm)) return;
        if (!nearbyOk(distanceKm)) return;
        if (!this.matchPersonQuery(p, q)) return;
        people.push({ type: 'person', id: p.id, ratio: p.ratio || 'mid', profile: p, distanceKm });
      });
    }

    const groups = [];
    /* Sprint 22 — 탐색에는 모임이 없다(홈의 '모임 둘러보기'가 맡는다).
       홈이 모임 목록이 필요할 때만 kind === 'groups' 로 직접 부른다(getGroupBrowse). */
    if (kind === 'groups') {
      (this.state.groups || []).forEach((g) => {
        if (isHobby && g.hobbyId !== kind) return;
        if (!this.ageFilterAllowsGroup(age, g)) return;
        if (!this.ageRangeAllowsGroup(g)) return;
        if (!inRegion(this.getGroupRegionId(g))) return;
        const distanceKm = this.getGroupDistanceKm(g);
        if (!this.radiusAllows(radiusId, distanceKm)) return;
        if (!nearbyOk(distanceKm)) return;
        if (!this.matchGroupQuery(g, q)) return;
        groups.push({
          type: 'group', id: g.id, ratio: g.ratio || 'wide',
          group: g, joined: this.isGroupJoined(g.id), distanceKm
        });
      });
    }

    const posts = [];
    if (kind === 'all' || kind === 'posts' || isHobby) {
      (this.state.explorePosts || []).forEach((p) => {
        if (isHobby && p.hobbyId !== kind) return;
        if (!this.ageFilterAllowsAge(age, this.getPostAuthorAge(p))) return;
        if (!this.ageRangeAllows(this.getPostAuthorAge(p))) return;
        if (!inRegion(this.getExplorePostRegionId(p))) return;
        const distanceKm = this.getExplorePostDistanceKm(p);
        if (!this.radiusAllows(radiusId, distanceKm)) return;
        if (!nearbyOk(distanceKm)) return;
        if (!this.matchPostQuery(p, q)) return;
        posts.push({ type: 'post', id: p.id, ratio: p.ratio || 'square', post: p, distanceKm });
      });
      posts.sort((a, b) => new Date(b.post.createdAt) - new Date(a.post.createdAt));
    }

    const total = people.length + groups.length + posts.length;

    /* 한 라운드 = 세 풀을 p·g·글 순서로 엮은 목록. 라운드마다 각 풀을 다르게 회전시켜
       같은 카드가 이웃하지 않으면서도 계속 새로운 배열로 이어진다. */
    const rotate = (arr, k) => {
      if (!arr.length) return [];
      const n = ((k % arr.length) + arr.length) % arr.length;
      return arr.slice(n).concat(arr.slice(0, n));
    };
    /* 방금 내가 쓴 글은 첫 화면에서 바로 확인할 수 있게 맨 앞에 둔다. */
    const myRecent = posts.find((it) => it.post.isMine
      && Date.now() - new Date(it.post.createdAt).getTime() < 10 * MINUTE);

    const buildRound = (round) => {
      const P = rotate(people, round);
      const G = rotate(groups, round * 2 + (round ? 1 : 0));
      const T = rotate(posts, round * 3);
      const out = [];
      const n = Math.max(P.length, G.length, T.length);
      for (let i = 0; i < n; i += 1) {
        if (P[i]) out.push(P[i]);
        if (G[i]) out.push(G[i]);
        if (T[i]) out.push(T[i]);
      }
      if (round === 0 && myRecent) {
        const at = out.findIndex((it) => it.type === 'post' && it.id === myRecent.id);
        if (at > 0) out.unshift(out.splice(at, 1)[0]);
      }
      return out;
    };

    if (!options || typeof options !== 'object') {
      return buildRound(0).map((it) => Object.assign({}, it, { uid: `${it.id}#0`, round: 0 }));
    }

    if (!total) return { items: [], page: 0, hasMore: false, total: 0, round: 0 };

    const limit = Math.max(1, Math.min(40, Number(options.limit) || 12));
    const page = Math.max(0, Number(options.page) || 0);

    /* 타입/취미로 좁힌 보기(예: '취미친구' 10명)는 결과가 유한하므로 한 번에 다 보여준다.
       같은 사람이 화면에 두 번 나오는 일 없이, 필터의 의미가 유지된다.
       (무한 스크롤은 '전체' 피드와 검색 결과에 적용된다) */
    if (kind !== 'all') {
      if (page > 0) return { items: [], page, hasMore: false, total, round: 0 };
      return {
        items: buildRound(0).map((it) => Object.assign({}, it, { uid: `${it.id}#0`, round: 0 })),
        page: 0, hasMore: false, total, round: 0
      };
    }
    const roundSize = buildRound(0).length;

    /* 결과가 한 페이지에 다 들어오면(예: 검색 3건) 반복 없이 그대로 보여준다. */
    if (total <= limit) {
      if (page > 0) return { items: [], page, hasMore: false, total, round: 0 };
      return {
        items: buildRound(0).map((it) => Object.assign({}, it, { uid: `${it.id}#0`, round: 0 })),
        page: 0, hasMore: false, total, round: 0
      };
    }

    let cursor = page * limit;
    const items = [];
    while (items.length < limit) {
      const round = Math.floor(cursor / roundSize);
      const offset = cursor % roundSize;
      const roundItems = buildRound(round);
      if (!roundItems.length) break;
      const room = roundItems.length - offset;
      const take = Math.min(limit - items.length, room);
      for (let i = 0; i < take; i += 1) {
        const it = roundItems[offset + i];
        items.push(Object.assign({}, it, { uid: `${it.id}#${round}`, round }));
      }
      cursor += take;
    }
    return {
      items, page, hasMore: true, total, round: Math.floor(page * limit / roundSize)
    };
  }

  /** 검색어가 게시글 카드에 걸리는지 — 본문·말머리·작성자·취미·모임명 */
  matchPostQuery(post, q) {
    if (!q) return true;
    const hay = [
      post.caption, post.tag, post.authorName, post.hobbyLabel,
      post.groupName, post.mediaCaption
    ].join(' ').toLowerCase();
    return hay.includes(q);
  }

  getExploreStats() {
    return {
      people: this.state.matchProfiles.length,
      groups: this.state.groups.length,
      posts: (this.state.explorePosts || []).length
    };
  }

  /* ==========================================================================
   * Sprint 7 — C. 실시간 베스트(실베) 인기글
   * ------------------------------------------------------------------------
   *  11/14 22:24 사용자 지시: "디시인사이드처럼 실시간베스트 마냥 인기글을 볼 수 있는 영역".
   *
   *  · 점수 = (좋아요 + 댓글×3) ÷ (경과시간+2)^0.6 — 반응이 큰 글도 오래되면 자연히 내려간다
   *    ("실시간"의 뜻) → 같은 날 다시 열어도 순위가 지금 반응을 반영한다.
   *  · 주의 — 프라이버시: 모임 프라이빗 피드(feedPosts)는 **절대 넣지 않는다**. 실베는 공개
   *    영역이므로 공개 취미 글(explorePosts)만 후보가 된다.
   *  · 화면은 이 결과로 순위 배지(1~5위 스트립)·더보기 시트(1~10위)를 그리고, 카드를 누르면 게시글 상세로
   *    딥링크한다.
   * ======================================================================== */

  /**
   * 글 하나의 반응 점수.
   * @param {object} post
   * @param {number} [nowMs] 기준 시각(테스트에서 고정할 수 있게)
   */
  hotScoreOf(post, nowMs) {
    if (!post) return 0;
    const now = Number(nowMs) || Date.now();
    const likes = Number(post.likes) || 0;
    const comments = Array.isArray(post.comments) ? post.comments.length : 0;
    const created = new Date(post.createdAt).getTime();
    const ageHours = Number.isNaN(created) ? 24 : Math.max(0.2, (now - created) / HOUR);
    const engagement = likes + comments * 3;
    return engagement / Math.pow(ageHours + 2, 0.6);
  }

  /**
   * 실시간 베스트 목록 — 반응 점수 내림차순 + 순위 · **직전 집계 대비 순위 변동** · 열기%.
   * 11/14 22:59 사용자 지시: "아니 그냥 알림만 보내도록" — 점수 산식(좋아요+댓글×3+최신성)은 그대로,
   * 여기에 위·아래 화살표와 NEW 표시만 더한다(북마크·가입 전환 같은 가중치는 넣지 않는다).
   * @param {{limit?:number, regionId?:string, hobbyId?:string, now?:Date|number,
   *          persist?:boolean}} [options] persist=false → 직전 집계를 저장하지 않는다(테스트용)
   * @returns {Array<{rank, prevRank, delta, movement, prevAt, baseline, post, score,
   *                  likes, comments, ageHours, regionId, regionName, heat}>}
   */
  getHotPosts(options) {
    const o = options || {};
    const limit = Math.max(1, Math.min(20, Number(o.limit) || 5));
    const now = o.now instanceof Date ? o.now.getTime() : (Number(o.now) || Date.now());
    const region = o.regionId && o.regionId !== 'all'
      && (isKnownRegion(o.regionId) || isKnownRegionGroup(o.regionId) || o.regionId === 'nearby')
      ? o.regionId : 'all';
    const hobby = o.hobbyId || null;
    const persist = o.persist !== false;
    const scope = this.hotScopeOf(region, hobby);

    const ranked = this.rankHotPosts(now, { regionId: region, hobbyId: hobby });
    const top = ranked.length ? ranked[0].score : 0;
    const currentRanks = {};
    ranked.slice(0, HOT_SNAPSHOT_DEPTH).forEach((it, i) => { currentRanks[it.post.id] = i + 1; });

    /* 직전 집계 — 저장된 스냅샷이 없으면 '3시간 전' 집계를 기준선으로 쓴다.
       3시간 전에 없던 글은 NEW, 그때보다 올랐으면 위 화살표, 내렸으면 아래 화살표. */
    if (!this.state.hotRankSnapshots || typeof this.state.hotRankSnapshots !== 'object') {
      this.state.hotRankSnapshots = {};
    }
    const snapshot = this.state.hotRankSnapshots[scope];
    const hasSnapshot = !!(snapshot && snapshot.ranks && Object.keys(snapshot.ranks).length);
    let prevRanks;
    let prevAt;
    if (hasSnapshot) {
      prevRanks = snapshot.ranks;
      prevAt = snapshot.at;
    } else {
      const baseAt = now - HOT_BASELINE_HOURS * HOUR;
      prevAt = new Date(baseAt).toISOString();
      prevRanks = {};
      this.rankHotPosts(baseAt, { regionId: region, hobbyId: hobby })
        .slice(0, HOT_SNAPSHOT_DEPTH)
        .forEach((it, i) => { prevRanks[it.post.id] = i + 1; });
    }

    const items = ranked.slice(0, limit).map((it, i) => {
      const rank = i + 1;
      const prevRank = prevRanks[it.post.id] || null;
      const delta = prevRank ? prevRank - rank : 0;
      const movement = !prevRank ? 'new' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
      return Object.assign({}, it, {
        rank, prevRank, delta, movement, prevAt, baseline: !hasSnapshot,
        heat: top > 0 ? Math.max(1, Math.round((it.score / top) * 100)) : 0
      });
    });

    if (persist) {
      /* 직전 집계는 10분간 고정한다 — 스트립/시트를 다시 그린다고 방금 본 화살표가 사라지면 안 된다. */
      const snapshotAge = hasSnapshot ? now - new Date(snapshot.at).getTime() : Infinity;
      if (!hasSnapshot || snapshotAge > HOT_SNAPSHOT_TTL) {
        this.state.hotRankSnapshots[scope] = {
          at: new Date(now).toISOString(),
          ranks: currentRanks
        };
        this.saveState();
      }
    }
    return items;
  }

  /** 실베 집계의 범위 키 — 지역·취미별로 순위를 따로 기억한다. */
  hotScopeOf(regionId, hobbyId) {
    return `${regionId && regionId !== 'all' ? regionId : 'all'}|${hobbyId || 'all'}`;
  }

  /**
   * 과거(또는 현재) 시점의 점수 — 그 시각에 아직 없던 글은 null.
   * 댓글은 작성 시각을 보아 그 시점까지 달린 것만 센다(좋아요는 시각 기록이 없어 현재 값을 쓴다).
   */
  hotScoreAsOf(post, atMs) {
    if (!post) return null;
    const at = Number(atMs) || Date.now();
    const created = new Date(post.createdAt).getTime();
    if (Number.isNaN(created)) return 0;
    if (created > at) return null;
    const likes = Number(post.likes) || 0;
    const comments = (Array.isArray(post.comments) ? post.comments : [])
      .filter((c) => {
        const t = new Date(c && c.createdAt).getTime();
        return !Number.isNaN(t) && t <= at;
      }).length;
    const ageHours = Math.max(0.2, (at - created) / HOUR);
    return (likes + comments * 3) / Math.pow(ageHours + 2, 0.6);
  }

  /**
   * 실베 순위 계산(지역·취미 필터 포함). 공개 글(explorePosts)만 후보 — 모임 피드 제외.
   * @returns {Array<{post, score, likes, comments, ageHours, regionId, regionName}>}
   */
  rankHotPosts(atMs, options) {
    const o = options || {};
    const at = Number(atMs) || Date.now();
    const region = o.regionId && o.regionId !== 'all'
      && (isKnownRegion(o.regionId) || isKnownRegionGroup(o.regionId) || o.regionId === 'nearby')
      ? o.regionId : 'all';
    const hobby = o.hobbyId || null;
    const list = [];
    (this.state.explorePosts || []).forEach((post) => {
      const score = this.hotScoreAsOf(post, at);
      if (score == null) return;                       // 그 시각에 아직 없던 글
      const regionId = this.getExplorePostRegionId(post);
      if (!regionFilterMatches(region, regionId)) return;
      if (region === 'nearby' && !this.radiusAllows(String(NEARBY_KM), this.getExplorePostDistanceKm(post))) return;
      if (hobby && post.hobbyId !== hobby) return;
      const meta = this.getRegion(regionId);
      list.push({
        post,
        score,
        likes: Number(post.likes) || 0,
        comments: Array.isArray(post.comments) ? post.comments.length : 0,
        ageHours: Math.max(0, (at - new Date(post.createdAt).getTime()) / HOUR),
        regionId,
        regionName: meta ? meta.name : null
      });
    });
    list.sort((a, b) => (b.score - a.score)
      || (new Date(b.post.createdAt) - new Date(a.post.createdAt)));
    return list;
  }

  /**
   * 첫 실행 기준선 — **지금 이미 Top 10 안에 있는 내 글**을 알림 없이 조용히 기록한다.
   * 11/15 01:18 사용자 지시: "1. 그냥 조용히 넘어가".
   *  · 앱을 처음 켜면 시드/과거 반응으로 이미 실베 안에 들어와 있는 내 글이 있다.
   *    그걸 그대로 '진입 알림'으로 보내면 첫 화면부터 알림이 터진다 → 기준선으로만 기록.
   *  · 기준선에 오른 글은 book 항목에 `baseline: true`, `notifiedAt: null` 로 남는다
   *    (알림이 아니라 '이미 알고 있던 상태'). 이후 **새로** Top 10에 들어올 때만 알림.
   *  · 내려갔다가 다시 올라오면 그때는 새 진입이라 알린다(기존 규칙 유지).
   * @param {{topN?:number, now?:Date|number, reason?:string}} [options]
   * @returns {{at:string, topN:number, count:number, ids:string[], reason:string}}
   */
  primeHotEntryBaseline(options) {
    const o = options || {};
    const topN = Math.max(1, Math.min(HOT_SNAPSHOT_DEPTH, Number(o.topN) || HOT_ENTRY_TOP_N));
    const nowDate = o.now instanceof Date ? o.now : new Date(Number(o.now) || Date.now());
    const uid = this.state.currentUser.id;
    const list = this.getHotPosts({ limit: topN, persist: false, now: o.now });
    if (!this.state.hotEntryState || typeof this.state.hotEntryState !== 'object') {
      this.state.hotEntryState = {};
    }
    const book = this.state.hotEntryState;
    const ids = [];
    list.forEach((it) => {
      const p = it.post;
      if (!(p.isMine || p.authorId === uid)) return;
      const prev = book[p.id] || {};
      ids.push(p.id);
      book[p.id] = {
        inside: true,
        rank: it.rank,
        baseline: true,
        notifiedAt: prev.notifiedAt || null,   /* 기준선은 알림이 아니다 */
        seenAt: nowDate.toISOString()
      };
    });
    this.state.hotEntryBaseline = {
      at: nowDate.toISOString(),
      topN,
      count: ids.length,
      ids,
      reason: o.reason || 'first_run'
    };
    this.saveState();
    return this.state.hotEntryBaseline;
  }

  /** 첫 실행 기준선 기록(없으면 null) — 화면 안내·점검용. */
  getHotEntryBaseline() {
    return this.state.hotEntryBaseline && typeof this.state.hotEntryBaseline === 'object'
      ? this.state.hotEntryBaseline : null;
  }

  /** 기준선을 지우고 다시 잡게 한다(다음 확인 때 조용히 새 기준선). */
  resetHotEntryBaseline() {
    this.state.hotEntryBaseline = null;
    this.state.hotEntryState = {};
    this.saveState();
    return true;
  }

  /**
   *   내 글이 실베(기본 10위) 안에 들어왔는지 확인하고, 새로 들어온 글만 알림을 보낸다.
   * 11/14 22:59 사용자 지시: "내 글이 실베에 오르면 알림만 발송".
   * 11/15 00:23 사용자 지시: "알림은 탑10에 들때 1회" → 진입 기준 5위 → **10위**.
   * · 진입 판정은 **전체 실베** 기준이다 — 화면에서 지역이나 반경을 바궈 보더라도
   *   같은 글로 다시 알리지 않는다(알림의 순위도 전체 기준).
   * · 실베 스트립·더보기 시트의 목록도 반경 필터와 무관하게 전체/지역 기준을 유지한다.
   * · 같은 글로 반복해 알리지 않는다(내려간 뒤 다시 올라오면 그때 다시 알린다).
   * · 실제 진입(반응이 붙어 순위가 오른 경우)과 시뮬레이션 트리거가 같은 경로를 쓴다.
   * @param {{topN?:number, now?:Date|number, persist?:boolean}} [options]
   * @returns {{entered:Array<object>, results:Array<object>, topN:number, silent?:number,
   *            baseline?:object|null}}
   */
  checkHotEntryNotifications(options) {
    const o = options || {};
    const topN = Math.max(1, Math.min(HOT_SNAPSHOT_DEPTH, Number(o.topN) || HOT_ENTRY_TOP_N));
    /* 11/15 01:18 "1. 그냥 조용히 넘어가" — 첫 확인은 기준선만 조용히 기록하고 아무 것도 보내지 않는다. */
    if (!this.state.hotEntryBaseline) {
      const base = this.primeHotEntryBaseline({ topN, now: o.now, reason: 'first_run' });
      return { entered: [], results: [], topN, silent: base.count, baseline: base };
    }
    const uid = this.state.currentUser.id;
    const list = this.getHotPosts({ limit: topN, persist: o.persist, now: o.now });
    if (!this.state.hotEntryState || typeof this.state.hotEntryState !== 'object') {
      this.state.hotEntryState = {};
    }
    const book = this.state.hotEntryState;
    const insideNow = new Set();
    const entered = [];
    list.forEach((it) => {
      const p = it.post;
      if (!(p.isMine || p.authorId === uid)) return;
      insideNow.add(p.id);
      const prev = book[p.id];
      if (prev && prev.inside) {
        book[p.id] = { ...prev, inside: true, rank: it.rank };
        return;
      }
      const res = this.dispatchNotification({
        kind: 'hot_entry',
        category: 'hot',
        title: '실시간 베스트 진입',
        body: `내 글이 실베 ${it.rank}위에 올랐어요 · 좋아요 ${it.likes} · 댓글 ${it.comments}`,
        postId: p.id,
        source: 'explore',
        action: 'hot_entry',
        now: o.now instanceof Date ? o.now : undefined
      });
      book[p.id] = { inside: true, rank: it.rank, baseline: false, notifiedAt: new Date().toISOString() };
      entered.push({ post: p, rank: it.rank, result: res });
    });
    let released = false;
    Object.keys(book).forEach((id) => {
      if (!insideNow.has(id) && book[id] && book[id].inside) {
        book[id] = { ...book[id], inside: false };
        released = true;
      }
    });
    if (entered.length || released) this.saveState();
    return { entered: entered.map((e) => e.post), results: entered.map((e) => e.result), topN };
  }

  /**
   * 실베 진입 시뮬레이션 — 내 최신 공개 글에 반응이 몰린 상황을 만들어 10위 안으로 밀어 넣고
   * 실제 이벤트와 같은 경로(dispatchNotification)로 알림을 보낸다.
   * · 알림 설정의 시험 버튼으로 쓰이므로, 그 글의 진입 기록을 한 번 지우고 다시 판정한다.
   *   (이미 Top 10 안에 있는 글이라도 눌러서 알림이 오는지 확인할 수 있어야 한다.)
   */
  simulateHotEntry(options) {
    const mine = this.getMyExplorePosts()
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!mine.length) return { ok: false, reason: 'no_post' };
    /* 시험 버튼도 '첫 실행 기준선'을 먼저 잡는다 — 기준선이 없으면 알림 대신 기준선만 잡혀 시험이 되지 않는다. */
    if (!this.state.hotEntryBaseline) this.primeHotEntryBaseline();
    const post = mine[0];
    post.likes = (Number(post.likes) || 0) + 6;
    if (!Array.isArray(post.comments)) post.comments = [];
    SIMULATED_PERSONAS.slice(0, 2).forEach((persona, i) => {
      post.comments.push({
        id: `pc_hot_${Date.now()}_${i}`,
        authorId: persona.id,
        authorName: persona.name,
        text: i === 0 ? '이거 보고 저도 해보고 싶어졌어요' : '형 진짜 꾸준하다… 존경합니다',
        createdAt: new Date().toISOString()
      });
    });
    this.saveState();
    /* 시험 버튼이므로 이 글의 진입 기록을 지우고 다시 판정한다. */
    if (this.state.hotEntryState) delete this.state.hotEntryState[post.id];
    const res = this.checkHotEntryNotifications(options);
    const list = this.getHotPosts({ limit: HOT_ENTRY_TOP_N, persist: false });
    const hit = list.find((it) => it.post.id === post.id);
    return {
      ok: true, post, rank: hit ? hit.rank : null,
      entered: res.entered, res: res.results[0] || null
    };
  }

  /* ==========================================================================
   * 공개 취미 게시글 (Sprint 4) — 탐색 피드의 세 번째 카드
   * ======================================================================== */
  getExplorePost(postId) {
    return (this.state.explorePosts || []).find((p) => p.id === postId) || null;
  }

  /** 게시글 좋아요 토글 — 화면의 하트 애니메이션을 위해 결과를 돌려준다. */
  toggleExplorePostLike(postId) {
    const post = this.getExplorePost(postId);
    if (!post) return null;
    post.likedByMe = !post.likedByMe;
    post.likes = Math.max(0, post.likes + (post.likedByMe ? 1 : -1));
    this.saveState();
    return { liked: post.likedByMe, likes: post.likes };
  }

  addExplorePostComment(postId, text, options = {}) {
    const post = this.getExplorePost(postId);
    const body = String(text || '').trim();
    if (!post || !body) return null;
    if (!Array.isArray(post.comments)) post.comments = [];
    /* Sprint 33 — 경계가 같은 commentId 로 다시 부르면 그 댓글을 돌려준다(중복 없음). */
    const wanted = options && options.commentId;
    if (wanted) {
      const already = post.comments.find((c) => c.id === wanted);
      if (already) return already;
    }
    const comment = {
      id: wanted || `pc_${postId}_${Date.now()}`,
      authorId: this.state.currentUser.id,
      authorName: this.state.currentUser.nickname,
      text: body.slice(0, 200),
      createdAt: new Date().toISOString()
    };
    post.comments.push(comment);
    this.saveState();
    return comment;
  }

  /**
   * 탐색 피드에 공개 취미 글을 쓴다.
   * @param {{hobbyId:string, caption:string, photoUrl?:string,
   *          mediaCaption?:string, tag?:string, ratio?:'wide'|'square'}} data
   * @returns {{ok:boolean, reason?:string, post?:object}}
   */
  createExplorePost(data) {
    const d = data || {};
    /* Sprint 23 — 탐색은 지역 게시판이다. **지역이 필수**이고 취미는 강제하지 않는다.
       (옛 호출부 호환: hobbyId 가 와도 지역이 있으면 그대로 받는다 — 배지에만 쓰인다.) */
    const regionId = normalizeRegionId(d.regionId)
      || normalizeRegionId(this.state.currentUser.regionId)
      || 'seoul-seongsu';
    if (!isKnownRegion(regionId)) return { ok: false, reason: 'region' };
    const chip = this.getHobbyChip(d.hobbyId);
    const style = meetStyleDef(d.meetStyle);
    const caption = String(d.caption || '').trim();
    /* Sprint 17 — 앨범·카메라 사진(Data URL)도 오픈 글 사진이 된다. */
    const rawPhoto = String(d.photoUrl || '').trim();
    const photoUrl = /^data:image\//i.test(rawPhoto) || /^https?:\/\//i.test(rawPhoto) ? rawPhoto : null;
    if (!caption && !photoUrl) return { ok: false, reason: 'empty' };
    const user = this.state.currentUser;
    const post = {
      id: `pub_${Date.now()}`,
      regionId,
      meetStyle: style ? style.id : null,
      meetStyleLabel: style ? style.name : null,
      authorId: user.id,
      authorName: user.nickname,
      authorAvatarText: user.avatarText || user.nickname.charAt(0),
      authorGradient: user.avatarGradient,
      authorPhotoUrl: user.photoUrl || null,
      hobbyId: chip ? chip.id : null,
      hobbyLabel: chip ? chip.name : (style ? style.name : '지역만남'),
      hobbyIcon: chip ? chip.icon : '',
      /* Sprint 23 — 모임과 무관하게 올리는 '동네 글' */
      scope: 'region',
      tag: String(d.tag || '').trim().slice(0, 8) || (style ? style.name : null),
      caption: caption.slice(0, 300),
      photoUrl,
      mediaCaption: String(d.mediaCaption || '').trim().slice(0, 40),
      ratio: d.ratio === 'wide' ? 'wide' : 'square',
      groupName: this.getRegionLabel(regionId),
      likes: 0,
      likedByMe: false,
      comments: [],
      createdAt: new Date().toISOString(),
      isMine: true
    };
    this.state.explorePosts.unshift(post);
    this.saveState();
    return { ok: true, post };
  }

  /* ==========================================================================
   * 1:1 인앱 대화 (Sprint 4)
   * ======================================================================== */
  getChatMessages(roomId) {
    const room = this.getChatRoom(roomId);
    return room && Array.isArray(room.messages) ? room.messages : [];
  }

  /** 메시지 전송 — 빈 문자열은 무시. 대화방 목록의 마지막 메시지도 함께 갱신한다.
   *  Sprint 32 — `options.pendingId` 를 주면 **이미 화면에 띄운 '전송 중' 말풍선**을 확정한다
   *  (경계 `dm.send` 를 지나온 뒤). 같은 id 라 화면이 다시 그려져도 자리가 그대로다. */
  sendChatMessage(roomId, text, options = {}) {
    const room = this.getChatRoom(roomId);
    const body = String(text || '').trim();
    if (!room || !body) return null;
    if (!Array.isArray(room.messages)) room.messages = [];
    const pendingId = options && options.pendingId;
    if (pendingId) {
      const pending = room.messages.find((m) => m.id === pendingId);
      if (pending) {
        pending.pending = false;
        pending.queued = false;
        pending.at = new Date().toISOString();
        pending.text = body.slice(0, 500);
        room.lastMessage = pending.text;
        room.lastTime = '방금';
        room.unreadCount = 0;
        room.isNewMatch = false;
        this.saveState();
        return pending;
      }
    }
    const message = {
      id: `msg_${Date.now()}`,
      from: 'me',
      text: body.slice(0, 500),
      at: new Date().toISOString()
    };
    room.messages.push(message);
    room.lastMessage = message.text;
    room.lastTime = '방금';
    room.unreadCount = 0;
    room.isNewMatch = false;
    this.saveState();
    return message;
  }

  /** Sprint 32 — 경계를 지나기 전에 화면에 먼저 띄우는 '전송 중' 말풍선(낙관적 업데이트). */
  createPendingChatMessage(roomId, text) {
    const room = this.getChatRoom(roomId);
    const body = String(text || '').trim().slice(0, 500);
    if (!room) return { ok: false, reason: 'not_found' };
    if (!body) return { ok: false, reason: 'empty' };
    if (!Array.isArray(room.messages)) room.messages = [];
    const message = {
      id: `pm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      from: 'me',
      text: body,
      at: new Date().toISOString(),
      pending: true
    };
    room.messages.push(message);
    room.unreadCount = 0;
    room.isNewMatch = false;
    this.saveState();
    return { ok: true, message };
  }

  /** 전송 실패 — 낙관적으로 띄운 말풍선을 거두고 방의 마지막 메시지를 원래대로 되돌린다. */
  dropPendingChatMessage(roomId, messageId) {
    const room = this.getChatRoom(roomId);
    if (!room || !Array.isArray(room.messages)) return { ok: false, reason: 'not_found' };
    const idx = room.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return { ok: false, reason: 'not_found' };
    const [removed] = room.messages.splice(idx, 1);
    const last = room.messages[room.messages.length - 1] || null;
    room.lastMessage = last ? last.text : '';
    room.lastTime = last ? '방금' : '';
    this.saveState();
    return { ok: true, removed };
  }

  /**
   * Sprint 33 — 전송 실패: 말풍선을 **남기고** '실패'로 표시한다.
   *  (32일차까지는 말풍선을 거두고 입력창에 되돌렸다. 루키 님은 말풍선 옆 '재전송' 버튼을 골랐다 — 11/21 `#20892` 4번 '후자'.)
   *  화면은 `failed` 인 말풍선 옆에 재전송 버튼을 그린다.
   */
  markPendingChatMessageFailed(roomId, messageId) {
    const room = this.getChatRoom(roomId);
    if (!room || !Array.isArray(room.messages)) return { ok: false, reason: 'not_found' };
    const message = room.messages.find((m) => m.id === messageId);
    if (!message) return { ok: false, reason: 'not_found' };
    message.pending = false;
    message.queued = false;
    message.failed = true;
    this.saveState();
    return { ok: true, message };
  }

  /** 재전송 준비 — 실패 표시를 지우고 다시 '전송 중'으로 되돌린다. */
  retryPendingChatMessage(roomId, messageId) {
    const room = this.getChatRoom(roomId);
    if (!room || !Array.isArray(room.messages)) return { ok: false, reason: 'not_found' };
    const message = room.messages.find((m) => m.id === messageId);
    if (!message) return { ok: false, reason: 'not_found' };
    message.failed = false;
    message.pending = true;
    this.saveState();
    return { ok: true, message };
  }

  /** 오프라인 큐에 들어간 말(=경계가 큐에 넣고 성공으로 답한 경우) — '전송 대기'로 표시한다. */
  markQueuedChatMessage(roomId, messageId) {
    const room = this.getChatRoom(roomId);
    if (!room || !Array.isArray(room.messages)) return { ok: false, reason: 'not_found' };
    const message = room.messages.find((m) => m.id === messageId);
    if (!message) return { ok: false, reason: 'not_found' };
    message.pending = false;
    message.queued = true;
    this.saveState();
    return { ok: true, message };
  }

  /** 연결이 돌아와 큐를 다 비웠을 때 — 남아 있던 '전송 대기' 표시를 모두 지운다. */
  clearQueuedChatMessages() {
    let cleared = 0;
    const rooms = (this.state.chatRooms || []);
    rooms.forEach((room) => (room.messages || []).forEach((m) => {
      if (m.queued) { m.queued = false; cleared += 1; }
    }));
    (this.state.groupChats || []).forEach((chat) => (chat.messages || []).forEach((m) => {
      if (m.queued) { m.queued = false; cleared += 1; }
    }));
    if (cleared) this.saveState();
    return cleared;
  }

  /** 상대의 취미에 맞는 웰컴 답장 문구를 고른다(같은 문구가 연속되지 않게 순환). */
  buildChatReply(room) {
    const profile = this.getPersonProfile(room.partnerId) || {};
    const hay = `${room.partnerHobby || ''} ${profile.hobbyStyle || ''} ${profile.hobbyLabel || ''}`;
    let best = null;
    let bestHit = 0;
    (this.state.chatReplyPools || []).forEach((pool) => {
      const hit = (pool.match || []).filter((m) => hay.includes(m)).length;
      if (hit > bestHit) { best = pool; bestHit = hit; }
    });
    const replies = best && bestHit > 0
      ? best.replies
      : [
        '반가워요! 편하게 말 걸어주세요',
        '좋아요! 시간 맞춰보면 좋을 것 같아요',
        '그 취미 저도 좋아해요. 자세히 들려주세요!'
      ];
    const previous = (room.messages || []).filter((m) => m.from === 'them').length;
    return replies[previous % replies.length];
  }

  /**
   * 상대의 답장 도착(웰컴 인터랙션). 화면에서 1~2초 뒤 호출한다.
   * @param {string} roomId
   * @param {{active?:boolean}} options active=true 면 그 대화방을 보고 있는 중이므로
   *        미읽음으로 세지 않는다.
   */
  receiveChatMessage(roomId, options) {
    const room = this.getChatRoom(roomId);
    if (!room) return null;
    if (!Array.isArray(room.messages)) room.messages = [];
    const message = {
      id: `msg_${Date.now()}_r`,
      from: 'them',
      text: this.buildChatReply(room),
      at: new Date().toISOString()
    };
    room.messages.push(message);
    room.lastMessage = message.text;
    room.lastTime = '방금';
    if (!(options && options.active)) {
      room.unreadCount = (room.unreadCount || 0) + 1;
    }
    this.saveState();
    return message;
  }

  /** 대화방을 열어 읽으면 미읽음·새 매칭 배지를 지운다. */
  markChatRoomRead(roomId) {
    const room = this.getChatRoom(roomId);
    if (!room) return false;
    const changed = room.unreadCount > 0 || room.isNewMatch;
    room.unreadCount = 0;
    room.isNewMatch = false;
    if (changed) this.saveState();
    return true;
  }

  /* ==========================================================================
   * 프로필 · 모임 (Sprint 4)
   * ======================================================================== */
  getHobbyChip(hobbyId) {
    return this.getHobbyChips().find((h) => h.id === hobbyId) || null;
  }

  /**
   * v33.5 — 모임 이름·한 줄 소개에서 취미를 찾아 추천한다(2단계 '취미 선택').
   *  · 긴 말이 이기고(보드게임 > 게임), 같으면 앞에 나온 말이 이긴다.
   *  · 세부 취미까지 찾으면 scope:'hobby', 대분류만 찾으면 scope:'category'.
   *  · 아무것도 못 찾으면 { ok:false, reason:'no_match' } — 화면은 추천을 그리지 않는다.
   * @returns {{ok:boolean, reason?:string, scope?:string, keyword?:string,
   *   hobbyId?:string|null, hobbyName?:string|null, categoryId?:string, categoryName?:string,
   *   alts?:Array<object>}}
   */
  suggestHobbyFromText(text) {
    const raw = normalizeSuggestText(text);
    if (!raw) return { ok: false, reason: 'empty' };

    const hits = [];
    HOBBY_SUGGEST_INDEX.forEach((row, order) => {
      const at = findSuggestKeyword(raw, row.k);
      if (at < 0) return;
      hits.push({ k: row.k, hobbyId: row.hobbyId, at, order });
    });

    /* 취미별로 묶는다 — **그 취미에서 가장 구체적인 말**(긴 말)이 그 취미의 점수,
       인용할 말은 **앞에 나온 말**.“롤 … 하스스톤”은 둘 다 PC·e스포츠라 ‘롤’을 인용한다. */
    const groups = [];
    hits.forEach((hit) => {
      let g = groups.find((x) => x.hobbyId === hit.hobbyId);
      if (!g) {
        g = { hobbyId: hit.hobbyId, score: hit.k.length, at: hit.at, quote: hit, order: hit.order };
        groups.push(g);
        return;
      }
      if (hit.k.length > g.score) g.score = hit.k.length;
      if (hit.at < g.quote.at || (hit.at === g.quote.at && hit.k.length > g.quote.k.length)) g.quote = hit;
      if (hit.at < g.at) g.at = hit.at;
    });
    groups.sort((a, b) => (b.score - a.score) || (a.at - b.at) || (a.order - b.order));

    /* 같은 말이 두 취미에 걸리면(반려식물 → 반려동물·식물) 둘 다 후보로 남긴다. */
    const alts = [];
    groups.forEach((g) => {
      if (alts.length >= 3) return;
      const chip = this.getHobbyChip(g.hobbyId);
      if (!chip) return;
      if (alts.some((a) => a.hobbyId === chip.id)) return;
      alts.push({
        hobbyId: chip.id, hobbyName: chip.name, categoryId: chip.categoryId,
        categoryName: chip.categoryName, keyword: g.quote.k
      });
    });

    if (alts.length) {
      const top = alts[0];
      return {
        ok: true, scope: 'hobby', keyword: top.keyword,
        hobbyId: top.hobbyId, hobbyName: top.hobbyName,
        categoryId: top.categoryId, categoryName: top.categoryName,
        alts: alts.slice(1)
      };
    }

    /* 세부 취미가 아니라 대분류만 걸리는 말('여행', '스포츠') */
    let catHit = null;
    HOBBY_SUGGEST_CATEGORIES.forEach((row) => {
      row.keywords.forEach((k) => {
        const at = findSuggestKeyword(raw, k);
        if (at < 0) return;
        const len = String(k).length;
        if (!catHit || len > catHit.len || (len === catHit.len && at < catHit.at)) {
          catHit = { categoryId: row.categoryId, keyword: k, at, len };
        }
      });
    });
    if (catHit) {
      const cat = HOBBY_TAXONOMY.find((c) => c.id === catHit.categoryId);
      if (cat) {
        return {
          ok: true, scope: 'category', keyword: catHit.keyword,
          hobbyId: null, hobbyName: null,
          categoryId: cat.id, categoryName: cat.name, alts: []
        };
      }
    }
    return { ok: false, reason: 'no_match' };
  }

  /* ==========================================================================
   * Sprint 21 — 취미 분류 체계 · 직접 쓴 취미 · 취향 · 추천 모임 · 가이드
   * ------------------------------------------------------------------------
   *  11/16 18:42 사용자: "큰틀인 윤동, 게임, 독서, 맛집, 여행 등 넣고 안에 세부적인것좀
   *  채워주고 없는거는 이용자가 작성하게끔" · "당신의 취미는 무엇인가요? 나 우그에서 어떤걸
   *  해보고 싶나요?" · "홈 탭 하단에 추천 모임이 뜨도록".
   *  · 모든 화면(필터·프로필·모임 개설·오픈 글)은 getHobbyChips() 하나만 본다.
   *  · 추천은 **내가 고른 취미/해보고 싶은 취미**를 1순위, 같은 대분류를 2순위로 본다.
   * ======================================================================== */

  /** 지금 쓸 수 있는 모든 취미 — 기본 42종 + 이용자가 직접 쓴 취미. */
  getHobbyChips() {
    const custom = (this.state.customHobbies || []).map((h) => ({
      id: h.id,
      name: h.name,
      icon: h.icon || 'sparkle',
      categoryId: h.categoryId || 'daily',
      categoryName: h.categoryName || '일상·기타',
      tone: h.tone || this.getHobbyTone(h.categoryId === 'daily' ? 'pet' : h.categoryId),
      custom: true
    }));
    return (this.state.exploreHobbyChips || []).concat(custom);
  }

  /** 대분류 7개 — 각각의 세부 취미(이용자가 쓴 것 포함)를 함께 돌려준다. */
  getHobbyCategories() {
    const cats = HOBBY_TAXONOMY.map((cat) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      tone: cat.tone,
      hobbies: cat.hobbies.map((h) => ({
        id: h.id, name: h.name, icon: h.icon, core: h.core === true,
        categoryId: cat.id, categoryName: cat.name, tone: cat.tone
      }))
    }));
    (this.state.customHobbies || []).forEach((h) => {
      const cat = cats.find((c) => c.id === h.categoryId) || cats[cats.length - 1];
      cat.hobbies.push({
        id: h.id, name: h.name, icon: h.icon || 'sparkle',
        categoryId: cat.id, categoryName: cat.name, tone: cat.tone, custom: true
      });
    });
    return cats;
  }

  /** 옛 칩 8종(핵심 취미) — 탐색 필터의 첫 줄에 놓인다. */
  getCoreHobbyChips() {
    return (this.state.exploreHobbyChips || []).filter((h) => h.core === true);
  }

  /** 취미 id → 점토 색조 키(운동=green · 게임=violet …). 모르는 id 는 neutral. */
  getHobbyTone(hobbyId) {
    const chip = (this.state.exploreHobbyChips || []).find((h) => h.id === hobbyId)
      || (this.state.customHobbies || []).find((h) => h.id === hobbyId);
    if (chip && chip.tone) return chip.tone;
    const cat = HOBBY_TAXONOMY.find((c) => c.id === hobbyId);
    /* 대분류표에도 없으면 초록으로 떨어뜨리지 않고 중립(--cat-neutral)으로 —
       모르는 취미가 '운동'과 같은 색이 되어 오해를 사던 것을 없앤다. */
    return cat ? cat.tone : 'neutral';
  }

  /** 색조의 실제 색 — CSS 카테고리 토큰 이름만 돌려준다(색 값을 JS 에 두지 않는다). */
  getHobbyToneColors(hobbyId) {
    const tone = this.getHobbyTone(hobbyId);
    const n = TONE_CAT[tone];
    const key = n ? `--cat-${n}` : '--cat-neutral';
    return {
      tone,
      category: n || 0,
      from: `var(${key}-soft)`,
      to: `color-mix(in srgb, var(${key}) 38%, var(--bg-base))`,
      ink: `var(${key})`,
      chip: `var(${key}-soft)`
    };
  }

  /** 사진이 없는 모임 표지에 쓸 취미 색조 그라디언트. */
  getHobbyCoverGradient(hobbyId) {
    const c = this.getHobbyToneColors(hobbyId);
    return `linear-gradient(152deg, ${c.from} 0%, ${c.to} 100%)`;
  }

  /**
   * 목록에 없는 취미를 이용자가 직접 쓴다.
   *  · 같은 이름(공백·대소문자 무시)이 있으면 새로 만들지 않고 그 취미를 돌려준다.
   *  · 최대 20개까지. 이름은 1~12자.
   * @returns {{ok:boolean, reason?:string, hobby?:object}}
   */
  addCustomHobby(name, categoryId) {
    const label = String(name == null ? '' : name).replace(/\s+/g, ' ').trim().slice(0, 12);
    if (!label) return { ok: false, reason: 'empty' };
    const key = label.toLowerCase();
    const existing = this.getHobbyChips().find((h) => String(h.name).toLowerCase() === key);
    if (existing) return { ok: false, reason: 'duplicate', hobby: existing };
    const cat = this.getHobbyCategories().find((c) => c.id === categoryId)
      || this.getHobbyCategories().find((c) => c.id === 'daily');
    if ((this.state.customHobbies || []).length >= 20) return { ok: false, reason: 'too_many' };
    const hobby = {
      id: `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      name: label,
      icon: 'sparkle',
      categoryId: cat.id,
      categoryName: cat.name,
      tone: cat.tone,
      custom: true,
      createdAt: new Date().toISOString()
    };
    this.state.customHobbies = (this.state.customHobbies || []).concat(hobby);
    this.saveState();
    return { ok: true, hobby };
  }

  /** 내 취향 — "당신의 취미는 무엇인가요?"(hobbyIds) · "어떤 걸 해보고 싶나요?"(goalIds). */
  getTaste() {
    const t = this.state.tastePrefs || {};
    const ids = (list) => (Array.isArray(list) ? list : []).filter((id) => !!this.getHobbyChip(id));
    return {
      hobbyIds: ids(t.hobbyIds),
      goalIds: ids(t.goalIds),
      updatedAt: t.updatedAt || null
    };
  }

  /**
   * 가입 직후·가이드에서 고른 취향을 저장한다.
   *  · hobbyIds 는 내 프로필 대표 취미(최대 3개)에도 반영된다.
   *  · goalIds 는 "우그에서 해보고 싶은 것" — 홈의 추천 모임 순서를 정한다.
   */
  saveTaste(data) {
    const d = data || {};
    const clean = (list, max) => (Array.isArray(list) ? list : [])
      .filter((id) => !!this.getHobbyChip(id))
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .slice(0, max);
    const hobbyIds = clean(d.hobbyIds, 8);
    const goalIds = clean(d.goalIds, 8);
    this.state.tastePrefs = { hobbyIds, goalIds, updatedAt: new Date().toISOString() };
    const user = this.state.currentUser;
    if (user && hobbyIds.length) {
      user.hobbyIds = hobbyIds.slice(0, 3);
      user.hobbies = user.hobbyIds.map((id) => this.getHobbyChip(id).name);
    }
    this.saveState();
    return { ok: true, taste: this.getTaste() };
  }

  /** 추천에 쓰는 내 취미 집합 — 취향 답변 우선, 없으면 프로필 취미. */
  getTasteHobbyIds() {
    const taste = this.getTaste();
    const user = this.state.currentUser || {};
    const list = [];
    [...taste.goalIds, ...taste.hobbyIds, ...(user.hobbyIds || [])].forEach((id) => {
      if (this.getHobbyChip(id) && !list.includes(id)) list.push(id);
    });
    return list;
  }

  /**
   * 홈 하단 '추천 모임' — 내가 아직 가입하지 않은 모임을 취향에 맞춰 고른다.
   *  점수: 내 취미와 같은 모임 +3 · 같은 대분류 +1 · 활동 멤버 수·가까운 순으로 정렬.
   * @returns {Array<{group, hobbyName, tone, reason, score}>}
   */
  getRecommendedGroups(options = {}) {
    const limit = options.limit == null ? 4 : options.limit;
    /* H1 — 홈 추천 모임 칩 3개: 가까운 순(near) · 인기(popular) · 새로 생긴(new). */
    const sort = ['near', 'popular', 'new'].includes(options.sort) ? options.sort : 'recommend';
    const mine = this.getTasteHobbyIds();
    const myCats = mine.map((id) => this.getHobbyTone(id));
    const joined = this.state.currentUser ? this.state.currentUser.joinedGroupIds || [] : [];
    /* Sprint 32.5 — 아지트가 가까운 모임을 먼저 권한다(사생활 보호용 이름만 비교). */
    const myAzit = this.getMyAzit();
    const scored = (this.state.groups || [])
      .filter((g) => !joined.includes(g.id))
      .map((g) => {
        const chip = this.getHobbyChip(g.hobbyId);
        const sameHobby = mine.includes(g.hobbyId);
        const sameTone = !!(chip && myCats.includes(chip.tone));
        const azit = this.getGroupAzit(g);
        const sameAzit = !!(azit && myAzit && azit.id === myAzit.id);
        const sameArea = !!(azit && myAzit && azit.areaId === myAzit.areaId);
        let score = 0;
        if (sameHobby) score += 3;
        else if (sameTone) score += 1;
        if (sameAzit) score += 2;
        else if (sameArea) score += 1;
        score += Math.min(2, Math.floor((g.memberCount || 0) / 12));
        const distanceKm = this.getGroupDistanceKm(g);
        return {
          group: g,
          hobbyName: chip ? chip.name : (g.categoryName || '취미'),
          tone: this.getHobbyTone(g.hobbyId || g.category),
          azit,
          hangouts: this.getGroupHangouts(g),
          region: this.getGroupRegion(g),
          distanceKm,
          distanceLabel: distanceBucket(distanceKm),
          reason: sameHobby && (sameAzit || sameArea) ? '내 취미 · 아지트가 가까워요'
            : (sameAzit ? '내 아지트에서 만나요'
              : (sameArea ? '같은 동네 아지트'
                : (sameHobby ? '내 취미와 같아요'
                  : (sameTone ? '같은 분야 취미예요' : '지금 활동 중이에요')))),
          score
        };
      });
    scored.sort((a, b) => {
      if (sort === 'near') return ((a.distanceKm == null ? 99 : a.distanceKm) - (b.distanceKm == null ? 99 : b.distanceKm))
        || ((b.group.memberCount || 0) - (a.group.memberCount || 0));
      if (sort === 'popular') return ((b.group.memberCount || 0) - (a.group.memberCount || 0))
        || ((a.distanceKm == null ? 99 : a.distanceKm) - (b.distanceKm == null ? 99 : b.distanceKm));
      if (sort === 'new') return (new Date(b.group.createdAt || 0).getTime() - new Date(a.group.createdAt || 0).getTime())
        || ((b.group.memberCount || 0) - (a.group.memberCount || 0));
      return (b.score - a.score)
        || ((a.distanceKm == null ? 99 : a.distanceKm) - (b.distanceKm == null ? 99 : b.distanceKm))
        || (b.group.memberCount || 0) - (a.group.memberCount || 0);
    });
    return scored.slice(0, limit);
  }

  /* ---------------- Sprint 21 — 스포트라이트 가이드 상태 ---------------- */

  getGuideState() {
    const g = this.state.guide || {};
    const status = ['pending', 'done', 'skipped', 'running'].includes(g.status) ? g.status : 'pending';
    return {
      status,
      step: Number.isFinite(g.step) ? g.step : 0,
      startedAt: g.startedAt || null,
      finishedAt: g.finishedAt || null,
      needed: status === 'pending' || status === 'running'
    };
  }

  /** 가이드를 시작한다(가입 직후·내정보에서 다시 보기). */
  startGuide(reset) {
    const prev = this.getGuideState();
    const step = reset === true ? 0 : (prev.step || 0);
    this.state.guide = {
      status: 'running', step,
      startedAt: new Date().toISOString(),
      finishedAt: prev.finishedAt || null
    };
    this.saveState();
    return { ok: true, guide: this.getGuideState() };
  }

  /** 단계를 옮긴다(뒤로도 가능). */
  setGuideStep(step) {
    const g = this.getGuideState();
    const next = Math.max(0, Number(step) || 0);
    this.state.guide = Object.assign({}, this.state.guide, { status: 'running', step: next });
    this.saveState();
    return { ok: true, guide: this.getGuideState(), prevStep: g.step };
  }

  /** 가이드를 끝냈다('done') 또는 건너뗐다('skipped'). 다시는 자동으로 뜨지 않는다. */
  finishGuide(status) {
    const next = status === 'skipped' ? 'skipped' : 'done';
    this.state.guide = Object.assign({}, this.state.guide, {
      status: next,
      finishedAt: new Date().toISOString()
    });
    this.saveState();
    return { ok: true, guide: this.getGuideState() };
  }

  /**
   * 사람 카드/대화방이 가리키는 사람의 프로필. 매칭 프로필 → 모임 동료(보조 프로필) →
   * 대화방 정보로 만든 최소 프로필 순서로 찾는다.
   */
  getPersonProfile(profileId) {
    const direct = this.getMatchProfile(profileId);
    if (direct) return direct;
    const partner = (this.state.partnerProfiles || []).find((p) => p.id === profileId);
    if (partner) return partner;
    /* v33.4 — 피드·댓글에서 알게 된 사람(모임 명부·이름만 아는 사람) */
    const persona = (this.state.personas || {})[profileId];
    if (persona) {
      return this.syntheticProfile({
        id: persona.id,
        name: persona.nickname,
        avatarText: persona.avatarText,
        avatarGradient: persona.avatarGradient,
        photoUrl: persona.photoUrl,
        hobbyLabel: persona.hobbyLabel,
        location: persona.location
      });
    }
    const room = this.state.chatRooms.find((r) => r.partnerId === profileId);
    if (!room) return null;
    return {
      id: room.partnerId,
      nickname: room.partnerName,
      age: null,
      distanceKm: null,
      location: '',
      hobbyIds: [],
      hobbyLabel: (room.partnerHobby || '').replace(/^[^\s]+\s*/, ''),
      hobbyIcon: (room.partnerHobby || '').trim().charAt(0) || '',
      hobbyStyle: room.partnerHobby || '취미 메이트',
      cycle: '',
      cycleIcon: '',
      hobbies: [],
      specChips: [],
      bio: '대화로 취미를 알아가는 중이에요.',
      avatarText: room.partnerAvatarText,
      avatarGradient: room.partnerGradient,
      badge: room.partnerHobby || '취미 메이트',
      ratio: 'mid',
      likesMe: false,
      verified: false,
      isSynthetic: true
    };
  }

  /* ==========================================================================
   * v33.4 — 피드·좋아요·댓글의 프로필 연결 + 좋아요한 사람 목록
   * ------------------------------------------------------------------------
   * 11/22 00:44 사용자(아이폰에서 쓰다가): "피드에 올린 글 또는 좋아요 또는 댓글에
   * 있는 프로필을 누르면 해당 이용자 프로필이 나오게 해줘."
   *
   *  · 화면은 사람을 id 로도, 이름으로도 가리킨다(시드 댓글은 id 가 없거나 모임 사람
   *    id 라 프로필로 바로 안 풀린다). 그래서 '가리킴 → 프로필' 해석을 여기 한 곳에 둔다.
   *  · 해석 순서: 나 → id 로 찾은 프로필 → 매칭·모임 동료 프로필 → 모임 명부 → 이름만.
   *    마지막 두 단계는 사진 없이 이름·이니셜만 있는 최소 프로필을 만든다(지어낸 사람 금지).
   *  · 좋아요 수와 '좋아요한 사람' 목록은 같은 수를 쓴다 — 앱이 아는 사람보다 많은 수는
   *    목록으로 보여 줄 수 없어 그 수에 맞춰 내린다(normalizePostLikes).
   * ======================================================================== */

  /** 이름·id 만으로 사람 프로필을 찾는다(없으면 이름 기반 최소 프로필).
   *  register:false 면 state.personas 에 적지 않는다(화면 그리기용). */
  resolvePersonProfile(identity = {}, options = {}) {
    const me = this.currentUser || {};
    const id = String(identity.id || '');
    const name = String(identity.name || identity.nickname || '').trim();

    if ((id && me.id && id === me.id) || (name && me.nickname && name === me.nickname)) {
      return this.meProfile();
    }
    if (id) {
      const byId = this.getPersonProfile(id);
      if (byId) return byId;
    }
    if (!name) return id ? this.syntheticProfile({ id }) : null;

    const byName = (this.state.matchProfiles || []).find((p) => p.nickname === name)
      || (this.state.partnerProfiles || []).find((p) => p.nickname === name);
    if (byName) return byName;

    /* 모임 명부 — 모임 사람(모임장·멤버)의 이름은 프로필 카드가 없다. */
    for (const group of this.state.groups || []) {
      const member = (group.members || []).find((m) => m.name === name)
        || (group.leaderName === name ? { id: group.leaderId, name: group.leaderName } : null);
      if (member) {
        const profile = this.syntheticProfile({
          id: member.id || `by-name:${name}`,
          name,
          avatarText: member.avatarText,
          avatarGradient: member.gradient,
          photoUrl: member.photoUrl || EXAMPLE_PERSON_AVATARS[member.id] || null,
          hobbyLabel: group.categoryName || '모임 사람',
          location: group.location || ''
        });
        return options.register === false ? profile : this.registerPersona(profile);
      }
    }
    /* 마지막 — 이름만 아는 사람. 사진 없이 이니셜 아바타만. */
    const fallback = this.syntheticProfile({ id: id || `by-name:${name}`, name });
    return options.register === false ? fallback : this.registerPersona(fallback);
  }

  /**
   * 이름만 아는 사람을 state.personas 에 적어 둔다 — 다음에 id 로 다시 찾을 수 있고,
   * 1:1 대화(getPersonProfile)도 이 카드로 방을 연다. 프로필 사진·관계는 지어내지 않는다.
   */
  registerPersona(profile) {
    if (!profile || !profile.id) return profile;
    if (!this.state.personas || typeof this.state.personas !== 'object') this.state.personas = {};
    const exist = this.state.personas[profile.id];
    if (!exist) {
      this.state.personas[profile.id] = {
        id: profile.id,
        nickname: profile.nickname,
        avatarText: profile.avatarText,
        avatarGradient: profile.avatarGradient,
        photoUrl: profile.photoUrl || null,
        hobbyLabel: profile.hobbyLabel || '',
        location: profile.location || ''
      };
      this.saveState();
    }
    return profile;
  }

  /** 내 프로필을 사람 카드와 같은 모양으로. */
  meProfile() {
    const me = this.currentUser || {};
    const hobbies = me.hobbies || [];
    return {
      id: me.id,
      nickname: me.nickname || '나',
      age: me.age != null ? Number(me.age) : null,
      distanceKm: 0,
      location: me.location || '',
      hobbyIds: [],
      hobbyLabel: hobbies[0] || '내 취미',
      hobbyIcon: '',
      hobbyStyle: hobbies.slice(0, 2).join(' · ') || '내 프로필',
      cycle: '',
      cycleIcon: '',
      hobbies,
      specChips: [],
      bio: me.bio || '',
      avatarText: me.avatarText || String(me.nickname || '나').charAt(0),
      avatarGradient: me.avatarGradient || 'linear-gradient(135deg, #16EBA4, #06AE7E)',
      photoUrl: me.photoUrl || null,
      badge: '나',
      ratio: 'mid',
      likesMe: false,
      verified: false,
      isMe: true,
      isSynthetic: true
    };
  }

  /** 이름(혹은 id)만 아는 사람의 최소 프로필 — 없는 정보는 비워 둔다. */
  syntheticProfile({ id, name, avatarText, avatarGradient, photoUrl, hobbyLabel, location } = {}) {
    const nickname = String(name || '').trim() || '이용자';
    return {
      id: id || `by-name:${nickname}`,
      nickname,
      age: null,
      distanceKm: null,
      location: location || '',
      hobbyIds: [],
      hobbyLabel: hobbyLabel || '',
      hobbyIcon: '',
      hobbyStyle: hobbyLabel || '모임에서 만난 사람',
      cycle: '',
      cycleIcon: '',
      hobbies: [],
      specChips: [],
      bio: hobbyLabel ? `${hobbyLabel}에서 함께해요.` : '',
      avatarText: avatarText || nickname.charAt(0),
      avatarGradient: avatarGradient || 'linear-gradient(135deg, #16EBA4, #06AE7E)',
      photoUrl: photoUrl || null,
      badge: hobbyLabel || '모임 사람',
      ratio: 'mid',
      likesMe: false,
      verified: false,
      isSynthetic: true
    };
  }

  /** 좋아요한 사람으로 세울 수 있는 사람 — 나와 글쓴이는 뺀다. */
  getLikerPool(post) {
    const meId = (this.currentUser || {}).id;
    const authorId = post ? post.authorId : null;
    const seen = new Set();
    const pool = [];
    const push = (person) => {
      if (!person || !person.id) return;
      if (person.id === meId || person.id === authorId) return;
      if (seen.has(person.id)) return;
      seen.add(person.id);
      pool.push(person);
    };
    (this.state.matchProfiles || []).forEach(push);
    (this.state.partnerProfiles || []).forEach(push);
    /* 사람마다 항상 같은 순서 — 글 id 로 시작점을 돌려 글마다 다른 얼굴이 보이게. */
    return pool.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  /** 글 id 로 정해지는 순서로 n명을 고른다(같은 글 → 늘 같은 사람). */
  pickLikers(post, pool, n) {
    const out = [];
    const total = pool.length;
    if (!total || n <= 0) return out;
    const key = String((post && post.id) || '');
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 100003;
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    let step = 7 + (hash % 11);
    while (gcd(step, total) !== 1) step += 1;
    const start = hash % total;
    for (let i = 0; i < Math.min(n, total); i += 1) out.push(pool[(start + i * step) % total]);
    return out;
  }

  /** 글의 '좋아요한 사람' 목록 — 내가 눌렀으면 맨 앞에 나. */
  getPostLikeInfo(postId) {
    const post = this.getPost(postId) || this.getExplorePost(postId) || null;
    if (!post) return { count: 0, people: [] };
    const likedByMe = !!post.likedByMe;
    const pool = this.getLikerPool(post);
    const others = Math.max(0, Math.min(Number(post.likes) || 0, pool.length + (likedByMe ? 1 : 0)) - (likedByMe ? 1 : 0));
    const people = this.pickLikers(post, pool, others).map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatarText: p.avatarText || String(p.nickname || '?').charAt(0),
      avatarGradient: p.avatarGradient,
      photoUrl: p.photoUrl || null,
      hobbyLabel: p.hobbyLabel || (p.hobbies || [])[0] || '',
      isMe: false
    }));
    if (likedByMe && this.currentUser && this.currentUser.id) {
      const me = this.meProfile();
      people.unshift({
        id: me.id,
        nickname: me.nickname,
        avatarText: me.avatarText,
        avatarGradient: me.avatarGradient,
        photoUrl: me.photoUrl,
        hobbyLabel: me.hobbyLabel,
        isMe: true
      });
    }
    return { count: people.length, people };
  }

  /**
   * 좋아요 수를 앱이 아는 사람 수에 맞춘다 — 처음 한 번만 내려간다.
   * (예: 47개 → 31명. 수와 목록이 어긋나면 목록을 믿을 수 없게 된다)
   */
  normalizePostLikes() {
    const posts = (this.state.feedPosts || []).concat(this.state.explorePosts || []);
    let changed = false;
    posts.forEach((post) => {
      const cap = this.getLikerPool(post).length + (post.likedByMe ? 1 : 0);
      const likes = Number(post.likes) || 0;
      if (likes > cap) {
        post.likes = cap;
        changed = true;
      }
    });
    if (changed) this.saveState();
    return changed;
  }

  /* ------------------------------------------------------------------
   * v34.4 (#22772) — 사용자 아이디(@id) 규칙 한 곳
   *  · 소문자·숫자·밑줄·점 3~20자(프로필 수정과 같은 규칙을 가입에서도 쓴다).
   * ------------------------------------------------------------------ */
  cleanHandle(value) {
    return String(value == null ? '' : value).trim().replace(/^@+/, '').toLowerCase();
  }

  /** 이 아이디를 쓸 수 있는가 — 형식은 화면이 먼저 보고, 여기서는 중복을 본다. */
  isHandleAvailable(value, exceptHandle) {
    const h = this.cleanHandle(value);
    if (!/^[a-z0-9._]{3,20}$/.test(h)) return false;
    const keep = this.cleanHandle(exceptHandle !== undefined ? exceptHandle : (this.currentUser || {}).handle);
    if (h === keep) return true;
    const same = (x) => this.cleanHandle(x) === h;
    return !((this.state.matchProfiles || []).concat(this.state.partnerProfiles || []).some((p) => same(p.handle))
      || ((this.state.personas && Object.values(this.state.personas)) || []).some((p) => same(p.handle)));
  }

  /** 가입 화면에 미리 채워 둘 기본 아이디 — 닉네임에서 영문을 살리고, 모자라면 oog+숫자. */
  suggestHandle(seed) {
    const base = this.cleanHandle(seed).replace(/[^a-z0-9._]/g, '').replace(/^[._]+/, '').slice(0, 14);
    const stem = base.length >= 3 ? base : 'oog';
    let candidate = base.length >= 3 ? base : `${stem}${Math.floor(Math.random() * 90000) + 10000}`;
    let tries = 0;
    while (!this.isHandleAvailable(candidate) && tries < 40) {
      tries += 1;
      candidate = `${stem}${Math.floor(Math.random() * 90000) + 10000}`.slice(0, 20);
    }
    return candidate;
  }

  /**
   * 마이프로필 수정. v34.2 부터는 **닉네임·사용자 아이디·대표 취미(1~3)·소개** 네 가지다
   * (인스타그램 편집처럼 행 4개). 지역·활동 시간대는 넘기지 않으면 그대로 둔다.
   * @returns {{ok:boolean, reason?:string, user?:object}}
   */
  updateProfile(data) {
    const d = data || {};
    const user = this.state.currentUser;
    const nickname = String(d.nickname == null ? user.nickname : d.nickname).trim();
    if (nickname.length < 2 || nickname.length > 12) return { ok: false, reason: 'nickname' };

    const requested = Array.isArray(d.hobbyIds) ? d.hobbyIds : (user.hobbyIds || []);
    const unique = [];
    requested.forEach((id) => {
      if (this.getHobbyChip(id) && !unique.includes(id)) unique.push(id);
    });
    /* v34.2 — 취미는 고른 만큼만. 이미 취미가 있는 사람이 전부 해제하면 한 개는 남긴다
       (예전 규칙), 취미가 없던 사람은 비워도 저장할 수 있다(가입 직후 프로필부터 채우는 길). */
    if (!unique.length && (user.hobbyIds || []).length) return { ok: false, reason: 'hobby' };
    if (unique.length > 3) return { ok: false, reason: 'too_many_hobbies' };

    /* v34.2 — 사용자 아이디(@id). 비우면 기존 아이디를 지키고, 형식은 소문자·숫자·._ 3~20자. */
    let handle = user.handle || '';
    if (d.handle !== undefined) {
      const given = String(d.handle == null ? '' : d.handle).trim().replace(/^@+/, '').toLowerCase();
      if (!given) {
        handle = user.handle || '';
      } else if (!/^[a-z0-9._]{3,20}$/.test(given)) {
        return { ok: false, reason: 'handle' };
      } else {
        const taken = (this.state.matchProfiles || []).concat(this.state.partnerProfiles || [])
          .some((p) => String(p.handle || '').replace(/^@+/, '').toLowerCase() === given)
          || String(user.handle || '').replace(/^@+/, '').toLowerCase() === given
          || ((this.state.personas && Object.values(this.state.personas)) || [])
            .some((p) => String(p.handle || '').replace(/^@+/, '').toLowerCase() === given);
        if (taken && String(user.handle || '').replace(/^@+/, '').toLowerCase() !== given) {
          return { ok: false, reason: 'handle_taken' };
        }
        handle = `@${given}`;
      }
    }

    /* 지역은 이 시트에서 묻지 않는다 — 넘어오면 검사하고, 없으면 지금 값을 지킨다. */
    let location = user.location || '';
    if (d.location !== undefined) {
      const given = String(d.location == null ? '' : d.location).trim().slice(0, 30);
      if (!given) return { ok: false, reason: 'location' };
      location = given;
    }

    const activityOption = (this.state.activityOptions || [])
      .find((o) => o.label === d.activity) || { label: user.activity || '평일 저녁', icon: user.activityIcon || '' };

    user.nickname = nickname;
    user.handle = handle;
    user.avatarText = nickname.charAt(0);
    user.hobbyIds = unique;
    user.hobbies = unique.map((id) => this.getHobbyChip(id).name);
    user.location = location;
    /* Sprint 7 — 활동 지역을 바꾸면 내 생활권과 내 공개 글의 지역도 함께 옮긴다. */
    user.regionId = deriveRegionId(location) || user.regionId || 'gwanak';
    user.bio = String(d.bio == null ? user.bio : d.bio).trim().slice(0, 120);
    user.activity = activityOption.label;
    user.activityIcon = activityOption.icon;

    /* 이미 쓴 글의 작성자 표시도 새 닉네임으로 맞춘다 */
    this.state.feedPosts.forEach((p) => {
      if (p.authorId !== user.id) return;
      p.authorName = nickname;
      p.authorAvatarText = user.avatarText;
    });
    (this.state.explorePosts || []).forEach((p) => {
      if (p.authorId !== user.id) return;
      p.authorName = nickname;
      p.authorAvatarText = user.avatarText;
      p.regionId = user.regionId;
    });

    this.saveState();
    return { ok: true, user };
  }

  /**
   * 새 소모임 개설 — 개설자는 자동으로 모임장이 되어 가입 목록에 들어간다.
   * @returns {{ok:boolean, reason?:string, group?:object}}
   */
  createGroup(data) {
    const d = data || {};
    /* v35.0 — 화면이 만든 모임 id 를 받는다(API 경계의 재시도가 모임을 두 개 만들지 않게). */
    const wantedId = String(d.id || d.groupId || '').trim().slice(0, 80);
    if (wantedId) {
      const already = this.getGroup(wantedId);
      if (already) return { ok: true, group: already, reused: true };
    }
    const name = String(d.name || '').trim();
    if (name.length < 2 || name.length > 30) return { ok: false, reason: 'name' };
    const chip = this.getHobbyChip(d.hobbyId);
    if (!chip) return { ok: false, reason: 'hobby' };
    /* H2 — 아지트 1~3곳(직접 입력 없음). 만들기 화면은 4~5단계에서 골라야 넘어가고,
       경계(API)로 바로 들어온 요청은 내 동네 아지트를 기본으로 받는다. */
    const askedIds = (Array.isArray(d.hangouts) ? d.hangouts
      : (Array.isArray(d.hangoutIds) ? d.hangoutIds : (d.azitId ? [d.azitId] : [])))
      .map((h) => (typeof h === 'string' ? h : (h && h.id)))
      .filter(Boolean);
    let hangouts = [];
    askedIds.forEach((id) => {
      const view = this.findAzit(id);
      if (view && !hangouts.some((h) => h.id === view.id)) hangouts.push(view);
    });
    if (askedIds.length && !hangouts.length) return { ok: false, reason: 'hangout' };
    if (hangouts.length > 3) return { ok: false, reason: 'too_many_hangouts' };
    if (!hangouts.length) {
      const my = this.getMyAzit();
      if (my) hangouts = [my];
    }
    if (!hangouts.length) return { ok: false, reason: 'hangout' };
    /* H2 — 활동 지역(시·도/시·군·구). 고른 지역을 우선하고, 없으면 첫 아지트의 지역. */
    const wantedArea = d.region && d.region.sigunguId ? geoAreaView(d.region.sigunguId) : null;
    const firstWithArea = hangouts.find((h) => !!h.sigunguId);
    const area = wantedArea || (firstWithArea ? geoAreaView(firstWithArea.sigunguId) : null);
    const user = this.state.currentUser;
    const meetLabel = String(d.meetLabel || '').trim().slice(0, 24) || '일정 조율 중';
    const description = String(d.description || '').trim().slice(0, 300)
      || `${chip.name} 좋아하는 사람들이 모여 가볍게 만나는 모임이에요.`;
    /* Sprint 4.5 — 가입 방식(자유/승인제) · 나이 제한 · 가입 질문 */
    const joinMode = (d.joinMode === 'approval' || d.privacyType === 'approval_private')
      ? 'approval' : 'open';
    const privacyType = joinMode === 'open' ? 'open' : 'approval_private';
    const ageLimitOption = (d.ageMin != null || d.ageMax != null)
      ? this.ageRangeOption(d.ageMin, d.ageMax)
      : (this.getAgeLimit(d.ageLimit) || this.getAgeLimit('all'));
    const ageRange = this.normalizeGroupAgeRange(ageLimitOption.min, ageLimitOption.max);
    const asked = Array.isArray(d.joinQuestions)
      ? d.joinQuestions.map((q) => String(q || '').trim()).filter(Boolean).slice(0, 2)
      : [];
    const joinQuestions = joinMode === 'approval' && !asked.length
      ? ['취미 구력이나 선호 요일을 적어주세요!']
      : (joinMode === 'approval' ? asked : []);
    /* H2 — 대표 이미지: 한 번 크롭해서 만든 1:1(원형용)·4:3(카드용) 두 장, 또는 기본 프리셋.
       사진은 Canvas 로 다시 저장해 EXIF(위치 정보)를 지운 Data URL 만 받는다. */
    const dataUrlOk = (v) => {
      const s = String(v || '').trim();
      return /^https?:\/\//i.test(s) || /^data:image\//i.test(s) ? s : null;
    };
    const coverIn = d.coverImage || {};
    const coverCard = dataUrlOk(coverIn.card || d.coverCard || d.photoUrl);
    const coverCircle = dataUrlOk(coverIn.circle || d.coverCircle) || coverCard;
    const photoUrl = coverCard;
    const preset = d.coverIconPresetId ? this.getCoverIconPreset(d.coverIconPresetId) : null;
    const coverIcon = (preset && preset.icon) || chip.icon;

    const group = {
      id: wantedId || `grp_new_${Date.now()}`,
      name,
      category: chip.id,
      categoryName: chip.name,
      hobbyId: chip.id,
      meetLabel,
      ratio: 'wide',
      icon: coverIcon,
      coverGradient: 'linear-gradient(135deg, #0E814A 0%, #0E8146 100%)',
      /* 아지트 1~3곳 — 이름·종류만 저장한다(집 주소·정확한 위치 없음). */
      hangouts: hangouts.map((h) => ({ id: h.id, name: h.name, kind: h.kind })),
      azitId: hangouts[0].id,
      azitName: hangouts[0].name,
      location: hangouts[0].name.slice(0, 24),
      region: area ? { sidoId: area.sidoId, sidoName: area.sidoName, sigunguId: area.sigunguId, sigunguName: area.name } : null,
      regionId: (firstWithArea && firstWithArea.areaId) || (area && area.regionId) || (hangouts[0].areaId || ''),
      distanceKm: this.getGroupDistanceKm({ hangouts: hangouts.map((h) => ({ id: h.id })), regionId: (firstWithArea && firstWithArea.areaId) || null, distanceKm: null }),
      memberCount: 1,
      maxMembers: 30,
      privacyType,
      privacyLabel: privacyType === 'open' ? '자유 가입' : '비공개 승인제',
      joinMode,
      /* H4 — 슬라이더로 고른 나이 범위. ageLimit 은 배지·옛 코드 호환용 id. */
      ageMin: ageRange.min,
      ageMax: ageRange.max,
      ageLimit: ageLimitOption.id,
      joinQuestions,
      description,
      tags: [`#${chip.name}`, `#${hangouts[0].name.replace(/\s+/g, '')}`],
      rules: '서로의 취미와 시간을 존중합니다. 모임 사진은 멤버에게만 공유해요.',
      leaderId: user.id,
      leaderName: user.nickname,
      customTags: ['공지', '번개', '오운완'],
      joinPolicy: [meetLabel],
      members: [],
      /* v35.2 — 새 모임의 게시판은 모임장만 쓸 수 있고, 알림은 받는다. */
      memberBoardWrite: false,
      notifyEnabled: true,
      isMine: true,
      photoUrl,
      coverCircle,
      coverImage: photoUrl ? { circle: coverCircle, card: coverCard } : null,
      /* H3 — 6단계에서 두 기본값 입력을 걷어냈다. 필드는 옛 저장 상태 호환용으로만 남고
         (항상 false), 일정·글의 시작값으로는 쓰지 않는다. */
      defaultGuestOpen: d.defaultGuestOpen === true,
      defaultRecommendOptIn: d.defaultRecommendOptIn === true,
      ...(preset ? { coverIconPreset: { id: preset.id, icon: preset.icon, tone: preset.tone } } : {}),
      createdAt: new Date().toISOString()
    };

    this.state.groups.unshift(group);
    if (!user.joinedGroupIds.includes(group.id)) user.joinedGroupIds.push(group.id);
    this.saveState();
    return { ok: true, group };
  }

  /** 하트 취소(되돌리기). 상호 LIKE로 열렸던 방은 대화가 없을 때만 정리한다. */
  toggleMatchLike(profileId) {
    const index = this.state.matchSwipes.findIndex(
      (s) => s.profileId === profileId && (s.direction === 'like' || s.direction === 'super'));
    if (index < 0) return { ok: false, reason: 'not_liked', profile: this.getMatchProfile(profileId) };

    const swipe = this.state.matchSwipes[index];
    this.state.matchSwipes.splice(index, 1);

    let roomRemoved = false;
    let roomKept = null;
    const room = this.findChatRoomByPartner(profileId);
    if (room && swipe.roomId === room.id) {
      /* 이 하트 때문에 생긴 방만 되돌린다. 메시지가 오갔다면 기록을 지우지 않고
         '새 매칭' 표시만 정리한다(대화는 사용자에게 남아야 한다). */
      const hasConversation = Array.isArray(room.messages) && room.messages.length > 0;
      if (hasConversation) {
        room.isNewMatch = false;
        roomKept = room;
      } else {
        this.state.chatRooms = this.state.chatRooms.filter((r) => r.id !== room.id);
        roomRemoved = true;
      }
    }

    this.saveState();
    return {
      ok: true,
      liked: false,
      profile: this.getMatchProfile(profileId),
      roomRemoved,
      roomKept
    };
  }

  /** 내가 하트(좋아요)를 보낸 사람인지 */
  isProfileLiked(profileId) {
    return this.state.matchSwipes.some(
      (s) => s.profileId === profileId && (s.direction === 'like' || s.direction === 'super'));
  }

  getLikedProfiles() {
    return this.state.matchSwipes
      .filter((s) => s.direction === 'like' || s.direction === 'super')
      .map((s) => this.getMatchProfile(s.profileId))
      .filter(Boolean);
  }

  getSwipe(profileId) {
    return this.state.matchSwipes.find((s) => s.profileId === profileId) || null;
  }

  /** 그 사람과의 대화방 (없으면 null) — 카드·상세 시트의 '대화하기' 판단 */
  findChatRoomByPartner(profileId) {
    return this.state.chatRooms.find((r) => r.partnerId === profileId) || null;
  }

  /**
   * 카드 하트 → LIKE 1회 기록. 상대가 이미 나를 LIKE했다면(likesMe) 대화방까지 연다.
   * @returns {{ok:boolean, reason?:string, matched?:boolean, profile?:object,
   *            swipe?:object, room?:object}}
   *   이미 하트를 누른 사람이면 {ok:false, reason:'already'}
   */
  recordMatchSwipe(profileId, direction) {
    const dir = direction === 'pass' ? 'pass' : 'like';
    const profile = this.getMatchProfile(profileId);
    if (!profile) return { ok: false, reason: 'not_found' };
    if (this.getSwipe(profileId)) return { ok: false, reason: 'already', profile };

    const swipe = { profileId, direction: dir, at: new Date().toISOString(), roomId: null };
    this.state.matchSwipes.push(swipe);

    let matched = false;
    let room = null;
    if (dir === 'like' && profile.likesMe) {
      matched = true;
      const opened = this.openChatRoom(profileId);
      room = opened.room;
      /* 이미 있던 방을 재사용한 경우에는 roomId 를 남기지 않는다 */
      if (opened.created) swipe.roomId = room.id;
    }

    this.saveState();
    return { ok: true, matched, profile, swipe, room };
  }

  /**
   * 1:1 대화방 열기 — 이미 있으면 그 방을, 없으면 새로 만든다.
   * @returns {{room:object, created:boolean}}
   */
  openChatRoom(profileId) {
    const exist = this.state.chatRooms.find((r) => r.partnerId === profileId);
    if (exist) return { room: exist, created: false };

    const profile = this.getMatchProfile(profileId) || this.getPersonProfile(profileId);
    const room = {
      id: `chat_${profileId}_${Date.now()}`,
      partnerId: profileId,
      partnerName: profile ? profile.nickname : '새 메이트',
      partnerHobby: profile ? `${profile.hobbyIcon || ''} ${profile.hobbyLabel || ''}`.trim() || '모임 사람' : '취미 메이트',
      partnerAvatarText: profile ? profile.avatarText || profile.nickname.charAt(0) : '?',
      partnerGradient: profile ? profile.avatarGradient : 'linear-gradient(135deg, #0FB57E, #06AE7E)',
      lastMessage: profile && profile.isMe ? '나와의 대화' : '먼저 인사해 보세요',
      lastTime: '방금',
      unreadCount: 1,
      isNewMatch: true,
      matchedAt: new Date().toISOString(),
      messages: []
    };
    this.state.chatRooms.unshift(room);
    this.saveState();
    return { room, created: true };
  }

  getChatRoom(roomId) {
    return this.state.chatRooms.find((r) => r.id === roomId) || null;
  }

  /** 채팅 탭 상단 미읽음 배지 */
  getUnreadChatCount() {
    return this.state.chatRooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
  }

  /* ==========================================================================
   * Sprint 4.5 — A. 알림 파이프라인 (푸시 · 인앱 배너 · 알림함)
   * ------------------------------------------------------------------------
   *  · permission  : 브라우저 Notification.permission 을 그대로 미러링한다.
   *  · pushEnabled : 앱 안의 마스터 스위치 (꺼두면 어떤 채널로도 알리지 않는다).
   *  · dndEnabled  : 야간 방해 금지. dndStart~dndEnd 사이에는 알림함에만 쌓인다.
   *
   *  채널 판단은 이 한 곳(dispatchNotification)에서만 한다.
   *    push 꺼짐          → suppressed / 'push_off'      (알림함에만 적재)
   *    종류별 토글 꺼짐      → suppressed / 'category_off'  (Sprint 5 — 좋아요·댓글·가입 신청 등)
   *    방해 금지 시간       → suppressed / 'dnd'
   *    권한 없음           → inapp      / 'needs_permission'  (앱 안 배너로 대신)
   *    권한 O · 창 비활성    → system     / 'background'        (실제 OS 푸시)
   *    권한 O · 창 활성      → inapp      / 'foreground'        (지금 보고 있으니 상단 배너)
   * ======================================================================== */
  get notificationSettings() { return this.state.notificationSettings; }

  /** 알림 종류 5종(chat / like / comment / join_request / join_result) — 프로필 탭 토글의 원본. */
  getNotificationCategories() {
    return NOTIFICATION_CATEGORIES.map((c) => ({ ...c, enabled: this.isCategoryEnabled(c.id) }));
  }

  /**
   * 알림 종류별 토글 저장값을 5종 키로 정규화한다 (Sprint 6).
   * · v7 이하의 reaction(좋아요·댓글) → like + comment
   * · v7 이하의 membership(신청·결과) → join_request + join_result
   * · 새 키(5종)가 있으면 그 값을 우선하고, 없는 종류는 기본 ON.
   * @param {object|null} channels 저장된 channels 객체
   * @returns {{chat:boolean, like:boolean, comment:boolean, join_request:boolean, join_result:boolean}}
   */
  static migrateNotificationChannels(channels) {
    const out = { chat: true, like: true, comment: true, join_request: true, join_result: true, hot: true };
    if (!channels || typeof channels !== 'object') return out;
    NOTIFICATION_CATEGORIES.forEach((c) => {
      if (typeof channels[c.id] === 'boolean') out[c.id] = channels[c.id];
    });
    if (typeof channels.reaction === 'boolean') {
      out.like = channels.reaction;
      out.comment = channels.reaction;
    }
    if (typeof channels.membership === 'boolean') {
      out.join_request = channels.membership;
      out.join_result = channels.membership;
    }
    return out;
  }

  /** 이 알림 종류가 켜져 있는가. 모르는 종류(system 등)는 항상 true. */
  isCategoryEnabled(categoryId) {
    if (categoryId === 'system' || !categoryId) return true;
    const channels = (this.state.notificationSettings || {}).channels || {};
    return channels[categoryId] !== false;
  }

  /**
   * 방해 금지(야간) 시간에도 **즉시 보내는 예외 종류**인가 (Sprint 7).
   * 11/14 22:24 사용자 지시: "방해 금지 시간에도 모임 가입 결과(join_result)는 즉시 알림 예외 적용".
   * @param {string} categoryId chat | like | comment | join_request | join_result | system
   */
  isDndExempt(categoryId) {
    if (!categoryId) return false;
    const exceptions = (this.state.notificationSettings || {}).dndExceptions || {};
    return exceptions[categoryId] === true;
  }

  /** 'HH:MM' → 자정 기준 분. 형식이 틀리면 null. */
  static clockToMinutes(value) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
    if (!m) return null;
    const h = Number(m[1]);
    const mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }

  /** 지금(또는 주어진 시각)이 야간 방해 금지 시간인가 — 자정을 넘는 구간도 처리한다. */
  isDndActive(date) {
    const s = this.state.notificationSettings;
    if (!s || !s.dndEnabled) return false;
    const start = Store.clockToMinutes(s.dndStart);
    const end = Store.clockToMinutes(s.dndEnd);
    if (start == null || end == null || start === end) return false;
    const now = date instanceof Date ? date : new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return start < end
      ? (minutes >= start && minutes < end)
      : (minutes >= start || minutes < end);   /* 22:00~08:00 처럼 자정을 넘는 경우 */
  }

  /**
   * 알림 설정 변경. 허용된 키만 받고, 값이 틀리면 **하나도 바꾸지 않고** 거부한다
   * (검증을 먼저 하고 그 다음에 반영한다).
   * @returns {{ok:boolean, reason?:string, settings:object}}
   */
  updateNotificationSettings(patch) {
    const s = this.state.notificationSettings;
    const d = patch || {};

    /* 1) 검증 */
    if (d.dndStart != null && Store.clockToMinutes(d.dndStart) == null) {
      return { ok: false, reason: 'dnd_start', settings: s };
    }
    if (d.dndEnd != null && Store.clockToMinutes(d.dndEnd) == null) {
      return { ok: false, reason: 'dnd_end', settings: s };
    }
    const nextStart = d.dndStart != null ? String(d.dndStart).trim() : s.dndStart;
    const nextEnd = d.dndEnd != null ? String(d.dndEnd).trim() : s.dndEnd;
    if ((d.dndStart != null || d.dndEnd != null)
        && Store.clockToMinutes(nextStart) === Store.clockToMinutes(nextEnd)) {
      return { ok: false, reason: 'dnd_same', settings: s };
    }

    /* 2) 반영 */
    if (typeof d.pushEnabled === 'boolean') s.pushEnabled = d.pushEnabled;
    if (['default', 'granted', 'denied', 'unsupported'].includes(d.permission)) {
      s.permission = d.permission;
    }
    if (typeof d.dndEnabled === 'boolean') s.dndEnabled = d.dndEnabled;
    if (d.dndStart != null) s.dndStart = nextStart;
    if (d.dndEnd != null) s.dndEnd = nextEnd;
    if (typeof d.promptDismissed === 'boolean') s.promptDismissed = d.promptDismissed;
    if (d.lastPermissionRequestAt) s.lastPermissionRequestAt = d.lastPermissionRequestAt;
    /* Sprint 5 — 알림 종류별 토글. 한 번에 하나만 바뀌는 경우도 있고 여러 개를 같이 받기도 한다. */
    if (d.channels && typeof d.channels === 'object') {
      const known = NOTIFICATION_CATEGORIES.map((c) => c.id);
      const next = { ...(s.channels || {}) };
      known.forEach((id) => {
        if (typeof d.channels[id] === 'boolean') next[id] = d.channels[id];
      });
      s.channels = next;
    }
    /* Sprint 7 — 방해 금지 예외 종류(야간에도 즉시 보내는 알림). */
    if (d.dndExceptions && typeof d.dndExceptions === 'object') {
      const known = NOTIFICATION_CATEGORIES.map((c) => c.id);
      const next = { ...(s.dndExceptions || {}) };
      known.forEach((id) => {
        if (typeof d.dndExceptions[id] === 'boolean') next[id] = d.dndExceptions[id];
      });
      s.dndExceptions = next;
    }
    if (typeof d.channelKey === 'string' && typeof d.channelValue === 'boolean'
        && NOTIFICATION_CATEGORIES.some((c) => c.id === d.channelKey)) {
      s.channels = { ...(s.channels || {}), [d.channelKey]: d.channelValue };
    }
    this.saveState();
    return { ok: true, settings: s };
  }

  /** 알림을 하나 보낸다. 채널은 위 주석의 규칙으로 정해진다. */
  dispatchNotification(payload) {
    const p = payload || {};
    const s = this.state.notificationSettings;
    const now = p.now instanceof Date ? p.now : new Date();
    const visible = !(p.context && p.context.visible === false);
    const kind = p.kind || 'system';
    const category = p.category && NOTIFICATION_CATEGORIES.some((c) => c.id === p.category)
      ? p.category
      : resolveNotificationCategory({ kind, category: p.category, action: p.action });

    let channel = 'inapp';
    let reason = 'foreground';
    const dndNow = this.isDndActive(now);
    const dndExempt = dndNow && this.isDndExempt(category);
    if (!s.pushEnabled) { channel = 'suppressed'; reason = 'push_off'; }
    else if (!this.isCategoryEnabled(category)) { channel = 'suppressed'; reason = 'category_off'; }
    /* Sprint 7 — 야간 예외(기본: 모임 가입 결과)는 방해 금지 시간에도 그대로 전달한다. */
    else if (dndNow && !dndExempt) { channel = 'suppressed'; reason = 'dnd'; }
    else if (s.permission !== 'granted') { channel = 'inapp'; reason = 'needs_permission'; }
    else if (!visible) { channel = 'system'; reason = 'background'; }
    else { channel = 'inapp'; reason = 'foreground'; }

    const entry = {
      id: `ntf_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
      kind,
      category,
      title: String(p.title || 'ooG').slice(0, 40),
      body: String(p.body || '').slice(0, 160),
      /* Sprint 10 — 알림 묶음을 '펼쳐보기'할 때 누가 남겼는지 바로 쓰기 위해 행위자를 같이 남긴다. */
      actorName: p.actorName ? String(p.actorName).slice(0, 20) : null,
      roomId: p.roomId || null,
      groupId: p.groupId || null,
      postId: p.postId || null,
      source: p.source || null,          /* 'explore' | 'feed' — 좋아요·댓글 알림의 출처 */
      action: p.action || null,          /* 'join_request' | 'join_result' … */
      at: now.toISOString(),
      read: false,
      channel,
      reason,
      /* Sprint 7 — 야간 예외로 전달된 알림인지(알림함에 '야간에도 즉시' 표시). */
      dndExempt: dndExempt || false
    };
    if (!Array.isArray(this.state.notificationLog)) this.state.notificationLog = [];
    this.state.notificationLog.unshift(entry);
    if (this.state.notificationLog.length > 40) {
      this.state.notificationLog.length = 40;
    }
    this.saveState();
    return { ok: channel !== 'suppressed', channel, reason, entry };
  }

  /**
   * 상대 답장을 알린다. 그 방을 보고 있는 중(watching)이면 알리지 않는다.
   * @param {string} roomId
   * @param {object|null} message 도착한 메시지
   * @param {{watching?:boolean, visible?:boolean}} options
   */
  notifyChatReply(roomId, message, options) {
    const room = this.getChatRoom(roomId);
    if (!room) return null;
    const o = options || {};
    if (o.watching) return null;
    return this.dispatchNotification({
      kind: 'chat',
      title: room.partnerName,
      body: (message && message.text) || room.lastMessage || '새 메시지가 도착했어요',
      roomId: room.id,
      context: { visible: o.visible !== false }
    });
  }

  /* ==========================================================================
   * Sprint 5 — A-2. 알림 범위 확장 (좋아요 · 댓글 · 가입 신청 · 가입 결과)
   * ------------------------------------------------------------------------
   *  모두 dispatchNotification() 을 거친다. 따라서
   *   · 채널 결정(system / inapp / suppressed)
   *   · 알림함(notificationLog) 기록
   *   · 종류별 토글(category_off)
   *  이 한 경로로 일관되게 처리되고, 화면은 entry 의 postId / groupId 로 딥링크한다.
   * ======================================================================== */

  /** 내가 쓴 글이 모아져 있는 컬렉션 — 알림 시뮬레이션과 '내 글' 판정의 기준. */
  getMyExplorePosts() {
    return (this.state.explorePosts || [])
      .filter((p) => p.isMine || p.authorId === this.state.currentUser.id);
  }

  /**
   * 프로필 '저장한 글' — 북마크한 모임 피드 글을 최신순으로.
   * 파생값이라 저장 상태를 새로 만들지 않는다(북마크를 해제하면 바로 빠진다).
   */
  getSavedPosts() {
    return (this.state.feedPosts || [])
      .filter((p) => p.bookmarkedByMe)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * 알림용 게시글 해석 — 탐색 공개글(explore)과 모임 피드(feed)를 모두 본다.
   * @returns {{post:object, mine:boolean, source:'explore'|'feed'}|null}
   */
  resolvePostForNotification(source, postId) {
    const uid = this.state.currentUser.id;
    if (source === 'feed') {
      const post = (this.state.feedPosts || []).find((p) => p.id === postId);
      return post ? { post, mine: post.authorId === uid, source: 'feed' } : null;
    }
    const post = (this.state.explorePosts || []).find((p) => p.id === postId);
    if (!post) return null;
    return { post, mine: post.isMine || post.authorId === uid, source: 'explore' };
  }

  /**
   * 내 게시글의 좋아요·댓글 알림. 내 글이 아니면 아무 것도 보내지 않는다.
   * @param {{source?:'explore'|'feed', postId:string, kind?:'like'|'comment',
   *          actorName:string, text?:string, context?:object}} payload
   * @returns {{ok, channel, reason, entry}|null}
   */
  notifyPostReaction(payload) {
    const p = payload || {};
    const resolved = this.resolvePostForNotification(p.source || 'explore', p.postId);
    if (!resolved) return null;
    if (!resolved.mine) return null;          /* 남의 글 반응은 알리지 않는다 */
    const post = resolved.post;
    const actor = String(p.actorName || '취미친구').slice(0, 20);
    const preview = String(post.caption || '').trim().replace(/\s+/g, ' ').slice(0, 24);
    const isComment = p.kind === 'comment';
    const body = isComment
      ? `${actor}: ${String(p.text || '').slice(0, 80)}`
      : `${actor}님이 "${preview}${preview.length >= 24 ? '…' : ''}" 글에 좋아요를 남겼어요`;
    return this.dispatchNotification({
      kind: isComment ? 'comment' : 'like',
      title: isComment ? '내 글에 새 댓글' : '내 글에 좋아요',
      body,
      actorName: actor,
      postId: post.id,
      source: resolved.source,
      action: isComment ? 'comment' : 'like',
      context: p.context || { visible: true }
    });
  }

  /**
   * 모임장에게 가는 '새 가입 신청 도착' 알림. 모임장이 아니면 보내지 않는다.
   * @param {string|object} applicationIdOrApp
   */
  notifyJoinRequest(applicationIdOrApp) {
    const app = typeof applicationIdOrApp === 'string'
      ? (this.state.groupApplications || []).find((a) => a.id === applicationIdOrApp)
      : applicationIdOrApp;
    if (!app || app.status !== 'pending') return null;
    if (!this.isGroupLeader(app.groupId)) return null;
    const group = this.getGroup(app.groupId);
    return this.dispatchNotification({
      kind: 'join_request',
      title: '가입 신청 도착',
      body: `${app.applicantName}님이 "${app.groupName}" 가입을 신청했어요 · 소개서를 확인해 보세요`,
      groupId: app.groupId,
      action: 'join_request',
      context: { visible: true, groupName: group ? group.name : app.groupName }
    });
  }

  /**
   * 신청자에게 가는 처리 결과 알림 (수락 / 거절).
   * @param {object} application
   * @param {boolean} approved
   */
  notifyJoinDecision(application, approved) {
    const app = application;
    if (!app) return null;
    const group = this.getGroup(app.groupId);
    const name = app.groupName || (group ? group.name : '모임');
    return this.dispatchNotification({
      kind: 'join_result',
      title: approved ? '가입이 수락되었어요' : '가입 신청 결과',
      body: approved
        ? `"${name}" 가입이 승인되었어요. 지금 바로 모임 피드에 인사해 보세요!`
        : `"${name}" 가입 신청이 이번에는 받아들여지지 않았어요. ${app.decisionNote || ''}`.trim(),
      groupId: app.groupId,
      action: 'join_result',
      context: { visible: true }
    });
  }

  /* ---------------- 시뮬레이션 트리거 (실제 이벤트와 같은 경로를 쓴다) ----------------
   * 이 앱은 서버 없이 한 사람이 쓰는 시제품이라 "남이 내 글에 반응하는 순간"이 스스로
   * 일어나지 않는다. 그래서 실제 이벤트가 들어왔을 때와 **똑같은 상태 변경 + 알림**을
   * 일으키는 트리거를 둔다. (프로필 › 알림 설정의 시험 버튼과 게시 직후 자동 반응이 사용)
   * ------------------------------------------------------------------------- */
  simulateIncomingReaction(kind = 'like', options = {}) {
    const mine = this.getMyExplorePosts();
    if (!mine.length) return { ok: false, reason: 'no_post' };
    const post = options.postId
      ? mine.find((p) => p.id === options.postId) || mine[0]
      : mine[0];
    const persona = options.persona
      || SIMULATED_PERSONAS[Math.floor(Math.random() * SIMULATED_PERSONAS.length)];
    const isComment = kind === 'comment';
    if (isComment) {
      if (!Array.isArray(post.comments)) post.comments = [];
      post.comments.push({
        id: `pc_sim_${Date.now()}`,
        authorId: persona.id,
        authorName: persona.name,
        text: options.text || `글 잘 봤어요! 저도 ${post.hobbyLabel || '이 취미'} 좋아합니다`,
        createdAt: new Date().toISOString()
      });
    } else {
      post.likes = Math.max(0, (post.likes || 0) + 1);
    }
    this.saveState();
    const res = this.notifyPostReaction({
      source: 'explore',
      postId: post.id,
      kind: isComment ? 'comment' : 'like',
      actorName: persona.name,
      text: isComment ? post.comments[post.comments.length - 1].text : null,
      context: options.context || { visible: true }
    });
    return { ok: true, post, persona, res };
  }

  /** 모임장 모임에 새 가입 신청이 도착한 상황을 만든다. */
  simulateJoinRequest(groupId, options = {}) {
    const ledger = (this.state.groups || []).filter((g) => this.isGroupLeader(g.id));
    const group = groupId ? this.getGroup(groupId) : ledger[0];
    if (!group) return { ok: false, reason: 'not_found' };
    if (!this.isGroupLeader(group.id)) return { ok: false, reason: 'permission' };
    const persona = options.persona
      || SIMULATED_PERSONAS[Math.floor(Math.random() * SIMULATED_PERSONAS.length)];
    const questions = this.getGroupJoinQuestions(group.id);
    const application = {
      id: `app_sim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      groupId: group.id,
      groupName: group.name,
      groupIcon: group.icon,
      applicantId: persona.id,
      applicantName: persona.name,
      applicantAge: persona.age,
      applicantHobby: persona.hobby,
      applicantAvatarText: persona.avatarText,
      applicantGradient: persona.gradient,
      answers: (questions.length ? questions : ['취미 구력이나 참여 가능한 요일을 적어주세요!']).map((q, i) => ({
        question: q,
        answer: i === 0
          ? `${persona.hobby} 시작한 지 1년쯤 되었고, 평일 저녁이면 언제든 갈 수 있어요!`
          : '같이 즐기면서 서로 자세도 봐줄 수 있었으면 좋겠습니다.'
      })),
      status: 'pending',
      createdAt: new Date().toISOString(),
      decidedAt: null,
      decisionNote: null,
      simulated: true
    };
    if (!Array.isArray(this.state.groupApplications)) this.state.groupApplications = [];
    this.state.groupApplications.unshift(application);
    this.saveState();
    const res = this.notifyJoinRequest(application);
    return { ok: true, application, group, res };
  }

  /** 내가 낸 신청이 수락된 상황을 만들어 결과 알림을 보낸다. */
  simulateJoinDecision(approved = true) {
    const mine = (this.state.groupApplications || []).find(
      (a) => a.applicantId === this.state.currentUser.id && a.status === 'pending'
    );
    if (!mine) return { ok: false, reason: 'no_pending' };
    const group = this.getGroup(mine.groupId);
    mine.status = approved ? 'approved' : 'rejected';
    mine.decidedAt = new Date().toISOString();
    mine.decisionNote = approved ? '수락' : '이번에는 함께하지 못했어요';
    if (approved && group && !this.isGroupJoined(group.id)) {
      this.state.currentUser.joinedGroupIds.push(group.id);
      group.memberCount = Math.max(1, group.memberCount + 1);
    }
    this.saveState();
    const res = this.notifyJoinDecision(mine, approved);
    return { ok: true, application: mine, group, res };
  }

  /**
   * 1:1 새 메시지 도착 시뮬레이션 (Sprint 6) — 대화방 하나에 상대 답장을 넣고
   * notifyChatReply() 로 알린다. 실제 답장 경로(receiveChatMessage → notifyChatReply)와 같다.
   * @param {{roomId?:string, text?:string, visible?:boolean}} options
   */
  simulateChatReply(options) {
    const o = options || {};
    const rooms = this.state.chatRooms || [];
    const room = o.roomId ? this.getChatRoom(o.roomId) : rooms[0];
    if (!room) return { ok: false, reason: 'no_room' };
    if (!Array.isArray(room.messages)) room.messages = [];
    const text = String(o.text || this.buildChatReply(room)).slice(0, 200);
    const message = {
      id: `msg_sim_${Date.now()}`,
      from: 'them',
      text,
      at: new Date().toISOString()
    };
    room.messages.push(message);
    room.lastMessage = text;
    room.lastTime = '방금';
    room.unreadCount = (room.unreadCount || 0) + 1;
    this.saveState();
    const res = this.notifyChatReply(room.id, message, { visible: o.visible !== false });
    return { ok: true, room, message, res };
  }

  /** 알림 테스트 발송 — 실제 권한 상태를 그대로 반영해 채널을 돌려준다. */  sendTestNotification(context) {
    const s = this.state.notificationSettings;
    s.lastTestAt = new Date().toISOString();
    return this.dispatchNotification({
      kind: 'system',
      title: 'ooG (우그)',
      body: s.permission === 'granted'
        ? 'ooG 푸시 알림이 활성화되었어요! 새 메시지를 놓치지 않게 알려드릴게요'
        : '알림 미리보기예요. 권한을 허용하면 앱을 꺼도 알려드릴게요',
      context: context || { visible: true }
    });
  }

  /**
   * 알림함 목록 (Sprint 7 — 종류 필터 · 안 읽은 것만 보기).
   * @param {number|{category?:string, unreadOnly?:boolean, limit?:number}} [options]
   *        숫자를 넘기면 그 개수만큼(옛 호출 방식 그대로).
   */
  getNotifications(options) {
    const list = this.state.notificationLog || [];
    if (typeof options === 'number') return list.slice(0, Math.max(0, options));
    const o = options || {};
    const category = o.category && o.category !== 'all' ? o.category : null;
    const filtered = list.filter((n) => {
      if (category && n.category !== category) return false;
      if (o.unreadOnly && n.read) return false;
      return true;
    });
    return typeof o.limit === 'number' ? filtered.slice(0, Math.max(0, o.limit)) : filtered;
  }

  /** 알림함 요약 — 전체·안 읽음·종류별 건수(필터 칩의 숫자). */
  getNotificationStats() {
    const list = this.state.notificationLog || [];
    const byCategory = { system: 0 };
    NOTIFICATION_CATEGORIES.forEach((c) => { byCategory[c.id] = 0; });
    list.forEach((n) => {
      const cat = resolveNotificationCategory(n);
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    return {
      total: list.length,
      unread: list.filter((n) => !n.read).length,
      byCategory,
      unreadByCategory: list.filter((n) => !n.read).reduce((map, n) => {
        const cat = resolveNotificationCategory(n);
        map[cat] = (map[cat] || 0) + 1;
        return map;
      }, {})
    };
  }

  getUnreadNotificationCount() {
    return (this.state.notificationLog || []).filter((n) => !n.read).length;
  }

  /** 알림 하나를 읽음으로 표시한다(알림함에서 항목을 눌렀을 때). */
  markNotificationRead(notificationId) {
    const entry = (this.state.notificationLog || []).find((n) => n.id === notificationId);
    if (!entry || entry.read) return 0;
    entry.read = true;
    this.saveState();
    return 1;
  }

  markNotificationsRead() {
    let changed = 0;
    (this.state.notificationLog || []).forEach((n) => {
      if (!n.read) { n.read = true; changed += 1; }
    });
    if (changed) this.saveState();
    return changed;
  }

  /* ==========================================================================
   * Sprint 8 — 알림함 2차 (스와이프 읽음/지우기 · 종류별 예시 미리보기)
   * ------------------------------------------------------------------------
   *  · 스와이프 오른쪽 = 읽음, 왼쪽 = 지우기. 지우기는 되돌릴 수 있도록
   *    화면이 지운 항목을 기억했다가 restoreNotification() 으로 되살린다.
   *  · 알림 설정의 '예시 보기'는 실제 알림과 같은 모양으로 미리보기를 그린다.
   * ======================================================================== */

  /** 알림 하나를 지운다. 지운 항목을 돌려주어 화면이 '되돌리기'에 쓸 수 있게 한다. */
  deleteNotification(notificationId) {
    if (!Array.isArray(this.state.notificationLog)) return null;
    const index = this.state.notificationLog.findIndex((n) => n.id === notificationId);
    if (index < 0) return null;
    const [removed] = this.state.notificationLog.splice(index, 1);
    this.saveState();
    return { entry: removed, index };
  }

  /** 지운 알림을 원래 순서로 되살린다(되돌리기). */
  restoreNotification(entry, index) {
    if (!entry) return false;
    if (!Array.isArray(this.state.notificationLog)) this.state.notificationLog = [];
    if (this.state.notificationLog.some((n) => n.id === entry.id)) return false;
    const at = Math.max(0, Math.min(this.state.notificationLog.length, Number(index) || 0));
    this.state.notificationLog.splice(at, 0, entry);
    this.saveState();
    return true;
  }

  /** 알림을 '안 읽음'으로 되돌린다(스와이프 읽음의 취소). */
  markNotificationUnread(notificationId) {
    const entry = (this.state.notificationLog || []).find((n) => n.id === notificationId);
    if (!entry || !entry.read) return 0;
    entry.read = false;
    this.saveState();
    return 1;
  }

  /**
   * 알림 종류별 예시 — 알림 설정에서 '이런 알림이 와요'를 실제 알림 모양으로 보여준다.
   * @param {string} categoryId chat | like | comment | join_request | join_result | hot
   * @returns {{category,icon,label,kind,at,title,body,sample}|null}
   */
  getNotificationPreview(categoryId) {
    const cat = NOTIFICATION_CATEGORIES.find((c) => c.id === categoryId);
    if (!cat) return null;
    const samples = {
      chat: { kind: 'chat', title: '준호', body: '오늘 19:10반 들어요? 저는 10분 전에 도착할게요' },
      like: { kind: 'like', title: '내 글에 좋아요', body: '준호님이 내 취미 글에 하트를 남겼어요' },
      comment: { kind: 'comment', title: '내 글에 댓글', body: '도현: 이번 주말에 같이 가요! 저도 궁금했어요' },
      join_request: { kind: 'join_request', title: '가입 신청', body: '케틀벨러버님이 "성수 레벨업 퇴근 와드팟" 가입을 신청했어요' },
      join_result: { kind: 'join_result', title: '가입 결과', body: '"한강 나이트 러닝 크루" 가입이 수락되었어요' },
      hot: { kind: 'hot_entry', title: '실시간 베스트 진입', body: '내 글이 실베 3위에 올랐어요 · 26 · 4' }
    };
    const s = samples[categoryId] || {};
    return {
      category: cat.id,
      icon: cat.icon,
      label: cat.label,
      kind: s.kind || cat.id,
      title: s.title || cat.label,
      body: s.body || cat.desc,
      at: new Date().toISOString(),
      sample: true
    };
  }

  /* ==========================================================================
   * Sprint 9 — 알림 묶음 · 주간 요약 (11/15 00:23)
   * ------------------------------------------------------------------------
   *  · 같은 글에 달린 좋아요·댓글은 **한 줄로 묶어** 보여준다(알림함이 길어지지 않게).
   *    묶음은 보이는 방식일 뿐이고 데이터(notificationLog)는 그대로다 — 묶음 단위로
   *    읽음/지워기를 해도 알림 하나하나의 상태가 바뀐다.
   *  · 알림함 맨 위에는 이번 주 요약을 둔다: 이번 주 건수 · 종류별 · 가장 반응이 많았던 내 글.
   *  · summarize() 는 표시용 묶음이라 저장하지 않는다(지우기·되돌리기는 원본 알림 단위).
   * ======================================================================== */

  /** 알림 하나가 '내 글의 반응'(동일 글 묶음 대상)인지. 좋아요·댓글이고 글이 특정된 경우만. */
  static isReactionNotification(entry) {
    if (!entry || !entry.postId) return false;
    const cat = resolveNotificationCategory(entry);
    return cat === 'like' || cat === 'comment';
  }

  /** 알림 하나를 '펼쳐보기' 한 줄로 요약한다 — 누가 · 무슨 반응 · 언제. */
  static notificationItem(entry) {
    const cat = resolveNotificationCategory(entry);
    const meta = NOTIFICATION_CATEGORIES.find((c) => c.id === cat);
    const icon = cat === 'like' ? 'heart' : cat === 'comment' ? 'comment' : (meta ? meta.icon : 'bell');
    return {
      id: entry.id,
      category: cat,
      icon,
      actorName: resolveNotificationActor(entry),
      text: String(entry.body || '').slice(0, 160),
      at: entry.at || null,
      read: !!entry.read
    };
  }

  /**
   * 알림함을 **묶음 단위**로 돌려준다(최신순).
   * @param {{category?:string, unreadOnly?:boolean, limit?:number}} [options] getNotifications 와 같은 옵션
   * @returns {Array<{key:string, type:'reaction'|'single', entry:object, entries:object[],
   *                  count:number, unreadCount:number, ids:string[], likeCount:number,
   *                  commentCount:number, title:string, body:string, at:string, postId:string|null,
   *                  items:Array<object>, expandable:boolean}>}
   */
  getGroupedNotifications(options) {
    const o = options || {};
    const list = this.getNotifications(options);
    const groups = [];
    const byPost = new Map();
    list.forEach((n) => {
      if (!Store.isReactionNotification(n)) {
        groups.push({
          key: `single:${n.id}`, type: 'single', entry: n, entries: [n],
          category: resolveNotificationCategory(n),
          count: 1, unreadCount: n.read ? 0 : 1, ids: [n.id],
          likeCount: resolveNotificationCategory(n) === 'like' ? 1 : 0,
          commentCount: resolveNotificationCategory(n) === 'comment' ? 1 : 0,
          title: n.title, body: n.body, at: n.at, postId: n.postId || null,
          items: [Store.notificationItem(n)], expandable: false
        });
        return;
      }
      const key = `post:${n.postId}`;
      let g = byPost.get(key);
      if (!g) {
        g = {
          key, type: 'reaction', entry: n, entries: [], count: 0, unreadCount: 0, ids: [],
          category: resolveNotificationCategory(n),
          likeCount: 0, commentCount: 0, title: '', body: '', at: n.at, postId: n.postId,
          items: [], expandable: false
        };
        byPost.set(key, g);
        groups.push(g);
      }
      g.entries.push(n);
      g.ids.push(n.id);
      g.count += 1;
      if (!n.read) g.unreadCount += 1;
      if (resolveNotificationCategory(n) === 'like') g.likeCount += 1;
      else g.commentCount += 1;
    });
    const built = groups.map((g) => {
      if (g.type !== 'reaction') return g;
      const head = g.entries[0];
      const pieces = [];
      if (g.likeCount) pieces.push(`좋아요 ${g.likeCount}`);
      if (g.commentCount) pieces.push(`댓글 ${g.commentCount}`);
      /* 최근 두 건의 본문만 — 건수는 제목('반응 3개')과 종류 칩(좋아요2 · 댓글1)이 이미 말한다. */
      const lastBody = (g.entries.slice(0, 2).map((e) => e.body).filter(Boolean).join(' · '));
      return {
        ...g,
        title: g.count > 1 ? `내 글에 반응 ${g.count}개` : head.title,
        body: g.count > 1 ? (lastBody || pieces.join(' · ')).slice(0, 160) : head.body,
        at: head.at,
        /* Sprint 10 — 기본은 1줄 요약, 펼치면 개별 항목(누가·무슨 반응·언제)을 한 줄씩. */
        items: g.entries.map((e) => Store.notificationItem(e)),
        expandable: g.entries.length > 1
      };
    });
    /* Sprint 11 — 알림함 4차: 실베 진입·시스템 알림은 한 칸으로 접어 모아 본다. */
    if (!o.mergeRoutine) return built;
    return Store.collapseRoutineNotifications(built, { categories: o.routineCategories });
  }

  /**
   * Sprint 11 — '조용한 알림'(실베 진입·시스템)을 **종류별 한 칸**으로 접는다.
   *  11/15 02:00 알림함 4차: "실베/시스템 알림을 한 칸에 모아 보기".
   *  · 좋아요·댓글(reaction)은 이미 글 단위로 묶여 있으니 손대지 않는다.
   *  · 접힌 줄은 가장 최근 알림 자리에 놓이고, 펼치면 원래 알림이 한 줄씩 나온다.
   *  · 접혀 있어도 상태는 그대로 — 묶음 단위 읽음/지우기는 원본 알림 하나하나에 적용된다.
   * @param {Array<object>} groups getGroupedNotifications 가 만든 묶음(최신순)
   * @param {{categories?:string[]}} [options] 접을 카테고리(기본 hot·system)
   * @returns {Array<object>} type:'routine' 묶음이 섞인 목록
   */
  static collapseRoutineNotifications(groups, options) {
    const o = options || {};
    const cats = Array.isArray(o.categories)
      ? o.categories.slice()
      : ['hot', 'system'];
    const out = [];
    const byCat = new Map();
    (Array.isArray(groups) ? groups : []).forEach((g) => {
      if (!g || g.type !== 'single' || !cats.includes(g.category)) { out.push(g); return; }
      let bucket = byCat.get(g.category);
      if (!bucket) {
        bucket = {
          ...g,
          key: `routine:${g.category}`,
          type: 'routine',
          entries: [], ids: [], items: [],
          count: 0, unreadCount: 0,
          likeCount: 0, commentCount: 0
        };
        byCat.set(g.category, bucket);
        out.push(bucket);          // 가장 최근 알림이 있던 자리
      }
      bucket.entries.push(g.entry);
      bucket.ids.push(...(g.ids || []));
      bucket.items.push(...(g.items || []));
      bucket.count += 1;
      bucket.unreadCount += (g.unreadCount || 0);
    });
    return out.filter(Boolean).map((g) => {
      if (g.type !== 'routine') return g;
      const meta = NOTIFICATION_CATEGORIES.find((c) => c.id === g.category);
      const icon = meta ? meta.icon : '';
      const label = g.category === 'system' ? '시스템 알림' : (meta ? meta.label : '알림');
      const head = g.entries[0] || g.entry;
      const single = g.count === 1;
      return {
        ...g,
        entry: head,
        postId: head.postId || g.postId || null,
        at: head.at || g.at,
        title: single ? (head.title || `${icon} ${label}`) : `${icon} ${label} ${g.count}건`,
        body: single
          ? (head.body || '')
          : String(head.body || head.title || '').slice(0, 160),
        items: single ? [] : g.items,
        expandable: !single
      };
    });
  }

  /** 묶음(또는 여러 알림)을 한 번에 읽음 처리한다. */
  markNotificationsReadByIds(ids) {
    const set = new Set(ids || []);
    let changed = 0;
    (this.state.notificationLog || []).forEach((n) => {
      if (set.has(n.id) && !n.read) { n.read = true; changed += 1; }
    });
    if (changed) this.saveState();
    return changed;
  }

  /** 묶음(또는 여러 알림)을 한 번에 지운다 — 되돌리기용으로 지운 항목·자리를 돌려준다. */
  deleteNotificationsByIds(ids) {
    const set = new Set(ids || []);
    if (!set.size || !Array.isArray(this.state.notificationLog)) return null;
    const removed = [];
    this.state.notificationLog.forEach((n, index) => {
      if (set.has(n.id)) removed.push({ entry: n, index });
    });
    if (!removed.length) return null;
    this.state.notificationLog = this.state.notificationLog.filter((n) => !set.has(n.id));
    this.saveState();
    return { removed };
  }

  /** deleteNotificationsByIds() 로 지운 여러 알림을 원래 자리에 되살린다. */
  restoreNotifications(removed) {
    if (!Array.isArray(removed) || !removed.length) return 0;
    if (!Array.isArray(this.state.notificationLog)) this.state.notificationLog = [];
    const items = removed.slice().sort((a, b) => a.index - b.index);
    let restored = 0;
    items.forEach(({ entry, index }) => {
      if (!entry || this.state.notificationLog.some((n) => n.id === entry.id)) return;
      const at = Math.max(0, Math.min(this.state.notificationLog.length, Number(index) || 0));
      this.state.notificationLog.splice(at, 0, entry);
      restored += 1;
    });
    if (restored) this.saveState();
    return restored;
  }

  /* ==========================================================================
   * Sprint 9 — 내 활동 로그 내보내기 (11/15 00:23)
   * ------------------------------------------------------------------------
   *  · 기간별 활동을 **텍스트(아이폰 메모·노션에 붙여넣기)** 또는 **CSV**로 만든다.
   *  · 만드는 일만 store가 한다(클리보드·파일 저장은 화면 담당).
   *  · CSV는 엑셀·구글시트에서 한글이 깨지지 않도록 화면에서 UTF-8 BOM을 붙인다.
   * ======================================================================== */

  /**
   * 활동 로그를 텍스트/CSV 문자열로 만든다.
   * @param {{type?:string, range?:'all'|'7d'|'30d', format?:'text'|'csv', now?:Date|number, limit?:number}} [options]
   * @returns {{format:string, count:number, text:string, filename:string, rangeName:string}}
   */
  exportActivityLog(options) {
    const o = options || {};
    const format = o.format === 'csv' ? 'csv' : 'text';
    const limit = typeof o.limit === 'number' ? o.limit : 500;
    const logs = this.getActivityLogs({ type: o.type, range: o.range, limit, now: o.now });
    const rangeOpt = this.getActivityRangeOptions().find((r) => r.id === (o.range || 'all'))
      || { id: 'all', name: '전체' };
    const typeOpt = this.getActivityTypes().find((t) => t.id === (o.type || 'all'))
      || { id: 'all', name: '전체' };
    const pad = (n) => String(n).padStart(2, '0');
    const dayOf = (iso) => {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const clockOf = (iso) => {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const stamp = dayOf(new Date().toISOString());
    const typeNameOf = (entry) => (this.getActivityTypes().find((t) => t.id === entry.type) || {}).name || '활동';
    let text = '';
    if (format === 'csv') {
      const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
      const rows = [['날짜', '시각', '종류', '활동', '내용']];
      logs.forEach((e) => {
        rows.push([dayOf(e.at), clockOf(e.at), typeNameOf(e), e.title, e.body || '']);
      });
      text = rows.map((r) => r.map(esc).join(',')).join('\r\n');
    } else {
      const head = [`ooG 내 활동 로그`, `${rangeOpt.name} · ${typeOpt.name} · ${logs.length}건`, `내보낸 시각 ${stamp} ${clockOf(new Date().toISOString())}`];
      const lines = [head.join('\n'), ''];
      let lastDay = null;
      logs.forEach((e) => {
        const day = dayOf(e.at);
        if (day !== lastDay) {
          lines.push(`── ${day} ──`);
          lastDay = day;
        }
        lines.push(`· ${clockOf(e.at)} [${typeNameOf(e)}] ${e.title}${e.body ? ` — ${e.body}` : ''}`);
      });
      if (!logs.length) lines.push('· 이 기간에는 기록이 없어요');
      text = lines.join('\n');
    }
    const suffix = `${o.range && o.range !== 'all' ? `_${o.range}` : ''}${o.type && o.type !== 'all' ? `_${o.type}` : ''}`;
    return {
      format,
      count: logs.length,
      text,
      rangeName: rangeOpt.name,
      filename: `oog_activity_${stamp}${suffix}.${format === 'csv' ? 'csv' : 'txt'}`
    };
  }

  /* ==========================================================================
   * Sprint 4.5 — B. 모임 가입 정책 (자유 가입 · 승인제 · 나이 제한)
   * ======================================================================== */
  getAgeLimitOptions() { return this.state.ageLimitOptions || []; }

  getAgeLimit(limitId) {
    return this.getAgeLimitOptions().find((o) => o.id === limitId) || null;
  }

  /** H4 — 19~99 밖으로 나가지 않게 다듬고, 두 값의 순서를 바로잡는다. */
  normalizeGroupAgeRange(min, max) {
    const toAge = (v, fallback) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(GROUP_AGE_MAX, Math.max(GROUP_AGE_MIN, Math.round(n)));
    };
    const lo = toAge(min, GROUP_AGE_MIN);
    const hi = toAge(max, GROUP_AGE_MAX);
    return { min: Math.min(lo, hi), max: Math.max(lo, hi) };
  }

  /**
   * H4 — 나이 범위를 배지·판정에 쓰는 옵션 모양으로 만든다.
   *   · 양끝(19~99)      → '제한 없음'(all)
   *   · 옛 프리셋과 같다  → 그 프리셋(20대만·2030·30대+)
   *   · 그 밖의 범위      → id 'custom' + 표기 '25세 ~ 35세' · '30세 이상' · '29세 이하'
   */
  ageRangeOption(min, max) {
    const r = this.normalizeGroupAgeRange(min, max);
    if (r.min <= GROUP_AGE_MIN && r.max >= GROUP_AGE_MAX) return this.getAgeLimit('all');
    const preset = this.getAgeLimitOptions()
      .filter((o) => o.id !== 'all')
      .find((o) => {
        /* '30대 이상'은 max 200 이라 99 와 비교하면 늘 어긋난다 — 같은 19~99 로 맞춰 견준다. */
        const pr = this.normalizeGroupAgeRange(o.min, o.max);
        return pr.min === r.min && pr.max === r.max;
      });
    if (preset) return preset;
    const label = r.min <= GROUP_AGE_MIN ? `${r.max}세 이하`
      : (r.max >= GROUP_AGE_MAX ? `${r.min}세 이상` : `${r.min}세 ~ ${r.max}세`);
    return {
      id: 'custom', label, short: label, badge: label, cardBadge: label,
      tone: 'custom', min: r.min, max: r.max
    };
  }

  /**
   * 모임의 나이 범위 — 저장된 ageMin·ageMax 를 먼저 읽고, 옛 모임은 ageLimit id 에서 되살린다.
   * @returns {{min:number, max:number, active:boolean, option:object}}
   */
  getGroupAgeRange(group) {
    const g = typeof group === 'string' ? this.getGroup(group) : group;
    const all = this.getAgeLimit('all');
    if (!g) return { min: GROUP_AGE_MIN, max: GROUP_AGE_MAX, active: false, option: all };
    const saved = Number.isFinite(Number(g.ageMin)) && Number.isFinite(Number(g.ageMax))
      ? this.normalizeGroupAgeRange(g.ageMin, g.ageMax)
      : this.normalizeGroupAgeRange((this.getAgeLimit(g.ageLimit) || all).min,
        (this.getAgeLimit(g.ageLimit) || all).max);
    const option = this.ageRangeOption(saved.min, saved.max) || all;
    return { min: saved.min, max: saved.max, active: option.id !== 'all', option };
  }

  /** 모임의 가입 방식 — 필드가 없는 옛 상태도 privacyType 에서 해석한다. */
  getGroupJoinMode(group) {
    const g = typeof group === 'string' ? this.getGroup(group) : group;
    if (!g) return 'open';
    return g.joinMode || (g.privacyType === 'open' ? 'open' : 'approval');
  }

  /** 모임의 나이 제한 옵션 (없으면 '제한 없음'). */
  getGroupAgeLimit(groupId) {
    const g = this.getGroup(groupId);
    const fallback = this.getAgeLimit('all') || { id: 'all', label: '제한 없음', short: '전 연령', badge: '', cardBadge: '전 연령', tone: 'all', min: 0, max: 200 };
    if (!g) return fallback;
    /* H4 — 슬라이더로 고른 범위(ageMin·ageMax)가 있으면 그 범위의 옵션을 돌려준다. */
    return this.getGroupAgeRange(g).option || fallback;
  }

  /**
   * 모임 카드 겉면에 붙는 나이 배지 (Sprint 5).
   * 제한이 없으면 null — 카드에 굳이 '전 연령'을 붙이지 않아 제한이 있는 모임이 더 눈에 띈다.
   * @returns {{id:string, text:string, tone:string, label:string}|null}
   */
  getGroupAgeBadge(groupId) {
    const age = this.getGroupAgeLimit(groupId);
    if (!age || age.id === 'all') return null;
    return {
      id: age.id,
      text: age.cardBadge || age.short,
      tone: age.tone || age.id,
      label: age.label
    };
  }

  getGroupJoinQuestions(groupId) {
    const g = this.getGroup(groupId);
    if (!g) return [];
    const qs = Array.isArray(g.joinQuestions) ? g.joinQuestions.filter(Boolean) : [];
    /* 승인제인데 질문이 비어 있는 옛 상태는 기본 질문으로 동작한다 */
    if (!qs.length && this.getGroupJoinMode(g) === 'approval') {
      return ['취미 구력이나 선호 요일을 적어주세요!'];
    }
    return qs;
  }

  /**
   * 나이 제한 판정. 나이를 모르면(null) 막지 않는다.
   * @returns {{ok:boolean, reason:string|null, message:string, option:object}}
   */
  ageAllowed(age, limit) {
    /* 한계값은 옵션 id('20s'…) 이거나, 이미 풀어 둔 옵션 객체(슬라이더 범위)일 수 있다. */
    const option = (limit && typeof limit === 'object')
      ? limit
      : (this.getAgeLimit(limit) || this.getAgeLimit('all'));
    const n = Number(age);
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: true, reason: null, message: '', option };
    }
    if (n >= option.min && n <= option.max) {
      return { ok: true, reason: null, message: '', option };
    }
    return {
      ok: false,
      reason: 'age',
      message: `이 모임은 ${option.short}만 가입할 수 있어요`,
      option
    };
  }

  /** 모임 가입 가능 여부 (나이 제한 + 현재 상태). */
  isAgeEligible(groupId, age) {
    const target = age == null ? this.state.currentUser.age : age;
    return this.ageAllowed(target, this.getGroupAgeLimit(groupId));
  }

  /**
   * 이 모임에 대해 나(현재 사용자)가 어떤 상태인가.
   * @returns {'member'|'pending'|'rejected'|'none'}
   */
  getJoinState(groupId) {
    if (this.isGroupJoined(groupId)) return 'member';
    const app = this.getApplicationForGroup(groupId);
    if (app && app.status === 'pending') return 'pending';
    if (app && app.status === 'rejected') return 'rejected';
    return 'none';
  }

  /** 내가 이 모임에 낸 가장 최근 신청서(취소·거절 포함). */
  getApplicationForGroup(groupId) {
    const mine = (this.state.groupApplications || [])
      .filter((a) => a.groupId === groupId && a.applicantId === this.state.currentUser.id);
    return mine.length ? mine[0] : null;
  }

  /** 모임장 화면: 이 모임의 신청서 (기본은 대기 중인 것만, 최신순). */
  getApplicationsForGroup(groupId, status) {
    const wanted = status === undefined ? 'pending' : status;
    return (this.state.groupApplications || [])
      .filter((a) => a.groupId === groupId && (wanted == null || a.status === wanted))
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getPendingApplications(groupId) {
    return this.getApplicationsForGroup(groupId, 'pending');
  }

  /** 내가 모임장인 모든 모임의 대기 신청서. */
  getLeaderPendingApplications() {
    return (this.state.groupApplications || []).filter(
      (a) => a.status === 'pending' && this.can(a.groupId, 'approve_applications')
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getLeaderPendingCount() {
    return this.getLeaderPendingApplications().length;
  }

  /** 프로필: 내가 낸 신청 중 아직 대기 중인 건수 */
  getMyApplications(status) {
    const wanted = status === undefined ? null : status;
    return (this.state.groupApplications || [])
      .filter((a) => a.applicantId === this.state.currentUser.id
        && (wanted == null || a.status === wanted))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getMyPendingApplicationCount() {
    return this.getMyApplications('pending').length;
  }

  /**
   * 모임 가입 신청.
   *   · 자유 가입 모임 → 즉시 멤버가 된다 (신청서 없음).
   *   · 승인제 모임    → 가입 질문 답변을 담아 'pending' 신청서를 만든다.
   *   · 나이 제한에 걸리면 어느 쪽도 할 수 없다.
   * @param {string} groupId
   * @param {string[]|{question:string,answer:string}[]} answers
   * @returns {{ok:boolean, reason?:string, message?:string, application?:object,
   *            joined?:boolean, group?:object}}
   */
  applyToGroup(groupId, answers) {
    const group = this.getGroup(groupId);
    if (!group) return { ok: false, reason: 'not_found' };
    if (this.isGroupJoined(groupId)) return { ok: false, reason: 'already_member', group };

    const ageCheck = this.isAgeEligible(groupId);
    if (!ageCheck.ok) {
      return { ok: false, reason: 'age', message: ageCheck.message, group };
    }

    if (this.getGroupJoinMode(group) === 'open') {
      if (group.memberCount >= group.maxMembers) return { ok: false, reason: 'full', group };
      this.state.currentUser.joinedGroupIds.push(groupId);
      group.memberCount = Math.max(1, group.memberCount + 1);
      this.saveState();
      return { ok: true, joined: true, group };
    }

    const pending = (this.state.groupApplications || []).find(
      (a) => a.groupId === groupId
        && a.applicantId === this.state.currentUser.id
        && a.status === 'pending'
    );
    if (pending) return { ok: false, reason: 'already_pending', application: pending, group };

    const questions = this.getGroupJoinQuestions(groupId);
    const user = this.state.currentUser;
    const given = Array.isArray(answers) ? answers : [];
    const normalized = questions.map((q, i) => {
      const raw = given[i];
      const text = typeof raw === 'string' ? raw : (raw && raw.answer) || '';
      return { question: q, answer: String(text || '').trim().slice(0, 300) };
    });
    if (normalized.some((a) => !a.answer)) {
      return { ok: false, reason: 'answer_empty', group };
    }
    if (normalized.reduce((n, a) => n + a.answer.length, 0) < 10) {
      return { ok: false, reason: 'answer_short', group };
    }

    const application = {
      id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      groupId,
      groupName: group.name,
      groupIcon: group.icon,
      applicantId: user.id,
      applicantName: user.nickname,
      applicantAge: user.age,
      applicantHobby: (user.hobbies || []).slice(0, 2).join(' · ') || group.categoryName,
      applicantAvatarText: user.avatarText || user.nickname.charAt(0),
      applicantGradient: user.avatarGradient,
      answers: normalized,
      status: 'pending',
      createdAt: new Date().toISOString(),
      decidedAt: null,
      decisionNote: null
    };
    if (!Array.isArray(this.state.groupApplications)) this.state.groupApplications = [];
    this.state.groupApplications.unshift(application);
    this.saveState();
    return { ok: true, application, group, joined: false };
  }

  /** 신청자 본인이 대기 중인 신청을 취소한다. */
  cancelApplication(applicationId) {
    const app = (this.state.groupApplications || []).find((a) => a.id === applicationId);
    if (!app) return { ok: false, reason: 'not_found' };
    if (app.applicantId !== this.state.currentUser.id) return { ok: false, reason: 'permission' };
    if (app.status !== 'pending') return { ok: false, reason: 'not_pending' };
    app.status = 'canceled';
    app.decidedAt = new Date().toISOString();
    this.setStateChanged();
    return { ok: true, application: app, group: this.getGroup(app.groupId) };
  }

  /** 모임장만 — 신청서를 수락해 멤버로 만든다. */
  approveApplication(applicationId) {
    const app = (this.state.groupApplications || []).find((a) => a.id === applicationId);
    if (!app) return { ok: false, reason: 'not_found' };
    if (!this.can(app.groupId, 'approve_applications')) return { ok: false, reason: 'permission' };
    if (app.status !== 'pending') return { ok: false, reason: 'not_pending' };
    const group = this.getGroup(app.groupId);
    if (!group) return { ok: false, reason: 'not_found' };

    app.status = 'approved';
    app.decidedAt = new Date().toISOString();
    app.decisionNote = '수락';
    if (!Array.isArray(group.members)) group.members = [];
    if (!group.members.some((m) => m.id === app.applicantId)) {
      group.members.push({
        id: app.applicantId,
        name: app.applicantName,
        avatarText: app.applicantAvatarText || String(app.applicantName || '').charAt(0),
        gradient: app.applicantGradient || GROUP_ROSTER_GRADIENTS[0],
        hobbies: [],
        joinedAt: app.decidedAt
      });
    }
    group.memberCount = Math.max(1, group.memberCount + 1);
    this.setStateChanged();
    return {
      ok: true,
      application: app,
      group,
      /* 신청자에게 갈 환영 알림 내용(실서비스에서는 서버가 상대 기기로 보낸다). */
      welcome: {
        title: `${group.name}`,
        body: `${this.state.currentUser.nickname} 모임장이 가입을 승인했어요. 지금 바로 모임 피드에 인사해 보세요!`
      }
    };
  }

  /** 모임장만 — 신청서를 거절한다(대기 목록에서 빠진다). */
  rejectApplication(applicationId, note) {
    const app = (this.state.groupApplications || []).find((a) => a.id === applicationId);
    if (!app) return { ok: false, reason: 'not_found' };
    if (!this.can(app.groupId, 'approve_applications')) return { ok: false, reason: 'permission' };
    if (app.status !== 'pending') return { ok: false, reason: 'not_pending' };
    app.status = 'rejected';
    app.decidedAt = new Date().toISOString();
    app.decisionNote = String(note || '이번에는 함께하지 못했어요').slice(0, 80);
    this.setStateChanged();
    return { ok: true, application: app, group: this.getGroup(app.groupId) };
  }

  /**
   * 모임장만 — 가입 정책(가입 방식 · 나이 제한 · 가입 질문)을 바꾼다.
   * @param {string} groupId
   * @param {{joinMode?:'open'|'approval', ageLimit?:string, ageMin?:number, ageMax?:number, joinQuestions?:string[]}} patch
   */
  /* ==========================================================================
   * v36.0 — 모임 설정: 모임 공통 설정 · 멤버 개인 설정 · 운영 도구 기록
   * ====================================================================== */
  /** 모임 설정의 기본값 — 저장된 값이 없으면 이 값으로 읽는다(둘 다 기본 꺼짐). */
  groupSettingsDefaults() {
    return {
      joinMode: 'open',
      questions: [],
      listedInSearch: true,
      memberListVisibility: 'members',
      defaultGuestEvents: false,
      defaultFeedRecommend: false
    };
  }

  /** 모임 설정 한 묶음 — 저장값 + 예전 필드(joinMode·defaultGuestOpen)를 함께 해석한다. */
  getGroupSettings(groupId) {
    const g = this.getGroup(groupId);
    if (!g) return this.groupSettingsDefaults();
    const s = (g.settings && typeof g.settings === 'object') ? g.settings : {};
    const base = this.groupSettingsDefaults();
    return {
      joinMode: this.getGroupJoinMode(g),
      questions: this.getGroupJoinQuestions(groupId),
      listedInSearch: s.listedInSearch !== false,
      memberListVisibility: s.memberListVisibility === 'staff' ? 'staff' : base.memberListVisibility,
      defaultGuestEvents: s.defaultGuestEvents === true || g.defaultGuestOpen === true,
      defaultFeedRecommend: s.defaultFeedRecommend === true || g.defaultRecommendOptIn === true
    };
  }

  /** 가입·공개 설정 — 모임장만. 가입 질문은 0~3개. */
  updateGroupJoinSettings(groupId, patch) {
    if (!this.can(groupId, 'edit_join_policy')) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    const d = patch || {};
    const qs = Array.isArray(d.questions)
      ? d.questions.map((q) => String(q || '').trim()).filter(Boolean)
      : null;
    if (qs && qs.length > 3) return { ok: false, reason: 'too_many_questions' };
    if (qs && qs.some((q) => q.length > 60)) return { ok: false, reason: 'question_long' };
    /* 승인제는 질문이 하나 이상 있어야 신청서를 받을 수 있다. */
    const nextMode = d.joinMode === 'open' || d.joinMode === 'approval' ? d.joinMode : this.getGroupJoinMode(g);
    if (nextMode === 'approval' && qs && qs.length === 0) return { ok: false, reason: 'questions' };
    if (qs) g.joinQuestions = qs;
    const modePatch = {};
    if (d.joinMode) modePatch.joinMode = nextMode;
    const res = this.updateGroupJoinPolicy(groupId, Object.assign({}, modePatch, qs ? { joinQuestions: qs } : {}));
    if (!res.ok) return res;
    if (!g.settings) g.settings = {};
    if (d.listedInSearch !== undefined) g.settings.listedInSearch = d.listedInSearch !== false;
    if (d.memberListVisibility !== undefined) {
      g.settings.memberListVisibility = d.memberListVisibility === 'staff' ? 'staff' : 'members';
    }
    if (qs) g.settings.questions = qs.slice();
    this.logGroupMod(groupId, 'join_policy');
    this.saveState();
    return { ok: true, group: g, settings: this.getGroupSettings(groupId) };
  }

  /** 추천 노출 기본값 — 일정 게스트 참여·피드 추천 노출, 둘 다 기본 꺼짐. */
  updateGroupDefaultSettings(groupId, patch) {
    if (!this.can(groupId, 'edit_defaults')) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    const d = patch || {};
    if (!g.settings) g.settings = {};
    if (d.defaultGuestEvents !== undefined) {
      g.settings.defaultGuestEvents = !!d.defaultGuestEvents;
      g.defaultGuestOpen = !!d.defaultGuestEvents;
    }
    if (d.defaultFeedRecommend !== undefined) {
      g.settings.defaultFeedRecommend = !!d.defaultFeedRecommend;
      g.defaultRecommendOptIn = !!d.defaultFeedRecommend;
    }
    this.logGroupMod(groupId, 'defaults');
    this.saveState();
    return { ok: true, settings: this.getGroupSettings(groupId) };
  }

  /* -------------------------------------------------- 모임 안의 내 설정 */
  /** 모임별 내 멤버십 설정 — 닉네임·소개·사진 공개·명단 숨김·고정·음소거·알림. */
  getGroupMembership(groupId, memberId) {
    const me = this.state.currentUser || {};
    const who = memberId || me.id;
    const map = (this.state.groupMembership && this.state.groupMembership[groupId]) || {};
    const raw = map[who] || {};
    const g = this.getGroup(groupId);
    const groupNotifyOff = !!(g && g.notifyEnabled === false);
    return {
      groupId,
      memberId: who,
      nickname: String(raw.nickname || ''),
      bio: String(raw.bio || ''),
      photoVisible: raw.photoVisible === true,
      hiddenInList: raw.hiddenInList === true,
      pinned: raw.pinned === true,
      muted: raw.muted === true,
      notifyMode: raw.notifyMode || (groupNotifyOff ? 'off' : 'all'),
      notifyEvents: raw.notifyEvents !== false
    };
  }

  /** 내 멤버십 설정 저장 — 나만 바꿀 수 있고, 가입한 모임에만 쓴다. */
  updateGroupMembership(groupId, patch) {
    if (!this.isGroupMember(groupId)) return { ok: false, reason: 'not_member' };
    if (!this.state.groupMembership) this.state.groupMembership = {};
    const me = this.state.currentUser;
    const cur = this.getGroupMembership(groupId, me.id);
    const d = patch || {};
    const next = {
      nickname: d.nickname === undefined ? cur.nickname : String(d.nickname || '').trim().slice(0, 12),
      bio: d.bio === undefined ? cur.bio : String(d.bio || '').trim().slice(0, 60),
      photoVisible: d.photoVisible === undefined ? cur.photoVisible : !!d.photoVisible,
      hiddenInList: d.hiddenInList === undefined ? cur.hiddenInList : !!d.hiddenInList,
      pinned: d.pinned === undefined ? cur.pinned : !!d.pinned,
      muted: d.muted === undefined ? cur.muted : !!d.muted,
      notifyMode: ['all', 'mentions', 'off'].indexOf(d.notifyMode) >= 0 ? d.notifyMode : cur.notifyMode,
      notifyEvents: d.notifyEvents === undefined ? cur.notifyEvents : !!d.notifyEvents
    };
    if (!this.state.groupMembership[groupId]) this.state.groupMembership[groupId] = {};
    this.state.groupMembership[groupId][me.id] = next;
    /* 알림은 예전 스위치(group.notifyEnabled)도 같은 답을 갖게 맞춘다. */
    const g = this.getGroup(groupId);
    if (g && d.notifyMode !== undefined) g.notifyEnabled = next.notifyMode !== 'off';
    this.saveState();
    return { ok: true, membership: this.getGroupMembership(groupId, me.id), settings: this.getGroupSettings(groupId) };
  }

  /** 모임별 프로필 — 이 모임에서만 쓰는 이름·소개·사진 공개. */
  getGroupProfile(groupId) {
    const m = this.getGroupMembership(groupId);
    return { nickname: m.nickname, bio: m.bio, photoVisible: m.photoVisible };
  }

  updateGroupProfile(groupId, patch) {
    const d = patch || {};
    if (d.nickname !== undefined) {
      const nick = String(d.nickname || '').trim();
      if (nick && (nick.length < 1 || nick.length > 12)) return { ok: false, reason: 'nickname' };
    }
    const res = this.updateGroupMembership(groupId, {
      nickname: d.nickname, bio: d.bio, photoVisible: d.photoVisible
    });
    return res;
  }

  /* -------------------------------------------------- 내 활동 */
  /** 이 모임 안의 내 글·댓글·참여 일정 — '내 활동' 화면의 재료. */
  getMyGroupActivity(groupId) {
    const me = this.state.currentUser || {};
    const posts = (this.state.feedPosts || []).filter((p) => p.groupId === groupId && p.authorId === me.id);
    const comments = [];
    posts.forEach((p) => {
      (p.comments || []).forEach((c) => {
        if (c.authorId === me.id) comments.push({ id: c.id, postId: p.id, text: c.text, at: c.at || c.createdAt });
      });
    });
    const events = this.getGroupEvents(groupId).filter((e) => {
      const sum = this.getGroupEventSummary(e.id);
      return sum && sum.myRsvp === 'yes';
    });
    return { posts, comments, events };
  }

  /* -------------------------------------------------- 운영 기록 */
  /** 운영 기록 한 줄 — 관리 행동이 일어날 때마다 자동으로 쌓인다. */
  logGroupMod(groupId, action, meta) {
    const me = this.state.currentUser || {};
    if (!Array.isArray(this.state.groupModLog)) this.state.groupModLog = [];
    const m = meta || {};
    this.state.groupModLog.push({
      id: `mod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      groupId,
      action,
      actorId: me.id || null,
      actorName: me.nickname || '나',
      targetId: m.targetId || null,
      targetName: m.targetName || '',
      note: m.note || '',
      at: new Date().toISOString()
    });
    return this.state.groupModLog[this.state.groupModLog.length - 1];
  }

  /** 운영 기록 — 운영진 이상만 읽는다(읽기 전용). */
  getGroupModLog(groupId) {
    if (!this.can(groupId, 'view_modlog')) return [];
    return (this.state.groupModLog || [])
      .filter((r) => r.groupId === groupId)
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 50);
  }

  /* -------------------------------------------------- 신고 접수함 */
  /** 신고하기 — 글·댓글·멤버·모임을 신고한다. 운영진의 접수함에 쌓인다. */
  reportGroupTarget(groupId, payload) {
    if (!this.can(groupId, 'report')) return { ok: false, reason: 'permission' };
    const d = payload || {};
    const reason = String(d.reason || '').trim().slice(0, 200);
    if (!reason) return { ok: false, reason: 'reason' };
    if (!Array.isArray(this.state.groupReports)) this.state.groupReports = [];
    const me = this.state.currentUser || {};
    const report = {
      id: `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      groupId,
      targetType: d.targetType || 'group',
      targetId: d.targetId || null,
      targetName: d.targetName || '',
      reason,
      reporterId: me.id || null,
      reporterName: me.nickname || '나',
      status: 'pending',
      at: new Date().toISOString()
    };
    this.state.groupReports.push(report);
    this.saveState();
    return { ok: true, report };
  }

  getGroupReports(groupId, status) {
    if (!this.can(groupId, 'handle_reports')) return [];
    return (this.state.groupReports || [])
      .filter((r) => r.groupId === groupId)
      .filter((r) => (status ? r.status === status : true))
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }

  /** 신고 처리(handled) / 무시(ignored) — 운영진 이상. */
  resolveGroupReport(groupId, reportId, action) {
    if (!this.can(groupId, 'handle_reports')) return { ok: false, reason: 'permission' };
    const report = (this.state.groupReports || []).find((r) => r.id === reportId && r.groupId === groupId);
    if (!report) return { ok: false, reason: 'not_found' };
    if (report.status !== 'pending') return { ok: false, reason: 'already' };
    report.status = action === 'ignore' ? 'ignored' : 'handled';
    report.resolvedAt = new Date().toISOString();
    this.logGroupMod(groupId, action === 'ignore' ? 'report_ignore' : 'report_handle',
      { targetId: report.targetId, targetName: report.targetName || report.targetType, note: report.reason });
    this.saveState();
    return { ok: true, report };
  }

  /* -------------------------------------------------- 멤버 관리 */
  /** 운영진이 멤버를 관리한다 — 대상은 멤버만(모임장·운영진은 대상이 될 수 없다). */
  muteGroupMember(groupId, memberId, on) {
    if (!this.canManageMember(groupId, memberId)) return { ok: false, reason: 'permission' };
    if (!this.state.groupMemberState) this.state.groupMemberState = {};
    const key = `${groupId}:${memberId}`;
    this.state.groupMemberState[key] = Object.assign({}, this.state.groupMemberState[key], { muted: !!on });
    const member = this.getGroupRoster(groupId, { viewerRole: 'owner' }).members.find((m) => m.id === memberId);
    this.logGroupMod(groupId, on ? 'mute' : 'unmute', { targetId: memberId, targetName: member ? member.name : '' });
    this.saveState();
    return { ok: true, memberId, muted: !!on };
  }

  warnGroupMember(groupId, memberId, note) {
    if (!this.canManageMember(groupId, memberId)) return { ok: false, reason: 'permission' };
    const member = this.getGroupRoster(groupId, { viewerRole: 'owner' }).members.find((m) => m.id === memberId);
    const entry = this.logGroupMod(groupId, 'warn', {
      targetId: memberId, targetName: member ? member.name : '', note: String(note || '').slice(0, 120)
    });
    this.saveState();
    return { ok: true, warning: entry };
  }

  /** 강퇴 — 멤버만. 모임장·운영진은 먼저 해임해야 한다. */
  kickGroupMember(groupId, memberId) {
    if (!this.canManageMember(groupId, memberId)) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    const member = this.getGroupRoster(groupId, { viewerRole: 'owner' }).members.find((m) => m.id === memberId);
    g.members = (g.members || []).filter((m) => m.id !== memberId);
    g.memberCount = Math.max(1, (g.memberCount || 1) - 1);
    if (Array.isArray(g.deputyIds)) g.deputyIds = g.deputyIds.filter((id) => id !== memberId);
    if (memberId === (this.state.currentUser || {}).id) {
      this.state.currentUser.joinedGroupIds = this.state.currentUser.joinedGroupIds.filter((id) => id !== groupId);
    }
    this.logGroupMod(groupId, 'kick', { targetId: memberId, targetName: member ? member.name : '' });
    this.saveState();
    return { ok: true, memberId, member };
  }

  /* -------------------------------------------------- 모임 정보 수정 */
  /** 모임 정보 수정 — 이름·한 줄 소개·대표 이미지·취미·활동 지역·아지트(1~3)·규칙. */
  updateGroupInfo(groupId, patch) {
    if (!this.can(groupId, 'edit_group')) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    const d = patch || {};
    if (d.name !== undefined) {
      const name = String(d.name || '').trim();
      if (name.length < 2 || name.length > 24) return { ok: false, reason: 'name' };
      g.name = name;
    }
    if (d.description !== undefined) g.description = String(d.description || '').trim().slice(0, 120);
    if (d.rules !== undefined) g.rules = String(d.rules || '').trim().slice(0, 400);
    if (d.categoryId !== undefined) {
      const chip = this.getHobbyChip ? this.getHobbyChip(d.categoryId) : null;
      if (chip) { g.hobbyId = chip.id; g.categoryName = chip.name; g.category = g.category || chip.id; }
    }
    if (d.regionId !== undefined || d.location !== undefined) {
      if (d.location !== undefined) g.location = String(d.location || '').trim().slice(0, 30);
      if (d.regionId !== undefined) g.regionId = d.regionId;
    }
    if (Array.isArray(d.azitIds)) {
      const az = this.updateGroupHangouts(groupId, d.azitIds);
      if (!az.ok) return az;
    }
    if (d.coverPhotoUrl !== undefined) {
      g.photoUrl = d.coverPhotoUrl || null;
      if (g.photoUrl) {
        g.coverImage = Object.assign({}, g.coverImage, { circle: g.photoUrl, card: g.photoUrl });
      }
    }
    this.logGroupMod(groupId, 'group_edit', { note: '모임 정보를 고쳤어요' });
    this.saveState();
    return { ok: true, group: g };
  }

  /* -------------------------------------------------- 위험 영역 */
  /** 모임장 위임 — 받는 사람은 멤버. 넘긴 사람은 운영진(자리 있으면) 또는 멤버가 된다. */
  transferGroupOwnership(groupId, memberId) {
    if (!this.can(groupId, 'transfer_ownership')) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    if (!memberId || memberId === g.leaderId) return { ok: false, reason: 'self' };
    if (this.roleOf(groupId, memberId) !== 'member') return { ok: false, reason: 'role' };
    const me = this.state.currentUser;
    const next = this.getGroupRoster(groupId, { viewerRole: 'owner' }).members.find((m) => m.id === memberId);
    if (!next) return { ok: false, reason: 'not_found' };
    const prevLeaderId = g.leaderId;
    const prevLeaderName = g.leaderName;
    if (!Array.isArray(g.deputyIds)) g.deputyIds = [];
    const prevEntry = (g.members || []).find((m) => m.id === prevLeaderId);
    if (prevEntry) {
      if (g.deputyIds.length < GROUP_STAFF_MAX) { g.deputyIds.push(prevLeaderId); prevEntry.role = 'staff'; }
      else prevEntry.role = 'member';
    }
    const entry = (g.members || []).find((m) => m.id === memberId);
    if (entry) entry.role = 'owner';
    g.leaderId = memberId;
    g.leaderName = next.name;
    this.logGroupMod(groupId, 'transfer', { targetId: memberId, targetName: next.name });
    this.saveState();
    return { ok: true, groupId, leaderId: memberId, leaderName: next.name, prevLeaderId, prevLeaderName, group: g };
  }

  /** 모임 보관(일시 중지) — 새 글·일정은 막고 읽기만. 모임장만. */
  archiveGroup(groupId, on) {
    if (!this.can(groupId, 'archive_group')) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    g.archived = on !== false;
    this.logGroupMod(groupId, g.archived ? 'archive' : 'unarchive');
    this.saveState();
    return { ok: true, archived: g.archived, group: g };
  }

  /** 모임 삭제 — 확인 두 번은 화면이 한다. 멤버에게는 남길 알림을 기록한다(로컬). */
  deleteGroupWithNotice(groupId) {
    if (!this.can(groupId, 'delete_group')) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    const me = this.state.currentUser || {};
    const members = (g.members || []).filter((m) => m.id !== me.id);
    if (!Array.isArray(this.state.groupDeleteNotices)) this.state.groupDeleteNotices = [];
    members.forEach((m) => {
      this.state.groupDeleteNotices.push({
        groupId, groupName: g.name, memberId: m.id, memberName: m.name,
        text: `'${g.name}' 모임이 삭제됐어요`, at: new Date().toISOString(), read: false
      });
    });
    const res = this.deleteGroup(groupId);
    if (res.ok) res.notified = members.length;
    return res;
  }

  /* -------------------------------------------------- 게스트(일정만) */
  /** 이 일정에 승인된 게스트인가 — 게스트는 그 일정과 일정 단톡방만 볼 수 있다. */
  isApprovedEventGuest(eventId, memberId) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return false;
    const me = this.state.currentUser || {};
    const who = memberId || me.id;
    return (Array.isArray(ev.guestRequests) ? ev.guestRequests : [])
      .some((r) => r.memberId === who && r.status === 'approved');
  }

  /**
   * v36.1 (#23461) — 이 모임의 **승인된 게스트(비멤버)** 인가.
   *  게스트는 그 모임에서 자기 일정과 일정 단톡방만 본다. 피드·게시판·멤버 목록·
   *  모임 전체 단톡방은 화면에서도 store 에서도 막힌다(공개 모임이라도 마찬가지).
   */
  isApprovedGuestOf(groupId, memberId) {
    const me = this.state.currentUser || {};
    const who = memberId || me.id;
    if (!who) return false;
    if (this.roleOf(groupId, who) !== 'guest') return false;
    return (this.state.groupEvents || []).some((e) => e && e.groupId === groupId
      && (Array.isArray(e.guestRequests) ? e.guestRequests : [])
        .some((r) => r.memberId === who && r.status === 'approved'));
  }

  /** 게스트가 볼 수 있는 일정 — 나에게 승인된 일정만. */
  getGuestEvents(groupId) {
    return this.getGroupEvents(groupId).filter((e) => this.isApprovedEventGuest(e.id));
  }

  /**
   * 그 모임에서 내가 무엇을 볼 수 있는가 — 게스트는 일정·일정 채팅만,
   * 멤버는 피드·멤버 목록까지. 화면은 이 답만 본다.
   */
  getGroupAccess(groupId) {
    const role = this.roleOf(groupId);
    const events = role === 'guest'
      ? this.getGroupEvents(groupId).filter((e) => this.isApprovedEventGuest(e.id))
      : [];
    return {
      groupId,
      role,
      feed: this.can(groupId, 'view_feed'),
      memberList: this.can(groupId, 'view_member_list'),
      events: role === 'guest' ? events.map((e) => e.id) : [],
      eventChat: role === 'guest' ? events.map((e) => e.id) : [],
      /* v36.1 — 게스트 진입 뷰가 쓰는 값(게스트가 아니면 비어 있다). */
      guestEvents: role === 'guest' ? events.map((e) => e.id) : [],
      groupChat: this.can(groupId, 'view_feed')
    };
  }

  /* -------------------------------------------------- 게시물·댓글 관리 */
  /** 운영진의 글 숨김·삭제 — 글쓴이가 아니어도 모임 운영 권한으로 처리한다. */
  moderateGroupPost(postId, action) {
    const post = this.getPost(postId);
    if (!post || !post.groupId) return { ok: false, reason: 'not_found' };
    if (!this.can(post.groupId, 'manage_posts')) return { ok: false, reason: 'permission' };
    if (action === 'delete') {
      this.state.feedPosts = this.state.feedPosts.filter((p) => p.id !== postId);
      this.logGroupMod(post.groupId, 'post_delete', { targetId: postId, targetName: (post.caption || '').slice(0, 20) });
      this.saveState();
      return { ok: true, action: 'delete', post };
    }
    post.hidden = !post.hidden;
    post.hiddenBy = post.hidden ? this.currentUser.id : null;
    this.logGroupMod(post.groupId, post.hidden ? 'post_hide' : 'post_show',
      { targetId: postId, targetName: (post.caption || '').slice(0, 20) });
    this.saveState();
    return { ok: true, action: post.hidden ? 'hide' : 'show', post };
  }

  /** 운영진의 댓글 삭제 — 글쓴이가 아니어도 처리한다. */
  moderateGroupComment(postId, commentId) {
    const post = this.getPost(postId);
    if (!post || !post.groupId) return { ok: false, reason: 'not_found' };
    if (!this.can(post.groupId, 'manage_posts')) return { ok: false, reason: 'permission' };
    const idx = (post.comments || []).findIndex((c) => c.id === commentId);
    if (idx < 0) return { ok: false, reason: 'not_found' };
    const [removed] = post.comments.splice(idx, 1);
    this.logGroupMod(post.groupId, 'comment_delete', { targetId: commentId, targetName: (removed.text || '').slice(0, 20) });
    this.saveState();
    return { ok: true, comment: removed };
  }

  updateGroupJoinPolicy(groupId, patch) {
    const group = this.getGroup(groupId);
    if (!group) return { ok: false, reason: 'not_found' };
    if (!this.can(groupId, 'edit_join_policy')) return { ok: false, reason: 'permission' };
    const d = patch || {};

    const nextMode = d.joinMode === 'approval' || d.joinMode === 'open'
      ? d.joinMode : this.getGroupJoinMode(group);
    let nextQuestions = Array.isArray(d.joinQuestions)
      ? d.joinQuestions.map((q) => String(q || '').trim()).filter(Boolean).slice(0, 2)
      : (Array.isArray(group.joinQuestions) ? group.joinQuestions.filter(Boolean) : []);
    if (d.ageLimit != null && !this.getAgeLimit(d.ageLimit)) {
      return { ok: false, reason: 'age_limit' };
    }
    /* H4 — 나이 제한은 슬라이더의 두 숫자(ageMin·ageMax)로도 바꿀 수 있다. */
    const currentRange = this.getGroupAgeRange(group);
    let nextRange = { min: currentRange.min, max: currentRange.max };
    if (d.ageMin != null || d.ageMax != null) {
      const rawMin = Number(d.ageMin);
      const rawMax = Number(d.ageMax);
      if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)
          || rawMin < GROUP_AGE_MIN || rawMax > GROUP_AGE_MAX || rawMin > rawMax) {
        return { ok: false, reason: 'age_limit' };
      }
      nextRange = this.normalizeGroupAgeRange(rawMin, rawMax);
    } else if (d.ageLimit != null) {
      const opt = this.getAgeLimit(d.ageLimit);
      nextRange = this.normalizeGroupAgeRange(opt.min, opt.max);
    }
    const nextOption = this.ageRangeOption(nextRange.min, nextRange.max) || this.getAgeLimit('all');
    if (nextMode === 'approval' && !nextQuestions.length) {
      return { ok: false, reason: 'questions' };
    }
    if (nextQuestions.some((q) => q.length > 60)) {
      return { ok: false, reason: 'question_long' };
    }

    group.joinMode = nextMode;
    group.privacyType = nextMode === 'open' ? 'open' : 'approval_private';
    group.privacyLabel = nextMode === 'open' ? '자유 가입' : '비공개 승인제';
    group.ageMin = nextRange.min;
    group.ageMax = nextRange.max;
    group.ageLimit = nextOption.id;
    /* 모드를 바꿔도 질문은 보존한다 — 다시 승인제로 돌리면 그대로 쓴다. */
    group.joinQuestions = nextQuestions;
    this.setStateChanged();
    return { ok: true, group };
  }

  /** 모임 정원이 찼는지 — 가입 버튼과 신청서가 같은 기준을 쓴다. */
  isGroupFull(groupId) {
    const g = this.getGroup(groupId);
    return !!g && g.memberCount >= g.maxMembers;
  }

  /** 모임 카드·상세에 붙는 가입 정책 배지 (가입 방식 + 나이 제한). */
  getGroupPolicyBadges(groupId) {
    const g = this.getGroup(groupId);
    if (!g) return [];
    const mode = this.getGroupJoinMode(g);
    const age = this.getGroupAgeLimit(groupId);
    const badges = [{
      id: mode,
      kind: 'mode',
      label: mode === 'open' ? '자유 가입' : '승인제',
      labelText: mode === 'open' ? '자유 가입' : '승인제'
    }];
    if (age && age.id !== 'all') {
      badges.push({ id: age.id, kind: 'age', label: age.badge || age.short, labelText: age.cardBadge || age.short });
    }
    /* 모임장에게는 처리할 신청 수를 카드에서 바로 보여준다 */
    const pending = this.isGroupLeader(groupId) ? this.getPendingApplications(groupId).length : 0;
    if (pending > 0) {
      badges.push({ id: 'pending', kind: 'pending', label: `대기 ${pending}`, labelText: `대기 ${pending}` });
    }
    return badges;
  }

  /* ---------------- Sprint 5 — PWA(홈 화면 설치) 힌트 ----------------
   * v35.3 (설정 S1) — 설치 안내 카드가 사라지고 설정의 '홈 화면에 추가' 행만 남아
   * 저장할 상태(닫음/설치됨)가 없어졌다. 설치 여부는 isStandalone() 으로 그때그때 본다.
   * ---------------------------------------------------------------------- */
  /* ==========================================================================
   * Sprint 6 — C. 내 활동 로그 (Activity Log)
   * ------------------------------------------------------------------------
   * 11/14 21:24 사용자 지시: "디자인이나 로그 기능 등등 다 해야지".
   *
   *  · 따로 쌓지 않고 **이미 저장된 상태에서 파생**한다(하트 기록 · 내 글 · 내 댓글 ·
   *    가입 신청·결과 · 내가 만든 모임). 그래서 어떤 경로로 액션이 일어나도 로그가
   *    자동으로 함께 늘고, 되돌리면(하트 취소·신청 취소) 로그에서도 사라져 서로 어긋나지 않는다.
   *  · type : 'like' | 'post' | 'comment' | 'group'
   *  · targetType : 'person' | 'chat' | 'explore_post' | 'feed_post' | 'group'
   *    → 화면은 이 값으로 딥링크를 고른다(사람 상세 / 대화방 / 게시글 상세 / 모임 상세).
   * ======================================================================== */
  getActivityTypes() {
    return [
      { id: 'all', name: '전체', icon: 'layers' },
      { id: 'like', name: '하트', icon: 'heart' },
      { id: 'post', name: '게시글', icon: 'note' },
      { id: 'comment', name: '댓글', icon: 'comment' },
      { id: 'group', name: '모임', icon: 'users' }
    ];
  }

  /**
   * 내 활동 로그 — 최신순.
   * @param {{type?:'all'|'like'|'post'|'comment'|'group', range?:'all'|'7d'|'30d',
   *          limit?:number, now?:Date|number}} options
   * @returns {Array<{id, type, kind, icon, tone, title, body, at, targetType, targetId,
   *                  personId, postId, groupId, groupName, roomId}>}
   */
  getActivityLogs(options) {
    const o = options || {};
    const uid = this.state.currentUser.id;
    const me = this.state.currentUser.nickname;
    const out = [];
    const push = (entry) => { if (entry && entry.at) out.push(entry); };

    /* ① 내가 보낸 하트 — 대화가 열렸으면 대화방으로, 아니면 상대 프로필로 딥링크 */
    (this.state.matchSwipes || []).forEach((s) => {
      if (s.direction !== 'like' && s.direction !== 'super') return;
      const p = this.getMatchProfile(s.profileId);
      const room = this.findChatRoomByPartner(s.profileId);
      const meta = p
        ? [[p.hobbyIcon, p.hobbyLabel].filter(Boolean).join(' '), p.location,
          p.distanceKm != null ? `${p.distanceKm}km` : ''].filter(Boolean).join(' · ')
        : '';
      push({
        id: `act_like_${s.profileId}_${s.at}`,
        type: 'like',
        kind: room ? 'match' : 'like',
        icon: 'heart',
        tone: 'pink',
        title: p ? `${p.nickname}님에게 하트를 보냈어요` : '취미친구에게 하트를 보냈어요',
        body: room ? `매칭되어 1:1 대화방이 열렸어요${meta ? ` · ${meta}` : ''}` : meta,
        at: s.at,
        targetType: room ? 'chat' : 'person',
        targetId: room ? room.id : s.profileId,
        personId: s.profileId,
        roomId: room ? room.id : null,
        /* Sprint 7 — 로그에서 바로 하트를 취소할 수 있다(되돌리면 이 항목도 사라진다). */
        actionable: 'unlike'
      });
    });

    /* ② 내가 쓴 글 — 탐색 공개글 + 모임 피드 글 */
    (this.state.explorePosts || []).forEach((p) => {
      if (!(p.isMine || p.authorId === uid)) return;
      const preview = String(p.caption || '').trim().replace(/\s+/g, ' ');
      push({
        id: `act_post_${p.id}`,
        type: 'post',
        kind: 'explore_post',
        icon: 'note',
        tone: 'green',
        title: '취미 게시글을 올렸어요',
        body: `${p.hobbyIcon || ''} ${preview || '사진을 공유했어요'}`.trim().slice(0, 70),
        at: p.createdAt,
        targetType: 'explore_post',
        targetId: p.id,
        postId: p.id,
        /* Sprint 8 — 모임별 묶어보기: 글이 밝힌 모임 이름으로 묶는다. */
        groupName: p.groupName || null
      });
    });
    (this.state.feedPosts || []).forEach((p) => {
      if (p.authorId !== uid) return;
      const group = this.getGroup(p.groupId);
      const preview = String(p.caption || '').trim().replace(/\s+/g, ' ');
      push({
        id: `act_feed_${p.id}`,
        type: 'post',
        kind: 'feed_post',
        icon: 'film',
        tone: 'green',
        title: `'${group ? group.name : '모임'}' 피드에 글을 남겼어요`,
        body: (p.tag ? `#${p.tag} ` : '') + preview.slice(0, 60),
        at: p.createdAt,
        targetType: 'feed_post',
        targetId: p.id,
        postId: p.id,
        groupId: p.groupId
      });
    });

    /* ③ 내가 쓴 댓글 — 탐색 공개글 + 모임 피드 글 */
    const isMyComment = (c) => c && (c.authorId === uid || (!c.authorId && c.authorName === me));
    (this.state.explorePosts || []).forEach((p) => {
      (p.comments || []).forEach((c) => {
        if (!isMyComment(c)) return;
        push({
          id: `act_cmt_${c.id}`,
          type: 'comment',
          kind: 'comment',
          icon: 'comment',
          tone: 'blue',
          title: `${p.authorName || '취미친구'}님의 글에 댓글을 남겼어요`,
          body: `“${String(c.text || '').replace(/\s+/g, ' ').slice(0, 60)}”`,
          at: c.createdAt,
          targetType: 'explore_post',
          targetId: p.id,
          postId: p.id,
          groupName: p.groupName || null
        });
      });
    });
    (this.state.feedPosts || []).forEach((p) => {
      (p.comments || []).forEach((c) => {
        if (!isMyComment(c)) return;
        const group = this.getGroup(p.groupId);
        push({
          id: `act_fcmt_${c.id}`,
          type: 'comment',
          kind: 'feed_comment',
          icon: 'comment',
          tone: 'blue',
          title: `'${group ? group.name : '모임'}' 피드 글에 댓글을 남겼어요`,
          body: `“${String(c.text || '').replace(/\s+/g, ' ').slice(0, 60)}”`,
          at: c.createdAt,
          targetType: 'feed_post',
          targetId: p.id,
          postId: p.id,
          groupId: p.groupId
        });
      });
    });

    /* ④ 모임 — 내가 만든 모임 · 가입 신청 · 처리 결과 */
    (this.state.groups || []).forEach((g) => {
      if (g.leaderId !== uid || !g.createdAt) return;
      push({
        id: `act_gnew_${g.id}`,
        type: 'group',
        kind: 'group_created',
        icon: 'users',
        tone: 'green',
        title: `'${g.name}' 모임을 만들었어요`,
        body: [g.icon, g.categoryName, g.location].filter(Boolean).join(' · '),
        at: g.createdAt,
        targetType: 'group',
        targetId: g.id,
        groupId: g.id
      });
    });
    (this.state.groupApplications || []).forEach((a) => {
      if (a.applicantId !== uid) return;
      push({
        id: `act_join_${a.id}`,
        type: 'group',
        kind: 'join_request',
        icon: 'mail',
        tone: 'amber',
        title: `'${a.groupName}' 가입을 신청했어요`,
        body: a.status === 'pending' ? '모임장 승인을 기다리는 중'
          : a.status === 'canceled' ? '신청을 취소했어요' : '신청서를 냈어요',
        at: a.createdAt,
        targetType: 'group',
        targetId: a.groupId,
        groupId: a.groupId,
        applicationId: a.id,
        /* Sprint 7 — 대기 중인 신청은 로그에서 바로 취소할 수 있다. */
        actionable: a.status === 'pending' ? 'cancel_application' : null
      });
      if (!a.decidedAt) return;
      const approved = a.status === 'approved';
      push({
        id: `act_jres_${a.id}`,
        type: 'group',
        kind: approved ? 'join_approved' : 'join_rejected',
        icon: approved ? '' : '',
        tone: approved ? 'green' : 'rose',
        title: approved ? `'${a.groupName}' 가입이 수락되었어요` : `'${a.groupName}' 가입이 이번에는 어려웠어요`,
        body: a.decisionNote ? String(a.decisionNote).slice(0, 70) : (approved ? '이제 모임 피드에서 인사해 보세요' : '다음 모임에서 다시 만나요'),
        at: a.decidedAt,
        targetType: 'group',
        targetId: a.groupId,
        groupId: a.groupId
      });
    });

    const knownTypes = this.getActivityTypes().map((t) => t.id);
    const type = o.type && knownTypes.includes(o.type) && o.type !== 'all' ? o.type : 'all';
    const fromMs = this.activityRangeStartMs(o.range, o.now);
    const list = out
      .filter((e) => type === 'all' || e.type === type)
      .filter((e) => fromMs == null || new Date(e.at).getTime() >= fromMs)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const limit = typeof o.limit === 'number' ? Math.max(0, o.limit) : 60;
    return list.slice(0, limit);
  }

  /* ==========================================================================
   * Sprint 8 — 내 활동 로그 2차 (기간 필터 · 모임별 묶어보기)
   * ------------------------------------------------------------------------
   *  · 기간: 전체 / 최근 7일 / 최근 30일 — 로그는 저장 상태에서 파생되므로
   *    기간만 걸러 보면 된다(별도 기록 없음).
   *  · 모임별: 같은 모임에 속한 기록을 하나의 묶음으로 본다. 모임이 없는 기록(하트 등)은
   *    '개인 활동' 묶음으로 모인다.
   * ======================================================================== */

  getActivityRangeOptions() {
    return [
      { id: 'all', name: '전체', icon: 'layers', days: null },
      { id: '7d', name: '최근 7일', icon: 'calendarWeek', days: 7 },
      { id: '30d', name: '최근 30일', icon: 'calendar', days: 30 }
    ];
  }

  /** 기간 필터의 시작 시각(ms). '전체'면 null. */
  activityRangeStartMs(rangeId, now) {
    const opt = this.getActivityRangeOptions().find((r) => r.id === rangeId);
    if (!opt || !opt.days) return null;
    const base = now instanceof Date ? now.getTime() : (Number(now) || Date.now());
    return base - opt.days * 24 * HOUR;
  }

  getActivityGroups(options) {
    const o = options || {};
    const logs = this.getActivityLogs({ type: o.type, range: o.range, now: o.now, limit: 500 });
    const buckets = new Map();
    const groups = this.state.groups || [];
    logs.forEach((e) => {
      const name = e.groupName || null;
      const group = (e.groupId && groups.find((g) => g.id === e.groupId))
        || (name ? groups.find((g) => g.name === name) : null);
      const key = group ? `g:${group.id}` : (name ? `n:${name}` : 'none');
      if (!buckets.has(key)) {
        buckets.set(key, {
          groupId: group ? group.id : (e.groupId || null),
          groupName: group ? group.name : (name || '개인 활동'),
          icon: group ? (group.icon || '') : (name ? '' : ''),
          count: 0,
          latestAt: e.at,
          logs: []
        });
      }
      const bucket = buckets.get(key);
      bucket.logs.push(e);
      bucket.count += 1;
      if (new Date(e.at).getTime() > new Date(bucket.latestAt).getTime()) bucket.latestAt = e.at;
    });
    return Array.from(buckets.values())
      .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
  }

  /**
   * 활동 요약 — 종류별 건수 · 오늘 · 이번 주 · 이번 달 (Sprint 7 확장).
   * 11/14 22:24 "이번 주/이번 달 요약" → 주는 월요일 00:00, 달은 1일 00:00 기준.
   * 프로필 메뉴의 건수 표시에도 쓴다.
   */
  getActivityStats() {
    const logs = this.getActivityLogs({});
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7));  // 월요일
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = (type) => logs.filter((e) => e.type === type).length;
    const tally = (from) => {
      const list = logs.filter((e) => new Date(e.at).getTime() >= from.getTime());
      const c = (type) => list.filter((e) => e.type === type).length;
      return { total: list.length, like: c('like'), post: c('post'), comment: c('comment'), group: c('group') };
    };
    return {
      total: logs.length,
      like: count('like'),
      post: count('post'),
      comment: count('comment'),
      group: count('group'),
      today: logs.filter((e) => new Date(e.at).getTime() >= startOfToday.getTime()).length,
      week: tally(startOfWeek),
      month: tally(startOfMonth),
      weekStart: startOfWeek.toISOString(),
      monthStart: startOfMonth.toISOString()
    };
  }

  /** 활동 요약 한 줄 문구용 — 이번 주·이번 달 (정렬하지 않은 원본 집계). */
  getActivitySummary() {
    const s = this.getActivityStats();
    return {
      week: s.week,
      month: s.month,
      total: s.total,
      today: s.today
    };
  }

  /* ==========================================================================
   * Sprint 14 — 홈(내 모임 허브) · 모임 단체 채팅 · 오프라인 일정(RSVP) · 전체 멤버
   * --------------------------------------------------------------------------
   * 11/15 14:55 사용자 지시로 무게중심을 탐색에서 **내 모임**으로 옮겼다.
   * 탐색은 부가 기능이고, 홈은 ① 내 모임 전환 ② 그 모임의 사진 피드
   * ③ 멤버 단체 채팅 ④ 술모임·번개 일정(참석/대기/불참)이 주인공이다.
   * 네이버 밴드·당근모임의 결에 ooG 의 화이트+그린 리듬을 얹는다.
   * ======================================================================== */

  /* ---------------------------------------------------------- 14-1. 홈 모임 */
  /** 홈에서 보고 있는 모임 — 저장된 값이 내 모임이 아니면 첫 가입 모임으로 보정. */
  getHomeGroupId() {
    const stored = this.state.homePrefs && this.state.homePrefs.groupId;
    if (stored && this.isGroupJoined(stored)) return stored;
    const first = (this.currentUser.joinedGroupIds || [])[0] || null;
    if (this.state.homePrefs) this.state.homePrefs.groupId = first;
    return first;
  }

  /** 홈 모임 전환 — 가입한 모임만. 앱을 다시 열어도 그 모임으로 시작한다. */
  setHomeGroupId(groupId) {
    if (!groupId) return { ok: false, reason: 'empty' };
    if (!this.isGroupJoined(groupId)) return { ok: false, reason: 'not_member' };
    this.state.homePrefs = { ...(this.state.homePrefs || {}), groupId };
    this.state.homePrefs.groupId = groupId;
    this.saveState();
    return { ok: true, groupId, group: this.getGroup(groupId) };
  }

  /** 홈 상단 모임 스위처에 쓸 목록 — 모임 + 다음 일정 + 단체 채팅 미리보기 + 사진 수. */
  getHomeGroups() {
    const list = this.getJoinedGroups().map((group) => ({
      group,
      id: group.id,
      /* v36.0 — '모임 상단 고정'을 켠 모임이 내 모임 줄의 앞에 온다. */
      pinned: this.getGroupMembership(group.id).pinned,
      isHome: group.id === this.getHomeGroupId(),
      postCount: (this.state.feedPosts || []).filter((p) => p.groupId === group.id).length,
      photoCount: this.getGroupPhotoPosts(group.id).filter((p) => p.photoUrl).length,
      nextEvent: this.getNextGroupEvent(group.id),
      chat: this.getGroupChatPreview(group.id)
    }));
    /* 고정을 켠 모임만 앞으로 — 나머지 순서는 그대로(안정 정렬). */
    return list.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }

  /** 모임의 사진·글 — 홈 사진 피드(그리드)의 재료. 말머리(tag)로 걸러 볼 수 있다. */
  getGroupPhotoPosts(groupId, tag = null) {
    /* v36.1 — 승인된 게스트(비멤버)에게는 모임 피드·사진을 보여주지 않는다. */
    if (this.isApprovedGuestOf(groupId)) return [];
    const seeHidden = this.roleOf(groupId) !== 'member';
    const blocked = this.state.blockedMemberIds || [];
    return (this.state.feedPosts || [])
      .filter((p) => p.groupId === groupId)
      .filter((p) => blocked.indexOf(p.authorId) < 0)
      .filter((p) => seeHidden || !p.hidden)
      .filter((p) => (tag ? p.tag === tag : true))
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p) => this.applyGroupIdentity(p));
  }

  /**
   * 모임 안에서 보이는 내 이름 — 모임별 닉네임을 쓰면 글·댓글에도 그 이름이 붙는다.
   * (저장된 글은 건드리지 않고 읽을 때만 바꿔 끼운다.)
   */
  applyGroupIdentity(post) {
    if (!post || !post.groupId) return post;
    const me = this.currentUser;
    if (!me || post.authorId !== me.id) return post;
    const prof = this.getGroupProfile(post.groupId);
    if (!prof.nickname) return post;
    return Object.assign({}, post, {
      authorName: prof.nickname,
      authorAvatarText: prof.nickname.charAt(0)
    });
  }

  /** 홈 사진 피드 상단의 말머리 칩 — 그 모임 글에 실제로 붙은 말머리만(건수 포함, 많은 순). */
  getGroupPhotoTags(groupId) {
    const tally = new Map();
    this.getGroupPhotoPosts(groupId).forEach((p) => {
      if (!p.tag) return;
      tally.set(p.tag, (tally.get(p.tag) || 0) + 1);
    });
    return Array.from(tally.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /* ------------------------------------------------------ 14-2. 모임 단체 채팅 */
  /** 모임 단체 채팅방 객체 — 없으면 만들어 돌려준다(가입한 모임만). */
  ensureGroupChat(groupId) {
    if (!Array.isArray(this.state.groupChats)) this.state.groupChats = [];
    let chat = this.state.groupChats.find((c) => c.groupId === groupId);
    if (!chat) {
      chat = { groupId, messages: [] };
      this.state.groupChats.push(chat);
    }
    if (!Array.isArray(chat.messages)) chat.messages = [];
    return chat;
  }

  getGroupChat(groupId) {
    return (this.state.groupChats || []).find((c) => c.groupId === groupId) || null;
  }

  getGroupChatMessages(groupId) {
    /* v36.1 — 모임 전체 단톡방은 멤버만. 승인된 게스트도 읽을 수 없다. */
    if (this.isApprovedGuestOf(groupId)) return [];
    const chat = this.getGroupChat(groupId);
    if (!chat) return [];
    return chat.messages.slice().sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }

  /** 홈·채팅 목록을 한 줄로 보여줄 미리보기 — 마지막 말·시각·인원. */
  getGroupChatPreview(groupId) {
    if (this.isApprovedGuestOf(groupId)) {
      return { groupId, count: 0, lastMessage: '', lastAt: null, lastAuthor: '', speakers: 0 };
    }
    const messages = this.getGroupChatMessages(groupId);
    const last = messages[messages.length - 1] || null;
    const speakers = new Set(messages.filter((m) => m.from !== 'me').map((m) => m.authorName));
    if (messages.some((m) => m.from === 'me')) speakers.add(this.currentUser.nickname);
    return {
      groupId,
      count: messages.length,
      lastMessage: last ? last.text : '',
      lastAt: last ? last.at : null,
      lastAuthor: last ? (last.from === 'me' ? '나' : last.authorName) : '',
      speakers: speakers.size
    };
  }

  /** 단체 채팅 보내기 — 내 이름/아바타로. 빈 말은 거부, 1000자까지.
   *  Sprint 32 — `options.pendingId` 로 이미 띄운 '전송 중' 말풍선을 확정한다. */
  sendGroupChatMessage(groupId, text, options = {}) {
    if (!this.isGroupJoined(groupId)) return { ok: false, reason: 'not_member' };
    const body = String(text == null ? '' : text).trim().slice(0, 1000);
    if (!body) return { ok: false, reason: 'empty' };
    const chat = this.ensureGroupChat(groupId);
    const me = this.currentUser;
    const pendingId = options && options.pendingId;
    if (pendingId) {
      const pending = chat.messages.find((m) => m.id === pendingId);
      if (pending) {
        pending.pending = false;
        pending.queued = false;
        pending.at = new Date().toISOString();
        pending.text = body;
        this.saveState();
        return { ok: true, message: pending, confirmed: true };
      }
    }
    const message = {
      id: `gcm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      from: 'me',
      authorId: me.id,
      authorName: me.nickname,
      authorAvatarText: me.avatarText,
      authorGradient: me.avatarGradient,
      text: body,
      at: new Date().toISOString()
    };
    chat.messages.push(message);
    this.saveState();
    return { ok: true, message };
  }

  /** Sprint 32 — 단체 채팅 '전송 중' 말풍선(낙관적 업데이트). */
  createPendingGroupChatMessage(groupId, text) {
    if (!this.isGroupJoined(groupId)) return { ok: false, reason: 'not_member' };
    const body = String(text == null ? '' : text).trim().slice(0, 1000);
    if (!body) return { ok: false, reason: 'empty' };
    const chat = this.ensureGroupChat(groupId);
    const me = this.currentUser;
    const message = {
      id: `pgm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      from: 'me',
      authorId: me.id,
      authorName: me.nickname,
      authorAvatarText: me.avatarText,
      authorGradient: me.avatarGradient,
      text: body,
      at: new Date().toISOString(),
      pending: true
    };
    chat.messages.push(message);
    this.saveState();
    return { ok: true, message };
  }

  /** 단체 채팅 전송 실패 — 말풍선을 남기고 '실패'로 표시한다(옆에 '재전송' — Sprint 33). */
  markPendingGroupChatMessageFailed(groupId, messageId) {
    const chat = this.getGroupChat(groupId);
    if (!chat || !Array.isArray(chat.messages)) return { ok: false, reason: 'not_found' };
    const message = chat.messages.find((m) => m.id === messageId);
    if (!message) return { ok: false, reason: 'not_found' };
    message.pending = false;
    message.queued = false;
    message.failed = true;
    this.saveState();
    return { ok: true, message };
  }

  /** 단체 채팅 재전송 준비 — 실패 표시를 지우고 다시 '전송 중'으로. */
  retryPendingGroupChatMessage(groupId, messageId) {
    const chat = this.getGroupChat(groupId);
    if (!chat || !Array.isArray(chat.messages)) return { ok: false, reason: 'not_found' };
    const message = chat.messages.find((m) => m.id === messageId);
    if (!message) return { ok: false, reason: 'not_found' };
    message.failed = false;
    message.pending = true;
    this.saveState();
    return { ok: true, message };
  }

  /** 단체 채팅 오프라인 큐 표시. */
  markQueuedGroupChatMessage(groupId, messageId) {
    const chat = this.getGroupChat(groupId);
    if (!chat || !Array.isArray(chat.messages)) return { ok: false, reason: 'not_found' };
    const message = chat.messages.find((m) => m.id === messageId);
    if (!message) return { ok: false, reason: 'not_found' };
    message.pending = false;
    message.queued = true;
    this.saveState();
    return { ok: true, message };
  }

  /** 단체 채팅 전송 실패 — 낙관적으로 띄운 말풍선을 거둔다. */
  dropPendingGroupChatMessage(groupId, messageId) {
    const chat = this.getGroupChat(groupId);
    if (!chat || !Array.isArray(chat.messages)) return { ok: false, reason: 'not_found' };
    const idx = chat.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return { ok: false, reason: 'not_found' };
    const [removed] = chat.messages.splice(idx, 1);
    this.saveState();
    return { ok: true, removed };
  }

  /** 멤버가 말하는 모습(시연·데모용) — 알림은 만들지 않는다. */
  receiveGroupChatMessage(groupId, memberId, text) {
    const body = String(text == null ? '' : text).trim().slice(0, 1000);
    if (!body) return { ok: false, reason: 'empty' };
    const roster = this.getGroupRoster(groupId);
    const member = roster.members.find((m) => m.id === memberId && !m.isMe)
      || roster.members.find((m) => !m.isMe);
    if (!member) return { ok: false, reason: 'not_found' };
    const chat = this.ensureGroupChat(groupId);
    const message = {
      id: `gcm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      from: 'member',
      authorId: member.id,
      authorName: member.name,
      authorAvatarText: member.avatarText,
      authorGradient: member.gradient,
      text: body,
      at: new Date().toISOString()
    };
    chat.messages.push(message);
    this.saveState();
    return { ok: true, message, member };
  }

  /* ------------------------------------------- 14-2b. 일정 단톡방 (v36.1) */
  /*
   * 11/23 루키 님 지시(#23461): "모임 일정이 생기면 그 일정 단톡방이 자동으로 생기고,
   * 일정 참석자가 자동으로 들어가게. 게스트는 승인된 일정과 그 일정 단톡방만 본다."
   *  · 방은 일정(eventId) 마다 하나 — state.eventChats: [{ eventId, groupId, messages:[] }]
   *  · 참석자는 **따로 명단을 들고 있지 않다.** 참석(yes)·대기(maybe) 상태에서 그때그때
   *    계산한다. 그래서 참석을 누르면 바로 들어가고, 불참으로 바꾸면 바로 나간다.
   *  · 승인된 게스트도 그 일정의 참석자이므로 같은 방을 쓴다(초대·수락 절차 없음).
   */

  /** 일정 단톡방 객체 — 없으면 만든다(저장은 호출한 쪽에서). */
  ensureEventChat(eventId) {
    if (!Array.isArray(this.state.eventChats)) this.state.eventChats = [];
    const ev = this.getGroupEvent(eventId);
    if (!ev) return null;
    let chat = this.state.eventChats.find((c) => c.eventId === eventId);
    if (!chat) {
      chat = { eventId, groupId: ev.groupId, createdAt: new Date().toISOString(), messages: [] };
      this.state.eventChats.push(chat);
    }
    if (!Array.isArray(chat.messages)) chat.messages = [];
    chat.groupId = ev.groupId;
    return chat;
  }

  /** 지금 있는 모든 일정의 단톡방을 갖춘다(샘플·옛 저장 상태 포함). */
  syncEventChats() {
    if (!Array.isArray(this.state.eventChats)) this.state.eventChats = [];
    const events = this.state.groupEvents || [];
    const have = new Set(this.state.eventChats.map((c) => c && c.eventId));
    let created = 0;
    events.forEach((ev) => {
      if (!ev || !ev.id || have.has(ev.id)) return;
      this.state.eventChats.push({ eventId: ev.id, groupId: ev.groupId, createdAt: new Date().toISOString(), messages: [] });
      have.add(ev.id);
      created += 1;
    });
    /* 지워진 일정의 방은 함께 정리한다. */
    const ids = new Set(events.map((e) => e && e.id));
    const before = this.state.eventChats.length;
    this.state.eventChats = this.state.eventChats.filter((c) => c && ids.has(c.eventId));
    const removed = before - this.state.eventChats.length;
    if (created || removed) this.saveState();
    return { ok: true, created, removed, total: this.state.eventChats.length };
  }

  getEventChat(eventId) {
    return (this.state.eventChats || []).find((c) => c.eventId === eventId) || null;
  }

  /** 일정 참석자 — 참석(yes)·대기(maybe)로 답한 사람. 승인된 게스트도 여기 들어온다. */
  getEventChatMembers(eventId) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return [];
    return (Array.isArray(ev.rsvps) ? ev.rsvps : [])
      .filter((r) => r && (r.status === 'yes' || r.status === 'maybe'))
      .map((r) => ({
        memberId: r.memberId, name: r.name, avatarText: r.avatarText,
        gradient: r.gradient, status: r.status, guest: r.guest === true
      }));
  }

  /** 이 일정 단톡방에 들어갈 수 있는가 — 참석자(참석·대기)와 승인된 게스트만. */
  isEventChatMember(eventId, memberId) {
    const me = this.state.currentUser || {};
    const who = memberId || me.id;
    if (!who) return false;
    return this.getEventChatMembers(eventId).some((m) => m.memberId === who);
  }

  /**
   * 일정 단톡방 열람·쓰기 권한 — 한 곳에서 정한다(화면과 액션이 같은 답).
   *  · 멤버십은 참석 표시에서 계산한다(참석을 누르면 바로 들어간다).
   *  · 게스트는 승인된 일정의 방만. 모임 전체 단톡방·피드는 여전히 없다.
   */
  canUseEventChat(eventId, memberId) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return false;
    const me = this.state.currentUser || {};
    const who = memberId || me.id;
    if (!who) return false;
    /* 멤버는 참석 표시가 있어야, 게스트는 승인된 일정이어야 한다.
       모임을 나가면(멤버가 아니게 되면) 그 모임의 일정 단톡방에서도 빠진다. */
    if (this.isGroupMember(ev.groupId, who)) return this.isEventChatMember(eventId, who);
    return this.isApprovedEventGuest(eventId, who);
  }

  getEventChatMessages(eventId) {
    const chat = this.getEventChat(eventId);
    if (!chat) return [];
    return (chat.messages || []).slice().sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }

  /** 일정 단톡방 미리보기 — 마지막 말·시각·사람 수. */
  getEventChatPreview(eventId) {
    const messages = this.getEventChatMessages(eventId);
    const last = messages[messages.length - 1] || null;
    const people = this.getEventChatMembers(eventId);
    return {
      eventId,
      count: messages.length,
      people: people.length,
      lastMessage: last ? last.text : '',
      lastAt: last ? last.at : null,
      lastAuthor: last ? (last.from === 'me' ? '나' : last.authorName) : ''
    };
  }

  /** 내가 들어가 있는 일정 단톡방 — 지난 일정은 뒤로, 다가오는 일정은 가까운 순. */
  getMyEventChats(options = {}) {
    const o = options || {};
    const now = Date.now();
    const list = (this.state.groupEvents || [])
      .filter((ev) => ev && !ev.cancelled)
      .filter((ev) => (o.groupId ? ev.groupId === o.groupId : true))
      .filter((ev) => this.canUseEventChat(ev.id))
      .map((ev) => {
        const grp = this.getGroup(ev.groupId);
        const preview = this.getEventChatPreview(ev.id);
        return {
          eventId: ev.id,
          groupId: ev.groupId,
          groupName: grp ? grp.name : '모임',
          title: ev.title,
          when: ev.when,
          whenLabel: this.getGroupEventWhenLabel(ev.when),
          kindMeta: this.getGroupEventKindsLabel(ev.kind),
          past: new Date(ev.when).getTime() < now,
          preview
        };
      });
    return list.sort((a, b) => {
      if (a.past !== b.past) return a.past ? 1 : -1;
      const ta = new Date(a.when).getTime();
      const tb = new Date(b.when).getTime();
      return a.past ? tb - ta : ta - tb;
    });
  }

  /** 일정 단톡방 보내기 — 참석자만. 빈 말은 거부, 1000자까지. */
  sendEventChatMessage(eventId, text, options = {}) {
    if (!this.canUseEventChat(eventId)) return { ok: false, reason: 'permission' };
    const body = String(text == null ? '' : text).trim().slice(0, 1000);
    if (!body) return { ok: false, reason: 'empty' };
    const chat = this.ensureEventChat(eventId);
    if (!chat) return { ok: false, reason: 'not_found' };
    const me = this.currentUser;
    const pendingId = options && options.pendingId;
    if (pendingId) {
      const pending = chat.messages.find((m) => m.id === pendingId);
      if (pending) {
        pending.pending = false;
        pending.queued = false;
        pending.at = new Date().toISOString();
        pending.text = body;
        this.saveState();
        return { ok: true, message: pending, confirmed: true };
      }
    }
    const message = {
      id: `ecm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      from: 'me',
      authorId: me.id,
      authorName: me.nickname,
      authorAvatarText: me.avatarText,
      authorGradient: me.avatarGradient,
      text: body,
      at: new Date().toISOString()
    };
    chat.messages.push(message);
    this.saveState();
    return { ok: true, message };
  }

  /** '전송 중' 말풍선(낙관적 업데이트). */
  createPendingEventChatMessage(eventId, text) {
    if (!this.canUseEventChat(eventId)) return { ok: false, reason: 'permission' };
    const body = String(text == null ? '' : text).trim().slice(0, 1000);
    if (!body) return { ok: false, reason: 'empty' };
    const chat = this.ensureEventChat(eventId);
    if (!chat) return { ok: false, reason: 'not_found' };
    const me = this.currentUser;
    const message = {
      id: `ecm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      from: 'me',
      authorId: me.id,
      authorName: me.nickname,
      authorAvatarText: me.avatarText,
      authorGradient: me.avatarGradient,
      text: body,
      at: new Date().toISOString(),
      pending: true
    };
    chat.messages.push(message);
    this.saveState();
    return { ok: true, message };
  }

  markPendingEventChatMessageFailed(eventId, messageId) {
    const chat = this.getEventChat(eventId);
    if (!chat || !Array.isArray(chat.messages)) return { ok: false, reason: 'not_found' };
    const message = chat.messages.find((m) => m.id === messageId);
    if (!message) return { ok: false, reason: 'not_found' };
    message.pending = false;
    message.failed = true;
    this.saveState();
    return { ok: true, message };
  }

  retryPendingEventChatMessage(eventId, messageId) {
    const chat = this.getEventChat(eventId);
    if (!chat || !Array.isArray(chat.messages)) return { ok: false, reason: 'not_found' };
    const message = chat.messages.find((m) => m.id === messageId);
    if (!message) return { ok: false, reason: 'not_found' };
    message.failed = false;
    message.pending = true;
    this.saveState();
    return { ok: true, message };
  }

  markQueuedEventChatMessage(eventId, messageId) {
    const chat = this.getEventChat(eventId);
    if (!chat || !Array.isArray(chat.messages)) return { ok: false, reason: 'not_found' };
    const message = chat.messages.find((m) => m.id === messageId);
    if (!message) return { ok: false, reason: 'not_found' };
    message.pending = false;
    message.queued = true;
    this.saveState();
    return { ok: true, message };
  }

  /** 참석자가 말하는 모습(시연·데모용) — 알림은 만들지 않는다. */
  receiveEventChatMessage(eventId, memberId, text) {
    const body = String(text == null ? '' : text).trim().slice(0, 1000);
    if (!body) return { ok: false, reason: 'empty' };
    const people = this.getEventChatMembers(eventId).filter((m) => m.memberId !== (this.currentUser || {}).id);
    const speaker = people.find((m) => m.memberId === memberId) || people[0];
    if (!speaker) return { ok: false, reason: 'not_found' };
    const chat = this.ensureEventChat(eventId);
    if (!chat) return { ok: false, reason: 'not_found' };
    const message = {
      id: `ecm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      from: 'member',
      authorId: speaker.memberId,
      authorName: speaker.name,
      authorAvatarText: speaker.avatarText,
      authorGradient: speaker.gradient,
      text: body,
      at: new Date().toISOString()
    };
    chat.messages.push(message);
    this.saveState();
    return { ok: true, message, member: speaker };
  }

  /* ------------------------------------------------ 14-3. 모임 일정 (RSVP) */
  getGroupEventKinds() { return GROUP_EVENT_KINDS.map((k) => ({ ...k })); }

  getGroupEventRsvpOptions() { return GROUP_EVENT_RSVPS.map((r) => ({ ...r })); }

  getGroupEventKindsLabel(kindId) {
    const found = GROUP_EVENT_KINDS.find((k) => k.id === kindId);
    return found || GROUP_EVENT_KINDS[GROUP_EVENT_KINDS.length - 1];
  }

  getGroupEvent(eventId) {
    return (this.state.groupEvents || []).find((e) => e.id === eventId) || null;
  }

  /** 일정 한 건의 요약 — 참석·대기(대기열 순서)·불참 수, 내 선택, 정원 마감 여부. */
  getGroupEventSummary(eventId) {
    const empty = { yes: 0, maybe: 0, no: 0, total: 0, capacity: 0, seatsLeft: 0,
      attendees: [], waiters: [], noList: [], myRsvp: null, myWaitOrder: 0, full: false, whenLabel: '',
      guestPending: 0, guestRequests: [], myGuestStatus: null };
    const ev = this.getGroupEvent(eventId);
    if (!ev) return empty;
    const rsvps = Array.isArray(ev.rsvps) ? ev.rsvps : [];
    const pick = (status) => rsvps.filter((r) => r.status === status);
    const yes = pick('yes');
    /* 대기열 순서 — 먼저 신청한 사람이 1순위(waitingAt, 없으면 배열 순서). */
    const maybe = pick('maybe')
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const ta = a.r.waitingAt ? new Date(a.r.waitingAt).getTime() : 0;
        const tb = b.r.waitingAt ? new Date(b.r.waitingAt).getTime() : 0;
        if (ta && tb) return ta - tb;
        if (ta) return -1;
        if (tb) return 1;
        return a.i - b.i;
      })
      .map((x) => x.r);
    const no = pick('no');
    const me = this.currentUser;
    const mine = rsvps.find((r) => r.memberId === me.id);
    const capacity = Number(ev.capacity) || 0;
    const myWaitIndex = maybe.findIndex((r) => r.memberId === me.id);
    const person = (r) => ({ name: r.name, avatarText: r.avatarText, gradient: r.gradient, memberId: r.memberId });
    /* H3 — 게스트 신청(승인 대기) · 내 신청 상태 */
    const requests = Array.isArray(ev.guestRequests) ? ev.guestRequests : [];
    const pendingGuests = requests.filter((r) => r.status === 'pending');
    const myRequest = requests.find((r) => r.memberId === me.id) || null;
    return {
      yes: yes.length,
      maybe: maybe.length,
      no: no.length,
      total: yes.length + maybe.length,
      capacity,
      seatsLeft: capacity ? Math.max(0, capacity - yes.length) : 0,
      full: !!capacity && yes.length >= capacity,
      attendees: yes.map((r) => ({ ...person(r), guest: r.guest === true })),
      waiters: maybe.map((r, i) => ({ ...person(r), order: i + 1, waitingAt: r.waitingAt || null, guest: r.guest === true })),
      noList: no.map(person),
      myRsvp: mine ? mine.status : null,
      myWaitOrder: myWaitIndex >= 0 ? myWaitIndex + 1 : 0,
      /* H3 — 모임장 화면의 '게스트 승인 대기' 목록 · 내가 낸 신청의 상태 */
      guestPending: pendingGuests.length,
      guestRequests: pendingGuests.map((r) => ({ ...person(r), status: r.status, requestedAt: r.requestedAt || null })),
      myGuestStatus: (mine && mine.guest === true && mine.status === 'yes')
        ? 'approved' : (myRequest ? myRequest.status : null),
      whenLabel: this.getGroupEventWhenLabel(ev.when)
    };
  }

  /**
   * 다른 멤버의 참석 표시(시연·데모용) — 실제 서비스에서는 서버가 처리할 자리.
   * 한 사람이 참석에서 빠져 **자리가 나면** 대기 1순위가 자동으로 올라간다.
   */
  setMemberEventRsvp(eventId, memberId, status) {
    if (!GROUP_EVENT_RSVPS.some((r) => r.id === status)) return { ok: false, reason: 'bad_status' };
    const ev = this.getGroupEvent(eventId);
    if (!ev) return { ok: false, reason: 'not_found' };
    const member = this.getGroupRoster(ev.groupId).members.find((m) => m.id === memberId);
    if (!member) return { ok: false, reason: 'not_found' };
    const rsvps = Array.isArray(ev.rsvps) ? ev.rsvps : [];
    const prev = rsvps.find((r) => r.memberId === memberId) || null;
    const capacity = Number(ev.capacity) || 0;
    const wasFull = !!capacity && rsvps.filter((r) => r.status === 'yes').length >= capacity;
    const rest = rsvps.filter((r) => r.memberId !== memberId);
    const entry = { memberId, name: member.name, avatarText: member.avatarText, gradient: member.gradient, status };
    if (status === 'maybe') entry.waitingAt = new Date().toISOString();
    rest.push(entry);
    ev.rsvps = rest;
    const promoted = (wasFull && prev && prev.status === 'yes' && status !== 'yes')
      ? this._promoteWaitlist(ev) : null;
    this.saveState();
    return { ok: true, eventId, status, promoted, summary: this.getGroupEventSummary(eventId) };
  }

  /** 빈 자리가 생겼을 때 대기 1순위를 참석으로 올린다(내부용). */
  _promoteWaitlist(ev) {
    if (!ev || !Array.isArray(ev.rsvps)) return null;
    const capacity = Number(ev.capacity) || 0;
    if (!capacity) return null;
    const yes = ev.rsvps.filter((r) => r.status === 'yes');
    if (yes.length >= capacity) return null;
    const waiters = ev.rsvps.filter((r) => r.status === 'maybe');
    if (!waiters.length) return null;
    const first = waiters.slice().sort((a, b) => {
      const ta = a.waitingAt ? new Date(a.waitingAt).getTime() : 0;
      const tb = b.waitingAt ? new Date(b.waitingAt).getTime() : 0;
      return (ta || 0) - (tb || 0);
    })[0];
    first.status = 'yes';
    first.promotedAt = new Date().toISOString();
    delete first.waitingAt;
    return first;
  }

  /** 일정 시각을 사람 말로 — '오늘 오후 8:30' · '내일 오전 8:00' · '11월 20일 (금) 오후 7:10'. */
  getGroupEventWhenLabel(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOf(date) - startOf(now)) / (24 * HOUR));
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, '0');
    const clock = `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    if (days === 0) return `오늘 ${clock}`;
    if (days === 1) return `내일 ${clock}`;
    if (days === -1) return `어제 ${clock}`;
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]}) ${clock}`;
  }

  /** 모임의 일정 — 다가오는 순. 지난 일정은 뒤로 보낸다(지우지 않고 '지난 일정'으로). */
  getGroupEvents(groupId) {
    const now = Date.now();
    /* v36.1 — 게스트는 자기가 승인된 일정만 본다. */
    const guestOnly = this.isApprovedGuestOf(groupId);
    return (this.state.groupEvents || [])
      .filter((e) => e.groupId === groupId && (!guestOnly || this.isApprovedEventGuest(e.id)))
      .map((e) => {
        const summary = this.getGroupEventSummary(e.id);
        return {
          ...e,
          ...summary,
          kindMeta: this.getGroupEventKindsLabel(e.kind),
          past: new Date(e.when).getTime() < now
        };
      })
      .sort((a, b) => {
        if (a.past !== b.past) return a.past ? 1 : -1;
        const ta = new Date(a.when).getTime();
        const tb = new Date(b.when).getTime();
        return a.past ? tb - ta : ta - tb;
      });
  }

  /** 다가오는 일정만 — 홈 상단의 '다음 약속'과 채팅 목록 배지에 쓴다. */
  getUpcomingGroupEvents(groupId, limit = 3) {
    const list = this.getGroupEvents(groupId).filter((e) => !e.past);
    return limit ? list.slice(0, limit) : list;
  }

  getNextGroupEvent(groupId) { return this.getUpcomingGroupEvents(groupId, 1)[0] || null; }

  /**
   * v34.3 (#22641) — 내 일정: 내가 '참석'으로 답한(또는 내가 만든) 일정을 예정/다녀온으로 나눈다.
   *  · 모임에 들어 있거나 게스트 참석이 확정된 일정만 본다(남의 모임 일정은 세지 않는다).
   *  · 날짜가 지난 일정은 지우지 않고 '다녀온 일정'으로 옮긴다.
   * @returns {{upcoming:Array, past:Array, total:number}}
   */
  getMySchedule() {
    const me = this.currentUser || {};
    const now = Date.now();
    const row = (e) => {
      const summary = this.getGroupEventSummary(e.id);
      const grp = this.getGroup(e.groupId);
      return {
        ...e,
        ...summary,
        past: new Date(e.when).getTime() < now,
        kindMeta: this.getGroupEventKindsLabel(e.kind),
        groupName: grp ? grp.name : ''
      };
    };
    const mine = (this.state.groupEvents || [])
      .filter((e) => this.isGroupJoined(e.groupId)
        || (Array.isArray(e.rsvps) && e.rsvps.some((r) => r.memberId === me.id && r.guest === true)))
      .map(row)
      .filter((e) => {
        /* 내가 만든 일정이라도 '불참'으로 돌리면 빠진다(대기(maybe)는 확정이 아니므로 참석이 아니다). */
        if (e.myRsvp === 'no') return false;
        return e.myRsvp === 'yes' || e.myGuestStatus === 'approved'
          || (e.createdBy === me.id && e.myRsvp !== 'maybe');
      });
    const upcoming = mine.filter((e) => !e.past)
      .sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());
    const past = mine.filter((e) => e.past)
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
    return { upcoming, past, total: mine.length };
  }

  /* ==========================================================================
   * v34.4 (#22760 · #22772) — 다녀온 모임(지난 일정) · 공개 범위
   * --------------------------------------------------------------------------
   * 11/22 22:27 루키 님: "다녀온 일정은 본인한테는 다 보이지만 여기서 공개 또는 비공개로
   * 전환해서(토글형식으로) 타 이용자에게 보이도록" · "아예 숫자도 … 안 보이게".
   *
   *  · 나   : 내가 참석(yes)했거나 만든 지난 일정 전부. 숫자도 전체 개수.
   *  · 타인 : 그 사람이 참석/개설한 지난 일정에서 그 사람이 공개한 것만.
   *           숫자까지 비공개면 숫자 대신 '비공개'를 보여 준다.
   * ========================================================================== */
  /** 한 사람의 다녀온 모임 — 나는 내 일정에서, 남은 일정 기록에서 파생한다. */
  getPersonPastMeetings(personId) {
    const meId = (this.currentUser || {}).id;
    const id = personId || meId;
    if (!id) return [];
    if (id === meId) return this.getMySchedule().past;
    const now = Date.now();
    return (this.state.groupEvents || [])
      .filter((e) => e && new Date(e.when).getTime() < now)
      .filter((e) => e.createdBy === id
        || (Array.isArray(e.rsvps) && e.rsvps.some((r) => r.memberId === id && r.status === 'yes')))
      .map((e) => {
        const grp = this.getGroup(e.groupId);
        return {
          ...e,
          ...this.getGroupEventSummary(e.id),
          past: true,
          groupName: grp ? grp.name : '',
          kindMeta: this.getGroupEventKindsLabel(e.kind)
        };
      })
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  }

  /** 내가 이 다녀온 모임을 타인에게 보여 주는가(전체 비공개면 무조건 false). */
  isPastMeetingShared(eventId) {
    const cu = this.currentUser || {};
    if (cu.pastMeetingsPublic === false) return false;
    const map = cu.pastMeetingVisibility || {};
    return map[eventId] !== false;
  }

  /** 전체 공개/비공개 — 끄면 숫자까지 숨기고, 켜면 모임별 설정을 따른다. */
  setPastMeetingsPublic(on) {
    this.currentUser.pastMeetingsPublic = on === true;
    this.saveState();
    return { ok: true, public: this.currentUser.pastMeetingsPublic };
  }

  /** 모임 하나만 공개/비공개. */
  setPastMeetingShared(eventId, on) {
    if (!eventId) return { ok: false, reason: 'bad_event' };
    const cu = this.currentUser || {};
    if (!cu.pastMeetingVisibility || typeof cu.pastMeetingVisibility !== 'object') cu.pastMeetingVisibility = {};
    cu.pastMeetingVisibility[eventId] = on === true;
    this.saveState();
    return { ok: true, eventId, shared: cu.pastMeetingVisibility[eventId] };
  }

  /**
   * 화면이 쓰는 한 묶음 — 나와 타인을 같은 모양으로 돌려준다.
   * @returns {{isMe:boolean, hidden:boolean, total:number, shared:number, list:Array, visible:Array}}
   *   list    : 본인에게 보이는 전체(타인에게는 공개 목록)
   *   visible : 지금 보는 사람이 볼 수 있는 목록
   */
  getPastMeetingPrivacy(personId) {
    const meId = (this.currentUser || {}).id;
    const id = personId || meId;
    const all = this.getPersonPastMeetings(id);
    if (id === meId) {
      const hidden = (this.currentUser || {}).pastMeetingsPublic === false;
      const sharedList = all.filter((e) => this.isPastMeetingShared(e.id));
      return { isMe: true, hidden, total: all.length, shared: sharedList.length, list: all, visible: all, sharedList };
    }
    const person = this.getPersonProfile(id) || {};
    const hidden = person.pastMeetingsPublic === false;
    const map = (person.pastMeetingVisibility && typeof person.pastMeetingVisibility === 'object')
      ? person.pastMeetingVisibility : {};
    const sharedList = hidden ? [] : all.filter((e) => map[e.id] !== false);
    return { isMe: false, hidden, total: all.length, shared: sharedList.length, list: sharedList, visible: sharedList, sharedList };
  }

  /** 한 사람의 모임 — 나는 가입한 모임, 남은 모임장이거나 멤버로 들어 있는 모임. */
  getPersonGroups(personId) {
    const meId = (this.currentUser || {}).id;
    const id = personId || meId;
    if (id === meId) return this.getJoinedGroups();
    return (this.state.groups || []).filter((g) => g && (g.leaderId === id
      || (Array.isArray(g.members) && g.members.some((m) => m && m.id === id))));
  }

  /**
   * v34.5 (#22862) — 사람 프로필의 @아이디. 저장된 값이 없으면 id·닉네임에서 만들어
   * 타인 프로필 맨 위에도 늘 아이디가 보이게 한다(가입자 아닌 예시·쪽지 상대 포함).
   */
  personHandle(person) {
    const raw = String((person && person.handle) || '').replace(/^@+/, '').trim();
    if (raw) return raw;
    const base = String((person && (person.id || person.nickname)) || 'oog')
      .replace(/^sample_p_/, '')
      .replace(/^by-name:/, '')
      .replace(/[^a-zA-Z0-9._]/g, '')
      .toLowerCase();
    return base.length >= 2 ? base : 'oog';
  }

  /** 한 사람이 올린 글 수(내 글·타인 글 모두 같은 기준). */
  getPersonPostCount(personId) {
    const id = personId || (this.currentUser || {}).id;
    return (this.state.feedPosts || []).filter((p) => p && p.authorId === id).length;
  }

  /**
   * v34.5 (#22862) — 한 사람이 올린 피드(최신순). 내 프로필의 getMyFeedPosts 와 같은 모양이라
   * 타인 프로필 하단 피드도 같은 카드·같은 격자로 그릴 수 있다.
   */
  getPersonFeedPosts(personId = 0) {
    const id = personId || (this.currentUser || {}).id;
    return (this.state.feedPosts || [])
      .filter((p) => p && p.authorId === id)
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p) => {
        const g = this.getGroup(p.groupId);
        return {
          ...p,
          groupName: g ? g.name : (p.groupId ? '' : '자유 피드'),
          groupIcon: g ? g.icon : (p.groupId ? '' : 'globe'),
          commentCount: (p.comments || []).length,
          photo: !!p.photoUrl
        };
      });
  }

  /** 참석/대기/불참 — 한 사람은 한 상태만.
   *  Sprint 15 — 정원이 찾는데 참석을 누르면 **자동으로 대기 명단**에 들어간다.
   *  참석자가 불참으로 빠져 자리가 나면 대기 1순위가 자동으로 참석이 된다. */
  setGroupEventRsvp(eventId, status) {
    if (!GROUP_EVENT_RSVPS.some((r) => r.id === status)) return { ok: false, reason: 'bad_status' };
    const ev = this.getGroupEvent(eventId);
    if (!ev) return { ok: false, reason: 'not_found' };
    if (!this.isGroupJoined(ev.groupId)) return { ok: false, reason: 'not_member' };
    if (new Date(ev.when).getTime() < Date.now()) return { ok: false, reason: 'past' };
    const me = this.currentUser;
    const rsvps = Array.isArray(ev.rsvps) ? ev.rsvps : [];
    const prev = rsvps.find((r) => r.memberId === me.id) || null;
    const capacity = Number(ev.capacity) || 0;
    const othersYes = rsvps.filter((r) => r.memberId !== me.id && r.status === 'yes').length;
    let finalStatus = status;
    let autoWait = false;
    if (status === 'yes' && capacity && othersYes >= capacity) {
      finalStatus = 'maybe';
      autoWait = true;
    }
    const rest = rsvps.filter((r) => r.memberId !== me.id);
    const entry = {
      memberId: me.id,
      name: me.nickname,
      avatarText: me.avatarText,
      gradient: me.avatarGradient,
      status: finalStatus
    };
    if (finalStatus === 'maybe') {
      entry.waitingAt = (prev && prev.status === 'maybe' && prev.waitingAt) || new Date().toISOString();
    }
    rest.push(entry);
    ev.rsvps = rest;
    /* v36.1 — 참석·대기를 고르면 그 일정 단톡방에 바로 들어간다(방이 없으면 만든다). */
    if (finalStatus === 'yes' || finalStatus === 'maybe') this.ensureEventChat(eventId);
    /* 내가 참석에서 빠져 **정원이 차 있던 자리**가 비면 대기 1순위를 올린다. */
    const wasFull = !!capacity && rsvps.filter((r) => r.status === 'yes').length >= capacity;
    const promoted = (wasFull && prev && prev.status === 'yes' && finalStatus !== 'yes')
      ? this._promoteWaitlist(ev) : null;
    this.saveState();
    return {
      ok: true,
      eventId,
      status: finalStatus,
      autoWait,
      promoted,
      summary: this.getGroupEventSummary(eventId)
    };
  }

  /**
   * Sprint 33 — 경계 실패 롤백: 내 참석 상태를 **이전 값으로** 되돌린다(null 이면 명단에서 뺀다).
   *  (정원·대기열 계산을 다시 돌리지 않고 저장 전 상태를 그대로 복원한다.)
   */
  restoreGroupEventRsvp(eventId, prevStatus) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return { ok: false, reason: 'not_found' };
    const me = this.currentUser;
    const rsvps = Array.isArray(ev.rsvps) ? ev.rsvps : [];
    const prevEntry = rsvps.find((r) => r.memberId === me.id) || null;
    if (!prevStatus) {
      ev.rsvps = rsvps.filter((r) => r.memberId !== me.id);
    } else {
      const rest = rsvps.filter((r) => r.memberId !== me.id);
      rest.push(prevEntry
        ? { ...prevEntry, status: prevStatus }
        : { memberId: me.id, name: me.nickname, avatarText: me.avatarText, gradient: me.avatarGradient, status: prevStatus });
      ev.rsvps = rest;
    }
    this.saveState();
    return { ok: true, eventId, status: prevStatus || null };
  }

  /** 술모임·번개 만들기 — 제목 2~30자, 종류는 4종, 시각은 지금 이후. */
  createGroupEvent(groupId, payload = {}) {
    if (!this.isGroupJoined(groupId)) return { ok: false, reason: 'not_member' };
    /* v35.2 — 공지와 같은 게시판 권한을 따른다. 모임장·운영진, 그리고 허락된 모임의 멤버. */
    if (!this.getGroupBoardPolicy(groupId).canWrite) return { ok: false, reason: 'permission' };
    const archivedGroup = this.getGroup(groupId);
    if (archivedGroup && archivedGroup.archived) return { ok: false, reason: 'archived' };
    const title = String(payload.title == null ? '' : payload.title).trim();
    if (title.length < 2) return { ok: false, reason: 'title_short' };
    if (title.length > 30) return { ok: false, reason: 'title_long' };
    const kind = GROUP_EVENT_KINDS.some((k) => k.id === payload.kind) ? payload.kind : 'drink';
    const when = new Date(payload.when || '');
    if (Number.isNaN(when.getTime())) return { ok: false, reason: 'bad_when' };
    if (when.getTime() < Date.now() - 60 * 1000) return { ok: false, reason: 'past_when' };
    if (!Array.isArray(this.state.groupEvents)) this.state.groupEvents = [];
    const capacity = Math.min(50, Math.max(2, Number(payload.capacity) || 12));
    const me = this.currentUser;
    const event = {
      id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      groupId,
      kind,
      title,
      when: when.toISOString(),
      place: String(payload.place == null ? '' : payload.place).trim().slice(0, 40),
      note: String(payload.note == null ? '' : payload.note).trim().slice(0, 140),
      capacity,
      /* Sprint 32.5 — 게스트 참여 가능. 켜 두면 모임 밖 사람도 홈 '추천 일정'에서 참석을 신청한다.
         H3(11/21) — **모임 기본값을 따르지 않는다.** 일정을 만들 때마다 기본은 꺼짐(false)이고,
         만든 사람이 일정 만들기/수정에서 직접 켜야만 홈 추천 일정에 오른다. */
      guestOpen: payload.guestOpen === true,
      createdBy: me.id,
      createdByName: me.nickname,
      createdAt: new Date().toISOString(),
      rsvps: [{ memberId: me.id, name: me.nickname, avatarText: me.avatarText, gradient: me.avatarGradient, status: 'yes' }],
      /* H3 — 게스트 참석 신청은 '승인 대기'로 여기에 적히고, 모임장이 수락/거절한다. */
      guestRequests: []
    };
    this.state.groupEvents.push(event);
    /* v36.1 (#23461) — 일정이 생기면 그 일정의 단톡방도 바로 생긴다(만든 사람은 자동 참석). */
    this.ensureEventChat(event.id);
    this.saveState();
    return { ok: true, event, summary: this.getGroupEventSummary(event.id) };
  }

  /** 일정 수정 — 만든 사람만. 게스트 참여 가능 여부도 여기서 바꿔진다. */
  /** 일정 취소 — 만든 사람 또는 모임 운영 권한(운영진·모임장). 목록에는 '취소됨'으로 남긴다. */
  cancelGroupEvent(eventId) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return { ok: false, reason: 'not_found' };
    const mine = ev.createdBy === this.currentUser.id;
    if (!mine && !this.can(ev.groupId, 'manage_events')) return { ok: false, reason: 'permission' };
    ev.cancelled = true;
    ev.cancelledAt = new Date().toISOString();
    this.logGroupMod(ev.groupId, 'event_cancel', { targetId: ev.id, targetName: ev.title });
    this.saveState();
    return { ok: true, event: ev };
  }

  updateGroupEvent(eventId, payload = {}) {
    const ev = this.getGroupEvent(eventId);
    if (!ev) return { ok: false, reason: 'not_found' };
    if (ev.createdBy !== this.currentUser.id) return { ok: false, reason: 'permission' };
    const title = String(payload.title == null ? ev.title : payload.title).trim();
    if (title.length < 2) return { ok: false, reason: 'title_short' };
    if (title.length > 30) return { ok: false, reason: 'title_long' };
    const kind = GROUP_EVENT_KINDS.some((k) => k.id === payload.kind) ? payload.kind : ev.kind;
    const when = new Date(payload.when || ev.when);
    if (Number.isNaN(when.getTime())) return { ok: false, reason: 'bad_when' };
    ev.title = title;
    ev.kind = kind;
    ev.when = when.toISOString();
    if (payload.place != null) ev.place = String(payload.place).trim().slice(0, 40);
    if (payload.note != null) ev.note = String(payload.note).trim().slice(0, 140);
    if (payload.capacity != null) ev.capacity = Math.min(50, Math.max(2, Number(payload.capacity) || 12));
    if (payload.guestOpen != null) ev.guestOpen = payload.guestOpen === true;
    this.saveState();
    return { ok: true, event: ev, summary: this.getGroupEventSummary(ev.id) };
  }

  /* ------------------------------------------------------ 14-4. 전체 멤버 */
  /**
   * 전체 멤버 목록 — **실제로 있는 사람만** 센다.
   * Sprint 18: 예전에는 memberCount 만큼 이름을 지어내 채웠다. 이제 사용자가 만든 모임은
   * 모임장(나) 한 명에서 시작하고, 승인된 가입 신청·실제 글 작성자만 명단에 오른다.
   * @returns {{total:number, members:Array}}
   */
  getGroupRoster(groupId, options) {
    const group = this.getGroup(groupId);
    if (!group) return { total: 0, members: [] };
    const me = this.currentUser;
    const members = [];
    const seen = new Set();
    /* 멤버 목록 공개 범위 — 'staff'면 모임장·운영진에게만 보인다. */
    const settings = this.getGroupSettings(groupId);
    const viewerRole = (options && options.viewerRole) || this.roleOf(groupId);
    const canList = viewerRole !== 'member' || settings && settings.memberListVisibility !== 'staff';
    const push = (entry) => {
      const name = String(entry.name || '').trim();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      members.push(entry);
      return true;
    };
    const joinLabel = (iso) => {
      const d = iso ? new Date(iso) : new Date();
      if (Number.isNaN(d.getTime())) return '';
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')} 가입`;
    };
    const hobbyList = (hobbyNames) => (hobbyNames || []).slice(0, 2)
      .map((name) => ({ name, icon: 'dot' }));

    /* 이 모임에서만 쓰는 내 프로필(닉네임·사진 공개) — 명단·글에 그대로 반영된다. */
    const myProfile = this.getGroupProfile(groupId);
    const myName = myProfile.nickname || me.nickname;
    const myPhoto = myProfile.photoVisible ? (me.photoUrl || null) : null;
    const roleOfEntry = (id) => this.roleOf(groupId, id);
    /* 1) 모임장 */
    const leaderIsMe = group.leaderId === me.id;
    const avatarOf = (personId) => EXAMPLE_PERSON_AVATARS[personId] || null;
    push({
      id: group.leaderId || 'leader',
      name: leaderIsMe ? myName : (group.leaderName || '모임장'),
      role: 'leader',
      groupRole: 'owner',
      isLeader: true,
      isMe: leaderIsMe,
      avatarText: leaderIsMe ? (myName.charAt(0) || me.avatarText) : (group.leaderName || '그').charAt(0),
      photoUrl: leaderIsMe ? myPhoto : avatarOf(group.leaderId),
      gradient: leaderIsMe ? me.avatarGradient : GROUP_ROSTER_GRADIENTS[0],
      hobbies: leaderIsMe ? hobbyList(me.hobbies) : [],
      joinedAt: group.createdAt || null,
      joinedLabel: joinLabel(group.createdAt)
    });
    /* 2) 승인되어 실제로 들어온 멤버 */
    (group.members || []).forEach((m) => {
      const isMe = m.id === me.id;
      push({
        id: m.id,
        name: isMe ? myName : m.name,
        role: isMe ? 'me' : 'member',
        groupRole: roleOfEntry(m.id),
        isLeader: false,
        isMe,
        avatarText: m.avatarText || String(m.name).charAt(0),
        photoUrl: isMe ? myPhoto : (m.photoUrl || avatarOf(m.id)),
        gradient: m.gradient || GROUP_ROSTER_GRADIENTS[members.length % GROUP_ROSTER_GRADIENTS.length],
        hobbies: hobbyList(m.hobbies),
        joinedAt: m.joinedAt || null,
        joinedLabel: joinLabel(m.joinedAt)
      });
    });
    /* 3) 이 모임에 실제로 글을 쓴 사람 */
    (this.state.feedPosts || []).filter((p) => p.groupId === groupId).forEach((p) => {
      const isMe = p.authorId === me.id;
      push({
        id: p.authorId || `author_${p.id}`,
        name: isMe ? myName : p.authorName,
        role: isMe ? 'me' : 'member',
        groupRole: p.authorId ? roleOfEntry(p.authorId) : 'member',
        isLeader: false,
        isMe,
        avatarText: p.authorAvatarText || String(p.authorName || '').charAt(0),
        photoUrl: isMe ? myPhoto : avatarOf(p.authorId),
        gradient: p.authorGradient || GROUP_ROSTER_GRADIENTS[members.length % GROUP_ROSTER_GRADIENTS.length],
        hobbies: [],
        joinedAt: null,
        joinedLabel: ''
      });
    });
    /* 4) 나 (아직 없으면) */
    if (this.isGroupJoined(groupId)) {
      push({
        id: me.id,
        name: myName,
        role: leaderIsMe ? 'leader' : 'me',
        groupRole: roleOfEntry(me.id),
        isLeader: leaderIsMe,
        isMe: true,
        avatarText: (myName || '').charAt(0) || me.avatarText,
        photoUrl: myPhoto,
        gradient: me.avatarGradient,
        hobbies: hobbyList(me.hobbies),
        joinedAt: null,
        joinedLabel: ''
      });
    }
    /* 5) '멤버 목록에서 숨기기'를 켠 사람은 멤버에게 보이지 않는다(운영진 이상은 본다).
          공개 범위가 '운영진만'이면 멤버에게는 명단 자체를 주지 않는다. */
    let visible = members;
    if (viewerRole === 'member') {
      visible = settings.memberListVisibility === 'staff' ? [] : members.filter((m) => {
        const pref = this.getGroupMembership(groupId, m.id);
        return !pref.hiddenInList;
      });
    } else if (viewerRole === 'guest') {
      /* 게스트(비멤버)는 멤버 목록을 볼 수 없다 — 일정과 그 일정 채팅만. */
      visible = [];
    }
    return {
      total: visible.length,
      members: visible,
      hiddenByPolicy: viewerRole === 'guest'
        || (viewerRole === 'member' && settings.memberListVisibility === 'staff')
    };
  }

  /** 멤버 → 1:1 대화방 — 이미 있으면 그 방, 없으면 만든다(프로필에서 말 걸기).
   *  Sprint 15 — 모임장이 '모임 내 1:1 대화'를 꺼둔 모임은 방을 열지 않는다. */
  ensureMemberChat(groupId, memberId) {
    const group = this.getGroup(groupId);
    if (!group) return { ok: false, reason: 'not_found' };
    if (group.dmEnabled === false) {
      return { ok: false, reason: 'dm_disabled', group, message: '이 모임은 모임장이 1:1 대화를 꺼두었어요' };
    }
    const roster = this.getGroupRoster(groupId);
    const member = roster.members.find((m) => m.id === memberId);
    if (!member) return { ok: false, reason: 'not_found' };
    if (member.isMe) return { ok: false, reason: 'me' };
    if (!Array.isArray(this.state.chatRooms)) this.state.chatRooms = [];
    const existing = this.state.chatRooms.find((r) => r.partnerName === member.name);
    if (existing) {
      if (!existing.groupId) existing.groupId = groupId;
      return { ok: true, roomId: existing.id, created: false };
    }
    const hobby = (member.hobbies && member.hobbies[0] && member.hobbies[0].name) || (group ? group.categoryName : '취미');
    const room = {
      id: `room_gm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      groupId,
      partnerId: member.id,
      partnerName: member.name,
      partnerHobby: hobby,
      partnerAvatarText: member.avatarText,
      partnerGradient: member.gradient,
      lastMessage: '',
      lastTime: '',
      unreadCount: 0,
      isNewMatch: false,
      matchedAt: new Date().toISOString(),
      messages: []
    };
    this.state.chatRooms.push(room);
    this.saveState();
    return { ok: true, roomId: room.id, created: true, room };
  }

  /* saveState() 와 같은 일을 하되 이름만 명시적으로 쓴다(여러 액션에서 재사용). */
  setStateChanged() { this.saveState(); }

  /* ==========================================================================
   * Sprint 15 — 인스타그램형 4탭: 피드(공지·일정·스크롤 피드) · 돋보기 · 디엠 · 내정보
   * ------------------------------------------------------------------------
   * 11/15 16:00~16:09 사용자 지시를 그대로 옮긴 구획이다.
   *   15-1 공지(모임장+운영진)   15-2 운영진 지정
   *   15-3 모임 내 1:1 대화 ON/OFF  15-4 돋보기(타 모임) 노출 동의
   *   15-5 내 피드(내정보)        15-6 일정 정원 초과 → 자동 대기
   * ======================================================================== */

  /* ------------------------------------------------ 15-1. 모임 공지 */
  /** 모임 공지 — 고정된 것이 먼저, 그 다음 최신순. */
  getGroupNotices(groupId) {
    /* v36.1 — 게스트는 공지·게시판을 볼 수 없다(그 일정과 일정 단톡방만). */
    if (this.isApprovedGuestOf(groupId)) return [];
    return (this.state.groupNotices || [])
      .filter((n) => n.groupId === groupId)
      .slice()
      .sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
        return new Date(b.at).getTime() - new Date(a.at).getTime();
      });
  }

  /** 상단 공지 바에 한 줄로 붙는 공지 — 고정 공지가 있으면 그것, 없으면 가장 최근 공지. */
  getPinnedGroupNotice(groupId) {
    const list = this.getGroupNotices(groupId);
    return list.find((n) => n.pinned) || list[0] || null;
  }

  getGroupNotice(noticeId) {
    return (this.state.groupNotices || []).find((n) => n.id === noticeId) || null;
  }

  /** 공지 작성·수정·고정 권한 — 모임장과 모임장이 지정한 운영진만. */
  getGroupNoticePermission(groupId) {
    const role = this.roleOf(groupId);
    if (role === 'guest') {
      return { ok: false, role: 'guest', label: '비멤버', canManage: false, canWrite: false, reason: 'not_member' };
    }
    const board = this.getGroupBoardPolicy(groupId);
    const canManage = this.can(groupId, 'write_notice');
    return {
      ok: true,
      role,
      label: this.roleLabel(role),
      canManage,
      canWrite: canManage ? true : board.canWrite,
      board,
      reason: canManage || board.canWrite ? undefined : 'permission'
    };
  }

  /** 공지 쓰기 — 2~120자. 모임장·운영진, 그리고 모임장이 허락한 모임에서는 멤버도. */
  createGroupNotice(groupId, text, options = {}) {
    const perm = this.getGroupNoticePermission(groupId);
    if (!perm.canWrite) return { ok: false, reason: perm.reason || 'permission', permission: perm };
    const body = String(text == null ? '' : text).trim();
    if (body.length < 2) return { ok: false, reason: 'short' };
    if (body.length > 120) return { ok: false, reason: 'long' };
    const grp = this.getGroup(groupId);
    if (grp && grp.archived) return { ok: false, reason: 'archived' };
    if (!Array.isArray(this.state.groupNotices)) this.state.groupNotices = [];
    const me = this.currentUser;
    const notice = {
      id: `ntc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      groupId,
      text: body,
      pinned: options.pinned === true || this.getGroupNotices(groupId).length === 0,
      authorId: me.id,
      authorName: me.nickname,
      authorRole: perm.role,
      at: new Date().toISOString()
    };
    this.state.groupNotices.push(notice);
    this.saveState();
    return { ok: true, notice, permission: perm };
  }

  updateGroupNotice(noticeId, text) {
    const notice = this.getGroupNotice(noticeId);
    if (!notice) return { ok: false, reason: 'not_found' };
    const perm = this.getGroupNoticePermission(notice.groupId);
    /* v35.2 — 모임장·운영진, 또는 자기가 쓴 공지. */
    const mine = notice.authorId && notice.authorId === this.currentUser.id;
    if (!perm.canManage && !(mine && perm.canWrite)) return { ok: false, reason: 'permission', permission: perm };
    const body = String(text == null ? '' : text).trim();
    if (body.length < 2) return { ok: false, reason: 'short' };
    if (body.length > 120) return { ok: false, reason: 'long' };
    notice.text = body;
    notice.editedAt = new Date().toISOString();
    this.saveState();
    return { ok: true, notice, permission: perm };
  }

  /** 공지 고정/해제. 고정한 공지가 상단 바에 붙는다. */
  setGroupNoticePinned(noticeId, pinned) {
    const notice = this.getGroupNotice(noticeId);
    if (!notice) return { ok: false, reason: 'not_found' };
    const perm = this.getGroupNoticePermission(notice.groupId);
    if (!perm.canManage) return { ok: false, reason: 'permission', permission: perm };
    notice.pinned = pinned === undefined ? !notice.pinned : !!pinned;
    this.saveState();
    return { ok: true, notice, pinned: notice.pinned };
  }

  deleteGroupNotice(noticeId) {
    const notice = this.getGroupNotice(noticeId);
    if (!notice) return { ok: false, reason: 'not_found' };
    const perm = this.getGroupNoticePermission(notice.groupId);
    const mine = notice.authorId && notice.authorId === this.currentUser.id;
    if (!perm.canManage && !(mine && perm.canWrite)) return { ok: false, reason: 'permission', permission: perm };
    this.state.groupNotices = (this.state.groupNotices || []).filter((n) => n.id !== noticeId);
    this.saveState();
    return { ok: true, notice };
  }

  /* ------------------------------------------------ 15-2. 운영진 */
  /* H5 — memberId 를 주지 않으면 '나'로 본다. getDeputyPermissions 가 인자 없이 부르는데
     기본값이 없어서 운영진이 늘 false 로 읽히던 버그를 함께 고쳤다. */
  isGroupDeputy(groupId, memberId) {
    return this.roleOf(groupId, memberId) === 'staff';
  }

  getGroupDeputies(groupId) {
    const g = this.getGroup(groupId);
    if (!g) return [];
    const roster = this.getGroupRoster(groupId);
    return (g.deputyIds || [])
      .map((id) => roster.members.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => ({ memberId: m.id, name: m.name, avatarText: m.avatarText,
                    gradient: m.gradient, isMe: !!m.isMe }));
  }

  /** 모임장이 멤버를 운영진으로 임명/해임 — 최대 3명, 모임장 본인은 대상이 아니다. */
  setGroupDeputy(groupId, memberId, on = true) {
    if (!this.can(groupId, 'manage_staff')) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    if (memberId === g.leaderId) return { ok: false, reason: 'leader' };
    const member = this.getGroupRoster(groupId).members.find((m) => m.id === memberId);
    if (!member) return { ok: false, reason: 'not_found' };
    /* v36.0 — 운영진은 이 모임의 실제 멤버 중에서만 임명한다(글만 쓴 사람은 대상이 아니다). */
    const realMember = (g.members || []).some((m) => m.id === memberId)
      || (this.isGroupJoined(groupId) && memberId === this.state.currentUser.id);
    if (!realMember) return { ok: false, reason: 'not_member' };
    const ids = Array.isArray(g.deputyIds) ? g.deputyIds.slice() : [];
    const has = ids.includes(memberId);
    if (on && !has) {
      if (ids.length >= GROUP_STAFF_MAX) return { ok: false, reason: 'too_many' };
      ids.push(memberId);
    } else if (!on && has) {
      ids.splice(ids.indexOf(memberId), 1);
    }
    g.deputyIds = ids;
    /* 멤버십에도 역할을 적는다 — 명단이 role 을 읽어도 같은 답이 나온다. */
    const entry = (g.members || []).find((m) => m.id === memberId);
    if (entry) entry.role = has ? 'member' : 'staff';
    if (!has) {
      this.logGroupMod(groupId, on ? 'staff_add' : 'staff_remove', { targetId: memberId, targetName: member.name });
    }
    this.saveState();
    return {
      ok: true,
      deputyIds: ids.slice(),
      member,
      designated: !!on && !has,
      released: !on && has,
      deputies: this.getGroupDeputies(groupId)
    };
  }

  /* ------------------------------------ 15-3. 모임 내 1:1 대화 ON/OFF */
  getGroupDmPolicy(groupId) {
    const g = this.getGroup(groupId);
    return {
      groupId,
      exists: !!g,
      enabled: !!g && g.dmEnabled !== false,
      isLeader: this.isGroupLeader(groupId),
      isMember: this.isGroupJoined(groupId)
    };
  }

  /** 모임 내 1:1 대화 허용 여부 — 모임장만 바꿀 수 있다. */
  updateGroupDmPolicy(groupId, enabled) {
    if (!this.can(groupId, 'edit_group')) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    g.dmEnabled = !!enabled;
    this.saveState();
    return {
      ok: true,
      enabled: g.dmEnabled,
      group: g,
      /* 이미 열려 있던 방은 지우지 않는다 — 정책만 알리고 기록은 남긴다. */
      openRooms: this.state.chatRooms.filter((r) => r.groupId === groupId).length
    };
  }

  /* ------------------------------------ v35.2. 모임 게시판 작성 권한 */
  /**
   * 게시판(공지·일정) 작성 권한 — 모임장·운영진은 늘 쓸 수 있고,
   * 일반 멤버는 모임장이 `memberBoardWrite` 를 켰을 때만 쓸 수 있다.
   * @returns {{groupId:string, exists:boolean, isLeader:boolean, isDeputy:boolean,
   *            isMember:boolean, memberCanWrite:boolean, canWrite:boolean, role:string}}
   */
  getGroupBoardPolicy(groupId) {
    const g = this.getGroup(groupId);
    const role = this.roleOf(groupId);
    const isMember = role !== 'guest';
    const isLeader = role === 'owner';
    const isDeputy = role === 'staff';
    const memberCanWrite = !!g && g.memberBoardWrite === true;
    const staffCanWrite = this.can(groupId, 'manage_board');
    return {
      groupId,
      exists: !!g,
      isLeader,
      isDeputy,
      isMember,
      memberCanWrite,
      /* 멤버가 쓸 수 있는지는 모임장이 정한 값 하나로만 열린다. */
      canWrite: staffCanWrite || (isMember && memberCanWrite),
      role
    };
  }

  /** 모임장만 — 게시판(공지·일정)의 멤버 작성 허용을 켜고 끈다. */
  updateGroupBoardPolicy(groupId, enabled) {
    if (!this.can(groupId, 'edit_group')) return { ok: false, reason: 'permission' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    g.memberBoardWrite = !!enabled;
    this.saveState();
    return { ok: true, memberCanWrite: g.memberBoardWrite, policy: this.getGroupBoardPolicy(groupId) };
  }

  /* ------------------------------------ v35.2. 모임 알림 설정 (모임마다) */
  getGroupNotifySetting(groupId) {
    const g = this.getGroup(groupId);
    const m = this.getGroupMembership(groupId);
    return {
      groupId,
      exists: !!g,
      isMember: this.isGroupJoined(groupId),
      /* v36.0 — 전체 / 멘션·공지만 / 끔 + 일정 알림 별도 스위치 */
      mode: m.notifyMode,
      events: m.notifyEvents,
      muted: m.muted,
      enabled: !!g && m.notifyMode !== 'off' && g.notifyEnabled !== false
    };
  }

  /** 모임 알림 받기 ON/OFF — 그 모임에 속한 사람이면 누구나 바꿀 수 있다(나에게 오는 알림). */
  updateGroupNotifySetting(groupId, value) {
    if (!this.isGroupJoined(groupId)) return { ok: false, reason: 'not_member' };
    const g = this.getGroup(groupId);
    if (!g) return { ok: false, reason: 'not_found' };
    /* 예전 호출은 true/false 하나만 넘겼다 — 새 모드 호출도 함께 받는다. */
    const patch = typeof value === 'object' && value !== null ? Object.assign({}, value) : { mode: value ? 'all' : 'off' };
    if (patch.mode === undefined && 'enabled' in patch) patch.mode = patch.enabled ? 'all' : 'off';
    if (patch.notifyMode === undefined && patch.mode !== undefined) patch.notifyMode = patch.mode;
    const res = this.updateGroupMembership(groupId, patch);
    if (!res.ok) return res;
    g.notifyEnabled = res.membership.notifyMode !== 'off';
    this.saveState();
    return { ok: true, enabled: g.notifyEnabled, mode: res.membership.notifyMode, setting: this.getGroupNotifySetting(groupId) };
  }

  /** 이 1:1 방이 어느 모임에서 열렸는지 — 방에 groupId 가 없으면 상대 이름으로 되찾는다. */
  getChatRoomGroupId(roomId) {
    const room = (this.state.chatRooms || []).find((r) => r.id === roomId);
    if (!room) return null;
    if (room.groupId) return room.groupId;
    const g = (this.state.groups || []).find((grp) => this.getGroupRoster(grp.id).members
      .some((m) => !m.isMe && m.name === room.partnerName));
    return g ? g.id : null;
  }

  /* ------------------------------------------------ 15-5. 내 피드 */
  /** 내가 올린 피드 — 내정보 탭의 3열 그리드(최신순). */
  getMyFeedPosts(limit = 0) {
    const me = this.currentUser.id;
    const list = (this.state.feedPosts || [])
      .filter((p) => p.authorId === me)
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p) => {
        const g = this.getGroup(p.groupId);
        return {
          ...p,
          /* v33.8 — 모임 없이 올린 글은 '자유 피드'로 보여 준다. */
          groupName: g ? g.name : (p.groupId ? '' : '자유 피드'),
          groupIcon: g ? g.icon : (p.groupId ? '' : 'globe'),
          commentCount: (p.comments || []).length,
          photo: !!p.photoUrl
        };
      });
    return limit ? list.slice(0, limit) : list;
  }

  getMyFeedStats() {
    const posts = this.getMyFeedPosts();
    return {
      total: posts.length,
      photos: posts.filter((p) => p.photo).length,
      likes: posts.reduce((sum, p) => sum + (p.likes || 0), 0),
      comments: posts.reduce((sum, p) => sum + (p.commentCount || 0), 0),
      explore: posts.filter((p) => p.photoUrl).length
    };
  }

  /* ------------------------------------------------ 15-6. 댓글 2차 */
  /** 댓글 좋아요 — 댓글 하나에 하트. 내 댓글에도 붙을 수 있다. */
  toggleCommentLike(postId, commentId) {
    const post = this.getPost(postId);
    if (!post) return null;
    const comment = (post.comments || []).find((c) => c.id === commentId);
    if (!comment) return null;
    comment.likedByMe = !comment.likedByMe;
    comment.likes = Math.max(0, (comment.likes || 0) + (comment.likedByMe ? 1 : -1));
    this.saveState();
    return { liked: comment.likedByMe, likes: comment.likes || 0, comment };
  }

  /* ==========================================================================
   * 16-A. 바깥 3탭 — 홈 = 내 모임 2열 갤러리
   * -------------------------------------------------------------------------
   * 11/15 19:05 사용자: "홈탭 첫 화면은 내가 가입한 모임들이 2열 갤러리식 카드로
   * 나열되고, 모임을 탭해서 들어가면 그 모임 전용 공간으로 전환".
   * 갤러리 카드 하나에 필요한 것만 한 번에 모아 준다(모임·표지·사진·스토리·약속).
   * ======================================================================== */
  /* ==========================================================================
   * Sprint 32.5 — 내 모임 빨간 점(새 소식) · 모임을 열어 본 시각
   * ------------------------------------------------------------------------
   *  · '내 모임' 원형 아이콘 위의 점은 **마지막으로 방문한 뒤** 새 글·스토리·
   *    일정·채팅이 생겼을 때만 붙는다(네이버 카페 '내 카페' 의 빨간 점과 같은 뜻).
   *  · 한 번도 들어가지 않은 모임은 소식이 있으면 점이 붙는다.
   * ========================================================================== */
  markGroupVisited(groupId) {
    if (!groupId) return { ok: false };
    if (!this.state.groupVisits || typeof this.state.groupVisits !== 'object') this.state.groupVisits = {};
    this.state.groupVisits[groupId] = new Date().toISOString();
    this.saveState();
    return { ok: true, at: this.state.groupVisits[groupId] };
  }

  /** 그 모임의 가장 최근 소식 시각(글·스토리·일정·단체 채팅). */
  getGroupActivityAt(groupId) {
    let latest = 0;
    const bump = (iso) => {
      const t = iso ? new Date(iso).getTime() : 0;
      if (Number.isFinite(t) && t > latest) latest = t;
    };
    (this.state.feedPosts || []).filter((p) => p.groupId === groupId).forEach((p) => bump(p.createdAt));
    (this.state.stories || []).filter((s) => s.groupId === groupId).forEach((s) => bump(s.createdAt));
    /* 일정은 '만든 시각'만 센다 — 일정 날짜(when)는 미래라 소식 시각이 아니다. */
    (this.state.groupEvents || []).filter((e) => e.groupId === groupId).forEach((e) => bump(e.createdAt));
    (this.state.groupNotices || []).filter((n) => n.groupId === groupId).forEach((n) => bump(n.at || n.createdAt));
    const chat = (this.state.groupChats || []).find((c) => c.groupId === groupId);
    if (chat) (chat.messages || []).forEach((m) => bump(m.at || m.createdAt));
    return latest ? new Date(latest).toISOString() : null;
  }

  /** 빨간 점을 붙일지 — 방문 뒤 새 소식이 있을 때(방문 전이면 소식이 있으면). */
  getGroupUpdateDot(groupId) {
    const at = this.getGroupActivityAt(groupId);
    if (!at) return false;
    const visited = (this.state.groupVisits || {})[groupId];
    if (!visited) return true;
    return new Date(at).getTime() > new Date(visited).getTime();
  }

  getGroupGallery(options = {}) {
    const sort = options.sort || this.getGallerySort();
    const items = this.getJoinedGroups().map((group) => {
      const posts = this.getGroupPhotoPosts(group.id);
      const photos = posts.filter((p) => p.photoUrl);
      const next = this.getNextGroupEvent(group.id);
      const chat = this.getGroupChatPreview(group.id);
      const stories = this.getGroupStories(group.id);
      const rings = this.getStoryRings(group.id);
      const last = posts[0] || null;
      const cover = this.getGroupCover(group.id);
      const activityAt = Math.max(
        last ? new Date(last.createdAt).getTime() : 0,
        stories.length ? new Date(stories[stories.length - 1].createdAt).getTime() : 0,
        chat && chat.lastAt ? new Date(chat.lastAt).getTime() : 0,
        next ? new Date(next.when).getTime() : 0
      );
      return {
        id: group.id,
        group,
        name: group.name,
        icon: group.icon,
        categoryName: group.categoryName,
        location: group.location,
        coverGradient: group.coverGradient,
        memberCount: group.memberCount,
        photoCount: photos.length,
        postCount: posts.length,
        storyCount: stories.length,
        storyRingCount: rings.length,
        storyAuthors: rings.slice(0, 4).map((r) => ({ name: r.authorName, avatarText: r.avatarText, gradient: r.gradient, photoUrl: r.photoUrl, count: r.count })),
        nextEvent: next,
        chat,
        lastPostAt: last ? last.createdAt : null,
        activityAt,
        coverPhotos: cover ? cover.photos : [],
        coverCustom: !!(cover && cover.custom),
        coverIconPreset: group.coverIconPreset || null,
        azit: this.getGroupAzit(group),
        updateDot: this.getGroupUpdateDot(group.id),
        isLeader: this.isGroupLeader(group.id)
      };
    });
    if (sort === 'name') {
      items.sort((a, b) => String(a.name).localeCompare(String(b.name), 'ko'));
    } else if (sort === 'leader') {
      items.sort((a, b) => (b.isLeader ? 1 : 0) - (a.isLeader ? 1 : 0)
        || b.activityAt - a.activityAt);
    } else {
      items.sort((a, b) => b.activityAt - a.activityAt);
    }
    return items;
  }

  /* ==========================================================================
   * 16-B. 인스타그램형 24시간 스토리 (모임 단위)
   * -------------------------------------------------------------------------
   * · 스토리는 올린 시각(createdAt)부터 **24시간**만 산다.
   * · 읽는 쪽(getGroupStories)에서 한 번 더 거르고, pruneExpiredStories 가 저장 상태에서 지운다.
   * ======================================================================== */
  static storyExpired(story, now) {
    if (!story || !story.createdAt) return true;
    const at = new Date(story.createdAt).getTime();
    if (Number.isNaN(at)) return true;
    return (now == null ? Date.now() : now) - at >= STORY_TTL_HOURS * HOUR;
  }

  isStoryExpired(story, now) {
    return Store.storyExpired(story, now);
  }

  /** 그 모임의 살아 있는 스토리 — 오래된 것부터(인스타처럼 좌→우). */
  getGroupStories(groupId, options = {}) {
    const now = options.now == null ? Date.now() : options.now;
    return (this.state.stories || [])
      .filter((s) => s.groupId === groupId)
      .filter((s) => (options.includeExpired ? true : !Store.storyExpired(s, now)))
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /** 스토리 바에 쓸 요약 — 내 스토리 수·다른 사람 수·만료된 수(점검용). */
  getGroupStoryStats(groupId, options = {}) {
    const live = this.getGroupStories(groupId, options);
    const me = this.currentUser.id;
    return {
      total: live.length,
      mine: live.filter((s) => s.authorId === me).length,
      others: live.filter((s) => s.authorId !== me).length,
      expired: this.getGroupStories(groupId, { ...options, includeExpired: true }).length - live.length,
      ttlHours: STORY_TTL_HOURS
    };
  }

  /** 스토리 하나 — 뷰어가 id 로 찾는다(만료된 것은 돌려주지 않는다). */
  getStory(storyId, options = {}) {
    const story = (this.state.stories || []).find((s) => s.id === storyId);
    if (!story) return null;
    if (!options.includeExpired && Store.storyExpired(story, options.now)) return null;
    return story;
  }

  /** 스토리 올리기 — 가입한 모임에만. 사진(프리셋)이나 한 줄 중 하나는 있어야 한다. */
  addGroupStory(data) {
    const d = data || {};
    const groupId = d.groupId;
    if (!this.isGroupJoined(groupId)) return { ok: false, reason: 'not_member' };
    /* 앨범·카메라로 고른 사진(Data URL)이 스토리 사진이다 — 예시 이미지는 쓰지 않는다. */
    const rawPhoto = String(d.photoUrl || '').trim();
    const photoUrl = /^data:image\//i.test(rawPhoto) || /^https?:\/\//i.test(rawPhoto) ? rawPhoto : null;
    const caption = String(d.caption || '').trim().slice(0, 60);
    if (!photoUrl && !caption) return { ok: false, reason: 'empty' };
    const user = this.state.currentUser;
    const story = {
      id: `story_${Date.now()}`,
      groupId,
      authorId: user.id,
      authorName: user.nickname,
      authorAvatarText: user.avatarText || user.nickname.charAt(0),
      authorGradient: user.avatarGradient,
      authorPhotoUrl: user.photoUrl || null,
      photoUrl,
      mediaCaption: String(d.mediaCaption || '').trim().slice(0, 24),
      caption,
      createdAt: new Date().toISOString()
    };
    if (!Array.isArray(this.state.stories)) this.state.stories = [];
    this.state.stories.push(story);
    this.saveState();
    return { ok: true, story };
  }

  /** 내가 올린 스토리 지우기 — 내 것만. */
  deleteStory(storyId) {
    const story = (this.state.stories || []).find((s) => s.id === storyId);
    if (!story) return { ok: false, reason: 'not_found' };
    if (story.authorId !== this.currentUser.id) return { ok: false, reason: 'permission' };
    this.state.stories = this.state.stories.filter((s) => s.id !== storyId);
    this.saveState();
    return { ok: true };
  }

  /** 24시간이 지난 스토리를 저장 상태에서 정리한다.
   *  Sprint 17 — **내** 스토리는 지우지 않고 storyArchive(보관함)로 옮긴다. */
  pruneExpiredStories(now) {
    const at = now == null ? Date.now() : now;
    const all = this.state.stories || [];
    const before = all.length;
    const me = this.currentUser.id;
    const expired = all.filter((s) => Store.storyExpired(s, at));
    const mine = expired.filter((s) => s.authorId === me);
    if (mine.length) {
      if (!Array.isArray(this.state.storyArchive)) this.state.storyArchive = [];
      const known = new Set(this.state.storyArchive.map((s) => s.id));
      mine.forEach((s) => {
        if (known.has(s.id)) return;
        this.state.storyArchive.unshift({ ...s, archivedAt: new Date(at).toISOString() });
        known.add(s.id);
      });
      this.state.storyArchive = this.state.storyArchive.slice(0, 60);
    }
    this.state.stories = all.filter((s) => !Store.storyExpired(s, at));
    const removed = before - this.state.stories.length;
    if (removed > 0) this.saveState();
    return removed;
  }

  /* ==========================================================================
   * 16-C. 운영진 권한 — 공지·일정은 늘, 멤버 승인·강퇴는 모임장이 켤 때만
   * -------------------------------------------------------------------------
   * 11/15 18:36 사용자 답: "공지·일정 만들기·멤버 승인/강퇴 모두 지원하되,
   * 멤버 승인·강퇴 권한은 모임장이 선택(부여/해제)할 수 있게".
   * ======================================================================== */
  getDeputyPermissions(groupId) {
    const group = this.getGroup(groupId);
    const role = this.roleOf(groupId);
    const isLeader = role === 'owner';
    const isDeputy = role === 'staff';
    const grant = !!(group && group.deputyCanModerate === true);
    return {
      groupId,
      role,
      isLeader,
      isDeputy,
      deputyCanModerate: grant,
      /* 공지·일정 작성: 운영진·모임장 */
      canManageNotices: this.can(groupId, 'write_notice'),
      canManageEvents: this.can(groupId, 'manage_events'),
      /* 멤버 관리: can() 한 곳의 답을 쓴다 */
      canModerateMembers: this.can(groupId, 'kick_member'),
      /* 이 스위치는 모임장만 바꿀 수 있다 */
      canToggleModerate: this.can(groupId, 'manage_staff')
    };
  }

  /** 운영진에게 '멤버 승인·강퇴'까지 맡길지 — 모임장만 바꿀 수 있다. */
  setDeputyModeratePermission(groupId, on) {
    const group = this.getGroup(groupId);
    if (!group) return { ok: false, reason: 'not_found' };
    if (!this.can(groupId, 'manage_staff')) return { ok: false, reason: 'permission' };
    group.deputyCanModerate = !!on;
    this.saveState();
    return { ok: true, groupId, deputyCanModerate: group.deputyCanModerate, permissions: this.getDeputyPermissions(groupId) };
  }

  /* ==========================================================================
   * 16-E. 탐색에 내 프로필 올리기 · 오픈 글
   * -------------------------------------------------------------------------
   * 11/15 19:05 사용자: "모임과 별개로 누구나 탐색에 게시글과 본인 프로필을 올릴 수 있게".
   * ======================================================================== */
  /**
   * Sprint 24 — 내 프로필을 탐색에 올린 상태(2시간 자동 종료).
   *  · 올릴 때 고른 만남 목적(meetStyleId)과 한 줄 소개(intro), 올린 시각·끝나는 시각을 함께 남긴다.
   *  · 2시간이 지나면 **처음 읽는 순간** 스스로 내려가고(exploreProfileVisible=false) 저장한다.
   *    그래서 앱을 닫아 두었다 열어도 이미 끝난 프로필이 남아 있지 않다.
   * @returns {{active:boolean, startedAt:string|null, expiresAt:string|null, msLeft:number,
   *            remainingLabel:string, meetStyleId:string|null, meetStyleLabel:string|null, intro:string}}
   */
  getMyExplorePublishState() {
    const u = this.state.currentUser;
    const p = u.explorePublish;
    const empty = {
      active: false, startedAt: null, expiresAt: null, msLeft: 0, remainingLabel: '',
      meetStyleId: null, meetStyleLabel: null, intro: '', hours: EXPLORE_PUBLISH_HOURS
    };
    if (!p || typeof p !== 'object') return empty;
    const expires = new Date(p.expiresAt || 0).getTime();
    const left = Number.isFinite(expires) ? expires - Date.now() : 0;
    if (!Number.isFinite(expires) || left <= 0) {
      /* 시간이 다 됐다 — 조용히 내린다(알림 없음). */
      u.explorePublish = null;
      if (u.exploreProfileVisible) { u.exploreProfileVisible = false; this.saveState(); }
      return empty;
    }
    return {
      active: u.exploreProfileVisible === true,
      startedAt: p.startedAt || null,
      expiresAt: p.expiresAt || null,
      msLeft: left,
      remainingLabel: this.formatExplorePublishLeft(left),
      meetStyleId: p.meetStyleId || null,
      meetStyleLabel: p.meetStyleLabel || (meetStyleDef(p.meetStyleId) || {}).name || null,
      intro: p.intro || '',
      hours: EXPLORE_PUBLISH_HOURS
    };
  }

  /** 남은 시간 표기 — '1시간 59분 남음' / '58분 남음' / '곧 종료'. */
  formatExplorePublishLeft(msLeft) {
    const totalMin = Math.max(0, Math.floor((Number(msLeft) || 0) / 60000));
    if (totalMin <= 0) return '곧 종료';
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h}시간 ${m}분 남음`;
    return `${m}분 남음`;
  }

  isMyProfileExploreVisible() {
    return this.getMyExplorePublishState().active;
  }

  /**
   * Sprint 24 — 내 프로필을 탐색에 올린다(만남 목적 + 한 줄 소개 → 2시간 뒤 자동 종료).
   * @param {{meetStyleId?:string, intro?:string}} detail
   */
  publishMyExploreProfile(detail = {}) {
    const style = meetStyleDef(detail.meetStyleId) || meetStyleDef('now');
    const u = this.state.currentUser;
    if (!u.registered) return { ok: false, reason: 'not_signed_in' };
    const intro = String(detail.intro == null ? '' : detail.intro).trim().slice(0, 40);
    const now = Date.now();
    u.explorePublish = {
      meetStyleId: style.id,
      meetStyleLabel: style.name,
      intro,
      startedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + EXPLORE_PUBLISH_HOURS * HOUR).toISOString()
    };
    u.exploreProfileVisible = true;
    this.saveState();
    return { ok: true, publish: this.getMyExplorePublishState() };
  }

  /** 올린 프로필을 내린다. */
  unpublishMyExploreProfile() {
    const u = this.state.currentUser;
    u.explorePublish = null;
    u.exploreProfileVisible = false;
    this.saveState();
    return { ok: true, exploreProfileVisible: false };
  }

  /** 내가 탐색 '사람' 카드로 올렸을 때 보이는 내 카드 (안 올렸으면 null). */
  getMyExploreProfile() {
    const publish = this.getMyExplorePublishState();
    if (!publish.active) return null;
    const u = this.state.currentUser;
    return {
      id: u.id,
      nickname: u.nickname,
      handle: u.handle,
      avatarText: u.avatarText || u.nickname.charAt(0),
      avatarGradient: u.avatarGradient,
      age: Number(u.age) || null,
      location: u.location,
      regionId: u.regionId || null,
      hobbyLabel: (u.hobbies || [])[0] || '',
      hobbies: u.hobbies || [],
      hobbyIds: u.hobbyIds || [],
      hobbyStyle: u.workoutSpec || '',
      bio: u.bio || '',
      /* Sprint 24 — 올릴 때 고른 만남 목적 + 한 줄 소개 */
      intro: publish.intro || this.getMyExploreCard().intro,
      meetStyleId: publish.meetStyleId,
      meetStyleLabel: publish.meetStyleLabel,
      publishLeft: publish.remainingLabel,
      expiresAt: publish.expiresAt,
      photoUrl: (this.getMyAlbum('public')[0] || {}).url || u.photoUrl || null,
      badge: '내 프로필',
      ratio: 'mid',
      isMe: true
    };
  }

  /** 내 프로필을 탐색에 올릴지(켜고 끄기) — 켤 때는 마지막으로 고른 조건(없으면 '지금 번개')으로 올린다. */
  setMyProfileExploreVisible(on) {
    if (!on) return this.unpublishMyExploreProfile();
    const last = this.state.currentUser.explorePublish;
    return this.publishMyExploreProfile({
      meetStyleId: (last && last.meetStyleId) || 'now',
      intro: (last && last.intro) || ''
    });
  }

  /* ==========================================================================
   * 16-E-3. Sprint 27 — 예시 데이터 · 앨범 순서/대표 사진 · 설정 묶음 기억
   * -------------------------------------------------------------------------
   *  · 예시 데이터: 가이드·실사용 초기에 기능을 바로 눌러 볼 수 있는 최소 샘플.
   *    모두 sample:true 라 '예시 데이터 비우기' 한 번으로 걷어낼 수 있고,
   *    같은 버튼으로 다시 넣을 수도 있다(사용자가 만든 모임·글은 건드리지 않는다).
   *  · 앨범 순서: 공개 앨범 첫 장이 **대표 사진**(내 프로필·탐색 카드).
   *    길게 누르기 메뉴에서 '대표 사진으로' / '앞으로' / '뒤로' 로 옮긴다.
   * ======================================================================== */
  getSampleSummary() {
    return sampleSummaryOf(this.state);
  }

  /** 예시 데이터를 다시 넣는다(내 콘텐츠는 그대로). */
  seedSampleData() {
    applySampleData(this.state, {
      regionId: (this.state.currentUser && this.state.currentUser.regionId) || this.state.sampleData && this.state.sampleData.regionId
    });
    this.eventChatSync = this.syncEventChats();
    this.saveState();
    return { ok: true, sample: this.getSampleSummary() };
  }

  /** 예시 데이터만 비운다 — 내가 만든 내용은 남는다. */
  clearSampleData() {
    const before = this.getSampleSummary();
    const res = stripSampleData(this.state);
    this.state.sampleData = {
      seeded: false,
      version: SAMPLE_DATA_VERSION,
      regionId: (this.state.sampleData && this.state.sampleData.regionId) || null,
      seededAt: (this.state.sampleData && this.state.sampleData.seededAt) || null,
      clearedAt: new Date().toISOString()
    };
    this.eventChatSync = this.syncEventChats();
    this.saveState();
    return { ok: true, removed: res.removed, before, sample: this.getSampleSummary() };
  }

  /** 공개 앨범의 첫 장 = 대표 사진. 지금 대표가 무엇인지. */
  getAlbumCover(kind = 'public') {
    return this.getMyAlbum(kind)[0] || null;
  }

  /**
   * 사진을 앨범의 맨 앞(대표)으로 옮긴다. 이미 맨 앞이면 no-op.
   * 비밀앨범에도 쓸 수 있지만 '대표'라는 말은 공개 앨범에만 붙인다.
   */
  setMyAlbumCover(kind, photoId) {
    return this.moveMyAlbumPhoto(kind, photoId, -999);
  }

  /**
   * 앨범 한 칸을 앞/뒤로 옮긴다(delta 음수=앞, 양수=뒤).
   *  · 순서만 바뀌고 사진 id·내용은 그대로다(지우고 다시 넣지 않는다).
   *  · 끝에 있는 사진을 더 밀면 그대로 둔다(reason:'edge').
   */
  moveMyAlbumPhoto(kind, photoId, delta) {
    const key = kind === 'secret' ? 'secret' : 'public';
    const u = this.state.currentUser;
    const list = (u.album && Array.isArray(u.album[key])) ? u.album[key] : [];
    const from = list.findIndex((p) => p.id === photoId);
    if (from < 0) return { ok: false, reason: 'not_found' };
    const step = Number(delta) || 0;
    const to = Math.max(0, Math.min(list.length - 1, from + step));
    if (to === from) return { ok: false, reason: 'edge', photos: list, index: from };
    const next = list.slice();
    const [photo] = next.splice(from, 1);
    next.splice(to, 0, photo);
    u.album[key] = next;
    this.saveState();
    return { ok: true, photos: next, index: to, cover: key === 'public' ? next[0] : null };
  }

  /* ==========================================================================
   * 16-E-2. Sprint 24 — 내 프로필 앨범(공개 4장 · 비밀 4장) · 비밀앨범 공개
   * -------------------------------------------------------------------------
   * 11/17 00:30 루키 님: "내 프로필 탭 … 공개 이미지(최대 4장)와 비밀앨범(최대 4장)을
   * 앨범 선택/카메라 촬영으로 각각 등록·삭제·관리", "1:1 대화방 안에서 상대방에게
   * 내 비밀앨범을 공개(열람 허용/해제)".
   *  · 사진은 Data URL 로 저장한다(서버 업로드 전까지). 한 칸에 한 장, 최대 4칸.
   *  · 비밀앨범은 기본 잠김. 공개한 상대(대화방)에서만 열린다.
   * ======================================================================== */
  getMyAlbum(kind = 'public') {
    const key = kind === 'secret' ? 'secret' : 'public';
    const album = this.state.currentUser.album || {};
    return Array.isArray(album[key]) ? album[key] : [];
  }

  /** 앨범 한 칸 채우기 — 최대 4장. 넘치면 reason:'full'. */
  addMyAlbumPhoto(kind, dataUrl, options = {}) {
    const key = kind === 'secret' ? 'secret' : 'public';
    const url = String(dataUrl || '');
    if (!/^data:image\//.test(url)) return { ok: false, reason: 'invalid' };
    const u = this.state.currentUser;
    if (!u.album || typeof u.album !== 'object') u.album = { public: [], secret: [] };
    if (!Array.isArray(u.album[key])) u.album[key] = [];
    if (u.album[key].length >= ALBUM_MAX) return { ok: false, reason: 'full', max: ALBUM_MAX };
    const photo = {
      id: `ph_${key}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      url,
      caption: String((options && options.caption) || '').slice(0, 30),
      at: new Date().toISOString()
    };
    u.album[key].push(photo);
    this.saveState();
    return { ok: true, photo, photos: u.album[key] };
  }

  removeMyAlbumPhoto(kind, photoId) {
    const key = kind === 'secret' ? 'secret' : 'public';
    const u = this.state.currentUser;
    const list = (u.album && Array.isArray(u.album[key])) ? u.album[key] : [];
    const next = list.filter((p) => p.id !== photoId);
    if (next.length === list.length) return { ok: false, reason: 'not_found' };
    u.album[key] = next;
    this.saveState();
    return { ok: true, photos: next };
  }

  /**
   * Sprint 25 — 같은 칸의 사진을 다른 사진으로 바꾼다(자리 유지).
   * 확대 보기에서 '사진 바꾸기'를 눌렀을 때 쓴다. 새 사진을 넣고 지우는 두 번의
   * 변경 대신 한 번에 바꿔, 칸 순서가 흔들리지 않고 되돌릴 여지도 남기지 않는다.
   */
  replaceMyAlbumPhoto(kind, photoId, dataUrl) {
    const key = kind === 'secret' ? 'secret' : 'public';
    const url = String(dataUrl || '');
    if (!/^data:image\//.test(url)) return { ok: false, reason: 'invalid' };
    const u = this.state.currentUser;
    const list = (u.album && Array.isArray(u.album[key])) ? u.album[key] : [];
    const index = list.findIndex((p) => p.id === photoId);
    if (index < 0) return { ok: false, reason: 'not_found' };
    const previous = list[index].url;
    list[index] = { ...list[index], url, at: new Date().toISOString() };
    this.saveState();
    return { ok: true, photo: list[index], index, previous, photos: list };
  }

  /** 이 1:1 상대에게 내 비밀앨범을 공개했는가. */
  isSecretAlbumSharedWith(partnerId) {
    const shares = this.state.currentUser.secretShares || {};
    return shares[partnerId] === true;
  }

  /** 대화방에서 비밀앨범 공개/해제. */
  setSecretAlbumShared(partnerId, on) {
    if (!partnerId) return { ok: false, reason: 'invalid' };
    const u = this.state.currentUser;
    if (!u.secretShares || typeof u.secretShares !== 'object') u.secretShares = {};
    if (on) u.secretShares[partnerId] = true;
    else delete u.secretShares[partnerId];
    this.saveState();
    return { ok: true, partnerId, shared: !!on };
  }

  /**
   * 대화방의 비밀앨범 상태 — 내 앨범(공개 여부)과 상대 앨범(잠김/열림).
   * 상대 앨범은 상대가 나에게 공개했을 때만 열린다(데모에서는 상대 쪽 공개 상태를 저장하지 않는다).
   */
  getSecretAlbumState(partnerId) {
    const mine = this.getMyAlbum('secret');
    const shared = this.isSecretAlbumSharedWith(partnerId);
    return {
      partnerId,
      mine: { photos: mine, shared, locked: !shared },
      theirs: { photos: [], shared: false, locked: true }
    };
  }

  /** 내 공개 앨범·비밀앨범 장수 요약(내 프로필 탭). */
  getAlbumSummary() {
    const pub = this.getMyAlbum('public');
    const secret = this.getMyAlbum('secret');
    return {
      public: { photos: pub, count: pub.length, max: ALBUM_MAX },
      secret: { photos: secret, count: secret.length, max: ALBUM_MAX },
      sharedWith: Object.keys(this.state.currentUser.secretShares || {})
    };
  }

  /* ==========================================================================
   * 16-Z. Sprint 24 — 화면 설정(다크모드)
   * -------------------------------------------------------------------------
   * 설정 값은 저장 상태에 두어 앱을 다시 열어도 그대로다.
   * 화면(app.js)이 부팅 때 이 값을 읽어 <html data-theme="dark"> 를 붙인다.
   * ======================================================================== */
  /** 저장된 선택(true/false)이 없으면 기기의 밝기 설정을 따른다. */
  isDarkMode() {
    const choice = this.state.settings ? this.state.settings.darkMode : null;
    if (typeof choice === 'boolean') return choice;
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) { return false; }
  }

  /** 사용자가 직접 고른 값인지(null 이면 기기 설정을 따르는 중). */
  hasDarkModeChoice() {
    return !!(this.state.settings && typeof this.state.settings.darkMode === 'boolean');
  }

  /* null 을 넣으면 '기기 설정 따르기'(settings.darkMode = null) — 화면 모드 3중 1의 기본값이다. */
  setDarkMode(on) {
    if (!this.state.settings) this.state.settings = { darkMode: null };
    this.state.settings.darkMode = typeof on === 'boolean' ? on : null;
    this.saveState();
    return { ok: true, darkMode: this.state.settings.darkMode };
  }

  toggleDarkMode() {
    return this.setDarkMode(!this.isDarkMode());
  }

  /** 모임과 무관한 오픈 글만(내가 올린 것부터). */
  getOpenExplorePosts() {
    return (this.state.explorePosts || [])
      .filter((p) => !p.hobbyId || p.scope === 'open')
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /* ==========================================================================
   * 16-F. 매칭 없이 바로 쪽지(디엠) — 전체 디엠함
   * -------------------------------------------------------------------------
   * 11/15 19:05 사용자: "사람 카드에서 상호 매칭을 기다리지 않고 바로 쪽지(디엠) 보내기,
   * 보낸 대화는 바깥 3번째 탭 '전체 디엠함'에 즉시 노출".
   * ======================================================================== */
  startDirectMessage(profileId, text) {
    /* v33.4 — 피드·댓글에서 연 프로필(모임 사람·이름만 아는 사람)과도 대화를 시작한다.
       이런 사람은 state.personas 에 한 번 등록되어 getPersonProfile 로 풀린다. */
    const profile = this.getMatchProfile(profileId) || this.getPersonProfile(profileId);
    if (!profile) return { ok: false, reason: 'not_found' };
    const body = String(text || '').trim();
    const opened = this.openChatRoom(profileId);
    const room = opened.room;
    /* 매칭 대기 없이 보낸 쪽지 — '새 매칭' 배지 대신 바로 대화가 시작된다. */
    room.isNewMatch = false;
    room.startedByMe = true;
    let message = null;
    if (body) {
      message = this.sendChatMessage(room.id, body);
    } else {
      this.saveState();
    }
    return { ok: true, room, created: opened.created, message };
  }

  /** 전체 디엠함 — 모든 모임 단체방 + 모든 1:1 방을 한 번에(바깥 3번째 탭).
   *  Sprint 17 — sort:'recent'|'group' · unreadOnly 로 모임별/읽지 않은 대화 보기. */
  /* ------------------------------------------------------------------------
   * Sprint 28.5 — 모르는 사람의 첫 메시지 = '요청'함
   *  · 받은 편지함에는 올리지 않고, 수락해야 대화방이 열린다(거절하면 목록에서 사라진다).
   *  · 예시 데이터(가명 사람)로만 채운다 — 실제 사람 사진은 쓰지 않는다.
   * ---------------------------------------------------------------------- */
  getDmRequests() {
    if (!Array.isArray(this.state.dmRequests)) this.state.dmRequests = [];
    return this.state.dmRequests.filter((r) => r && r.status === 'pending');
  }

  seedDmRequests() {
    if (Array.isArray(this.state.dmRequests) && this.state.dmRequests.length) return this.state.dmRequests;
    /* 지금 탐색에 보이는 사람(가명) 상위 2명으로 요청을 만든다 — 사진은 쓰지 않는다. */
    let profiles = [];
    try {
      profiles = (this.getExploreFeed('people', '', null) || [])
        .map((it) => (it.profile || it.person || null))
        .filter(Boolean)
        .slice(0, 2);
    } catch (e) { profiles = []; }
    if (!profiles.length) {
      profiles = ['sample_p_mora', 'sample_p_danchu'].map((id) => this.getPersonProfile(id)).filter(Boolean);
    }
    const requests = profiles
      .map((p, i) => ({
        id: `dmreq_${p.id}`,
        profileId: p.id,
        name: p.nickname,
        gradient: p.avatarGradient,
        photoUrl: p.photoUrl || null,
        text: i === 0
          ? '안녕하세요! 이번 주 러닝 같이 하실래요?'
          : '동네 보드게임 모임에서 봤어요. 한 판 하실래요?',
        at: new Date(Date.now() - (i + 1) * 26 * 60 * 1000).toISOString(),
        status: 'pending'
      }));
    this.state.dmRequests = requests;
    if (requests.length) this.saveState();
    return requests;
  }

  acceptDmRequest(requestId) {
    const list = Array.isArray(this.state.dmRequests) ? this.state.dmRequests : [];
    const req = list.find((r) => r.id === requestId && r.status === 'pending');
    if (!req) return { ok: false, reason: 'not_found' };
    req.status = 'accepted';
    const res = this.startDirectMessage(req.profileId, '');
    this.saveState();
    return { ok: true, request: req, room: res && res.room ? res.room : null };
  }

  rejectDmRequest(requestId) {
    const list = Array.isArray(this.state.dmRequests) ? this.state.dmRequests : [];
    const req = list.find((r) => r.id === requestId && r.status === 'pending');
    if (!req) return { ok: false, reason: 'not_found' };
    req.status = 'rejected';
    this.saveState();
    return { ok: true, request: req };
  }

  getDmInbox(options = {}) {
    const groupRooms = this.getJoinedGroups().map((group) => {
      const chat = this.getGroupChatPreview(group.id);
      return { kind: 'group', groupId: group.id, group, chat };
    });
    const directRooms = (this.state.chatRooms || []).map((room) => {
      const msgs = room.messages || [];
      const lastAt = msgs.reduce((max, m) => {
        const t = new Date(m.at).getTime();
        return Number.isFinite(t) && t > max ? t : max;
      }, 0);
      const groupId = this.getChatRoomGroupId(room.id);
      return {
        kind: 'direct',
        room,
        group: groupId ? this.getGroup(groupId) : null,
        lastAt,
        unread: room.unreadCount || 0
      };
    });
    const groupUnread = groupRooms.reduce((sum, r) => sum + (r.chat.unread || 0), 0);
    let directs = directRooms.sort((a, b) => b.lastAt - a.lastAt);
    if (options.sort === 'group') {
      directs = directs.slice().sort((a, b) => {
        const an = a.group ? a.group.name : '\uffff';
        const bn = b.group ? b.group.name : '\uffff';
        return String(an).localeCompare(String(bn), 'ko') || b.lastAt - a.lastAt;
      });
    }
    const total = groupRooms.length + directs.length;
    return {
      groupRooms,
      directRooms: directs,
      total,
      unread: groupUnread + directs.reduce((sum, r) => sum + r.unread, 0),
      sort: options.sort === 'group' ? 'group' : 'recent'
    };
  }

  getUnreadDmCount() {
    return this.getDmInbox().unread;
  }

  /* ==========================================================================
   * 17-A. Sprint 17 — 회원가입(온보딩) · 로그인 · 데이터 초기화
   * -------------------------------------------------------------------------
   * 11/15 21:32 사용자: "회원가입 기능도 넣어주소 프로필 사진 등록하는거 닉넴까지 다 해주고
   * 이제 데이터는 초기화해줘 실사용해보게".
   *  · 가입 전: onboarding.completed=false → 화면은 회원가입만 보여준다.
   *  · 가입 후: 정한 닉네임·사진이 앱 전체(피드·스토리·게시판·디엠·내정보·탐색)에 그대로 쓰인다.
   *  · 로컬 데모 인증이다 — 서버로 옮길 때 signUp/signIn 자리가 서버 인증이 된다(STORE_API.md).
   * ========================================================================== */
  isSignedIn() {
    const ob = this.state.onboarding || {};
    return ob.completed === true && this.state.sessionActive !== false
      && this.state.currentUser && this.state.currentUser.registered !== false;
  }

  getOnboardingState() {
    const ob = this.state.onboarding || {};
    const acc = this.state.account || null;
    return {
      completed: ob.completed === true,
      signedIn: this.isSignedIn(),
      hasAccount: !!acc,
      loginId: acc ? acc.loginId : '',
      /* Sprint 22 — 이메일 계정. 옛 계정(v16)은 email 이 없을 수 있다(아이디 로그인 유지). */
      email: acc ? (acc.email || '') : '',
      emailVerified: !!(acc && acc.emailVerified),
      hasEmail: !!(acc && acc.email),
      quickStart: !!(acc && acc.quickStart),
      step: ob.step || 0,
      nickname: this.state.currentUser ? this.state.currentUser.nickname : '',
      avatarGradients: SIGNUP_AVATAR_GRADIENTS.slice(),
      limits: { ...SIGNUP_LIMITS }
    };
  }

  /**
   * Sprint 22 — 인증 상태 한눈에(가입 완료 · 이메일 · 비밀번호 유무).
   *  화면의 로그인/비밀번호 찾기 분기가 이 값을 보고 갈라진다.
   */
  getAuthState() {
    const acc = this.state.account || null;
    if (!acc) return { hasAccount: false, email: '', emailVerified: false, hasPassword: false, quickStart: false };
    return {
      hasAccount: true,
      email: acc.email || '',
      emailVerified: acc.emailVerified === true,
      hasPassword: !!acc.passwordHash,
      quickStart: acc.quickStart === true,
      createdAt: acc.createdAt || null
    };
  }

  /**
   * 인증번호를 만든다 — 이메일을 확인하는 첫 단계(가입·비밀번호 재설정 공용).
   * @param {{email:string, purpose?:'signup'|'reset'}} data
   * @returns {{ok:boolean, reason?:string, code?:string, mock?:boolean, delivery?:string, expiresAt?:string}}
   */
  requestEmailCode(data) {
    const d = data || {};
    const email = String(d.email || '').trim().toLowerCase();
    const purpose = d.purpose === 'reset' ? 'reset' : 'signup';
    if (!oogIsEmail(email)) return { ok: false, reason: 'email_invalid' };
    if (purpose === 'reset') {
      const acc = this.state.account;
      if (!acc || !acc.email) return { ok: false, reason: 'no_email_account' };
      if (acc.email.toLowerCase() !== email) return { ok: false, reason: 'email_mismatch' };
    }
    const code = oogMakeEmailCode();
    const sentAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString();
    this.state.emailVerification = {
      email, purpose, code, sentAt, expiresAt,
      tries: 0, verified: false, verifiedAt: null
    };
    this.saveState();
    return {
      ok: true, email, purpose, code, expiresAt, sentAt,
      /* 실제 SMTP 발송이 아니다 — 화면은 이 사실을 숨기지 않고 '모의 메일함'으로 보여준다. */
      mock: true, delivery: 'inapp'
    };
  }

  /** 방금 만든 인증번호(화면의 모의 메일함이 보여줄 값) — 확인 전까지만 돌려준다. */
  getPendingEmailCode() {
    const ev = this.state.emailVerification || null;
    if (!ev || !ev.code) return null;
    return {
      email: ev.email, purpose: ev.purpose, code: ev.code,
      sentAt: ev.sentAt, expiresAt: ev.expiresAt,
      verified: ev.verified === true, expired: new Date(ev.expiresAt).getTime() < Date.now()
    };
  }

  /**
   * 인증번호 확인 — 맞으면 verified 로 표시해 다음 단계(가입·비밀번호 변경)를 허용한다.
   * @returns {{ok:boolean, reason?:string}}
   */
  verifyEmailCode(data) {
    const d = data || {};
    const ev = this.state.emailVerification;
    const email = String(d.email || '').trim().toLowerCase();
    const code = String(d.code || '').replace(/\s/g, '');
    const purpose = d.purpose === 'reset' ? 'reset' : 'signup';
    if (!ev || !ev.code) return { ok: false, reason: 'no_code' };
    if (ev.email !== email || ev.purpose !== purpose) return { ok: false, reason: 'email_mismatch' };
    if (new Date(ev.expiresAt).getTime() < Date.now()) return { ok: false, reason: 'code_expired' };
    if ((ev.tries || 0) >= EMAIL_CODE_MAX_TRIES) return { ok: false, reason: 'too_many_tries' };
    if (code !== ev.code) {
      ev.tries = (ev.tries || 0) + 1;
      this.saveState();
      return { ok: false, reason: 'code_mismatch', triesLeft: Math.max(0, EMAIL_CODE_MAX_TRIES - ev.tries) };
    }
    ev.verified = true;
    ev.verifiedAt = new Date().toISOString();
    this.saveState();
    return { ok: true, email, purpose, verifiedAt: ev.verifiedAt };
  }

  /** 가입 화면을 벗어날 때 인증 대기 상태를 지운다(다른 이메일로 다시 시작). */
  clearEmailVerification() {
    this.state.emailVerification = null;
    this.saveState();
    return { ok: true };
  }

  /**
   * 비밀번호 찾기 1단계 — 가입한 이메일로 재설정 코드를 보낸다(같은 모의 발송).
   */
  requestPasswordReset(data) {
    return this.requestEmailCode({ email: (data || {}).email, purpose: 'reset' });
  }

  /**
   * 비밀번호 찾기 2단계 — 인증번호 확인 + 새 비밀번호 저장. 끝나면 바로 로그인할 수 있다.
   */
  resetPassword(data) {
    const d = data || {};
    const acc = this.state.account;
    if (!acc || !acc.email) return { ok: false, reason: 'no_email_account' };
    const email = String(d.email || '').trim().toLowerCase();
    const check = this.verifyEmailCode({ email, code: d.code, purpose: 'reset' });
    if (!check.ok) return check;
    const password = String(d.password || '');
    if (password.length < SIGNUP_LIMITS.passwordMin) return { ok: false, reason: 'password_short' };
    if (password.length > SIGNUP_LIMITS.passwordMax) return { ok: false, reason: 'password_long' };
    if (String(d.passwordConfirm == null ? password : d.passwordConfirm) !== password) {
      return { ok: false, reason: 'password_mismatch' };
    }
    acc.passwordHash = oogHashPassword(password);
    acc.passwordUpdatedAt = new Date().toISOString();
    this.state.emailVerification = null;
    this.saveState();
    return { ok: true, email };
  }

  /**
   * 회원가입 — 닉네임(필수)·프로필 사진/기본 아바타·나이·지역·대표 취미를 받아 계정을 만든다.
   * 이메일/아이디 없이 '간편 시작'도 허용한다(quickStart).
   * @returns {{ok:boolean, reason?:string, user?:object}}
   */
  signUp(data) {
    const d = data || {};
    const nickname = String(d.nickname || '').trim();
    if (nickname.length < SIGNUP_LIMITS.nicknameMin) return { ok: false, reason: 'nickname_short' };
    if (nickname.length > SIGNUP_LIMITS.nicknameMax) return { ok: false, reason: 'nickname_long' };

    const quick = d.quickStart === true;
    /* Sprint 22 — 이메일 가입: 이 기기에서 인증을 마친 이메일만 계정이 된다.
       옛 아이디 가입(loginId)은 그대로 남겨 둔다(이미 저장된 계정·테스트 호환). */
    const email = String(d.email || '').trim().toLowerCase();
    let emailVerified = false;
    if (email) {
      if (!oogIsEmail(email)) return { ok: false, reason: 'email_invalid' };
      const ev = this.state.emailVerification || {};
      if (!(ev.verified === true && ev.email === email && ev.purpose === 'signup')) {
        return { ok: false, reason: 'email_unverified' };
      }
      emailVerified = true;
    }
    const loginId = email || String(d.loginId || '').trim().toLowerCase();
    let passwordHash = null;
    if (!quick) {
      if (loginId.length < 3) return { ok: false, reason: 'login_id_short' };
      const password = String(d.password || '');
      if (password.length < SIGNUP_LIMITS.passwordMin) return { ok: false, reason: 'password_short' };
      if (password.length > SIGNUP_LIMITS.passwordMax) return { ok: false, reason: 'password_long' };
      if (String(d.passwordConfirm == null ? password : d.passwordConfirm) !== password) {
        return { ok: false, reason: 'password_mismatch' };
      }
      passwordHash = oogHashPassword(password);
    }

    const age = d.age == null || d.age === '' ? null : Number(d.age);
    if (age != null && (!Number.isFinite(age) || age < SIGNUP_LIMITS.ageMin || age > SIGNUP_LIMITS.ageMax)) {
      return { ok: false, reason: 'age_range' };
    }
    const hobbies = (Array.isArray(d.hobbies) ? d.hobbies : [])
      .filter((h) => !!this.getHobbyChip(h))
      .filter((h, i, arr) => arr.indexOf(h) === i)
      .slice(0, 3);
    const location = (() => {
      /* v34.5 (#22899) — 회원가입에서 고른 **아지트**가 있으면 그것을 활동 기준으로 삼는다.
         (주소는 받지 않고, 시·군·구 + 아지트 이름만 남긴다.) */
      const azit = d.azitId ? this.findAzit(d.azitId) : null;
      const given = String(d.location || '').trim();
      if (given) return given.slice(0, 30);
      return azit ? [azit.sigunguName, azit.name].filter(Boolean).join(' ').slice(0, 30) : '';
    })();
    const signupAzit = d.azitId ? this.findAzit(d.azitId) : null;
    const photoUrl = typeof d.photoUrl === 'string' && d.photoUrl.startsWith('data:image/') ? d.photoUrl : null;
    const gradient = SIGNUP_AVATAR_GRADIENTS.includes(d.avatarGradient)
      ? d.avatarGradient : SIGNUP_AVATAR_GRADIENTS[0];

    const user = blankCurrentUser();
    user.nickname = nickname;
    /* v34.4 (#22772) — 가입할 때 직접 쓴 아이디를 그대로 프로필 아이디로 쓴다.
       형식(소문자·숫자·._ 3~20자)과 중복을 한 번 더 검사하고,
       아이디를 안 넘긴 옛 경로(간편 시작·자동 테스트)는 oog##### 로 만든다. */
    const askedHandle = this.cleanHandle(d.handle).replace(/[^a-z0-9._]/g, '');
    if (askedHandle) {
      if (!/^[a-z0-9._]{3,20}$/.test(askedHandle)) return { ok: false, reason: 'handle' };
      if (!this.isHandleAvailable(askedHandle, '')) return { ok: false, reason: 'handle_taken' };
      user.handle = `@${askedHandle}`;
    } else {
      let auto = `oog${String(Math.floor(Math.random() * 90000) + 10000)}`;
      let tries = 0;
      while (!this.isHandleAvailable(auto, '') && tries < 30) {
        tries += 1;
        auto = `oog${String(Math.floor(Math.random() * 90000) + 10000)}`;
      }
      user.handle = `@${auto}`;
    }
    user.avatarText = nickname.charAt(0);
    user.avatarGradient = gradient;
    user.photoUrl = photoUrl;
    user.registered = true;
    user.age = age;
    user.location = location;
    user.regionId = user.regionId || (location ? (deriveRegionId(location) || null) : null);
    user.hobbies = hobbies.map((id) => this.getHobbyChip(id).name);
    user.hobbyIds = hobbies.slice();
    /* v34.5 (#22862) — 가입 때 고른 **대표 사진**은 공개 앨범 1번으로 그대로 저장한다.
       (내 프로필의 큰 1번 사진 · 공개 사진 1/4 가 바로 그 사진이 된다.) */
    if (photoUrl) {
      user.album = {
        public: [{ id: `ph_public_${Date.now().toString(36)}_signup`, url: photoUrl, caption: '', at: new Date().toISOString() }],
        secret: []
      };
    }
    /* v34.5 (#22899) — 고른 아지트를 지역 기준으로 남긴다(프로필·탐색·모임 찾기가 같은 값으로 이어진다). */
    if (signupAzit) {
      user.azitId = signupAzit.id;
      user.areaId = signupAzit.sigunguId || null;
      user.regionId = signupAzit.regionId || null;
    }
    user.bio = String(d.bio || '').trim().slice(0, 120);
    user.exploreProfileVisible = d.exploreProfileVisible === true;
    user.exploreCard = {
      photoUrl: photoUrl || null,
      intro: String(d.cardIntro || '').trim().slice(0, 40)
    };
    if (location) user.coords = null;

    /* Sprint 27 — 가입 계정도 예시 모임 2개에 들어가 있다(빈 화면 대신 바로 눌러 보게). */
    const sampleJoined = SAMPLE_JOINED_GROUP_IDS.slice();
    user.joinedGroupIds = sampleJoined;
    this.state.currentUser = user;
    this.state.account = {
      loginId: quick ? `guest_${Date.now().toString(36)}` : loginId,
      email: email || null,
      emailVerified,
      emailVerifiedAt: emailVerified ? new Date().toISOString() : null,
      passwordHash,
      quickStart: quick,
      createdAt: new Date().toISOString()
    };
    /* 가입에 쓴 인증번호는 한 번 쓰고 지운다(재사용 금지). */
    this.state.emailVerification = null;
    this.state.onboarding = { completed: true, completedAt: new Date().toISOString(), step: 3 };
    this.state.sessionActive = true;
    this.state.homePrefs = { groupId: null };
    /* Sprint 27 — 예시 사람·글이 가입에서 고른 동네에 보이도록 맞춘다. */
    if (user.regionId) retargetSampleRegion(this.state, user.regionId);
    if (!this.state.homePrefs.groupId) {
      const firstSample = (this.state.groups || []).find((g) => g.sample && this.state.currentUser.joinedGroupIds.includes(g.id));
      this.state.homePrefs.groupId = firstSample ? firstSample.id : ((this.state.currentUser.joinedGroupIds || [])[0] || null);
    }
    this.saveState();
    return { ok: true, user, onboarding: this.getOnboardingState() };
  }

  /** 로그인 — 저장된 로컬 계정과 비교한다(간편 시작 계정은 비밀번호가 없다). */
  signIn(data) {
    const d = data || {};
    const account = this.state.account;
    if (!account) return { ok: false, reason: 'no_account' };
    /* 이메일 계정은 이메일로, 옛 계정은 아이디로 로그인한다. */
    const identifier = String(d.email || d.loginId || '').trim().toLowerCase();
    const owner = String(account.email || account.loginId || '').toLowerCase();
    if (identifier !== owner) return { ok: false, reason: 'login_mismatch' };
    if (account.passwordHash) {
      if (oogHashPassword(String(d.password || '')) !== account.passwordHash) {
        return { ok: false, reason: 'password_mismatch' };
      }
    }
    this.state.onboarding = { ...(this.state.onboarding || {}), completed: true, completedAt: new Date().toISOString() };
    this.state.sessionActive = true;
    this.state.currentUser.registered = true;
    this.saveState();
    return { ok: true, user: this.state.currentUser };
  }

  /** 로그아웃 — 계정·프로필은 남기고 회원가입(로그인) 화면으로 돌아간다. */
  signOut() {
    this.state.sessionActive = false;
    this.state.onboarding = { ...(this.state.onboarding || {}), completed: false };
    this.saveState();
    return { ok: true, onboarding: this.getOnboardingState() };
  }

  /** 데이터 초기화 — 내 계정·활동을 모두 지우고 회원가입부터 다시 시작한다. */
  resetAllData() {
    this.state = buildCleanState();
    /* v36.1 — 새 상태의 일정에도 단톡방을 갖춘다. */
    this.eventChatSync = this.syncEventChats();
    try {
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch (e) { /* 저장소가 막혔어도 새 상태로는 진행한다 */ }
    this.saveState();
    return { ok: true, onboarding: this.getOnboardingState() };
  }

  /** 프로필 사진 바꾸기(Data URL) — 내 글·스토리·디엠 표시에도 함께 반영된다. */
  updateProfilePhoto(photoUrl) {
    const url = typeof photoUrl === 'string' && photoUrl.startsWith('data:image/') ? photoUrl : null;
    const user = this.state.currentUser;
    user.photoUrl = url;
    (this.state.feedPosts || []).forEach((p) => { if (p.authorId === user.id) p.authorPhotoUrl = url; });
    (this.state.explorePosts || []).forEach((p) => { if (p.authorId === user.id) p.authorPhotoUrl = url; });
    (this.state.stories || []).filter((s) => s.authorId === user.id).forEach((s) => { s.authorPhotoUrl = url; });
    this.saveState();
    return { ok: true, photoUrl: url };
  }

  /** 테스트·미리보기 전용 — 예전 데모 계정(내 모임·내 글·내 디엠)으로 되돌린다. */
  seedDemoAccount() {
    this.state = upgradeGroupGeo(buildDemoState());
    /* v36.1 — 씨드를 다시 깔아도 모든 일정에 단톡방이 있다. */
    this.eventChatSync = this.syncEventChats();
    this.saveState();
    return { ok: true, user: this.state.currentUser };
  }

  /** 데모 계정 여부(테스트·#demo 미리보기 판별). */
  isDemoAccount() {
    return !!(this.state.onboarding && this.state.onboarding.demo === true);
  }

  /* ==========================================================================
   * 17-B. 스토리 2차 — 사람별 링 · 짧은 답장 · 내 스토리 보관함
   * -------------------------------------------------------------------------
   * 11/15 21:31 사용자 답: "응 인스타처럼 사람별 링으로 기간 지난건 응 보관함에".
   *  · 링은 **멤버당 1개** — 그 멤버가 24시간 안에 올린 스토리를 오래된 것부터 묶는다.
   *  · 24시간이 지난 **내** 스토리는 지우지 않고 storyArchive 로 옮긴다(보관함).
   *  · 남의 스토리에 답장하면 그 모임의 1:1 대화방으로 이어진다.
   * ========================================================================== */

  /** 스토리 바의 사람별 링 — 내 링이 먼저, 그 다음 최근에 올린 사람 순. */
  getStoryRings(groupId, options = {}) {
    const live = this.getGroupStories(groupId, options);
    const me = this.currentUser.id;
    const map = new Map();
    live.forEach((s) => {
      if (!map.has(s.authorId)) map.set(s.authorId, []);
      map.get(s.authorId).push(s);
    });
    const rings = Array.from(map.entries()).map(([authorId, stories]) => {
      const last = stories[stories.length - 1];
      return {
        authorId,
        authorName: last.authorName,
        avatarText: last.authorAvatarText || (last.authorName || '').charAt(0),
        gradient: last.authorGradient,
        photoUrl: last.authorPhotoUrl || null,
        stories,
        count: stories.length,
        latestAt: last.createdAt,
        firstAt: stories[0].createdAt,
        isMine: authorId === me
      };
    });
    rings.sort((a, b) => (b.isMine ? 1 : 0) - (a.isMine ? 1 : 0)
      || new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
    return rings;
  }

  /** 특정 멤버의 링(그 사람 스토리만, 오래된 것부터). */
  getStoryRing(groupId, authorId, options = {}) {
    return this.getStoryRings(groupId, options).find((r) => r.authorId === authorId) || null;
  }

  getStoryRingStats(groupId, options = {}) {
    const rings = this.getStoryRings(groupId, options);
    return {
      rings: rings.length,
      stories: rings.reduce((sum, r) => sum + r.count, 0),
      mine: rings.filter((r) => r.isMine).length,
      others: rings.filter((r) => !r.isMine).length
    };
  }

  /** 내 스토리 보관함 — 24시간이 지나 스토리 바에서 내려간 내 스토리(최신순). */
  getMyStoryArchive(options = {}) {
    const me = this.currentUser.id;
    const list = (this.state.storyArchive || [])
      .filter((s) => s.authorId === me)
      .filter((s) => !options.groupId || s.groupId === options.groupId)
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.map((s) => ({
      ...s,
      groupName: (this.getGroup(s.groupId) || {}).name || '모임',
      archivedLabel: s.archivedAt ? s.archivedAt : null
    }));
  }

  /** 보관함에서 내 스토리 지우기 — 내 것만. */
  deleteArchivedStory(storyId) {
    const story = (this.state.storyArchive || []).find((s) => s.id === storyId);
    if (!story) return { ok: false, reason: 'not_found' };
    if (story.authorId !== this.currentUser.id) return { ok: false, reason: 'permission' };
    this.state.storyArchive = this.state.storyArchive.filter((s) => s.id !== storyId);
    this.saveState();
    return { ok: true };
  }

  getStoryArchiveStats() {
    const list = this.getMyStoryArchive();
    return {
      count: list.length,
      groups: [...new Set(list.map((s) => s.groupId))].length,
      latestAt: list.length ? list[0].createdAt : null
    };
  }

  /** 스토리에 짧은 답장 — 그 모임의 1:1 대화방으로 보낸다(없으면 연다). */
  replyToStory(storyId, text) {
    const story = this.getStory(storyId);
    if (!story) return { ok: false, reason: 'not_found' };
    if (story.authorId === this.currentUser.id) return { ok: false, reason: 'mine' };
    const body = String(text == null ? '' : text).trim().slice(0, 200);
    if (!body) return { ok: false, reason: 'empty' };
    const opened = this.ensureMemberChat(story.groupId, story.authorId);
    if (!opened.ok) return { ok: false, reason: opened.reason || 'not_found', message: opened.message || '' };
    const room = this.getChatRoom(opened.roomId);
    if (!room) return { ok: false, reason: 'not_found' };
    const message = this.sendChatMessage(room.id, body);
    if (!Array.isArray(story.replies)) story.replies = [];
    story.replies.push({ id: `sr_${Date.now()}`, fromMe: true, text: body, at: new Date().toISOString() });
    this.saveState();
    return {
      ok: true, room, message, partnerName: room.partnerName,
      replyCount: story.replies.length
    };
  }

  /* ==========================================================================
   * 17-C. 게시판 2차 — 공지 읽음(알림 없음) · 지난 공지 · 후기 모아보기
   * -------------------------------------------------------------------------
   * 공지 읽음은 **기록만** 한다 — 알림(notificationLog·푸시)은 절대 만들지 않는다.
   * ========================================================================== */

  /** 공지를 읽음으로 표시 — 같은 사람은 한 번만. 알림을 만들지 않는다. */
  markNoticeRead(noticeId, memberId) {
    const notice = this.getGroupNotice(noticeId);
    if (!notice) return { ok: false, reason: 'not_found' };
    const mid = memberId || this.currentUser.id;
    if (mid === this.currentUser.id && !this.isGroupJoined(notice.groupId)) {
      return { ok: false, reason: 'not_member' };
    }
    if (!Array.isArray(notice.readers)) notice.readers = [];
    if (notice.readers.some((r) => r.memberId === mid)) {
      return { ok: true, already: true, notice, read: this.getNoticeReadState(noticeId) };
    }
    const member = this.getGroupRoster(notice.groupId).members.find((m) => m.id === mid);
    notice.readers.push({
      memberId: mid,
      name: member ? member.name : (mid === this.currentUser.id ? (this.currentUser.nickname || '나') : '멤버'),
      avatarText: member ? member.avatarText : (this.currentUser.avatarText || (this.currentUser.nickname || '나').charAt(0)),
      gradient: member ? member.gradient : this.currentUser.avatarGradient,
      photoUrl: member && member.isMe ? (this.currentUser.photoUrl || null) : null,
      at: new Date().toISOString()
    });
    this.saveState();
    return { ok: true, already: false, notice, read: this.getNoticeReadState(noticeId) };
  }

  /** 공지 읽음 상태 — 누가 읽었는지(멤버 시트·읽음 표시에 쓰인다). */
  getNoticeReadState(noticeId) {
    const notice = this.getGroupNotice(noticeId);
    if (!notice) return null;
    const roster = this.getGroupRoster(notice.groupId);
    const readers = (notice.readers || []).slice()
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const readIds = new Set(readers.map((r) => r.memberId));
    const me = this.currentUser.id;
    const unread = roster.members.filter((m) => !readIds.has(m.id) && !m.isMe);
    return {
      noticeId,
      groupId: notice.groupId,
      readCount: readers.length,
      total: roster.total,
      readers,
      unread: unread.map((m) => ({ memberId: m.id, name: m.name, avatarText: m.avatarText, gradient: m.gradient })),
      iRead: readIds.has(me),
      percent: roster.total ? Math.round((readers.length / roster.total) * 100) : 0
    };
  }

  /** 게시판을 열면 아직 안 읽은 공지를 내 이름으로 읽음 처리한다(알림 없음). */
  markGroupNoticesRead(groupId) {
    if (!this.isGroupJoined(groupId)) return { ok: false, reason: 'not_member', marked: 0 };
    let marked = 0;
    this.getGroupNotices(groupId).forEach((n) => {
      const state = this.getNoticeReadState(n.id);
      if (state && !state.iRead) {
        this.markNoticeRead(n.id);
        marked += 1;
      }
    });
    return { ok: true, marked };
  }

  /** 지난 공지 묶음 — 최근(펼쳐 두는 것)과 지난 것(접히는 것)을 나눔. */
  getGroupNoticeGroups(groupId, options = {}) {
    const pinnedNow = this.getPinnedGroupNotice(groupId);
    const rest = this.getGroupNotices(groupId).filter((n) => !pinnedNow || n.id !== pinnedNow.id);
    const recentCount = Math.max(1, options.recentCount || 3);
    return {
      pinned: pinnedNow,
      recent: rest.slice(0, recentCount),
      past: rest.slice(recentCount),
      total: rest.length
    };
  }

  /** 후기 모아보기 — 말머리에 '후기'가 붙은 글만(최신순). */
  getGroupReviewPosts(groupId) {
    const reviews = (this.state.feedPosts || [])
      .filter((p) => p.groupId === groupId && isReviewTag(p.tag))
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return reviews;
  }

  /* ==========================================================================
   * 17-D. 갤러리 2차 — 표지 직접 선택 · 정렬 · 새 모임 진입
   * ========================================================================== */

  /** 모임 카드 표지 — 모임장이 고른 **사진(1~2장)** 이 있으면 그것, 없으면 모임 글 사진에서.
   *  Sprint 18 — 예시 일러스트 프리셋은 없앴다. 표지는 사용자가 올린 사진만 쓴다. */
  getGroupCover(groupId) {
    const group = this.getGroup(groupId);
    if (!group) return null;
    const photos = this.getGroupPhotoPosts(groupId).filter((p) => p.photoUrl);
    const custom = Array.isArray(group.coverPhotos) ? group.coverPhotos.filter(Boolean) : [];
    /* Sprint 32.5 — 만들 때 고른 대표 사진이 있으면 가장 먼저 보여준다. */
    const own = group.photoUrl ? [group.photoUrl] : [];
    return {
      groupId,
      photos: custom.length ? custom.slice(0, 2)
        : (own.concat(photos.map((p) => p.photoUrl))).filter((u, i, arr) => arr.indexOf(u) === i).slice(0, 2),
      custom: custom.length > 0,
      gradient: group.coverGradient || 'linear-gradient(135deg,#0E814A,#0E8146)',
      /* 고를 수 있는 사진 — 이 모임에 올라온 실제 사진들 */
      options: photos.slice(0, 24).map((p) => ({ id: p.id, photoUrl: p.photoUrl, caption: p.caption || '' }))
    };
  }

  /** 모임장이 표지 사진을 직접 고른다(1~2장 · 모임에 올라온 사진만). */
  setGroupCoverPhotos(groupId, photoUrls) {
    if (!this.can(groupId, 'edit_group')) return { ok: false, reason: 'permission' };
    const group = this.getGroup(groupId);
    if (!group) return { ok: false, reason: 'not_found' };
    const allowed = new Set(this.getGroupPhotoPosts(groupId).filter((p) => p.photoUrl).map((p) => p.photoUrl));
    const list = (Array.isArray(photoUrls) ? photoUrls : [photoUrls])
      .filter((u) => allowed.has(u))
      .filter((u, i, arr) => arr.indexOf(u) === i)
      .slice(0, 2);
    if (!list.length) return { ok: false, reason: 'empty' };
    group.coverPhotos = list;
    this.saveState();
    return { ok: true, cover: this.getGroupCover(groupId) };
  }

  /** 표지를 기본(최근 글 사진)으로 되돌린다. */
  clearGroupCover(groupId) {
    if (!this.can(groupId, 'edit_group')) return { ok: false, reason: 'permission' };
    const group = this.getGroup(groupId);
    if (!group) return { ok: false, reason: 'not_found' };
    delete group.coverPhotos;
    this.saveState();
    return { ok: true, cover: this.getGroupCover(groupId) };
  }

  getGallerySortOptions() {
    return [
      { id: 'recent', label: '최근 활동순' },
      { id: 'name', label: '가나다순' },
      { id: 'leader', label: '내가 모임장' }
    ];
  }

  getGallerySort() {
    const sort = this.state.galleryPrefs && this.state.galleryPrefs.sort;
    return ['recent', 'name', 'leader'].includes(sort) ? sort : 'recent';
  }

  setGallerySort(sort) {
    if (!['recent', 'name', 'leader'].includes(sort)) return { ok: false, reason: 'unknown' };
    this.state.galleryPrefs = { ...(this.state.galleryPrefs || {}), sort };
    this.saveState();
    return { ok: true, sort };
  }

  /* ==========================================================================
   * 17-E. 탐색 2차 — 취미 조합 한 줄 요약 · 내 프로필 카드 꾸미기
   * (필터 프리셋 '저장' 기능은 사용자가 거절했으므로 만들지 않는다 — 마지막 상태 기억만)
   * ========================================================================== */

  /** 지금 적용된 탐색 조건을 한 줄로 — 취미 · 나이 · 거리 · 지역. */
  /** 탐색 조건 한 줄 요약 — 지역 · 나이. (Sprint 25 — 취미·반경은 탐색에서 뺐다) */
  getExploreSummary() {
    const prefs = this.getExplorePrefs();
    const range = this.getExploreAgeRange();
    const region = prefs.region === 'all' ? null : this.getRegion(prefs.region);
    const ageLabel = range.active ? `${range.min}~${range.max}세` : '나이 전체';
    const regionLabel = prefs.region === 'nearby'
      ? '내 주변'
      : (region ? (region.group ? region.name : `${(regionGroupDef(region.groupId) || {}).name || ''} ${region.short || region.name}`.trim()) : '전체 지역');
    const activeCount = [range.active, prefs.region !== 'all'].filter(Boolean).length;
    return {
      hobbyId: 'all',
      hobbyLabel: '전체 취미',
      ageLabel,
      radiusLabel: '내 동네 전체',
      regionLabel,
      activeCount,
      text: `${regionLabel} · ${ageLabel}`
    };
  }

  /** 내 탐색 사람 카드 꾸미기 값 — 대표 사진 · 한 줄 소개. */
  getMyExploreCard() {
    const u = this.state.currentUser;
    const card = u.exploreCard || {};
    return {
      photoUrl: card.photoUrl || u.photoUrl || null,
      intro: String(card.intro || '').slice(0, 40),
      nickname: u.nickname || '나'
    };
  }

  /** 대표 사진(내가 올린 사진)과 한 줄 소개를 저장한다. */
  setMyExploreCard(patch) {
    const d = patch || {};
    const u = this.state.currentUser;
    const card = { ...(u.exploreCard || {}) };
    if (d.photoUrl !== undefined) {
      const raw = String(d.photoUrl || '').trim();
      card.photoUrl = raw ? raw : null;
    }
    if (d.intro != null) card.intro = String(d.intro).trim().slice(0, 40);
    u.exploreCard = card;
    this.saveState();
    return { ok: true, card: this.getMyExploreCard() };
  }

  /* ==========================================================================
   * 17-F. 전체 디엠함 2차 — 모임별/최근순 · 읽지 않은 대화 · 상대 프로필
   * ========================================================================== */

  /** 모임별로 묶은 디엠함 — 모임 단체방 + 그 모임에서 시작한 1:1 을 한 칸에. */
  getDmInboxSections() {
    const inbox = this.getDmInbox();
    const sections = this.getJoinedGroups().map((group) => {
      const groupRoom = inbox.groupRooms.find((r) => r.groupId === group.id);
      const directs = inbox.directRooms.filter((r) => r.group && r.group.id === group.id);
      return {
        id: group.id, group, groupRoom,
        directs,
        unread: (groupRoom ? groupRoom.chat.unread : 0) + directs.reduce((sum, r) => sum + r.unread, 0),
        total: directs.length + (groupRoom ? 1 : 0)
      };
    }).filter((s) => s.total > 0);
    const loose = inbox.directRooms.filter((r) => !r.group);
    if (loose.length) {
      sections.push({
        id: 'unassigned', group: null, groupRoom: null, directs: loose,
        unread: loose.reduce((sum, r) => sum + r.unread, 0), total: loose.length
      });
    }
    return {
      sections,
      recent: inbox.directRooms.slice(),
      groupRooms: inbox.groupRooms,
      unread: inbox.unread,
      total: inbox.total
    };
  }

  /** 읽지 않은 대화만 — 단체방·1:1 을 따로 센다. */
  getUnreadDmThreads() {
    const inbox = this.getDmInbox();
    return {
      groupRooms: inbox.groupRooms.filter((r) => r.chat.unread > 0),
      directRooms: inbox.directRooms.filter((r) => r.unread > 0),
      total: inbox.unread
    };
  }

  /* ==========================================================================
   * 17-G. store → 서버 API 교체 경계 (STORE_API.md 5-1)
   * -------------------------------------------------------------------------
   * 화면은 지금 동기 선택자를 쓴다. 서버로 옮길 때는 아래 readAsync 의 한 자리만
   * fetch 로 바꾸면 되고, 기존 getXxx 동기 호출·테스트는 그대로 둔다(호환 유지).
   * ========================================================================== */
  static getReadBoundary() {
    return {
      mode: 'local',      // 'server' 로 바꾸면 readAsync 가 서버를 본다
      reads: {
        stories: 'getGroupStories',
        storyRings: 'getStoryRings',
        dmInbox: 'getDmInbox',
        gallery: 'getGroupGallery',
        notices: 'getGroupNotices'
      }
    };
  }

  /** 이름 하나로 읽기를 기다리는 경계 — 지금은 로컬 상태를 Promise 로 돌려준다. */
  readAsync(key, ...args) {
    const map = Store.getReadBoundary().reads;
    const fn = map[key];
    if (!fn || typeof this[fn] !== 'function') return Promise.resolve(null);
    return Promise.resolve().then(() => this[fn](...args));
  }

  /** Sprint 26.5 — 앨범 업로드 스펙(화질·장수). 화면은 이 값 하나만 본다. */
  getAlbumUploadSpec() {
    return {
      maxDimension: ALBUM_MAX_DIMENSION,
      jpegQuality: ALBUM_JPEG_QUALITY,
      max: ALBUM_MAX,
      mime: 'image/jpeg'
    };
  }

  getGroupStoriesAsync(groupId, options) { return this.readAsync('stories', groupId, options); }
  getStoryRingsAsync(groupId, options) { return this.readAsync('storyRings', groupId, options); }
  getDmInboxAsync(options) { return this.readAsync('dmInbox', options); }
  getGroupGalleryAsync(options) { return this.readAsync('gallery', options); }
  getGroupNoticesAsync(groupId) { return this.readAsync('notices', groupId); }
}

/* ---------------------------------------------------------------------------
 * 시간 표기 유틸 — 피드의 '15분 전' 표시를 만든다.
 * ------------------------------------------------------------------------- */
function oogTimeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  if (Number.isNaN(diff)) return '';
  const m = Math.floor(diff / MINUTE);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d === 1) return '어제';
  if (d < 7) return `${d}일 전`;
  const date = new Date(isoString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

window.appStore = new Store();
window.oogTimeAgo = oogTimeAgo;
/* Sprint 26.5 — 앨범 업로드 스펙을 밖(api.js·번들·테스트)에서도 같은 값으로 읽게 한다. */
window.OOG_ALBUM_SPEC = ALBUM_UPLOAD_SPEC;
