/**
 * admin.js
 * 지자체 관제 대시보드 로직
 */

import { initTheme } from './theme.js'
import { getClusters, getReports } from './storage.js'
import { dangerStyle, categoryLabel } from './utils.js'

// 테마 초기화
initTheme()

// DOM 요소
const statTotalReports = document.getElementById('stat-total-reports')
const statActiveClusters = document.getElementById('stat-active-clusters')
const statHighDanger = document.getElementById('stat-high-danger')
const statResolved = document.getElementById('stat-resolved')
const categoryStats = document.getElementById('category-stats')
const urgentList = document.getElementById('urgent-list')
const timeDisplay = document.getElementById('current-time')

// 현재 시간 표시
setInterval(() => {
  const now = new Date()
  timeDisplay.textContent = now.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}, 1000)

async function loadDashboard() {
  const [clusters, reports] = await Promise.all([
    getClusters(),
    getReports()
  ])

  // 통계 계산
  const totalReports = reports.length
  let activeClusters = 0
  let highDangerClusters = 0
  let resolvedClusters = 0

  // 카테고리별 미해결 통계
  const activeByCategory = {}

  // 시급 조치 요망 (High & 미해결)
  const urgentClusters = []

  // 보고서 매핑 (주소 가져오기 위함)
  const allReportsMap = new Map()
  reports.forEach(r => allReportsMap.set(r.id, r))

  // 랭킹 보드용 데이터 수집
  const districtStats = {} // { "경기 화성시": { totalMs: 0, count: 0 } }

  clusters.forEach(cluster => {
    const isResolved = cluster.status === 'resolved'
    
    // 대표 주소 파싱 (예: "경기 화성시 봉담읍..." -> "경기 화성시")
    const rep = allReportsMap.get(cluster.representId)
    const fullAddress = rep?.location?.address || ''
    const parts = fullAddress.split(' ')
    const district = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : '기타 지역'

    if (isResolved) {
      resolvedClusters++
      if (cluster.resolvedAt && cluster.createdAt) {
        const timeTaken = cluster.resolvedAt - cluster.createdAt
        if (!districtStats[district]) {
          districtStats[district] = { totalMs: 0, count: 0 }
        }
        districtStats[district].totalMs += timeTaken
        districtStats[district].count++
      }
    } else {
      activeClusters++
      
      // 위험도 통계
      if (cluster.danger === 'high') {
        highDangerClusters++
        // urgentClusters에 넣을 때 address 저장
        urgentClusters.push({ ...cluster, address: fullAddress })
      }

      // 분야별 통계
      const cat = cluster.category || '기타'
      activeByCategory[cat] = (activeByCategory[cat] || 0) + 1
    }
  })

  // 통계 텍스트 업데이트
  statTotalReports.textContent = totalReports.toLocaleString()
  statActiveClusters.textContent = activeClusters.toLocaleString()
  statHighDanger.textContent = highDangerClusters.toLocaleString()
  statResolved.textContent = resolvedClusters.toLocaleString()

  // 분야별 통계 렌더링 (프로그레스 바 형태)
  categoryStats.innerHTML = ''
  const sortedCategories = Object.entries(activeByCategory).sort((a, b) => b[1] - a[1])
  
  if (sortedCategories.length === 0) {
    categoryStats.innerHTML = '<div class="text-sm text-muted-foreground text-center mt-4">현재 접수된 미해결 위험이 없습니다.</div>'
  } else {
    sortedCategories.forEach(([cat, count]) => {
      const percentage = Math.round((count / activeClusters) * 100)
      const label = categoryLabel(cat)
      
      const el = document.createElement('div')
      el.className = 'w-full'
      el.innerHTML = `
        <div class="flex justify-between text-sm mb-1">
          <span class="font-medium text-foreground">${label}</span>
          <span class="text-muted-foreground">${count}건 (${percentage}%)</span>
        </div>
        <div class="w-full bg-surface-1 rounded-full h-2">
          <div class="bg-primary h-2 rounded-full" style="width: ${percentage}%"></div>
        </div>
      `
      categoryStats.appendChild(el)
    })
  }

  // 지자체별 랭킹 보드 렌더링
  const rankingBoard = document.getElementById('ranking-board')
  if (rankingBoard) {
    rankingBoard.innerHTML = ''
    
    // 평균 해결 시간 계산 및 정렬 (짧을수록 상위)
    const ranking = Object.entries(districtStats)
      .map(([name, stats]) => ({
        name,
        avgMs: stats.totalMs / stats.count,
        count: stats.count
      }))
      .sort((a, b) => a.avgMs - b.avgMs)

    if (ranking.length === 0) {
      rankingBoard.innerHTML = '<div class="text-sm text-muted-foreground text-center mt-4">해결된 위험 데이터가 없습니다.</div>'
    } else {
      const medals = ['🥇', '🥈', '🥉']
      ranking.forEach((r, i) => {
        // 밀리초를 시간/일 단위로 변환
        const hours = r.avgMs / (1000 * 60 * 60)
        const timeStr = hours >= 24 
          ? `${(hours / 24).toFixed(1)}일` 
          : `${Math.max(1, Math.round(hours))}시간`

        const el = document.createElement('div')
        el.className = 'flex items-center justify-between p-3 rounded-lg bg-surface/50 border border-border'
        el.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="text-xl">${i < 3 ? medals[i] : `<span class="text-sm font-bold text-muted-foreground w-6 text-center inline-block">${i+1}위</span>`}</span>
            <div>
              <p class="font-bold text-foreground text-sm">${r.name}</p>
              <p class="text-[10px] text-muted-foreground">누적 해결: ${r.count}건</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-primary">${timeStr}</p>
            <p class="text-[10px] text-muted-foreground">평균 소요</p>
          </div>
        `
        rankingBoard.appendChild(el)
      })
    }
  }

  // 시급 조치 리스트 렌더링
  urgentList.innerHTML = ''
  // 공감 수 내림차순 정렬
  urgentClusters.sort((a, b) => (b.likes || 0) - (a.likes || 0))

  if (urgentClusters.length === 0) {
    urgentList.innerHTML = '<tr><td colspan="4" class="px-5 py-8 text-center text-muted-foreground">현재 보고된 초고위험 구역이 없습니다. 안전합니다! 👏</td></tr>'
  } else {
    urgentClusters.forEach(cluster => {
      const tr = document.createElement('tr')
      tr.className = 'hover:bg-surface/30 transition group'
      
      tr.innerHTML = `
        <td class="px-5 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface text-foreground border border-border">
            ${categoryLabel(cluster.category)}
          </span>
        </td>
        <td class="px-5 py-3 text-foreground truncate max-w-xs">
          ${cluster.address || '주소 정보 없음'}
        </td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-1 text-red-500 font-medium">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>
            ${cluster.likes || 0}
          </div>
        </td>
        <td class="px-5 py-3 text-right">
          <a href="detail.html?id=${cluster.id}" class="text-primary hover:underline text-sm font-medium">조치하기</a>
        </td>
      `
      urgentList.appendChild(tr)
    })
  }
}

// 초기화
loadDashboard()
