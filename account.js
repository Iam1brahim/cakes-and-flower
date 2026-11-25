var CFG=window.CFG,SB=window.SB;
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmt(n){return '\u20b9'+Number(n).toLocaleString('en-IN')}
function say(id,t,bad){var e=$(id);e.textContent=t;e.className='adm-msg'+(bad?' bad':'')}
function view(v){$('authBox').hidden=v!=='auth';$('resetBox').hidden=v!=='reset';$('acctBox').hidden=v!=='acct'}

var mode='login',recovering=/type=recovery/.test(location.hash);
var next=(new URLSearchParams(location.search)).get('next');
if(next&&!(/^[\w\-.\/#]+$/.test(next)&&next.indexOf('//')<0))next=null; // only allow pages on this site

function setMode(m){
  mode=m;
  $('tabLogin').setAttribute('aria-pressed',m==='login');
  $('tabSignup').setAttribute('aria-pressed',m==='signup');
  $('signupOnly').hidden=m!=='signup';
  $('forgot').hidden=m!=='login';
  $('doAuth').textContent=m==='login'?'Log in':'Create account';
  $('a_pass').autocomplete=m==='login'?'current-password':'new-password';
  say('amsg','');
}
$('tabLogin').onclick=function(){setMode('login')};
$('tabSignup').onclick=function(){setMode('signup')};
$('a_phone').addEventListener('input',function(){this.value=this.value.replace(/[^\d+\s\-]/g,'')});

if(!SB){
  view('auth');say('amsg','The shop is not connected to its database yet.',true);$('doAuth').disabled=true;
}else{
  SB.auth.onAuthStateChange(function(ev){if(ev==='PASSWORD_RECOVERY'){recovering=true;view('reset')}});
  SB.auth.getSession().then(function(s){
    if(recovering)return;
    if(s.data.session)openAccount(s.data.session.user);else view('auth');
  });
}

$('doAuth').onclick=async function(){
  var email=$('a_email').value.trim(),pass=$('a_pass').value,btn=this;
  if(!email||!pass){say('amsg','Please enter your email and password.',true);return}
  var r;
  btn.disabled=true;say('amsg','Please wait...');
  if(mode==='login'){
    r=await SB.auth.signInWithPassword({email:email,password:pass});
  }else{
    var name=$('a_name').value.trim(),ph=$('a_phone').value.replace(/[\s\-()]/g,'').replace(/^(\+91|91|0)(?=\d{10}$)/,'');
    if(!name){say('amsg','Please enter your name.',true);btn.disabled=false;return}
    if(!/^[6-9]\d{9}$/.test(ph)){say('amsg','Please enter a valid 10-digit mobile number.',true);btn.disabled=false;return}
    if(pass.length<8){say('amsg','Use a password with at least 8 characters.',true);btn.disabled=false;return}
    r=await SB.auth.signUp({email:email,password:pass,options:{data:{name:name,phone:ph}}});
  }
  btn.disabled=false;
  if(r.error){say('amsg',r.error.message,true);return}
  if(!r.data.session){say('amsg','Almost done. Check your email and click the confirmation link, then log in.');return}
  if(next){location.href=next;return}
  openAccount(r.data.session.user);
};
$('a_pass').addEventListener('keydown',function(e){if(e.key==='Enter')$('doAuth').click()});

$('forgot').onclick=async function(e){
  e.preventDefault();
  var email=$('a_email').value.trim();
  if(!email){say('amsg','Type your email above first, then click Forgot your password.',true);return}
  var r=await SB.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  if(r.error)say('amsg',r.error.message,true);else say('amsg','If that email has an account, we have sent a link to reset your password.');
};
$('doReset').onclick=async function(){
  var p=$('r_pass').value;
  if(p.length<8){say('rmsg','Use at least 8 characters.',true);return}
  var r=await SB.auth.updateUser({password:p});
  if(r.error){say('rmsg',r.error.message,true);return}
  history.replaceState(null,'',location.pathname);
  recovering=false;
  var s=await SB.auth.getSession();
  if(s.data.session)openAccount(s.data.session.user);else view('auth');
};
$('logout').onclick=async function(){await SB.auth.signOut();$('a_pass').value='';view('auth');setMode('login')};

async function openAccount(u){
  var m=u.user_metadata||{};
  $('who').textContent=m.name?'Hi, '+m.name:'Welcome';
  $('mail').textContent=u.email;
  view('acct');
  var r=await SB.from('orders').select('*').eq('user_id',u.id).order('created_at',{ascending:false});
  var box=$('orders');
  if(r.error){box.innerHTML='<p class="empty">We could not load your orders right now. Please try again later.</p>';return}
  if(!r.data.length){box.innerHTML='<p class="empty">You have not placed any orders yet. <a href="index.html">Browse the shop</a></p>';return}
  var D=function(s){return new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})};
  box.innerHTML=r.data.map(function(o){
    var ref=String(o.id).slice(0,8).toUpperCase();
    var rows=(o.items||[]).map(function(i){return '<div class="ord-line"><span>'+esc(i.qty)+' \u00d7 '+esc(i.name)+'</span><span>'+fmt(i.qty*i.price)+'</span></div>'}).join('');
    var wa='https://wa.me/'+CFG.WA+'?text='+encodeURIComponent('Hello Petal & Stem, I have a question about my order #'+ref);
    return '<div class="ord"><div class="ord-h"><strong>Order #'+ref+'</strong><span class="pill st-'+esc(o.status.replace(/\s/g,'').toLowerCase())+'">'+esc(o.status)+'</span></div>'
      +'<div class="ord-sub">Placed on '+D(o.created_at)+' \u00b7 Delivery on '+D(o.delivery_date+'T00:00:00')+'</div>'
      +rows+'<div class="ord-line ord-total"><span>Total</span><span>'+fmt(o.total)+'</span></div>'
      +'<div class="ord-sub">'+esc(o.customer_name)+' \u00b7 '+esc(o.phone)+'<br>'+esc(o.address)+', '+esc(o.pincode)+(o.message?'<br>Card message: '+esc(o.message):'')+'</div>'
      +'<a class="ord-wa" href="'+wa+'" target="_blank" rel="noopener">Ask about this order on WhatsApp</a></div>';
  }).join('');
}
