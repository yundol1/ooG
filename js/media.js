/**
 * ============================================================================
 * ooG (우그) — Media Art Module  ·  Sprint 2
 * ----------------------------------------------------------------------------
 * 실제 사진 업로드가 붙기 전까지 피드의 1:1 정방형 미디어 영역을 채우는
 * '운동/취미 테마 벡터 일러스트' 생성기.
 *
 * ▶ 설계 의도
 *   - 사진 파일 없이도 인스타그램처럼 보이는 1:1 카드가 완성된다.
 *   - 모든 그림은 SVG(벡터)라 고해상도 화면에서도 깨지지 않고, 용량이 거의 없다.
 *   - 나중에 사용자가 실제 사진을 올리면 post.mediaPreset 대신 photoUrl 을 쓰도록
 *     buildMedia() 한 곳만 확장하면 된다 (A-C-D 연동 지점).
 *
 * ▶ 사용법
 *   OogMedia.render('wod', 'p1')  -> <svg ...> 문자열
 *   OogMedia.labelOf('wod')       -> 'WOD 화이트보드'
 * ============================================================================
 */
(function () {
  /* SVG 내부 텍스트용 폰트 스택 — SVG 속성에서는 따옴표 없이 써야 파싱이 깨지지 않는다. */
  const FONT = "Pretendard, Noto Sans KR, Noto Sans CJK KR, sans-serif";

  /** 프리셋 메타데이터 — 글쓰기 모달의 사진 선택 그리드도 이 목록을 그대로 쓴다. */
  const PRESETS = [
    /* --- Sprint 3: 운동 밖의 취미 (매칭 카드·피드 공용) --- */
    { key: 'gaming_room', label: '게이밍룸 · 게임', emoji: '🎮' },
    { key: 'cafe_coffee', label: '카페 · 핸드드립', emoji: '☕' },
    { key: 'cinema_film', label: '영화관 · 팝콘', emoji: '🎬' },
    { key: 'boardgame_table', label: '보드게임 테이블', emoji: '🎲' },
    { key: 'running_track', label: '러닝 트랙', emoji: '🏃' },
    { key: 'dumbbell', label: '덤벨 랙', emoji: '🏋️' },
    { key: 'swimming_pool', label: '수영장 레인', emoji: '🏊' },
    { key: 'climbing_boulder', label: '볼더링 월', emoji: '🧗' },
    /* --- Sprint 1~2: 운동·일상 기록 --- */
    { key: 'wod', label: 'WOD 화이트보드', emoji: '📋' },
    { key: 'barbell', label: '바벨 · PR 인증', emoji: '🏋️' },
    { key: 'kettle', label: '케틀벨 · 악력', emoji: '🔔' },
    { key: 'gym', label: '3대 측정', emoji: '🏦' },
    { key: 'climb', label: '클라이밍 월', emoji: '🧗' },
    { key: 'nightrun', label: '한강 야간런', emoji: '🌃' },
    { key: 'pool', label: '수영 레인', emoji: '🏊' },
    { key: 'meal', label: '식단 인증', emoji: '🥗' },
    { key: 'lol', label: '게임 승리 화면', emoji: '🎮' },
    { key: 'selfie', label: '오운완 셀피', emoji: '🔥' }
  ];

  /* 공통 헬퍼 ----------------------------------------------------------------- */
  const txt = (x, y, content, size, color, weight = 700, anchor = 'start', spacing = 0) =>
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" letter-spacing="${spacing}">${content}</text>`;

  const chip = (x, y, w, content, fill, color, size = 15) =>
    `<rect x="${x}" y="${y}" width="${w}" height="34" rx="17" fill="${fill}"/>
     ${txt(x + w / 2, y + 23, content, size, color, 700, 'middle')}`;

  /* 개별 프리셋 ------------------------------------------------------------- */
  const ART = {
    /* 1. 크로스핏 박스 WOD 화이트보드 */
    wod: (id) => `
      <defs>
        <linearGradient id="wodBg${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0F172A"/><stop offset="55%" stop-color="#134E4A"/><stop offset="100%" stop-color="#064E3B"/>
        </linearGradient>
        <radialGradient id="wodGlow${id}" cx="0.8" cy="0.15" r="0.6">
          <stop offset="0%" stop-color="#10B981" stop-opacity="0.45"/><stop offset="100%" stop-color="#10B981" stop-opacity="0"/>
        </radialGradient>
        <filter id="wodShadow${id}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#wodBg${id})"/>
      <rect width="400" height="400" fill="url(#wodGlow${id})"/>
      <g opacity="0.18" stroke="#34D399" stroke-width="2">
        <path d="M0 320 H400 M0 340 H400 M0 360 H400 M0 380 H400"/>
      </g>
      <rect x="46" y="52" width="308" height="196" rx="14" fill="#F8FAFC" filter="url(#wodShadow${id})"/>
      <rect x="46" y="52" width="308" height="34" rx="14" fill="#E2E8F0"/>
      <rect x="46" y="72" width="308" height="14" fill="#E2E8F0"/>
      ${txt(64, 76, 'TODAY WOD', 15, '#0F172A', 800, 'start', 1.5)}
      ${txt(336, 76, '19:10', 14, '#64748B', 700, 'end')}
      ${txt(64, 118, 'AMRAP 22\'', 26, '#0F172A', 800)}
      ${txt(64, 146, '10 Push-up · 15 Air Squat', 14, '#475569', 600)}
      ${txt(64, 168, '8 Pull-up · 200m Run', 14, '#475569', 600)}
      <rect x="64" y="186" width="272" height="1.5" fill="#CBD5E1"/>
      ${txt(64, 210, 'TARGET: 정자세 유지, 캡 1회전', 13, '#047857', 700)}
      ${txt(64, 232, '완료 ✓  루키', 13, '#94A3B8', 600)}
      <!-- 바닥 바벨 -->
      <g stroke="#0B1220" stroke-width="7" stroke-linecap="round">
        <line x1="70" y1="318" x2="330" y2="318"/>
      </g>
      <g fill="#111827" stroke="#34D399" stroke-width="2">
        <rect x="96" y="286" width="20" height="64" rx="8"/>
        <rect x="122" y="276" width="26" height="84" rx="10"/>
        <rect x="286" y="276" width="26" height="84" rx="10"/>
        <rect x="312" y="286" width="20" height="64" rx="8"/>
      </g>
    `,

    /* 2. 바벨 PR */
    barbell: (id) => `
      <defs>
        <radialGradient id="bbBg${id}" cx="0.5" cy="0.4" r="0.75">
          <stop offset="0%" stop-color="#1E293B"/><stop offset="100%" stop-color="#020617"/>
        </radialGradient>
        <linearGradient id="bbPlate${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#34D399"/><stop offset="100%" stop-color="#047857"/>
        </linearGradient>
        <filter id="bbGlow${id}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#bbBg${id})"/>
      <ellipse cx="200" cy="210" rx="150" ry="70" fill="#10B981" opacity="0.12"/>
      <!-- 바 -->
      <rect x="40" y="196" width="320" height="9" rx="4.5" fill="#94A3B8"/>
      <g opacity="0.55" stroke="#64748B" stroke-width="3">
        <line x1="70" y1="186" x2="70" y2="216"/><line x1="84" y1="182" x2="84" y2="220"/>
        <line x1="316" y1="182" x2="316" y2="220"/><line x1="330" y1="186" x2="330" y2="216"/>
      </g>
      <!-- 원판 -->
      <g filter="url(#bbGlow${id})">
        <rect x="96" y="126" width="30" height="150" rx="12" fill="url(#bbPlate${id})"/>
        <rect x="136" y="146" width="24" height="110" rx="10" fill="#0F766E"/>
        <rect x="240" y="146" width="24" height="110" rx="10" fill="#0F766E"/>
        <rect x="274" y="126" width="30" height="150" rx="12" fill="url(#bbPlate${id})"/>
      </g>
      ${txt(200, 92, 'DEADLIFT', 15, '#A7F3D0', 800, 'middle', 3.5)}
      ${txt(200, 300, '140 kg', 46, '#ECFDF5', 800, 'middle')}
      ${txt(200, 330, '× 3 reps  ·  PR', 16, '#34D399', 700, 'middle')}
      <rect x="140" y="350" width="120" height="2" fill="#334155"/>
      ${txt(200, 380, '코치준 · 성수 레벨업', 13, '#64748B', 600, 'middle')}
    `,

    /* 3. 케틀벨 */
    kettle: (id) => `
      <defs>
        <linearGradient id="ktBg${id}" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stop-color="#065F46"/><stop offset="60%" stop-color="#0B3B32"/><stop offset="100%" stop-color="#052E2B"/>
        </linearGradient>
        <linearGradient id="ktBody${id}" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stop-color="#6EE7B7"/><stop offset="55%" stop-color="#10B981"/><stop offset="100%" stop-color="#065F46"/>
        </linearGradient>
        <filter id="ktShadow${id}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity="0.45"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#ktBg${id})"/>
      <circle cx="320" cy="80" r="120" fill="#10B981" opacity="0.12"/>
      <g filter="url(#ktShadow${id})">
        <path d="M150 168 C150 112, 250 112, 250 168" fill="none" stroke="#E2E8F0" stroke-width="16" stroke-linecap="round"/>
        <path d="M168 150 C168 122, 232 122, 232 150" fill="none" stroke="#94A3B8" stroke-width="4"/>
        <path d="M124 176 H276 A58 58 0 0 1 300 236 V262 A78 78 0 0 1 224 340 H176 A78 78 0 0 1 100 262 V236 A58 58 0 0 1 124 176 Z" fill="url(#ktBody${id})"/>
      </g>
      <ellipse cx="158" cy="236" rx="18" ry="30" fill="#ECFDF5" opacity="0.28"/>
      ${txt(200, 268, '24', 62, '#052E2B', 800, 'middle')}
      ${txt(200, 296, 'kg', 20, '#065F46', 800, 'middle')}
      ${chip(24, 24, 150, '파머스 워크', '#ECFDF5', '#047857', 13)}
      ${txt(200, 378, 'FARMERS WALK · 4 SETS', 12, '#6EE7B7', 700, 'middle', 1.6)}
    `,

    /* 4. 3대 측정 */
    gym: (id) => `
      <defs>
        <linearGradient id="gymBg${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#0B1120"/>
        </linearGradient>
        <linearGradient id="gymBar${id}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#10B981"/><stop offset="100%" stop-color="#34D399"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#gymBg${id})"/>
      <g opacity="0.1" stroke="#34D399" stroke-width="1">
        ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${40 * i}" x2="400" y2="${40 * i}"/>`).join('')}
      </g>
      ${txt(36, 62, '3대 500 도전', 17, '#A7F3D0', 800, 'start', 1)}
      ${txt(36, 88, '8주차 진행률', 13, '#64748B', 600)}
      <rect x="36" y="104" width="328" height="14" rx="7" fill="#1E293B"/>
      <rect x="36" y="104" width="302" height="14" rx="7" fill="url(#gymBar${id})"/>
      ${txt(364, 140, '460 / 500 kg', 15, '#34D399', 800, 'end')}
      <g>
        ${[
          { label: 'SQUAT', value: '170', x: 36 },
          { label: 'BENCH', value: '115', x: 148 },
          { label: 'DEAD', value: '175', x: 260 }
        ].map((it) => `
          <rect x="${it.x}" y="172" width="104" height="112" rx="14" fill="#0F172A" stroke="#1E293B"/>
          ${txt(it.x + 16, 198, it.label, 11, '#64748B', 800, 'start', 1.6)}
          <text x="${it.x + 16}" y="254" font-family="${FONT}" font-size="32" font-weight="800" fill="#F8FAFC">${it.value}</text>
          ${txt(it.x + 94, 252, 'kg', 11, '#64748B', 700, 'end')}
        `).join('')}
      </g>
      ${txt(36, 320, '남은 목표까지 40kg', 14, '#94A3B8', 600)}
      <rect x="36" y="334" width="328" height="1" fill="#1E293B"/>
      ${txt(36, 372, '아이언 · 성동 3대 400+', 13, '#64748B', 600)}
      ${txt(364, 372, '🔥 PR', 13, '#F59E0B', 800, 'end')}
    `,

    /* 5. 클라이밍 월 */
    climb: (id) => `
      <defs>
        <linearGradient id="clBg${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#475569"/><stop offset="60%" stop-color="#334155"/><stop offset="100%" stop-color="#1E293B"/>
        </linearGradient>
        <filter id="clShadow${id}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#clBg${id})"/>
      <g opacity="0.14" fill="#0F172A">
        <polygon points="0,0 400,0 400,120 0,220"/>
        <polygon points="0,240 400,150 400,400 0,400" opacity="0.6"/>
      </g>
      <!-- 루트 라인 -->
      <path d="M62 330 C120 300, 96 250, 160 226 C226 200, 196 150, 262 132 C300 121, 318 96, 344 78"
            fill="none" stroke="#F8FAFC" stroke-width="3" stroke-dasharray="10 12" opacity="0.55"/>
      <!-- 홀드들 -->
      <g filter="url(#clShadow${id})">
        <ellipse cx="62" cy="330" rx="26" ry="18" fill="#F59E0B"/>
        <ellipse cx="120" cy="292" rx="18" ry="13" fill="#EF4444"/>
        <ellipse cx="150" cy="240" rx="24" ry="16" fill="#F59E0B"/>
        <ellipse cx="196" cy="196" rx="17" ry="12" fill="#34D399"/>
        <ellipse cx="262" cy="150" rx="22" ry="15" fill="#EF4444"/>
        <ellipse cx="318" cy="104" rx="16" ry="11" fill="#F59E0B"/>
        <ellipse cx="344" cy="76" rx="10" ry="8" fill="#34D399"/>
      </g>
      <g opacity="0.35" stroke="#F8FAFC" stroke-width="2">
        <path d="M96 314 q10 12 24 4"/><path d="M286 140 q12 10 22 2"/>
      </g>
      ${chip(24, 24, 96, 'V4 완등', '#F59E0B', '#1C1917', 14)}
      ${txt(376, 372, '블록스 성수', 13, '#CBD5E1', 700, 'end')}
      ${txt(24, 372, 'TERRAIN · V4', 12, '#94A3B8', 700)}
    `,

    /* 6. 한강 야간런 */
    nightrun: (id) => `
      <defs>
        <linearGradient id="nrSky${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0B1220"/><stop offset="55%" stop-color="#132A3C"/><stop offset="100%" stop-color="#0E7490"/>
        </linearGradient>
        <linearGradient id="nrWater${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0F766E"/><stop offset="100%" stop-color="#052E2B"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#nrSky${id})"/>
      <circle cx="308" cy="78" r="26" fill="#E0F2FE" opacity="0.9"/>
      <circle cx="308" cy="78" r="44" fill="#E0F2FE" opacity="0.12"/>
      <g fill="#F8FAFC" opacity="0.7">
        ${[[42, 44], [96, 66], [150, 36], [214, 58], [256, 32], [352, 52], [378, 96]]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8"/>`).join('')}
      </g>
      <!-- 스카이라인 -->
      <g fill="#0B1220">
        <rect x="0" y="196" width="54" height="94"/><rect x="60" y="168" width="40" height="122"/>
        <rect x="106" y="212" width="34" height="78"/><rect x="146" y="150" width="46" height="140"/>
        <rect x="198" y="186" width="30" height="104"/><rect x="234" y="162" width="52" height="128"/>
        <rect x="292" y="204" width="36" height="86"/><rect x="334" y="176" width="66" height="114"/>
      </g>
      <g fill="#FBBF24" opacity="0.85">
        ${[[66, 180], [74, 196], [154, 164], [166, 188], [242, 176], [252, 200], [344, 190], [356, 214], [18, 210]]
          .map(([x, y]) => `<rect x="${x}" y="${y}" width="4" height="6" rx="1"/>`).join('')}
      </g>
      <!-- 다리 -->
      <path d="M0 270 H400" stroke="#1E293B" stroke-width="6"/>
      <path d="M0 270 Q200 236 400 270" fill="none" stroke="#334155" stroke-width="3"/>
      <g stroke="#475569" stroke-width="2" opacity="0.8">
        <line x1="60" y1="270" x2="60" y2="248"/><line x1="140" y1="268" x2="140" y2="242"/>
        <line x1="220" y1="266" x2="220" y2="240"/><line x1="300" y1="268" x2="300" y2="246"/>
      </g>
      <!-- 강물 -->
      <rect x="0" y="272" width="400" height="128" fill="url(#nrWater${id})"/>
      <g stroke="#67E8F9" stroke-width="2" opacity="0.45">
        ${[286, 300, 316, 332, 350, 368, 388].map((y, i) =>
          `<line x1="${20 + (i % 3) * 30}" y1="${y}" x2="${200 + (i % 4) * 40}" y2="${y}" opacity="${0.5 - i * 0.05}"/>`).join('')}
      </g>
      <ellipse cx="140" cy="342" rx="70" ry="8" fill="#22D3EE" opacity="0.15"/>
      ${chip(24, 24, 150, '🏃 10K · 52:31', '#0F172A', '#A7F3D0', 14)}
      ${txt(24, 372, '여의도 샛강 야간런', 15, '#E2E8F0', 800)}
      ${txt(376, 372, 'PM 20:14', 12, '#94A3B8', 700, 'end')}
    `,

    /* 7. 수영 레인 */
    pool: (id) => `
      <defs>
        <linearGradient id="plBg${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#22D3EE"/><stop offset="60%" stop-color="#0891B2"/><stop offset="100%" stop-color="#0E7490"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#plBg${id})"/>
      <g opacity="0.25" stroke="#ECFEFF" stroke-width="2">
        ${[70, 130, 190, 250, 310, 370].map((y) => `<path d="M0 ${y} q50 -14 100 0 t100 0 t100 0 t100 0"/>`).join('')}
      </g>
      <!-- 레인 로프 -->
      <g>
        ${[110, 210, 310].map((y) => `
          <line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#0E7490" stroke-width="3" opacity="0.5"/>
          <circle cx="30" cy="${y}" r="9" fill="#F8FAFC" opacity="0.9"/>
          <circle cx="80" cy="${y}" r="9" fill="#10B981" opacity="0.9"/>
          <circle cx="130" cy="${y}" r="9" fill="#F8FAFC" opacity="0.9"/>
          <circle cx="180" cy="${y}" r="9" fill="#10B981" opacity="0.9"/>
          <circle cx="230" cy="${y}" r="9" fill="#F8FAFC" opacity="0.9"/>
          <circle cx="280" cy="${y}" r="9" fill="#10B981" opacity="0.9"/>
          <circle cx="330" cy="${y}" r="9" fill="#F8FAFC" opacity="0.9"/>
          <circle cx="380" cy="${y}" r="9" fill="#10B981" opacity="0.9"/>
        `).join('')}
      </g>
      <!-- 수영하는 실루엣 -->
      <g transform="translate(196 152)">
        <ellipse cx="0" cy="0" rx="52" ry="20" fill="#ECFEFF" opacity="0.16"/>
        <circle cx="0" cy="6" r="12" fill="#0F172A"/>
        <path d="M-4 -2 q10 -14 30 -10" stroke="#0F172A" stroke-width="7" fill="none" stroke-linecap="round"/>
        <path d="M-8 10 q-26 6 -40 22" stroke="#0F172A" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M6 16 q22 4 34 20" stroke="#0F172A" stroke-width="6" fill="none" stroke-linecap="round"/>
        <g stroke="#ECFEFF" stroke-width="3" opacity="0.7">
          <path d="M-44 26 q8 -8 16 0"/><path d="M38 34 q8 -8 16 0"/>
        </g>
      </g>
      ${chip(24, 24, 128, '자유형 1,500m', '#ECFEFF', '#0E7490', 13)}
      ${txt(24, 372, '성동구민센터 · 06:00', 14, '#ECFEFF', 800)}
      ${txt(376, 372, 'LANE 3', 12, '#A5F3FC', 700, 'end')}
    `,

    /* 8. 식단 인증 */
    meal: (id) => `
      <defs>
        <linearGradient id="mlBg${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F0FDF4"/><stop offset="55%" stop-color="#ECFDF5"/><stop offset="100%" stop-color="#DCFCE7"/>
        </linearGradient>
        <filter id="mlShadow${id}" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#14532D" flood-opacity="0.16"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#mlBg${id})"/>
      <rect x="0" y="252" width="400" height="148" fill="#BBF7D0" opacity="0.55"/>
      <!-- 도시락 3칸 -->
      <g filter="url(#mlShadow${id})">
        <rect x="52" y="168" width="180" height="130" rx="18" fill="#FFFFFF"/>
        <rect x="240" y="168" width="108" height="130" rx="18" fill="#FFFFFF"/>
      </g>
      <!-- 닭가슴살 -->
      <g>
        <rect x="66" y="182" width="72" height="102" rx="12" fill="#FEF3C7"/>
        ${[[86, 210], [110, 214], [92, 244], [116, 248]].map(([x, y]) =>
          `<ellipse cx="${x}" cy="${y}" rx="17" ry="13" fill="#F59E0B" opacity="0.85"/>`).join('')}
        ${txt(102, 274, '닭가슴', 11, '#92400E', 800, 'middle')}
      </g>
      <!-- 현미밥 -->
      <g>
        <rect x="146" y="182" width="72" height="102" rx="12" fill="#F8FAFC"/>
        <ellipse cx="182" cy="222" rx="26" ry="20" fill="#E2E8F0"/>
        <ellipse cx="182" cy="216" rx="20" ry="14" fill="#F8FAFC"/>
        ${txt(182, 274, '현미밥', 11, '#475569', 800, 'middle')}
      </g>
      <!-- 브로콜리 -->
      <g>
        <rect x="254" y="182" width="80" height="102" rx="12" fill="#DCFCE7"/>
        ${[[276, 212], [300, 206], [312, 232], [282, 238]].map(([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="14" fill="#10B981" opacity="0.85"/>`).join('')}
        ${txt(294, 274, '브로콜리', 11, '#047857', 800, 'middle')}
      </g>
      ${chip(24, 24, 148, '단백질 42g', '#FFFFFF', '#047857', 13)}
      ${txt(24, 80, '운동 후 도시락', 15, '#166534', 600)}
      ${txt(24, 356, '닭가슴 150g · 탄수 60g', 14, '#15803D', 700)}
      ${txt(376, 356, '🥗', 20, '#15803D', 700, 'end')}
    `,

    /* 9. 롤 승리 화면 */
    lol: (id) => `
      <defs>
        <radialGradient id="lolBg${id}" cx="0.5" cy="0.35" r="0.8">
          <stop offset="0%" stop-color="#312E81"/><stop offset="60%" stop-color="#1E1B4B"/><stop offset="100%" stop-color="#0B1120"/>
        </radialGradient>
        <linearGradient id="lolCry${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#A5F3FC"/><stop offset="100%" stop-color="#4F46E5"/>
        </linearGradient>
        <filter id="lolGlow${id}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#lolBg${id})"/>
      <g opacity="0.2" stroke="#818CF8" stroke-width="2">
        <polygon points="200,40 330,120 330,270 200,350 70,270 70,120" fill="none"/>
        <polygon points="200,86 288,140 288,250 200,304 112,250 112,140" fill="none"/>
      </g>
      <g filter="url(#lolGlow${id})">
        <polygon points="200,96 214,180 200,252 186,180" fill="url(#lolCry${id})"/>
        <polygon points="200,96 214,180 200,252" fill="#FFFFFF" opacity="0.35"/>
      </g>
      ${txt(200, 68, 'VICTORY', 30, '#FBBF24', 800, 'middle', 5)}
      ${txt(200, 300, '골드 Ⅱ · 87 LP', 17, '#E0E7FF', 700, 'middle')}
      ${txt(200, 326, '3연패 → 3연승 승급', 13, '#A5B4FC', 600, 'middle')}
      <g opacity="0.9">
        <rect x="34" y="30" width="10" height="10" rx="2" fill="#34D399"/>
        <rect x="52" y="30" width="10" height="10" rx="2" fill="#F59E0B"/>
        <rect x="338" y="30" width="10" height="10" rx="2" fill="#EF4444"/>
      </g>
      ${txt(24, 372, '미드장인 · 심야 자랭팟', 13, '#94A3B8', 600)}
      ${txt(376, 372, 'AM 02:07', 12, '#6366F1', 700, 'end')}
    `,

    /* ======================================================================
     * Sprint 3 — 운동 밖의 취미를 위한 신규 프리셋 7종
     * (4:5 매칭 카드에서 가장자리가 잘려도 핵심은 중앙에 오도록 구성)
     * ==================================================================== */

    /* 11. 게이밍룸 — 모니터·키보드·마우스·헤드셋 */
    gaming_room: (id) => `
      <defs>
        <linearGradient id="gmBg${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1E1B4B"/><stop offset="55%" stop-color="#312E81"/><stop offset="100%" stop-color="#0B1120"/>
        </linearGradient>
        <linearGradient id="gmScreen${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0EA5E9"/><stop offset="60%" stop-color="#6366F1"/><stop offset="100%" stop-color="#8B5CF6"/>
        </linearGradient>
        <radialGradient id="gmGlow${id}" cx="0.5" cy="0.42" r="0.55">
          <stop offset="0%" stop-color="#818CF8" stop-opacity="0.5"/><stop offset="100%" stop-color="#818CF8" stop-opacity="0"/>
        </radialGradient>
        <filter id="gmShadow${id}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.5"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#gmBg${id})"/>
      <rect width="400" height="400" fill="url(#gmGlow${id})"/>
      <g opacity="0.16" stroke="#A5B4FC" stroke-width="1.5">
        <path d="M0 330 H400 M0 352 H400 M0 374 H400"/>
        <path d="M40 0 V400 M360 0 V400"/>
      </g>
      <!-- 책상 -->
      <rect x="0" y="330" width="400" height="70" fill="#0B1120"/>
      <rect x="0" y="326" width="400" height="6" fill="#312E81" opacity="0.7"/>
      <!-- 모니터 -->
      <g filter="url(#gmShadow${id})">
        <rect x="58" y="86" width="284" height="176" rx="12" fill="#0F172A" stroke="#4338CA" stroke-width="3"/>
        <rect x="70" y="98" width="260" height="152" rx="7" fill="url(#gmScreen${id})"/>
        <!-- 화면: 미니맵 · 체력바 · 스킬 -->
        <rect x="82" y="182" width="236" height="56" rx="6" fill="#0B1120" opacity="0.55"/>
        <circle cx="316" cy="120" r="20" fill="#0B1120" opacity="0.35"/>
        <path d="M300 120 l12 -9 v18 z" fill="#FBBF24"/>
        <g fill="#22D3EE">
          <rect x="90" y="192" width="46" height="7" rx="3.5"/>
          <rect x="90" y="204" width="30" height="7" rx="3.5" fill="#A78BFA"/>
          <rect x="90" y="216" width="38" height="7" rx="3.5" fill="#34D399"/>
        </g>
        <g fill="#F8FAFC" opacity="0.85">
          <circle cx="212" cy="196" r="5"/><circle cx="236" cy="212" r="5"/><circle cx="188" cy="212" r="5"/>
        </g>
        <rect x="252" y="190" width="56" height="9" rx="4.5" fill="#EF4444"/>
        <rect x="252" y="205" width="40" height="9" rx="4.5" fill="#38BDF8"/>
      </g>
      <!-- 스탠드 -->
      <rect x="188" y="262" width="24" height="40" fill="#1E293B"/>
      <rect x="150" y="300" width="100" height="10" rx="5" fill="#1E293B"/>
      <!-- 키보드 (RGB) -->
      <rect x="96" y="318" width="170" height="44" rx="8" fill="#111827" stroke="#4F46E5" stroke-width="2"/>
      <g>
        ${[0, 1].map((r) => [0, 1, 2, 3, 4, 5, 6, 7].map((c) =>
          `<rect x="${104 + c * 20}" y="${326 + r * 15}" width="15" height="11" rx="2.5" fill="${
            ['#34D399', '#38BDF8', '#A78BFA', '#F472B6'][(c + r) % 4]}" opacity="0.8"/>`).join('')).join('')}
      </g>
      <!-- 마우스 -->
      <rect x="286" y="320" width="44" height="42" rx="21" fill="#111827" stroke="#4F46E5" stroke-width="2"/>
      <rect x="304" y="328" width="8" height="14" rx="4" fill="#A5B4FC"/>
      <!-- 헤드셋 -->
      <path d="M340 300 v-30 a26 26 0 0 1 40 0 v30" fill="none" stroke="#1F2937" stroke-width="9" stroke-linecap="round"/>
      <rect x="332" y="292" width="14" height="24" rx="7" fill="#4338CA"/>
    `,

    /* 12. 카페 — 라떼아트 · 크로와상 */
    cafe_coffee: (id) => `
      <defs>
        <linearGradient id="cfBg${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FEF3C7"/><stop offset="55%" stop-color="#FDE68A"/><stop offset="100%" stop-color="#F5D7A1"/>
        </linearGradient>
        <radialGradient id="cfCup${id}" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#F1E3C8"/><stop offset="100%" stop-color="#EADFC8"/>
        </radialGradient>
        <linearGradient id="cfCoffee${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#B45309"/><stop offset="100%" stop-color="#78350F"/>
        </linearGradient>
        <filter id="cfShadow${id}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#92400E" flood-opacity="0.28"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#cfBg${id})"/>
      <!-- 나무 테이블 -->
      <rect x="0" y="252" width="400" height="148" fill="#C88B4E"/>
      <g stroke="#A97B3B" stroke-width="2" opacity="0.35">
        <path d="M0 282 H400 M0 312 H400 M0 344 H400 M0 376 H400"/>
      </g>
      <!-- 컵받침 · 컵 (위에서 본 느낌) -->
      <g filter="url(#cfShadow${id})">
        <circle cx="176" cy="214" r="104" fill="#FFFFFF" opacity="0.75"/>
        <circle cx="176" cy="214" r="88" fill="#F8FAFC"/>
        <circle cx="176" cy="214" r="78" fill="url(#cfCoffee${id})"/>
        <circle cx="176" cy="214" r="70" fill="#C98452" opacity="0.55"/>
      </g>
      <!-- 라떼아트 하트 -->
      <path d="M176 190 c-12 -18, -34 -6, -22 12 c8 12, 22 22, 22 22 c0 0, 14 -10, 22 -22 c12 -18, -10 -30, -22 -12 z"
            fill="#FDF6EC" opacity="0.95"/>
      <path d="M176 196 c-7 -11, -20 -4, -13 7 c5 7, 13 13, 13 13" fill="none" stroke="#C98452" stroke-width="2" opacity="0.6"/>
      <!-- 손잡이 -->
      <path d="M258 196 a30 30 0 0 1 0 44" fill="none" stroke="#F8FAFC" stroke-width="14"/>
      <!-- 크로와상 -->
      <g transform="translate(300 268) rotate(-12)">
        <path d="M-46 12 C-50 -14, -16 -24, 0 -8 C16 -24, 50 -14, 46 12 C28 6, 12 2, 0 18 C-12 2, -28 6, -46 12 Z"
              fill="#D97706"/>
        <path d="M-40 8 C-42 -8, -18 -16, -2 -2 C-18 4, -30 4, -40 8 Z" fill="#FBBF24" opacity="0.9"/>
        <path d="M40 8 C42 -8, 18 -16, 2 -2 C18 4, 30 4, 40 8 Z" fill="#FBBF24" opacity="0.9"/>
        <path d="M-12 0 C-6 -10, 6 -10, 12 0" fill="none" stroke="#B45309" stroke-width="2.4" opacity="0.6"/>
      </g>
    `,

    /* 13. 영화관 — 팝콘 · 티켓 · 스크린 빛 */
    cinema_film: (id) => `
      <defs>
        <linearGradient id="cnBg${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4C0519"/><stop offset="45%" stop-color="#1E1B4B"/><stop offset="100%" stop-color="#0B1120"/>
        </linearGradient>
        <linearGradient id="cnBeam${id}" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stop-color="#FCD34D" stop-opacity="0.55"/><stop offset="100%" stop-color="#FCD34D" stop-opacity="0"/>
        </linearGradient>
        <filter id="cnShadow${id}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.55"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#cnBg${id})"/>
      <!-- 스크린 -->
      <rect x="66" y="34" width="268" height="118" rx="8" fill="#F8FAFC" opacity="0.92"/>
      <rect x="66" y="34" width="268" height="118" rx="8" fill="#FCD34D" opacity="0.12"/>
      <g opacity="0.5" fill="#1E293B">
        <rect x="92" y="58" width="94" height="8" rx="4"/>
        <rect x="92" y="76" width="62" height="6" rx="3"/>
      </g>
      <circle cx="296" cy="78" r="16" fill="#1E293B" opacity="0.25"/>
      <polygon points="292,71 292,85 304,78" fill="#0F172A" opacity="0.6"/>
      <!-- 빛줄기 -->
      <polygon points="176,152 224,152 320,330 80,330" fill="url(#cnBeam${id})"/>
      <!-- 좌석 등받이 -->
      <rect x="0" y="316" width="400" height="84" fill="#450A0A"/>
      <g opacity="0.5" stroke="#7F1D1D" stroke-width="3">
        <path d="M0 340 H400 M0 368 H400"/>
      </g>
      <!-- 팝콘 -->
      <g filter="url(#cnShadow${id})">
        <path d="M96 236 L118 340 H206 L228 236 Z" fill="#F8FAFC"/>
        <path d="M96 236 L118 340 H206 L228 236 Z" fill="#FCD34D" opacity="0.25"/>
        <g fill="#EF4444">
          <path d="M96 236 L228 236 L222 258 L102 258 Z"/>
        </g>
        <g fill="#FDE68A">
          <circle cx="116" cy="230" r="14"/><circle cx="140" cy="218" r="16"/>
          <circle cx="166" cy="226" r="15"/><circle cx="192" cy="216" r="14"/>
          <circle cx="210" cy="232" r="13"/><circle cx="154" cy="238" r="12"/>
        </g>
        <g fill="#FFFFFF" opacity="0.85">
          <circle cx="134" cy="214" r="6"/><circle cx="180" cy="224" r="5"/><circle cx="120" cy="236" r="4"/>
        </g>
      </g>
      <!-- 티켓 2장 -->
      <g transform="translate(250 250) rotate(9)" filter="url(#cnShadow${id})">
        <rect x="0" y="0" width="118" height="60" rx="8" fill="#F8FAFC"/>
        <rect x="0" y="0" width="26" height="60" rx="8" fill="#EF4444"/>
        <g fill="#0F172A" opacity="0.7">
          <rect x="36" y="14" width="66" height="7" rx="3.5"/>
          <rect x="36" y="28" width="48" height="6" rx="3"/>
          <rect x="36" y="42" width="30" height="5" rx="2.5"/>
        </g>
      </g>
      <g transform="translate(266 316) rotate(-6)" opacity="0.9">
        <rect x="0" y="0" width="104" height="30" rx="6" fill="#FDE68A"/>
      </g>
    `,

    /* 14. 보드게임 테이블 — 미플 · 주사위 · 카드 */
    boardgame_table: (id) => `
      <defs>
        <linearGradient id="bgBg${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F5F5F4"/><stop offset="60%" stop-color="#E7E5E4"/><stop offset="100%" stop-color="#D6D3D1"/>
        </linearGradient>
        <linearGradient id="bgBoard${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FEF3C7"/><stop offset="100%" stop-color="#FDE68A"/>
        </linearGradient>
        <filter id="bgShadow${id}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#44403C" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#bgBg${id})"/>
      <g opacity="0.25" stroke="#A8A29E" stroke-width="1.5">
        <path d="M0 40 H400 M0 80 H400 M0 320 H400 M0 360 H400"/>
      </g>
      <!-- 게임 보드 -->
      <g filter="url(#bgShadow${id})">
        <rect x="40" y="92" width="320" height="216" rx="12" fill="url(#bgBoard${id})" stroke="#D97706" stroke-width="2"/>
      </g>
      <!-- 육각 타일 -->
      <g opacity="0.85">
        ${[[92, 140, '#86EFAC'], [140, 132, '#FCD34D'], [188, 140, '#93C5FD'], [236, 132, '#FCA5A5'], [284, 142, '#A7F3D0'],
           [116, 186, '#FDE68A'], [164, 182, '#BBF7D0'], [212, 188, '#FBCFE8'], [260, 180, '#BAE6FD']]
          .map(([x, y, c]) => `<polygon points="${x},${y - 20} ${x + 17},${y - 10} ${x + 17},${y + 10} ${x},${y + 20} ${x - 17},${y + 10} ${x - 17},${y - 10}"
              fill="${c}" stroke="#92400E" stroke-width="1.4" opacity="0.85"/>`).join('')}
      </g>
      <!-- 미플 -->
      <g filter="url(#bgShadow${id})">
        <g transform="translate(112 258)">
          <circle cx="0" cy="-14" r="9" fill="#DC2626"/>
          <path d="M-9 0 h18 l5 34 h-28 z" fill="#EF4444"/>
        </g>
        <g transform="translate(170 250)">
          <circle cx="0" cy="-14" r="9" fill="#2563EB"/>
          <path d="M-9 0 h18 l5 34 h-28 z" fill="#3B82F6"/>
        </g>
        <g transform="translate(228 262)">
          <circle cx="0" cy="-14" r="9" fill="#059669"/>
          <path d="M-9 0 h18 l5 34 h-28 z" fill="#10B981"/>
        </g>
      </g>
      <!-- 주사위 -->
      <g filter="url(#bgShadow${id})">
        <rect x="272" y="232" width="52" height="52" rx="10" fill="#FFFFFF"/>
        <g fill="#1C1917">
          <circle cx="286" cy="246" r="4"/><circle cx="310" cy="270" r="4"/><circle cx="298" cy="258" r="4"/>
        </g>
      </g>
      <!-- 카드 패 -->
      <g>
        <rect x="56" y="26" width="54" height="76" rx="7" fill="#FFFFFF" stroke="#D6D3D1" transform="rotate(-8 83 64)"/>
        <rect x="76" y="22" width="54" height="76" rx="7" fill="#FFFFFF" stroke="#D6D3D1" transform="rotate(6 103 60)"/>
        <rect x="96" y="26" width="54" height="76" rx="7" fill="#F8FAFC" stroke="#A8A29E"/>
        <path d="M123 52 c-7 -10 -19 -4 -12 6 l12 12 l12 -12 c7 -10 -5 -16 -12 -6 z" fill="#EF4444" opacity="0.8"/>
      </g>
    `,

    /* 15. 수영장 — 레인 · 물살 · 고글 */
    swimming_pool: (id) => `
      <defs>
        <linearGradient id="swBg${id}" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stop-color="#67E8F9"/><stop offset="45%" stop-color="#22D3EE"/><stop offset="100%" stop-color="#0E7490"/>
        </linearGradient>
        <filter id="swRipple${id}" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#swBg${id})"/>
      <!-- 물 포면 결 -->
      <g stroke="#ECFEFF" stroke-width="2.5" opacity="0.35" filter="url(#swRipple${id})">
        ${[44, 92, 140, 188, 236, 284, 332, 380].map((y, i) =>
          `<path d="M0 ${y} q25 -10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0"/>`).join('')}
      </g>
      <!-- 레인 로프 4줄 -->
      <g>
        ${[112, 196, 280].map((y) => `
          <line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#0E7490" stroke-width="2" opacity="0.35"/>
          ${[16, 56, 96, 136, 176, 216, 256, 296, 336, 376].map((x, i) =>
            `<circle cx="${x}" cy="${y}" r="7.5" fill="${i % 2 ? '#10B981' : '#F8FAFC'}" opacity="0.9"/>`).join('')}
        `).join('')}
      </g>
      <!-- 수영하는 사람 (상반신 · 물보라) -->
      <g transform="translate(200 240)">
        <ellipse cx="0" cy="12" rx="74" ry="26" fill="#ECFEFF" opacity="0.22"/>
        <circle cx="6" cy="-4" r="15" fill="#0F172A"/>
        <path d="M-46 -8 q26 -22 52 -6" fill="none" stroke="#0F172A" stroke-width="11" stroke-linecap="round"/>
        <path d="M-52 -8 l-18 -12" stroke="#0F172A" stroke-width="9" stroke-linecap="round"/>
        <path d="M20 10 q26 6 44 22" stroke="#0F172A" stroke-width="9" fill="none" stroke-linecap="round"/>
        <!-- 고글 -->
        <rect x="-2" y="-8" width="22" height="9" rx="4.5" fill="#FBBF24"/>
        <g stroke="#ECFEFF" stroke-width="3" opacity="0.85">
          <path d="M-60 -20 q10 -10 20 0"/><path d="M58 30 q9 -9 18 0"/><path d="M-70 20 q8 -8 16 0"/>
        </g>
      </g>
      <!-- 턴 표지판 -->
      <g transform="translate(322 40)">
        <rect x="-34" y="0" width="68" height="34" rx="8" fill="#0F172A" opacity="0.85"/>
      </g>
    `,

    /* 16. 볼더링 월 — 홀드 · 분필 · 매트 */
    climbing_boulder: (id) => `
      <defs>
        <linearGradient id="cbBg${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1E293B"/><stop offset="55%" stop-color="#334155"/><stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
        <radialGradient id="cbLight${id}" cx="0.25" cy="0.1" r="0.7">
          <stop offset="0%" stop-color="#F8FAFC" stop-opacity="0.28"/><stop offset="100%" stop-color="#F8FAFC" stop-opacity="0"/>
        </radialGradient>
        <filter id="cbShadow${id}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity="0.5"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#cbBg${id})"/>
      <rect width="400" height="400" fill="url(#cbLight${id})"/>
      <!-- 패널 이음선 -->
      <g stroke="#0F172A" stroke-width="2" opacity="0.55">
        <path d="M0 86 H400 M0 176 H400 M0 266 H400"/>
        <path d="M120 0 V320 M240 0 V320 M360 0 V320"/>
      </g>
      <!-- 볼륨 형태 -->
      <g fill="#475569" opacity="0.55">
        <polygon points="0,0 150,0 120,110 0,150"/>
        <polygon points="250,300 400,250 400,320 280,320"/>
      </g>
      <!-- 루트 -->
      <path d="M74 300 C120 268, 96 214, 158 190 C214 168, 190 116, 258 96 C306 82, 322 60, 348 44"
            fill="none" stroke="#F8FAFC" stroke-width="2.5" stroke-dasharray="9 10" opacity="0.5"/>
      <!-- 홀드 -->
      <g filter="url(#cbShadow${id})">
        <ellipse cx="74" cy="300" rx="24" ry="16" fill="#F97316"/>
        <ellipse cx="118" cy="262" rx="17" ry="12" fill="#22D3EE"/>
        <ellipse cx="150" cy="204" rx="22" ry="15" fill="#F97316"/>
        <ellipse cx="196" cy="162" rx="15" ry="11" fill="#FACC15"/>
        <ellipse cx="246" cy="118" rx="21" ry="14" fill="#A3E635"/>
        <ellipse cx="304" cy="82" rx="16" ry="11" fill="#22D3EE"/>
        <ellipse cx="346" cy="48" rx="12" ry="9" fill="#FACC15"/>
        <ellipse cx="300" cy="196" rx="14" ry="10" fill="#F472B6"/>
        <ellipse cx="214" cy="252" rx="13" ry="9" fill="#A3E635"/>
      </g>
      <g opacity="0.4" stroke="#F8FAFC" stroke-width="1.8">
        <path d="M106 252 q10 12 26 4"/><path d="M278 108 q12 10 22 2"/>
      </g>
      <!-- 매트 -->
      <rect x="0" y="320" width="400" height="80" fill="#0B1220"/>
      <rect x="0" y="320" width="400" height="16" rx="6" fill="#1E40AF" opacity="0.75"/>
      <g stroke="#1E40AF" stroke-width="2" opacity="0.35">
        <path d="M0 356 H400 M0 380 H400"/>
      </g>
    `,

    /* 17. 러닝 트랙 — 육상 트랙 · 스톱워치 */
    running_track: (id) => `
      <defs>
        <linearGradient id="rtBg${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FDBA74"/><stop offset="45%" stop-color="#FB923C"/><stop offset="100%" stop-color="#C2410C"/>
        </linearGradient>
        <linearGradient id="rtSky${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1E3A8A"/><stop offset="100%" stop-color="#F59E0B"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#rtBg${id})"/>
      <!-- 노을 -->
      <rect x="0" y="0" width="400" height="96" fill="url(#rtSky${id})" opacity="0.85"/>
      <circle cx="300" cy="86" r="30" fill="#FEF3C7" opacity="0.9"/>
      <!-- 트랙 레인 -->
      <g stroke="#FFF7ED" stroke-width="4" opacity="0.75">
        ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M-20 ${120 + i * 46} H420"/>`).join('')}
      </g>
      <g stroke="#FED7AA" stroke-width="1.5" opacity="0.2">
        ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M-20 ${142 + i * 46} H420"/>`).join('')}
      </g>
      <!-- 결상선 -->
      <g opacity="0.8">
        <rect x="0" y="104" width="34" height="250" fill="#F8FAFC" opacity="0.15"/>
        ${[0, 1, 2, 3, 4].map((i) => `<rect x="0" y="${108 + i * 50}" width="34" height="25" fill="#0F172A" opacity="0.5"/>`).join('')}
      </g>
      <!-- 스톱워치 -->
      <g transform="translate(276 236)">
        <circle cx="0" cy="0" r="56" fill="#0F172A" opacity="0.9"/>
        <circle cx="0" cy="0" r="46" fill="#F8FAFC"/>
        <circle cx="0" cy="0" r="40" fill="#E2E8F0" opacity="0.5"/>
        <rect x="-4" y="-66" width="8" height="12" rx="3" fill="#0F172A"/>
        <rect x="-3" y="-50" width="6" height="12" rx="2" fill="#EF4444"/>
        <path d="M0 0 L0 -30" stroke="#EF4444" stroke-width="3" stroke-linecap="round" transform="rotate(38)"/>
      </g>
      <!-- 러너 실루엣 -->
      <g transform="translate(120 300)" fill="#0F172A" opacity="0.9">
        <circle cx="0" cy="-70" r="12"/>
        <path d="M-12 -58 h24 l6 30 h-36 z"/>
        <path d="M-14 -26 l-18 28" stroke="#0F172A" stroke-width="8" stroke-linecap="round"/>
        <path d="M10 -26 l22 24" stroke="#0F172A" stroke-width="8" stroke-linecap="round"/>
        <path d="M-10 -60 l-24 14" stroke="#0F172A" stroke-width="7" stroke-linecap="round"/>
        <path d="M10 -60 l24 -8" stroke="#0F172A" stroke-width="7" stroke-linecap="round"/>
      </g>
    `,

    /* 18. 덤벨 랙 — 헬스장 커버용 (라벨 없이 실루엣만, 모임 카드 커버에 적합) */
    dumbbell: (id) => `
      <defs>
        <linearGradient id="dbBg${id}" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stop-color="#0B1220"/><stop offset="60%" stop-color="#152436"/><stop offset="100%" stop-color="#0F172A"/>
        </linearGradient>
        <radialGradient id="dbGlow${id}" cx="0.5" cy="0.3" r="0.62">
          <stop offset="0%" stop-color="#10B981" stop-opacity="0.3"/><stop offset="100%" stop-color="#10B981" stop-opacity="0"/>
        </radialGradient>
        <filter id="dbShadow${id}" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity="0.45"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#dbBg${id})"/>
      <rect width="400" height="400" fill="url(#dbGlow${id})"/>
      <!-- 바닥 -->
      <rect x="0" y="292" width="400" height="108" fill="#070C16"/>
      <line x1="0" y1="292" x2="400" y2="292" stroke="#1B2A3F" stroke-width="3"/>
      <!-- 랙 -->
      <g stroke="#3F4E63" stroke-width="9" stroke-linecap="round">
        <line x1="56" y1="292" x2="56" y2="214"/>
        <line x1="344" y1="292" x2="344" y2="214"/>
      </g>
      <line x1="56" y1="222" x2="344" y2="222" stroke="#55657C" stroke-width="7" stroke-linecap="round"/>
      <!-- 덤벨 3단 -->
      <g filter="url(#dbShadow${id})">
        ${[
          { x: 94, y: 198, s: 0.58 },
          { x: 200, y: 194, s: 0.68 },
          { x: 306, y: 198, s: 0.58 }
        ].map((d) => `
          <g transform="translate(${d.x} ${d.y}) scale(${d.s})">
            <rect x="-34" y="-4" width="68" height="8" rx="4" fill="#94A3B8"/>
            <rect x="-47" y="-19" width="14" height="38" rx="6" fill="#10B981"/>
            <rect x="33" y="-19" width="14" height="38" rx="6" fill="#10B981"/>
            <rect x="-60" y="-13" width="10" height="26" rx="5" fill="#047857"/>
            <rect x="50" y="-13" width="10" height="26" rx="5" fill="#047857"/>
          </g>`).join('')}
      </g>
      <!-- 벤치 실루엣 -->
      <g opacity="0.9">
        <rect x="132" y="262" width="136" height="14" rx="7" fill="#16233A"/>
        <rect x="150" y="276" width="9" height="26" fill="#1E2F45"/>
        <rect x="241" y="276" width="9" height="26" fill="#1E2F45"/>
      </g>
      <ellipse cx="200" cy="306" rx="150" ry="14" fill="#10B981" opacity="0.08"/>
    `,

    /* 10. 오운완 셀피 (거울 앞 상반신 · 얼굴은 폰으로 가림 → 프라이버시) */
    selfie: (id) => `
      <defs>
        <linearGradient id="sfBg${id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ECFDF5"/><stop offset="45%" stop-color="#D1FAE5"/><stop offset="100%" stop-color="#A7F3D0"/>
        </linearGradient>
        <linearGradient id="sfBody${id}" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stop-color="#134E4A"/><stop offset="55%" stop-color="#0B2B28"/><stop offset="100%" stop-color="#041F1C"/>
        </linearGradient>
        <filter id="sfShadow${id}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#064E3B" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect width="400" height="400" fill="url(#sfBg${id})"/>
      <circle cx="336" cy="52" r="120" fill="#FFFFFF" opacity="0.35"/>
      <!-- 거울 -->
      <rect x="66" y="24" width="268" height="330" rx="26" fill="#FFFFFF" filter="url(#sfShadow${id})"/>
      <rect x="78" y="36" width="244" height="306" rx="18" fill="#0B1220"/>
      <rect x="78" y="36" width="244" height="306" rx="18" fill="url(#sfBg${id})" opacity="0.08"/>
      <!-- 상반신 실루엣 -->
      <path d="M96 342 C104 256 146 214 200 214 C254 214 296 256 304 342 Z" fill="url(#sfBody${id})"/>
      <ellipse cx="200" cy="150" rx="42" ry="48" fill="#0F172A"/>
      <!-- 목 -->
      <rect x="184" y="188" width="32" height="34" rx="14" fill="#0B2B28"/>
      <!-- 어깨 림라이트 -->
      <path d="M112 300 C122 246 154 216 196 212" fill="none" stroke="#34D399" stroke-width="4" opacity="0.55" stroke-linecap="round"/>
      <path d="M288 300 C278 246 246 216 204 212" fill="none" stroke="#10B981" stroke-width="3" opacity="0.35" stroke-linecap="round"/>
      <!-- 팔 -->
      <path d="M126 268 Q136 236 170 226" fill="none" stroke="#0B2B28" stroke-width="26" stroke-linecap="round"/>
      <path d="M274 268 Q264 236 230 226" fill="none" stroke="#0B2B28" stroke-width="26" stroke-linecap="round"/>
      <!-- 폰 (얼굴 가림) -->
      <rect x="164" y="104" width="72" height="126" rx="12" fill="#020617" stroke="#334155" stroke-width="2"/>
      <rect x="171" y="112" width="58" height="104" rx="7" fill="#0F172A"/>
      <circle cx="200" cy="122" r="3.4" fill="#34D399"/>
      <rect x="186" y="212" width="28" height="5" rx="2.5" fill="#1E293B"/>
      <!-- 바닥 -->
      <rect x="78" y="330" width="244" height="12" fill="#0F766E" opacity="0.25"/>
      ${txt(24, 372, '성수 레벨업 · 19:10', 13, '#047857', 800)}
    `
  };

  /* ------------------------------------------------------------------------
   * Sprint 9 — SVG 일러스트 캐시 (렌더·스크롤·필터 전환마다 같은 그림을 다시 만들지 않는다)
   *  · 그림은 (프리셋, id 접미사)로 완전히 결정된다. 접미사는 카드 id라 재렌더에도 같다.
   *  · 마크업 문자열을 기억해 두고 그대로 돌려준다. 그라디언트 id가 겹치지 않게
   *    접미사를 유지하는 것이 핵심이다(같은 그림을 여러 장 그려도 서로 간섭 없음).
   *  · 메모리가 무한정 늘지 않도록 오래된 항목부터 버린다(LRU 대용 FIFO).
   * ---------------------------------------------------------------------- */
  const MARKUP_CACHE = new Map();
  const MARKUP_CACHE_LIMIT = 600;

  /** 미디어 마크업 생성 — 카드/썸네일 어디서든 1:1 비율로 꽉 찬다. */
  function render(presetKey, idSuffix) {
    const key = ART[presetKey] ? presetKey : 'selfie';
    const id = String(idSuffix || Math.random().toString(36).slice(2, 7)).replace(/[^a-zA-Z0-9]/g, '');
    const cacheKey = `${key}|${id}`;
    const cached = MARKUP_CACHE.get(cacheKey);
    if (cached) return cached;
    const markup = `<svg class="media-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"
                 role="img" aria-label="${labelOf(key)}" xmlns="http://www.w3.org/2000/svg">
              ${ART[key](id)}
            </svg>`;
    MARKUP_CACHE.set(cacheKey, markup);
    if (MARKUP_CACHE.size > MARKUP_CACHE_LIMIT) {
      const oldest = MARKUP_CACHE.keys().next().value;
      MARKUP_CACHE.delete(oldest);
    }
    return markup;
  }

  /** 캐시 통계(성능 점검·테스트용) */
  function cacheStats() {
    return { size: MARKUP_CACHE.size, limit: MARKUP_CACHE_LIMIT };
  }

  function labelOf(presetKey) {
    const found = PRESETS.find((p) => p.key === presetKey);
    return found ? found.label : '오운완 인증';
  }

  function emojiOf(presetKey) {
    const found = PRESETS.find((p) => p.key === presetKey);
    return found ? found.emoji : '📷';
  }

  /* ------------------------------------------------------------------------
   * Sprint 10 — 빈 상태(empty state) 전용 일러스트 (디자인 4차)
   * ------------------------------------------------------------------------
   *  · "아직 아무 것도 없어요" 자리에 회색 이모지 하나만 두면 화면이 비어 보인다.
   *    탐색·알림함·활동 로그·채팅의 빈 상태에 같은 톤의 선화 한 장을 깔아 준다.
   *  · 색은 앱의 애메랄드(#10B981) + 옅은 그레이(#CBD5E1) + 흰 바탕만 —
   *    빈 화면이 시끄럽지 않게, 그러나 무엇을 하면 되는지는 보이게.
   *  · kind: explore | search | radius | notifications | activity | chat | feed | applications
   *  · 마크업은 kind 당 한 번만 만들고 재사용한다(캐시).
   * ---------------------------------------------------------------------- */
  const EMPTY_ART = {
    /* 탐색 — 비어 있는 기둥 카드 + 점선 안내 */
    explore: () => `
      <rect x="26" y="30" width="44" height="58" rx="9" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
      <rect x="78" y="42" width="44" height="66" rx="9" fill="#ECFDF5" stroke="#6EE7B7" stroke-width="2"/>
      <rect x="130" y="26" width="44" height="52" rx="9" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
      <path d="M36 68h24M88 84h24M140 56h24" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>
      <path d="M88 62h24" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>
      <path d="M58 108h84" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round" stroke-dasharray="7 7"/>
      <circle cx="158" cy="104" r="13" fill="#FFFFFF" stroke="#10B981" stroke-width="2.5"/>
      <path d="M150 104h16M158 96v16" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>`,
    /* 검색 — 돋보기 + 결과 없음 점선 */
    search: () => `
      <circle cx="88" cy="58" r="30" fill="#ECFDF5" stroke="#10B981" stroke-width="3"/>
      <path d="M110 80l24 24" stroke="#10B981" stroke-width="5" stroke-linecap="round"/>
      <path d="M74 50c10-10 24-8 30 2" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <path d="M30 118h140" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round" stroke-dasharray="8 9"/>
      <circle cx="150" cy="42" r="4" fill="#A7F3D0"/>`,
    /* 내 동네 반경 — 동심원 + 핀 */
    radius: () => `
      <circle cx="86" cy="78" r="52" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="6 7"/>
      <circle cx="86" cy="78" r="33" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="2" stroke-dasharray="5 6"/>
      <circle cx="86" cy="78" r="14" fill="#10B981" opacity="0.14"/>
      <path d="M86 48c-9 0-16 7-16 16 0 12 16 26 16 26s16-14 16-26c0-9-7-16-16-16z"
            fill="#FFFFFF" stroke="#10B981" stroke-width="3"/>
      <circle cx="86" cy="64" r="5" fill="#10B981"/>
      <path d="M150 106h22M150 96h12" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>`,
    /* 알림함 — 조용한 종 + 안 읽은 점 */
    notifications: () => `
      <path d="M62 84c0-26 10-40 32-40s32 14 32 40" fill="#ECFDF5" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>
      <path d="M48 88c0-8 6-10 14-10h64c8 0 14 2 14 10 0 5-3 8-8 8H56c-5 0-8-3-8-8z"
            fill="#FFFFFF" stroke="#10B981" stroke-width="3" stroke-linejoin="round"/>
      <path d="M84 104a12 12 0 0 0 20 0" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>
      <circle cx="126" cy="56" r="7" fill="#10B981"/>
      <path d="M152 100h18M152 110h10" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round"/>`,
    /* 활동 로그 — 체크된 목록 시트 */
    activity: () => `
      <rect x="46" y="24" width="108" height="96" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2.5"/>
      <rect x="58" y="38" width="40" height="6" rx="3" fill="#E2E8F0"/>
      <circle cx="66" cy="62" r="7" fill="#ECFDF5" stroke="#10B981" stroke-width="2"/>
      <path d="M62.5 62l2.6 2.6 4.4-5" stroke="#10B981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M82 62h50" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>
      <circle cx="66" cy="82" r="7" fill="#ECFDF5" stroke="#10B981" stroke-width="2"/>
      <path d="M62.5 82l2.6 2.6 4.4-5" stroke="#10B981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M82 82h42" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>
      <path d="M60 100h52" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 6"/>`,
    /* 알림/채팅 — 빈 대화 풍선 두 개 */
    chat: () => `
      <path d="M34 46h78a12 12 0 0 1 12 12v30a12 12 0 0 1-12 12H62l-18 14v-14h-10a12 12 0 0 1-12-12V58a12 12 0 0 1-12-12z"
            fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M48 66h48M48 82h30" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>
      <path d="M112 58h44a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10h-6l-14 11v-11h-24a10 10 0 0 1-10-10V68a10 10 0 0 1 10-10z"
            fill="#ECFDF5" stroke="#10B981" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="128" cy="80" r="3.2" fill="#10B981"/>
      <circle cx="140" cy="80" r="3.2" fill="#10B981"/>
      <circle cx="152" cy="80" r="3.2" fill="#10B981"/>`,
    /* 피드 — 액자 */
    feed: () => `
      <rect x="40" y="26" width="120" height="88" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2.5"/>
      <rect x="52" y="38" width="96" height="52" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
      <circle cx="72" cy="56" r="6" fill="#ECFDF5" stroke="#10B981" stroke-width="2"/>
      <path d="M62 84l20-18 16 14 12-10 16 14" fill="none" stroke="#A7F3D0" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M58 102h52" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>`,
    /* 가입 신청 현황 — 빈 우편함 */
    applications: () => `
      <rect x="40" y="48" width="120" height="70" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2.5"/>
      <path d="M40 60l60 34 60-34" fill="none" stroke="#CBD5E1" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M40 112l34-28M160 112l-34-28" stroke="#E2E8F0" stroke-width="2.5"/>
      <circle cx="150" cy="44" r="11" fill="#ECFDF5" stroke="#10B981" stroke-width="2.5"/>
      <path d="M150 39v6M150 49v.6" stroke="#10B981" stroke-width="2.2" stroke-linecap="round"/>`
  };
  const EMPTY_CACHE = new Map();

  /** 빈 상태 일러스트 — 마크업 문자열을 돌려준다(가운데 정렬·반응형). */
  function emptyState(kind) {
    const key = EMPTY_ART[kind] ? kind : 'explore';
    if (EMPTY_CACHE.has(key)) return EMPTY_CACHE.get(key);
    const markup = `<svg class="empty-illustration" viewBox="0 0 200 140" fill="none"
                      aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
        ${EMPTY_ART[key]()}
      </svg>`;
    EMPTY_CACHE.set(key, markup);
    return markup;
  }

  window.OogMedia = { render, labelOf, emojiOf, PRESETS, cacheStats, emptyState };
})();
