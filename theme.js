// Light/dark theme. Follows the phone's setting until the person picks one with the toggle button.
// ------------------------------------------------------------
// SECTION: Saved theme
// What it does: On load, applies the light or dark choice saved on this device, if there is
//    one.
// ------------------------------------------------------------
(function(){
  try{
    var t = localStorage.getItem('uzairue_theme');
    if(t) document.documentElement.setAttribute('data-theme', t);
  } catch(e){}
})();

// ------------------------------------------------------------
// SECTION: Helper: current theme
// What it does: Returns "dark" or "light" from the saved choice or the phone's setting.
// ------------------------------------------------------------
function curTheme(){
  var t = document.documentElement.getAttribute('data-theme');
  return t || (
    window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  );
}

// ------------------------------------------------------------
// SECTION: Theme button icon
// What it does: Shows a sun in dark mode and a moon in light mode.
// ------------------------------------------------------------
function setThemeIcon(){
  var b = document.getElementById('theme');
  if(b) b.textContent = curTheme() === 'dark' ? '\u2600' : '\u263E';
}

// ------------------------------------------------------------
// SECTION: Action: switch theme
// What it does: Flips between light and dark and remembers the choice on this device.
// ------------------------------------------------------------
function toggleTheme(){
  var n = curTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', n);
  try{ localStorage.setItem('uzairue_theme', n); } catch(e){}
  setThemeIcon();
}

// ------------------------------------------------------------
// SECTION: Theme icon on load
// What it does: Sets the button icon once the page is ready.
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', setThemeIcon);

// ------------------------------------------------------------
// SECTION: Theme icon on phone change
// What it does: Updates the icon if the phone switches between light and dark.
// ------------------------------------------------------------
if(window.matchMedia)
  matchMedia('(prefers-color-scheme: dark)').addEventListener
  && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setThemeIcon);
