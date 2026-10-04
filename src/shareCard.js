/**
 * shareCard.js
 * AI 위험 요약본 SNS 바이럴 공유 카드 모듈
 * (인스타그램 스토리 / 모바일 SNS 최적화 세로형 카드 생성 & html2canvas 캡처 & 공유)
 *
 * - 사용자가 위치한 실제 동네/구역명 실시간 역지오코딩 반영 (하드코딩 제거)
 * - 현재 지도 중심 / 검색 위치 반경 기반 위험 분석 (위험 제보 없는 구역은 '안전 구역' 브리핑)
 * - 개별 제보별 맞춤형 카드 공유 지원
 */

let getContext = null

/**
 * 두 좌표 간 직선 거리(m) 계산 (하버사인 공식)
 */
export function distanceMeters(lat1, lon1, lat2, lon2) {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
    return 999999
  }
  const R = 6371e3
  const toRad = deg => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * 카카오 지도 Geocoder 기반 위경도 → 행정동/구/시 역지오코딩
 */
export function reverseGeocodeCoord(lat, lng) {
  return new Promise((resolve) => {
    if (typeof kakao === 'undefined' || !kakao.maps || !kakao.maps.services) {
      resolve(null)
      return
    }
    try {
      const geocoder = new kakao.maps.services.Geocoder()
      geocoder.coord2RegionCode(lng, lat, (result, status) => {
        if (status === kakao.maps.services.Status.OK && result && result.length > 0) {
          // 행정동(H) 우선, 없으면 법정동(B)
          const region = result.find(r => r.region_type === 'H') || result[0]
          let name = ''
          if (region.region_2depth_name && region.region_3depth_name) {
            name = `${region.region_2depth_name} ${region.region_3depth_name}`.trim()
          } else if (region.region_2depth_name) {
            name = region.region_2depth_name
          } else {
            name = region.address_name || region.region_1depth_name || ''
          }
          resolve(name)
        } else {
          // 주소 변환 대체 시도
          geocoder.coord2Address(lng, lat, (addrRes, addrStatus) => {
            if (addrStatus === kakao.maps.services.Status.OK && addrRes && addrRes.length > 0) {
              const item = addrRes[0]
              const addr = item.road_address || item.address
              if (addr && addr.address_name) {
                const parts = addr.address_name.split(' ')
                const name = parts.length >= 3 ? `${parts[1]} ${parts[2]}` : addr.address_name
                resolve(name)
                return
              }
            }
            resolve(null)
          })
        }
      })
    } catch (e) {
      resolve(null)
    }
  })
}

/**
 * 안전 카드 모듈 초기화
 * @param {Function} contextGetter - 현재 앱 상태 반환 함수
 */
export function initShareCard(contextGetter) {
  getContext = contextGetter

  // 트리거 버튼 이벤트 연결
  bindTriggerButtons()

  // 모달 닫기 이벤트 연결
  bindModalEvents()

  // 하단 액션 버튼 이벤트 연결
  bindActionButtons()
}

/**
 * 트리거 버튼들 이벤트 바인딩
 */
function bindTriggerButtons() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#open-safety-card-btn, #ai-alert-share-btn')
    if (trigger) {
      e.preventDefault()
      openShareModal(null)
    }
  })
}

/**
 * 모달 열기 (특정 제보 타겟팅 가능)
 * @param {Object|null} targetOptions - { type: 'report'|'area', report?: Object, cluster?: Object, areaName?: string }
 */
export function openShareModal(targetOptions = null) {
  const modal = document.getElementById('share-card-modal')
  if (!modal) return

  // 데이터 수집 및 카드 렌더링
  updateCardContent(targetOptions)

  // 모달 표시
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  document.body.style.overflow = 'hidden'

  // 애니메이션 효과
  const cardContainer = document.getElementById('share-card-container')
  if (cardContainer) {
    cardContainer.classList.remove('scale-95', 'opacity-0')
    cardContainer.classList.add('scale-100', 'opacity-100')
  }
}

/**
 * 모달 닫기
 */
export function closeShareModal() {
  const modal = document.getElementById('share-card-modal')
  if (!modal) return

  const cardContainer = document.getElementById('share-card-container')
  if (cardContainer) {
    cardContainer.classList.remove('scale-100', 'opacity-100')
    cardContainer.classList.add('scale-95', 'opacity-0')
  }

  setTimeout(() => {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
    document.body.style.overflow = ''
  }, 150)
}

/**
 * 모달 닫기 관련 이벤트 (X버튼, 바깥 영역 클릭, ESC 키)
 */
function bindModalEvents() {
  const modal = document.getElementById('share-card-modal')
  if (!modal) return

  // 닫기 버튼
  const closeBtn = document.getElementById('close-share-card-modal')
  if (closeBtn) {
    closeBtn.addEventListener('click', closeShareModal)
  }

  // 바깥 영역 (배경) 클릭 시 닫기
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.id === 'share-card-modal-backdrop') {
      closeShareModal()
    }
  })

  // ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeShareModal()
    }
  })
}

/**
 * 카드 데이터 동적 계산 및 DOM 업데이트
 */
export function updateCardContent(targetOptions = null) {
  const ctx = typeof getContext === 'function' ? getContext() : {}
  const allClusters = ctx.clusters || []
  const reportsMap = ctx.reportsMap || new Map()
  const searchQuery = (ctx.searchQuery || '').trim()
  const aiSummaryText = (ctx.aiSummary || '').trim()

  const isSpecificReport = targetOptions && targetOptions.type === 'report' && targetOptions.report
  const targetReport = isSpecificReport ? targetOptions.report : null
  const targetCluster = isSpecificReport ? targetOptions.cluster : null

  // 1. 기준 좌표 및 반경 클러스터 필터링 (현재 지도 뷰포트 / 검색 위치 기준)
  let nearbyClusters = allClusters
  let targetLat = typeof ctx.targetLat === 'number' ? ctx.targetLat : ctx.anchorLat
  let targetLng = typeof ctx.targetLng === 'number' ? ctx.targetLng : ctx.anchorLng

  if (!isSpecificReport && typeof targetLat === 'number' && typeof targetLng === 'number') {
    // 기준 지점 반경 3.5km 내의 클러스터만 필터링 (먼 거리의 협성대 데이터가 서울 등에 혼입 방지)
    nearbyClusters = allClusters.filter(c => {
      if (!c.location || typeof c.location.lat !== 'number') return false
      return distanceMeters(targetLat, targetLng, c.location.lat, c.location.lng) <= 3500
    })
  }

  // 2. 지역/구역명 추출
  const areaName = resolveAreaName(targetOptions, ctx, nearbyClusters, reportsMap)

  // 3. 위험 점수 및 상태 계산 (0 ~ 100)
  const { score, levelText, levelBadgeClass, levelBarWidth, levelColor } = calculateSafetyIndex(nearbyClusters, targetOptions)

  // 4. AI 요약 문구 생성/추출
  const summaryText = resolveSummaryText(aiSummaryText, nearbyClusters, reportsMap, areaName, targetOptions)

  // 5. 주요 주의 키워드 3개 뱃지 추출
  const keywords = resolveKeywords(nearbyClusters, reportsMap, targetOptions)

  // 6. 날짜 포맷 (예: 2026. 10. 04)
  const now = new Date()
  const formattedDate = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`

  // DOM 반영
  const titleEl = document.getElementById('card-area-title')
  if (titleEl) {
    if (isSpecificReport) {
      titleEl.textContent = `⚠️ [${areaName}] ${cleanTitle(targetReport.title)}`
    } else {
      titleEl.textContent = `⚠️ [${areaName}] 안전 주의보`
    }
  }

  const scoreEl = document.getElementById('card-risk-score')
  if (scoreEl) {
    scoreEl.textContent = `${score}`
  }

  const levelBadgeEl = document.getElementById('card-risk-level-badge')
  if (levelBadgeEl) {
    levelBadgeEl.textContent = levelText
    levelBadgeEl.className = `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${levelBadgeClass}`
  }

  const meterBarEl = document.getElementById('card-risk-meter-bar')
  if (meterBarEl) {
    meterBarEl.style.width = `${levelBarWidth}%`
    meterBarEl.style.backgroundColor = levelColor
  }

  const summaryEl = document.getElementById('card-ai-summary')
  if (summaryEl) {
    summaryEl.textContent = summaryText
  }

  const keywordsContainer = document.getElementById('card-keywords-container')
  if (keywordsContainer) {
    keywordsContainer.innerHTML = keywords.map(kw => `
      <span class="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white/95 border border-white/15 backdrop-blur-sm shadow-sm">
        ${kw.startsWith('#') ? kw : '#' + kw}
      </span>
    `).join('')
  }

  const dateEl = document.getElementById('card-date-text')
  if (dateEl) {
    dateEl.textContent = `${formattedDate} 기준`
  }

  const highCountEl = document.getElementById('card-high-count')
  if (highCountEl) {
    if (isSpecificReport) {
      const dangerLabel = targetReport.danger === 'high' ? '고위험' : (targetReport.danger === 'medium' ? '주의' : '양호')
      highCountEl.textContent = `🚨 [${dangerLabel}] 개별 사건 실시간 공유`
    } else if (nearbyClusters.length === 0) {
      highCountEl.textContent = `🛡️ 현재 구역 등록된 위험 제보 없음`
    } else {
      const highCnt = nearbyClusters.filter(c => c.danger === 'high' && c.status !== 'resolved').length
      const totalCnt = nearbyClusters.filter(c => c.status !== 'resolved').length
      highCountEl.textContent = `🚨 고위험 ${highCnt}건 / 활성 제보 ${totalCnt}건`
    }
  }
}

/**
 * 지역명 추출 헬퍼
 */
function resolveAreaName(targetOptions, ctx, nearbyClusters, reportsMap) {
  // 1. 단일 제보인 경우
  if (targetOptions?.type === 'report' && targetOptions.report) {
    const rep = targetOptions.report
    if (rep.location && rep.location.address) {
      const parts = rep.location.address.split(' ')
      if (parts.length >= 3) return `${parts[1]} ${parts[2]}`
      return parts[0] || '제보 구역'
    }
    return '제보 지점'
  }

  // 2. 직접 지정된 구역명
  if (targetOptions?.areaName) {
    return targetOptions.areaName
  }

  // 3. 사용자 검색어 우선
  if (ctx.searchQuery) {
    return ctx.searchQuery
  }

  // 4. 지도 중심 기반 실시간 역지오코딩된 행정동/구 이름
  if (ctx.currentRegionName) {
    return ctx.currentRegionName
  }

  // 5. 근처 3km 내 실제 제보 주소에서 추출 (단, 실제 가까운 데이터만)
  for (const c of nearbyClusters) {
    const rep = reportsMap.get(c.representId)
    if (rep && rep.location && rep.location.address) {
      const parts = rep.location.address.split(' ')
      if (parts.length >= 3) return `${parts[1]} ${parts[2]}`
      if (parts.length >= 2) return `${parts[0]} ${parts[1]}`
    }
  }

  return '내 주변 구역'
}

/**
 * 종합 안전 지수 및 위험도 계산
 */
function calculateSafetyIndex(clusters, targetOptions) {
  // 단일 제보 카드일 때
  if (targetOptions?.type === 'report' && targetOptions.report) {
    const r = targetOptions.report
    if (r.status === 'resolved') {
      return {
        score: 10,
        levelText: '조치 완료 (안전)',
        levelBadgeClass: 'bg-blue-500/25 text-blue-300 border border-blue-500/50',
        levelBarWidth: 10,
        levelColor: '#3b82f6'
      }
    }
    if (r.danger === 'high') {
      return {
        score: 88,
        levelText: '주의 요망 (고위험)',
        levelBadgeClass: 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
        levelBarWidth: 88,
        levelColor: '#f43f5e'
      }
    } else if (r.danger === 'medium') {
      return {
        score: 58,
        levelText: '보행 주의 (경계)',
        levelBadgeClass: 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
        levelBarWidth: 58,
        levelColor: '#f59e0b'
      }
    } else {
      return {
        score: 28,
        levelText: '비교적 안전 (주의)',
        levelBadgeClass: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50',
        levelBarWidth: 28,
        levelColor: '#10b981'
      }
    }
  }

  // 구역 전체 카드일 때
  const active = clusters.filter(c => c.status !== 'resolved')
  if (active.length === 0) {
    return {
      score: 12,
      levelText: '비교적 안전 (안전 구역)',
      levelBadgeClass: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50',
      levelBarWidth: 12,
      levelColor: '#10b981'
    }
  }

  const highCount = active.filter(c => c.danger === 'high').length
  const medCount = active.filter(c => c.danger === 'medium').length
  const lowCount = active.filter(c => c.danger === 'low').length

  // 위험도 점수 산출 공식 (0 ~ 100)
  let rawScore = (highCount * 22) + (medCount * 12) + (lowCount * 5) + 20
  if (highCount >= 3) rawScore = Math.max(rawScore, 78)
  const score = Math.min(96, Math.max(25, rawScore))

  if (score >= 70) {
    return {
      score,
      levelText: '주의 요망 (위험 경보)',
      levelBadgeClass: 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
      levelBarWidth: score,
      levelColor: '#f43f5e'
    }
  } else if (score >= 40) {
    return {
      score,
      levelText: '보행 주의 (경계)',
      levelBadgeClass: 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
      levelBarWidth: score,
      levelColor: '#f59e0b'
    }
  } else {
    return {
      score,
      levelText: '비교적 안전 (양호)',
      levelBadgeClass: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50',
      levelBarWidth: score,
      levelColor: '#10b981'
    }
  }
}

/**
 * AI 요약 문구 생성
 */
function resolveSummaryText(aiSummaryText, clusters, reportsMap, areaName, targetOptions) {
  // 1. 개별 제보인 경우
  if (targetOptions?.type === 'report' && targetOptions.report) {
    const r = targetOptions.report
    const desc = r.description ? ` (${r.description})` : ''
    return `${r.title}${desc} — 해당 구역 통행 시 각별한 주의가 필요합니다.`
  }

  // 2. 해당 구역 내 활성 위험이 전혀 없는 경우 (안전 구역)
  const active = clusters.filter(c => c.status !== 'resolved')
  if (active.length === 0) {
    return `현재 [${areaName}] 일대에 등록된 위험 제보가 없습니다. 보행로 및 도로 통행이 비교적 안전하며 양호한 상태입니다.`
  }

  // 3. Bedrock AI 요약 결과가 있을 때:
  // 단, 현재 areaName이 협성대가 아닌데 aiSummaryText에 '협성대'가 포함되어 있다면 오염된 캐시이므로 무시!
  const isHyupsungArea = (areaName || '').includes('협성') || (areaName || '').includes('봉담')
  const mentionsHyupsung = (aiSummaryText || '').includes('협성')
  if (aiSummaryText && aiSummaryText.length > 15 && (!mentionsHyupsung || isHyupsungArea)) {
    const clean = aiSummaryText.replace(/^\[[^\]]+\]\s*/, '').trim()
    if (clean.length <= 130) return clean
    return clean.slice(0, 120) + '...'
  }

  // 4. 데이터 기반 동적 템플릿 문구
  const categories = active.map(c => c.category)
  const hasRoad = categories.includes('road')
  const hasWeather = categories.includes('weather')
  const hasSafety = categories.includes('safety')
  const hasFacility = categories.includes('facility')

  if (hasRoad && hasSafety) {
    return `[${areaName}] 야간 보행 시 조명 취약 구간이 다수 존재하며, 최근 이륜차 통행 및 지반 균열 위험이 감지되었습니다. 귀가 시 조명이 밝은 대로변을 이용하세요.`
  } else if (hasWeather) {
    return `[${areaName}] 최근 강우로 인한 저지대 침수 구간 및 미끄럼 위험이 관측되었습니다. 해당 도로 우회 및 보행 시 안전거리를 확보하세요.`
  } else if (hasRoad) {
    return `[${areaName}] 해당 구역 내 싱크홀 및 포트홀 파손 구간이 다수 제보되었습니다. 차량 및 보행자 모두 서행하며 각별한 주의가 필요합니다.`
  } else if (hasSafety || hasFacility) {
    return `[${areaName}] 가로등 고장 등 야간 시야 제한 구간이 확인되어 보행 안전 취약 지점으로 분석되었습니다. 심야 귀가 시 안전 통행로를 권장합니다.`
  }

  return `[${areaName}] 야간 보행 시 조명 취약 구간이 다수 존재하며, 최근 보행 주의 위험이 감지되었습니다. 귀가 시 안전한 경로를 이용하세요.`
}

/**
 * 주요 주의 키워드 3개 뱃지 추출
 */
function resolveKeywords(clusters, reportsMap, targetOptions) {
  // 1. 단일 제보인 경우
  if (targetOptions?.type === 'report' && targetOptions.report) {
    const r = targetOptions.report
    const text = (r.title + ' ' + (r.description || '')).toLowerCase()
    const candidates = []
    if (text.includes('싱크홀') || text.includes('지반') || text.includes('함몰')) candidates.push('#싱크홀주의')
    if (text.includes('침수') || text.includes('우수') || text.includes('홍수') || text.includes('물')) candidates.push('#침수위험')
    if (text.includes('낙석') || text.includes('비탈') || text.includes('돌')) candidates.push('#낙석주의')
    if (text.includes('가로등') || text.includes('어두') || text.includes('조명') || text.includes('암전')) candidates.push('#야간보행')
    if (text.includes('포트홀') || text.includes('도로') || text.includes('아스팔트') || text.includes('파손')) candidates.push('#도로파손')
    if (text.includes('오토바이') || text.includes('차량') || text.includes('이륜차')) candidates.push('#이륜차주의')
    if (text.includes('보도블록') || text.includes('인도') || text.includes('보행')) candidates.push('#보행주의')

    const catMap = { road: '#도로교통', weather: '#기상주의', facility: '#시설점검', safety: '#치안경계' }
    if (r.category && catMap[r.category] && !candidates.includes(catMap[r.category])) {
      candidates.push(catMap[r.category])
    }
    const defaults = ['#안전주의', '#보행주의', '#실시간제보']
    for (const d of defaults) {
      if (candidates.length < 3 && !candidates.includes(d)) candidates.push(d)
    }
    return candidates.slice(0, 3)
  }

  // 2. 구역 내 위험 제보가 없는 경우
  const active = clusters.filter(c => c.status !== 'resolved')
  if (active.length === 0) {
    return ['#안전구역', '#정상통행', '#보행양호']
  }

  const titles = []
  active.forEach(c => {
    const rep = reportsMap.get(c.representId)
    if (rep && rep.title) titles.push(rep.title + ' ' + (rep.description || ''))
  })
  const combined = titles.join(' ')

  const candidates = []

  if (combined.includes('싱크홀') || combined.includes('지반') || combined.includes('함몰')) candidates.push('#싱크홀주의')
  if (combined.includes('가로등') || combined.includes('어두') || combined.includes('조명')) candidates.push('#야간보행')
  if (combined.includes('포트홀') || combined.includes('도로') || combined.includes('아스팔트')) candidates.push('#도로파손')
  if (combined.includes('침수') || combined.includes('우수') || combined.includes('홍수')) candidates.push('#침수위험')
  if (combined.includes('낙석') || combined.includes('언덕')) candidates.push('#낙석주의')
  if (combined.includes('오토바이') || combined.includes('차량') || combined.includes('통행')) candidates.push('#이륜차주의')
  if (combined.includes('보도블록') || combined.includes('인도')) candidates.push('#보행위험')

  // 기본 키워드 풀
  const defaults = ['#야간보행', '#시야제한', '#이륜차주의']
  for (const def of defaults) {
    if (candidates.length < 3 && !candidates.includes(def)) {
      candidates.push(def)
    }
  }

  return candidates.slice(0, 3)
}

function cleanTitle(title) {
  if (!title) return '안전 제보'
  return title.replace(/^\[[^\]]+\]\s*/, '').trim()
}

/**
 * 하단 액션 버튼 이벤트 바인딩 (이미지 저장, 공유하기)
 */
function bindActionButtons() {
  const downloadBtn = document.getElementById('download-share-card-btn')
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadCardImage)
  }

  const shareBtn = document.getElementById('share-card-btn')
  if (shareBtn) {
    shareBtn.addEventListener('click', shareCard)
  }
}

/**
 * html2canvas로 카드 영역 캡처
 */
async function captureCardCanvas() {
  const cardElement = document.getElementById('safety-share-card')
  if (!cardElement) throw new Error('카드 엘리먼트를 찾을 수 없습니다.')

  if (typeof window.html2canvas === 'undefined') {
    throw new Error('html2canvas 라이브러리가 로드되지 않았습니다.')
  }

  // 2.5배 고해상도 캡처 (스토리/SNS 레티나 디스플레이 최적화)
  return await window.html2canvas(cardElement, {
    scale: 2.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
    imageTimeout: 15000,
  })
}

/**
 * 1) 이미지 저장 기능 (PNG 다운로드)
 */
export async function downloadCardImage() {
  const downloadBtn = document.getElementById('download-share-card-btn')
  const originalText = downloadBtn ? downloadBtn.innerHTML : ''

  try {
    if (downloadBtn) {
      downloadBtn.disabled = true
      downloadBtn.innerHTML = `
        <svg class="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>이미지 생성 중...</span>
      `
    }

    const canvas = await captureCardCanvas()
    const dataUrl = canvas.toDataURL('image/png')

    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`
    const fileName = `Fermata_안전주의보_${dateStr}.png`

    const link = document.createElement('a')
    link.download = fileName
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast('📸 안전 카드가 PNG 이미지로 저장되었습니다!')
  } catch (err) {
    console.error('카드 캡처 실패:', err)
    showToast('⚠️ 이미지 생성 중 오류가 발생했습니다.')
  } finally {
    if (downloadBtn) {
      downloadBtn.disabled = false
      downloadBtn.innerHTML = originalText
    }
  }
}

/**
 * 2) 공유하기 기능 (Web Share API 또는 클립보드 복사)
 */
export async function shareCard() {
  const shareBtn = document.getElementById('share-card-btn')
  const originalText = shareBtn ? shareBtn.innerHTML : ''

  try {
    if (shareBtn) {
      shareBtn.disabled = true
      shareBtn.innerHTML = `
        <svg class="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>공유 준비 중...</span>
      `
    }

    const titleEl = document.getElementById('card-area-title')
    const areaTitle = titleEl ? titleEl.textContent : '우리 동네 안전 주의보'
    const shareUrl = window.location.href

    // Web Share API 지원 여부 확인
    if (navigator.share) {
      try {
        const canvas = await captureCardCanvas()
        
        // 캔버스를 File 객체로 변환하여 파일 공유 시도
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        const file = new File([blob], 'fermata-safety-card.png', { type: 'image/png' })

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `[Fermata] ${areaTitle}`,
            text: `${areaTitle}\nFermata 실시간 AI 안전 주의보입니다. 지금 확인하고 안전하게 귀가하세요!\n\n#Fermata #안전주의보 #안전지도`,
            files: [file],
          })
          showToast('🚀 안전 카드가 성공적으로 공유되었습니다!')
          return
        } else {
          // 파일 공유 미지원 시 텍스트/URL 공유
          await navigator.share({
            title: `[Fermata] ${areaTitle}`,
            text: `${areaTitle}\nFermata 실시간 AI 안전 주의보입니다. 지금 확인하세요!`,
            url: shareUrl,
          })
          showToast('🚀 안전 주의보가 공유되었습니다!')
          return
        }
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          // 사용자가 공유 창에서 취소 누름
          return
        }
        // 공유 실패 시 클립보드 복사로 대체 진행
      }
    }

    // Web Share API 미지원 또는 실패 시: 클립보드 복사
    await navigator.clipboard.writeText(shareUrl)
    showToast('🔗 안전 카드 링크가 클립보드에 복사되었습니다!')
  } catch (err) {
    console.error('공유 처리 실패:', err)
    // 대체 클립보드 복사 시도
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('🔗 안전 카드 링크가 클립보드에 복사되었습니다!')
    } catch (clipErr) {
      showToast('⚠️ 공유에 실패했습니다. 주소를 직접 복사해주세요.')
    }
  } finally {
    if (shareBtn) {
      shareBtn.disabled = false
      shareBtn.innerHTML = originalText
    }
  }
}

/**
 * 플로팅 토스트 알림 표시
 * @param {string} message
 */
export function showToast(message) {
  let toast = document.getElementById('share-card-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'share-card-toast'
    toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 z-[100002] px-4 py-2.5 rounded-xl bg-slate-900/95 text-white border border-white/20 shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 transition-all duration-300 opacity-0 translate-y-3 pointer-events-none'
    document.body.appendChild(toast)
  }

  toast.textContent = message
  toast.classList.remove('opacity-0', 'translate-y-3', 'pointer-events-none')
  toast.classList.add('opacity-100', 'translate-y-0')

  if (toast._timer) clearTimeout(toast._timer)
  toast._timer = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0')
    toast.classList.add('opacity-0', 'translate-y-3', 'pointer-events-none')
  }, 2600)
}
