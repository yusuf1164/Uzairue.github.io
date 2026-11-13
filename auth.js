// Login, sign-up and email verification.
// ------------------------------------------------------------
// SECTION: Login page
// ------------------------------------------------------------
const login = () =>
  '<div class="card narrow">'
  + '<h3>Log in</h3>'
  + '<label>Email</label><input id="le" type="email">'
  + '<label>Password</label><input id="lp" type="password">'
  + '<button class="p" onclick="doLogin()">Log in</button> '
  + '<button onclick="go(\'signup\')">Create account</button>'
  + '</div>';

// ------------------------------------------------------------
// SECTION: Sign-up page
// ------------------------------------------------------------
const signup = () =>
  '<div class="card narrow">'
  + '<h3>Join UZAIRUE</h3>'
  + '<label>Full name</label><input id="sn">'
  + '<label>Email (required)</label><input id="se" type="email">'
  + '<label>Password (6+ characters)</label><input id="sp" type="password">'
  + '<label>Mobile number</label><input id="sm" type="tel">'
  + '<label>address</label><input id="sh">'
  + '<label>Village</label><select id="sv">' + vopts() + '</select>'
  + '<label>Profile photo</label><input type="file" accept="image/*" onchange="pick(this)">'
  + '<button class="p" onclick="doSignup()">Create account</button>'
  + '</div>';

// ------------------------------------------------------------
// SECTION: Action: log in
// What it does: Signs in with Firebase. Replaces the form with a
//    spinner while it waits for the home page data to load.
// ------------------------------------------------------------
async function doLogin(){
  const email = v('le');
  const pass = $('lp').value;
  
  if(!email || !pass) return say('Please enter your email and password.');

  // 1. Find the login card and replace it with a spinner instantly
  const card = $('le').closest('.card');
  if (card) {
    card.innerHTML = '<div style="text-align:center; padding: 40px 20px;">'
      + '<div class="spinner"></div>'
      + '<h3>Logging in...</h3>'
      + '<p class="mute">Connecting to the community...</p>'
      + '</div>';
  }

  try{
    await signInWithEmailAndPassword(auth, email, pass);
    S.view = 'home';
    S.msg = '';
    // The app will now automatically fetch data and render the Home page.
    // The spinner will stay visible until that process is finished.
  } catch(e){
    // If it fails, 'say' triggers a render which puts the login form back
    say('Login failed: check your email and password.');
  }
}

// ------------------------------------------------------------
// SECTION: Action: sign up
// ------------------------------------------------------------
async function doSignup(){
  const n = v('sn'),
        e = v('se'),
        p = $('sp').value;

  if(!n || !e || p.length < 6)
    return say('Name, email and a 6+ character password are required.');

  try{
    const c  = await createUserWithEmailAndPassword(auth, e, p),
          id = await nextId();

    await setDoc(doc(db, 'members', c.user.uid), {
      id,
      name: n,
      email: e,
      phone: v('sm'),
      address: v('sh'),
      village: v('sv'),
      role: 'member',
      status: 'active',
      img: S.img,
      createdAt: serverTimestamp()
    });

    S.me = {
      _id: c.user.uid,
      id,
      name: n,
      email: e,
      phone: v('sm'),
      address: v('sh'),
      village: v('sv'),
      role: 'member',
      status: 'active',
      img: S.img
    };

    try{
      await sendEmailVerification(c.user);
    } catch(e){}

    S.img = '';
    S.view = 'verify';
    S.msg = 'Account created. We sent a verification link to your email.';
    await loadPub();
    render();
  } catch(x){
    say(x.message);
  }
}

// ------------------------------------------------------------
// SECTION: Action: log out
// ------------------------------------------------------------
async function out(){
  await signOut(auth);
  S.view = 'home';
}

// ------------------------------------------------------------
// SECTION: Verify-email page
// ------------------------------------------------------------
const verify = () =>
  !S.user
    ? login()
    : '<div class="card narrow">'
      + '<h3>Verify your email</h3>'
      + '<p>We sent a link to <b>' + esc(S.user.email) + '</b>. '
        + 'Tap it, then come back and press the button below.</p>'
      + '<div class="row">'
      + '<button class="p" onclick="checkVerified()">I’ve verified</button>'
      + '<button onclick="resendVerify()">Resend email</button>'
      + '</div>'
      + '<p class="mute">Check your spam folder if you don’t see it.</p>'
      + '</div>';

// ------------------------------------------------------------
// SECTION: Action: resend verification email
// ------------------------------------------------------------
async function resendVerify(){
  try{
    await sendEmailVerification(auth.currentUser);
    say('Verification email sent.');
  } catch(e){
    say('Please wait a moment before asking for another email.');
  }
}

// ------------------------------------------------------------
// SECTION: Action: check verification
// ------------------------------------------------------------
async function checkVerified(){
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  location.reload();
}
