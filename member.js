// Member profile page and the downloadable ID card.
// ------------------------------------------------------------
// SECTION: Profile page
// What it does: Shows the member's photo, ID, village,address and contact details,
//    their digital ID card and a photo-change field. Admins also use it to view another
//    member's card.
// ------------------------------------------------------------
// SECTION: Profile page
// ------------------------------------------------------------
function profile(){
  const m = S.card || S.me;
  if(!m) return '<div class="card">Your profile is not available.</div>';

  const t = titleOf(m);
  const isPaid = !!m.idFeePaid;
  
  // If not paid, and not viewed by an admin (S.card is empty)
  const isLocked = !isPaid && !S.card;

  return '<div class="card" style="display:flex;gap:14px;align-items:center">'
    + av(m)
    + '<div><h3>' + esc(m.name) + '</h3>'
    + (t ? '<span class="tag a">' + esc(t) + '</span> ' : '')
    + '<div class="big">' + esc(m.id) + '</div>'
    + '<div class="mute">' + esc(m.village) + ' · Address ' + esc(m.house || '-') + '</div>'
    + '<div class="mute">' + esc(m.phone || '') + ' ' + esc(m.email || '') + '</div>'
    + '</div></div>'
    
    + '<h2>Digital ID card</h2>'
    
    + (isLocked 
        ? '<div class="card" style="text-align:center; padding: 40px 20px; border-color: var(--bad)">'
          + '<h3 style="color:var(--bad)">🔒 ID Card Locked</h3>'
          + '<p class="mute">Your official ID card is locked. Pay the one-time ID fee to the community account to unlock it.</p>'
          + '<button class="p" onclick="fxPayIdFee()" style="margin-top:10px">Pay Now</button>'
          + '</div>'
        : '<canvas id="cv"></canvas>'
          + '<div class="row">'
          + '<button class="p" onclick="dl()">Download ID</button>'
          + '<button onclick="S.cardFlipped = !S.cardFlipped; render();">Flip Card 🔄</button>'
          + '</div>'
      )

    + (S.card ? '' : '<h2>Update photo</h2><input type="file" accept="image/*" onchange="pick(this)">');
}

// ------------------------------------------------------------
// SECTION: Pay ID Fee Modal
// ------------------------------------------------------------
function fxPayIdFee() {
  const m = S.me;
  if(!m) return;
  
  // Reuse your existing fxDonate modal by passing a custom title
  fxCloseDonate();
  const modal = document.createElement('div'); 
  modal.className = 'modal'; 
  modal.id = 'donModal';
  modal.onclick = function (e) { if (e.target === modal) fxCloseDonate(); };
  
  modal.innerHTML = '<div class="card">'
    + '<h3>Pay ID Fee</h3>'
    + '<p class="mute">Send the one-time fee to the community account below. Once the admin confirms your payment, your ID card will unlock automatically.</p>' 
    + acctHtml(acctOf(null)) 
    + '<div class="row"><button onclick="fxCloseDonate()">Close</button></div></div>';
    
  document.body.appendChild(modal);
}

// ------------------------------------------------------------
// SECTION: Action: download ID
// ------------------------------------------------------------
function dl(){
  const c = $('cv');
  if(!c) return; // Safety check
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = ((S.card || S.me).id || 'ID') + (S.cardFlipped ? '-back' : '-front') + '.png';
  a.click();
}

// ------------------------------------------------------------
// SECTION: ID card drawing
// What it does: Paints the ID card on a canvas: name, ID, village, address, phone, title,
//    status, photo and a faint watermark. Always dark so every card looks the same.
// ------------------------------------------------------------
function drawCard(m, id){
  const c = $(id);
  if(!c) return;

  const x = c.getContext('2d'),
        W = c.width = 640,
        H = c.height = 400,
        t = titleOf(m);

  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#08182f');
  g.addColorStop(1, '#1e1042');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  x.strokeStyle = '#00e5ff';
  x.lineWidth = 3;
  x.strokeRect(8, 8, W - 16, H - 16);

  x.save();
  x.globalAlpha = .07;
  x.translate(W / 2, H / 2);
  x.rotate(-.4);
  x.fillStyle = '#00e5ff';
  x.font = 'bold 96px sans-serif';
  x.textAlign = 'center';
  x.fillText('UZAIRUE', 0, 30);
  x.restore();

  x.textAlign = 'left';
  x.fillStyle = '#00e5ff';
  x.font = 'bold 26px sans-serif';
  x.fillText('UZAIRUE MEMBER', 30, 56);

  x.fillStyle = '#fff';
  x.font = 'bold 34px sans-serif';
  x.fillText(m.name || '', 210, 160);

  x.font = 'bold 26px monospace';
  x.fillStyle = '#7df9ff';
  x.fillText(m.id || '', 210, 205);

  x.font = '20px sans-serif';
  x.fillStyle = '#cfe';
  x.fillText('Village/Town: ' + (m.village || ''), 210, 245);
  x.fillText('Address: ' + (m.house || '-'), 210, 275);
  x.fillText('Phone: ' + (m.phone || '-'), 210, 305);

  if(t){
    x.fillStyle = '#ffd166';
    x.fillText(t, 210, 335);
  }

  x.fillStyle = m.status === 'revoked' ? '#ff6b6b' : '#4cffa6';
  x.font = 'bold 20px sans-serif';
  x.fillText(m.status === 'revoked' ? 'REVOKED' : 'ACTIVE', 210, 372);

  x.fillStyle = '#16284a';
  x.fillRect(30, 110, 150, 150);

  if(m.img){
    const i = new Image();
    i.onload = () => x.drawImage(i, 30, 110, 150, 150);
    i.src = m.img;
  } else {
    x.fillStyle = '#7df9ff';
    x.font = 'bold 70px sans-serif';
    x.textAlign = 'center';
    x.fillText((m.name || '?')[0], 105, 215);
  }
}

// ------------------------------------------------------------
// SECTION: Action: download ID
// What it does: Saves the drawn card as a PNG image named after the member ID.
// ------------------------------------------------------------
//function dl(){
  //const c = $('cv'),
    //    a = document.createElement('a');
  //a.href = c.toDataURL('image/png');
 // a.download = ((S.card || S.me).id || 'ID') + '.png';
//  a.click();
//}
