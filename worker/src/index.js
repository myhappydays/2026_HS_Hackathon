import prompt from './v4-rough-safety.json' with { type: 'json' }

const MODEL = '@cf/cloudflare/clef-flash'
const ALLOWED_ORIGINS = new Set([
  'https://myhappydays.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
])
const QUESTIONS = prompt.questions
const RELIEF_CATEGORIES = ['rain_flood', 'snow', 'wildfire']


export const RELIEF_QUESTION = {
  type: 'choice',
  instructions: '재해구호 상황보고 내용이 다루는 재난 유형 하나를 고르세요. 문장에 나타난 피해와 구호 상황을 근거로 판단하세요.',
  criteria: {
    rain_flood: '호우, 폭우, 태풍, 홍수, 침수 등 비와 물로 인한 재난',
    snow: '폭설, 대설, 눈, 적설 등 눈으로 인한 재난',
    wildfire: '산불, 산림 화재와 그 진화 또는 이재민 구호',
  },
}

function headers(origin) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  if (ALLOWED_ORIGINS.has(origin)) {
    h['Access-Control-Allow-Origin'] = origin
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    h['Access-Control-Allow-Headers'] = 'Content-Type'
    h['Vary'] = 'Origin'
  }
  return h
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), { status, headers: headers(origin) })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, model: MODEL }, 200, origin)
    }
    const relief = url.pathname === '/classify-relief'
    if (url.pathname !== '/classify' && !relief) return json({ error: 'not_found' }, 404, origin)
    if (!ALLOWED_ORIGINS.has(origin)) return json({ error: 'origin_not_allowed' }, 403, origin)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) })
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin)

    const length = Number(request.headers.get('Content-Length') || 0)
    if (length > 6000) return json({ error: 'request_too_large' }, 413, origin)
    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'invalid_json' }, 400, origin)
    }
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    if (relief ? (!text || text.length > 1600) : (!title || title.length > 160 || description.length > 1500)) {
      return json({ error: 'invalid_report' }, 400, origin)
    }
    const needs = relief ? ['category'] : body.needs === undefined ? ['category'] : body.needs
    if (!Array.isArray(needs) || needs.length === 0 ||
        needs.some(field => !Object.hasOwn(QUESTIONS, field)) || new Set(needs).size !== needs.length) {
      return json({ error: 'invalid_needs' }, 400, origin)
    }
    if (!env.AI || !env.CATEGORY_LIMIT) return json({ error: 'worker_not_configured' }, 503, origin)
    const { success } = await env.CATEGORY_LIMIT.limit({ key: 'category' })
    if (!success) return json({ error: 'rate_limited' }, 429, origin)

    try {
      const questions = relief
        ? { category: RELIEF_QUESTION }
        : Object.fromEntries(needs.map(field => [field, QUESTIONS[field]]))
      const result = await env.AI.run(MODEL, {
        model: 'clef-flash',
        state: relief ? text : { title, description },
        questions,
      })
      const decisions = {}
      for (const field of needs) {
        const answer = result?.answers?.[field]
        const choices = relief ? RELIEF_CATEGORIES : Object.keys(questions[field].criteria)
        if (!choices.includes(answer?.choice)) throw new Error('Invalid model response')
        decisions[field] = { choice: answer.choice }
      }
      const response = { model: result.model || MODEL }
      if (!relief) response.decisions = decisions
      if (needs.includes('category')) {
        const answer = result.answers.category
        response.category = answer.choice
        response.confidence = typeof answer.confidence === 'number' ? answer.confidence : null
        response.probabilities = answer.probabilities || null
      }
      return json(response, 200, origin)
    } catch (error) {
      console.error('Clef classification failed:', error?.message || String(error))
      return json({ error: 'classification_unavailable' }, 503, origin)
    }
  },
}
