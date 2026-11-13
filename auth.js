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
// ------------------------------------------------------------
async function doLogin(){
  try{
    await signInWithEmailAndPassword(auth, v('le'), $('lp').value);
    S.view = 'home';
    S.msg = '';
    // app.js onAuthStateChanged handles the render automatically
  } catch(e){
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
