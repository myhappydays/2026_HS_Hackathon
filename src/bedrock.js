/**
 * bedrock.js
 * AWS Bedrock Claude 호출 모듈
 *
 * - localStorage에서 Bearer 토큰, 모델 ID, 취합 기준 관리
 * - 사용 가능한 Anthropic 모델 목록 실시간 조회
 * - 내 주변 군집 목록 → 자연어 위험 요약 생성
 */

import { relativeTime } from './utils.js'

const STORAGE_KEY_TOKEN      = 'bedrock_token'
const STORAGE_KEY_MODEL      = 'bedrock_model'
const STORAGE_KEY_SORT       = 'bedrock_sort'
const STORAGE_KEY_MAX_DIST   = 'bedrock_max_dist'
const STORAGE_KEY_MAX_COUNT  = 'bedrock_max_count'
const STORAGE_KEY_MIN_REPORTS= 'bedrock_min_reports'
const STORAGE_KEY_CACHE      = 'bedrock_summary_cache'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30분

/** 캐시된 요약 텍스트만 반환 (TTL 무관). 없으면 null. */
export function getCachedSummary() {
  try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY_CACHE) || 'null')
    return cached?.summary ?? null
  } catch { return null }
}

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

const SYSTEM_PROMPT = `You are a Korean neighborhood safety alert service.

<task>
Write a short Korean safety notification based on the hazard reports.
</task>

<format>
- Line 1: a warm greeting-style header with a relevant emoji — reads like "안녕하세요! 오늘 ~하니 조심하세요" or similar, ≤20 chars, no period
- Lines 2–4: 2–3 sentences of Korean prose, each sentence on its own line
- NO blank lines anywhere in the output — every line follows immediately after the previous
- Use 1–2 emojis naturally in the prose lines, not in the header; choose from music-related emojis: 🎵 🎶 🎼 🎹 🎸 🎺 🎻 🥁 🪗 🪘 🎷
- Vary Korean sentence endings — never use the same ending on consecutive lines
- Include specific location names
</format>

<examples>
<example>
<input>sinkhole + flood + rockfall near university campus</input>
<output>🎼 오늘 협성대 주변, 꼭 확인하세요
협성대 진입로가 침수되어 차량과 도보 모두 통행이 막혀 있으니 우회로를 이용해 주세요.
정문 앞 보도엔 싱크홀까지 생겨서 등하교 학생들은 그쪽 방향을 잠깐 피해 주시면 좋겠어요. 🪗
북측 언덕로에도 대형 낙석이 굴러와 있으니 오늘만큼은 그 길은 피하고 안전한 경로로 이동하세요!</output>
</example>
</examples>`

export async function summarizeArea(clusters, { force = false } = {}) {
  if (clusters.length === 0) return ''

  const dangerKey = { high: 'high', medium: 'medium', low: 'low' }
  const catKey    = {
    road: 'road', facility: 'facility',
    weather: 'weather', safety: 'safety', etc: 'etc',
  }

  const lines = clusters.map((c, i) => {
    const dist    = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
    const updated = relativeTime(c.updatedAt)
    const desc    = c.description ? `\n   ${c.description}` : ''
    return `${i+1}. [${dangerKey[c.danger]||c.danger}/${catKey[c.category]||c.category}] "${c.title}" — ${dist}, ${c.count} reports, updated ${updated}${desc}${c.address ? ` (${c.address})` : ''}`
  }).join('\n')

  const prompt = `<hazard_reports count="${clusters.length}">\n${lines}\n</hazard_reports>\n\nWrite the safety alert now.`

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

