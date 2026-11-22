export const ratingPolicy=Object.freeze({baseline:80,min:0,max:99,weight:.2,maxChange:3,version:1});
export function ratingStep(previous,score,policy=ratingPolicy){
 if(score==null)return {previous,current:previous,delta:0,reviewed:false};
 if(!Number.isFinite(score)||score<0||score>10)throw new Error('Yarış reytingi 0–10 arasında olmalı.');
 const target=Math.min(policy.max,score*10),raw=(target-previous)*policy.weight;
 const requested=Math.sign(raw)*Math.min(policy.maxChange,Math.round(Math.abs(raw)));
 const current=Math.max(policy.min,Math.min(policy.max,previous+requested));
 return {previous,current,delta:current-previous,reviewed:true};
}
export function upsertReview(reviews,review){
 if(!Number.isInteger(review.round)||review.round<1||!review.gp||!Array.isArray(review.assessments))throw new Error('Geçerli yarış değerlendirmesi gerekli.');
 const ids=new Set();for(const a of review.assessments){if(!a.pilotId||ids.has(a.pilotId))throw new Error('Pilot aynı yarışta bir kez değerlendirilebilir.');ids.add(a.pilotId);ratingStep(80,a.score);}
 return [...reviews.filter(r=>r.round!==review.round),structuredClone(review)].sort((a,b)=>a.round-b.round);
}
export function buildRatingCards(pilots,reviews,throughRound=Infinity,policy=ratingPolicy){
 const ordered=[...reviews].filter(r=>r.round<=throughRound).sort((a,b)=>a.round-b.round);
 if(new Set(ordered.map(r=>r.round)).size!==ordered.length)throw new Error('Aynı Grand Prix iki kez bulunamaz.');
 return pilots.map(p=>{
  let current=policy.baseline;const history=[];
  for(const r of ordered){const assessment=r.assessments.find(a=>a.pilotId===p.id);if(!assessment||assessment.score==null)continue;const step=ratingStep(current,assessment.score,policy);current=step.current;history.push({round:r.round,gp:r.gp,date:r.date,score:assessment.score,...step});}
  return {pilotId:p.id,name:p.name,current,baseline:policy.baseline,delta:history.at(-1)?.delta??0,reviewCount:history.length,lastRound:history.at(-1)?.round??null,lastScore:history.at(-1)?.score??null,history};
 });
}
