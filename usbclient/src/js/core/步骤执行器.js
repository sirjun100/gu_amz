/**
 * 统一步骤执行器：
 * 1) 动作
 * 2) 图色判断
 * 3) 不通过则重试（默认 2 次）
 * 4) 仍失败则图标找色点击 -> 坐标点击兜底，再次判断
 */

function AMZ_取步骤规则(stepName) {
  var cfg = (AMZ_CONFIG && AMZ_CONFIG.steps) || {};
  var defaults = cfg._default || {};
  var item = cfg[stepName] || {};
  return {
    requireVerify: item.requireVerify != null ? !!item.requireVerify : defaults.requireVerify !== false,
    retryTimes: Number(item.retryTimes != null ? item.retryTimes : defaults.retryTimes),
    retryWaitMs: Number(item.retryWaitMs != null ? item.retryWaitMs : defaults.retryWaitMs),
    verifyColorPoints: String(item.verifyColorPoints != null ? item.verifyColorPoints : ""),
    verifyThreshold: Number(item.verifyThreshold != null ? item.verifyThreshold : defaults.verifyThreshold),
    verifyRect: item.verifyRect || defaults.verifyRect || null,
    iconColor: String(item.iconColor != null ? item.iconColor : ""),
    iconColorThreshold: Number(item.iconColorThreshold != null ? item.iconColorThreshold : defaults.iconColorThreshold),
    iconSearchRect: item.iconSearchRect || defaults.iconSearchRect || null,
    iconSearchLimit: Number(item.iconSearchLimit != null ? item.iconSearchLimit : defaults.iconSearchLimit),
    fallbackTapX: Number(item.fallbackTapX != null ? item.fallbackTapX : 0),
    fallbackTapY: Number(item.fallbackTapY != null ? item.fallbackTapY : 0),
    fallbackWaitMs: Number(item.fallbackWaitMs != null ? item.fallbackWaitMs : defaults.fallbackWaitMs),
  };
}

function AMZ_步骤图色检查(stepName) {
  var r = AMZ_取步骤规则(stepName);
  if (r.verifyColorPoints.length === 0) {
    if (r.requireVerify) {
      logw("步骤[" + stepName + "] 未配置 verifyColorPoints，按未通过处理");
      return false;
    }
    logw("步骤[" + stepName + "] 未配置 verifyColorPoints，已按配置跳过图色判断");
    return true;
  }
  if (typeof image === "undefined" || image == null || typeof image.cmpColorEx !== "function") {
    logw("步骤[" + stepName + "] image.cmpColorEx 不可用");
    return false;
  }
  var rect = AMZ_标准化区域(r.verifyRect);
  var th = r.verifyThreshold;
  if (isNaN(th) || th <= 0 || th > 1) {
    th = 0.9;
  }
  return image.cmpColorEx(r.verifyColorPoints, th, rect.x, rect.y, rect.ex, rect.ey) === true;
}

function AMZ_步骤图标找色点击(stepName) {
  var r = AMZ_取步骤规则(stepName);
  if (r.iconColor.length === 0) {
    return false;
  }
  if (typeof image === "undefined" || image == null || typeof image.findColorEx !== "function") {
    return false;
  }
  var rect = AMZ_标准化区域(r.iconSearchRect);
  var th = r.iconColorThreshold;
  if (isNaN(th) || th <= 0 || th > 1) {
    th = 0.9;
  }
  var limit = r.iconSearchLimit;
  if (isNaN(limit) || limit <= 0) {
    limit = 1;
  }
  var pts = image.findColorEx(r.iconColor, th, rect.x, rect.y, rect.ex, rect.ey, limit, 1);
  if (pts != null && pts.length > 0) {
    clickPoint(pts[0].x, pts[0].y);
    sleep(isNaN(r.fallbackWaitMs) || r.fallbackWaitMs < 200 ? 1200 : r.fallbackWaitMs);
    return true;
  }
  return false;
}

function AMZ_步骤坐标兜底点击(stepName) {
  var r = AMZ_取步骤规则(stepName);
  if (isNaN(r.fallbackTapX) || isNaN(r.fallbackTapY) || r.fallbackTapX <= 0 || r.fallbackTapY <= 0) {
    return false;
  }
  clickPoint(Math.floor(r.fallbackTapX), Math.floor(r.fallbackTapY));
  sleep(isNaN(r.fallbackWaitMs) || r.fallbackWaitMs < 200 ? 1200 : r.fallbackWaitMs);
  return true;
}

function AMZ_执行标准步骤(stepName, actionFn) {
  var r = AMZ_取步骤规则(stepName);
  var retry = r.retryTimes;
  if (isNaN(retry) || retry < 0) {
    retry = 2;
  }
  var waitMs = r.retryWaitMs;
  if (isNaN(waitMs) || waitMs < 200) {
    waitMs = 1200;
  }

  for (var i = 0; i <= retry; i++) {
    actionFn(i);
    if (AMZ_步骤图色检查(stepName)) {
      日志收集器.添加("步骤通过: " + stepName + " (attempt=" + (i + 1) + ")");
      return true;
    }
    logw("步骤校验失败: " + stepName + " (attempt=" + (i + 1) + ")");
    sleep(waitMs);
  }

  日志收集器.添加("步骤重试失败，启用备用方案: " + stepName);
  var fb1 = AMZ_步骤图标找色点击(stepName);
  if (!fb1) {
    AMZ_步骤坐标兜底点击(stepName);
  }
  if (AMZ_步骤图色检查(stepName)) {
    日志收集器.添加("步骤备用方案通过: " + stepName);
    return true;
  }
  throw new Error("步骤失败: " + stepName + "（重试与备用方案后仍未通过图色校验）");
}
