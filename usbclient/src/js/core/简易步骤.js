/**
 * 轻量步骤执行：只负责调用动作与打印日志，不做图色校验/重试/兜底点击。
 * 保留 AMZ_执行标准步骤 兼容现有 steps/*.js 的调用方式。
 */
function AMZ_执行标准步骤(stepName, actionFn) {
  var name = stepName != null ? String(stepName) : "未命名步骤";
  if (typeof actionFn !== "function") {
    throw new Error("步骤[" + name + "] actionFn 不是函数");
  }
  日志收集器.添加("步骤开始: " + name);
  actionFn(0);
  日志收集器.添加("步骤完成: " + name);
}
