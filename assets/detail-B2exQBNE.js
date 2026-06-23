import{a as e,c as t,r as n,t as r,u as i}from"./utils-Y9Y7vo0D.js";var a=`/2026_HS_Hackathon/`;document.getElementById(`nav-home`).href=`${a}index.html`,document.getElementById(`nav-home-fallback`).href=`${a}index.html`;var o=document.getElementById(`loading-state`),s=document.getElementById(`detail-content`),c=document.getElementById(`error-state`),l=new URLSearchParams(location.search).get(`id`);function u(){if(!l){d();return}let e=t(l);if(!e){d();return}let n=i(e.representId);if(!n){d();return}f(e,n)}function d(){o.classList.add(`hidden`),c.classList.remove(`hidden`)}function f(t,a){let c=t.reportIds.map(e=>i(e)).filter(Boolean).filter(e=>e.imageBase64);p(c);let l=n(t.danger),u=r(t.category);document.getElementById(`badge-area`).innerHTML=`
    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${l.bg} ${l.text}">${l.label}</span>
    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground">${u}</span>
    ${t.reportIds.length>1?`<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">제보 ${t.reportIds.length}건</span>`:``}
  `,document.getElementById(`cluster-title`).textContent=a.title,document.getElementById(`cluster-description`).textContent=a.description||`상세 설명이 없습니다.`,document.getElementById(`cluster-address`).textContent=a.location.address||`위치 정보 없음`,document.getElementById(`cluster-time`).textContent=`${e(t.createdAt)} 최초 등록 · ${e(t.updatedAt)} 업데이트`,document.getElementById(`related-count`).textContent=`${t.reportIds.length}건`;let d=document.getElementById(`related-list`);d.innerHTML=`
    <div class="hs-accordion-group space-y-3">
      ${c.map((t,i)=>{let a=n(t.danger),o=r(t.category);return`
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
                ${i===0?`<span class="text-[10px] text-primary font-semibold">대표 제보</span>`:``}
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
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${a.bg} ${a.text}">${a.label}</span>
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
            </div>
          </div>
        </div>
        `}).join(``)}
    </div>
  `,window.HSAccordion&&window.HSAccordion.autoInit(),o.classList.add(`hidden`),s.classList.remove(`hidden`)}function p(e){let t=document.getElementById(`carousel-wrap`);if(e.length===0){t.classList.add(`hidden`);return}let n=document.getElementById(`carousel-body`);n.innerHTML=e.map(e=>`
    <div class="hs-carousel-slide flex-shrink-0 w-full">
      <img src="${e.imageBase64}" alt="제보 사진"
        class="w-full object-cover" style="height:260px;">
    </div>
  `).join(``);let r=t.querySelector(`.hs-carousel-pagination`);r&&(r.innerHTML=e.map((e,t)=>`
      <span class="hs-carousel-pagination-item${t===0?` active`:``}">
        <span></span>
      </span>
    `).join(``)),e.length<=1&&(t.querySelector(`.hs-carousel-prev`)?.classList.add(`hidden`),t.querySelector(`.hs-carousel-next`)?.classList.add(`hidden`),r&&r.classList.add(`hidden`)),window.HSCarousel&&window.HSCarousel.autoInit()}u();