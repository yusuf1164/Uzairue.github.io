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
  l.innerHTML = (S.site.logo ? '<img src="' + esc(S.site.logo) + '" alt="" style="height:30px;vertical-align:middle;margin-right:8px;border-radius:6px">' : '') + 'UZAIRUE KINGDOM';
}
async function loadSite() {
  if (!cfgOk) return;
  try { const d = await getDoc(doc(db, 'settings', 'site')); S.site = d.exists() ? d.data() : {}; } catch (e) { S.site = {}; }
  applyLogo();
}
const _loadPub = window.loadPub;
window.loadPub = async function () { await _loadPub(); await loadSite(); };

// ------------------------------------------------------------
// SECTION: Image picker (ImgBB Upload)
// ------------------------------------------------------------
const IMG = {};
function fxPick(inp, key, max, png) {
  const f = inp.files[0]; if (!f) return;
  const r = new FileReader();
  
  r.onload = function () {
    const im = new Image();
    
    im.onload = async function () {
      const k = Math.min(1, max / Math.max(im.width, im.height)), 
            w = Math.round(im.width * k), 
            h = Math.round(im.height * k), 
            c = document.createElement('canvas');
            
      c.width = w; c.height = h; 
      c.getContext('2d').drawImage(im, 0, 0, w, h);
      
      const base64 = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.78);
      const base64Data = base64.split(',')[1];
      
      try {
        say('Uploading image...');
        
        const form = new FormData();
        form.append('image', base64Data);

        const res = await fetch('https://api.imgbb.com/1/upload?key=4702c6f22cc6a0ed47c78bb2ea7085b4', {
          method: 'POST',
          body: form
        });
        
        const data = await res.json();
        if(!data.success) throw new Error('Upload failed');

        IMG[key] = data.data.url;
        
        const p = $('pv_' + key); 
        if (p) { 
          p.src = IMG[key]; 
          p.style.display = 'block'; 
        }
        S.msg = ''; 
        render();
        
      } catch(err) {
        console.error("Image upload failed:", err);
        say('Image upload failed. Please try again.');
      }
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
// SECTION: ID card (replaces drawCard)
// What it does: Paints the new card with a smooth map watermark.
// ------------------------------------------------------------
window.drawCard = async function (m, id) {
  const c = $(id); if (!c) return;
  try { await lib(QR_URL); } catch (e) {}
  const W = 1050, H = 600; c.width = W; c.height = H;
  const x = c.getContext('2d');
  
  const MAP_URL = 'map.jpg'; 
  
  const load = function (src) { 
    return new Promise(function (r) { 
      if (!src) return r(null); 
      const i = new Image(); 
      i.crossOrigin = "anonymous"; 
      i.onload = function () { r(i); }; 
      i.onerror = function () { r(null); }; 
      i.src = src; 
    }); 
  };
  
  const imgs = await Promise.all([load((S.site || {}).logo), load(m.img), load(MAP_URL)]);
  const logo = imgs[0], photo = imgs[1], map = imgs[2];
  const LIME = '#7ddc1f', PALE = '#c8f06a';
  
  // --- 1. Base Background Panels ---
  let g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0d4a1a'); g.addColorStop(1, '#16802d'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#0b3d17'; x.beginPath(); x.moveTo(0, 0); x.lineTo(590, 0); x.bezierCurveTo(735, 140, 725, 330, 495, H); x.lineTo(0, H); x.closePath(); x.fill();
  g = x.createLinearGradient(0, 0, 560, H); g.addColorStop(0, '#031a08'); g.addColorStop(1, '#06300f'); x.fillStyle = g;
  x.beginPath(); x.moveTo(0, 0); x.lineTo(565, 0); x.bezierCurveTo(705, 140, 695, 330, 470, H); x.lineTo(0, H); x.closePath(); x.fill();

  // --- 2. Map Watermark (The Magic Trick) ---
  if (map) {
    x.save();
    // 'multiply' blends the dark lines and makes the white background transparent!
    x.globalCompositeOperation = 'multiply'; 
    x.globalAlpha = 0.35; // Adjust this to make the lines darker or lighter (0.1 = very faint, 0.5 = strong)
    
    // Scale to cover the whole card
    const scale = Math.max(W / map.width, H / map.height);
    const mapW = map.width * scale;
    const mapH = map.height * scale;
    const mapX = (W - mapW) / 2;
    const mapY = (H - mapH) / 2;
    
    x.drawImage(map, mapX, mapY, mapW, mapH);
    x.restore();
  }

  // --- 3. Gradient Overlay (Keeps text readable on the left) ---
  const overlay = x.createLinearGradient(0, 0, W, 0);
  overlay.addColorStop(0, 'rgba(11, 61, 23, 0.95)'); 
  overlay.addColorStop(0.45, 'rgba(11, 61, 23, 0.8)'); 
  overlay.addColorStop(0.65, 'rgba(11, 61, 23, 0)');   
  x.fillStyle = overlay;
  x.fillRect(0, 0, W, H);

  // --- 4. Text Details (Left Side) ---
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

  // --- 5. Photo ---
  x.save(); x.beginPath(); x.arc(480, 115, 75, 0, Math.PI * 2); x.closePath(); x.clip();
  x.fillStyle = '#16284a'; x.fillRect(405, 40, 150, 150);
  if (photo) x.drawImage(photo, 405, 40, 150, 150); else { x.fillStyle = LIME; x.font = 'bold 70px sans-serif'; x.textAlign = 'center'; x.fillText((m.name || '?').charAt(0).toUpperCase(), 480, 140); x.textAlign = 'left'; }
  x.restore(); x.strokeStyle = LIME; x.lineWidth = 4; x.beginPath(); x.arc(480, 115, 75, 0, Math.PI * 2); x.stroke();

  // --- 6. Right Panel: Logo and Title ---
  x.textAlign = 'center';
  
  if (logo) { const k = Math.min(230 / logo.width, 200 / logo.height); x.drawImage(logo, 840 - logo.width * k / 2, 55, logo.width * k, logo.height * k); }
  else { x.fillStyle = LIME; x.font = 'bold 36px sans-serif'; x.fillText('UZAIRUE KINGDOM', 840, 100); }
  
  x.fillStyle = LIME; x.font = 'bold 42px sans-serif'; x.fillText('UZAIRUE', 840, 315);
  x.font = 'bold 30px sans-serif'; x.fillText('KINGDOM', 840, 355);
  
  x.fillStyle = PALE; x.font = 'bold 22px sans-serif'; x.fillText('COMMUNITY CARD', 840, 395);

  // --- 7. QR Code ---
  if (window.qrcode && m.id) {
    const q = qrcode(0, 'M'); q.addData('UZAIRUE:' + m.id); q.make();
    const n = q.getModuleCount(), box = 160, pad = 12, cs = (box - pad * 2) / n, qx = 760, qy = 415;
    x.fillStyle = '#ffffff'; rr(x, qx, qy, box, box, 14); x.fillStyle = '#000000';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(qx + pad + k * cs, qy + pad + r * cs, cs + 0.6, cs + 0.6);
  }
};
