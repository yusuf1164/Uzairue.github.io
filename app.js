// Navigation, page rendering and app start-up. Loaded last.

function saveSession(){
  try{
    localStorage.setItem('uzairue_session', JSON.stringify({
      view: S.view, tab: S.tab, sec: S.sec || '', y: window.scrollY || 0
    }));
  } catch(e){}
}

try{
  const r = JSON.parse(localStorage.getItem('uzairue_session') || '{}');
  if(r.view) S.view = r.view;
  if(r.tab)  S.tab  = r.tab;
  S.sec = r.sec || '';
  S.y   = r.y   || 0;
} catch(e){}

// ------------------------------------------------------------
// SECTION: Top navigation (with Notification Bell)
// ------------------------------------------------------------
function nav(){
  let h = '<button onclick="go(\'home\')">Home</button>'
        + '<button onclick="jump(\'news\')">News</button>'
        + '<button onclick="jump(\'projects\')">Projects</button>'
        + '<button onclick="jump(\'donate\')">Donate</button>';

  if(!S.user){
    h += '<button class="p" onclick="go(\'login\')">Sign up / Log in</button>';
  } else if(!S.user.emailVerified){
    h += '<button class="p" onclick="go(\'verify\')">Verify email</button>'
      + '<button onclick="out()">Log out</button>';
  } else {
    h += '<button onclick="go(\'council\')">Council</button>'
      + '<button onclick="go(\'me\')">My profile</button>';
      
    if(isAdmin()){
      const alerts = (S.pendingDuesCount || 0) + (S.unpaidIdCount || 0);
      const badge = alerts > 0 ? '<span style="background:var(--bad);color:#fff;border-radius:99px;padding:2px 7px;font-size:12px;margin-left:6px;font-weight:bold">' + alerts + '</span>' : '';
      h += '<button onclick="go(\'admin\')">Admin 🔔' + badge + '</button>';
    }
    
    h += '<button onclick="out()">Log out</button>';
  }

  $('nav').innerHTML = h;

  const cur = S.view === 'home' ? (S.sec || 'home') : S.view;

  [...$('nav').children].forEach(b => {
    const m = (b.getAttribute('onclick') || '').match(/'(\w+)'/);
    const k = m ? m[1] : (b.textContent.includes('Log in') ? 'login' : '');
    if(k === cur || (cur === 'signup' && k === 'login'))
      b.classList.add('on');
  });
}

// ------------------------------------------------------------
// SECTION: Page renderer
// ------------------------------------------------------------
function render(){
  if(S.ready){
    if(!S.user && ['me', 'council', 'admin', 'verify'].includes(S.view))
      S.view = 'home';
    if(S.user && ['login', 'signup'].includes(S.view))
      S.view = 'home';
  }

  if(S.user && !S.user.emailVerified && ['me', 'council', 'admin'].includes(S.view))
    S.view = 'verify';

  nav();

  let h = S.msg ? '<div class="msg">' + esc(S.msg) + '</div>' : '';

  if(!cfgOk)
    h += '<div class="card"><h3>Setup needed</h3><p>Paste your Firebase config into <b>index.html</b> (see the setup steps), then reload.</p></div>';

  const V = { home, login, signup, verify, council, me: profile, admin };
  h += (V[S.view] || home)();

  $('app').innerHTML = h;

  // Only draw the ID card if it exists on the page (Front or Back)
  if(S.view === 'me' && (S.card || S.me)) {
    if($('cv')) drawCard(S.card || S.me, 'cv');
  }

  if(S.y){
    const y = S.y;
    S.y = 0;
    setTimeout(() => window.scrollTo(0, y), 60);
  } else if(S.view === 'login' || S.view === 'signup' || S.view === 'home'){
    window.scrollTo(0, 0);
  }

  saveSession();
}

window.addEventListener('scroll', () => {
  clearTimeout(window._st);
  window._st = setTimeout(saveSession, 250);

  if(S.view !== 'home') return;

  let k = '';
  for(const id of ['news', 'projects', 'donate']){
    const e = $(id);
    if(e && e.getBoundingClientRect().top < 120)
      k = id;
  }

  if(k !== (S.sec || '')){
    S.sec = k;
    nav();
  }
}, { passive: true });

Object.assign(window, {
  S, go, jump, out, doLogin, doSignup, resendVerify, checkVerified,
  lookupId, submitMember, pick, dl, memCards, addMember, addSimple,
  addCouncil, addDon, editTarget, del, toggle, reissue, showCard,
  render, $, v, ok, serverTimestamp
});

const BUSY = {
  doLogin: 'Logging in...',
  doSignup: 'Creating account...',
  out: 'Logging out...',
  resendVerify: 'Sending...',
  checkVerified: 'Checking...',
  addSimple: 'Adding...',
  addCouncil: 'Adding...',
  addDon: 'Recording...',
  editTarget: 'Saving...',
  del: 'Deleting...',
  toggle: 'Updating...',
  reissue: 'Re-issuing...',
  submitMember: () => S.editId ? 'Saving...' : 'Registering...'
};

function busyWrap(fn, label){
  return async function(){
    const e = window.event,
          b = e && e.currentTarget && e.currentTarget.tagName === 'BUTTON' ? e.currentTarget : null,
          t = b ? b.textContent : '';

    if(b){
      if(b.disabled) return;
      b.disabled = true;
      b.textContent = typeof label === 'function' ? label() : label;
    }

    try{
      return await fn.apply(this, arguments);
    } finally {
      if(b && b.isConnected){
        b.disabled = false;
        b.textContent = t;
      }
    }
  };
}

Object.keys(BUSY).forEach(n => {
  if(typeof window[n] === 'function')
    window[n] = busyWrap(window[n], BUSY[n]);
});

if(cfgOk){
  onAuthStateChanged(auth, async u => {
    S.ready = true;
    S.user  = u;
    S.me    = null;

    if(u && u.emailVerified){
      try{
        const d = await getDoc(doc(db, 'members', u.uid));
        if(d.exists()) S.me = { _id: d.id, ...d.data() };
      } catch(e){}
    }

    await reload();
    
    // Hide the loading spinner once the app is ready
    const loader = document.getElementById('loading-screen');
    if(loader) loader.remove();
  });
} else {
  const loader = document.getElementById('loading-screen');
  if(loader) loader.remove();
  render();
}
