import{E as e,a as t,c as n,d as r,h as i,m as a,p as o,r as s,s as c,u as l}from"./auth-UKDWkVb6.js";c(),document.getElementById(`nav-home`).href=`/2026_HS_Hackathon/index.html`;var u=!1,d=async()=>{confirm(`로그아웃 하시겠습니까?`)&&(u=!0,await t(),location.href=`/2026_HS_Hackathon/index.html`)};document.getElementById(`logout-btn`)?.addEventListener(`click`,d),document.getElementById(`profile-logout-btn`)?.addEventListener(`click`,d);var f=document.getElementById(`profile-name`),p=document.getElementById(`profile-email`),m=document.getElementById(`profile-img`),h=document.getElementById(`my-report-count`),g=document.getElementById(`my-report-list`),_=document.getElementById(`empty-state`);s(async t=>{if(!t){if(u)return;alert(`마이페이지는 로그인 후 이용하실 수 있습니다.`),location.href=`/2026_HS_Hackathon/index.html`;return}f.textContent=t.displayName||`이름 없음`,p.textContent=t.email||``,t.photoURL&&(m.src=t.photoURL);let s=[];try{s=await e(t.uid)}catch(e){console.error(`[mypage] 내 제보 조회 실패:`,e)}if(h.textContent=`총 ${s.length}건`,s.length===0){_.classList.remove(`hidden`),_.classList.add(`flex`),g.innerHTML=``;return}s.sort((e,t)=>i(t.createdAt)-i(e.createdAt)),g.innerHTML=s.map(e=>{let t=l(e.danger),i=n(e.category),s=o(e.createdAt),c=a(e.imageBase64);return`
      <a href="/2026_HS_Hackathon/detail.html?id=${encodeURIComponent(e.clusterId||e.id)}"
        class="flex gap-3 p-3 rounded-xl bg-card border border-border active:bg-surface transition">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
          ${c?`<img src="${c}" class="w-full h-full object-cover" alt="썸네일" loading="lazy">`:`<div class="w-full h-full flex items-center justify-center">
                 <svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/>
                 </svg>
               </div>`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.bg} ${t.text}">${t.label}</span>
            <span class="text-[10px] text-muted-foreground">${i}</span>
          </div>
          <p class="text-sm font-semibold text-foreground truncate">${r(e.title)}</p>
          <p class="text-xs text-muted-foreground truncate mt-0.5">${r(e.description||`상세 설명 없음`)}</p>
          <div class="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
            <span class="truncate">${r(e.location?.address||`위치 정보 없음`)}</span>
            <span class="ml-auto flex-shrink-0 text-muted-foreground">${s}</span>
          </div>
        </div>
      </a>
    `}).join(``)});