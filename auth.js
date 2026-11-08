// Login, sign-up and email verification.
// ------------------------------------------------------------
// SECTION: Login page
// What it does: Draws the email and password form with a link to create an account.
// ------------------------------------------------------------
const login=()=>'<div class="card narrow"><h3>Log in</h3><label>Email</label><input id="le" type="email"><label>Password</label><input id="lp" type="password"><button class="p" onclick="doLogin()">Log in</button> <button onclick="go(\'signup\')">Create account</button></div>';
// ------------------------------------------------------------
// SECTION: Sign-up page
// What it does: Draws the registration form: name, email (required), password, mobile,
//    Address, village and photo.
// ------------------------------------------------------------
const signup=()=>'<div class="card narrow"><h3>Join UZAIRUE</h3><label>Full name</label><input id="sn"><label>Email (required)</label><input id="se" type="email"><label>Password (6+ characters)</label><input id="sp" type="password"><label>Mobile number</label><input id="sm" type="tel"><label>address</label><input id="sh"><label>Village</label><select id="sv">'+vopts()+'</select><label>Profile photo</label><input type="file" accept="image/*" onchange="pick(this)"><button class="p" onclick="doSignup()">Create account</button></div>';
// ------------------------------------------------------------
// SECTION: Action: log in
// What it does: Signs in with the typed email and password through Firebase. Shows an error
//    message if they are wrong.
// ------------------------------------------------------------
async function doLogin(){try{await signInWithEmailAndPassword(auth,v('le'),$('lp').value);S.view='home';S.msg=''}catch(e){say('Login failed: check your email and password.')}}
// ------------------------------------------------------------
// SECTION: Action: sign up
// What it does: Creates the Firebase account, gives the member the next ID, saves their
//    details, emails a verification link and opens the verify page.
// ------------------------------------------------------------
async function doSignup(){
  const n=v('sn'),e=v('se'),p=$('sp').value;
  if(!n||!e||p.length<6)return say('Name, email and a 6+ character password are required.');
  try{const c=await createUserWithEmailAndPassword(auth,e,p),id=await nextId();
    await setDoc(doc(db,'members',c.user.uid),{id,name:n,email:e,phone:v('sm'),address:v('sh'),village:v('sv'),role:'member',status:'active',img:S.img,createdAt:serverTimestamp()});
    S.me={_id:c.user.uid,id,name:n,email:e,phone:v('sm'),address:v('sh'),village:v('sv'),role:'member',status:'active',img:S.img};try{await sendEmailVerification(c.user)}catch(e){}S.img='';S.view='verify';S.msg='Account created. We sent a verification link to your email.';await loadPub();render()}catch(x){say(x.message)}}
// ------------------------------------------------------------
// SECTION: Action: log out
// What it does: Signs the member out and returns to Home.
// ------------------------------------------------------------
async function out(){await signOut(auth);S.view='home'}

// ------------------------------------------------------------
// SECTION: Verify-email page
// What it does: Tells a new member to open the link we emailed. Has Resend and "I've
//    verified" buttons. Members-only pages stay locked until verified.
// ------------------------------------------------------------
const verify=()=>!S.user?login():'<div class="card narrow"><h3>Verify your email</h3><p>We sent a link to <b>'+esc(S.user.email)+'</b>. Tap it, then come back and press the button below.</p><div class="row"><button class="p" onclick="checkVerified()">I’ve verified</button><button onclick="resendVerify()">Resend email</button></div><p class="mute">Check your spam folder if you don’t see it.</p></div>';
// ------------------------------------------------------------
// SECTION: Action: resend verification email
// What it does: Sends the verification email again.
// ------------------------------------------------------------
async function resendVerify(){try{await sendEmailVerification(auth.currentUser);say('Verification email sent.')}catch(e){say('Please wait a moment before asking for another email.')}}
// ------------------------------------------------------------
// SECTION: Action: check verification
// What it does: Refreshes the member's sign-in status and reloads the app so the unlocked
//    pages appear.
// ------------------------------------------------------------
async function checkVerified(){await auth.currentUser.reload();await auth.currentUser.getIdToken(true);location.reload()}
