/**
 * clustering.js
 * 온라인 군집 배정 로직
 *
 * 1. Haversine 거리 계산 → 200m 이내 후보 필터
 * 2. TF-IDF 코사인 유사도 계산 → 임계값(0.3) 이상 후보 중 최고값 선택
 * 3. 없으면 신규 군집 생성
 */

import { getClusters, addCluster, updateCluster } from './storage.js'
import { generateId } from './utils.js'

// ── 파라미터 ────────────────────────────────────────────
const DISTANCE_THRESHOLD_M = 200  // 거리 임계값 (미터)
const SIMILARITY_THRESHOLD = 0.3  // 코사인 유사도 임계값

// ── Haversine ───────────────────────────────────────────

/**
 * 두 위경도 좌표 간 거리 계산 (미터)
 * @param {number} lat1 @param {number} lng1
 * @param {number} lat2 @param {number} lng2
 * @returns {number}
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // 지구 반지름 (m)
  const toRad = deg => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── TF-IDF 벡터화 ────────────────────────────────────────

/**
 * 텍스트를 어절 단위로 토크나이징
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return text
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1)
}

/**
 * 단일 문서의 TF 계산
 * @param {string[]} tokens
 * @returns {Record<string, number>}
 */
function computeTF(tokens) {
  const tf = {}
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1
  const total = tokens.length || 1
  for (const t in tf) tf[t] /= total
  return tf
}

/**
 * 텍스트로부터 TF 벡터 생성 (IDF 없이 TF만 사용 — 단일 문서 비교 특성상 IDF 생략)
 * 실제로는 군집 누적 벡터와 코사인 유사도만 비교하므로 TF 벡터로 충분
 * @param {string} text
 * @returns {Record<string, number>}
 */
export function buildVector(text) {
  return computeTF(tokenize(text))
}

/**
 * 두 TF 벡터 간 코사인 유사도
 * @param {Record<string, number>} a
 * @param {Record<string, number>} b
 * @returns {number} 0~1
 */
export function cosineSimilarity(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  let dot = 0, normA = 0, normB = 0
  for (const k of keys) {
    const va = a[k] || 0
    const vb = b[k] || 0
    dot   += va * vb
    normA += va * va
    normB += vb * vb
  }
  if (!normA || !normB) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * 군집 벡터에 신규 제보 텍스트를 합산하여 갱신
 * @param {Record<string, number>} clusterVector 기존 군집 누적 벡터
 * @param {Record<string, number>} newVector      신규 제보 벡터
 * @returns {Record<string, number>}
 */
export function mergeVector(clusterVector, newVector) {
  const merged = { ...clusterVector }
  for (const [k, v] of Object.entries(newVector)) {
    merged[k] = (merged[k] || 0) + v
  }
  return merged
}

// ── 군집 배정 메인 로직 ──────────────────────────────────

/**
 * 신규 Report를 받아 군집을 배정하고 clusters를 업데이트한다.
 * @param {Report} report - 이미 저장된 report 객체 (id 포함)
 * @returns {string} 배정된 clusterId
 */
export function assignCluster(report) {
  const text   = `${report.title} ${report.description}`
  const vector = buildVector(text)
  const { lat, lng } = report.location

  const clusters = getClusters()

  // 1. 거리 필터
  const nearby = clusters.filter(c => {
    const dist = haversineDistance(lat, lng, c.location.lat, c.location.lng)
    return dist <= DISTANCE_THRESHOLD_M
  })

  // 2. 후보 없음 → 신규 군집
  if (nearby.length === 0) {
    return createNewCluster(report, vector)
  }

  // 3. TF-IDF 코사인 유사도 계산
  let best = null
  let bestScore = -1
  for (const c of nearby) {
    const score = cosineSimilarity(vector, c.tfidfVector || {})
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }

  // 4. 임계값 미달 → 신규 군집
  if (bestScore < SIMILARITY_THRESHOLD || !best) {
    return createNewCluster(report, vector)
  }

  // 5. 기존 군집에 배정
  const dangerPriority = { high: 3, medium: 2, low: 1 }
  const newDanger =
    dangerPriority[report.danger] > dangerPriority[best.danger]
      ? report.danger
      : best.danger

  const updated = {
    ...best,
    reportIds:   [...best.reportIds, report.id],
    tfidfVector: mergeVector(best.tfidfVector || {}, vector),
    danger:      newDanger,
    updatedAt:   report.createdAt,
  }
  updateCluster(updated)
  return best.id
}

/**
 * 신규 군집 생성
 * @param {Report} report
 * @param {Record<string, number>} vector
 * @returns {string} 신규 clusterId
 */
function createNewCluster(report, vector) {
  const cluster = {
    id:          generateId(),
    representId: report.id,
    reportIds:   [report.id],
    location: {
      lat: report.location.lat,
      lng: report.location.lng,
    },
    danger:      report.danger,
    category:    report.category,
    tfidfVector: vector,
    createdAt:   report.createdAt,
    updatedAt:   report.createdAt,
  }
  addCluster(cluster)
  return cluster.id
}
