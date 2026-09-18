import { initTheme } from './theme.js';
import { listenAuthState } from './auth.js';
import { getReportsByUserId } from './storage.js';
import { dangerStyle, categoryLabel, relativeTime } from './utils.js';

initTheme();

document.getElementById('nav-home').href = `${import.meta.env.BASE_URL}index.html`;

const profileName = document.getElementById('profile-name');
const profileEmail = document.getElementById('profile-email');
const profileImg = document.getElementById('profile-img');
const myReportCount = document.getElementById('my-report-count');
const myReportList = document.getElementById('my-report-list');
const emptyState = document.getElementById('empty-state');

listenAuthState(async (user) => {
  if (!user) {
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
  const reports = await getReportsByUserId(user.uid);
  myReportCount.textContent = `총 ${reports.length}건`;

  if (reports.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
    myReportList.innerHTML = '';
    return;
  }

  // 최신순 정렬
  reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const html = reports.map(rep => {
    const ds = dangerStyle(rep.danger);
    const cat = categoryLabel(rep.category);
    const time = relativeTime(rep.createdAt);

    return `
      <a href="${import.meta.env.BASE_URL}detail.html?id=${rep.clusterId}"
        class="flex gap-3 p-3 rounded-xl bg-card border border-border active:bg-surface transition">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
          ${rep.imageBase64
            ? `<img src="${rep.imageBase64}" class="w-full h-full object-cover" alt="썸네일">`
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
          <p class="text-sm font-semibold text-foreground truncate">${rep.title}</p>
          <p class="text-xs text-muted-foreground truncate mt-0.5">${rep.description || '상세 설명 없음'}</p>
          <div class="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
            <span class="truncate">${rep.location.address || '위치 정보 없음'}</span>
            <span class="ml-auto flex-shrink-0 text-muted-foreground">${time}</span>
          </div>
        </div>
      </a>
    `;
  }).join('');

  myReportList.innerHTML = html;
});
