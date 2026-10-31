/**
 * report.js
 * 제보 등록 페이지 로직
 *
 * - 이미지 선택 → Canvas 압축 → Base64
 * - 현재 위치 자동 취득 (Geolocation API)
 * - 카카오 지도에 기준 마커 표시 → 위치 세부 조정
 * - 역지오코딩 → 주소 표시
 * - 폼 제출 → 온라인 시 Clef AI 분류 & Firestore/군집 배정 / 오프라인 시 offline_reports 큐 임시 저장
 */

import { initTheme } from './theme.js'

initTheme()

document.getElementById('nav-home').href = `${import.meta.env.BASE_URL}index.html`

import { generateId, compressImage } from './utils.js'
import { assignCluster } from './clustering.js'
import { addReport, updateReport, isStorageFull } from './storage.js'
import { initEmbedder, isEmbedderReady } from './embedder.js'
import { listenAuthState } from './auth.js'

let currentUser = null
listenAuthState((user) => {
  if (user) {
    currentUser = user
  } else if (navigator.onLine) {
    alert('제보하기는 로그인 후 이용하실 수 있습니다.')
    location.href = `${import.meta.env.BASE_URL}index.html`
  }
})

// ── DOM 참조 ─────────────────────────────────────────────
const offlineBanner    = document.getElementById('offline-banner')
const imageInput       = document.getElementById('image-input')
const imageUploadLabel = document.getElementById('image-upload-label')
const imagePreviewWrap = document.getElementById('image-preview-wrap')
const imagePreview     = document.getElementById('image-preview')
const imageRemoveBtn   = document.getElementById('image-remove-btn')
const imageSizeBadge   = document.getElementById('image-size-badge')
const addressText      = document.getElementById('address-text')
const latInput         = document.getElementById('lat')
const lngInput         = document.getElementById('lng')
const storageWarning   = document.getElementById('storage-warning')
const submitBtn        = document.getElementById('submit-btn')
const form             = document.getElementById('report-form')

// ── 상태 ─────────────────────────────────────────────────
let imageBase64 = null
let locationMap = null
let currentLat = null
let currentLng = null
let submitting = false
const manualRequired = new Set()
const suggestions = new Map()
const validChoices = {
  danger: new Set(['high', 'medium', 'low']),
  category: new Set(['road', 'facility', 'weather', 'safety', 'etc']),
}
const fieldLabels = { danger: '위험도', category: '분류' }
const classifyUrl = (import.meta.env.VITE_CATEGORY_API_URL || 'https://fermata-report-clef-v4.hejoliv.workers.dev').replace(/\/+$/, '')

form.addEventListener('change', e => {
  const field = e.target.name
  if (field in validChoices) {
    suggestions.delete(field)
    manualRequired.delete(field)
  }
})

for (const id of ['title', 'description']) {
  document.getElementById(id).addEventListener('input', () => {
    for (const [field, choice] of suggestions) {
      const selected = form.querySelector(`input[name="${field}"]:checked`)
      if (selected?.value === choice) selected.checked = false
    }
    suggestions.clear()
  })
}

// ── 오프라인 상태 감지 및 UI 동기화 ──────────────────────
function updateOfflineStatusUI() {
  const isOffline = !navigator.onLine
  if (offlineBanner) {
    offlineBanner.classList.toggle('hidden', !isOffline)
  }
  if (submitBtn && !submitBtn.disabled) {
    submitBtn.textContent = isOffline ? '오프라인 임시 저장하기' : '제보 등록하기'
  }
}

window.addEventListener('online', updateOfflineStatusUI)
window.addEventListener('offline', updateOfflineStatusUI)
updateOfflineStatusUI()

function saveReportToOfflineQueue(report) {
  const queue = JSON.parse(localStorage.getItem('offline_reports') || '[]')
  queue.push(report)
  localStorage.setItem('offline_reports', JSON.stringify(queue))
}

// ── 이미지 처리 ──────────────────────────────────────────

imageInput.addEventListener('change', async e => {
  const file = e.target.files?.[0]
  if (!file) return

  try {
    submitBtn.disabled = true
    submitBtn.textContent = '이미지 처리 중...'

    imageBase64 = await compressImage(file)

    // 프리뷰 표시
    imagePreview.src = imageBase64
    imageUploadLabel.classList.add('hidden')
    imagePreviewWrap.classList.remove('hidden')

    // 크기 표시 (KB)
    const sizeKB = Math.round((imageBase64.length * 3) / 4 / 1024)
    imageSizeBadge.textContent = `${sizeKB}KB`
  } catch (err) {
    console.error('이미지 압축 실패:', err)
    showToast('error', '이미지 처리 중 오류가 발생했습니다.')
  } finally {
    submitBtn.disabled = false
    updateOfflineStatusUI()
  }
})

imageRemoveBtn.addEventListener('click', () => {
  imageBase64 = null
  imageInput.value = ''
  imagePreview.src = ''
  imagePreviewWrap.classList.add('hidden')
  imageUploadLabel.classList.remove('hidden')
})

// ── 위치 처리 ────────────────────────────────────────────

function initLocation() {
  if (!navigator.geolocation) {
    addressText.textContent = '위치 정보를 지원하지 않는 환경입니다.'
    return
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      currentLat = pos.coords.latitude
      currentLng = pos.coords.longitude
      setLocation(currentLat, currentLng)
      initMap(currentLat, currentLng)
    },
    () => {
      // 기본값: 서울 시청
      currentLat = 37.5665
      currentLng = 126.9780
      addressText.textContent = '위치를 가져올 수 없어 기본 위치로 설정됩니다.'
      setLocation(currentLat, currentLng)
      initMap(currentLat, currentLng)
    },
    { timeout: 8000, enableHighAccuracy: true }
  )
}

function setLocation(lat, lng) {
  currentLat = lat
  currentLng = lng
  latInput.value = lat
  lngInput.value = lng
  reverseGeocode(lat, lng)
}

function reverseGeocode(lat, lng) {
  if (typeof kakao === 'undefined' || !kakao.maps?.services) {
    addressText.textContent = `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`
    return
  }
  const geocoder = new kakao.maps.services.Geocoder()
  geocoder.coord2Address(lng, lat, (result, status) => {
    if (status !== kakao.maps.services.Status.OK) {
      addressText.textContent = `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`
      return
    }
    const addr = result[0]
    const text = addr.road_address
      ? addr.road_address.address_name
      : addr.address.address_name
    addressText.textContent = text || `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`
  })
}

function initMap(lat, lng) {
  const mapEl = document.getElementById('location-map')
  if (typeof kakao === 'undefined' || !kakao.maps || !mapEl) return

  locationMap = new kakao.maps.Map(mapEl, {
    center: new kakao.maps.LatLng(lat, lng),
    level: 3,
  })

  // 현재 위치 표시 — 파란 점 (드래그 불가, 기준점)
  const myDot = document.createElement('div')
  myDot.style.cssText = `
    width:12px; height:12px; border-radius:50%;
    background:#3b82f6; border:2px solid white;
    box-shadow:0 0 0 4px rgba(59,130,246,0.25);
  `
  new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(lat, lng),
    content: myDot,
    yAnchor: 0.5,
    zIndex: 1,
  }).setMap(locationMap)

  // 지도 이동이 완전히 멈췄을 때만 1회 호출 (idle = 카카오 권장)
  kakao.maps.event.addListener(locationMap, 'idle', () => {
    const center = locationMap.getCenter()
    setLocation(center.getLat(), center.getLng())
  })
}

// ── 폼 제출 ──────────────────────────────────────────────

form.addEventListener('submit', async e => {
  e.preventDefault()
  if (submitting) return

  // 용량 체크
  if (isStorageFull()) {
    storageWarning.classList.remove('hidden')
    return
  }

  const title       = document.getElementById('title').value.trim()
  const description = document.getElementById('description').value.trim()
  const choices = Object.fromEntries(Object.keys(validChoices).map(field => [
    field, form.querySelector(`input[name="${field}"]:checked`)?.value || null,
  ]))

  if (!title) {
    alert('제목을 입력해 주세요.')
    return
  }
  if (!imageBase64) {
    alert('사진을 첨부해 주세요.')
    return
  }
  if (!currentLat || !currentLng) {
    alert('위치를 확인 중입니다. 잠시 후 다시 시도해 주세요.')
    return
  }

  const invalid = Object.keys(validChoices).filter(field => choices[field] && !validChoices[field].has(choices[field]))
  if (invalid.length) {
    alert(`${invalid.map(field => fieldLabels[field]).join(', ')}을(를) 직접 선택해 주세요.`)
    return
  }
  const required = [...manualRequired].filter(field => !choices[field])
  if (required.length) {
    alert(`${required.map(field => fieldLabels[field]).join(', ')}을(를) 직접 선택해 주세요.`)
    return
  }

  // 오프라인일 때: 미선택 필드는 기본값(medium/etc)으로 보정 후 임시 저장 큐에 적재
  if (!navigator.onLine) {
    const offlineReport = {
      id:          generateId(),
      userId:      currentUser ? currentUser.uid : 'anonymous',
      author:      currentUser?.displayName || '시민A',
      clusterId:   '',
      title,
      description,
      imageBase64,
      location: {
        lat:     currentLat,
        lng:     currentLng,
        address: addressText.textContent || '',
      },
      danger:   choices.danger || 'medium',
      category: choices.category || 'etc',
      createdAt: Date.now(),
    }
    submitting = true
    submitBtn.disabled = true
    submitBtn.textContent = '임시 저장 중...'
    saveReportToOfflineQueue(offlineReport)
    showToast('success', '오프라인 임시 저장 완료! 연결 시 자동 전송됩니다.')
    setTimeout(() => { location.href = `${import.meta.env.BASE_URL}index.html` }, 1400)
    return
  }

  submitting = true
  submitBtn.disabled = true
  form.inert = true
  let saved = false
  try {
    const needs = Object.keys(validChoices).filter(field => !choices[field])
    if (needs.length) {
      submitBtn.textContent = 'AI 분류 중...'
      let decisions = {}
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      try {
        const response = await fetch(`${classifyUrl}/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, needs }),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Classification failed: ${response.status}`)
        decisions = (await response.json()).decisions || {}
      } catch (err) {
        console.warn('AI 분류 실패:', err)
      } finally {
        clearTimeout(timeout)
      }

      const suggested = []
      const unresolved = []
      for (const field of needs) {
        const choice = decisions[field]?.choice
        if (validChoices[field].has(choice)) {
          const input = form.querySelector(`input[name="${field}"][value="${choice}"]`)
          input.checked = true
          suggestions.set(field, choice)
          suggested.push(fieldLabels[field])
        } else {
          manualRequired.add(field)
          unresolved.push(fieldLabels[field])
        }
      }
      const messages = []
      if (suggested.length) messages.push(`AI가 제안한 ${suggested.join(', ')}을(를) 확인해 주세요.`)
      if (unresolved.length) messages.push(`${unresolved.join(', ')}을(를) 직접 선택해 주세요.`)
      alert(`${messages.join('\n')}\n확인 후 다시 등록해 주세요.`)
      return
    }

    /** @type {Report} */
    const report = {
      id:          generateId(),
      userId:      currentUser ? currentUser.uid : 'anonymous',
      author:      currentUser?.displayName || '시민A',
      clusterId:   '',
      title,
      description,
      imageBase64,
      location: {
        lat:     currentLat,
        lng:     currentLng,
        address: addressText.textContent || '',
      },
      danger: choices.danger,
      category: choices.category,
      createdAt: Date.now(),
    }

    submitBtn.textContent = '제보 등록 중...'
    await addReport(report)
    saved = true
    const clusterId = await assignCluster(report)
    report.clusterId = clusterId
    await updateReport(report)
    showToast('success', '제보가 등록되었습니다!')
    setTimeout(() => { location.href = `${import.meta.env.BASE_URL}index.html` }, 1200)
  } catch (err) {
    console.error('제보 등록 실패:', err)
    alert(saved ? '제보는 저장되었지만 군집 배정에 실패했습니다. 메인 화면에서 확인해 주세요.' : '제보 등록에 실패했습니다. 다시 시도해 주세요.')
  } finally {
    if (!saved) {
      submitting = false
      submitBtn.disabled = false
      updateOfflineStatusUI()
      form.inert = false
    }
  }
})

// ── Toast 헬퍼 ───────────────────────────────────────────

/**
 * @param {'success'|'error'} type
 * @param {string} [msg]
 */
function showToast(type, msg) {
  const el = document.getElementById(`toast-${type}`)
  if (!el) return
  if (msg) {
    const msgEl = document.getElementById(`toast-${type}-msg`)
    if (msgEl) msgEl.textContent = msg
  }
  el.classList.remove('hidden')
  // 3초 후 자동 닫기
  setTimeout(() => el.classList.add('hidden'), 3000)
}

// ── 초기화 ───────────────────────────────────────────────
initLocation()

// 임베딩 모델 백그라운드 로드 (온라인일 때만 시작)
const embedderBanner = document.getElementById('embedder-banner')
const embedderBar    = document.getElementById('embedder-bar')
const embedderPct    = document.getElementById('embedder-pct')

if (navigator.onLine) {
  if (!isEmbedderReady()) {
    embedderBanner.classList.remove('hidden')
  }

  initEmbedder(p => {
    if (typeof p.progress !== 'number') return
    const pct = Math.round(p.progress)
    embedderBar.style.width = `${pct}%`
    embedderPct.textContent = `${pct}%`
    if (pct >= 100) embedderBanner.classList.add('hidden')
  }).then(() => {
    embedderBanner.classList.add('hidden')
  }).catch(() => {
    embedderBanner.classList.add('hidden')
    console.warn('[report] embedder load failed, clustering will fallback')
  })
}
