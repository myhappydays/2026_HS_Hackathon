/**
 * admin.js
 * 지자체 B2G 스마트 안전 관제 대시보드 로직
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

let filterStatus = 'all'      // 'all' | 'active' | 'resolved'
let filterDanger = 'all'      // 'all' | 'high' | 'medium' | 'low'
let filterCategory = 'all'    // 'all' | 'road' | 'facility' | 'weather' | 'safety'
let searchQuery = ''

let autoRefreshTimer = null
let countdownSeconds = 30

// ── DOM 참조 ────────────────────────────────────────────
const statTotalReports   = document.getElementById('stat-total-reports')
const statActiveClusters = document.getElementById('stat-active-clusters')
const statHighDanger     = document.getElementById('stat-high-danger')
const statResolved       = document.getElementById('stat-resolved')
const statResolveRate    = document.getElementById('stat-resolve-rate')
const statResolveBar     = document.getElementById('stat-resolve-bar')

const categoryStatsEl    = document.getElementById('category-stats')
const rankingBoardEl     = document.getElementById('ranking-board')
const tableBodyEl        = document.getElementById('admin-report-table-body')
const filteredCountBadge = document.getElementById('filtered-count-badge')

const currentTimeEl      = document.getElementById('current-time')
const autoRefreshStatusEl= document.getElementById('auto-refresh-status')
const refreshSpinner     = document.getElementById('refresh-spinner')

const searchInput        = document.getElementById('admin-search-input')
const filterDangerSelect = document.getElementById('admin-filter-danger')
const filterCatSelect    = document.getElementById('admin-filter-category')
const statusTabs         = document.querySelectorAll('.status-tab-btn')

const btnManualRefresh   = document.getElementById('btn-manual-refresh')
const btnExportCSV       = document.getElementById('btn-export-csv')
const btnMapFit          = document.getElementById('btn-map-fit')

// 사진 모달
const imageModal         = document.getElementById('image-modal')
const imageModalImg      = document.getElementById('image-modal-img')
const imageModalTitle    = document.getElementById('image-modal-title')
const btnCloseImageModal = document.getElementById('btn-close-image-modal')

// ── 1. 시계 및 자동 갱신 카운트다운 ─────────────────────
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

// ── 2. 관제 지도 (Kakao Maps) 초기화 ────────────────────
function initAdminMap() {
  const mapContainer = document.getElementById('admin-map')
  const mapLoading   = document.getElementById('admin-map-loading')
  if (!mapContainer || typeof kakao === 'undefined' || !kakao.maps) return

  const mapOption = {
    center: new kakao.maps.LatLng(37.38, 126.96), // 수도권 중심
    level: 8
  }
  kakaoMap = new kakao.maps.Map(mapContainer, mapOption)
  if (mapLoading) mapLoading.style.display = 'none'

  // 줌 컨트롤 추가
  const zoomControl = new kakao.maps.ZoomControl()
  kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT)
}

function renderMapMarkers() {
  if (!kakaoMap) return

  // 기존 마커 제거
  mapMarkers.forEach(m => m.setMap(null))
  mapMarkers = []

  const bounds = new kakao.maps.LatLngBounds()
  let hasValidCoords = false

  allClusters.forEach(cluster => {
    if (!cluster.location || !cluster.location.lat || !cluster.location.lng) return

    const pos = new kakao.maps.LatLng(cluster.location.lat, cluster.location.lng)
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
    const address = rep?.location?.address || '위치 정보 없음'

    const infoContent = `
      <div style="padding:10px; min-width:200px; font-family:sans-serif; font-size:12px; color:#1e293b; line-height:1.4;">
        <div style="font-weight:700; margin-bottom:4px; font-size:13px; color:${color};">
          ${isResolved ? '✅ 조치 완료' : (cluster.danger === 'high' ? '🚨 초고위험' : '⚠️ 주의')} [${categoryLabel(cluster.category)}]
        </div>
        <div style="font-weight:600; margin-bottom:2px; word-break:break-all;">${title}</div>
        <div style="font-size:11px; color:#64748b; margin-bottom:8px;">${address}</div>
        <a href="detail.html?id=${cluster.id}" target="_blank" style="display:inline-block; padding:4px 8px; border-radius:6px; background:#e11d48; color:#ffffff; text-decoration:none; font-weight:600; font-size:11px;">
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
  }
}

// ── 3. 관제 데이터 로드 & KPI 계산 ──────────────────────
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

// ── 4. 분야별 미해결 통계 ──────────────────────────────
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

// ── 5. 지자체별 골든타임 대응 속도 랭킹 ──────────────────
function renderRankingBoard() {
  if (!rankingBoardEl) return
  rankingBoardEl.innerHTML = ''

  const districtStats = {}

  allClusters.forEach(cluster => {
    if (cluster.status === 'resolved' && cluster.resolvedAt && cluster.createdAt) {
      const rep = allReportsMap.get(cluster.representId)
      const fullAddress = rep?.location?.address || ''
      const parts = fullAddress.split(' ')
      const district = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : '기타 관할 구역'

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

// ── 6. 필터링 및 데이터 테이블 렌더링 ────────────────────
function getFilteredClusters() {
  return allClusters.filter(cluster => {
    // 1. 상태 필터
    if (filterStatus !== 'all' && cluster.status !== filterStatus) return false
    // 2. 위험도 필터
    if (filterDanger !== 'all' && cluster.danger !== filterDanger) return false
    // 3. 분야 필터
    if (filterCategory !== 'all' && cluster.category !== filterCategory) return false

    // 4. 검색어 필터
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const rep = allReportsMap.get(cluster.representId)
      const title = (rep?.title || '').toLowerCase()
      const desc = (rep?.description || '').toLowerCase()
      const addr = (rep?.location?.address || '').toLowerCase()
      if (!title.includes(q) && !desc.includes(q) && !addr.includes(q)) {
        return false
      }
    }
    return true
  })
}

function renderFilteredTable() {
  if (!tableBodyEl) return
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

  if (filtered.length === 0) {
    tableBodyEl.innerHTML = `
      <tr>
        <td colspan="9" class="px-4 py-12 text-center text-muted-foreground">
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
    const title = rep?.title || '대표 제보'
    const desc = rep?.description || ''
    const time = relativeTime(cluster.createdAt || Date.now())
    const imageBase64 = rep?.imageBase64 || null

    const tr = document.createElement('tr')
    tr.className = `hover:bg-surface/40 transition-colors ${isResolved ? 'opacity-80' : ''}`

    tr.innerHTML = `
      <!-- 상태 -->
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

      <!-- 위험도 -->
      <td class="px-4 py-3">
        <span class="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${ds.bg} ${ds.text}">
          ${ds.label}
        </span>
      </td>

      <!-- 분야 -->
      <td class="px-4 py-3 text-muted-foreground font-medium">
        ${categoryLabel(cluster.category)}
      </td>

      <!-- 대표 주소 -->
      <td class="px-4 py-3 text-foreground font-medium max-w-[200px] truncate" title="${address}">
        ${address}
      </td>

      <!-- 제목 / 설명 -->
      <td class="px-4 py-3 max-w-[240px]">
        <p class="font-bold text-foreground truncate" title="${title}">${title}</p>
        <p class="text-[11px] text-muted-foreground truncate" title="${desc}">${desc || '-'}</p>
      </td>

      <!-- 사진 미리보기 -->
      <td class="px-4 py-3 text-center">
        ${imageBase64 ? `
          <button type="button" class="btn-preview-image p-1 rounded-lg hover:bg-surface border border-border inline-block transition-transform hover:scale-105" data-img="${imageBase64}" data-title="${title}" title="현장 사진 확대">
            <img src="${imageBase64}" class="w-8 h-8 rounded-md object-cover" alt="사진">
          </button>
        ` : `
          <span class="text-[10px] text-muted-foreground">-</span>
        `}
      </td>

      <!-- 접수 일시 -->
      <td class="px-4 py-3 text-muted-foreground whitespace-nowrap">
        ${time}
      </td>

      <!-- 공감수 -->
      <td class="px-4 py-3 text-center font-bold text-red-500">
        ${cluster.likes || 0}
      </td>

      <!-- 현장 조치 액션 버튼 -->
      <td class="px-4 py-3 text-right">
        <div class="inline-flex items-center gap-1.5 justify-end">
          <button type="button" 
            class="btn-toggle-action px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${isResolved ? 'bg-surface hover:bg-surface-1 border border-border text-muted-foreground' : 'bg-primary text-white hover:bg-primary/90'}"
            data-id="${cluster.id}" data-status="${cluster.status}">
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
    tableBodyEl.appendChild(tr)
  })

  // 버튼 이벤트 연결
  bindTableActions()
}

function bindTableActions() {
  // 조치 상태 원클릭 토글
  document.querySelectorAll('.btn-toggle-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const clusterId = btn.getAttribute('data-id')
      await toggleClusterStatus(clusterId)
    })
  })

  // 사진 미리보기
  document.querySelectorAll('.btn-preview-image').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const img = btn.getAttribute('data-img')
      const title = btn.getAttribute('data-title')
      openImageModal(img, title)
    })
  })
}

// ── 7. 원클릭 상태 전환 로직 ────────────────────────────
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

// ── 8. CSV 보고서 다운로드 ──────────────────────────────
function exportToCSV() {
  const filtered = getFilteredClusters()
  if (filtered.length === 0) {
    alert('내보낼 데이터가 없습니다.')
    return
  }

  const headers = ['군집ID', '진행상태', '위험도', '분야', '위치(주소)', '대표제보명', '상세설명', '제보일시', '해결일시', '주민공감수']
  const rows = filtered.map(c => {
    const rep = allReportsMap.get(c.representId)
    const statusText = c.status === 'resolved' ? '해결 완료' : '미해결 진행 중'
    const dangerText = c.danger === 'high' ? '초고위험' : c.danger === 'medium' ? '보통' : '낮음'
    const catText    = categoryLabel(c.category)
    const addrText   = `"${(rep?.location?.address || c.location?.address || '').replace(/"/g, '""')}"`
    const titleText  = `"${(rep?.title || '').replace(/"/g, '""')}"`
    const descText   = `"${(rep?.description || '').replace(/"/g, '""')}"`
    const createdStr = c.createdAt ? new Date(c.createdAt).toLocaleString('ko-KR') : ''
    const resolvedStr= c.resolvedAt ? new Date(c.resolvedAt).toLocaleString('ko-KR') : ''
    const likes      = c.likes || 0

    return [c.id, statusText, dangerText, catText, addrText, titleText, descText, createdStr, resolvedStr, likes].join(',')
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

// ── 9. 사진 확대 모달 ───────────────────────────────────
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

// ── 10. 이벤트 리스너 바인딩 ────────────────────────────
function bindEventListeners() {
  // 상태 탭 클릭
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
    })
  })

  // 검색어 입력
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim()
    renderFilteredTable()
  })

  // 위험도 셀렉트
  filterDangerSelect?.addEventListener('change', (e) => {
    filterDanger = e.target.value
    renderFilteredTable()
  })

  // 분야 셀렉트
  filterCatSelect?.addEventListener('change', (e) => {
    filterCategory = e.target.value
    renderFilteredTable()
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
