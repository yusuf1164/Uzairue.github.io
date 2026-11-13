// Shared state, small helpers and Firebase data loading.
// ------------------------------------------------------------
// SECTION: Config check
// What it does: Checks whether config.js still holds the placeholder keys. If so, the app
//    shows a "Setup needed" notice instead of connecting.
// ------------------------------------------------------------
const cfgOk = !String(window.FIREBASE_CONFIG.apiKey).startsWith('YOUR');

// ------------------------------------------------------------
// SECTION: Firebase tools
// What it does: Pulls the Firebase functions (login, database read and write) shared by
//    firebase.js into short names used across the app.
// ------------------------------------------------------------
const {
  auth,
  db,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  orderBy,
  increment,
  serverTimestamp
} = FB;

// ------------------------------------------------------------
// SECTION: Helper: get element
// What it does: Short for document.getElementById.
// ------------------------------------------------------------
const $ = id => document.getElementById(id);

// ------------------------------------------------------------
// SECTION: Helper: read input
// What it does: Returns the trimmed text typed into an input box, found by its id.
// ------------------------------------------------------------
const v = id => ($(id)?.value || '').trim();

// ------------------------------------------------------------
// SECTION: Helper: escape text
// What it does: Makes typed text safe to show on the page so it cannot inject HTML.
// ------------------------------------------------------------
const esc = s =>
  String(s == null ? '' : s).replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );

// ------------------------------------------------------------
// SECTION: Helper: safe links
// What it does: Lets through only web addresses starting with http:// or https://; anything
//    else becomes blank.
// ------------------------------------------------------------
const ok = u => /^https?:\/\//i.test(u) ? u : '';

// ------------------------------------------------------------
// SECTION: App state
// What it does: One object holding what the app currently knows: who is logged in, the
//    current page, and the lists loaded from the database.
// ------------------------------------------------------------
const S = {
  user:  null,
  me:    null,
  view:  'home',
  tab:   'dash',
  vil:   [],
  news:  [],
  proj:  [],
  coun:  [],
  mem:   [],
  don:   [],
  q:     '',
  vf:    '',
  msg:   '',
  img:   '',
  card:  null
};

// ------------------------------------------------------------
// SECTION: Helper: admin check
// What it does: True when the logged-in member has the admin role.
// ------------------------------------------------------------
const isAdmin = () => S.me && S.me.role === 'admin';

// ------------------------------------------------------------
// SECTION: Helper: show message
// What it does: Stores a message to show in a box at the top of the page, then redraws.
// ------------------------------------------------------------
const say = m => { S.msg = m; render(); };

// ------------------------------------------------------------
// SECTION: Navigation: go to a page
// What it does: Switches to another page (view), clears any message and redraws.
// ------------------------------------------------------------
const go = x => { S.view = x; S.msg = ''; S.card = null; S.sec = ''; render(); };

// ------------------------------------------------------------
// SECTION: Navigation: jump to a home section
// What it does: Scrolls to News, Projects or Donate on the home page, going Home first if
//    needed.
// ------------------------------------------------------------
const jump = id => {
  S.sec = id;

  const f = () => $(id) && $(id).scrollIntoView({ behavior: 'smooth' });

  if(S.view === 'home' && !S.msg){
    nav();
    f();
  } else {
    S.view = 'home';
    S.msg = '';
    S.card = null;
    render();
    setTimeout(f, 50);
  }
};

// ------------------------------------------------------------
// SECTION: Data: read a collection
// What it does: Reads all documents of a Firestore collection, optionally sorted by a
//    field. Returns an empty list if reading is not allowed.
// ------------------------------------------------------------
async function list(c, o){
  try{
    const s = await getDocs(
      o ? query(collection(db, c), orderBy(o)) : collection(db, c)
    );
    return s.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch(e){
    return [];
  }
}

// ------------------------------------------------------------
// SECTION: Data: load public content
// What it does: Loads news (newest first), projects, villages (A-Z) and, for logged-in
//    members, the council.
// ------------------------------------------------------------
async function loadPub(){
  if(!cfgOk) return;
  S.news = (await list('news', 'at')).reverse();
  S.proj = await list('projects');
  S.vil  = (await list('villages'))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  S.coun = S.user ? await list('council') : [];
}

// ------------------------------------------------------------
// SECTION: Data: load admin content
// What it does: Loads the full member list and the donation log. Used for admins only.
// ------------------------------------------------------------
async function loadAdmin(){
  S.mem = await list('members', 'createdAt');
  S.don = (await list('donations', 'at')).reverse();
}

// ------------------------------------------------------------
// SECTION: Data: refresh everything
// What it does: Reloads public data (and admin data for admins), then redraws the page.
// ------------------------------------------------------------
async function reload(){
  await loadPub();
  if(isAdmin()) await loadAdmin();
  render();
}

// ------------------------------------------------------------
// SECTION: Member ID generator
// What it does: Adds 1 to a counter in the database and returns the next member ID, such as
//    UCA-0007. Includes a retry loop so it never fails if two people sign up at the same time.
// ------------------------------------------------------------
async function nextId() {
  let attempts = 0;
  
  while (attempts < 5) {
    try {
      return await runTransaction(db, async tx => {
        const r = doc(db, 'meta', 'counter'),
              s = await tx.get(r),
              n = (s.exists() ? s.data().n : 0) + 1;
        tx.set(r, { n });
        return 'UCA-' + String(n).padStart(4, '0');
      });
    } catch (e) {
      // If two people clicked at the exact same second, wait a moment and try again
      attempts++;
      await new Promise(res => setTimeout(res, 500 + Math.random() * 500));
    }
  }
  
  throw new Error("Registration is very busy right now. Please try again in a moment.");
}
// ------------------------------------------------------------
// SECTION: Helper: village dropdown options
// What it does: Builds the village option list (A-Z). Falls back to Jattu when no villages
//    have been added yet.
// ------------------------------------------------------------
const vopts = sel =>
  (S.vil.length ? S.vil.map(x => x.name) : ['Jattu'])
    .map(n => '<option' + (n === sel ? ' selected' : '') + '>' + esc(n) + '</option>')
    .join('');

// ------------------------------------------------------------
// SECTION: Helper: avatar
// What it does: Returns the member photo, or a circle with their first letter when there is
//    no photo.
// ------------------------------------------------------------
const av = m =>
  m.img
    ? '<img class="av" src="' + m.img + '" alt="">'
    : '<div class="av">' + esc((m.name || '?').charAt(0).toUpperCase()) + '</div>';

// ------------------------------------------------------------
// SECTION: Helper: council title
// What it does: Finds the council title (King, Chief, ...) linked to a member ID. Shown on
//    the ID card.
// ------------------------------------------------------------
const titleOf = m => (S.coun.filter(c => c.memberId === m.id)[0] || {}).title || '';

// ------------------------------------------------------------
// SECTION: Helper: progress percent
// What it does: Turns a project's raised and target amounts into a 0-100 percentage.
// ------------------------------------------------------------
const pct = p =>
  p.target > 0
    ? Math.min(100, Math.round((p.raised || 0) / p.target * 100))
    : 0;

// ------------------------------------------------------------
// SECTION: Photo picker
// What it does: Reads a chosen image, crops it square, shrinks it to 160px and keeps it. On
//    the profile page it saves the photo straight away.
// ------------------------------------------------------------
function pick(inp){
  const f = inp.files[0];
  if(!f) return;

  const r = new FileReader();

  r.onload = () => {
    const im = new Image();

    im.onload = () => {
      const c = document.createElement('canvas'),
            m = Math.min(im.width, im.height);

      c.width = c.height = 160;
      c.getContext('2d').drawImage(
        im,
        (im.width - m) / 2, (im.height - m) / 2, m, m,
        0, 0, 160, 160
      );

      S.img = c.toDataURL('image/jpeg', .8);

      if(S.view === 'me' && S.me){
        updateDoc(doc(db, 'members', S.me._id), { img: S.img })
          .then(() => {
            S.me.img = S.img;
            S.img = '';
            render();
          });
      }
    };

    im.src = r.result;
  };

  r.readAsDataURL(f);
}
