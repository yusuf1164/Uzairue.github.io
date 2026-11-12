// Public pages: home (news, projects, donate) and the members-only Council page.
// ------------------------------------------------------------
// SECTION: Home page (public)
// What it does: Draws the hero banner, news cards with thumbnails, project cards with
//    progress bars and donate buttons, and the support section. Anyone can see it.
// ------------------------------------------------------------
//function home(){
  //let h='<div class="hero"><h1>UZAIRUE</h1><p>One community, one future. Follow our news, back our projects and join the family.</p><div class="row"><button class="p" onclick="jump(\'donate\')">Support a project</button>'+(S.user?'':'<button onclick="go(\'signup\')">Join now</button>')+'</div></div>';
  //h+='<h2 id="news">Announcements &amp; News</h2><div class="grid">';
  //if(!S.news.length)h+='<div class="card mute">No news yet.</div>';
  //S.news.forEach(n=>{h+='<div class="card">'+(ok(n.img)?'<img class="thumb" src="'+esc(n.img)+'" alt="">':'')+'<h3>'+esc(n.title)+'</h3><p>'+esc(n.body)+'</p></div>'});
  //h+='</div><h2 id="projects">Projects &amp; Progress</h2><div class="grid">';
  //if(!S.proj.length)h+='<div class="card mute">No projects yet.</div>';
  //S.proj.forEach(p=>{h+='<div class="card"><h3>'+esc(p.title)+'</h3><p class="mute">'+esc(p.body)+'</p><div class="bar"><i style="width:'+pct(p)+'%"></i></div><div class="mute">'+pct(p)+'% · ₦'+(p.raised||0).toLocaleString()+' of ₦'+(p.target||0).toLocaleString()+'</div>'+(ok(p.link)?'<div class="row"><a class="btn p" href="'+esc(p.link)+'" target="_blank" rel="noopener">Donate</a></div>':'')+'</div>'});
  //return <--h+'</div><h2 id="donate">Support the community</h2><div class="card">Every contribution moves a project forward. Use the Donate button on any project above.</div>'}--!>
// ------------------------------------------------------------
// SECTION: Council page (members only)
// What it does: Shows the King of Uzairue at the top, then the king's entourage, then each
//    village's leaders in A-Z village order.
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
