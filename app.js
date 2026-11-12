// Navigation, page rendering and app start-up. Loaded last.

// ------------------------------------------------------------
// SECTION: Session memory: save
// What it does: Stores the current page, admin section and scroll position so a refresh can
//    reopen them.
// ------------------------------------------------------------
function saveSession(){
  try{
    localStorage.setItem('uzairue_session', JSON.stringify({
      view: S.view,
      tab: S.tab,
      sec: S.sec || '',
      y: window.scrollY || 0
    }));
  } catch(e){}
}

// ------------------------------------------------------------
// SECTION: Session memory: restore
// What it does: On start-up, reads the saved page, admin section and scroll position back
//    into the app state.
// ------------------------------------------------------------
try{
  const r = JSON.parse(localStorage.getItem('uzairue_session') || '{}');
  if(r.view) S.view = r.view;
  if(r.tab)  S.tab  = r.tab;
  S.sec = r.sec || '';
  S.y   = r.y   || 0;
} catch(e){}

// ------------------------------------------------------------
// SECTION: Top navigation
// What it does: Builds the top buttons for the person's state (logged out, unverified,
//    member, admin) and highlights the current page.
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
    if(isAdmin())
      h += '<button onclick="go(\'admin\')">Admin</button>';
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
// What it does: The main redraw: applies page-access rules, builds the nav and the current
//    page, restores scroll position and saves the session.
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
    h += '<div class="card"><h3>Setup needed</h3>'
      + '<p>Paste your Firebase config into <b>index.html</b> (see the setup steps), then reload.</p>'
      + '</div>';

  const V = { home, login, signup, verify, council, me: profile, admin };
  h += (V[S.view] || home)();

  $('app').innerHTML = h;

  if(S.view === 'me' && (S.card || S.me))
    drawCard(S.card || S.me, 'cv');

  if(S.y){
    const y = S.y;
    S.y = 0;
    setTimeout(() => window.scrollTo(0, y), 60);
  } else if(S.view === 'login' || S.view === 'signup' || S.view === 'home'){
    window.scrollTo(0, 0);
  }

  saveSession();
}

// ------------------------------------------------------------
// SECTION: Scroll listener
// What it does: Saves the scroll position and, on Home, highlights News, Projects or Donate
//    in the nav as each comes into view.
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// SECTION: Expose to buttons
// What it does: Makes functions available to the onclick attributes written in the HTML.
// ------------------------------------------------------------
Object.assign(window, {
  S, go, jump, out, doLogin, doSignup, resendVerify, checkVerified,
  lookupId, submitMember, pick, dl, memCards, addMember, addSimple,
  addCouncil, addDon, editTarget, del, toggle, reissue, showCard,
  render, $, v, ok, serverTimestamp
});

// ------------------------------------------------------------
// SECTION: Button status labels
// What it does: Maps each action to the text its button shows while working (for example
//    "Adding...").
// ------------------------------------------------------------
const BUSY = {
  doLogin:       'Logging in...',
  doSignup:      'Creating account...',
  out:           'Logging out...',
  resendVerify:  'Sending...',
  checkVerified: 'Checking...',
  addSimple:     'Adding...',
  addCouncil:    'Adding...',
  addDon:        'Recording...',
  editTarget:    'Saving...',
  del:           'Deleting...',
  toggle:        'Updating...',
  reissue:       'Re-issuing...',
  submitMember:  () => S.editId ? 'Saving...' : 'Registering...'
};

// ------------------------------------------------------------
// SECTION: Button status wrapper
// What it does: Wraps an action so its button is disabled and shows the working label until
//    the action finishes.
// ------------------------------------------------------------
function busyWrap(fn, label){
  return async function(){
    const e = window.event,
          b = e && e.currentTarget && e.currentTarget.tagName === 'BUTTON'
            ? e.currentTarget
            : null,
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

// ------------------------------------------------------------
// SECTION: Apply status wrappers
// What it does: Wraps every action listed in BUSY.
// ------------------------------------------------------------
Object.keys(BUSY).forEach(n => {
  if(typeof window[n] === 'function')
    window[n] = busyWrap(window[n], BUSY[n]);
});

// ------------------------------------------------------------
// SECTION: App start-up
// What it does: Listens for login changes, loads the data and draws the first page. Without
//    valid config it only draws the setup notice.
// ------------------------------------------------------------
if(cfgOk){
  onAuthStateChanged(auth, async u => {
    S.ready = true;
    S.user  = u;
    S.me    = null;

    if(u && u.emailVerified){
      try{
        const d = await getDoc(doc(db, 'members', u.uid));
        if(d.exists())
          S.me = { _id: d.id, ...d.data() };
      } catch(e){}
    }

    await reload();
    
    // NEW: Hide the loading spinner once everything is loaded
    const loader = document.getElementById('loading-screen');
    if(loader) loader.remove();
  });
} else {
  // NEW: Hide the spinner even if Firebase config is missing
  const loader = document.getElementById('loading-screen');
  if(loader) loader.remove();
  render();
}
