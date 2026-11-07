// Light/dark theme. Follows the phone's setting until the person picks one with the toggle button.
(function(){try{var t=localStorage.getItem('uzairue_theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}})();
function curTheme(){var t=document.documentElement.getAttribute('data-theme');return t||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}
function setThemeIcon(){var b=document.getElementById('theme');if(b)b.textContent=curTheme()==='dark'?'\u2600':'\u263E'}
function toggleTheme(){var n=curTheme()==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('uzairue_theme',n)}catch(e){}setThemeIcon()}
document.addEventListener('DOMContentLoaded',setThemeIcon);
if(window.matchMedia)matchMedia('(prefers-color-scheme: dark)').addEventListener&&matchMedia('(prefers-color-scheme: dark)').addEventListener('change',setThemeIcon);
