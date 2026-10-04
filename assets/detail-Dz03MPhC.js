import{a as e,c as t,f as n,l as r,r as i,t as a,u as o,v as s,y as c}from"./utils-q2FoRUtQ.js";import{t as l}from"./auth-CUvEXa6V.js";import{n as u,t as d}from"./shareCard-BwKGji75.js";var f=`/2026_HS_Hackathon/`;document.getElementById(`nav-home`).href=`${f}index.html`,document.getElementById(`nav-home-fallback`).href=`${f}index.html`;var p=document.getElementById(`loading-state`),m=document.getElementById(`detail-content`),h=document.getElementById(`error-state`),g=new URLSearchParams(location.search).get(`id`);async function _(){if(!g){v();return}let e=await o(g);if(!e){v();return}let t=await n(e.representId);if(!t){v();return}await y(e,t),d(()=>({clusters:[e],reportsMap:new Map([[t.id,t]]),targetLat:e.location?.lat,targetLng:e.location?.lng,currentRegionName:t.location?.address||``})),document.getElementById(`btn-share-card`)?.addEventListener(`click`,()=>{u({type:`report`,report:t,cluster:e})});let r=()=>JSON.parse(localStorage.getItem(`my_likes`)||`[]`),i=document.getElementById(`btn-like`);i&&r().includes(e.id)&&(i.classList.replace(`bg-primary/10`,`bg-primary`),i.classList.replace(`text-primary`,`text-white`),i.classList.add(`opacity-80`,`cursor-not-allowed`),i.innerHTML=`⚠️ 공감 완료 <span id="like-count" class="ml-1 text-white">${e.likes||0}</span>`),i&&i.addEventListener(`click`,async()=>{let t=r();if(t.includes(e.id)){alert(`이미 공감(위험 확인)을 표시한 제보입니다.`);return}e.likes=(e.likes||0)+1,await s(e),t.push(e.id),localStorage.setItem(`my_likes`,JSON.stringify(t)),i.classList.replace(`bg-primary/10`,`bg-primary`),i.classList.replace(`text-primary`,`text-white`),i.classList.add(`opacity-80`,`cursor-not-allowed`),i.innerHTML=`⚠️ 공감 완료 <span id="like-count" class="ml-1 text-white">${e.likes}</span>`});let a=document.getElementById(`comment-form`),c=document.getElementById(`btn-comment-submit`),l=async n=>{n&&n.preventDefault&&n.preventDefault();let r=document.getElementById(`comment-input`),i=r?r.value.trim():``;if(!i){alert(`공유할 상황을 입력해주세요.`);return}e.comments||=[];let a=[`익명의 주민`,`동네 보안관`,`지나가는 행인`,`안전 요원`,`목격자`],o=a[Math.floor(Math.random()*a.length)];e.comments.push({id:Date.now().toString(),text:i,author:o,createdAt:new Date().toISOString()}),await s(e),r&&(r.value=``),await y(e,t)};a?a.addEventListener(`submit`,l):c&&c.addEventListener(`click`,l)}function v(){p.classList.add(`hidden`),h.classList.remove(`hidden`)}async function y(t,r){let o=(await Promise.all(t.reportIds.map(e=>n(e)))).filter(Boolean),u=o.filter(e=>e.imageBase64);b(u.length>0?u:r.imageBase64?[r]:[]);let d=t.status===`resolved`,f=i(t.danger),h=document.getElementById(`cluster-danger-badge`);d?(h.className=`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400`,h.innerHTML=`
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
      </svg>
      해결 완료
    `):(h.className=`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${f.bg} ${f.text}`,h.textContent=f.label),document.getElementById(`cluster-cat-badge`).textContent=a(t.category);let g=document.getElementById(`cluster-count-badge`);t.reportIds.length>1?(g.textContent=`${t.reportIds.length}건 묶임`,g.classList.remove(`hidden`)):g.classList.add(`hidden`),document.getElementById(`cluster-title`).textContent=r.title,document.getElementById(`cluster-description`).textContent=r.description||``,document.getElementById(`cluster-address`).textContent=r.location?.address||`위치 정보 없음`,document.getElementById(`cluster-time`).textContent=`${e(t.createdAt)} 제보`;let _=document.getElementById(`btn-toggle-status`),v=document.getElementById(`btn-toggle-status-text`),C=l(),w=!r.userId||C&&C.uid===r.userId;_&&v&&(w?(_.style.display=``,v.textContent=d?`진행 중으로 변경`:`해결 완료로 변경`,_.onclick=async()=>{let e=d?`active`:`resolved`;t.status=e,e===`resolved`?t.resolvedAt=Date.now():t.resolvedAt=null,await s(t),await y(t,r)}):_.style.display=`none`);let T=document.getElementById(`related-count`),E=document.getElementById(`related-list`);T.textContent=`총 ${o.length}건`,E.innerHTML=`
    <div class="hs-accordion-group space-y-2">
      ${o.map((t,n)=>{let r=i(t.danger),o=a(t.category);return`
        <div class="hs-accordion bg-surface border border-border rounded-xl overflow-hidden" id="acc-${t.id}">
          <button class="hs-accordion-toggle hs-accordion-active:text-primary w-full py-3 px-4 flex items-center justify-between text-left text-sm font-medium text-foreground hover:bg-surface-1 transition gap-3"
            aria-controls="acc-body-${t.id}">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.bg} ${r.text}">${r.label}</span>
                <span class="text-[10px] text-muted-foreground">${o}</span>
                <span class="text-[10px] text-muted-foreground ml-auto">${e(t.createdAt)}</span>
              </div>
              <p class="text-sm font-medium text-foreground truncate">${t.title}</p>
              <p class="text-xs text-muted-foreground truncate mt-0.5">${t.description||``}</p>
            </div>
            <svg class="hs-accordion-active:rotate-180 w-4 h-4 flex-shrink-0 self-center text-muted-foreground transition-transform duration-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
            </svg>
          </button>

          <div id="acc-body-${t.id}" class="hs-accordion-content hidden w-full overflow-hidden transition-[height] duration-300" role="region" aria-labelledby="acc-${t.id}">
            <div class="border-t border-border px-4 py-3 space-y-3">
              <div class="flex items-center gap-2">
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${r.bg} ${r.text}">${r.label}</span>
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground">${o}</span>
              </div>
              ${t.imageBase64?`<img src="${t.imageBase64}" alt="제보 사진" class="w-full rounded-lg object-cover" style="max-height:220px;">`:``}
              <div>
                <p class="text-sm font-semibold text-foreground">${t.title}</p>
                ${t.description?`<p class="text-xs text-muted-foreground mt-1 leading-relaxed">${t.description}</p>`:``}
              </div>
              <div class="flex flex-col gap-1 text-xs text-muted-foreground">
                <div class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                  </svg>
                  <span>${t.location?.address||`위치 정보 없음`}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>${e(t.createdAt)}</span>
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-3 pt-3 border-t border-border/50">
                ${!t.userId||C&&C.uid===t.userId?`
                <button type="button" class="btn-edit-report py-1.5 px-3 bg-surface border border-border text-foreground hover:bg-surface-1 rounded-lg text-xs font-semibold transition" data-id="${t.id}">
                  수정
                </button>
                <button type="button" class="btn-delete-report py-1.5 px-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-semibold transition" data-id="${t.id}">
                  삭제
                </button>
                `:``}
              </div>
            </div>
          </div>
        </div>
        `}).join(``)}
    </div>
  `,window.HSAccordion&&window.HSAccordion.autoInit(),document.querySelectorAll(`.btn-report-report`).forEach(e=>{e.addEventListener(`click`,async t=>{t.stopPropagation();let n=e.getAttribute(`data-id`);if(confirm(`이 제보를 불량/허위 제보로 신고하시겠습니까?`)){let e=o.find(e=>e.id===n);e&&(e.reportCount=(e.reportCount||0)+1,await c(e),alert(`신고가 접수되었습니다. (누적 신고: `+e.reportCount+`회)`))}})}),document.querySelectorAll(`.btn-edit-report`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),S(e.getAttribute(`data-id`))})}),document.querySelectorAll(`.btn-delete-report`).forEach(e=>{e.addEventListener(`click`,n=>{n.stopPropagation();let r=e.getAttribute(`data-id`);confirm(`이 제보를 삭제하시겠습니까?`)&&x(t,r)})}),document.getElementById(`like-count`).textContent=t.likes||0;let D=t.comments||[];document.getElementById(`comment-count`).textContent=`${D.length}개`;let O=document.getElementById(`comment-list`);D.length===0?O.innerHTML=`<p class="text-sm text-muted-foreground text-center py-4">아직 공유된 상황이 없습니다. 첫 번째로 상황을 공유해주세요!</p>`:O.innerHTML=D.map(t=>`
      <div class="flex gap-2">
        <div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
          ${t.author.charAt(0)}
        </div>
        <div class="flex-1 bg-surface border border-border rounded-lg rounded-tl-none p-3">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs font-semibold text-foreground">${t.author}</span>
            <span class="text-[10px] text-muted-foreground">${e(t.createdAt)}</span>
          </div>
          <p class="text-sm text-foreground">${t.text}</p>
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
    `).join(``)),e.length<=1&&(t.querySelector(`.hs-carousel-prev`)?.classList.add(`hidden`),t.querySelector(`.hs-carousel-next`)?.classList.add(`hidden`),r&&r.classList.add(`hidden`)),window.HSCarousel&&window.HSCarousel.autoInit()}_();async function x(e,n){await r(n),e.reportIds=e.reportIds.filter(e=>e!==n),e.reportIds.length===0?(await t(e.id),alert(`모든 제보가 삭제되어 군집이 사라졌습니다.`),location.href=`${f}index.html`):(e.representId===n&&(e.representId=e.reportIds[0]),await s(e),alert(`제보가 삭제되었습니다.`),location.reload())}async function S(e){let t=await n(e);if(!t)return;let r=prompt(`수정할 내용을 입력하세요 (상세 설명):`,t.description||``);if(r!==null&&r.trim()!==``){t.description=r.trim(),t.updatedAt=new Date().toISOString(),await c(t);let e=await o(g);e&&(e.updatedAt=new Date().toISOString(),await s(e)),alert(`제보 내용이 수정되었습니다.`),location.reload()}}