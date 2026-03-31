/** search_click：根据 params 找目标商品并点广告 */
function 搜索并点击目标任务广告(task) {
  AMZ_执行标准步骤("搜索并点击目标任务广告", function (attemptIndex) {
    var p = task.params || {};
    日志收集器.添加(
      "步骤: 搜索并点击目标任务广告 keyword=" +
        (p.keyword || "") +
        " title=" +
        (p.product_title || "") +
        " (attempt=" +
        (attemptIndex + 1) +
        ")"
    );
    随机等待分钟(2, 3);
  });
}
