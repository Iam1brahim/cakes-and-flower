// One shared Supabase connection for the shop and account pages.
(function(){
  var C=window.CFG||{};
  window.SB=(window.supabase&&C.SUPABASE_URL&&C.SUPABASE_ANON_KEY&&C.SUPABASE_URL.indexOf('YOUR-')<0)
    ?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
})();
