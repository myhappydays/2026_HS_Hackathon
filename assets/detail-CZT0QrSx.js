import{a as e,c as t,f as n,l as r,r as i,t as a,u as o,v as s,y as c}from"./utils-q2FoRUtQ.js";import{n as l,t as u}from"./shareCard-CYJZRnVL.js";var d=`/2026_HS_Hackathon/`;document.getElementById(`nav-home`).href=`${d}index.html`,document.getElementById(`nav-home-fallback`).href=`${d}index.html`;var f=document.getElementById(`loading-state`),p=document.getElementById(`detail-content`),m=document.getElementById(`error-state`),h=new URLSearchParams(location.search).get(`id`);async function g(){if(!h){_();return}let e=await o(h);if(!e){_();return}let t=await n(e.representId);if(!t){_();return}await v(e,t),u(()=>({clusters:[e],reportsMap:new Map([[t.id,t]]),targetLat:e.location?.lat,targetLng:e.location?.lng,currentRegionName:t.location?.address||``})),document.getElementById(`btn-share-card`)?.addEventListener(`click`,()=>{l({type:`report`,report:t,cluster:e})});let r=()=>JSON.parse(localStorage.getItem(`my_likes`)||`[]`),i=document.getElementById(`btn-like`);i&&r().includes(e.id)&&(i.classList.replace(`bg-primary/10`,`bg-primary`),i.classList.replace(`text-primary`,`text-white`),i.classList.add(`opacity-80`,`cursor-not-allowed`),i.innerHTML=`✔️ 공감 완료 <span id="like-count" class="ml-1 text-white">${e.likes||0}</span>`),i&&i.addEventListener(`click`,async()=>{let t=r();if(t.includes(e.id)){alert(`이미 공감(위험 확인)을 표시한 제보입니다.`);return}e.likes=(e.likes||0)+1,await s(e),t.push(e.id),localStorage.setItem(`my_likes`,JSON.stringify(t)),i.classList.replace(`bg-primary/10`,`bg-primary`),i.classList.replace(`text-primary`,`text-white`),i.classList.add(`opacity-80`,`cursor-not-allowed`),i.innerHTML=`✔️ 공감 완료 <span id="like-count" class="ml-1 text-white">${e.likes}</span>`});let a=document.getElementById(`comment-form`),c=document.getElementById(`btn-comment-submit`),d=async n=>{n&&n.preventDefault&&n.preventDefault();let r=document.getElementById(`comment-input`),i=r?r.value.trim():``;if(!i){alert(`공유할 상황을 입력해주세요.`);return}e.comments||=[];let a=[`익명의 주민`,`동네 보안관`,`지나가는 행인`,`안전 요원`,`목격자`],o=a[Math.floor(Math.random()*a.length)];e.comments.push({id:Date.now().toString(),text:i,author:o,createdAt:new Date().toISOString()}),await s(e),r&&(r.value=``),await v(e,t)};a?a.addEventListener(`submit`,d):c&&c.addEventListener(`click`,d)}function _(){f.classList.add(`hidden`),m.classList.remove(`hidden`)}async function v(t,r){let o=(await Promise.all(t.reportIds.map(e=>n(e)))).filter(Boolean);y(o.filter(e=>e.imageBase64));let c=t.status===`resolved`,l=i(t.danger),u=a(t.category),d=c?`<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400">
         <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
         해결 완료
       </span>`:`<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${l.bg} ${l.text}">${l.label}</span>`;document.getElementById(`badge-area`).innerHTML=`
    ${d}
    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground">${u}</span>
    ${t.reportIds.length>1?`<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">제보 ${t.reportIds.length}건</span>`:``}
  `;let m=document.getElementById(`btn-toggle-status`),h=document.getElementById(`btn-toggle-status-text`);m&&h&&(h.textContent=c?`진행 중으로 변경`:`해결 완료로 변경`,m.onclick=async()=>{t.status=c?`active`:`resolved`,await s(t),await v(t,r)}),document.getElementById(`cluster-title`).textContent=r.title,document.getElementById(`cluster-description`).textContent=r.description||`상세 설명이 없습니다.`,document.getElementById(`cluster-address`).textContent=r.location.address||`위치 정보 없음`,document.getElementById(`cluster-time`).textContent=`${e(t.createdAt)} 최초 등록 · ${e(t.updatedAt)} 업데이트`,document.getElementById(`related-count`).textContent=`${t.reportIds.length}건`;let g=document.getElementById(`related-list`);g.innerHTML=`
    <div class="hs-accordion-group space-y-3">
      ${o.map((t,n)=>{let r=i(t.danger),o=a(t.category);return`
        <div class="hs-accordion bg-card border border-border rounded-xl overflow-hidden" id="acc-${t.id}">
          <button type="button"
            class="hs-accordion-toggle w-full flex gap-3 p-3 text-left hover:bg-surface/50 transition"
            aria-expanded="false" aria-controls="acc-body-${t.id}">
            <div class="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
              ${t.imageBase64?`<img src="${t.imageBase64}" class="w-full h-full object-cover" alt="제보 사진">`:`<div class="w-full h-full flex items-center justify-center">
                     <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/>
                     </svg>
                   </div>`}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1 mb-0.5">
                ${n===0?`<span class="text-[10px] text-primary font-semibold">대표 제보</span>`:``}
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
                <button type="button" class="btn-edit-report py-1.5 px-3 bg-surface border border-border text-foreground hover:bg-surface-1 rounded-lg text-xs font-semibold transition" data-id="${t.id}">
                  수정
                </button>
                <button type="button" class="btn-delete-report py-1.5 px-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-semibold transition" data-id="${t.id}">
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
        `}).join(``)}
    </div>
  `,window.HSAccordion&&window.HSAccordion.autoInit(),document.querySelectorAll(`.btn-edit-report`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),x(e.getAttribute(`data-id`))})}),document.querySelectorAll(`.btn-delete-report`).forEach(e=>{e.addEventListener(`click`,n=>{n.stopPropagation();let r=e.getAttribute(`data-id`);confirm(`이 제보를 삭제하시겠습니까?`)&&b(t,r)})}),document.getElementById(`like-count`).textContent=t.likes||0;let _=t.comments||[];document.getElementById(`comment-count`).textContent=`${_.length}개`;let S=document.getElementById(`comment-list`);_.length===0?S.innerHTML=`<p class="text-sm text-muted-foreground text-center py-4">아직 공유된 상황이 없습니다. 첫 번째로 상황을 공유해주세요!</p>`:S.innerHTML=_.map(t=>`
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
    `).join(``),f.classList.add(`hidden`),p.classList.remove(`hidden`)}function y(e){let t=document.getElementById(`carousel-wrap`);if(e.length===0){t.classList.add(`hidden`);return}let n=document.getElementById(`carousel-body`);n.innerHTML=e.map(e=>`
    <div class="hs-carousel-slide flex-shrink-0 w-full">
      <img src="${e.imageBase64}" alt="제보 사진"
        class="w-full object-cover" style="height:260px;">
    </div>
  `).join(``);let r=t.querySelector(`.hs-carousel-pagination`);r&&(r.innerHTML=e.map((e,t)=>`
      <span class="hs-carousel-pagination-item${t===0?` active`:``}">
        <span></span>
      </span>
    `).join(``)),e.length<=1&&(t.querySelector(`.hs-carousel-prev`)?.classList.add(`hidden`),t.querySelector(`.hs-carousel-next`)?.classList.add(`hidden`),r&&r.classList.add(`hidden`)),window.HSCarousel&&window.HSCarousel.autoInit()}g();async function b(e,n){await r(n),e.reportIds=e.reportIds.filter(e=>e!==n),e.reportIds.length===0?(await t(e.id),alert(`모든 제보가 삭제되어 군집이 사라졌습니다.`),location.href=`${d}index.html`):(e.representId===n&&(e.representId=e.reportIds[0]),await s(e),alert(`제보가 삭제되었습니다.`),location.reload())}async function x(e){let t=await n(e);if(!t)return;let r=prompt(`수정할 내용을 입력하세요 (상세 설명):`,t.description||``);if(r!==null&&r.trim()!==``){t.description=r.trim(),t.updatedAt=new Date().toISOString(),await c(t);let e=await o(h);e&&(e.updatedAt=new Date().toISOString(),await s(e)),alert(`제보 내용이 수정되었습니다.`),location.reload()}}