/**
 * theme.js
 * 라이트 모드 / 다크 모드 관리 모듈
 */

const STORAGE_KEY = 'fermata_theme'

/**
 * 현재 설정된 테마 가져오기 ('dark' | 'light')
 */
export function getTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') {
    return saved
  }
  // 기본값: 시스템 선호도 (없으면 dark 기본)
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light'
  }
  return 'dark'
}

/**
 * 테마 적용하기
 * @param {'dark'|'light'} theme
 */
export function setTheme(theme) {
  const isDark = theme === 'dark'
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem(STORAGE_KEY, theme)
  updateToggleButtons(theme)

  // 테마 변경 이벤트 전송 (필요한 컴포넌트 반응용)
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }))
}

/**
 * 테마 토글 (dark <-> light)
 */
export function toggleTheme() {
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  const next = current === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

/**
 * 테마 토글 버튼 UI 동기화
 */
function updateToggleButtons(theme) {
  const isDark = theme === 'dark'
  const buttons = document.querySelectorAll('#theme-toggle-btn')
  buttons.forEach(btn => {
    btn.setAttribute('title', isDark ? '라이트 모드로 전환' : '다크 모드로 전환')
    btn.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환')
    const sunIcon = btn.querySelector('.theme-icon-sun')
    const moonIcon = btn.querySelector('.theme-icon-moon')
    if (sunIcon && moonIcon) {
      if (isDark) {
        sunIcon.classList.remove('hidden')
        moonIcon.classList.add('hidden')
      } else {
        sunIcon.classList.add('hidden')
        moonIcon.classList.remove('hidden')
      }
    }
  })
}

/**
 * 페이지 초기화 시 테마 설정 및 이벤트 바인딩
 */
export function initTheme() {
  const currentTheme = getTheme()
  setTheme(currentTheme)

  // 버튼 클릭 이벤트 리스너 등록
  document.addEventListener('click', e => {
    const btn = e.target.closest('#theme-toggle-btn')
    if (btn) {
      e.preventDefault()
      toggleTheme()
    }
  })

  // 시스템 테마 변경 감지 (사용자 직접 설정이 없을 때)
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    })
  }
}
