// Admin panel and admin actions (members, villages, council, news, projects, donations).
// ------------------------------------------------------------
// SECTION: Admin: member cards
// What it does: Builds the member cards, filtered by the search box and village dropdown.
//    Each card has ID card, Revoke/Restore, Re-issue ID, role and Remove buttons.
// ------------------------------------------------------------
function memCards(){
  const q=S.q.toLowerCase();
  const L=S.mem.filter(m=>(!S.vf||m.village===S.vf)&&(!q||(m.name+' '+m.id+' '+(m.email||'')).toLowerCase().includes(q)));
  return L.map(m=>'<div class="card mem">'+av(m)+'<h3>'+esc(m.name)+'</h3><div class="mute">'+esc(m.id)+' · '+esc(m.village)+'<br>'+esc(m.email||'No email (admin-managed)')+'</div><span class="tag '+(m.role==='admin'?'a':'')+'">'+m.role+'</span> <span class="tag">'+(m.status||'active')+'</span><div class="row" style="justify-content:center"><button onclick="showCard(\''+m._id+'\')">ID card</button><button onclick="toggle(\''+m._id+'\',\'status\')">'+(m.status==='revoked'?'Restore':'Revoke')+'</button><button onclick="reissue(\''+m._id+'\')">Re-issue ID</button>'+(m._id===S.me._id?'':'<button onclick="toggle(\''+m._id+'\',\'role\')">'+(m.role==='admin'?'Make member':'Make admin')+'</button><button class="d" onclick="del(\'members\',\''+m._id+'\')">Remove</button>')+'</div></div>').join('')||'<div class="card mute">No members found.</div>'}
// ------------------------------------------------------------
// SECTION: Admin page
// What it does: Shows summary numbers and a grid of cards. Tapping a card hides the grid
//    and opens that section (Members, Villages, Council, News, Projects, Donations) with a
//    Back button.
// ------------------------------------------------------------
function admin(){
  if(!isAdmin())return '<div class="card">Admins only.</div>';
  const t=S.tab,M={members:['👥','Members','Register, search and edit members'],villages:['🏘️','Villages','Add and manage villages'],council:['👑','Council','King, entourage and village leaders'],news:['📰','News','Post announcements and updates'],projects:['🏗️','Projects','Targets and progress bars'],donations:['💰','Donations','Log and track contributions']};
  let h=M[t]?'<div class="row"><button onclick="S.tab=\'dash\';render()">← Back to Admin</button></div><h2>'+M[t][1]+'</h2>':'<h2>Admin</h2>';
  if(!M[t]){const tot=S.don.reduce((s,d)=>s+d.amount,0),ne=S.mem.filter(m=>!m.email).length;
    h+='<div class="grid">'+[['Members',S.mem.length],['Projects',S.proj.length],['Donations','₦'+tot.toLocaleString()],['No-email members',ne]].map(a=>'<div class="card"><div class="mute">'+a[0]+'</div><div class="big">'+a[1]+'</div></div>').join('')+'</div><h2>Project funding</h2><div class="grid">'+S.proj.map(p=>'<div class="card"><h3>'+esc(p.title)+'</h3><div class="bar"><i style="width:'+pct(p)+'%"></i></div><div class="mute">'+pct(p)+'%</div></div>').join('')+'</div>'}
  if(!M[t]){const C={members:S.mem.length,villages:S.vil.length,council:S.coun.length,news:S.news.length,projects:S.proj.length,donations:S.don.length};h+='<h2>Manage</h2><div class="grid">'+Object.keys(M).map(k=>'<div class="card tile" onclick="S.tab=\''+k+'\';render();window.scrollTo(0,0)"><div class="ic">'+M[k][0]+'</div><h3>'+M[k][1]+'</h3><div class="mute">'+M[k][2]+'</div><div class="big">'+C[k]+'</div></div>').join('')+'</div>'}
  if(t==='members')h+='<div class="card"><h3>Register or edit a member</h3><label>Member ID (leave blank to register a new member)</label><input id="aid" placeholder="e.g. UCA-0002" autocapitalize="characters" oninput="lookupId()"><div id="anote" class="mute" style="margin:-4px 0 10px"></div><label>Full name</label><input id="an"><label>Mobile</label><input id="ap"><label>address</label><input id="ah"><label>Village</label><select id="av">'+vopts()+'</select><label>Email (optional)</label><input id="ae" type="email"><label>Photo</label><input type="file" accept="image/*" onchange="pick(this)"><button class="p" id="abtn" onclick="submitMember()">Register</button></div><h2>Directory</h2><input placeholder="Search name, ID or email" oninput="S.q=this.value;$(\'ml\').innerHTML=memCards()"><select onchange="S.vf=this.value;$(\'ml\').innerHTML=memCards()"><option value="">All villages</option>'+S.vil.map(x=>'<option>'+esc(x.name)+'</option>').join('')+'</select><div class="grid" id="ml">'+memCards()+'</div>';
  if(t==='villages')h+='<div class="card"><h3>Add village</h3><input id="vn" placeholder="e.g. Jattu"><button class="p" onclick="addSimple(\'villages\',{name:v(\'vn\')},\'vn\')">Add</button></div><div class="grid">'+S.vil.map(x=>'<div class="card"><h3>'+esc(x.name)+'</h3><button class="d" onclick="del(\'villages\',\''+x._id+'\')">Delete</button></div>').join('')+'</div>';
  if(t==='council')h+='<div class="card"><h3>Add council member</h3><label>Name</label><input id="cn"><label>Title (e.g. King, Prime Minister, Village Head)</label><input id="ct"><label>Level</label><select id="cl"><option value="kingdom">Kingdom of Uzairue (Jattu)</option>'+S.vil.map(x=>'<option>'+esc(x.name)+'</option>').join('')+'</select><label>Rank (1 = top)</label><input id="cr" type="number" value="1"><label>Linked member ID (optional, e.g. UCA-0002)</label><input id="cm"><label>Photo</label><input type="file" accept="image/*" onchange="pick(this)"><button class="p" onclick="addCouncil()">Add</button></div><h2>Council</h2><div class="grid">'+S.coun.slice().sort((a,b)=>(a.rank||99)-(b.rank||99)).map(c=>'<div class="card mem">'+av(c)+'<h3>'+esc(c.name)+'</h3><span class="tag a">'+esc(c.title)+'</span><div class="mute">'+(c.level==='kingdom'?'Kingdom':esc(c.level))+' · rank '+esc(c.rank)+'</div><button class="d" onclick="del(\'council\',\''+c._id+'\')">Delete</button></div>').join('')+'</div>';
  if(t==='news')h+='<div class="card"><h3>Post news</h3><label>Title</label><input id="nt"><label>Story</label><textarea id="nb" rows="3"></textarea><label>Image URL (optional)</label><input id="ni"><button class="p" onclick="addSimple(\'news\',{title:v(\'nt\'),body:v(\'nb\'),img:ok(v(\'ni\')),at:serverTimestamp()},\'nt\')">Publish</button></div><div class="grid">'+S.news.map(n=>'<div class="card"><h3>'+esc(n.title)+'</h3><p class="mute">'+esc(n.body)+'</p><button class="d" onclick="del(\'news\',\''+n._id+'\')">Delete</button></div>').join('')+'</div>';
  if(t==='projects')h+='<div class="card"><h3>Create project</h3><label>Title</label><input id="pt"><label>Description</label><textarea id="pb" rows="2"></textarea><label>Target amount (₦)</label><input id="pg" type="number"><label>Donation link (https://…)</label><input id="pl"><button class="p" onclick="addSimple(\'projects\',{title:v(\'pt\'),body:v(\'pb\'),target:+v(\'pg\')||0,raised:0,link:ok(v(\'pl\'))},\'pt\')">Create</button></div><div class="grid">'+S.proj.map(p=>'<div class="card"><h3>'+esc(p.title)+'</h3><div class="bar"><i style="width:'+pct(p)+'%"></i></div><div class="mute">₦'+(p.raised||0).toLocaleString()+' / ₦'+(p.target||0).toLocaleString()+'</div><div class="row"><button onclick="editTarget(\''+p._id+'\','+(p.target||0)+')">Set target</button><button class="d" onclick="del(\'projects\',\''+p._id+'\')">Delete</button></div></div>').join('')+'</div>';
  if(t==='donations')h+='<div class="card"><h3>Log a donation</h3><label>Donor (name, or “Anonymous”)</label><input id="dn"><label>Amount (₦)</label><input id="da" type="number"><label>Project</label><select id="dp">'+S.proj.map(p=>'<option value="'+p._id+'">'+esc(p.title)+'</option>').join('')+'</select><button class="p" onclick="addDon()">Record</button></div><h2>Log</h2><div class="grid">'+(S.don.map(d=>'<div class="card"><div class="big">₦'+d.amount.toLocaleString()+'</div><div>'+esc(d.project)+'</div><div class="mute">'+esc(d.donor)+'</div></div>').join('')||'<div class="card mute">No donations yet.</div>')+'</div>';
  return h}
// ------------------------------------------------------------
// SECTION: Admin action: register member
// What it does: Creates a member record (no login) with the next ID. Used for people
//    without an email.
// ------------------------------------------------------------
async function addMember(){const n=v('an');if(!n)return say('Name is required.');
   try{const id=await nextId();await addDoc(collection(db,'members'),{id,name:n,phone:v('ap'),address:v('ah'),village:v('av'),email:v('ae'),
  role:'member',status:'active',img:S.img,byAdmin:true,createdAt:serverTimestamp()});S.img='';await reload();say('Registered '+id)}catch(e){say(e.message)}}
// ------------------------------------------------------------
// SECTION: Admin action: add an item
// What it does: Saves a new village, news item or project to the database, then refreshes.
// ------------------------------------------------------------
async function addSimple(c,d,k){if(!v(k))return say('Please fill in the first field.');try{await addDoc(collection(db,c),d);await reload()}catch(e){say(e.message)}}
// ------------------------------------------------------------
// SECTION: Admin action: add council member
// What it does: Saves a council entry: name, title, level (kingdom or village), rank,
//    optional linked member ID and photo.
// ------------------------------------------------------------
async function addCouncil(){if(!v('cn')||!v('ct'))return say('Name and title are required.');try{await addDoc(collection(db,'council'),{name:v('cn'),title:v('ct'),level:v('cl'),rank:+v('cr')||99,memberId:v('cm').toUpperCase(),img:S.img});S.img='';await reload()}catch(e){say(e.message)}}
// ------------------------------------------------------------
// SECTION: Admin action: log a donation
// What it does: Records a donation and adds the amount to the chosen project's raised
//    total.
// ------------------------------------------------------------
async function addDon(){const a=+v('da'),pid=v('dp'),p=S.proj.filter(x=>x._id===pid)[0];if(!p||!(a>0))return say('Choose a project and amount.');try{await addDoc(collection(db,'donations'),{donor:v('dn')||'Anonymous',amount:a,pid,project:p.title,at:serverTimestamp()});await updateDoc(doc(db,'projects',pid),{raised:increment(a)});await reload()}catch(e){say(e.message)}}
// ------------------------------------------------------------
// SECTION: Admin action: set project target
// What it does: Asks for a new target amount and saves it.
// ------------------------------------------------------------
async function editTarget(id,t){const n=prompt('Target amount (₦)',t);if(n===null)return;await updateDoc(doc(db,'projects',id),{target:+n||0});reload()}
// ------------------------------------------------------------
// SECTION: Admin action: delete
// What it does: Deletes a member, village, council entry, news item or project after asking
//    to confirm.
// ------------------------------------------------------------
async function del(c,id){if(!confirm('Delete this?'))return;await deleteDoc(doc(db,c,id));reload()}
// ------------------------------------------------------------
// SECTION: Admin action: change role or status
// What it does: Flips a member between member/admin or active/revoked.
// ------------------------------------------------------------
async function toggle(id,f){const m=S.mem.filter(x=>x._id===id)[0],val=f==='role'?(m.role==='admin'?'member':'admin'):(m.status==='revoked'?'active':'revoked');await updateDoc(doc(db,'members',id),{[f]:val});reload()}
// ------------------------------------------------------------
// SECTION: Admin action: re-issue ID
// What it does: Gives a member a brand-new ID and sets them active.
// ------------------------------------------------------------
async function reissue(id){if(!confirm('Give this member a new ID?'))return;const n=await nextId();await updateDoc(doc(db,'members',id),{id:n,status:'active'});reload()}
// ------------------------------------------------------------
// SECTION: Admin action: view a member's ID card
// What it does: Opens the Profile page showing the chosen member's card.
// ------------------------------------------------------------
function showCard(id){S.card=S.mem.filter(x=>x._id===id)[0];S.view='me';render()}

// ------------------------------------------------------------
// SECTION: Admin: look up a member by ID
// What it does: As an ID is typed in the register form, finds that member and fills the
//    form so they can be edited. Clears the form if not found.
// ------------------------------------------------------------
function lookupId(){
  const q=v('aid').toUpperCase(),m=q?S.mem.filter(x=>String(x.id).toUpperCase()===q)[0]:null,n=$('anote'),b=$('abtn');
  S.editId=m?m._id:'';
  if(!m&&S._was)['an','ap','ah','ae'].forEach(i=>{$(i).value=''});
  S._was=!!m;$('ae').disabled=!!(m&&!m.byAdmin);
  if(m){$('an').value=m.name||'';$('ap').value=m.phone||'';$('ah').value=m.house||'';$('ae').value=m.email||'';
    if([...$('av').options].some(o=>o.value===m.village))$('av').value=m.village;
    n.textContent='Editing '+m.id+(m.byAdmin?'':' (login email can’t be changed here)');b.textContent='Save changes'}
  else{n.textContent=q?'No member with that ID. Clear the ID field to register a new member.':'';b.textContent='Register'}}
// ------------------------------------------------------------
// SECTION: Admin action: register or save
// What it does: Saves changes if a member was found by ID, otherwise registers a new
//    member.
// ------------------------------------------------------------
async function submitMember(){return S.editId?saveMember():addMember()}
// ------------------------------------------------------------
// SECTION: Admin action: save member edits
// What it does: Updates the chosen member's name, phone, house number, village (and email
//    for admin-registered members).
// ------------------------------------------------------------
async function saveMember(){
  const m=S.mem.filter(x=>x._id===S.editId)[0];if(!m)return say('Member not found.');
  if(!v('an'))return say('Name is required.');
  const d={name:v('an'),phone:v('ap'),house:v('ah'),village:v('av')};if(m.byAdmin)d.email=v('ae');if(S.img)d.img=S.img;
  try{await updateDoc(doc(db,'members',S.editId),d);S.img='';S.editId='';S._was=false;await reload();say('Saved changes to '+m.id)}catch(e){say(e.message)}}
