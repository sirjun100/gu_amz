/**
 * 首页随机浏览：总时长 [最小分钟, 最大分钟] 随机（真分钟，不受 demoMode）。
 * 流程：先向下滑 5 次 → 在截止时间内随机上/下滑，并轮询 search（默认 name+visible(true)，避免页眉节点始终在树里导致死循环）；
 *   - 剩余 ≤ earlyExitRemainingSeconds 且命中：提前结束；
 *   - 命中但剩余较多：再下滑 5 次，然后冷却若干秒（仅随机滑、不检测搜索），再继续；
 *   - 到时：仅上滑直到命中 search（或达上限次数）。
 *
 * 每次滑动后的等待：homeBrowse.swipePauseMinMs / swipePauseMaxMs（默认 5000～10000）。
 *
 * 见 AMZ_CONFIG.homeBrowse、keywordBrowse.searchAccessibilityName。
 */
function 首页浏览_读home配置() {
  var hb = (typeof AMZ_CONFIG !== "undefined" && AMZ_CONFIG != null && AMZ_CONFIG.homeBrowse) || {};
  var kb = (typeof AMZ_CONFIG !== "undefined" && AMZ_CONFIG != null && AMZ_CONFIG.keywordBrowse) || {};
  var searchName = String(hb.searchAccessibilityName || "").trim();
  if (searchName.length === 0) {
    searchName = String(kb.searchAccessibilityName != null ? kb.searchAccessibilityName : "search").trim();
  }
  if (searchName.length === 0) {
    searchName = "search";
  }
  var poll = Number(hb.searchPollTimeoutMs);
  if (isNaN(poll) || poll < 300) {
    poll = 2000;
  }
  var finalTo = Number(hb.searchFinalTimeoutMs);
  if (isNaN(finalTo) || finalTo < 300) {
    finalTo = 5000;
  }
  var earlySec = Number(hb.earlyExitRemainingSeconds);
  if (isNaN(earlySec) || earlySec < 0) {
    earlySec = 60;
  }
  var maxUp = Number(hb.timeUpFindSearchMaxAttempts);
  if (isNaN(maxUp) || maxUp < 10) {
    maxUp = 100;
  }
  var reqVis = hb.requireSearchVisible !== false;
  var cdMin = Number(hb.searchSeenCooldownMinMs);
  var cdMax = Number(hb.searchSeenCooldownMaxMs);
  if (isNaN(cdMin) || cdMin < 0) {
    cdMin = 15000;
  }
  if (isNaN(cdMax) || cdMax < cdMin) {
    cdMax = Math.max(cdMin, 35000);
  }
  var spMin = Number(hb.swipePauseMinMs);
  var spMax = Number(hb.swipePauseMaxMs);
  if (isNaN(spMin) || spMin < 0) {
    spMin = 5000;
  }
  if (isNaN(spMax) || spMax < spMin) {
    spMax = Math.max(spMin, 10000);
  }
  return {
    searchName: searchName,
    swipePauseMinMs: Math.floor(spMin),
    swipePauseMaxMs: Math.floor(spMax),
    requireSearchVisible: reqVis,
    searchSeenCooldownMinMs: cdMin,
    searchSeenCooldownMaxMs: cdMax,
    searchPollTimeoutMs: poll,
    searchFinalTimeoutMs: finalTo,
    earlyExitRemainingMs: earlySec * 1000,
    timeUpFindSearchMaxAttempts: maxUp,
  };
}

/** @returns {number} 本次步骤总时长（毫秒） */
function 首页浏览_计算总时长毫秒(最小分钟, 最大分钟) {
  var m = 随机区间(最小分钟, 最大分钟);
  logd("首页浏览总时长 " + m + " 分钟（min~max=" + 最小分钟 + "-" + 最大分钟 + "）");
  return m * 60 * 1000;
}

function 首页浏览_执行滑动(startX, startY, endX, endY, durationMs) {
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
function 首页浏览_向下滑一次() {
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
  首页浏览_执行滑动(cx, yStart, cx, yEnd, dur);
}

/** 手指自上向下滑：列表内容向上滚（回顶部方向） */
function 首页浏览_向上滑一次() {
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
  首页浏览_执行滑动(cx, yStart, cx, yEnd, dur);
}

function 首页浏览_当前时间戳() {
  if (typeof Date !== "undefined" && typeof Date.now === "function") {
    return Date.now();
  }
  return new Date().getTime();
}

function 首页浏览_sleepBounded(deadlineMs, minPause, maxPause) {
  var now = 首页浏览_当前时间戳();
  var left = deadlineMs - now;
  if (left <= 0) {
    return;
  }
  var p = 随机区间(minPause, maxPause);
  var ms = Math.min(p, left);
  if (ms > 0 && typeof AMZ_分段睡眠并维持心跳 === "function") {
    AMZ_分段睡眠并维持心跳(ms);
  } else if (ms > 0) {
    sleep(ms);
  }
}

function 首页浏览_连续下滑次数(n, deadlineMs, pauseMinMs, pauseMaxMs) {
  var pmin = pauseMinMs != null ? Number(pauseMinMs) : 5000;
  var pmax = pauseMaxMs != null ? Number(pauseMaxMs) : 10000;
  if (isNaN(pmin) || pmin < 0) {
    pmin = 5000;
  }
  if (isNaN(pmax) || pmax < pmin) {
    pmax = Math.max(pmin, 10000);
  }
  var i = 0;
  for (i = 0; i < n; i++) {
    if (deadlineMs != null && 首页浏览_当前时间戳() >= deadlineMs) {
      break;
    }
    首页浏览_向下滑一次();
    if (deadlineMs != null) {
      首页浏览_sleepBounded(deadlineMs, Math.floor(pmin), Math.floor(pmax));
    } else {
      var w = 随机区间(Math.floor(pmin), Math.floor(pmax));
      if (typeof AMZ_分段睡眠并维持心跳 === "function") {
        AMZ_分段睡眠并维持心跳(w);
      } else {
        sleep(w);
      }
    }
  }
}

/**
 * @param requireVisible true 时用 name(...).visible(true).getOneNodeInfo，减少「节点在树里但已滚出视野仍命中」的假阳性
 */
function 首页浏览_尝试取搜索节点(accessibilityName, timeoutMs, requireVisible) {
  var nm = accessibilityName != null ? String(accessibilityName).trim() : "";
  if (nm.length === 0 || typeof name !== "function") {
    return null;
  }
  var to = timeoutMs != null ? Number(timeoutMs) : 2000;
  if (isNaN(to) || to < 200) {
    to = 2000;
  }
  try {
    var sel = name(nm);
    if (requireVisible === true && sel != null && typeof sel.visible === "function") {
      sel = sel.visible(true);
    }
    return sel.getOneNodeInfo(to);
  } catch (e) {
    return null;
  }
}

function 首页随机浏览(最小分钟, 最大分钟) {
  AMZ_执行标准步骤("首页随机浏览", function (attemptIndex) {
    var cfg = 首页浏览_读home配置();
    日志收集器.添加(
      "步骤: 首页随机浏览 " + 最小分钟 + "-" + 最大分钟 + " 分钟 (attempt=" + (attemptIndex + 1) + ")"
    );
    var totalMs = 首页浏览_计算总时长毫秒(最小分钟, 最大分钟);
    var deadline = 首页浏览_当前时间戳() + totalMs;
    日志收集器.添加(
      "首页浏览: 随机滑动阶段检测 " +
        cfg.searchName +
        (cfg.requireSearchVisible ? "（要求 visible）" : "") +
        "；剩余≤" +
        Math.round(cfg.earlyExitRemainingMs / 1000) +
        "s 且命中则提前结束；见搜索但剩余较多则下滑5次后冷却再继续；到时后仅上滑找搜索；滑动间隔 " +
        Math.round(cfg.swipePauseMinMs / 1000) +
        "～" +
        Math.round(cfg.swipePauseMaxMs / 1000) +
        "s"
    );

    首页浏览_连续下滑次数(5, deadline, cfg.swipePauseMinMs, cfg.swipePauseMaxMs);

    var searchCooldownUntil = 0;
    while (首页浏览_当前时间戳() < deadline) {
      var nowLoop = 首页浏览_当前时间戳();
      if (nowLoop < searchCooldownUntil) {
        if (Math.random() < 0.5) {
          首页浏览_向下滑一次();
        } else {
          首页浏览_向上滑一次();
        }
        首页浏览_sleepBounded(deadline, cfg.swipePauseMinMs, cfg.swipePauseMaxMs);
        continue;
      }
      var node = 首页浏览_尝试取搜索节点(
        cfg.searchName,
        cfg.searchPollTimeoutMs,
        cfg.requireSearchVisible
      );
      if (node != null) {
        var remaining = deadline - 首页浏览_当前时间戳();
        if (remaining <= cfg.earlyExitRemainingMs) {
          日志收集器.添加(
            "首页浏览: 已检测到 " + cfg.searchName + "，剩余约 " + Math.round(remaining / 1000) + "s ≤ 阈值，提前完成"
          );
          return;
        }
        var cdMs = 随机区间(Math.floor(cfg.searchSeenCooldownMinMs), Math.floor(cfg.searchSeenCooldownMaxMs));
        日志收集器.添加(
          "首页浏览: 已检测到 " +
            cfg.searchName +
            "，剩余约 " +
            Math.round(remaining / 1000) +
            "s > 阈值，再下滑 5 次；随后 " +
            Math.round(cdMs / 1000) +
            "s 内不再检测搜索（仅随机滑）"
        );
        首页浏览_连续下滑次数(5, deadline, cfg.swipePauseMinMs, cfg.swipePauseMaxMs);
        searchCooldownUntil = 首页浏览_当前时间戳() + cdMs;
        continue;
      }
      if (Math.random() < 0.5) {
        首页浏览_向下滑一次();
      } else {
        首页浏览_向上滑一次();
      }
      首页浏览_sleepBounded(deadline, cfg.swipePauseMinMs, cfg.swipePauseMaxMs);
    }

    日志收集器.添加("首页浏览: 已到计划时长，改为仅上滑直到出现 " + cfg.searchName);
    var k = 0;
    for (k = 0; k < cfg.timeUpFindSearchMaxAttempts; k++) {
      var n2 = 首页浏览_尝试取搜索节点(
        cfg.searchName,
        cfg.searchFinalTimeoutMs,
        cfg.requireSearchVisible
      );
      if (n2 != null) {
        日志收集器.添加("首页浏览: 时间到后已找到 " + cfg.searchName);
        return;
      }
      首页浏览_向上滑一次();
      var pw = 随机区间(cfg.swipePauseMinMs, cfg.swipePauseMaxMs);
      if (typeof AMZ_分段睡眠并维持心跳 === "function") {
        AMZ_分段睡眠并维持心跳(pw);
      } else {
        sleep(pw);
      }
    }
    日志收集器.添加("首页浏览: 警告，时间到后仍未找到 " + cfg.searchName + "（已达上滑次数上限）");
  });
}
