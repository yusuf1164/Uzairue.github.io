// ------------------------------------------------------------
// BIOMETRIC SECURITY (Fingerprint / Face ID)
// ------------------------------------------------------------

async function checkBioSupport() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) {
    return false;
  }
}

function strToBuf(str) {
  return new Uint8Array([...str].map(c => c.charCodeAt(0)));
}

// 1. Setup: Ask for password and save it securely
async function setupBiometrics() {
  if (!(await checkBioSupport())) {
    return say('Your device does not support fingerprint or Face ID.');
  }

  // Ask the user to confirm their password so we can save it for the background login
  const pwd = prompt('To enable fingerprint login, please type your password one last time:');
  if (!pwd) return;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: "UZAIRUE KINGDOM" },
        user: {
          id: strToBuf(S.me.id),
          name: S.me.email,
          displayName: S.me.name
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    if (credential) {
      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem('uzairue_bio_id', credId);
      localStorage.setItem('uzairue_bio_email', S.me.email);
      localStorage.setItem('uzairue_bio_pwd', pwd); // SAVE PASSWORD LOCALLY
      
      say('Fingerprint login enabled successfully!');
      render();
    }
  } catch (err) {
    console.error(err);
    say('Setup cancelled or failed.');
  }
}

// 2. Login: Scan finger, then use the saved password in the background
async function loginWithBiometrics() {
  const credId = localStorage.getItem('uzairue_bio_id');
  const savedEmail = localStorage.getItem('uzairue_bio_email');
  const savedPwd = localStorage.getItem('uzairue_bio_pwd');
  
  if (!credId || !savedEmail || !savedPwd) {
    return say('Fingerprint setup is incomplete. Please log in with your password.');
  }

  try {
    const rawId = new Uint8Array([...atob(credId)].map(c => c.charCodeAt(0)));
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // 1. Ask for Fingerprint
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{
          id: rawId,
          type: 'public-key',
          transports: ['internal']
        }],
        userVerification: "required",
        timeout: 60000
      }
    });

    if (assertion) {
      // 2. Fingerprint matched! Show loading spinner
      const card = $('le') ? $('le').closest('.card') : null;
      if (card) {
        card.innerHTML = '<div style="text-align:center; padding: 40px 20px;">'
          + '<div class="spinner"></div><h3>Unlocking...</h3>'
          + '<p class="mute">Fingerprint verified.</p></div>';
      }

      // 3. Automatically log into Firebase using the saved password
      try {
        await signInWithEmailAndPassword(auth, savedEmail, savedPwd);
        S.view = 'home';
        S.msg = '';
        await new Promise(r => setTimeout(r, 500)); 
      } catch (error) {
        // If the password was changed, this will fail.
        say('Session expired. Please log in with your password once to refresh.');
        localStorage.removeItem('uzairue_bio_pwd');
        render();
      }
    }
  } catch (err) {
    console.error(err);
    say('Fingerprint scan cancelled.');
  }
}

function disableBiometrics() {
  localStorage.removeItem('uzairue_bio_id');
  localStorage.removeItem('uzairue_bio_email');
  localStorage.removeItem('uzairue_bio_pwd');
  say('Fingerprint login disabled.');
  render();
}
