// Navigation, page rendering and app start-up. Loaded last.
function nav(){
  let h='<button onclick="go(\'home\')">Home</button><button onclick="jump(\'news\')">News</button><button onclick="jump(\'projects\')">Projects</button><button onclick="jump(\'donate\')">Donate</button>';
  if(!S.user)h+='<button class="p" onclick="go(\'login\')">Sign up / Log in</button>';
  else if(!S.user.emailVerified)h+='<button class="p" onclick="go(\'verify\')">Verify email</button><button onclick="out()">Log out</button>';else{h+='<button onclick="go(\'council\')">Council</button><button onclick="go(\'me\')">My profile</button>';if(isAdmin())h+='<button onclick="go(\'admin\')">Admin</button>';h+='<button onclick="out()">Log out</button>'}
  $('nav').innerHTML=h;const cur=S.view==='home'?(S.sec||'home'):S.view;[...$('nav').children].forEach(b=>{const m=(b.getAttribute('onclick')||'').match(/'(\w+)'/);const k=m?m[1]:(b.textContent.includes('Log in')?'login':'');if(k===cur||(cur==='signup'&&k==='login'))b.classList.add('on')})}
function render(){if(S.user&&!S.user.emailVerified&&['me','council','admin'].includes(S.view))S.view='verify';
  nav();
  let h=S.msg?'<div class="msg">'+esc(S.msg)+'</div>':'';
  if(!cfgOk)h+='<div class="card"><h3>Setup needed</h3><p>Paste your Firebase config into <b>index.html</b> (see the setup steps), then reload.</p></div>';
  const V={home,login,signup,verify,council,me:profile,admin};
  h+=(V[S.view]||home)();
  $('app').innerHTML=h;
  if(S.view==='me'&&(S.card||S.me))drawCard(S.card||S.me,'cv');
  if(S.view==='login'||S.view==='signup'||S.view==='home')window.scrollTo(0,0)}
window.addEventListener('scroll',()=>{if(S.view!=='home')return;let k='';for(const id of ['news','projects','donate']){const e=$(id);if(e&&e.getBoundingClientRect().top<120)k=id}if(k!==(S.sec||'')){S.sec=k;nav()}},{passive:true});
Object.assign(window,{S,go,jump,out,doLogin,doSignup,resendVerify,checkVerified,pick,dl,memCards,addMember,addSimple,addCouncil,addDon,editTarget,del,toggle,reissue,showCard,render,$,v,ok,serverTimestamp});
if(cfgOk)onAuthStateChanged(auth,async u=>{S.user=u;S.me=null;if(u&&u.emailVerified){try{const d=await getDoc(doc(db,'members',u.uid));if(d.exists())S.me={_id:d.id,...d.data()}}catch(e){}}await reload()});
else render();
