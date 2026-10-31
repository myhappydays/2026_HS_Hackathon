import{_ as e,a as t,c as n,f as r,l as i,r as a,t as o,u as s,v as c}from"./utils-CDjCN5wW.js";import{n as l,t as u}from"./shareCard-CzsMiNGq.js";import{t as d}from"./auth-arIxeHBl.js";var f=`/2026_HS_Hackathon/`;document.getElementById(`nav-home`).href=`${f}index.html`,document.getElementById(`nav-home-fallback`).href=`${f}index.html`;var p=document.getElementById(`loading-state`),m=document.getElementById(`detail-content`),h=document.getElementById(`error-state`),g=new URLSearchParams(location.search).get(`id`);async function _(){if(!g){v();return}let t=await s(g);if(!t){v();return}let n=await r(t.representId);if(!n){v();return}await y(t,n),u(()=>({clusters:[t],reportsMap:new Map([[n.id,n]]),targetLat:t.location?.lat,targetLng:t.location?.lng,currentRegionName:n.location?.address||``})),document.getElementById(`btn-share-card`)?.addEventListener(`click`,()=>{l({type:`report`,report:n,cluster:t})});let i=()=>JSON.parse(localStorage.getItem(`my_likes`)||`[]`),a=document.getElementById(`btn-like`);a&&i().includes(t.id)&&(a.classList.replace(`bg-primary/10`,`bg-primary`),a.classList.replace(`text-primary`,`text-white`),a.classList.add(`opacity-80`,`cursor-not-allowed`),a.innerHTML=`⚠️ 공감 완료 <span id="like-count" class="ml-1 text-white">${t.likes||0}</span>`),a&&a.addEventListener(`click`,async()=>{let n=i();if(n.includes(t.id)){alert(`이미 공감(위험 확인)을 표시한 제보입니다.`);return}t.likes=(t.likes||0)+1,await e(t),n.push(t.id),localStorage.setItem(`my_likes`,JSON.stringify(n)),a.classList.replace(`bg-primary/10`,`bg-primary`),a.classList.replace(`text-primary`,`text-white`),a.classList.add(`opacity-80`,`cursor-not-allowed`),a.innerHTML=`⚠️ 공감 완료 <span id="like-count" class="ml-1 text-white">${t.likes}</span>`});let o=document.getElementById(`comment-form`),c=document.getElementById(`btn-comment-submit`),d=async r=>{r&&r.preventDefault&&r.preventDefault();let i=document.getElementById(`comment-input`),a=i?i.value.trim():``;if(!a){alert(`공유할 상황을 입력해주세요.`);return}t.comments||=[];let o=[`익명의 주민`,`동네 보안관`,`지나가는 행인`,`안전 요원`,`목격자`],s=o[Math.floor(Math.random()*o.length)];t.comments.push({id:Date.now().toString(),text:a,author:s,createdAt:new Date().toISOString()}),await e(t),i&&(i.value=``),await y(t,n)};o?o.addEventListener(`submit`,d):c&&c.addEventListener(`click`,d)}function v(){p.classList.add(`hidden`),h.classList.remove(`hidden`)}async function y(n,i){let s=(await Promise.all(n.reportIds.map(e=>r(e)))).filter(Boolean),l=s.filter(e=>e.imageBase64);b(l.length>0?l:i.imageBase64?[i]:[]);let u=n.status===`resolved`,f=a(n.danger),h=document.getElementById(`cluster-danger-badge`);u?(h.className=`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400`,h.innerHTML=`
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
      </svg>
      해결 완료
    `):(h.className=`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${f.bg} ${f.text}`,h.textContent=f.label),document.getElementById(`cluster-cat-badge`).textContent=o(n.category);let g=document.getElementById(`cluster-count-badge`);n.reportIds.length>1?(g.textContent=`${n.reportIds.length}건 묶임`,g.classList.remove(`hidden`)):g.classList.add(`hidden`),document.getElementById(`cluster-title`).textContent=i.title,document.getElementById(`cluster-description`).textContent=i.description||``,document.getElementById(`cluster-address`).textContent=i.location?.address||`위치 정보 없음`,document.getElementById(`cluster-time`).textContent=`${t(n.createdAt)} 제보`;let _=document.getElementById(`btn-toggle-status`),v=document.getElementById(`btn-toggle-status-text`),C=d(),w=!i.userId||C&&C.uid===i.userId;_&&v&&(w?(_.style.display=``,v.textContent=u?`진행 중으로 변경`:`해결 완료로 변경`,_.onclick=async()=>{let t=u?`active`:`resolved`;n.status=t,t===`resolved`?n.resolvedAt=Date.now():n.resolvedAt=null,await e(n),await y(n,i)}):_.style.display=`none`);let T=document.getElementById(`related-count`),E=document.getElementById(`related-list`);T.textContent=`총 ${s.length}건`,E.innerHTML=`
    <div class="hs-accordion-group space-y-2">
      ${s.map((e,n)=>{let r=a(e.danger),i=o(e.category);return`
        <div class="hs-accordion bg-surface border border-border rounded-xl overflow-hidden" id="acc-${e.id}">
          <button class="hs-accordion-toggle hs-accordion-active:text-primary w-full py-3 px-4 flex items-center justify-between text-left text-sm font-medium text-foreground hover:bg-surface-1 transition gap-3"
            aria-controls="acc-body-${e.id}">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.bg} ${r.text}">${r.label}</span>
                <span class="text-[10px] text-muted-foreground">${i}</span>
                <span class="text-[10px] text-muted-foreground ml-auto">${t(e.createdAt)}</span>
              </div>
              <p class="text-sm font-medium text-foreground truncate">${e.title}</p>
              <p class="text-xs text-muted-foreground truncate mt-0.5">${e.description||``}</p>
            </div>
            <svg class="hs-accordion-active:rotate-180 w-4 h-4 flex-shrink-0 self-center text-muted-foreground transition-transform duration-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
            </svg>
          </button>

          <div id="acc-body-${e.id}" class="hs-accordion-content hidden w-full overflow-hidden transition-[height] duration-300" role="region" aria-labelledby="acc-${e.id}">
            <div class="border-t border-border px-4 py-3 space-y-3">
              <div class="flex items-center gap-2">
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${r.bg} ${r.text}">${r.label}</span>
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground">${i}</span>
              </div>
              ${e.imageBase64?`<img src="${e.imageBase64}" alt="제보 사진" class="w-full rounded-lg object-cover" style="max-height:220px;">`:``}
              <div>
                <p class="text-sm font-semibold text-foreground">${e.title}</p>
                ${e.description?`<p class="text-xs text-muted-foreground mt-1 leading-relaxed">${e.description}</p>`:``}
              </div>
              <div class="flex flex-col gap-1 text-xs text-muted-foreground">
                <div class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                  </svg>
                  <span>${e.location?.address||`위치 정보 없음`}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>${t(e.createdAt)}</span>
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-3 pt-3 border-t border-border/50">
                ${!e.userId||C&&C.uid===e.userId?`
                <button type="button" class="btn-edit-report py-1.5 px-3 bg-surface border border-border text-foreground hover:bg-surface-1 rounded-lg text-xs font-semibold transition" data-id="${e.id}">
                  수정
                </button>
                <button type="button" class="btn-delete-report py-1.5 px-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-semibold transition" data-id="${e.id}">
                  삭제
                </button>
                `:``}
              </div>
            </div>
          </div>
        </div>
        `}).join(``)}
    </div>
  `,window.HSAccordion&&window.HSAccordion.autoInit(),document.querySelectorAll(`.btn-report-report`).forEach(e=>{e.addEventListener(`click`,async t=>{t.stopPropagation();let n=e.getAttribute(`data-id`);if(confirm(`이 제보를 불량/허위 제보로 신고하시겠습니까?`)){let e=s.find(e=>e.id===n);e&&(e.reportCount=(e.reportCount||0)+1,await c(e),alert(`신고가 접수되었습니다. (누적 신고: `+e.reportCount+`회)`))}})}),document.querySelectorAll(`.btn-edit-report`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),S(e.getAttribute(`data-id`))})}),document.querySelectorAll(`.btn-delete-report`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation();let r=e.getAttribute(`data-id`);confirm(`이 제보를 삭제하시겠습니까?`)&&x(n,r)})}),document.getElementById(`like-count`).textContent=n.likes||0;let D=n.comments||[];document.getElementById(`comment-count`).textContent=`${D.length}개`;let O=document.getElementById(`comment-list`);D.length===0?O.innerHTML=`<p class="text-sm text-muted-foreground text-center py-4">아직 공유된 상황이 없습니다. 첫 번째로 상황을 공유해주세요!</p>`:O.innerHTML=D.map(e=>`
      <div class="flex gap-2">
        <div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
          ${e.author.charAt(0)}
        </div>
        <div class="flex-1 bg-surface border border-border rounded-lg rounded-tl-none p-3">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs font-semibold text-foreground">${e.author}</span>
            <span class="text-[10px] text-muted-foreground">${t(e.createdAt)}</span>
          </div>
          <p class="text-sm text-foreground">${e.text}</p>
        </div>
      </div>
    `).join(``),p.classList.add(`hidden`),m.classList.remove(`hidden`)}function b(e){let t=document.getElementById(`carousel-wrap`);if(e.length===0){t.classList.add(`hidden`);return}let n=document.getElementById(`carousel-body`);n.innerHTML=e.map(e=>`
    <div class="hs-carousel-slide flex-shrink-0 w-full">
      <img src="${e.imageBase64}" alt="제보 사진"
        class="w-full object-cover" style="height:260px;">
    </div>
  `).join(``);let r=t.querySelector(`.hs-carousel-pagination`);r&&(r.innerHTML=e.map((e,t)=>`
      <span class="hs-carousel-pagination-item${t===0?` active`:``}">
        <span></span>
      </span>
    `).join(``)),e.length<=1&&(t.querySelector(`.hs-carousel-prev`)?.classList.add(`hidden`),t.querySelector(`.hs-carousel-next`)?.classList.add(`hidden`),r&&r.classList.add(`hidden`)),window.HSCarousel&&window.HSCarousel.autoInit()}_();async function x(t,r){await i(r),t.reportIds=t.reportIds.filter(e=>e!==r),t.reportIds.length===0?(await n(t.id),alert(`모든 제보가 삭제되어 군집이 사라졌습니다.`),location.href=`${f}index.html`):(t.representId===r&&(t.representId=t.reportIds[0]),await e(t),alert(`제보가 삭제되었습니다.`),location.reload())}async function S(t){let n=await r(t);if(!n)return;let i=prompt(`수정할 내용을 입력하세요 (상세 설명):`,n.description||``);if(i!==null&&i.trim()!==``){n.description=i.trim(),n.updatedAt=new Date().toISOString(),await c(n);let t=await s(g);t&&(t.updatedAt=new Date().toISOString(),await e(t)),alert(`제보 내용이 수정되었습니다.`),location.reload()}}