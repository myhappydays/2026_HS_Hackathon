/**
 * main.js
 * 메인 페이지 - 카카오 지도 뷰 + 제보 리스트
 */

import { getClusters, getReportById } from './storage.js'
import { dangerStyle, categoryLabel, relativeTime } from './utils.js'
import { haversineDistance } from './clustering.js'
import {
  isConfigured, getToken, saveToken, getModel, saveModel,
  getSettings, saveSettings, MODELS, summarizeArea, getCachedSummary,
} from './bedrock.js'
import { initEmbedder, isEmbedderReady } from './embedder.js'

document.getElementById('nav-report').href = `${import.meta.env.BASE_URL}report.html`

const reportList  = document.getElementById('report-list')
const emptyState  = document.getElementById('empty-state')
const reportCount = document.getElementById('report-count')
const mapPlaceholder = document.getElementById('map-placeholder')

// 위험도별 마커 이미지 (카카오 기본 핀에 색상 오버레이)
const DANGER_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }

function makeMarkerImage(color) {
  // SVG 핀을 data URI로 — 카카오 MarkerImage에 사용
  const svg = `
    <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="5.5" fill="white"/>
    </svg>`
  const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  return new kakao.maps.MarkerImage(uri, new kakao.maps.Size(28, 36), {
    offset: new kakao.maps.Point(14, 36),
  })
}

// ── 지도 초기화 ──────────────────────────────────────────

let kakaoMap = null
let userLat = 37.5665
let userLng = 126.9780
let globalMarkers = []  // 히트맵 토글 시 show/hide용

function initMap(lat, lng) {
  if (typeof kakao === 'undefined') {
    mapPlaceholder.querySelector('span').textContent = '지도를 불러올 수 없습니다.'
    return
  }

  const mapEl = document.getElementById('map')
  kakaoMap = new kakao.maps.Map(mapEl, {
    center: new kakao.maps.LatLng(lat, lng),
    level: 5,
  })

  // 현재 위치 파란 점
  const myDot = document.createElement('div')
  myDot.style.cssText = `
    width:14px; height:14px; border-radius:50%;
    background:#3b82f6; border:2px solid white;
    box-shadow:0 0 0 4px rgba(59,130,246,0.25);
  `
  new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(lat, lng),
    content: myDot,
    yAnchor: 0.5,
    zIndex: 1,
  }).setMap(kakaoMap)

  mapPlaceholder.classList.add('hidden')
  renderMarkers()
}

function renderMarkers() {
  if (!kakaoMap) return
  const clusters = getClusters()
  if (clusters.length === 0) return

  // 클러스터 ID → danger 빠른 조회용 맵
  const dangerMap = Object.fromEntries(clusters.map(c => [c.id, c.danger]))

  const markers = clusters.map(cluster => {
    const color  = DANGER_COLOR[cluster.danger] || DANGER_COLOR.medium
    const pos    = new kakao.maps.LatLng(cluster.location.lat, cluster.location.lng)
    const marker = new kakao.maps.Marker({
      position: pos,
      image: makeMarkerImage(color),
    })
    marker._clusterId = cluster.id
    kakao.maps.event.addListener(marker, 'click', () => {
      location.href = `${import.meta.env.BASE_URL}detail.html?id=${cluster.id}`
    })
    return marker
  })
  globalMarkers = markers

  const DANGER_PRIORITY = { high: 0, medium: 1, low: 2 }

  function clusterStyle(color) {
    return {
      width: '36px', height: '36px',
      borderRadius: '50%',
      background: color,
      border: '2px solid white',
      color: 'white',
      textAlign: 'center',
      lineHeight: '32px',
      fontSize: '13px',
      fontWeight: '700',
      boxShadow: `0 2px 6px ${color}99`,
    }
  }

  const clusterer = new kakao.maps.MarkerClusterer({
    map: kakaoMap,
    markers,
    gridSize: 30,
    minLevel: 1,
    minClusterSize: 2,
    styles: [
      clusterStyle(DANGER_COLOR.high),
      clusterStyle(DANGER_COLOR.medium),
      clusterStyle(DANGER_COLOR.low),
    ],
    calculator: [99999], // 항상 index 0 → clustered 이벤트에서 직접 교체
  })
  window._clusterer = clusterer

  // 클러스터 생성 후 포함된 마커들의 최고 위험도로 색상 교체
  kakao.maps.event.addListener(clusterer, 'clustered', clusterList => {
    clusterList.forEach(cluster => {
      const top = cluster.getMarkers().reduce((best, m) => {
        const p = DANGER_PRIORITY[dangerMap[m._clusterId]] ?? 1
        return p < best ? p : best
      }, 2)
      const color = [DANGER_COLOR.high, DANGER_COLOR.medium, DANGER_COLOR.low][top]
      const el = cluster.getClusterMarker().getContent()
      if (el) {
        el.style.background = color
        el.style.boxShadow  = `0 2px 6px ${color}99`
      }
    })
  })
}

// ── 히트맵 ───────────────────────────────────────────────

let isHeatmapMode = false

function setToggleActive(mode) {
  const pinBtn  = document.getElementById('view-pin-btn')
  const heatBtn = document.getElementById('view-heat-btn')
  if (mode === 'pin') {
    pinBtn.classList.add('bg-primary', 'text-white')
    pinBtn.classList.remove('text-muted-foreground')
    heatBtn.classList.remove('bg-primary', 'text-white')
    heatBtn.classList.add('text-muted-foreground')
  } else {
    heatBtn.classList.add('bg-primary', 'text-white')
    heatBtn.classList.remove('text-muted-foreground')
    pinBtn.classList.remove('bg-primary', 'text-white')
    pinBtn.classList.add('text-muted-foreground')
  }
}

/** 심플 2D 펄린-스타일 노이즈 (gradient noise, 완전 결정론적) */
function smoothNoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp  = (a, b, t) => a + t * (b - a)
  const grad  = (h, dx, dy) => {
    const v = (h ^ seed) & 3
    return v === 0 ? dx + dy : v === 1 ? -dx + dy : v === 2 ? dx - dy : -dx - dy
  }
  const h = (a, b) => ((a * 1619 + b * 31337 + seed * 6971) ^ (a * 31337)) & 0xffff
  const n00 = grad(h(ix,   iy),   fx,     fy)
  const n10 = grad(h(ix+1, iy),   fx-1,   fy)
  const n01 = grad(h(ix,   iy+1), fx,     fy-1)
  const n11 = grad(h(ix+1, iy+1), fx-1,   fy-1)
  return lerp(lerp(n00, n10, fade(fx)), lerp(n01, n11, fade(fx)), fade(fy))
}

// ── 히트맵 — DOM img + 이벤트 기반 위치 동기화 ──────────

const HM_CENTER_LAT = 37.2132, HM_CENTER_LNG = 126.9521
const HM_RADIUS_M   = 900  // 반경 900m

// 카카오맵 레벨별 1픽셀 = ?미터 (위도 37° 기준, 타일 256px)
const KAKAO_M_PER_PX = {
  1: 0.6, 2: 1.2, 3: 2.5, 4: 5, 5: 10,
  6: 20, 7: 40, 8: 80, 9: 160, 10: 320,
  11: 640, 12: 1280, 13: 2560, 14: 5120,
}

let heatmapImg   = null   // DOM <img>
let heatmapDataUrl = null // 미리 렌더링된 dataUrl

function buildHeatmapDataUrl() {
  if (heatmapDataUrl) return heatmapDataUrl
  const GRID = 40, PX = 16, SIZE = GRID * PX, SEED = 4242
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, SIZE, SIZE)

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const nx = gx / (GRID - 1), ny = gy / (GRID - 1)
      const dx = nx - 0.5, dy = ny - 0.5
      const dist = Math.sqrt(dx * dx + dy * dy) * 2
      if (dist > 1) continue

      const n = smoothNoise(nx * 6,  ny * 6,  SEED)     * 0.5
             + smoothNoise(nx * 12, ny * 12, SEED + 37) * 0.3
             + smoothNoise(nx * 24, ny * 24, SEED + 73) * 0.2
      const boost = Math.pow(1 - dist, 1.8)
      const raw   = Math.max(0, n * 0.55 + boost * 0.45)
      const alpha = Math.min(0.75, raw * 0.9)
      if (alpha < 0.05) continue
      const g = Math.round(raw * 140)
      ctx.fillStyle = `rgba(220,${g},0,${alpha.toFixed(2)})`
      ctx.fillRect(gx * PX, gy * PX, PX, PX)
    }
  }
  heatmapDataUrl = canvas.toDataURL('image/png')
  return heatmapDataUrl
}

function positionHeatmapImg() {
  if (!heatmapImg || !kakaoMap) return
  const mapEl  = document.getElementById('map')
  const level  = kakaoMap.getLevel()
  const mPerPx = KAKAO_M_PER_PX[level] || 10
  const center = kakaoMap.getCenter()

  // 히트맵 중심의 지도 내 픽셀 오프셋
  const dLat = HM_CENTER_LAT - center.getLat()
  const dLng = HM_CENTER_LNG - center.getLng()
  const LAT_PER_M = 1 / 111000
  const LNG_PER_M = 1 / (111000 * Math.cos(center.getLat() * Math.PI / 180))
  const dxM = dLng / LNG_PER_M
  const dyM = dLat / LAT_PER_M

  const mapW = mapEl.offsetWidth, mapH = mapEl.offsetHeight
  const cx = mapW / 2 + dxM / mPerPx   // 히트맵 중심 픽셀 x
  const cy = mapH / 2 - dyM / mPerPx   // y는 위쪽이 +lat이므로 반전

  const halfPx = HM_RADIUS_M / mPerPx
  const size   = halfPx * 2

  heatmapImg.style.left   = `${cx - halfPx}px`
  heatmapImg.style.top    = `${cy - halfPx}px`
  heatmapImg.style.width  = `${size}px`
  heatmapImg.style.height = `${size}px`
}

function showHeatmap() {
  if (!kakaoMap) return
  if (window._clusterer) window._clusterer.setMap(null)
  globalMarkers.forEach(m => m.setMap(null))

  if (!heatmapImg) {
    const mapEl = document.getElementById('map')
    const img = document.createElement('img')
    img.src = buildHeatmapDataUrl()
    img.style.cssText = 'position:absolute;opacity:0.72;pointer-events:none;image-rendering:pixelated;'
    mapEl.style.position = 'relative'
    mapEl.appendChild(img)
    heatmapImg = img

    // 줌 시작 시 숨기고, idle(애니메이션 완전 종료)에서만 복구
    kakao.maps.event.addListener(kakaoMap, 'zoom_start', () => {
      if (heatmapImg) heatmapImg.style.display = 'none'
    })
    kakao.maps.event.addListener(kakaoMap, 'idle', () => {
      if (heatmapImg && isHeatmapMode) {
        positionHeatmapImg()
        heatmapImg.style.display = 'block'
      }
    })
  }
  heatmapImg.style.display = 'block'
  positionHeatmapImg()
}

function hideHeatmap() {
  if (heatmapImg) heatmapImg.style.display = 'none'
  if (window._clusterer) window._clusterer.setMap(kakaoMap)
  globalMarkers.forEach(m => m.setMap(kakaoMap))
}

// 토글 버튼 이벤트
document.getElementById('view-pin-btn').addEventListener('click', () => {
  if (!isHeatmapMode) return
  isHeatmapMode = false
  hideHeatmap()
  setToggleActive('pin')
})

document.getElementById('view-heat-btn').addEventListener('click', () => {
  if (isHeatmapMode) return
  isHeatmapMode = true
  showHeatmap()
  setToggleActive('heat')
})

// ── 리스트 렌더링 ────────────────────────────────────────

function renderList(userLat, userLng) {
  const clusters = getClusters()
  reportCount.textContent = `총 ${clusters.length}건`

  if (clusters.length === 0) {
    emptyState.classList.remove('hidden')
    return
  }
  emptyState.classList.add('hidden')

  // 거리 계산 후 거리순 정렬
  const withDist = clusters.map(c => ({
    ...c,
    dist: haversineDistance(userLat, userLng, c.location.lat, c.location.lng)
  })).sort((a, b) => a.dist - b.dist)

  reportList.innerHTML = withDist.map(cluster => {
    const rep    = getReportById(cluster.representId)
    if (!rep) return ''
    const ds     = dangerStyle(cluster.danger)
    const cat    = categoryLabel(cluster.category)
    const time   = relativeTime(cluster.createdAt)
    const count  = cluster.reportIds.length
    const distM  = cluster.dist
    const distTxt = distM < 1000 ? `${Math.round(distM)}m` : `${(distM/1000).toFixed(1)}km`

    return `
      <a href="${import.meta.env.BASE_URL}detail.html?id=${cluster.id}"
        class="flex gap-3 p-3 rounded-xl bg-card border border-border active:bg-surface transition">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
          ${rep.imageBase64
            ? `<img src="${rep.imageBase64}" class="w-full h-full object-cover" alt="썸네일">`
            : `<div class="w-full h-full flex items-center justify-center">
                 <svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/>
                 </svg>
               </div>`
          }
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${ds.bg} ${ds.text}">${ds.label}</span>
            <span class="text-[10px] text-muted-foreground">${cat}</span>
            ${count > 1 ? `<span class="ml-auto text-[10px] text-primary font-medium">+${count}건</span>` : ''}
          </div>
          <p class="text-sm font-semibold text-foreground truncate">${rep.title}</p>
          <p class="text-xs text-muted-foreground truncate mt-0.5">${rep.description || '상세 설명 없음'}</p>
          <div class="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
            <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
            </svg>
            <span class="truncate">${rep.location.address || '위치 정보 없음'}</span>
            <span class="ml-auto flex-shrink-0 text-muted-foreground">${distTxt} · ${time}</span>
          </div>
        </div>
      </a>
    `
  }).join('')
}

// ── AI 요약 ──────────────────────────────────────────────

const aiActiveDot    = document.getElementById('ai-active-dot')
const aiAlertWrap    = document.getElementById('ai-alert-wrap')
const aiAlertLoading = document.getElementById('ai-alert-loading')
const aiAlertResult  = document.getElementById('ai-alert-result')
const aiAlertError   = document.getElementById('ai-alert-error')
const aiSummaryText  = document.getElementById('ai-summary-text')
const aiErrorText    = document.getElementById('ai-error-text')
const aiRefreshBtn   = document.getElementById('ai-refresh-btn')
const aiTokenInput   = document.getElementById('ai-token-input')
const aiModelSelect  = document.getElementById('ai-model-select')
const aiSortSelect   = document.getElementById('ai-sort-select')
const aiMaxDist      = document.getElementById('ai-max-dist')
const aiMaxCount     = document.getElementById('ai-max-count')
const aiMinReports   = document.getElementById('ai-min-reports')
const aiSaveBtn      = document.getElementById('ai-save-btn')
const aiClearBtn     = document.getElementById('ai-clear-btn')

// 설정 버튼 dot 상태 업데이트
function updateActiveDot() {
  if (isConfigured()) {
    aiActiveDot.classList.remove('hidden')
  } else {
    aiActiveDot.classList.add('hidden')
  }
}

// Modal 열릴 때 현재 설정값 채우기
function populateOffcanvas() {
  const s = getSettings()
  aiTokenInput.value = getToken()
  aiMaxDist.value    = s.maxDist
  aiMaxCount.value   = s.maxCount
  aiMinReports.value = s.minReports

  // 정렬 select
  const hsSort = window.HSSelect?.getInstance('#ai-sort-select')
  if (hsSort) hsSort.setValue(s.sortBy)
  else aiSortSelect.value = s.sortBy

  // 모델 select
  const hsModel = window.HSSelect?.getInstance('#ai-model-select')
  if (hsModel) hsModel.setValue(getModel())
  else aiModelSelect.value = getModel()
}

// Modal 열림 감지
document.getElementById('ai-modal')?.addEventListener('open.hs.overlay', () => {
  const inner = document.getElementById('ai-modal-inner')
  if (inner) { inner.style.opacity = '1'; inner.style.marginTop = '1.75rem' }
  populateOffcanvas()
})

// 저장
aiSaveBtn.addEventListener('click', () => {
  const token = aiTokenInput.value.trim()
  if (!token) {
    aiTokenInput.focus()
    return
  }
  saveToken(token)

  // 모델
  const hsModel = window.HSSelect?.getInstance('#ai-model-select')
  const modelVal = hsModel ? hsModel.value : aiModelSelect.value
  if (modelVal) saveModel(modelVal)

  // 정렬
  const hsSort = window.HSSelect?.getInstance('#ai-sort-select')
  const sortVal = hsSort ? hsSort.value : aiSortSelect.value

  saveSettings({
    sortBy:     sortVal     || 'dist',
    maxDist:    parseInt(aiMaxDist.value)    || 2000,
    maxCount:   parseInt(aiMaxCount.value)   || 10,
    minReports: parseInt(aiMinReports.value) || 1,
  })

  // Modal 닫기
  const modal = window.HSOverlay?.getInstance('#ai-modal', true)
  if (modal) modal.element.close()
  else document.getElementById('ai-modal')?.classList.add('hidden')

  updateActiveDot()
  runAISummary()
})

// 초기화
aiClearBtn.addEventListener('click', () => {
  saveToken('')
  localStorage.removeItem('bedrock_model')
  saveSettings({ sortBy: 'dist', maxDist: 2000, maxCount: 10, minReports: 1 })
  localStorage.removeItem('bedrock_summary_cache')
  updateActiveDot()
  aiAlertWrap.classList.add('hidden')

  const modal = window.HSOverlay?.getInstance('#ai-modal', true)
  if (modal) modal.element.close()
  else document.getElementById('ai-modal')?.classList.add('hidden')
})

// 새로고침
aiRefreshBtn?.addEventListener('click', () => runAISummary({ force: true }))

// 요약 실행
async function runAISummary({ force = false } = {}) {
  // 캐시가 있으면 토큰 유무와 무관하게 먼저 표시
  if (!force) {
    const cached = getCachedSummary()
    if (cached) {
      const lines = cached.split('\n')
      aiSummaryText.innerHTML = lines.map((l, i) =>
        i === 0 ? `<strong>${l}</strong>` : `<span>${l}</span>`
      ).join('<br>')
      aiAlertWrap.classList.remove('hidden')
      aiAlertLoading.classList.add('hidden')
      aiAlertResult.classList.remove('hidden')
      aiAlertError.classList.add('hidden')
    }
  }

  if (!isConfigured()) return

  const allClusters = getClusters()
  if (allClusters.length === 0) return

  const { sortBy, maxDist, maxCount, minReports } = getSettings()
  const dangerPriority = { high: 3, medium: 2, low: 1 }

  // 거리 계산 + 필터
  let filtered = allClusters
    .map(c => ({
      ...c,
      distM: haversineDistance(userLat, userLng, c.location.lat, c.location.lng),
    }))
    .filter(c => c.distM <= maxDist && c.reportIds.length >= minReports)

  // 정렬
  if (sortBy === 'danger') {
    filtered.sort((a, b) => {
      const dp = (dangerPriority[b.danger] || 0) - (dangerPriority[a.danger] || 0)
      return dp !== 0 ? dp : a.distM - b.distM
    })
  } else if (sortBy === 'recent') {
    filtered.sort((a, b) => b.updatedAt - a.updatedAt)
  } else {
    filtered.sort((a, b) => a.distM - b.distM)
  }

  filtered = filtered.slice(0, maxCount)
  if (filtered.length === 0) return

  const payload = filtered.map(c => {
    const rep = getReportById(c.representId)
    return {
      title:       rep?.title || '제목 없음',
      description: rep?.description || '',
      danger:      c.danger,
      category:    c.category,
      distM:       c.distM,
      count:       c.reportIds.length,
      address:     rep?.location?.address || '',
      updatedAt:   c.updatedAt,
    }
  })

  aiAlertWrap.classList.remove('hidden')
  aiAlertLoading.classList.remove('hidden')
  aiAlertResult.classList.add('hidden')
  aiAlertError.classList.add('hidden')

  try {
    const text = await summarizeArea(payload, { force })
    const lines = text.split('\n')
    aiSummaryText.innerHTML = lines.map((l, i) =>
      i === 0 ? `<strong>${l}</strong>` : `<span>${l}</span>`
    ).join('<br>')
    aiAlertLoading.classList.add('hidden')
    aiAlertResult.classList.remove('hidden')
  } catch (e) {
    aiErrorText.textContent = e.message?.slice(0, 100) || '요약을 불러오지 못했습니다.'
    aiAlertLoading.classList.add('hidden')
    aiAlertError.classList.remove('hidden')
  }
}

// ── 목업 데이터 시드 ─────────────────────────────────────

function seedDemoData() {
  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
  }
  const hoursAgo = n => Date.now() - n * 3600000
  const daysAgo  = n => Date.now() - n * 86400000

  function img(bg, icon, label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${bg}"/><rect width="400" height="300" fill="black" opacity="0.35"/><text x="200" y="130" font-family="sans-serif" font-size="52" text-anchor="middle" fill="white">${icon}</text><text x="200" y="185" font-family="sans-serif" font-size="22" text-anchor="middle" fill="rgba(255,255,255,0.85)">${label}</text></svg>`
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  }

  const r = Array.from({ length: 15 }, uuid)
  const c = Array.from({ length: 7 },  uuid)

  const reports = [
    // [A] 싱크홀 — 정문 앞 보도
    { id: r[0],  clusterId: c[0], title: '협성대 정문 앞 보도 싱크홀 발견',        description: '정문 앞 보도 중앙에 직경 약 30cm 크기의 구멍이 생겼습니다. 등하교 학생들이 많아 즉각 조치가 필요합니다.',                            imageBase64: img('#7f1d1d','🕳️','싱크홀 발견'), location: { lat: 37.21320, lng: 126.95190, address: '경기 화성시 봉담읍 협성로 남문 앞'                     }, danger: 'high',   category: 'road',     createdAt: daysAgo(3)   },
    { id: r[1],  clusterId: c[0], title: '협성대 정문 보도 싱크홀 균열 확대',       description: '어제보다 구멍이 직경 50cm 이상으로 커졌고 주변 아스팔트에도 균열이 생겼습니다. 함몰 위험이 높습니다.',                              imageBase64: img('#991b1b','🕳️','균열 확대'),  location: { lat: 37.21322, lng: 126.95192, address: '경기 화성시 봉담읍 협성로 남문 앞'                     }, danger: 'high',   category: 'road',     createdAt: daysAgo(2)   },
    { id: r[2],  clusterId: c[0], title: '협성대 정문 인근 추가 균열 발생',         description: '기존 싱크홀 북쪽 2m 지점에 새로운 균열이 발생했습니다. 지반 침하가 넓은 범위에 걸쳐 진행 중인 것 같습니다.',                        imageBase64: img('#b91c1c','🕳️','추가 균열'),  location: { lat: 37.21325, lng: 126.95188, address: '경기 화성시 봉담읍 협성로 남문 앞'                     }, danger: 'high',   category: 'road',     createdAt: hoursAgo(8)  },
    // [B] 침수 — 진입로 저지대
    { id: r[3],  clusterId: c[1], title: '협성대 진입로 저지대 침수 시작',          description: '강우로 진입로 가장 낮은 구간에 물이 차기 시작했습니다. 차량 통행에 주의가 필요합니다.',                                          imageBase64: img('#1e3a5f','🌊','침수 시작'),  location: { lat: 37.21180, lng: 126.95350, address: '경기 화성시 봉담읍 협성대 진입로'                       }, danger: 'high',   category: 'weather',  createdAt: hoursAgo(5)  },
    { id: r[4],  clusterId: c[1], title: '협성대 진입로 완전 침수 — 통행 불가',     description: '진입로 전 구간이 침수되어 차량과 사람 모두 통행이 불가합니다. 우수관 역류로 홍수 범람 상태입니다.',                               imageBase64: img('#1e40af','🌊','완전 침수'),  location: { lat: 37.21182, lng: 126.95353, address: '경기 화성시 봉담읍 협성대 진입로'                       }, danger: 'high',   category: 'weather',  createdAt: hoursAgo(3)  },
    // [C] 가로등 고장 — 후문 골목
    { id: r[5],  clusterId: c[2], title: '협성대 후문 골목 가로등 고장',            description: '후문 골목 가로등 3개가 모두 꺼져 있습니다. 야간에 매우 어둡고 CCTV 사각지대입니다.',                                           imageBase64: img('#1c1917','🔦','가로등 고장'), location: { lat: 37.21150, lng: 126.95130, address: '경기 화성시 봉담읍 협성로 후문길'                       }, danger: 'medium', category: 'facility', createdAt: daysAgo(5)   },
    { id: r[6],  clusterId: c[2], title: '협성대 후문 가로등 이틀째 미수리',        description: '이틀 전 신고한 가로등이 아직도 수리되지 않았습니다. 늦은 밤 귀갓길 학생들이 많아 위험합니다.',                                  imageBase64: img('#1c1917','🔦','미수리'),     location: { lat: 37.21152, lng: 126.95132, address: '경기 화성시 봉담읍 협성로 후문길'                       }, danger: 'medium', category: 'safety',   createdAt: daysAgo(3)   },
    // [D] 포트홀 — 캠퍼스 순환도로
    { id: r[7],  clusterId: c[3], title: '협성대 캠퍼스 순환도로 포트홀 발생',      description: '순환도로 1차선에 작은 포트홀이 생겼습니다. 배달 오토바이 사고 위험이 있습니다.',                                               imageBase64: img('#44403c','🚧','포트홀 발견'), location: { lat: 37.21290, lng: 126.95420, address: '경기 화성시 봉담읍 협성대학교 캠퍼스 내 순환도로'         }, danger: 'medium', category: 'road',     createdAt: daysAgo(4)   },
    { id: r[8],  clusterId: c[3], title: '협성대 순환도로 포트홀 파손 심화',        description: '이전에 신고된 포트홀이 차량 통행으로 더 크게 파손됐습니다. 직경 약 40cm, 깊이 10cm 이상입니다.',                              imageBase64: img('#292524','🚧','포트홀 확대'), location: { lat: 37.21292, lng: 126.95422, address: '경기 화성시 봉담읍 협성대학교 캠퍼스 내 순환도로'         }, danger: 'medium', category: 'road',     createdAt: daysAgo(1)   },
    // [E] 어두운 골목 — 기숙사 뒷길
    { id: r[9],  clusterId: c[4], title: '기숙사 뒷길 야간 조명 없음',              description: '기숙사 후면 골목에 가로등과 조명이 전혀 없어 야간에 매우 어둡습니다. 수상한 인물이 자주 출몰한다는 제보가 있습니다.',             imageBase64: img('#0f172a','🌑','어두운 골목'), location: { lat: 37.21380, lng: 126.95310, address: '경기 화성시 봉담읍 협성대학교 기숙사 후면'               }, danger: 'low',    category: 'safety',   createdAt: daysAgo(7)   },
    // [F] 보도블록 파손 — 정문~버스정류장
    { id: r[10], clusterId: c[5], title: '협성대 정문~버스정류장 보도블록 파손',     description: '정문에서 버스정류장으로 이어지는 보행로에서 보도블록 여러 장이 깨지거나 뒤틀려 있습니다. 걸려 넘어질 위험이 있습니다.',          imageBase64: img('#365314','🧱','보도블록 파손'), location: { lat: 37.21240, lng: 126.95060, address: '경기 화성시 봉담읍 협성로 버스정류장 앞'                 }, danger: 'low',    category: 'facility', createdAt: daysAgo(10)  },
    { id: r[11], clusterId: c[5], title: '협성대 정류장 앞 보도블록 추가 파손',      description: '앞서 신고된 지점에서 10m 더 들어간 곳에도 보도블록 파손이 있습니다. 전체 구간 보수가 필요합니다.',                              imageBase64: img('#3f6212','🧱','추가 파손'),  location: { lat: 37.21242, lng: 126.95062, address: '경기 화성시 봉담읍 협성로 버스정류장 앞'                 }, danger: 'low',    category: 'facility', createdAt: daysAgo(6)   },
    // [G] 낙석 — 북측 언덕길
    { id: r[12], clusterId: c[6], title: '협성대 북측 언덕길 낙석 위험',            description: '북측 언덕 비탈면에서 작은 돌이 굴러 내려오고 있습니다. 낙석 위험 구역이지만 표지판이 없습니다.',                               imageBase64: img('#78350f','🪨','낙석 위험'),  location: { lat: 37.21450, lng: 126.95220, address: '경기 화성시 봉담읍 협성대학교 북측 언덕로'               }, danger: 'high',   category: 'road',     createdAt: daysAgo(2)   },
    { id: r[13], clusterId: c[6], title: '협성대 북측 언덕 낙석 추가 발생',         description: '오늘 오전에도 주먹만한 돌이 굴러 내려왔습니다. 통학하는 학생들이 많은 시간대라 매우 위험합니다.',                               imageBase64: img('#92400e','🪨','낙석 추가'),  location: { lat: 37.21452, lng: 126.95222, address: '경기 화성시 봉담읍 협성대학교 북측 언덕로'               }, danger: 'high',   category: 'road',     createdAt: hoursAgo(12) },
    { id: r[14], clusterId: c[6], title: '협성대 북측 대형 낙석 — 통행 차단 필요', description: '농구공 크기의 대형 낙석이 굴러와 언덕길을 막고 있습니다. 추락 및 낙하 위험이 극심합니다. 즉각 출입 통제가 필요합니다.',           imageBase64: img('#a16207','🪨','대형 낙석'),  location: { lat: 37.21455, lng: 126.95218, address: '경기 화성시 봉담읍 협성대학교 북측 언덕로'               }, danger: 'high',   category: 'road',     createdAt: hoursAgo(4)  },
  ]

  const clusters = [
    { id: c[0], representId: r[0],  reportIds: [r[0], r[1], r[2]],         location: { lat: 37.21320, lng: 126.95190 }, danger: 'high',   category: 'road',     embeddingVector: null, createdAt: daysAgo(3),  updatedAt: hoursAgo(8) },
    { id: c[1], representId: r[3],  reportIds: [r[3], r[4]],               location: { lat: 37.21180, lng: 126.95350 }, danger: 'high',   category: 'weather',  embeddingVector: null, createdAt: hoursAgo(5), updatedAt: hoursAgo(3) },
    { id: c[2], representId: r[5],  reportIds: [r[5], r[6]],               location: { lat: 37.21150, lng: 126.95130 }, danger: 'medium', category: 'facility', embeddingVector: null, createdAt: daysAgo(5),  updatedAt: daysAgo(3)  },
    { id: c[3], representId: r[7],  reportIds: [r[7], r[8]],               location: { lat: 37.21290, lng: 126.95420 }, danger: 'medium', category: 'road',     embeddingVector: null, createdAt: daysAgo(4),  updatedAt: daysAgo(1)  },
    { id: c[4], representId: r[9],  reportIds: [r[9]],                     location: { lat: 37.21380, lng: 126.95310 }, danger: 'low',    category: 'safety',   embeddingVector: null, createdAt: daysAgo(7),  updatedAt: daysAgo(7)  },
    { id: c[5], representId: r[10], reportIds: [r[10], r[11]],             location: { lat: 37.21240, lng: 126.95060 }, danger: 'low',    category: 'facility', embeddingVector: null, createdAt: daysAgo(10), updatedAt: daysAgo(6)  },
    { id: c[6], representId: r[12], reportIds: [r[12], r[13], r[14]],      location: { lat: 37.21450, lng: 126.95220 }, danger: 'high',   category: 'road',     embeddingVector: null, createdAt: daysAgo(2),  updatedAt: hoursAgo(4) },
  ]

  localStorage.setItem('reports',  JSON.stringify(reports))
  localStorage.setItem('clusters', JSON.stringify(clusters))
}

document.getElementById('seed-btn').addEventListener('click', () => {
  if (!confirm('테스트 데이터를 주입하고 페이지를 새로고침합니다.\n기존 데이터는 덮어씌워집니다.')) return
  seedDemoData()
  location.reload()
})



// ── 모델 다운로드 배너 ────────────────────────────────────

const embedderBanner = document.getElementById('embedder-banner')
const embedderBar    = document.getElementById('embedder-bar')
const embedderPct    = document.getElementById('embedder-pct')

if (!isEmbedderReady()) {
  embedderBanner.classList.remove('hidden')

  initEmbedder(p => {
    if (typeof p.progress !== 'number') return
    const pct = Math.round(p.progress)
    embedderBar.style.width = `${pct}%`
    embedderPct.textContent = `${pct}%`
    if (pct >= 100) embedderBanner.classList.add('hidden')
  }).then(() => {
    embedderBanner.classList.add('hidden')
  }).catch(() => {
    embedderBanner.classList.add('hidden')
  })
}

// ── 초기화 ───────────────────────────────────────────────
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude
      userLng = pos.coords.longitude
      initMap(userLat, userLng)
      renderList(userLat, userLng)
      updateActiveDot()
      if (isConfigured()) runAISummary()
    },
    () => {
      initMap(userLat, userLng)
      renderList(userLat, userLng)
      updateActiveDot()
      if (isConfigured()) runAISummary()
    },
    { timeout: 6000, enableHighAccuracy: true }
  )
} else {
  initMap(userLat, userLng)
  renderList(userLat, userLng)
  updateActiveDot()
  if (isConfigured()) runAISummary()
}
