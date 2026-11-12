// ------------------------------------------------------------
// SECTION: Council page (members only)
// What it does: Shows the King of Uzairue at the top, then the king's entourage, then each
//    village's leaders in A-Z village order. This is the base version; features-members.js
//    adds the "Kingdom of Uzairue" label after each village heading.
// ------------------------------------------------------------
function council(){
  const by=l=>S.coun.filter(c=>c.level===l).sort((a,b)=>(a.rank||99)-(b.rank||99));
  const person=c=>'<div class="card mem">'+av(c)+'<h3>'+esc(c.name)+'</h3><span class="tag a">'+esc(c.title)+'</span></div>';
  const k=by('kingdom');let h='<h2>Traditional Council</h2>';
  if(!k.length)h+='<div class="card mute">The council has not been added yet.</div>';
  if(k[0])h+='<div class="card king">'+av(k[0])+'<div><div class="mute">Seat: Jattu</div><h3>'+esc(k[0].name)+'</h3><span class="tag a">'+esc(k[0].title)+'</span></div></div>';
  if(k.length>1)h+='<h2>The King’s Entourage</h2><div class="grid">'+k.slice(1).map(person).join('')+'</div>';
  S.vil.forEach(vl=>{const l=by(vl.name);if(l.length)h+='<h2>'+esc(vl.name)+'</h2><div class="grid">'+l.map(person).join('')+'</div>'});
  return h}
