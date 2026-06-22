/**
 * seed.js — Fermata 목업 데이터 시드 스크립트
 *
 * 사용법: 앱이 열린 브라우저 탭의 DevTools 콘솔에 이 파일 전체를 붙여넣고 실행
 * 또는: 아무 탭에서나 실행 후 앱 탭으로 이동해 새로고침 (같은 origin이면 공유됨)
 *
 * 실행하면 기존 reports/clusters 데이터를 덮어씁니다.
 *
 * ─── 시나리오 개요 ────────────────────────────────────────────
 *  기준점: 협성대학교 (37.21246, 126.95270) — 경기 화성시 봉담읍
 *
 *  클러스터 7개 / 제보 15건
 *  모든 위치는 캠퍼스 반경 ~500m 이내에 집중
 *
 *  [A] 싱크홀 군집 (high, road)       — 협성대 정문 앞 보도
 *      제보 3건: 처음 발견 → 확대 → 추가 균열
 *  [B] 침수 군집 (high, weather)      — 캠퍼스 진입로 저지대
 *      제보 2건: 침수 시작 → 완전 침수
 *  [C] 가로등 고장 군집 (medium, facility) — 후문 쪽 골목
 *      제보 2건: 처음 신고 → 이틀 후 재신고
 *  [D] 포트홀 군집 (medium, road)     — 캠퍼스 내 순환도로
 *      제보 2건: 작은 파임 → 큰 파손
 *  [E] 어두운 골목 (low, safety)      — 기숙사 뒷길
 *      제보 1건: 단독 제보
 *  [F] 보도블록 파손 (low, facility)  — 정문~버스정류장 보행로
 *      제보 2건
 *  [G] 낙석 위험 (high, road)         — 캠퍼스 북측 언덕길
 *      제보 3건: 잇따른 신고
 * ─────────────────────────────────────────────────────────────
 */

;(function () {
  // ── 헬퍼 ──────────────────────────────────────────────────

  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
  }

  /** 지금으로부터 n시간 전 timestamp */
  function hoursAgo(n) { return Date.now() - n * 60 * 60 * 1000 }
  /** 지금으로부터 n일 전 timestamp */
  function daysAgo(n)  { return Date.now() - n * 24 * 60 * 60 * 1000 }

  // ── 더미 이미지 (색상 블록 SVG → data URI) ──────────────
  // 실제 사진이 없으므로 카테고리별 색상 블록 + 아이콘 텍스트로 대체
  // 형식: image/webp 대신 image/svg+xml (base64) — 앱에서 <img src=...> 로 표시됨

  function makeDummyImage(bgColor, label, sublabel) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
  <rect width="400" height="300" fill="${bgColor}"/>
  <rect x="0" y="0" width="400" height="300" fill="black" opacity="0.35"/>
  <text x="200" y="130" font-family="sans-serif" font-size="52" text-anchor="middle" fill="white">${label}</text>
  <text x="200" y="185" font-family="sans-serif" font-size="22" text-anchor="middle" fill="rgba(255,255,255,0.85)">${sublabel}</text>
</svg>`
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  }

  const IMG = {
    sinkhole1  : makeDummyImage('#7f1d1d', '🕳️', '싱크홀 발견'),
    sinkhole2  : makeDummyImage('#991b1b', '🕳️', '균열 확대'),
    sinkhole3  : makeDummyImage('#b91c1c', '🕳️', '추가 균열'),
    flood1     : makeDummyImage('#1e3a5f', '🌊', '침수 시작'),
    flood2     : makeDummyImage('#1e40af', '🌊', '완전 침수'),
    streetLight: makeDummyImage('#1c1917', '🔦', '가로등 고장'),
    pothole1   : makeDummyImage('#44403c', '🚧', '포트홀 발견'),
    pothole2   : makeDummyImage('#292524', '🚧', '포트홀 확대'),
    darkAlley  : makeDummyImage('#0f172a', '🌑', '어두운 골목'),
    sidewalk1  : makeDummyImage('#365314', '🧱', '보도블록 파손'),
    sidewalk2  : makeDummyImage('#3f6212', '🧱', '추가 파손'),
    rockfall1  : makeDummyImage('#78350f', '🪨', '낙석 위험'),
    rockfall2  : makeDummyImage('#92400e', '🪨', '낙석 추가'),
    rockfall3  : makeDummyImage('#a16207', '🪨', '대형 낙석'),
    gasLeak    : makeDummyImage('#14532d', '⚠️', '가스 냄새'),
  }

  // ── ID 사전 생성 ──────────────────────────────────────────

  const IDS = {
    // 제보 ID
    r: Array.from({ length: 15 }, uuid),
    // 클러스터 ID
    c: Array.from({ length: 7 },  uuid),
  }

  // ── 제보 (Report) 15건 ────────────────────────────────────
  //
  //  각 필드:
  //    id, clusterId, title, description, imageBase64,
  //    location: { lat, lng, address },
  //    danger, category, createdAt

  const reports = [

    // ── [A] 싱크홀 군집 ─ 3건 ──────────────────────────────
    // 협성대 정문 앞 보도 (37.21320, 126.95190)
    {
      id:          IDS.r[0],
      clusterId:   IDS.c[0],
      title:       '협성대 정문 앞 보도 싱크홀 발견',
      description: '정문 앞 보도 중앙에 직경 약 30cm 크기의 구멍이 생겼습니다. 등하교 학생들이 많아 즉각 조치가 필요합니다.',
      imageBase64: IMG.sinkhole1,
      location:    { lat: 37.21320, lng: 126.95190, address: '경기 화성시 봉담읍 협성로 남문 앞' },
      danger:      'high',
      category:    'road',
      createdAt:   daysAgo(3),
    },
    {
      id:          IDS.r[1],
      clusterId:   IDS.c[0],
      title:       '협성대 정문 보도 싱크홀 균열 확대',
      description: '어제보다 구멍이 직경 50cm 이상으로 커졌고 주변 아스팔트에도 균열이 생겼습니다. 함몰 위험이 높습니다.',
      imageBase64: IMG.sinkhole2,
      location:    { lat: 37.21322, lng: 126.95192, address: '경기 화성시 봉담읍 협성로 남문 앞' },
      danger:      'high',
      category:    'road',
      createdAt:   daysAgo(2),
    },
    {
      id:          IDS.r[2],
      clusterId:   IDS.c[0],
      title:       '협성대 정문 인근 추가 균열 발생',
      description: '기존 싱크홀 북쪽 2m 지점에 새로운 균열이 발생했습니다. 지반 침하가 넓은 범위에 걸쳐 진행 중인 것 같습니다.',
      imageBase64: IMG.sinkhole3,
      location:    { lat: 37.21325, lng: 126.95188, address: '경기 화성시 봉담읍 협성로 남문 앞' },
      danger:      'high',
      category:    'road',
      createdAt:   hoursAgo(8),
    },

    // ── [B] 침수 군집 ─ 2건 ────────────────────────────────
    // 캠퍼스 진입로 저지대 (37.21180, 126.95350)
    {
      id:          IDS.r[3],
      clusterId:   IDS.c[1],
      title:       '협성대 진입로 저지대 침수 시작',
      description: '강우로 진입로 가장 낮은 구간에 물이 차기 시작했습니다. 차량 통행에 주의가 필요합니다.',
      imageBase64: IMG.flood1,
      location:    { lat: 37.21180, lng: 126.95350, address: '경기 화성시 봉담읍 협성대 진입로' },
      danger:      'high',
      category:    'weather',
      createdAt:   hoursAgo(5),
    },
    {
      id:          IDS.r[4],
      clusterId:   IDS.c[1],
      title:       '협성대 진입로 완전 침수 — 통행 불가',
      description: '진입로 전 구간이 침수되어 차량과 사람 모두 통행이 불가합니다. 우수관 역류로 홍수 범람 상태입니다.',
      imageBase64: IMG.flood2,
      location:    { lat: 37.21182, lng: 126.95353, address: '경기 화성시 봉담읍 협성대 진입로' },
      danger:      'high',
      category:    'weather',
      createdAt:   hoursAgo(3),
    },

    // ── [C] 가로등 고장 군집 ─ 2건 ─────────────────────────
    // 후문 골목 (37.21150, 126.95130)
    {
      id:          IDS.r[5],
      clusterId:   IDS.c[2],
      title:       '협성대 후문 골목 가로등 고장',
      description: '후문 골목 가로등 3개가 모두 꺼져 있습니다. 야간에 매우 어둡고 CCTV 사각지대입니다.',
      imageBase64: IMG.streetLight,
      location:    { lat: 37.21150, lng: 126.95130, address: '경기 화성시 봉담읍 협성로 후문길' },
      danger:      'medium',
      category:    'facility',
      createdAt:   daysAgo(5),
    },
    {
      id:          IDS.r[6],
      clusterId:   IDS.c[2],
      title:       '협성대 후문 가로등 이틀째 미수리',
      description: '이틀 전 신고한 가로등이 아직도 수리되지 않았습니다. 늦은 밤 귀갓길 학생들이 많아 위험합니다.',
      imageBase64: IMG.streetLight,
      location:    { lat: 37.21152, lng: 126.95132, address: '경기 화성시 봉담읍 협성로 후문길' },
      danger:      'medium',
      category:    'safety',
      createdAt:   daysAgo(3),
    },

    // ── [D] 포트홀 군집 ─ 2건 ──────────────────────────────
    // 캠퍼스 내 순환도로 (37.21290, 126.95420)
    {
      id:          IDS.r[7],
      clusterId:   IDS.c[3],
      title:       '협성대 캠퍼스 순환도로 포트홀 발생',
      description: '순환도로 1차선에 작은 포트홀이 생겼습니다. 배달 오토바이 사고 위험이 있습니다.',
      imageBase64: IMG.pothole1,
      location:    { lat: 37.21290, lng: 126.95420, address: '경기 화성시 봉담읍 협성대학교 캠퍼스 내 순환도로' },
      danger:      'medium',
      category:    'road',
      createdAt:   daysAgo(4),
    },
    {
      id:          IDS.r[8],
      clusterId:   IDS.c[3],
      title:       '협성대 순환도로 포트홀 파손 심화',
      description: '이전에 신고된 포트홀이 차량 통행으로 더 크게 파손됐습니다. 직경 약 40cm, 깊이 10cm 이상입니다.',
      imageBase64: IMG.pothole2,
      location:    { lat: 37.21292, lng: 126.95422, address: '경기 화성시 봉담읍 협성대학교 캠퍼스 내 순환도로' },
      danger:      'medium',
      category:    'road',
      createdAt:   daysAgo(1),
    },

    // ── [E] 어두운 골목 ─ 1건 ──────────────────────────────
    // 기숙사 뒷길 (37.21380, 126.95310)
    {
      id:          IDS.r[9],
      clusterId:   IDS.c[4],
      title:       '기숙사 뒷길 야간 조명 없음',
      description: '기숙사 후면 골목에 가로등과 조명이 전혀 없어 야간에 매우 어둡습니다. 수상한 인물이 자주 출몰한다는 제보가 있습니다.',
      imageBase64: IMG.darkAlley,
      location:    { lat: 37.21380, lng: 126.95310, address: '경기 화성시 봉담읍 협성대학교 기숙사 후면' },
      danger:      'low',
      category:    'safety',
      createdAt:   daysAgo(7),
    },

    // ── [F] 보도블록 파손 ─ 2건 ────────────────────────────
    // 정문~버스정류장 보행로 (37.21240, 126.95060)
    {
      id:          IDS.r[10],
      clusterId:   IDS.c[5],
      title:       '협성대 정문~버스정류장 보도블록 파손',
      description: '정문에서 버스정류장으로 이어지는 보행로에서 보도블록 여러 장이 깨지거나 뒤틀려 있습니다. 걸려 넘어질 위험이 있습니다.',
      imageBase64: IMG.sidewalk1,
      location:    { lat: 37.21240, lng: 126.95060, address: '경기 화성시 봉담읍 협성로 버스정류장 앞' },
      danger:      'low',
      category:    'facility',
      createdAt:   daysAgo(10),
    },
    {
      id:          IDS.r[11],
      clusterId:   IDS.c[5],
      title:       '협성대 정류장 앞 보도블록 추가 파손',
      description: '앞서 신고된 지점에서 10m 더 들어간 곳에도 보도블록 파손이 있습니다. 전체 구간 보수가 필요합니다.',
      imageBase64: IMG.sidewalk2,
      location:    { lat: 37.21242, lng: 126.95062, address: '경기 화성시 봉담읍 협성로 버스정류장 앞' },
      danger:      'low',
      category:    'facility',
      createdAt:   daysAgo(6),
    },

    // ── [G] 낙석 위험 ─ 3건 ────────────────────────────────
    // 캠퍼스 북측 언덕길 (37.21450, 126.95220)
    {
      id:          IDS.r[12],
      clusterId:   IDS.c[6],
      title:       '협성대 북측 언덕길 낙석 위험',
      description: '북측 언덕 비탈면에서 작은 돌이 굴러 내려오고 있습니다. 낙석 위험 구역이지만 표지판이 없습니다.',
      imageBase64: IMG.rockfall1,
      location:    { lat: 37.21450, lng: 126.95220, address: '경기 화성시 봉담읍 협성대학교 북측 언덕로' },
      danger:      'high',
      category:    'road',
      createdAt:   daysAgo(2),
    },
    {
      id:          IDS.r[13],
      clusterId:   IDS.c[6],
      title:       '협성대 북측 언덕 낙석 추가 발생',
      description: '오늘 오전에도 주먹만한 돌이 굴러 내려왔습니다. 통학하는 학생들이 많은 시간대라 매우 위험합니다.',
      imageBase64: IMG.rockfall2,
      location:    { lat: 37.21452, lng: 126.95222, address: '경기 화성시 봉담읍 협성대학교 북측 언덕로' },
      danger:      'high',
      category:    'road',
      createdAt:   hoursAgo(12),
    },
    {
      id:          IDS.r[14],
      clusterId:   IDS.c[6],
      title:       '협성대 북측 대형 낙석 — 통행 차단 필요',
      description: '농구공 크기의 대형 낙석이 굴러와 언덕길을 막고 있습니다. 추락 및 낙하 위험이 극심합니다. 즉각 출입 통제가 필요합니다.',
      imageBase64: IMG.rockfall3,
      location:    { lat: 37.21455, lng: 126.95218, address: '경기 화성시 봉담읍 협성대학교 북측 언덕로' },
      danger:      'high',
      category:    'road',
      createdAt:   hoursAgo(4),
    },
  ]

  // ── 클러스터 (Cluster) 7건 ────────────────────────────────
  //
  //  각 필드:
  //    id, representId, reportIds, location,
  //    danger, category, embeddingVector, createdAt, updatedAt
  //
  //  embeddingVector: null (클러스터링 모델 없이 생성된 것으로 처리)
  //  → 앱 내 클러스터 카드/지도에 정상 표시됨

  const clusters = [

    // [A] 싱크홀 — 정문 앞 보도
    {
      id:              IDS.c[0],
      representId:     IDS.r[0],
      reportIds:       [IDS.r[0], IDS.r[1], IDS.r[2]],
      location:        { lat: 37.21320, lng: 126.95190 },
      danger:          'high',
      category:        'road',
      embeddingVector: null,
      createdAt:       daysAgo(3),
      updatedAt:       hoursAgo(8),
    },

    // [B] 침수 — 진입로 저지대
    {
      id:              IDS.c[1],
      representId:     IDS.r[3],
      reportIds:       [IDS.r[3], IDS.r[4]],
      location:        { lat: 37.21180, lng: 126.95350 },
      danger:          'high',
      category:        'weather',
      embeddingVector: null,
      createdAt:       hoursAgo(5),
      updatedAt:       hoursAgo(3),
    },

    // [C] 가로등 고장 — 후문 골목
    {
      id:              IDS.c[2],
      representId:     IDS.r[5],
      reportIds:       [IDS.r[5], IDS.r[6]],
      location:        { lat: 37.21150, lng: 126.95130 },
      danger:          'medium',
      category:        'facility',
      embeddingVector: null,
      createdAt:       daysAgo(5),
      updatedAt:       daysAgo(3),
    },

    // [D] 포트홀 — 캠퍼스 순환도로
    {
      id:              IDS.c[3],
      representId:     IDS.r[7],
      reportIds:       [IDS.r[7], IDS.r[8]],
      location:        { lat: 37.21290, lng: 126.95420 },
      danger:          'medium',
      category:        'road',
      embeddingVector: null,
      createdAt:       daysAgo(4),
      updatedAt:       daysAgo(1),
    },

    // [E] 어두운 골목 — 기숙사 뒷길
    {
      id:              IDS.c[4],
      representId:     IDS.r[9],
      reportIds:       [IDS.r[9]],
      location:        { lat: 37.21380, lng: 126.95310 },
      danger:          'low',
      category:        'safety',
      embeddingVector: null,
      createdAt:       daysAgo(7),
      updatedAt:       daysAgo(7),
    },

    // [F] 보도블록 파손 — 정문~버스정류장
    {
      id:              IDS.c[5],
      representId:     IDS.r[10],
      reportIds:       [IDS.r[10], IDS.r[11]],
      location:        { lat: 37.21240, lng: 126.95060 },
      danger:          'low',
      category:        'facility',
      embeddingVector: null,
      createdAt:       daysAgo(10),
      updatedAt:       daysAgo(6),
    },

    // [G] 낙석 — 북측 언덕길
    {
      id:              IDS.c[6],
      representId:     IDS.r[12],
      reportIds:       [IDS.r[12], IDS.r[13], IDS.r[14]],
      location:        { lat: 37.21450, lng: 126.95220 },
      danger:          'high',
      category:        'road',
      embeddingVector: null,
      createdAt:       daysAgo(2),
      updatedAt:       hoursAgo(4),
    },
  ]

  // ── localStorage에 주입 ───────────────────────────────────

  try {
    localStorage.setItem('reports',  JSON.stringify(reports))
    localStorage.setItem('clusters', JSON.stringify(clusters))

    // 용량 계산
    const bytes = (
      (localStorage.getItem('reports')  || '').length +
      (localStorage.getItem('clusters') || '').length
    ) * 2
    const kb = (bytes / 1024).toFixed(1)

    console.log('%c✅ Fermata 시드 데이터 주입 완료', 'color:#22c55e;font-weight:bold;font-size:14px')
    console.log(`   제보 ${reports.length}건 / 클러스터 ${clusters.length}건 / 용량 ${kb} KB`)
    console.log('')
    console.log('%c클러스터 분포:', 'font-weight:bold')
    console.table(clusters.map(c => ({
      id:       c.id.slice(0,8),
      danger:   c.danger,
      category: c.category,
      제보수:    c.reportIds.length,
      lat:      c.location.lat,
      lng:      c.location.lng,
    })))
    console.log('')
    console.log('%c📍 이제 페이지를 새로고침하세요 (F5)', 'color:#f59e0b;font-weight:bold')
  } catch (e) {
    console.error('❌ localStorage 저장 실패:', e)
  }
})()
