/**
 * main.js
 * 메인 페이지 - 지도 뷰 + 제보 리스트
 * TODO: 네이버 지도 연동, 군집 리스트 렌더링
 */

import { getClusters, getReportById } from './storage.js'
import { dangerStyle, categoryLabel, relativeTime, formatDistance } from './utils.js'
import { haversineDistance } from './clustering.js'

const reportList  = document.getElementById('report-list')
const emptyState  = document.getElementById('empty-state')
const reportCount = document.getElementById('report-count')

function renderList() {
  const clusters = getClusters()

  reportCount.textContent = `총 ${clusters.length}건`

  if (clusters.length === 0) {
    emptyState.classList.remove('hidden')
    return
  }

  emptyState.classList.add('hidden')

  // 거리순 정렬 (현재 위치 미취득 시 최신순)
  const sorted = [...clusters].sort((a, b) => b.createdAt - a.createdAt)

  reportList.innerHTML = sorted.map(cluster => {
    const rep     = getReportById(cluster.representId)
    if (!rep) return ''
    const ds      = dangerStyle(cluster.danger)
    const catLbl  = categoryLabel(cluster.category)
    const timeAgo = relativeTime(cluster.createdAt)
    const count   = cluster.reportIds.length

    return `
      <a href="/detail.html?id=${cluster.id}"
        class="flex gap-3 p-3 rounded-xl bg-card border border-border active:bg-surface transition">
        <!-- 썸네일 -->
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
        <!-- 내용 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${ds.bg} ${ds.text}">${ds.label}</span>
            <span class="text-[10px] text-muted-foreground">${catLbl}</span>
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
            <span class="ml-auto flex-shrink-0">${timeAgo}</span>
          </div>
        </div>
      </a>
    `
  }).join('')
}

renderList()
