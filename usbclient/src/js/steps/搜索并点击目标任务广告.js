/**
 * search_click：购物车页后 → 找 search → 输入 keyword → 回车
 * → 在结果列表累计停留 listBrowse（默认 2～4 分钟，仅列表计时）：
 *   用无障碍 label / labelMatch 匹配任一 product_titles（Link 的 name/label 含标题子串）→ 进详情
 *   → 详情随机浏览 1～3 分钟（可配）→ 点 Back 回列表，重复直到列表时间用尽。
 *
 * params：keyword + product_titles（string[]）；兼容极旧任务 JSON 仅有 product_title。
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
  return {
    searchName: searchName.length > 0 ? searchName : "search",
    backName: backRaw.length > 0 ? backRaw : "Back",
    nodeTimeoutMs: Number(sc.getNodeTimeoutMs) > 0 ? Number(sc.getNodeTimeoutMs) : 5000,
    searchMaxSwipeAttempts: Number(sc.searchMaxSwipeAttempts) > 0 ? Number(sc.searchMaxSwipeAttempts) : 50,
    titleMatchMaxChars: Number(sc.productTitleMatchMaxChars) > 0 ? Number(sc.productTitleMatchMaxChars) : 80,
    findProductMaxScrollAttempts: Number(sc.findProductMaxScrollAttempts) > 0 ? Number(sc.findProductMaxScrollAttempts) : 45,
    listBrowseMinMinutes: lmMin,
    listBrowseMaxMinutes: lmMax,
    detailBrowseMinMinutes: Number(sc.detailBrowseMinMinutes) >= 0 ? Number(sc.detailBrowseMinMinutes) : 1,
    detailBrowseMaxMinutes: Number(sc.detailBrowseMaxMinutes) >= 0 ? Number(sc.detailBrowseMaxMinutes) : 3,
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
 * 按顺序尝试每个标题的 labelMatch / label，返回第一个命中的节点。
 */
function 任务点击_尝试匹配任一标题节点(productTitles, cfg) {
  var to = cfg.nodeTimeoutMs;
  var ti = 0;
  for (ti = 0; ti < productTitles.length; ti++) {
    var title = productTitles[ti];
    var pattern = 任务点击_标题label正则(title);
    var node = null;
    if (pattern != null && typeof labelMatch === "function") {
      node = 任务点击_取节点by选择器(
        function () {
          return labelMatch(pattern);
        },
        Math.min(to, 3500)
      );
    }
    if (node == null && typeof label === "function") {
      node = 任务点击_取节点by选择器(
        function () {
          return label(title);
        },
        2000
      );
    }
    if (node != null) {
      return node;
    }
  }
  return null;
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

/** 详情页：先下滑 3 次，再在剩余时间内随机上/下 */
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
  日志收集器.添加("任务点击: 详情页随机浏览 " + m + " 分钟（真实时间）");
  var t0 = 任务点击_当前毫秒();
  var k = 0;
  for (k = 0; k < 3; k++) {
    if (typeof 关键词浏览_下滑一次 === "function") {
      关键词浏览_下滑一次();
    }
    if (typeof 关键词浏览_sleepMs === "function") {
      关键词浏览_sleepMs(400, 900);
    } else {
      sleep(随机区间(400, 900));
    }
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
    if (typeof 关键词浏览_sleepMs === "function") {
      关键词浏览_sleepMs(500, 1500);
    } else {
      sleep(随机区间(500, 1500));
    }
  }
}

/**
 * 仅在列表上累计 listBudgetMs；进详情前结算已用时间，详情内不计入；Back 后继续列表计时。
 */
function 任务点击_列表阶段循环浏览(productTitles, cfg) {
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
    "任务点击: 结果列表阶段预算 " + listMinutes + " 分钟（仅列表计时，多标题轮询匹配）"
  );
  var listUsedMs = 0;
  var listPhaseStartMs = 任务点击_当前毫秒();

  while (任务点击_列表已消耗毫秒(listUsedMs, listPhaseStartMs) < listBudgetMs) {
    var node = 任务点击_尝试匹配任一标题节点(productTitles, cfg);
    if (node != null) {
      listUsedMs += 任务点击_当前毫秒() - listPhaseStartMs;
      if (listUsedMs >= listBudgetMs) {
        日志收集器.添加("任务点击: 列表时间已用尽（结算后不再进详情），结束列表阶段");
        break;
      }
      try {
        node.clickCenter();
        日志收集器.添加("任务点击: 已点商品（多标题之一匹配）");
      } catch (e3) {
        logw("商品 clickCenter: " + e3);
        listPhaseStartMs = 任务点击_当前毫秒();
        continue;
      }
      任务点击_详情页随机浏览分钟(cfg.detailBrowseMinMinutes, cfg.detailBrowseMaxMinutes);
      任务点击_Back回列表(cfg);
      listPhaseStartMs = 任务点击_当前毫秒();
      if (任务点击_列表已消耗毫秒(listUsedMs, listPhaseStartMs) >= listBudgetMs) {
        break;
      }
    } else {
      if (typeof 关键词浏览_下滑一次 === "function") {
        关键词浏览_下滑一次();
      }
      if (typeof 关键词浏览_sleepMs === "function") {
        关键词浏览_sleepMs(600, 1400);
      } else {
        sleep(随机区间(600, 1400));
      }
    }
  }
  日志收集器.添加("任务点击: 列表阶段结束（列表停留预算已用尽）");
}

function 搜索并点击目标任务广告(task) {
  AMZ_执行标准步骤("搜索并点击目标任务广告", function (attemptIndex) {
    var p = (task != null && task.params) || {};
    var titles = 任务点击_解析产品标题列表(p);
    日志收集器.添加(
      "步骤: 搜索并点击目标任务广告 keyword=" +
        (p.keyword || "") +
        " titles=" +
        titles.length +
        " (attempt=" +
        (attemptIndex + 1) +
        ")"
    );
    if (titles.length === 0) {
      throw new Error("搜索并点击目标任务广告: params 中无有效 product_titles");
    }
    var kw = String(p.keyword || "").trim();
    if (kw.length === 0) {
      throw new Error("搜索并点击目标任务广告: params.keyword 为空");
    }

    var cfg = 任务点击_读配置();

    任务点击_直到找到并点击搜索();

    if (typeof 关键词浏览_sleepMs === "function") {
      关键词浏览_sleepMs(400, 900);
    }
    if (typeof 关键词浏览_逐字输入 === "function") {
      关键词浏览_逐字输入(kw);
    } else {
      throw new Error("搜索并点击目标任务广告: 未加载 关键词浏览_逐字输入（需先加载 关键词库随机搜索浏览或加购.js）");
    }
    if (typeof 关键词浏览_sleepMs === "function") {
      关键词浏览_sleepMs(300, 700);
    }

    任务点击_HID回车();

    if (typeof 关键词浏览_sleepMs === "function") {
      关键词浏览_sleepMs(5000, 10000);
    } else {
      sleep(随机区间(5000, 10000));
    }

    任务点击_列表阶段循环浏览(titles, cfg);

    日志收集器.添加("步骤: 搜索并点击目标任务广告 完成");
  });
}
