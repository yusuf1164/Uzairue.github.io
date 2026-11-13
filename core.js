// Shared state, small helpers and Firebase data loading.
// ------------------------------------------------------------
// SECTION: Config check
// ------------------------------------------------------------
const cfgOk = !String(window.FIREBASE_CONFIG.apiKey).startsWith('YOUR');

// ------------------------------------------------------------
// SECTION: Firebase tools
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
  serverTimestamp,
  limit,
  where,
  getCountFromServer
} = FB;

// ------------------------------------------------------------
// SECTION: Helper: get element
// ------------------------------------------------------------
const $ = id => document.getElementById(id);

// ------------------------------------------------------------
// SECTION: Helper: read input
// ------------------------------------------------------------
const v = id => ($(id)?.value || '').trim();

// ------------------------------------------------------------
// SECTION: Helper: escape text
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
// ------------------------------------------------------------
const ok = u => /^https?:\/\//i.test(u) ? u : '';

// ------------------------------------------------------------
// SECTION: App state
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
  memCount: 0,
  don:   [],
  q:     '',
  vf:    '',
  msg:   '',
  img:   '',
  card:  null
};

// ------------------------------------------------------------
// SECTION: Helper: admin check
// ------------------------------------------------------------
const isAdmin = () => S.me && S.me.role === 'admin';

// ------------------------------------------------------------
// SECTION: Helper: show message
// ------------------------------------------------------------
const say = m => { S.msg = m; render(); };

// ------------------------------------------------------------
// SECTION: Navigation: go to a page
// ------------------------------------------------------------
const go = x => { S.view = x; S.msg = ''; S.card = null; S.sec = ''; render(); };

// ------------------------------------------------------------
// SECTION: Navigation: jump to a home section
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
// SECTION: Data: load admin content (SCALABLE FOR 100k MEMBERS)
// What it does: Asks Firebase for the exact total count (1 read).
//    Downloads only the newest 20 members for the directory.
// ------------------------------------------------------------
async function loadAdmin(){
  try {
    // 1. Get total count directly from the server
    const countSnap = await getCountFromServer(collection(db, 'members'));
    S.memCount = countSnap.data().count;

    // 2. Download only the newest 20 members
    const memQuery = query(collection(db, 'members'), limit(20));
    const memSnap = await getDocs(memQuery);
    
    S.mem = memSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
    // Sort the 20 just in case
    S.mem.sort((a, b) => String(b.id).localeCompare(String(a.id)));

    S.don = (await list('donations', 'at')).reverse();
  } catch(e) {
    console.error("Admin load failed:", e);
  }
}

// ------------------------------------------------------------
// SECTION: Data: refresh everything
// ------------------------------------------------------------
async function reload(){
  await loadPub();
  if(isAdmin()) await loadAdmin();
  render();
}

// ------------------------------------------------------------
// SECTION: Member ID generator
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
      attempts++;
      await new Promise(res => setTimeout(res, 500 + Math.random() * 500));
    }
  }
  throw new Error("Registration is very busy right now. Please try again in a moment.");
}

// ------------------------------------------------------------
// SECTION: Helper: village dropdown options
// ------------------------------------------------------------
const vopts = sel =>
  (S.vil.length ? S.vil.map(x => x.name) : ['Jattu'])
    .map(n => '<option' + (n === sel ? ' selected' : '') + '>' + esc(n) + '</option>')
    .join('');

// ------------------------------------------------------------
// SECTION: Helper: avatar
// ------------------------------------------------------------
const av = m =>
  m.img
    ? '<img class="av" src="' + m.img + '" alt="">'
    : '<div class="av">' + esc((m.name || '?').charAt(0).toUpperCase()) + '</div>';

// ------------------------------------------------------------
// SECTION: Helper: council title
// ------------------------------------------------------------
const titleOf = m => (S.coun.filter(c => c.memberId === m.id)[0] || {}).title || '';

// ------------------------------------------------------------
// SECTION: Helper: progress percent
// ------------------------------------------------------------
const pct = p =>
  p.target > 0
    ? Math.min(100, Math.round((p.raised || 0) / p.target * 100))
    : 0;

// ------------------------------------------------------------
// SECTION: Photo picker
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
