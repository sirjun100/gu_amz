/** related / similar：用任务关键词找竞品并进详情页 */
function 任务关键词搜索竞品进详情(关键词, 最小分钟, 最大分钟) {
  AMZ_执行标准步骤("任务关键词搜索竞品进详情", function (attemptIndex) {
    日志收集器.添加(
      "步骤: 任务关键词搜索竞品进详情 关键词=" + 关键词 + " (attempt=" + (attemptIndex + 1) + ")"
    );
    随机等待分钟(最小分钟, 最大分钟);
  });
}
