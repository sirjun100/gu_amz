/**
 * 运维服务 HTTP 封装（/api/v1/client/...）
 */
function AMZ_应用服务端策略(obj) {
  if (obj == null || typeof obj !== "object") {
    return;
  }
  var p = obj.screenshot_upload_policy;
  if (p != null && String(p).length > 0) {
    AMZ_RUNTIME.screenshotUploadPolicy = String(p).trim();
    logd("服务端截图策略 => " + AMZ_RUNTIME.screenshotUploadPolicy);
  }
}

var 运维接口 = {
  心跳: function () {
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/heartbeat";
    var body = { device_id: AMZ_CONFIG.deviceId };
    var res = http.postJSON(url, body, AMZ_CONFIG.httpTimeoutMs, null);
    logd("heartbeat => " + res);
    if (res == null || res === "") {
      return false;
    }
    try {
      var j = typeof res === "object" && res !== null && !Array.isArray(res) ? res : JSON.parse(String(res));
      AMZ_应用服务端策略(j);
      return j.ok !== false;
    } catch (e) {
      logw("heartbeat 解析: " + e);
      return true;
    }
  },

  /**
   * @param taskType 可选：search_click | related_click | similar_click | register
   * @return task 对象或 null
   */
  领取任务: function (taskType) {
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/tasks/next";
    var params = { device_id: AMZ_CONFIG.deviceId };
    if (taskType != null && String(taskType).length > 0) {
      params.task_type = String(taskType);
    }
    var res = http.httpGet(url, params, AMZ_CONFIG.httpTimeoutMs, null);
    if (res == null || res === "") {
      loge("领取任务无响应");
      return null;
    }
    try {
      var j = JSON.parse(res);
      AMZ_应用服务端策略(j);
      return j.task;
    } catch (e) {
      loge("领取任务 JSON 失败: " + res);
      return null;
    }
  },

  /** @return { keywords: string[], count: number } 或 null */
  随机关键词: function (num) {
    var n = num == null ? 3 : Number(num);
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/random-keywords";
    var params = { num: String(Math.max(1, Math.min(100, n))) };
    var res = http.httpGet(url, params, AMZ_CONFIG.httpTimeoutMs, null);
    if (res == null || res === "") {
      return null;
    }
    try {
      return JSON.parse(res);
    } catch (e) {
      return null;
    }
  },

  /**
   * 执行中追加一张截图（不结案）。默认先压缩为 webp 再上传；failed_only 时先入本地队列。
   * @param description 管理端展示说明
   * @param skipCompress true 时不压缩
   */
  _postScreenshotMultipart: function (taskId, pathToSend, description) {
    var tid = Number(taskId);
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/tasks/" + tid + "/screenshots";
    var params = {
      device_id: AMZ_CONFIG.deviceId,
      description: description != null ? String(description).slice(0, 512) : "",
    };
    var files = { image: pathToSend };
    var res = http.httpPost(url, params, files, AMZ_CONFIG.httpTimeoutMs, null);
    logd("上传过程截图 => " + res);
    if (res == null || res === "") {
      return null;
    }
    try {
      return JSON.parse(res);
    } catch (e) {
      loge("上传过程截图 解析失败: " + e);
      return null;
    }
  },

  /** failed_only：结案失败后再上传队列（此时任务已为 failed） */
  刷出截图队列: function (taskId) {
    var tid = Number(taskId);
    if (isNaN(tid) || tid <= 0) {
      return;
    }
    if (typeof AMZ_截图队列 === "undefined" || AMZ_截图队列 == null || typeof AMZ_截图队列.取出全部 !== "function") {
      return;
    }
    var items = AMZ_截图队列.取出全部();
    logd("刷出截图队列 count=" + items.length);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var r = this._postScreenshotMultipart(tid, it.path, it.desc);
      if (it.isTmp && typeof file !== "undefined" && file != null && typeof file.deleteAllFile === "function") {
        try {
          file.deleteAllFile(it.path);
        } catch (eDel) {}
      }
      if (r == null || r.ok !== true) {
        logw("刷出截图失败 idx=" + i + " res=" + r);
      }
    }
  },

  上传过程截图: function (taskId, localPath, description, skipCompress) {
    var tid = Number(taskId);
    if (isNaN(tid) || tid <= 0) {
      loge("上传过程截图: 无效 taskId");
      return null;
    }
    var p = localPath != null ? String(localPath).trim() : "";
    if (p.length === 0) {
      loge("上传过程截图: 路径为空");
      return null;
    }
    var pol = AMZ_RUNTIME.screenshotUploadPolicy || "all";
    if (pol === "none") {
      logd("上传过程截图: 策略为禁止上传，已跳过");
      return { ok: false, skipped: true };
    }
    var pathToSend = p;
    var tmpCreated = false;
    if (skipCompress !== true && AMZ_CONFIG.screenshotCompress !== false && typeof AMZ_截图压缩到临时文件 === "function") {
      var c = AMZ_截图压缩到临时文件(p);
      if (c != null && String(c).length > 0 && c !== p) {
        pathToSend = c;
        tmpCreated = true;
      }
    }
    if (pol === "failed_only") {
      if (typeof AMZ_截图队列 !== "undefined" && AMZ_截图队列 != null && typeof AMZ_截图队列.入队 === "function") {
        AMZ_截图队列.入队(pathToSend, description, tmpCreated);
      }
      return { ok: true, queued: true };
    }
    var out = this._postScreenshotMultipart(tid, pathToSend, description);
    if (tmpCreated && typeof file !== "undefined" && file != null && typeof file.deleteAllFile === "function") {
      try {
        file.deleteAllFile(pathToSend);
      } catch (eDel) {
        /* ignore */
      }
    }
    return out;
  },

  /**
   * 目标 ASIN 点击 +1，并写入点击记录（时间、ASIN、关键词、设备）。若后台尚无该 ASIN 会自动登记后再计数。
   * @param asin Amazon ASIN
   * @param keyword 本次点击对应的搜索关键词（须与任务/搜索一致，服务端必填）
   * @return {{ ok: boolean, asin?: string, keyword?: string, total_clicks?: number, today_clicks?: number, record_id?: number, auto_registered?: boolean }|null}
   */
  上报目标ASIN点击: function (asin, keyword) {
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/asin-clicks";
    var body = {
      device_id: AMZ_CONFIG.deviceId,
      asin: asin != null ? String(asin).trim() : "",
      keyword: keyword != null ? String(keyword).trim() : "",
    };
    var res = http.postJSON(url, body, AMZ_CONFIG.httpTimeoutMs, null);
    logd("asin-clicks => " + res);
    if (res == null || res === "") {
      return null;
    }
    try {
      var j = typeof res === "object" && res !== null && !Array.isArray(res) ? res : JSON.parse(String(res));
      return j;
    } catch (e) {
      logw("asin-clicks 解析: " + e);
      return null;
    }
  },

  /** 注册任务开始后创建/更新账号记录（POST /client/amazon-accounts/bootstrap） */
  亚马逊账号上报引导: function (taskId) {
    var tid = Number(taskId);
    if (isNaN(tid) || tid <= 0) {
      loge("亚马逊账号上报: 无效 taskId");
      return null;
    }
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/amazon-accounts/bootstrap";
    var body = { device_id: AMZ_CONFIG.deviceId, task_id: tid };
    var res = http.postJSON(url, body, AMZ_CONFIG.httpTimeoutMs, null);
    logd("amazon bootstrap => " + res);
    if (res == null || res === "") {
      return null;
    }
    try {
      return typeof res === "object" && res !== null && !Array.isArray(res) ? res : JSON.parse(String(res));
    } catch (e) {
      logw("amazon bootstrap 解析: " + e);
      return null;
    }
  },

  亚马逊账号标记TOTP成功: function (phone) {
    var ph = phone != null ? String(phone).trim() : "";
    if (ph.length === 0) {
      return null;
    }
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/amazon-accounts/totp-done";
    var body = { phone: ph };
    var res = http.postJSON(url, body, AMZ_CONFIG.httpTimeoutMs, null);
    if (res == null || res === "") {
      return null;
    }
    try {
      return typeof res === "object" && res !== null && !Array.isArray(res) ? res : JSON.parse(String(res));
    } catch (e) {
      logw("amazon totp-done 解析: " + e);
      return null;
    }
  },

  亚马逊账号标记地址成功: function (phone) {
    var ph = phone != null ? String(phone).trim() : "";
    if (ph.length === 0) {
      return null;
    }
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/amazon-accounts/address-done";
    var body = { phone: ph };
    var res = http.postJSON(url, body, AMZ_CONFIG.httpTimeoutMs, null);
    if (res == null || res === "") {
      return null;
    }
    try {
      return typeof res === "object" && res !== null && !Array.isArray(res) ? res : JSON.parse(String(res));
    } catch (e) {
      logw("amazon address-done 解析: " + e);
      return null;
    }
  },

  /** 上传全屏截图供服务端解析 TOTP 二维码（multipart） */
  上传TOTP二维码截图: function (phone, imagePath) {
    var ph = phone != null ? String(phone).trim() : "";
    if (ph.length === 0) {
      loge("TOTP截图上传: phone 为空");
      return null;
    }
    var p = imagePath != null ? String(imagePath).trim() : "";
    if (p.length === 0) {
      loge("TOTP截图上传: 路径为空");
      return null;
    }
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/amazon-accounts/totp-qr";
    var params = { phone: ph, device_id: AMZ_CONFIG.deviceId };
    var files = { image: p };
    var res = http.httpPost(url, params, files, AMZ_CONFIG.httpTimeoutMs, null);
    logd("totp-qr => " + res);
    if (res == null || res === "") {
      return null;
    }
    try {
      return typeof res === "object" && res !== null && !Array.isArray(res) ? res : JSON.parse(String(res));
    } catch (e) {
      loge("totp-qr 解析失败: " + e);
      return null;
    }
  },

  /** 拉取当前 TOTP 6 位（须 task 归属本机 device_id），完整 JSON */
  获取亚马逊账号TOTP码: function (phone) {
    var ph = phone != null ? String(phone).trim() : "";
    if (ph.length === 0) {
      return null;
    }
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/amazon-accounts/totp-code";
    var params = { phone: ph, device_id: AMZ_CONFIG.deviceId };
    var res = http.httpGet(url, params, AMZ_CONFIG.httpTimeoutMs, null);
    logd('获取亚马逊账号TOTP码');
    logd(res);
    if (res == null || res === "") {
      return null;
    }
    try {
      return typeof res === "object" && res !== null && !Array.isArray(res) ? res : JSON.parse(String(res));
    } catch (e) {
      logw("totp-code 解析: " + e);
      return null;
    }
  },

  /** 按任务 ID 向服务端取一次当前 TOTP（仅单次请求，返回 6 位字符串或 ""） */
  获取任务TOTP验证码: function (phone) {
    var o = 运维接口.获取亚马逊账号TOTP码(phone);
    if (o == null || o.totp_code == null) {
      return "";
    }
    var c = String(o.totp_code).trim();
    return c.length === 6 ? c : "";
  },

  /** 上传全屏截图，等待管理端标注坐标（multipart） */
  上传人工验证码截图: function (taskId, imagePath) {
    var tid = Number(taskId);
    if (isNaN(tid) || tid <= 0) {
      loge("人工验证码: 无效 taskId");
      return null;
    }
    var p = imagePath != null ? String(imagePath).trim() : "";
    if (p.length === 0) {
      loge("人工验证码: 路径为空");
      return null;
    }
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/captcha-assist/upload";
    var params = { task_id: String(tid), device_id: AMZ_CONFIG.deviceId };
    var files = { image: p };
    var res = http.httpPost(url, params, files, AMZ_CONFIG.httpTimeoutMs, null);
    logd("captcha-assist upload => " + res);
    if (res == null || res === "") {
      return null;
    }
    try {
      return typeof res === "object" && res !== null && !Array.isArray(res) ? res : JSON.parse(String(res));
    } catch (e) {
      loge("captcha-assist upload 解析失败: " + e);
      return null;
    }
  },

  /** 轮询人工验证码是否已标注（约 3s 一次由调用方 sleep） */
  获取人工验证码点击结果: function (taskId, sessionId) {
    var tid = Number(taskId);
    var sid = Number(sessionId);
    if (isNaN(tid) || tid <= 0 || isNaN(sid) || sid <= 0) {
      return null;
    }
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/captcha-assist/result";
    var params = {
      task_id: String(tid),
      device_id: AMZ_CONFIG.deviceId,
      session_id: String(sid),
    };
    var res = http.httpGet(url, params, AMZ_CONFIG.httpTimeoutMs, null);
    if (res == null || res === "") {
      return null;
    }
    try {
      return typeof res === "object" && res !== null && !Array.isArray(res) ? res : JSON.parse(String(res));
    } catch (e) {
      logw("captcha-assist result 解析: " + e);
      return null;
    }
  },

  上报结案: function (taskId, lines, imagePaths) {
    var url = AMZ_CONFIG.apiBase + "/api/v1/client/tasks/" + taskId + "/report";
    var params = {
      device_id: AMZ_CONFIG.deviceId,
      log_lines: JSON.stringify(lines),
    };
    var files = null;
    /* 多图示例（按 EasyClick 文档调整 key/path）:
    if (imagePaths && imagePaths.length) {
      files = {};
      for (var i = 0; i < imagePaths.length; i++) {
        files["images"] = imagePaths[i];
      }
    }
    */
    var res = http.httpPost(url, params, files, AMZ_CONFIG.httpTimeoutMs, null);
    logd("report 原始响应: " + res);
    if (res == null || res === "") {
      return false;
    }
    try {
      var j = JSON.parse(res);
      return j.ok === true;
    } catch (e) {
      loge("report 解析失败: " + e);
      return false;
    }
  },
};

/** 最近一次成功心跳的时间戳（毫秒） */
var AMZ_lastHeartbeatMs = 0;

/**
 * 按 AMZ_CONFIG.heartbeatIntervalMs 节流调用 POST /client/heartbeat（默认约 60s）
 */
function AMZ_必要时心跳() {
  var iv = Number(AMZ_CONFIG.heartbeatIntervalMs);
  if (isNaN(iv) || iv < 5000) {
    iv = 60000;
  }
  var now = Date.now();
  if (AMZ_lastHeartbeatMs > 0 && now - AMZ_lastHeartbeatMs < iv) {
    return;
  }
  try {
    运维接口.心跳();
    AMZ_lastHeartbeatMs = Date.now();
  } catch (e) {
    logw("heartbeat err: " + e);
  }
}

/**
 * 长 sleep 切成多段，段间尝试节流心跳，避免任务执行长时间无在线更新
 */
function AMZ_分段睡眠并维持心跳(totalMs) {
  var total = Number(totalMs);
  if (isNaN(total) || total <= 0) {
    return;
  }
  var left = Math.floor(total);
  var slice = 15000;
  while (left > 0) {
    var s = left > slice ? slice : left;
    sleep(s);
    left -= s;
    AMZ_必要时心跳();
  }
}
