/* 花园的在线存储。按 关于我\docs\花园数据库设置.md 建好 Supabase 项目后，把两个值填进来。
   两个都留空时，花只存在访客自己的浏览器里。
   这里放的是公开的 publishable（anon）key，本来就是给网页用的；service_role / secret key 千万别放这里。 */
window.GARDEN_SUPABASE = {
  url: "https://qvbuuajdqvjwsoaouqua.supabase.co",
  anonKey: "sb_publishable_fDPzi6JhxD1Q5li-E0wISw_nQST7OZb"
};
