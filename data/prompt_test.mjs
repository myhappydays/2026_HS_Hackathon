/**
 * prompt_test.mjs — Bedrock 프롬프트 실험 스크립트
 *
 * 사용법:
 *   node data/prompt_test.mjs
 *
 * 환경변수:
 *   AWS_BEARER_TOKEN_BEDROCK — Bedrock Bearer 토큰 (자동 주입)
 *
 * 결과:
 *   docs/프롬프트 실험.md 에 누적 저장
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── 설정 ─────────────────────────────────────────────────

const TOKEN    = process.env.AWS_BEARER_TOKEN_BEDROCK
const MODEL    = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'
const ENDPOINT = 'https://bedrock-runtime.us-east-1.amazonaws.com'
const OUT_FILE = path.join(__dirname, '../docs/프롬프트 실험.md')

if (!TOKEN) {
  console.error('❌ AWS_BEARER_TOKEN_BEDROCK 환경변수가 없습니다.')
  process.exit(1)
}

// ── 시드 데이터 (seed.js 기반, 브라우저 없이 재현) ────────

const now = Date.now()
const hoursAgo = n => now - n * 3600000
const daysAgo  = n => now - n * 86400000

const relativeTime = ts => {
  const diff = now - ts
  const min  = Math.floor(diff / 60000)
  const hour = Math.floor(min / 60)
  const day  = Math.floor(hour / 24)
  if (min < 1)   return '방금 전'
  if (min < 60)  return `${min}분 전`
  if (hour < 24) return `${hour}시간 전`
  if (day < 7)   return `${day}일 전`
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

// 시드 클러스터 데이터 (main.js seedDemoData와 동일)
const CLUSTERS = [
  { danger: 'high',   category: 'road',     count: 3, distM:  109, address: '경기 화성시 봉담읍 협성로 남문 앞',               title: '협성대 정문 앞 보도 싱크홀 발견',        description: '정문 앞 보도 중앙에 직경 약 30cm 크기의 구멍이 생겼습니다. 등하교 학생들이 많아 즉각 조치가 필요합니다.', updatedAt: hoursAgo(8)  },
  { danger: 'high',   category: 'weather',  count: 2, distM:  102, address: '경기 화성시 봉담읍 협성대 진입로',               title: '협성대 진입로 완전 침수 — 통행 불가',   description: '진입로 전 구간이 침수되어 차량과 사람 모두 통행이 불가합니다. 우수관 역류로 홍수 범람 상태입니다.',  updatedAt: hoursAgo(3)  },
  { danger: 'high',   category: 'road',     count: 3, distM:  231, address: '경기 화성시 봉담읍 협성대학교 북측 언덕로',       title: '협성대 북측 대형 낙석 — 통행 차단 필요', description: '농구공 크기의 대형 낙석이 굴러와 언덕길을 막고 있습니다. 추락 및 낙하 위험이 극심합니다.',          updatedAt: hoursAgo(4)  },
  { danger: 'medium', category: 'facility', count: 2, distM:  164, address: '경기 화성시 봉담읍 협성로 후문길',               title: '협성대 후문 골목 가로등 고장',           description: '후문 골목 가로등 3개가 모두 꺼져 있습니다. 야간에 매우 어둡고 CCTV 사각지대입니다.',              updatedAt: daysAgo(3)   },
  { danger: 'medium', category: 'road',     count: 2, distM:  142, address: '경기 화성시 봉담읍 협성대학교 캠퍼스 내 순환도로', title: '협성대 캠퍼스 순환도로 포트홀 발생',     description: '순환도로 1차선에 작은 포트홀이 생겼습니다. 배달 오토바이 사고 위험이 있습니다.',                  updatedAt: daysAgo(1)   },
  { danger: 'low',    category: 'safety',   count: 1, distM:  153, address: '경기 화성시 봉담읍 협성대학교 기숙사 후면',       title: '기숙사 뒷길 야간 조명 없음',             description: '기숙사 후면 골목에 가로등과 조명이 전혀 없어 야간에 매우 어둡습니다. 수상한 인물이 자주 출몰한다는 제보가 있습니다.', updatedAt: daysAgo(7)   },
  { danger: 'low',    category: 'facility', count: 2, distM:  186, address: '경기 화성시 봉담읍 협성로 버스정류장 앞',         title: '협성대 정문~버스정류장 보도블록 파손',   description: '정문에서 버스정류장으로 이어지는 보행로에서 보도블록 여러 장이 깨지거나 뒤틀려 있습니다.',          updatedAt: daysAgo(6)   },
]

const DANGER_LABEL = { high: '높음', medium: '보통', low: '낮음' }
const CAT_LABEL    = { road: '도로/교통', facility: '시설/건물', weather: '기상/환경', safety: '치안/안전', etc: '생활/기타' }

// ── 프롬프트 변형 목록 ────────────────────────────────────
// 여기서 실험할 프롬프트를 추가/수정하세요

const EXPERIMENTS = [

  {
    name: 'v1 — 현재 프롬프트 (baseline)',
    system: `당신은 도시 안전 정보를 시민에게 전달하는 안내 시스템입니다.
주어진 위험 제보 목록을 바탕으로 지금 이 지역에서 주의해야 할 위험을 2~3문장으로 간결하게 요약하세요.
- "지금 이 지역에서" 로 시작하세요.
- 가장 위험도가 높은 항목을 먼저 언급하세요.
- 구체적인 장소나 상황을 포함하세요.
- 마크다운, 목록, 이모지 없이 자연스러운 문장으로만 작성하세요.`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [위험도:${DANGER_LABEL[c.danger]}] [분야:${CAT_LABEL[c.category]}] "${c.title}" — ${dist} 거리, 제보 ${c.count}건 (${c.address})`
      }).join('\n')
      return `다음은 내 주변 ${clusters.length}건의 위험 제보 목록입니다:\n\n${lines}\n\n위 내용을 바탕으로 지역 안전 요약을 작성해주세요.`
    },
  },

  {
    name: 'v2 — description 추가',
    system: `당신은 도시 안전 정보를 시민에게 전달하는 안내 시스템입니다.
주어진 위험 제보 목록을 바탕으로 지금 이 지역에서 주의해야 할 위험을 2~3문장으로 간결하게 요약하세요.
- "지금 이 지역에서" 로 시작하세요.
- 가장 위험도가 높은 항목을 먼저 언급하세요.
- 구체적인 장소나 상황을 포함하세요.
- 마크다운, 목록, 이모지 없이 자연스러운 문장으로만 작성하세요.`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [위험도:${DANGER_LABEL[c.danger]}] [분야:${CAT_LABEL[c.category]}] "${c.title}" — ${dist}, 제보 ${c.count}건\n   상황: ${c.description}\n   위치: ${c.address}`
      }).join('\n')
      return `다음은 내 주변 ${clusters.length}건의 위험 제보 목록입니다:\n\n${lines}\n\n위 내용을 바탕으로 지역 안전 요약을 작성해주세요.`
    },
  },

  {
    name: 'v3 — description + updatedAt 추가',
    system: `당신은 도시 안전 정보를 시민에게 전달하는 안내 시스템입니다.
주어진 위험 제보 목록을 바탕으로 지금 이 지역에서 주의해야 할 위험을 2~3문장으로 간결하게 요약하세요.
- "지금 이 지역에서" 로 시작하세요.
- 가장 위험도가 높은 항목을 먼저 언급하세요.
- 최근에 업데이트된 위험을 우선 고려하세요.
- 구체적인 장소나 상황을 포함하세요.
- 마크다운, 목록, 이모지 없이 자연스러운 문장으로만 작성하세요.`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [위험도:${DANGER_LABEL[c.danger]}] [분야:${CAT_LABEL[c.category]}] [최근:${relativeTime(c.updatedAt)}] "${c.title}" — ${dist}, 제보 ${c.count}건\n   상황: ${c.description}\n   위치: ${c.address}`
      }).join('\n')
      return `다음은 내 주변 ${clusters.length}건의 위험 제보 목록입니다:\n\n${lines}\n\n위 내용을 바탕으로 지역 안전 요약을 작성해주세요.`
    },
  },

  {
    name: 'v4 — 시스템 프롬프트 강화 (긴급도 강조)',
    system: `당신은 시민 안전을 위한 위험 알림 시스템입니다.
아래 위험 제보를 분석해 지금 당장 시민이 알아야 할 핵심 위험을 2문장으로 요약하세요.

규칙:
- 반드시 "지금 이 지역에서" 로 시작
- 첫 문장: 가장 긴급한 위험 1~2개 (위험도 높음 우선, 최근 제보 우선)
- 둘째 문장: 주의가 필요한 나머지 위험 요약
- 장소명 반드시 포함
- 제보 수가 많을수록 신뢰도 높은 정보로 간주
- 마크다운, 목록, 이모지 없이 자연스러운 한국어 문장`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [${DANGER_LABEL[c.danger]}/${CAT_LABEL[c.category]}] "${c.title}" (${dist}, ${c.count}건, ${relativeTime(c.updatedAt)})\n   ${c.description} / ${c.address}`
      }).join('\n')
      return `주변 위험 제보 ${clusters.length}건:\n\n${lines}`
    },
  },

  // ── 새 실험: 카톡 알림 스타일 ──────────────────────────

  {
    name: 'v5 — 카톡 알림 스타일 (한국어 시스템 프롬프트)',
    system: `당신은 동네 안전 알림 서비스입니다.
아래 위험 제보를 바탕으로 오늘의 주변 위험 알림을 작성하세요.

형식:
- 첫 줄: "📢 오늘의 주변 위험 알림!"
- 이후 위험도 높음 항목부터 순서대로, 한 줄씩 이모지 + "~에서 ~래요/~대요" 체로 작성
- 위험도 높음: 🚨, 위험도 보통: ⚠️, 위험도 낮음: 📌
- 장소명 반드시 포함
- 마지막 줄: "안전에 주의하세요! 🙏"
- 전체 6~8줄 이내`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [${DANGER_LABEL[c.danger]}/${CAT_LABEL[c.category]}] "${c.title}" (${dist}, ${c.count}건, ${relativeTime(c.updatedAt)})\n   ${c.description} / ${c.address}`
      }).join('\n')
      return `주변 위험 제보 ${clusters.length}건:\n\n${lines}`
    },
  },

  {
    name: 'v6 — 카톡 알림 스타일 (영어 시스템 프롬프트)',
    system: `You are a neighborhood safety alert service in Korea.
Based on the hazard reports below, write a friendly Korean safety notification for today.

Format rules:
- First line: "📢 오늘의 주변 위험 알림!"
- One line per hazard, ordered by severity (high first), using "~에서 ~래요/~대요" casual Korean speech style
- Use 🚨 for high severity, ⚠️ for medium, 📌 for low
- Always include the specific location name
- Last line: "안전에 주의하세요! 🙏"
- Total 6–8 lines max
- Output in Korean only`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [${c.danger}/${c.category}] "${c.title}" (${dist}, ${c.count} reports, ${relativeTime(c.updatedAt)})\n   ${c.description} / ${c.address}`
      }).join('\n')
      return `${clusters.length} nearby hazard reports:\n\n${lines}`
    },
  },

  // ── 고도화: XML + few-shot + 포맷 개선 ──────────────

  {
    name: 'v7 — XML + few-shot + 자연스러운 문장 (영문 시스템)',
    system: `You are a Korean neighborhood safety alert service that sends friendly, natural-sounding notifications to residents.

<task>
Analyze the hazard reports and write a concise Korean safety alert.
Output a single paragraph of 2–3 sentences. No lists, no line breaks, no markdown.
</task>

<tone>
- Casual but informative Korean (반말 아님, 친근한 존댓말)
- Vary sentence endings and structures — do NOT repeat the same pattern like "~래요" every sentence
- Lead with the most urgent hazard, weave in others naturally
- Include specific location names
- End with a brief safety reminder
- Use 1–2 relevant emojis naturally within the text, not as bullet points
</tone>

<output_format>
One paragraph, 2–3 sentences, plain text only, no newlines within the output.
</output_format>

<examples>
<example>
<input>high/road sinkhole 109m, high/weather flood 102m, medium/facility streetlight 164m</input>
<output>🚨 협성대 정문 앞 보도에 싱크홀이 발생했고 진입로 침수로 통행이 막혀 있으니 우회로를 이용해 주세요. 후문 골목은 가로등이 고장 나 야간에 어두우니 ⚠️ 밝은 길로 다니시는 걸 추천드려요.</output>
</example>
</examples>`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [${c.danger}/${c.category}] "${c.title}" — ${dist}, ${c.count} reports, updated ${relativeTime(c.updatedAt)}\n   ${c.description} (${c.address})`
      }).join('\n')
      return `<hazard_reports count="${clusters.length}">\n${lines}\n</hazard_reports>\n\nWrite the safety alert now.`
    },
  },

  {
    name: 'v8b — 인사말 헤더 + 빈줄 없는 본문',
    system: `You are a Korean neighborhood safety alert service.

<task>
Write a short Korean safety notification based on the hazard reports.
</task>

<format>
- Line 1: a warm greeting-style header with a relevant emoji — reads like "안녕하세요! 오늘 ~하니 조심하세요" or similar, ≤20 chars, no period
- Lines 2–4: 2–3 sentences of Korean prose, each sentence on its own line
- NO blank lines anywhere in the output — every line follows immediately after the previous
- Use 1–2 emojis naturally in the prose lines, not in the header
- Vary Korean sentence endings — never use the same ending on consecutive lines
- Include specific location names
</format>

<examples>
<example>
<input>sinkhole + flood + rockfall near university campus</input>
<output>🙋 오늘 협성대 주변, 꼭 확인하세요
협성대 진입로가 침수되어 차량과 도보 모두 통행이 막혀 있으니 우회로를 이용해 주세요.
정문 앞 보도엔 싱크홀까지 생겨서 등하교 학생들은 그쪽 방향을 잠깐 피해 주시면 좋겠어요. 🚨
북측 언덕로에도 대형 낙석이 굴러와 있으니 오늘만큼은 그 길은 피하고 안전한 경로로 이동하세요!</example>
</example>
</examples>`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [${c.danger}/${c.category}] "${c.title}" — ${dist}, ${c.count} reports, updated ${relativeTime(c.updatedAt)}\n   ${c.description} (${c.address})`
      }).join('\n')
      return `<hazard_reports count="${clusters.length}">\n${lines}\n</hazard_reports>\n\nWrite the safety alert now.`
    },
  },

  // ── 라운드 3: 밝은 톤 + 다양한 스타일 ───────────────────

  {
    name: 'v9 — 밝은 톤, 헤더+본문, 이모지 자연스럽게',
    system: `You are a friendly Korean local safety notification service — think of it like a helpful neighbor sending a heads-up message.

<task>
Write a warm, bright-toned Korean safety alert based on the hazard reports.
</task>

<format>
- Line 1: header starting with a relevant emoji + situation summary (≤12 Korean characters)
- Line 2 onward: 2–3 sentences of flowing Korean prose, NO blank lines
- Each sentence on its own line
- Tone: bright, caring, slightly casual — like a helpful community notice, not an official warning
- Use friendly endings like "~해요", "~세요", "~드려요" — vary them, never repeat the same ending consecutively
- 1–2 emojis woven into sentences naturally
- Include specific location names
</format>

<examples>
<example>
<output>🚨 지금 캠퍼스 주변 조심하세요!
협성대 진입로에 물이 많이 차올라서 차량과 도보 통행이 어려운 상태예요.
정문 앞 보도에도 싱크홀이 생겼으니 그쪽 방향은 잠깐 피해서 이동해 주세요. 💛
북측 언덕로에도 낙석 위험이 있으니 오늘 하루는 그 길 말고 다른 길 이용해요!</output>
</example>
</examples>`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [${c.danger}/${c.category}] "${c.title}" — ${dist}, ${c.count} reports, ${relativeTime(c.updatedAt)}\n   ${c.description} / ${c.address}`
      }).join('\n')
      return `<hazard_reports count="${clusters.length}">\n${lines}\n</hazard_reports>\n\nWrite the alert now.`
    },
  },

  {
    name: 'v10 — 뉴스 속보 스타일, 간결',
    system: `You are a Korean real-time local hazard notification service.

<task>
Write a punchy Korean safety alert in a "breaking news" style — urgent but readable.
</task>

<format>
- Line 1: 🔔 + one-line headline (≤15 chars, no period)
- Lines 2–4: one sentence per line, each covering 1–2 hazards
- Sentences use assertive endings: "~합니다", "~입니다", "~주세요" — varied
- No blank lines between any lines
- Max 1 emoji beyond the header icon, placed naturally mid-sentence
- Include location names, omit filler phrases like "주의가 필요합니다"
</format>

<examples>
<example>
<output>🔔 캠퍼스 3곳 동시 위험 발생
협성대 진입로가 침수돼 전면 통행이 차단됐습니다.
정문 보도 싱크홀과 북측 낙석 ⚠️ 모두 즉시 우회 바랍니다.
후문·기숙사 뒷길은 야간 조명 없으니 밝은 경로로 이동하세요.</output>
</example>
</examples>`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [${c.danger}/${c.category}] "${c.title}" — ${dist}, ${c.count}건, ${relativeTime(c.updatedAt)}: ${c.description} (${c.address})`
      }).join('\n')
      return `<hazard_reports count="${clusters.length}">\n${lines}\n</hazard_reports>\n\nWrite the alert now.`
    },
  },

  {
    name: 'v11 — 동네 앱 알림 스타일, 헤더+요약+상세',
    system: `You are a Korean neighborhood safety app that sends push-notification style alerts.

<task>
Write a Korean safety push notification with three parts.
</task>

<format>
- Line 1 (title): emoji + bold-worthy title, ≤20 chars, no period
- Line 2 (summary): one sentence summarizing the most critical hazard, ending in "~요"
- Lines 3–5 (details): remaining hazards, one per line, starting with the hazard emoji (🚨/⚠️/📌) followed by location + short description
- No blank lines anywhere
- Sentence endings must vary — never use the same ending twice in a row
- Output in Korean only
</format>

<examples>
<example>
<output>🚨 협성대 주변 위험 상황 발생
진입로 침수와 정문 싱크홀로 등하교 경로에 주의가 필요해요.
🚨 북측 언덕로 — 대형 낙석으로 통행 차단, 절대 접근 금지
⚠️ 후문 골목 — 가로등 고장으로 야간 어두움
📌 정류장 보행로 — 보도블록 파손, 발 조심하세요</output>
</example>
</examples>`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [${c.danger}/${c.category}] "${c.title}" — ${dist}, ${c.count} reports, ${relativeTime(c.updatedAt)}\n   ${c.description} (${c.address})`
      }).join('\n')
      return `<hazard_reports count="${clusters.length}">\n${lines}\n</hazard_reports>\n\nWrite the push notification now.`
    },
  },

  {
    name: 'v12 — 스토리텔링형, 2문장 산문',
    system: `You are a warm Korean community safety service — your messages feel like they come from a trusted local.

<task>
Write a 2-sentence Korean safety message that reads like a concerned neighbor's note, not an official alert.
</task>

<format>
- Exactly 2 sentences, each on its own line, no blank line between them
- First sentence: weave together the top 2–3 hazards naturally, naming locations
- Second sentence: give a concrete action ("~해서 이동하세요", "~길로 돌아가세요") + light encouragement
- 1 emoji at the very start of the first sentence only
- Tone: warm, slightly urgent, never robotic
- No headers, no lists, no repeated sentence endings
</format>

<examples>
<example>
<output>⚡ 지금 협성대 정문 앞 싱크홀이랑 진입로 침수로 학교 오고 가는 길이 좀 복잡해진 상태예요.
북측 언덕로 낙석까지 있으니 오늘은 후문 쪽이나 대로변 길로 돌아가시면 훨씬 안전해요!</output>
</example>
</examples>`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [${c.danger}/${c.category}] "${c.title}" — ${dist}, ${c.count} reports, ${relativeTime(c.updatedAt)}\n   ${c.description} (${c.address})`
      }).join('\n')
      return `<hazard_reports count="${clusters.length}">\n${lines}\n</hazard_reports>\n\nWrite the message now.`
    },
  },

  {
    name: 'v13 — 카드 UI 최적화, 헤더+1줄 요약+리스트형 상세',
    system: `You are a Korean safety card notification service. Your output is displayed in a mobile app card UI.

<task>
Write a structured Korean safety card with a header, a one-line summary, and a short detail list.
</task>

<format>
- Line 1: 📢 + concise situation title (≤15 chars)
- Line 2: one-sentence summary of overall risk level and area, ending in "~해요" or "~입니다"
- Lines 3+: each hazard as "· [location] [what happened]" — short, no verbs, noun-phrase style
  - high danger items first, max 4 items
- No blank lines
- 1 emoji in the summary line only, placed naturally
- Korean only
</format>

<examples>
<example>
<output>📢 캠퍼스 일대 동시 위험
지금 협성대 주변 곳곳에서 🚨 높은 위험 상황이 동시에 발생 중이에요.
· 정문 보도 — 싱크홀 발생, 통행 주의
· 진입로 — 완전 침수, 차량·보행 불가
· 북측 언덕로 — 대형 낙석 도로 차단
· 후문 골목 — 가로등 고장, 야간 주의</output>
</example>
</examples>`,
    buildUser: clusters => {
      const lines = clusters.map((c, i) => {
        const dist = c.distM < 1000 ? `${Math.round(c.distM)}m` : `${(c.distM/1000).toFixed(1)}km`
        return `${i+1}. [${c.danger}/${c.category}] "${c.title}" — ${dist}, ${c.count} reports, ${relativeTime(c.updatedAt)}\n   ${c.description} (${c.address})`
      }).join('\n')
      return `<hazard_reports count="${clusters.length}">\n${lines}\n</hazard_reports>\n\nWrite the card now.`
    },
  },

]

// ── Bedrock 호출 ──────────────────────────────────────────

async function callClaude(system, user) {
  const res = await fetch(`${ENDPOINT}/model/${MODEL}/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 300,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ── 실행 ─────────────────────────────────────────────────

async function main() {
  const results = []

  for (const exp of EXPERIMENTS) {
    process.stdout.write(`\n▶ ${exp.name} ... `)
    const userPrompt = exp.buildUser(CLUSTERS)
    try {
      const t0     = Date.now()
      const output = await callClaude(exp.system, userPrompt)
      const ms     = Date.now() - t0
      process.stdout.write(`✓ (${ms}ms)\n`)
      results.push({ exp, userPrompt, output, ms, error: null })
    } catch (e) {
      process.stdout.write(`✗ ${e.message}\n`)
      results.push({ exp, userPrompt, output: null, ms: null, error: e.message })
    }
  }

  // ── 결과 문서 생성 ──────────────────────────────────────

  const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  const divider   = '\n\n---\n\n'

  const sections = results.map(({ exp, userPrompt, output, ms, error }) => {
    return [
      `## ${exp.name}`,
      `> 실행: ${timestamp}${ms ? `  |  응답: ${ms}ms` : ''}`,
      '',
      '### 시스템 프롬프트',
      '```',
      exp.system,
      '```',
      '',
      '### 유저 프롬프트',
      '```',
      userPrompt,
      '```',
      '',
      '### 결과',
      error
        ? `> ❌ 오류: ${error}`
        : output,
    ].join('\n')
  })

  const doc = [
    '# 프롬프트 실험 결과',
    '',
    `모델: \`${MODEL}\`  |  마지막 실행: ${timestamp}`,
    divider,
    sections.join(divider),
  ].join('\n')

  fs.writeFileSync(OUT_FILE, doc, 'utf8')
  console.log(`\n✅ 결과 저장: docs/프롬프트 실험.md`)
}

main().catch(e => { console.error(e); process.exit(1) })
