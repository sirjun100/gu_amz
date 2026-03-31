/** task_type: similar_click */
function 同行同类广告点击流程(task) {
  var p = task.params || {};
  var kw = p.keyword != null ? String(p.keyword) : "";

  打开AMG();
  按顺序选择环境();
  打开Chrome浏览器();
  打开亚马逊首页();
  if (!检查账号是否已登录()) {
    throw new Error("账号未登录: 页面出现 Sign in");
  }
  首页随机浏览(2, 4);
  关键词库随机搜索浏览或加购(2, 5);
  任务关键词搜索竞品进详情(kw, 1, 3);
  详情页同类推荐广告点击("目标品牌/ASIN见params", 2, 3, 1, 3);
}
