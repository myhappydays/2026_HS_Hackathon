/**
 * pwa.js
 * PWA Service Worker 등록, Standalone UX 보정 및 인앱 설치 유도 배너 모듈
 */

let swInitialized = false;
let deferredInstallPrompt = null;

const DISMISS_KEY = 'fermata_pwa_banner_dismissed';

export function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIOSDevice() {
  const ua = window.navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}

function injectStandaloneStyles() {
  if (document.getElementById('fermata-pwa-styles')) return;
  const style = document.createElement('style');
  style.id = 'fermata-pwa-styles';
  style.textContent = `
    html, body {
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior-y: none;
    }
    @media (display-mode: standalone) {
      header.sticky {
        padding-top: max(0.625rem, env(safe-area-inset-top)) !important;
      }
      #nav-report-wrap {
        bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
      }
      #view-mode-toggle-btn {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function renderInstallBanner({ isIOS = false } = {}) {
  if (isStandaloneMode()) return;
  if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
  if (document.getElementById('pwa-install-banner')) return;

  // 메인 페이지 또는 마이페이지의 모바일/앱 컨테이너 내부 상단에 배너 삽입
  const header = document.querySelector('header');
  if (!header || !header.parentElement) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className =
    'mx-3 mt-2 px-3 py-2.5 rounded-xl border border-primary/30 bg-surface/95 backdrop-blur-md shadow-lg flex items-center justify-between gap-2.5 text-xs transition-all duration-200';

  const base = import.meta.env.BASE_URL || './';
  banner.innerHTML = `
    <div class="flex items-center gap-2.5 min-w-0">
      <img src="${base}icon-192.png" alt="Fermata" class="w-8 h-8 rounded-lg flex-shrink-0 shadow-sm border border-border/60">
      <div class="min-w-0">
        <div class="font-bold text-foreground truncate">Fermata 앱으로 설치하기</div>
        <div class="text-[11px] text-muted-foreground truncate">
          ${isIOS ? '공유(⍐) → 홈 화면에 추가로 빠른 실행' : '홈 화면에 추가해 오프라인에서도 빠르게 제보하세요'}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-1.5 flex-shrink-0">
      <button id="pwa-install-action-btn" type="button"
        class="px-2.5 py-1.5 rounded-lg bg-primary text-white font-bold text-[11px] hover:opacity-90 active:scale-95 transition whitespace-nowrap shadow-sm">
        ${isIOS ? '안내' : '앱 설치'}
      </button>
      <button id="pwa-install-close-btn" type="button" aria-label="설치 배너 닫기"
        class="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-1 transition">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;

  header.insertAdjacentElement('afterend', banner);

  banner.querySelector('#pwa-install-close-btn')?.addEventListener('click', () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    banner.remove();
  });

  banner.querySelector('#pwa-install-action-btn')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      if (outcome === 'accepted') {
        banner.remove();
      }
    } else if (isIOS) {
      alert("iOS Safari 하단의 [공유(⍐)] 버튼을 누른 뒤 ['홈 화면에 추가']를 선택하면 Fermata 앱을 설치할 수 있습니다.");
    }
  });
}

export function registerPWA() {
  if (swInitialized) return;
  swInitialized = true;

  injectStandaloneStyles();

  // Android / Desktop Chrome·Edge 설치 프롬프트 감지
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    renderInstallBanner({ isIOS: false });
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    document.getElementById('pwa-install-banner')?.remove();
  });

  // iOS Safari 비-Standalone 접속 시 안내 배너 표시
  if (isIOSDevice() && !isStandaloneMode()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => renderInstallBanner({ isIOS: true }), { once: true });
    } else {
      renderInstallBanner({ isIOS: true });
    }
  }

  if (!('serviceWorker' in navigator)) return;

  const register = async () => {
    try {
      const base = import.meta.env.BASE_URL || './';
      const swUrl = `${base}sw.js`;
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: base,
      });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (err) {
      console.warn('[PWA] Service Worker registration failed:', err);
    }
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}
