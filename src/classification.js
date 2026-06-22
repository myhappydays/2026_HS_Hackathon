/**
 * classification.js
 * 위험도 및 분야 자동 분류 (키워드 사전 기반)
 */

// ── 위험도 키워드 사전 ─────────────────────────────────
const DANGER_KEYWORDS = {
  high: [
    '싱크홀', '함몰', '붕괴', '추락', '가스', '화재', '침수', '감전',
    '폭발', '누전', '전도', '전복', '낙하', '낙석', '홍수', '범람',
    '무너짐', '쓰러짐', '유출', '유독', '독성',
  ],
  medium: [
    '파손', '균열', '미끄럼', '고장', '파임', '돌출', '부식', '침하',
    '누수', '누출', '변형', '기울어짐', '흔들림', '잠김', '막힘',
    '이탈', '탈락', '훼손', '손상', '뒤틀림',
  ],
  low: [
    '낙서', '쓰레기', '조명', '표지판', '소음', '악취', '오염',
    '불편', '방치', '적치', '무단', '보수', '교체',
  ],
}

// ── 분야 키워드 사전 ────────────────────────────────────
const CATEGORY_KEYWORDS = {
  road: [
    '싱크홀', '포트홀', '빙판', '신호등', '도로', '인도', '보도',
    '아스팔트', '차도', '횡단보도', '킥보드', '자전거', '주차', '교통',
    '노면', '가드레일', '중앙선', '정지선',
  ],
  facility: [
    '엘리베이터', '가로등', '누수', '시설', '공원', '벤치', '화장실',
    '건물', '계단', '난간', '지붕', '천장', '벽', '기둥', '펜스',
    '울타리', '수도', '하수', '맨홀', '전봇대', '전선',
  ],
  weather: [
    '침수', '폭우', '태풍', '돌풍', '홍수', '범람', '폭설', '결빙',
    '강풍', '우수', '배수', '악취', '냄새', '연기', '미세먼지',
  ],
  safety: [
    '어두움', '어둡', '골목', 'CCTV', '사각지대', '수상', '동물',
    '야생', '범죄', '치안', '불법', '위협', '위험인물',
    '취객', '노숙', '싸움', '폭행', '절도', '몰카', '불법촬영',
    '가로등', '조명없음', '무단침입', '낙서', '파손', '방화',
    '무단투기', '쓰레기', '악취', '벌레', '해충', '쥐',
  ],
  etc: [],
}

/**
 * 텍스트에서 위험도 자동 분류
 * @param {string} text 제목 + 상세설명 합산
 * @returns {'high'|'medium'|'low'}
 */
export function classifyDanger(text) {
  const lower = text.toLowerCase()
  for (const level of ['high', 'medium', 'low']) {
    if (DANGER_KEYWORDS[level].some(kw => lower.includes(kw))) {
      return level
    }
  }
  return 'medium' // 기본값
}

/**
 * 텍스트에서 분야 자동 분류
 * @param {string} text
 * @returns {'road'|'facility'|'weather'|'safety'|'etc'}
 */
export function classifyCategory(text) {
  const lower = text.toLowerCase()
  const scores = {}
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[cat] = kws.filter(kw => lower.includes(kw)).length
  }
  // etc는 0으로 고정, 동점 처리: 먼저 나온 카테고리 우선
  const candidates = Object.entries(scores)
    .filter(([cat]) => cat !== 'etc')
    .sort((a, b) => b[1] - a[1])

  if (candidates.length > 0 && candidates[0][1] > 0) {
    return candidates[0][0]
  }
  return 'etc'
}
