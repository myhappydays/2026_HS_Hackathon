/**
 * detail.js
 * 상세 페이지 - 군집 대표 정보 + 관련 제보 리스트 + 사진 캐러셀
 */

import { getClusterById, getReportById, deleteReport, deleteCluster, updateCluster, updateReport } from './storage.js'
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

  // 내가 공감한 군집 ID 관리
  const getLikedList = () => JSON.parse(localStorage.getItem('my_likes') || '[]')
  const btnLike = document.getElementById('btn-like')

  // 초기 렌더링 시 이미 공감했다면 UI 변경
  if (getLikedList().includes(cluster.id)) {
    btnLike.classList.replace('bg-primary/10', 'bg-primary')
    btnLike.classList.replace('text-primary', 'text-white')
    btnLike.classList.add('opacity-80', 'cursor-not-allowed')
    btnLike.innerHTML = `✔️ 공감 완료 <span id="like-count" class="ml-1 text-white">${cluster.likes || 0}</span>`
  }

  // 공감 버튼 이벤트
  btnLike.addEventListener('click', () => {
    const likedList = getLikedList()
    
    // 이미 공감했는지 검사
    if (likedList.includes(cluster.id)) {
      alert('이미 공감(위험 확인)을 표시한 제보입니다.')
      return
    }

    cluster.likes = (cluster.likes || 0) + 1
    updateCluster(cluster)
    
    // 로컬스토리지에 저장 (1계정당 1회)
    likedList.push(cluster.id)
    localStorage.setItem('my_likes', JSON.stringify(likedList))

    // UI 즉시 업데이트
    btnLike.classList.replace('bg-primary/10', 'bg-primary')
    btnLike.classList.replace('text-primary', 'text-white')
    btnLike.classList.add('opacity-80', 'cursor-not-allowed')
    btnLike.innerHTML = `✔️ 공감 완료 <span id="like-count" class="ml-1 text-white">${cluster.likes}</span>`
  })

  // 댓글 폼 이벤트
  document.getElementById('comment-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const input = document.getElementById('comment-input')
    const text = input.value.trim()
    if (!text) return

    if (!cluster.comments) cluster.comments = []
    
    // 익명 생성기
    const anonNames = ['익명의 주민', '동네 보안관', '지나가는 행인', '안전 요원', '목격자']
    const randomName = anonNames[Math.floor(Math.random() * anonNames.length)]

    cluster.comments.push({
      id: Date.now().toString(),
      text,
      author: randomName,
      createdAt: new Date().toISOString()
    })
    
    updateCluster(cluster)
    input.value = ''
    renderDetail(cluster, repReport) // 리렌더링
  })
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
  const isResolved = cluster.status === 'resolved'
  const ds  = dangerStyle(cluster.danger)
  const cat = categoryLabel(cluster.category)
  const statusBadge = isResolved
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400">
         <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
         해결 완료
       </span>`
    : `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ds.bg} ${ds.text}">${ds.label}</span>`

  document.getElementById('badge-area').innerHTML = `
    ${statusBadge}
    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground">${cat}</span>
    ${cluster.reportIds.length > 1
      ? `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">제보 ${cluster.reportIds.length}건</span>`
      : ''}
  `

  // 상태 토글 버튼
  const btnToggleStatus = document.getElementById('btn-toggle-status')
  const btnToggleStatusText = document.getElementById('btn-toggle-status-text')
  if (btnToggleStatus && btnToggleStatusText) {
    btnToggleStatusText.textContent = isResolved ? '진행 중으로 변경' : '해결 완료로 변경'
    btnToggleStatus.onclick = () => {
      cluster.status = isResolved ? 'active' : 'resolved'
      updateCluster(cluster)
      renderDetail(cluster, repReport)
    }
  }

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
              <div class="flex justify-end gap-2 mt-3 pt-3 border-t border-border/50">
                <button type="button" class="btn-edit-report py-1.5 px-3 bg-surface border border-border text-foreground hover:bg-surface-1 rounded-lg text-xs font-semibold transition" data-id="${r.id}">
                  수정
                </button>
                <button type="button" class="btn-delete-report py-1.5 px-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-semibold transition" data-id="${r.id}">
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
        `}).join('')}
    </div>
  `

  // Preline Accordion 재초기화 (동적 DOM 주입 후)
  if (window.HSAccordion) window.HSAccordion.autoInit()

  document.querySelectorAll('.btn-edit-report').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const rid = btn.getAttribute('data-id')
      handleEditReport(rid)
    })
  })

  document.querySelectorAll('.btn-delete-report').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const rid = btn.getAttribute('data-id')
      if (confirm('이 제보를 삭제하시겠습니까?')) {
        handleDeleteReport(cluster, rid)
      }
    })
  })

  // 공감 렌더링
  document.getElementById('like-count').textContent = cluster.likes || 0

  // 댓글 렌더링
  const comments = cluster.comments || []
  document.getElementById('comment-count').textContent = `${comments.length}개`
  
  const commentList = document.getElementById('comment-list')
  if (comments.length === 0) {
    commentList.innerHTML = `<p class="text-sm text-muted-foreground text-center py-4">아직 공유된 상황이 없습니다. 첫 번째로 상황을 공유해주세요!</p>`
  } else {
    commentList.innerHTML = comments.map(c => `
      <div class="flex gap-2">
        <div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
          ${c.author.charAt(0)}
        </div>
        <div class="flex-1 bg-surface border border-border rounded-lg rounded-tl-none p-3">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs font-semibold text-foreground">${c.author}</span>
            <span class="text-[10px] text-muted-foreground">${relativeTime(c.createdAt)}</span>
          </div>
          <p class="text-sm text-foreground">${c.text}</p>
        </div>
      </div>
    `).join('')
  }

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

function handleDeleteReport(cluster, reportId) {
  deleteReport(reportId)

  // 군집 업데이트
  cluster.reportIds = cluster.reportIds.filter(id => id !== reportId)

  if (cluster.reportIds.length === 0) {
    // 모든 제보가 지워지면 군집도 삭제
    deleteCluster(cluster.id)
    alert('모든 제보가 삭제되어 군집이 사라졌습니다.')
    location.href = `${BASE}index.html`
  } else {
    // 대표 제보가 삭제되었다면 다른 제보로 대표 변경
    if (cluster.representId === reportId) {
      cluster.representId = cluster.reportIds[0]
    }
    updateCluster(cluster)
    alert('제보가 삭제되었습니다.')
    location.reload()
  }
}

function handleEditReport(reportId) {
  const report = getReportById(reportId)
  if (!report) return

  const newDesc = prompt('수정할 내용을 입력하세요 (상세 설명):', report.description || '')
  
  if (newDesc !== null && newDesc.trim() !== '') {
    report.description = newDesc.trim()
    report.updatedAt = new Date().toISOString()
    updateReport(report)
    
    // 군집 업데이트
    const cluster = getClusterById(clusterId)
    cluster.updatedAt = new Date().toISOString()
    updateCluster(cluster)
    
    alert('제보 내용이 수정되었습니다.')
    location.reload()
  }
}
