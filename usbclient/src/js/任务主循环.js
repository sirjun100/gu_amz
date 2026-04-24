/**
 * 按序 execScript 加载的业务模块列表（相对 AMZ_SCRIPT_BASE）
 * main.js 里变量 AMZ_SCRIPT_BASE 非空时生效。
 */
var AMZ_MODULE_FILES = [
  "配置.js",
  "core/截图压缩.js",
  "core/截图队列.js",
  "api/运维接口.js",
  "utils/随机工具.js",
  "core/日志收集器.js",
  "core/EasyClick桥接.js",
  "core/简易步骤.js",
  "steps/打开AMG.js",
  "steps/按顺序选择环境.js",
  "steps/打开Chrome浏览器.js",
  "steps/打开亚马逊首页.js",
  "steps/检查账号是否已登录.js",
  "steps/首页随机浏览.js",
  "steps/关键词库随机搜索浏览或加购.js",
  "steps/任务关键词搜索竞品进详情.js",
  "steps/搜索并点击目标任务广告.js",
  "steps/详情页相关商品广告点击.js",
  "steps/详情页同类推荐广告点击.js",
  "flows/关键词广告点击流程.js",
  "flows/相关商品广告点击流程.js",
  "flows/同行同类广告点击流程.js",
];

function AMZ_规范化脚本根路径(base) {
  if (base == null || String(base).length === 0) {
    return "";
  }
  var b = String(base);
  if (b.charAt(b.length - 1) !== "/" && b.charAt(b.length - 1) !== "\\") {
    b = b + "/";
  }
  return b;
}

function AMZ_失败末屏上传_匹配任务类型(taskType) {
  if (typeof AMZ_CONFIG === "undefined" || AMZ_CONFIG == null || AMZ_CONFIG.uploadFailureLastScreenshot === false) {
    return false;
  }
  var list = AMZ_CONFIG.uploadFailureScreenshotForTaskTypes;
  if (list == null || typeof list.length !== "number" || list.length === 0) {
    return true;
  }
  var t = String(taskType || "");
  var i = 0;
  for (i = 0; i < list.length; i++) {
    if (String(list[i] || "") === t) {
      return true;
    }
  }
  return false;
}

/**
 * 任务失败时：截屏 → 压缩为 webp（与过程截图一致）→ 上传或 failed_only 入队（随结案后刷出）。
 */
function AMZ_任务失败上传末屏截图(taskId, taskType, errMsg) {
  if (!AMZ_失败末屏上传_匹配任务类型(taskType)) {
    return;
  }
  var tid = Number(taskId);
  if (isNaN(tid) || tid <= 0) {
    return;
  }
  if (typeof AMZ_截屏保存到临时文件 !== "function") {
    logw("AMZ_任务失败上传末屏截图: 无 AMZ_截屏保存到临时文件");
    return;
  }
  var raw = AMZ_截屏保存到临时文件();
  if (raw == null || String(raw).length === 0) {
    logw("AMZ_任务失败上传末屏截图: 截屏失败");
    return;
  }
  var pathToSend = raw;
  var compressed = false;
  if (AMZ_CONFIG.screenshotCompress !== false && typeof AMZ_截图压缩到临时文件 === "function") {
    var c = AMZ_截图压缩到临时文件(raw);
    if (c != null && String(c).length > 0 && c !== raw) {
      pathToSend = c;
      compressed = true;
    }
  }
  var desc = "task_fail_last_screen type=" + String(taskType || "") + " " + String(errMsg || "").slice(0, 380);
  var pol = AMZ_RUNTIME.screenshotUploadPolicy || "all";
  try {
    if (pol === "none") {
      logd("失败末屏: 策略 none，跳过上传");
      return;
    }
    if (pol === "failed_only") {
      if (typeof AMZ_截图队列 !== "undefined" && AMZ_截图队列 != null && typeof AMZ_截图队列.入队 === "function") {
        AMZ_截图队列.入队(pathToSend, desc, compressed || pathToSend !== raw);
      }
      return;
    }
    var r = 运维接口._postScreenshotMultipart(tid, pathToSend, desc);
    if (r == null || r.ok !== true) {
      logw("失败末屏上传: " + r);
    } else {
      logd("失败末屏已上传");
    }
  } finally {
    try {
      if (typeof file !== "undefined" && file != null && typeof file.deleteAllFile === "function") {
        if (pol === "failed_only") {
          if (compressed && raw !== pathToSend) {
            try {
              file.deleteAllFile(raw);
            } catch (e1) {}
          }
        } else {
          try {
            file.deleteAllFile(raw);
          } catch (e2) {}
          if (compressed && pathToSend !== raw) {
            try {
              file.deleteAllFile(pathToSend);
            } catch (e3) {}
          }
        }
      }
    } catch (eDel) {}
  }
}

function AMZ_按序加载全部模块() {
  if (typeof AMZ_SCRIPT_BASE === "undefined" || AMZ_SCRIPT_BASE == null || String(AMZ_SCRIPT_BASE).length === 0) {
    logd("AMZ_SCRIPT_BASE 为空：假定各模块已与 main 在同一工程内由 IDE 合并加载");
    return true;
  }
  var base = AMZ_规范化脚本根路径(AMZ_SCRIPT_BASE);
  for (var i = 0; i < AMZ_MODULE_FILES.length; i++) {
    var path = base + AMZ_MODULE_FILES[i];
    logd("[AMZ] 加载: " + path);
    if (typeof file !== "undefined" && file.exists && !file.exists(path)) {
      loge("文件不存在: " + path);
      return false;
    }
    if (!execScript(1, path)) {
      loge("execScript 失败: " + path);
      return false;
    }
  }
  return true;
}

function 执行一条任务(task) {
  if (task == null || task.id == null) {
    return;
  }
  日志收集器.清空();
  if (typeof AMZ_截图队列 !== "undefined" && AMZ_截图队列 != null && typeof AMZ_截图队列.开始任务 === "function") {
    AMZ_截图队列.开始任务();
  }
  var tid = task.id;
  var tt = task.task_type || task.type || "";
  var taskOk = false;

  try {
    logd("开始执行任务 id=" + tid + " type=" + tt + " 截图策略=" + (AMZ_RUNTIME.screenshotUploadPolicy || "all"));
    if (tt === "search_click") {
      关键词广告点击流程(task);
    } else if (tt === "related_click") {
      //相关商品广告点击流程(task);
    } else if (tt === "similar_click") {
     // 同行同类广告点击流程(task);
    } else if (tt === "register") {
      亚马逊账户注册(task);
    } else {
      throw new Error("未知任务类型: " + tt);
    }
    日志收集器.追加上报摘要("success", {});
    taskOk = true;
  } catch (err) {
    var msg = err != null ? String(err) : "unknown error";
    loge("任务失败: " + msg);
    日志收集器.追加上报摘要("failed", { error: msg });
    try {
      AMZ_任务失败上传末屏截图(tid, tt, msg);
    } catch (eShot) {
      logw("失败末屏上传异常: " + eShot);
    }
  }

  var pol = AMZ_RUNTIME.screenshotUploadPolicy || "all";
  if (taskOk && pol === "failed_only") {
    if (typeof AMZ_截图队列 !== "undefined" && AMZ_截图队列 != null && typeof AMZ_截图队列.丢弃 === "function") {
      AMZ_截图队列.丢弃();
    }
  }

  var lines = 日志收集器.取全部();
  var ok = 运维接口.上报结案(tid, lines, null);
  if (ok && !taskOk && pol === "failed_only" && typeof 运维接口.刷出截图队列 === "function") {
    运维接口.刷出截图队列(tid);
  }
  logd("任务结案上报: " + (ok ? "ok" : "fail") + " id=" + tid);
}

/**
 * 主循环：心跳 + 领任务 + 执行 + 上报（需在卡密等通过后调用）
 */
function 亚马逊任务入口() {
  if (!AMZ_按序加载全部模块()) {
    loge("业务模块加载失败");
    return;
  }

  初始化配置从界面();
  AMZ_应用设备标识();

  if (AMZ_CONFIG.deviceId == null || String(AMZ_CONFIG.deviceId).length === 0) {
    loge("无法得到 device_id：请确认 ios-jslibs 已加载且 device.getDeviceId() 有值，或在界面配置 deviceId 作为回退");
    return;
  }

  logd("亚马逊任务主循环启动 deviceId=" + AMZ_CONFIG.deviceId + " apiBase=" + AMZ_CONFIG.apiBase);

  while (true) {
    AMZ_必要时心跳();

    var task = null;
    try {
      task = 运维接口.领取任务(null);
    } catch (e2) {
      logw("领取任务 err: " + e2);
    }

    if (task == null) {
      logd("暂无任务，" + AMZ_CONFIG.pollIdleMs + "ms 后再试");
      AMZ_分段睡眠并维持心跳(AMZ_CONFIG.pollIdleMs);
      continue;
    }

    执行一条任务(task);
    AMZ_必要时心跳();
  }
}
