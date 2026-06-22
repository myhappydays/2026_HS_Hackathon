/**
 * utils.js
 * 공통 유틸리티 함수
 */

/**
 * UUID v4 생성 (crypto.randomUUID 지원 브라우저 우선, fallback 포함)
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/**
 * Unix timestamp (ms) → 한국어 상대 시간 표시
 * @param {number} ts
 * @returns {string}
 */
export function relativeTime(ts) {
  const diff = Date.now() - ts
  const sec  = Math.floor(diff / 1000)
  const min  = Math.floor(sec / 60)
  const hour = Math.floor(min / 60)
  const day  = Math.floor(hour / 24)

  if (sec < 60)   return '방금 전'
  if (min < 60)   return `${min}분 전`
  if (hour < 24)  return `${hour}시간 전`
  if (day < 7)    return `${day}일 전`
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

/**
 * 위험도 → 뱃지 색상 클래스
 * @param {'high'|'medium'|'low'} danger
 * @returns {{ bg: string, text: string, label: string }}
 */
export function dangerStyle(danger) {
  switch (danger) {
    case 'high':   return { bg: 'bg-red-500/15',    text: 'text-red-400',    label: '높음' }
    case 'medium': return { bg: 'bg-amber-500/15',  text: 'text-amber-400',  label: '보통' }
    case 'low':    return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: '낮음' }
    default:       return { bg: 'bg-surface',        text: 'text-muted-foreground', label: '?' }
  }
}

/**
 * 분야 → 한국어 레이블
 * @param {string} category
 * @returns {string}
 */
export function categoryLabel(category) {
  const map = {
    road:     '도로/교통',
    facility: '시설/건물',
    weather:  '기상/환경',
    safety:   '치안/안전',
    etc:      '생활/기타',
  }
  return map[category] || '기타'
}

/**
 * 미터 → 사람이 읽기 쉬운 거리 문자열
 * @param {number} m
 * @returns {string}
 */
export function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(1)}km`
}

/**
 * Canvas를 이용한 이미지 리사이징 + WebP 압축 → Base64
 * @param {File} file
 * @returns {Promise<string>} Base64 문자열
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX }
          else                { width = Math.round((width * MAX) / height);  height = MAX }
        }

        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        let base64 = canvas.toDataURL('image/webp', 0.8)

        // 150KB 초과 시 품질 0.6으로 재압축
        if (base64.length > 150 * 1024 * (4 / 3)) {
          base64 = canvas.toDataURL('image/webp', 0.6)
        }
        resolve(base64)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
