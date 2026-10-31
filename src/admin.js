/**
 * admin.js
 * 지자체 B2G 스마트 안전 관제 대시보드 로직
 * - 지역구 검색 & 필터링
 * - 전면 스프레드시트 시트 뷰 (Sheet View) 전환 모드
 * - 실시간 GIS 관제 지도 연동
 */

import { initTheme } from './theme.js'
import { getClusters, getReports, updateCluster } from './storage.js'
import { dangerStyle, categoryLabel, relativeTime } from './utils.js'

// 테마 초기화
initTheme()

// ── 상태 변수 ──────────────────────────────────────────
let allClusters = []
let allReports = []
let allReportsMap = new Map()
let kakaoMap = null
let mapMarkers = []
let isMapInitialized = false

// 필터 상태
let filterStatus = 'all'      // 'all' | 'active' | 'resolved'
let filterDanger = 'all'      // 'all' | 'high' | 'medium' | 'low'
let filterCategory = 'all'    // 'all' | 'road' | 'facility' | 'weather' | 'safety'
let filterDistrict = 'all'    // 'all' | '경기 화성시' | ...
let searchQuery = ''          // 일반 검색어 (주소, 제목, 설명)
let districtSearchQuery = ''  // 지역구 검색어

// 뷰 모드 상태 (false: 관제 대시보드 모드, true: 전면 시트 뷰 모드)
let isSheetView = false

let autoRefreshTimer = null
let countdownSeconds = 30

// ── DOM 참조 ────────────────────────────────────────────
const kpiSection         = document.getElementById('kpi-summary-section')
const mapSection         = document.getElementById('admin-map-section')
const sideStatsSection   = document.getElementById('side-stats-section')
const tableContainer     = document.getElementById('table-container-section')
const sheetViewBanner    = document.getElementById('sheet-view-banner')
const tableTitleText     = document.getElementById('table-title-text')
const tableHeadRow       = document.getElementById('table-head-row')
const tableBodyEl        = document.getElementById('admin-report-table-body')
const filteredCountBadge = document.getElementById('filtered-count-badge')

// KPI 통계 DOM
const statTotalReports   = document.getElementById('stat-total-reports')
const statActiveClusters = document.getElementById('stat-active-clusters')
const statHighDanger     = document.getElementById('stat-high-danger')
const statResolved       = document.getElementById('stat-resolved')
const statResolveRate    = document.getElementById('stat-resolve-rate')
const statResolveBar     = document.getElementById('stat-resolve-bar')

const categoryStatsEl    = document.getElementById('category-stats')
const rankingBoardEl     = document.getElementById('ranking-board')

// 헤더 액션 DOM
const currentTimeEl      = document.getElementById('current-time')
const autoRefreshStatusEl= document.getElementById('auto-refresh-status')
const refreshSpinner     = document.getElementById('refresh-spinner')
const btnToggleViewMode  = document.getElementById('btn-toggle-view-mode')
const viewModeBtnText    = document.getElementById('view-mode-btn-text')
const btnBackToDashboard = document.getElementById('btn-back-to-dashboard')
const btnManualRefresh   = document.getElementById('btn-manual-refresh')
const btnExportCSV       = document.getElementById('btn-export-csv')
const btnMapFit          = document.getElementById('btn-map-fit')

// 지역구 검색 및 셀렉트 DOM
const mapDistrictSearch  = document.getElementById('map-district-search')
const btnClearDistrict   = document.getElementById('btn-clear-district')
const mapDistrictSelect  = document.getElementById('map-district-select')
const tableDistrictSelect= document.getElementById('admin-district-filter-select')

// 일반 필터 DOM
const searchInput        = document.getElementById('admin-search-input')
const filterDangerSelect = document.getElementById('admin-filter-danger')
const filterCatSelect    = document.getElementById('admin-filter-category')
const statusTabs         = document.querySelectorAll('.status-tab-btn')

// 사진 모달
const imageModal         = document.getElementById('image-modal')
const imageModalImg      = document.getElementById('image-modal-img')
const imageModalTitle    = document.getElementById('image-modal-title')
const btnCloseImageModal = document.getElementById('btn-close-image-modal')

// ── 1. 시계 및 자동 갱신 ────────────────────────────────
function updateClock() {
  const now = new Date()
  if (currentTimeEl) {
    currentTimeEl.textContent = now.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }
}
setInterval(updateClock, 1000)
updateClock()

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
  countdownSeconds = 30
  autoRefreshTimer = setInterval(() => {
    countdownSeconds--
    if (autoRefreshStatusEl) {
      autoRefreshStatusEl.textContent = `자동 갱신: ${countdownSeconds}초 후`
    }
    if (countdownSeconds <= 0) {
      loadDashboard(true)
      countdownSeconds = 30
    }
  }, 1000)
}

// ── 2. 지역구 추출 헬퍼 ─────────────────────────────────
function getDistrictFromAddress(address) {
  if (!address) return '기타 관할'
  const parts = address.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`
  }
  return parts[0] || '기타 관할'
}

function updateDistrictDropdowns() {
  const districtSet = new Set()
  allClusters.forEach(c => {
    const rep = allReportsMap.get(c.representId)
    const addr = rep?.location?.address || c.location?.address || ''
    if (addr) {
      districtSet.add(getDistrictFromAddress(addr))
    }
  })

  const districts = Array.from(districtSet).sort()

  const buildOptions = (currentVal) => {
    return `
      <option value="all">전체 관할 구역</option>
      ${districts.map(d => `<option value="${d}" ${currentVal === d ? 'selected' : ''}>${d}</option>`).join('')}
    `
  }

  if (mapDistrictSelect) {
    mapDistrictSelect.innerHTML = buildOptions(filterDistrict)
  }
  if (tableDistrictSelect) {
    tableDistrictSelect.innerHTML = buildOptions(filterDistrict)
  }
}

// ── 3. 관제 지도 (Kakao Maps) 초기화 & 마커 ──────────────
function initAdminMap() {
  const mapContainer = document.getElementById('admin-map')
  const mapLoading   = document.getElementById('admin-map-loading')
  if (!mapContainer) return

  let attempts = 0
  const checkKakao = () => {
    attempts++
    if (typeof kakao !== 'undefined' && kakao.maps) {
      kakao.maps.load(() => {
        try {
          const mapOption = {
            center: new kakao.maps.LatLng(37.35, 126.98), // 수도권 중심
            level: 8
          }
          kakaoMap = new kakao.maps.Map(mapContainer, mapOption)
          isMapInitialized = true
          if (mapLoading) mapLoading.style.display = 'none'

          // 줌 컨트롤 추가
          const zoomControl = new kakao.maps.ZoomControl()
          kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT)

          // 캔버스 크기 맞춤 및 마커 렌더링
          setTimeout(() => {
            if (kakaoMap) {
              kakaoMap.relayout()
              renderMapMarkers()
            }
          }, 150)
        } catch (err) {
          console.error('[admin] Kakao Map init error:', err)
          if (mapLoading) mapLoading.innerHTML = '<span class="text-xs text-red-400">지도를 생성하지 못했습니다.</span>'
        }
      })
    } else if (attempts < 50) {
      setTimeout(checkKakao, 100)
    } else {
      console.warn('[admin] Kakao Maps SDK load timeout')
      if (mapLoading) {
        mapLoading.innerHTML = '<span class="text-xs text-amber-400">카카오 지도 로드 실패 (네트워크 또는 키 확인 필요)</span>'
      }
    }
  }

  checkKakao()
}

window.addEventListener('resize', () => {
  if (kakaoMap && !isSheetView) kakaoMap.relayout()
})

function renderMapMarkers() {
  if (!kakaoMap || !isMapInitialized) return

  // 기존 마커 제거
  mapMarkers.forEach(m => m.setMap(null))
  mapMarkers = []

  const bounds = new kakao.maps.LatLngBounds()
  let hasValidCoords = false

  // 현재 필터링 조건에 부합하는 클러스터만 지도에 마커 표시
  const targetClusters = getFilteredClusters()

  targetClusters.forEach(cluster => {
    const lat = Number(cluster.location?.lat)
    const lng = Number(cluster.location?.lng)
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return

    const pos = new kakao.maps.LatLng(lat, lng)
    bounds.extend(pos)
    hasValidCoords = true

    const isResolved = cluster.status === 'resolved'
    const color = isResolved
      ? '#3b82f6'
      : cluster.danger === 'high' ? '#ef4444' : cluster.danger === 'medium' ? '#f59e0b' : '#10b981'

    // 원형 핀 마커 이미지 생성
    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="12" fill="${color}" stroke="#ffffff" stroke-width="2.5" />
        <circle cx="15" cy="15" r="5" fill="#ffffff" />
      </svg>
    `
    const markerImage = new kakao.maps.MarkerImage(
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgIcon),
      new kakao.maps.Size(30, 30),
      { offset: new kakao.maps.Point(15, 15) }
    )

    const marker = new kakao.maps.Marker({
      position: pos,
      image: markerImage,
      map: kakaoMap
    })

    // 클릭 시 인포윈도우 표시
    const rep = allReportsMap.get(cluster.representId)
    const title = rep?.title || '위험 제보 구역'
    const address = rep?.location?.address || cluster.location?.address || '위치 정보 없음'

    const infoContent = `
      <div style="padding:10px 12px; min-width:210px; font-family:sans-serif; font-size:12px; color:#1e293b; line-height:1.4;">
        <div style="font-weight:700; margin-bottom:4px; font-size:13px; color:${color};">
          ${isResolved ? '✅ 조치 완료' : (cluster.danger === 'high' ? '🚨 초고위험' : '⚠️ 주의')} [${categoryLabel(cluster.category)}]
        </div>
        <div style="font-weight:600; margin-bottom:2px; word-break:break-all;">${title}</div>
        <div style="font-size:11px; color:#64748b; margin-bottom:8px;">${address}</div>
        <a href="detail.html?id=${cluster.id}" target="_blank" style="display:inline-block; padding:4px 10px; border-radius:6px; background:#e11d48; color:#ffffff; text-decoration:none; font-weight:700; font-size:11px;">
          상세 조치 보고서 ↗
        </a>
      </div>
    `
    const infowindow = new kakao.maps.InfoWindow({
      content: infoContent,
      removable: true
    })

    kakao.maps.event.addListener(marker, 'click', () => {
      infowindow.open(kakaoMap, marker)
    })

    mapMarkers.push(marker)
  })

  if (hasValidCoords && mapMarkers.length > 0) {
    kakaoMap.setBounds(bounds)
    kakaoMap.relayout()
  }
}

// ── 4. 지역구 이동 & 포커스 ────────────────────────────
function focusDistrictOnMap(districtQuery) {
  if (!kakaoMap || !isMapInitialized) return
  if (!districtQuery || districtQuery === 'all') {
    renderMapMarkers()
    return
  }

  // 1. 해당 지역구에 속한 클러스터 좌표들의 bounds로 이동
  const matchingClusters = allClusters.filter(c => {
    const rep = allReportsMap.get(c.representId)
    const addr = (rep?.location?.address || c.location?.address || '')
    return addr.includes(districtQuery)
  })

  if (matchingClusters.length > 0) {
    const bounds = new kakao.maps.LatLngBounds()
    matchingClusters.forEach(c => {
      if (c.location?.lat && c.location?.lng) {
        bounds.extend(new kakao.maps.LatLng(Number(c.location.lat), Number(c.location.lng)))
      }
    })
    kakaoMap.setBounds(bounds)
    kakaoMap.relayout()
    return
  }

  // 2. 일치하는 제보가 아직 없을 경우 카카오 Geocoder로 주소 검색 이동
  if (typeof kakao !== 'undefined' && kakao.maps && kakao.maps.services) {
    try {
      const geocoder = new kakao.maps.services.Geocoder()
      geocoder.addressSearch(districtQuery, (result, status) => {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
          const coords = new kakao.maps.LatLng(result[0].y, result[0].x)
          kakaoMap.setCenter(coords)
          kakaoMap.setLevel(7)
          kakaoMap.relayout()
        }
      })
    } catch (e) {
      console.warn('[admin] Geocoder address search failed:', e)
    }
  }
}

// ── 5. 관제 데이터 로드 & KPI 계산 ──────────────────────
async function loadDashboard(isSilent = false) {
  if (!isSilent && refreshSpinner) {
    refreshSpinner.classList.add('animate-spin')
  }

  try {
    const [clusters, reports] = await Promise.all([
      getClusters(),
      getReports()
    ])

    allClusters = clusters || []
    allReports = reports || []

    allReportsMap.clear()
    allReports.forEach(r => allReportsMap.set(r.id, r))

    updateDistrictDropdowns()
    updateKPISummary()
    renderCategoryStats()
    renderRankingBoard()
    renderFilteredTable()
    renderMapMarkers()

  } catch (err) {
    console.error('[admin] loadDashboard failed:', err)
  } finally {
    if (refreshSpinner) {
      setTimeout(() => refreshSpinner.classList.remove('animate-spin'), 400)
    }
  }
}

function updateKPISummary() {
  const totalReports = allReports.length
  let activeClusters = 0
  let highDangerClusters = 0
  let resolvedClusters = 0

  allClusters.forEach(cluster => {
    if (cluster.status === 'resolved') {
      resolvedClusters++
    } else {
      activeClusters++
      if (cluster.danger === 'high') {
        highDangerClusters++
      }
    }
  })

  const totalClusters = allClusters.length
  const resolveRate = totalClusters > 0 ? Math.round((resolvedClusters / totalClusters) * 100) : 0

  if (statTotalReports)   statTotalReports.textContent = totalReports.toLocaleString()
  if (statActiveClusters) statActiveClusters.textContent = activeClusters.toLocaleString()
  if (statHighDanger)     statHighDanger.textContent = highDangerClusters.toLocaleString()
  if (statResolved)       statResolved.textContent = resolvedClusters.toLocaleString()
  if (statResolveRate)    statResolveRate.textContent = `${resolveRate}%`
  if (statResolveBar)     statResolveBar.style.width = `${resolveRate}%`
}

// ── 6. 분야별 미해결 통계 ──────────────────────────────
function renderCategoryStats() {
  if (!categoryStatsEl) return
  categoryStatsEl.innerHTML = ''

  const activeByCategory = {}
  let totalActive = 0

  allClusters.forEach(c => {
    if (c.status !== 'resolved') {
      const cat = c.category || '기타'
      activeByCategory[cat] = (activeByCategory[cat] || 0) + 1
      totalActive++
    }
  })

  const sorted = Object.entries(activeByCategory).sort((a, b) => b[1] - a[1])

  if (sorted.length === 0) {
    categoryStatsEl.innerHTML = '<div class="text-xs text-muted-foreground text-center py-6">현재 접수된 미해결 위험이 없습니다.</div>'
    return
  }

  sorted.forEach(([cat, count]) => {
    const percentage = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0
    const label = categoryLabel(cat)
    
    const item = document.createElement('div')
    item.className = 'w-full flex flex-col gap-1'
    item.innerHTML = `
      <div class="flex justify-between items-center text-xs">
        <span class="font-medium text-foreground">${label}</span>
        <span class="text-muted-foreground font-semibold">${count}건 <span class="text-[10px] text-muted-foreground/70">(${percentage}%)</span></span>
      </div>
      <div class="w-full bg-surface-1 rounded-full h-2 overflow-hidden border border-border/40">
        <div class="bg-primary h-full rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
      </div>
    `
    categoryStatsEl.appendChild(item)
  })
}

// ── 7. 지자체별 골든타임 대응 속도 랭킹 ──────────────────
function renderRankingBoard() {
  if (!rankingBoardEl) return
  rankingBoardEl.innerHTML = ''

  const districtStats = {}

  allClusters.forEach(cluster => {
    if (cluster.status === 'resolved' && cluster.resolvedAt && cluster.createdAt) {
      const rep = allReportsMap.get(cluster.representId)
      const fullAddress = rep?.location?.address || cluster.location?.address || ''
      const district = getDistrictFromAddress(fullAddress)

      const timeTaken = Math.max(0, cluster.resolvedAt - cluster.createdAt)
      if (!districtStats[district]) {
        districtStats[district] = { totalMs: 0, count: 0 }
      }
      districtStats[district].totalMs += timeTaken
      districtStats[district].count++
    }
  })

  const ranking = Object.entries(districtStats)
    .map(([name, stats]) => ({
      name,
      avgMs: stats.totalMs / stats.count,
      count: stats.count
    }))
    .sort((a, b) => a.avgMs - b.avgMs)

  if (ranking.length === 0) {
    rankingBoardEl.innerHTML = '<div class="text-xs text-muted-foreground text-center py-6">해결된 위험 데이터가 아직 없습니다.</div>'
    return
  }

  const medals = ['🥇', '🥈', '🥉']
  ranking.forEach((r, i) => {
    const hours = r.avgMs / (1000 * 60 * 60)
    const timeStr = hours >= 24 
      ? `${(hours / 24).toFixed(1)}일` 
      : `${Math.max(1, Math.round(hours))}시간`

    const row = document.createElement('div')
    row.className = 'flex items-center justify-between p-2.5 rounded-xl bg-surface/50 border border-border/70 hover:bg-surface transition-all'
    row.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="text-lg flex-shrink-0">${i < 3 ? medals[i] : `<span class="text-xs font-bold text-muted-foreground w-5 text-center inline-block">${i+1}</span>`}</span>
        <div class="truncate">
          <p class="font-bold text-foreground text-xs truncate">${r.name}</p>
          <p class="text-[10px] text-muted-foreground">누적 조치: ${r.count}건</p>
        </div>
      </div>
      <div class="text-right flex-shrink-0 pl-2">
        <p class="text-xs font-extrabold text-primary tabular-nums">${timeStr}</p>
        <p class="text-[9px] text-muted-foreground">평균 대응</p>
      </div>
    `
    rankingBoardEl.appendChild(row)
  })
}

// ── 8. 필터링 및 데이터 테이블 렌더링 ────────────────────
function getFilteredClusters() {
  return allClusters.filter(cluster => {
    const rep = allReportsMap.get(cluster.representId)
    const addr = rep?.location?.address || cluster.location?.address || ''

    // 1. 상태 필터
    if (filterStatus !== 'all' && cluster.status !== filterStatus) return false
    // 2. 위험도 필터
    if (filterDanger !== 'all' && cluster.danger !== filterDanger) return false
    // 3. 분야 필터
    if (filterCategory !== 'all' && cluster.category !== filterCategory) return false

    // 4. 지역구 드롭다운 필터
    if (filterDistrict !== 'all') {
      const clusterDistrict = getDistrictFromAddress(addr)
      if (!clusterDistrict.includes(filterDistrict) && !filterDistrict.includes(clusterDistrict)) {
        return false
      }
    }

    // 5. 지역구 직접 검색창 필터
    if (districtSearchQuery) {
      const q = districtSearchQuery.toLowerCase()
      if (!addr.toLowerCase().includes(q)) {
        return false
      }
    }

    // 6. 일반 키워드 검색창 (주소, 제목, 설명)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const title = (rep?.title || '').toLowerCase()
      const desc = (rep?.description || '').toLowerCase()
      const address = addr.toLowerCase()
      if (!title.includes(q) && !desc.includes(q) && !address.includes(q)) {
        return false
      }
    }
    return true
  })
}

function renderTableHeaders() {
  if (!tableHeadRow) return

  if (isSheetView) {
    // 📑 전면 시트 뷰 (확장 스프레드시트 컬럼)
    tableHeadRow.innerHTML = `
      <th class="px-3 py-3 w-16">관리번호</th>
      <th class="px-3 py-3">상태</th>
      <th class="px-3 py-3">위험도</th>
      <th class="px-3 py-3">분야</th>
      <th class="px-3 py-3">지역구</th>
      <th class="px-3 py-3 min-w-[180px]">상세 위치 (주소)</th>
      <th class="px-3 py-3 min-w-[160px]">대표 제보명</th>
      <th class="px-3 py-3 min-w-[200px]">상세 설명</th>
      <th class="px-3 py-3 text-center">현장 사진</th>
      <th class="px-3 py-3">접수 일시</th>
      <th class="px-3 py-3">해결 일시</th>
      <th class="px-3 py-3 text-center">공감수</th>
      <th class="px-3 py-3 text-right sticky right-0 bg-surface/90 shadow-sm z-10">현장 조치 액션</th>
    `
  } else {
    // 📊 대시보드 뷰 (표준 관제 컬럼)
    tableHeadRow.innerHTML = `
      <th class="px-4 py-3">상태</th>
      <th class="px-4 py-3">위험도</th>
      <th class="px-4 py-3">분야</th>
      <th class="px-4 py-3">위치 (대표 주소)</th>
      <th class="px-4 py-3">제보 제목 / 설명</th>
      <th class="px-4 py-3 text-center">사진</th>
      <th class="px-4 py-3">접수 일시</th>
      <th class="px-4 py-3 text-center">공감수</th>
      <th class="px-4 py-3 text-right">현장 조치 액션</th>
    `
  }
}

function renderFilteredTable() {
  if (!tableBodyEl) return
  renderTableHeaders()
  tableBodyEl.innerHTML = ''

  const filtered = getFilteredClusters()

  // 시급도/최신순 정렬: 미해결 High 우선 -> 최신순
  filtered.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1
    }
    const dangerScore = { high: 3, medium: 2, low: 1 }
    const da = dangerScore[a.danger] || 1
    const db = dangerScore[b.danger] || 1
    if (da !== db) return db - da
    return (b.createdAt || 0) - (a.createdAt || 0)
  })

  if (filteredCountBadge) {
    filteredCountBadge.textContent = `총 ${filtered.length}건`
  }

  const colSpanCount = isSheetView ? 13 : 9

  if (filtered.length === 0) {
    tableBodyEl.innerHTML = `
      <tr>
        <td colspan="${colSpanCount}" class="px-4 py-12 text-center text-muted-foreground">
          조건에 부합하는 위험 제보 데이터가 없습니다.
        </td>
      </tr>
    `
    return
  }

  filtered.forEach(cluster => {
    const rep = allReportsMap.get(cluster.representId)
    const isResolved = cluster.status === 'resolved'
    const ds = dangerStyle(cluster.danger)
    const address = rep?.location?.address || cluster.location?.address || '위치 정보 없음'
    const district = getDistrictFromAddress(address)
    const title = rep?.title || '대표 제보'
    const desc = rep?.description || ''
    const time = relativeTime(cluster.createdAt || Date.now())
    const createdDateStr = cluster.createdAt ? new Date(cluster.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'
    const resolvedDateStr = cluster.resolvedAt ? new Date(cluster.resolvedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'
    const imageBase64 = rep?.imageBase64 || null
    const shortId = (cluster.id || '').slice(0, 8)

    const tr = document.createElement('tr')
    tr.className = `hover:bg-surface/40 transition-colors ${isResolved ? 'opacity-80' : ''}`

    if (isSheetView) {
      // 📑 전면 시트 뷰 행
      tr.innerHTML = `
        <td class="px-3 py-3 font-mono text-muted-foreground text-[11px]">${shortId}</td>
        <td class="px-3 py-3">
          ${isResolved 
            ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                 완료
               </span>`
            : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                 미해결
               </span>`
          }
        </td>
        <td class="px-3 py-3">
          <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${ds.bg} ${ds.text}">
            ${ds.label}
          </span>
        </td>
        <td class="px-3 py-3 text-muted-foreground font-medium">${categoryLabel(cluster.category)}</td>
        <td class="px-3 py-3 font-bold text-foreground">${district}</td>
        <td class="px-3 py-3 text-foreground truncate max-w-[220px]" title="${address}">${address}</td>
        <td class="px-3 py-3 font-semibold text-foreground truncate max-w-[180px]" title="${title}">${title}</td>
        <td class="px-3 py-3 text-muted-foreground truncate max-w-[220px]" title="${desc}">${desc || '-'}</td>
        <td class="px-3 py-3 text-center">
          ${imageBase64 ? `
            <button type="button" class="btn-preview-image p-0.5 rounded hover:bg-surface border border-border inline-block" data-img="${imageBase64}" data-title="${title}" title="사진 확대">
              <img src="${imageBase64}" class="w-6 h-6 rounded object-cover" alt="사진">
            </button>
          ` : `<span class="text-muted-foreground text-[10px]">-</span>`}
        </td>
        <td class="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">${createdDateStr}</td>
        <td class="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">${resolvedDateStr}</td>
        <td class="px-3 py-3 text-center font-bold text-red-500">${cluster.likes || 0}</td>
        <td class="px-3 py-3 text-right sticky right-0 bg-background/95 backdrop-blur-sm shadow-sm z-10">
          <div class="inline-flex items-center gap-1 justify-end">
            <button type="button" 
              class="btn-toggle-action px-2 py-0.5 rounded text-[11px] font-bold transition-all ${isResolved ? 'bg-surface hover:bg-surface-1 border border-border text-muted-foreground' : 'bg-primary text-white hover:bg-primary/90'}"
              data-id="${cluster.id}">
              ${isResolved ? '재접수' : '조치완료'}
            </button>
            <a href="detail.html?id=${cluster.id}" target="_blank" class="p-1 rounded border border-border bg-surface hover:bg-surface-1 text-foreground" title="보고서">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
            </a>
          </div>
        </td>
      `
    } else {
      // 📊 표준 대시보드 뷰 행
      tr.innerHTML = `
        <td class="px-4 py-3">
          ${isResolved 
            ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                 <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                 해결 완료
               </span>`
            : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                 <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                 진행 중
               </span>`
          }
        </td>

        <td class="px-4 py-3">
          <span class="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${ds.bg} ${ds.text}">
            ${ds.label}
          </span>
        </td>

        <td class="px-4 py-3 text-muted-foreground font-medium">
          ${categoryLabel(cluster.category)}
        </td>

        <td class="px-4 py-3 text-foreground font-medium max-w-[200px] truncate" title="${address}">
          <span class="font-bold text-primary mr-1">[${district}]</span>${address}
        </td>

        <td class="px-4 py-3 max-w-[240px]">
          <p class="font-bold text-foreground truncate" title="${title}">${title}</p>
          <p class="text-[11px] text-muted-foreground truncate" title="${desc}">${desc || '-'}</p>
        </td>

        <td class="px-4 py-3 text-center">
          ${imageBase64 ? `
            <button type="button" class="btn-preview-image p-1 rounded-lg hover:bg-surface border border-border inline-block transition-transform hover:scale-105" data-img="${imageBase64}" data-title="${title}" title="현장 사진 확대">
              <img src="${imageBase64}" class="w-8 h-8 rounded-md object-cover" alt="사진">
            </button>
          ` : `
            <span class="text-[10px] text-muted-foreground">-</span>
          `}
        </td>

        <td class="px-4 py-3 text-muted-foreground whitespace-nowrap">
          ${time}
        </td>

        <td class="px-4 py-3 text-center font-bold text-red-500">
          ${cluster.likes || 0}
        </td>

        <td class="px-4 py-3 text-right">
          <div class="inline-flex items-center gap-1.5 justify-end">
            <button type="button" 
              class="btn-toggle-action px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${isResolved ? 'bg-surface hover:bg-surface-1 border border-border text-muted-foreground' : 'bg-primary text-white hover:bg-primary/90'}"
              data-id="${cluster.id}">
              ${isResolved ? '재접수 전환' : '조치 완료'}
            </button>
            <a href="detail.html?id=${cluster.id}" target="_blank"
              class="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-1 text-foreground transition"
              title="상세 보고서 보기">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
              </svg>
            </a>
          </div>
        </td>
      `
    }
    tableBodyEl.appendChild(tr)
  })

  // 버튼 이벤트 바인딩
  bindTableActions()
}

function bindTableActions() {
  document.querySelectorAll('.btn-toggle-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const clusterId = btn.getAttribute('data-id')
      await toggleClusterStatus(clusterId)
    })
  })

  document.querySelectorAll('.btn-preview-image').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const img = btn.getAttribute('data-img')
      const title = btn.getAttribute('data-title')
      openImageModal(img, title)
    })
  })
}

// ── 9. 원클릭 상태 전환 로직 ────────────────────────────
async function toggleClusterStatus(clusterId) {
  const cluster = allClusters.find(c => c.id === clusterId)
  if (!cluster) return

  const isResolved = cluster.status === 'resolved'
  const newStatus = isResolved ? 'active' : 'resolved'

  cluster.status = newStatus
  cluster.resolvedAt = newStatus === 'resolved' ? Date.now() : null
  cluster.updatedAt = Date.now()

  await updateCluster(cluster)
  await loadDashboard(true)
}

// ── 10. 시트 뷰 (Sheet View) 토글 전환 ───────────────────
function toggleSheetView(forceState = null) {
  isSheetView = forceState !== null ? forceState : !isSheetView

  if (isSheetView) {
    // 📑 전면 시트 뷰 활성화
    if (kpiSection) kpiSection.style.display = 'none'
    if (mapSection) mapSection.style.display = 'none'
    if (sideStatsSection) sideStatsSection.style.display = 'none'
    if (sheetViewBanner) {
      sheetViewBanner.classList.remove('hidden')
      sheetViewBanner.classList.add('flex')
    }
    if (tableContainer) {
      tableContainer.classList.remove('lg:col-span-2')
      tableContainer.classList.add('lg:col-span-3')
    }
    if (viewModeBtnText) viewModeBtnText.textContent = '대시보드 복귀'
    if (tableTitleText) tableTitleText.textContent = '📑 전면 스프레드시트 시트 뷰 (Sheet View)'
  } else {
    // 📊 대시보드 뷰 활성화
    if (kpiSection) kpiSection.style.display = ''
    if (mapSection) mapSection.style.display = ''
    if (sideStatsSection) sideStatsSection.style.display = ''
    if (sheetViewBanner) {
      sheetViewBanner.classList.add('hidden')
      sheetViewBanner.classList.remove('flex')
    }
    if (tableContainer) {
      tableContainer.classList.remove('lg:col-span-3')
      tableContainer.classList.add('lg:col-span-2')
    }
    if (viewModeBtnText) viewModeBtnText.textContent = '시트뷰로 전환'
    if (tableTitleText) tableTitleText.textContent = '실시간 위험 제보 관제 콘솔'

    // 지도 리레이아웃
    setTimeout(() => {
      if (kakaoMap) {
        kakaoMap.relayout()
        renderMapMarkers()
      }
    }, 100)
  }

  renderFilteredTable()
}

// ── 11. CSV 보고서 다운로드 ──────────────────────────────
function exportToCSV() {
  const filtered = getFilteredClusters()
  if (filtered.length === 0) {
    alert('내보낼 데이터가 없습니다.')
    return
  }

  const headers = ['관리ID', '진행상태', '위험도', '분야', '지역구', '위치(주소)', '대표제보명', '상세설명', '제보일시', '해결일시', '주민공감수']
  const rows = filtered.map(c => {
    const rep = allReportsMap.get(c.representId)
    const statusText = c.status === 'resolved' ? '해결 완료' : '미해결 진행 중'
    const dangerText = c.danger === 'high' ? '초고위험' : c.danger === 'medium' ? '보통' : '낮음'
    const catText    = categoryLabel(c.category)
    const addr       = (rep?.location?.address || c.location?.address || '')
    const district   = getDistrictFromAddress(addr)
    const addrText   = `"${addr.replace(/"/g, '""')}"`
    const titleText  = `"${(rep?.title || '').replace(/"/g, '""')}"`
    const descText   = `"${(rep?.description || '').replace(/"/g, '""')}"`
    const createdStr = c.createdAt ? new Date(c.createdAt).toLocaleString('ko-KR') : ''
    const resolvedStr= c.resolvedAt ? new Date(c.resolvedAt).toLocaleString('ko-KR') : ''
    const likes      = c.likes || 0

    return [c.id, statusText, dangerText, catText, district, addrText, titleText, descText, createdStr, resolvedStr, likes].join(',')
  })

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url
  a.download = `fermata_safety_admin_report_${dateStr}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── 12. 사진 확대 모달 ───────────────────────────────────
function openImageModal(imgSrc, title) {
  if (!imageModal || !imageModalImg) return
  imageModalImg.src = imgSrc
  if (imageModalTitle) imageModalTitle.textContent = title || '현장 제보 사진'
  imageModal.classList.remove('hidden')
  imageModal.classList.add('flex')
}

function closeImageModal() {
  if (!imageModal) return
  imageModal.classList.add('hidden')
  imageModal.classList.remove('flex')
}

// ── 13. 이벤트 리스너 바인딩 ────────────────────────────
function bindEventListeners() {
  // 시트 뷰 전환 버튼
  btnToggleViewMode?.addEventListener('click', () => toggleSheetView())
  btnBackToDashboard?.addEventListener('click', () => toggleSheetView(false))

  // 지역구 직접 검색창 입력
  mapDistrictSearch?.addEventListener('input', (e) => {
    districtSearchQuery = e.target.value.trim()
    if (btnClearDistrict) {
      if (districtSearchQuery) btnClearDistrict.classList.remove('hidden')
      else btnClearDistrict.classList.add('hidden')
    }
    renderFilteredTable()
    renderMapMarkers()
  })

  // 지역구 검색창 Enter 시 해당 지역으로 지도 포커스
  mapDistrictSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = mapDistrictSearch.value.trim()
      if (val) focusDistrictOnMap(val)
    }
  })

  // 지역구 검색어 지우기 버튼
  btnClearDistrict?.addEventListener('click', () => {
    if (mapDistrictSearch) mapDistrictSearch.value = ''
    districtSearchQuery = ''
    btnClearDistrict.classList.add('hidden')
    renderFilteredTable()
    renderMapMarkers()
  })

  // 지도 상단 지역구 드롭다운 변경
  mapDistrictSelect?.addEventListener('change', (e) => {
    filterDistrict = e.target.value
    if (tableDistrictSelect) tableDistrictSelect.value = filterDistrict
    renderFilteredTable()
    focusDistrictOnMap(filterDistrict)
  })

  // 테이블 필터 지역구 드롭다운 변경
  tableDistrictSelect?.addEventListener('change', (e) => {
    filterDistrict = e.target.value
    if (mapDistrictSelect) mapDistrictSelect.value = filterDistrict
    renderFilteredTable()
    focusDistrictOnMap(filterDistrict)
  })

  // 상태 탭 클릭 (전체 / 미해결 / 해결완료)
  statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      statusTabs.forEach(t => {
        t.classList.remove('bg-primary', 'text-white')
        t.classList.add('text-muted-foreground')
      })
      tab.classList.remove('text-muted-foreground')
      tab.classList.add('bg-primary', 'text-white')
      filterStatus = tab.getAttribute('data-status')
      renderFilteredTable()
      renderMapMarkers()
    })
  })

  // 일반 키워드 검색
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim()
    renderFilteredTable()
    renderMapMarkers()
  })

  // 위험도 셀렉트
  filterDangerSelect?.addEventListener('change', (e) => {
    filterDanger = e.target.value
    renderFilteredTable()
    renderMapMarkers()
  })

  // 분야 셀렉트
  filterCatSelect?.addEventListener('change', (e) => {
    filterCategory = e.target.value
    renderFilteredTable()
    renderMapMarkers()
  })

  // 수동 새로고침
  btnManualRefresh?.addEventListener('click', () => {
    loadDashboard()
    countdownSeconds = 30
  })

  // CSV 다운로드
  btnExportCSV?.addEventListener('click', exportToCSV)

  // 지도 전체 맞춤
  btnMapFit?.addEventListener('click', () => {
    renderMapMarkers()
  })

  // 사진 모달 닫기
  btnCloseImageModal?.addEventListener('click', closeImageModal)
  imageModal?.addEventListener('click', (e) => {
    if (e.target === imageModal) closeImageModal()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeImageModal()
  })
}

// ── 초기화 실행 ─────────────────────────────────────────
initAdminMap()
bindEventListeners()
loadDashboard()
startAutoRefresh()
