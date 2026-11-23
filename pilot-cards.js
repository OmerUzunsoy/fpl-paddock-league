import {ratingPolicy} from './analiz/overall.js?v=36';

export const defaultCardFilters = {search:'',team:'',order:'ovr'};
const scoreText = score => score.toFixed(1).replace('.',',');
const searchKey = text => text.toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu,'').replaceAll('ı','i');

function playerCard(context, {pilot,rating}) {
 const {h,team} = context;
 const identity = team(pilot.team);
 const change = rating.delta;
 const changeClass = change > 0 ? 'green' : change < 0 ? 'red' : '';
 const changeLabel = change > 0 ? '+' + change : change < 0 ? '−' + Math.abs(change) : '0';
 const lastRace = rating.history.at(-1);
 const form = lastRace ? scoreText(lastRace.score) + ' / 10' : '—';
 const movement = lastRace ? change === 0 ? 'değişmedi' : Math.abs(change) + (change > 0 ? ' puan yükseldi' : ' puan düştü') : 'başlangıç';
 const portrait = pilot.portrait
  ? `<img loading="lazy" decoding="async" src="${h(pilot.portrait)}" alt="">`
  : `<span class="overall-initials">${h(pilot.name.split(' ').slice(0,2).map(part=>part[0]).join(''))}</span>`;

 return `<button type="button" class="overall-player-card" data-rating-pilot="${h(pilot.id)}"
   style="--card-team:${identity.color}" aria-haspopup="dialog"
   aria-label="${h(pilot.name)}, ${rating.current} OVR, ${movement}. Kartı aç">
  <span class="overall-player-art">
   ${portrait}
   <span class="overall-number"><strong>${rating.current}</strong><span>OVR</span></span>
   <span class="overall-delta ${changeClass}">${lastRace ? changeLabel : 'Yeni'}</span>
  </span>
  <span class="overall-player-copy">
   <span class="overall-player-name">${h(pilot.name)}</span>
   <span class="overall-player-team"><img src="${h(identity.logo)}" alt="" loading="lazy">${h(pilot.team)}</span>
   <span class="overall-card-facts"><span>${lastRace ? h(lastRace.gp) + ' GP' : 'Yarış notu'}</span><b>${form}</b></span>
  </span>
 </button>`;
}

export function cardResults(context, filters) {
 const {roster,latestReview} = context;
 const query = searchKey(filters.search.trim());
 const matching = roster.filter(({pilot}) => (!filters.team || pilot.team === filters.team) &&
  (!query || searchKey(pilot.name + ' ' + (pilot.gameName || '')).includes(query)));
 const byName = (a,b) => a.pilot.name.localeCompare(b.pilot.name,'tr');
 const byOverall = (a,b) => b.rating.current-a.rating.current ||
  Number(b.rating.reviewCount>0)-Number(a.rating.reviewCount>0) || byName(a,b);
 const raceForm = ({rating}) => rating.lastRound === latestReview?.round ? rating.lastScore ?? -1 : -1;
 const order = {ovr:byOverall,race:(a,b)=>raceForm(b)-raceForm(a)||byOverall(a,b),name:byName};
 matching.sort(order[filters.order] ?? byOverall);
 return {
  count: matching.length === roster.length ? roster.length + ' pilot' : matching.length + ' / ' + roster.length + ' pilot',
  markup: matching.length ? `<div class="overall-card-grid">${matching.map(row=>playerCard(context,row)).join('')}</div>`
   : `<div class="empty cards-empty"><h2>Pilot bulunamadı</h2><p>Farklı bir ad ara veya takım filtresini temizle.</p><button type="button" class="button secondary" data-card-reset>Filtreleri temizle</button></div>`
 };
}

export function cardsView(context, filters) {
 const {roster,latestReview,h,select} = context;
 const teams = [...new Set(roster.map(row=>row.pilot.team))].sort((a,b)=>a.localeCompare(b,'tr'));
 const {count,markup} = cardResults(context,filters);
 return `<div class="cards-page">
  <section class="cards-hero">
   <div class="cards-hero-copy">
    <h1>Pilot Kartları</h1>
    <p>Genel reytingleri karşılaştır. Bir kart seçerek pilotun yarış notlarını ve OVR geçmişini incele.</p>
   </div>
   ${latestReview ? `<a class="cards-latest" href="analiz/?round=${latestReview.round}#ratings">
    <span>Son değerlendirme</span>
    <strong>${h(latestReview.gp)} GP</strong>
    <span class="cards-latest-link">${latestReview.assessments.length} pilot · Yarış notları</span>
   </a>` : ''}
  </section>
  <section aria-label="Aktif pilotlar">
   <div class="cards-filters">
    <label class="search-field"><span>Pilot ara</span><input id="card-search" type="search" placeholder="Pilot adı veya oyun nicki" autocomplete="off" value="${h(filters.search)}"></label>
    ${select('card-team','Takım',[['','Tüm takımlar'],...teams.map(name=>[name,name])],filters.team)}
    ${select('card-order','Sırala',[['ovr','Genel reyting'],['race','Son GP notu'],['name','İsim (A–Z)']],filters.order)}
   </div>
   <p class="cards-count" id="card-count" role="status">${count}</p>
   <div id="card-results">${markup}</div>
  </section>
  <details class="overall-policy">
   <summary>Genel reyting nasıl hesaplanır?</summary>
   <p>Her pilot ${ratingPolicy.baseline} OVR ile başlar. Hedef OVR, yarış notunun 10 katıdır. Bakü’den itibaren kart, hedefe olan farkın %${ratingPolicy.weight*100}’i kadar hareket eder. Değişim en yakın tam sayıya yuvarlanır ve yarış başına ±${ratingPolicy.maxChange} ile sınırlanır. Madrid için %20 ve ±3 uygulanır.</p>
   <p>Yarış notu sıralama, tempo, finiş, pist sınırı ve doğrulanmış yaptırımları dikkate alır. Kartta her değerlendirilen yarışın notu ve OVR değişimi bulunur. Portreler temsilîdir.</p>
  </details>
 </div>`;
}
