import test from 'node:test'
import assert from 'node:assert/strict'
import worker from './index.js'

const origin = 'https://myhappydays.github.io'
const env = {
  CATEGORY_LIMIT: { limit: async () => ({ success: true }) },
  AI: { run: async (model, input) => {
    assert.equal(model, '@cf/cloudflare/clef-flash')
    assert.equal(input.model, 'clef-flash')
    assert.equal(input.state.title, '도로에 구멍')
    return { model: 'clef-flash', answers: { category: { choice: 'road', confidence: 0.91, probabilities: { road: 0.95, facility: 0.03, weather: 0.02, safety: 0, etc: 0 } } } }
  } },
}

test('classifies a valid report with the fixed category choices', async () => {
  const request = new Request('https://example.workers.dev/classify', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '도로에 구멍', description: '보도 중앙에 구멍이 있습니다.' }),
  })
  const response = await worker.fetch(request, env)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin)
  assert.deepEqual(await response.json(), {
    model: 'clef-flash',
    decisions: { category: { choice: 'road' } },
    category: 'road', confidence: 0.91,
    probabilities: { road: 0.95, facility: 0.03, weather: 0.02, safety: 0, etc: 0 },
  })
})

test('does not call AI for invalid input', async () => {
  const response = await worker.fetch(new Request('https://example.workers.dev/classify', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}',
  }), env)
  assert.equal(response.status, 400)
})

test('rejects other browser origins', async () => {
  const response = await worker.fetch(new Request('https://example.workers.dev/classify', {
    method: 'POST', headers: { Origin: 'https://unrelated.example', 'Content-Type': 'application/json' }, body: '{}',
  }), env)
  assert.equal(response.status, 403)
})

test('uses the three MSTN_TYPE_CD labels for relief reports', async () => {
  const reliefEnv = {
    CATEGORY_LIMIT: env.CATEGORY_LIMIT,
    AI: { run: async (_model, input) => {
      assert.equal(input.state, '산불로 인한 이재민 구호 상황')
      assert.deepEqual(Object.keys(input.questions.category.criteria), ['rain_flood', 'snow', 'wildfire'])
      return { answers: { category: { choice: 'wildfire', confidence: 0.8 } } }
    } },
  }
  const response = await worker.fetch(new Request('https://example.workers.dev/classify-relief', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '산불로 인한 이재민 구호 상황' }),
  }), reliefEnv)
  assert.equal((await response.json()).category, 'wildfire')
})

function classify(body, testEnv = env) {
  return worker.fetch(new Request('https://example.workers.dev/classify', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), testEnv)
}

test('classifies both requested fields in one call and preserves unknown', async () => {
  let calls = 0
  const testEnv = { ...env, AI: { run: async (_model, input) => {
    calls++
    assert.deepEqual(Object.keys(input.questions), ['danger', 'category'])
    assert.deepEqual(input.state, { title: '제보', description: '알 수 없음' })
    return { answers: { danger: { choice: 'unknown' }, category: { choice: 'unknown' } } }
  } } }
  const response = await classify({ title: '제보', description: '알 수 없음', needs: ['danger', 'category'] }, testEnv)
  assert.equal(response.status, 200)
  assert.equal(calls, 1)
  assert.deepEqual(await response.json(), {
    model: '@cf/cloudflare/clef-flash',
    decisions: { danger: { choice: 'unknown' }, category: { choice: 'unknown' } },
    category: 'unknown', confidence: null, probabilities: null,
  })
})

test('requests only danger when category is already selected', async () => {
  const testEnv = { ...env, AI: { run: async (_model, input) => {
    assert.deepEqual(Object.keys(input.questions), ['danger'])
    return { answers: { danger: { choice: 'high' } } }
  } } }
  const response = await classify({ title: '제보', needs: ['danger'] }, testEnv)
  assert.deepEqual(await response.json(), {
    model: '@cf/cloudflare/clef-flash', decisions: { danger: { choice: 'high' } },
  })
})

test('rejects invalid needs before calling the model', async () => {
  const testEnv = { ...env, AI: { run: async () => { throw new Error('unexpected model call') } } }
  for (const needs of [[], ['other'], ['danger', 'danger'], 'danger']) {
    const response = await classify({ title: '제보', needs }, testEnv)
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { error: 'invalid_needs' })
  }
})

test('does not return partial decisions for an invalid model response', async () => {
  const testEnv = { ...env, AI: { run: async () => ({
    answers: { danger: { choice: 'high' }, category: { choice: 'invalid' } },
  }) } }
  const response = await classify({ title: '제보', needs: ['danger', 'category'] }, testEnv)
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'classification_unavailable' })
})

test('rate limiting prevents model calls', async () => {
  const testEnv = {
    CATEGORY_LIMIT: { limit: async () => ({ success: false }) },
    AI: { run: async () => { throw new Error('unexpected model call') } },
  }
  const response = await classify({ title: '제보' }, testEnv)
  assert.equal(response.status, 429)
})

test('returns service error when AI is unavailable', async () => {
  const testEnv = { ...env, AI: { run: async () => { throw new Error('unavailable') } } }
  const response = await classify({ title: '제보', needs: ['danger'] }, testEnv)
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'classification_unavailable' })
})
