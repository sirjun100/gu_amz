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

/**
 * 脚本根（AMZ_SCRIPT_BASE）下 res 目录中的资源相对路径，供 image.readImage 使用。
 * 请将找图小图放在与业务 js 同级的 res/ 下（若某步骤仍使用 image.findImage）
 */

var AMZ_点击坐标系同步键 = "";

/**
 * 对齐找图/触屏坐标系：EC 文档要求 BLE 使用与截屏一致的 setScreenSize，并按机型 setScale。
 * agent 侧 adjustScreenOrientation(0) 可减少方向与坐标错位。
 */
function AMZ_同步BLE与截屏坐标系() {
  var skip = false;
  try {
    var c = typeof AMZ_CONFIG !== "undefined" && AMZ_CONFIG != null ? AMZ_CONFIG.chrome : null;
    if (c != null && c.syncTapCoordinateSystem === false) {
      skip = true;
    }
  } catch (e0) {
    /* ignore */
  }
  if (skip) {
    return;
  }
  var full = AMZ_取全屏区域();
  var w = Math.floor(full.ex - full.x);
  var h = Math.floor(full.ey - full.y);
  var key = w + "x" + h;
  if (key === AMZ_点击坐标系同步键) {
    return;
  }
  AMZ_点击坐标系同步键 = key;
  try {
    if (typeof adjustScreenOrientation === "function") {
      adjustScreenOrientation(0);
    }
  } catch (e1) {
    /* ignore */
  }
  try {
    if (typeof bleEvent !== "undefined" && bleEvent != null) {
      if (typeof bleEvent.setScreenSize === "function") {
        bleEvent.setScreenSize(w, h);
      }
      var sc = 2.0;
      if (typeof bleEvent.getIPhoneScale === "function") {
        sc = bleEvent.getIPhoneScale();
      }
      if (typeof bleEvent.setScale === "function") {
        bleEvent.setScale(sc, sc);
      }
    }
  } catch (e2) {
    /* ignore */
  }
}

function 找图并点击(fileName){
  // 1. 申请权限
  let req = startEnv();
  if (!req) {
    logd("申请权限失败");
    return;
  }
  sleep(1000);
  // 2. 读取模板
  let templateImg = readResAutoImage(fileName);
  if (templateImg == null) {
    logd("读取模板图片失败");
    return;
  }
  // 3. 截屏
  let screenImg = image.captureFullScreen();
  if (screenImg == null) {
    logd("截屏失败");
    image.recycle(templateImg);
    return;
  }
  // 4. 透明找图
  // 参数说明: (大图, 小图, x1, y1, x2, y2, threshold, limit)
  let points = image.findImageByColor(screenImg, templateImg, 0, 0, 0, 0, 0.8, 1);
  logd("找图结果: " + JSON.stringify(points));
  // 5. 处理结果并点击（Point 数组，需用 points[i]）
  if (points && points.length > 0) {
    for (let i = 0; i < points.length; i++) {
      let point = points[i];
      clickPoint(point.x, point.y);
    }
  } else {
    logd("未找到图片");
  }
}

/**
 * 与 findImageByColor 一致：命中时返回 Point 对象（首个），否则 null；不在此点击。
 */
function 找图(fileName){
  let req = startEnv();
  if (!req) {
    logd("申请权限失败");
    return null;
  }
  sleep(1000);
  let templateImg = readResAutoImage(fileName);
  if (templateImg == null) {
    logd("读取模板图片失败");
    return null;
  }
  let screenImg = image.captureFullScreen();
  if (screenImg == null) {
    logd("截屏失败");
    image.recycle(templateImg);
    return null;
  }
  let points = image.findImageByColor(screenImg, templateImg, 0, 0, 0, 0, 0.8, 1);
  logd("找图结果: " + JSON.stringify(points));
  if (points && points.length > 0) {
    let point = points[0];
    image.recycle(templateImg);
    image.recycle(screenImg);
    return point;
  }
  logd("未找到图片");
  image.recycle(templateImg);
  image.recycle(screenImg);
  return null;
}


function 执行滑动(startX, startY, endX, endY, durationMs) {
  if (typeof swipeToPoint === "function") {
    swipeToPoint(startX, startY, endX, endY, durationMs);
    return true;
  }
  if (typeof bleEvent !== "undefined" && bleEvent != null && typeof bleEvent.swipeToPoint === "function") {
    var br = bleEvent.swipeToPoint(startX, startY, endX, endY, durationMs);
    return br == null || br === "";
  }
  logw("首页浏览: 无 swipeToPoint，跳过本次滑动");
  return false;
}


/** 手指自下向上滑：列表内容向下滑（看下方） */
function 向下滑一次() {
  var full =
      typeof AMZ_取全屏区域 === "function"
          ? AMZ_取全屏区域()
          : { x: 0, y: 0, ex: 750, ey: 1334 };
  var w = full.ex - full.x;
  var h = full.ey - full.y;
  var cx = Math.floor(full.x + w * (0.38 + Math.random() * 0.24));
  var yStart = Math.floor(full.y + h * (0.7 + Math.random() * 0.08));
  var yEnd = Math.floor(full.y + h * (0.26 + Math.random() * 0.1));
  var dur = 随机区间(480, 920);
  执行滑动(cx, yStart, cx, yEnd, dur);
}

/** 手指自上向下滑：列表内容向上滚（回顶部方向） */
function 向上滑一次() {
  var full =
      typeof AMZ_取全屏区域 === "function"
          ? AMZ_取全屏区域()
          : { x: 0, y: 0, ex: 750, ey: 1334 };
  var w = full.ex - full.x;
  var h = full.ey - full.y;
  var cx = Math.floor(full.x + w * (0.38 + Math.random() * 0.24));
  var yStart = Math.floor(full.y + h * (0.28 + Math.random() * 0.1));
  var yEnd = Math.floor(full.y + h * (0.74 + Math.random() * 0.08));
  var dur = 随机区间(480, 920);
  执行滑动(cx, yStart, cx, yEnd, dur);
}

// 传入过去的时间，返回和当前时间相差的分钟数
function 获取分钟的值(pastTime) {
  const past = new Date(pastTime).getTime();
  const now = Date.now();
  const diffMs = now - past;
  // 返回相差分钟（向下取整）
  return diffMs / 1000 / 60
}


/**
 * @param requireVisible true 时用 name(...).visible(true).getOneNodeInfo，减少「节点在树里但已滚出视野仍命中」的假阳性
 */
function 找节点(accessibilityName) {
  var to = 5000
  if (isNaN(to) || to < 200) {
    to = 2000;
  }
  try {
    var sel = name(accessibilityName);
    if (sel != null && typeof sel.visible === "function") {
      sel = sel.visible(true);
    }
    return sel.getOneNodeInfo(to);
  } catch (e) {
    return null;
  }
}


function 逐字输入(text) {
  var s = text != null ? String(text) : "";
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    var dur = 随机区间(80, 280);
    if (dur < 40) {
      dur = 40;
    }
    try {
      inputText(ch, dur);
    } catch (e2) {
      logw("逐字输入异常: " + e2);
      throw e2;
    }
    sleep(40, 160);
  }
}

/**
 * 屏幕像素坐标点击。Chrome 下单纯 clickPoint 常只触发亮屏/无响应；优先「按下-按住-抬起」或略长 press。
 * BLE 路径依赖 AMZ_同步BLE与截屏坐标系（与 usbclient/ios-jslibs/bleEvent.js 说明一致）。
 * @returns {string} 实际使用的点击方式，便于日志核对
 */
function AMZ_尝试点击坐标(x, y) {
  var fx = Math.floor(Number(x));
  var fy = Math.floor(Number(y));
  if (isNaN(fx) || isNaN(fy)) {
    throw new Error("AMZ_尝试点击坐标: 坐标无效 " + x + "," + y);
  }
  var hold = 120;
  try {
    var cfg = typeof AMZ_CONFIG !== "undefined" && AMZ_CONFIG != null ? AMZ_CONFIG.chrome : null;
    if (cfg != null && Number(cfg.tapHoldMs) > 0) {
      hold = Number(cfg.tapHoldMs);
    }
  } catch (eH) {
    /* ignore */
  }

  AMZ_同步BLE与截屏坐标系();

  try {
    if (typeof touchDown === "function" && typeof touchUp === "function") {
      touchDown(fx, fy);
      sleep(hold);
      touchUp(fx, fy);
      return "touchDown+" + hold + "ms+touchUp";
    }
  } catch (e1) {
    try {
      if (typeof touchUp === "function") {
        touchUp(fx, fy);
      }
    } catch (eUp) {
      /* ignore */
    }
  }

  try {
    if (typeof press === "function") {
      press(fx, fy, hold);
      return "press(" + hold + "ms)";
    }
  } catch (e2) {
    /* ignore */
  }

  try {
    if (typeof clickPointPressure === "function") {
      clickPointPressure(fx, fy, 0.38);
      return "clickPointPressure(0.38)";
    }
  } catch (e3) {
    /* ignore */
  }

  try {
    if (typeof clickPoint === "function") {
      clickPoint(fx, fy);
      return "clickPoint";
    }
  } catch (e4) {
    /* ignore */
  }

  try {
    if (typeof bleEvent !== "undefined" && bleEvent != null) {
      if (typeof bleEvent.mouseMove === "function") {
        bleEvent.mouseMove(fx, fy);
        sleep(40);
      }
      if (typeof bleEvent.press === "function") {
        var br = bleEvent.press(fx, fy, hold);
        if (br == null || br === "") {
          return "bleEvent.press(" + hold + "ms)";
        }
      }
      if (typeof bleEvent.clickPoint === "function") {
        bleEvent.clickPoint(fx, fy);
        return "bleEvent.clickPoint";
      }
    }
  } catch (e5) {
    /* ignore */
  }

  throw new Error("AMZ_尝试点击坐标: 无可用点击 API（touchDown/press/clickPoint/bleEvent）");
}

function AMZ_RES下文件路径(fileName) {
  var n = fileName != null ? String(fileName).trim() : "";
  if (n.length === 0) {
    return "";
  }
  var base = "";
  if (typeof AMZ_SCRIPT_BASE !== "undefined" && AMZ_SCRIPT_BASE != null) {
    base = String(AMZ_SCRIPT_BASE).trim();
  }
  if (base.length === 0) {
    return "res/" + n;
  }
  var last = base.charAt(base.length - 1);
  if (last !== "/" && last !== "\\") {
    base = base + "/";
  }
  return base + "res/" + n;
}

/**
 * iOS EasyClick：向当前焦点输入框写入文本（无全局 input 对象时的替代方案）。
 * 顺序：imeApi.paste / imeApi.input → inputText → agentEvent.inputText → typingText → input.text
 */
function AMZ_输入法尝试输入文本(text) {
  var s = text != null ? String(text) : "";
  if (s.length === 0) {
    return false;
  }
  var imeReady = true;
  try {
    if (typeof imeApi !== "undefined" && imeApi != null && typeof imeApi.isOk === "function") {
      imeReady = imeApi.isOk() === true;
    }
  } catch (e0) {
    imeReady = false;
  }
  try {
    if (imeReady && typeof imeApi !== "undefined" && imeApi != null) {
      if (typeof imeApi.paste === "function") {
        var p = imeApi.paste(s);
        if (p != null && String(p).length > 0) {
          logd("imeApi.paste OK => " + p);
          return true;
        }
      }
      if (typeof imeApi.input === "function") {
        var q = imeApi.input(s);
        if (q != null && String(q).length > 0) {
          logd("imeApi.input OK => " + q);
          return true;
        }
      }
    }
  } catch (e1) {
    logw("imeApi 输入: " + e1);
  }
  var dur = 200;
  try {
    if (AMZ_CONFIG != null && AMZ_CONFIG.chrome != null && Number(AMZ_CONFIG.chrome.inputTextDurationMs) > 0) {
      dur = Number(AMZ_CONFIG.chrome.inputTextDurationMs);
    }
  } catch (eDur) {}
  try {
    if (typeof inputText === "function") {
      var ok = inputText(s, dur);
      logd("inputText(" + dur + "ms) => " + ok);
      if (ok === true) {
        return true;
      }
    }
  } catch (e2) {
    logw("inputText: " + e2);
  }
  try {
    if (typeof agentEvent !== "undefined" && agentEvent != null && typeof agentEvent.inputText === "function") {
      var ok2 = agentEvent.inputText(s, dur);
      logd("agentEvent.inputText(" + dur + "ms) => " + ok2);
      if (ok2 === true) {
        return true;
      }
    }
  } catch (e3) {
    logw("agentEvent.inputText: " + e3);
  }
  try {
    if (typeof typingText === "function") {
      var ok3 = typingText(s);
      logd("typingText => " + ok3);
      if (ok3 === true) {
        return true;
      }
    }
  } catch (e4) {
    logw("typingText: " + e4);
  }
  try {
    if (typeof input !== "undefined" && input != null && typeof input.text === "function") {
      var r = input.text(s);
      logd("input.text => " + r);
      return true;
    }
  } catch (e5) {
    logw("input.text: " + e5);
  }
  return false;
}

/** 回车：优先 imeApi.pressEnter，其次 bleEvent.systemKey / systemKey */
function AMZ_输入法尝试回车() {
  try {
    if (typeof imeApi !== "undefined" && imeApi != null && typeof imeApi.pressEnter === "function") {
      if (imeApi.pressEnter() === true) {
        logd("imeApi.pressEnter OK");
        return true;
      }
    }
  } catch (e) {
    logw("imeApi.pressEnter: " + e);
  }
  try {
    if (typeof bleEvent !== "undefined" && bleEvent != null && typeof bleEvent.systemKey === "function") {
      bleEvent.systemKey("enter");
      logd("bleEvent.systemKey(enter)");
      return true;
    }
  } catch (e2) {
    logw("bleEvent.systemKey: " + e2);
  }
  try {
    if (typeof systemKey === "function") {
      systemKey("enter");
      logd("systemKey(enter)");
      return true;
    }
  } catch (e3) {
    logw("systemKey: " + e3);
  }
  return false;
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


