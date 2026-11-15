/**
 * storage.js
 * Firestore가 원본, localStorage는 조회 실패(오프라인 등) 시에만 쓰는 읽기 캐시.
 *
 * - 쓰기는 Firestore가 성공해야 성공이다. 실패하면 예외를 던지므로 호출부가 사용자에게 알려야 한다.
 * - 여러 사람이 동시에 바꾸는 값(공감 수, 댓글, 군집 소속 제보)은
 *   문서 전체 덮어쓰기 대신 increment / arrayUnion / 트랜잭션으로 갱신한다.
 */

import { db, auth } from './firebase.js'
import {
  collection, getDocs, getDoc, setDoc, updateDoc, doc, deleteDoc, writeBatch,
  query, where, runTransaction, increment, arrayUnion,
} from 'firebase/firestore'

const REPORTS_COLLECTION = 'reports'
const CLUSTERS_COLLECTION = 'clusters'

const LOCAL_KEYS = {
  [REPORTS_COLLECTION]: 'reports',
  [CLUSTERS_COLLECTION]: 'clusters',
}

/** 사용자에게 그대로 보여 줄 수 있는 메시지를 가진 저장 오류 */
export class StorageError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'StorageError'
    this.cause = cause
  }
}

/** 오류 → 사용자용 문구 */
export function storageErrorMessage(err, fallback = '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.') {
  if (err instanceof StorageError) return err.message
  if (err?.code === 'permission-denied') {
    return auth.currentUser ? '권한이 없어 처리하지 못했습니다.' : '로그인 후 이용할 수 있습니다.'
  }
  return fallback
}

// 서버가 조회를 권한 문제로 거부했는지 (보안 규칙상 로그인 사용자만 읽을 수 있다)
let readDenied = false

/** 마지막 목록 조회가 권한 문제로 거부되었는지 — 비로그인 방문자에게 로그인 안내를 띄울 때 쓴다 */
export function wasReadDenied() {
  return readDenied
}

// ── 로컬 캐시 ───────────────────────────────────────────

function readLocal(col) {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEYS[col]) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeLocal(col, list) {
  const key = LOCAL_KEYS[col]
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // 용량 초과: 사진·임베딩을 뺀 가벼운 사본이라도 남긴다 (오프라인 목록 표시용)
    try {
      const slim = list.map(({ imageBase64, embeddingVector, ...rest }) => rest)
      localStorage.setItem(key, JSON.stringify(slim))
    } catch (e) {
      console.warn('[storage] local cache write failed', e)
    }
  }
}

function cacheUpsert(col, item) {
  const list = readLocal(col)
  const i = list.findIndex(x => x.id === item.id)
  if (i >= 0) list[i] = item
  else list.push(item)
  writeLocal(col, list)
}

function cacheRemove(col, id) {
  writeLocal(col, readLocal(col).filter(x => x.id !== id))
}

// ── 공통 읽기/쓰기 ──────────────────────────────────────

function ref(col, id) {
  return doc(db, col, String(id))
}

function assertOnline() {
  // Firestore 쓰기는 오프라인에서 응답 없이 대기하므로 먼저 막는다
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new StorageError('오프라인 상태입니다. 인터넷 연결 후 다시 시도해 주세요.')
  }
}

async function fetchAll(col) {
  try {
    const snapshot = await getDocs(collection(db, col))
    // 서버가 "비어 있음"이라고 확인해 준 경우에만 빈 목록을 믿는다.
    // (오프라인이면 캐시 기준의 빈 스냅샷이 오므로 로컬 캐시로 넘어간다)
    if (!snapshot.empty || !snapshot.metadata.fromCache) {
      const list = snapshot.docs.map(d => d.data())
      writeLocal(col, list)
      readDenied = false
      return list
    }
  } catch (e) {
    if (e?.code === 'permission-denied') readDenied = true
    console.warn(`[storage] ${col} 조회 실패, 로컬 캐시 사용:`, e)
  }
  return readLocal(col)
}

async function fetchOne(col, id) {
  if (id === undefined || id === null || id === '') return undefined
  try {
    const snap = await getDoc(ref(col, id))
    if (snap.exists()) {
      const data = snap.data()
      cacheUpsert(col, data)
      return data
    }
    if (!snap.metadata.fromCache) {
      cacheRemove(col, id)
      return undefined
    }
  } catch (e) {
    console.warn(`[storage] ${col}/${id} 조회 실패, 로컬 캐시 사용:`, e)
  }
  return readLocal(col).find(x => x.id === id)
}

async function putOne(col, item) {
  assertOnline()
  await setDoc(ref(col, item.id), item)
  cacheUpsert(col, item)
}

async function patchOne(col, id, fields) {
  assertOnline()
  await updateDoc(ref(col, id), fields)
  // increment/arrayUnion 같은 센티널은 로컬에 그대로 쓸 수 없으므로 서버 값을 다시 읽는다
  return fetchOne(col, id)
}

async function removeOne(col, id) {
  assertOnline()
  await deleteDoc(ref(col, id))
  cacheRemove(col, id)
}

async function putMany(col, items) {
  assertOnline()
  // Firestore 배치는 최대 500건
  for (let i = 0; i < items.length; i += 400) {
    const batch = writeBatch(db)
    items.slice(i, i + 400).forEach(item => batch.set(ref(col, item.id), item))
    await batch.commit()
  }
  const byId = new Map(readLocal(col).map(x => [x.id, x]))
  items.forEach(item => byId.set(item.id, item))
  writeLocal(col, [...byId.values()])
}

/** localStorage 사용량 (호환성 유지) */
export function getStorageUsage() {
  return 0
}

/** 저장 한도 초과 여부 (Firestore 전환 후 항상 false, 호환성 유지) */
export function isStorageFull() {
  return false
}

// ── Reports ─────────────────────────────────────────────

export function getReports() {
  return fetchAll(REPORTS_COLLECTION)
}

export function getReportById(id) {
  return fetchOne(REPORTS_COLLECTION, id)
}

/** 여러 제보를 한 번에 (없는 것은 제외) */
export async function getReportsByIds(ids) {
  const list = await Promise.all([...new Set(ids || [])].map(id => getReportById(id)))
  return list.filter(Boolean)
}

export async function getReportsByUserId(userId) {
  if (!userId) return []
  try {
    const q = query(collection(db, REPORTS_COLLECTION), where('userId', '==', userId))
    const snapshot = await getDocs(q)
    if (!snapshot.empty || !snapshot.metadata.fromCache) {
      return snapshot.docs.map(d => d.data())
    }
  } catch (e) {
    console.warn('[storage] 내 제보 조회 실패, 로컬 캐시 사용:', e)
  }
  return readLocal(REPORTS_COLLECTION).filter(r => r.userId === userId)
}

export function saveReports(reports) {
  return putMany(REPORTS_COLLECTION, reports)
}

export function addReport(report) {
  return putOne(REPORTS_COLLECTION, report)
}

/** 제보 문서 전체 교체. 일부 필드만 바꿀 때는 patchReport 를 쓴다. */
export function updateReport(updated) {
  return putOne(REPORTS_COLLECTION, updated)
}

/** 제보의 일부 필드만 갱신 */
export function patchReport(id, fields) {
  return patchOne(REPORTS_COLLECTION, id, fields)
}

/** 허위/불량 신고 횟수 +1 (동시 신고에도 누락 없음) */
export function flagReport(id) {
  return patchOne(REPORTS_COLLECTION, id, { reportCount: increment(1) })
}

export function deleteReport(id) {
  return removeOne(REPORTS_COLLECTION, id)
}

// ── Clusters ─────────────────────────────────────────────

export function getClusters() {
  return fetchAll(CLUSTERS_COLLECTION)
}

export function getClusterById(id) {
  return fetchOne(CLUSTERS_COLLECTION, id)
}

export function saveClusters(clusters) {
  return putMany(CLUSTERS_COLLECTION, clusters)
}

export function addCluster(cluster) {
  return putOne(CLUSTERS_COLLECTION, cluster)
}

/** 군집 문서 전체 교체. 동시 수정이 가능한 값은 아래 전용 함수를 쓴다. */
export function updateCluster(updated) {
  return putOne(CLUSTERS_COLLECTION, updated)
}

/** 군집의 일부 필드만 갱신 */
export function patchCluster(id, fields) {
  return patchOne(CLUSTERS_COLLECTION, id, fields)
}

/** 공감 +1 */
export function likeCluster(id) {
  return patchOne(CLUSTERS_COLLECTION, id, { likes: increment(1) })
}

/** 댓글 추가 */
export function addClusterComment(id, comment) {
  return patchOne(CLUSTERS_COLLECTION, id, { comments: arrayUnion(comment) })
}

export function deleteCluster(id) {
  return removeOne(CLUSTERS_COLLECTION, id)
}

/**
 * 군집을 트랜잭션으로 읽고-고쳐-쓴다.
 * 동시에 두 명이 같은 군집을 바꿔도 한쪽 변경이 사라지지 않는다.
 *
 * @param {string} id
 * @param {(current: object) => object|null|undefined} mutate
 *   - 새 군집 객체 반환 → 저장
 *   - null 반환 → 군집 삭제
 *   - undefined 반환 → 변경 없음
 * @returns {Promise<object|null|undefined>} 저장된 군집 / 삭제 시 null / 문서가 없으면 undefined
 */
export async function transactCluster(id, mutate) {
  assertOnline()
  const target = ref(CLUSTERS_COLLECTION, id)
  const result = await runTransaction(db, async tx => {
    const snap = await tx.get(target)
    if (!snap.exists()) return undefined
    const current = snap.data()
    const next = mutate(current)
    if (next === undefined) return current
    if (next === null) {
      tx.delete(target)
      return null
    }
    tx.set(target, next)
    return next
  })
  if (result === null) cacheRemove(CLUSTERS_COLLECTION, id)
  else if (result) cacheUpsert(CLUSTERS_COLLECTION, result)
  return result
}
