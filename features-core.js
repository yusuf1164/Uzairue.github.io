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

const imgOk = function (u) { return /^(https?:\/\/|data:image\/)/i.test(u || '') ? u : ''; };
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1600); }
function fxCopy(t) {
  const fb = function () { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); toast('Account number copied'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Account number copied'); }, fb); else fb();
}
function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); x.fill(); }

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

window.drawCard = async function (m, id) {
  const c = $(id); if (!c) return;
  try { await lib(QR_URL); } catch (e) {}
  const W = 1050, H = 600; c.width = W; c.height = H;
  const x = c.getContext('2d');
  const LIME = '#7ddc1f', PALE = '#c8f06a';

  let g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0d4a1a'); g.addColorStop(1, '#16802d'); x.fillStyle = g; x.fillRect(0, 0, W, H);

  if (S.cardFlipped) {
    x.strokeStyle = LIME; x.lineWidth = 4; x.stroke
