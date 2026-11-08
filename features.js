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
    '.modal{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.6);'
      + 'display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.modal .card{max-width:420px;width:100%}' +
    '.acct{text-align:center;padding:10px 0}' +
    '.pv{max-width:100%;max-height:140px;border-radius:10px;margin:0 0 10px}' +
    '.donimg{width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-bottom:10px}' +
    '.scan{position:fixed;inset:0;z-index:50;background:#000;display:flex;'
      + 'flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#fff;padding:16px}' +
    '.scan video{max-width:100%;max-height:65vh;border-radius:12px}' +
    '.toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);'
      + 'background:var(--acc);color:var(--accink);padding:10px 16px;'
      + 'border-radius:99px;z-index:60;font-weight:600}';
  document.head.appendChild(st);

  // ------------------------------------------------------------
  // SECTION: Library loader
  // What it does: loads the QR code maker (and, on demand, the QR reader)
  // from the jsDelivr CDN one time, and lets other code wait for them.
  // ------------------------------------------------------------
  const QR_URL   = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
  const JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
  const libs = {};

  function lib(url) {
    return libs[url] || (libs[url] = new Promise(function (res, rej) {
      const s = document.createElement('script');
      s.onload = res;
      s.onerror = function () { rej(new Error('Could not load ' + url)); };
      s.src = url;
      document.head.appendChild(s);
    }));
  }

  lib(QR_URL).catch(function () {});

  // ------------------------------------------------------------
  // SECTION: Small helpers
  // What it does: image check, toast message, copy-to-clipboard and a
  // rounded-rectangle painter used by the ID card.
  // ------------------------------------------------------------
  const imgOk = function (u) {
    return /^(https?:\/\/|data:image\/)/i.test(u || '') ? u : '';
  };

  function toast(t) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = t;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 1600);
  }

  function fxCopy(t) {
    const fb = function () {
      const a = document.createElement('textarea');
      a.value = t;
      document.body.appendChild(a);
      a.select();
      try { document.execCommand('copy'); } catch (e) {}
      a.remove();
      toast('Account number copied');
    };

    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(t).then(
        function () { toast('Account number copied'); },
        fb
      );
    else
      fb();
  }

  function rr(x, a, b, w, h, r) {
    x.beginPath();
    x.moveTo(a + r, b);
    x.arcTo(a + w, b, a + w, b + h, r);
    x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r);
    x.arcTo(a, b, a + w, b, r);
    x.closePath();
    x.fill();
  }

  // ------------------------------------------------------------
  // SECTION: Site settings (logo, banner, community account)
  // What it does: reads the settings/site document, shows the logo in the
  // top bar, and refreshes it every time the public data is loaded.
  // ------------------------------------------------------------
  S.site = S.site || {};

  function applyLogo() {
    const l = document.querySelector('.logo');
    if (!l) return;
    l.innerHTML =
      (S.site.logo
        ? '<img src="' + esc(S.site.logo) + '" alt="" '
          + 'style="height:30px;vertical-align:middle;margin-right:8px;border-radius:6px">'
        : '')
      + 'UZAIRUE';
  }

  async function loadSite() {
    if (!cfgOk) return;
    try {
      const d = await getDoc(doc(db, 'settings', 'site'));
      S.site = d.exists() ? d.data() : {};
    } catch (e) {
      S.site = {};
    }
    applyLogo();
  }

  const _loadPub = window.loadPub;
  window.loadPub = async function () {
    await _loadPub();
    await loadSite();
  };

  // ------------------------------------------------------------
  // SECTION: Image picker
  // What it does: reads a chosen image, shrinks it (so it fits in the
  // database), keeps it in IMG under a key and shows a preview.
  // ------------------------------------------------------------
  const IMG = {};

  function fxPick(inp, key, max, png) {
    const f = inp.files[0];
    if (!f) return;

    const r = new FileReader();

    r.onload = function () {
      const im = new Image();

      im.onload = function () {
        const k = Math.min(1, max / Math.max(im.width, im.height)),
              w = Math.round(im.width * k),
              h = Math.round(im.height * k),
              c = document.createElement('canvas');

        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);

        IMG[key] = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.78);

        const p = $('pv_' + key);
        if (p) {
          p.src = IMG[key];
          p.style.display = 'block';
        }
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
  const acctOf = function (p) {
    const s = S.site || {};
    return (p && (p.acct || p.bank))
      ? { bank: p.bank, acct: p.acct, name: p.acctName }
      : { bank: s.bank, acct: s.acct, name: s.acctName };
  };

  function acctHtml(a) {
    if (!a.acct)
      return '<p class="mute">Account details will be added soon.</p>';

    return '<div class="acct">'
      + '<div class="mute">' + esc(a.bank || '') + '</div>'
      + '<div class="big">' + esc(a.acct) + '</div>'
      + '<div>' + esc(a.name || '') + '</div>'
      + '</div>'
      + '<div class="row">'
      + '<button class="p" onclick="fxCopy(\''
        + String(a.acct).replace(/[^\w-]/g, '')
      + '\')">Copy account number</button>'
      + '</div>';
  }

  function fxCloseDonate() {
    const m = document.getElementById('donModal');
    if (m) m.remove();
  }

  function fxDonate(pid) {
    fxCloseDonate();

    const p = pid
      ? S.proj.filter(function (x) { return x._id === pid; })[0]
      : null;

    const m = document.createElement('div');
    m.className = 'modal';
    m.id = 'donModal';
    m.onclick = function (e) { if (e.target === m) fxCloseDonate(); };
    m.innerHTML = '<div class="card">'
      + '<h3>' + (p ? 'Donate to ' + esc(p.title) : 'Support UZAIRUE') + '</h3>'
      + '<p class="mute">Send your gift to this account, then tell us so we can record it.</p>'
      + acctHtml(acctOf(p))
      + '<div class="row"><button onclick="fxCloseDonate()">Close</button></div>'
      + '</div>';
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

    let h = '<div class="hero">'
      + (s.logo
          ? '<img src="' + esc(s.logo) + '" alt="" style="height:64px;margin-bottom:8px">'
          : '')
      + '<h1>UZAIRUE</h1>'
      + '<p>One community, one future. Follow our news, back our projects and join the family.</p>'
      + '<div class="row">'
      + '<button class="p" onclick="fxDonate()">Donate</button>'
      + (S.user ? '' : '<button onclick="go(\'signup\')">Join now</button>')
      + '</div></div>';

    h += '<h2 id="news">Announcements &amp; News</h2><div class="grid">';
    if (!S.news.length)
      h += '<div class="card mute">No news yet.</div>';

    S.news.forEach(function (n) {
      h += '<div class="card">'
        + (imgOk(n.img) ? '<img class="thumb" src="' + esc(n.img) + '" alt="">' : '')
        + '<h3>' + esc(n.title) + '</h3>'
        + '<p>' + esc(n.body) + '</p>'
        + '</div>';
    });

    h += '</div><h2 id="projects">Projects &amp; Progress</h2><div class="grid">';
    if (!S.proj.length)
      h += '<div class="card mute">No projects yet.</div>';

    S.proj.forEach(function (p) {
      h += '<div class="card">'
        + (imgOk(p.img) ? '<img class="thumb" src="' + esc(p.img) + '" alt="">' : '')
        + '<h3>' + esc(p.title) + '</h3>'
        + '<p class="mute">' + esc(p.body) + '</p>'
        + '<div class="bar"><i style="width:' + pct(p) + '%"></i></div>'
        + '<div class="mute">'
          + pct(p) + '% · ₦' + (p.raised || 0).toLocaleString()
          + ' of ₦' + (p.target || 0).toLocaleString()
        + '</div>'
        + '<div class="row">'
        + '<button class="p" onclick="fxDonate(\'' + p._id + '\')">Donate</button>'
        + '</div></div>';
    });

    h += '</div><h2 id="donate">Support the community</h2><div class="card">'
      + (imgOk(s.donImg)
          ? '<img class="donimg" src="' + esc(s.donImg) + '" alt="">'
          : '')
      + '<p>Every contribution moves a project forward.</p>'
      + acctHtml(acctOf(null))
      + '</div>';

    return h;
  };

  // ------------------------------------------------------------
  // SECTION: Admin: News (image upload)
  // What it does: the News section with an image field; shows thumbnails.
  // ------------------------------------------------------------
  const back = '<div class="row"><button onclick="S.tab=\'dash\';render()">← Back to Admin</button></div>';

  function newsAdmin() {
    let h = back
      + '<h2>News</h2>'
      + '<div class="card">'
      + '<h3>Post news</h3>'
      + '<label>Title</label><input id="fn_t">'
      + '<label>Story</label><textarea id="fn_b" rows="3"></textarea>'
      + '<label>Image (optional)</label>'
      + '<input type="file" accept="image/*" onchange="fxPick(this,\'news\',900)">'
      + '<img id="pv_news" class="pv" style="display:none">'
      + '<button class="p" onclick="fxAddNews()">Publish</button>'
      + '</div>'
      + '<div class="grid">';

    S.news.forEach(function (n) {
      h += '<div class="card">'
        + (imgOk(n.img) ? '<img class="thumb" src="' + esc(n.img) + '" alt="">' : '')
        + '<h3>' + esc(n.title) + '</h3>'
        + '<p class="mute">' + esc(n.body) + '</p>'
        + '<button class="d" onclick="del(\'news\',\'' + n._id + '\')">Delete</button>'
        + '</div>';
    });

    return h + '</div>';
  }

  async function fxAddNews() {
    if (!v('fn_t')) return say('Please enter a title.');
    try {
      await addDoc(collection(db, 'news'), {
        title: v('fn_t'),
        body: v('fn_b'),
        img: IMG.news || '',
        at: serverTimestamp()
      });
      IMG.news = '';
      await reload();
    } catch (e) {
      say(e.message);
    }
  }

  // ------------------------------------------------------------
  // SECTION: Admin: Projects (image + bank account)
  // What it does: the Projects section with an image and account fields
  // (bank name, account number, account name) instead of a donation link.
  // ------------------------------------------------------------
  function projectsAdmin() {
    let h = back
      + '<h2>Projects</h2>'
      + '<div class="card">'
      + '<h3>Create project</h3>'
      + '<label>Title</label><input id="fp_t">'
      + '<label>Description</label><textarea id="fp_b" rows="2"></textarea>'
      + '<label>Target amount (₦)</label><input id="fp_g" type="number">'
      + '<label>Image (optional)</label>'
      + '<input type="file" accept="image/*" onchange="fxPick(this,\'proj\',900)">'
      + '<img id="pv_proj" class="pv" style="display:none">'
      + '<label>Bank name (optional, otherwise the community account is used)</label>'
      + '<input id="fp_bank">'
      + '<label>Account number</label><input id="fp_no" inputmode="numeric">'
      + '<label>Account name</label><input id="fp_nm">'
      + '<button class="p" onclick="fxAddProject()">Create</button>'
      + '</div>'
      + '<div class="grid">';

    S.proj.forEach(function (p) {
      h += '<div class="card">'
        + (imgOk(p.img) ? '<img class="thumb" src="' + esc(p.img) + '" alt="">' : '')
        + '<h3>' + esc(p.title) + '</h3>'
        + '<div class="bar"><i style="width:' + pct(p) + '%"></i></div>'
        + '<div class="mute">₦'
          + (p.raised || 0).toLocaleString()
          + ' / ₦' + (p.target || 0).toLocaleString()
        + '</div>'
        + '<div class="mute">'
          + (p.acct
              ? esc((p.bank || '') + ' · ' + p.acct)
              : 'Uses the community account')
        + '</div>'
        + '<div class="row">'
        + '<button onclick="editTarget(\'' + p._id + '\',' + (p.target || 0) + ')">Set target</button>'
        + '<button onclick="fxEditAcct(\'' + p._id + '\')">Account</button>'
        + '<button class="d" onclick="del(\'projects\',\'' + p._id + '\')">Delete</button>'
        + '</div></div>';
    });

    return h + '</div>';
  }

  async function fxAddProject() {
    if (!v('fp_t')) return say('Please enter a title.');
    try {
      await addDoc(collection(db, 'projects'), {
        title: v('fp_t'),
        body: v('fp_b'),
        target: +v('fp_g') || 0,
        raised: 0,
        img: IMG.proj || '',
        bank: v('fp_bank'),
        acct: v('fp_no'),
        acctName: v('fp_nm')
      });
      IMG.proj = '';
      await reload();
    } catch (e) {
      say(e.message);
    }
  }

  async function fxEditAcct(id) {
    const p = S.proj.filter(function (x) { return x._id === id; })[0];
    if (!p) return;

    const b = prompt('Bank name', p.bank || '');
    if (b === null) return;

    const n = prompt('Account number', p.acct || '');
    if (n === null) return;

    const m = prompt('Account name', p.acctName || '');
    if (m === null) return;

    try {
      await updateDoc(doc(db, 'projects', id), {
        bank: b.trim(),
        acct: n.trim(),
        acctName: m.trim()
      });
      await reload();
    } catch (e) {
      say(e.message);
    }
  }

  // ------------------------------------------------------------
  // SECTION: Admin: Logo
  // What it does: lets an admin upload the community logo (kept
  // transparent) and saves it in settings/site.
  // ------------------------------------------------------------
  function logoAdmin() {
    return back
      + '<h2>Logo</h2>'
      + '<div class="card">'
      + '<h3>Community logo</h3>'
      + '<p class="mute">Shown in the top bar, the home banner and the ID card.</p>'
      + (S.site.logo
          ? '<img class="pv" src="' + esc(S.site.logo) + '" alt="" '
            + 'style="background:#fff;padding:6px">'
          : '')
      + '<label>Choose a new logo (a PNG with a clear background works best)</label>'
      + '<input type="file" accept="image/*" onchange="fxPick(this,\'logo\',500,true)">'
      + '<img id="pv_logo" class="pv" style="display:none;background:#fff;padding:6px">'
      + '<button class="p" onclick="fxSaveLogo()">Save logo</button>'
      + '</div>';
  }

  async function fxSaveLogo() {
    if (!IMG.logo) return say('Choose a logo first.');
    try {
      await setDoc(doc(db, 'settings', 'site'), { logo: IMG.logo }, { merge: true });
      IMG.logo = '';
      await reload();
      say('Logo saved.');
    } catch (e) {
      say(e.message);
    }
  }

  // ------------------------------------------------------------
  // SECTION: Admin: Donate page
  // What it does: sets the Donate banner image and the community bank
  // account shown on the home page and in the Donate panel.
  // ------------------------------------------------------------
  function donateAdmin() {
    const s = S.site || {};

    return back
      + '<h2>Donate page</h2>'
      + '<div class="card">'
      + '<h3>Community account</h3>'
      + '<label>Bank name</label>'
      + '<input id="fd_bank" value="' + esc(s.bank || '') + '">'
      + '<label>Account number</label>'
      + '<input id="fd_no" inputmode="numeric" value="' + esc(s.acct || '') + '">'
      + '<label>Account name</label>'
      + '<input id="fd_nm" value="' + esc(s.acctName || '') + '">'
      + '<label>Banner image (optional)</label>'
      + (imgOk(s.donImg)
          ? '<img class="pv" src="' + esc(s.donImg) + '" alt="">'
          : '')
      + '<input type="file" accept="image/*" onchange="fxPick(this,\'don\',1000)">'
      + '<img id="pv_don" class="pv" style="display:none">'
      + '<button class="p" onclick="fxSaveDonate()">Save</button>'
      + '</div>';
  }

  async function fxSaveDonate() {
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        bank: v('fd_bank'),
        acct: v('fd_no'),
        acctName: v('fd_nm'),
        donImg: IMG.don || (S.site || {}).donImg || ''
      }, { merge: true });
      IMG.don = '';
      await reload();
      say('Donate page saved.');
    } catch (e) {
      say(e.message);
    }
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

    if (t === 'news')     return newsAdmin();
    if (t === 'projects') return projectsAdmin();
    if (t === 'logo')     return logoAdmin();
    if (t === 'donate')   return donateAdmin();

    let h = _admin();

    h = h.replace(/<div class="card tile" onclick="S\.tab='settings'[^"]*">.*?<\/div><\/div>/, '');

    if (['members', 'villages', 'council', 'donations'].indexOf(t) < 0) {
      const tile = function (k, ic, ti, d) {
        return '<div class="card tile" onclick="S.tab=\'' + k + '\';render();window.scrollTo(0,0)">'
          + '<div class="ic">' + ic + '</div>'
          + '<h3>' + ti + '</h3>'
          + '<div class="mute">' + d + '</div>'
          + '</div>';
      };

      const i = h.lastIndexOf('</div>');
      h = h.slice(0, i)
        + tile('logo',   '🖼️', 'Logo',        'Community logo for the site and ID card')
        + tile('donate', '🎁', 'Donate page', 'Account details and banner image')
        + h.slice(i);
    }

    if (t === 'members')
      h = h.replace(
        '<label>Email (optional)</label>',
        EXTRA_FIELDS + '<label>Email (optional)</label>'
      );

    if (t === 'members')
      h = h.replace(
        '<button class="p" id="abtn" onclick="submitMember()">Register</button>',
        '<button class="p" id="abtn" onclick="submitMember()">Register</button> '
          + '<button onclick="fxScan()">Scan ID card</button>'
      );

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
    const c = $(id);
    if (!c) return;

    try { await lib(QR_URL); } catch (e) {}

    const W = 1050, H = 600;
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');

    const load = function (src) {
      return new Promise(function (r) {
        if (!src) return r(null);
        const i = new Image();
        i.onload  = function () { r(i); };
        i.onerror = function () { r(null); };
        i.src = src;
      });
    };

    const imgs  = await Promise.all([
      load((S.site || {}).logo),
      load(m.img)
    ]);
    const logo  = imgs[0],
          photo = imgs[1];

    const LIME = '#7ddc1f',
          PALE = '#c8f06a';

    // panels
    let g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0d4a1a');
    g.addColorStop(1, '#16802d');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);

    x.fillStyle = '#0b3d17';
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(590, 0);
    x.bezierCurveTo(735, 140, 725, 330, 495, H);
    x.lineTo(0, H);
    x.closePath();
    x.fill();

    g = x.createLinearGradient(0, 0, 560, H);
    g.addColorStop(0, '#031a08');
    g.addColorStop(1, '#06300f');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(565, 0);
    x.bezierCurveTo(705, 140, 695, 330, 470, H);
    x.lineTo(0, H);
    x.closePath();
    x.fill();

    // faint logo background
    x.save();
    x.globalAlpha = 0.07;
    if (logo) {
      const k = Math.min(700 / logo.width, 520 / logo.height);
      x.drawImage(
        logo,
        525 - logo.width  * k / 2,
        300 - logo.height * k / 2,
        logo.width  * k,
        logo.height * k
      );
    } else {
      x.fillStyle = LIME;
      x.font = 'bold 150px sans-serif';
      x.textAlign = 'center';
      x.fillText('UZAIRUE', 525, 330);
    }
    x.restore();

    // name (wraps to 3 lines), title, divider
    x.textAlign = 'left';
    x.fillStyle = LIME;
    x.font = 'bold 38px sans-serif';
    const lines = [''];
    String(m.name || '').toUpperCase().split(' ').forEach(function (w) {
      const t = (lines[lines.length - 1] + ' ' + w).trim();
      if (x.measureText(t).width > 340 && lines[lines.length - 1])
        lines.push(w);
      else
        lines[lines.length - 1] = t;
    });
    lines.slice(0, 3).forEach(function (l, i) {
      x.fillText(l, 40, 85 + i * 44);
    });

    x.fillStyle = PALE;
    x.font = 'bold 24px sans-serif';
    x.fillText(String((titleOf(m) || 'MEMBER')).toUpperCase(), 40, 215);

    x.fillStyle = '#145a22';
    x.fillRect(40, 238, 500, 3);

    // details (no icons): smaller values so everything fits
    const addr = m.address || m.house || '-',
          age  = ageOf(m.dob);

    const stat = (age !== '' ? age + ' yrs \u00b7 ' : '')
      + (m.status === 'revoked' ? 'REVOKED' : 'ACTIVE');

    const rows = [
      ['MEMBER ID',    m.id       || ''],
      ['VILLAGE/TOWN',      m.village  || ''],
      ['ADDRESS',      addr],
      ['PHONE',        m.phone    || '-'],
      ['OCCUPATION',   m.occupation || '-'],
      ['AGE / STATUS', stat]
    ];

    let ry = 292;
    rows.forEach(function (r) {
      x.fillStyle = LIME;
      x.font = 'bold 16px sans-serif';
      x.fillText(r[0], 40, ry);

      x.fillStyle = (m.status === 'revoked' && r[0] === 'AGE / STATUS')
        ? '#ff6b6b'
        : '#ffffff';
      x.font = '22px sans-serif';

      const ls = wrapText(x, String(r[1]), 300).slice(0, 2);
      ls.forEach(function (l, i) {
        x.fillText(l, 215, ry + i * 26);
      });

      ry += 44 + (ls.length > 1 ? 24 : 0);
    });

    // photo
    x.save();
    x.beginPath();
    x.arc(480, 115, 75, 0, Math.PI * 2);
    x.closePath();
    x.clip();

    x.fillStyle = '#16284a';
    x.fillRect(405, 40, 150, 150);

    if (photo) {
      x.drawImage(photo, 405, 40, 150, 150);
    } else {
      x.fillStyle = LIME;
      x.font = 'bold 70px sans-serif';
      x.textAlign = 'center';
      x.fillText((m.name || '?').charAt(0).toUpperCase(), 480, 140);
      x.textAlign = 'left';
    }
    x.restore();

    x.strokeStyle = LIME;
    x.lineWidth = 4;
    x.beginPath();
    x.arc(480, 115, 75, 0, Math.PI * 2);
    x.stroke();

    // right panel: logo and title
    x.textAlign = 'center';
    if (logo) {
      const k = Math.min(230 / logo.width, 200 / logo.height);
      x.drawImage(
        logo,
        840 - logo.width  * k / 2,
        75,
        logo.width  * k,
        logo.height * k
      );
    } else {
      x.fillStyle = LIME;
      x.font = 'bold 56px sans-serif';
      x.fillText('UZAIRUE', 840, 170);
    }

    x.fillStyle = LIME;
    x.font = 'bold 46px sans-serif';
    x.fillText('UZAIRUE', 840, 335);

    x.fillStyle = PALE;
    x.font = 'bold 32px sans-serif';
    x.fillText('COMMUNITY CARD', 840, 380);

    // QR code (holds the member ID)
    if (window.qrcode && m.id) {
      const q = qrcode(0, 'M');
      q.addData('UZAIRUE:' + m.id);
      q.make();

      const n = q.getModuleCount(),
            box = 190,
            pad = 14,
            cs  = (box - pad * 2) / n,
            qx  = 745,
            qy  = 395;

      x.fillStyle = '#ffffff';
      rr(x, qx, qy, box, box, 14);

      x.fillStyle = '#000000';
      for (let r = 0; r < n; r++)
        for (let k = 0; k < n; k++)
          if (q.isDark(r, k))
            x.fillRect(
              qx + pad + k * cs,
              qy + pad + r * cs,
              cs + 0.6,
              cs + 0.6
            );
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
    const ov = document.createElement('div');
    ov.className = 'scan';
    ov.innerHTML =
      '<video id="scv" playsinline muted></video>'
      + '<div>Point the camera at the QR code on the ID card</div>'
      + '<button class="p" id="scx">Cancel</button>';
    document.body.appendChild(ov);

    let stream = null,
        stop   = false;

    const done = function () {
      stop = true;
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      ov.remove();
    };
    document.getElementById('scx').onclick = done;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
    } catch (e) {
      done
