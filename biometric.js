// ------------------------------------------------------------
// BIOMETRIC SECURITY (Fingerprint / Face ID)
// ------------------------------------------------------------

// Check if the device supports biometrics
async function checkBioSupport() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) {
    return false;
  }
}

// Convert string to ArrayBuffer (required by WebAuthn)
function strToBuf(str) {
  return new Uint8Array([...str].map(c => c.charCodeAt(0)));
}

// REGISTER: Ask the user to enable fingerprint after they log in
async function setupBiometrics() {
  if (!(await checkBioSupport())) {
    return say('Your device does not support fingerprint or Face ID.');
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Prompt the phone to scan the finger
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: "UZAIRUE KINGDOM" },
        user: {
          id: strToBuf(S.me.id),
          name: S.me.email,
          displayName: S.me.name
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    if (credential) {
      // Save the credential ID to the phone's local storage
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

// AUTHENTICATE: Ask the user for fingerprint to unlock the app
async function unlockWithBiometrics() {
  const credId = localStorage.getItem('uzairue_bio_id');
  if (!credId) return false;

  try {
    // Convert saved string back to ArrayBuffer
    const rawId = new Uint8Array([...atob(credId)].map(c => c.charCodeAt(0)));
    
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Prompt the phone to scan the finger
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
      // If the session is still alive, just unlock the UI.
      if (auth.currentUser) {
        document.getElementById('bio-lock-screen').remove();
        return true;
      } else {
        // If session expired, tell them to log in manually
        say('Session expired. Please log in with your email and password.');
        localStorage.removeItem('uzairue_bio_id');
        localStorage.removeItem('uzairue_bio_email');
        location.reload();
      }
    }
  } catch (err) {
    console.error(err);
    say('Fingerprint scan failed or cancelled.');
  }
  return false;
}

// DISABLE: Turn off fingerprint login
function disableBiometrics() {
  localStorage.removeItem('uzairue_bio_id');
  localStorage.removeItem('uzairue_bio_email');
  say('Fingerprint login disabled.');
  render();
}
