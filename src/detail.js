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
    let cluster = null

    if (clusterId) {
      cluster = await getClusterById(clusterId)
    } else {
      // URL 파라미터가 없는 경우 첫 번째 등록된 클러스터 자동 프리뷰
      const allClusters = await getClusters()
      if (allClusters && allClusters.length > 0) {
        cluster = allClusters[0]
      } else {
        showError()
        return
      }
    }

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
  // 군집 내 모든 제보 로드
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

  // 군집 및 모든 제보의 사진 추출 & 갤러리 렌더링
  renderImageGallery(cluster, repReport, allReports)

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
                ${(() => {
                  const rImg = r.imageBase64 || r.imageUrl || r.image || r.photo || r.photoURL || null
                  if (!rImg) return ''
                  return `
                  <div class="relative group cursor-pointer overflow-hidden rounded-xl border border-border bg-black/10"
                    onclick="window.__openDetailLightbox && window.__openDetailLightbox('${encodeURIComponent(rImg)}', '${encodeURIComponent(r.title || '현장 사진')}')">
                    <img src="${rImg}" alt="제보 사진" class="w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-105" style="max-height:220px;" onerror="this.parentElement.style.display='none'">
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span class="px-3 py-1.5 rounded-full text-xs font-semibold bg-black/80 text-white backdrop-blur-sm border border-white/20 flex items-center gap-1.5 shadow-lg">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"/></svg>
                        사진 원본 확대
                      </span>
                    </div>
                  </div>`
                })()}
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

// ── 이미지 갤러리 및 슬라이더 (Native Responsive Gallery & Lightbox) ──

let currentGallerySlides = []
let currentSlideIndex = 0

function extractImageFromReport(r) {
  if (!r) return null
  return r.imageBase64 || r.imageUrl || r.image || r.photo || r.photoURL || null
}

function renderImageGallery(cluster, repReport, allReports) {
  const wrap = document.getElementById('carousel-wrap')
  const track = document.getElementById('carousel-track')
  const counterBadge = document.getElementById('carousel-counter-badge')
  const captionTitle = document.getElementById('carousel-caption-title')
  const captionSub = document.getElementById('carousel-caption-sub')
  const prevBtn = document.getElementById('btn-carousel-prev')
  const nextBtn = document.getElementById('btn-carousel-next')
  const dotsContainer = document.getElementById('carousel-dots')
  const zoomBtn = document.getElementById('btn-zoom-image')
  const noPhotoBanner = document.getElementById('no-photo-banner')

  // 모든 제보에서 유효한 사진 리스트 추출 (중복 제거)
  const slides = []
  const seenUrls = new Set()

  function addSlide(img, title, author, danger, createdAt) {
    if (!img || typeof img !== 'string' || img.trim() === '' || seenUrls.has(img)) return
    seenUrls.add(img)
    slides.push({
      src: img,
      title: title || '위험 현장 사진',
      author: author || '시민 제보',
      danger: danger || 'medium',
      createdAt: createdAt || Date.now()
    })
  }

  // 1. 군집 내 모든 제보 순회
  if (Array.isArray(allReports)) {
    allReports.forEach(r => {
      const img = extractImageFromReport(r)
      if (img) addSlide(img, r.title, r.author, r.danger, r.createdAt)
    })
  }

  // 2. 대표 제보 사진 fallback
  if (repReport) {
    const repImg = extractImageFromReport(repReport)
    if (repImg) addSlide(repImg, repReport.title, repReport.author, repReport.danger, repReport.createdAt)
  }

  // 3. 군집 자체 사진 fallback
  if (cluster) {
    const clusterImg = extractImageFromReport(cluster)
    if (clusterImg) addSlide(clusterImg, cluster.title || '위험 현장', '관제 시스템', cluster.danger, cluster.createdAt)
  }

  currentGallerySlides = slides
  currentSlideIndex = 0

  // 사진이 전혀 없는 경우 세련된 대체 배너 표시
  if (slides.length === 0) {
    if (wrap) wrap.classList.add('hidden')
    if (noPhotoBanner) {
      noPhotoBanner.classList.remove('hidden')
      const catIconEl = document.getElementById('no-photo-icon')
      const catNameEl = document.getElementById('no-photo-category')
      const catIcons = { road: '🕳️', weather: '🌊', facility: '⚠️', safety: '🛡️' }
      if (catIconEl) catIconEl.textContent = catIcons[cluster?.category] || '⚠️'
      if (catNameEl) catNameEl.textContent = categoryLabel(cluster?.category || 'road')
    }
    return
  }

  // 사진이 있는 경우 갤러리 활성화
  if (noPhotoBanner) noPhotoBanner.classList.add('hidden')
  if (wrap) wrap.classList.remove('hidden')
  if (!track) return

  // 슬라이드 DOM 생성
  track.innerHTML = slides.map((s, idx) => `
    <div class="carousel-slide-item w-full h-full flex-shrink-0 relative overflow-hidden flex items-center justify-center bg-black/40 cursor-zoom-in" data-index="${idx}">
      <img src="${s.src}" alt="${s.title}" class="w-full h-full object-cover select-none transition-transform duration-300" onerror="this.parentElement.style.opacity='0.4'">
    </div>
  `).join('')

  // 도트 인디케이터 생성
  if (dotsContainer) {
    if (slides.length <= 1) {
      dotsContainer.innerHTML = ''
      dotsContainer.classList.add('hidden')
    } else {
      dotsContainer.classList.remove('hidden')
      dotsContainer.innerHTML = slides.map((_, idx) => `
        <span class="carousel-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
      `).join('')
    }
  }

  // 화살표 버튼 표시 여부
  if (slides.length <= 1) {
    prevBtn?.classList.add('hidden')
    nextBtn?.classList.add('hidden')
  } else {
    prevBtn?.classList.remove('hidden')
    nextBtn?.classList.remove('hidden')
  }

  function updateSlide(index) {
    if (slides.length === 0) return
    currentSlideIndex = (index + slides.length) % slides.length
    track.style.transform = `translateX(-${currentSlideIndex * 100}%)`

    if (counterBadge) {
      counterBadge.textContent = `${currentSlideIndex + 1} / ${slides.length}`
    }

    const currentSlide = slides[currentSlideIndex]
    if (captionTitle) {
      captionTitle.textContent = currentSlide.title
    }
    if (captionSub) {
      captionSub.textContent = `제보자: ${currentSlide.author} · ${relativeTime(currentSlide.createdAt)}`
    }

    // 도트 활성화 상태 동기화
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.carousel-dot')
      dots.forEach((d, i) => {
        if (i === currentSlideIndex) d.classList.add('active')
        else d.classList.remove('active')
      })
    }
  }

  updateSlide(0)

  // 화살표 클릭 이벤트 바인딩
  if (prevBtn && !prevBtn._hasListener) {
    prevBtn._hasListener = true
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      updateSlide(currentSlideIndex - 1)
    })
  }

  if (nextBtn && !nextBtn._hasListener) {
    nextBtn._hasListener = true
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      updateSlide(currentSlideIndex + 1)
    })
  }

  // 도트 클릭 이벤트 바인딩
  if (dotsContainer && !dotsContainer._hasListener) {
    dotsContainer._hasListener = true
    dotsContainer.addEventListener('click', (e) => {
      const dot = e.target.closest('.carousel-dot')
      if (dot) {
        e.stopPropagation()
        const idx = parseInt(dot.getAttribute('data-index'), 10)
        if (!isNaN(idx)) updateSlide(idx)
      }
    })
  }

  // 슬라이드 클릭 시 확대 모달
  track.querySelectorAll('.carousel-slide-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-index'), 10) || currentSlideIndex
      const target = slides[idx]
      if (target) openLightbox(target.src, target.title)
    })
  })

  // 확대 버튼 클릭
  if (zoomBtn && !zoomBtn._hasListener) {
    zoomBtn._hasListener = true
    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      const target = slides[currentSlideIndex]
      if (target) openLightbox(target.src, target.title)
    })
  }

  // 터치 스와이프 제스처 바인딩
  const viewport = document.getElementById('carousel-viewport')
  if (viewport && !viewport._hasTouch) {
    viewport._hasTouch = true
    let startX = 0
    let startY = 0
    let isSwiping = false

    viewport.addEventListener('touchstart', (e) => {
      if (slides.length <= 1) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      isSwiping = true
    }, { passive: true })

    viewport.addEventListener('touchmove', (e) => {
      if (!isSwiping || slides.length <= 1) return
      const diffX = e.touches[0].clientX - startX
      const diffY = e.touches[0].clientY - startY
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        if (e.cancelable) e.preventDefault()
      }
    }, { passive: false })

    viewport.addEventListener('touchend', (e) => {
      if (!isSwiping || slides.length <= 1) return
      isSwiping = false
      const endX = e.changedTouches[0].clientX
      const diffX = endX - startX
      if (diffX > 40) {
        updateSlide(currentSlideIndex - 1)
      } else if (diffX < -40) {
        updateSlide(currentSlideIndex + 1)
      }
    }, { passive: true })
  }
}

// ── 이미지 라이트박스 확대 모달 ──────────────────────────────

export function openLightbox(src, caption) {
  const modal = document.getElementById('image-lightbox-modal')
  const img = document.getElementById('lightbox-image')
  const cap = document.getElementById('lightbox-caption')
  if (!modal || !img) return

  img.src = src
  if (cap) cap.textContent = caption || '현장 사진 확대 보기'
  modal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

export function closeLightbox() {
  const modal = document.getElementById('image-lightbox-modal')
  const img = document.getElementById('lightbox-image')
  if (!modal) return

  modal.classList.add('hidden')
  if (img) img.src = ''
  document.body.style.overflow = ''
}

// 전역 바인딩 (아코디언 인라인 onclick 지원)
window.__openDetailLightbox = (encodedSrc, encodedCaption) => {
  try {
    const src = decodeURIComponent(encodedSrc)
    const cap = decodeURIComponent(encodedCaption)
    openLightbox(src, cap)
  } catch (e) {
    openLightbox(encodedSrc, encodedCaption)
  }
}

// 라이트박스 닫기 이벤트 초기 바인딩
const btnCloseLightbox = document.getElementById('btn-close-lightbox')
if (btnCloseLightbox && !btnCloseLightbox._hasListener) {
  btnCloseLightbox._hasListener = true
  btnCloseLightbox.addEventListener('click', closeLightbox)
}
const lightboxModal = document.getElementById('image-lightbox-modal')
if (lightboxModal && !lightboxModal._hasListener) {
  lightboxModal._hasListener = true
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal || e.target.id === 'lightbox-container') {
      closeLightbox()
    }
  })
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox()
})

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
