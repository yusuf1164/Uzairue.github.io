// Member profile page and the downloadable ID card.
function profile(){
  const m = S.card || S.me;
  if(!m) return '<div class="card">Your profile is not available.</div>';

  const t = titleOf(m);
  const isPaid = !!m.idFeePaid;
  const isLocked = !isPaid && !S.card;
  
  const backBtn = S.card ? '<button class="p" onclick="S.card=null;render()" style="margin-bottom:14px">← Back to my profile</button>' : '';

  let familyCard = '';
  if (!S.card && S.familyList && S.familyList.length > 0) {
    familyCard = '<div class="card" style="margin-top:14px">'
      + '<h3>My Family</h3>'
      + S.familyList.map(c => 
          '<div class="row" style="justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding:8px 0; flex-wrap:nowrap;">'
          + '<div><b>' + esc(c.name) + '</b><br><span class="mute">' + esc(c.id) + '</span></div>'
          + '<div style="display:flex; gap:6px">'
          + '<button class="p" onclick="fxManageChild(\'' + c._id + '\')">Manage</button>'
          + '<button class="d" onclick="fxUnlinkChild(\'' + c._id + '\',\'' + esc(c.name) + '\')">Unlink</button>'
          + '</div>'
          + '</div>'
        ).join('')
      + '</div>';
  }

  let linkForm = '';
  if (!S.card) {
    linkForm = '<div class="card" style="margin-top:14px">'
      + '<h3>Link a Child</h3>'
      + '<p class="mute">Add your child\'s account to manage their profile and dues.</p>'
      + '<label>Child\'s Member ID</label><input id="fx_lid" placeholder="e.g. UCA-0012">'
      + '<label>Child\'s Date of Birth</label><input id="fx_ldob" type="date">'
      + '<label>Your Password</label><input id="fx_lpwd" type="password" placeholder="To confirm it\'s you">'
      + '<button class="p" onclick="fxLinkChild()">Link Child</button>'
      + '</div>';
  }

  return backBtn
    + '<div class="card" style="display:flex;gap:14px;align-items:center">'
    + av(m)
    + '<div><h3>' + esc(m.name) + '</h3>'
    + (t ? '<span class="tag a">' + esc(t) + '</span> ' : '')
    + '<div class="big">' + esc(m.id) + '</div>'
    + '<div class="mute">' + esc(m.village) + ' · Address ' + esc(m.house || '-') + '</div>'
    + '<div class="mute">' + esc(m.phone || '') + ' ' + esc(m.email || '') + '</div>'
    + '</div></div>'
    
    + '<h2>Digital ID card</h2>'
    
    + (isLocked 
        ? '<div class="card" style="text-align:center; padding: 40px 20px; border-color: var(--bad)">'
          + '<h3 style="color:var(--bad)">🔒 ID Card Locked</h3>'
          + '<p class="mute">Your official ID card is locked. Pay the one-time ID fee to unlock it.</p>'
          + '<button class="p" onclick="fxPayIdFee()" style="margin-top:10px">Pay Now</button>'
          + '</div>'
        : '<canvas id="cv"></canvas>'
          + '<div class="row">'
          + '<button class="p" onclick="dl()">Download ID</button>'
          + '<button onclick="S.cardFlipped = !S.cardFlipped; render();">Flip Card 🔄</button>'
          + '</div>'
      )
    + (S.card ? '' : '<h2>Update photo</h2><input type="file" accept="image/*" onchange="pick(this)">')
    + familyCard
    + linkForm;
}

// ------------------------------------------------------------
// SECTION: Family Logic
// ------------------------------------------------------------
async function fxManageChild(id) {
  const d = await getDoc(doc(db, 'members', id));
  if(d.exists()) {
    S.card = { _id: d.id, ...d.data() };
    render();
  }
}

async function fxLinkChild() {
  const cid = v('fx_lid').toUpperCase();
  const cdob = v('fx_ldob');
  const pwd = $('fx_lpwd').value;

  if(!cid || !cdob || !pwd) return say('Please fill all fields.');

  try {
    say('Verifying...');
    
    const credential = FB.EmailAuthProvider.credential(S.user.email, pwd);
    await FB.reauthenticateWithCredential(S.user, credential);

    const qSnap = await getDocs(query(collection(db, 'members'), where('id', '==', cid), limit(1)));
    if(qSnap.empty) return say('No member found with that ID.');

    const childDoc = qSnap.docs[0];
    const childData = childDoc.data();

    if(childData.dob !== cdob) return say('The Date of Birth does not match our records for ' + cid);
    if(childData.parentId) return say('This member is already linked to another parent.');

    await updateDoc(doc(db, 'members', childDoc.id), { parentId: S.me._id });
    
    say('Child linked successfully!');
    await fxLoadFamily();
    render();

  } catch(e) {
    if(e.code === 'auth/wrong-password') say('Incorrect password.');
    else say(e.message);
  }
}

async function fxUnlinkChild(id, name) {
  if(!confirm('Are you sure you want to unlink ' + name + '?')) return;
  
  try {
    // Setting parentId to empty string removes the link
    await updateDoc(doc(db, 'members', id), { parentId: "" });
    say('Child unlinked successfully.');
    await fxLoadFamily();
    render();
  } catch(e) {
    say(e.message);
  }
}

async function fxLoadFamily() {
  if(!S.me) return;
  try {
    const qSnap = await getDocs(query(collection(db, 'members'), where('parentId', '==', S.me._id)));
    S.familyList = qSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch(e) {
    S.familyList = [];
  }
}

function fxPayIdFee() {
  const m = S.me;
  if(!m) return;
  fxCloseDonate();
  const modal = document.createElement('div'); 
  modal.className = 'modal'; 
  modal.id = 'donModal';
  modal.onclick = function (e) { if (e.target === modal) fxCloseDonate(); };
  modal.innerHTML = '<div class="card">'
    + '<h3>Pay ID Fee</h3>'
    + '<p class="mute">Send the one-time fee to the community account below. Once the admin confirms your payment, your ID card will unlock automatically.</p>' 
    + acctHtml(acctOf(null)) 
    + '<div class="row"><button onclick="fxCloseDonate()">Close</button></div></div>';
  document.body.appendChild(modal);
}

function dl(){
  const c = $('cv');
  if(!c) return;
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = ((S.card || S.me).id || 'ID') + (S.cardFlipped ? '-back' : '-front') + '.png';
  a.click();
}
