/**
 * bedrock.js
 * AWS Bedrock Claude 호출 모듈
 *
 * - localStorage에서 Bearer 토큰, 모델 ID, 취합 기준 관리
 * - 사용 가능한 Anthropic 모델 목록 실시간 조회
 * - 내 주변 군집 목록 → 자연어 위험 요약 생성
 */

const STORAGE_KEY_TOKEN      = 'bedrock_token'
const STORAGE_KEY_MODEL      = 'bedrock_model'
const STORAGE_KEY_SORT       = 'bedrock_sort'
const STORAGE_KEY_MAX_DIST   = 'bedrock_max_dist'
const STORAGE_KEY_MAX_COUNT  = 'bedrock_max_count'
const STORAGE_KEY_MIN_REPORTS= 'bedrock_min_reports'
const STORAGE_KEY_CACHE      = 'bedrock_summary_cache'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30분

const RUNTIME_ENDPOINT = 'https://bedrock-runtime.us-east-1.amazonaws.com'
const DEFAULT_MODEL    = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'

// ── 하드코딩 모델 목록 ────────────────────────────────────
export const MODELS = [
  { id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', name: 'Claude Haiku 4.5' },
  { id: 'us.anthropic.claude-sonnet-4-6',              name: 'Claude Sonnet 4.6' },
  { id: 'us.anthropic.claude-opus-4-6-v1',             name: 'Claude Opus 4.6'  },
]

// ── 토큰/모델 관리 ────────────────────────────────────────

export function getToken()   { return localStorage.getItem(STORAGE_KEY_TOKEN) || '' }
export function saveToken(t) { localStorage.setItem(STORAGE_KEY_TOKEN, t.trim()) }

export function getModel()   { return localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL }
export function saveModel(m) { localStorage.setItem(STORAGE_KEY_MODEL, m) }

export function isConfigured() { return !!getToken() }

// ── 취합 기준 설정 ────────────────────────────────────────

export function getSettings() {
  return {
    sortBy:     localStorage.getItem(STORAGE_KEY_SORT)        || 'dist',
    maxDist:    parseInt(localStorage.getItem(STORAGE_KEY_MAX_DIST))   || 2000,
    maxCount:   parseInt(localStorage.getItem(STORAGE_KEY_MAX_COUNT))  || 10,
    minReports: parseInt(localStorage.getItem(STORAGE_KEY_MIN_REPORTS))|| 1,
  }
}

export function saveSettings({ sortBy, maxDist, maxCount, minReports }) {
  localStorage.setItem(STORAGE_KEY_SORT,        sortBy)
  localStorage.setItem(STORAGE_KEY_MAX_DIST,    maxDist)
  localStorage.setItem(STORAGE_KEY_MAX_COUNT,   maxCount)
  localStorage.setItem(STORAGE_KEY_MIN_REPORTS, minReports)
}

// ── Bedrock 호출 ─────────────────────────────────────────

export async function callClaude(systemPrompt, userPrompt) {
  const token = getToken()
  if (!token) throw new Error('Bedrock 토큰이 설정되지 않았습니다.')

  const res = await fetch(`${RUNTIME_ENDPOINT}/model/${getModel()}/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Bedrock 오류 (${res.status}): ${err.slice(0, 120)}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ── 지역 위험 요약 ────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 도시 안전 정보를 시민에게 전달하는 안내 시스템입니다.
주어진 위험 제보 목록을 바탕으로 지금 이 지역에서 주의해야 할 위험을 2~3문장으로 간결하게 요약하세요.
- "지금 이 지역에서" 로 시작하세요.
- 가장 위험도가 높은 항목을 먼저 언급하세요.
- 구체적인 장소나 상황을 포함하세요.
- 마크다운, 목록, 이모지 없이 자연스러운 문장으로만 작성하세요.`

export async function summarizeArea(clusters, { force = false } = {}) {
  if (clusters.length === 0) return ''

  const dangerLabel = { high: '높음', medium: '보통', low: '낮음' }
  const catLabel    = {
    road: '도로/교통', facility: '시설/건물',
    weather: '기상/환경', safety: '치안/안전', etc: '생활/기타',
  }

  const lines = clusters.map((c, i) => {
    const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
    return `${i+1}. [위험도:${dangerLabel[c.danger]||c.danger}] [분야:${catLabel[c.category]||c.category}] "${c.title}" — ${dist} 거리, 제보 ${c.count}건${c.address ? ` (${c.address})` : ''}`
  }).join('\n')

  const prompt = `다음은 내 주변 ${clusters.length}건의 위험 제보 목록입니다:\n\n${lines}\n\n위 내용을 바탕으로 지역 안전 요약을 작성해주세요.`

  // ── 캐시 확인 ──────────────────────────────────────────
  if (!force) {
    try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY_CACHE) || 'null')
    if (
      cached &&
      cached.prompt   === prompt &&
      Date.now() - cached.cachedAt < CACHE_TTL_MS
    ) {
      return cached.summary
    }
    } catch { /* 손상된 캐시는 무시 */ }
  }

  // ── 실제 호출 ──────────────────────────────────────────
  const summary = await callClaude(SYSTEM_PROMPT, prompt)

  try {
    localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify({
      summary,
      prompt,
      cachedAt: Date.now(),
    }))
  } catch { /* 저장 실패는 조용히 무시 */ }

  return summary
}

