/**
 * storage.js
 * localStorage 읽기/쓰기 유틸리티
 *
 * 스키마:
 *   reports  → Report[]
 *   clusters → Cluster[]
 */

const KEYS = {
  REPORTS:  'reports',
  CLUSTERS: 'clusters',
}

/** localStorage 전체 사용량 계산 (바이트) */
export function getStorageUsage() {
  let total = 0
  for (const key in localStorage) {
    if (!localStorage.hasOwnProperty(key)) continue
    total += (localStorage.getItem(key) || '').length * 2 // UTF-16
  }
  return total
}

/** 4MB 초과 여부 */
export function isStorageFull() {
  return getStorageUsage() > 4 * 1024 * 1024
}

// ── Reports ─────────────────────────────────────────────

/** @returns {Report[]} */
export function getReports() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.REPORTS) || '[]')
  } catch {
    return []
  }
}

/** @param {Report[]} reports */
export function saveReports(reports) {
  localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports))
}

/** @param {Report} report */
export function addReport(report) {
  const reports = getReports()
  reports.push(report)
  saveReports(reports)
}

/** @param {string} id @returns {Report|undefined} */
export function getReportById(id) {
  return getReports().find(r => r.id === id)
}

// ── Clusters ─────────────────────────────────────────────

/** @returns {Cluster[]} */
export function getClusters() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.CLUSTERS) || '[]')
  } catch {
    return []
  }
}

/** @param {Cluster[]} clusters */
export function saveClusters(clusters) {
  localStorage.setItem(KEYS.CLUSTERS, JSON.stringify(clusters))
}

/** @param {Cluster} cluster */
export function addCluster(cluster) {
  const clusters = getClusters()
  clusters.push(cluster)
  saveClusters(clusters)
}

/** 특정 cluster 업데이트 @param {Cluster} updated */
export function updateCluster(updated) {
  const clusters = getClusters().map(c => c.id === updated.id ? updated : c)
  saveClusters(clusters)
}

/** @param {string} id @returns {Cluster|undefined} */
export function getClusterById(id) {
  return getClusters().find(c => c.id === id)
}
