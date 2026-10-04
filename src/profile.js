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

    // Check for fake reports/penalties (hackathon mock logic based on tags in description)
    if (r.description && r.description.includes('#허위')) {
      stat.penalties++
      stat.temperature -= 5.0
    } else if (r.description && r.description.includes('#신고누적')) {
      stat.penalties++
      stat.temperature -= 0.5
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
  if (temp >= 50) return 'text-red-500 bg-red-50 border-red-500' // Boiling
  if (temp >= 40) return 'text-orange-500 bg-orange-50 border-orange-500' // Hot
  if (temp >= 36.5) return 'text-green-500 bg-green-50 border-green-500' // Normal/Warm
  return 'text-blue-500 bg-blue-50 border-blue-500' // Cold (Penalized)
}

export function getTemperatureHex(temp) {
  if (temp >= 50) return '#ef4444' 
  if (temp >= 40) return '#f97316'
  if (temp >= 36.5) return '#22c55e'
  return '#3b82f6'
}
