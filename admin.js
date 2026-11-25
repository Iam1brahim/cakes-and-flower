var CFG=window.CFG;
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var BUCKET='product-images',rows=[],editing=null,sb=null;

if(!window.supabase||!CFG.SUPABASE_URL||CFG.SUPABASE_URL.indexOf('YOUR-')>-1){
  $('lerr').textContent='Supabase is not set up yet. Fill in config.js first (see SETUP.md).';
  $('loginBtn').disabled=true;
}else{
  sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY);
  sb.auth.getSession().then(function(s){show(!!(s.data&&s.data.session))});
}
function msg(t,bad){$('msg').textContent=t;$('msg').className='adm-msg'+(bad?' bad':'')}
function show(on){$('login').hidden=on;$('app').hidden=!on;if(on)load()}

$('loginBtn').onclick=async function(){
  $('lerr').textContent='';
  var r=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('pass').value});
  if(r.error){$('lerr').textContent=r.error.message}else{$('pass').value='';show(true)}
};
$('pass').addEventListener('keydown',function(e){if(e.key==='Enter')$('loginBtn').click()});
$('logout').onclick=async function(){await sb.auth.signOut();show(false)};

async function load(){
  var r=await sb.from('products').select('*').order('sort').order('created_at');
  if(r.error){msg('Could not load products: '+r.error.message,true);return}
  rows=r.data||[];draw();
}
function draw(){
  var cats=[];rows.forEach(function(p){if(p.category&&cats.indexOf(p.category)<0)cats.push(p.category)});
  $('cats').innerHTML=cats.map(function(c){return '<option value="'+esc(c)+'">'}).join('');
  $('list').innerHTML=rows.length?rows.map(function(p){
    return '<div class="adm-row'+(p.active?'':' off')+'" data-id="'+p.id+'">'
      +(p.image_url?'<img src="'+esc(p.image_url)+'" alt="">':'<div class="ph"></div>')
      +'<div class="info"><strong>'+esc(p.name)+'</strong><span>'+esc(p.category)+(p.active?'':' · hidden')+'</span></div><div></div>'
      +'<div class="acts"><span>₹</span><input class="pr" type="number" min="0" step="1" value="'+p.price+'" aria-label="Price for '+esc(p.name)+'">'
      +'<button data-act="price">Save price</button><button data-act="toggle">'+(p.active?'Hide':'Show')+'</button>'
      +'<button data-act="edit">Edit</button><button class="danger" data-act="del">Delete</button></div></div>';
  }).join(''):'<p class="empty">No products yet. Add your first one above.</p>';
}

$('list').addEventListener('click',async function(e){
  var act=e.target.getAttribute('data-act');if(!act)return;
  var row=e.target.closest('.adm-row'),id=row.getAttribute('data-id');
  var p=rows.filter(function(x){return x.id===id})[0];if(!p)return;
  if(act==='edit'){startEdit(p);return}
  var r;
  if(act==='price'){
    var v=parseInt(row.querySelector('.pr').value,10);
    if(isNaN(v)||v<0){msg('Enter a valid price.',true);return}
    r=await sb.from('products').update({price:v}).eq('id',id);
  }else if(act==='toggle'){
    r=await sb.from('products').update({active:!p.active}).eq('id',id);
  }else if(act==='del'){
    if(!confirm('Delete "'+p.name+'" permanently?'))return;
    r=await sb.from('products').delete().eq('id',id);
    if(!r.error)removeImage(p.image_url);
  }
  if(r&&r.error){msg('Error: '+r.error.message,true);return}
  msg('Done.');load();
});

function startEdit(p){
  editing=p.id;
  $('formTitle').textContent='Edit product';
  $('f_name').value=p.name;$('f_cat').value=p.category||'';$('f_price').value=p.price;
  $('f_desc').value=p.description||'';$('f_active').checked=!!p.active;$('f_img').value='';
  setPrev(p.image_url);$('cancel').hidden=false;
  msg('Editing "'+p.name+'". Choose a new photo only if you want to replace it.');
  window.scrollTo({top:0,behavior:'smooth'});
}
function setPrev(u){var i=$('f_prev');if(u){i.src=u;i.hidden=false}else{i.removeAttribute('src');i.hidden=true}}
function reset(){
  editing=null;$('formTitle').textContent='Add a product';
  ['f_name','f_cat','f_price','f_desc'].forEach(function(i){$(i).value=''});
  $('f_active').checked=true;$('f_img').value='';setPrev(null);$('cancel').hidden=true;
}
$('cancel').onclick=function(){reset();msg('')};
$('f_img').addEventListener('change',function(){var f=this.files[0];setPrev(f?URL.createObjectURL(f):null)});

// shrink big phone photos to max 1000px before uploading (keeps the shop fast)
function shrink(file){return new Promise(function(res,rej){
  var img=new Image(),u=URL.createObjectURL(file);
  img.onload=function(){
    var s=Math.min(1,1000/Math.max(img.width,img.height)),c=document.createElement('canvas');
    c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);
    c.toBlob(function(b){b?res(b):rej(new Error('Could not process the image'))},'image/jpeg',0.85);
  };
  img.onerror=function(){rej(new Error('That file is not a valid image'))};
  img.src=u;
})}
async function uploadImage(file){
  var blob=await shrink(file),path=Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.jpg';
  var r=await sb.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg'});
  if(r.error)throw r.error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
function removeImage(url){
  if(!url||url.indexOf('/'+BUCKET+'/')<0)return;
  sb.storage.from(BUCKET).remove([url.split('/'+BUCKET+'/')[1]]);
}

$('save').onclick=async function(){
  var name=$('f_name').value.trim(),price=parseInt($('f_price').value,10);
  if(!name||isNaN(price)||price<0){msg('Enter a name and a valid price.',true);return}
  var data={name:name,category:$('f_cat').value.trim()||'Bouquets',price:price,description:$('f_desc').value.trim(),active:$('f_active').checked};
  var file=$('f_img').files[0],oldUrl=null;
  $('save').disabled=true;msg('Saving...');
  try{
    if(file){
      if(editing){var cur=rows.filter(function(x){return x.id===editing})[0];oldUrl=cur&&cur.image_url}
      data.image_url=await uploadImage(file);
    }
    var r=editing?await sb.from('products').update(data).eq('id',editing):await sb.from('products').insert(data);
    if(r.error)throw r.error;
    if(oldUrl)removeImage(oldUrl);
    reset();msg('Saved. It is now on your shop page.');await load();
  }catch(err){msg('Error: '+(err.message||err),true)}
  $('save').disabled=false;
};
