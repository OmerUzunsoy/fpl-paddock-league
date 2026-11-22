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
export function paceAt(driver,lap){const sample=driver.lapTimes.find(p=>p.lap===lap);return sample?.eligible?sample.timeMs:null;}
export function paceRange(drivers){
 const samples=drivers.flatMap(d=>d.lapTimes.filter(p=>p.eligible).map(p=>p.timeMs));
 if(!samples.length)return null;
 const minimum=Math.min(...samples),maximum=Math.max(...samples),padding=Math.max(500,(maximum-minimum)*.12);
 return {min:Math.floor((minimum-padding)/500)*500,max:Math.ceil((maximum+padding)/500)*500};
}
export function teamEconomy(drivers,prices,budget){
 return [...new Set(drivers.map(d=>d.team))].map(name=>{
  const members=drivers.filter(d=>d.team===name),known=members.filter(d=>d.peakDamage!==null);
  const value=known.length?known.reduce((sum,d)=>sum+estimate(d,prices),0):null;
  return {name,known:known.length,total:members.length,unknown:members.length-known.length,value,budget,share:value===null?null:value/budget*100};
 }).sort((a,b)=>(b.value??-1)-(a.value??-1));
}
