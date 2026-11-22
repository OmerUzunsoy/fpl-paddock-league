(function(){
  var main=document.getElementById('main');
  function failed(){
    if(main.dataset.ready==='true')return;
    main.innerHTML='<section class="load-error" role="alert"><span class="eyebrow">FPL PADDOCK LEAGUE</span><h1>Lig bilgileri açılamadı.</h1><p>Bağlantı kesilmiş veya sayfa yüklenirken bir sorun oluşmuş olabilir. Yeniden deneyebilirsin.</p><button class="button primary" id="reload-league">Yeniden yükle ↻</button></section>';
    document.getElementById('reload-league').addEventListener('click',function(){window.location.reload();});
  }
  var timer=setTimeout(failed,12000);
  import('./app.js?v=36').then(function(){clearTimeout(timer);if(main.dataset.ready!=='true')failed();}).catch(function(error){clearTimeout(timer);console.error('FPL açılış hatası:',error);failed();});
})();
