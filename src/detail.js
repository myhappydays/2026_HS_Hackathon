/**
 * detail.js
 * 상세 페이지 - 군집 대표 정보 + 관련 제보 리스트 + 사진 캐러셀
 */

import { getClusterById, getReportById, deleteReport, deleteCluster, updateCluster, updateReport, getClusters, getReports } from './storage.js'
import { dangerStyle, categoryLabel, relativeTime } from './utils.js'
import { getCurrentUser } from './auth.js'
import { initShareCard, openShareModal } from './shareCard.js'
import { initTheme } from './theme.js'

// 테마 초기화
initTheme()

const BASE = import.meta.env.BASE_URL || './'
const navHome = document.getElementById('nav-home')
if (navHome) navHome.href = `${BASE}index.html`
const navHomeFallback = document.getElementById('nav-home-fallback')
if (navHomeFallback) navHomeFallback.href = `${BASE}index.html`

const loadingState  = document.getElementById('loading-state')
const detailContent = document.getElementById('detail-content')
const errorState    = document.getElementById('error-state')

// URL에서 클러스터 ID 읽기
const clusterId = new URLSearchParams(location.search).get('id')

function showError() {
  if (loadingState) loadingState.classList.add('hidden')
  if (detailContent) detailContent.classList.add('hidden')
  if (errorState) errorState.classList.remove('hidden')
}

async function init() {
  try {
    if (!clusterId) {
      showError()
      return
    }

    let cluster = await getClusterById(clusterId)

    // 1. clusterId가 아닌 reportId로 접근했을 경우 fallback 탐색
    if (!cluster) {
      const rep = await getReportById(clusterId)
      if (rep) {
        if (rep.clusterId) {
          cluster = await getClusterById(rep.clusterId)
        }
        if (!cluster) {
          // 클러스터가 없거나 분실된 단일 제보인 경우 임시 클러스터 객체 생성
          cluster = {
            id: rep.clusterId || rep.id,
            representId: rep.id,
            reportIds: [rep.id],
            location: rep.location,
            danger: rep.danger,
            category: rep.category,
            status: rep.status || 'active',
            createdAt: rep.createdAt,
          }
        }
      }
    }

    // 2. 여전히 클러스터를 찾지 못한 경우 (ID 불일치 시 로컬/원격 전체 클러스터에서 검색)
    if (!cluster) {
      const allClusters = await getClusters()
      cluster = allClusters.find(c => c.id === clusterId || (c.reportIds && c.reportIds.includes(clusterId)))
    }

    if (!cluster) {
      showError()
      return
    }

    // 3. 대표 리포트 찾기
    let repReport = cluster.representId ? await getReportById(cluster.representId) : null

    // 대표 리포트가 없으면 reportIds 배열 순회하여 첫 번째 유효 리포트 선택
    if (!repReport && Array.isArray(cluster.reportIds) && cluster.reportIds.length > 0) {
      for (const rId of cluster.reportIds) {
        const found = await getReportById(rId)
        if (found) {
          repReport = found
          cluster.representId = found.id
          break
        }
      }
    }

    // 4. 그래도 리포트를 찾지 못한 경우 안전한 Fallback 객체 생성
    if (!repReport) {
      repReport = {
        id: cluster.representId || cluster.id,
        title: cluster.title || '위험 제보 상세',
        description: cluster.description || '',
        location: cluster.location || { address: '위치 정보 없음' },
        danger: cluster.danger || 'medium',
        category: cluster.category || 'road',
        createdAt: cluster.createdAt || Date.now(),
      }
    }

    await renderDetail(cluster, repReport)

    // SNS 바이럴 안전 카드 공유 기능 연동
    try {
      initShareCard(() => ({
        clusters: [cluster],
        reportsMap: new Map([[repReport.id, repReport]]),
        targetLat: cluster.location?.lat,
        targetLng: cluster.location?.lng,
        currentRegionName: repReport.location?.address || '',
      }))
    } catch (e) {
      console.warn('[detail] initShareCard error:', e)
    }

    document.getElementById('btn-share-card')?.addEventListener('click', () => {
      openShareModal({ type: 'report', report: repReport, cluster })
    })

    // 공감 & 댓글 기능 바인딩
    setupLikes(cluster)
    setupComments(cluster, repReport)

  } catch (err) {
    console.error('[detail] Init failed:', err)
    showError()
  }
}

function setupLikes(cluster) {
  const getLikedList = () => {
    try {
      return JSON.parse(localStorage.getItem('my_likes') || '[]')
    } catch {
      return []
    }
  }
  const btnLike = document.getElementById('btn-like')
  if (!btnLike) return

  // 초기 렌더링 시 이미 공감했다면 UI 변경
  if (getLikedList().includes(cluster.id)) {
    btnLike.classList.replace('bg-primary/10', 'bg-primary')
    btnLike.classList.replace('text-primary', 'text-white')
    btnLike.classList.add('opacity-80', 'cursor-not-allowed')
    btnLike.innerHTML = `⚠️ 공감 완료 <span id="like-count" class="ml-1 text-white">${cluster.likes || 0}</span>`
  }

  // 공감 버튼 이벤트
  if (!btnLike._hasListener) {
    btnLike._hasListener = true
    btnLike.addEventListener('click', async () => {
      const likedList = getLikedList()
      if (likedList.includes(cluster.id)) {
        alert('이미 공감(위험 확인)을 표시한 제보입니다.')
        return
      }

      cluster.likes = (cluster.likes || 0) + 1
      await updateCluster(cluster)

      likedList.push(cluster.id)
      localStorage.setItem('my_likes', JSON.stringify(likedList))

      btnLike.classList.replace('bg-primary/10', 'bg-primary')
      btnLike.classList.replace('text-primary', 'text-white')
      btnLike.classList.add('opacity-80', 'cursor-not-allowed')
      btnLike.innerHTML = `⚠️ 공감 완료 <span id="like-count" class="ml-1 text-white">${cluster.likes}</span>`
    })
  }
}

function setupComments(cluster, repReport) {
  const commentForm = document.getElementById('comment-form')
  const commentSubmitBtn = document.getElementById('btn-comment-submit')

  const handleCommentSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const input = document.getElementById('comment-input')
    const text = input ? input.value.trim() : ''
    if (!text) {
      alert('공유할 상황을 입력해주세요.')
      return
    }

    if (!cluster.comments) cluster.comments = []
    
    const anonNames = ['익명의 주민', '동네 보안관', '지나가는 행인', '안전 요원', '목격자']
    const randomName = anonNames[Math.floor(Math.random() * anonNames.length)]

    cluster.comments.push({
      id: Date.now().toString(),
      text,
      author: randomName,
      createdAt: new Date().toISOString()
    })
    
    await updateCluster(cluster)
    if (input) input.value = ''
    await renderDetail(cluster, repReport)
  }

  if (commentForm && !commentForm._hasListener) {
    commentForm._hasListener = true
    commentForm.addEventListener('submit', handleCommentSubmit)
  } else if (commentSubmitBtn && !commentSubmitBtn._hasListener) {
    commentSubmitBtn._hasListener = true
    commentSubmitBtn.addEventListener('click', handleCommentSubmit)
  }
}

async function renderDetail(cluster, repReport) {
  // 캐러셀: 군집 내 모든 제보의 사진
  let allReports = []
  try {
    if (Array.isArray(cluster.reportIds) && cluster.reportIds.length > 0) {
      const allReportsRaw = await Promise.all(cluster.reportIds.map(id => getReportById(id)))
      allReports = allReportsRaw.filter(Boolean)
    }
  } catch (e) {
    console.warn('[detail] Fetching cluster reports failed:', e)
  }
  if (allReports.length === 0 && repReport) {
    allReports = [repReport]
  }

  const photoReports = allReports.filter(r => r.imageBase64)
  renderCarousel(photoReports.length > 0 ? photoReports : (repReport.imageBase64 ? [repReport] : []))

  // 대표 제보 정보
  const isResolved = cluster.status === 'resolved'
  const ds = dangerStyle(cluster.danger)

  // 뱃지 영역 안전 렌더링
  const badgeArea = document.getElementById('badge-area')
  let dangerBadge = document.getElementById('cluster-danger-badge')
  let catBadge    = document.getElementById('cluster-cat-badge')
  let countBadge  = document.getElementById('cluster-count-badge')

  if (!dangerBadge && badgeArea) {
    dangerBadge = document.createElement('span')
    dangerBadge.id = 'cluster-danger-badge'
    badgeArea.appendChild(dangerBadge)
  }
  if (!catBadge && badgeArea) {
    catBadge = document.createElement('span')
    catBadge.id = 'cluster-cat-badge'
    badgeArea.appendChild(catBadge)
  }
  if (!countBadge && badgeArea) {
    countBadge = document.createElement('span')
    countBadge.id = 'cluster-count-badge'
    badgeArea.appendChild(countBadge)
  }

  if (dangerBadge) {
    if (isResolved) {
      dangerBadge.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400'
      dangerBadge.innerHTML = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
        </svg>
        해결 완료
      `
    } else {
      dangerBadge.className = `inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${ds.bg} ${ds.text}`
      dangerBadge.textContent = ds.label
    }
  }

  if (catBadge) {
    catBadge.className = 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground border border-border'
    catBadge.textContent = categoryLabel(cluster.category)
  }

  if (countBadge) {
    if (cluster.reportIds && cluster.reportIds.length > 1) {
      countBadge.className = 'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20'
      countBadge.textContent = `${cluster.reportIds.length}건 묶임`
      countBadge.classList.remove('hidden')
    } else {
      countBadge.classList.add('hidden')
    }
  }

  // 제목, 설명, 위치, 시간
  const titleEl = document.getElementById('cluster-title')
  if (titleEl) titleEl.textContent = repReport.title || '위험 제보'

  const descEl = document.getElementById('cluster-description')
  if (descEl) descEl.textContent = repReport.description || ''

  const addrEl = document.getElementById('cluster-address')
  if (addrEl) addrEl.textContent = repReport.location?.address || cluster.location?.address || '위치 정보 없음'

  const timeEl = document.getElementById('cluster-time')
  if (timeEl) timeEl.textContent = `${relativeTime(cluster.createdAt || repReport.createdAt || Date.now())} 제보`

  // 관련 제보 아코디언 (Preline)
  const relatedCount = document.getElementById('related-count')
  const relatedList  = document.getElementById('related-list')

  if (relatedCount) relatedCount.textContent = `총 ${allReports.length}건`

  if (relatedList) {
    relatedList.innerHTML = `
      <div class="hs-accordion-group space-y-2">
        ${allReports.map((r, i) => {
          const rds  = dangerStyle(r.danger)
          const rcat = categoryLabel(r.category)
          const isUserAuthor = !r.userId || r.userId === 'anonymous' || (currentUser && currentUser.uid === r.userId)
          return `
          <div class="hs-accordion bg-surface border border-border rounded-xl overflow-hidden" id="acc-${r.id}">
            <button class="hs-accordion-toggle hs-accordion-active:text-primary w-full py-3 px-4 flex items-center justify-between text-left text-sm font-medium text-foreground hover:bg-surface-1 transition gap-3"
              aria-controls="acc-body-${r.id}">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${rds.bg} ${rds.text}">${rds.label}</span>
                  <span class="text-[10px] text-muted-foreground">${rcat}</span>
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
                  ${isUserAuthor ? `
                  <button type="button" class="btn-edit-report py-1.5 px-3 bg-surface border border-border text-foreground hover:bg-surface-1 rounded-lg text-xs font-semibold transition" data-id="${r.id}">
                    수정
                  </button>
                  <button type="button" class="btn-delete-report py-1.5 px-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-semibold transition" data-id="${r.id}">
                    삭제
                  </button>
                  ` : `
                  <button type="button" class="btn-report-report py-1.5 px-3 bg-surface border border-border text-muted-foreground hover:text-red-500 rounded-lg text-xs font-medium transition" data-id="${r.id}">
                    🚨 신고
                  </button>
                  `}
                </div>
              </div>
            </div>
          </div>
          `}).join('')}
      </div>
    `

    // Preline Accordion 재초기화
    if (window.HSAccordion) {
      try { window.HSAccordion.autoInit() } catch (e) {}
    }

    document.querySelectorAll('.btn-report-report').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const rid = btn.getAttribute('data-id')
        if (confirm('이 제보를 불량/허위 제보로 신고하시겠습니까?')) {
          const r = allReports.find(x => x.id === rid)
          if (r) {
            r.reportCount = (r.reportCount || 0) + 1
            await updateReport(r)
            alert('신고가 접수되었습니다. (누적 신고: ' + r.reportCount + '회)')
          }
        }
      })
    })

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
  }

  // 공감 렌더링
  const likeEl = document.getElementById('like-count')
  if (likeEl) likeEl.textContent = cluster.likes || 0

  // 댓글 렌더링
  const comments = cluster.comments || []
  const commentCountEl = document.getElementById('comment-count')
  if (commentCountEl) commentCountEl.textContent = `${comments.length}개`
  
  const commentList = document.getElementById('comment-list')
  if (commentList) {
    if (comments.length === 0) {
      commentList.innerHTML = `<p class="text-sm text-muted-foreground text-center py-4">아직 공유된 상황이 없습니다. 첫 번째로 상황을 공유해주세요!</p>`
    } else {
      commentList.innerHTML = comments.map(c => `
        <div class="flex gap-2">
          <div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
            ${(c.author || '익').charAt(0)}
          </div>
          <div class="flex-1 bg-surface border border-border rounded-lg rounded-tl-none p-3">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs font-semibold text-foreground">${c.author || '익명'}</span>
              <span class="text-[10px] text-muted-foreground">${relativeTime(c.createdAt)}</span>
            </div>
            <p class="text-sm text-foreground">${c.text}</p>
          </div>
        </div>
      `).join('')
    }
  }

  // 표시 전환
  if (loadingState) loadingState.classList.add('hidden')
  if (errorState) errorState.classList.add('hidden')
  if (detailContent) detailContent.classList.remove('hidden')
}

// ── 캐러셀 (Preline data-hs-carousel) ────────────────────

function renderCarousel(reports) {
  const wrap = document.getElementById('carousel-wrap')
  if (!wrap) return

  if (reports.length === 0) {
    wrap.classList.add('hidden')
    return
  }
  wrap.classList.remove('hidden')

  // 슬라이드 주입
  const body = document.getElementById('carousel-body')
  if (!body) return
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
  const prevBtn = wrap.querySelector('.hs-carousel-prev')
  const nextBtn = wrap.querySelector('.hs-carousel-next')
  if (reports.length <= 1) {
    prevBtn?.classList.add('hidden')
    nextBtn?.classList.add('hidden')
    if (pagination) pagination.classList.add('hidden')
  } else {
    prevBtn?.classList.remove('hidden')
    nextBtn?.classList.remove('hidden')
    if (pagination) pagination.classList.remove('hidden')
  }

  // Preline 캐러셀 초기화
  if (window.HSCarousel) {
    try { window.HSCarousel.autoInit() } catch (e) {}
  }
}

init()

async function handleDeleteReport(cluster, reportId) {
  await deleteReport(reportId)

  // 군집 업데이트
  cluster.reportIds = (cluster.reportIds || []).filter(id => id !== reportId)

  if (cluster.reportIds.length === 0) {
    // 모든 제보가 지워지면 군집도 삭제
    await deleteCluster(cluster.id)
    alert('모든 제보가 삭제되어 군집이 사라졌습니다.')
    location.href = `${BASE}index.html`
  } else {
    // 대표 제보가 삭제되었다면 다른 제보로 대표 변경
    if (cluster.representId === reportId) {
      cluster.representId = cluster.reportIds[0]
    }
    await updateCluster(cluster)
    alert('제보가 삭제되었습니다.')
    location.reload()
  }
}

async function handleEditReport(reportId) {
  const report = await getReportById(reportId)
  if (!report) return

  const newDesc = prompt('수정할 내용을 입력하세요 (상세 설명):', report.description || '')
  
  if (newDesc !== null && newDesc.trim() !== '') {
    report.description = newDesc.trim()
    report.updatedAt = new Date().toISOString()
    await updateReport(report)
    
    // 군집 업데이트
    const cluster = await getClusterById(clusterId)
    if (cluster) {
      cluster.updatedAt = new Date().toISOString()
      await updateCluster(cluster)
    }
    
    alert('제보 내용이 수정되었습니다.')
    location.reload()
  }
}
