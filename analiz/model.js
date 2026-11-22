export function estimate(driver,prices){
 if(driver.peakDamage==null)return null;
 return Object.entries(driver.peakDamage).reduce((sum,[part,percent])=>sum+percent/100*prices[part],0);
}
export function positionAt(driver,lap){return lap===0?driver.grid:driver.positions.find(p=>p.lap===lap)?.position??null;}
export function pathSegments(points){
 const segments=[];let segment=[];
 for(const p of points){if(p==null){if(segment.length)segments.push(segment);segment=[];}else segment.push(p);}
 if(segment.length)segments.push(segment);return segments;
}
const paceTime=(sample,includeAll)=>sample?.timeMs>0&&(includeAll||sample.eligible)?sample.timeMs:null;
export function paceAt(driver,lap,includeAll=false){
 return paceTime(driver.lapTimes.find(p=>p.lap===lap),includeAll);
}
export function paceRange(drivers,includeAll=false,window={start:0,end:Infinity}){
 const samples=drivers.flatMap(d=>d.lapTimes
  .filter(sample=>sample.lap>=window.start&&sample.lap<=window.end)
  .map(sample=>paceTime(sample,includeAll)).filter(value=>value!==null));
 if(!samples.length)return null;
 const minimum=Math.min(...samples),maximum=Math.max(...samples),padding=Math.max(50,(maximum-minimum)*.12);
 return {min:Math.floor(minimum-padding),max:Math.ceil(maximum+padding)};
}
export function zoomLapRange(window,totalLaps,lap,factor){
 const size=window.end-window.start+1;
 const nextSize=Math.min(totalLaps+1,Math.max(2,Math.round(size*factor)));
 const anchor=(lap-window.start)/Math.max(1,size-1);
 const start=Math.min(totalLaps-nextSize+1,Math.max(0,Math.round(lap-anchor*(nextSize-1))));
 return {start,end:start+nextSize-1};
}
export function lapGaps(first,second,window,includeAll=false){
 const start=Math.max(1,window.start);
 return Array.from({length:Math.max(0,window.end-start+1)},(_,i)=>{
  const lap=start+i;
  const firstTime=paceAt(first,lap,includeAll),secondTime=paceAt(second,lap,includeAll);
  return {lap,gap:firstTime===null||secondTime===null?null:secondTime-firstTime};
 });
}
export function lapGapLimit(rows){
 const gaps=rows.filter(row=>row.gap!==null).map(row=>Math.abs(row.gap)).sort((a,b)=>a-b);
 if(!gaps.length)return null;
 // A few large gaps should not compress the rest of the chart.
 const typical=gaps[Math.ceil(gaps.length*.8)-1];
 return Math.max(500,Math.ceil(typical/500)*500);
}
export function teamEconomy(drivers,prices,budget){
 return [...new Set(drivers.map(d=>d.team))].map(name=>{
  const members=drivers.filter(d=>d.team===name),known=members.filter(d=>d.peakDamage!==null);
  const value=known.length?known.reduce((sum,d)=>sum+estimate(d,prices),0):null;
  return {name,known:known.length,total:members.length,unknown:members.length-known.length,value,budget,share:value===null?null:value/budget*100};
 }).sort((a,b)=>(b.value??-1)-(a.value??-1));
}
