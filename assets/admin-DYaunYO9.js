import{A as e,C as t,O as n,f as r,i,l as a,n as o,o as s,p as c,r as l,s as u,t as d,u as f,x as p}from"./auth-CLDoQ0Y-.js";s();var m=[],h=[],g=new Map,_=null,v=[],y=!1,b=`all`,x=`all`,S=`all`,C=`all`,w=``,T=``,E=!1,D=null,O=30,k=document.getElementById(`kpi-summary-section`),A=document.getElementById(`admin-map-section`),j=document.getElementById(`side-stats-section`),M=document.getElementById(`table-container-section`),N=document.getElementById(`sheet-view-banner`),P=document.getElementById(`table-title-text`),F=document.getElementById(`table-head-row`),I=document.getElementById(`admin-report-table-body`),ee=document.getElementById(`filtered-count-badge`),te=document.getElementById(`stat-total-reports`),ne=document.getElementById(`stat-active-clusters`),re=document.getElementById(`stat-high-danger`),ie=document.getElementById(`stat-resolved`),ae=document.getElementById(`stat-resolve-rate`),oe=document.getElementById(`stat-resolve-bar`),L=document.getElementById(`category-stats`),R=document.getElementById(`ranking-board`),se=document.getElementById(`current-time`),ce=document.getElementById(`auto-refresh-status`),z=document.getElementById(`refresh-spinner`),le=document.getElementById(`btn-toggle-view-mode`),B=document.getElementById(`view-mode-btn-text`),ue=document.getElementById(`btn-back-to-dashboard`),de=document.getElementById(`btn-manual-refresh`),fe=document.getElementById(`btn-export-csv`),pe=document.getElementById(`btn-map-fit`),V=document.getElementById(`map-district-search`),H=document.getElementById(`btn-clear-district`),U=document.getElementById(`map-district-select`),W=document.getElementById(`admin-district-filter-select`),me=document.getElementById(`admin-search-input`),he=document.getElementById(`admin-filter-danger`),ge=document.getElementById(`admin-filter-category`),_e=document.querySelectorAll(`.status-tab-btn`),G=document.getElementById(`image-modal`),ve=document.getElementById(`image-modal-img`),ye=document.getElementById(`image-modal-title`),be=document.getElementById(`btn-close-image-modal`);function xe(){se&&(se.textContent=new Date().toLocaleString(`ko-KR`,{year:`numeric`,month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}))}setInterval(xe,1e3),xe();function Se(){D&&clearInterval(D),O=30,D=setInterval(()=>{O--,ce&&(ce.textContent=`자동 갱신: ${O}초 후`),O<=0&&(Y(!0),O=30)},1e3)}function K(e){if(!e)return`기타 관할`;let t=e.trim().split(/\s+/);return t.length>=2?`${t[0]} ${t[1]}`:t[0]||`기타 관할`}function Ce(){let e=new Set;m.forEach(t=>{let n=g.get(t.representId)?.location?.address||t.location?.address||``;n&&e.add(K(n))});let t=Array.from(e).sort(),n=e=>`
      <option value="all">전체 관할 구역</option>
      ${t.map(t=>`<option value="${f(t)}" ${e===t?`selected`:``}>${f(t)}</option>`).join(``)}
    `;U&&(U.innerHTML=n(C)),W&&(W.innerHTML=n(C))}function we(){let e=document.getElementById(`admin-map`),t=document.getElementById(`admin-map-loading`);if(!e)return;let n=0,r=()=>{n++,typeof kakao<`u`&&kakao.maps?kakao.maps.load(()=>{try{let n={center:new kakao.maps.LatLng(37.35,126.98),level:8};_=new kakao.maps.Map(e,n),y=!0,t&&(t.style.display=`none`);let r=new kakao.maps.ZoomControl;_.addControl(r,kakao.maps.ControlPosition.RIGHT),setTimeout(()=>{_&&(_.relayout(),q())},150)}catch(e){console.error(`[admin] Kakao Map init error:`,e),t&&(t.innerHTML=`<span class="text-xs text-red-400">지도를 생성하지 못했습니다.</span>`)}}):n<50?setTimeout(r,100):(console.warn(`[admin] Kakao Maps SDK load timeout`),t&&(t.innerHTML=`<span class="text-xs text-amber-400">카카오 지도 로드 실패 (네트워크 또는 키 확인 필요)</span>`))};r()}window.addEventListener(`resize`,()=>{_&&!E&&_.relayout()});function q(){if(!_||!y)return;v.forEach(e=>e.setMap(null)),v=[];let e=new kakao.maps.LatLngBounds,t=!1;X().forEach(n=>{let r=Number(n.location?.lat),i=Number(n.location?.lng);if(!r||!i||isNaN(r)||isNaN(i))return;let a=new kakao.maps.LatLng(r,i);e.extend(a),t=!0;let o=n.status===`resolved`,s=o?`#3b82f6`:n.danger===`high`?`#ef4444`:n.danger===`medium`?`#f59e0b`:`#10b981`,c=`
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="12" fill="${s}" stroke="#ffffff" stroke-width="2.5" />
        <circle cx="15" cy="15" r="5" fill="#ffffff" />
      </svg>
    `,l=new kakao.maps.MarkerImage(`data:image/svg+xml;charset=utf-8,`+encodeURIComponent(c),new kakao.maps.Size(30,30),{offset:new kakao.maps.Point(15,15)}),d=new kakao.maps.Marker({position:a,image:l,map:_}),p=g.get(n.representId),m=f(p?.title||`위험 제보 구역`),h=f(p?.location?.address||n.location?.address||`위치 정보 없음`),y=`
      <div style="padding:10px 12px; min-width:210px; font-family:sans-serif; font-size:12px; color:#1e293b; line-height:1.4;">
        <div style="font-weight:700; margin-bottom:4px; font-size:13px; color:${s};">
          ${o?`✅ 조치 완료`:n.danger===`high`?`🚨 초고위험`:`⚠️ 주의`} [${u(n.category)}]
        </div>
        <div style="font-weight:600; margin-bottom:2px; word-break:break-all;">${m}</div>
        <div style="font-size:11px; color:#64748b; margin-bottom:8px;">${h}</div>
        <a href="detail.html?id=${encodeURIComponent(n.id)}" target="_blank" rel="noopener" style="display:inline-block; padding:4px 10px; border-radius:6px; background:#e11d48; color:#ffffff; text-decoration:none; font-weight:700; font-size:11px;">
          상세 조치 보고서 ↗
        </a>
      </div>
    `,b=new kakao.maps.InfoWindow({content:y,removable:!0});kakao.maps.event.addListener(d,`click`,()=>{b.open(_,d)}),v.push(d)}),t&&v.length>0&&(_.setBounds(e),_.relayout())}function J(e){if(!_||!y)return;if(!e||e===`all`){q();return}let t=m.filter(t=>(g.get(t.representId)?.location?.address||t.location?.address||``).includes(e));if(t.length>0){let e=new kakao.maps.LatLngBounds;t.forEach(t=>{t.location?.lat&&t.location?.lng&&e.extend(new kakao.maps.LatLng(Number(t.location.lat),Number(t.location.lng)))}),_.setBounds(e),_.relayout();return}if(typeof kakao<`u`&&kakao.maps&&kakao.maps.services)try{new kakao.maps.services.Geocoder().addressSearch(e,(e,t)=>{if(t===kakao.maps.services.Status.OK&&e.length>0){let t=new kakao.maps.LatLng(e[0].y,e[0].x);_.setCenter(t),_.setLevel(7),_.relayout()}})}catch(e){console.warn(`[admin] Geocoder address search failed:`,e)}}async function Y(e=!1){!e&&z&&z.classList.add(`animate-spin`);try{let[e,n]=await Promise.all([p(),t()]);m=e||[],h=n||[],g.clear(),h.forEach(e=>g.set(e.id,e)),Ce(),Te(),Ee(),De(),Z(),q()}catch(e){console.error(`[admin] loadDashboard failed:`,e)}finally{z&&setTimeout(()=>z.classList.remove(`animate-spin`),400)}}function Te(){let e=h.length,t=0,n=0,r=0;m.forEach(e=>{e.status===`resolved`?r++:(t++,e.danger===`high`&&n++)});let i=m.length,a=i>0?Math.round(r/i*100):0;te&&(te.textContent=e.toLocaleString()),ne&&(ne.textContent=t.toLocaleString()),re&&(re.textContent=n.toLocaleString()),ie&&(ie.textContent=r.toLocaleString()),ae&&(ae.textContent=`${a}%`),oe&&(oe.style.width=`${a}%`)}function Ee(){if(!L)return;L.innerHTML=``;let e={},t=0;m.forEach(n=>{if(n.status!==`resolved`){let r=n.category||`기타`;e[r]=(e[r]||0)+1,t++}});let n=Object.entries(e).sort((e,t)=>t[1]-e[1]);if(n.length===0){L.innerHTML=`<div class="text-xs text-muted-foreground text-center py-6">현재 접수된 미해결 위험이 없습니다.</div>`;return}n.forEach(([e,n])=>{let r=t>0?Math.round(n/t*100):0,i=u(e),a=document.createElement(`div`);a.className=`w-full flex flex-col gap-1`,a.innerHTML=`
      <div class="flex justify-between items-center text-xs">
        <span class="font-medium text-foreground">${i}</span>
        <span class="text-muted-foreground font-semibold">${n}건 <span class="text-[10px] text-muted-foreground/70">(${r}%)</span></span>
      </div>
      <div class="w-full bg-surface-1 rounded-full h-2 overflow-hidden border border-border/40">
        <div class="bg-primary h-full rounded-full transition-all duration-500" style="width: ${r}%"></div>
      </div>
    `,L.appendChild(a)})}function De(){if(!R)return;R.innerHTML=``;let e={};m.forEach(t=>{if(t.status===`resolved`&&t.resolvedAt&&t.createdAt){let n=K(g.get(t.representId)?.location?.address||t.location?.address||``),r=Math.max(0,t.resolvedAt-t.createdAt);e[n]||(e[n]={totalMs:0,count:0}),e[n].totalMs+=r,e[n].count++}});let t=Object.entries(e).map(([e,t])=>({name:e,avgMs:t.totalMs/t.count,count:t.count})).sort((e,t)=>e.avgMs-t.avgMs);if(t.length===0){R.innerHTML=`<div class="text-xs text-muted-foreground text-center py-6">해결된 위험 데이터가 아직 없습니다.</div>`;return}let n=[`🥇`,`🥈`,`🥉`];t.forEach((e,t)=>{let r=e.avgMs/(1e3*60*60),i=r>=24?`${(r/24).toFixed(1)}일`:`${Math.max(1,Math.round(r))}시간`,a=document.createElement(`div`);a.className=`flex items-center justify-between p-2.5 rounded-xl bg-surface/50 border border-border/70 hover:bg-surface transition-all`,a.innerHTML=`
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="text-lg flex-shrink-0">${t<3?n[t]:`<span class="text-xs font-bold text-muted-foreground w-5 text-center inline-block">${t+1}</span>`}</span>
        <div class="truncate">
          <p class="font-bold text-foreground text-xs truncate">${f(e.name)}</p>
          <p class="text-[10px] text-muted-foreground">누적 조치: ${e.count}건</p>
        </div>
      </div>
      <div class="text-right flex-shrink-0 pl-2">
        <p class="text-xs font-extrabold text-primary tabular-nums">${i}</p>
        <p class="text-[9px] text-muted-foreground">평균 대응</p>
      </div>
    `,R.appendChild(a)})}function X(){return m.filter(e=>{let t=g.get(e.representId),n=t?.location?.address||e.location?.address||``;if(b!==`all`&&e.status!==b||x!==`all`&&e.danger!==x||S!==`all`&&e.category!==S)return!1;if(C!==`all`){let e=K(n);if(!e.includes(C)&&!C.includes(e))return!1}if(T){let e=T.toLowerCase();if(!n.toLowerCase().includes(e))return!1}if(w){let e=w.toLowerCase(),r=(t?.title||``).toLowerCase(),i=(t?.description||``).toLowerCase(),a=n.toLowerCase();if(!r.includes(e)&&!i.includes(e)&&!a.includes(e))return!1}return!0})}function Oe(){F&&(E?F.innerHTML=`
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
    `)}function Z(){if(!I)return;Oe(),I.innerHTML=``;let e=X();e.sort((e,t)=>{if(e.status!==t.status)return e.status===`active`?-1:1;let n={high:3,medium:2,low:1},r=n[e.danger]||1,i=n[t.danger]||1;return r===i?(t.createdAt||0)-(e.createdAt||0):i-r}),ee&&(ee.textContent=`총 ${e.length}건`);let t=E?13:9;if(e.length===0){I.innerHTML=`
      <tr>
        <td colspan="${t}" class="px-4 py-12 text-center text-muted-foreground">
          조건에 부합하는 위험 제보 데이터가 없습니다.
        </td>
      </tr>
    `;return}e.forEach(e=>{let t=g.get(e.representId),n=e.status===`resolved`,i=a(e.danger),o=t?.location?.address||e.location?.address||`위치 정보 없음`,s=f(o),l=f(K(o)),d=f(t?.title||`대표 제보`),p=f(t?.description||``),m=r(e.createdAt||Date.now()),h=e.createdAt?new Date(e.createdAt).toLocaleDateString(`ko-KR`,{month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`}):`-`,_=e.resolvedAt?new Date(e.resolvedAt).toLocaleDateString(`ko-KR`,{month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`}):`-`,v=c(t?.imageBase64)||null,y=f((e.id||``).slice(0,8)),b=document.createElement(`tr`);b.className=`hover:bg-surface/40 transition-colors ${n?`opacity-80`:``}`,E?b.innerHTML=`
        <td class="px-3 py-3 font-mono text-muted-foreground text-[11px]">${y}</td>
        <td class="px-3 py-3">
          ${n?`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                 완료
               </span>`:`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                 미해결
               </span>`}
        </td>
        <td class="px-3 py-3">
          <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${i.bg} ${i.text}">
            ${i.label}
          </span>
        </td>
        <td class="px-3 py-3 text-muted-foreground font-medium">${u(e.category)}</td>
        <td class="px-3 py-3 font-bold text-foreground">${l}</td>
        <td class="px-3 py-3 text-foreground truncate max-w-[220px]" title="${s}">${s}</td>
        <td class="px-3 py-3 font-semibold text-foreground truncate max-w-[180px]" title="${d}">${d}</td>
        <td class="px-3 py-3 text-muted-foreground truncate max-w-[220px]" title="${p}">${p||`-`}</td>
        <td class="px-3 py-3 text-center">
          ${v?`
            <button type="button" class="btn-preview-image p-0.5 rounded hover:bg-surface border border-border inline-block" data-img="${v}" data-title="${d}" title="사진 확대">
              <img src="${v}" class="w-6 h-6 rounded object-cover" alt="사진">
            </button>
          `:`<span class="text-muted-foreground text-[10px]">-</span>`}
        </td>
        <td class="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">${h}</td>
        <td class="px-3 py-3 text-muted-foreground text-[11px] whitespace-nowrap">${_}</td>
        <td class="px-3 py-3 text-center font-bold text-red-500">${e.likes||0}</td>
        <td class="px-3 py-3 text-right sticky right-0 bg-background/95 backdrop-blur-sm shadow-sm z-10">
          <div class="inline-flex items-center gap-1 justify-end">
            <button type="button"
              class="btn-toggle-action px-2 py-0.5 rounded text-[11px] font-bold transition-all ${n?`bg-surface hover:bg-surface-1 border border-border text-muted-foreground`:`bg-primary text-white hover:bg-primary/90`}"
              data-id="${f(e.id)}">
              ${n?`재접수`:`조치완료`}
            </button>
            <a href="detail.html?id=${encodeURIComponent(e.id)}" target="_blank" rel="noopener" class="p-1 rounded border border-border bg-surface hover:bg-surface-1 text-foreground" title="보고서">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
            </a>
          </div>
        </td>
      `:b.innerHTML=`
        <td class="px-4 py-3">
          ${n?`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                 <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                 해결 완료
               </span>`:`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                 <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                 진행 중
               </span>`}
        </td>

        <td class="px-4 py-3">
          <span class="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${i.bg} ${i.text}">
            ${i.label}
          </span>
        </td>

        <td class="px-4 py-3 text-muted-foreground font-medium">
          ${u(e.category)}
        </td>

        <td class="px-4 py-3 text-foreground font-medium max-w-[200px] truncate" title="${s}">
          <span class="font-bold text-primary mr-1">[${l}]</span>${s}
        </td>

        <td class="px-4 py-3 max-w-[240px]">
          <p class="font-bold text-foreground truncate" title="${d}">${d}</p>
          <p class="text-[11px] text-muted-foreground truncate" title="${p}">${p||`-`}</p>
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
              class="btn-toggle-action px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${n?`bg-surface hover:bg-surface-1 border border-border text-muted-foreground`:`bg-primary text-white hover:bg-primary/90`}"
              data-id="${f(e.id)}">
              ${n?`재접수 전환`:`조치 완료`}
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
      `,I.appendChild(b)}),ke()}function ke(){document.querySelectorAll(`.btn-toggle-action`).forEach(e=>{e.addEventListener(`click`,async t=>{t.stopPropagation(),await Ae(e.getAttribute(`data-id`))})}),document.querySelectorAll(`.btn-preview-image`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),Ne(e.getAttribute(`data-img`),e.getAttribute(`data-title`))})})}async function Ae(t){let r=m.find(e=>e.id===t);if(!r)return;let i=r.status===`resolved`?`active`:`resolved`;try{await n(t,{status:i,resolvedAt:i===`resolved`?Date.now():null,resolvedBy:i===`resolved`&&d()?.uid||null,updatedAt:Date.now()})}catch(t){console.error(`[admin] status toggle failed:`,t),alert(e(t,`상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.`));return}await Y(!0)}function je(e=null){E=e===null?!E:e,E?(k&&(k.style.display=`none`),A&&(A.style.display=`none`),j&&(j.style.display=`none`),N&&(N.classList.remove(`hidden`),N.classList.add(`flex`)),M&&(M.classList.remove(`lg:col-span-2`),M.classList.add(`lg:col-span-3`)),B&&(B.textContent=`대시보드 복귀`),P&&(P.textContent=`📑 전면 스프레드시트 시트 뷰 (Sheet View)`)):(k&&(k.style.display=``),A&&(A.style.display=``),j&&(j.style.display=``),N&&(N.classList.add(`hidden`),N.classList.remove(`flex`)),M&&(M.classList.remove(`lg:col-span-3`),M.classList.add(`lg:col-span-2`)),B&&(B.textContent=`시트뷰로 전환`),P&&(P.textContent=`실시간 위험 제보 관제 콘솔`),setTimeout(()=>{_&&(_.relayout(),q())},100)),Z()}function Me(){let e=X();if(e.length===0){alert(`내보낼 데이터가 없습니다.`);return}let t=[`관리ID`,`진행상태`,`위험도`,`분야`,`지역구`,`위치(주소)`,`대표제보명`,`상세설명`,`제보일시`,`해결일시`,`주민공감수`],n=e.map(e=>{let t=g.get(e.representId),n=e.status===`resolved`?`해결 완료`:`미해결 진행 중`,r=e.danger===`high`?`초고위험`:e.danger===`medium`?`보통`:`낮음`,i=u(e.category),a=t?.location?.address||e.location?.address||``,o=K(a),s=e=>{let t=String(e??``);return`"${(/^[=+\-@\t\r]/.test(t)?`'${t}`:t).replace(/"/g,`""`)}"`},c=s(a),l=s(t?.title||``),d=s(t?.description||``),f=e.createdAt?new Date(e.createdAt).toLocaleString(`ko-KR`):``,p=e.resolvedAt?new Date(e.resolvedAt).toLocaleString(`ko-KR`):``,m=e.likes||0;return[e.id,n,r,i,o,c,l,d,f,p,m].join(`,`)}),r=`﻿`+[t.join(`,`),...n].join(`\r
`),i=new Blob([r],{type:`text/csv;charset=utf-8;`}),a=URL.createObjectURL(i),o=document.createElement(`a`),s=new Date().toISOString().slice(0,10).replace(/-/g,``);o.href=a,o.download=`fermata_safety_admin_report_${s}.csv`,o.click(),URL.revokeObjectURL(a)}function Ne(e,t){!G||!ve||(ve.src=e,ye&&(ye.textContent=t||`현장 제보 사진`),G.classList.remove(`hidden`),G.classList.add(`flex`))}function Q(){G&&(G.classList.add(`hidden`),G.classList.remove(`flex`))}function Pe(){le?.addEventListener(`click`,()=>je()),ue?.addEventListener(`click`,()=>je(!1)),V?.addEventListener(`input`,e=>{T=e.target.value.trim(),H&&(T?H.classList.remove(`hidden`):H.classList.add(`hidden`)),Z(),q()}),V?.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let e=V.value.trim();e&&J(e)}}),H?.addEventListener(`click`,()=>{V&&(V.value=``),T=``,H.classList.add(`hidden`),Z(),q()}),U?.addEventListener(`change`,e=>{C=e.target.value,W&&(W.value=C),Z(),J(C)}),W?.addEventListener(`change`,e=>{C=e.target.value,U&&(U.value=C),Z(),J(C)}),_e.forEach(e=>{e.addEventListener(`click`,()=>{_e.forEach(e=>{e.classList.remove(`bg-primary`,`text-white`),e.classList.add(`text-muted-foreground`)}),e.classList.remove(`text-muted-foreground`),e.classList.add(`bg-primary`,`text-white`),b=e.getAttribute(`data-status`),Z(),q()})}),me?.addEventListener(`input`,e=>{w=e.target.value.trim(),Z(),q()}),he?.addEventListener(`change`,e=>{x=e.target.value,Z(),q()}),ge?.addEventListener(`change`,e=>{S=e.target.value,Z(),q()}),de?.addEventListener(`click`,()=>{Y(),O=30}),fe?.addEventListener(`click`,Me),pe?.addEventListener(`click`,()=>{q()}),be?.addEventListener(`click`,Q),G?.addEventListener(`click`,e=>{e.target===G&&Q()}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&Q()})}var Fe=document.getElementById(`admin-gate`),$=document.getElementById(`admin-gate-message`),Ie=document.getElementById(`admin-gate-uid-wrap`),Le=document.getElementById(`admin-gate-account`),Re=document.getElementById(`admin-gate-uid`),ze=document.getElementById(`admin-gate-login`),Be=document.getElementById(`admin-gate-logout`),Ve=!1,He=0;function Ue(e,t=null){Fe?.classList.remove(`hidden`),ze?.classList.toggle(`hidden`,e!==`login`),Be?.classList.toggle(`hidden`,e!==`denied`),Ie?.classList.toggle(`hidden`,e!==`denied`),$&&(e===`checking`?$.textContent=`관리자 권한을 확인하고 있습니다...`:e===`login`?$.textContent=`관리자 전용 페이지입니다. 관리자 계정으로 로그인해 주세요.`:e===`denied`&&($.textContent=`이 계정에는 관리자 권한이 없습니다. 권한이 필요하면 아래 UID를 담당자에게 전달해 주세요.`,Le&&(Le.textContent=t?.email||t?.displayName||``),Re&&(Re.textContent=t?.uid||``)))}function We(){D&&=(clearInterval(D),null)}function Ge(){Fe?.classList.add(`hidden`),Ve||(Ve=!0,we(),Pe()),Y(),Se()}ze?.addEventListener(`click`,()=>l()),Be?.addEventListener(`click`,()=>i()),document.getElementById(`admin-logout-btn`)?.addEventListener(`click`,async()=>{confirm(`관리자 계정에서 로그아웃 하시겠습니까?`)&&await i()});var Ke=document.getElementById(`admin-gate-home`);Ke&&(Ke.href=`/2026_HS_Hackathon/index.html`),o(async e=>{let t=++He;if(We(),!e){Ue(`login`);return}Ue(`checking`),t===He&&Ge()});