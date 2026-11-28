import{S as e,a as t,c as n,d as r,i,j as a,k as o,m as s,n as c,p as l,r as u,s as d,t as f,u as p,w as m}from"./auth-Ced2N3Kp.js";d();var h=[],g=[],_=new Map,v=null,y=[],b=!1,x=`all`,S=`all`,ee=`all`,C=`all`,w=``,T=``,E=!1,D=null,O=30,k=document.getElementById(`kpi-summary-section`),A=document.getElementById(`admin-map-section`),j=document.getElementById(`side-stats-section`),M=document.getElementById(`table-container-section`),N=document.getElementById(`sheet-view-banner`),P=document.getElementById(`table-title-text`),F=document.getElementById(`table-head-row`),I=document.getElementById(`admin-report-table-body`),te=document.getElementById(`filtered-count-badge`),ne=document.getElementById(`stat-total-reports`),re=document.getElementById(`stat-active-clusters`),ie=document.getElementById(`stat-high-danger`),ae=document.getElementById(`stat-resolved`),oe=document.getElementById(`stat-resolve-rate`),se=document.getElementById(`stat-resolve-bar`),L=document.getElementById(`category-stats`),R=document.getElementById(`ranking-board`),ce=document.getElementById(`current-time`),le=document.getElementById(`auto-refresh-status`),z=document.getElementById(`refresh-spinner`),ue=document.getElementById(`btn-toggle-view-mode`),B=document.getElementById(`view-mode-btn-text`),de=document.getElementById(`btn-back-to-dashboard`),fe=document.getElementById(`btn-manual-refresh`),pe=document.getElementById(`btn-export-csv`),me=document.getElementById(`btn-map-fit`),V=document.getElementById(`map-district-search`),H=document.getElementById(`btn-clear-district`),U=document.getElementById(`map-district-select`),W=document.getElementById(`admin-district-filter-select`),he=document.getElementById(`admin-search-input`),ge=document.getElementById(`admin-filter-danger`),_e=document.getElementById(`admin-filter-category`),ve=document.querySelectorAll(`.status-tab-btn`),G=document.getElementById(`image-modal`),ye=document.getElementById(`image-modal-img`),be=document.getElementById(`image-modal-title`),xe=document.getElementById(`btn-close-image-modal`);function Se(){ce&&(ce.textContent=new Date().toLocaleString(`ko-KR`,{year:`numeric`,month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}))}setInterval(Se,1e3),Se();function Ce(){D&&clearInterval(D),O=30,D=setInterval(()=>{O--,le&&(le.textContent=`자동 갱신: ${O}초 후`),O<=0&&(Y(!0),O=30)},1e3)}function K(e){if(!e)return`기타 관할`;let t=e.trim().split(/\s+/);return t.length>=2?`${t[0]} ${t[1]}`:t[0]||`기타 관할`}function we(){let e=new Set;h.forEach(t=>{let n=_.get(t.representId)?.location?.address||t.location?.address||``;n&&e.add(K(n))});let t=Array.from(e).sort(),n=e=>`
      <option value="all">전체 관할 구역</option>
      ${t.map(t=>`<option value="${r(t)}" ${e===t?`selected`:``}>${r(t)}</option>`).join(``)}
    `;U&&(U.innerHTML=n(C)),W&&(W.innerHTML=n(C))}function Te(){let e=document.getElementById(`admin-map`),t=document.getElementById(`admin-map-loading`);if(!e)return;let n=0,r=()=>{n++,typeof kakao<`u`&&kakao.maps?kakao.maps.load(()=>{try{let n={center:new kakao.maps.LatLng(37.35,126.98),level:8};v=new kakao.maps.Map(e,n),b=!0,t&&(t.style.display=`none`);let r=new kakao.maps.ZoomControl;v.addControl(r,kakao.maps.ControlPosition.RIGHT),setTimeout(()=>{v&&(v.relayout(),q())},150)}catch(e){console.error(`[admin] Kakao Map init error:`,e),t&&(t.innerHTML=`<span class="text-xs text-red-400">지도를 생성하지 못했습니다.</span>`)}}):n<50?setTimeout(r,100):(console.warn(`[admin] Kakao Maps SDK load timeout`),t&&(t.innerHTML=`<span class="text-xs text-amber-400">카카오 지도 로드 실패 (네트워크 또는 키 확인 필요)</span>`))};r()}window.addEventListener(`resize`,()=>{v&&!E&&v.relayout()});function q(){if(!v||!b)return;y.forEach(e=>e.setMap(null)),y=[];let e=new kakao.maps.LatLngBounds,t=!1;ke().forEach(i=>{let a=Number(i.location?.lat),o=Number(i.location?.lng);if(!a||!o||isNaN(a)||isNaN(o))return;let s=new kakao.maps.LatLng(a,o);e.extend(s),t=!0;let c=i.status===`resolved`,l=c?`#3b82f6`:i.danger===`high`?`#ef4444`:i.danger===`medium`?`#f59e0b`:`#10b981`,u=`
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="12" fill="${l}" stroke="#ffffff" stroke-width="2.5" />
        <circle cx="15" cy="15" r="5" fill="#ffffff" />
      </svg>
    `,d=new kakao.maps.MarkerImage(`data:image/svg+xml;charset=utf-8,`+encodeURIComponent(u),new kakao.maps.Size(30,30),{offset:new kakao.maps.Point(15,15)}),f=new kakao.maps.Marker({position:s,image:d,map:v}),p=_.get(i.representId),m=r(p?.title||`위험 제보 구역`),h=r(p?.location?.address||i.location?.address||`위치 정보 없음`),g=`
      <div style="padding:10px 12px; min-width:210px; font-family:sans-serif; font-size:12px; color:#1e293b; line-height:1.4;">
        <div style="font-weight:700; margin-bottom:4px; font-size:13px; color:${l};">
          ${c?`✅ 조치 완료`:i.danger===`high`?`🚨 초고위험`:`⚠️ 주의`} [${n(i.category)}]
        </div>
        <div style="font-weight:600; margin-bottom:2px; word-break:break-all;">${m}</div>
        <div style="font-size:11px; color:#64748b; margin-bottom:8px;">${h}</div>
        <a href="detail.html?id=${encodeURIComponent(i.id)}" target="_blank" rel="noopener" style="display:inline-block; padding:4px 10px; border-radius:6px; background:#e11d48; color:#ffffff; text-decoration:none; font-weight:700; font-size:11px;">
          상세 조치 보고서 ↗
        </a>
      </div>
    `,b=new kakao.maps.InfoWindow({content:g,removable:!0});kakao.maps.event.addListener(f,`click`,()=>{b.open(v,f)}),y.push(f)}),t&&y.length>0&&(v.setBounds(e),v.relayout())}function J(e){if(!v||!b)return;if(!e||e===`all`){q();return}let t=h.filter(t=>(_.get(t.representId)?.location?.address||t.location?.address||``).includes(e));if(t.length>0){let e=new kakao.maps.LatLngBounds;t.forEach(t=>{t.location?.lat&&t.location?.lng&&e.extend(new kakao.maps.LatLng(Number(t.location.lat),Number(t.location.lng)))}),v.setBounds(e),v.relayout();return}if(typeof kakao<`u`&&kakao.maps&&kakao.maps.services)try{new kakao.maps.services.Geocoder().addressSearch(e,(e,t)=>{if(t===kakao.maps.services.Status.OK&&e.length>0){let t=new kakao.maps.LatLng(e[0].y,e[0].x);v.setCenter(t),v.setLevel(7),v.relayout()}})}catch(e){console.warn(`[admin] Geocoder address search failed:`,e)}}async function Y(t=!1){!t&&z&&z.classList.add(`animate-spin`);try{let[t,n]=await Promise.all([e(),m()]);h=t||[],g=n||[],_.clear(),g.forEach(e=>_.set(e.id,e)),we(),Ee(),De(),Oe(),X(),q()}catch(e){console.error(`[admin] loadDashboard failed:`,e)}finally{z&&setTimeout(()=>z.classList.remove(`animate-spin`),400)}}function Ee(){let e=g.length,t=0,n=0,r=0;h.forEach(e=>{e.status===`resolved`?r++:(t++,e.danger===`high`&&n++)});let i=h.length,a=i>0?Math.round(r/i*100):0;ne&&(ne.textContent=e.toLocaleString()),re&&(re.textContent=t.toLocaleString()),ie&&(ie.textContent=n.toLocaleString()),ae&&(ae.textContent=r.toLocaleString()),oe&&(oe.textContent=`${a}%`),se&&(se.style.width=`${a}%`)}function De(){if(!L)return;L.innerHTML=``;let e={},t=0;h.forEach(n=>{if(n.status!==`resolved`){let r=n.category||`기타`;e[r]=(e[r]||0)+1,t++}});let r=Object.entries(e).sort((e,t)=>t[1]-e[1]);if(r.length===0){L.innerHTML=`<div class="text-xs text-muted-foreground text-center py-6">현재 접수된 미해결 위험이 없습니다.</div>`;return}r.forEach(([e,r])=>{let i=t>0?Math.round(r/t*100):0,a=n(e),o=document.createElement(`div`);o.className=`w-full flex flex-col gap-1`,o.innerHTML=`
      <div class="flex justify-between items-center text-xs">
        <span class="font-medium text-foreground">${a}</span>
        <span class="text-muted-foreground font-semibold">${r}건 <span class="text-[10px] text-muted-foreground/70">(${i}%)</span></span>
      </div>
      <div class="w-full bg-surface-1 rounded-full h-2 overflow-hidden border border-border/40">
        <div class="bg-primary h-full rounded-full transition-all duration-500" style="width: ${i}%"></div>
      </div>
    `,L.appendChild(o)})}function Oe(){if(!R)return;R.innerHTML=``;let e={};h.forEach(t=>{if(t.status===`resolved`&&t.resolvedAt&&t.createdAt){let n=K(_.get(t.representId)?.location?.address||t.location?.address||``),r=Math.max(0,t.resolvedAt-t.createdAt);e[n]||(e[n]={totalMs:0,count:0}),e[n].totalMs+=r,e[n].count++}});let t=Object.entries(e).map(([e,t])=>({name:e,avgMs:t.totalMs/t.count,count:t.count})).sort((e,t)=>e.avgMs-t.avgMs);if(t.length===0){R.innerHTML=`<div class="text-xs text-muted-foreground text-center py-6">해결된 위험 데이터가 아직 없습니다.</div>`;return}let n=[`🥇`,`🥈`,`🥉`];t.forEach((e,t)=>{let i=e.avgMs/(1e3*60*60),a=i>=24?`${(i/24).toFixed(1)}일`:`${Math.max(1,Math.round(i))}시간`,o=document.createElement(`div`);o.className=`flex items-center justify-between p-2.5 rounded-xl bg-surface/50 border border-border/70 hover:bg-surface transition-all`,o.innerHTML=`
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="text-lg flex-shrink-0">${t<3?n[t]:`<span class="text-xs font-bold text-muted-foreground w-5 text-center inline-block">${t+1}</span>`}</span>
        <div class="truncate">
          <p class="font-bold text-foreground text-xs truncate">${r(e.name)}</p>
          <p class="text-[10px] text-muted-foreground">누적 조치: ${e.count}건</p>
        </div>
      </div>
      <div class="text-right flex-shrink-0 pl-2">
        <p class="text-xs font-extrabold text-primary tabular-nums">${a}</p>
        <p class="text-[9px] text-muted-foreground">평균 대응</p>
      </div>
    `,R.appendChild(o)})}function ke(){return h.filter(e=>{let t=_.get(e.representId),n=t?.location?.address||e.location?.address||``;if(x!==`all`&&e.status!==x||S!==`all`&&e.danger!==S||ee!==`all`&&e.category!==ee)return!1;if(C!==`all`){let e=K(n);if(!e.includes(C)&&!C.includes(e))return!1}if(T){let e=T.toLowerCase();if(!n.toLowerCase().includes(e))return!1}if(w){let e=w.toLowerCase(),r=(t?.title||``).toLowerCase(),i=(t?.description||``).toLowerCase(),a=n.toLowerCase();if(!r.includes(e)&&!i.includes(e)&&!a.includes(e))return!1}return!0})}function Ae(){F&&(E?F.innerHTML=`
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
    `:F.innerHTML=`
      <th class="px-4 py-3">상태</th>
      <th class="px-4 py-3">위험도</th>
      <th class="px-4 py-3">분야</th>
      <th class="px-4 py-3">위치 (대표 주소)</th>
      <th class="px-4 py-3">제보 제목 / 설명</th>
      <th class="px-4 py-3 text-center">사진</th>
      <th class="px-4 py-3">접수 일시</th>
      <th class="px-4 py-3 text-center">공감수</th>
      <th class="px-4 py-3 text-right">현장 조치 액션</th>
    `)}function X(){if(!I)return;Ae(),I.innerHTML=``;let e=ke();e.sort((e,t)=>{if(e.status!==t.status)return e.status===`active`?-1:1;let n={high:3,medium:2,low:1},r=n[e.danger]||1,i=n[t.danger]||1;return r===i?(t.createdAt||0)-(e.createdAt||0):i-r}),te&&(te.textContent=`총 ${e.length}건`);let t=E?13:9;if(e.length===0){I.innerHTML=`
      <tr>
        <td colspan="${t}" class="px-4 py-12 text-center text-muted-foreground">
          조건에 부합하는 위험 제보 데이터가 없습니다.
        </td>
      </tr>
    `;return}e.forEach(e=>{let t=_.get(e.representId),i=e.status===`resolved`,a=p(e.danger),o=t?.location?.address||e.location?.address||`위치 정보 없음`,c=r(o),u=r(K(o)),d=r(t?.title||`대표 제보`),f=r(t?.description||``),m=l(e.createdAt||Date.now()),h=e.createdAt?new Date(e.createdAt).toLocaleDateString(`ko-KR`,{month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`}):`-`,g=e.resolvedAt?new Date(e.resolvedAt).toLocaleDateString(`ko-KR`,{month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`}):`-`,v=s(t?.imageBase64)||null,y=r((e.id||``).slice(0,8)),b=document.createElement(`tr`);b.className=`hover:bg-surface/40 transition-colors ${i?`opacity-80`:``}`,E?b.innerHTML=`
        <td class="px-3 py-3 font-mono text-muted-foreground text-[11px]">${y}</td>
        <td class="px-3 py-3">
          ${i?`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                 완료
               </span>`:`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                 미해결
               </span>`}
        </td>
        <td class="px-3 py-3">
          <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${a.bg} ${a.text}">
            ${a.label}
          </span>
        </td>
        <td class="px-3 py-3 text-muted-foreground font-medium">${n(e.category)}</td>
        <td class="px-3 py-3 font-bold text-foreground">${u}</td>
        <td class="px-3 py-3 text-foreground truncate max-w-[220px]" title="${c}">${c}</td>
        <td class="px-3 py-3 font-semibold text-foreground truncate max-w-[180px]" title="${d}">${d}</td>
        <td class="px-3 py-3 text-muted-foreground truncate max-w-[220px]" title="${f}">${f||`-`}</td>
        <td class="px-3 py-3 text-center">
          ${v?`
            <button type="button" class="btn-preview-image p-0.5 rounded hover:bg-surface border border-border inline-block" data-img="${v}" data-title="${d}" title="사진 확대">
              <img src="${v}" class="w-6 h-6 rounded object-cover" alt="사진">
            </button>
          `:`<span class="text-muted-foreground text-[10px]">-</span>`}
        </td>
        <td class="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">${h}</td>
        <td class="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">${g}</td>
        <td class="px-3 py-3 text-center font-bold text-red-500">${e.likes||0}</td>
        <td class="px-3 py-3 text-right sticky right-0 bg-background/95 backdrop-blur-sm shadow-sm z-10">
          <div class="inline-flex items-center gap-1 justify-end">
            <button type="button"
              class="btn-toggle-action px-2 py-0.5 rounded text-[11px] font-bold transition-all ${i?`bg-surface hover:bg-surface-1 border border-border text-muted-foreground`:`bg-primary text-white hover:bg-primary/90`}"
              data-id="${r(e.id)}">
              ${i?`재접수`:`조치완료`}
            </button>
            <a href="detail.html?id=${encodeURIComponent(e.id)}" target="_blank" rel="noopener" class="p-1 rounded border border-border bg-surface hover:bg-surface-1 text-foreground" title="보고서">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
            </a>
          </div>
        </td>
      `:b.innerHTML=`
        <td class="px-4 py-3">
          ${i?`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                 <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                 해결 완료
               </span>`:`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                 <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                 진행 중
               </span>`}
        </td>

        <td class="px-4 py-3">
          <span class="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${a.bg} ${a.text}">
            ${a.label}
          </span>
        </td>

        <td class="px-4 py-3 text-muted-foreground font-medium">
          ${n(e.category)}
        </td>

        <td class="px-4 py-3 text-foreground font-medium max-w-[200px] truncate" title="${c}">
          <span class="font-bold text-primary mr-1">[${u}]</span>${c}
        </td>

        <td class="px-4 py-3 max-w-[240px]">
          <p class="font-bold text-foreground truncate" title="${d}">${d}</p>
          <p class="text-[11px] text-muted-foreground truncate" title="${f}">${f||`-`}</p>
        </td>

        <td class="px-4 py-3 text-center">
          ${v?`
            <button type="button" class="btn-preview-image p-1 rounded-lg hover:bg-surface border border-border inline-block transition-transform hover:scale-105" data-img="${v}" data-title="${d}" title="현장 사진 확대">
              <img src="${v}" class="w-8 h-8 rounded-md object-cover" alt="사진">
            </button>
          `:`
            <span class="text-[10px] text-muted-foreground">-</span>
          `}
        </td>

        <td class="px-4 py-3 text-muted-foreground whitespace-nowrap">
          ${m}
        </td>

        <td class="px-4 py-3 text-center font-bold text-red-500">
          ${e.likes||0}
        </td>

        <td class="px-4 py-3 text-right">
          <div class="inline-flex items-center gap-1.5 justify-end">
            <button type="button"
              class="btn-toggle-action px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${i?`bg-surface hover:bg-surface-1 border border-border text-muted-foreground`:`bg-primary text-white hover:bg-primary/90`}"
              data-id="${r(e.id)}">
              ${i?`재접수 전환`:`조치 완료`}
            </button>
            <a href="detail.html?id=${encodeURIComponent(e.id)}" target="_blank" rel="noopener"
              class="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-1 text-foreground transition"
              title="상세 보고서 보기">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
              </svg>
            </a>
          </div>
        </td>
      `,I.appendChild(b)}),je()}function je(){document.querySelectorAll(`.btn-toggle-action`).forEach(e=>{e.addEventListener(`click`,async t=>{t.stopPropagation(),await Me(e.getAttribute(`data-id`))})}),document.querySelectorAll(`.btn-preview-image`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),Fe(e.getAttribute(`data-img`),e.getAttribute(`data-title`))})})}async function Me(e){let t=h.find(t=>t.id===e);if(!t)return;let n=t.status===`resolved`?`active`:`resolved`;try{await o(e,{status:n,resolvedAt:n===`resolved`?Date.now():null,resolvedBy:n===`resolved`&&c()?.uid||null,updatedAt:Date.now()})}catch(e){console.error(`[admin] status toggle failed:`,e),alert(a(e,`상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.`));return}await Y(!0)}function Ne(e=null){E=e===null?!E:e,E?(k&&(k.style.display=`none`),A&&(A.style.display=`none`),j&&(j.style.display=`none`),N&&(N.classList.remove(`hidden`),N.classList.add(`flex`)),M&&(M.classList.remove(`lg:col-span-2`),M.classList.add(`lg:col-span-3`)),B&&(B.textContent=`대시보드 복귀`),P&&(P.textContent=`📑 전면 스프레드시트 시트 뷰 (Sheet View)`)):(k&&(k.style.display=``),A&&(A.style.display=``),j&&(j.style.display=``),N&&(N.classList.add(`hidden`),N.classList.remove(`flex`)),M&&(M.classList.remove(`lg:col-span-3`),M.classList.add(`lg:col-span-2`)),B&&(B.textContent=`시트뷰로 전환`),P&&(P.textContent=`실시간 위험 제보 관제 콘솔`),setTimeout(()=>{v&&(v.relayout(),q())},100)),X()}function Pe(){let e=ke();if(e.length===0){alert(`내보낼 데이터가 없습니다.`);return}let t=[`관리ID`,`진행상태`,`위험도`,`분야`,`지역구`,`위치(주소)`,`대표제보명`,`상세설명`,`제보일시`,`해결일시`,`주민공감수`],r=e.map(e=>{let t=_.get(e.representId),r=e.status===`resolved`?`해결 완료`:`미해결 진행 중`,i=e.danger===`high`?`초고위험`:e.danger===`medium`?`보통`:`낮음`,a=n(e.category),o=t?.location?.address||e.location?.address||``,s=K(o),c=e=>{let t=String(e??``);return`"${(/^[=+\-@\t\r]/.test(t)?`'${t}`:t).replace(/"/g,`""`)}"`},l=c(o),u=c(t?.title||``),d=c(t?.description||``),f=e.createdAt?new Date(e.createdAt).toLocaleString(`ko-KR`):``,p=e.resolvedAt?new Date(e.resolvedAt).toLocaleString(`ko-KR`):``,m=e.likes||0;return[e.id,r,i,a,s,l,u,d,f,p,m].join(`,`)}),i=`﻿`+[t.join(`,`),...r].join(`\r
`),a=new Blob([i],{type:`text/csv;charset=utf-8;`}),o=URL.createObjectURL(a),s=document.createElement(`a`),c=new Date().toISOString().slice(0,10).replace(/-/g,``);s.href=o,s.download=`fermata_safety_admin_report_${c}.csv`,s.click(),URL.revokeObjectURL(o)}function Fe(e,t){!G||!ye||(ye.src=e,be&&(be.textContent=t||`현장 제보 사진`),G.classList.remove(`hidden`),G.classList.add(`flex`))}function Ie(){G&&(G.classList.add(`hidden`),G.classList.remove(`flex`))}function Le(){ue?.addEventListener(`click`,()=>Ne()),de?.addEventListener(`click`,()=>Ne(!1)),V?.addEventListener(`input`,e=>{T=e.target.value.trim(),H&&(T?H.classList.remove(`hidden`):H.classList.add(`hidden`)),X(),q()}),V?.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let e=V.value.trim();e&&J(e)}}),H?.addEventListener(`click`,()=>{V&&(V.value=``),T=``,H.classList.add(`hidden`),X(),q()}),U?.addEventListener(`change`,e=>{C=e.target.value,W&&(W.value=C),X(),J(C)}),W?.addEventListener(`change`,e=>{C=e.target.value,U&&(U.value=C),X(),J(C)}),ve.forEach(e=>{e.addEventListener(`click`,()=>{ve.forEach(e=>{e.classList.remove(`bg-primary`,`text-white`),e.classList.add(`text-muted-foreground`)}),e.classList.remove(`text-muted-foreground`),e.classList.add(`bg-primary`,`text-white`),x=e.getAttribute(`data-status`),X(),q()})}),he?.addEventListener(`input`,e=>{w=e.target.value.trim(),X(),q()}),ge?.addEventListener(`change`,e=>{S=e.target.value,X(),q()}),_e?.addEventListener(`change`,e=>{ee=e.target.value,X(),q()}),fe?.addEventListener(`click`,()=>{Y(),O=30}),pe?.addEventListener(`click`,Pe),me?.addEventListener(`click`,()=>{q()}),xe?.addEventListener(`click`,Ie),G?.addEventListener(`click`,e=>{e.target===G&&Ie()}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&Ie()})}var Re=document.getElementById(`admin-gate`),Z=document.getElementById(`admin-gate-message`),ze=document.getElementById(`admin-gate-uid-wrap`),Be=document.getElementById(`admin-gate-account`),Ve=document.getElementById(`admin-gate-uid`),He=document.getElementById(`admin-gate-copy-uid`),Q=document.getElementById(`admin-gate-hint`),Ue=document.getElementById(`admin-gate-login`),We=document.getElementById(`admin-gate-recheck`),Ge=document.getElementById(`admin-gate-logout`),Ke=document.getElementById(`admin-account-badge`),qe=!1,Je=0;function $(e,t=null,n=``){let r=e===`denied`||e===`rule-error`||e===`offline`;Re?.classList.remove(`hidden`),Ue?.classList.toggle(`hidden`,e!==`login`),We?.classList.toggle(`hidden`,!r),Ge?.classList.toggle(`hidden`,!r),ze?.classList.toggle(`hidden`,!r),Q&&(Q.textContent=n,Q.classList.toggle(`hidden`,!n)),r&&(Be&&(Be.textContent=t?.email||t?.displayName||``),Ve&&(Ve.textContent=t?.uid||``)),Z&&(e===`checking`?Z.textContent=`관리자 권한을 확인하고 있습니다...`:e===`login`?Z.textContent=`관리자 전용 페이지입니다. 관리자 계정으로 로그인해 주세요.`:e===`denied`?Z.textContent=`이 계정에는 관리자 권한이 없습니다. Firebase 콘솔의 admins 컬렉션에 아래 UID를 문서 ID로 등록해 주세요.`:e===`rule-error`?Z.textContent=`Firestore 보안 규칙에서 관리자 권한 조회가 차단되었습니다.`:e===`offline`&&(Z.textContent=`네트워크 연결을 확인할 수 없어 관리자 권한을 검증하지 못했습니다.`))}function Ye(){D&&=(clearInterval(D),null)}function Xe(e){Re?.classList.add(`hidden`),Ke&&(Ke.textContent=e?.email||e?.displayName||`관리자`),qe||(qe=!0,Te(),Le()),Y(),Ce()}async function Ze(e){let t=++Je;if(Ye(),!e){$(`login`);return}$(`checking`);let n=await f(e);t===Je&&(n.isAdmin?Xe(e):n.reason===`permission-denied`?$(`rule-error`,e,`Firebase 콘솔 → Firestore Database → 규칙(Rules)에 firestore.rules의 admins/{uid} 읽기 허용 규칙이 게시되어 있는지 확인해 주세요.`):n.reason===`offline`?$(`offline`,e,`인터넷 연결을 확인한 뒤 [권한 다시 확인]을 눌러 주세요.`):$(`denied`,e,`주의: admins 컬렉션의 "문서 ID" 자체가 위 UID와 정확히 일치해야 합니다(내부 필드가 아닌 문서 ID). 등록 후 [권한 다시 확인]을 눌러 주세요.`))}Ue?.addEventListener(`click`,()=>i()),We?.addEventListener(`click`,()=>Ze(c())),Ge?.addEventListener(`click`,async()=>{await t(),await i({selectAccount:!0})}),He?.addEventListener(`click`,async()=>{let e=Ve?.textContent?.trim();if(e)try{await navigator.clipboard.writeText(e),He.textContent=`복사됨!`,setTimeout(()=>{He.textContent=`복사`},1500)}catch{prompt(`아래 UID를 복사해 주세요.`,e)}}),document.getElementById(`admin-logout-btn`)?.addEventListener(`click`,async()=>{confirm(`관리자 계정에서 로그아웃 하시겠습니까?`)&&await t()});var Qe=document.getElementById(`admin-gate-home`);Qe&&(Qe.href=`/index.html`),u(e=>{Ze(e)});