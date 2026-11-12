// ------------------------------------------------------------
// SECTION: Admin: News (image upload)
// What it does: the News section with an image field; shows thumbnails.
// ------------------------------------------------------------
const back = '<div class="row"><button onclick="S.tab=\'dash\';render()">← Back to Admin</button></div>';
function newsAdmin() {
  let h = back + '<h2>News</h2><div class="card"><h3>Post news</h3><label>Title</label><input id="fn_t"><label>Story</label><textarea id="fn_b" rows="3"></textarea><label>Image (optional)</label><input type="file" accept="image/*" onchange="fxPick(this,\'news\',900)"><img id="pv_news" class="pv" style="display:none"><button class="p" onclick="fxAddNews()">Publish</button></div><div class="grid">';
  S.news.forEach(function (n) { h += '<div class="card">' + (imgOk(n.img) ? '<img class="thumb" src="' + esc(n.img) + '" alt="">' : '') + '<h3>' + esc(n.title) + '</h3><p class="mute">' + esc(n.body) + '</p><button class="d" onclick="del(\'news\',\'' + n._id + '\')">Delete</button></div>'; });
  return h + '</div>';
}
async function fxAddNews() {
  if (!v('fn_t')) return say('Please enter a title.');
  try { await addDoc(collection(db, 'news'), { title: v('fn_t'), body: v('fn_b'), img: IMG.news || '', at: serverTimestamp() }); IMG.news = ''; await reload(); } catch (e) { say(e.message); }
}

// ------------------------------------------------------------
// SECTION: Admin: Projects (image + bank account)
// What it does: the Projects section with an image and account fields
// (bank name, account number, account name) instead of a donation link.
// ------------------------------------------------------------
function projectsAdmin() {
  let h = back + '<h2>Projects</h2><div class="card"><h3>Create project</h3><label>Title</label><input id="fp_t"><label>Description</label><textarea id="fp_b" rows="2"></textarea><label>Target amount (₦)</label><input id="fp_g" type="number"><label>Image (optional)</label><input type="file" accept="image/*" onchange="fxPick(this,\'proj\',900)"><img id="pv_proj" class="pv" style="display:none"><label>Bank name (optional, otherwise the community account is used)</label><input id="fp_bank"><label>Account number</label><input id="fp_no" inputmode="numeric"><label>Account name</label><input id="fp_nm"><button class="p" onclick="fxAddProject()">Create</button></div><div class="grid">';
  S.proj.forEach(function (p) {
    h += '<div class="card">' + (imgOk(p.img) ? '<img class="thumb" src="' + esc(p.img) + '" alt="">' : '') + '<h3>' + esc(p.title) + '</h3><div class="bar"><i style="width:' + pct(p) + '%"></i></div><div class="mute">₦' + (p.raised || 0).toLocaleString() + ' / ₦' + (p.target || 0).toLocaleString() + '</div><div class="mute">' + (p.acct ? esc((p.bank || '') + ' · ' + p.acct) : 'Uses the community account') + '</div><div class="row"><button onclick="editTarget(\'' + p._id + '\',' + (p.target || 0) + ')">Set target</button><button onclick="fxEditAcct(\'' + p._id + '\')">Account</button><button class="d" onclick="del(\'projects\',\'' + p._id + '\')">Delete</button></div></div>';
  });
  return h + '</div>';
}
async function fxAddProject() {
  if (!v('fp_t')) return say('Please enter a title.');
  try { await addDoc(collection(db, 'projects'), { title: v('fp_t'), body: v('fp_b'), target: +v('fp_g') || 0, raised: 0, img: IMG.proj || '', bank: v('fp_bank'), acct: v('fp_no'), acctName: v('fp_nm') }); IMG.proj = ''; await reload(); } catch (e) { say(e.message); }
}
async function fxEditAcct(id) {
  const p = S.proj.filter(function (x) { return x._id === id; })[0]; if (!p) return;
  const b = prompt('Bank name', p.bank || ''); if (b === null) return;
  const n = prompt('Account number', p.acct || ''); if (n === null) return;
  const m = prompt('Account name', p.acctName || ''); if (m === null) return;
  try { await updateDoc(doc(db, 'projects', id), { bank: b.trim(), acct: n.trim(), acctName: m.trim() }); await reload(); } catch (e) { say(e.message); }
}

// ------------------------------------------------------------
// SECTION: Admin: Logo
// What it does: lets an admin upload the community logo (kept
// transparent) and saves it in settings/site.
// ------------------------------------------------------------
function logoAdmin() {
  return back + '<h2>Logo</h2><div class="card"><h3>Community logo</h3><p class="mute">Shown in the top bar, the home banner and the ID card.</p>' + (S.site.logo ? '<img class="pv" src="' + esc(S.site.logo) + '" alt="" style="background:#fff;padding:6px">' : '') + '<label>Choose a new logo (a PNG with a clear background works best)</label><input type="file" accept="image/*" onchange="fxPick(this,\'logo\',500,true)"><img id="pv_logo" class="pv" style="display:none;background:#fff;padding:6px"><button class="p" onclick="fxSaveLogo()">Save logo</button></div>';
}
async function fxSaveLogo() {
  if (!IMG.logo) return say('Choose a logo first.');
  try { await setDoc(doc(db, 'settings', 'site'), { logo: IMG.logo }, { merge: true }); IMG.logo = ''; await reload(); say('Logo saved.'); } catch (e) { say(e.message); }
}

// ------------------------------------------------------------
// SECTION: Admin: Donate page
// What it does: sets the Donate banner image and the community bank
// account shown on the home page and in the Donate panel.
// ------------------------------------------------------------
function donateAdmin() {
  const s = S.site || {};
  return back + '<h2>Donate page</h2><div class="card"><h3>Community account</h3><label>Bank name</label><input id="fd_bank" value="' + esc(s.bank || '') + '"><label>Account number</label><input id="fd_no" inputmode="numeric" value="' + esc(s.acct || '') + '"><label>Account name</label><input id="fd_nm" value="' + esc(s.acctName || '') + '"><label>Banner image (optional)</label>' + (imgOk(s.donImg) ? '<img class="pv" src="' + esc(s.donImg) + '" alt="">' : '') + '<input type="file" accept="image/*" onchange="fxPick(this,\'don\',1000)"><img id="pv_don" class="pv" style="display:none"><button class="p" onclick="fxSaveDonate()">Save</button></div>';
}
async function fxSaveDonate() {
  try { await setDoc(doc(db, 'settings', 'site'), { bank: v('fd_bank'), acct: v('fd_no'), acctName: v('fd_nm'), donImg: IMG.don || (S.site || {}).donImg || '' }, { merge: true }); IMG.don = ''; await reload(); say('Donate page saved.'); } catch (e) { say(e.message); }
}

// ------------------------------------------------------------
// SECTION: Admin page (replaces admin)
// What it does: News, Projects, Logo and Donate page use the new screens
// above. Everything else is the original admin page, with two extra
// cards (Logo, Donate page) and a "Scan ID card" button in the member form.
// ------------------------------------------------------------
const _admin = window.admin;
window.admin = function () {
  if (!isAdmin()) return _admin();
  let t = S.tab;
  if (t === 'settings') { S.tab = 'logo'; t = 'logo'; }
  if (t === 'news') return newsAdmin();
  if (t === 'projects') return projectsAdmin();
  if (t === 'logo') return logoAdmin();
  if (t === 'donate') return donateAdmin();
  let h = _admin();
  h = h.replace(/<div class="card tile" onclick="S\.tab='settings'[^"]*">.*?<\/div><\/div>/, '');
  if (['members', 'villages', 'council', 'donations'].indexOf(t) < 0) {
    const tile = function (k, ic, ti, d) { return '<div class="card tile" onclick="S.tab=\'' + k + '\';render();window.scrollTo(0,0)"><div class="ic">' + ic + '</div><h3>' + ti + '</h3><div class="mute">' + d + '</div></div>'; };
    const i = h.lastIndexOf('</div>');
    h = h.slice(0, i) + tile('logo', '🖼️', 'Logo', 'Community logo for the site and ID card') + tile('donate', '🎁', 'Donate page', 'Account details and banner image') + h.slice(i);
  }
  if (t === 'members') h = h.replace('<label>Email (optional)</label>', EXTRA_FIELDS + '<label>Email (optional)</label>');
  if (t === 'members') h = h.replace('<button class="p" id="abtn" onclick="submitMember()">Register</button>', '<button class="p" id="abtn" onclick="submitMember()">Register</button> <button onclick="fxScan()">Scan ID card</button>');
  return h;
};

// ------------------------------------------------------------
// SECTION: QR scanner for admins
// What it does: opens the camera, reads the QR on a member's ID card,
// puts the member ID into the admin member form and loads that member
// for editing. Uses the phone's built-in reader when it has one,
// otherwise the jsQR library.
// ------------------------------------------------------------
async function fxScan() {
  const ov = document.createElement('div'); ov.className = 'scan';
  ov.innerHTML = '<video id="scv" playsinline muted></video><div>Point the camera at the QR code on the ID card</div><button class="p" id="scx">Cancel</button>';
  document.body.appendChild(ov);
  let stream = null, stop = false;
  const done = function () { stop = true; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); ov.remove(); };
  document.getElementById('scx').onclick = done;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
  catch (e) { done(); return say('Camera not available. Allow camera access, or type the ID instead.'); }
  const vd = document.getElementById('scv'); vd.srcObject = stream; try { await vd.play(); } catch (e) {}
  const det = ('BarcodeDetector' in window) ? new BarcodeDetector({ formats: ['qr_code'] }) : null;
  if (!det) { try { await lib(JSQR_URL); } catch (e) { done(); return say('The QR reader could not load. Type the ID instead.'); } }
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  const found = function (t) { const mm = String(t).match(/UZAIRUE:([A-Z]+-\d+)/i); if (!mm) return false; done(); const f = $('aid'); if (f) { f.value = mm[1].toUpperCase(); lookupId(); } return true; };
  const tick = async function () {
    if (stop) return;
    try {
      if (vd.videoWidth) {
        if (det) { const r = await det.detect(vd); if (r.length && found(r[0].rawValue)) return; }
        else if (window.jsQR) { cv.width = vd.videoWidth; cv.height = vd.videoHeight; cx.drawImage(vd, 0, 0); const im = cx.getImageData(0, 0, cv.width, cv.height), r = jsQR(im.data, im.width, im.height); if (r && found(r.data)) return; }
      }
    } catch (e) {}
    requestAnimationFrame(tick);
  };
  tick();
}
