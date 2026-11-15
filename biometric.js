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

async function setupBiometrics() {
  if (!(await checkBioSupport())) {
    return say('Your device does not support fingerprint or Face ID.');
  }

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
      
      say('Fingerprint login enabled successfully!');
      render();
    }
  } catch (err) {
    console.error(err);
    say('Setup cancelled or failed.');
  }
}

// NEW: This triggers when they click the "Login with Fingerprint" button
async function loginWithBiometrics() {
  const credId = localStorage.getItem('uzairue_bio_id');
  const savedEmail = localStorage.getItem('uzairue_bio_email');
  
  if (!credId) return say('No fingerprint saved on this device.');

  try {
    const rawId = new Uint8Array([...atob(credId)].map(c => c.charCodeAt(0)));
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

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
      // Fingerprint matched!
      // If Firebase remembers them, just go home.
      if (auth.currentUser) {
        S.view = 'home';
        render();
      } else {
        // If Firebase session expired, we still can't log them in without a password.
        // So we put their email in the box and ask for the password just this once.
        say('Fingerprint recognized, but session expired. Please enter your password to reconnect.');
        if($('le')) $('le').value = savedEmail || '';
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
  say('Fingerprint login disabled.');
  render();
}
