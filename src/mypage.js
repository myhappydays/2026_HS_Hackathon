import { initTheme } from './theme.js';
import { listenAuthState, logout, deleteCurrentAccount, getCurrentUser } from './auth.js';
import { getReportsByUserId, deleteReport } from './storage.js';
import { dangerStyle, categoryLabel, relativeTime, escapeHtml, safeImageSrc, toMillis } from './utils.js';

initTheme();

const BASE = import.meta.env.BASE_URL;
document.getElementById('nav-home').href = `${BASE}index.html`;
const navPrivacy = document.getElementById('nav-privacy');
if (navPrivacy) navPrivacy.href = `${BASE}privacy.html`;
const navTerms = document.getElementById('nav-terms');
if (navTerms) navTerms.href = `${BASE}terms.html`;

// 로그아웃 처리
let loggingOut = false;
const handleLogout = async () => {
  if (confirm('로그아웃 하시겠습니까?')) {
    loggingOut = true;
    await logout();
    location.href = `${BASE}index.html`;
  }
};
document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
document.getElementById('profile-logout-btn')?.addEventListener('click', handleLogout);

// 계정 삭제 (회원 탈퇴) 처리
const deleteAccountBtn = document.getElementById('delete-account-btn');
deleteAccountBtn?.addEventListener('click', async () => {
  const user = getCurrentUser();
  if (!user) return;

  if (!confirm('정말로 계정을 삭제(회원 탈퇴)하시겠습니까?\n작성하신 모든 제보와 계정 정보가 영구 삭제되며 복구할 수 없습니다.')) {
    return;
  }

  deleteAccountBtn.disabled = true;
  const originalHtml = deleteAccountBtn.innerHTML;
  deleteAccountBtn.textContent = '계정 삭제 처리 중...';
  loggingOut = true;

  try {
    // 1. 본인이 작성한 제보 데이터 정리
    try {
      const myReports = await getReportsByUserId(user.uid);
      for (const rep of myReports) {
        try {
          await deleteReport(rep.id);
        } catch (err) {
          console.warn('[mypage] 제보 삭제 건너뜀:', rep.id, err);
        }
      }
    } catch (err) {
      console.warn('[mypage] 내 제보 조회 실패:', err);
    }

    // 2. Firebase 인증 계정 영구 삭제 (필요 시 Google 재인증 팝업 자동 표시)
    const result = await deleteCurrentAccount();
    if (result.cancelled) {
      loggingOut = false;
      deleteAccountBtn.disabled = false;
      deleteAccountBtn.innerHTML = originalHtml;
      alert('본인 확인(재인증)이 취소되어 계정 삭제가 중단되었습니다.');
      return;
    }

    // 3. 로컬 캐시 정리
    try {
      localStorage.removeItem('reports');
      localStorage.removeItem('clusters');
      localStorage.removeItem('fermata_ai_summary_cache');
      localStorage.removeItem('gemini_api_key');
    } catch {}

    alert('계정 및 관련 데이터가 모두 삭제되었습니다.');
    location.href = `${BASE}index.html`;
  } catch (err) {
    console.error('[mypage] 계정 삭제 실패:', err);
    loggingOut = false;
    deleteAccountBtn.disabled = false;
    deleteAccountBtn.innerHTML = originalHtml;
    alert('계정 삭제 중 오류가 발생했습니다. 다시 로그인한 뒤 시도하거나 lshjhj0819@naver.com 으로 문의해 주세요.');
  }
});

const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileImg = document.getElementById('profile-img');
const myReportCount = document.getElementById('my-report-count');
const myReportList = document.getElementById('my-report-list');
const emptyState = document.getElementById('empty-state');

listenAuthState(async (user) => {
  if (!user) {
    if (loggingOut) return; // 로그아웃 처리 중에는 안내 없이 이동
    alert("마이페이지는 로그인 후 이용하실 수 있습니다.");
    location.href = `${import.meta.env.BASE_URL}index.html`;
    return;
  }

  // 프로필 정보 렌더링
  profileName.textContent = user.displayName || '이름 없음';
  profileEmail.textContent = user.email || '';
  if (user.photoURL) {
    profileImg.src = user.photoURL;
  }

  // 제보 목록 렌더링
  let reports = [];
  try {
    reports = await getReportsByUserId(user.uid);
  } catch (err) {
    console.error('[mypage] 내 제보 조회 실패:', err);
  }
  myReportCount.textContent = `총 ${reports.length}건`;

  if (reports.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
    myReportList.innerHTML = '';
    return;
  }

  // 최신순 정렬
  reports.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

  const html = reports.map(rep => {
    const ds = dangerStyle(rep.danger);
    const cat = categoryLabel(rep.category);
    const time = relativeTime(rep.createdAt);
    const thumb = safeImageSrc(rep.imageBase64);
    // 군집 배정 전인 제보는 제보 ID로 연결한다 (상세 페이지가 제보 ID도 받아 준다)
    const targetId = encodeURIComponent(rep.clusterId || rep.id);

    return `
      <a href="${import.meta.env.BASE_URL}detail.html?id=${targetId}"
        class="flex gap-3 p-3 rounded-xl bg-card border border-border active:bg-surface transition">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
          ${thumb
            ? `<img src="${thumb}" class="w-full h-full object-cover" alt="썸네일" loading="lazy">`
            : `<div class="w-full h-full flex items-center justify-center">
                 <svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/>
                 </svg>
               </div>`
          }
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${ds.bg} ${ds.text}">${ds.label}</span>
            <span class="text-[10px] text-muted-foreground">${cat}</span>
          </div>
          <p class="text-sm font-semibold text-foreground truncate">${escapeHtml(rep.title)}</p>
          <p class="text-xs text-muted-foreground truncate mt-0.5">${escapeHtml(rep.description || '상세 설명 없음')}</p>
          <div class="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
            <span class="truncate">${escapeHtml(rep.location?.address || '위치 정보 없음')}</span>
            <span class="ml-auto flex-shrink-0 text-muted-foreground">${time}</span>
          </div>
        </div>
      </a>
    `;
  }).join('');

  myReportList.innerHTML = html;
});
