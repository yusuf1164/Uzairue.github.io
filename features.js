// ============================================================
// FILE: features.js  (load it AFTER app.js)
// What it does: adds the new features WITHOUT editing the existing files.
// ============================================================
(function () {
  'use strict';

  // ------------------------------------------------------------
  // SECTION: Extra styles
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
    '.toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:var(--acc);color:var(--accink);padding:10px 16px;border-radius:99px;z-index:60;font-weight:600}' +
    // FIX: Make all cards in a grid equal height and align buttons to the bottom
    '.grid > .card{height:100%;display:flex;flex-direction:column}' +
    '.grid > .card .row:last-child{margin-top:auto}';
  document.head.appendChild(st);

  // ------------------------------------------------------------
  // SECTION: Library loader
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
  // ------------------------------------------------------------
  const imgOk = function (u) { return /^(https?:\/\/|data:image\/)/i.test(u || '') ? u : ''; };
  function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1600); }
  function fxCopy(t) {
    const fb = function () { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); toast('Account number copied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Account number copied'); }, fb); else fb();
  }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); x.fill(); }

  // ------------------------------------------------------------
  // SECTION: Site settings
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
  // SECTION: Home page
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
  // SECTION: Admin: News
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
  // SECTION: Admin: Projects
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
  // SECTION: ID card
  // ------------------------------------------------------------
  window.drawCard = async function (m, id) {
    const c = $(id); if (!c) return;
    try { await lib(QR_URL); } catch (e) {}
    const W = 1050, H = 600; c.width = W; c.height = H;
    const x = c.getContext('2d');
    const load = function (src) { return new Promise(function (r) { if (!src) return r(null); const i = new Image(); i.onload = function () { r(i); }; i.onerror = function () { r(null); }; i.src = src; }); };
    const imgs = await Promise.all([load((S.site || {}).logo), load(m.img)]), logo = imgs[0], photo = imgs[1];
    const LIME = '#7ddc1f', PALE = '#c8f06a';
    let g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0d4a1a'); g.addColorStop(1, '#16802d'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#0b3d17'; x.beginPath(); x.moveTo(0, 0); x.lineTo(590, 0); x.bezierCurveTo(735, 140, 725, 330, 495, H); x.lineTo(0, H); x.closePath(); x.fill();
    g = x.createLinearGradient(0, 0, 560, H); g.addColorStop(0, '#031a08'); g.addColorStop(1, '#06300f'); x.fillStyle = g;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(565, 0); x.bezierCurveTo(705, 140, 695, 330, 470, H); x.lineTo(0, H); x.closePath(); x.fill();
    x.save(); x.globalAlpha = 0.07;
    if (logo) { const k = Math.min(700 / logo.width, 520 / logo.height); x.drawImage(logo, 525 - logo.width * k / 2, 300 - logo.height * k / 2, logo.width * k, logo.height * k); }
    else { x.fillStyle = LIME; x.font = 'bold 150px sans-serif'; x.textAlign = 'center'; x.fillText('UZAIRUE', 525, 330); }
    x.restore();
    x.textAlign = 'left'; x.fillStyle = LIME; x.font = 'bold 38px sans-serif';
    const lines = ['']; String(m.name || '').toUpperCase().split(' ').forEach(function (w) { const t = (lines[lines.length - 1] + ' ' + w).trim(); if (x.measureText(t).width > 340 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; });
    lines.slice(0, 3).forEach(function (l, i) { x.fillText(l, 40, 85 + i * 44); });
    x.fillStyle = PALE; x.font = 'bold 24px sans-serif'; x.fillText(String((titleOf(m) || 'MEMBER')).toUpperCase(), 40, 215);
    x.fillStyle = '#145a22'; x.fillRect(40, 238, 500, 3);
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
    x.save(); x.beginPath(); x.arc(480, 115, 75, 0, Math.PI * 2); x.closePath(); x.clip();
    x.fillStyle = '#16284a'; x.fillRect(405, 40, 150, 150);
    if (photo) x.drawImage(photo, 405, 40, 150, 150); else { x.fillStyle = LIME; x.font = 'bold 70px sans-serif'; x.textAlign = 'center'; x.fillText((m.name || '?').charAt(0).toUpperCase(), 480, 140); x.textAlign = 'left'; }
    x.restore(); x.strokeStyle = LIME; x.lineWidth = 4; x.beginPath(); x.arc(480, 115, 75, 0, Math.PI * 2); x.stroke();
    x.textAlign = 'center';
    if (logo) { const k = Math.min(230 / logo.width, 200 / logo.height); x.drawImage(logo, 840 - logo.width * k / 2, 75, logo.width * k, logo.height * k); }
    else { x.fillStyle = LIME; x.font = 'bold 56px sans-serif'; x.fillText('UZAIRUE', 840, 170); }
    x.fillStyle = LIME; x.font = 'bold 46px sans-serif'; x.fillText('UZAIRUE', 840, 335);
    x.fillStyle = PALE; x.font = 'bold 32px sans-serif'; x.fillText('COMMUNITY CARD', 840, 380);
    if (window.qrcode && m.id) {
      const q = qrcode(0, 'M'); q.addData('UZAIRUE:' + m.id); q.make();
      const n = q.getModuleCount(), box = 190, pad = 14, cs = (box - pad * 2) / n, qx = 745, qy = 395;
      x.fillStyle = '#ffffff'; rr(x, qx, qy, box, box, 14); x.fillStyle = '#000000';
      for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(qx + pad + k * cs, qy + pad + r * cs, cs + 0.6, cs + 0.6);
    }
  };

  // ------------------------------------------------------------
  // SECTION: QR scanner
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

  const _signup = window.doSignup;
  window.doSignup = async function () {
    const occ = v('fx_occ'), dob = v('fx_dob');
    await _signup();
    if (S.user && S.me && S.me._id && (occ || dob)) {
      try { await updateDoc(doc(db, 'members', S.me._id), { occupation: occ, dob: dob }); S.me.occupation = occ; S.me.dob = dob; } catch (e) {}
    }
  };

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
  // ------------------------------------------------------------
  const menuStyle = document.createElement('style');
  menuStyle.textContent =
    '#nav{display:none;position:absolute;top:100%;right:10px;min-width:220px;max-width:calc(100% - 20px);flex-direction:column;gap:6px;margin:0;padding:10px;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.35);z-index:6}' +
    '#nav.fxOpen{display:flex}' +
    '#nav button{width:100%;text-align:left}' +
    '#fxAuth{display:flex;gap:6px;margin-left:auto;order:1}' +
    '#theme{order:2}' +
    '#fxMenuBtn{order:3;font-size:18px;line-height:1;padding:8px 12px}';
  document.head.appendChild(menuStyle);

  function fxMenuParts() {
    const header = document.querySelector('header'); if (!header) return null;
    let authBox = document.getElementById('fxAuth'), menuBtn = document.getElementById('fxMenuBtn');
    if (!authBox) { authBox = document.createElement('div'); authBox.id = 'fxAuth'; header.appendChild(authBox); }
    if (!menuBtn) {
      menuBtn = document.createElement('button'); menuBtn.id = 'fxMenuBtn'; menuBtn.type = 'button';
      menuBtn.setAttribute('aria-label', 'Menu'); menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = '\u2630'; menuBtn.onclick = fxToggleMenu; header.appendChild(menuBtn);
    }
    return { authBox: authBox, menuBtn: menuBtn };
  }
  function fxSetMenu(open) {
    const nav = document.getElementById('nav'), btn = document.getElementById('fxMenuBtn');
    if (!nav || !btn) return;
    nav.classList.toggle('fxOpen', open);
    btn.textContent = open ? '\u2715' : '\u2630';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function fxToggleMenu() { const nav = document.getElementById('nav'); const isOpen = nav && nav.classList.contains('fxOpen'); fxSetMenu(!isOpen); }
  function fxCloseMenu() { fxSetMenu(false); }
  function fxMenuSync() {
    const parts = fxMenuParts(), nav = document.getElementById('nav');
    if (!parts || !nav) return;
    parts.authBox.innerHTML = '';
    Array.prototype.slice.call(nav.children).forEach(function (btn) {
      const click = btn.getAttribute('onclick') || '';
      if (click.indexOf("go('login')") >= 0) parts.authBox.appendChild(btn);
    });
    fxCloseMenu();
  }
  const _nav = window.nav;
  window.nav = function () { _nav(); fxMenuSync(); };
  document.addEventListener('click', function (e) {
    const nav = document.getElementById('nav'), btn = document.getElementById('fxMenuBtn');
    if (!nav || !nav.classList.contains('fxOpen')) return;
    if (btn && btn.contains(e.target)) return;
    if (nav.contains(e.target)) { setTimeout(fxCloseMenu, 0); return; }
    fxCloseMenu();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fxCloseMenu(); });
  fxMenuSync();

  // ------------------------------------------------------------
  // DUES
  // ------------------------------------------------------------
  S.duesCfg = S.duesCfg || {};
  S.fxMine = S.fxMine || [];
  S.fxAll = S.fxAll || [];
  S.fxF = S.fxF || { q: '', v: '', s: '' };

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function naira(n) { return '\u20a6' + Number(n || 0).toLocaleString(); }
  function fxMonthIndex(ym) { const p = String(ym || '').split('-').map(Number); if (p.length < 2 || !p[0] || !p[1]) return null; return p[0] * 12 + (p[1] - 1); }
  function fxNowIndex() { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); }
  function fxMonthLabel(i) { return MONTH_NAMES[i % 12] + ' ' + Math.floor(i / 12); }
  function fxToday() { return new Date().toISOString().slice(0, 10); }
  function fxPlanOf(m) { return m && m.duesPlan === 'yearly' ? 'yearly' : 'monthly'; }
  function fxUnitRate(plan) { const cfg = S.duesCfg || {}; return Number(plan === 'yearly' ? cfg.yearly : cfg.monthly) || 0; }
  function fxWaLink(m, st) {
    let digits = String(m.phone || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.charAt(0) === '0') digits = '234' + digits.slice(1);
    if (!digits) return '';
    const text = 'Hello ' + m.name + ', this is a reminder from UZAIRUE. Your dues are owing: ' + st.owing + ' month(s), ' + naira(st.owed) + '. Thank you.';
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
  }
  function fxDuesStatus(m, payments) {
    const cfg = S.duesCfg || {}, start = fxMonthIndex(cfg.startMonth), plan = fxPlanOf(m);
    const hasRates = Number(cfg.monthly) > 0 || Number(cfg.yearly) > 0;
    if (start === null || !hasRates) return { active: false, plan: plan };
    let from = start;
    if (m.createdAt && typeof m.createdAt.toDate === 'function') {
      const joined = m.createdAt.toDate(), joinIndex = joined.getFullYear() * 12 + joined.getMonth();
      from = Math.max(start, joinIndex);
    }
    const perMonth = plan === 'yearly' ? fxUnitRate('yearly') / 12 : fxUnitRate('monthly');
    const due = Math.max(0, fxNowIndex() - from + 1);
    let paid = 0, pending = 0;
    payments.forEach(function (p) {
      if (p.status === 'confirmed') paid += Number(p.months) || 0;
      else if (p.status === 'pending') pending += 1;
    });
    const owing = Math.max(0, due - paid);
    return { active: true, plan: plan, perMonth: perMonth, owing: owing, owed: Math.round(owing * perMonth), paidUpTo: from + paid - 1, paid: paid, pending: pending };
  }
  function fxStatusText(st) {
    if (!st.active) return 'Dues have not started yet';
    if (st.owing > 0) return 'Owing ' + st.owing + ' month' + (st.owing === 1 ? '' : 's') + ' \u00b7 ' + naira(st.owed);
    return 'Paid up to ' + fxMonthLabel(st.paidUpTo);
  }
  function fxStatusHtml(st) {
    const owing = st.active && st.owing > 0;
    const style = owing ? ' style="color:var(--bad)"' : '';
    return '<div class="big"' + style + '>' + esc(fxStatusText(st)) + '</div>';
  }

  let fxFirestorePromise = null;
  function fxFirestore() {
    if (!fxFirestorePromise) fxFirestorePromise = import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    return fxFirestorePromise;
  }
  async function fxLoadCfg() {
    if (!cfgOk) return;
    try { const d = await getDoc(doc(db, 'settings', 'dues')); S.duesCfg = d.exists() ? d.data() : {}; }
    catch (e) { S.duesCfg = {}; }
  }
  async function fxLoadMine() {
    S.fxMine = [];
    if (!cfgOk || !auth || !auth.currentUser || !auth.currentUser.emailVerified) return;
    try {
      const fs = await fxFirestore();
      const q = fs.query(fs.collection(db, 'dues'), fs.where('uid', '==', auth.currentUser.uid));
      const snap = await fs.getDocs(q);
      S.fxMine = snap.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
    } catch (e) { S.fxMine = []; }
  }
  const _loadPubDues = window.loadPub;
  window.loadPub = async function () { await _loadPubDues(); await fxLoadCfg(); await fxLoadMine(); };
  const _loadAdminDues = window.loadAdmin;
  window.loadAdmin = async function () { await _loadAdminDues(); S.fxAll = (await list('dues', 'at')).reverse(); };

  const _navDues = window.nav;
  window.nav = function () { _navDues(); fxDuesNavItem(); };
  function fxDuesNavItem() {
    const nav = document.getElementById('nav');
    if (!nav || !S.user || !S.user.emailVerified) return;
    const btn = document.createElement('button');
    btn.textContent = 'Dues'; btn.setAttribute('onclick', "go('dues')");
    if (S.view === 'dues') btn.classList.add('on');
    const logout = Array.prototype.slice.call(nav.children).filter(function (b) { return (b.getAttribute('onclick') || '').indexOf('out()') >= 0; })[0];
    if (logout) nav.insertBefore(btn, logout); else nav.appendChild(btn);
  }

  const _renderDues = window.render;
  window.render = function () {
    if (S.ready && S.view === 'dues') {
      if (!S.user) S.view = 'home';
      else if (!S.user.emailVerified) S.view = 'verify';
    }
    _renderDues();
    if (S.view === 'dues') fxDrawDues();
  };

  function fxDrawDues() {
    const app = $('app'), m = S.me;
    if (!app) return;
    if (!m) { app.innerHTML = '<div class="card">Your profile is not available yet.</div>'; return; }
    const cfg = S.duesCfg || {}, st = fxDuesStatus(m, S.fxMine || []), plan = fxPlanOf(m);
    const unit = plan === 'yearly' ? 'year' : 'month', rate = fxUnitRate(plan);
    const parts = [];
    if (S.msg) parts.push('<div class="msg">' + esc(S.msg) + '</div>');
    parts.push('<h2>Dues</h2><div class="card"><h3>Your dues</h3>' + fxStatusHtml(st));
    if (st.active && st.pending > 0) parts.push('<div class="mute">' + st.pending + ' payment(s) waiting for an admin to confirm</div>');
    parts.push('<div class="mute" style="margin-top:8px">Plan: ' + (plan === 'yearly' ? 'Yearly' : 'Monthly') + ' \u00b7 ' + naira(rate) + ' per ' + unit + '</div>');
    parts.push('<div class="row"><button class="' + (plan === 'monthly' ? 'on' : '') + '" onclick="fxSetPlan(\'monthly\')">Monthly</button><button class="' + (plan === 'yearly' ? 'on' : '') + '" onclick="fxSetPlan(\'yearly\')">Yearly</button></div></div>');
    if (st.active) {
      parts.push('<h2>Pay your dues</h2><div class="card"><p class="mute">Send the money to this account, then tell us below.</p>' + acctHtml(acctOf(null)) + '</div>');
      parts.push('<div class="card" style="margin-top:14px"><h3>I\u2019ve paid</h3>');
      parts.push('<label>How many ' + unit + 's are you paying for?</label><input id="fx_dn" type="number" min="1" value="1" oninput="fxDuesCalc()">');
      parts.push('<label>Amount paid (\u20a6)</label><input id="fx_da" type="number" value="' + rate + '">');
      parts.push('<label>Reference or narration</label><input id="fx_dr">');
      parts.push('<label>Receipt photo (optional)</label><input type="file" accept="image/*" onchange="fxPick(this,\'receipt\',900)"><img id="pv_receipt" class="pv" style="display:none">');
      parts.push('<button class="p" onclick="fxPayDues()">I\u2019ve paid</button></div>');
    } else {
      parts.push('<div class="card mute" style="margin-top:14px">Dues have not been set up yet. Please check again soon.</div>');
    }
    parts.push('<h2>Payment history</h2><div class="grid">' + fxHistoryHtml(S.fxMine || []) + '</div>');
    app.innerHTML = parts.join('');
  }

  function fxHistoryHtml(payments) {
    if (!payments.length) return '<div class="card mute">No payments yet.</div>';
    return payments.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).map(function (p) {
      const unit = p.plan === 'yearly' ? 'year' : 'month';
      const label = p.status === 'confirmed' ? 'Confirmed' : (p.status === 'rejected' ? 'Rejected' : 'Pending');
      return '<div class="card"><div class="big">' + naira(p.amount) + '</div><div>' + esc(p.count) + ' ' + unit + (Number(p.count) === 1 ? '' : 's') + '</div><div class="mute">' + esc(p.date) + (p.ref ? ' \u00b7 ' + esc(p.ref) : '') + '</div><span class="tag ' + (p.status === 'confirmed' ? 'a' : '') + '">' + label + '</span></div>';
    }).join('');
  }

  async function fxSetPlan(plan) {
    if (!S.me) return;
    try { await updateDoc(doc(db, 'members', S.me._id), { duesPlan: plan }); S.me.duesPlan = plan; render(); }
    catch (e) { say(e.message); }
  }
  function fxDuesCalc() {
    const n = parseInt(v('fx_dn'), 10) || 0, rate = fxUnitRate(fxPlanOf(S.me)), amount = $('fx_da');
    if (amount) amount.value = n > 0 ? n * rate : '';
  }
  async function fxPayDues() {
    const m = S.me, plan = fxPlanOf(m), count = parseInt(v('fx_dn'), 10), amount = Number(v('fx_da'));
    if (!(count >= 1) || !(amount > 0)) return say('Enter how many ' + (plan === 'yearly' ? 'years' : 'months') + ' and the amount you paid.');
    try {
      await addDoc(collection(db, 'dues'), {
        uid: auth.currentUser.uid, mid: m._id, memberId: m.id, name: m.name, village: m.village || '',
        plan: plan, count: count, months: count * (plan === 'yearly' ? 12 : 1), amount: amount,
        ref: v('fx_dr'), receipt: IMG.receipt || '', status: 'pending', by: 'member', date: fxToday(), at: serverTimestamp()
      });
      IMG.receipt = ''; await reload(); say('Payment reported. An admin will confirm it soon.');
    } catch (e) { say(e.message); }
  }

  const DUES_KNOWN_TABS = ['members', 'villages', 'council', 'donations', 'news', 'projects', 'logo', 'donate', 'settings', 'fxdues'];
  const _adminDues = window.admin;
  window.admin = function () {
    if (!isAdmin()) return _adminDues();
    if (S.tab === 'fxdues') return fxAdminDues();
    let h = _adminDues();
    if (DUES_KNOWN_TABS.indexOf(S.tab) < 0) {
      const tile = '<div class="card tile" onclick="S.tab=\'fxdues\';render();window.scrollTo(0,0)"><div class="ic">\uD83D\uDCB3</div><h3>Dues</h3><div class="mute">Amounts, payments and who owes</div></div>';
      const i = h.lastIndexOf('</div>');
      h = h.slice(0, i) + tile + h.slice(i);
    }
    return h;
  };

  function fxPaymentsOf(m) { return S.fxAll.filter(function (p) { return p.mid === m._id; }); }
  function fxPayingMembers() { return S.mem.filter(function (m) { return m.status !== 'revoked'; }); }

  function fxAdminDues() {
    const cfg = S.duesCfg || {}, members = fxPayingMembers();
    const pending = S.fxAll.filter(function (p) { return p.status === 'pending'; });
    const confirmedTotal = S.fxAll.reduce(function (sum, p) { return p.status === 'confirmed' ? sum + (Number(p.amount) || 0) : sum; }, 0);
    let paidUp = 0, owing = 0;
    members.forEach(function (m) {
      const st = fxDuesStatus(m, fxPaymentsOf(m));
      if (st.active && st.owing === 0) paidUp += 1;
      else if (st.active) owing += 1;
    });
    const parts = [];
    parts.push('<div class="row"><button onclick="S.tab=\'dash\';render()">\u2190 Back to Admin</button></div><h2>Dues</h2><div class="grid">');
    parts.push(fxStatCard('Paid up', paidUp)); parts.push(fxStatCard('Owing', owing)); parts.push(fxStatCard('Pending payments', pending.length)); parts.push(fxStatCard('Confirmed total', naira(confirmedTotal)));
    parts.push('</div><div class="card" style="margin-top:14px"><h3>Dues settings</h3>');
    parts.push('<label>Monthly amount (\u20a6)</label><input id="fxc_m" type="number" value="' + esc(cfg.monthly || '') + '">');
    parts.push('<label>Yearly amount (\u20a6)</label><input id="fxc_y" type="number" value="' + esc(cfg.yearly || '') + '">');
    parts.push('<label>Dues start from (month)</label><input id="fxc_s" type="month" value="' + esc(cfg.startMonth || '') + '">');
    parts.push('<button class="p" onclick="fxSaveDuesCfg()">Save settings</button></div>');
    parts.push('<div class="card" style="margin-top:14px"><h3>Record a payment</h3>');
    parts.push('<label>Member ID</label><input id="fx_rid" placeholder="e.g. UCA-0002" autocapitalize="characters">');
    parts.push('<label>Number of months (or years, for a yearly member)</label><input id="fx_rn" type="number" min="1" value="1">');
    parts.push('<label>Amount received (\u20a6)</label><input id="fx_ra" type="number">');
    parts.push('<label>Reference or note</label><input id="fx_rr">');
    parts.push('<button class="p" onclick="fxAdminRecord()">Record payment</button></div>');
    parts.push('<h2>Pending payments</h2><div class="grid">' + fxPendingHtml(pending) + '</div>');
    parts.push('<h2>Members</h2><input placeholder="Search name or ID" value="' + esc(S.fxF.q) + '" oninput="S.fxF.q=this.value;fxRefreshList()">');
    parts.push('<select onchange="S.fxF.v=this.value;fxRefreshList()"><option value="">All villages/towns</option>' + fxVillageOptions() + '</select>');
    parts.push('<select onchange="S.fxF.s=this.value;fxRefreshList()"><option value="">All statuses</option><option value="owing"' + (S.fxF.s === 'owing' ? ' selected' : '') + '>Owing</option><option value="paid"' + (S.fxF.s === 'paid' ? ' selected' : '') + '>Paid up</option></select>');
    parts.push('<div class="grid" id="fx_list">' + fxMemberListHtml() + '</div>');
    return parts.join('');
  }
  function fxStatCard(label, value) { return '<div class="card"><div class="mute">' + label + '</div><div class="big">' + value + '</div></div>'; }
  function fxVillageOptions() { return S.vil.map(function (x) { return '<option' + (S.fxF.v === x.name ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join(''); }
  function fxPendingHtml(pending) {
    if (!pending.length) return '<div class="card mute">Nothing waiting for confirmation.</div>';
    return pending.map(function (p) {
      return '<div class="card"><h3>' + esc(p.name) + '</h3><div class="mute">' + esc(p.memberId) + ' \u00b7 ' + esc(p.village) + '</div><div class="big">' + naira(p.amount) + '</div><div>' + esc(p.count) + ' ' + (p.plan === 'yearly' ? 'year' : 'month') + (Number(p.count) === 1 ? '' : 's') + '</div><div class="mute">' + esc(p.date) + (p.ref ? ' \u00b7 ' + esc(p.ref) : '') + '</div>' + (p.receipt ? '<img class="thumb" src="' + esc(p.receipt) + '" alt="Receipt">' : '') + '<div class="row"><button class="p" onclick="fxReview(\'' + p._id + '\',\'confirmed\')">Confirm</button><button class="d" onclick="fxReview(\'' + p._id + '\',\'rejected\')">Reject</button></div></div>';
    }).join('');
  }
  function fxMemberListHtml() {
    const f = S.fxF, q = String(f.q || '').toLowerCase(), cards = [];
    fxPayingMembers().forEach(function (m) {
      const st = fxDuesStatus(m, fxPaymentsOf(m)), isOwing = st.active && st.owing > 0, isPaid = st.active && st.owing === 0;
      if (f.v && m.village !== f.v) return;
      if (q && (m.name + ' ' + m.id).toLowerCase().indexOf(q) < 0) return;
      if (f.s === 'owing' && !isOwing) return;
      if (f.s === 'paid' && !isPaid) return;
      const wa = isOwing ? fxWaLink(m, st) : '';
      let card = '<div class="card"><h3>' + esc(m.name) + '</h3><div class="mute">' + esc(m.id) + ' \u00b7 ' + esc(m.village || '') + '</div>' + fxStatusHtml(st) + '<div class="mute">' + (st.plan === 'yearly' ? 'Yearly' : 'Monthly') + ' plan</div><div class="row"><button onclick="fxAdminPlan(\'' + m._id + '\')">Switch plan</button>';
      if (wa) card += '<a class="btn" href="' + esc(wa) + '" target="_blank" rel="noopener">Remind on WhatsApp</a>';
      card += '</div></div>'; cards.push(card);
    });
    return cards.join('') || '<div class="card mute">No members found.</div>';
  }
  function fxRefreshList() { const box = $('fx_list'); if (box) box.innerHTML = fxMemberListHtml(); }
  async function fxSaveDuesCfg() {
    try { await setDoc(doc(db, 'settings', 'dues'), { monthly: Number(v('fxc_m')) || 0, yearly: Number(v('fxc_y')) || 0, startMonth: v('fxc_s') }, { merge: true }); await reload(); say('Dues settings saved.'); }
    catch (e) { say(e.message); }
  }
  async function fxAdminRecord() {
    const id = v('fx_rid').toUpperCase(), m = S.mem.filter(function (x) { return String(x.id).toUpperCase() === id; })[0];
    if (!m) return say('No member with that ID.');
    const plan = fxPlanOf(m), count = parseInt(v('fx_rn'), 10), amount = Number(v('fx_ra'));
    if (!(count >= 1) || !(amount > 0)) return say('Enter the number of months or years and the amount.');
    try {
      await addDoc(collection(db, 'dues'), { uid: m.uid || m._id, mid: m._id, memberId: m.id, name: m.name, village: m.village || '', plan: plan, count: count, months: count * (plan === 'yearly' ? 12 : 1), amount: amount, ref: v('fx_rr'), receipt: '', status: 'confirmed', by: 'admin', date: fxToday(), at: serverTimestamp() });
      await reload(); say('Payment recorded for ' + m.id + '.');
    } catch (e) { say(e.message); }
  }
  async function fxReview(id, status) { try { await updateDoc(doc(db, 'dues', id), { status: status }); await reload(); } catch (e) { say(e.message); } }
  async function fxAdminPlan(memberDocId) {
    const m = S.mem.filter(function (x) { return x._id === memberDocId; })[0]; if (!m) return;
    try { await updateDoc(doc(db, 'members', memberDocId), { duesPlan: fxPlanOf(m) === 'yearly' ? 'monthly' : 'yearly' }); await reload(); } catch (e) { say(e.message); }
  }

  Object.assign(window, { fxSetPlan: fxSetPlan, fxDuesCalc: fxDuesCalc, fxPayDues: fxPayDues, fxSaveDuesCfg: fxSaveDuesCfg, fxAdminRecord: fxAdminRecord, fxReview: fxReview, fxAdminPlan: fxAdminPlan, fxRefreshList: fxRefreshList });
  [['fxSetPlan', 'Saving...'], ['fxPayDues', 'Sending...'], ['fxSaveDuesCfg', 'Saving...'], ['fxAdminRecord', 'Recording...'], ['fxReview', 'Updating...'], ['fxAdminPlan', 'Saving...']].forEach(function (pair) { window[pair[0]] = busyWrap(window[pair[0]], pair[1]); });

  // ------------------------------------------------------------
  // COUNCIL: KINGDOM LABEL
  // ------------------------------------------------------------
  const KINGDOM_LABEL = 'Kingdom of Uzairue';
  const _councilPage = window.council;
  window.council = function () {
    let html = _councilPage();
    S.vil.forEach(function (vl) {
      const heading = '<h2>' + esc(vl.name) + '</h2>', labelled = heading + '<div class="mute">' + KINGDOM_LABEL + '</div>';
      html = html.split(heading).join(labelled);
    });
    return html;
  };

  // ------------------------------------------------------------
  // CLAIM: ADMIN-REGISTERED MEMBERS LOG IN
  // ------------------------------------------------------------
  const CLAIM_FIELDS = ['name', 'id', 'village', 'address', 'house', 'phone', 'email', 'img', 'occupation', 'dob', 'duesPlan', 'createdAt'];
  S.fxClaims = S.fxClaims || {};
  function fxEmailKey(e) { return String(e || '').trim().toLowerCase(); }
  
  const _loadAdminClaim = window.loadAdmin;
  window.loadAdmin = async function () {
    await _loadAdminClaim();
    S.fxClaims = {};
    (await list('claims')).forEach(function (c) { S.fxClaims[c._id] = c; });
    S.mem = S.mem.filter(function (m) { return !m.claimedBy; });
  };
  async function fxMakeClaim(m) {
    const key = fxEmailKey(m.email); if (!key) return;
    if (m.email !== key) await updateDoc(doc(db, 'members', m._id), { email: key });
    await setDoc(doc(db, 'claims', key), { memberDocId: m._id, memberId: m.id, name: m.name || '', claimed: false });
  }
  const _submitClaim = window.submitMember;
  window.submitMember = async function () {
    const editing = S.editId, email = fxEmailKey(v('ae'));
    await _submitClaim();
    if (editing || !email || !/^Registered/.test(S.msg || '')) return;
    if (S.fxClaims[email]) return;
    const newest = S.mem.filter(function (m) { return fxEmailKey(m.email) === email && !m.claimedBy; }).sort(function (a, b) { return parseInt(String(b.id).slice(4), 10) - parseInt(String(a.id).slice(4), 10); })[0];
    if (newest) { try { await fxMakeClaim(newest); await reload(); } catch (e) { say(e.message); } }
  };
  async function fxEnableLogin(docId) {
    const m = S.mem.filter(function (x) { return x._id === docId; })[0];
    if (!m || !fxEmailKey(m.email)) return say('This member has no email, so they cannot log in.');
    if (S.fxClaims[fxEmailKey(m.email)]) return say('Login is already enabled for this email.');
    try { await fxMakeClaim(m); await reload(); say('Login enabled. Ask ' + m.name + ' to sign up with ' + fxEmailKey(m.email) + '.'); } catch (e) { say(e.message); }
  }
  async function fxMoveDues(docId) {
    const m = S.mem.filter(function (x) { return x._id === docId; })[0]; if (!m || !m.legacyDocId) return;
    const rows = (S.fxAll || []).filter(function (p) { return p.mid === m.legacyDocId; });
    try {
      for (const p of rows) await updateDoc(doc(db, 'dues', p._id), { mid: m._id, uid: m._id });
      await reload(); say('Moved ' + rows.length + ' payment(s) to the login.');
    } catch (e) { say(e.message); }
  }
  async function fxClaimLogin() {
    if (!cfgOk || !S.user || !S.user.emailVerified || !S.me) return;
    if (S.me._id !== S.user.uid) return;
    const key = fxEmailKey(S.user.email); if (!key) return;
    try {
      const c = await getDoc(doc(db, 'claims', key));
      if (!c.exists() || c.data().claimed) return;
      const claim = c.data(), oldRef = doc(db, 'members', claim.memberDocId), o = await getDoc(oldRef);
      if (!o.exists() || o.data().claimedBy) return;
      const old = o.data(), fields = {};
      CLAIM_FIELDS.forEach(function (k) { if (old[k] !== undefined) fields[k] = old[k]; });
      fields.id = claim.memberId; fields.email = key; fields.legacyDocId = claim.memberDocId;
      await updateDoc(doc(db, 'members', S.user.uid), fields);
      await updateDoc(oldRef, { claimedBy: S.user.uid });
      await updateDoc(doc(db, 'claims', key), { claimed: true, claimedUid: S.user.uid });
      const n = await getDoc(doc(db, 'members', S.user.uid));
      S.me = Object.assign({ _id: S.user.uid }, n.data());
      await fxLoadMine(); S.msg = 'Your account is linked to ' + claim.memberId + '. Welcome!';
    } catch (e) { S.msg = 'We could not link your account yet. Please tell the admin.'; }
  }
  const _loadPubClaim = window.loadPub;
  window.loadPub = async function () { await _loadPubClaim(); await fxClaimLogin(); };
  
  function fxLoginPanelHtml() {
    const rows = [];
    S.mem.forEach(function (m) {
      if (m.legacyDocId) {
        const moveBtn = S.fxAll.some(function (p) { return p.mid === m.legacyDocId; }) ? '<button onclick="fxMoveDues(\'' + m._id + '\')">Move dues to login</button>' : '';
        rows.push('<div class="card"><h3>' + esc(m.name) + '</h3><div class="mute">' + esc(m.id) + ' · Linked to login</div><div class="row">' + moveBtn + '</div></div>');
      } else if (m.byAdmin && fxEmailKey(m.email)) {
        const c = S.fxClaims[fxEmailKey(m.email)], status = c ? 'Waiting for sign-up with ' + esc(fxEmailKey(m.email)) : 'No login yet';
        const btn = c ? '' : '<button class="p" onclick="fxEnableLogin(\'' + m._id + '\')">Enable login</button>';
        rows.push('<div class="card"><h3>' + esc(m.name) + '</h3><div class="mute">' + esc(m.id) + ' · ' + status + '</div><div class="row">' + btn + '</div></div>');
      }
    });
    return '<h2>Member logins</h2><div class="grid">' + (rows.join('') || '<div class="card mute">No member logins to show.</div>') + '</div>';
  }
  const _adminClaim = window.admin;
  window.admin = function () {
    const h = _adminClaim();
    if (!isAdmin() || S.tab !== 'members') return h;
    return h.replace('<h2>Directory</h2>', fxLoginPanelHtml() + '<h2>Directory</h2>');
  };
  Object.assign(window, { fxEnableLogin: fxEnableLogin, fxMoveDues: fxMoveDues });
  [['fxEnableLogin', 'Enabling...'], ['fxMoveDues', 'Moving...']].forEach(function (pair) { window[pair[0]] = busyWrap(window[pair[0]], pair[1]); });

  // ------------------------------------------------------------
  // DUPLICATE EMAIL GUARD
  // ------------------------------------------------------------
  function fxOtherWithEmail(email, exceptId) {
    const key = fxEmailKey(email); if (!key) return null;
    return S.mem.filter(function (m) { return fxEmailKey(m.email) === key && m._id !== exceptId && !m.claimedBy; })[0] || null;
  }
  const _submitGuard = window.submitMember;
  window.submitMember = async function () {
    const email = fxEmailKey(v('ae')), editing = S.editId;
    if (!editing && email) {
      const other = fxOtherWithEmail(email, '');
      if (other) return say('That email already belongs to ' + other.id + ' (' + other.name + '). Use that ID to edit them, or use a different email.');
      if (S.fxClaims[email]) return say('That email already has a login linked to ' + S.fxClaims[email].memberId + '.');
    }
    return _submitGuard();
  };
  const _enableGuard = window.fxEnableLogin;
  window.fxEnableLogin = async function (docId) {
    const m = S.mem.filter(function (x) { return x._id === docId; })[0];
    if (m) {
      const other = fxOtherWithEmail(m.email, m._id);
      if (other) return say('Another record uses this email (' + other.id + '). Fix the duplicate before enabling login.');
    }
    return _enableGuard(docId);
  };
  const _adminGuard = window.admin;
  window.admin = function () {
    const h = _adminGuard();
    if (!isAdmin() || S.tab !== 'members') return h;
    const seen = {}, dups = [];
    S.mem.forEach(function (m) {
      const k = fxEmailKey(m.email); if (!k || m.claimedBy) return;
      if (seen[k]) dups.push(seen[k].id + ' and ' + m.id + ' (' + k + ')');
      else seen[k] = m;
    });
    if (!dups.length) return h;
    const warning = '<div class="card" style="border-color:var(--bad)"><h3>Duplicate emails</h3>' + dups.map(function (d) { return '<div class="mute">' + esc(d) + '</div>'; }).join('') + '</div>';
    return h.replace('<h2>Member logins</h2>', warning + '<h2>Member logins</h2>');
  };

  // ------------------------------------------------------------
  // AUTO CLEANUP
  // ------------------------------------------------------------
  const _loadAdminCleanup = window.loadAdmin;
  window.loadAdmin = async function () { await _loadAdminCleanup(); await fxAutoCleanup(); };
  async function fxAutoCleanup() {
    if (!cfgOk || !isAdmin()) return;
    let all = [], dues = [];
    try { all = await list('members'); dues = await list('dues'); } catch (e) { return; }
    const byId = {}; all.forEach(function (m) { byId[m._id] = m; });
    const linked = all.filter(function (n) { const old = n.legacyDocId ? byId[n.legacyDocId] : null; return !!old && old.claimedBy === n._id; });
    for (const n of linked) {
      const oldId = n.legacyDocId;
      try {
        const rows = dues.filter(function (p) { return p.mid === oldId; });
        for (const p of rows) await updateDoc(doc(db, 'dues', p._id), { mid: n._id, uid: n._id });
        await deleteDoc(doc(db, 'members', oldId));
      } catch (e) {}
    }
  }

  // ------------------------------------------------------------
  // GIFTS: BANK DETAILS AND MEMBER LIST
  // ------------------------------------------------------------
  S.fxDir = S.fxDir || [];
  const giftStyle = document.createElement('style');
  giftStyle.textContent = '.fxSwitch{display:flex;gap:8px;align-items:center}.fxSwitch input{width:auto}';
  document.head.appendChild(giftStyle);

  async function fxWriteDirectory(m) {
    if (!m || !m.id) return;
    const entry = { memberId: m.id, name: m.name || '', village: m.village || '', img: m.img || '', showAcct: !!(m.showAcct && m.acct) };
    if (entry.showAcct) { entry.bank = m.bank || ''; entry.acct = m.acct; entry.acctName = m.acctName || ''; }
    await setDoc(doc(db, 'directory', m.id), entry);
  }
  async function fxLoadDirectory() {
    S.fxDir = [];
    if (!cfgOk || !S.user || !S.user.emailVerified) return;
    try { S.fxDir = (await list('directory')).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); }); }
    catch (e) { S.fxDir = []; }
  }
  const _loadPubGifts = window.loadPub;
  window.loadPub = async function () { await _loadPubGifts(); await fxLoadDirectory(); };
  
  async function fxSaveGift() {
    const m = S.me; if (!m) return;
    const box = document.getElementById('fxg_show');
    const next = { bank: v('fxg_bank'), acct: v('fxg_acct'), acctName: v('fxg_name'), showAcct: !!(box && box.checked) };
    if (next.showAcct && !next.acct) return say('Add your account number before showing it to others.');
    try {
      await updateDoc(doc(db, 'members', m._id), next);
      S.me = Object.assign({}, m, next);
      await fxWriteDirectory(S.me); await fxLoadDirectory(); say('Bank details saved.');
    } catch (e) { say(e.message); }
  }
  function fxGiftCardHtml(m) {
    return '<div class="card" style="margin-top:14px"><h3>Bank account for gifts</h3><p class="mute">Used when other members want to gift you. Turn on the switch to show it to them.</p><label>Bank name</label><input id="fxg_bank" value="' + esc(m.bank || '') + '"><label>Account number</label><input id="fxg_acct" inputmode="numeric" value="' + esc(m.acct || '') + '"><label>Account name</label><input id="fxg_name" value="' + esc(m.acctName || '') + '"><label class="fxSwitch"><input id="fxg_show" type="checkbox"' + (m.showAcct ? ' checked' : '') + '> Show my account to other members</label><button class="p" onclick="fxSaveGift()">Save bank details</button></div>';
  }
  function fxMembersPageHtml() {
    if (!S.user || !S.user.emailVerified) return '<div class="card">Verify your email to see members.</div>';
    const me = S.me ? S.me.id : '';
    const cards = S.fxDir.map(function (d) {
      const pic = d.img ? '<img class="av" src="' + esc(d.img) + '" alt="">' : '<div class="av">' + esc(String(d.name || '?').charAt(0).toUpperCase()) + '</div>';
      const who = d.memberId === me ? ' (you)' : '';
      const btn = d.showAcct ? '<button class="p" onclick="fxGiftOpen(\'' + esc(d.memberId) + '\')">Gift</button>' : '<span class="mute">No account shared</span>';
      return '<div class="card mem">' + pic + '<h3>' + esc(d.name) + esc(who) + '</h3><div class="mute">' + esc(d.memberId) + ' · ' + esc(d.village || '') + '</div><div class="row" style="justify-content:center">' + btn + '</div></div>';
    }).join('');
    return '<h2>Members</h2><p class="mute">Everyone in the community. Members who share their account can receive gifts from you.</p><div class="grid">' + (cards || '<div class="card mute">No members yet.</div>') + '</div>';
  }
  function fxGiftOpen(memberId) {
    const d = S.fxDir.filter(function (x) { return x.memberId === memberId; })[0];
    if (!d || !d.showAcct) return say('This member has not shared an account.');
    fxCloseDonate();
    const box = document.createElement('div');
    box.className = 'modal'; box.id = 'donModal';
    box.onclick = function (e) { if (e.target === box) fxCloseDonate(); };
    box.innerHTML = '<div class="card"><h3>Gift to ' + esc(d.name) + '</h3><p class="mute">Send your gift to this account from your bank app.</p>' + acctHtml({ bank: d.bank, acct: d.acct, name: d.acctName }) + '<div class="row"><button onclick="fxCloseDonate()">Close</button></div></div>';
    document.body.appendChild(box);
  }
  const _renderGifts = window.render;
  window.render = function () {
    if (S.ready && S.view === 'memberlist' && (!S.user || !S.user.emailVerified)) S.view = S.user ? 'verify' : 'home';
    _renderGifts();
    const app = $('app'); if (!app) return;
    if (S.view === 'me' && !S.card && S.me) app.insertAdjacentHTML('beforeend', fxGiftCardHtml(S.me));
    if (S.view === 'memberlist') app.innerHTML = fxMembersPageHtml();
  };
  const _navGifts = window.nav;
  window.nav = function () {
    _navGifts();
    const nav = document.getElementById('nav'); if (!nav || !S.user || !S.user.emailVerified) return;
    const btn = document.createElement('button');
    btn.textContent = 'Members'; btn.setAttribute('onclick', "go('memberlist')");
    if (S.view === 'memberlist') btn.classList.add('on');
    const out = Array.prototype.slice.call(nav.children).filter(function (b) { return (b.getAttribute('onclick') || '').indexOf('out()') >= 0; })[0];
    if (out) nav.insertBefore(btn, out); else nav.appendChild(btn);
  };
  async function fxSyncDirectory() {
    for (const m of S.mem) {
      if (m.status === 'revoked') await deleteDoc(doc(db, 'directory', m.id));
      else await fxWriteDirectory(m);
    }
    await fxLoadDirectory();
  }
  async function fxRefreshDirectory() {
    try { await fxSyncDirectory(); say('Member list refreshed.'); } catch (e) { say(e.message); }
  }
  const _subGifts = window.submitMember;
  window.submitMember = async function () {
    await _subGifts();
    if (isAdmin() && /^(Saved|Registered)/.test(S.msg || '')) {
      try { await fxSyncDirectory(); } catch (e) {}
    }
  };
  async function fxAdminBank() {
    const id = v('fxa_id').toUpperCase(), m = S.mem.filter(function (x) { return String(x.id).toUpperCase() === id; })[0];
    if (!m) return say('No member with that ID.');
    const box = document.getElementById('fxa_show');
    const next = { bank: v('fxa_bank'), acct: v('fxa_acct'), acctName: v('fxa_name'), showAcct: !!(box && box.checked) };
    if (next.showAcct && !next.acct) return say('Add the account number before showing it to others.');
    try { await updateDoc(doc(db, 'members', m._id), next); await fxWriteDirectory(Object.assign({}, m, next)); await reload(); say('Bank details saved for ' + m.id + '.'); }
    catch (e) { say(e.message); }
  }
  const _adminGifts = window.admin;
  window.admin = function () {
    if (isAdmin() && S.tab === 'fxgifts') return fxGiftsAdmin();
    let h = _adminGifts();
    if (isAdmin() && S.tab === 'dash') {
      const tile = '<div class="card tile" onclick="S.tab=\'fxgifts\';render();window.scrollTo(0,0)"><div class="ic">🎁</div><h3>Accounts &amp; gifts</h3><div class="mute">Bank details and the member list</div></div>';
      const i = h.lastIndexOf('</div>');
      h = h.slice(0, i) + tile + h.slice(i);
    }
    return h;
  };
  function fxGiftsAdmin() {
    return '<div class="row"><button onclick="S.tab=\'dash\';render()">← Back to Admin</button></div><h2>Accounts &amp; gifts</h2><div class="card"><h3>Bank details for a member</h3><p class="mute">Use this for members who cannot log in.</p><label>Member ID</label><input id="fxa_id" placeholder="e.g. UCA-0002" autocapitalize="characters"><label>Bank name</label><input id="fxa_bank"><label>Account number</label><input id="fxa_acct" inputmode="numeric"><label>Account name</label><input id="fxa_name"><label class="fxSwitch"><input id="fxa_show" type="checkbox"> Show this account to other members</label><button class="p" onclick="fxAdminBank()">Save bank details</button></div><div class="card" style="margin-top:14px"><h3>Member list</h3><p class="mute">Rebuilds the list members see. It also refreshes each time you save a member.</p><button onclick="fxRefreshDirectory()">Refresh member list</button></div>';
  }
  Object.assign(window, { fxSaveGift: fxSaveGift, fxGiftOpen: fxGiftOpen, fxAdminBank: fxAdminBank, fxRefreshDirectory: fxRefreshDirectory });
  [['fxSaveGift', 'Saving...'], ['fxAdminBank', 'Saving...'], ['fxRefreshDirectory', 'Refreshing...']].forEach(function (pair) { window[pair[0]] = busyWrap(window[pair[0]], pair[1]); });

  // ------------------------------------------------------------
  // FINANCE: BANK ALERTS, CASH, EXPENSES, BALANCE AND RECEIPTS
  // ------------------------------------------------------------
  S.fin = S.fin || {};
  S.fxAlerts = S.fxAlerts || [];
  S.fxExp = S.fxExp || [];
  S.fxDon = S.fxDon || [];
  S.fxDraft = S.fxDraft || '';
  S.fxDraftParsed = S.fxDraftParsed || null;
  S.fxAlertQ = S.fxAlertQ || ''; // Search state for alerts

  function fxNewestFirst(a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }

  async function fxLoadFinance() {
    if (!cfgOk) return;
    try { const f = await getDoc(doc(db, 'settings', 'finance')); S.fin = f.exists() ? f.data() : {}; }
    catch (e) { S.fin = {}; }
    S.fxAlerts = []; S.fxExp = [];
    if (S.user && S.user.emailVerified) {
      try { S.fxAlerts = (await list('alerts')).sort(fxNewestFirst); S.fxExp = (await list('expenses')).sort(fxNewestFirst); }
      catch (e) { S.fxAlerts = []; S.fxExp = []; }
    }
  }
  const _loadPubFin = window.loadPub;
  window.loadPub = async function () { await _loadPubFin(); await fxLoadFinance(); };
  
  const _loadAdminFin = window.loadAdmin;
  window.loadAdmin = async function () { await _loadAdminFin(); S.fxDon = await list('donations'); };

  async function fxRecalcFinance() {
    const dons = await list('donations'), dues = await list('dues'), alerts = await list('alerts'), exps = await list('expenses'), projs = await list('projects');
    const sum = function (arr, keep) { return arr.filter(keep).reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0); };
    const bankIn = sum(alerts, function () { return true; });
    const cashDon = sum(dons, function (d) { return d.method === 'cash' && d.status === 'confirmed'; });
    const cashDues = sum(dues, function (p) { return p.method === 'cash' && p.status === 'confirmed'; });
    const expenses = sum(exps, function () { return true; });
    const totals = {
      donations: sum(dons, function (d) { return d.status !== 'waiting'; }),
      dues: sum(dues, function (p) { return p.status === 'confirmed'; }),
      projects: projs.reduce(function (s, p) { return s + (Number(p.raised) || 0); }, 0),
      alerts: bankIn, expenses: expenses, balance: bankIn + cashDon + cashDues - expenses
    };
    await setDoc(doc(db, 'settings', 'finance'), totals);
    S.fin = totals;
  }

  async function fxRecalcNow() {
    try { await fxRecalcFinance(); await reload(); say('Totals updated.'); } catch (e) { say(e.message); }
  }

  function fxPad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

  function fxParseDate(s) {
    s = String(s || '').trim(); if (!s) return '';
    s = s.replace(/(\d+)(st|nd|rd|th)/gi, '$1'); // Remove ordinal suffixes
    let m = s.match(/^(\d{4})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})$/);
    if (m) return m[1] + '-' + fxPad2(m[2]) + '-' + fxPad2(m[3]);
    m = s.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})$/);
    if (m) { let y = m[3]; if (y.length === 2) y = (Number(y) < 70 ? '20' : '19') + y; return y + '-' + fxPad2(m[2]) + '-' + fxPad2(m[1]); }
    m = s.match(/^(\d{1,2})[\/\-. ]+([A-Za-z]{3,})[\/\-. ,]+(\d{2,4})$/);
    if (m) { const mo = MONTH_NAMES.map(function (x) { return x.toLowerCase(); }).indexOf(m[2].slice(0, 3).toLowerCase()); if (mo >= 0) { let y = m[3]; if (y.length === 2) y = (Number(y) < 70 ? '20' : '19') + y; return y + '-' + fxPad2(mo + 1) + '-' + fxPad2(m[1]); } }
    m = s.match(/^([A-Za-z]{3,})\s+(\d{1,2})[,\s]+(\d{2,4})$/);
    if (m) { const mo = MONTH_NAMES.map(function (x) { return x.toLowerCase(); }).indexOf(m[1].slice(0, 3).toLowerCase()); if (mo >= 0) { let y = m[3]; if (y.length === 2) y = (Number(y) < 70 ? '20' : '19') + y; return y + '-' + fxPad2(mo + 1) + '-' + fxPad2(m[2]); } }
    return '';
  }

  function fxParseAlert(text) {
    const t = String(text || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
    const warnings = [];
    const credit = /\b(credit|credited|received|CR|transfer\s+from)\b/i.test(t);
    const debit  = /\b(debit|debited|DR|withdrawal|withdrawn|out|transfer\s+to)\b/i.test(t);
    if (debit && !credit) return { error: 'This looks like a debit or withdrawal alert. Only credit alerts can be saved.' };
    if (!credit) warnings.push('No credit keyword found — verify this is an incoming transfer.');

    const amt = t.match(/(?:₦|NGN|N)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    const amount = amt ? Number(amt[1].replace(/,/g, '')) : 0;
    if (!(amount > 0)) warnings.push('Amount not found — enter it manually.');

    let dm = t.match(/\b([A-Za-z]{3,}\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{2,4})\b/i);
    if (!dm) dm = t.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,}\s*,?\s*\d{2,4})\b/i);
    if (!dm) dm = t.match(/\b(\d{1,2}[\/\-.](?:\d{1,2}|[A-Za-z]{3})[\/\-.]\d{2,4})\b/);
    const date = dm ? fxParseDate(dm[1]) : '';
    if (!date) warnings.push('Date not found — enter it manually.');

    let sender = '';
    const senderMatch = t.match(/(?:from|Name|Sender|Payer)\s*[:\-]?\s*([A-Za-z][A-Za-z .'\-]{1,60}?)(?=\s*(?:Bank|Acct|Account|Amount|Date|Ref|Transaction|on|$))/i);
    if (senderMatch) sender = senderMatch[1].trim();
    else {
      const beforeAmt = t.substring(0, amt ? amt.index : 100);
      const clean = beforeAmt.replace(/(?:credit|alert|transfer|details|received|from)/gi, '').trim();
      if (clean.length > 2 && clean.length < 40) sender = clean.replace(/[^A-Za-z0-9 .'\-]/g, '').trim();
    }
    sender = sender.replace(/\b(BANK|OPAY|PALMPAY|MONIEPOINT|GTB|ZENITH|ACCESS|UBA|KUDA|CHIPPER|ACCOUNT|NUMBER|TRANSFER|ALERT|VALUE|DATE)\b/gi, '').replace(/\s+/g, ' ').trim().toUpperCase();
    if (!sender) warnings.push('Sender not found — enter it manually.');

    return { amount: amount, date: date, sender: sender, narration: t.replace(/\d{4,}/g, '****'), warnings: warnings };
  }

  function fxParseAlertDraft() {
    const raw = $('fxp_text') ? $('fxp_text').value : '';
    if (!raw.trim()) return say('Paste a bank alert first.');
    S.fxDraft = raw;
    const r = fxParseAlert(raw);
    if (r.error) { S.fxDraftParsed = null; return say(r.error); }
    S.fxDraftParsed = r;
    if (r.warnings && r.warnings.length) S.msg = r.warnings.join(' ');
    else S.msg = 'Looks good — tap Save alert.';
    render();
  }

  async function fxConfirmAlert() {
    const amount = Number(v('fxp_amount'));
    const date = v('fxp_date');
    const sender = v('fxp_sender');
    const narration = S.fxDraftParsed ? S.fxDraftParsed.narration : (S.fxDraft || '').replace(/\d{4,}/g, '****');

    if (!(amount > 0)) return say('Enter the amount.');
    if (!date) return say('Enter the date.');
    if (!sender) return say('Enter the sender.');

    // FIX: Check for duplicates based on Date, Amount, and Sender
    const exists = S.fxAlerts.some(function(a) {
      return a.date === date && Number(a.amount) === amount && a.sender === sender;
    });
    if (exists) {
      return say('An alert with this exact Date, Amount, and Sender is already saved.');
    }

    const key = [date, amount, sender, narration].join('|');
    try {
      await addDoc(collection(db, 'alerts'), { date: date, amount: amount, sender: sender, narration: narration, key: key, matchedTo: '', at: serverTimestamp() });
      S.fxDraft = ''; S.fxDraftParsed = null;
      await fxRecalcFinance(); await reload(); say('Bank alert saved.');
    } catch (e) { say(e.message); }
  }

  function fxCancelAlert() { S.fxDraft = ''; S.fxDraftParsed = null; render(); }

  async function fxDelAlert(id) {
    if (!confirm('Delete this bank alert?')) return;
    try {
      await deleteDoc(doc(db, 'alerts', id));
      await fxRecalcFinance();
      await reload();
      say('Alert deleted.');
    } catch (e) { say(e.message); }
  }

  async function fxMatchAlert(alertId) {
    const box = document.getElementById('fxm_' + alertId), pick = box ? box.value : '';
    if (!pick) return say('Choose the payment to match.');
    const parts = pick.split(':'), kind = parts[0], id = parts[1];
    try {
      if (kind === 'donation') {
        const d = S.fxDon.filter(function (x) { return x._id === id; })[0];
        await updateDoc(doc(db, 'donations', id), { status: 'confirmed', method: 'bank' });
        if (d && d.pid) await updateDoc(doc(db, 'projects', d.pid), { raised: increment(Number(d.amount) || 0) });
      } else {
        await updateDoc(doc(db, 'dues', id), { status: 'confirmed', method: 'bank' });
      }
      await updateDoc(doc(db, 'alerts', alertId), { matchedTo: pick });
      await fxRecalcFinance(); await reload(); say('Matched.');
    } catch (e) { say(e.message); }
  }

  async function fxConfirmCash(id) {
    try { await updateDoc(doc(db, 'dues', id), { status: 'confirmed', method: 'cash' }); await fxRecalcFinance(); await reload(); }
    catch (e) { say(e.message); }
  }

  async function fxSaveExpense() {
    const amount = Number(v('fxe_amt')), purpose = v('fxe_purpose'), who = v('fxe_who').toUpperCase();
    const m = S.mem.filter(function (x) { return String(x.id).toUpperCase() === who; })[0];
    if (!(amount > 0) || !purpose) return say('Enter the amount and the purpose.');
    if (!m) return say('Enter the ID of the member who received the money.');
    try {
      await addDoc(collection(db, 'expenses'), {
        date: v('fxe_date') || fxToday(), amount: amount, purpose: purpose,
        receivedBy: m.id, receivedName: m.name || '', receipt: IMG.exp || '', at: serverTimestamp()
      });
      IMG.exp = ''; await fxRecalcFinance(); await reload(); say('Expense recorded.');
    } catch (e) { say(e.message); }
  }

  async function fxDelExpense(id) {
    if (!confirm('Delete this expense?')) return;
    try { await deleteDoc(doc(db, 'expenses', id)); await fxRecalcFinance(); await reload(); }
    catch (e) { say(e.message); }
  }

  async function fxAddDonation() {
    const amount = +v('da'), pid = v('dp'), p = S.proj.filter(function (x) { return x._id === pid; })[0];
    const method = v('dm') === 'bank' ? 'bank' : 'cash';
    if (!p || !(amount > 0)) return say('Choose a project and amount.');
    const status = method === 'bank' ? 'waiting' : 'confirmed';
    try {
      await addDoc(collection(db, 'donations'), { donor: v('dn') || 'Anonymous', amount: amount, pid: pid, project: p.title, method: method, status: status, at: serverTimestamp() });
      if (status === 'confirmed') await updateDoc(doc(db, 'projects', pid), { raised: increment(amount) });
      await fxRecalcFinance(); await reload(); say(status === 'waiting' ? 'Saved. It will count once its bank alert is matched.' : 'Donation recorded.');
    } catch (e) { say(e.message); }
  }

  async function fxRecordDues() {
    const id = v('fx_rid').toUpperCase(), m = S.mem.filter(function (x) { return String(x.id).toUpperCase() === id; })[0];
    if (!m) return say('No member with that ID.');
    const plan = fxPlanOf(m), count = parseInt(v('fx_rn'), 10), amount = Number(v('fx_ra'));
    const method = v('fx_rm') === 'bank' ? 'bank' : 'cash';
    if (!(count >= 1) || !(amount > 0)) return say('Enter the number of months or years and the amount.');
    try {
      await addDoc(collection(db, 'dues'), {
        uid: m.uid || m._id, mid: m._id, memberId: m.id, name: m.name, village: m.village || '',
        plan: plan, count: count, months: count * (plan === 'yearly' ? 12 : 1), amount: amount,
        ref: v('fx_rr'), receipt: '', status: method === 'bank' ? 'pending' : 'confirmed',
        method: method, by: 'admin', date: fxToday(), at: serverTimestamp()
      });
      await fxRecalcFinance(); await reload(); say(method === 'bank' ? 'Saved. It counts once its bank alert is matched.' : 'Payment recorded for ' + m.id + '.');
    } catch (e) { say(e.message); }
  }

  const _reviewFin = window.fxReview;
  window.fxReview = async function (id, status) { await _reviewFin(id, status); await fxRecalcFinance(); await reload(); };

  function fxDownloadReceipt(id) {
    const p = (S.fxMine || []).filter(function (x) { return x._id === id; })[0];
    if (!p) return say('Receipt not found.');
    const rows = [['Receipt no.', 'UZR-' + id.slice(-6).toUpperCase()], ['Name', p.name || ''], ['Member ID', p.memberId || ''], ['Amount', naira(p.amount)], ['Covers', p.count + ' ' + (p.plan === 'yearly' ? 'year' : 'month') + (Number(p.count) === 1 ? '' : 's')], ['Reference', p.ref || '-'], ['Date', p.date || ''], ['Status', 'Confirmed']];
    const c = document.createElement('canvas'); c.width = 800; c.height = 560;
    const x = c.getContext('2d');
    const draw = function (logo) {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, 800, 560);
      x.fillStyle = '#0d4a1a'; x.fillRect(0, 0, 800, 120);
      if (logo) { const k = Math.min(90 / logo.width, 90 / logo.height); x.drawImage(logo, 30, 15, logo.width * k, logo.height * k); }
      x.fillStyle = '#7ddc1f'; x.font = 'bold 40px sans-serif'; x.fillText('UZAIRUE', logo ? 140 : 30, 75);
      x.fillStyle = '#0d4a1a'; x.font = 'bold 30px sans-serif'; x.fillText('PAYMENT RECEIPT', 30, 170);
      rows.forEach(function (r, i) {
        const y = 230 + i * 40;
        x.fillStyle = '#5a6b82'; x.font = '20px sans-serif'; x.fillText(r[0], 30, y);
        x.fillStyle = '#0f1b2d'; x.font = 'bold 22px sans-serif'; x.fillText(String(r[1]), 260, y);
      });
      x.fillStyle = '#5a6b82'; x.font = '16px sans-serif'; x.fillText('Thank you for supporting our community.', 30, 540);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png'); a.download = 'receipt-' + (p.memberId || 'uzairue') + '-' + id.slice(-6) + '.png'; a.click();
    };
    if (S.site && S.site.logo) { const img = new Image(); img.onload = function () { draw(img); }; img.onerror = function () { draw(null); }; img.src = S.site.logo; }
    else draw(null);
  }

  function fxAlertsListHtml() {
    if (!S.fxAlerts.length) return '<div class="card mute">No bank alerts yet.</div>';
    return '<div class="grid">' + S.fxAlerts.map(function (a) {
      return '<div class="card"><div class="big">' + naira(a.amount) + '</div><h3>' + esc(a.sender) + '</h3><div class="mute">' + esc(a.date) + '</div><span class="tag ' + (a.matchedTo ? 'a' : '') + '">' + (a.matchedTo ? 'Matched' : 'Not yet matched') + '</span></div>';
    }).join('') + '</div>';
  }

  function fxExpenseListHtml(admin) {
    if (!S.fxExp.length) return '<div class="card mute">No expenses yet.</div>';
    return '<div class="grid">' + S.fxExp.map(function (e) {
      return '<div class="card">' + (imgOk(e.receipt) ? '<img class="thumb" src="' + esc(e.receipt) + '" alt="Receipt">' : '') + '<div class="big">' + naira(e.amount) + '</div><h3>' + esc(e.purpose) + '</h3><div class="mute">' + esc(e.date) + ' · Received by ' + esc(e.receivedName || '') + ' (' + esc(e.receivedBy || '') + ')</div>' + (admin ? '<div class="row"><button class="d" onclick="fxDelExpense(\'' + e._id + '\')">Delete</button></div>' : '') + '</div>';
    }).join('') + '</div>';
  }

  function fxFinancePageHtml() {
    if (!S.user || !S.user.emailVerified) return '<div class="card">Verify your email to see the finances.</div>';
    const f = S.fin || {};
    const cards = [['Donations', naira(f.donations)], ['Projects', naira(f.projects)], ['Dues', naira(f.dues)], ['Bank alerts', naira(f.alerts)], ['Expenses', naira(f.expenses)]].map(function (a) {
      return '<div class="card"><div class="mute">' + a[0] + '</div><div class="big">' + a[1] + '</div></div>';
    }).join('');
    return '<h2>Finance</h2><div class="card"><div class="mute">Community balance</div><div class="fxBig">' + naira(f.balance) + '</div><p class="mute">Money received minus expenses.</p></div><div class="grid" style="margin-top:14px">' + cards + '</div><h2>Bank alerts</h2>' + fxAlertsListHtml() + '<h2>Expenses</h2>' + fxExpenseListHtml(false);
  }

  // --- Helper to render the Alert Cards Grid (Now supports Search filtering)
  function fxAlertCardsHtml() {
    const q = String(S.fxAlertQ || '').toLowerCase();
    const filtered = S.fxAlerts.filter(function(a) {
      if (!q) return true;
      return String(a.date).toLowerCase().includes(q) || String(a.sender).toLowerCase().includes(q) || String(a.amount).includes(q);
    });

    const waiting = [];
    S.fxDon.forEach(function (d) { if (d.status === 'waiting') waiting.push({ key: 'donation:' + d._id, label: 'Donation ' + naira(d.amount) + ' · ' + (d.donor || '') + ' · ' + (d.project || '') }); });
    (S.fxAll || []).forEach(function (p) { if (p.status === 'pending') waiting.push({ key: 'dues:' + p._id, label: 'Dues ' + naira(p.amount) + ' · ' + (p.name || '') + ' · ' + (p.memberId || '') }); });
    const opts = waiting.map(function (w) { return '<option value="' + esc(w.key) + '">' + esc(w.label) + '</option>'; }).join('');

    const alertCards = filtered.map(function (a) {
      const head = '<div class="big">' + naira(a.amount) + '</div><h3>' + esc(a.sender) + '</h3><div class="mute" style="margin-bottom:8px">' + esc(a.date) + '</div>';
      if (a.matchedTo) return '<div class="card">' + head + '<span class="tag a" style="margin-bottom:8px">Matched</span><div class="row"><button class="d" onclick="fxDelAlert(\'' + a._id + '\')">Delete</button></div></div>';
      
      return '<div class="card">' + head + 
        '<label>Match to a waiting payment</label>' +
        '<select id="fxm_' + a._id + '"><option value="">Choose...</option>' + opts + '</select>' +
        '<div class="row" style="gap:8px"><button class="p" onclick="fxMatchAlert(\'' + a._id + '\')">Match</button><button class="d" onclick="fxDelAlert(\'' + a._id + '\')">Delete</button></div>' +
        '</div>';
    }).join('') || '<div class="card mute">No matching alerts found.</div>';
    
    return '<div class="grid">' + alertCards + '</div>';
  }

  function fxRefreshAlerts() {
    const box = $('fx_alert_list');
    if (box) box.innerHTML = fxAlertCardsHtml();
  }

  function fxFinanceAdmin() {
    const pendingCards = (S.fxAll || []).filter(function (p) { return p.status === 'pending'; }).map(function (p) {
      return '<div class="card"><div class="big">' + naira(p.amount) + '</div><h3>' + esc(p.name) + '</h3><div class="mute">' + esc(p.memberId) + ' · ' + esc(p.date || '') + '</div><div class="row"><button onclick="fxConfirmCash(\'' + p._id + '\')">Confirm as cash</button></div></div>';
    }).join('') || '<div class="card mute">No member payments waiting.</div>';

    let pasteBlock = '<div class="card"><h3>Paste a bank alert</h3><p class="mute">Paste a credit alert. Only the amount, date, sender and masked narration are saved. The full text is never stored.</p><textarea id="fxp_text" rows="5">' + esc(S.fxDraft || '') + '</textarea><button class="p" onclick="fxParseAlertDraft()">Read alert</button>';
    if (S.fxDraftParsed) {
      const w = (S.fxDraftParsed.warnings || []);
      pasteBlock += '<div class="card" style="margin-top:14px;border-color:var(--acc)"><h3>Check the details</h3>' + (w.length ? '<div class="msg">' + esc(w.join(' ')) + '</div>' : '<p class="mute">Looks good. Fix any field that is wrong, then tap Save alert.</p>') +
        '<label>Amount (₦)</label><input id="fxp_amount" type="number" value="' + esc(S.fxDraftParsed.amount || '') + '">' +
        '<label>Date</label><input id="fxp_date" type="date" value="' + esc(S.fxDraftParsed.date || '') + '">' +
        '<label>Sender</label><input id="fxp_sender" value="' + esc(S.fxDraftParsed.sender || '') + '">' +
        '<label>Narration (from the pasted text)</label><input readonly value="' + esc(S.fxDraftParsed.narration || '') + '">' +
        '<div class="row"><button class="p" onclick="fxConfirmAlert()">Save alert</button><button onclick="fxCancelAlert()">Cancel</button></div></div>';
    }
    pasteBlock += '</div>';

    return '<div class="row"><button onclick="S.tab=\'dash\';render()">← Back to Admin</button></div><h2>Finance</h2>' + 
      pasteBlock + 
      '<h2>Bank alerts</h2>' +
      '<input placeholder="Search alerts by date, sender, or amount" value="' + esc(S.fxAlertQ) + '" oninput="S.fxAlertQ=this.value;fxRefreshAlerts()" style="margin-bottom:14px">' +
      '<div id="fx_alert_list">' + fxAlertCardsHtml() + '</div>' +
      '<h2>Member payments waiting</h2><div class="grid">' + pendingCards + '</div>' +
      '<div class="card" style="margin-top:14px"><h3>Record an expense</h3>' +
      '<label>Date</label><input id="fxe_date" type="date" value="' + fxToday() + '">' +
      '<label>Amount (₦)</label><input id="fxe_amt" type="number">' +
      '<label>Purpose</label><input id="fxe_purpose">' +
      '<label>Received by (member ID)</label><input id="fxe_who" placeholder="e.g. UCA-0002" autocapitalize="characters">' +
      '<label>Receipt photo (optional)</label><input type="file" accept="image/*" onchange="fxPick(this,\'exp\',800)"><img id="pv_exp" class="pv" style="display:none">' +
      '<button class="p" onclick="fxSaveExpense()">Save expense</button></div>' +
      '<h2>Expenses</h2>' + fxExpenseListHtml(true) +
      '<div class="card" style="margin-top:14px"><h3>Totals</h3><p class="mute">Totals update automatically. Use this if they look out of date.</p><button class="p" style="margin-top:14px" onclick="fxRecalcNow()">Recalculate totals</button></div>';
  }

  const _renderFin = window.render;
  window.render = function () {
    if (S.ready && S.view === 'finance' && (!S.user || !S.user.emailVerified)) S.view = S.user ? 'verify' : 'home';
    _renderFin();
    const app = $('app'); if (!app) return;
    if (S.view === 'finance') app.innerHTML = fxFinancePageHtml();
    if (S.view === 'dues' && S.user && S.user.emailVerified) {
      const paid = (S.fxMine || []).filter(function (p) { return p.status === 'confirmed'; });
      const total = paid.reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
      const receipts = paid.map(function (p) {
        return '<div class="card"><div class="big">' + naira(p.amount) + '</div><div class="mute">' + esc(p.date || '') + (p.ref ? ' · ' + esc(p.ref) : '') + '</div><div class="row"><button onclick="fxDownloadReceipt(\'' + p._id + '\')">Download receipt</button></div></div>';
      }).join('') || '<div class="card mute">No confirmed payments yet.</div>';
      app.insertAdjacentHTML('beforeend', '<h2>Your total paid</h2><div class="card"><div class="big">' + naira(total) + '</div></div><h2>Receipts</h2><div class="grid">' + receipts + '</div>');
    }
  };

  const _navFin = window.nav;
  window.nav = function () {
    _navFin();
    const nav = document.getElementById('nav'); if (!nav || !S.user || !S.user.emailVerified) return;
    const btn = document.createElement('button');
    btn.textContent = 'Finance'; btn.setAttribute('onclick', "go('finance')");
    if (S.view === 'finance') btn.classList.add('on');
    const out = Array.prototype.slice.call(nav.children).filter(function (b) { return (b.getAttribute('onclick') || '').indexOf('out()') >= 0; })[0];
    if (out) nav.insertBefore(btn, out); else nav.appendChild(btn);
  };

  const _adminFin = window.admin;
  window.admin = function () {
    if (isAdmin() && S.tab === 'fxfin') return fxFinanceAdmin();
    let h = _adminFin();
    if (!isAdmin()) return h;
    if (S.tab === 'dash') {
      const tile = '<div class="card tile" onclick="S.tab=\'fxfin\';render();window.scrollTo(0,0)"><div class="ic">🧾</div><h3>Finance</h3><div class="mute">Bank alerts, cash, expenses and balance</div></div>';
      const i = h.lastIndexOf('</div>'); h = h.slice(0, i) + tile + h.slice(i);
    }
    if (S.tab === 'donations') h = h.replace('<button class="p" onclick="addDon()">Record</button>', '<label>Paid by</label><select id="dm"><option value="cash">Cash</option><option value="bank">Bank transfer</option></select><button class="p" onclick="addDon()">Record</button>');
    if (S.tab === 'fxdues') h = h.replace('<button class="p" onclick="fxAdminRecord()">Record payment</button>', '<label>Paid by</label><select id="fx_rm"><option value="cash">Cash</option><option value="bank">Bank transfer</option></select><button class="p" onclick="fxAdminRecord()">Record payment</button>');
    return h;
  };

  Object.assign(window, {
    addDon: fxAddDonation, fxAdminRecord: fxRecordDues, fxParseAlertDraft: fxParseAlertDraft, fxConfirmAlert: fxConfirmAlert, fxCancelAlert: fxCancelAlert,
    fxMatchAlert: fxMatchAlert, fxDelAlert: fxDelAlert, fxConfirmCash: fxConfirmCash, fxSaveExpense: fxSaveExpense, fxDelExpense: fxDelExpense,
    fxRecalcNow: fxRecalcNow, fxDownloadReceipt: fxDownloadReceipt, fxRefreshAlerts: fxRefreshAlerts
  });

  [
    ['addDon', 'Recording...'], ['fxAdminRecord', 'Recording...'], ['fxConfirmAlert', 'Saving...'], ['fxMatchAlert', 'Matching...'],
    ['fxDelAlert', 'Deleting...'], ['fxConfirmCash', 'Saving...'], ['fxSaveExpense', 'Saving...'], ['fxDelExpense', 'Deleting...'], ['fxRecalcNow', 'Updating...']
  ].forEach(function (pair) { window[pair[0]] = busyWrap(window[pair[0]], pair[1]); });

  // ------------------------------------------------------------
  // SECTION: Hook-up and start
  // ------------------------------------------------------------
  Object.assign(window, { fxPick: fxPick, fxAddNews: fxAddNews, fxAddProject: fxAddProject, fxEditAcct: fxEditAcct, fxSaveLogo: fxSaveLogo, fxSaveDonate: fxSaveDonate, fxDonate: fxDonate, fxCloseDonate: fxCloseDonate, fxCopy: fxCopy, fxScan: fxScan, fxSaveAbout: fxSaveAbout });
  [['fxAddNews', 'Publishing...'], ['fxAddProject', 'Creating...'], ['fxSaveLogo', 'Saving...'], ['fxSaveDonate', 'Saving...'], ['fxEditAcct', 'Saving...'], ['fxSaveAbout', 'Saving...']].forEach(function (a) { window[a[0]] = busyWrap(window[a[0]], a[1]); });
  if (S.ready) reload();
})();
