/**
 * clustering.js
 * 온라인 군집 배정 로직
 *
 * 1. Haversine 거리 계산 → 200m 이내 후보 필터
 * 2. 임베딩 코사인 유사도 계산 → 임계값(0.45) 이상 후보 중 최고값 선택
 *    - 모델: Xenova/paraphrase-multilingual-MiniLM-L12-v2
 *    - 임계값 0.45: 130개 테스트케이스 기반 최적값 조정 (오탐 감소)
 * 3. 없으면 신규 군집 생성
 */

import {
  getClusters, getReportById, addCluster, patchCluster, transactCluster,
  addReport, patchReport, deleteReport,
} from './storage.js'
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

// ── 대표 벡터 병합 ──────────────────────────────────────

/**
 * 군집 대표 벡터에 새 제보 벡터를 누적 평균으로 반영하고 단위 벡터로 정규화한다.
 * (단순 (a+b)/2 는 최신 제보에 절반의 가중치를 줘서 대표 벡터가 쉽게 끌려간다)
 *
 * @param {ArrayLike<number>} centroid - 기존 대표 벡터
 * @param {number} count - 기존 대표 벡터에 반영된 제보 수 (1 이상)
 * @param {ArrayLike<number>} vec - 새 제보 벡터
 * @returns {number[]}
 */
export function mergeVector(centroid, count, vec) {
  const n = Math.max(1, count)
  const merged = new Array(vec.length)
  let norm = 0
  for (let i = 0; i < vec.length; i++) {
    merged[i] = (centroid[i] * n + vec[i]) / (n + 1)
    norm += merged[i] * merged[i]
  }
  norm = Math.sqrt(norm)
  if (norm > 0) for (let i = 0; i < merged.length; i++) merged[i] /= norm
  return merged
}

const DANGER_PRIORITY = { high: 3, medium: 2, low: 1 }

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
  const text         = `${report.title} ${report.description || ''}`
  const { lat, lng } = report.location

  const clusters = await getClusters()

  // 재시도(오프라인 큐 재전송 등)로 이미 배정된 제보면 그 군집을 그대로 쓴다
  const already = clusters.find(c => Array.isArray(c.reportIds) && c.reportIds.includes(report.id))
  if (already) return already.id

  // 1. 거리 필터 — 해결 완료된 군집은 후보에서 제외한다.
  //    (같은 자리에 다시 생긴 위험이 "해결 완료" 군집에 묻히지 않도록)
  const nearby = clusters.filter(c => {
    if (c.status === 'resolved' || !c.location) return false
    const dist = haversineDistance(lat, lng, c.location.lat, c.location.lng)
    return dist <= DISTANCE_THRESHOLD_M
  })

  // 2. 임베딩 모델 미로드 → 신규 군집 (graceful degradation)
  if (!isEmbedderReady()) {
    console.warn('[clustering] embedder not ready, creating new cluster')
    return await createNewCluster(report, null)
  }

  // 3. 신규 제보 임베딩 (후보 유무와 무관하게 항상 수행)
  const newVec = await embed(text)

  // 4. 후보 없음 → 신규 군집 (벡터는 저장)
  if (nearby.length === 0) {
    return await createNewCluster(report, newVec)
  }

  // 5. 후보 군집과 유사도 비교
  //    embeddingVector가 null인 군집(모델 미로드 시 생성)은 즉석 embed로 보완
  let best      = null
  let bestScore = -1
  let bestVec   = null

  for (const c of nearby) {
    let cVec
    if (Array.isArray(c.embeddingVector) && c.embeddingVector.length === newVec.length) {
      cVec = c.embeddingVector
    } else {
      // 벡터 없는 기존 군집 → 대표 제보 텍스트로 즉석 embed 후 군집에 저장
      const rep = await getReportById(c.representId)
      if (!rep) continue
      cVec = Array.from(await embed(`${rep.title} ${rep.description || ''}`))
      try {
        await patchCluster(c.id, { embeddingVector: cVec })
      } catch (e) {
        console.warn('[clustering] 벡터 보완 저장 실패 (배정은 계속):', e)
      }
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
    return await createNewCluster(report, newVec)
  }

  // 7. 기존 군집에 배정 — 트랜잭션으로 최신 문서를 읽어 반영한다.
  //    (동시에 두 제보가 같은 군집에 들어와도 reportIds 가 유실되지 않음)
  const saved = await transactCluster(best.id, current => {
    if (current.status === 'resolved') return undefined
    const ids = Array.isArray(current.reportIds) ? current.reportIds : []
    if (ids.includes(report.id)) return undefined
    const base = Array.isArray(current.embeddingVector) && current.embeddingVector.length === newVec.length
      ? current.embeddingVector
      : bestVec
    return {
      ...current,
      reportIds:       [...ids, report.id],
      embeddingVector: mergeVector(base, ids.length, newVec),
      danger:          (DANGER_PRIORITY[report.danger] || 0) > (DANGER_PRIORITY[current.danger] || 0)
        ? report.danger
        : current.danger,
      // status는 관리자 전용 보호 필드이므로 기존 군집 병합 시 건드리지 않는다
      updatedAt:       report.createdAt,
    }
  })

  // 그 사이 군집이 삭제됐거나 해결 처리됐으면 새 군집으로
  if (!saved || !saved.reportIds?.includes(report.id)) {
    return await createNewCluster(report, newVec)
  }
  return best.id
}

/**
 * 제보 한 건을 등록한다: 제보 저장 → 군집 배정 → 제보에 clusterId 기록.
 *
 * 목록은 군집 기준으로 그려지므로, 군집에 속하지 못한 제보는 어디에도 보이지 않는다.
 * 그래서 군집 배정이 끝내 실패하면 저장한 제보를 되돌리고 예외를 던진다.
 * 같은 제보로 다시 호출해도 안전하다 (오프라인 큐 재전송).
 *
 * @param {Report} report
 * @returns {Promise<string>} 배정된 clusterId
 */
export async function submitReport(report) {
  await addReport(report)

  let clusterId
  try {
    try {
      clusterId = await assignCluster(report)
    } catch (e) {
      // 임베딩/유사도 판정 쪽 오류면 단독 군집으로라도 등록한다
      console.warn('[clustering] assignCluster failed, falling back to new cluster:', e)
      clusterId = await createNewCluster(report, null)
    }
  } catch (e) {
    await deleteReport(report.id).catch(() => {})
    throw e
  }

  report.clusterId = clusterId
  try {
    await patchReport(report.id, { clusterId })
  } catch (e) {
    // 군집에는 이미 들어갔으므로 등록 자체는 성공이다
    console.warn('[clustering] clusterId 기록 실패:', e)
  }
  return clusterId
}

/**
 * 신규 군집 생성
 * @param {Report} report
 * @param {Float32Array|null} vector - 임베딩 벡터 (없으면 null)
 * @returns {Promise<string>} 신규 clusterId
 */
async function createNewCluster(report, vector) {
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
    status:          report.status || 'active',
    embeddingVector: vector ? Array.from(vector) : null,
    createdAt:       report.createdAt,
    updatedAt:       report.createdAt,
  }
  await addCluster(cluster)
  return cluster.id
}
