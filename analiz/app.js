import {ratingBreakdownText} from './overall.js?v=36';
import {analysis as madrid} from './analysis-data.js?v=36';
import {analysis as baku} from './baku-data.js?v=39';
import {analysis as austria,sprint as austriaSprint} from './austria-data.js?v=42';
import {league as L} from '../data.js?v=42';
import {estimate,positionAt,pathSegments,paceAt,paceRange,zoomLapRange,lapGaps,lapGapLimit} from './model.js?v=35';
import {economy as E} from './economy.js?v=4';
import {overviewView,dayView,budgetView,budgetResultView} from './views.js?v=41';
import {siteConfig} from './site-config.js?v=4';
import {timelineView,timelineRows,filterTimeline} from './performance-views.js?v=41';
const query=new URLSearchParams(location.search);
const selectedRound=query.get('round');
const A=selectedRound==='10'?madrid:selectedRound==='11'?baku:query.get('session')==='sprint'?austriaSprint:austria;
const resultPath='#race/'+A.round+(A.session==='Sprint'?'/sprint':'');
const resultLabel=d=>d.status==='FIN'?'P'+d.position:d.classified?'P'+d.position+' · Yarış dışı':A.classificationSourceUrl?'P'+d.position+' · '+d.status:d.status;
const $=s=>document.querySelector(s), h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:0});
const ms=v=>v==null?'—':`${Math.floor(v/60000)}:${String(Math.floor(v/1000)%60).padStart(2,'0')}.${String(Math.round(v)%1000).padStart(3,'0')}`;
const money=v=>v==null?'Veri yetersiz':n.format(Math.round(v))+' TL';
const team=name=>L.teams.find(t=>t.name===name)||{};
const person=name=>L.pilots.find(p=>p.name===name)||{};
const driver=id=>A.drivers.find(d=>d.id===Number(id));
const full=(path)=>siteConfig.assetBase+path;
const labelNames={frontWing:'Ön kanat',rearWing:'Arka kanat',floor:'Taban',diffuser:'Difüzör',sidepod:'Sidepod'};
const partNames={front_left_wing:'Ön kanat · sol',front_right_wing:'Ön kanat · sağ',rear_wing:'Arka kanat',floor:'Taban',diffuser:'Difüzör',sidepod:'Sidepod',rear_left_tyre:'Sol arka lastik',rear_right_tyre:'Sağ arka lastik',front_left_tyre:'Sol ön lastik',front_right_tyre:'Sağ ön lastik'};
const colourLabels={green:'Artış gözlenmedi',orange:'Tek araçta artış',red:'İki araçta artış',grey:'Belirsiz / eksik'};
const pilotColours=['#ff5c70','#91c7ff'];
const tyre=id=>({16:'S · Yumuşak',17:'M · Orta',18:'H · Sert',7:'I · Geçiş',8:'W · Islak'}[id]||'Bileşik '+(id??'bilinmiyor'));
let view='overview',selected=A.dayDriver.id,comparison=A.drivers.find(d=>d.id!==A.dayDriver.id).id,lap=A.totalLaps,contactColour='all',contactPilot='all',chartMode='position',timelineKind='highlights',timelinePilot='all',pendingChartFocus=false;
let chartWindow={start:0,end:A.totalLaps};
let prices={...E.prices}, resizeObserver;
const pilotOptions=(value,all=false)=>(all?'<option value="all">Tüm pilotlar</option>':'')+A.drivers.map(d=>`<option value="${d.id}" ${String(d.id)===String(value)?'selected':''}>${h(d.name)}</option>`).join('');
const pilotCell=d=>`<div class="pilot-cell"><img src="${full(team(d.team).logo)}" alt="${h(d.team)}"><div><button data-driver="${d.id}">${h(d.name)}</button><small>${h(d.team)}</small></div></div>`;
const score=d=>d.rating==null?'<span class="muted small">Yarış notu yok</span>':`<span class="rating-value ${d.rating>=9?'best':''}">${d.rating.toFixed(1).replace('.',',')}</span><div class="rating-bar" aria-hidden="true"><i style="width:${d.rating*10}%"></i></div>`;
const passingDetails=d=>d.filteredOvertakes==null?'':`<div class="datum"><small>Kayda geçen pist üstü geçiş</small><strong>${d.filteredOvertakes}</strong></div><div class="datum"><small>Starttan resmî finişe net sıra</small><strong>${d.netGain==null?'—':(d.netGain>0?'+':'')+d.netGain}</strong></div>`;
const heading=(eyebrow,title,desc)=>`<section class="page-title"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${desc}</p></section>`;
const badge=(colour,text)=>`<span class="status-chip ${colour}"><i aria-hidden="true"></i>${h(text)}</span>`;
function viewContext(){return {A,E,L,h,full,resultLabel,resultPath,leagueBase:siteConfig.leagueBase,team,person,ms,money,driver,selected,comparison,lap,chartMode,pilotOptions,pilotCell,driverDetail,sourceNotes,heading,prices,labelNames,estimate,timelineKind,timelinePilot};}
function timeline(){return timelineView(viewContext());}
function updateTimeline(){const context=viewContext();$('#timeline-events').innerHTML=timelineRows(context);$('#timeline-count').textContent=filterTimeline(A.timeline,timelineKind,timelinePilot).length+' / '+A.timeline.length+' olay';}
function day(){return dayView(viewContext());}
function overview(){return overviewView(viewContext());}

function revealLap(target){
 lap=target;
 if(lap>=chartWindow.start&&lap<=chartWindow.end)return;
 const span=chartWindow.end-chartWindow.start;
 const start=Math.min(A.totalLaps-span,Math.max(0,lap-Math.floor(span/2)));
 chartWindow={start,end:start+span};
}

function setChartWindow(window){
 chartWindow=window;
 lap=Math.min(window.end,Math.max(window.start,lap));
 drawChart();
}

function lapTable(d){
 const samples=new Map(d.lapTimes.map(sample=>[sample.lap,sample]));
 const lastLap=Math.max(d.completedLaps??0,...samples.keys());
 const rows=Array.from({length:lastLap},(_,index)=>{
  const number=index+1,sample=samples.get(number);
  if(!sample?.timeMs)return `<tr><th scope="row">${number}</th><td>—</td><td>—</td><td>Kayıt yok</td></tr>`;
  const sectors=sample.sectorTimesMs?.some(value=>value>0)
   ?`<small class="lap-sectors">${sample.sectorTimesMs.map((value,i)=>`<span>S${i+1} ${ms(value)}</span>`).join('')}</small>`:'';
  const context=sample.exclusions?.join(' · ')||(sample.eligible?'Temiz tempo':'Bağlam eksik');
  return `<tr><th scope="row"><button type="button" data-lap-time="${number}" aria-label="${number}. turu grafikte göster">${number}</button></th><td><strong>${ms(sample.timeMs)}</strong>${sectors}</td><td>${sample.tyreCompound==null?'—':h(tyre(sample.tyreCompound))}</td><td class="${sample.eligible?'clean-lap':''}">${h(context)}</td></tr>`;
 }).join('');
 return `<section class="lap-table" aria-label="${h(d.name)} tur süreleri"><div class="section-head"><h3>Tur tur süreler</h3><span class="muted small">${samples.size} kayıt · ${d.paceSamples} temiz tur</span></div><div class="table-scroll lap-table-scroll"><table class="table"><thead><tr><th scope="col">Tur</th><th scope="col">Süre</th><th scope="col">Lastik</th><th scope="col">Bağlam</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Kaydedilmiş tur süresi yok.</td></tr>'}</tbody></table></div><p class="note">Bir tur numarasına dokunarak grafikte açabilirsin. Lastik bilgisi gözlendiği tur başındaki bileşiği gösterir.</p></section>`;
}

function driverDetail(d){return `<div class="driver-banner"><div class="identity"><i class="team-mark" style="--team:${team(d.team).color}" aria-hidden="true"></i><div><p class="eyebrow">SEÇİLİ PİLOT</p><h3>${h(d.name)}</h3><span class="muted small">${h(d.team)}</span></div></div><div class="result">${resultLabel(d)}</div></div><div class="data-grid"><div class="datum"><small>Start / ${A.classificationStatus==='provisional'?'geçici finiş':'kesin finiş'}</small><strong>P${d.grid} / ${resultLabel(d)}</strong></div>${passingDetails(d)}<div class="datum"><small>En iyi yarış turu</small><strong>${ms(d.bestLapMs)}</strong></div><div class="datum"><small>Filtrelenmiş tur medyanı</small><strong>${ms(d.paceMedianMs)}</strong><p class="note">${d.paceSamples} tur örneği</p></div><div class="datum"><small>Sonuç ekranı pit sayısı</small><strong>${d.pitStops}</strong></div><div class="datum"><small>Sıralama derecesi</small><strong>${ms(d.qualifyingBestLapMs)}</strong></div><div class="datum"><small>Yarış reytingi</small><strong>${d.rating==null?'Bekliyor':d.rating.toFixed(1).replace('.',',')+' / 10'}</strong></div></div>${lapTable(d)}<div class="pit-list">${d.pits.length?d.pits.map(p=>`<div class="pit-item"><span><b>Pit ${p.number} · ${p.entry_lap==null?'Tur bilinmiyor':'Tur '+p.entry_lap}</b>Giriş P${p.entry_position??'—'} / çıkış P${p.exit_position??'—'}</span><span><b>${h(tyre(p.tyre_before))} / ${h(tyre(p.tyre_after))}</b>${p.stationary_time_ms==null?'Duraklama bilinmiyor':(p.stationary_time_ms/1000).toFixed(2).replace('.',',')+' sn duraklama'}${p.entry_observed&&p.exit_observed?'':' · Kısmi gözlem'}</span></div>`).join(''):'<p class="muted">Kaydedilmiş pit ziyareti yok.</p>'}</div><p class="note">Medyan için 1. tur, geçersiz turlar ve pit, SC/VSC, temas veya lastik değişimi gözlenen turlar çıkarıldı. Yakıt ve trafik etkisi tamamen ayrıştırılmadığı için pilotlar arası eşit koşul temposu değildir. Pit giriş/çıkış gözlemleri sonuç ekranındaki toplamla farklı olabilir.</p>`;}
function gapDescription(drivers,gap){
 if(gap===0)return 'İki pilotun süresi eşit.';
 const seconds=(Math.abs(gap)/1000).toFixed(3).replace('.',',');
 return drivers[gap>0?0:1].name+' '+seconds+' sn daha hızlı.';
}

function drawLapGap(drivers,isPace,includeAll){
 const panel=$('#lap-gap-panel');
 const comparing=isPace&&drivers.length===2;
 panel.hidden=!comparing;
 $('#chart-display').classList.toggle('is-comparing',comparing);
 if(!comparing)return;

 const rows=lapGaps(drivers[0],drivers[1],chartWindow,includeAll);
 const limit=lapGapLimit(rows);
 const selectedGap=rows.find(row=>row.lap===lap)?.gap??null;
 const message=$('#lap-comparison');
 $('#lap-gap-lap').textContent=lap===0?'Start':'Tur '+lap;
 message.textContent=selectedGap===null?'Bu turda ortak süre yok.':gapDescription(drivers,selectedGap);
 message.dataset.leader=selectedGap>0?'first':selectedGap<0?'second':'';
 $('#lap-gap-legend').innerHTML=drivers.map((d,i)=>
  `<span><i style="background:${pilotColours[i]}" aria-hidden="true"></i>${i===0?'Üstte':'Altta'} · ${h(d.name)} daha hızlı</span>`).join('');
 const chart=$('#lap-gap-chart');
 const note=$('#lap-gap-note');
 note.hidden=!rows.some(row=>row.gap!==null&&Math.abs(row.gap)>limit);
 if(limit===null){
  chart.innerHTML='<p class="note">Bu tur aralığında ortak süre yok.</p>';
  return;
 }

 const width=Math.max(270,chart.clientWidth),height=168,left=48,right=12,top=12,zero=71,bottom=130;
 const slot=(width-left-right)/rows.length;
 const barWidth=Math.min(24,Math.max(3,slot*.68));
 const toY=gap=>zero-gap/limit*(zero-top);
 const scale=(limit/1000).toLocaleString('tr-TR');
 let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="İki pilotun aynı turdaki saniye farkları">`;
 for(const [value,label] of [[top,'+'+scale],[zero,'0'],[bottom,'−'+scale]]){
  svg+=`<line x1="${left}" x2="${width-right}" y1="${value}" y2="${value}" class="${value===zero?'lap-gap-zero':'lap-gap-grid'}"/><text class="axis" x="${left-7}" y="${value+4}" text-anchor="end">${label}</text>`;
 }
 const labelEvery=Math.ceil(34/slot);
 rows.forEach(({lap:number,gap},i)=>{
  const start=left+i*slot,center=start+slot/2,active=number===lap;
  if(active)svg+=`<rect class="lap-gap-current" x="${start}" y="6" width="${slot}" height="132" rx="3"/>`;
  const regularLabel=i===0||i===rows.length-1||i%labelEvery===0;
  if(active||regularLabel&&Math.abs(number-lap)>=labelEvery){
   svg+=`<text class="axis${active?' lap-gap-selected-label':''}" x="${center}" y="153" text-anchor="middle">${number}</text>`;
  }
  if(gap===null)return;
  const colour=pilotColours[gap>0?0:1];
  const y=toY(Math.max(-limit,Math.min(limit,gap)));
  if(gap===0)svg+=`<circle cx="${center}" cy="${zero}" r="3" fill="#b4b7c4"/>`;
  else svg+=`<rect x="${center-barWidth/2}" y="${Math.min(zero,y)}" width="${barWidth}" height="${Math.max(2,Math.abs(y-zero))}" rx="2" fill="${colour}" opacity="${active?1:.78}"/>`;
  if(Math.abs(gap)>limit){
   const direction=Math.sign(gap);
   svg+=`<path d="M ${center-3} ${y+direction*3} L ${center} ${y-direction*4} L ${center+3} ${y+direction*3} Z" fill="${colour}"/>`;
  }
  svg+=`<rect data-gap-lap="${number}" x="${start}" y="6" width="${slot}" height="150" fill="transparent"><title>Tur ${number} · ${h(gapDescription(drivers,gap))}</title></rect>`;
 });
 chart.innerHTML=svg+'</svg>';
}

function drawChart(){
 const box=$('#position-chart');if(!box)return;
 const ds=[driver(selected),...(selected===comparison?[]:[driver(comparison)])];
 const isPace=chartMode!=='position',includeAll=chartMode==='all';
 const {start,end}=chartWindow,span=end-start;
 const slider=$('#lap-select');
 $('#lap-window-start').value=String(start);
 $('#lap-window-end').value=String(end);
 slider.min=String(start);
 slider.max=String(end);
 slider.value=String(lap);
 slider.disabled=span===0;
 $('[data-chart-zoom=in]').disabled=span<=1;
 $('[data-chart-zoom=out]').disabled=span===A.totalLaps;
 const w=Math.max(270,box.clientWidth),height=320,left=isPace?76:38,right=15,top=16,bottom=35,plotW=w-left-right,plotH=height-top-bottom;
 const range=isPace?paceRange(ds,includeAll,chartWindow):null,colours=pilotColours;
 const valueAt=(d,l)=>isPace?paceAt(d,l,includeAll):positionAt(d,l);
 const x=v=>left+(span===0?.5:(v-start)/span)*plotW;
 const y=v=>isPace?top+(v-range.min)/(range.max-range.min)*plotH:top+(v-1)/Math.max(1,A.driverCount-1)*plotH;
 const spread=range?range.max-range.min:0;
 const precision=spread<400?3:spread<2000?2:1;
 const rounding=10**(3-precision);
 const axisTime=v=>{
  const label=ms(Math.round(v/rounding)*rounding);
  return label.slice(0,label.length-3+precision);
 };
 if(isPace&&!range)box.innerHTML=includeAll
  ?'<div class="chart-empty">Bu aralıkta seçili pilotlar için kaydedilmiş tur süresi yok.</div>'
  :'<div class="chart-empty">Bu aralıkta temiz tempo örneği yok. Tüm tur süreleri seçeneğinde kaydedilen turları görebilirsin.</div>';
 else{
  let svg=`<svg viewBox="0 0 ${w} ${height}" aria-hidden="true"><defs><clipPath id="plot-clip"><rect x="${left-5}" y="${top-5}" width="${plotW+10}" height="${plotH+10}"/></clipPath></defs>`;
  const ticks=isPace?Array.from({length:5},(_,i)=>range.min+(range.max-range.min)*i/4):Array.from({length:Math.ceil(A.driverCount/2)},(_,i)=>1+i*2);
  for(const p of ticks)svg+=`<line x1="${left}" x2="${w-right}" y1="${y(p)}" y2="${y(p)}" stroke="#363845"/><text class="axis" x="${left-9}" y="${y(p)+5}" text-anchor="end">${isPace?axisTime(p):'P'+p}</text>`;
  const tickCount=Math.min(span+1,Math.max(2,Math.floor(plotW/45)));
  for(let i=0;i<tickCount;i++){
   const l=start+Math.round(i*span/Math.max(1,tickCount-1));
   const anchor=span===0?'middle':l===start?'start':l===end?'end':'middle';
   svg+=`<text class="axis" x="${x(l)}" y="${height-8}" text-anchor="${anchor}">${l===0?'Start':l}</text>`;
  }
  svg+=`<line x1="${x(lap)}" x2="${x(lap)}" y1="${top}" y2="${height-bottom}" stroke="#85899b" stroke-dasharray="3 4"/><g clip-path="url(#plot-clip)">`;
  ds.forEach((d,i)=>{
   const points=Array.from({length:span+1},(_,offset)=>{const l=start+offset,value=valueAt(d,l);return value==null?null:{x:x(l),y:y(value),outside:includeAll&&paceAt(d,l)===null};});
   for(const segment of pathSegments(points))svg+=`<path d="${segment.map((p,j)=>(j?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ')}" stroke="${colours[i]}" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`;
   for(const point of points.filter(Boolean))svg+=`<circle cx="${point.x}" cy="${point.y}" r="${point.outside?3:2.3}" fill="${point.outside?'#191a22':colours[i]}" stroke="${colours[i]}"/>`;
   const value=valueAt(d,lap);if(value!=null)svg+=`<circle cx="${x(lap)}" cy="${y(value)}" r="5" fill="${colours[i]}" stroke="#191a22" stroke-width="2"/>`;
  });
  box.innerHTML=svg+'</g></svg>';
 }
 box.setAttribute('aria-label',includeAll?'Seçili pilotların kaydedilmiş tüm tur süreleri.':isPace?'Seçili pilotların temiz tempo tur süreleri.':'Seçili pilotların kaydedilmiş tur pozisyonları.');
 $('#chart-axis-label').textContent=includeAll?'KAYITLI TÜM TUR SÜRELERİ':isPace?'TEMİZ TEMPO · DÜŞÜK SÜRE DAHA HIZLI':'POZİSYON · DÜŞÜK SIRA NUMARASI DAHA İYİ';
 document.querySelectorAll('[data-chart-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chartMode===chartMode)));
 $('#chart-legend').innerHTML=ds.map((d,i)=>`<span><i style="background:${colours[i]}" aria-hidden="true"></i>${h(d.name)}${isPace?' · '+(includeAll?d.lapTimes.length:d.paceSamples)+' tur':''}</span>`).join('');
 $('#lap-title').textContent=lap===0?'Start':'Tur '+lap;
 $('#lap-readout').innerHTML=ds.map(d=>{
  const value=valueAt(d,lap),sample=d.lapTimes.find(l=>l.lap===lap);
  const text=isPace&&sample?.timeMs>0?ms(sample.timeMs):value!=null?'P'+value:lap===0?'Start · süre yok':'Kayıt yok';
  const context=isPace&&sample&&!sample.eligible?(sample.exclusions?.join(' · ')||'Temiz tempo dışında'):'';
  return `<div><span>${h(d.name)}</span><b>${text}</b>${context?'<small>'+h(context)+'</small>':''}</div>`;
 }).join('');
 drawLapGap(ds,isPace,includeAll);
 $('#chart-note').textContent=includeAll?'Boş halkalar temiz tempo hesabının dışında kalan kayıtları gösterir. Eksik turlar grafikte boş kalır.'
  :isPace?'Grafik yalnız temiz tempo örneklerini çizer. Tur seçtiğinde kayıtlı süre ve varsa filtre nedeni aşağıda görünür.'
  :'Çizgiler kaydedilmiş pozisyonları gösterir. Eksik turlar bağlanmaz ve DNF sonrası uzatılmaz. Bu grafik atak sayısı değildir.';
}

function deductionNote(driver){
 const breakdown=ratingBreakdownText(driver.ratingBreakdown);
 return breakdown?`<p class="note">${h(breakdown)}</p>`:'';
}
function ratings(){
 const sorted=[...A.drivers].sort((a,b)=>(b.rating??-1)-(a.rating??-1)||a.position-b.position);
 const best=sorted[0],p=person(best.name),rated=sorted.filter(d=>d.rating!=null).length;
 return heading(h(A.track.toLocaleUpperCase('tr'))+' · HAFTA SONU DEĞERLENDİRMESİ','PİLOT REYTİNGLERİ.','Yarış performansı ve kaydedilen veriler birlikte değerlendirildi. O haftanın notu burada, kalıcı OVR pilot kartında.')+
 `<section class="leader-panel"><div><p class="eyebrow">EN YÜKSEK YARIŞ REYTİNGİ</p><h2>${h(best.name)}</h2><div class="leader-score">${best.rating.toFixed(1).replace('.',',')} <small>/ 10</small></div><p>${h(best.ratingReason)}</p><button class="source-link" data-driver="${best.id}">Değerlendirmeyi incele</button></div><img src="${full(p.portrait)}" alt="${h(best.name)} için temsilî ${h(p.representative)} portresi"></section><div class="panel table-scroll"><table class="table rating-table"><thead><tr><th>Pilot</th><th>Reyting / 10</th><th>Start / finiş</th><th class="num">Puan</th><th>Değerlendirme</th></tr></thead><tbody>${sorted.map(d=>`<tr><td>${pilotCell(d)}</td><td>${score(d)}</td><td>P${d.grid} / ${resultLabel(d)}</td><td class="num">${d.points}</td><td style="min-width:280px;max-width:450px">${h(d.ratingReason)}${deductionNote(d)}</td></tr>`).join('')}</tbody></table></div><p class="note">${rated} pilot değerlendirildi. Yarış notu sıralamayı, kaydedilen yarış performansını ve sonucu birlikte değerlendirir. DNF, pist sınırı uyarıları, oyun yaptırımları ve FIA kararları ayrı gösterilir. Uyarıların ürettiği zaman cezası aynı ihlal grubunda değerlendirilir.</p>${A.round===12?`<p class="note">Avusturya notunda geçerli en iyi tur, aynı tur ve lastikteki tempo, resmî sıra değişimi ve telemetriyle eşleşen pist üstü geçişler değerlendirilir. ${A.session==='Sprint'?'Sprint sıralamasının tur dereceleri mevcut.':'Ana yarış için sıralama tur dereceleri kayda gelmedi. Grid, start konumu olarak kullanıldı.'}</p>`:''}`;
}
function budget(){return budgetView(viewContext());}

function budgetResult(){return budgetResultView(viewContext());}

function contacts(){const counts=Object.fromEntries(['green','orange','red','grey'].map(c=>[c,A.contacts.filter(x=>x.colour===c).length]));return heading(h(A.track.toLocaleUpperCase('tr'))+' · GÖZLENEN OLAYLAR','TEMAS KAYITLARI.','Hangi turda kimlerle temas kaydedildi? Renkler, temas çevresinde gözlenen yeni hasarı anlatır. Hakem kararı veya kusur değerlendirmesi içermez.')+`<div class="metric-grid">${['green','orange','red','grey'].map(c=>`<article class="metric"><span class="label">${colourLabels[c]}</span><strong class="${c}">${counts[c]} olay</strong><small>${c==='grey'?'Eksik veri veya yakın temaslar':c==='green'?'Yeni hasar artışı gözlenmedi':c==='orange'?'Bir araçta yeni hasar artışı':'Her iki araçta yeni hasar artışı'}</small></article>`).join('')}</div><div class="filters"><label>Pilot<select id="contact-pilot">${pilotOptions(contactPilot,true)}</select></label><label>Hasar gözlemi<select id="contact-colour"><option value="all">Tüm kayıtlar</option>${Object.entries(colourLabels).map(([k,v])=>`<option value="${k}" ${contactColour===k?'selected':''}>${v}</option>`).join('')}</select></label><span class="count-label" id="contact-count"></span></div><div id="contact-results" class="contacts-list">${contactResults()}</div><p class="note">Pist sınırı ihlali, kasıt, savunma hakkı ve temasın gerçek nedeni yalnız bu kayıttan belirlenmez. Tur ve zaman, oyunun gönderdiği temas olayından gelir; video incelemesi için başlangıç noktasıdır.</p>`;}
function contactResults(){const rows=A.contacts.filter(c=>(contactColour==='all'||c.colour===contactColour)&&(contactPilot==='all'||c.car1===Number(contactPilot)||c.car2===Number(contactPilot)));return rows.map(c=>`<article class="contact"><div class="contact-time"><b>Tur ${c.lap??'—'}</b><span>${Math.floor(c.seconds/60)}:${String(Math.floor(c.seconds)%60).padStart(2,'0')}</span></div><div><div class="contact-top"><h3>${h(c.name1)} / ${h(c.name2)}</h3>${badge(c.colour,colourLabels[c.colour])}</div><p>${h(c.reason)}</p><div class="damage-tags">${c.changes.map(p=>`<span>${h(p.name)} · ${h(partNames[p.part]||p.part)} ${p.before}% / ${p.after}%</span>`).join('')}</div></div></article>`).join('')||'<div class="empty">Bu filtrelerde temas kaydı yok.</div>';}
function sourceNotes(){if(A.classificationSourceUrl)return `<section class="section panel"><div class="section-head"><div><p class="eyebrow">KAYNAK VE KAPSAM</p><h2>${h(A.track)} yarış kaydı</h2></div><a class="source-link" href="${h(A.classificationSourceUrl)}" target="_blank" rel="noopener">Discord · Resmî sonuç</a></div>${A.quality.map(q=>`<p class="note">${h(q)}</p>`).join('')}</section>`;return `<section class="section panel"><div class="section-head"><div><p class="eyebrow">KAYNAK VE KAPSAM</p><h2>Verinin anlattığı kadar.</h2></div><a class="source-link" href="${full('assets/results-madrid-r10.png')}" target="_blank" rel="noopener">Kesin sonuç görseli</a></div><div class="source-grid"><div><strong>Sıralama + yarış ayrıldı.</strong><p>Tek kayıt içinde iki seans var. Sıralama kaydı oturumun yaklaşık 6. dakikasında başladı; final sıralama paketi mevcut.</p></div><div><strong>Kesin sonuç görselden.</strong><p>Yarışın final klasman paketi gelmedi. Son sıra, puan, DNF ve en iyi tur için yönetimin görseli kullanıldı.</p></div><div><strong>11 pilot eşleştirildi.</strong><p>Gizli isimler aynı hafta sonundaki takım, grid ve sonuç görseliyle eşleştirildi. Bu eşleştirme başka yarışa otomatik taşınmaz.</p></div></div><details><summary>Kayıttaki farkları ve sınırları göster</summary>${A.quality.map(q=>`<p class="note">${h(q)}</p>`).join('')}<p class="note">Reytingler FPL performans değerlendirmesidir. Sanal hasar bütçesi, şampiyona ve disiplin puanlarından ayrı takip edilir.</p></details></section>`;}
function render(){
 resizeObserver?.disconnect();
 view=location.hash.slice(1)||'overview';if(view==='cards'){location.replace(siteConfig.leagueBase+'#home/pilot-cards');return;}if(!['overview','timeline','day','ratings','budget','contacts'].includes(view))view='overview';
 document.querySelectorAll('[data-view]').forEach(a=>{const active=a.dataset.view===view||(a.dataset.view==='day'&&['day','ratings'].includes(view));a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('#main').innerHTML=`<nav class="performance-subnav" aria-label="Yarış seçimi">${[
  [austria,'?round=12','Avusturya GP · R12'],
  [austriaSprint,'?round=12&session=sprint','Avusturya Sprint · R12'],
  [baku,'?round=11','Bakü GP · R11'],
  [madrid,'?round=10','Madrid GP · R10']
 ].map(([report,url,label])=>`<a href="${url}" ${A===report?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`+(['day','ratings'].includes(view)?'<nav class="performance-subnav" aria-label="Performans bölümleri">'+[['day','Günün sürücüsü'],['ratings','Yarış reytingleri']].map(([route,label])=>`<a href="#${route}" ${view===route?'aria-current="page"':''}>${label}</a>`).join('')+'</nav>':'')+({overview,timeline,day,ratings,budget,contacts}[view])();
 document.title=({overview:A.track+' yarış raporu',timeline:'Yarış zaman çizelgesi',day:'Günün sürücüsü',ratings:'Pilot reytingleri',budget:'Hasar bütçesi',contacts:'Temas kayıtları'}[view])+' | '+siteConfig.title;
 if(view==='overview'){drawChart();resizeObserver=new ResizeObserver(drawChart);resizeObserver.observe($('#position-chart'));}
 if(view==='contacts')updateContactCount();if(view==='timeline')updateTimeline();
 $('#main').dataset.ready='true';
 $('#announcer').textContent=document.title;
}
function updateContactCount(){const count=A.contacts.filter(c=>(contactColour==='all'||c.colour===contactColour)&&(contactPilot==='all'||c.car1===Number(contactPilot)||c.car2===Number(contactPilot))).length;$('#contact-count').textContent=count+' / '+A.contacts.length+' temas';}
function openDriver(id){const d=driver(id),p=person(d.name);$('#dialog-content').innerHTML=`<div class="dialog-title"><img src="${full(p.portrait)}" alt="${h(d.name)} için temsilî ${h(p.representative)} portresi"><div><p class="eyebrow">${h(A.track.toLocaleUpperCase('tr'))} · YARIŞ DEĞERLENDİRMESİ</p><h2 id="dialog-title">${h(d.name)}</h2><span class="muted">${h(d.team)}</span></div></div><div class="leader-score">${d.rating==null?'Bekliyor':d.rating.toFixed(1).replace('.',',')+' <small>/ 10</small>'}</div><p>${h(d.ratingReason)}</p>${deductionNote(d)}<div class="data-grid"><div class="datum"><small>Start / finiş</small><strong>P${d.grid} / ${resultLabel(d)}</strong></div>${passingDetails(d)}<div class="datum"><small>Sıralama</small><strong>${d.qualifyingPosition==null?'—':'P'+d.qualifyingPosition}</strong></div><div class="datum"><small>Yarış puanı</small><strong>${d.points}</strong></div><div class="datum"><small>En iyi tur</small><strong>${ms(d.bestLapMs)}</strong></div><div class="datum"><small>Filtrelenmiş medyan</small><strong>${ms(d.paceMedianMs)}</strong><p class="note">${d.paceSamples} tur örneği</p></div><div class="datum"><small>Sonuç ekranı pit</small><strong>${d.pitStops}</strong></div>${d.ratingBreakdown?`<div class="datum"><small>Yarışta pist sınırı uyarısı</small><strong>${d.ratingBreakdown.trackWarnings}</strong></div><div class="datum"><small>${A.round===12?'Sıralamada kaydedilen geçersiz tur':'Sıralamada pist sınırı kaynaklı tur iptali'}</small><strong>${d.ratingBreakdown.qualifyingInvalidations??'—'}</strong><p class="note">${A.round===10?'Kayıt başladıktan sonraki bildirimler. ':''}Sıralama notu geçerli turlara dayanır.</p></div>`:''}</div><p class="fine-line">Görsel temsilî F1 pilotudur. Reyting FPL performans değerlendirmesidir; temas sayısı veya hasar verisinin paylaşılmaması tek başına puan kesintisi değildir. Farklı yakıt, lastik ve trafik koşulları tamamen ayrıştırılmadı.</p><a class="source-link" href="${siteConfig.leagueBase}#pilot/${h(p.id)}">Pilot profili</a>`;$('#driver-dialog').showModal();}
document.addEventListener('change',e=>{
 if(e.target.id==='lap-window-start'){
  const start=Number(e.target.value);
  setChartWindow({start,end:Math.max(chartWindow.end,start)});
 }
 if(e.target.id==='lap-window-end'){
  const end=Number(e.target.value);
  setChartWindow({start:Math.min(chartWindow.start,end),end});
 }
 if(e.target.id==='timeline-kind'){timelineKind=e.target.value;updateTimeline();}if(e.target.id==='timeline-pilot'){timelinePilot=e.target.value;updateTimeline();}if(e.target.id==='pilot-select'){selected=Number(e.target.value);$('#driver-detail').innerHTML=driverDetail(driver(selected));drawChart();}
 if(e.target.id==='comparison-select'){comparison=Number(e.target.value);drawChart();}
 if(e.target.id==='contact-pilot'){contactPilot=e.target.value;$('#contact-results').innerHTML=contactResults();updateContactCount();}
 if(e.target.id==='contact-colour'){contactColour=e.target.value;$('#contact-results').innerHTML=contactResults();updateContactCount();}
 if(e.target.dataset.price){const key=e.target.dataset.price,value=Number(e.target.value);if(!Number.isFinite(value)||value<0||value>1000000000){e.target.value=prices[key];return;}prices[key]=value;$('#budget-result').innerHTML=budgetResult();$('#announcer').textContent='Sanal hasar karşılıkları yeni fiyatla güncellendi.';}
});
document.addEventListener('input',e=>{
 if(e.target.id==='lap-select'){lap=Number(e.target.value);drawChart();}
 if(e.target.dataset.price){const key=e.target.dataset.price,value=Number(e.target.value);if(e.target.value===''||!Number.isFinite(value)||value<0||value>1000000000)return;prices[key]=value;$('#budget-result').innerHTML=budgetResult();$('#announcer').textContent='Sanal hasar karşılıkları yeni fiyatla güncellendi.';}
});
document.addEventListener('click',e=>{
 const jump=e.target.closest('[data-timeline-jump]');
 if(jump){
  revealLap(Math.min(A.totalLaps,Math.max(0,Number(jump.dataset.timelineJump))));
  if(jump.dataset.timelineDriver!=null)selected=Number(jump.dataset.timelineDriver);
  chartMode='position';
  pendingChartFocus=true;
  location.hash='overview';
 }
 const lapButton=e.target.closest('[data-lap-time]');
 if(lapButton){
  revealLap(Number(lapButton.dataset.lapTime));
  chartMode='all';
  drawChart();
  $('#lap-select').focus({preventScroll:true});
  const target=$('#lap-gap-panel').hidden?$('#position-chart'):$('#lap-gap-panel');
  target.scrollIntoView({block:'center'});
 }
 const gapBar=e.target.closest('[data-gap-lap]');
 if(gapBar){
  lap=Number(gapBar.dataset.gapLap);
  drawChart();
  $('#lap-select').focus({preventScroll:true});
 }
 const mode=e.target.closest('[data-chart-mode]');
 if(mode){
  chartMode=mode.dataset.chartMode;
  drawChart();
 }
 const zoom=e.target.closest('[data-chart-zoom]')?.dataset.chartZoom;
 if(zoom==='last'){
  setChartWindow({start:Math.max(1,A.totalLaps-4),end:A.totalLaps});
 }else if(zoom==='reset'){
  setChartWindow({start:0,end:A.totalLaps});
 }else if(zoom){
  setChartWindow(zoomLapRange(chartWindow,A.totalLaps,lap,zoom==='in'?.5:2));
 }
 if(e.target.closest('[data-reset-prices]')){
  prices={...E.prices};
  document.querySelectorAll('[data-price]').forEach(input=>input.value=prices[input.dataset.price]);
  $('#budget-result').innerHTML=budgetResult();
  $('#announcer').textContent='Lig tarifesi geri yüklendi.';
 }
 const b=e.target.closest('[data-driver]');
 if(b)openDriver(b.dataset.driver);
 if(e.target.closest('.close-dialog'))$('#driver-dialog').close();
});
$('#driver-dialog').addEventListener('click',e=>{if(e.target===$('#driver-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
window.addEventListener('hashchange',()=>{if(location.hash==='#main')return;render();if(pendingChartFocus){pendingChartFocus=false;$('#position-chart')?.scrollIntoView?.({block:'center',behavior:'auto'});}else window.scrollTo({top:0,behavior:'auto'});});
render();
