/**
 * embedder.js
 * 문장 임베딩 모델 싱글톤
 *
 * 모델: Xenova/paraphrase-multilingual-MiniLM-L12-v2
 * - 117MB (q8 양자화), WASM 백엔드, 한국어 포함 50개 언어 지원
 * - 최초 호출 시 다운로드 → 브라우저 Cache API에 저장
 * - 이후 호출 시 캐시에서 즉시 로드
 */

import { pipeline, env } from '@huggingface/transformers'

env.useBrowserCache = true
env.allowLocalModels = false

const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'

let _embedder = null
let _loading  = null
let _progressCallbacks = []

/**
 * 임베딩 모델 초기화 (최초 1회만 다운로드, 이후 캐시 사용)
 * 이미 로드 중이면 콜백만 추가로 등록한다.
 * @param {function} [onProgress] - 다운로드 진행 콜백 ({ progress, file, loaded, total })
 * @returns {Promise<void>}
 */
export async function initEmbedder(onProgress) {
  if (onProgress) _progressCallbacks.push(onProgress)
  if (_embedder) return
  if (_loading)  return _loading

  _loading = pipeline('feature-extraction', MODEL_ID, {
    device: 'wasm',
    dtype: 'q8',
    progress_callback: p => {
      _progressCallbacks.forEach(cb => { try { cb(p) } catch {} })
    },
  }).then(p => {
    _embedder = p
    _loading  = null
    _progressCallbacks = []
  })

  return _loading
}

/**
 * 텍스트 → 정규화된 임베딩 벡터 (Float32Array)
 * @param {string} text
 * @returns {Promise<Float32Array>}
 */
export async function embed(text) {
  if (!_embedder) throw new Error('embedder not initialized')
  const out = await _embedder(text, { pooling: 'mean', normalize: true })
  return out.data
}

/**
 * 두 텍스트 간 코사인 유사도 (0~1)
 * normalize: true 이므로 내적 = 코사인 유사도
 * @param {string} textA
 * @param {string} textB
 * @returns {Promise<number>}
 */
export async function similarity(textA, textB) {
  const [a, b] = await Promise.all([embed(textA), embed(textB)])
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

/** 모델 로드 여부 */
export function isEmbedderReady() {
  return _embedder !== null
}
