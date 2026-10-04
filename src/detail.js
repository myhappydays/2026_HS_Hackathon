/**
 * detail.js
 * ?곸꽭 ?섏씠吏 - 援곗쭛 ????뺣낫 + 愿???쒕낫 由ъ뒪??+ ?ъ쭊 罹먮윭?
 */

import { getClusterById, getReportById, deleteReport, deleteCluster, updateCluster, updateReport } from './storage.js'
import { dangerStyle, categoryLabel, relativeTime } from './utils.js'
<<<<<<< HEAD
import { getCurrentUser } from './auth.js'
=======
import { initShareCard, openShareModal } from './shareCard.js'
>>>>>>> c48bff4c1b6057dfc6560797e9f0c93bfe5d5417

const BASE = import.meta.env.BASE_URL
document.getElementById('nav-home').href = `${BASE}index.html`
document.getElementById('nav-home-fallback').href = `${BASE}index.html`

const loadingState  = document.getElementById('loading-state')
const detailContent = document.getElementById('detail-content')
const errorState    = document.getElementById('error-state')

// URL?먯꽌 ?대윭?ㅽ꽣 ID ?쎄린
const clusterId = new URLSearchParams(location.search).get('id')

async function init() {
  if (!clusterId) { showError(); return }

  const cluster = await getClusterById(clusterId)
  if (!cluster)  { showError(); return }

  const repReport = await getReportById(cluster.representId)
  if (!repReport) { showError(); return }

  await renderDetail(cluster, repReport)

  // SNS 諛붿씠???덉쟾 移대뱶 怨듭쑀 湲곕뒫 ?곕룞
  initShareCard(() => ({
    clusters: [cluster],
    reportsMap: new Map([[repReport.id, repReport]]),
    targetLat: cluster.location?.lat,
    targetLng: cluster.location?.lng,
    currentRegionName: repReport.location?.address || '',
  }))

  document.getElementById('btn-share-card')?.addEventListener('click', () => {
    openShareModal({ type: 'report', report: repReport, cluster })
  })

  // ?닿? 怨듦컧??援곗쭛 ID 愿由?
  const getLikedList = () => JSON.parse(localStorage.getItem('my_likes') || '[]')
  const btnLike = document.getElementById('btn-like')

  // 珥덇린 ?뚮뜑留????대? 怨듦컧?덈떎硫?UI 蹂寃?
  if (btnLike && getLikedList().includes(cluster.id)) {
    btnLike.classList.replace('bg-primary/10', 'bg-primary')
    btnLike.classList.replace('text-primary', 'text-white')
    btnLike.classList.add('opacity-80', 'cursor-not-allowed')
    btnLike.innerHTML = `?뷂툘 怨듦컧 ?꾨즺 <span id="like-count" class="ml-1 text-white">${cluster.likes || 0}</span>`
  }

  // 怨듦컧 踰꾪듉 ?대깽??
  if (btnLike) {
    btnLike.addEventListener('click', async () => {
      const likedList = getLikedList()
      
      // ?대? 怨듦컧?덈뒗吏 寃??
      if (likedList.includes(cluster.id)) {
        alert('?대? 怨듦컧(?꾪뿕 ?뺤씤)???쒖떆???쒕낫?낅땲??')
        return
      }

      cluster.likes = (cluster.likes || 0) + 1
      await updateCluster(cluster)
      
      // 濡쒖뺄?ㅽ넗由ъ??????(1怨꾩젙??1??
      likedList.push(cluster.id)
      localStorage.setItem('my_likes', JSON.stringify(likedList))

      // UI 利됱떆 ?낅뜲?댄듃
      btnLike.classList.replace('bg-primary/10', 'bg-primary')
      btnLike.classList.replace('text-primary', 'text-white')
      btnLike.classList.add('opacity-80', 'cursor-not-allowed')
      btnLike.innerHTML = `?뷂툘 怨듦컧 ?꾨즺 <span id="like-count" class="ml-1 text-white">${cluster.likes}</span>`
    })
  }

  // ?볤? ?깅줉 ?대깽??(??submit 吏??
  const commentForm = document.getElementById('comment-form')
  const commentSubmitBtn = document.getElementById('btn-comment-submit')

  const handleCommentSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const input = document.getElementById('comment-input')
    const text = input ? input.value.trim() : ''
    if (!text) {
      alert('怨듭쑀???곹솴???낅젰?댁＜?몄슂.')
      return
    }

    if (!cluster.comments) cluster.comments = []
    
    // ?듬챸 ?앹꽦湲?
    const anonNames = ['?듬챸??二쇰?', '?숇꽕 蹂댁븞愿', '吏?섍????됱씤', '?덉쟾 ?붿썝', '紐⑷꺽??]
    const randomName = anonNames[Math.floor(Math.random() * anonNames.length)]

    cluster.comments.push({
      id: Date.now().toString(),
      text,
      author: randomName,
      createdAt: new Date().toISOString()
    })
    
    await updateCluster(cluster)
    if (input) input.value = ''
    await renderDetail(cluster, repReport) // 由щ젋?붾쭅
  }

  if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit)
  } else if (commentSubmitBtn) {
    commentSubmitBtn.addEventListener('click', handleCommentSubmit)
  }
}

function showError() {
  loadingState.classList.add('hidden')
  errorState.classList.remove('hidden')
}

async function renderDetail(cluster, repReport) {
  // 罹먮윭?: 援곗쭛 ??紐⑤뱺 ?쒕낫???ъ쭊
  const allReportsRaw = await Promise.all(cluster.reportIds.map(id => getReportById(id)))
  const allReports = allReportsRaw.filter(Boolean)
  const carouselReports = allReports.filter(r => r.imageBase64)

  renderCarousel(carouselReports)

  // 諭껋?
  const isResolved = cluster.status === 'resolved'
  const ds  = dangerStyle(cluster.danger)
  const cat = categoryLabel(cluster.category)
  const statusBadge = isResolved
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400">
         <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
         ?닿껐 ?꾨즺
       </span>`
    : `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ds.bg} ${ds.text}">${ds.label}</span>`

  document.getElementById('badge-area').innerHTML = `
    ${statusBadge}
    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground">${cat}</span>
    ${cluster.reportIds.length > 1
      ? `<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">?쒕낫 ${cluster.reportIds.length}嫄?/span>`
      : ''}
  `

  // ?곹깭 ?좉? 踰꾪듉
  const btnToggleStatus = document.getElementById('btn-toggle-status')
  const btnToggleStatusText = document.getElementById('btn-toggle-status-text')
  const currentUser = getCurrentUser()
  const hasPermission = !repReport.userId || (currentUser && currentUser.uid === repReport.userId)

  if (btnToggleStatus && btnToggleStatusText) {
    if (!hasPermission) {
      btnToggleStatus.style.display = 'none'
    } else {
      btnToggleStatus.style.display = ''
      btnToggleStatusText.textContent = isResolved ? '吏꾪뻾 以묒쑝濡?蹂寃? : '?닿껐 ?꾨즺濡?蹂寃?
      btnToggleStatus.onclick = async () => {
        const newStatus = isResolved ? 'active' : 'resolved'
        cluster.status = newStatus
        if (newStatus === 'resolved') {
          cluster.resolvedAt = Date.now()
        } else {
          cluster.resolvedAt = null
        }
        await updateCluster(cluster)
        await renderDetail(cluster, repReport)
      }
    }
  }

  // ????뺣낫
  document.getElementById('cluster-title').textContent       = repReport.title
  document.getElementById('cluster-description').textContent = repReport.description || '?곸꽭 ?ㅻ챸???놁뒿?덈떎.'
  document.getElementById('cluster-address').textContent     = repReport.location.address || '?꾩튂 ?뺣낫 ?놁쓬'
  document.getElementById('cluster-time').textContent        = `${relativeTime(cluster.createdAt)} 理쒖큹 ?깅줉 쨌 ${relativeTime(cluster.updatedAt)} ?낅뜲?댄듃`
  document.getElementById('related-count').textContent       = `${cluster.reportIds.length}嫄?

  // 愿???쒕낫 由ъ뒪??(Preline Accordion)
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
                ? `<img src="${r.imageBase64}" class="w-full h-full object-cover" alt="?쒕낫 ?ъ쭊">`
                : `<div class="w-full h-full flex items-center justify-center">
                     <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/>
                     </svg>
                   </div>`
              }
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1 mb-0.5">
                ${i === 0 ? '<span class="text-[10px] text-primary font-semibold">????쒕낫</span>' : ''}
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
              ${r.imageBase64 ? `<img src="${r.imageBase64}" alt="?쒕낫 ?ъ쭊" class="w-full rounded-lg object-cover" style="max-height:220px;">` : ''}
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
                  <span>${r.location?.address || '?꾩튂 ?뺣낫 ?놁쓬'}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>${relativeTime(r.createdAt)}</span>
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-3 pt-3 border-t border-border/50">
                ${(!r.userId || (currentUser && currentUser.uid === r.userId)) ? `
                <button type="button" class="btn-edit-report py-1.5 px-3 bg-surface border border-border text-foreground hover:bg-surface-1 rounded-lg text-xs font-semibold transition" data-id="${r.id}">
                  ?섏젙
                </button>
                <button type="button" class="btn-delete-report py-1.5 px-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-semibold transition" data-id="${r.id}">
                  ??젣
                </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
        `}).join('')}
    </div>
  `

  // Preline Accordion ?ъ큹湲고솕 (?숈쟻 DOM 二쇱엯 ??
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
      if (confirm('???쒕낫瑜???젣?섏떆寃좎뒿?덇퉴?')) {
        handleDeleteReport(cluster, rid)
      }
    })
  })

  // 怨듦컧 ?뚮뜑留?
  document.getElementById('like-count').textContent = cluster.likes || 0

  // ?볤? ?뚮뜑留?
  const comments = cluster.comments || []
  document.getElementById('comment-count').textContent = `${comments.length}媛?
  
  const commentList = document.getElementById('comment-list')
  if (comments.length === 0) {
    commentList.innerHTML = `<p class="text-sm text-muted-foreground text-center py-4">?꾩쭅 怨듭쑀???곹솴???놁뒿?덈떎. 泥?踰덉㎏濡??곹솴??怨듭쑀?댁＜?몄슂!</p>`
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

  // ?쒖떆
  loadingState.classList.add('hidden')
  detailContent.classList.remove('hidden')
}

// ?? 罹먮윭? (Preline data-hs-carousel) ????????????????????

function renderCarousel(reports) {
  const wrap = document.getElementById('carousel-wrap')

  if (reports.length === 0) {
    wrap.classList.add('hidden')
    return
  }

  // ?щ씪?대뱶 二쇱엯
  const body = document.getElementById('carousel-body')
  body.innerHTML = reports.map(r => `
    <div class="hs-carousel-slide flex-shrink-0 w-full">
      <img src="${r.imageBase64}" alt="?쒕낫 ?ъ쭊"
        class="w-full object-cover" style="height:260px;">
    </div>
  `).join('')

  // pagination dots 二쇱엯
  const pagination = wrap.querySelector('.hs-carousel-pagination')
  if (pagination) {
    pagination.innerHTML = reports.map((_, i) => `
      <span class="hs-carousel-pagination-item${i === 0 ? ' active' : ''}">
        <span></span>
      </span>
    `).join('')
  }

  // ?щ씪?대뱶 1?μ씠硫?踰꾪듉 ?④린湲?
  if (reports.length <= 1) {
    wrap.querySelector('.hs-carousel-prev')?.classList.add('hidden')
    wrap.querySelector('.hs-carousel-next')?.classList.add('hidden')
    if (pagination) pagination.classList.add('hidden')
  }

  // Preline 罹먮윭? 珥덇린??
  if (window.HSCarousel) {
    window.HSCarousel.autoInit()
  }
}

init()

async function handleDeleteReport(cluster, reportId) {
  await deleteReport(reportId)

  // 援곗쭛 ?낅뜲?댄듃
  cluster.reportIds = cluster.reportIds.filter(id => id !== reportId)

  if (cluster.reportIds.length === 0) {
    // 紐⑤뱺 ?쒕낫媛 吏?뚯?硫?援곗쭛????젣
    await deleteCluster(cluster.id)
    alert('紐⑤뱺 ?쒕낫媛 ??젣?섏뼱 援곗쭛???щ씪議뚯뒿?덈떎.')
    location.href = `${BASE}index.html`
  } else {
    // ????쒕낫媛 ??젣?섏뿀?ㅻ㈃ ?ㅻⅨ ?쒕낫濡????蹂寃?
    if (cluster.representId === reportId) {
      cluster.representId = cluster.reportIds[0]
    }
    await updateCluster(cluster)
    alert('?쒕낫媛 ??젣?섏뿀?듬땲??')
    location.reload()
  }
}

async function handleEditReport(reportId) {
  const report = await getReportById(reportId)
  if (!report) return

  const newDesc = prompt('?섏젙???댁슜???낅젰?섏꽭??(?곸꽭 ?ㅻ챸):', report.description || '')
  
  if (newDesc !== null && newDesc.trim() !== '') {
    report.description = newDesc.trim()
    report.updatedAt = new Date().toISOString()
    await updateReport(report)
    
    // 援곗쭛 ?낅뜲?댄듃
    const cluster = await getClusterById(clusterId)
    if (cluster) {
      cluster.updatedAt = new Date().toISOString()
      await updateCluster(cluster)
    }
    
    alert('?쒕낫 ?댁슜???섏젙?섏뿀?듬땲??')
    location.reload()
  }
}
