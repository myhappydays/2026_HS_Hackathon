import{d as e,p as t,t as n}from"./utils-q2FoRUtQ.js";import{t as r}from"./theme-BGQI_Gbl.js";r();var i=document.getElementById(`stat-total-reports`),a=document.getElementById(`stat-active-clusters`),o=document.getElementById(`stat-high-danger`),s=document.getElementById(`stat-resolved`),c=document.getElementById(`category-stats`),l=document.getElementById(`urgent-list`),u=document.getElementById(`current-time`);setInterval(()=>{u.textContent=new Date().toLocaleString(`ko-KR`,{year:`numeric`,month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`})},1e3);async function d(){let[r,u]=await Promise.all([e(),t()]),d=u.length,f=0,p=0,m=0,h={},g=[];r.forEach(e=>{if(e.status===`resolved`)m++;else{f++,e.danger===`high`&&(p++,g.push(e));let t=e.category||`기타`;h[t]=(h[t]||0)+1}}),i.textContent=d.toLocaleString(),a.textContent=f.toLocaleString(),o.textContent=p.toLocaleString(),s.textContent=m.toLocaleString(),c.innerHTML=``;let _=Object.entries(h).sort((e,t)=>t[1]-e[1]);_.length===0?c.innerHTML=`<div class="text-sm text-muted-foreground text-center mt-4">현재 접수된 미해결 위험이 없습니다.</div>`:_.forEach(([e,t])=>{let r=Math.round(t/f*100),i=n(e),a=document.createElement(`div`);a.className=`w-full`,a.innerHTML=`
        <div class="flex justify-between text-sm mb-1">
          <span class="font-medium text-foreground">${i}</span>
          <span class="text-muted-foreground">${t}건 (${r}%)</span>
        </div>
        <div class="w-full bg-surface-1 rounded-full h-2">
          <div class="bg-primary h-2 rounded-full" style="width: ${r}%"></div>
        </div>
      `,c.appendChild(a)}),l.innerHTML=``,g.sort((e,t)=>(t.likes||0)-(e.likes||0)),g.length===0?l.innerHTML=`<tr><td colspan="4" class="px-5 py-8 text-center text-muted-foreground">현재 보고된 초고위험 구역이 없습니다. 안전합니다! 👏</td></tr>`:g.forEach(e=>{let t=document.createElement(`tr`);t.className=`hover:bg-surface/30 transition group`,t.innerHTML=`
        <td class="px-5 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface text-foreground border border-border">
            ${n(e.category)}
          </span>
        </td>
        <td class="px-5 py-3 text-foreground truncate max-w-xs">
          ${e.reports[0]?.address||`주소 정보 없음`}
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