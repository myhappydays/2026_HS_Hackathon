/**
 * detail.js
 * 상세 페이지 - 군집 대표 정보 + 관련 제보 리스트 + 사진 캐러셀
 */

import { getClusterById, getReportById } from './storage.js'
import { dangerStyle, categoryLabel, relativeTime } from './utils.js'

const BASE = import.meta.env.BASE_URL
document.getElementById('nav-home').href = `${BASE}index.html`
document.getElementById('nav-home-fallback').href = `${BASE}index.html`

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

  // 관련 제보 리스트 (Preline Accordion)
  const relatedList = document.getElementById('related-list')
  relatedList.innerHTML = `
    <div class="hs-accordion-group space-y-3">
      ${allReports.map((r, i) => {
        const rds = dangerStyle(r.danger)
        const rcat = categoryLabel(r.category)
        return `
        <div class="hs-accordion bg-card border border-border rounded-xl overflow-hidden" id="acc-${r.id}">
          <button type="button"
            class="hs-accordion-toggle w-full flex gap-3 p-3 text-left hover:bg-surface/50 transition"
            aria-expanded="false" aria-controls="acc-body-${r.id}">
            <div class="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
              ${r.imageBase64
                ? `<img src="${r.imageBase64}" class="w-full h-full object-cover" alt="제보 사진">`
                : `<div class="w-full h-full flex items-center justify-center">
                     <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/>
                     </svg>
                   </div>`
              }
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1 mb-0.5">
                ${i === 0 ? '<span class="text-[10px] text-primary font-semibold">대표 제보</span>' : ''}
                <span class="text-[10px] text-muted-foreground ml-auto">${relativeTime(r.createdAt)}</span>
              </div>
              <p class="text-sm font-medium text-foreground truncate">${r.title}</p>
              <p class="text-xs text-muted-foreground truncate mt-0.5">${r.description || ''}</p>
            </div>
            <svg class="hs-accordion-active:rotate-180 w-4 h-4 flex-shrink-0 self-center text-muted-foreground transition-transform duration-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
            </svg>
          </button>

          <div id="acc-body-${r.id}" class="hs-accordion-content hidden w-full overflow-hidden transition-[height] duration-300" role="region" aria-labelledby="acc-${r.id}">
            <div class="border-t border-border px-4 py-3 space-y-3">
              <div class="flex items-center gap-2">
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${rds.bg} ${rds.text}">${rds.label}</span>
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground">${rcat}</span>
              </div>
              ${r.imageBase64 ? `<img src="${r.imageBase64}" alt="제보 사진" class="w-full rounded-lg object-cover" style="max-height:220px;">` : ''}
              <div>
                <p class="text-sm font-semibold text-foreground">${r.title}</p>
                ${r.description ? `<p class="text-xs text-muted-foreground mt-1 leading-relaxed">${r.description}</p>` : ''}
              </div>
              <div class="flex flex-col gap-1 text-xs text-muted-foreground">
                <div class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                  </svg>
                  <span>${r.location?.address || '위치 정보 없음'}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>${relativeTime(r.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        `}).join('')}
    </div>
  `

  // Preline Accordion 재초기화 (동적 DOM 주입 후)
  if (window.HSAccordion) window.HSAccordion.autoInit()

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

  // pagination dots 주입
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

  // Preline 캐러셀 초기화
  if (window.HSCarousel) {
    window.HSCarousel.autoInit()
  }
}

init()
