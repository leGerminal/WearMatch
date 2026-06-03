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
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');

  document.querySelectorAll('.tab').forEach(t=>
    t.classList.toggle('active',t.dataset.screen===id)
  );

  refresh();
}

function persist(){
  localStorage.setItem(KEY,JSON.stringify(db));
}

function preview(file,id){
  if(!file)return;

  let r=new FileReader();

  r.onload=e=>{
    $(id).src=e.target.result;
    $(id).style.display='block';
    $(id).dataset.src=e.target.result;
  };

  r.readAsDataURL(file);
}

function toggleFemale(){
  const box=$('femaleBox');
  if(box){
    box.style.display=$('gender').value==='femme'
      ?'block'
      :'none';
  }
}

function saveProfile(){

  db.profile={
    name:$('name').value||'Invité',
    gender:$('gender').value,
    age:$('age').value,
    height:$('height').value,
    weight:$('weight').value,
    body:$('body').value,
    bust:$('bust').value,
    waist:$('waist').value,
    hips:$('hips').value,
    favoriteStyle:$('favoriteStyle').value,
    photo:$('profilePreview').dataset.src||''
  };

  persist();
  alert('Avatar enregistré');
  refresh();
}
function refresh(){
  $('lookCount').textContent=db.looks.length;
  $('imageCount').textContent=db.images.length;

  let avg=db.looks.length
    ?(db.looks.reduce((a,b)=>a+Number(b.score),0)/db.looks.length).toFixed(1)
    :'—';

  $('avgScore').textContent=avg==='—'?'—':avg+'/10';

  $('dressingGrid').innerHTML=db.images
    .filter(i=>i.cat==='dressing')
    .map(i=>`<img src="${i.src}">`)
    .join('');

  $('albumsGrid').innerHTML=db.images
    .filter(i=>i.cat==='albums')
    .map(i=>`<img src="${i.src}">`)
    .join('');

  $('lastLook').innerHTML=db.looks[0]
    ?`<b>${db.looks[0].style}</b><p>${db.looks[0].score}/10 · ${db.looks[0].type}</p>`
    :'Aucun look généré.';

  renderLeague();
}

function getScoreParts(){
  let p=db.profile||{};
  let desc=$('description').value.length;
  let photo=$('refPreview').dataset.src?.length?0.4:0;
  let lib=Math.min(db.images.filter(i=>i.cat==='dressing').length*.05,.6);
  let profile=(p.height&&p.weight)?0.4:0;
  let base=7.1+Math.min(desc/260,1)+photo+lib+profile;
  let final=Math.min(9.8,base);

  return{
    final:final.toFixed(1),
    couleurs:Math.min(10,final-.1),
    style:Math.min(10,final+.1),
    cohesion:Math.min(10,final+.2),
    originalite:Math.min(10,final-.3),
    achat:Math.min(10,final-.2),
    personnalisation:Math.min(10,final+.25)
  };
}
function buildPrompt(lookName){
  let p=db.profile||{};

  return `Create a realistic full-body fashion editorial photo with AI-generated human model, no celebrity, no copyrighted face, no text, no watermark.
Profile: ${p.gender||'adult'}, ${p.age||'?'} years old, ${p.height||'?'} cm, ${p.weight||'?'} kg, body ${p.body||'standard'}, measurements ${p.bust||'-'}/${p.waist||'-'}/${p.hips||'-'}.
Match type: ${$('type').value}. Occasion: ${$('occasion').value}. Style: ${$('style').value}. Budget: ${$('budget').value}. Description: ${$('description').value || 'modern fashion outfit'}.
${lookName}: realistic proportions, natural pose, premium social media fashion photography, clean background, full body outfit visible.`;
}
async function generate(){
  let parts=getScoreParts();

  $('result').classList.remove('hidden');
  $('score').textContent=parts.final;

  $('scoreText').textContent=parts.final>=9
    ?'WEEK-END READY'
    :parts.final>=8
      ?'LOOK SOLIDE'
      :'BONNE BASE';

  let prompts=[
    'Look A',
    'Look B',
    'Look C'
  ].map(buildPrompt);

  $('promptBox').textContent=prompts.join('\\n\\n---\\n\\n');

  $('vision').innerHTML=[
    'Look A',
    'Look B',
    'Look C'
  ].map(l=>`
    <div class="vision-card">
      <div class="vision-img">
        <div>
          <b>${l}</b>
          <p>Génération IA en cours...</p>
        </div>
      </div>
      <div class="vision-meta">
        <b>${l}</b><br>
        Connexion au backend Render
      </div>
    </div>
  `).join('');

  $('scoreDetails').innerHTML=Object.entries(parts)
    .filter(([k])=>k!=='final')
    .map(([k,v])=>`
      <div class="bar-row">
        <b>${k}</b>
        <div class="bar">
          <span style="width:${v*10}%"></span>
        </div>
        <small>${v.toFixed(1)}/10</small>
      </div>
    `)
    .join('');

  renderShopping();

  try{
    const response=await fetch(API_URL+'/api/generate-wearvision',{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        prompts:prompts
      })
    });

    const data=await response.json();

    if(!response.ok || !data.images){
      throw new Error(data.error || 'Erreur backend IA');
    }

    let offsets=[0,.2,-.3];

    $('vision').innerHTML=data.images.map((img,i)=>`
      <div class="vision-card">
        <div class="vision-img" style="background-image:url('${img}')"></div>
        <div class="vision-meta">
          <b>Look ${String.fromCharCode(65+i)} · ${Math.min(10,Number(parts.final)+offsets[i]).toFixed(1)}/10</b><br>
          ${$('style').value}
        </div>
      </div>
    `).join('');

    db.looks.unshift({
      score:parts.final,
      style:$('style').value,
      type:$('type').value,
      created:new Date().toISOString(),
      ai:true
    });

    persist();
    refresh();

  }catch(error){

    $('vision').innerHTML=[
      'Look A',
      'Look B',
      'Look C'
    ].map(l=>`
      <div class="vision-card">
        <div class="vision-img">
          <div>
            <b>${l}</b>
            <p>Erreur IA</p>
          </div>
        </div>
        <div class="vision-meta">
          ${error.message}<br>
          Vérifie Render, OpenAI ou les crédits API.
        </div>
      </div>
    `).join('');
  }
}
function renderShopping(){
  let q=encodeURIComponent($('style').value+' vêtements '+$('budget').value);

  $('shopping').innerHTML=`
    <a target="_blank" href="https://www.vinted.fr/catalog?search_text=${q}">Vinted</a>
    <a target="_blank" href="https://www.vestiairecollective.com/search/?q=${q}">Vestiaire</a>
    <a target="_blank" href="https://www.zalando.fr/catalogue/?q=${q}">Zalando</a>
    <a target="_blank" href="https://www.google.com/search?tbm=isch&q=${q}">Inspirations</a>
  `;
}

function addImages(files){
  Array.from(files).forEach(file=>{
    let r=new FileReader();

    r.onload=e=>{
      db.images.unshift({
        src:e.target.result,
        cat:$('category').value
      });

      persist();
      refresh();
    };

    r.readAsDataURL(file);
  });
}

function launchBattle(){
  let names=($('players').value||'Moi\\nAmi 1\\nAmi 2')
    .split('\\n')
    .map(x=>x.trim())
    .filter(Boolean);

  let ranked=names
    .map(n=>({
      name:n,
      score:(7.4+Math.random()*2.1).toFixed(1)
    }))
    .sort((a,b)=>b.score-a.score);

  db.battles.unshift({
    name:$('battleName').value||'Battle',
    ranked,
    created:new Date().toISOString()
  });

  persist();

  $('battleStage').innerHTML=
    '<h3>🏆 '+ranked[0].name+' gagne</h3>'+
    ranked.map((p,i)=>`
      <div class="battle-row">
        <span class="badge">${i+1}</span>
        <b>${p.name}</b>
        <span>${p.score}/10</span>
      </div>
    `).join('');

  refresh();
}

function renderLeague(){
  let all=[];

  db.looks.forEach(l=>all.push({
    name:db.profile?.name||'Moi',
    score:l.score,
    label:l.style
  }));

  db.battles.forEach(b=>
    b.ranked.forEach(r=>
      all.push({
        name:r.name,
        score:r.score,
        label:b.name
      })
    )
  );

  all.sort((a,b)=>b.score-a.score);

  $('leagueList').innerHTML=all.length
    ?all.slice(0,20).map((p,i)=>`
      <div class="league-row">
        <span class="badge">${i+1}</span>
        <b>${p.name}<br><small>${p.label}</small></b>
        <span>${p.score}/10</span>
      </div>
    `).join('')
    :'Aucun score.';
}
