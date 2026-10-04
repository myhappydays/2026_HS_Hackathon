import{d as e,p as t,t as n}from"./utils-q2FoRUtQ.js";import{t as r}from"./theme-BGQI_Gbl.js";r();var i=document.getElementById(`stat-total-reports`),a=document.getElementById(`stat-active-clusters`),o=document.getElementById(`stat-high-danger`),s=document.getElementById(`stat-resolved`),c=document.getElementById(`category-stats`),l=document.getElementById(`urgent-list`),u=document.getElementById(`current-time`);setInterval(()=>{u.textContent=new Date().toLocaleString(`ko-KR`,{year:`numeric`,month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`})},1e3);async function d(){let[r,u]=await Promise.all([e(),t()]),d=u.length,f=0,p=0,m=0,h={},g=[],_=new Map;u.forEach(e=>_.set(e.id,e));let v={};r.forEach(e=>{let t=e.status===`resolved`,n=_.get(e.representId)?.location?.address||``,r=n.split(` `),i=r.length>=2?`${r[0]} ${r[1]}`:`기타 지역`;if(t){if(m++,e.resolvedAt&&e.createdAt){let t=e.resolvedAt-e.createdAt;v[i]||(v[i]={totalMs:0,count:0}),v[i].totalMs+=t,v[i].count++}}else{f++,e.danger===`high`&&(p++,g.push({...e,address:n}));let t=e.category||`기타`;h[t]=(h[t]||0)+1}}),i.textContent=d.toLocaleString(),a.textContent=f.toLocaleString(),o.textContent=p.toLocaleString(),s.textContent=m.toLocaleString(),c.innerHTML=``;let y=Object.entries(h).sort((e,t)=>t[1]-e[1]);y.length===0?c.innerHTML=`<div class="text-sm text-muted-foreground text-center mt-4">현재 접수된 미해결 위험이 없습니다.</div>`:y.forEach(([e,t])=>{let r=Math.round(t/f*100),i=n(e),a=document.createElement(`div`);a.className=`w-full`,a.innerHTML=`
        <div class="flex justify-between text-sm mb-1">
          <span class="font-medium text-foreground">${i}</span>
          <span class="text-muted-foreground">${t}건 (${r}%)</span>
        </div>
        <div class="w-full bg-surface-1 rounded-full h-2">
          <div class="bg-primary h-2 rounded-full" style="width: ${r}%"></div>
        </div>
      `,c.appendChild(a)});let b=document.getElementById(`ranking-board`);if(b){b.innerHTML=``;let e=Object.entries(v).map(([e,t])=>({name:e,avgMs:t.totalMs/t.count,count:t.count})).sort((e,t)=>e.avgMs-t.avgMs);if(e.length===0)b.innerHTML=`<div class="text-sm text-muted-foreground text-center mt-4">해결된 위험 데이터가 없습니다.</div>`;else{let t=[`🥇`,`🥈`,`🥉`];e.forEach((e,n)=>{let r=e.avgMs/(1e3*60*60),i=r>=24?`${(r/24).toFixed(1)}일`:`${Math.max(1,Math.round(r))}시간`,a=document.createElement(`div`);a.className=`flex items-center justify-between p-3 rounded-lg bg-surface/50 border border-border`,a.innerHTML=`
          <div class="flex items-center gap-3">
            <span class="text-xl">${n<3?t[n]:`<span class="text-sm font-bold text-muted-foreground w-6 text-center inline-block">${n+1}위</span>`}</span>
            <div>
              <p class="font-bold text-foreground text-sm">${e.name}</p>
              <p class="text-[10px] text-muted-foreground">누적 해결: ${e.count}건</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-primary">${i}</p>
            <p class="text-[10px] text-muted-foreground">평균 소요</p>
          </div>
        `,b.appendChild(a)})}}l.innerHTML=``,g.sort((e,t)=>(t.likes||0)-(e.likes||0)),g.length===0?l.innerHTML=`<tr><td colspan="4" class="px-5 py-8 text-center text-muted-foreground">현재 보고된 초고위험 구역이 없습니다. 안전합니다! 👏</td></tr>`:g.forEach(e=>{let t=document.createElement(`tr`);t.className=`hover:bg-surface/30 transition group`,t.innerHTML=`
        <td class="px-5 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface text-foreground border border-border">
            ${n(e.category)}
          </span>
        </td>
        <td class="px-5 py-3 text-foreground truncate max-w-xs">
          ${e.address||`주소 정보 없음`}
        </td>
        <td class="px-5 py-3">
          <div class="flex items-center gap-1 text-red-500 font-medium">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>
            ${e.likes||0}
          </div>
        </td>
        <td class="px-5 py-3 text-right">
          <a href="detail.html?id=${e.id}" class="text-primary hover:underline text-sm font-medium">조치하기</a>
        </td>
      `,l.appendChild(t)})}d();