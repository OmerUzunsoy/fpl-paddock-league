import {L} from './logic.js?v=40';
import {raceMetrics} from './metrics-data.js?v=31';
export {raceMetrics};
export function performanceRows({round=null,session='Yarış',name=null}={}){
 return L.results.filter(r=>(!round||r.round===Number(round))&&(session==='all'||r.session===session)&&(!name||r.name===name)).map(r=>{
  const source=raceMetrics.sessions.find(s=>s.round===r.round&&s.session===r.session);
  const observation=source?.rows.find(o=>o.name===r.name);
  const grid=observation?.grid??null;
  const netGain=(r.status==='FIN'||r.classified)&&Number.isInteger(r.position)&&Number.isInteger(grid)?grid-r.position:null;
  const onScreenGain=observation?.rawStatus==='FIN'&&Number.isInteger(grid)?grid-observation.rawPosition:null;
  const correction=netGain!==null&&onScreenGain!==null?netGain-onScreenGain:null;
  return {...r,grid,observed:!!observation,rawPosition:observation?.rawPosition??null,rawStatus:observation?.rawStatus??null,pitStops:observation?.pitStops??null,bestLapMs:observation?.bestLapMs??null,netGain,onScreenGain,correction,
   firstGrid:!!observation&&source.gridP1===r.name,fastestLap:!!observation&&source.fastestLapName===r.name,
   sourceChannel:source?.sourceChannel??null,sourceAttachmentId:source?.sourceAttachmentId??null};
 });
}
export function performanceTotals(options={}){
 const groups=new Map();
 for(const row of performanceRows(options)){
  if(!groups.has(row.name))groups.set(row.name,{name:row.name,startsKnown:0,comparable:0,netGain:0,firstGrid:0,fastestLaps:0,pitStops:0,pitSamples:0,bestGain:null});
  const g=groups.get(row.name);
  if(Number.isInteger(row.grid))g.startsKnown++;
  if(row.netGain!==null){g.comparable++;g.netGain+=row.netGain;if(!g.bestGain||row.netGain>g.bestGain.netGain)g.bestGain=row;}
  if(row.firstGrid)g.firstGrid++;
  if(row.fastestLap)g.fastestLaps++;
  if(Number.isInteger(row.pitStops)){g.pitStops+=row.pitStops;g.pitSamples++;}
 }
 return [...groups.values()].filter(g=>g.startsKnown||g.fastestLaps).sort((a,b)=>b.netGain-a.netGain||b.comparable-a.comparable||a.name.localeCompare(b.name,'tr'));
}
