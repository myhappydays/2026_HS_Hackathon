import{d as e,f as t,i as n,l as r,n as i,o as a,p as o,t as s,u as c,v as l,y as u}from"./theme-DokeXIS2.js";import{n as d,t as f}from"./shareCard-CzhhPJKP.js";import"./auth-CNK7nXcO.js";s();var p=`/2026_HS_Hackathon/`,m=document.getElementById(`nav-home`);m&&(m.href=`${p}index.html`);var h=document.getElementById(`nav-home-fallback`);h&&(h.href=`${p}index.html`);var g=document.getElementById(`loading-state`),_=document.getElementById(`detail-content`),v=document.getElementById(`error-state`),y=new URLSearchParams(location.search).get(`id`);function b(){g&&g.classList.add(`hidden`),_&&_.classList.add(`hidden`),v&&v.classList.remove(`hidden`)}async function x(){try{let n=null;if(y)n=await e(y);else{let e=await t();if(e&&e.length>0)n=e[0];else{b();return}}if(!n){let t=await o(y);t&&(t.clusterId&&(n=await e(t.clusterId)),n||={id:t.clusterId||t.id,representId:t.id,reportIds:[t.id],location:t.location,danger:t.danger,category:t.category,status:t.status||`active`,createdAt:t.createdAt})}if(n||=(await t()).find(e=>e.id===y||e.reportIds&&e.reportIds.includes(y)),!n){b();return}let r=n.representId?await o(n.representId):null;if(!r&&Array.isArray(n.reportIds)&&n.reportIds.length>0)for(let e of n.reportIds){let t=await o(e);if(t){r=t,n.representId=t.id;break}}r||={id:n.representId||n.id,title:n.title||`위험 제보 상세`,description:n.description||``,location:n.location||{address:`위치 정보 없음`},danger:n.danger||`medium`,category:n.category||`road`,createdAt:n.createdAt||Date.now()},await w(n,r);try{f(()=>({clusters:[n],reportsMap:new Map([[r.id,r]]),targetLat:n.location?.lat,targetLng:n.location?.lng,currentRegionName:r.location?.address||``}))}catch(e){console.warn(`[detail] initShareCard error:`,e)}document.getElementById(`btn-share-card`)?.addEventListener(`click`,()=>{d({type:`report`,report:r,cluster:n})}),S(n),C(n,r)}catch(e){console.error(`[detail] Init failed:`,e),b()}}function S(e){let t=()=>{try{return JSON.parse(localStorage.getItem(`my_likes`)||`[]`)}catch{return[]}},n=document.getElementById(`btn-like`);n&&(t().includes(e.id)&&(n.classList.replace(`bg-primary/10`,`bg-primary`),n.classList.replace(`text-primary`,`text-white`),n.classList.add(`opacity-80`,`cursor-not-allowed`),n.innerHTML=`⚠️ 공감 완료 <span id="like-count" class="ml-1 text-white">${e.likes||0}</span>`),n._hasListener||(n._hasListener=!0,n.addEventListener(`click`,async()=>{let r=t();if(r.includes(e.id)){alert(`이미 공감(위험 확인)을 표시한 제보입니다.`);return}e.likes=(e.likes||0)+1,await l(e),r.push(e.id),localStorage.setItem(`my_likes`,JSON.stringify(r)),n.classList.replace(`bg-primary/10`,`bg-primary`),n.classList.replace(`text-primary`,`text-white`),n.classList.add(`opacity-80`,`cursor-not-allowed`),n.innerHTML=`⚠️ 공감 완료 <span id="like-count" class="ml-1 text-white">${e.likes}</span>`})))}function C(e,t){let n=document.getElementById(`comment-form`),r=document.getElementById(`btn-comment-submit`),i=async n=>{n&&n.preventDefault&&n.preventDefault();let r=document.getElementById(`comment-input`),i=r?r.value.trim():``;if(!i){alert(`공유할 상황을 입력해주세요.`);return}e.comments||=[];let a=[`익명의 주민`,`동네 보안관`,`지나가는 행인`,`안전 요원`,`목격자`],o=a[Math.floor(Math.random()*a.length)];e.comments.push({id:Date.now().toString(),text:i,author:o,createdAt:new Date().toISOString()}),await l(e),r&&(r.value=``),await w(e,t)};n&&!n._hasListener?(n._hasListener=!0,n.addEventListener(`submit`,i)):r&&!r._hasListener&&(r._hasListener=!0,r.addEventListener(`click`,i))}async function w(e,t){let r=[];try{Array.isArray(e.reportIds)&&e.reportIds.length>0&&(r=(await Promise.all(e.reportIds.map(e=>o(e)))).filter(Boolean))}catch(e){console.warn(`[detail] Fetching cluster reports failed:`,e)}r.length===0&&t&&(r=[t]),D(e,t,r);let s=e.status===`resolved`,c=n(e.danger),l=document.getElementById(`badge-area`),d=document.getElementById(`cluster-danger-badge`),f=document.getElementById(`cluster-cat-badge`),p=document.getElementById(`cluster-count-badge`);!d&&l&&(d=document.createElement(`span`),d.id=`cluster-danger-badge`,l.appendChild(d)),!f&&l&&(f=document.createElement(`span`),f.id=`cluster-cat-badge`,l.appendChild(f)),!p&&l&&(p=document.createElement(`span`),p.id=`cluster-count-badge`,l.appendChild(p)),d&&(s?(d.className=`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400`,d.innerHTML=`
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
        </svg>
        해결 완료
      `):(d.className=`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`,d.textContent=c.label)),f&&(f.className=`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground border border-border`,f.textContent=i(e.category)),p&&(e.reportIds&&e.reportIds.length>1?(p.className=`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20`,p.textContent=`${e.reportIds.length}건 묶임`,p.classList.remove(`hidden`)):p.classList.add(`hidden`));let m=document.getElementById(`cluster-title`);m&&(m.textContent=t.title||`위험 제보`);let h=document.getElementById(`cluster-description`);h&&(h.textContent=t.description||``);let y=document.getElementById(`cluster-address`);y&&(y.textContent=t.location?.address||e.location?.address||`위치 정보 없음`);let b=document.getElementById(`cluster-time`);b&&(b.textContent=`${a(e.createdAt||t.createdAt||Date.now())} 제보`);let x=document.getElementById(`related-count`),S=document.getElementById(`related-list`);if(x&&(x.textContent=`총 ${r.length}건`),S){if(S.innerHTML=`
      <div class="hs-accordion-group space-y-2">
        ${r.map((e,t)=>{let r=n(e.danger),o=i(e.category),s=!e.userId||e.userId===`anonymous`||currentUser&&currentUser.uid===e.userId;return`
          <div class="hs-accordion bg-surface border border-border rounded-xl overflow-hidden" id="acc-${e.id}">
            <button class="hs-accordion-toggle hs-accordion-active:text-primary w-full py-3 px-4 flex items-center justify-between text-left text-sm font-medium text-foreground hover:bg-surface-1 transition gap-3"
              aria-controls="acc-body-${e.id}">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.bg} ${r.text}">${r.label}</span>
                  <span class="text-[10px] text-muted-foreground">${o}</span>
                  <span class="text-[10px] text-muted-foreground ml-auto">${a(e.createdAt)}</span>
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
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-muted-foreground">${o}</span>
                </div>
                ${(()=>{let t=e.imageBase64||e.imageUrl||e.image||e.photo||e.photoURL||null;return t?`
                  <div class="relative group cursor-pointer overflow-hidden rounded-xl border border-border bg-black/10"
                    onclick="window.__openDetailLightbox && window.__openDetailLightbox('${encodeURIComponent(t)}', '${encodeURIComponent(e.title||`현장 사진`)}')">
                    <img src="${t}" alt="제보 사진" class="w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-105" style="max-height:220px;" onerror="this.parentElement.style.display='none'">
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span class="px-3 py-1.5 rounded-full text-xs font-semibold bg-black/80 text-white backdrop-blur-sm border border-white/20 flex items-center gap-1.5 shadow-lg">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"/></svg>
                        사진 원본 확대
                      </span>
                    </div>
                  </div>`:``})()}
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
                    <span>${a(e.createdAt)}</span>
                  </div>
                </div>
                <div class="flex justify-end gap-2 mt-3 pt-3 border-t border-border/50">
                  ${s?`
                  <button type="button" class="btn-edit-report py-1.5 px-3 bg-surface border border-border text-foreground hover:bg-surface-1 rounded-lg text-xs font-semibold transition" data-id="${e.id}">
                    수정
                  </button>
                  <button type="button" class="btn-delete-report py-1.5 px-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-semibold transition" data-id="${e.id}">
                    삭제
                  </button>
                  `:`
                  <button type="button" class="btn-report-report py-1.5 px-3 bg-surface border border-border text-muted-foreground hover:text-red-500 rounded-lg text-xs font-medium transition" data-id="${e.id}">
                    🚨 신고
                  </button>
                  `}
                </div>
              </div>
            </div>
          </div>
          `}).join(``)}
      </div>
    `,window.HSAccordion)try{window.HSAccordion.autoInit()}catch{}document.querySelectorAll(`.btn-report-report`).forEach(e=>{e.addEventListener(`click`,async t=>{t.stopPropagation();let n=e.getAttribute(`data-id`);if(confirm(`이 제보를 불량/허위 제보로 신고하시겠습니까?`)){let e=r.find(e=>e.id===n);e&&(e.reportCount=(e.reportCount||0)+1,await u(e),alert(`신고가 접수되었습니다. (누적 신고: `+e.reportCount+`회)`))}})}),document.querySelectorAll(`.btn-edit-report`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),N(e.getAttribute(`data-id`))})}),document.querySelectorAll(`.btn-delete-report`).forEach(t=>{t.addEventListener(`click`,n=>{n.stopPropagation();let r=t.getAttribute(`data-id`);confirm(`이 제보를 삭제하시겠습니까?`)&&M(e,r)})})}let C=document.getElementById(`like-count`);C&&(C.textContent=e.likes||0);let w=e.comments||[],T=document.getElementById(`comment-count`);T&&(T.textContent=`${w.length}개`);let E=document.getElementById(`comment-list`);E&&(w.length===0?E.innerHTML=`<p class="text-sm text-muted-foreground text-center py-4">아직 공유된 상황이 없습니다. 첫 번째로 상황을 공유해주세요!</p>`:E.innerHTML=w.map(e=>`
        <div class="flex gap-2">
          <div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
            ${(e.author||`익`).charAt(0)}
          </div>
          <div class="flex-1 bg-surface border border-border rounded-lg rounded-tl-none p-3">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs font-semibold text-foreground">${e.author||`익명`}</span>
              <span class="text-[10px] text-muted-foreground">${a(e.createdAt)}</span>
            </div>
            <p class="text-sm text-foreground">${e.text}</p>
          </div>
        </div>
      `).join(``)),g&&g.classList.add(`hidden`),v&&v.classList.add(`hidden`),_&&_.classList.remove(`hidden`)}var T=0;function E(e){return e&&(e.imageBase64||e.imageUrl||e.image||e.photo||e.photoURL)||null}function D(e,t,n){let r=document.getElementById(`carousel-wrap`),o=document.getElementById(`carousel-track`),s=document.getElementById(`carousel-counter-badge`),c=document.getElementById(`carousel-caption-title`),l=document.getElementById(`carousel-caption-sub`),u=document.getElementById(`btn-carousel-prev`),d=document.getElementById(`btn-carousel-next`),f=document.getElementById(`carousel-dots`),p=document.getElementById(`btn-zoom-image`),m=document.getElementById(`no-photo-banner`),h=[],g=new Set;function _(e,t,n,r,i){!e||typeof e!=`string`||e.trim()===``||g.has(e)||(g.add(e),h.push({src:e,title:t||`위험 현장 사진`,author:n||`시민 제보`,danger:r||`medium`,createdAt:i||Date.now()}))}if(Array.isArray(n)&&n.forEach(e=>{let t=E(e);t&&_(t,e.title,e.author,e.danger,e.createdAt)}),t){let e=E(t);e&&_(e,t.title,t.author,t.danger,t.createdAt)}if(e){let t=E(e);t&&_(t,e.title||`위험 현장`,`관제 시스템`,e.danger,e.createdAt)}if(T=0,h.length===0){if(r&&r.classList.add(`hidden`),m){m.classList.remove(`hidden`);let t=document.getElementById(`no-photo-icon`),n=document.getElementById(`no-photo-category`);t&&(t.textContent={road:`🕳️`,weather:`🌊`,facility:`⚠️`,safety:`🛡️`}[e?.category]||`⚠️`),n&&(n.textContent=i(e?.category||`road`))}return}if(m&&m.classList.add(`hidden`),r&&r.classList.remove(`hidden`),!o)return;o.innerHTML=h.map((e,t)=>`
    <div class="carousel-slide-item w-full h-full flex-shrink-0 relative overflow-hidden flex items-center justify-center bg-black/40 cursor-zoom-in" data-index="${t}">
      <img src="${e.src}" alt="${e.title}" class="w-full h-full object-cover select-none transition-transform duration-300" onerror="this.parentElement.style.opacity='0.4'">
    </div>
  `).join(``),f&&(h.length<=1?(f.innerHTML=``,f.classList.add(`hidden`)):(f.classList.remove(`hidden`),f.innerHTML=h.map((e,t)=>`
        <span class="carousel-dot ${t===0?`active`:``}" data-index="${t}"></span>
      `).join(``))),h.length<=1?(u?.classList.add(`hidden`),d?.classList.add(`hidden`)):(u?.classList.remove(`hidden`),d?.classList.remove(`hidden`));function v(e){if(h.length===0)return;T=(e+h.length)%h.length,o.style.transform=`translateX(-${T*100}%)`,s&&(s.textContent=`${T+1} / ${h.length}`);let t=h[T];c&&(c.textContent=t.title),l&&(l.textContent=`제보자: ${t.author} · ${a(t.createdAt)}`),f&&f.querySelectorAll(`.carousel-dot`).forEach((e,t)=>{t===T?e.classList.add(`active`):e.classList.remove(`active`)})}v(0),u&&!u._hasListener&&(u._hasListener=!0,u.addEventListener(`click`,e=>{e.stopPropagation(),v(T-1)})),d&&!d._hasListener&&(d._hasListener=!0,d.addEventListener(`click`,e=>{e.stopPropagation(),v(T+1)})),f&&!f._hasListener&&(f._hasListener=!0,f.addEventListener(`click`,e=>{let t=e.target.closest(`.carousel-dot`);if(t){e.stopPropagation();let n=parseInt(t.getAttribute(`data-index`),10);isNaN(n)||v(n)}})),o.querySelectorAll(`.carousel-slide-item`).forEach(e=>{e.addEventListener(`click`,()=>{let t=h[parseInt(e.getAttribute(`data-index`),10)||T];t&&O(t.src,t.title)})}),p&&!p._hasListener&&(p._hasListener=!0,p.addEventListener(`click`,e=>{e.stopPropagation();let t=h[T];t&&O(t.src,t.title)}));let y=document.getElementById(`carousel-viewport`);if(y&&!y._hasTouch){y._hasTouch=!0;let e=0,t=0,n=!1;y.addEventListener(`touchstart`,r=>{h.length<=1||(e=r.touches[0].clientX,t=r.touches[0].clientY,n=!0)},{passive:!0}),y.addEventListener(`touchmove`,r=>{if(!n||h.length<=1)return;let i=r.touches[0].clientX-e,a=r.touches[0].clientY-t;Math.abs(i)>Math.abs(a)&&Math.abs(i)>10&&r.cancelable&&r.preventDefault()},{passive:!1}),y.addEventListener(`touchend`,t=>{if(!n||h.length<=1)return;n=!1;let r=t.changedTouches[0].clientX-e;r>40?v(T-1):r<-40&&v(T+1)},{passive:!0})}}function O(e,t){let n=document.getElementById(`image-lightbox-modal`),r=document.getElementById(`lightbox-image`),i=document.getElementById(`lightbox-caption`);!n||!r||(r.src=e,i&&(i.textContent=t||`현장 사진 확대 보기`),n.classList.remove(`hidden`),document.body.style.overflow=`hidden`)}function k(){let e=document.getElementById(`image-lightbox-modal`),t=document.getElementById(`lightbox-image`);e&&(e.classList.add(`hidden`),t&&(t.src=``),document.body.style.overflow=``)}window.__openDetailLightbox=(e,t)=>{try{O(decodeURIComponent(e),decodeURIComponent(t))}catch{O(e,t)}};var A=document.getElementById(`btn-close-lightbox`);A&&!A._hasListener&&(A._hasListener=!0,A.addEventListener(`click`,k));var j=document.getElementById(`image-lightbox-modal`);j&&!j._hasListener&&(j._hasListener=!0,j.addEventListener(`click`,e=>{(e.target===j||e.target.id===`lightbox-container`)&&k()})),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&k()}),x();async function M(e,t){await c(t),e.reportIds=(e.reportIds||[]).filter(e=>e!==t),e.reportIds.length===0?(await r(e.id),alert(`모든 제보가 삭제되어 군집이 사라졌습니다.`),location.href=`${p}index.html`):(e.representId===t&&(e.representId=e.reportIds[0]),await l(e),alert(`제보가 삭제되었습니다.`),location.reload())}async function N(t){let n=await o(t);if(!n)return;let r=prompt(`수정할 내용을 입력하세요 (상세 설명):`,n.description||``);if(r!==null&&r.trim()!==``){n.description=r.trim(),n.updatedAt=new Date().toISOString(),await u(n);let t=await e(y);t&&(t.updatedAt=new Date().toISOString(),await l(t)),alert(`제보 내용이 수정되었습니다.`),location.reload()}}