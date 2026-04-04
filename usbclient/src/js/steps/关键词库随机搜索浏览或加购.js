/**
 * 调服务端随机词库 → 找搜索框 → 输入 → 回车 → 在结果页滑动；每次滑动后按配置等待（默认约 5～10s）再识别 Add to cart（可按策略点击），目标 1～3 次加购。
 * 浏览阶段有总时长上限（默认取步骤入参最小～最大分钟随机，真分钟）。时间一到：不再做收尾加购、不进购物车，仅上滑直到见到 search，本步骤结束。
 * 若在时限内完成目标加购次数：进购物车并随机等待（原末尾停留逻辑）。
 * 加购后常会进入购物车：按配置轮询无障碍名 Back 并点击返回，返回后再随机等待（默认约 5～10s）再继续浏览。
 * 依赖：name().getOneNodeInfo、首页浏览_*（须先于本文件加载）、运维接口、随机区间、AMZ_分段睡眠并维持心跳。
 */
function 关键词浏览_读配置() {
  var kb = (typeof AMZ_CONFIG !== "undefined" && AMZ_CONFIG != null && AMZ_CONFIG.keywordBrowse) || {};
  var swipeMin = Number(kb.swipePauseMinMs);
  var swipeMax = Number(kb.swipePauseMaxMs);
  if (isNaN(swipeMin) || swipeMin < 0) {
    swipeMin = 5000;
  }
  if (isNaN(swipeMax) || swipeMax < swipeMin) {
    swipeMax = Math.max(swipeMin, 10000);
  }
  var pollTo = Number(kb.addToCartPollTimeoutMs);
  if (isNaN(pollTo) || pollTo < 200) {
    pollTo = 2000;
  }
  var exitTo = Number(kb.exitSearchFinalTimeoutMs);
  if (isNaN(exitTo) || exitTo < 300) {
    exitTo = 5000;
  }
  var upMax = Number(kb.timeUpFindSearchMaxAttempts);
  if (isNaN(upMax) || upMax < 1) {
    upMax = 100;
  }
  var abMin = Number(kb.afterBackPauseMinMs);
  var abMax = Number(kb.afterBackPauseMaxMs);
  if (isNaN(abMin) || abMin < 0) {
    abMin = 5000;
  }
  if (isNaN(abMax) || abMax < abMin) {
    abMax = Math.max(abMin, 10000);
  }
  var backPoll = Number(kb.backAfterAddPollAttempts);
  if (isNaN(backPoll) || backPoll < 1) {
    backPoll = 6;
  }
  var backTo = Number(kb.backPollTimeoutMs);
  if (isNaN(backTo) || backTo < 300) {
    backTo = 2000;
  }
  var bgMin = Number(kb.backPollGapMinMs);
  var bgMax = Number(kb.backPollGapMaxMs);
  if (isNaN(bgMin) || bgMin < 0) {
    bgMin = 600;
  }
  if (isNaN(bgMax) || bgMax < bgMin) {
    bgMax = Math.max(bgMin, 1400);
  }
  return {
    searchName: String(kb.searchAccessibilityName != null ? kb.searchAccessibilityName : "search").trim(),
    addToCartName: String(kb.addToCartAccessibilityName != null ? kb.addToCartAccessibilityName : "Add to cart").trim(),
    backName: String(kb.backAccessibilityName != null ? kb.backAccessibilityName : "Back").trim(),
    cartAltsRaw: String(kb.cartAccessibilityNameAlts != null ? kb.cartAccessibilityNameAlts : "Cart").trim(),
    nodeTimeoutMs: Number(kb.getNodeTimeoutMs) > 0 ? Number(kb.getNodeTimeoutMs) : 5000,
    searchMaxSwipeAttempts: Number(kb.searchMaxSwipeAttempts) > 0 ? Number(kb.searchMaxSwipeAttempts) : 50,
    charDelayMinMs: Number(kb.charDelayMinMs) > 0 ? Number(kb.charDelayMinMs) : 80,
    charDelayMaxMs: Number(kb.charDelayMaxMs) > 0 ? Number(kb.charDelayMaxMs) : 280,
    swipePauseMinMs: swipeMin,
    swipePauseMaxMs: swipeMax,
    addToCartPollTimeoutMs: pollTo,
    addToCartRequireVisible: kb.addToCartRequireVisible !== false,
    addToCartClickStrategy: String(kb.addToCartClickStrategy != null ? kb.addToCartClickStrategy : "clickExFirst").trim(),
    browseUseTaskMinuteRangeForDeadline: kb.browseUseTaskMinuteRangeForDeadline !== false,
    timeUpFindSearchMaxAttempts: upMax,
    exitSearchFinalTimeoutMs: exitTo,
    exitRequireSearchVisible: kb.exitRequireSearchVisible !== false,
    browseMaxOuterRounds: Number(kb.browseMaxOuterRounds) > 0 ? Number(kb.browseMaxOuterRounds) : 80,
    afterBackPauseMinMs: abMin,
    afterBackPauseMaxMs: abMax,
    backAfterAddPollAttempts: backPoll,
    backPollTimeoutMs: backTo,
    backPollGapMinMs: bgMin,
    backPollGapMaxMs: bgMax,
  };
}

function 关键词浏览_cart名称列表() {
  var raw = 关键词浏览_读配置().cartAltsRaw;
  var arr = [];
  var parts = raw.split(/[,，;；\s]+/);
  for (var i = 0; i < parts.length; i++) {
    var p = String(parts[i] || "").trim();
    if (p.length > 0 && arr.indexOf(p) < 0) {
      arr.push(p);
    }
  }
  if (arr.length === 0) {
    arr.push("Cart");
  }
  return arr;
}

function 关键词浏览_当前时间戳() {
  if (typeof 首页浏览_当前时间戳 === "function") {
    return 首页浏览_当前时间戳();
  }
  if (typeof Date !== "undefined" && typeof Date.now === "function") {
    return Date.now();
  }
  return new Date().getTime();
}

function 关键词浏览_sleepMs(minMs, maxMs) {
  var a = Number(minMs);
  var b = Number(maxMs);
  if (isNaN(a)) {
    a = 500;
  }
  if (isNaN(b)) {
    b = a;
  }
  if (b < a) {
    var t = a;
    a = b;
    b = t;
  }
  var ms = 随机区间(Math.floor(a), Math.floor(b));
  if (ms > 0 && typeof AMZ_分段睡眠并维持心跳 === "function") {
    AMZ_分段睡眠并维持心跳(ms);
  } else if (ms > 0) {
    sleep(ms);
  }
}

/** 随机区间内睡眠；有 deadline 时不睡过点（用于滑动后等待、Back 返回后等待等） */
function 关键词浏览_区间等待可截断(deadlineMs, minMs, maxMs) {
  var pmin = Math.floor(Number(minMs));
  var pmax = Math.floor(Number(maxMs));
  if (isNaN(pmin) || pmin < 0) {
    pmin = 5000;
  }
  if (isNaN(pmax) || pmax < pmin) {
    pmax = Math.max(pmin, 10000);
  }
  if (deadlineMs == null) {
    关键词浏览_sleepMs(pmin, pmax);
    return;
  }
  if (typeof 首页浏览_sleepBounded === "function") {
    首页浏览_sleepBounded(deadlineMs, pmin, pmax);
    return;
  }
  var now = 关键词浏览_当前时间戳();
  var left = deadlineMs - now;
  if (left <= 0) {
    return;
  }
  var p = 随机区间(pmin, pmax);
  var ms = Math.min(p, left);
  if (ms > 0 && typeof AMZ_分段睡眠并维持心跳 === "function") {
    AMZ_分段睡眠并维持心跳(ms);
  } else if (ms > 0) {
    sleep(ms);
  }
}

function 关键词浏览_滑动后等待(deadlineMs, cfg) {
  关键词浏览_区间等待可截断(deadlineMs, cfg.swipePauseMinMs, cfg.swipePauseMaxMs);
}

function 关键词浏览_计算浏览截止毫秒(最小分钟, 最大分钟) {
  if (typeof 首页浏览_计算总时长毫秒 === "function") {
    return 首页浏览_计算总时长毫秒(最小分钟, 最大分钟);
  }
  var m = 随机区间(最小分钟, 最大分钟);
  return m * 60 * 1000;
}

function 关键词浏览_取节点(accessibilityName, timeoutMs) {
  var nm = accessibilityName != null ? String(accessibilityName).trim() : "";
  if (nm.length === 0 || typeof name !== "function") {
    return null;
  }
  var to = timeoutMs != null ? Number(timeoutMs) : 5000;
  if (isNaN(to) || to < 300) {
    to = 5000;
  }
  try {
    return name(nm).getOneNodeInfo(to);
  } catch (e) {
    logw("getOneNodeInfo(" + nm + "): " + e);
    return null;
  }
}

function 关键词浏览_取加购节点(cfg) {
  var nm = cfg.addToCartName;
  if (nm.length === 0 || typeof name !== "function") {
    return null;
  }
  var to = cfg.addToCartPollTimeoutMs;
  try {
    var sel = name(nm);
    if (cfg.addToCartRequireVisible === true && sel != null && typeof sel.visible === "function") {
      sel = sel.visible(true);
    }
    return sel.getOneNodeInfo(to);
  } catch (e2) {
    return null;
  }
}

function 关键词浏览_点加购节点(node, cfg) {
  if (node == null) {
    return false;
  }
  var st = String(cfg.addToCartClickStrategy || "").toLowerCase();
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
    logw("关键词浏览 点加购: " + e);
  }
  return false;
}

function 关键词浏览_下滑一次() {
  if (typeof 首页浏览_向下滑一次 === "function") {
    首页浏览_向下滑一次();
  } else {
    logw("关键词浏览: 未加载 首页浏览_向下滑一次");
  }
}

function 关键词浏览_上滑一次() {
  if (typeof 首页浏览_向上滑一次 === "function") {
    首页浏览_向上滑一次();
  } else {
    logw("关键词浏览: 未加载 首页浏览_向上滑一次");
  }
}

/** 未找到 search 则上滑一次，休息 1～3 秒，再继续找 */
function 关键词浏览_直到找到并点击搜索() {
  var cfg = 关键词浏览_读配置();
  for (var i = 0; i < cfg.searchMaxSwipeAttempts; i++) {
    var node = 关键词浏览_取节点(cfg.searchName, cfg.nodeTimeoutMs);
    if (node != null) {
      try {
        node.clickCenter();
        日志收集器.添加("关键词浏览: 已点击搜索框 (" + cfg.searchName + ")");
        return;
      } catch (e1) {
        logw("clickCenter search: " + e1);
      }
    }
    关键词浏览_上滑一次();
    关键词浏览_sleepMs(1000, 3000);
  }
  throw new Error("关键词浏览: 未达到搜索框节点 " + cfg.searchName + "，已尝试 " + cfg.searchMaxSwipeAttempts + " 次");
}

function 关键词浏览_逐字输入(text) {
  var s = text != null ? String(text) : "";
  var cfg = 关键词浏览_读配置();
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    var dur = 随机区间(cfg.charDelayMinMs, cfg.charDelayMaxMs);
    if (dur < 40) {
      dur = 40;
    }
    try {
      if (typeof inputText === "function") {
        inputText(ch, dur);
      } else if (typeof agentEvent !== "undefined" && agentEvent != null && typeof agentEvent.inputText === "function") {
        agentEvent.inputText(ch, dur);
      } else {
        throw new Error("无可用的 inputText / agentEvent.inputText");
      }
    } catch (e2) {
      logw("逐字输入异常: " + e2);
      throw e2;
    }
    关键词浏览_sleepMs(40, 160);
  }
  日志收集器.添加("关键词浏览: 已逐字输入关键词，长度 " + s.length);
}

function 关键词浏览_搜索回车HID() {
  if (typeof ioHIDEvent !== "function") {
    logw("ioHIDEvent 不可用，尝试 ime/系统回车");
    if (typeof AMZ_输入法尝试回车 === "function" && AMZ_输入法尝试回车()) {
      return;
    }
    throw new Error("关键词浏览: ioHIDEvent 与 AMZ_输入法尝试回车 均不可用");
  }
  ioHIDEvent("0x07", "0x28", 0.2);
  logd("关键词浏览: ioHIDEvent 回车 0x07/0x28");
}

/**
 * 点加购 → 等待页面跳转（常进购物车）→ 轮询点 Back 返回列表/详情外 → 再等待 afterBackPause（默认 5～10s）再继续浏览。
 * @param {number|null} deadlineMs 浏览阶段截止，睡眠不越过
 */
function 关键词浏览_尝试加购一回(cfg, deadlineMs)
{

  日志收集器.添加("关键词浏览: 模拟点击购物车失败");
  return false;
  // var addNode = 关键词浏览_取加购节点(cfg);
  // if (addNode == null) {
  //   return false;
  // }
  // if (!关键词浏览_点加购节点(addNode, cfg)) {
  //   return false;
  // }
  // 日志收集器.添加("关键词浏览: 已点 Add to cart");
  // 关键词浏览_sleepMs(5000, 8000);
  // var backNode = null;
  // var bi = 0;
  // for (bi = 0; bi < cfg.backAfterAddPollAttempts; bi++) {
  //   if (deadlineMs != null && 关键词浏览_当前时间戳() >= deadlineMs) {
  //     break;
  //   }
  //   backNode = 关键词浏览_取节点(cfg.backName, cfg.backPollTimeoutMs);
  //   if (backNode != null) {
  //     break;
  //   }
  //   关键词浏览_sleepMs(cfg.backPollGapMinMs, cfg.backPollGapMaxMs);
  // }
  // if (backNode != null) {
  //   try {
  //     backNode.clickCenter();
  //     日志收集器.添加("关键词浏览: 已点返回 " + cfg.backName);
  //   } catch (e2) {
  //     logw("Back clickCenter: " + e2);
  //   }
  // } else {
  //   日志收集器.添加("关键词浏览: 未找到返回节点 " + cfg.backName + "（已轮询 " + cfg.backAfterAddPollAttempts + " 次）");
  // }
  // 关键词浏览_区间等待可截断(deadlineMs, cfg.afterBackPauseMinMs, cfg.afterBackPauseMaxMs);
  // return true;
}

/**
 * 每轮先下滑 5 次再随机上下；每次滑动后先等待再探测加购。
 * @param {number|null} deadlineMs 绝对时间戳，null 表示不限时
 */
function 关键词浏览_浏览并随机加购若干次(targetCount, deadlineMs) {
  var cfg = 关键词浏览_读配置();
  var adds = 0;
  var rounds = 0;
  while (adds < targetCount && rounds < cfg.browseMaxOuterRounds) {
    if (deadlineMs != null && 关键词浏览_当前时间戳() >= deadlineMs) {
      break;
    }
    rounds++;
    var d = 0;
    for (d = 0; d < 5; d++) {
      if (deadlineMs != null && 关键词浏览_当前时间戳() >= deadlineMs) {
        break;
      }
      if (adds >= targetCount) {
        break;
      }
      关键词浏览_下滑一次();
      关键词浏览_滑动后等待(deadlineMs, cfg);
      if (关键词浏览_尝试加购一回(cfg, deadlineMs)) {
        adds++;
      }
    }
    var innerMoves = 随机区间(5, 14);
    var m = 0;
    for (m = 0; m < innerMoves && adds < targetCount; m++) {
      if (deadlineMs != null && 关键词浏览_当前时间戳() >= deadlineMs) {
        break;
      }
      if (Math.random() < 0.5) {
        关键词浏览_下滑一次();
      } else {
        关键词浏览_上滑一次();
      }
      关键词浏览_滑动后等待(deadlineMs, cfg);
      if (关键词浏览_尝试加购一回(cfg, deadlineMs)) {
        adds++;
      }
    }
    if (adds < targetCount && rounds < cfg.browseMaxOuterRounds) {
      if (deadlineMs != null && 关键词浏览_当前时间戳() >= deadlineMs) {
        break;
      }
      关键词浏览_sleepMs(600, 1200);
    }
  }
  if (adds < targetCount) {
    var due = deadlineMs != null && 关键词浏览_当前时间戳() >= deadlineMs;
    日志收集器.添加(
      "关键词浏览: 加购完成 " +
        adds +
        "/" +
        targetCount +
        (due ? "（时间已到）" : "（已达浏览轮数上限或未找到按钮）")
    );
  }
  return adds;
}

/** 时间到：仅上滑直到见到 search（不要求点击），本步骤随后 return */
function 关键词浏览_上滑直到可见搜索() {
  var cfg = 关键词浏览_读配置();
  var maxA = cfg.timeUpFindSearchMaxAttempts;
  var to = cfg.exitSearchFinalTimeoutMs;
  var reqVis = cfg.exitRequireSearchVisible;
  var a = 0;
  for (a = 0; a < maxA; a++) {
    var node = null;
    if (typeof 首页浏览_尝试取搜索节点 === "function") {
      node = 首页浏览_尝试取搜索节点(cfg.searchName, to, reqVis);
    } else {
      node = 关键词浏览_取节点(cfg.searchName, to);
    }
    if (node != null) {
      日志收集器.添加("关键词浏览: 时间到收尾，已见到 search，本步骤结束");
      return;
    }
    关键词浏览_上滑一次();
    关键词浏览_sleepMs(400, 900);
  }
  日志收集器.添加("关键词浏览: 时间到收尾，上滑 " + maxA + " 次仍未见到 search，仍结束本步骤");
}

function 关键词浏览_直到点击购物车() {
  var names = 关键词浏览_cart名称列表();
  var cfg = 关键词浏览_读配置();
  var maxRound = 30;
  var r = 0;
  for (r = 0; r < maxRound; r++) {
    var i = 0;
    for (i = 0; i < names.length; i++) {
      var n = 关键词浏览_取节点(names[i], 2500);
      if (n != null) {
        try {
          n.clickCenter();
          日志收集器.添加("关键词浏览: 已进入购物车入口 (" + names[i] + ")，不再返回");
          return;
        } catch (e) {
          logw("购物车 clickCenter: " + e);
        }
      }
    }
    关键词浏览_下滑一次();
    关键词浏览_sleepMs(500, 1000);
  }
  throw new Error("关键词浏览: 未找到购物车节点，已试: " + names.join(", "));
}

function 关键词库随机搜索浏览或加购(最小分钟, 最大分钟) {
  AMZ_执行标准步骤("关键词库随机搜索浏览或加购", function (attemptIndex) {
    日志收集器.添加("步骤: 关键词库随机搜索浏览或加购 (attempt=" + (attemptIndex + 1) + ")");

    var rk = 运维接口.随机关键词(3);
    var keywords =
      rk != null && rk.keywords != null && rk.keywords.length > 0 ? rk.keywords : [];
    if (keywords.length === 0) {
      日志收集器.添加("随机关键词接口无词，本步骤中止");
      throw new Error("关键词库随机搜索浏览或加购: 无关键词");
    }
    日志收集器.添加("随机词: " + keywords.join(", "));

    var pick = keywords[随机区间(0, keywords.length - 1)];
    日志收集器.添加("选用关键词: " + pick);

    var cfg = 关键词浏览_读配置();

    关键词浏览_直到找到并点击搜索();
    关键词浏览_sleepMs(400, 900);
    关键词浏览_逐字输入(pick);
    关键词浏览_sleepMs(300, 700);
    关键词浏览_搜索回车HID();

    关键词浏览_sleepMs(5000, 10000);

    var deadlineMs = null;
    if (cfg.browseUseTaskMinuteRangeForDeadline) {
      var totalMs = 关键词浏览_计算浏览截止毫秒(最小分钟, 最大分钟);
      deadlineMs = 关键词浏览_当前时间戳() + totalMs;
      日志收集器.添加(
        "关键词浏览: 结果页浏览截止约 " +
          Math.round(totalMs / 60000) +
          " 分钟；滑动间隔 " +
          Math.round(cfg.swipePauseMinMs / 1000) +
          "～" +
          Math.round(cfg.swipePauseMaxMs / 1000) +
          "s 后再识别 Add to cart；到时上滑找 search 结束（不进购物车）"
      );
    } else {
      日志收集器.添加(
        "关键词浏览: 未启用 browseUseTaskMinuteRangeForDeadline，无总时长；滑动间隔 " +
          Math.round(cfg.swipePauseMinMs / 1000) +
          "～" +
          Math.round(cfg.swipePauseMaxMs / 1000) +
          "s"
      );
    }

    var nCart = 随机区间(1, 3);
    日志收集器.添加("关键词浏览: 目标加购次数 " + nCart);
    关键词浏览_浏览并随机加购若干次(nCart, deadlineMs);

    var nowTs = 关键词浏览_当前时间戳();
    var timeUp = deadlineMs != null && nowTs >= deadlineMs;
    if (timeUp) {
      日志收集器.添加("关键词浏览: 浏览时间已到，取消进购物车与末尾随机等待，改上滑至 search");
      关键词浏览_上滑直到可见搜索();
      return;
    }

    关键词浏览_直到点击购物车();
    日志收集器.添加("关键词浏览: 购物车页停留，随机等待 " + 最小分钟 + "-" + 最大分钟 + " 分钟");
    随机等待分钟(最小分钟, 最大分钟);
  });
}
