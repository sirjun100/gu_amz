/**
 * 与 ios-jslibs 对接：device.getDeviceId()、全局 appLaunch(bundleId)（见 usbclient/ios-jslibs/global.js、device.js）
 */

/**
 * 优先使用 EasyClick 的 device.getDeviceId() 作为运维后台 device_id；
 * 仅当运行时拿不到时，回退到界面 readAllUIConfig() 的 deviceId（便于无设备 API 的调试）。
 */
function AMZ_应用设备标识() {
  var fromEc = "";
  try {
    if (typeof device !== "undefined" && device != null && typeof device.getDeviceId === "function") {
      fromEc = String(device.getDeviceId() || "").trim();
    }
  } catch (e) {
    logw("读取 EasyClick deviceId: " + e);
  }

  var fromUi = "";
  try {
    var u = readAllUIConfig();
    if (u != null && u["deviceId"] != null) {
      fromUi = String(u["deviceId"]).trim();
    }
  } catch (e2) {
    /* ignore */
  }

  if (fromEc.length > 0) {
    AMZ_CONFIG.deviceId = fromEc;
    if (fromUi.length > 0 && fromUi !== fromEc) {
      logw("界面 deviceId 与 EasyClick 不一致，已采用 EasyClick: " + fromEc);
    }
    logd("device_id 来源: EasyClick device.getDeviceId()");
    return;
  }

  if (fromUi.length > 0) {
    AMZ_CONFIG.deviceId = fromUi;
    logw("未获取到 EasyClick deviceId，使用界面 deviceId");
    return;
  }
}

/**
 * iOS 使用 Bundle Identifier（包名）；通过全局 appLaunch 启动（自动化服务需已启动）
 * @param bundleId Bundle ID
 * @param logLine 写入日志收集器的一行说明（可选）
 */
function AMZ_按包名启动应用(bundleId, logLine) {
  var bid = bundleId != null ? String(bundleId).trim() : "";
  if (bid.length === 0) {
    throw new Error("未配置目标应用的 Bundle ID（请在 配置.js 或界面填写 bundleIdAmg / bundleIdChrome）");
  }
  if (logLine != null && String(logLine).length > 0) {
    日志收集器.添加(String(logLine));
  }
  if (typeof appLaunch !== "function") {
    throw new Error("当前脚本环境无 appLaunch，请确认已加载 ios-jslibs/global.js");
  }
  var r = appLaunch(bid);
  logd("appLaunch(\"" + bid + "\") => " + r);
  var waitMs = 2000;
  try {
    if (AMZ_CONFIG && AMZ_CONFIG.amg && Number(AMZ_CONFIG.amg.launchWaitMs) > 0) {
      waitMs = Number(AMZ_CONFIG.amg.launchWaitMs);
    }
  } catch (e2) {
    /* ignore */
  }
  sleep(waitMs);
}

function AMZ_取全屏区域() {
  var w = 1170;
  var h = 2532;
  try {
    if (typeof device !== "undefined" && device != null && typeof device.getScreenWidthHeightText === "function") {
      var wh = String(device.getScreenWidthHeightText() || "");
      var arr = wh.split(",");
      if (arr.length >= 2) {
        var w1 = parseInt(arr[0], 10);
        var h1 = parseInt(arr[1], 10);
        if (!isNaN(w1) && !isNaN(h1) && w1 > 0 && h1 > 0) {
          w = w1;
          h = h1;
        }
      }
    }
  } catch (e) {
    /* ignore */
  }
  return { x: 0, y: 0, ex: w, ey: h };
}

function AMZ_标准化区域(rect) {
  var full = AMZ_取全屏区域();
  if (rect == null) {
    return full;
  }
  var x = Number(rect.x);
  var y = Number(rect.y);
  var ex = Number(rect.ex);
  var ey = Number(rect.ey);
  if (isNaN(x) || x < 0) x = full.x;
  if (isNaN(y) || y < 0) y = full.y;
  if (isNaN(ex) || ex <= x) ex = full.ex;
  if (isNaN(ey) || ey <= y) ey = full.ey;
  return { x: Math.floor(x), y: Math.floor(y), ex: Math.floor(ex), ey: Math.floor(ey) };
}

function AMZ_当前前台是否目标包(bundleId) {
  var bid = String(bundleId || "").trim();
  if (bid.length === 0) {
    return false;
  }
  try {
    if (typeof activeAppInfo !== "function") {
      return false;
    }
    var info = activeAppInfo();
    if (info == null) {
      return false;
    }
    var s = String(info);
    if (s === bid) {
      return true;
    }
    return s.indexOf(bid) >= 0;
  } catch (e) {
    return false;
  }
}

function AMZ_按涂色判断AMG界面() {
  try {
    var cfg = AMZ_CONFIG.amg || {};
    var points = String(cfg.verifyColorPoints || "").trim();
    if (points.length === 0) {
      logw("未配置 amg.verifyColorPoints，跳过 AMG 界面涂色校验");
      return false;
    }
    if (typeof image === "undefined" || image == null || typeof image.cmpColorEx !== "function") {
      logw("image.cmpColorEx 不可用，无法执行 AMG 界面涂色校验");
      return false;
    }
    var rect = AMZ_标准化区域(cfg.verifyRect);
    var th = Number(cfg.verifyThreshold);
    if (isNaN(th) || th <= 0 || th > 1) {
      th = 0.9;
    }
    return image.cmpColorEx(points, th, rect.x, rect.y, rect.ex, rect.ey) === true;
  } catch (e) {
    logw("AMG 涂色校验异常: " + e);
    return false;
  }
}

function AMZ_图标找色并点击() {
  var cfg = AMZ_CONFIG.amg || {};
  var color = String(cfg.iconColor || "").trim();
  if (color.length === 0) {
    return false;
  }
  try {
    if (typeof image === "undefined" || image == null || typeof image.findColorEx !== "function") {
      return false;
    }
    var rect = AMZ_标准化区域(cfg.iconSearchRect);
    var th = Number(cfg.iconColorThreshold);
    if (isNaN(th) || th <= 0 || th > 1) {
      th = 0.9;
    }
    var limit = Number(cfg.iconSearchLimit);
    if (isNaN(limit) || limit <= 0) {
      limit = 1;
    }
    var pts = image.findColorEx(color, th, rect.x, rect.y, rect.ex, rect.ey, limit, 1);
    if (pts != null && pts.length > 0) {
      var p = pts[0];
      logd("图标找色命中，点击坐标: " + p.x + "," + p.y);
      clickPoint(p.x, p.y);
      sleep(Number(cfg.fallbackWaitMs) > 0 ? Number(cfg.fallbackWaitMs) : 1200);
      return true;
    }
  } catch (e) {
    logw("图标找色点击异常: " + e);
  }
  return false;
}

function AMZ_坐标兜底点击() {
  var cfg = AMZ_CONFIG.amg || {};
  var x = Number(cfg.fallbackTapX);
  var y = Number(cfg.fallbackTapY);
  if (isNaN(x) || isNaN(y) || x <= 0 || y <= 0) {
    return false;
  }
  logd("图标坐标兜底点击: " + x + "," + y);
  clickPoint(Math.floor(x), Math.floor(y));
  sleep(Number(cfg.fallbackWaitMs) > 0 ? Number(cfg.fallbackWaitMs) : 1200);
  return true;
}

function AMZ_确保AMG已打开() {
  var bid = String(AMZ_CONFIG.bundleIdAmg || "").trim();
  var retry = 1;
  try {
    var t = Number(AMZ_CONFIG.amg.launchRetry);
    if (!isNaN(t) && t >= 0 && t <= 3) {
      retry = t;
    }
  } catch (e) {
    /* ignore */
  }
  for (var i = 0; i <= retry; i++) {
    AMZ_按包名启动应用(bid, "步骤: 打开AMG（第 " + (i + 1) + " 次）");
    var frontOk = AMZ_当前前台是否目标包(bid);
    var colorOk = AMZ_按涂色判断AMG界面();
    if (frontOk) {
      logd("前台包名已切到 AMG: " + bid);
    }
    if (colorOk) {
      日志收集器.添加("AMG 界面校验通过（涂色命中）");
      return true;
    }
    logw("AMG 涂色校验未通过，准备重试");
  }

  日志收集器.添加("AMG 包名启动未通过，尝试图标找色/坐标兜底");
  var clicked = AMZ_图标找色并点击();
  if (!clicked) {
    clicked = AMZ_坐标兜底点击();
  }
  if (clicked && AMZ_按涂色判断AMG界面()) {
    日志收集器.添加("AMG 通过图标点击后校验通过");
    return true;
  }
  return false;
}
