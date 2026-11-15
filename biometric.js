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

async function unlockWithBiometrics() {
  const credId = localStorage.getItem('uzairue_bio_id');
  if (!credId) return false;

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
      const lockScreen = document.getElementById('bio-lock-screen');
      
      // Check if Firebase session is still alive
      if (auth.currentUser) {
        if (lockScreen) lockScreen.remove();
        return true;
      } else {
        // Fingerprint worked, but Firebase session expired
        say('Session expired. Please log in with your email and password.');
        localStorage.removeItem('uzairue_bio_id');
        localStorage.removeItem('uzairue_bio_email');
        if (lockScreen) lockScreen.remove();
        location.reload(); // Refresh to show login screen
      }
    }
  } catch (err) {
    console.error(err);
    // If they cancel the fingerprint, do nothing, let them try again
  }
  return false;
}

function disableBiometrics() {
  localStorage.removeItem('uzairue_bio_id');
  localStorage.removeItem('uzairue_bio_email');
  say('Fingerprint login disabled.');
  render();
}
