import{f as e,i as t,m as n,n as r,o as i,t as a,v as o}from"./theme-DokeXIS2.js";a();var s=[],c=[],l=new Map,u=null,d=[],f=!1,p=`all`,m=`all`,h=`all`,g=`all`,_=``,v=``,y=!1,b=null,x=30,S=document.getElementById(`kpi-summary-section`),C=document.getElementById(`admin-map-section`),w=document.getElementById(`side-stats-section`),T=document.getElementById(`table-container-section`),E=document.getElementById(`sheet-view-banner`),D=document.getElementById(`table-title-text`),O=document.getElementById(`table-head-row`),k=document.getElementById(`admin-report-table-body`),ee=document.getElementById(`filtered-count-badge`),te=document.getElementById(`stat-total-reports`),ne=document.getElementById(`stat-active-clusters`),A=document.getElementById(`stat-high-danger`),j=document.getElementById(`stat-resolved`),M=document.getElementById(`stat-resolve-rate`),N=document.getElementById(`stat-resolve-bar`),P=document.getElementById(`category-stats`),F=document.getElementById(`ranking-board`),I=document.getElementById(`current-time`),L=document.getElementById(`auto-refresh-status`),R=document.getElementById(`refresh-spinner`),re=document.getElementById(`btn-toggle-view-mode`),z=document.getElementById(`view-mode-btn-text`),ie=document.getElementById(`btn-back-to-dashboard`),ae=document.getElementById(`btn-manual-refresh`),oe=document.getElementById(`btn-export-csv`),se=document.getElementById(`btn-map-fit`),B=document.getElementById(`map-district-search`),V=document.getElementById(`btn-clear-district`),H=document.getElementById(`map-district-select`),U=document.getElementById(`admin-district-filter-select`),ce=document.getElementById(`admin-search-input`),le=document.getElementById(`admin-filter-danger`),ue=document.getElementById(`admin-filter-category`),W=document.querySelectorAll(`.status-tab-btn`),G=document.getElementById(`image-modal`),K=document.getElementById(`image-modal-img`),de=document.getElementById(`image-modal-title`),fe=document.getElementById(`btn-close-image-modal`);function pe(){I&&(I.textContent=new Date().toLocaleString(`ko-KR`,{year:`numeric`,month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}))}setInterval(pe,1e3),pe();function me(){b&&clearInterval(b),x=30,b=setInterval(()=>{x--,L&&(L.textContent=`자동 갱신: ${x}초 후`),x<=0&&(X(!0),x=30)},1e3)}function q(e){if(!e)return`기타 관할`;let t=e.trim().split(/\s+/);return t.length>=2?`${t[0]} ${t[1]}`:t[0]||`기타 관할`}function he(){let e=new Set;s.forEach(t=>{let n=l.get(t.representId)?.location?.address||t.location?.address||``;n&&e.add(q(n))});let t=Array.from(e).sort(),n=e=>`
      <option value="all">전체 관할 구역</option>
      ${t.map(t=>`<option value="${t}" ${e===t?`selected`:``}>${t}</option>`).join(``)}
    `;H&&(H.innerHTML=n(g)),U&&(U.innerHTML=n(g))}function ge(){let e=document.getElementById(`admin-map`),t=document.getElementById(`admin-map-loading`);if(!e)return;let n=0,r=()=>{n++,typeof kakao<`u`&&kakao.maps?kakao.maps.load(()=>{try{let n={center:new kakao.maps.LatLng(37.35,126.98),level:8};u=new kakao.maps.Map(e,n),f=!0,t&&(t.style.display=`none`);let r=new kakao.maps.ZoomControl;u.addControl(r,kakao.maps.ControlPosition.RIGHT),setTimeout(()=>{u&&(u.relayout(),J())},150)}catch(e){console.error(`[admin] Kakao Map init error:`,e),t&&(t.innerHTML=`<span class="text-xs text-red-400">지도를 생성하지 못했습니다.</span>`)}}):n<50?setTimeout(r,100):(console.warn(`[admin] Kakao Maps SDK load timeout`),t&&(t.innerHTML=`<span class="text-xs text-amber-400">카카오 지도 로드 실패 (네트워크 또는 키 확인 필요)</span>`))};r()}window.addEventListener(`resize`,()=>{u&&!y&&u.relayout()});function J(){if(!u||!f)return;d.forEach(e=>e.setMap(null)),d=[];let e=new kakao.maps.LatLngBounds,t=!1;Z().forEach(n=>{let i=Number(n.location?.lat),a=Number(n.location?.lng);if(!i||!a||isNaN(i)||isNaN(a))return;let o=new kakao.maps.LatLng(i,a);e.extend(o),t=!0;let s=n.status===`resolved`,c=s?`#3b82f6`:n.danger===`high`?`#ef4444`:n.danger===`medium`?`#f59e0b`:`#10b981`,f=`
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="12" fill="${c}" stroke="#ffffff" stroke-width="2.5" />
        <circle cx="15" cy="15" r="5" fill="#ffffff" />
      </svg>
    `,p=new kakao.maps.MarkerImage(`data:image/svg+xml;charset=utf-8,`+encodeURIComponent(f),new kakao.maps.Size(30,30),{offset:new kakao.maps.Point(15,15)}),m=new kakao.maps.Marker({position:o,image:p,map:u}),h=l.get(n.representId),g=h?.title||`위험 제보 구역`,_=h?.location?.address||n.location?.address||`위치 정보 없음`,v=`
      <div style="padding:10px 12px; min-width:210px; font-family:sans-serif; font-size:12px; color:#1e293b; line-height:1.4;">
        <div style="font-weight:700; margin-bottom:4px; font-size:13px; color:${c};">
          ${s?`✅ 조치 완료`:n.danger===`high`?`🚨 초고위험`:`⚠️ 주의`} [${r(n.category)}]
        </div>
        <div style="font-weight:600; margin-bottom:2px; word-break:break-all;">${g}</div>
        <div style="font-size:11px; color:#64748b; margin-bottom:8px;">${_}</div>
        <a href="detail.html?id=${n.id}" target="_blank" style="display:inline-block; padding:4px 10px; border-radius:6px; background:#e11d48; color:#ffffff; text-decoration:none; font-weight:700; font-size:11px;">
          상세 조치 보고서 ↗
        </a>
      </div>
    `,y=new kakao.maps.InfoWindow({content:v,removable:!0});kakao.maps.event.addListener(m,`click`,()=>{y.open(u,m)}),d.push(m)}),t&&d.length>0&&(u.setBounds(e),u.relayout())}function Y(e){if(!u||!f)return;if(!e||e===`all`){J();return}let t=s.filter(t=>(l.get(t.representId)?.location?.address||t.location?.address||``).includes(e));if(t.length>0){let e=new kakao.maps.LatLngBounds;t.forEach(t=>{t.location?.lat&&t.location?.lng&&e.extend(new kakao.maps.LatLng(Number(t.location.lat),Number(t.location.lng)))}),u.setBounds(e),u.relayout();return}if(typeof kakao<`u`&&kakao.maps&&kakao.maps.services)try{new kakao.maps.services.Geocoder().addressSearch(e,(e,t)=>{if(t===kakao.maps.services.Status.OK&&e.length>0){let t=new kakao.maps.LatLng(e[0].y,e[0].x);u.setCenter(t),u.setLevel(7),u.relayout()}})}catch(e){console.warn(`[admin] Geocoder address search failed:`,e)}}async function X(t=!1){!t&&R&&R.classList.add(`animate-spin`);try{let[t,r]=await Promise.all([e(),n()]);s=t||[],c=r||[],l.clear(),c.forEach(e=>l.set(e.id,e)),he(),_e(),ve(),ye(),Q(),J()}catch(e){console.error(`[admin] loadDashboard failed:`,e)}finally{R&&setTimeout(()=>R.classList.remove(`animate-spin`),400)}}function _e(){let e=c.length,t=0,n=0,r=0;s.forEach(e=>{e.status===`resolved`?r++:(t++,e.danger===`high`&&n++)});let i=s.length,a=i>0?Math.round(r/i*100):0;te&&(te.textContent=e.toLocaleString()),ne&&(ne.textContent=t.toLocaleString()),A&&(A.textContent=n.toLocaleString()),j&&(j.textContent=r.toLocaleString()),M&&(M.textContent=`${a}%`),N&&(N.style.width=`${a}%`)}function ve(){if(!P)return;P.innerHTML=``;let e={},t=0;s.forEach(n=>{if(n.status!==`resolved`){let r=n.category||`기타`;e[r]=(e[r]||0)+1,t++}});let n=Object.entries(e).sort((e,t)=>t[1]-e[1]);if(n.length===0){P.innerHTML=`<div class="text-xs text-muted-foreground text-center py-6">현재 접수된 미해결 위험이 없습니다.</div>`;return}n.forEach(([e,n])=>{let i=t>0?Math.round(n/t*100):0,a=r(e),o=document.createElement(`div`);o.className=`w-full flex flex-col gap-1`,o.innerHTML=`
      <div class="flex justify-between items-center text-xs">
        <span class="font-medium text-foreground">${a}</span>
        <span class="text-muted-foreground font-semibold">${n}건 <span class="text-[10px] text-muted-foreground/70">(${i}%)</span></span>
      </div>
      <div class="w-full bg-surface-1 rounded-full h-2 overflow-hidden border border-border/40">
        <div class="bg-primary h-full rounded-full transition-all duration-500" style="width: ${i}%"></div>
      </div>
    `,P.appendChild(o)})}function ye(){if(!F)return;F.innerHTML=``;let e={};s.forEach(t=>{if(t.status===`resolved`&&t.resolvedAt&&t.createdAt){let n=q(l.get(t.representId)?.location?.address||t.location?.address||``),r=Math.max(0,t.resolvedAt-t.createdAt);e[n]||(e[n]={totalMs:0,count:0}),e[n].totalMs+=r,e[n].count++}});let t=Object.entries(e).map(([e,t])=>({name:e,avgMs:t.totalMs/t.count,count:t.count})).sort((e,t)=>e.avgMs-t.avgMs);if(t.length===0){F.innerHTML=`<div class="text-xs text-muted-foreground text-center py-6">해결된 위험 데이터가 아직 없습니다.</div>`;return}let n=[`🥇`,`🥈`,`🥉`];t.forEach((e,t)=>{let r=e.avgMs/(1e3*60*60),i=r>=24?`${(r/24).toFixed(1)}일`:`${Math.max(1,Math.round(r))}시간`,a=document.createElement(`div`);a.className=`flex items-center justify-between p-2.5 rounded-xl bg-surface/50 border border-border/70 hover:bg-surface transition-all`,a.innerHTML=`
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="text-lg flex-shrink-0">${t<3?n[t]:`<span class="text-xs font-bold text-muted-foreground w-5 text-center inline-block">${t+1}</span>`}</span>
        <div class="truncate">
          <p class="font-bold text-foreground text-xs truncate">${e.name}</p>
          <p class="text-[10px] text-muted-foreground">누적 조치: ${e.count}건</p>
        </div>
      </div>
      <div class="text-right flex-shrink-0 pl-2">
        <p class="text-xs font-extrabold text-primary tabular-nums">${i}</p>
        <p class="text-[9px] text-muted-foreground">평균 대응</p>
      </div>
    `,F.appendChild(a)})}function Z(){return s.filter(e=>{let t=l.get(e.representId),n=t?.location?.address||e.location?.address||``;if(p!==`all`&&e.status!==p||m!==`all`&&e.danger!==m||h!==`all`&&e.category!==h)return!1;if(g!==`all`){let e=q(n);if(!e.includes(g)&&!g.includes(e))return!1}if(v){let e=v.toLowerCase();if(!n.toLowerCase().includes(e))return!1}if(_){let e=_.toLowerCase(),r=(t?.title||``).toLowerCase(),i=(t?.description||``).toLowerCase(),a=n.toLowerCase();if(!r.includes(e)&&!i.includes(e)&&!a.includes(e))return!1}return!0})}function be(){O&&(y?O.innerHTML=`
      <th class="px-3 py-3 w-16">관리번호</th>
      <th class="px-3 py-3">상태</th>
      <th class="px-3 py-3">위험도</th>
      <th class="px-3 py-3">분야</th>
      <th class="px-3 py-3">지역구</th>
      <th class="px-3 py-3 min-w-[180px]">상세 위치 (주소)</th>
      <th class="px-3 py-3 min-w-[160px]">대표 제보명</th>
      <th class="px-3 py-3 min-w-[200px]">상세 설명</th>
      <th class="px-3 py-3 text-center">현장 사진</th>
      <th class="px-3 py-3">접수 일시</th>
      <th class="px-3 py-3">해결 일시</th>
      <th class="px-3 py-3 text-center">공감수</th>
      <th class="px-3 py-3 text-right sticky right-0 bg-surface/90 shadow-sm z-10">현장 조치 액션</th>
    `:O.innerHTML=`
      <th class="px-4 py-3">상태</th>
      <th class="px-4 py-3">위험도</th>
      <th class="px-4 py-3">분야</th>
      <th class="px-4 py-3">위치 (대표 주소)</th>
      <th class="px-4 py-3">제보 제목 / 설명</th>
      <th class="px-4 py-3 text-center">사진</th>
      <th class="px-4 py-3">접수 일시</th>
      <th class="px-4 py-3 text-center">공감수</th>
      <th class="px-4 py-3 text-right">현장 조치 액션</th>
    `)}function Q(){if(!k)return;be(),k.innerHTML=``;let e=Z();e.sort((e,t)=>{if(e.status!==t.status)return e.status===`active`?-1:1;let n={high:3,medium:2,low:1},r=n[e.danger]||1,i=n[t.danger]||1;return r===i?(t.createdAt||0)-(e.createdAt||0):i-r}),ee&&(ee.textContent=`총 ${e.length}건`);let n=y?13:9;if(e.length===0){k.innerHTML=`
      <tr>
        <td colspan="${n}" class="px-4 py-12 text-center text-muted-foreground">
          조건에 부합하는 위험 제보 데이터가 없습니다.
        </td>
      </tr>
    `;return}e.forEach(e=>{let n=l.get(e.representId),a=e.status===`resolved`,o=t(e.danger),s=n?.location?.address||e.location?.address||`위치 정보 없음`,c=q(s),u=n?.title||`대표 제보`,d=n?.description||``,f=i(e.createdAt||Date.now()),p=e.createdAt?new Date(e.createdAt).toLocaleDateString(`ko-KR`,{month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`}):`-`,m=e.resolvedAt?new Date(e.resolvedAt).toLocaleDateString(`ko-KR`,{month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`}):`-`,h=n?.imageBase64||null,g=(e.id||``).slice(0,8),_=document.createElement(`tr`);_.className=`hover:bg-surface/40 transition-colors ${a?`opacity-80`:``}`,y?_.innerHTML=`
        <td class="px-3 py-3 font-mono text-muted-foreground text-[11px]">${g}</td>
        <td class="px-3 py-3">
          ${a?`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                 완료
               </span>`:`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                 미해결
               </span>`}
        </td>
        <td class="px-3 py-3">
          <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${o.bg} ${o.text}">
            ${o.label}
          </span>
        </td>
        <td class="px-3 py-3 text-muted-foreground font-medium">${r(e.category)}</td>
        <td class="px-3 py-3 font-bold text-foreground">${c}</td>
        <td class="px-3 py-3 text-foreground truncate max-w-[220px]" title="${s}">${s}</td>
        <td class="px-3 py-3 font-semibold text-foreground truncate max-w-[180px]" title="${u}">${u}</td>
        <td class="px-3 py-3 text-muted-foreground truncate max-w-[220px]" title="${d}">${d||`-`}</td>
        <td class="px-3 py-3 text-center">
          ${h?`
            <button type="button" class="btn-preview-image p-0.5 rounded hover:bg-surface border border-border inline-block" data-img="${h}" data-title="${u}" title="사진 확대">
              <img src="${h}" class="w-6 h-6 rounded object-cover" alt="사진">
            </button>
          `:`<span class="text-muted-foreground text-[10px]">-</span>`}
        </td>
        <td class="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">${p}</td>
        <td class="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">${m}</td>
        <td class="px-3 py-3 text-center font-bold text-red-500">${e.likes||0}</td>
        <td class="px-3 py-3 text-right sticky right-0 bg-background/95 backdrop-blur-sm shadow-sm z-10">
          <div class="inline-flex items-center gap-1 justify-end">
            <button type="button" 
              class="btn-toggle-action px-2 py-0.5 rounded text-[11px] font-bold transition-all ${a?`bg-surface hover:bg-surface-1 border border-border text-muted-foreground`:`bg-primary text-white hover:bg-primary/90`}"
              data-id="${e.id}">
              ${a?`재접수`:`조치완료`}
            </button>
            <a href="detail.html?id=${e.id}" target="_blank" class="p-1 rounded border border-border bg-surface hover:bg-surface-1 text-foreground" title="보고서">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
            </a>
          </div>
        </td>
      `:_.innerHTML=`
        <td class="px-4 py-3">
          ${a?`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                 <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                 해결 완료
               </span>`:`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                 <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                 진행 중
               </span>`}
        </td>

        <td class="px-4 py-3">
          <span class="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${o.bg} ${o.text}">
            ${o.label}
          </span>
        </td>

        <td class="px-4 py-3 text-muted-foreground font-medium">
          ${r(e.category)}
        </td>

        <td class="px-4 py-3 text-foreground font-medium max-w-[200px] truncate" title="${s}">
          <span class="font-bold text-primary mr-1">[${c}]</span>${s}
        </td>

        <td class="px-4 py-3 max-w-[240px]">
          <p class="font-bold text-foreground truncate" title="${u}">${u}</p>
          <p class="text-[11px] text-muted-foreground truncate" title="${d}">${d||`-`}</p>
        </td>

        <td class="px-4 py-3 text-center">
          ${h?`
            <button type="button" class="btn-preview-image p-1 rounded-lg hover:bg-surface border border-border inline-block transition-transform hover:scale-105" data-img="${h}" data-title="${u}" title="현장 사진 확대">
              <img src="${h}" class="w-8 h-8 rounded-md object-cover" alt="사진">
            </button>
          `:`
            <span class="text-[10px] text-muted-foreground">-</span>
          `}
        </td>

        <td class="px-4 py-3 text-muted-foreground whitespace-nowrap">
          ${f}
        </td>

        <td class="px-4 py-3 text-center font-bold text-red-500">
          ${e.likes||0}
        </td>

        <td class="px-4 py-3 text-right">
          <div class="inline-flex items-center gap-1.5 justify-end">
            <button type="button" 
              class="btn-toggle-action px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${a?`bg-surface hover:bg-surface-1 border border-border text-muted-foreground`:`bg-primary text-white hover:bg-primary/90`}"
              data-id="${e.id}">
              ${a?`재접수 전환`:`조치 완료`}
            </button>
            <a href="detail.html?id=${e.id}" target="_blank"
              class="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-1 text-foreground transition"
              title="상세 보고서 보기">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
              </svg>
            </a>
          </div>
        </td>
      `,k.appendChild(_)}),xe()}function xe(){document.querySelectorAll(`.btn-toggle-action`).forEach(e=>{e.addEventListener(`click`,async t=>{t.stopPropagation(),await Se(e.getAttribute(`data-id`))})}),document.querySelectorAll(`.btn-preview-image`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),Te(e.getAttribute(`data-img`),e.getAttribute(`data-title`))})})}async function Se(e){let t=s.find(t=>t.id===e);if(!t)return;let n=t.status===`resolved`?`active`:`resolved`;t.status=n,t.resolvedAt=n===`resolved`?Date.now():null,t.updatedAt=Date.now(),await o(t),await X(!0)}function Ce(e=null){y=e===null?!y:e,y?(S&&(S.style.display=`none`),C&&(C.style.display=`none`),w&&(w.style.display=`none`),E&&(E.classList.remove(`hidden`),E.classList.add(`flex`)),T&&(T.classList.remove(`lg:col-span-2`),T.classList.add(`lg:col-span-3`)),z&&(z.textContent=`대시보드 복귀`),D&&(D.textContent=`📑 전면 스프레드시트 시트 뷰 (Sheet View)`)):(S&&(S.style.display=``),C&&(C.style.display=``),w&&(w.style.display=``),E&&(E.classList.add(`hidden`),E.classList.remove(`flex`)),T&&(T.classList.remove(`lg:col-span-3`),T.classList.add(`lg:col-span-2`)),z&&(z.textContent=`시트뷰로 전환`),D&&(D.textContent=`실시간 위험 제보 관제 콘솔`),setTimeout(()=>{u&&(u.relayout(),J())},100)),Q()}function we(){let e=Z();if(e.length===0){alert(`내보낼 데이터가 없습니다.`);return}let t=[`관리ID`,`진행상태`,`위험도`,`분야`,`지역구`,`위치(주소)`,`대표제보명`,`상세설명`,`제보일시`,`해결일시`,`주민공감수`],n=e.map(e=>{let t=l.get(e.representId),n=e.status===`resolved`?`해결 완료`:`미해결 진행 중`,i=e.danger===`high`?`초고위험`:e.danger===`medium`?`보통`:`낮음`,a=r(e.category),o=t?.location?.address||e.location?.address||``,s=q(o),c=`"${o.replace(/"/g,`""`)}"`,u=`"${(t?.title||``).replace(/"/g,`""`)}"`,d=`"${(t?.description||``).replace(/"/g,`""`)}"`,f=e.createdAt?new Date(e.createdAt).toLocaleString(`ko-KR`):``,p=e.resolvedAt?new Date(e.resolvedAt).toLocaleString(`ko-KR`):``,m=e.likes||0;return[e.id,n,i,a,s,c,u,d,f,p,m].join(`,`)}),i=`﻿`+[t.join(`,`),...n].join(`\r
`),a=new Blob([i],{type:`text/csv;charset=utf-8;`}),o=URL.createObjectURL(a),s=document.createElement(`a`),c=new Date().toISOString().slice(0,10).replace(/-/g,``);s.href=o,s.download=`fermata_safety_admin_report_${c}.csv`,s.click(),URL.revokeObjectURL(o)}function Te(e,t){!G||!K||(K.src=e,de&&(de.textContent=t||`현장 제보 사진`),G.classList.remove(`hidden`),G.classList.add(`flex`))}function $(){G&&(G.classList.add(`hidden`),G.classList.remove(`flex`))}function Ee(){re?.addEventListener(`click`,()=>Ce()),ie?.addEventListener(`click`,()=>Ce(!1)),B?.addEventListener(`input`,e=>{v=e.target.value.trim(),V&&(v?V.classList.remove(`hidden`):V.classList.add(`hidden`)),Q(),J()}),B?.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let e=B.value.trim();e&&Y(e)}}),V?.addEventListener(`click`,()=>{B&&(B.value=``),v=``,V.classList.add(`hidden`),Q(),J()}),H?.addEventListener(`change`,e=>{g=e.target.value,U&&(U.value=g),Q(),Y(g)}),U?.addEventListener(`change`,e=>{g=e.target.value,H&&(H.value=g),Q(),Y(g)}),W.forEach(e=>{e.addEventListener(`click`,()=>{W.forEach(e=>{e.classList.remove(`bg-primary`,`text-white`),e.classList.add(`text-muted-foreground`)}),e.classList.remove(`text-muted-foreground`),e.classList.add(`bg-primary`,`text-white`),p=e.getAttribute(`data-status`),Q(),J()})}),ce?.addEventListener(`input`,e=>{_=e.target.value.trim(),Q(),J()}),le?.addEventListener(`change`,e=>{m=e.target.value,Q(),J()}),ue?.addEventListener(`change`,e=>{h=e.target.value,Q(),J()}),ae?.addEventListener(`click`,()=>{X(),x=30}),oe?.addEventListener(`click`,we),se?.addEventListener(`click`,()=>{J()}),fe?.addEventListener(`click`,$),G?.addEventListener(`click`,e=>{e.target===G&&$()}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&$()})}ge(),Ee(),X(),me();