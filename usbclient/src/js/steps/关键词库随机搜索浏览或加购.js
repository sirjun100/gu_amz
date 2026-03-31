/** 调服务端随机词库，模拟搜索后浏览/加购 */
function 关键词库随机搜索浏览或加购(最小分钟, 最大分钟) {
  AMZ_执行标准步骤("关键词库随机搜索浏览或加购", function (attemptIndex) {
    日志收集器.添加("步骤: 关键词库随机搜索浏览或加购 (attempt=" + (attemptIndex + 1) + ")");
    var rk = 运维接口.随机关键词(3);
    if (rk != null && rk.keywords && rk.keywords.length > 0) {
      日志收集器.添加("随机词: " + rk.keywords.join(", "));
    } else {
      日志收集器.添加("随机关键词接口无词，跳过词列表");
    }
    随机等待分钟(最小分钟, 最大分钟);
  });
}
