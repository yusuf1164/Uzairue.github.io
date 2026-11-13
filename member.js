// Member profile page and the downloadable ID card.
// ------------------------------------------------------------
// SECTION: Profile page
// What it does: Shows the member's photo, ID, village,address and contact details,
//    their digital ID card and a photo-change field. Admins also use it to view another
//    member's card.
// ------------------------------------------------------------
function profile(){
  const m = S.card || S.me;
  if(!m)
    return '<div class="card">Your profile is not available. If you were registered by an admin without an email, ask the admin to view it for you.</div>';

  const t = titleOf(m);

  return '<h2 style="margin-top:0">Welcome, ' + esc(m.name.split(' ')[0]) + '!</h2>'
  + '<div class="card" style="display:flex;gap:14px;align-items:center">'
  + av(m)
  + '<div><h3>' + esc(m.name) + '</h3>'
  + (t ? '<span class="tag a">' + esc(t) + '</span> ' : '')
  + '<div class="big">' + esc(m.id) + '</div>'
  + '<div class="mute">' + esc(m.village) + ' · Address ' + esc(m.house || '-') + '</div>'
  + '<div class="mute">' + esc(m.phone || '') + ' ' + esc(m.email || '') + '</div>'
  + '</div></div>'
  + '<div class="row" style="justify-content:center; margin-top:14px; margin-bottom:14px">'
  + (S.card ? '' : '<button class="p" onclick="go(\'dues\')">My Dues</button>')
  + '<button onclick="go(\'finance\')">Finance</button>'
  + '<button onclick="go(\'memberlist\')">Directory</button>'
  + '</div>'    
    + '<h2>Digital ID card</h2>'
    + '<canvas id="cv"></canvas>'
    + '<div class="row"><button class="p" onclick="dl()">Download ID</button></div>'
    + (S.card ? '' : '<h2>Update photo</h2><input type="file" accept="image/*" onchange="pick(this)">');
}


// ------------------------------------------------------------
// SECTION: Action: download ID
// What it does: Saves the drawn card as a PNG image named after the member ID.
// ------------------------------------------------------------
function dl(){
  const c = $('cv'),
        a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = ((S.card || S.me).id || 'ID') + '.png';
  a.click();
}
