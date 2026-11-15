import { getReports, getClusters } from './storage.js'
import { getCurrentUser } from './auth.js'

export async function computeUserTemperatures() {
  const reports = await getReports()
  const clusters = await getClusters()

  // Base temperature 36.5
  const userStats = {}

  function getStat(name) {
    if (!userStats[name]) {
      userStats[name] = {
        name,
        baseTemp: 36.5,
        reportsCount: 0,
        likesReceived: 0,
        resolvedCount: 0,
        penalties: 0,
        temperature: 36.5
      }
    }
    return userStats[name]
  }

  // 1. Process reports for creation points (+0.2) and penalty tracking
  reports.forEach(r => {
    const author = r.author || '익명'
    const stat = getStat(author)
    stat.reportsCount++
    stat.temperature += 0.2

    // Check for fake reports/penalties using DB fields
    if (r.isFake) {
      stat.penalties++
      stat.temperature -= 5.0
    }

    if (r.reportCount && r.reportCount > 0) {
      stat.penalties += r.reportCount
      stat.temperature -= (r.reportCount * 0.5)
    }
  })

  // 2. Process clusters for likes (+0.1) and resolutions (+1.0)
  clusters.forEach(c => {
    // We attribute the cluster's likes and resolutions to the author of the representative report
    const rep = reports.find(r => r.id === c.representId)
    if (rep) {
      const author = rep.author || '익명'
      const stat = getStat(author)

      if (c.likes) {
        stat.likesReceived += c.likes
        stat.temperature += (c.likes * 0.1)
      }

      if (c.status === 'resolved') {
        stat.resolvedCount++
        stat.temperature += 1.0
      }
    }
  })

  // Format and sort
  const ranking = Object.values(userStats)
    .map(s => {
      // Prevent dropping below 0, optionally cap at 99.0
      s.temperature = Math.max(0, Math.min(99.0, s.temperature))
      return s
    })
    .sort((a, b) => b.temperature - a.temperature)

  return ranking
}

export function getTemperatureColor(temp) {
  // 위험도 배지(utils.dangerStyle)와 같은 틴트 방식. 라이트/다크 모두에서 읽힌다
  if (temp >= 50) return 'bg-red-500/15 border border-red-500/25 text-red-600 dark:text-red-400' // Boiling
  if (temp >= 40) return 'bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-400' // Hot
  if (temp >= 36.5) return 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400' // Normal/Warm
  return 'bg-blue-500/15 border border-blue-500/25 text-blue-600 dark:text-blue-400' // Cold (Penalized)
}

export function getTemperatureHex(temp) {
  if (temp >= 50) return '#ef4444'
  if (temp >= 40) return '#f97316'
  if (temp >= 36.5) return '#22c55e'
  return '#3b82f6'
}
