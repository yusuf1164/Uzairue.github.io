// ------------------------------------------------------------
// FINANCE: BANK ALERTS, CASH, EXPENSES, BALANCE AND RECEIPTS
// (paste above the "SECTION: Hook-up and start" part, after the gifts block)
// What it does:
//   1. Admins paste a credit bank alert. Only the amount, date, sender
//      name and masked narration are saved. Debit alerts are refused.
//      The same alert cannot be saved twice.
//   2. Donations and dues can be Bank or Cash. Cash counts straight
//      away. Bank waits until an admin matches it to an alert.
//   3. Admins record expenses (date, amount, purpose, member who
//      received it, optional receipt photo).
//   4. Finance page (everyone, logged in): balance, donations,
//      projects, dues, bank alerts and expenses.
//      Balance = bank alerts + cash donations + cash dues - expenses.
//   5. Each member can download a receipt for each confirmed payment.
// Totals are saved in settings/finance, so members see the totals
// without seeing other people's names or payments.
// Needs the Firebase rules for "alerts" and "expenses".
// ------------------------------------------------------------

S.fin = S.fin || {};
S.fxAlerts = S.fxAlerts || [];
S.fxExp = S.fxExp || [];
S.fxDon = S.fxDon || [];
S.fxDraft = S.fxDraft || '';
S.fxDraftParsed = S.fxDraftParsed || null;
S.fxAlertQ = S.fxAlertQ || '';

// --- Newest first, by date text (YYYY-MM-DD)
function fxNewestFirst(a, b) {
  return String(b.date || '').localeCompare(String(a.date || ''));
}

// --- Loads the public totals, alerts and expenses for logged-in members
async function fxLoadFinance() {
  if (!cfgOk) {
    return;
  }

  try {
    const f = await getDoc(doc(db, 'settings', 'finance'));

    S.fin = f.exists() ? f.data() : {};
  } catch (e) {
    S.fin = {};
  }

  S.fxAlerts = [];
  S.fxExp = [];

  if (S.user && S.user.emailVerified) {
    try {
      S.fxAlerts = (await list('alerts')).sort(fxNewestFirst);
      S.fxExp = (await list('expenses')).sort(fxNewestFirst);
    } catch (e) {
      S.fxAlerts = [];
      S.fxExp = [];
    }
  }
}

const _loadPubFin = window.loadPub;

window.loadPub = async function () {
  await _loadPubFin();
  await fxLoadFinance();
};

// --- Admin: also load all donations (needed for matching)
const _loadAdminFin = window.loadAdmin;

window.loadAdmin = async function () {
  await _loadAdminFin();
  S.fxDon = await list('donations');
};

// --- Adds up every money card and saves the totals in settings/finance
async function fxRecalcFinance() {
  const dons = await list('donations');
  const dues = await list('dues');
  const alerts = await list('alerts');
  const exps = await list('expenses');
  const projs = await list('projects');

  const sum = function (arr, keep) {
    return arr.filter(keep).reduce(function (s, x) {
      return s + (Number(x.amount) || 0);
    }, 0);
  };

  const bankIn = sum(alerts, function () { return true; });
  const cashDon = sum(dons, function (d) { return d.method === 'cash' && d.status === 'confirmed'; });
  const cashDues = sum(dues, function (p) { return p.method === 'cash' && p.status === 'confirmed'; });
  const expenses = sum(exps, function () { return true; });

  const totals = {
    donations: sum(dons, function (d) { return d.status !== 'waiting'; }),
    dues: sum(dues, function (p) { return p.status === 'confirmed'; }),
    projects: projs.reduce(function (s, p) { return s + (Number(p.raised) || 0); }, 0),
    alerts: bankIn,
    expenses: expenses,
    balance: bankIn + cashDon + cashDues - expenses
  };

  await setDoc(doc(db, 'settings', 'finance'), totals);
  S.fin = totals;
}

// --- Admin: "Recalculate totals" button
async function fxRecalcNow() {
  try {
    await fxRecalcFinance();
    await reload();
    say('Totals updated.');
  } catch (e) {
    say(e.message);
  }
}

// --- Pads a number to two digits (used by date parsing)
function fxPad2(n) {
  n = String(n);
  return n.length < 2 ? '0' + n : n;
}

// --- Reads any common date format → "YYYY-MM-DD" (or '' if unreadable)
function fxParseDate(s) {
  s = String(s || '').trim();
  if (!s) return '';

  // Remove ordinal suffixes like 1st, 2nd, 3rd, 10th
  s = s.replace(/(\d+)(st|nd|rd|th)/gi, '$1');

  // yyyy-mm-dd / yyyy/mm/dd / yyyy.mm.dd
  let m = s.match(/^(\d{4})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})$/);
  if (m) return m[1] + '-' + fxPad2(m[2]) + '-' + fxPad2(m[3]);

  // dd-mm-yyyy / dd/mm/yyyy / dd-mm-yy
  m = s.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})$/);
  if (m) {
    let y = m[3];
    if (y.length === 2) y = (Number(y) < 70 ? '20' : '19') + y;
    return y + '-' + fxPad2(m[2]) + '-' + fxPad2(m[1]);
  }

  // 12-Jun-2026 / 12 Jun 2026 / 12/Jun/2026
  m = s.match(/^(\d{1,2})[\/\-. ]+([A-Za-z]{3,})[\/\-. ,]+(\d{2,4})$/);
  if (m) {
    const mo = MONTH_NAMES.map(function (x) { return x.toLowerCase(); }).indexOf(m[2].slice(0, 3).toLowerCase());
    if (mo >= 0) {
      let y = m[3];
      if (y.length === 2) y = (Number(y) < 70 ? '20' : '19') + y;
      return y + '-' + fxPad2(mo + 1) + '-' + fxPad2(m[1]);
    }
  }

  // Nov 12, 2026 / Nov 12 2026
  m = s.match(/^([A-Za-z]{3,})\s+(\d{1,2})[,\s]+(\d{2,4})$/);
  if (m) {
    const mo = MONTH_NAMES.map(function (x) { return x.toLowerCase(); }).indexOf(m[1].slice(0, 3).toLowerCase());
    if (mo >= 0) {
      let y = m[3];
      if (y.length === 2) y = (Number(y) < 70 ? '20' : '19') + y;
      return y + '-' + fxPad2(mo + 1) + '-' + fxPad2(m[2]);
    }
  }

  return '';
}

// --- Reads a credit alert (any bank / fintech) and returns pre-filled fields.
//     Returns { error } for a debit alert; otherwise returns
//     { amount, date, sender, narration, warnings[] } so the admin
//     can fix any blank or wrong field before saving.
function fxParseAlert(text) {
  const t = String(text || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const warnings = [];

  const credit = /\b(credit|credited|received|CR|transfer\s+from)\b/i.test(t);
  const debit  = /\b(debit|debited|DR|withdrawal|withdrawn|out|transfer\s+to)\b/i.test(t);

  if (debit && !credit) {
    return { error: 'This looks like a debit or withdrawal alert. Only credit alerts can be saved.' };
  }
  if (!credit) {
    warnings.push('No credit keyword found — verify this is an incoming transfer.');
  }

  const amt = t.match(/(?:₦|NGN|N)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
  const amount = amt ? Number(amt[1].replace(/,/g, '')) : 0;
  if (!(amount > 0)) {
    warnings.push('Amount not found — enter it manually.');
  }

  let dm = t.match(/\b([A-Za-z]{3,}\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{2,4})\b/i);
  if (!dm) dm = t.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,}\s*,?\s*\d{2,4})\b/i);
  if (!dm) dm = t.match(/\b(\d{1,2}[\/\-.](?:\d{1,2}|[A-Za-z]{3})[\/\-.]\d{2,4})\b/);
  const date = dm ? fxParseDate(dm[1]) : '';
  if (!date) {
    warnings.push('Date not found — enter it manually.');
  }

  let sender = '';
  const senderMatch = t.match(/(?:from|Name|Sender|Payer)\s*[:\-]?\s*([A-Za-z][A-Za-z .'\-]{1,60}?)(?=\s*(?:Bank|Acct|Account|Amount|Date|Ref|Transaction|on|$))/i);
  if (senderMatch) {
    sender = senderMatch[1].trim();
  } else {
    const beforeAmt = t.substring(0, amt ? amt.index : 100);
    const clean = beforeAmt.replace(/(?:credit|alert|transfer|details|received|from)/gi, '').trim();
    if (clean.length > 2 && clean.length < 40) {
      sender = clean.replace(/[^A-Za-z0-9 .'\-]/g, '').trim();
    }
  }
  sender = sender.replace(/\b(BANK|OPAY|PALMPAY|MONIEPOINT|GTB|ZENITH|ACCESS|UBA|KUDA|CHIPPER|ACCOUNT|NUMBER|TRANSFER|ALERT|VALUE|DATE)\b/gi, '').replace(/\s+/g, ' ').trim().toUpperCase();

  if (!sender) {
    warnings.push('Sender not found — enter it manually.');
  }

  return {
    amount: amount,
    date: date,
    sender: sender,
    narration: t.replace(/\d{4,}/g, '****'),
    warnings: warnings
  };
}

// --- Admin: step 1 — read the pasted alert and show the confirm fields
function fxParseAlertDraft() {
  const raw = $('fxp_text') ? $('fxp_text').value : '';

  if (!raw.trim()) {
    return say('Paste a bank alert first.');
  }

  S.fxDraft = raw;

  const r = fxParseAlert(raw);

  if (r.error) {
    S.fxDraftParsed = null;
    return say(r.error);
  }

  S.fxDraftParsed = r;

  if (r.warnings && r.warnings.length) {
    S.msg = r.warnings.join(' ');
  } else {
    S.msg = 'Looks good — tap Save alert.';
  }

  render();
}

// --- Admin: step 2 — save the (possibly corrected) values
async function fxConfirmAlert() {
  const amount = Number(v('fxp_amount'));
  const date = v('fxp_date');
  const sender = v('fxp_sender');
  const narration = S.fxDraftParsed
    ? S.fxDraftParsed.narration
    : (S.fxDraft || '').replace(/\d{4,}/g, '****');

  if (!(amount > 0)) return say('Enter the amount.');
  if (!date)        return say('Enter the date.');
  if (!sender)      return say('Enter the sender.');

  // FIX: Prevent duplicate alerts by checking Date, Amount, and Sender
  const exists = S.fxAlerts.some(function(a) {
    return a.date === date && Number(a.amount) === amount && a.sender === sender;
  });
  if (exists) {
    return say('An alert with this exact Date, Amount, and Sender is already saved.');
  }

  const key = [date, amount, sender, narration].join('|');
  
  try {
    await addDoc(collection(db, 'alerts'), {
      date: date,
      amount: amount,
      sender: sender,
      narration: narration,
      key: key,
      matchedTo: '',
      at: serverTimestamp()
    });
    S.fxDraft = '';
    S.fxDraftParsed = null;
    await fxRecalcFinance();
    await reload();
    say('Bank alert saved.');
  } catch (e) {
    say(e.message);
  }
}

// --- Admin: cancel the confirm step
function fxCancelAlert() {
  S.fxDraft = '';
  S.fxDraftParsed = null;
  render();
}

// --- Admin: delete an alert
async function fxDelAlert(id) {
  if (!confirm('Delete this bank alert?')) {
    return;
  }
  try {
    await deleteDoc(doc(db, 'alerts', id));
    await fxRecalcFinance();
    await reload();
    say('Alert deleted.');
  } catch (e) {
    say(e.message);
  }
}

// --- Admin: match an alert to a waiting bank donation or a pending dues payment
async function fxMatchAlert(alertId) {
  const box = document.getElementById('fxm_' + alertId);
  const pick = box ? box.value : '';

  if (!pick) {
    return say('Choose the payment to match.');
  }

  const parts = pick.split(':');
  const kind = parts[0];
  const id = parts[1];

  try {
    if (kind === 'donation') {
      const d = S.fxDon.filter(function (x) { return x._id === id; })[0];

      await updateDoc(doc(db, 'donations', id), { status: 'confirmed', method: 'bank' });

      if (d && d.pid) {
        await updateDoc(doc(db, 'projects', d.pid), { raised: increment(Number(d.amount) || 0) });
      }
    } else {
      await updateDoc(doc(db, 'dues', id), { status: 'confirmed', method: 'bank' });
    }

    await updateDoc(doc(db, 'alerts', alertId), { matchedTo: pick });
    await fxRecalcFinance();
    await reload();
    say('Matched.');
  } catch (e) {
    say(e.message);
  }
}

// --- Admin: confirm a member's pending payment as cash
async function fxConfirmCash(id) {
  try {
    await updateDoc(doc(db, 'dues', id), { status: 'confirmed', method: 'cash' });
    await fxRecalcFinance();
    await reload();
  } catch (e) {
    say(e.message);
  }
}

// --- Admin: record an expense
async function fxSaveExpense() {
  const amount = Number(v('fxe_amt'));
  const purpose = v('fxe_purpose');
  const who = v('fxe_who').toUpperCase();
  const m = S.mem.filter(function (x) { return String(x.id).toUpperCase() === who; })[0];

  if (!(amount > 0) || !purpose) {
    return say('Enter the amount and the purpose.');
  }

  if (!m) {
    return say('Enter the ID of the member who received the money.');
  }

  try {
    await addDoc(collection(db, 'expenses'), {
      date: v('fxe_date') || fxToday(),
      amount: amount,
      purpose: purpose,
      receivedBy: m.id,
      receivedName: m.name || '',
      receipt: IMG.exp || '',
      at: serverTimestamp()
    });
    IMG.exp = '';
    await fxRecalcFinance();
    await reload();
    say('Expense recorded.');
  } catch (e) {
    say(e.message);
  }
}

// --- Admin: delete an expense
async function fxDelExpense(id) {
  if (!confirm('Delete this expense?')) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'expenses', id));
    await fxRecalcFinance();
    await reload();
  } catch (e) {
    say(e.message);
  }
}

// --- Donations: Bank waits for a matched alert, Cash counts straight away
async function fxAddDonation() {
  const amount = +v('da');
  const pid = v('dp');
  const p = S.proj.filter(function (x) { return x._id === pid; })[0];
  const method = v('dm') === 'bank' ? 'bank' : 'cash';

  if (!p || !(amount > 0)) {
    return say('Choose a project and amount.');
  }

  const status = method === 'bank' ? 'waiting' : 'confirmed';

  try {
    await addDoc(collection(db, 'donations'), {
      donor: v('dn') || 'Anonymous',
      amount: amount,
      pid: pid,
      project: p.title,
      method: method,
      status: status,
      at: serverTimestamp()
    });

    if (status === 'confirmed') {
      await updateDoc(doc(db, 'projects', pid), { raised: increment(amount) });
    }

    await fxRecalcFinance();
    await reload();
    say(status === 'waiting'
      ? 'Saved. It will count once its bank alert is matched.'
      : 'Donation recorded.');
  } catch (e) {
    say(e.message);
  }
}

// --- Dues recorded by an admin: Bank waits for a matched alert, Cash counts
async function fxRecordDues() {
  const id = v('fx_rid').toUpperCase();
  const m = S.mem.filter(function (x) { return String(x.id).toUpperCase() === id; })[0];

  if (!m) {
    return say('No member with that ID.');
  }

  const plan = fxPlanOf(m);
  const count = parseInt(v('fx_rn'), 10);
  const amount = Number(v('fx_ra'));
  const method = v('fx_rm') === 'bank' ? 'bank' : 'cash';

  if (!(count >= 1) || !(amount > 0)) {
    return say('Enter the number of months or years and the amount.');
  }

  try {
    await addDoc(collection(db, 'dues'), {
      uid: m.uid || m._id,
      mid: m._id,
      memberId: m.id,
      name: m.name,
      village: m.village || '',
      plan: plan,
      count: count,
      months: count * (plan === 'yearly' ? 12 : 1),
      amount: amount,
      ref: v('fx_rr'),
      receipt: '',
      status: method === 'bank' ? 'pending' : 'confirmed',
      method: method,
      by: 'admin',
      date: fxToday(),
      at: serverTimestamp()
    });

    await fxRecalcFinance();
    await reload();
    say(method === 'bank'
      ? 'Saved. It counts once its bank alert is matched.'
      : 'Payment recorded for ' + m.id + '.');
  } catch (e) {
    say(e.message);
  }
}

// --- Keep totals up to date when a dues payment is confirmed or rejected
const _reviewFin = window.fxReview;

window.fxReview = async function (id, status) {
  await _reviewFin(id, status);
  await fxRecalcFinance();
  await reload();
};

// --- Member: receipt image for one confirmed payment
function fxDownloadReceipt(id) {
  const p = (S.fxMine || []).filter(function (x) { return x._id === id; })[0];

  if (!p) {
    return say('Receipt not found.');
  }

  const rows = [
    ['Receipt no.', 'UZR-' + id.slice(-6).toUpperCase()],
    ['Name', p.name || ''],
    ['Member ID', p.memberId || ''],
    ['Amount', naira(p.amount)],
    ['Covers', p.count + ' ' + (p.plan === 'yearly' ? 'year' : 'month') + (Number(p.count) === 1 ? '' : 's')],
    ['Reference', p.ref || '-'],
    ['Date', p.date || ''],
    ['Status', 'Confirmed']
  ];

  const c = document.createElement('canvas');

  c.width = 800;
  c.height = 560;

  const x = c.getContext('2d');

  const draw = function (logo) {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 800, 560);
    x.fillStyle = '#0d4a1a';
    x.fillRect(0, 0, 800, 120);

    if (logo) {
      const k = Math.min(90 / logo.width, 90 / logo.height);

      x.drawImage(logo, 30, 15, logo.width * k, logo.height * k);
    }

    x.fillStyle = '#7ddc1f';
    x.font = 'bold 40px sans-serif';
    x.fillText('UZAIRUE', logo ? 140 : 30, 75);

    x.fillStyle = '#0d4a1a';
    x.font = 'bold 30px sans-serif';
    x.fillText('PAYMENT RECEIPT', 30, 170);

    rows.forEach(function (r, i) {
      const y = 230 + i * 40;

      x.fillStyle = '#5a6b82';
      x.font = '20px sans-serif';
      x.fillText(r[0], 30, y);
      x.fillStyle = '#0f1b2d';
      x.font = 'bold 22px sans-serif';
      x.fillText(String(r[1]), 260, y);
    });

    x.fillStyle = '#5a6b82';
    x.font = '16px sans-serif';
    x.fillText('Thank you for supporting our community.', 30, 540);

    const a = document.createElement('a');

    a.href = c.toDataURL('image/png');
    a.download = 'receipt-' + (p.memberId || 'uzairue') + '-' + id.slice(-6) + '.png';
    a.click();
  };

  if (S.site && S.site.logo) {
    const img = new Image();

    img.onload = function () { draw(img); };
    img.onerror = function () { draw(null); };
    img.src = S.site.logo;
  } else {
    draw(null);
  }
}

// --- Lists of alerts and expenses (shared by members and admins)
function fxAlertsListHtml() {
  if (!S.fxAlerts.length) {
    return '<div class="card mute">No bank alerts yet.</div>';
  }

  return '<div class="grid">' + S.fxAlerts.map(function (a) {
    return '<div class="card">'
      + '<div class="big">' + naira(a.amount) + '</div>'
      + '<h3>' + esc(a.sender) + '</h3>'
      + '<div class="mute">' + esc(a.date) + '</div>'
      + '<span class="tag ' + (a.matchedTo ? 'a' : '') + '">' + (a.matchedTo ? 'Matched' : 'Not yet matched') + '</span>'
      + '</div>';
  }).join('') + '</div>';
}

function fxExpenseListHtml(admin) {
  if (!S.fxExp.length) {
    return '<div class="card mute">No expenses yet.</div>';
  }

  return '<div class="grid">' + S.fxExp.map(function (e) {
    return '<div class="card">'
      + (imgOk(e.receipt) ? '<img class="thumb" src="' + esc(e.receipt) + '" alt="Receipt">' : '')
      + '<div class="big">' + naira(e.amount) + '</div>'
      + '<h3>' + esc(e.purpose) + '</h3>'
      + '<div class="mute">' + esc(e.date) + ' · Received by ' + esc(e.receivedName || '') + ' (' + esc(e.receivedBy || '') + ')</div>'
      + (admin ? '<div class="row"><button class="d" onclick="fxDelExpense(\'' + e._id + '\')">Delete</button></div>' : '')
      + '</div>';
  }).join('') + '</div>';
}

// --- Member: the Finance page
function fxFinancePageHtml() {
  if (!S.user || !S.user.emailVerified) {
    return '<div class="card">Verify your email to see the finances.</div>';
  }

  const f = S.fin || {};
  const cards = [
    ['Donations', naira(f.donations)],
    ['Projects', naira(f.projects)],
    ['Dues', naira(f.dues)],
    ['Bank alerts', naira(f.alerts)],
    ['Expenses', naira(f.expenses)]
  ].map(function (a) {
    return '<div class="card"><div class="mute">' + a[0] + '</div><div class="big">' + a[1] + '</div></div>';
  }).join('');

  return '<h2>Finance</h2>'
    + '<div class="card"><div class="mute">Community balance</div>'
    + '<div class="fxBig">' + naira(f.balance) + '</div>'
    + '<p class="mute">Money received minus expenses.</p></div>'
    + '<div class="grid" style="margin-top:14px">' + cards + '</div>'
    + '<h2>Bank alerts</h2>' + fxAlertsListHtml()
    + '<h2>Expenses</h2>' + fxExpenseListHtml(false);
}

// --- Admin: the Finance section (paste, match, cash, expenses, totals)
function fxAlertCardsHtml() {
  const q = String(S.fxAlertQ || '').toLowerCase();
  const filtered = S.fxAlerts.filter(function(a) {
    if (!q) return true;
    return String(a.date).toLowerCase().includes(q) || String(a.sender).toLowerCase().includes(q) || String(a.amount).includes(q);
  });

  const waiting = [];
  S.fxDon.forEach(function (d) {
    if (d.status === 'waiting') {
      waiting.push({ key: 'donation:' + d._id, label: 'Donation ' + naira(d.amount) + ' · ' + (d.donor || '') + ' · ' + (d.project || '') });
    }
  });
  (S.fxAll || []).forEach(function (p) {
    if (p.status === 'pending') {
      waiting.push({ key: 'dues:' + p._id, label: 'Dues ' + naira(p.amount) + ' · ' + (p.name || '') + ' · ' + (p.memberId || '') });
    }
  });
  const opts = waiting.map(function (w) {
    return '<option value="' + esc(w.key) + '">' + esc(w.label) + '</option>';
  }).join('');

  const alertCards = filtered.map(function (a) {
    const head = '<div class="big">' + naira(a.amount) + '</div><h3>' + esc(a.sender) + '</h3><div class="mute" style="margin-bottom:8px">' + esc(a.date) + '</div>';
    if (a.matchedTo) {
      return '<div class="card">' + head + '<span class="tag a" style="margin-bottom:8px">Matched</span><div class="row"><button class="d" onclick="fxDelAlert(\'' + a._id + '\')">Delete</button></div></div>';
    }
    return '<div class="card">' + head
      + '<label>Match to a waiting payment</label>'
      + '<select id="fxm_' + a._id + '"><option value="">Choose...</option>' + opts + '</select>'
      + '<div class="row" style="gap:8px"><button class="p" onclick="fxMatchAlert(\'' + a._id + '\')">Match</button><button class="d" onclick="fxDelAlert(\'' + a._id + '\')">Delete</button></div>'
      + '</div>';
  }).join('') || '<div class="card mute">No matching bank alerts saved yet.</div>';
  
  return '<div class="grid">' + alertCards + '</div>';
}

function fxRefreshAlerts() {
  const box = $('fx_alert_list');
  if (box) box.innerHTML = fxAlertCardsHtml();
}

function fxFinanceAdmin() {
  const pendingCards = (S.fxAll || []).filter(function (p) {
    return p.status === 'pending';
  }).map(function (p) {
    return '<div class="card"><div class="big">' + naira(p.amount) + '</div><h3>' + esc(p.name) + '</h3>'
      + '<div class="mute">' + esc(p.memberId) + ' · ' + esc(p.date || '') + '</div>'
      + '<div class="row"><button onclick="fxConfirmCash(\'' + p._id + '\')">Confirm as cash</button></div></div>';
  }).join('') || '<div class="card mute">No member payments waiting.</div>';

  let pasteBlock = '<div class="card"><h3>Paste a bank alert</h3>'
    + '<p class="mute">Paste a credit alert. Only the amount, date, sender and masked narration are saved. The full text is never stored.</p>'
    + '<textarea id="fxp_text" rows="5">' + esc(S.fxDraft || '') + '</textarea>'
    + '<button class="p" onclick="fxParseAlertDraft()">Read alert</button>';

  if (S.fxDraftParsed) {
    const w = (S.fxDraftParsed.warnings || []);
    pasteBlock += '<div class="card" style="margin-top:14px;border-color:var(--acc)">'
      + '<h3>Check the details</h3>'
      + (w.length
          ? '<div class="msg">' + esc(w.join(' ')) + '</div>'
          : '<p class="mute">Looks good. Fix any field that is wrong, then tap Save alert.</p>')
      + '<label>Amount (₦)</label>'
      + '<input id="fxp_amount" type="number" value="' + esc(S.fxDraftParsed.amount || '') + '">'
      + '<label>Date</label>'
      + '<input id="fxp_date" type="date" value="' + esc(S.fxDraftParsed.date || '') + '">'
      + '<label>Sender</label>'
      + '<input id="fxp_sender" value="' + esc(S.fxDraftParsed.sender || '') + '">'
      + '<label>Narration (from the pasted text)</label>'
      + '<input readonly value="' + esc(S.fxDraftParsed.narration || '') + '">'
      + '<div class="row">'
      + '<button class="p" onclick="fxConfirmAlert()">Save alert</button>'
      + '<button onclick="fxCancelAlert()">Cancel</button>'
      + '</div></div>';
  }

  pasteBlock += '</div>';

  return '<div class="row"><button onclick="S.tab=\'dash\';render()">← Back to Admin</button></div>'
    + '<h2>Finance</h2>'
    + pasteBlock
    + '<h2>Bank alerts</h2>'
    + '<input placeholder="Search alerts by date, sender, or amount" value="' + esc(S.fxAlertQ) + '" oninput="S.fxAlertQ=this.value;fxRefreshAlerts()" style="margin-bottom:14px">'
    + '<div id="fx_alert_list">' + fxAlertCardsHtml() + '</div>'
    + '<h2>Member payments waiting</h2><div class="grid">' + pendingCards + '</div>'
    + '<div class="card" style="margin-top:14px"><h3>Record an expense</h3>'
    + '<label>Date</label><input id="fxe_date" type="date" value="' + fxToday() + '">'
    + '<label>Amount (₦)</label><input id="fxe_amt" type="number">'
    + '<label>Purpose</label><input id="fxe_purpose">'
    + '<label>Received by (member ID)</label><input id="fxe_who" placeholder="e.g. UCA-0002" autocapitalize="characters">'
    + '<label>Receipt photo (optional)</label><input type="file" accept="image/*" onchange="fxPick(this,\'exp\',800)"><img id="pv_exp" class="pv" style="display:none">'
    + '<button class="p" onclick="fxSaveExpense()">Save expense</button></div>'
    + '<h2>Expenses</h2>' + fxExpenseListHtml(true)
    + '<div class="card" style="margin-top:14px"><h3>Totals</h3>'
    + '<p class="mute">Totals update automatically. Use this if they look out of date.</p>'
    + '<button class="p" style="margin-top:14px" onclick="fxRecalcNow()">Recalculate totals</button></div>';
}

// --- Render: Finance page, and the total and receipts on the member's Dues page
const _renderFin = window.render;

window.render = function () {
  if (S.ready && S.view === 'finance' && (!S.user || !S.user.emailVerified)) {
    S.view = S.user ? 'verify' : 'home';
  }

  _renderFin();

  const app = $('app');

  if (!app) {
    return;
  }

  if (S.view === 'finance') {
    app.innerHTML = fxFinancePageHtml();
  }

  if (S.view === 'dues' && S.user && S.user.emailVerified) {
    const paid = (S.fxMine || []).filter(function (p) { return p.status === 'confirmed'; });
    const total = paid.reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
    const receipts = paid.map(function (p) {
      return '<div class="card"><div class="big">' + naira(p.amount) + '</div>'
        + '<div class="mute">' + esc(p.date || '') + (p.ref ? ' · ' + esc(p.ref) : '') + '</div>'
        + '<div class="row"><button onclick="fxDownloadReceipt(\'' + p._id + '\')">Download receipt</button></div></div>';
    }).join('') || '<div class="card mute">No confirmed payments yet.</div>';

    app.insertAdjacentHTML('beforeend',
      '<h2>Your total paid</h2><div class="card"><div class="big">' + naira(total) + '</div></div>'
      + '<h2>Receipts</h2><div class="grid">' + receipts + '</div>');
  }
};

// --- Menu: "Finance" for logged-in members
const _navFin = window.nav;

window.nav = function () {
  _navFin();

  const nav = document.getElementById('nav');

  if (!nav || !S.user || !S.user.emailVerified) {
    return;
  }

  const btn = document.createElement('button');

  btn.textContent = 'Finance';
  btn.setAttribute('onclick', "go('finance')");

  if (S.view === 'finance') {
    btn.classList.add('on');
  }

  const out = Array.prototype.slice.call(nav.children).filter(function (b) {
    return (b.getAttribute('onclick') || '').indexOf('out()') >= 0;
  })[0];

  if (out) {
    nav.insertBefore(btn, out);
  } else {
    nav.appendChild(btn);
  }
};

// --- Admin: the Finance tile, the Paid-by choice on donations and dues, and the Finance section
const _adminFin = window.admin;

window.admin = function () {
  if (isAdmin() && S.tab === 'fxfin') {
    return fxFinanceAdmin();
  }

  let h = _adminFin();

  if (!isAdmin()) {
    return h;
  }

  if (S.tab === 'dash') {
    const tile = '<div class="card tile" onclick="S.tab=\'fxfin\';render();window.scrollTo(0,0)">'
      + '<div class="ic">🧾</div>'
      + '<h3>Finance</h3>'
      + '<div class="mute">Bank alerts, cash, expenses and balance</div>'
      + '</div>';
    const i = h.lastIndexOf('</div>');

    h = h.slice(0, i) + tile + h.slice(i);
  }

  if (S.tab === 'donations') {
    h = h.replace(
      '<button class="p" onclick="addDon()">Record</button>',
      '<label>Paid by</label><select id="dm"><option value="cash">Cash</option><option value="bank">Bank transfer</option></select>'
        + '<button class="p" onclick="addDon()">Record</button>'
    );
  }

  if (S.tab === 'fxdues') {
    h = h.replace(
      '<button class="p" onclick="fxAdminRecord()">Record payment</button>',
      '<label>Paid by</label><select id="fx_rm"><option value="cash">Cash</option><option value="bank">Bank transfer</option></select>'
        + '<button class="p" onclick="fxAdminRecord()">Record payment</button>'
    );
  }

  return h;
};

Object.assign(window, {
  addDon: fxAddDonation,
  fxAdminRecord: fxRecordDues,
  fxParseAlertDraft: fxParseAlertDraft,
  fxConfirmAlert: fxConfirmAlert,
  fxCancelAlert: fxCancelAlert,
  fxMatchAlert: fxMatchAlert,
  fxDelAlert: fxDelAlert,
  fxConfirmCash: fxConfirmCash,
  fxSaveExpense: fxSaveExpense,
  fxDelExpense: fxDelExpense,
  fxRecalcNow: fxRecalcNow,
  fxDownloadReceipt: fxDownloadReceipt,
  fxRefreshAlerts: fxRefreshAlerts
});

[
  ['addDon', 'Recording...'],
  ['fxAdminRecord', 'Recording...'],
  ['fxConfirmAlert', 'Saving...'],
  ['fxMatchAlert', 'Matching...'],
  ['fxDelAlert', 'Deleting...'],
  ['fxConfirmCash', 'Saving...'],
  ['fxSaveExpense', 'Saving...'],
  ['fxDelExpense', 'Deleting...'],
  ['fxRecalcNow', 'Updating...']
].forEach(function (pair) {
  window[pair[0]] = busyWrap(window[pair[0]], pair[1]);
});






  // ------------------------------------------------------------
// CARRY FORWARD AND ALERT FORMS
// (paste above the "SECTION: Hook-up and start" part, AFTER the FINANCE block)
// What it does:
//   1. Every unmatched bank alert card gets two fold-out forms:
//        "Record as donation" - pick the project, optionally change the donor name
//        "Record as dues"     - pick the member (best name match first, with a search box)
//      Either one records the money and matches the alert in one step.
//   2. Dues use the member's rate. Months or years are worked out from
//      the amount, and anything extra is carried forward as "credit"
//      (saved on the member) and added to their next payment.
//      Example: 1,500 on a 1,000 monthly plan = 1 month, 500 carried.
//   3. The same rule applies when you match an alert to a pending dues
//      payment, confirm one, or use "Record a payment" in Dues.
//   4. The sender's name is saved as "paidBy", so you can see who really
//      sent the money. Receipts show the member's name.
//   5. The member's Dues page shows the amount carried forward.
// This block only replaces functions at run time. It does not change
// anything you edited in the FINANCE block above.
// ------------------------------------------------------------

// "credit" is copied to the member's login record when they claim it (CLAIM block above)
CLAIM_FIELDS.push('credit');

// --- Styles: the fold-out forms on alert cards
const creditStyle = document.createElement('style');

creditStyle.textContent =
  'details.fxD{margin-top:10px}' +
  'details.fxD summary{cursor:pointer;color:var(--acc);font-weight:600;padding:6px 0}';
document.head.appendChild(creditStyle);

// --- Splits money into full months or years, and what is left over (carried forward)
function fxCreditSplit(credit, amount, rate) {
  const total = (Number(credit) || 0) + (Number(amount) || 0);
  const units = Math.floor((total + 0.0001) / rate);
  const left = Math.round((total - units * rate) * 100) / 100;

  return { units: units, credit: left, total: total };
}

function fxUnitsText(units, plan) {
  const word = plan === 'yearly' ? 'year' : 'month';

  return units + ' ' + word + (units === 1 ? '' : 's');
}

// --- How alike two names are (shared words), used to sort the member list
function fxSimilarity(a, b) {
  const x = String(a || '').toLowerCase().split(/\s+/).filter(Boolean);
  const y = String(b || '').toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;

  x.forEach(function (w) {
    if (y.indexOf(w) >= 0) {
      score += 2;
    } else if (y.some(function (z) { return z.indexOf(w) === 0 || w.indexOf(z) === 0; })) {
      score += 1;
    }
  });

  return score;
}

// --- Members to choose from for an alert: best name match first, filtered by the search text
function fxMemberChoices(sender, query) {
  const q = String(query || '').toLowerCase();

  return fxPayingMembers()
    .filter(function (m) {
      return !q || (m.name + ' ' + m.id).toLowerCase().indexOf(q) >= 0;
    })
    .map(function (m) {
      return { m: m, score: fxSimilarity(sender, m.name) };
    })
    .sort(function (a, b) {
      return b.score - a.score || String(a.m.name).localeCompare(String(b.m.name));
    });
}

function fxOptionsHtml(choices) {
  return choices.map(function (c) {
    const star = c.score > 0 ? ' \u2605' : '';

    return '<option value="' + esc(c.m._id) + '">' + esc(c.m.name) + ' (' + esc(c.m.id) + ')' + star + '</option>';
  }).join('');
}

// --- Sentence shown before recording dues: what the money covers and what is carried forward
function fxPreviewText(a, m) {
  const plan = fxPlanOf(m);
  const rate = fxUnitRate(plan);

  if (!(rate > 0)) {
    return 'Set the dues amounts first (Admin, Dues).';
  }

  const r = fxCreditSplit(m.credit, a.amount, rate);
  let text = naira(a.amount) + ' covers ' + fxUnitsText(r.units, plan);

  if (r.credit > 0) {
    text += ' and ' + naira(r.credit) + ' is carried forward';
  }

  if (Number(m.credit) > 0) {
    text += ' (includes ' + naira(m.credit) + ' already carried forward)';
  }

  return text + '.';
}

function fxDuesPreview(alertId) {
  const a = S.fxAlerts.filter(function (x) { return x._id === alertId; })[0];
  const sel = document.getElementById('fxdm_' + alertId);
  const out = document.getElementById('fxv_' + alertId);
  const m = sel ? S.mem.filter(function (x) { return x._id === sel.value; })[0] : null;

  if (a && out) {
    out.textContent = m ? fxPreviewText(a, m) : '';
  }
}

// --- Search box on the alert card: re-sorts the member list
function fxFilterMembers(alertId) {
  const a = S.fxAlerts.filter(function (x) { return x._id === alertId; })[0];
  const box = document.getElementById('fxq_' + alertId);
  const sel = document.getElementById('fxdm_' + alertId);

  if (!a || !sel) {
    return;
  }

  sel.innerHTML = fxOptionsHtml(fxMemberChoices(a.sender, box ? box.value : ''));
  fxDuesPreview(alertId);
}

// --- Confirms a member's dues payment and applies the carry-forward rule:
//     (credit already carried + this amount) is split into full months or years,
//     and what is left over becomes the member's new credit.
async function fxConfirmDues(id, method, paidBy) {
  const p = (S.fxAll || []).filter(function (x) { return x._id === id; })[0];

  if (!p) {
    throw new Error('Payment not found. Reload and try again.');
  }

  if (p.status === 'confirmed') {
    return;
  }

  const m = S.mem.filter(function (x) { return x._id === p.mid; })[0];
  const plan = p.plan === 'yearly' ? 'yearly' : 'monthly';
  const rate = fxUnitRate(plan);
  const update = { status: 'confirmed', provisional: false };

  if (method) {
    update.method = method;
  }

  if (paidBy) {
    update.paidBy = paidBy;
  }

  if (m && rate > 0) {
    const r = fxCreditSplit(m.credit, p.amount, rate);

    update.count = r.units;
    update.months = r.units * (plan === 'yearly' ? 12 : 1);
    update.creditUsed = Number(m.credit) || 0;
    update.creditAfter = r.credit;

    await updateDoc(doc(db, 'dues', id), update);
    await updateDoc(doc(db, 'members', m._id), { credit: r.credit });
    return;
  }

  await updateDoc(doc(db, 'dues', id), update);
}

// --- Match an alert to a waiting bank donation or a pending dues payment
async function fxMatchAlertCredit(alertId) {
  const box = document.getElementById('fxm_' + alertId);
  const pick = box ? box.value : '';

  if (!pick) {
    return say('Choose the payment to match.');
  }

  const parts = pick.split(':');
  const kind = parts[0];
  const id = parts[1];

  try {
    if (kind === 'donation') {
      const d = S.fxDon.filter(function (x) { return x._id === id; })[0];

      await updateDoc(doc(db, 'donations', id), { status: 'confirmed', method: 'bank' });

      if (d && d.pid) {
        await updateDoc(doc(db, 'projects', d.pid), { raised: increment(Number(d.amount) || 0) });
      }
    } else {
      const alert = S.fxAlerts.filter(function (x) { return x._id === alertId; })[0];

      await fxConfirmDues(id, 'bank', alert ? alert.sender : '');
    }

    await updateDoc(doc(db, 'alerts', alertId), { matchedTo: pick });
    await fxRecalcFinance();
    await reload();
    say('Matched.');
  } catch (e) {
    say(e.message);
  }
}

// --- Confirm a member's pending payment as cash
async function fxConfirmCashCredit(id) {
  try {
    await fxConfirmDues(id, 'cash', '');
    await fxRecalcFinance();
    await reload();
  } catch (e) {
    say(e.message);
  }
}

// --- Confirm or reject from the Dues pending list. Confirming applies the carry-forward rule.
async function fxReviewCredit(id, status) {
  try {
    if (status === 'confirmed') {
      await fxConfirmDues(id, '', '');
    } else {
      await updateDoc(doc(db, 'dues', id), { status: status });
    }

    await fxRecalcFinance();
    await reload();
  } catch (e) {
    say(e.message);
  }
}

// --- Dues recorded by an admin. Months or years come from the amount and the
//     member's rate, and any extra is carried forward (same rule as alerts).
//     Cash counts straight away. Bank waits until its alert is matched, and the
//     carry-forward is applied at that moment.
async function fxRecordDuesCredit() {
  const id = v('fx_rid').toUpperCase();
  const m = S.mem.filter(function (x) { return String(x.id).toUpperCase() === id; })[0];

  if (!m) {
    return say('No member with that ID.');
  }

  const plan = fxPlanOf(m);
  const rate = fxUnitRate(plan);
  const amount = Number(v('fx_ra'));
  const method = v('fx_rm') === 'bank' ? 'bank' : 'cash';

  if (!(amount > 0)) {
    return say('Enter the amount received.');
  }

  if (!(rate > 0)) {
    return say('Set the dues amounts first (Dues settings).');
  }

  const waiting = method === 'bank';
  const r = fxCreditSplit(waiting ? 0 : m.credit, amount, rate);

  try {
    await addDoc(collection(db, 'dues'), {
      uid: m.uid || m._id,
      mid: m._id,
      memberId: m.id,
      name: m.name,
      village: m.village || '',
      plan: plan,
      count: r.units,
      months: r.units * (plan === 'yearly' ? 12 : 1),
      amount: amount,
      ref: v('fx_rr'),
      receipt: '',
      status: waiting ? 'pending' : 'confirmed',
      method: method,
      provisional: waiting,
      creditUsed: waiting ? 0 : Number(m.credit) || 0,
      creditAfter: waiting ? 0 : r.credit,
      by: 'admin',
      date: fxToday(),
      at: serverTimestamp()
    });

    if (!waiting) {
      await updateDoc(doc(db, 'members', m._id), { credit: r.credit });
    }

    await fxRecalcFinance();
    await reload();
    say(waiting
      ? 'Saved. It counts once its bank alert is matched.'
      : 'Payment recorded for ' + m.id + ': ' + fxUnitsText(r.units, plan)
        + (r.credit > 0 ? ', and ' + naira(r.credit) + ' carried forward.' : '.'));
  } catch (e) {
    say(e.message);
  }
}

// --- Record an unmatched alert as a donation to a project
async function fxAlertDonation(alertId) {
  const a = S.fxAlerts.filter(function (x) { return x._id === alertId; })[0];
  const projectBox = document.getElementById('fxdp_' + alertId);
  const donorBox = document.getElementById('fxdn_' + alertId);
  const pid = projectBox ? projectBox.value : '';
  const p = S.proj.filter(function (x) { return x._id === pid; })[0];

  if (!a || a.matchedTo) {
    return say('This alert is already matched.');
  }

  if (!p) {
    return say('Choose a project.');
  }

  const donor = donorBox && donorBox.value.trim() ? donorBox.value.trim() : a.sender;

  try {
    const ref = await addDoc(collection(db, 'donations'), {
      donor: donor,
      amount: a.amount,
      pid: pid,
      project: p.title,
      method: 'bank',
      status: 'confirmed',
      paidBy: a.sender,
      alertId: alertId,
      at: serverTimestamp()
    });

    await updateDoc(doc(db, 'projects', pid), { raised: increment(Number(a.amount) || 0) });
    await updateDoc(doc(db, 'alerts', alertId), { matchedTo: 'donation:' + ref.id });
    await fxRecalcFinance();
    await reload();
    say('Recorded as a donation to ' + p.title + '.');
  } catch (e) {
    say(e.message);
  }
}

// --- Record an unmatched alert as dues for any member (whoever sent the money)
async function fxAlertDues(alertId) {
  const a = S.fxAlerts.filter(function (x) { return x._id === alertId; })[0];
  const sel = document.getElementById('fxdm_' + alertId);
  const m = sel ? S.mem.filter(function (x) { return x._id === sel.value; })[0] : null;

  if (!a || a.matchedTo) {
    return say('This alert is already matched.');
  }

  if (!m) {
    return say('Choose the member the dues are for.');
  }

  const plan = fxPlanOf(m);
  const rate = fxUnitRate(plan);

  if (!(rate > 0)) {
    return say('Set the dues amounts first (Admin, Dues).');
  }

  const r = fxCreditSplit(m.credit, a.amount, rate);

  try {
    const ref = await addDoc(collection(db, 'dues'), {
      uid: m.uid || m._id,
      mid: m._id,
      memberId: m.id,
      name: m.name,
      village: m.village || '',
      plan: plan,
      count: r.units,
      months: r.units * (plan === 'yearly' ? 12 : 1),
      amount: a.amount,
      ref: a.narration || '',
      receipt: '',
      status: 'confirmed',
      method: 'bank',
      by: 'admin',
      paidBy: a.sender,
      alertId: alertId,
      creditUsed: Number(m.credit) || 0,
      creditAfter: r.credit,
      date: a.date,
      at: serverTimestamp()
    });

    await updateDoc(doc(db, 'members', m._id), { credit: r.credit });
    await updateDoc(doc(db, 'alerts', alertId), { matchedTo: 'dues:' + ref.id });
    await fxRecalcFinance();
    await reload();
    say('Dues recorded for ' + m.id + ': ' + fxUnitsText(r.units, plan)
      + (r.credit > 0 ? ', and ' + naira(r.credit) + ' carried forward.' : '.'));
  } catch (e) {
    say(e.message);
  }
}

// --- Adds the two fold-out forms to every unmatched alert card in a piece of HTML
function fxInjectAlertForms(html) {
  const projectOptions = S.proj.map(function (p) {
    return '<option value="' + esc(p._id) + '">' + esc(p.title) + '</option>';
  }).join('');

  S.fxAlerts.forEach(function (a) {
    if (a.matchedTo) {
      return;
    }

    const at = html.indexOf('id="fxm_' + a._id + '"');
    const end = at < 0 ? -1 : html.indexOf('Delete</button></div>', at);

    if (end < 0) {
      return;
    }

    const insertAt = end + 'Delete</button></div>'.length;
    const choices = fxMemberChoices(a.sender, '');
    const first = choices[0] ? choices[0].m : null;

    const forms =
      '<details class="fxD"><summary>Record as donation</summary>'
      + '<label>Project</label><select id="fxdp_' + a._id + '">' + projectOptions + '</select>'
      + '<label>Donor name</label><input id="fxdn_' + a._id + '" value="' + esc(a.sender) + '">'
      + '<button class="p" onclick="fxAlertDonation(\'' + a._id + '\')">Record as donation</button>'
      + '</details>'
      + '<details class="fxD"><summary>Record as dues</summary>'
      + '<label>Search member</label><input id="fxq_' + a._id + '" placeholder="Name or ID" oninput="fxFilterMembers(\'' + a._id + '\')">'
      + '<label>Member (best name matches first)</label>'
      + '<select id="fxdm_' + a._id + '" onchange="fxDuesPreview(\'' + a._id + '\')">' + fxOptionsHtml(choices) + '</select>'
      + '<div class="mute" id="fxv_' + a._id + '">' + esc(first ? fxPreviewText(a, first) : '') + '</div>'
      + '<button class="p" onclick="fxAlertDues(\'' + a._id + '\')">Record as dues</button>'
      + '</details>';

    html = html.slice(0, insertAt) + forms + html.slice(insertAt);
  });

  return html;
}

// --- The search box above the alerts re-draws the cards, so keep the forms in them
window.fxRefreshAlerts = function () {
  const box = $('fx_alert_list');

  if (box) {
    box.innerHTML = fxInjectAlertForms(fxAlertCardsHtml());
  }
};

// --- Admin pages: alert forms on the Finance page, and no "months" box in Record a payment
const _adminCredit = window.admin;

window.admin = function () {
  let h = _adminCredit();

  if (!isAdmin()) {
    return h;
  }

  if (S.tab === 'fxfin') {
    h = fxInjectAlertForms(h);
  }

  if (S.tab === 'fxdues') {
    h = h.replace(
      '<label>Number of months (or years, for a yearly member)</label><input id="fx_rn" type="number" min="1" value="1">',
      '<p class="mute">Months or years are worked out from the amount and the member\u2019s rate. Any extra is carried forward.</p>'
    );
  }

  return h;
};

// --- Member receipt: handles payments that only added credit, and shows the amount carried forward
function fxDownloadReceiptCredit(id) {
  const p = (S.fxMine || []).filter(function (x) { return x._id === id; })[0];

  if (!p) {
    return say('Receipt not found.');
  }

  const rows = [
    ['Receipt no.', 'UZR-' + id.slice(-6).toUpperCase()],
    ['Name', p.name || ''],
    ['Member ID', p.memberId || ''],
    ['Amount', naira(p.amount)],
    ['Covers', Number(p.count) > 0 ? fxUnitsText(Number(p.count), p.plan) : 'Added to credit'],
    ['Reference', p.ref || '-'],
    ['Date', p.date || ''],
    ['Status', 'Confirmed']
  ];

  if (Number(p.creditAfter) > 0) {
    rows.push(['Carried forward', naira(p.creditAfter)]);
  }

  const c = document.createElement('canvas');

  c.width = 800;
  c.height = 620;

  const x = c.getContext('2d');

  const draw = function (logo) {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 800, 620);
    x.fillStyle = '#0d4a1a';
    x.fillRect(0, 0, 800, 120);

    if (logo) {
      const k = Math.min(90 / logo.width, 90 / logo.height);

      x.drawImage(logo, 30, 15, logo.width * k, logo.height * k);
    }

    x.fillStyle = '#7ddc1f';
    x.font = 'bold 40px sans-serif';
    x.fillText('UZAIRUE', logo ? 140 : 30, 75);

    x.fillStyle = '#0d4a1a';
    x.font = 'bold 30px sans-serif';
    x.fillText('PAYMENT RECEIPT', 30, 170);

    rows.forEach(function (r, i) {
      const y = 230 + i * 40;

      x.fillStyle = '#5a6b82';
      x.font = '20px sans-serif';
      x.fillText(r[0], 30, y);
      x.fillStyle = '#0f1b2d';
      x.font = 'bold 22px sans-serif';
      x.fillText(String(r[1]), 260, y);
    });

    x.fillStyle = '#5a6b82';
    x.font = '16px sans-serif';
    x.fillText('Thank you for supporting our community.', 30, 595);

    const a = document.createElement('a');

    a.href = c.toDataURL('image/png');
    a.download = 'receipt-' + (p.memberId || 'uzairue') + '-' + id.slice(-6) + '.png';
    a.click();
  };

  if (S.site && S.site.logo) {
    const img = new Image();

    img.onload = function () { draw(img); };
    img.onerror = function () { draw(null); };
    img.src = S.site.logo;
  } else {
    draw(null);
  }
}

// --- Dues page for members: show the amount carried forward under the first card
const _renderCredit = window.render;

window.render = function () {
  _renderCredit();

  const app = $('app');

  if (!app || S.view !== 'dues' || !S.user || !S.user.emailVerified || !S.me) {
    return;
  }

  const credit = Number(S.me.credit) || 0;
  const html = app.innerHTML;
  const cardEnd = html.indexOf('</div></div>');

  // The first card on the page is "Your dues"; its closing tags are the first "</div></div>"
  if (credit > 0 && cardEnd >= 0) {
    const at = cardEnd + '</div></div>'.length;
    const card =
      '<div class="card" style="margin-top:14px"><div class="mute">Carried forward</div>'
      + '<div class="big">' + naira(credit) + '</div>'
      + '<p class="mute">Added to your next payment.</p></div>';

    app.innerHTML = html.slice(0, at) + card + html.slice(at);
  }
};

// --- Replace the older versions, and give the new buttons a "working" label
window.fxMatchAlert = fxMatchAlertCredit;
window.fxConfirmCash = fxConfirmCashCredit;
window.fxReview = fxReviewCredit;
window.fxAdminRecord = fxRecordDuesCredit;
window.fxDownloadReceipt = fxDownloadReceiptCredit;

Object.assign(window, {
  fxAlertDonation: fxAlertDonation,
  fxAlertDues: fxAlertDues,
  fxFilterMembers: fxFilterMembers,
  fxDuesPreview: fxDuesPreview
});

[
  ['fxMatchAlert', 'Matching...'],
  ['fxConfirmCash', 'Saving...'],
  ['fxReview', 'Updating...'],
  ['fxAdminRecord', 'Recording...'],
  ['fxAlertDonation', 'Recording...'],
  ['fxAlertDues', 'Recording...']
].forEach(function (pair) {
  window[pair[0]] = busyWrap(window[pair[0]], pair[1]);
});









  // ------------------------------------------------------------
// NEWS EDITOR, IMAGE POP-UP AND MATCHED LABEL
// (paste above the "SECTION: Hook-up and start" part, after your other blocks)
// What it does:
//   1. Admin > News gets a Word-style editor: bold, italic, underline,
//      strikethrough, headings, lists, alignment, links, text colour,
//      highlight, undo/redo and clear formatting.
//      Pasting from WhatsApp or Word keeps the basics (WhatsApp *bold*
//      and _italic_ become real bold and italic).
//   2. News posts show exactly as the admin styled them, in a full-width
//      card. Old plain-text posts show their paragraphs and bold marks.
//   3. Each post has an Edit button that loads it back into the editor.
//   4. Click or tap a news, project or banner image to see it full size.
//   5. On matched bank alert cards, "Matched" now sits on the same line
//      as Delete, at the right edge, in the same size.
// Safety: the text is cleaned before it is saved and again before it is
// shown. Only safe formatting is kept.
// Needs no new Firebase rules.
// ------------------------------------------------------------

S.fxEditNews = S.fxEditNews || '';
S.fxNewsDraft = S.fxNewsDraft || null;

// --- Styles: full-width news, post text, editor toolbar, image pop-up, matched label
const newsStyle = document.createElement('style');

newsStyle.textContent =
  '#news + .grid{grid-template-columns:1fr}' +
  '#news + .grid .thumb{height:auto;max-height:320px;object-fit:cover}' +
  'img.thumb,img.donimg{cursor:zoom-in}' +
  '.fxPost{line-height:1.6;overflow-wrap:anywhere}' +
  '.fxPost p,.fxPost div{margin:0 0 10px}' +
  '.fxPost h2,.fxPost h3{margin:14px 0 6px}' +
  '.fxPost ul,.fxPost ol{margin:0 0 10px;padding-left:24px}' +
  '.fxPost a{color:var(--acc);text-decoration:underline}' +
  '.fxPost blockquote{margin:0 0 10px;padding-left:12px;border-left:3px solid var(--line)}' +
  '.fxTool{display:flex;gap:6px;overflow-x:auto;padding:6px 0;margin-bottom:6px}' +
  '.fxTool button{flex:none;min-width:40px;padding:8px 10px}' +
  '.fxTool label.fxCol{flex:none;display:flex;align-items:center;gap:4px;color:var(--ink);font-weight:700}' +
  '.fxTool input[type=color]{width:38px;height:38px;padding:2px;margin:0}' +
  '.fxEd{min-height:240px;border:1px solid var(--line);border-radius:10px;padding:12px;background:var(--field);color:var(--ink);line-height:1.6;overflow-wrap:anywhere;outline:none;margin-bottom:10px}' +
  '.fxEd:focus{border-color:var(--acc)}' +
  '.fxEd:empty:before{content:attr(data-hint);color:var(--mute)}' +
  '.fxEd p,.fxEd div{margin:0 0 10px}' +
  '.fxEd ul,.fxEd ol{margin:0 0 10px;padding-left:24px}' +
  '.fxLb{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:12px}' +
  '.fxLb img{max-width:100%;max-height:100%;border-radius:10px;cursor:zoom-out}' +
  '.fxLb button{position:absolute;top:12px;right:12px}' +
  '.fxMatchedRow{justify-content:space-between;align-items:center}' +
  '.fxMatched{display:inline-block;font:inherit;line-height:1.5;padding:8px 12px;border:1px solid var(--acc);border-radius:10px;background:var(--acc);color:var(--accink);font-weight:600}';
document.head.appendChild(newsStyle);

// ------------------------------------------------------------
// Cleaning: keeps only safe tags and styles
// ------------------------------------------------------------
const FX_ALLOWED = {
  P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1,
  H2: 1, H3: 1, UL: 1, OL: 1, LI: 1, A: 1, SPAN: 1, DIV: 1, BLOCKQUOTE: 1
};

// Elements removed together with everything inside them
const FX_DROP = {
  SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, LINK: 1, META: 1,
  SVG: 1, MATH: 1, FORM: 1, INPUT: 1, BUTTON: 1, TEXTAREA: 1, SELECT: 1,
  IMG: 1, VIDEO: 1, AUDIO: 1, CANVAS: 1, TEMPLATE: 1, NOSCRIPT: 1
};

// A colour value is kept only if it looks like a colour (no urls, no functions except rgb)
function fxSafeColor(value) {
  const c = String(value || '').trim();

  if (/^#[0-9a-fA-F]{3,8}$/.test(c)) {
    return c;
  }

  if (/^rgba?\(\s*[0-9.\s,%]+\)$/.test(c)) {
    return c;
  }

  if (/^[a-zA-Z]{3,20}$/.test(c)) {
    return c;
  }

  return '';
}

// Links must start with http, https, mailto or tel
function fxSafeHref(value) {
  const h = String(value || '').trim();

  return /^(https?:|mailto:|tel:)/i.test(h) ? h : '';
}

// Builds a safe style string from the few styles we allow
function fxCleanStyle(el) {
  const s = el.style;
  const out = [];
  const color = fxSafeColor(s.color);
  const back = fxSafeColor(s.backgroundColor);

  if (color) {
    out.push('color:' + color);
  }

  if (back) {
    out.push('background-color:' + back);
  }

  if (/^(left|right|center|justify)$/.test(s.textAlign)) {
    out.push('text-align:' + s.textAlign);
  }

  if (s.fontWeight === 'bold' || Number(s.fontWeight) >= 600) {
    out.push('font-weight:bold');
  }

  if (s.fontStyle === 'italic') {
    out.push('font-style:italic');
  }

  const deco = String(s.textDecorationLine || s.textDecoration || '');

  if (deco.indexOf('underline') >= 0 && deco.indexOf('line-through') >= 0) {
    out.push('text-decoration:underline line-through');
  } else if (deco.indexOf('underline') >= 0) {
    out.push('text-decoration:underline');
  } else if (deco.indexOf('line-through') >= 0) {
    out.push('text-decoration:line-through');
  }

  return out.join(';');
}

// Copies the safe parts of one element's children into a new element
function fxCleanChildren(from, to) {
  Array.prototype.slice.call(from.childNodes).forEach(function (node) {
    if (node.nodeType === 3) {
      to.appendChild(document.createTextNode(node.nodeValue));
      return;
    }

    if (node.nodeType !== 1) {
      return;
    }

    const tag = node.tagName;

    if (FX_DROP[tag]) {
      return;
    }

    // Old-style <font color="..."> becomes a styled span
    if (tag === 'FONT') {
      const span = document.createElement('span');
      const c = fxSafeColor(node.getAttribute('color'));

      if (c) {
        span.style.color = c;
      }

      fxCleanChildren(node, span);
      to.appendChild(span);
      return;
    }

    // Unknown tags are removed but their text is kept
    if (!FX_ALLOWED[tag]) {
      fxCleanChildren(node, to);
      return;
    }

    if (tag === 'A') {
      const href = fxSafeHref(node.getAttribute('href'));

      if (!href) {
        fxCleanChildren(node, to);
        return;
      }

      const link = document.createElement('a');

      link.setAttribute('href', href);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      fxCleanChildren(node, link);
      to.appendChild(link);
      return;
    }

    const el = document.createElement(tag.toLowerCase());
    const style = fxCleanStyle(node);

    if (style) {
      el.setAttribute('style', style);
    }

    fxCleanChildren(node, el);
    to.appendChild(el);
  });
}

function fxClean(html) {
  const parsed = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
  const out = document.createElement('div');

  fxCleanChildren(parsed.body, out);

  return out.innerHTML;
}

// ------------------------------------------------------------
// Plain text (including WhatsApp style) to HTML
// ------------------------------------------------------------
function fxPlainToHtml(text) {
  const safe = esc(String(text || '').replace(/\r/g, ''));
  const blocks = safe.split(/\n{2,}/);

  const html = blocks.map(function (block) {
    let line = block.replace(/\n/g, '<br>');

    line = line.replace(/\*(?=\S)([^*\n]*?\S)\*/g, '<b>$1</b>');
    line = line.replace(/(^|[\s(>])_(?=\S)([^_\n]*?\S)_(?=$|[\s).,!?<])/g, '$1<i>$2</i>');
    line = line.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');

    return '<p>' + line + '</p>';
  }).join('');

  return fxClean(html);
}

// A saved post: the styled version if it has one, otherwise the old plain text
function fxPostHtml(n) {
  return n.html ? fxClean(n.html) : fxPlainToHtml(n.body);
}

// ------------------------------------------------------------
// Home page: show news as styled text
// ------------------------------------------------------------
const _homeNews = window.home;

window.home = function () {
  let h = _homeNews();

  S.news.forEach(function (n) {
    const plain = '<h3>' + esc(n.title) + '</h3><p>' + esc(n.body) + '</p></div>';
    const styled = '<h3>' + esc(n.title) + '</h3><div class="fxPost">' + fxPostHtml(n) + '</div></div>';

    if (h.indexOf(plain) >= 0) {
      h = h.replace(plain, function () { return styled; });
    }
  });

  return h;
};

// ------------------------------------------------------------
// Editor: toolbar commands, selection memory and paste clean-up
// ------------------------------------------------------------
let fxRange = null;

// The toolbar buttons steal focus, so the last selection inside the editor is remembered
function fxSaveSel() {
  const sel = window.getSelection();
  const ed = $('fxEditor');

  if (sel && sel.rangeCount && ed && ed.contains(sel.anchorNode)) {
    fxRange = sel.getRangeAt(0).cloneRange();
  }
}

function fxRestoreSel() {
  if (!fxRange) {
    return;
  }

  const sel = window.getSelection();

  sel.removeAllRanges();
  sel.addRange(fxRange);
}

document.addEventListener('selectionchange', fxSaveSel);

// Runs a formatting command on the selected text
function fxCmd(cmd, value) {
  const ed = $('fxEditor');

  if (!ed) {
    return;
  }

  ed.focus();
  fxRestoreSel();

  try {
    document.execCommand('styleWithCSS', false, true);
  } catch (e) {
    // Not needed in every browser
  }

  document.execCommand(cmd, false, value || null);
  fxSaveSel();
}

function fxLink() {
  const url = prompt('Link address (https://...)', 'https://');

  if (url) {
    fxCmd('createLink', url);
  }
}

function fxColor(cmd, inputId) {
  const input = $(inputId);

  if (input) {
    fxCmd(cmd, input.value);
  }
}

// Paste: keep the basics, drop the mess. WhatsApp *bold* becomes real bold.
document.addEventListener('paste', function (e) {
  const target = e.target && e.target.nodeType === 1 ? e.target : (e.target ? e.target.parentElement : null);

  if (!target || !target.closest || !target.closest('#fxEditor')) {
    return;
  }

  e.preventDefault();

  const data = e.clipboardData;
  const html = data ? data.getData('text/html') : '';
  const text = data ? data.getData('text/plain') : '';
  const clean = html ? fxClean(html) : fxPlainToHtml(text);

  document.execCommand('insertHTML', false, clean);
});

// Pressing Enter makes a new paragraph
document.addEventListener('focusin', function (e) {
  if (e.target && e.target.id === 'fxEditor') {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch (err) {
      // Not needed in every browser
    }
  }
});

// ------------------------------------------------------------
// Admin > News: the editor page, saving, editing
// ------------------------------------------------------------
function fxToolButton(label, title, cmd, value) {
  const arg = value ? ",'" + value + "'" : '';

  return '<button type="button" title="' + title + '" onmousedown="event.preventDefault()" onclick="fxCmd(\'' + cmd + '\'' + arg + ')">' + label + '</button>';
}

function fxToolbarHtml() {
  return '<div class="fxTool">'
    + fxToolButton('<b>B</b>', 'Bold', 'bold')
    + fxToolButton('<i>I</i>', 'Italic', 'italic')
    + fxToolButton('<u>U</u>', 'Underline', 'underline')
    + fxToolButton('<s>S</s>', 'Strikethrough', 'strikeThrough')
    + fxToolButton('Heading', 'Heading', 'formatBlock', '<h2>')
    + fxToolButton('Sub', 'Subheading', 'formatBlock', '<h3>')
    + fxToolButton('Text', 'Normal paragraph', 'formatBlock', '<p>')
    + fxToolButton('\u2022 List', 'Bulleted list', 'insertUnorderedList')
    + fxToolButton('1. List', 'Numbered list', 'insertOrderedList')
    + fxToolButton('Left', 'Align left', 'justifyLeft')
    + fxToolButton('Center', 'Align centre', 'justifyCenter')
    + fxToolButton('Right', 'Align right', 'justifyRight')
    + '<button type="button" title="Link" onmousedown="event.preventDefault()" onclick="fxLink()">Link</button>'
    + '<label class="fxCol" title="Text colour">A<input type="color" id="fxc_fore" value="#c0392b" onchange="fxColor(\'foreColor\',\'fxc_fore\')"></label>'
    + '<label class="fxCol" title="Highlight">Hi<input type="color" id="fxc_back" value="#ffe066" onchange="fxColor(\'hiliteColor\',\'fxc_back\')"></label>'
    + fxToolButton('Undo', 'Undo', 'undo')
    + fxToolButton('Redo', 'Redo', 'redo')
    + fxToolButton('Clear', 'Clear formatting', 'removeFormat')
    + '</div>';
}

function fxNewsAdmin() {
  const editing = S.fxEditNews ? S.news.filter(function (n) { return n._id === S.fxEditNews; })[0] : null;
  const draft = S.fxNewsDraft;
  const title = draft ? draft.title : (editing ? editing.title : '');
  const body = draft ? fxClean(draft.html) : (editing ? fxPostHtml(editing) : '');
  const parts = [];

  parts.push('<div class="row"><button onclick="S.tab=\'dash\';render()">\u2190 Back to Admin</button></div>');
  parts.push('<h2>News</h2>');
  parts.push('<div class="card"><h3>' + (editing ? 'Edit news' : 'Post news') + '</h3>');
  parts.push('<label>Title</label><input id="fn_t" value="' + esc(title) + '">');
  parts.push('<label>Story</label>');
  parts.push(fxToolbarHtml());
  parts.push('<div id="fxEditor" class="fxEd" contenteditable="true" data-hint="Write your story here...">' + body + '</div>');
  parts.push('<label>Image (optional)</label>');

  if (editing && imgOk(editing.img)) {
    parts.push('<img class="pv" src="' + esc(editing.img) + '" alt="">');
  }

  parts.push('<input type="file" accept="image/*" onchange="fxPick(this,\'news\',900)">');
  parts.push('<img id="pv_news" class="pv" style="display:none">');
  parts.push('<div class="row">');
  parts.push('<button class="p" onclick="fxNewsSave()">' + (editing ? 'Save changes' : 'Publish') + '</button>');

  if (editing || draft) {
    parts.push('<button onclick="fxNewsCancel()">Cancel</button>');
  }

  parts.push('</div></div>');
  parts.push('<h2>Posts</h2><div class="grid">');

  if (!S.news.length) {
    parts.push('<div class="card mute">No news yet.</div>');
  }

  S.news.forEach(function (n) {
    parts.push('<div class="card">'
      + (imgOk(n.img) ? '<img class="thumb" src="' + esc(n.img) + '" alt="">' : '')
      + '<h3>' + esc(n.title) + '</h3>'
      + '<p class="mute">' + esc(String(n.body || '').slice(0, 140)) + '</p>'
      + '<div class="row">'
      + '<button onclick="fxNewsEdit(\'' + n._id + '\')">Edit</button>'
      + '<button class="d" onclick="del(\'news\',\'' + n._id + '\')">Delete</button>'
      + '</div></div>');
  });

  parts.push('</div>');

  return parts.join('');
}

// Saves a new post, or the changes to the post being edited
async function fxNewsSave() {
  const editor = $('fxEditor');
  const title = v('fn_t');
  const html = fxClean(editor ? editor.innerHTML : '');
  const plain = editor ? editor.innerText.trim() : '';

  // Keep what was typed, so a missing title does not wipe the story
  S.fxNewsDraft = { title: title, html: html };

  if (!title) {
    return say('Please enter a title.');
  }

  if (!plain) {
    return say('Please write the story.');
  }

  const data = { title: title, body: plain, html: html };

  try {
    if (S.fxEditNews) {
      if (IMG.news) {
        data.img = IMG.news;
      }

      await updateDoc(doc(db, 'news', S.fxEditNews), data);
    } else {
      data.img = IMG.news || '';
      data.at = serverTimestamp();
      await addDoc(collection(db, 'news'), data);
    }

    IMG.news = '';
    S.fxEditNews = '';
    S.fxNewsDraft = null;
    await reload();
    say('News saved.');
  } catch (e) {
    say(e.message);
  }
}

function fxNewsEdit(id) {
  S.fxEditNews = id;
  S.fxNewsDraft = null;
  IMG.news = '';
  render();
  window.scrollTo(0, 0);
}

function fxNewsCancel() {
  S.fxEditNews = '';
  S.fxNewsDraft = null;
  IMG.news = '';
  render();
}

const _adminNews = window.admin;

window.admin = function () {
  if (isAdmin() && S.tab === 'news') {
    return fxNewsAdmin();
  }

  return _adminNews();
};

// ------------------------------------------------------------
// Image pop-up: tap a news, project or banner image to see it full size
// ------------------------------------------------------------
function fxLightboxClose() {
  const box = document.getElementById('fxLightbox');

  if (box) {
    box.remove();
  }
}

function fxLightboxOpen(src) {
  fxLightboxClose();

  const box = document.createElement('div');

  box.className = 'fxLb';
  box.id = 'fxLightbox';
  box.innerHTML = '<img alt="" src="' + esc(src) + '"><button class="p" type="button">\u2715</button>';
  box.onclick = fxLightboxClose;
  document.body.appendChild(box);
}

document.addEventListener('click', function (e) {
  const img = e.target && e.target.tagName === 'IMG' ? e.target : null;

  if (img && (img.classList.contains('thumb') || img.classList.contains('donimg'))) {
    fxLightboxOpen(img.src);
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    fxLightboxClose();
  }
});

// ------------------------------------------------------------
// Matched bank alerts: "Matched" on the same line as Delete, at the right edge
// ------------------------------------------------------------
function fxMatchedRows(html) {
  const old = /<span class="tag a" style="margin-bottom:8px">Matched<\/span><div class="row"><button class="d" onclick="fxDelAlert\('([^']+)'\)">Delete<\/button><\/div>/g;

  return html.replace(old, function (all, id) {
    return '<div class="row fxMatchedRow">'
      + '<button class="d" onclick="fxDelAlert(\'' + id + '\')">Delete</button>'
      + '<span class="fxMatched">Matched</span>'
      + '</div>';
  });
}

const _adminMatched = window.admin;

window.admin = function () {
  const h = _adminMatched();

  return isAdmin() && S.tab === 'fxfin' ? fxMatchedRows(h) : h;
};

// The search box above the alerts re-draws the cards, so fix those as well
const _refreshMatched = window.fxRefreshAlerts;

window.fxRefreshAlerts = function () {
  if (_refreshMatched) {
    _refreshMatched();
  }

  const box = $('fx_alert_list');

  if (box) {
    box.innerHTML = fxMatchedRows(box.innerHTML);
  }
};

// ------------------------------------------------------------
// Hook-up: make the new buttons work, with a "working" label on the saving ones
// ------------------------------------------------------------
Object.assign(window, {
  fxCmd: fxCmd,
  fxLink: fxLink,
  fxColor: fxColor,
  fxNewsSave: fxNewsSave,
  fxNewsEdit: fxNewsEdit,
  fxNewsCancel: fxNewsCancel
});

window.fxNewsSave = busyWrap(window.fxNewsSave, 'Saving...');











// ------------------------------------------------------------
// SECTION: Hook-up and start
// What it does: makes the new functions available to the buttons, gives
// the saving buttons their "Saving..." status, then refreshes the page
// so the new versions take effect straight away.
// ------------------------------------------------------------
Object.assign(window, { fxPick: fxPick, fxAddNews: fxAddNews, fxAddProject: fxAddProject, fxEditAcct: fxEditAcct, fxSaveLogo: fxSaveLogo, fxSaveDonate: fxSaveDonate, fxDonate: fxDonate, fxCloseDonate: fxCloseDonate, fxCopy: fxCopy, fxScan: fxScan, fxSaveAbout: fxSaveAbout });
[['fxAddNews', 'Publishing...'], ['fxAddProject', 'Creating...'], ['fxSaveLogo', 'Saving...'], ['fxSaveDonate', 'Saving...'], ['fxEditAcct', 'Saving...'], ['fxSaveAbout', 'Saving...']].forEach(function (a) { window[a[0]] = busyWrap(window[a[0]], a[1]); });
if (S.ready) reload();
