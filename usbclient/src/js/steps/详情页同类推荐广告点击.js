/** You might also like / sponsored 区 */
function 详情页同类推荐广告点击(品牌或说明, 最少次, 最多次, 每次浏览最小分钟, 每次浏览最大分钟) {
  AMZ_执行标准步骤("详情页同类推荐广告点击", function (attemptIndex) {
    日志收集器.添加("步骤: 详情页同类推荐广告点击 " + String(品牌或说明) + " (attempt=" + (attemptIndex + 1) + ")");
    var n = 随机区间(最少次 == null ? 2 : 最少次, 最多次 == null ? 3 : 最多次);
    for (var i = 0; i < n; i++) {
      日志收集器.添加("同类推荐广告第 " + (i + 1) + "/" + n + " 次");
      随机等待分钟(
        每次浏览最小分钟 == null ? 1 : 每次浏览最小分钟,
        每次浏览最大分钟 == null ? 3 : 每次浏览最大分钟
      );
    }
  });
}
