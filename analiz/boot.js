(function(){
 const main=document.getElementById('main');
 const timer=setTimeout(failed,15000);
 function failed(){if(main.dataset.ready==='true')return;main.innerHTML='<section class="panel"><h1>Analiz açılamadı.</h1><p>Bağlantıyı kontrol edip yeniden deneyebilirsin.</p><button class="league-link" id="reload-lab">Yeniden yükle</button></section>';document.getElementById('reload-lab').addEventListener('click',()=>location.reload());}
 import('./app.js?v=35').then(()=>{clearTimeout(timer);if(main.dataset.ready!=='true')failed();}).catch(error=>{clearTimeout(timer);console.error('FPL Laboratuvarı yükleme hatası',error);failed();});
})();
