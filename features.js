// ============================================================
// FILE: features.js  (load it AFTER app.js)
// What it does: adds the new features WITHOUT editing the existing files.
//   - images for news and projects, and a banner for the Donate section
//   - Donate button that opens a panel with account details and a Copy button
//   - bank account fields (bank, number, name) instead of a link
//   - Logo section for admins (used in the top bar, home banner and ID card)
//   - new ID card design with the logo and a QR code
//   - "Scan ID card" in the admin member form (QR fills the edit form)
// How: it replaces a few functions (home, admin, drawCard, loadPub) with
// extended versions and adds new ones. Delete this file and its <script>
// line and the app goes back to exactly how it was.
//   - PART 2: occupation, date of birth, age and address on the ID card
// All new function names start with "fx" so they never clash with your own code.
// ============================================================
(function () {
  'use strict';

  // ------------------------------------------------------------
  // SECTION: Extra styles
  // What it does: styles for the donate panel, scanner, toast and previews.
  // ------------------------------------------------------------
  const st = document.createElement('style');
  st.textContent =
    '.modal{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.modal .card{max-width:420px;width:100%}' +
    '.acct{text-align:center;padding:10px 0}' +
    '.pv{max-width:100%;max-height:140px;border-radius:10px;margin:0 0 10px}' +
    '.donimg{width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-bottom:10px}' +
    '.scan{position:fixed;inset:0;z-index:50;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#fff;padding:16px}' +
    '.scan video{max-width:100%;max-height:65vh;border-radius:12px}' +
    '.toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:var(--acc);color:var(--accink);padding:10px 16px;border-radius:99px;z-index:60;font-weight:600}';
  document.head.appendChild(st);

  // ------------------------------------------------------------
  // SECTION: Library loader
  // What it does: loads the QR code maker (and, on demand, the QR reader)
  // from the jsDelivr CDN one time, and lets other code wait for them.
  // ------------------------------------------------------------
  const QR_URL = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
  const JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
  const libs = {};
  function lib(url) {
    return libs[url] || (libs[url] = new Promise(function (res, rej) {
      const s = document.createElement('script');
      s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + url)); };
      s.src = url; document.head.appendChild(s);
    }));
  }
  lib(QR_URL).catch(function () {});

  // ------------------------------------------------------------
  // SECTION: Small helpers
  // What it does: image check, toast message, copy-to-clipboard and a
  // rounded-rectangle painter used by the ID card.
  // ------------------------------------------------------------
  const imgOk = function (u) { return /^(https?:\/\/|data:image\/)/i.test(u || '') ? u : ''; };
  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1600); }
  function fxCopy(t) {
    const fb = function () { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); toast('Account number copied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Account number copied'); }, fb); else fb();
  }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); x.fill(); }

  // ------------------------------------------------------------
  // SECTION: Site settings (logo, banner, community account)
  // What it does: reads the settings/site document, shows the logo in the
  // top bar, and refreshes it every time the public data is loaded.
  // ------------------------------------------------------------
  S.site = S.site || {};
  function applyLogo() {
    const l = document.querySelector('.logo'); if (!l) return;
    l.innerHTML = (S.site.logo ? '<img src="' + esc(S.site.logo) + '" alt="" style="height:30px;vertical-align:middle;margin-right:8px;border-radius:6px">' : '') + 'UZAIRUE';
  }
  async function loadSite() {
    if (!cfgOk) return;
    try { const d = await getDoc(doc(db, 'settings', 'site')); S.site = d.exists() ? d.data() : {}; } catch (e) { S.site = {}; }
    applyLogo();
  }
  const _loadPub = window.loadPub;
  window.loadPub = async function () { await _loadPub(); await loadSite(); };

  // ------------------------------------------------------------
  // SECTION: Image picker
  // What it does: reads a chosen image, shrinks it (so it fits in the
  // database), keeps it in IMG under a key and shows a preview.
  // ------------------------------------------------------------
  const IMG = {};
  function fxPick(inp, key, max, png) {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = function () {
      const im = new Image();
      im.onload = function () {
        const k = Math.min(1, max / Math.max(im.width, im.height)), w = Math.round(im.width * k), h = Math.round(im.height * k), c = document.createElement('canvas');
        c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
        IMG[key] = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.78);
        const p = $('pv_' + key); if (p) { p.src = IMG[key]; p.style.display = 'block'; }
      };
      im.src = r.result;
    };
    r.readAsDataURL(f);
  }

  // ------------------------------------------------------------
  // SECTION: Donate panel
  // What it does: shows the bank details (a project's own account, or the
  // community account) in a pop-up with a Copy button.
  // ------------------------------------------------------------
  const acctOf = function (p) { const s = S.site || {}; return (p && (p.acct || p.bank)) ? { bank: p.bank, acct: p.acct, name: p.acctName } : { bank: s.bank, acct: s.acct, name: s.acctName }; };
  function acctHtml(a) {
    if (!a.acct) return '<p class="mute">Account details will be added soon.</p>';
    return '<div class="acct"><div class="mute">' + esc(a.bank || '') + '</div><div class="big">' + esc(a.acct) + '</div><div>' + esc(a.name || '') + '</div></div><div class="row"><button class="p" onclick="fxCopy(\'' + String(a.acct).replace(/[^\w-]/g, '') + '\')">Copy account number</button></div>';
  }
  function fxCloseDonate() { const m = document.getElementById('donModal'); if (m) m.remove(); }
  function fxDonate(pid) {
    fxCloseDonate();
    const p = pid ? S.proj.filter(function (x) { return x._id === pid; })[0] : null;
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'donModal';
    m.onclick = function (e) { if (e.target === m) fxCloseDonate(); };
    m.innerHTML = '<div class="card"><h3>' + (p ? 'Donate to ' + esc(p.title) : 'Support UZAIRUE') + '</h3><p class="mute">Send your gift to this account, then tell us so we can record it.</p>' + acctHtml(acctOf(p)) + '<div class="row"><button onclick="fxCloseDonate()">Close</button></div></div>';
    document.body.appendChild(m);
  }

  // ------------------------------------------------------------
  // SECTION: Home page (replaces home)
  // What it does: same home page as before, plus the logo, news and
  // project images, a Donate button on every project and a Donate section
  // with a banner image and the community account.
  // ------------------------------------------------------------
  window.home = function () {
    const s = S.site || {};
    let h = '<div class="hero">' + (s.logo ? '<img src="' + esc(s.logo) + '" alt="" style="height:64px;margin-bottom:8px">' : '') + '<h1>UZAIRUE</h1><p>One community, one future. Follow our news, back our projects and join the family.</p><div class="row"><button class="p" onclick="fxDonate()">Donate</button>' + (S.user ? '' : '<button onclick="go(\'signup\')">Join now</button>') + '</div></div>';
    h += '<h2 id="news">Announcements &amp; News</h2><div class="grid">';
    if (!S.news.length) h += '<div class="card mute">No news yet.</div>';
    S.news.forEach(function (n) { h += '<div class="card">' + (imgOk(n.img) ? '<img class="thumb" src="' + esc(n.img) + '" alt="">' : '') + '<h3>' + esc(n.title) + '</h3><p>' + esc(n.body) + '</p></div>'; });
    h += '</div><h2 id="projects">Projects &amp; Progress</h2><div class="grid">';
    if (!S.proj.length) h += '<div class="card mute">No projects yet.</div>';
    S.proj.forEach(function (p) {
      h += '<div class="card">' + (imgOk(p.img) ? '<img class="thumb" src="' + esc(p.img) + '" alt="">' : '') + '<h3>' + esc(p.title) + '</h3><p class="mute">' + esc(p.body) + '</p><div class="bar"><i style="width:' + pct(p) + '%"></i></div><div class="mute">' + pct(p) + '% · ₦' + (p.raised || 0).toLocaleString() + ' of ₦' + (p.target || 0).toLocaleString() + '</div><div class="row"><button class="p" onclick="fxDonate(\'' + p._id + '\')">Donate</button></div></div>';
    });
    h += '</div><h2 id="donate">Support the community</h2><div class="card">' + (imgOk(s.donImg) ? '<img class="donimg" src="' + esc(s.donImg) + '" alt="">' : '') + '<p>Every contribution moves a project forward.</p>' + acctHtml(acctOf(null)) + '</div>';
    return h;
  };

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
  // SECTION: ID card (replaces drawCard)
  // What it does: paints the new card: dark green curved left panel with
  // the member's name, title, ID, village, house, phone and status; lime
  // green right panel with the logo, "UZAIRUE COMMUNITY CARD", the member
  // photo and a QR code that holds the member ID. The logo is also the
  // faint background. No icons.
  // ------------------------------------------------------------
  window.drawCard = async function (m, id) {
    const c = $(id); if (!c) return;
    try { await lib(QR_URL); } catch (e) {}
    const W = 1050, H = 600; c.width = W; c.height = H;
    const x = c.getContext('2d');
    const load = function (src) { return new Promise(function (r) { if (!src) return r(null); const i = new Image(); i.onload = function () { r(i); }; i.onerror = function () { r(null); }; i.src = src; }); };
    const imgs = await Promise.all([load((S.site || {}).logo), load(m.img)]), logo = imgs[0], photo = imgs[1];
    const LIME = '#7ddc1f', PALE = '#c8f06a';
    // panels
    let g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0d4a1a'); g.addColorStop(1, '#16802d'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#0b3d17'; x.beginPath(); x.moveTo(0, 0); x.lineTo(590, 0); x.bezierCurveTo(735, 140, 725, 330, 495, H); x.lineTo(0, H); x.closePath(); x.fill();
    g = x.createLinearGradient(0, 0, 560, H); g.addColorStop(0, '#031a08'); g.addColorStop(1, '#06300f'); x.fillStyle = g;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(565, 0); x.bezierCurveTo(705, 140, 695, 330, 470, H); x.lineTo(0, H); x.closePath(); x.fill();
    // faint logo background
    x.save(); x.globalAlpha = 0.07;
    if (logo) { const k = Math.min(700 / logo.width, 520 / logo.height); x.drawImage(logo, 525 - logo.width * k / 2, 300 - logo.height * k / 2, logo.width * k, logo.height * k); }
    else { x.fillStyle = LIME; x.font = 'bold 150px sans-serif'; x.textAlign = 'center'; x.fillText('UZAIRUE', 525, 330); }
    x.restore();
    // name (wraps to 3 lines), title, divider
    x.textAlign = 'left'; x.fillStyle = LIME; x.font = 'bold 38px sans-serif';
    const lines = ['']; String(m.name || '').toUpperCase().split(' ').forEach(function (w) { const t = (lines[lines.length - 1] + ' ' + w).trim(); if (x.measureText(t).width > 340 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; });
    lines.slice(0, 3).forEach(function (l, i) { x.fillText(l, 40, 85 + i * 44); });
    x.fillStyle = PALE; x.font = 'bold 24px sans-serif'; x.fillText(String((titleOf(m) || 'MEMBER')).toUpperCase(), 40, 215);
    x.fillStyle = '#145a22'; x.fillRect(40, 238, 500, 3);
    // details (no icons): smaller values so everything fits
    const addr = m.address || m.house || '-', age = ageOf(m.dob);
    const stat = (age !== '' ? age + ' yrs \u00b7 ' : '') + (m.status === 'revoked' ? 'REVOKED' : 'ACTIVE');
    const rows = [['MEMBER ID', m.id || ''], ['VILLAGE / TOWN', m.village || ''], ['ADDRESS', addr], ['PHONE', m.phone || '-'], ['OCCUPATION', m.occupation || '-'], ['AGE / STATUS', stat]];
    let ry = 292;
    rows.forEach(function (r) {
      x.fillStyle = LIME; x.font = 'bold 16px sans-serif'; x.fillText(r[0], 40, ry);
      x.fillStyle = (m.status === 'revoked' && r[0] === 'AGE / STATUS') ? '#ff6b6b' : '#ffffff'; x.font = '22px sans-serif';
      const ls = wrapText(x, String(r[1]), 300).slice(0, 2);
      ls.forEach(function (l, i) { x.fillText(l, 215, ry + i * 26); });
      ry += 44 + (ls.length > 1 ? 24 : 0);
    });
    // photo
    x.save(); x.beginPath(); x.arc(480, 115, 75, 0, Math.PI * 2); x.closePath(); x.clip();
    x.fillStyle = '#16284a'; x.fillRect(405, 40, 150, 150);
    if (photo) x.drawImage(photo, 405, 40, 150, 150); else { x.fillStyle = LIME; x.font = 'bold 70px sans-serif'; x.textAlign = 'center'; x.fillText((m.name || '?').charAt(0).toUpperCase(), 480, 140); x.textAlign = 'left'; }
    x.restore(); x.strokeStyle = LIME; x.lineWidth = 4; x.beginPath(); x.arc(480, 115, 75, 0, Math.PI * 2); x.stroke();
    // right panel: logo and title
    x.textAlign = 'center';
    if (logo) { const k = Math.min(230 / logo.width, 200 / logo.height); x.drawImage(logo, 840 - logo.width * k / 2, 75, logo.width * k, logo.height * k); }
    else { x.fillStyle = LIME; x.font = 'bold 56px sans-serif'; x.fillText('UZAIRUE', 840, 170); }
    x.fillStyle = LIME; x.font = 'bold 46px sans-serif'; x.fillText('UZAIRUE', 840, 335);
    x.fillStyle = PALE; x.font = 'bold 32px sans-serif'; x.fillText('COMMUNITY CARD', 840, 380);
    // QR code (holds the member ID)
    if (window.qrcode && m.id) {
      const q = qrcode(0, 'M'); q.addData('UZAIRUE:' + m.id); q.make();
      const n = q.getModuleCount(), box = 190, pad = 14, cs = (box - pad * 2) / n, qx = 745, qy = 395;
      x.fillStyle = '#ffffff'; rr(x, qx, qy, box, box, 14); x.fillStyle = '#000000';
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(qx + pad + k * cs, qy + pad + r * cs, cs + 0.6, cs + 0.6);
    }
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

  // ------------------------------------------------------------
  // PART 2: Occupation, date of birth and age
  // What it does: adds Occupation and Date of birth to the sign-up form,
  // the admin register/edit form and the member's own profile. Age is
  // worked out from the date each time, so it never goes out of date.
  // Age and occupation also show on the profile, the admin member cards
  // and the ID card. "Address" is read from the saved address (or the
  // older house-number value, so old records still show).
  // ------------------------------------------------------------
  function ageOf(dob) {
    if (!dob) return '';
    const p = String(dob).split('-').map(Number); if (p.length < 3 || !p[0]) return '';
    const n = new Date(); let a = n.getFullYear() - p[0];
    if (n.getMonth() + 1 < p[1] || (n.getMonth() + 1 === p[1] && n.getDate() < p[2])) a--;
    return (a >= 0 && a < 150) ? a : '';
  }
  function wrapText(x, t, w) {
    const out = ['']; t.split(' ').forEach(function (s) { const c = (out[out.length - 1] + ' ' + s).trim(); if (x.measureText(c).width > w && out[out.length - 1]) out.push(s); else out[out.length - 1] = c; });
    return out;
  }
  const EXTRA_FIELDS = '<label>Occupation</label><input id="fx_occ" placeholder="e.g. Teacher"><label>Date of birth</label><input id="fx_dob" type="date">';

  // --- Draw the extra fields on the sign-up page and the About card on the profile page (runs after every redraw)
  const _render = window.render;
  window.render = function () { _render(); fxDecorate(); };
  function fxDecorate() {
    const app = $('app'); if (!app) return;
    if (S.view === 'signup') {
      const sv = $('sv');
      if (sv && !$('fx_occ') && sv.previousElementSibling) sv.previousElementSibling.insertAdjacentHTML('beforebegin', EXTRA_FIELDS);
    }
    if (S.view === 'me') {
      const m = S.card || S.me; if (!m) return;
      const a = ageOf(m.dob);
      let h = '<div class="card" style="margin-top:14px"><h3>About</h3><div class="mute">' + (a !== '' ? a + ' years old' : 'Date of birth not added') + ' · ' + esc(m.occupation || 'No occupation added') + '</div>';
      if (!S.card) h += '<label style="display:block;margin-top:10px">Occupation</label><input id="fx_pocc" value="' + esc(m.occupation || '') + '"><label>Date of birth</label><input id="fx_pdob" type="date" value="' + esc(m.dob || '') + '"><button class="p" onclick="fxSaveAbout()">Save</button>';
      app.insertAdjacentHTML('beforeend', h + '</div>');
    }
  }
  async function fxSaveAbout() {
    if (!S.me) return;
    try { const o = v('fx_pocc'), d = v('fx_pdob'); await updateDoc(doc(db, 'members', S.me._id), { occupation: o, dob: d }); S.me.occupation = o; S.me.dob = d; say('Saved.'); } catch (e) { say(e.message); }
  }

  // --- Save the new sign-up fields right after the account is created
  const _signup = window.doSignup;
  window.doSignup = async function () {
    const occ = v('fx_occ'), dob = v('fx_dob');
    await _signup();
    if (S.user && S.me && S.me._id && (occ || dob)) {
      try { await updateDoc(doc(db, 'members', S.me._id), { occupation: occ, dob: dob }); S.me.occupation = occ; S.me.dob = dob; } catch (e) {}
    }
  };

  // --- Admin form: fill the new fields when an ID is typed, and save them with the member
  const _look = window.lookupId; let fxWas = false;
  window.lookupId = function () {
    _look();
    const m = S.editId ? S.mem.filter(function (x) { return x._id === S.editId; })[0] : null, o = $('fx_occ'), d = $('fx_dob');
    if (o && d) { if (m) { o.value = m.occupation || ''; d.value = m.dob || ''; } else if (fxWas) { o.value = ''; d.value = ''; } }
    fxWas = !!m;
  };
  const _sub = window.submitMember;
  window.submitMember = async function () {
    const occ = v('fx_occ'), dob = v('fx_dob'), editing = S.editId;
    await _sub();
    if (!/^(Saved|Registered)/.test(S.msg || '')) return;
    if (!occ && !dob && !editing) return;
    try {
      const t = editing ? S.mem.filter(function (x) { return x._id === editing; })[0] : S.mem.slice().sort(function (a, b) { return parseInt(String(b.id).slice(4), 10) - parseInt(String(a.id).slice(4), 10); })[0];
      if (t) { await updateDoc(doc(db, 'members', t._id), { occupation: occ, dob: dob }); await reload(); }
    } catch (e) {}
  };

  // --- Admin member cards: add "age · occupation" under each member's ID line
  const _mc = window.memCards;
  window.memCards = function () {
    let h = _mc();
    S.mem.forEach(function (m) {
      const a = ageOf(m.dob), bits = []; if (a !== '') bits.push(a + ' yrs'); if (m.occupation) bits.push(esc(m.occupation));
      if (bits.length) { const k = esc(m.id) + ' · ' + esc(m.village); h = h.replace(k, k + '<br>' + bits.join(' · ')); }
    });
    return h;
  };


    // ------------------------------------------------------------
  // PART 3: Hamburger menu
  // What it does: replaces the row of top buttons with a menu button.
  // The existing nav() still builds all the buttons. This part moves
  // "Sign up / Log in" out so it stays visible in the top bar, and
  // turns the other buttons into a dropdown opened by the menu button.
  // The page you are on stays highlighted inside the menu.
  // Closes when you tap an item, tap outside the menu, or press Esc.
  // ------------------------------------------------------------

  // --- Styles for the menu button, the dropdown and the visible login button
  const menuStyle = document.createElement('style');
  menuStyle.textContent =
    '#nav{' +
      'display:none;' +
      'position:absolute;' +
      'top:100%;' +
      'right:10px;' +
      'min-width:220px;' +
      'max-width:calc(100% - 20px);' +
      'flex-direction:column;' +
      'gap:6px;' +
      'margin:0;' +
      'padding:10px;' +
      'background:var(--card);' +
      'border:1px solid var(--line);' +
      'border-radius:14px;' +
      'box-shadow:0 12px 30px rgba(0,0,0,.35);' +
      'z-index:6;' +
    '}' +
    '#nav.fxOpen{display:flex}' +
    '#nav button{width:100%;text-align:left}' +
    '#fxAuth{display:flex;gap:6px;margin-left:auto;order:1}' +
    '#theme{order:2}' +
    '#fxMenuBtn{order:3;font-size:18px;line-height:1;padding:8px 12px}';
  document.head.appendChild(menuStyle);

  // --- Creates the menu button and the box for the login button (once)
  function fxMenuParts() {
    const header = document.querySelector('header');

    if (!header) {
      return null;
    }

    let authBox = document.getElementById('fxAuth');
    let menuBtn = document.getElementById('fxMenuBtn');

    if (!authBox) {
      authBox = document.createElement('div');
      authBox.id = 'fxAuth';
      header.appendChild(authBox);
    }

    if (!menuBtn) {
      menuBtn = document.createElement('button');
      menuBtn.id = 'fxMenuBtn';
      menuBtn.type = 'button';
      menuBtn.setAttribute('aria-label', 'Menu');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = '\u2630';
      menuBtn.onclick = fxToggleMenu;
      header.appendChild(menuBtn);
    }

    return { authBox: authBox, menuBtn: menuBtn };
  }

  // --- Opens or closes the dropdown and switches the icon
  function fxSetMenu(open) {
    const nav = document.getElementById('nav');
    const btn = document.getElementById('fxMenuBtn');

    if (!nav || !btn) {
      return;
    }

    nav.classList.toggle('fxOpen', open);
    btn.textContent = open ? '\u2715' : '\u2630';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function fxToggleMenu() {
    const nav = document.getElementById('nav');
    const isOpen = nav && nav.classList.contains('fxOpen');

    fxSetMenu(!isOpen);
  }

  function fxCloseMenu() {
    fxSetMenu(false);
  }

  // --- After nav() builds the buttons, move the login button out of the menu
  function fxMenuSync() {
    const parts = fxMenuParts();
    const nav = document.getElementById('nav');

    if (!parts || !nav) {
      return;
    }

    parts.authBox.innerHTML = '';

    Array.prototype.slice.call(nav.children).forEach(function (btn) {
      const click = btn.getAttribute('onclick') || '';

      if (click.indexOf("go('login')") >= 0) {
        parts.authBox.appendChild(btn);
      }
    });

    fxCloseMenu();
  }

  // --- Run fxMenuSync every time nav() redraws the top buttons
  const _nav = window.nav;

  window.nav = function () {
    _nav();
    fxMenuSync();
  };

  // --- Close the menu when tapping outside it, or pressing Esc
  document.addEventListener('click', function (e) {
    const nav = document.getElementById('nav');
    const btn = document.getElementById('fxMenuBtn');

    if (!nav || !nav.classList.contains('fxOpen')) {
      return;
    }

    if (btn && btn.contains(e.target)) {
      return;
    }

    if (nav.contains(e.target)) {
      setTimeout(fxCloseMenu, 0);
      return;
    }

    fxCloseMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      fxCloseMenu();
    }
  });

  // --- Set the menu up for the page that is already on screen
  fxMenuSync();



  // ------------------------------------------------------------
  // DUES (paste above the "SECTION: Hook-up and start" part)
  // What it does: adds community dues, paid monthly or yearly.
  //
  // Members get a "Dues" page (new item in the menu) that shows:
  //   - their plan (monthly or yearly) and the amount
  //   - their status: "Paid up to Mar 2027" or "Owing 3 months"
  //   - the community bank account with a Copy button
  //   - an "I've paid" form (months or years, amount, reference,
  //     optional receipt photo). The payment waits as "Pending"
  //     until an admin confirms it.
  //   - their payment history
  //
  // Admins get a "Dues" card on the Admin page with:
  //   - the monthly amount, yearly amount and the month dues start
  //   - totals (paid up, owing, pending, money confirmed)
  //   - pending payments to confirm or reject
  //   - a form to record a payment for any member by ID
  //   - the list of members with their status, a filter, a plan
  //     switch and a "Remind on WhatsApp" button for those who owe
  //
  // Uses: the Firebase "dues" collection (payments) and the
  // settings/dues document (amounts). Needs the new Firebase rules.
  // ------------------------------------------------------------

  // --- Shared state for dues
  S.duesCfg = S.duesCfg || {};
  S.fxMine = S.fxMine || [];
  S.fxAll = S.fxAll || [];
  S.fxF = S.fxF || { q: '', v: '', s: '' };

  // --- Small helpers: money, months, plan and WhatsApp link
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function naira(n) {
    return '\u20a6' + Number(n || 0).toLocaleString();
  }

  // "2026-11" becomes a month number so months can be counted
  function fxMonthIndex(ym) {
    const p = String(ym || '').split('-').map(Number);

    if (p.length < 2 || !p[0] || !p[1]) {
      return null;
    }

    return p[0] * 12 + (p[1] - 1);
  }

  function fxNowIndex() {
    const d = new Date();

    return d.getFullYear() * 12 + d.getMonth();
  }

  function fxMonthLabel(i) {
    return MONTH_NAMES[i % 12] + ' ' + Math.floor(i / 12);
  }

  function fxToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function fxPlanOf(m) {
    return m && m.duesPlan === 'yearly' ? 'yearly' : 'monthly';
  }

  function fxUnitRate(plan) {
    const cfg = S.duesCfg || {};

    return Number(plan === 'yearly' ? cfg.yearly : cfg.monthly) || 0;
  }

  // Phone number to a WhatsApp link (Nigerian 0803... becomes 234803...)
  function fxWaLink(m, st) {
    let digits = String(m.phone || '').replace(/\D/g, '');

    if (digits.length === 11 && digits.charAt(0) === '0') {
      digits = '234' + digits.slice(1);
    }

    if (!digits) {
      return '';
    }

    const text =
      'Hello ' + m.name + ', this is a reminder from UZAIRUE. ' +
      'Your dues are owing: ' + st.owing + ' month(s), ' + naira(st.owed) + '. Thank you.';

    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
  }

  // --- Works out where a member stands, from their confirmed payments
  function fxDuesStatus(m, payments) {
    const cfg = S.duesCfg || {};
    const start = fxMonthIndex(cfg.startMonth);
    const plan = fxPlanOf(m);
    const hasRates = Number(cfg.monthly) > 0 || Number(cfg.yearly) > 0;

    if (start === null || !hasRates) {
      return { active: false, plan: plan };
    }

    // Dues count from the start month, or the month the member joined if later
    let from = start;

    if (m.createdAt && typeof m.createdAt.toDate === 'function') {
      const joined = m.createdAt.toDate();
      const joinIndex = joined.getFullYear() * 12 + joined.getMonth();

      from = Math.max(start, joinIndex);
    }

    const perMonth = plan === 'yearly' ? fxUnitRate('yearly') / 12 : fxUnitRate('monthly');
    const due = Math.max(0, fxNowIndex() - from + 1);
    let paid = 0;
    let pending = 0;

    payments.forEach(function (p) {
      if (p.status === 'confirmed') {
        paid += Number(p.months) || 0;
      } else if (p.status === 'pending') {
        pending += 1;
      }
    });

    const owing = Math.max(0, due - paid);

    return {
      active: true,
      plan: plan,
      perMonth: perMonth,
      owing: owing,
      owed: Math.round(owing * perMonth),
      paidUpTo: from + paid - 1,
      paid: paid,
      pending: pending
    };
  }

  function fxStatusText(st) {
    if (!st.active) {
      return 'Dues have not started yet';
    }

    if (st.owing > 0) {
      return 'Owing ' + st.owing + ' month' + (st.owing === 1 ? '' : 's') + ' \u00b7 ' + naira(st.owed);
    }

    return 'Paid up to ' + fxMonthLabel(st.paidUpTo);
  }

  function fxStatusHtml(st) {
    const owing = st.active && st.owing > 0;
    const style = owing ? ' style="color:var(--bad)"' : '';

    return '<div class="big"' + style + '>' + esc(fxStatusText(st)) + '</div>';
  }

  // --- Loading: amounts, my payments (members) and all payments (admins)
  let fxFirestorePromise = null;

  // Firebase's "where" is not shared by firebase.js, so load it here (same copy of Firebase)
  function fxFirestore() {
    if (!fxFirestorePromise) {
      fxFirestorePromise = import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    }

    return fxFirestorePromise;
  }

  async function fxLoadCfg() {
    if (!cfgOk) {
      return;
    }

    try {
      const d = await getDoc(doc(db, 'settings', 'dues'));

      S.duesCfg = d.exists() ? d.data() : {};
    } catch (e) {
      S.duesCfg = {};
    }
  }

  async function fxLoadMine() {
    S.fxMine = [];

    if (!cfgOk || !auth || !auth.currentUser || !auth.currentUser.emailVerified) {
      return;
    }

    try {
      const fs = await fxFirestore();
      const q = fs.query(
        fs.collection(db, 'dues'),
        fs.where('uid', '==', auth.currentUser.uid)
      );
      const snap = await fs.getDocs(q);

      S.fxMine = snap.docs.map(function (d) {
        return Object.assign({ _id: d.id }, d.data());
      });
    } catch (e) {
      S.fxMine = [];
    }
  }

  const _loadPubDues = window.loadPub;

  window.loadPub = async function () {
    await _loadPubDues();
    await fxLoadCfg();
    await fxLoadMine();
  };

  const _loadAdminDues = window.loadAdmin;

  window.loadAdmin = async function () {
    await _loadAdminDues();
    S.fxAll = (await list('dues', 'at')).reverse();
  };

  // --- Menu: add a "Dues" item for logged-in, verified members
  const _navDues = window.nav;

  window.nav = function () {
    _navDues();
    fxDuesNavItem();
  };

  function fxDuesNavItem() {
    const nav = document.getElementById('nav');

    if (!nav || !S.user || !S.user.emailVerified) {
      return;
    }

    const btn = document.createElement('button');

    btn.textContent = 'Dues';
    btn.setAttribute('onclick', "go('dues')");

    if (S.view === 'dues') {
      btn.classList.add('on');
    }

    const logout = Array.prototype.slice.call(nav.children).filter(function (b) {
      return (b.getAttribute('onclick') || '').indexOf('out()') >= 0;
    })[0];

    if (logout) {
      nav.insertBefore(btn, logout);
    } else {
      nav.appendChild(btn);
    }
  }

  // --- Page: after the normal redraw, draw the Dues page when it is selected
  const _renderDues = window.render;

  window.render = function () {
    if (S.ready && S.view === 'dues') {
      if (!S.user) {
        S.view = 'home';
      } else if (!S.user.emailVerified) {
        S.view = 'verify';
      }
    }

    _renderDues();

    if (S.view === 'dues') {
      fxDrawDues();
    }
  };

  // --- Member page: status, plan, how to pay, "I've paid" form and history
  function fxDrawDues() {
    const app = $('app');
    const m = S.me;

    if (!app) {
      return;
    }

    if (!m) {
      app.innerHTML = '<div class="card">Your profile is not available yet.</div>';
      return;
    }

    const cfg = S.duesCfg || {};
    const st = fxDuesStatus(m, S.fxMine || []);
    const plan = fxPlanOf(m);
    const unit = plan === 'yearly' ? 'year' : 'month';
    const rate = fxUnitRate(plan);
    const parts = [];

    if (S.msg) {
      parts.push('<div class="msg">' + esc(S.msg) + '</div>');
    }

    parts.push('<h2>Dues</h2>');
    parts.push('<div class="card">');
    parts.push('<h3>Your dues</h3>');
    parts.push(fxStatusHtml(st));

    if (st.active && st.pending > 0) {
      parts.push('<div class="mute">' + st.pending + ' payment(s) waiting for an admin to confirm</div>');
    }

    parts.push('<div class="mute" style="margin-top:8px">Plan: ' + (plan === 'yearly' ? 'Yearly' : 'Monthly') + ' \u00b7 ' + naira(rate) + ' per ' + unit + '</div>');
    parts.push('<div class="row">');
    parts.push('<button class="' + (plan === 'monthly' ? 'on' : '') + '" onclick="fxSetPlan(\'monthly\')">Monthly</button>');
    parts.push('<button class="' + (plan === 'yearly' ? 'on' : '') + '" onclick="fxSetPlan(\'yearly\')">Yearly</button>');
    parts.push('</div>');
    parts.push('</div>');

    if (st.active) {
      parts.push('<h2>Pay your dues</h2>');
      parts.push('<div class="card">');
      parts.push('<p class="mute">Send the money to this account, then tell us below.</p>');
      parts.push(acctHtml(acctOf(null)));
      parts.push('</div>');
      parts.push('<div class="card" style="margin-top:14px">');
      parts.push('<h3>I\u2019ve paid</h3>');
      parts.push('<label>How many ' + unit + 's are you paying for?</label>');
      parts.push('<input id="fx_dn" type="number" min="1" value="1" oninput="fxDuesCalc()">');
      parts.push('<label>Amount paid (\u20a6)</label>');
      parts.push('<input id="fx_da" type="number" value="' + rate + '">');
      parts.push('<label>Reference or narration</label>');
      parts.push('<input id="fx_dr">');
      parts.push('<label>Receipt photo (optional)</label>');
      parts.push('<input type="file" accept="image/*" onchange="fxPick(this,\'receipt\',900)">');
      parts.push('<img id="pv_receipt" class="pv" style="display:none">');
      parts.push('<button class="p" onclick="fxPayDues()">I\u2019ve paid</button>');
      parts.push('</div>');
    } else {
      parts.push('<div class="card mute" style="margin-top:14px">Dues have not been set up yet. Please check again soon.</div>');
    }

    parts.push('<h2>Payment history</h2>');
    parts.push('<div class="grid">');
    parts.push(fxHistoryHtml(S.fxMine || []));
    parts.push('</div>');

    app.innerHTML = parts.join('');
  }

  // Cards for a list of payments (used on the member page)
  function fxHistoryHtml(payments) {
    if (!payments.length) {
      return '<div class="card mute">No payments yet.</div>';
    }

    return payments
      .slice()
      .sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      })
      .map(function (p) {
        const unit = p.plan === 'yearly' ? 'year' : 'month';
        const label = p.status === 'confirmed' ? 'Confirmed' : (p.status === 'rejected' ? 'Rejected' : 'Pending');

        return '<div class="card">' +
          '<div class="big">' + naira(p.amount) + '</div>' +
          '<div>' + esc(p.count) + ' ' + unit + (Number(p.count) === 1 ? '' : 's') + '</div>' +
          '<div class="mute">' + esc(p.date) + (p.ref ? ' \u00b7 ' + esc(p.ref) : '') + '</div>' +
          '<span class="tag ' + (p.status === 'confirmed' ? 'a' : '') + '">' + label + '</span>' +
          '</div>';
      })
      .join('');
  }

  // --- Member actions: choose a plan, update the amount, report a payment
  async function fxSetPlan(plan) {
    if (!S.me) {
      return;
    }

    try {
      await updateDoc(doc(db, 'members', S.me._id), { duesPlan: plan });
      S.me.duesPlan = plan;
      render();
    } catch (e) {
      say(e.message);
    }
  }

  // Fills the amount box when the number of months or years changes
  function fxDuesCalc() {
    const n = parseInt(v('fx_dn'), 10) || 0;
    const rate = fxUnitRate(fxPlanOf(S.me));
    const amount = $('fx_da');

    if (amount) {
      amount.value = n > 0 ? n * rate : '';
    }
  }

  async function fxPayDues() {
    const m = S.me;
    const plan = fxPlanOf(m);
    const count = parseInt(v('fx_dn'), 10);
    const amount = Number(v('fx_da'));

    if (!(count >= 1) || !(amount > 0)) {
      return say('Enter how many ' + (plan === 'yearly' ? 'years' : 'months') + ' and the amount you paid.');
    }

    try {
      await addDoc(collection(db, 'dues'), {
        uid: auth.currentUser.uid,
        mid: m._id,
        memberId: m.id,
        name: m.name,
        village: m.village || '',
        plan: plan,
        count: count,
        months: count * (plan === 'yearly' ? 12 : 1),
        amount: amount,
        ref: v('fx_dr'),
        receipt: IMG.receipt || '',
        status: 'pending',
        by: 'member',
        date: fxToday(),
        at: serverTimestamp()
      });

      IMG.receipt = '';
      await reload();
      say('Payment reported. An admin will confirm it soon.');
    } catch (e) {
      say(e.message);
    }
  }

  // --- Admin: add a "Dues" card to the Admin page and open the Dues section
  const DUES_KNOWN_TABS = [
    'members', 'villages', 'council', 'donations', 'news',
    'projects', 'logo', 'donate', 'settings', 'fxdues'
  ];
  const _adminDues = window.admin;

  window.admin = function () {
    if (!isAdmin()) {
      return _adminDues();
    }

    if (S.tab === 'fxdues') {
      return fxAdminDues();
    }

    let h = _adminDues();

    // The Admin menu is shown for any tab that is not a section
    if (DUES_KNOWN_TABS.indexOf(S.tab) < 0) {
      const tile =
        '<div class="card tile" onclick="S.tab=\'fxdues\';render();window.scrollTo(0,0)">' +
        '<div class="ic">\uD83D\uDCB3</div>' +
        '<h3>Dues</h3>' +
        '<div class="mute">Amounts, payments and who owes</div>' +
        '</div>';
      const i = h.lastIndexOf('</div>');

      h = h.slice(0, i) + tile + h.slice(i);
    }

    return h;
  };

  // Payments that belong to one member
  function fxPaymentsOf(m) {
    return S.fxAll.filter(function (p) {
      return p.mid === m._id;
    });
  }

  // Members that should pay dues (everyone except revoked members)
  function fxPayingMembers() {
    return S.mem.filter(function (m) {
      return m.status !== 'revoked';
    });
  }

  function fxAdminDues() {
    const cfg = S.duesCfg || {};
    const members = fxPayingMembers();
    const pending = S.fxAll.filter(function (p) {
      return p.status === 'pending';
    });
    const confirmedTotal = S.fxAll.reduce(function (sum, p) {
      return p.status === 'confirmed' ? sum + (Number(p.amount) || 0) : sum;
    }, 0);
    let paidUp = 0;
    let owing = 0;

    members.forEach(function (m) {
      const st = fxDuesStatus(m, fxPaymentsOf(m));

      if (st.active && st.owing === 0) {
        paidUp += 1;
      } else if (st.active) {
        owing += 1;
      }
    });

    const parts = [];

    parts.push('<div class="row"><button onclick="S.tab=\'dash\';render()">\u2190 Back to Admin</button></div>');
    parts.push('<h2>Dues</h2>');
    parts.push('<div class="grid">');
    parts.push(fxStatCard('Paid up', paidUp));
    parts.push(fxStatCard('Owing', owing));
    parts.push(fxStatCard('Pending payments', pending.length));
    parts.push(fxStatCard('Confirmed total', naira(confirmedTotal)));
    parts.push('</div>');

    parts.push('<div class="card" style="margin-top:14px">');
    parts.push('<h3>Dues settings</h3>');
    parts.push('<label>Monthly amount (\u20a6)</label>');
    parts.push('<input id="fxc_m" type="number" value="' + esc(cfg.monthly || '') + '">');
    parts.push('<label>Yearly amount (\u20a6)</label>');
    parts.push('<input id="fxc_y" type="number" value="' + esc(cfg.yearly || '') + '">');
    parts.push('<label>Dues start from (month)</label>');
    parts.push('<input id="fxc_s" type="month" value="' + esc(cfg.startMonth || '') + '">');
    parts.push('<button class="p" onclick="fxSaveDuesCfg()">Save settings</button>');
    parts.push('</div>');

    parts.push('<div class="card" style="margin-top:14px">');
    parts.push('<h3>Record a payment</h3>');
    parts.push('<label>Member ID</label>');
    parts.push('<input id="fx_rid" placeholder="e.g. UCA-0002" autocapitalize="characters">');
    parts.push('<label>Number of months (or years, for a yearly member)</label>');
    parts.push('<input id="fx_rn" type="number" min="1" value="1">');
    parts.push('<label>Amount received (\u20a6)</label>');
    parts.push('<input id="fx_ra" type="number">');
    parts.push('<label>Reference or note</label>');
    parts.push('<input id="fx_rr">');
    parts.push('<button class="p" onclick="fxAdminRecord()">Record payment</button>');
    parts.push('</div>');

    parts.push('<h2>Pending payments</h2>');
    parts.push('<div class="grid">');
    parts.push(fxPendingHtml(pending));
    parts.push('</div>');

    parts.push('<h2>Members</h2>');
    parts.push('<input placeholder="Search name or ID" value="' + esc(S.fxF.q) + '" oninput="S.fxF.q=this.value;fxRefreshList()">');
    parts.push('<select onchange="S.fxF.v=this.value;fxRefreshList()">');
    parts.push('<option value="">All villages/towns</option>');
    parts.push(fxVillageOptions());
    parts.push('</select>');
    parts.push('<select onchange="S.fxF.s=this.value;fxRefreshList()">');
    parts.push('<option value="">All statuses</option>');
    parts.push('<option value="owing"' + (S.fxF.s === 'owing' ? ' selected' : '') + '>Owing</option>');
    parts.push('<option value="paid"' + (S.fxF.s === 'paid' ? ' selected' : '') + '>Paid up</option>');
    parts.push('</select>');
    parts.push('<div class="grid" id="fx_list">' + fxMemberListHtml() + '</div>');

    return parts.join('');
  }

  function fxStatCard(label, value) {
    return '<div class="card"><div class="mute">' + label + '</div><div class="big">' + value + '</div></div>';
  }

  function fxVillageOptions() {
    return S.vil.map(function (x) {
      const selected = S.fxF.v === x.name ? ' selected' : '';

      return '<option' + selected + '>' + esc(x.name) + '</option>';
    }).join('');
  }

  // Pending payments with Confirm and Reject buttons
  function fxPendingHtml(pending) {
    if (!pending.length) {
      return '<div class="card mute">Nothing waiting for confirmation.</div>';
    }

    return pending.map(function (p) {
      return '<div class="card">' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<div class="mute">' + esc(p.memberId) + ' \u00b7 ' + esc(p.village) + '</div>' +
        '<div class="big">' + naira(p.amount) + '</div>' +
        '<div>' + esc(p.count) + ' ' + (p.plan === 'yearly' ? 'year' : 'month') + (Number(p.count) === 1 ? '' : 's') + '</div>' +
        '<div class="mute">' + esc(p.date) + (p.ref ? ' \u00b7 ' + esc(p.ref) : '') + '</div>' +
        (p.receipt ? '<img class="thumb" src="' + esc(p.receipt) + '" alt="Receipt">' : '') +
        '<div class="row">' +
        '<button class="p" onclick="fxReview(\'' + p._id + '\',\'confirmed\')">Confirm</button>' +
        '<button class="d" onclick="fxReview(\'' + p._id + '\',\'rejected\')">Reject</button>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  // Member cards with status, filtered by the search box and the two dropdowns
  function fxMemberListHtml() {
    const f = S.fxF;
    const q = String(f.q || '').toLowerCase();
    const cards = [];

    fxPayingMembers().forEach(function (m) {
      const st = fxDuesStatus(m, fxPaymentsOf(m));
      const isOwing = st.active && st.owing > 0;
      const isPaid = st.active && st.owing === 0;

      if (f.v && m.village !== f.v) {
        return;
      }

      if (q && (m.name + ' ' + m.id).toLowerCase().indexOf(q) < 0) {
        return;
      }

      if (f.s === 'owing' && !isOwing) {
        return;
      }

      if (f.s === 'paid' && !isPaid) {
        return;
      }

      const wa = isOwing ? fxWaLink(m, st) : '';
      let card = '<div class="card">';

      card += '<h3>' + esc(m.name) + '</h3>';
      card += '<div class="mute">' + esc(m.id) + ' \u00b7 ' + esc(m.village || '') + '</div>';
      card += fxStatusHtml(st);
      card += '<div class="mute">' + (st.plan === 'yearly' ? 'Yearly' : 'Monthly') + ' plan</div>';
      card += '<div class="row">';
      card += '<button onclick="fxAdminPlan(\'' + m._id + '\')">Switch plan</button>';

      if (wa) {
        card += '<a class="btn" href="' + esc(wa) + '" target="_blank" rel="noopener">Remind on WhatsApp</a>';
      }

      card += '</div></div>';
      cards.push(card);
    });

    return cards.join('') || '<div class="card mute">No members found.</div>';
  }

  function fxRefreshList() {
    const box = $('fx_list');

    if (box) {
      box.innerHTML = fxMemberListHtml();
    }
  }

  // --- Admin actions: save amounts, record a payment, confirm or reject, switch plan
  async function fxSaveDuesCfg() {
    try {
      await setDoc(
        doc(db, 'settings', 'dues'),
        {
          monthly: Number(v('fxc_m')) || 0,
          yearly: Number(v('fxc_y')) || 0,
          startMonth: v('fxc_s')
        },
        { merge: true }
      );
      await reload();
      say('Dues settings saved.');
    } catch (e) {
      say(e.message);
    }
  }

  async function fxAdminRecord() {
    const id = v('fx_rid').toUpperCase();
    const m = S.mem.filter(function (x) {
      return String(x.id).toUpperCase() === id;
    })[0];

    if (!m) {
      return say('No member with that ID.');
    }

    const plan = fxPlanOf(m);
    const count = parseInt(v('fx_rn'), 10);
    const amount = Number(v('fx_ra'));

    if (!(count >= 1) || !(amount > 0)) {
      return say('Enter the number of months or years and the amount.');
    }

    try {
      await addDoc(collection(db, 'dues'), {
        uid: m.uid || m._id,
        mid: m._id,
        memberId: m.id,
        name: m.name,
        village: m.village || '',
        plan: plan,
        count: count,
        months: count * (plan === 'yearly' ? 12 : 1),
        amount: amount,
        ref: v('fx_rr'),
        receipt: '',
        status: 'confirmed',
        by: 'admin',
        date: fxToday(),
        at: serverTimestamp()
      });
      await reload();
      say('Payment recorded for ' + m.id + '.');
    } catch (e) {
      say(e.message);
    }
  }

  async function fxReview(id, status) {
    try {
      await updateDoc(doc(db, 'dues', id), { status: status });
      await reload();
    } catch (e) {
      say(e.message);
    }
  }

  async function fxAdminPlan(memberDocId) {
    const m = S.mem.filter(function (x) {
      return x._id === memberDocId;
    })[0];

    if (!m) {
      return;
    }

    try {
      await updateDoc(doc(db, 'members', memberDocId), {
        duesPlan: fxPlanOf(m) === 'yearly' ? 'monthly' : 'yearly'
      });
      await reload();
    } catch (e) {
      say(e.message);
    }
  }

  // --- Make the new functions available to the buttons and give them a "working" label
  Object.assign(window, {
    fxSetPlan: fxSetPlan,
    fxDuesCalc: fxDuesCalc,
    fxPayDues: fxPayDues,
    fxSaveDuesCfg: fxSaveDuesCfg,
    fxAdminRecord: fxAdminRecord,
    fxReview: fxReview,
    fxAdminPlan: fxAdminPlan,
    fxRefreshList: fxRefreshList
  });

  [
    ['fxSetPlan', 'Saving...'],
    ['fxPayDues', 'Sending...'],
    ['fxSaveDuesCfg', 'Saving...'],
    ['fxAdminRecord', 'Recording...'],
    ['fxReview', 'Updating...'],
    ['fxAdminPlan', 'Saving...']
  ].forEach(function (pair) {
    window[pair[0]] = busyWrap(window[pair[0]], pair[1]);
  });


  // ------------------------------------------------------------
  // COUNCIL: KINGDOM LABEL (paste above the "SECTION: Hook-up and start" part)
  // What it does: shows "Kingdom of Uzairue" under each village
  // heading on the Council page. The label is fixed text, not
  // saved in the database. Only villages that have council
  // members are shown, as before.
  // ------------------------------------------------------------

  const KINGDOM_LABEL = 'Kingdom of Uzairue';

  // Keeps the original Council page and adds the label after each village heading
  const _councilPage = window.council;

  window.council = function () {
    let html = _councilPage();

    S.vil.forEach(function (vl) {
      const heading = '<h2>' + esc(vl.name) + '</h2>';
      const labelled = heading + '<div class="mute">' + KINGDOM_LABEL + '</div>';

      html = html.split(heading).join(labelled);
    });

    return html;
  };

  

  // ------------------------------------------------------------
  // CLAIM: ADMIN-REGISTERED MEMBERS LOG IN
  // (paste above the "SECTION: Hook-up and start" part)
  // What it does:
  //   1. When an admin registers a member with an email, a claim is saved
  //      under that email (in lower case).
  //   2. The person signs up with the same email and verifies it by link.
  //   3. Once verified, their new login record takes over the admin's
  //      record: same ID, name, village, address, phone, photo, dues plan
  //      and join date. The admin's record is marked as claimed and hidden
  //      from the admin member list.
  //   4. Admins see a "Member logins" panel on the Members page. It shows
  //      "Enable login" for older records, "Waiting" or "Linked", and a
  //      "Move dues to login" button for payments made before the claim.
  // Needs the Firebase rules for: members (read and claim), and claims.
  // ------------------------------------------------------------

  // --- Fields copied from the admin's record to the member's login record
  const CLAIM_FIELDS = [
    'name', 'id', 'village', 'address', 'house', 'phone', 'email',
    'img', 'occupation', 'dob', 'duesPlan', 'createdAt'
  ];

  S.fxClaims = S.fxClaims || {};

  // --- Lower-case email, used as the claim key
  function fxEmailKey(e) {
    return String(e || '').trim().toLowerCase();
  }

  // --- Admin: load claims, and hide records that a member has taken over
  const _loadAdminClaim = window.loadAdmin;

  window.loadAdmin = async function () {
    await _loadAdminClaim();

    S.fxClaims = {};
    (await list('claims')).forEach(function (c) {
      S.fxClaims[c._id] = c;
    });

    S.mem = S.mem.filter(function (m) {
      return !m.claimedBy;
    });
  };

  // --- Save a claim for one admin-made member record
  async function fxMakeClaim(m) {
    const key = fxEmailKey(m.email);

    if (!key) {
      return;
    }

    if (m.email !== key) {
      await updateDoc(doc(db, 'members', m._id), { email: key });
    }

    await setDoc(doc(db, 'claims', key), {
      memberDocId: m._id,
      memberId: m.id,
      name: m.name || '',
      claimed: false
    });
  }

  // --- Admin: after a new member is registered with an email, save their claim
  const _submitClaim = window.submitMember;

  window.submitMember = async function () {
    const editing = S.editId;
    const email = fxEmailKey(v('ae'));

    await _submitClaim();

    if (editing || !email || !/^Registered/.test(S.msg || '')) {
      return;
    }

    if (S.fxClaims[email]) {
      return;
    }

    const newest = S.mem
      .filter(function (m) {
        return fxEmailKey(m.email) === email && !m.claimedBy;
      })
      .sort(function (a, b) {
        return parseInt(String(b.id).slice(4), 10) - parseInt(String(a.id).slice(4), 10);
      })[0];

    if (newest) {
      try {
        await fxMakeClaim(newest);
        await reload();
      } catch (e) {
        say(e.message);
      }
    }
  };

  // --- Admin: "Enable login" for an older record that has no claim yet
  async function fxEnableLogin(docId) {
    const m = S.mem.filter(function (x) {
      return x._id === docId;
    })[0];

    if (!m || !fxEmailKey(m.email)) {
      return say('This member has no email, so they cannot log in.');
    }

    if (S.fxClaims[fxEmailKey(m.email)]) {
      return say('Login is already enabled for this email.');
    }

    try {
      await fxMakeClaim(m);
      await reload();
      say('Login enabled. Ask ' + m.name + ' to sign up with ' + fxEmailKey(m.email) + '.');
    } catch (e) {
      say(e.message);
    }
  }

  // --- Admin: move payments recorded on the old record to the member's login
  async function fxMoveDues(docId) {
    const m = S.mem.filter(function (x) {
      return x._id === docId;
    })[0];

    if (!m || !m.legacyDocId) {
      return;
    }

    const rows = (S.fxAll || []).filter(function (p) {
      return p.mid === m.legacyDocId;
    });

    try {
      for (const p of rows) {
        await updateDoc(doc(db, 'dues', p._id), { mid: m._id, uid: m._id });
      }

      await reload();
      say('Moved ' + rows.length + ' payment(s) to the login.');
    } catch (e) {
      say(e.message);
    }
  }

  // --- Member: when verified, take over the admin's record if a claim exists
  async function fxClaimLogin() {
    if (!cfgOk || !S.user || !S.user.emailVerified || !S.me) {
      return;
    }

    if (S.me._id !== S.user.uid) {
      return;
    }

    const key = fxEmailKey(S.user.email);

    if (!key) {
      return;
    }

    try {
      const c = await getDoc(doc(db, 'claims', key));

      if (!c.exists() || c.data().claimed) {
        return;
      }

      const claim = c.data();
      const oldRef = doc(db, 'members', claim.memberDocId);
      const o = await getDoc(oldRef);

      if (!o.exists() || o.data().claimedBy) {
        return;
      }

      const old = o.data();
      const fields = {};

      CLAIM_FIELDS.forEach(function (k) {
        if (old[k] !== undefined) {
          fields[k] = old[k];
        }
      });

      fields.id = claim.memberId;
      fields.email = key;
      fields.legacyDocId = claim.memberDocId;

      await updateDoc(doc(db, 'members', S.user.uid), fields);
      await updateDoc(oldRef, { claimedBy: S.user.uid });
      await updateDoc(doc(db, 'claims', key), { claimed: true, claimedUid: S.user.uid });

      const n = await getDoc(doc(db, 'members', S.user.uid));

      S.me = Object.assign({ _id: S.user.uid }, n.data());
      await fxLoadMine();
      S.msg = 'Your account is linked to ' + claim.memberId + '. Welcome!';
    } catch (e) {
      S.msg = 'We could not link your account yet. Please tell the admin.';
    }
  }

  // --- Run the claim check every time the public data loads
  const _loadPubClaim = window.loadPub;

  window.loadPub = async function () {
    await _loadPubClaim();
    await fxClaimLogin();
  };

  // --- Admin Members page: the "Member logins" panel above the directory
  function fxLoginPanelHtml() {
    const rows = [];

    S.mem.forEach(function (m) {
      if (m.legacyDocId) {
        const moveBtn = S.fxAll.some(function (p) { return p.mid === m.legacyDocId; })
          ? '<button onclick="fxMoveDues(\'' + m._id + '\')">Move dues to login</button>'
          : '';

        rows.push(
          '<div class="card"><h3>' + esc(m.name) + '</h3>'
          + '<div class="mute">' + esc(m.id) + ' · Linked to login</div>'
          + '<div class="row">' + moveBtn + '</div></div>'
        );
      } else if (m.byAdmin && fxEmailKey(m.email)) {
        const c = S.fxClaims[fxEmailKey(m.email)];
        const status = c ? 'Waiting for sign-up with ' + esc(fxEmailKey(m.email)) : 'No login yet';
        const btn = c ? '' : '<button class="p" onclick="fxEnableLogin(\'' + m._id + '\')">Enable login</button>';

        rows.push(
          '<div class="card"><h3>' + esc(m.name) + '</h3>'
          + '<div class="mute">' + esc(m.id) + ' · ' + status + '</div>'
          + '<div class="row">' + btn + '</div></div>'
        );
      }
    });

    return '<h2>Member logins</h2><div class="grid">'
      + (rows.join('') || '<div class="card mute">No member logins to show.</div>')
      + '</div>';
  }

  const _adminClaim = window.admin;

  window.admin = function () {
    const h = _adminClaim();

    if (!isAdmin() || S.tab !== 'members') {
      return h;
    }

    return h.replace('<h2>Directory</h2>', fxLoginPanelHtml() + '<h2>Directory</h2>');
  };

  Object.assign(window, { fxEnableLogin: fxEnableLogin, fxMoveDues: fxMoveDues });

  [['fxEnableLogin', 'Enabling...'], ['fxMoveDues', 'Moving...']].forEach(function (pair) {
    window[pair[0]] = busyWrap(window[pair[0]], pair[1]);
  });


    // ------------------------------------------------------------
  // DUPLICATE EMAIL GUARD
  // (paste above the "SECTION: Hook-up and start" part, after the claim block)
  // What it does:
  //   1. Blocks registering a new member when another record already
  //      uses that email (or a login is already linked to it).
  //   2. Blocks "Enable login" when another record uses the same email.
  //   3. Shows a red "Duplicate emails" warning on the Members page,
  //      listing each duplicate pair so you can fix it.
  // Existing duplicates are not deleted. Fix them by removing one record
  // or changing its email.
  // ------------------------------------------------------------

  // --- Finds another active record that uses this email
  function fxOtherWithEmail(email, exceptId) {
    const key = fxEmailKey(email);

    if (!key) {
      return null;
    }

    return S.mem.filter(function (m) {
      return fxEmailKey(m.email) === key && m._id !== exceptId && !m.claimedBy;
    })[0] || null;
  }

  // --- Block a new registration that reuses an email
  const _submitGuard = window.submitMember;

  window.submitMember = async function () {
    const email = fxEmailKey(v('ae'));
    const editing = S.editId;

    if (!editing && email) {
      const other = fxOtherWithEmail(email, '');

      if (other) {
        return say('That email already belongs to ' + other.id + ' (' + other.name + '). Use that ID to edit them, or use a different email.');
      }

      if (S.fxClaims[email]) {
        return say('That email already has a login linked to ' + S.fxClaims[email].memberId + '.');
      }
    }

    return _submitGuard();
  };

  // --- Block "Enable login" when the email is shared with another record
  const _enableGuard = window.fxEnableLogin;

  window.fxEnableLogin = async function (docId) {
    const m = S.mem.filter(function (x) {
      return x._id === docId;
    })[0];

    if (m) {
      const other = fxOtherWithEmail(m.email, m._id);

      if (other) {
        return say('Another record uses this email (' + other.id + '). Fix the duplicate before enabling login.');
      }
    }

    return _enableGuard(docId);
  };

  // --- Show a warning on the Members page for any duplicate emails
  const _adminGuard = window.admin;

  window.admin = function () {
    const h = _adminGuard();

    if (!isAdmin() || S.tab !== 'members') {
      return h;
    }

    const seen = {};
    const dups = [];

    S.mem.forEach(function (m) {
      const k = fxEmailKey(m.email);

      if (!k || m.claimedBy) {
        return;
      }

      if (seen[k]) {
        dups.push(seen[k].id + ' and ' + m.id + ' (' + k + ')');
      } else {
        seen[k] = m;
      }
    });

    if (!dups.length) {
      return h;
    }

    const warning =
      '<div class="card" style="border-color:var(--bad)"><h3>Duplicate emails</h3>'
      + dups.map(function (d) { return '<div class="mute">' + esc(d) + '</div>'; }).join('')
      + '</div>';

    return h.replace('<h2>Member logins</h2>', warning + '<h2>Member logins</h2>');
  };

      // ------------------------------------------------------------
  // AUTO CLEANUP OF CLAIMED RECORDS
  // (paste above the "SECTION: Hook-up and start" part, after the duplicate guard)
  // What it does: each time an admin loads the app, for every member
  //   who has claimed their admin-made record:
  //   1. Moves any dues payments from the old record to the member's login.
  //   2. Deletes the old record, but only after step 1 succeeds.
  // It only touches records that are marked as claimed by that exact
  // login, so unclaimed records are never removed.
  // The claim record is kept, so the same person cannot claim again.
  // ------------------------------------------------------------

  // --- Admin: after the normal load, tidy up claimed records
  const _loadAdminCleanup = window.loadAdmin;

  window.loadAdmin = async function () {
    await _loadAdminCleanup();
    await fxAutoCleanup();
  };

  // --- Move payments and delete the old record for each claimed member
  async function fxAutoCleanup() {
    if (!cfgOk || !isAdmin()) {
      return;
    }

    let all = [];
    let dues = [];

    try {
      all = await list('members');
      dues = await list('dues');
    } catch (e) {
      return;
    }

    const byId = {};

    all.forEach(function (m) {
      byId[m._id] = m;
    });

    const linked = all.filter(function (n) {
      const old = n.legacyDocId ? byId[n.legacyDocId] : null;

      return !!old && old.claimedBy === n._id;
    });

    for (const n of linked) {
      const oldId = n.legacyDocId;

      try {
        const rows = dues.filter(function (p) {
          return p.mid === oldId;
        });

        for (const p of rows) {
          await updateDoc(doc(db, 'dues', p._id), { mid: n._id, uid: n._id });
        }

        await deleteDoc(doc(db, 'members', oldId));
      } catch (e) {
        // Leave the old record in place if anything fails, so nothing is lost
      }
    }
  }



  // ------------------------------------------------------------
  // GIFTS: BANK DETAILS AND MEMBER LIST
  // (paste above the "SECTION: Hook-up and start" part, after the auto cleanup block)
  // What it does:
  //   1. Members add their bank account on their profile, with a switch
  //      "Show my account to other members" (off by default).
  //   2. A member list (directory) holds each member's name, ID, village
  //      and photo, and the account only when the switch is on.
  //   3. The "Members" page, for logged-in members, lists everyone.
  //      Gift opens the account with a Copy button.
  //   4. Admins can add bank details for members who can't log in, and
  //      refresh the list from the "Accounts & gifts" section. The list
  //      also refreshes when an admin saves a member.
  // Needs the Firebase rules for "directory" (see firestore.rules).
  // ------------------------------------------------------------

  S.fxDir = S.fxDir || [];

  // --- Small style for the on/off switch
  const giftStyle = document.createElement('style');

  giftStyle.textContent = '.fxSwitch{display:flex;gap:8px;align-items:center}.fxSwitch input{width:auto}';
  document.head.appendChild(giftStyle);

  // --- Writes one member's entry in the list. The account is included only when switched on.
  async function fxWriteDirectory(m) {
    if (!m || !m.id) {
      return;
    }

    const entry = {
      memberId: m.id,
      name: m.name || '',
      village: m.village || '',
      img: m.img || '',
      showAcct: !!(m.showAcct && m.acct)
    };

    if (entry.showAcct) {
      entry.bank = m.bank || '';
      entry.acct = m.acct;
      entry.acctName = m.acctName || '';
    }

    await setDoc(doc(db, 'directory', m.id), entry);
  }

  // --- Loads the member list for verified members
  async function fxLoadDirectory() {
    S.fxDir = [];

    if (!cfgOk || !S.user || !S.user.emailVerified) {
      return;
    }

    try {
      S.fxDir = (await list('directory')).sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name));
      });
    } catch (e) {
      S.fxDir = [];
    }
  }

  const _loadPubGifts = window.loadPub;

  window.loadPub = async function () {
    await _loadPubGifts();
    await fxLoadDirectory();
  };

  // --- Member: save their own bank details and update their list entry
  async function fxSaveGift() {
    const m = S.me;

    if (!m) {
      return;
    }

    const box = document.getElementById('fxg_show');
    const next = {
      bank: v('fxg_bank'),
      acct: v('fxg_acct'),
      acctName: v('fxg_name'),
      showAcct: !!(box && box.checked)
    };

    if (next.showAcct && !next.acct) {
      return say('Add your account number before showing it to others.');
    }

    try {
      await updateDoc(doc(db, 'members', m._id), next);
      S.me = Object.assign({}, m, next);
      await fxWriteDirectory(S.me);
      await fxLoadDirectory();
      say('Bank details saved.');
    } catch (e) {
      say(e.message);
    }
  }

  // --- Profile: the bank card for the member's own profile
  function fxGiftCardHtml(m) {
    return '<div class="card" style="margin-top:14px">'
      + '<h3>Bank account for gifts</h3>'
      + '<p class="mute">Used when other members want to gift you. Turn on the switch to show it to them.</p>'
      + '<label>Bank name</label><input id="fxg_bank" value="' + esc(m.bank || '') + '">'
      + '<label>Account number</label><input id="fxg_acct" inputmode="numeric" value="' + esc(m.acct || '') + '">'
      + '<label>Account name</label><input id="fxg_name" value="' + esc(m.acctName || '') + '">'
      + '<label class="fxSwitch"><input id="fxg_show" type="checkbox"' + (m.showAcct ? ' checked' : '') + '> Show my account to other members</label>'
      + '<button class="p" onclick="fxSaveGift()">Save bank details</button>'
      + '</div>';
  }

  // --- Members page: everyone in the list, with Gift where an account is shared
  function fxMembersPageHtml() {
    if (!S.user || !S.user.emailVerified) {
      return '<div class="card">Verify your email to see members.</div>';
    }

    const me = S.me ? S.me.id : '';
    const cards = S.fxDir.map(function (d) {
      const pic = d.img
        ? '<img class="av" src="' + esc(d.img) + '" alt="">'
        : '<div class="av">' + esc(String(d.name || '?').charAt(0).toUpperCase()) + '</div>';
      const who = d.memberId === me ? ' (you)' : '';
      const btn = d.showAcct
        ? '<button class="p" onclick="fxGiftOpen(\'' + esc(d.memberId) + '\')">Gift</button>'
        : '<span class="mute">No account shared</span>';

      return '<div class="card mem">' + pic
        + '<h3>' + esc(d.name) + esc(who) + '</h3>'
        + '<div class="mute">' + esc(d.memberId) + ' · ' + esc(d.village || '') + '</div>'
        + '<div class="row" style="justify-content:center">' + btn + '</div>'
        + '</div>';
    }).join('');

    return '<h2>Members</h2>'
      + '<p class="mute">Everyone in the community. Members who share their account can receive gifts from you.</p>'
      + '<div class="grid">' + (cards || '<div class="card mute">No members yet.</div>') + '</div>';
  }

  // --- Gift: opens the member's account with a Copy button
  function fxGiftOpen(memberId) {
    const d = S.fxDir.filter(function (x) {
      return x.memberId === memberId;
    })[0];

    if (!d || !d.showAcct) {
      return say('This member has not shared an account.');
    }

    fxCloseDonate();

    const box = document.createElement('div');

    box.className = 'modal';
    box.id = 'donModal';
    box.onclick = function (e) {
      if (e.target === box) {
        fxCloseDonate();
      }
    };
    box.innerHTML = '<div class="card"><h3>Gift to ' + esc(d.name) + '</h3>'
      + '<p class="mute">Send your gift to this account from your bank app.</p>'
      + acctHtml({ bank: d.bank, acct: d.acct, name: d.acctName })
      + '<div class="row"><button onclick="fxCloseDonate()">Close</button></div></div>';
    document.body.appendChild(box);
  }

  // --- Render: Members page, and the bank card on the member's own profile
  const _renderGifts = window.render;

  window.render = function () {
    if (S.ready && S.view === 'memberlist' && (!S.user || !S.user.emailVerified)) {
      S.view = S.user ? 'verify' : 'home';
    }

    _renderGifts();

    const app = $('app');

    if (!app) {
      return;
    }

    if (S.view === 'me' && !S.card && S.me) {
      app.insertAdjacentHTML('beforeend', fxGiftCardHtml(S.me));
    }

    if (S.view === 'memberlist') {
      app.innerHTML = fxMembersPageHtml();
    }
  };

  // --- Menu: "Members" for verified members
  const _navGifts = window.nav;

  window.nav = function () {
    _navGifts();

    const nav = document.getElementById('nav');

    if (!nav || !S.user || !S.user.emailVerified) {
      return;
    }

    const btn = document.createElement('button');

    btn.textContent = 'Members';
    btn.setAttribute('onclick', "go('memberlist')");

    if (S.view === 'memberlist') {
      btn.classList.add('on');
    }

    const out = Array.prototype.slice.call(nav.children).filter(function (b) {
      return (b.getAttribute('onclick') || '').indexOf('out()') >= 0;
    })[0];

    if (out) {
      nav.insertBefore(btn, out);
    } else {
      nav.appendChild(btn);
    }
  };

  // --- Admin: list entries for every active member, and remove revoked members
  async function fxSyncDirectory() {
    for (const m of S.mem) {
      if (m.status === 'revoked') {
        await deleteDoc(doc(db, 'directory', m.id));
      } else {
        await fxWriteDirectory(m);
      }
    }

    await fxLoadDirectory();
  }

  async function fxRefreshDirectory() {
    try {
      await fxSyncDirectory();
      say('Member list refreshed.');
    } catch (e) {
      say(e.message);
    }
  }

  // --- Admin: after a member is saved, refresh the list too
  const _subGifts = window.submitMember;

  window.submitMember = async function () {
    await _subGifts();

    if (isAdmin() && /^(Saved|Registered)/.test(S.msg || '')) {
      try {
        await fxSyncDirectory();
      } catch (e) {
        // The list can still be refreshed with the button
      }
    }
  };

  // --- Admin: bank details for a member by ID
  async function fxAdminBank() {
    const id = v('fxa_id').toUpperCase();
    const m = S.mem.filter(function (x) {
      return String(x.id).toUpperCase() === id;
    })[0];

    if (!m) {
      return say('No member with that ID.');
    }

    const box = document.getElementById('fxa_show');
    const next = {
      bank: v('fxa_bank'),
      acct: v('fxa_acct'),
      acctName: v('fxa_name'),
      showAcct: !!(box && box.checked)
    };

    if (next.showAcct && !next.acct) {
      return say('Add the account number before showing it to others.');
    }

    try {
      await updateDoc(doc(db, 'members', m._id), next);
      await fxWriteDirectory(Object.assign({}, m, next));
      await reload();
      say('Bank details saved for ' + m.id + '.');
    } catch (e) {
      say(e.message);
    }
  }

  // --- Admin: "Accounts & gifts" tile and page
  const _adminGifts = window.admin;

  window.admin = function () {
    if (isAdmin() && S.tab === 'fxgifts') {
      return fxGiftsAdmin();
    }

    let h = _adminGifts();

    if (isAdmin() && S.tab === 'dash') {
      const tile = '<div class="card tile" onclick="S.tab=\'fxgifts\';render();window.scrollTo(0,0)">'
        + '<div class="ic">🎁</div>'
        + '<h3>Accounts &amp; gifts</h3>'
        + '<div class="mute">Bank details and the member list</div>'
        + '</div>';
      const i = h.lastIndexOf('</div>');

      h = h.slice(0, i) + tile + h.slice(i);
    }

    return h;
  };

  function fxGiftsAdmin() {
    return '<div class="row"><button onclick="S.tab=\'dash\';render()">← Back to Admin</button></div>'
      + '<h2>Accounts &amp; gifts</h2>'
      + '<div class="card"><h3>Bank details for a member</h3>'
      + '<p class="mute">Use this for members who cannot log in.</p>'
      + '<label>Member ID</label><input id="fxa_id" placeholder="e.g. UCA-0002" autocapitalize="characters">'
      + '<label>Bank name</label><input id="fxa_bank">'
      + '<label>Account number</label><input id="fxa_acct" inputmode="numeric">'
      + '<label>Account name</label><input id="fxa_name">'
      + '<label class="fxSwitch"><input id="fxa_show" type="checkbox"> Show this account to other members</label>'
      + '<button class="p" onclick="fxAdminBank()">Save bank details</button>'
      + '</div>'
      + '<div class="card" style="margin-top:14px"><h3>Member list</h3>'
      + '<p class="mute">Rebuilds the list members see. It also refreshes each time you save a member.</p>'
      + '<button onclick="fxRefreshDirectory()">Refresh member list</button>'
      + '</div>';
  }

  Object.assign(window, {
    fxSaveGift: fxSaveGift,
    fxGiftOpen: fxGiftOpen,
    fxAdminBank: fxAdminBank,
    fxRefreshDirectory: fxRefreshDirectory
  });

  [
    ['fxSaveGift', 'Saving...'],
    ['fxAdminBank', 'Saving...'],
    ['fxRefreshDirectory', 'Refreshing...']
  ].forEach(function (pair) {
    window[pair[0]] = busyWrap(window[pair[0]], pair[1]);
  });


  
  // ------------------------------------------------------------
  // SECTION: Hook-up and start
  // What it does: makes the new functions available to the buttons, gives
  // the saving buttons their "Saving..." status, then refreshes the page
  // so the new versions take effect straight away.
  // ------------------------------------------------------------
  Object.assign(window, { fxPick: fxPick, fxAddNews: fxAddNews, fxAddProject: fxAddProject, fxEditAcct: fxEditAcct, fxSaveLogo: fxSaveLogo, fxSaveDonate: fxSaveDonate, fxDonate: fxDonate, fxCloseDonate: fxCloseDonate, fxCopy: fxCopy, fxScan: fxScan, fxSaveAbout: fxSaveAbout });
  [['fxAddNews', 'Publishing...'], ['fxAddProject', 'Creating...'], ['fxSaveLogo', 'Saving...'], ['fxSaveDonate', 'Saving...'], ['fxEditAcct', 'Saving...'], ['fxSaveAbout', 'Saving...']].forEach(function (a) { window[a[0]] = busyWrap(window[a[0]], a[1]); });
  if (S.ready) reload();
})();
