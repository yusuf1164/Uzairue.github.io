// Member profile page and the downloadable ID card.
function profile(){
  const m=S.card||S.me;if(!m)return '<div class="card">Your profile is not available. If you were registered by an admin without an email, ask the admin to view it for you.</div>';
  const t=titleOf(m);
  return '<div class="card" style="display:flex;gap:14px;align-items:center">'+av(m)+'<div><h3>'+esc(m.name)+'</h3>'+(t?'<span class="tag a">'+esc(t)+'</span> ':'')+'<div class="big">'+esc(m.id)+'</div><div class="mute">'+esc(m.village)+' · House '+esc(m.house||'-')+'</div><div class="mute">'+esc(m.phone||'')+' '+esc(m.email||'')+'</div></div></div><h2>Digital ID card</h2><canvas id="cv"></canvas><div class="row"><button class="p" onclick="dl()">Download ID</button></div>'+(S.card?'':'<h2>Update photo</h2><input type="file" accept="image/*" onchange="pick(this)">')}
function drawCard(m,id){
  const c=$(id);if(!c)return;const x=c.getContext('2d'),W=c.width=640,H=c.height=400,t=titleOf(m);
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#08182f');g.addColorStop(1,'#1e1042');x.fillStyle=g;x.fillRect(0,0,W,H);
  x.strokeStyle='#00e5ff';x.lineWidth=3;x.strokeRect(8,8,W-16,H-16);
  x.save();x.globalAlpha=.07;x.translate(W/2,H/2);x.rotate(-.4);x.fillStyle='#00e5ff';x.font='bold 96px sans-serif';x.textAlign='center';x.fillText('UZAIRUE',0,30);x.restore();
  x.textAlign='left';x.fillStyle='#00e5ff';x.font='bold 26px sans-serif';x.fillText('UZAIRUE MEMBER',30,56);
  x.fillStyle='#fff';x.font='bold 34px sans-serif';x.fillText(m.name||'',210,160);
  x.font='bold 26px monospace';x.fillStyle='#7df9ff';x.fillText(m.id||'',210,205);
  x.font='20px sans-serif';x.fillStyle='#cfe';x.fillText('Village: '+(m.village||''),210,245);x.fillText('House: '+(m.house||'-'),210,275);x.fillText('Phone: '+(m.phone||'-'),210,305);
  if(t){x.fillStyle='#ffd166';x.fillText(t,210,335)}
  x.fillStyle=m.status==='revoked'?'#ff6b6b':'#4cffa6';x.font='bold 20px sans-serif';x.fillText(m.status==='revoked'?'REVOKED':'ACTIVE',210,372);
  x.fillStyle='#16284a';x.fillRect(30,110,150,150);
  if(m.img){const i=new Image();i.onload=()=>x.drawImage(i,30,110,150,150);i.src=m.img}else{x.fillStyle='#7df9ff';x.font='bold 70px sans-serif';x.textAlign='center';x.fillText((m.name||'?')[0],105,215)}}
function dl(){const c=$('cv'),a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=((S.card||S.me).id||'ID')+'.png';a.click()}
