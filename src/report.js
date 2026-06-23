/**
 * report.js
 * 제보 등록 페이지 로직
 *
 * - 이미지 선택 → Canvas 압축 → Base64
 * - 현재 위치 자동 취득 (Geolocation API)
 * - 네이버 지도에 드래그 가능 마커 표시 → 위치 세부 조정
 * - 역지오코딩 → 주소 표시
 * - 폼 제출 → Report 생성 → 군집 배정 → localStorage 저장
 */

import { generateId, compressImage, relativeTime } from './utils.js'
import { classifyDanger, classifyCategory } from './classification.js'
import { assignCluster } from './clustering.js'
import { addReport, isStorageFull, getReports, saveReports } from './storage.js'
import { initEmbedder, isEmbedderReady } from './embedder.js'

// ── DOM 참조 ─────────────────────────────────────────────
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
let locationMarker = null
let currentLat = null
let currentLng = null

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
    submitBtn.textContent = '제보 등록하기'
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
  if (typeof kakao === 'undefined') {
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
  if (typeof kakao === 'undefined' || !mapEl) return

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

  // 용량 체크
  if (isStorageFull()) {
    storageWarning.classList.remove('hidden')
    return
  }

  const title       = document.getElementById('title').value.trim()
  const description = document.getElementById('description').value.trim()
  const dangerVal   = document.querySelector('input[name="danger"]:checked')?.value || null
  const categoryVal = document.querySelector('input[name="category"]:checked')?.value || null

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

  const text     = `${title} ${description}`
  const danger   = dangerVal   || classifyDanger(text)
  const category = categoryVal || classifyCategory(text)

  /** @type {Report} */
  const report = {
    id:          generateId(),
    clusterId:   '', // assignCluster 후 채움
    title,
    description,
    imageBase64,
    location: {
      lat:     currentLat,
      lng:     currentLng,
      address: addressText.textContent || '',
    },
    danger,
    category,
    createdAt: Date.now(),
  }

  // localStorage 저장
  addReport(report)

  // 군집 배정 (report 저장 후, async)
  const clusterId = await assignCluster(report)

  // report의 clusterId 업데이트
  const reports = getReports().map(r => r.id === report.id ? { ...r, clusterId } : r)
  saveReports(reports)

  // 성공 토스트 표시 후 메인으로 이동
  showToast('success')
  setTimeout(() => { location.href = `${import.meta.env.BASE_URL}index.html` }, 1200)
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
    const msgEl = document.getElementById('toast-error-msg')
    if (msgEl) msgEl.textContent = msg
  }
  el.classList.remove('hidden')
  // 3초 후 자동 닫기
  setTimeout(() => el.classList.add('hidden'), 3000)
}

// ── 초기화 ───────────────────────────────────────────────
initLocation()

// 임베딩 모델 백그라운드 로드 (페이지 진입 시 즉시 시작, 제보 등록 전 준비 완료 목표)
const embedderBanner = document.getElementById('embedder-banner')
const embedderBar    = document.getElementById('embedder-bar')
const embedderPct    = document.getElementById('embedder-pct')

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
