// Shared state, small helpers and Firebase data loading.
const cfgOk=!String(window.FIREBASE_CONFIG.apiKey).startsWith('YOUR');
const {auth,db,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendEmailVerification,collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,runTransaction,query,orderBy,increment,serverTimestamp}=FB;
const $=id=>document.getElementById(id);
const v=id=>($(id)?.value||'').trim();
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ok=u=>/^https?:\/\//i.test(u)?u:'';
const S={user:null,me:null,view:'home',tab:'dash',vil:[],news:[],proj:[],coun:[],mem:[],don:[],q:'',vf:'',msg:'',img:'',card:null};
const isAdmin=()=>S.me&&S.me.role==='admin';
const say=m=>{S.msg=m;render()};
const go=x=>{S.view=x;S.msg='';S.card=null;S.sec='';render()};
const jump=id=>{S.sec=id;const f=()=>$(id)&&$(id).scrollIntoView({behavior:'smooth'});if(S.view==='home'&&!S.msg){nav();f()}else{S.view='home';S.msg='';S.card=null;render();setTimeout(f,50)}};
async function list(c,o){try{const s=await getDocs(o?query(collection(db,c),orderBy(o)):collection(db,c));return s.docs.map(d=>({_id:d.id,...d.data()}))}catch(e){return[]}}
async function loadPub(){if(!cfgOk)return;S.news=(await list('news','at')).reverse();S.proj=await list('projects');S.vil=await list('villages');S.coun=S.user?await list('council'):[]}
async function loadAdmin(){S.mem=await list('members','createdAt');S.don=(await list('donations','at')).reverse()}
async function reload(){await loadPub();if(isAdmin())await loadAdmin();render()}
async function nextId(){return runTransaction(db,async tx=>{const r=doc(db,'meta','counter'),s=await tx.get(r),n=(s.exists()?s.data().n:0)+1;tx.set(r,{n});return 'UCA-'+String(n).padStart(4,'0')})}
const vopts=sel=>(S.vil.length?S.vil.map(x=>x.name):['Jattu']).map(n=>'<option'+(n===sel?' selected':'')+'>'+esc(n)+'</option>').join('');
const av=m=>m.img?'<img class="av" src="'+m.img+'" alt="">':'<div class="av">'+esc((m.name||'?').charAt(0).toUpperCase())+'</div>';
const titleOf=m=>(S.coun.filter(c=>c.memberId===m.id)[0]||{}).title||'';
const pct=p=>p.target>0?Math.min(100,Math.round((p.raised||0)/p.target*100)):0;
function pick(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),m=Math.min(im.width,im.height);c.width=c.height=160;c.getContext('2d').drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,160,160);S.img=c.toDataURL('image/jpeg',.8);if(S.view==='me'&&S.me){updateDoc(doc(db,'members',S.me._id),{img:S.img}).then(()=>{S.me.img=S.img;S.img='';render()})}};im.src=r.result};r.readAsDataURL(f)}
