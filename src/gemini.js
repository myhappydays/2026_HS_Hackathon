/**
 * gemini.js
 * Google Gemini AI 호출 모듈 (페르마타 안전 브리핑 & SNS 공유 카드)
 *
 * - Cloudflare Worker 프록시(/summarize) 우선 호출
 * - 로컬 환경변수(VITE_GEMINI_API_KEY) 또는 사용자 지정 키로 직접 호출 Fallback
 * - 음악적 감성(Fermata)의 한국어 안전 알림 생성
 */

import { relativeTime } from './utils.js'

const STORAGE_KEY_TOKEN       = 'gemini_api_key'
const STORAGE_KEY_MODEL       = 'gemini_model'
const STORAGE_KEY_SORT        = 'gemini_sort'
const STORAGE_KEY_MAX_DIST    = 'gemini_max_dist'
const STORAGE_KEY_MAX_COUNT   = 'gemini_max_count'
const STORAGE_KEY_MIN_REPORTS = 'gemini_min_reports'
const STORAGE_KEY_CACHE       = 'fermata_ai_summary_cache'
const LEGACY_KEY_CACHE        = 'bedrock_summary_cache'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30분
const DEFAULT_MODEL = 'gemini-flash-latest'

export const MODELS = [
  { id: 'gemini-flash-latest', name: 'Gemini Flash (추천)' },
  { id: 'gemini-2.0-flash',    name: 'Gemini 2.0 Flash' },
]

const WORKER_BASE = (import.meta.env.VITE_SUMMARY_API_URL || import.meta.env.VITE_CATEGORY_API_URL || 'https://fermata-report-clef-v4.hejoliv.workers.dev').replace(/\/+$/, '')
const ENV_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '').trim()

// 팀원 누구나 추가 서버 설정이나 배포 없이도 즉시 작동하도록 지원하는 내장 Fallback 키
const BUILTIN_KEY = (() => {
  try {
    return atob('QVEuQWI4Uk42TFdqYUtOd3djVGtfWkxaMFNJUzR3N0lqQUxuRG9kWHdCVkJCUks0bUxBZXc=')
  } catch {
    return ''
  }
})()

// ── 토큰/설정 관리 ────────────────────────────────────────

export function getToken() {
  return localStorage.getItem(STORAGE_KEY_TOKEN) || ENV_API_KEY || BUILTIN_KEY || ''
}

export function saveToken(t) {
  if (!t) localStorage.removeItem(STORAGE_KEY_TOKEN)
  else localStorage.setItem(STORAGE_KEY_TOKEN, t.trim())
}

export function getModel() {
  return localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL
}

export function saveModel(m) {
  localStorage.setItem(STORAGE_KEY_MODEL, m)
}

/**
 * 기본적으로 서버 프록시 및 클라이언트 Fallback 키가 준비되어 있으므로 항상 true 반환
 */
export function isConfigured() {
  return true
}

export function getSettings() {
  return {
    sortBy:     localStorage.getItem(STORAGE_KEY_SORT)        || 'dist',
    maxDist:    parseInt(localStorage.getItem(STORAGE_KEY_MAX_DIST), 10)   || 2000,
    maxCount:   parseInt(localStorage.getItem(STORAGE_KEY_MAX_COUNT), 10)  || 10,
    minReports: parseInt(localStorage.getItem(STORAGE_KEY_MIN_REPORTS), 10)|| 1,
  }
}

export function saveSettings({ sortBy, maxDist, maxCount, minReports }) {
  localStorage.setItem(STORAGE_KEY_SORT,        sortBy)
  localStorage.setItem(STORAGE_KEY_MAX_DIST,    maxDist)
  localStorage.setItem(STORAGE_KEY_MAX_COUNT,   maxCount)
  localStorage.setItem(STORAGE_KEY_MIN_REPORTS, minReports)
}

/** 캐시된 요약 텍스트만 반환 (TTL 유효 시). 없거나 만료면 null. */
export function getCachedSummary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CACHE)
    if (raw) {
      const cached = JSON.parse(raw)
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return cached.summary ?? null
      }
    }
  } catch {}
  return null
}

// ── Gemini API 호출 (Worker 우선 ➔ 직접 호출 Fallback) ───────

export async function callGemini(systemPrompt, userPrompt, { temperature = 0.3, maxOutputTokens = 1024 } = {}) {
  // 1. Worker 프록시 시도
  let workerFailed = false
  try {
    const res = await fetch(`${WORKER_BASE}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        temperature,
        maxOutputTokens,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.ok && data.text) {
        return data.text.trim()
      }
    } else {
      console.warn(`[Gemini] Worker 프록시 응답 (${res.status}), 직접 호출 Fallback 시도`)
      workerFailed = true
    }
  } catch (err) {
    console.warn('[Gemini] Worker 프록시 연결 실패, 직접 호출 Fallback 시도:', err)
    workerFailed = true
  }

  // 2. Worker 미배포/오류 상태일 경우 직접 Gemini API 호출 (Fallback)
  const apiKey = getToken()
  if (!apiKey) {
    if (workerFailed) {
      throw new Error('AI 요약 서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
    throw new Error('Gemini API 키가 설정되지 않았습니다.')
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent`
  const bodyPayload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  }
  if (systemPrompt) {
    bodyPayload.systemInstruction = {
      parts: [{ text: systemPrompt }],
    }
  }

  const directRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify(bodyPayload),
  })

  if (!directRes.ok) {
    const errText = await directRes.text()
    throw new Error(`Gemini 오류 (${directRes.status}): ${errText.slice(0, 150)}`)
  }

  const result = await directRes.json()
  const candidate = result.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini 응답에 텍스트가 없습니다.')
  }

  return text.trim()
}

// ── 지역 위험 요약 (메인 화면) ────────────────────────────────

const SYSTEM_PROMPT = `당신은 동네 안전 알림 서비스 페르마타(Fermata)의 안전 브리핑 AI입니다.

<task>
주변 위험 제보 데이터들을 바탕으로 주민들이 조심할 수 있도록 친절하고 신뢰감 있는 한국어 안전 브리핑을 작성하세요.
</task>

<format>
- 1줄: 따뜻한 인사말 및 상황 헤더 (음악 이모지 🎼 필수 포함, 20자 이내, 마침표 없음) 예: "🎼 오늘 마포구 주변, 꼭 확인하세요"
- 2~4줄: 2~3개의 정돈된 한국어 문장 (각 문장마다 줄바꿈)
- 빈 줄(공백 줄)은 절대 넣지 마세요.
- 본문 문장 내에 음악 관련 이모지를 1~2개 자연스럽게 배치하세요: 🎵 🎶 🎼 🎹 🎸 🎺 🎻 🥁 🪗 🪘 🎷
- 문장 종결 어미를 다양하게 사용하세요 (~해 주세요, ~바랍니다, ~추천해요 등).
- 구체적인 지명이나 도로명을 반드시 포함하세요.
</format>`

export async function summarizeArea(clusters, { force = false } = {}) {
  if (clusters.length === 0) return ''

  const dangerKey = { high: '위험도 높음', medium: '위험도 보통', low: '위험도 낮음' }
  const catKey = {
    road: '도로/교통', facility: '시설물',
    weather: '기상/재해', safety: '치안/안전', etc: '기타',
  }

  const lines = clusters.map((c, i) => {
    const dist    = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
    const updated = relativeTime(c.updatedAt)
    const desc    = c.description ? `\n   상세내용: ${c.description}` : ''
    return `${i+1}. [${dangerKey[c.danger]||c.danger}/${catKey[c.category]||c.category}] "${c.title}" — 거리 ${dist}, 제보 ${c.count}건, 갱신 ${updated}${desc}${c.address ? ` (${c.address})` : ''}`
  }).join('\n')

  const prompt = `<hazard_reports count="${clusters.length}">\n${lines}\n</hazard_reports>\n\n위 제보 현황을 바탕으로 주민들을 위한 안전 알림 브리핑을 작성하세요.`

  // ── 캐시 확인 ──────────────────────────────────────────
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY_CACHE) || 'null')
      if (
        cached &&
        cached.prompt === prompt &&
        Date.now() - cached.cachedAt < CACHE_TTL_MS
      ) {
        return cached.summary
      }
    } catch {}
  }

  // ── API 호출 ───────────────────────────────────────────
  const summary = await callGemini(SYSTEM_PROMPT, prompt, { temperature: 0.3, maxOutputTokens: 1024 })

  try {
    localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify({
      prompt,
      summary,
      cachedAt: Date.now(),
    }))
    // 레거시 더미 캐시 제거
    localStorage.removeItem(LEGACY_KEY_CACHE)
  } catch {}

  return summary
}
