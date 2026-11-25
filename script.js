var CFG=window.CFG,SB=window.SB;
// Customers must log in to order. To allow guest orders (WhatsApp only, nothing saved) add REQUIRE_LOGIN:false in config.js
var REQUIRE=CFG.REQUIRE_LOGIN!==false&&!!SB;
var HERO={bg:'#eadcf0',c:'#b57bc4',c2:'#e48aa5',n:9};
var FALLBACK=[]; // on purpose: the shop shows only what is in your database
var items=[],cart={},current='All',user=null;
function fmt(n){return '\u20b9'+Number(n).toLocaleString('en-IN')}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function saveCart(){try{localStorage.setItem('ps_cart',JSON.stringify(cart))}catch(e){}}
try{cart=JSON.parse(localStorage.getItem('ps_cart')||'{}')||{}}catch(e){cart={}}
function art(it,size){
  var s='<svg viewBox="0 0 200 220" aria-hidden="true">';
  s+='<path d="M100 215 L62 120 L138 120 Z" fill="#e9c9b0" opacity=".9"/><path d="M62 120 L138 120 L100 150 Z" fill="#fff" opacity=".35"/>';
  for(var i=0;i<it.n;i++){
    var a=(i/(it.n-1))*Math.PI-Math.PI;
    var cx=100+Math.cos(a)*58*(0.55+0.45*((i%2)?1:0.8)), cy=88+Math.sin(a)*52*((i%2)?1:0.7)-((i%3)*6);
    s+='<line x1="100" y1="125" x2="'+cx.toFixed(1)+'" y2="'+cy.toFixed(1)+'" stroke="#6c9a6b" stroke-width="3"/>';
  }
  for(var j=0;j<it.n;j++){
    var b=(j/(it.n-1))*Math.PI-Math.PI;
    var x=100+Math.cos(b)*58*(0.55+0.45*((j%2)?1:0.8)), y=88+Math.sin(b)*52*((j%2)?1:0.7)-((j%3)*6);
    var r=15+((j%3)*2);
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+(j%2?it.c:it.c2)+'"/><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(r*0.45).toFixed(1)+'" fill="#fff" opacity=".35"/>';
  }
  return s+'</svg>';
}
async function loadItems(){
  if(SB){
    try{
      var r=await SB.from('products').select('*').eq('active',true).order('sort').order('created_at');
      if(!r.error){
        items=(r.data||[]).map(function(x){
          var o={id:x.id,cat:x.category||'Other',name:x.name,price:x.price,desc:x.description||''};
          if(x.image_url)o.img=x.image_url;else{o.bg='#f6d3da';o.c='#d9627f';o.c2='#f08aa3';o.n=7}
          return o;
        });
        return;
      }
    }catch(e){}
  }
  items=FALLBACK;
}
var grid=document.getElementById('grid'),tabs=document.getElementById('tabs');
function showGrid(){
  var c=['All'];items.forEach(function(i){if(c.indexOf(i.cat)<0)c.push(i.cat)});
  if(c.indexOf(current)<0)current='All';
  tabs.innerHTML=c.length>2?c.map(function(x){return '<button data-cat="'+esc(x)+'" aria-pressed="'+(x===current)+'">'+esc(x)+'</button>'}).join(''):'';
  grid.innerHTML=items.length?'':'<p class="empty">Our menu is being updated. Please check back soon or message us on WhatsApp.</p>';
  items.filter(function(i){return current==='All'||i.cat===current}).forEach(function(it){
    var d=document.createElement('div');d.className='card';
    var pic=it.img?'<div class="art photo"><img src="'+esc(it.img)+'" alt="'+esc(it.name)+'" loading="lazy"></div>':'<div class="art" style="background:'+it.bg+'">'+art(it)+'</div>';
    d.innerHTML=pic+'<div class="body"><h3>'+esc(it.name)+'</h3><p class="desc">'+esc(it.desc)+'</p><div class="row"><span class="price">'+fmt(it.price)+'</span><button class="add" data-id="'+esc(it.id)+'">Add to order</button></div></div>';
    grid.appendChild(d);
  });
}
tabs.addEventListener('click',function(e){var c=e.target.getAttribute('data-cat');if(c){current=c;showGrid()}});
grid.addEventListener('click',function(e){var id=e.target.getAttribute('data-id');if(id){document.getElementById('done').hidden=true;cart[id]=(cart[id]||0)+1;render();e.target.textContent='Added';setTimeout(function(){e.target.textContent='Add to order'},900)}});
function total(){var t=0;items.forEach(function(i){t+=(cart[i.id]||0)*i.price});return t}
function render(){
  var h='',c=0;
  items.forEach(function(i){var q=cart[i.id]||0;if(q){c+=q;h+='<div class="item"><div><strong>'+esc(i.name)+'</strong><div class="empty" style="margin:0">'+fmt(i.price)+' each</div></div><div class="qty"><button data-m="'+esc(i.id)+'" aria-label="Remove one '+esc(i.name)+'">\u2212</button><span>'+q+'</span><button data-p="'+esc(i.id)+'" aria-label="Add one '+esc(i.name)+'">+</button></div></div>'}});
  document.getElementById('count').textContent=c;
  document.getElementById('cart').innerHTML=c?h+'<div class="total"><span>Total</span><span>'+fmt(total())+'</span></div>':'<p class="empty">Your order is empty. Pick an item above to add it here.</p>';
  saveCart();
}
document.getElementById('cart').addEventListener('click',function(e){
  var m=e.target.getAttribute('data-m'),p=e.target.getAttribute('data-p');
  if(p)cart[p]++;if(m){cart[m]--;if(cart[m]<=0)delete cart[m]}render();
});

// date: earliest delivery is LEAD_DAYS from today
var dt=document.getElementById('date');
var t=new Date();t.setDate(t.getDate()+CFG.LEAD_DAYS);t.setMinutes(t.getMinutes()-t.getTimezoneOffset());dt.min=t.toISOString().slice(0,10);
// phone: block junk while typing
document.getElementById('phone').addEventListener('input',function(){this.value=this.value.replace(/[^\d+\s\-]/g,'')});

function waUrl(l){return 'https://wa.me/'+CFG.WA+'?text='+encodeURIComponent(l.join('\n'))}
function lines(o,d){
  var l=['Hello Petal & Stem, I would like to order:'];
  if(o.ref)l.push('Order #'+o.ref);
  l.push('');
  o.rows.forEach(function(r){l.push(r.qty+' x '+r.name+' - '+fmt(r.qty*r.price))});
  l.push('','Total: '+fmt(o.total),'','Name: '+d.name,'Phone: '+d.ph,'Address: '+d.addr+', '+CFG.CITY+' '+d.pin,'Delivery date: '+d.date);
  if(d.msg)l.push('Card message: '+d.msg);
  return l;
}

document.getElementById('send').addEventListener('click',async function(){
  var btn=this,g=function(i){return document.getElementById(i).value.trim()},err=document.getElementById('err'),gate=document.getElementById('gate');
  document.getElementById('done').hidden=true;
  if(!total()){err.textContent='Add at least one item to your order.';return}
  if(!g('name')||!g('phone')||!g('addr')||!g('date')){err.textContent='Please fill in your name, phone, address and delivery date.';return}
  var ph=g('phone').replace(/[\s\-()]/g,'').replace(/^(\+91|91|0)(?=\d{10}$)/,'');
  if(!/^[6-9]\d{9}$/.test(ph)){err.textContent='Please enter a valid 10-digit mobile number.';return}
  if(g('date')<dt.min){err.textContent='Please choose a delivery date at least '+CFG.LEAD_DAYS+' days from today.';return}
  var pin=g('pin');
  if(!/^\d{6}$/.test(pin)||pin.indexOf(CFG.PIN_PREFIX)!==0){err.textContent='Enter a valid 6-digit '+CFG.CITY+' pincode. We deliver in '+CFG.CITY+' only.';return}
  err.textContent='';
  var d={name:g('name'),addr:g('addr'),date:g('date'),msg:g('msg'),ph:ph,pin:pin};

  if(!user){
    if(REQUIRE){err.textContent='Please log in or sign up to place your order.';gate.hidden=false;gate.scrollIntoView({behavior:'smooth',block:'center'});return}
    var rows=items.filter(function(i){return cart[i.id]}).map(function(i){return {name:i.name,qty:cart[i.id],price:i.price}});
    window.open(waUrl(lines({rows:rows,total:total()},d)),'_blank');return;
  }

  btn.disabled=true;err.textContent='Saving your order...';
  var w=window.open('','_blank'),r;
  try{
    r=await SB.rpc('place_order',{p_items:Object.keys(cart).map(function(k){return {id:k,qty:cart[k]}}),p_name:d.name,p_phone:ph,p_address:d.addr,p_pin:pin,p_date:d.date,p_message:d.msg});
  }catch(e){r={error:{message:'Could not reach the server. Please try again.'}}}
  btn.disabled=false;
  if(r.error){if(w)w.close();err.textContent=r.error.message;return}
  var o=r.data,ref=String(o.id).slice(0,8).toUpperCase(),url=waUrl(lines({ref:ref,rows:o.items,total:o.total},d));
  err.textContent='';cart={};render();
  var dn=document.getElementById('done');
  dn.innerHTML='<strong>Order #'+ref+' saved ('+fmt(o.total)+').</strong> Press Send in WhatsApp so we can confirm it with you.<div class="gate-links"><a class="btn sm" target="_blank" rel="noopener" href="'+url+'">Open WhatsApp</a><a href="account.html">See My orders</a></div>';
  dn.hidden=false;dn.scrollIntoView({behavior:'smooth',block:'center'});
  if(w)w.location.href=url;
});

// page text driven by config.js
[].forEach.call(document.querySelectorAll('.city'),function(e){e.textContent=CFG.CITY});
[].forEach.call(document.querySelectorAll('.lead'),function(e){e.textContent=CFG.LEAD_DAYS});
var wl=document.getElementById('waLink');wl.href='https://wa.me/'+CFG.WA;wl.textContent='+'+CFG.WA;
document.getElementById('heroArt').outerHTML=art(HERO).replace('<svg','<svg id="heroArt"');

// login state
function paint(){
  document.getElementById('acct').textContent=user?'My orders':'Log in';
  document.getElementById('gate').hidden=!(REQUIRE&&!user);
  if(user){
    var m=user.user_metadata||{},n=document.getElementById('name'),p=document.getElementById('phone');
    if(!n.value&&m.name)n.value=m.name;
    if(!p.value&&m.phone)p.value=m.phone;
    var a=document.getElementById('addr'),z=document.getElementById('pin');
    if(!a.value&&m.address)a.value=m.address;
    if(!z.value&&m.pin)z.value=m.pin;
  }
}
if(SB){
  SB.auth.getSession().then(function(s){user=s.data.session?s.data.session.user:null;paint()});
  SB.auth.onAuthStateChange(function(ev,sess){user=sess?sess.user:null;paint()});
}
render();
loadItems().then(function(){
  Object.keys(cart).forEach(function(k){if(!items.some(function(i){return i.id===k}))delete cart[k]});
  showGrid();render();
});
