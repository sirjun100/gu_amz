/**
 * search_click：购物车页后 → 找 search → 输入 keyword → 回车
 * → 结果列表阶段：在 res 小图文件名列表中依次 findImageByColor 全屏匹配，命中则 AMZ_尝试点击坐标；确认进详情后浏览再 Back（列表时间单独统计）。
 *   → 详情：先下滑 5 次、每次滑后休息约 5～8s，再在剩余时间内随机上下滑且每次滑后同样休息；结束前必须再上滑一次，便于露出 Back。
 *
 * params：keyword；列表目标图暂写死见 搜索并点击目标任务广告 内 listTemplateFiles（如 MIULEE.png，放 res）。
 * 依赖：关键词库随机搜索浏览或加购.js（须先于本文件加载）
 */
function 任务点击_读配置() {
  var sc = (typeof AMZ_CONFIG !== "undefined" && AMZ_CONFIG != null && AMZ_CONFIG.searchClick) || {};
  var kb = (typeof AMZ_CONFIG !== "undefined" && AMZ_CONFIG != null && AMZ_CONFIG.keywordBrowse) || {};
  var searchName = String(sc.searchAccessibilityName || "").trim();
  if (searchName.length === 0) {
    searchName = String(kb.searchAccessibilityName != null ? kb.searchAccessibilityName : "search").trim();
  }
  var backRaw = String(sc.backAccessibilityName != null ? sc.backAccessibilityName : "").trim();
  if (backRaw.length === 0) {
    backRaw = String(kb.backAccessibilityName != null ? kb.backAccessibilityName : "Back").trim();
  }
  var lmMin = Number(sc.listBrowseMinMinutes);
  var lmMax = Number(sc.listBrowseMaxMinutes);
  if (isNaN(lmMin) || lmMin < 0) {
    lmMin = 2;
  }
  if (isNaN(lmMax) || lmMax < lmMin) {
    lmMax = Math.max(lmMin, 4);
  }
  var detName = String(sc.detailConfirmAccessibilityName != null ? sc.detailConfirmAccessibilityName : "").trim();
  if (detName.length === 0) {
    detName = String(kb.addToCartAccessibilityName != null ? kb.addToCartAccessibilityName : "Add to cart").trim();
  }
  var detTo = Number(sc.detailConfirmTimeoutMs);
  if (isNaN(detTo) || detTo < 500) {
    detTo = 3500;
  }
  return {
    searchName: searchName.length > 0 ? searchName : "search",
    backName: backRaw.length > 0 ? backRaw : "Back",
    nodeTimeoutMs: Number(sc.getNodeTimeoutMs) > 0 ? Number(sc.getNodeTimeoutMs) : 5000,
    searchMaxSwipeAttempts: Number(sc.searchMaxSwipeAttempts) > 0 ? Number(sc.searchMaxSwipeAttempts) : 50,
    titleMatchMaxChars: Number(sc.productTitleMatchMaxChars) > 0 ? Number(sc.productTitleMatchMaxChars) : 80,
    findProductMaxScrollAttempts: Number(sc.findProductMaxScrollAttempts) > 0 ? Number(sc.findProductMaxScrollAttempts) : 45,
    listBrowseMinMinutes: lmMin,
    listBrowseMaxMinutes: lmMax,
    requireTitleMatchVisible: sc.requireTitleMatchVisible !== false,
    detailConfirmName: detName.length > 0 ? detName : "Add to cart",
    detailConfirmTimeoutMs: detTo,
    detailConfirmRequireVisible: sc.detailConfirmRequireVisible !== false,
    productLinkClickStrategy: String(sc.productLinkClickStrategy != null ? sc.productLinkClickStrategy : "clickExFirst").trim(),
    listTemplateFindThreshold: (function () {
      var th = Number(sc.listTemplateFindThreshold);
      return isNaN(th) || th <= 0 || th > 1 ? 0.8 : th;
    })(),
    detailBrowseMinMinutes: Number(sc.detailBrowseMinMinutes) >= 0 ? Number(sc.detailBrowseMinMinutes) : 1,
    detailBrowseMaxMinutes: Number(sc.detailBrowseMaxMinutes) >= 0 ? Number(sc.detailBrowseMaxMinutes) : 3,
    detailSwipePauseMinMs: (function () {
      var v = Number(sc.detailSwipePauseMinMs);
      return isNaN(v) || v < 0 ? 5000 : v;
    })(),
    detailSwipePauseMaxMs: (function () {
      var lo = Number(sc.detailSwipePauseMinMs);
      if (isNaN(lo) || lo < 0) {
        lo = 5000;
      }
      var hi = Number(sc.detailSwipePauseMaxMs);
      if (isNaN(hi) || hi < lo) {
        hi = Math.max(lo, 8000);
      }
      return hi;
    })(),
  };
}

/** 从任务 params 解析非空标题列表（长度≥2） */
function 任务点击_解析产品标题列表(p) {
  p = p || {};
  var out = [];
  var arr = p.product_titles;
  if (arr != null && arr.length !== undefined) {
    var i = 0;
    for (i = 0; i < arr.length; i++) {
      var s = 任务点击_规范化标题(arr[i]);
      if (s.length >= 2) {
        out.push(s);
      }
    }
  }
  if (out.length === 0) {
    var one = 任务点击_规范化标题(p.product_title);
    if (one.length >= 2) {
      out.push(one);
    }
  }
  return out;
}

function 任务点击_转义正则元字符(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function 任务点击_规范化标题(title) {
  return String(title || "")
    .replace(/\s+/g, " ")
    .trim();
}

function 任务点击_标题label正则(title) {
  var t = 任务点击_规范化标题(title);
  if (t.length < 2) {
    return null;
  }
  var cfg = 任务点击_读配置();
  var n = cfg.titleMatchMaxChars;
  var slice = t.length > n ? t.substring(0, n) : t;
  var esc = 任务点击_转义正则元字符(slice);
  return ".*" + esc + ".*";
}

function 任务点击_取节点by选择器(selectorFn, timeoutMs) {
  try {
    return selectorFn().getOneNodeInfo(timeoutMs);
  } catch (e) {
    logw("任务点击 getOneNodeInfo: " + e);
    return null;
  }
}

/** labelMatch/label 链：可选 visible(true)，与首页 search 逻辑一致 */
function 任务点击_无障碍链加可见(baseSel, requireVisible) {
  if (baseSel == null) {
    return baseSel;
  }
  if (requireVisible === true && typeof baseSel.visible === "function") {
    return baseSel.visible(true);
  }
  return baseSel;
}

function 任务点击_直到找到并点击搜索() {
  var cfg = 任务点击_读配置();
  var i = 0;
  for (i = 0; i < cfg.searchMaxSwipeAttempts; i++) {
    var node = null;
    if (typeof name === "function") {
      try {
        node = name(cfg.searchName).getOneNodeInfo(cfg.nodeTimeoutMs);
      } catch (e1) {
        logw("name(search): " + e1);
      }
    }
    if (node != null) {
      try {
        node.clickCenter();
        日志收集器.添加("任务点击: 已点搜索框 " + cfg.searchName);
        return;
      } catch (e2) {
        logw("search clickCenter: " + e2);
      }
    }
    if (typeof 关键词浏览_上滑一次 === "function") {
      关键词浏览_上滑一次();
    }
    if (typeof 关键词浏览_sleepMs === "function") {
      关键词浏览_sleepMs(1000, 3000);
    } else {
      sleep(随机区间(1000, 3000));
    }
  }
  throw new Error("任务点击: 未找到搜索框 " + cfg.searchName);
}

function 任务点击_HID回车() {
  if (typeof ioHIDEvent === "function") {
    ioHIDEvent("0x07", "0x28", 0.2);
    logd("任务点击: ioHIDEvent 回车");
    return;
  }
  if (typeof 关键词浏览_搜索回车HID === "function") {
    关键词浏览_搜索回车HID();
    return;
  }
  if (typeof AMZ_输入法尝试回车 === "function" && AMZ_输入法尝试回车()) {
    return;
  }
  throw new Error("任务点击: 无法回车");
}


/**
 * 全屏截屏后按顺序在 res 中匹配小图文件名（readResAutoImage / AMZ_RES下文件路径）。
 * @param {string[]} imageFileNames
 * @returns {{x:number,y:number,fileName:string}|null}
 */
function 任务点击_截屏匹配任一模板(imageFileNames, cfg) {
  cfg = cfg || 任务点击_读配置();
  var th = cfg.listTemplateFindThreshold;
  var names = imageFileNames || [];
  if (names.length === 0) {
    return null;
  }
  if (typeof AMZ_同步BLE与截屏坐标系 === "function") {
    AMZ_同步BLE与截屏坐标系();
  }
  if (typeof image === "undefined" || typeof image.captureFullScreen !== "function") {
    logw("任务点击 找图: captureFullScreen 不可用");
    return null;
  }
  var screenImg = image.captureFullScreen();
  if (screenImg == null) {
    logd("任务点击 找图: 截屏失败");
    return null;
  }
  var full = typeof AMZ_取全屏区域 === "function" ? AMZ_取全屏区域() : { x: 0, y: 0, ex: 750, ey: 1334 };
  var x1 = full.x;
  var y1 = full.y;
  var x2 = full.ex;
  var y2 = full.ey;
  var hit = null;
  try {
    var fi = 0;
    for (fi = 0; fi < names.length; fi++) {
      var fn = String(names[fi] || "").trim();
      if (fn.length === 0) {
        continue;
      }
      var templateImg = null;
      try {
        if (typeof readResAutoImage === "function") {
          templateImg = readResAutoImage(fn);
        }
        if (templateImg == null && typeof image.readImage === "function" && typeof AMZ_RES下文件路径 === "function") {
          var rpath = AMZ_RES下文件路径(fn);
          if (rpath) {
            templateImg = image.readImage(rpath);
          }
        }
        if (templateImg == null) {
          logw("任务点击 找图: 读取模板失败 " + fn);
          continue;
        }
        if (typeof image.findImageByColor !== "function") {
          logw("任务点击 找图: findImageByColor 不可用");
          break;
        }
        var points = image.findImageByColor(screenImg, templateImg, x1, y1, x2, y2, th, 1);
        logd("任务点击 找图 " + fn + ": " + JSON.stringify(points));
        if (points != null && points.length > 0) {
          var pt = points[0];
          hit = { x: pt.x, y: pt.y, fileName: fn };
          break;
        }
      } finally {
        if (templateImg != null && typeof image.recycle === "function") {
          try {
            image.recycle(templateImg);
          } catch (er) {
            /* ignore */
          }
        }
      }
    }
  } finally {
    if (screenImg != null && typeof image.recycle === "function") {
      try {
        image.recycle(screenImg);
      } catch (eS) {
        /* ignore */
      }
    }
  }
  return hit;
}

/**
 * 按顺序尝试每个标题的 labelMatch / label，返回第一个命中的节点（默认要求 visible，避免屏外节点）。
 */
function 任务点击_尝试匹配任一标题节点(productTitles, cfg) {
  var to = cfg.nodeTimeoutMs;
  var reqVis = cfg.requireTitleMatchVisible === true;
  var ti = 0;
  for (ti = 0; ti < productTitles.length; ti++) {
    var title = productTitles[ti];
    var pattern = 任务点击_标题label正则(title);
    var node = null;
    if (pattern != null && typeof labelMatch === "function") {
      node = 任务点击_取节点by选择器(
        function () {
          return 任务点击_无障碍链加可见(labelMatch(pattern), reqVis);
        },
        Math.min(to, 2200)
      );
    }
    if (node != null) {
      var nm = node.name != null ? String(node.name) : "";
      日志收集器.添加(
        "任务点击: 命中商品节点" + (reqVis ? "（要求 visible）" : "") + " name=" + (nm.length > 120 ? nm.substring(0, 117) + "…" : nm)
      );
      return node;
    }
  }
  return null;
}

function 任务点击_点商品节点(node, cfg) {
  if (node == null) {
    return false;
  }
  var st = String(cfg.productLinkClickStrategy || "clickExFirst").toLowerCase();
  try {
    if (st === "clickexfirst" || st === "exfirst") {
      if (node.clickable === true && typeof node.clickEx === "function") {
        node.clickEx();
        return true;
      }
    }
    if (typeof node.clickCenter === "function") {
      node.clickCenter();
      return true;
    }
  } catch (e) {
    logw("任务点击 点商品: " + e);
  }
  return false;
}

/** 点击后短等，探测详情常见控件（如 Add to cart） */
function 任务点击_探测已进入详情页(cfg) {
  var nm = cfg.detailConfirmName;
  if (nm.length === 0 || typeof name !== "function") {
    return false;
  }
  try {
    var sel = name(nm);
    sel = 任务点击_无障碍链加可见(sel, cfg.detailConfirmRequireVisible === true);
    return sel.getOneNodeInfo(cfg.detailConfirmTimeoutMs) != null;
  } catch (e2) {
    return false;
  }
}

/**
 * 点击并确认进入详情；未确认时下滑一次再匹配并重试最多共 2 轮。
 * @returns {boolean} 是否已进入详情（后续应接详情浏览或 Back）
 */
function 任务点击_点进详情并确认(productTitles, cfg, initialNode) {
  var node = initialNode;
  var round = 0;
  for (round = 0; round < 2; round++) {
    if (node == null) {
      node = 任务点击_尝试匹配任一标题节点(productTitles, cfg);
    }
    if (node == null) {
      return false;
    }
    if (!任务点击_点商品节点(node, cfg)) {
      日志收集器.添加("任务点击: 点商品手势失败，重试");
    } else {
      if (typeof 关键词浏览_sleepMs === "function") {
        关键词浏览_sleepMs(2200, 3600);
      } else {
        sleep(随机区间(2200, 3600));
      }
      if (任务点击_探测已进入详情页(cfg)) {
        日志收集器.添加("任务点击: 已确认进入详情（探测到 " + cfg.detailConfirmName + "）");
        return true;
      }
    }
    日志收集器.添加("任务点击: 未确认进详情，下滑后再试匹配");
    if (typeof 关键词浏览_下滑一次 === "function") {
      关键词浏览_下滑一次();
    }
    if (typeof 关键词浏览_sleepMs === "function") {
      关键词浏览_sleepMs(500, 1000);
    } else {
      sleep(随机区间(500, 1000));
    }
    node = null;
  }
  return false;
}

function 任务点击_当前毫秒() {
  if (typeof Date !== "undefined" && typeof Date.now === "function") {
    return Date.now();
  }
  return new Date().getTime();
}

/** 列表阶段已消耗毫秒 = 已累计 + 当前这段在列表上的时长 */
function 任务点击_列表已消耗毫秒(listUsedMs, listPhaseStartMs) {
  return listUsedMs + (任务点击_当前毫秒() - listPhaseStartMs);
}

function 任务点击_Back回列表(cfg) {
  var node = null;
  if (typeof name === "function") {
    try {
      node = name(cfg.backName).getOneNodeInfo(cfg.nodeTimeoutMs);
    } catch (e) {
      logw("任务点击 Back: " + e);
    }
  }
  if (node != null) {
    try {
      node.clickCenter();
      日志收集器.添加("任务点击: 已点返回 " + cfg.backName);
    } catch (e2) {
      logw("任务点击 Back clickCenter: " + e2);
    }
  } else {
    日志收集器.添加("任务点击: 未找到返回按钮 " + cfg.backName);
  }
  if (typeof 关键词浏览_sleepMs === "function") {
    关键词浏览_sleepMs(800, 1800);
  } else {
    sleep(随机区间(800, 1800));
  }
}

function 任务点击_详情页滑动后休息(pauseMinMs, pauseMaxMs) {
  var a = Math.floor(Number(pauseMinMs));
  var b = Math.floor(Number(pauseMaxMs));
  if (isNaN(a) || a < 0) {
    a = 5000;
  }
  if (isNaN(b) || b < a) {
    b = Math.max(a, 8000);
  }
  if (typeof 关键词浏览_sleepMs === "function") {
    关键词浏览_sleepMs(a, b);
  } else {
    sleep(随机区间(a, b));
  }
}

/** 详情页：先下滑 5 次（每次后休息约 5～8s），再在剩余总时长内随机上/下；结束前固定再上滑一次，避免停在页底找不到 Back */
function 任务点击_详情页随机浏览分钟(最小分, 最大分) {
  var a = Number(最小分);
  var b = Number(最大分);
  if (isNaN(a)) {
    a = 1;
  }
  if (isNaN(b)) {
    b = a;
  }
  if (b < a) {
    var t = a;
    a = b;
    b = t;
  }
  var m = 随机区间(Math.floor(a), Math.floor(b));
  var totalMs = m * 60 * 1000;
  var scfg = 任务点击_读配置();
  var pMin = scfg.detailSwipePauseMinMs;
  var pMax = scfg.detailSwipePauseMaxMs;
  日志收集器.添加(
    "任务点击: 详情页随机浏览 " + m + " 分钟；先下滑5次再随机上下，每次滑后休息约 " +
      Math.round(pMin / 1000) +
      "～" +
      Math.round(pMax / 1000) +
      "s；结束前再上滑一次以便点 Back"
  );
  var t0 = 任务点击_当前毫秒();
  var k = 0;
  for (k = 0; k < 5; k++) {
    if (typeof 关键词浏览_下滑一次 === "function") {
      关键词浏览_下滑一次();
    }
    任务点击_详情页滑动后休息(pMin, pMax);
  }
  while (任务点击_当前毫秒() - t0 < totalMs) {
    if (Math.random() < 0.5) {
      if (typeof 关键词浏览_下滑一次 === "function") {
        关键词浏览_下滑一次();
      }
    } else {
      if (typeof 关键词浏览_上滑一次 === "function") {
        关键词浏览_上滑一次();
      }
    }
    任务点击_详情页滑动后休息(pMin, pMax);
  }
  if (typeof 关键词浏览_上滑一次 === "function") {
    关键词浏览_上滑一次();
  }
  任务点击_详情页滑动后休息(pMin, pMax);
}

/**
 * 仅在列表上累计 listBudgetMs；进详情前结算已用时间，详情内不计入；Back 后继续列表计时。
 * @param {string[]} listTemplateFiles res 中小图文件名，如 ["MIULEE.png"]
 */
function 任务点击_列表阶段循环浏览(listTemplateFiles, cfg) {
  var a = Number(cfg.listBrowseMinMinutes);
  var b = Number(cfg.listBrowseMaxMinutes);
  if (isNaN(a)) {
    a = 2;
  }
  if (isNaN(b)) {
    b = a;
  }
  if (b < a) {
    var sw = a;
    a = b;
    b = sw;
  }
  var listMinutes = 随机区间(Math.floor(a), Math.floor(b));
  var listBudgetMs = listMinutes * 60 * 1000;
  日志收集器.添加(
    "任务点击: 结果列表阶段预算 " + listMinutes + " 分钟（列表找图 " + JSON.stringify(listTemplateFiles || []) + "）"
  );
  var listUsedMs = 0;
  var listPhaseStartMs = 任务点击_当前毫秒();

  while (任务点击_列表已消耗毫秒(listUsedMs, listPhaseStartMs) < listBudgetMs) {
    var hit = 任务点击_截屏匹配任一模板(listTemplateFiles, cfg);
    if (hit == null) {
      关键词浏览_下滑一次();
      sleep(随机区间(4000, 6000));
      continue;
    }
    try {
      if (typeof AMZ_尝试点击坐标 === "function") {
        AMZ_尝试点击坐标(hit.x, hit.y);
      } else {
        clickPoint(hit.x, hit.y);
      }
    } catch (eTap) {
      logw("任务点击 列表找图点击: " + eTap);
      关键词浏览_下滑一次();
      sleep(随机区间(4000, 6000));
      continue;
    }
    sleep(随机区间(2200, 3600));
    日志收集器.添加("任务点击: 列表命中模板并进入详情 " + hit.fileName);
    listUsedMs += 任务点击_当前毫秒() - listPhaseStartMs;
    if (listUsedMs >= listBudgetMs) {
      日志收集器.添加("任务点击: 列表预算在进详情前已用尽，Back");
      任务点击_Back回列表(cfg);
      break;
    }
    任务点击_详情页随机浏览分钟(cfg.detailBrowseMinMinutes, cfg.detailBrowseMaxMinutes);
    任务点击_Back回列表(cfg);
    关键词浏览_下滑一次();
    sleep(随机区间(4000, 6000));
    关键词浏览_下滑一次();
    sleep(随机区间(4000, 6000));
    listPhaseStartMs = 任务点击_当前毫秒();
    if (任务点击_列表已消耗毫秒(listUsedMs, listPhaseStartMs) >= listBudgetMs) {
      break;
    }
  }
  日志收集器.添加("任务点击: 列表阶段结束（列表停留预算已用尽）");
}

function 搜索并点击目标任务广告(task) {
  AMZ_执行标准步骤("搜索并点击目标任务广告", function (attemptIndex) {
    var p = (task != null && task.params) || {};
    var listTemplateFiles = ["MIULEE.png"];
    日志收集器.添加(
      "步骤: 搜索并点击目标任务广告 keyword=" +
        (p.keyword || "") +
        " listTemplates=" +
        JSON.stringify(listTemplateFiles) +
        " (attempt=" +
        (attemptIndex + 1) +
        ")"
    );
    var kw = String(p.keyword || "").trim();
    if (kw.length === 0) {
      throw new Error("搜索并点击目标任务广告: params.keyword 为空");
    }

    var cfg = 任务点击_读配置();

    // X 点不了,重新输入网址
    name("Address and search bar").getOneNodeInfo(5000).clickCenter();
    sleep(随机区间(1000, 3000));
    日志收集器.添加("重新输入亚马逊网址");
    AMZ_输入法尝试输入文本('https://www.amazon.com');
    sleep(随机区间(800, 1500));
    let result = ioHIDEvent("0x07", "0x28", 0.2);
    logd("ioHIDEvent 结果: " + result);
    sleep(随机区间(1000, 3000));

    任务点击_直到找到并点击搜索();

    if (typeof 关键词浏览_sleepMs === "function") {
      关键词浏览_sleepMs(400, 900);
    }
    if (typeof 关键词浏览_逐字输入 === "function") {
      日志收集器.添加("开始输入关键词");
      关键词浏览_逐字输入(kw);
    } else {
      throw new Error("搜索并点击目标任务广告: 未加载 关键词浏览_逐字输入（需先加载 关键词库随机搜索浏览或加购.js）");
    }
    if (typeof 关键词浏览_sleepMs === "function") {
      关键词浏览_sleepMs(300, 700);
    }

    任务点击_HID回车();

    sleep(随机区间(3000, 6000));

    任务点击_列表阶段循环浏览(['MIULEE.png','MIULEE2.png'], cfg);

    日志收集器.添加("步骤: 搜索并点击目标任务广告 完成");
  });
}
