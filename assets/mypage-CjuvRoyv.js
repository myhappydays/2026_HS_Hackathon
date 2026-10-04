import{a as e,m as t,r as n,t as r}from"./utils-q2FoRUtQ.js";import{t as i}from"./theme-BGQI_Gbl.js";import{i as a,n as o}from"./auth-CUvEXa6V.js";i(),document.getElementById(`nav-home`).href=`/2026_HS_Hackathon/index.html`;var s=async()=>{confirm(`로그아웃 하시겠습니까?`)&&(await a(),location.href=`/2026_HS_Hackathon/index.html`)};document.getElementById(`logout-btn`)?.addEventListener(`click`,s),document.getElementById(`profile-logout-btn`)?.addEventListener(`click`,s);var c=document.getElementById(`profile-name`),l=document.getElementById(`profile-email`),u=document.getElementById(`profile-img`),d=document.getElementById(`my-report-count`),f=document.getElementById(`my-report-list`),p=document.getElementById(`empty-state`);o(async i=>{if(!i){alert(`마이페이지는 로그인 후 이용하실 수 있습니다.`),location.href=`/2026_HS_Hackathon/index.html`;return}c.textContent=i.displayName||`이름 없음`,l.textContent=i.email||``,i.photoURL&&(u.src=i.photoURL);let a=await t(i.uid);if(d.textContent=`총 ${a.length}건`,a.length===0){p.classList.remove(`hidden`),p.classList.add(`flex`),f.innerHTML=``;return}a.sort((e,t)=>new Date(t.createdAt)-new Date(e.createdAt)),f.innerHTML=a.map(t=>{let i=n(t.danger),a=r(t.category),o=e(t.createdAt);return`
      <a href="/2026_HS_Hackathon/detail.html?id=${t.clusterId}"
        class="flex gap-3 p-3 rounded-xl bg-card border border-border active:bg-surface transition">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
          ${t.imageBase64?`<img src="${t.imageBase64}" class="w-full h-full object-cover" alt="썸네일">`:`<div class="w-full h-full flex items-center justify-center">
                 <svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/>
                 </svg>
               </div>`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${i.bg} ${i.text}">${i.label}</span>
            <span class="text-[10px] text-muted-foreground">${a}</span>
          </div>
          <p class="text-sm font-semibold text-foreground truncate">${t.title}</p>
          <p class="text-xs text-muted-foreground truncate mt-0.5">${t.description||`상세 설명 없음`}</p>
          <div class="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
            <span class="truncate">${t.location.address||`위치 정보 없음`}</span>
            <span class="ml-auto flex-shrink-0 text-muted-foreground">${o}</span>
          </div>
        </div>
      </a>
    `}).join(``)});