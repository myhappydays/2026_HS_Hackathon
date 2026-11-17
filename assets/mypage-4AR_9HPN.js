import{T as e,f as t,i as n,l as r,m as i,n as a,o,p as s,s as c,u as l}from"./auth-CLDoQ0Y-.js";o(),document.getElementById(`nav-home`).href=`/2026_HS_Hackathon/index.html`;var u=!1,d=async()=>{confirm(`로그아웃 하시겠습니까?`)&&(u=!0,await n(),location.href=`/2026_HS_Hackathon/index.html`)};document.getElementById(`logout-btn`)?.addEventListener(`click`,d),document.getElementById(`profile-logout-btn`)?.addEventListener(`click`,d);var f=document.getElementById(`profile-name`),p=document.getElementById(`profile-email`),m=document.getElementById(`profile-img`),h=document.getElementById(`my-report-count`),g=document.getElementById(`my-report-list`),_=document.getElementById(`empty-state`);a(async n=>{if(!n){if(u)return;alert(`마이페이지는 로그인 후 이용하실 수 있습니다.`),location.href=`/2026_HS_Hackathon/index.html`;return}f.textContent=n.displayName||`이름 없음`,p.textContent=n.email||``,n.photoURL&&(m.src=n.photoURL);let a=[];try{a=await e(n.uid)}catch(e){console.error(`[mypage] 내 제보 조회 실패:`,e)}if(h.textContent=`총 ${a.length}건`,a.length===0){_.classList.remove(`hidden`),_.classList.add(`flex`),g.innerHTML=``;return}a.sort((e,t)=>i(t.createdAt)-i(e.createdAt)),g.innerHTML=a.map(e=>{let n=r(e.danger),i=c(e.category),a=t(e.createdAt),o=s(e.imageBase64);return`
      <a href="/2026_HS_Hackathon/detail.html?id=${encodeURIComponent(e.clusterId||e.id)}"
        class="flex gap-3 p-3 rounded-xl bg-card border border-border active:bg-surface transition">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
          ${o?`<img src="${o}" class="w-full h-full object-cover" alt="썸네일" loading="lazy">`:`<div class="w-full h-full flex items-center justify-center">
                 <svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/>
                 </svg>
               </div>`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${n.bg} ${n.text}">${n.label}</span>
            <span class="text-[10px] text-muted-foreground">${i}</span>
          </div>
          <p class="text-sm font-semibold text-foreground truncate">${l(e.title)}</p>
          <p class="text-xs text-muted-foreground truncate mt-0.5">${l(e.description||`상세 설명 없음`)}</p>
          <div class="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
            <span class="truncate">${l(e.location?.address||`위치 정보 없음`)}</span>
            <span class="ml-auto flex-shrink-0 text-muted-foreground">${a}</span>
          </div>
        </div>
      </a>
    `}).join(``)});