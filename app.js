const KEY='wearmatch_iphone_pwa_v2_ai';
const API_URL='https://wearmatch-backend-1.onrender.com';

let db=JSON.parse(localStorage.getItem(KEY)||'{"profile":null,"looks":[],"images":[],"battles":[]}');
const $=id=>document.getElementById(id);

window.onload=()=>{bind();refresh();toggleFemale()};

function bind(){
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>show(b.dataset.screen));
  document.querySelectorAll('.go-match').forEach(b=>b.onclick=()=>show('match'));

  ['profileGallery','profileCamera'].forEach(id=>
    $(id).onchange=e=>preview(e.target.files[0],'profilePreview')
  );

  ['refGallery','refCamera'].forEach(id=>
    $(id).onchange=e=>preview(e.target.files[0],'refPreview')
  );

  $('gender').onchange=toggleFemale;
  $('saveProfile').onclick=saveProfile;
  $('generateDemo').onclick=generate;

  $('launchBattle').onclick=launchBattle;

  $('resetAll').onclick=()=>{
    if(confirm('Réinitialiser WearMatch ?')){
      localStorage.removeItem(KEY);
      location.reload();
    }
  };
}
