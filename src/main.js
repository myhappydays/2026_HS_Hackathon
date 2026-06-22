/**
 * main.js
 * 메인 페이지 - 카카오 지도 뷰 + 제보 리스트
 */

import { getClusters, getReportById } from './storage.js'
import { dangerStyle, categoryLabel, relativeTime } from './utils.js'
import { haversineDistance } from './clustering.js'

const reportList  = document.getElementById('report-list')
const emptyState  = document.getElementById('empty-state')
const reportCount = document.getElementById('report-count')
const mapPlaceholder = document.getElementById('map-placeholder')

// 위험도 → 카카오 지도 마커 색상 (커스텀 오버레이용)
const DANGER_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }

// ── 지도 초기화 ──────────────────────────────────────────

let kakaoMap = null
let userLat = 37.5665
let userLng = 126.9780

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

  mapPlaceholder.classList.add('hidden')
  renderMarkers()
}

function renderMarkers() {
  if (!kakaoMap) return
  const clusters = getClusters()

  clusters.forEach(cluster => {
    const color = DANGER_COLOR[cluster.danger] || DANGER_COLOR.medium
    const pos   = new kakao.maps.LatLng(cluster.location.lat, cluster.location.lng)

    // 커스텀 오버레이로 색상 있는 원형 마커
    const content = `
      <div style="
        width:14px; height:14px; border-radius:50%;
        background:${color}; border:2px solid white;
        box-shadow:0 0 0 2px ${color}44;
        cursor:pointer;
      "></div>`

    const overlay = new kakao.maps.CustomOverlay({ position: pos, content, yAnchor: 0.5 })
    overlay.setMap(kakaoMap)

    // 마커 클릭 → 상세 페이지
    overlay.getContent().addEventListener?.('click', () => {
      location.href = `/detail.html?id=${cluster.id}`
    })
  })
}

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
      <a href="/detail.html?id=${cluster.id}"
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

// ── 초기화 ───────────────────────────────────────────────

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude
      userLng = pos.coords.longitude
      initMap(userLat, userLng)
      renderList(userLat, userLng)
    },
    () => {
      initMap(userLat, userLng)
      renderList(userLat, userLng)
    },
    { timeout: 6000, enableHighAccuracy: true }
  )
} else {
  initMap(userLat, userLng)
  renderList(userLat, userLng)
}
