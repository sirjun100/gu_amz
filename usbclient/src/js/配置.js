/**
 * 亚马逊任务客户端 — 全局配置（与 客户端上报日志约定.md / README 服务端接口一致）
 */
var AMZ_CONFIG = {
  /** 服务根地址，无末尾斜杠，例如 http://192.168.1.10:5090 */
  apiBase: "http://156.238.248.137:5090",
  /** 默认由 EasyClick device.getDeviceId() 填充；无设备 API 时可由界面 deviceId 回退 */
  deviceId: "",
  /** AMG 在 iOS 上的 Bundle Identifier（真机以安装包为准，必填方能打开 AMG） */
  bundleIdAmg: "",
  /** Google Chrome（iOS 常见为 com.google.chrome.ios，若地区/版本不同请在界面覆盖） */
  bundleIdChrome: "com.google.chrome.ios",
  /**
   * Chrome：`打开亚马逊首页.js` 使用（节点 / 找图 / 可选 omnibox 点击）。
   * omniboxTapX/Y > 0 时用绝对坐标；否则用 omniboxTapRatio（相对全屏宽高的 0~1）。
   */
  chrome: {
    /** Google 新标签页「假 omnibox」无障碍 name（iOS Chrome，可用节点探查校对） */
    googleNtpOmniboxAccessibilityId: "NTPHomeFakeOmniboxAccessibilityID",
    /** 备选 id，逗号/分号/空格分隔，主 id 找不到时依次尝试 */
    googleNtpOmniboxAccessibilityIdAlts: "",
    /** name(...).getOneNodeInfo 超时毫秒 */
    googleNtpNodeWaitMs: 5000,
    /** true：输入网址前多点一次地址栏（默认 false，只点找图命中位置） */
    tapOmniboxBeforeUrlInput: false,
    omniboxTapRatio: { rx: 0.5, ry: 0.11 },
    omniboxTapX: 0,
    omniboxTapY: 0,
    /** inputText(content, duration) 的 duration，网址较长时可加大 */
    inputTextDurationMs: 1500,
    /**
     * 点击按住时长(ms)。Chrome/WebView 对过短的瞬时 click 常只「亮一下」而无焦点；
     * 可试 100～180。
     */
    tapHoldMs: 120,
    /**
     * true：每次分辨率变化时，adjustScreenOrientation(0) + bleEvent.setScreenSize/setScale（与截屏一致），
     * 减少 BLE 坐标漂移；若与其它脚本冲突可改为 false。
     */
    syncTapCoordinateSystem: true,
  },
  /**
   * steps/关键词库随机搜索浏览或加购.js：无障碍 name(...).getOneNodeInfo
   * 真机请用节点探查改成与当前 Amazon/Chrome 一致的文案。
   */
  keywordBrowse: {
    searchAccessibilityName: "search",
    addToCartAccessibilityName: "Add to cart",
    backAccessibilityName: "Back",
    /** 加购后若进入购物车/确认页：轮询 Back 的次数与单次超时 */
    backAfterAddPollAttempts: 6,
    backPollTimeoutMs: 2000,
    backPollGapMinMs: 600,
    backPollGapMaxMs: 1400,
    /** 点击 Back 离开购物车/详情后，再等待（毫秒随机区间）再继续滑动浏览，默认约 5～10 秒 */
    afterBackPauseMinMs: 5000,
    afterBackPauseMaxMs: 10000,
    /** 底部/顶部购物车入口，逗号分隔依次尝试 */
    cartAccessibilityNameAlts: "Cart,Shopping Cart",
    getNodeTimeoutMs: 5000,
    /** 找 search 时每次失败后上滑再睡 1～3s，最多尝试轮数 */
    searchMaxSwipeAttempts: 50,
    charDelayMinMs: 80,
    charDelayMaxMs: 280,
    /** 每次滑动后等待再探测 Add to cart（毫秒随机区间），默认约 5～10 秒，与 homeBrowse 一致可调 */
    swipePauseMinMs: 5000,
    swipePauseMaxMs: 10000,
    addToCartPollTimeoutMs: 2000,
    addToCartRequireVisible: true,
    /** clickExFirst：可点时优先 clickEx；clickCenter：仅 clickCenter */
    addToCartClickStrategy: "clickExFirst",
    /** true：浏览加购阶段总时长用步骤入参 [最小分钟,最大分钟] 随机（真分钟，同首页随机浏览） */
    browseUseTaskMinuteRangeForDeadline: true,
    /** 时间到后仅上滑找 search 的最大次数；每次探测超时见 exitSearchFinalTimeoutMs */
    timeUpFindSearchMaxAttempts: 100,
    exitSearchFinalTimeoutMs: 5000,
    exitRequireSearchVisible: true,
    /** 浏览加购大循环上限，防止死循环 */
    browseMaxOuterRounds: 80,
  },
  /**
   * steps/首页随机浏览.js：随机滑动阶段轮询 search；未配置 searchAccessibilityName 时用 keywordBrowse 同名项。
   */
  homeBrowse: {
    /** 每次滑动后的等待节奏（毫秒随机区间），默认约 5～10 秒 */
    swipePauseMinMs: 5000,
    swipePauseMaxMs: 10000,
    /** true：仅当无障碍 visible 为 true 才算「见到搜索」，避免页眉节点一直在树里导致死循环 */
    requireSearchVisible: true,
    /** 触发「再下滑 5 次」后，在此区间内随机毫秒不再检测 search，只做随机滑（防连刷日志/卡死） */
    searchSeenCooldownMinMs: 15000,
    searchSeenCooldownMaxMs: 35000,
    /** 轮询 name(search) 的超时(ms)，过大会拖慢主循环 */
    searchPollTimeoutMs: 2000,
    /** 总时长已到后，每次探测 search 的超时(ms) */
    searchFinalTimeoutMs: 5000,
    /** 已出现 search 且距离结束不足此时长(秒)则提前结束本步骤 */
    earlyExitRemainingSeconds: 60,
    /** 时间用尽后仅上滑找 search 的最大尝试次数 */
    timeUpFindSearchMaxAttempts: 100,
  },
  /**
   * steps/搜索并点击目标任务广告.js：搜索框与按标题找商品（优先节点 label / labelMatch）
   */
  searchClick: {
    /** 未配置时回退用 keywordBrowse.searchAccessibilityName */
    searchAccessibilityName: "",
    getNodeTimeoutMs: 5000,
    searchMaxSwipeAttempts: 50,
    /** 标题参与正则匹配的最大字符数（列表里常被截断，过长意义不大） */
    productTitleMatchMaxChars: 80,
    /** 列表里找不到标题时下滑次数上限（单轮探测失败后的滑动） */
    findProductMaxScrollAttempts: 45,
    /** 搜索 results 列表累计停留真实分钟（仅列表计时，进详情不算）；到时结束本步骤 */
    listBrowseMinMinutes: 2,
    listBrowseMaxMinutes: 4,
    /** 详情页单次进入后随机浏览真实分钟（不受 demoMode 压缩） */
    detailBrowseMinMinutes: 1,
    detailBrowseMaxMinutes: 3,
    /** 详情返回列表；空字符串则用 keywordBrowse.backAccessibilityName */
    backAccessibilityName: "",
  },
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
  /** true：压缩「随机等待分钟」等为秒级短等；首页随机浏览仍为真实分钟（见 steps/首页随机浏览.js） */
  demoMode: true,
  /**
   * 任务链抛错时截当前屏并上传：先 AMZ_截图压缩到临时文件（缩放宽 + webp），再走 /tasks/{id}/screenshots。
   * uploadFailureScreenshotForTaskTypes 为空数组时对所有 task_type 生效。
   */
  uploadFailureLastScreenshot: true,
  uploadFailureScreenshotForTaskTypes: ["search_click"],
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
