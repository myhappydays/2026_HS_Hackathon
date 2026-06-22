/**
 * clustering.js
 * 온라인 군집 배정 로직
 *
 * 1. Haversine 거리 계산 → 200m 이내 후보 필터
 * 2. 임베딩 코사인 유사도 계산 → 임계값(0.4) 이상 후보 중 최고값 선택
 *    - 모델: Xenova/paraphrase-multilingual-MiniLM-L12-v2
 *    - 임계값 0.45: 130개 테스트케이스 기반 최적값 조정 (오탐 감소)
 * 3. 없으면 신규 군집 생성
 */

import { getClusters, addCluster, updateCluster } from './storage.js'
import { generateId } from './utils.js'
import { embed, isEmbedderReady } from './embedder.js'

// ── 파라미터 ────────────────────────────────────────────
const DISTANCE_THRESHOLD_M  = 200  // 거리 임계값 (미터)
const SIMILARITY_THRESHOLD  = 0.45 // 임베딩 코사인 유사도 임계값

// ── Haversine ───────────────────────────────────────────

/**
 * 두 위경도 좌표 간 거리 계산 (미터)
 * @param {number} lat1 @param {number} lng1
 * @param {number} lat2 @param {number} lng2
 * @returns {number}
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = deg => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── 코사인 유사도 (Float32Array) ────────────────────────

/**
 * 두 정규화된 임베딩 벡터 간 코사인 유사도
 * normalize: true 이므로 내적 = 코사인 유사도
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {number} 0~1
 */
export function cosineSimilarity(a, b) {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

// ── 군집 배정 메인 로직 ──────────────────────────────────

/**
 * 신규 Report를 받아 군집을 배정하고 clusters를 업데이트한다.
 *
 * 임베딩 모델이 로드되지 않은 경우 신규 군집을 생성한다.
 * (graceful degradation — 기본 기능은 모델 없이도 동작)
 *
 * @param {Report} report - 이미 저장된 report 객체 (id 포함)
 * @returns {Promise<string>} 배정된 clusterId
 */
export async function assignCluster(report) {
  const text         = `${report.title} ${report.description}`
  const { lat, lng } = report.location

  const clusters = getClusters()

  // 1. 거리 필터
  const nearby = clusters.filter(c => {
    const dist = haversineDistance(lat, lng, c.location.lat, c.location.lng)
    return dist <= DISTANCE_THRESHOLD_M
  })

  // 2. 임베딩 모델 미로드 → 신규 군집 (graceful degradation)
  if (!isEmbedderReady()) {
    console.warn('[clustering] embedder not ready, creating new cluster')
    return createNewCluster(report, null)
  }

  // 3. 신규 제보 임베딩 (후보 유무와 무관하게 항상 수행)
  const newVec = await embed(text)

  // 4. 후보 없음 → 신규 군집 (벡터는 저장)
  if (nearby.length === 0) {
    return createNewCluster(report, newVec)
  }

  // 5. 후보 군집과 유사도 비교
  //    embeddingVector가 null인 군집(모델 미로드 시 생성)은 즉석 embed로 보완
  let best      = null
  let bestScore = -1
  let bestVec   = null

  for (const c of nearby) {
    let cVec
    if (c.embeddingVector) {
      cVec = new Float32Array(c.embeddingVector)
    } else {
      // 벡터 없는 기존 군집 → 대표 제보 텍스트로 즉석 embed 후 군집에 저장
      const { getReportById } = await import('./storage.js')
      const rep = getReportById(c.representId)
      if (!rep) continue
      cVec = await embed(`${rep.title} ${rep.description}`)
      updateCluster({ ...c, embeddingVector: Array.from(cVec) })
    }
    const score = cosineSimilarity(newVec, cVec)
    if (score > bestScore) {
      bestScore = score
      best      = c
      bestVec   = cVec
    }
  }

  // 6. 임계값 미달 → 신규 군집
  if (bestScore < SIMILARITY_THRESHOLD || !best) {
    return createNewCluster(report, newVec)
  }

  // 7. 기존 군집에 배정 — 대표 벡터를 기존·신규의 평균으로 갱신
  const mergedVec = new Float32Array(bestVec.length)
  for (let i = 0; i < bestVec.length; i++) {
    mergedVec[i] = (bestVec[i] + newVec[i]) / 2
  }

  const dangerPriority = { high: 3, medium: 2, low: 1 }
  const newDanger =
    dangerPriority[report.danger] > dangerPriority[best.danger]
      ? report.danger
      : best.danger

  const updated = {
    ...best,
    reportIds:       [...best.reportIds, report.id],
    embeddingVector: Array.from(mergedVec),
    danger:          newDanger,
    updatedAt:       report.createdAt,
  }
  updateCluster(updated)
  return best.id
}

/**
 * 신규 군집 생성
 * @param {Report} report
 * @param {Float32Array|null} vector - 임베딩 벡터 (없으면 null)
 * @returns {string} 신규 clusterId
 */
function createNewCluster(report, vector) {
  const cluster = {
    id:              generateId(),
    representId:     report.id,
    reportIds:       [report.id],
    location: {
      lat: report.location.lat,
      lng: report.location.lng,
    },
    danger:          report.danger,
    category:        report.category,
    embeddingVector: vector ? Array.from(vector) : null,
    createdAt:       report.createdAt,
    updatedAt:       report.createdAt,
  }
  addCluster(cluster)
  return cluster.id
}
