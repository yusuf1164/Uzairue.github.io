  };

  Object.assign(window, {
    addDon: fxAddDonation,
    fxAdminRecord: fxRecordDues,
    fxSaveAlert: fxSaveAlert,
    fxMatchAlert: fxMatchAlert,
    fxConfirmCash: fxConfirmCash,
    fxSaveExpense: fxSaveExpense,
    fxDelExpense: fxDelExpense,
    fxRecalcNow: fxRecalcNow,
    fxDownloadReceipt: fxDownloadReceipt
  });

  [
    ['addDon', 'Recording...'],
    ['fxAdminRecord', 'Recording...'],
    ['fxSaveAlert', 'Saving...'],
    ['fxMatchAlert', 'Matching...'],
    ['fxConfirmCash', 'Saving...'],
    ['fxSaveExpense', 'Saving...'],
    ['fxDelExpense', 'Deleting...'],
    ['fxRecalcNow', 'Updating...']
  ].forEach(function (pair) {
    window[pair[0]] = busyWrap(window[pair[0]], pair[1]);
  });


  
  // ------------------------------------------------------------
  // SECTION: Hook-up and start
  // What it does: makes the new functions available to the buttons, gives
  // the saving buttons their "Saving..." status, then refreshes the page
  // so the new versions take effect straight away.
  // ------------------------------------------------------------
  Object.assign(window, { fxPick: fxPick, fxAddNews: fxAddNews, fxAddProject: fxAddProject, fxEditAcct: fxEditAcct, fxSaveLogo: fxSaveLogo, fxSaveDonate: fxSaveDonate, fxDonate: fxDonate, fxCloseDonate: fxCloseDonate, fxCopy: fxCopy, fxScan: fxScan, fxSaveAbout: fxSaveAbout });
  [['fxAddNews', 'Publishing...'], ['fxAddProject', 'Creating...'], ['fxSaveLogo', 'Saving...'], ['fxSaveDonate', 'Saving...'], ['fxEditAcct', 'Saving...'], ['fxSaveAbout', 'Saving...']].forEach(function (a) { window[a[0]] = busyWrap(window[a[0]], a[1]); });
  if (S.ready) reload();
})();
