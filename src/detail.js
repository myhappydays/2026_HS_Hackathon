/**
 * detail.js
 * 상세 페이지 - 군집 대표 정보 + 관련 제보 리스트 + 사진 캐러셀
 */

import { getClusterById, getReportById } from './storage.js'
import { dangerStyle, categoryLabel, relativeTime } from './utils.js'

const loadingState  = document.getElementById('loading-state')
const detailContent = document.getElementById('detail-content')
const errorState    = document.getElementById('error-state')

// URL에서 클러스터 ID 읽기
const clusterId = new URLSearchParams(location.search).get('id')

function init() {
  if (!clusterId) { showError(); return }

  const cluster = getClusterById(clusterId)
  if (!cluster)  { showError(); return }

  const repReport = getReportById(cluster.representId)
  if (!repReport) { showError(); return }

  renderDetail(cluster, repReport)
}

function showError() {
  loadingState.classList.add('hidden')
  errorState.classList.remove('hidden')
}

function renderDetail(cluster, repReport) {
  // 캐러셀: 군집 내 모든 제보의 사진
  const allReports = cluster.reportIds
    .map(id => getReportById(id))
    .filter(Boolean)
    .filter(r => r.imageBase64)

  renderCarousel(allReports)

  // 뱃지
  const ds  = dangerStyle(cluster.danger)
  const cat = categoryLabel(cluster.category)
  document.getElementById('badge-area').innerHTML = `
    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ds.bg} ${ds.text}">${ds.label}</span>
    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground">${cat}</span>
    ${cluster.reportIds.length > 1
      ? `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">제보 ${cluster.reportIds.length}건</span>`
      : ''}
  `

  // 대표 정보
  document.getElementById('cluster-title').textContent       = repReport.title
  document.getElementById('cluster-description').textContent = repReport.description || '상세 설명이 없습니다.'
  document.getElementById('cluster-address').textContent     = repReport.location.address || '위치 정보 없음'
  document.getElementById('cluster-time').textContent        = `${relativeTime(cluster.createdAt)} 최초 등록 · ${relativeTime(cluster.updatedAt)} 업데이트`
  document.getElementById('related-count').textContent       = `${cluster.reportIds.length}건`

  // 관련 제보 리스트
  const relatedList = document.getElementById('related-list')
  relatedList.innerHTML = allReports.map((r, i) => `
    <div class="flex gap-3 p-3 rounded-xl bg-card border border-border">
      <div class="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
        <img src="${r.imageBase64}" class="w-full h-full object-cover" alt="제보 사진">
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1 mb-0.5">
          ${i === 0 ? '<span class="text-[10px] text-primary font-semibold">대표 제보</span>' : ''}
          <span class="text-[10px] text-muted-foreground ml-auto">${relativeTime(r.createdAt)}</span>
        </div>
        <p class="text-sm font-medium text-foreground truncate">${r.title}</p>
        <p class="text-xs text-muted-foreground truncate mt-0.5">${r.description || ''}</p>
      </div>
    </div>
  `).join('')

  // 표시
  loadingState.classList.add('hidden')
  detailContent.classList.remove('hidden')
}

// ── 캐러셀 (Preline data-hs-carousel) ────────────────────

function renderCarousel(reports) {
  const wrap = document.getElementById('carousel-wrap')

  if (reports.length === 0) {
    wrap.classList.add('hidden')
    return
  }

  // 슬라이드 주입
  const body = document.getElementById('carousel-body')
  body.innerHTML = reports.map(r => `
    <div class="hs-carousel-slide flex-shrink-0 w-full">
      <img src="${r.imageBase64}" alt="제보 사진"
        class="w-full object-cover" style="height:260px;">
    </div>
  `).join('')

  // pagination dots 주입 (Preline은 hs-carousel-pagination-item span을 직접 넣어야 함)
  const pagination = wrap.querySelector('.hs-carousel-pagination')
  if (pagination) {
    pagination.innerHTML = reports.map((_, i) => `
      <span class="hs-carousel-pagination-item${i === 0 ? ' active' : ''}">
        <span></span>
      </span>
    `).join('')
  }

  // 슬라이드 1장이면 버튼 숨기기
  if (reports.length <= 1) {
    wrap.querySelector('.hs-carousel-prev')?.classList.add('hidden')
    wrap.querySelector('.hs-carousel-next')?.classList.add('hidden')
    if (pagination) pagination.classList.add('hidden')
  }

  // Preline 캐러셀 초기화 (DOM 주입 후 수동 init)
  if (window.HSCarousel) {
    window.HSCarousel.autoInit()
  }
}

init()
