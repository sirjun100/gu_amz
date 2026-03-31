/**
 * 亚马逊任务客户端 — 全局配置（与 客户端上报日志约定.md / README 服务端接口一致）
 */
var AMZ_CONFIG = {
  /** 服务根地址，无末尾斜杠，例如 http://192.168.1.10:5090 */
  apiBase: "http://127.0.0.1:5090",
  /** 默认由 EasyClick device.getDeviceId() 填充；无设备 API 时可由界面 deviceId 回退 */
  deviceId: "",
  /** AMG 在 iOS 上的 Bundle Identifier（真机以安装包为准，必填方能打开 AMG） */
  bundleIdAmg: "",
  /** Google Chrome（iOS 常见为 com.google.chrome.ios，若地区/版本不同请在界面覆盖） */
  bundleIdChrome: "com.google.chrome.ios",
  /** 过程截图上传前：宽大于此值则等比缩小（减轻体积与超时），0 表示不缩放 */
  screenshotMaxWidth: 1080,
  /** false 时上传原图（仍建议服务端 TASK_IMAGE_MAX_MB 内） */
  screenshotCompress: true,
  /** 压缩临时图默认格式：webp 更小；若运行时不支持会自动回退 jpg */
  screenshotFormat: "webp",
  /**
   * AMG 打开与校验配置（按「包名启动 -> 涂色校验 -> 重试 -> 图标找色/坐标兜底」）
   */
  amg: {
    launchRetry: 1,
    launchWaitMs: 2500,
    verifyColorPoints: "",
    verifyThreshold: 0.9,
    verifyRect: { x: 0, y: 0, ex: 0, ey: 0 },
    iconColor: "",
    iconColorThreshold: 0.9,
    iconSearchRect: { x: 0, y: 0, ex: 0, ey: 0 },
    iconSearchLimit: 1,
    fallbackTapX: 0,
    fallbackTapY: 0,
    fallbackWaitMs: 1200,
  },
  /**
   * 通用步骤规则（steps/*.js）
   * - verifyColorPoints: 图色工具 points 字符串
   * - verifyRect/iconSearchRect: {x,y,ex,ey}
   */
  steps: {
    _default: {
      requireVerify: true,
      retryTimes: 2,
      retryWaitMs: 1200,
      verifyColorPoints: "",
      verifyThreshold: 0.9,
      verifyRect: { x: 0, y: 0, ex: 0, ey: 0 },
      iconColor: "",
      iconColorThreshold: 0.9,
      iconSearchRect: { x: 0, y: 0, ex: 0, ey: 0 },
      iconSearchLimit: 1,
      fallbackTapX: 0,
      fallbackTapY: 0,
      fallbackWaitMs: 1200,
    },
    "按顺序选择环境": {},
    "打开Chrome浏览器": {},
    "打开亚马逊首页": {},
    "检查账号是否已登录": {},
    "首页随机浏览": {},
    "关键词库随机搜索浏览或加购": {},
    "任务关键词搜索竞品进详情": {},
    "搜索并点击目标任务广告": {},
    "详情页相关商品广告点击": {},
    "详情页同类推荐广告点击": {},
  },
  /** HTTP 超时毫秒 */
  httpTimeoutMs: 120000,
  /** 无任务时轮询间隔 */
  pollIdleMs: 8000,
  /**
   * 独立节流：两次 POST /client/heartbeat 的最小间隔（与 README「约每 1 分钟」一致）
   */
  heartbeatIntervalMs: 60000,
  /** true：将「分钟级」等待改为秒级短等，便于真机联调 */
  demoMode: true,
  /** AMZ_REPORT.environment 默认值（可改为读机器名等） */
  environmentLabel: "EasyClick-iOS-USB",
};

/**
 * 运行期由服务端刷新（心跳 / 领取任务）：all | failed_only | none
 */
var AMZ_RUNTIME = {
  screenshotUploadPolicy: "all",
};

/**
 * 从 EasyClick 界面配置读取 apiBase、包名等（deviceId 回退见 core/EasyClick桥接.js）
 */
function 初始化配置从界面() {
  try {
    var u = readAllUIConfig();
    if (u == null || u === undefined) {
      return;
    }
    if (u["apiBase"] != null && String(u["apiBase"]).length > 0) {
      AMZ_CONFIG.apiBase = String(u["apiBase"]).replace(/\/+$/, "");
    }
    if (u["bundleIdAmg"] != null && String(u["bundleIdAmg"]).trim().length > 0) {
      AMZ_CONFIG.bundleIdAmg = String(u["bundleIdAmg"]).trim();
    }
    if (u["bundleIdChrome"] != null && String(u["bundleIdChrome"]).trim().length > 0) {
      AMZ_CONFIG.bundleIdChrome = String(u["bundleIdChrome"]).trim();
    }
    if (u["amgLaunchRetry"] != null && String(u["amgLaunchRetry"]).trim() !== "") {
      var ar = parseInt(String(u["amgLaunchRetry"]).trim(), 10);
      if (!isNaN(ar) && ar >= 0 && ar <= 3) {
        AMZ_CONFIG.amg.launchRetry = ar;
      }
    }
    if (u["amgLaunchWaitMs"] != null && String(u["amgLaunchWaitMs"]).trim() !== "") {
      var aw = parseInt(String(u["amgLaunchWaitMs"]).trim(), 10);
      if (!isNaN(aw) && aw >= 200) {
        AMZ_CONFIG.amg.launchWaitMs = aw;
      }
    }
    if (u["amgVerifyColorPoints"] != null && String(u["amgVerifyColorPoints"]).trim().length > 0) {
      AMZ_CONFIG.amg.verifyColorPoints = String(u["amgVerifyColorPoints"]).trim();
    }
    if (u["amgVerifyThreshold"] != null && String(u["amgVerifyThreshold"]).trim() !== "") {
      var at = parseFloat(String(u["amgVerifyThreshold"]).trim());
      if (!isNaN(at) && at > 0 && at <= 1) {
        AMZ_CONFIG.amg.verifyThreshold = at;
      }
    }
    if (u["amgVerifyRect"] != null && String(u["amgVerifyRect"]).trim().length > 0) {
      try {
        var vr = JSON.parse(String(u["amgVerifyRect"]));
        if (vr && vr.x != null && vr.y != null && vr.ex != null && vr.ey != null) {
          AMZ_CONFIG.amg.verifyRect = {
            x: Number(vr.x) || 0,
            y: Number(vr.y) || 0,
            ex: Number(vr.ex) || 0,
            ey: Number(vr.ey) || 0,
          };
        }
      } catch (eRect1) {
        logw("amgVerifyRect 解析失败: " + eRect1);
      }
    }
    if (u["amgIconColor"] != null && String(u["amgIconColor"]).trim().length > 0) {
      AMZ_CONFIG.amg.iconColor = String(u["amgIconColor"]).trim();
    }
    if (u["amgIconColorThreshold"] != null && String(u["amgIconColorThreshold"]).trim() !== "") {
      var ict = parseFloat(String(u["amgIconColorThreshold"]).trim());
      if (!isNaN(ict) && ict > 0 && ict <= 1) {
        AMZ_CONFIG.amg.iconColorThreshold = ict;
      }
    }
    if (u["amgIconSearchRect"] != null && String(u["amgIconSearchRect"]).trim().length > 0) {
      try {
        var ir = JSON.parse(String(u["amgIconSearchRect"]));
        if (ir && ir.x != null && ir.y != null && ir.ex != null && ir.ey != null) {
          AMZ_CONFIG.amg.iconSearchRect = {
            x: Number(ir.x) || 0,
            y: Number(ir.y) || 0,
            ex: Number(ir.ex) || 0,
            ey: Number(ir.ey) || 0,
          };
        }
      } catch (eRect2) {
        logw("amgIconSearchRect 解析失败: " + eRect2);
      }
    }
    if (u["amgFallbackTapX"] != null && String(u["amgFallbackTapX"]).trim() !== "") {
      var fx = parseInt(String(u["amgFallbackTapX"]).trim(), 10);
      if (!isNaN(fx) && fx >= 0) {
        AMZ_CONFIG.amg.fallbackTapX = fx;
      }
    }
    if (u["amgFallbackTapY"] != null && String(u["amgFallbackTapY"]).trim() !== "") {
      var fy = parseInt(String(u["amgFallbackTapY"]).trim(), 10);
      if (!isNaN(fy) && fy >= 0) {
        AMZ_CONFIG.amg.fallbackTapY = fy;
      }
    }
    if (u["amgIconSearchLimit"] != null && String(u["amgIconSearchLimit"]).trim() !== "") {
      var lim = parseInt(String(u["amgIconSearchLimit"]).trim(), 10);
      if (!isNaN(lim) && lim >= 1 && lim <= 10) {
        AMZ_CONFIG.amg.iconSearchLimit = lim;
      }
    }
    if (u["amgFallbackWaitMs"] != null && String(u["amgFallbackWaitMs"]).trim() !== "") {
      var fw = parseInt(String(u["amgFallbackWaitMs"]).trim(), 10);
      if (!isNaN(fw) && fw >= 200) {
        AMZ_CONFIG.amg.fallbackWaitMs = fw;
      }
    }
    if (u["demoMode"] === "0" || u["demoMode"] === false) {
      AMZ_CONFIG.demoMode = false;
    }
    if (u["environmentLabel"] != null && String(u["environmentLabel"]).length > 0) {
      AMZ_CONFIG.environmentLabel = String(u["environmentLabel"]);
    }
    if (u["heartbeatIntervalSec"] != null && String(u["heartbeatIntervalSec"]).trim() !== "") {
      var hs = parseInt(String(u["heartbeatIntervalSec"]).trim(), 10);
      if (!isNaN(hs) && hs >= 5) {
        AMZ_CONFIG.heartbeatIntervalMs = hs * 1000;
      }
    }
  } catch (e) {
    logw("初始化配置从界面: " + e);
  }
}

function 获取运行环境名称() {
  return AMZ_CONFIG.environmentLabel || "EasyClick-iOS";
}
