/**
 * task_type: search_click
 * 分步执行：任一步失败会 throw，由 任务主循环.js 截获并结案/切下一任务；任一步抛错时由「执行一条任务」截末屏上传。
 */

/** 接码接口返回的 JSON/文本里取第一个 6 位数字（常见字段 data.code 为短信内容） */
function AMZ_从接码HTTP响应解析亚马逊OTP(httpBody) {
  if (httpBody == null || httpBody === "") return "";
  var s = "";
  try {
    var j = typeof httpBody === "object" && httpBody !== null ? httpBody : JSON.parse(String(httpBody));
    var d = j.data != null ? j.data : j;
    if (d && typeof d === "object" && d.data != null) d = d.data;
    s = d && typeof d === "object" ? String(d.code != null ? d.code : d.msg != null ? d.msg : "") : "";
    if (!s) s = JSON.stringify(j);
  } catch (e) {
    s = String(httpBody);
  }
  var m = s.match(/(\d{6})/);
  return m ? m[1] : "";
}

function AMZ_轮询接码链接取验证码(smsLink, maxWaitSec) {
  var url = String(smsLink || "").trim();
  if (!url) return "";
  var maxMs = Math.max(10000, (Number(maxWaitSec) || 120) * 1000);
  var deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      var code = AMZ_从接码HTTP响应解析亚马逊OTP(http.httpGet(url, {}, AMZ_CONFIG.httpTimeoutMs, null));
      if (code && code.length === 6) {
        logd("[接码] " + code);
        return code;
      }
    } catch (e) {
      logw("[接码] " + e);
    }
    sleep(5000);
  }
  return "";
}

function 亚马逊账号设置OTP_开始() {
  var 已处理数量 = 0;
  while (true) {
    var 账号响应 = 运维接口.获取未设置OTP亚马逊账号();
    var 账号 = 账号响应 && 账号响应.account ? 账号响应.account : null;
    if (!账号) {
      日志收集器.添加("[亚马逊账号设置OTP] 没有找到需要设置OTP的账号，已处理数量=" + 已处理数量);
      logd("[亚马逊账号设置OTP] 没有找到需要设置OTP的账号");
      break;
    }

    var 账号参数 = 账号.params || {};
    账号参数.phone = String(账号.phone || 账号参数.phone || "").trim();
    账号参数.account_username = String(账号.account_username || 账号参数.account_username || "").trim();
    账号参数.account_password = String(账号.password || 账号参数.account_password || "").trim();
    账号参数.env_name = String(账号.env_name || 账号参数.env_name || "").trim();

    var task = {
      id: 账号.task_id || 账号.id || "?",
      params: 账号参数,
    };

    日志收集器.添加("[亚马逊账号设置OTP] 获取到待设置账号 phone=" + 账号参数.phone + " task_id=" + task.id);

    try {
      日志收集器.添加("[亚马逊账号设置OTP] 任务开始先回到HOME界面");
      亚马逊账号设置OTP_返回到HOME界面()

      日志收集器.添加("[亚马逊账号设置OTP] 步骤1/5 打开 AMG 并选择环境");
      if (!亚马逊账号设置OTP_打开AMG并选择环境()) {
        throw new Error("步骤1 失败：打开 AMG 并选择环境");
      }

      日志收集器.添加("正在联网");
      if (!运维接口.检查网络()) {
        日志收集器.添加("联网失败---");
        continue;
      }

      日志收集器.添加("[亚马逊账号设置OTP] 步骤1 完成；返回桌面");
      if (!亚马逊账号设置OTP_返回到HOME界面()) {
        throw new Error("步骤1 后失败：无法返回主屏幕");
      }
      日志收集器.添加("[亚马逊账号设置OTP] 步骤2/5 打开 亚马逊APP");
      if (!亚马逊账号设置OTP_打开亚马逊APP()) {
        throw new Error("步骤2 失败：打开 亚马逊APP");
      }

      日志收集器.添加("[亚马逊账号设置OTP] 步骤3/5 登录亚马逊账号");
      if (!亚马逊账号设置OTP_登录亚马逊账号(task)) {
        throw new Error("步骤2 失败：登录亚马逊账号");
      }

      日志收集器.添加("[亚马逊账号设置OTP] 步骤4/5 亚马逊账号设置OTP_设置二步验证");
      亚马逊账号设置OTP_设置二步验证(task);
      已处理数量 = 已处理数量 + 1;
      日志收集器.添加("[亚马逊账号设置OTP] 当前账号设置完成 phone=" + 账号参数.phone);
    } catch {
      日志收集器.添加("[亚马逊账号设置OTP] 任务出错啦！phone=" + 账号参数.phone);
    }
  }
}

function 亚马逊账号设置OTP_登录亚马逊账号(task) {

  var p = (task != null && task.params) || {};
  var 手机接码网址 = String(p.sms_link != null ? p.sms_link : "").trim();
  var 手机号码 = String(p.phone != null ? p.phone : "").trim();
  var 亚马逊账号密码 = String(p.password != null ? p.password : "").trim();

  日志收集器.添加("点击【菜单栏目个人中心图标】")
  var 菜单栏目个人中心图标 = 找图("菜单栏目个人中心图标.png");
  if (菜单栏目个人中心图标) {
    日志收集器.添加("已找到-点击【菜单栏目个人中心图标】")
    clickPoint(菜单栏目个人中心图标.x, 菜单栏目个人中心图标.y);
  } else {
    clickPoint(310, 1677);
  }
  sleep(随机区间(30000, 50000));

  日志收集器.添加("点击【SIGN IN】");
  var Sign_in = name("Sign in").type("Button").getOneNodeInfo(5000);
  if (!Sign_in) {
    日志收集器.添加("没找到 点击【SIGN IN] 尝试坐标");
    clickPoint(372, 544);
  }else{
    Sign_in.clickCenter();
  }

  sleep(随机区间(20000, 30000));


  日志收集器.添加("开始收入手机号=" + 手机号码)
  var 注册页面识别输入框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='TextField' and @index=2 and @label='Enter mobile number or email']").getOneNodeInfo(5000);
  if (!注册页面识别输入框) {
    throw new Error("没找到 [注册页面识别输入框]");
  }
  日志收集器.添加("点击识别输入框")
  注册页面识别输入框.clickCenter();
  sleep(随机区间(4000, 8000));
  逐字输入(手机号码);
  日志收集器.添加("手机号输入结束" + 手机号码)
  sleep(随机区间(4000, 8000));

  日志收集器.添加("点击继续登录按钮");
  var 继续按钮注册按钮 = name("Continue").getOneNodeInfo(5000);
  if (!继续按钮注册按钮) {
    throw new Error("没找到 [点击继续按钮]");
  }
  继续按钮注册按钮.clickCenter();
  sleep(随机区间(4000, 8000));


  日志收集器.添加("进入输入手机验证码流程")
  var authenticationRequired界面 = name("Authentication required").getOneNodeInfo(5000);
  //下面是输入框的XPATH，备用
  //node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='TextField' and @index=4]
  if (!authenticationRequired界面) {
    throw new Error("没找到 [authenticationRequired界面]");
  }

  日志收集器.添加("获取验证码->"+手机接码网址);
  var 验证码 = AMZ_轮询接码链接取验证码(手机接码网址, 120);
  if (!验证码 || String(验证码).length !== 6) {
    日志收集器.添加("手机短信超时或无效");
    throw new Error("手机短信验证码超时或无效");
  }

  日志收集器.添加("点击OTP输入框")
  // 手机验证码输入框.clickRandom();
  clickPoint(388,640);
  sleep(随机区间(4000, 8000));
  逐字输入(验证码);
  日志收集器.添加("手机验证码流程结束=" + 验证码)
  sleep(随机区间(2000, 5000));


  日志收集器.添加("点击登录按钮")
  var 登录按钮 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Button' and @index=5 and @label='Verify OTP Button']").getOneNodeInfo(5000);
  if (!登录按钮) {
    throw new Error("没找到 [登录按钮]");
  }
  登录按钮.clickRandom();
  sleep(随机区间(10000, 15000));

  日志收集器.添加("检查账号登录是否成功");
  var 个人中心页面 = name("Your Orders").getOneNodeInfo(5000);
  if (!个人中心页面) {
    try {
      var 登录失败截图路径 = AMZ_截屏保存到临时文件();
      if (登录失败截图路径) {
        运维接口.上报亚马逊账号登录失败(手机号码, 登录失败截图路径, "未进入Your Orders，判定登录失败");
        if (typeof file !== "undefined" && file != null && typeof file.deleteAllFile === "function") {
          file.deleteAllFile(登录失败截图路径);
        }
      }
    } catch (eLoginFailReport) {
      日志收集器.添加("登录失败上报异常: " + eLoginFailReport);
    }
    throw new Error("没找到 [个人中心页面，登录失败]");
  }
  日志收集器.添加("已跳转到个人中心页面，登录成功");
  return true;
}

function 亚马逊账号设置OTP_设置二步验证(task) {
  var p = (task != null && task.params) || {};
  var 手机接码网址 = String(p.sms_link != null ? p.sms_link : "").trim();
  var _phone = String(p.phone != null ? p.phone : "").trim();

  向下滑一次();
  sleep(随机区间(3000, 5000));

  var 账号设置图标 = name("Your Account").getOneNodeInfo(5000);

  //Your Account
  if(!账号设置图标){
    日志收集器.添加("[亚马逊账号设置OTP-亚马逊账号设置OTP_设置二步验证] 没有找到设置账号设置按钮");
    throw new Error("没有找到设置账号设置按钮");
  }
  //clickPoint(账号设置图标.x,账号设置图标.y);
  账号设置图标.clickCenter();
  sleep(随机区间(7000, 10000));

  日志收集器.添加("找【Login & security】并点击");
  var 登录与安全 = name("your_account_menu_item_loginSecurity").getOneNodeInfo(5000);
  if(!登录与安全){
    //your_account_menu_item_loginSecurity
    登录与安全 = 找可视化节点NAME("Login & security");
    if(!登录与安全){
      日志收集器.添加("[亚马逊账号设置OTP-亚马逊账号设置OTP_设置二步验证] 没有找到[Login & security]");
      throw new Error("没有找到[Login & security]");
    }
  }
  登录与安全.clickCenter()
  sleep(随机区间(7000, 10000));


  日志收集器.添加("找开启二步按钮【Turn on】并点击");
  var 开启二步验证按钮 = 找可视化节点NAME("Turn on");
  if(!开启二步验证按钮){
    开启二步验证按钮 = 找可视化节点NAME("Turn on two-step verification");
    if(!开启二步验证按钮){
      日志收集器.添加("[亚马逊账号设置OTP-亚马逊账号设置OTP_设置二步验证] 没有找到开启二步验证按钮");
      throw new Error("没有找到开启二步验证按钮");
    }
  }
  开启二步验证按钮.clickCenter()
  sleep(随机区间(10000, 15000));


  日志收集器.添加("可能跳继续按钮，检测一下，检测到就点击");
  var 继续按钮 = xpath('//node[@type=\'Application\']/node[@type=\'Window\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'WebView\']/node[@type=\'WebView\']/node[@type=\'WebView\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Button\' and @index=5 and @label=\'Continue\']').getOneNodeInfo(5000);
  if(继续按钮){
    继续按钮.clickRandom();
    sleep(随机区间(10000, 15000));
  }

  日志收集器.添加("可能跳Get Started按钮，检测一下，检测到就点击");
  var Get_Started_按钮 = name("Get Started").getOneNodeInfo(5000);
  if(Get_Started_按钮){
    Get_Started_按钮.clickRandom();
    sleep(随机区间(8000, 15000));
  }


  日志收集器.添加("点击【Use an authenticator app】按钮");
  var 使用二次验证单选 = name("Use an authenticator app").getOneNodeInfo(5000);
  if (!使用二次验证单选) {
    throw new Error("没找到 [使用二次验证单选]");
  }
  使用二次验证单选.clickRandom();
  sleep(随机区间(1000, 3000));
  日志收集器.添加("向下滑动一次");
  向下滑一次();
  sleep(随机区间(5000, 8000));

  var 验证OTP并且继续按钮 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Button' and @index=5 and @label='Verify OTP and continue']").getOneNodeInfo(5000);
  if(!验证OTP并且继续按钮){
    日志收集器.添加("[亚马逊账号设置OTP-亚马逊账号设置OTP_设置二步验证] 没有找到[Verify OTP and continue]");
    throw new Error("Verify OTP and continue");
  }

  var OTP验证码 = undefined;
  var maxTotpRetry = 12;
  for (var totpTry = 1; totpTry <= maxTotpRetry; totpTry++) {
    日志收集器.添加("验证OTP并且继续按钮已找到，开始截图，第" + totpTry + "/" + maxTotpRetry + "次");
    var totp截图路径 = AMZ_截屏保存到临时文件();
    日志收集器.添加("totp截图路径 " + totp截图路径);
    if (!totp截图路径) {
      日志收集器.添加("TOTP截图为空，等待后重试");
      sleep(1000);
      continue;
    }
    var totp上传结果 = 运维接口.上传TOTP二维码截图(_phone, totp截图路径);
    var 上传结果日志 = "";
    try {
      上传结果日志 = JSON.stringify(totp上传结果);
    } catch (e0) {
      上传结果日志 = String(totp上传结果);
    }
    日志收集器.添加("上传结果 " + 上传结果日志);

    file.deleteAllFile(totp截图路径);
    if (totp上传结果 && totp上传结果.totp_code) {
      OTP验证码 = String(totp上传结果.totp_code);
      break;
    }
    sleep(1000);
  }
  if (!OTP验证码) {
    throw new Error("TOTP识别失败，重试" + maxTotpRetry + "次后仍未拿到验证码");
  }

  //OTP验证码 = 运维接口.获取任务TOTP验证码(_phone);
  var OTP验证码输入框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='TextField' and @index=4]").getOneNodeInfo(6000);
  if (!OTP验证码输入框) {
    throw new Error("没找到 TOTP 输入框(EditText)");
  }
  OTP验证码输入框.clickRandom();
  sleep(随机区间(1000, 3000));
  逐字输入(OTP验证码);
  sleep(随机区间(1000, 3000));
  //这里要重新获取节点-验证TOP并且继续 金盘弹出周更新了位置
  验证OTP并且继续按钮 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Button' and @index=5 and @label='Verify OTP and continue']").getOneNodeInfo(5000);
  验证OTP并且继续按钮.clickRandom();
  sleep(随机区间(8000, 14000));


  日志收集器.添加("可能跳继续按钮，检测一下，检测到就点击");
  var 继续按钮 = xpath('//node[@type=\'Application\']/node[@type=\'Window\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'WebView\']/node[@type=\'WebView\']/node[@type=\'WebView\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Button\' and @index=5 and @label=\'Continue\']').getOneNodeInfo(5000);
  if(继续按钮){
    继续按钮.clickRandom();
    sleep(随机区间(8000, 14000));
  }
  // 日志收集器.添加("最后的设置，开启二步验证-勾选复选框");
  // var 不在此浏览器验证OTP的复选框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other' and @index=0 and @label='Amazon Two-Step Verification']").getOneNodeInfo(5000);
  // if (!不在此浏览器验证OTP的复选框) {
  //   throw new Error("没找到 [不在此浏览器验证OTP的复选框]");
  // }
  // 不在此浏览器验证OTP的复选框.clickRandom();
  // sleep(随机区间(1000, 3000));
  日志收集器.添加("点击开启开关-点击按钮");
  //开启二步验证的按钮.png
  var 开启二步验证的按钮 = name("Got it. Turn on Two-Step Verification").getOneNodeInfo(5000);
  if (!开启二步验证的按钮) {
    throw new Error("没找到 [开启二步验证的按钮]");
  }
  开启二步验证的按钮.clickRandom();
  sleep(随机区间(8000, 12000));

  // TOTP开启成功的标志.png
  日志收集器.添加("检测是否成功->二步验证设置");
  var TOTP开启成功的标志 = name("1 app enrolled").getOneNodeInfo(5000);
  if (!TOTP开启成功的标志) {
    throw new Error("没找到 [TOTP开启成功的标志]");
  }
  运维接口.亚马逊账号标记TOTP成功(_phone);
  日志收集器.添加("二步验证开始成功！！！");
}

function 亚马逊账号设置OTP_打开AMG并选择环境() {
  var 选择环境状态 = false;
  var attempt = 0;
  for (attempt = 0; attempt < 1; attempt++) {
    logd("[亚马逊账号设置OTP] 步骤1 AMG 尝试 " + (attempt + 1) + "/3");
    var AMG应用图标按钮 = 找图("amg/AMG应用图标.png");
    if (AMG应用图标按钮) {
      clickPoint(AMG应用图标按钮.x, AMG应用图标按钮.y);
      sleep(3000);

      日志收集器.添加("判断当前页面");
      var AMG = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='NavigationBar']/node[@type='Button' and @index=0 and @label='AMG']").getOneNodeInfo(5000);
      if(AMG){
        日志收集器.添加("在环境列表页面");
        AMG.clickCenter();
        sleep(10000);
      }else{
        日志收集器.添加("在首页");
      }

      日志收集器.添加("AMG-点击一键新机");
      var 一键新机 = name("一键新机").getOneNodeInfo(5000);
      一键新机.clickCenter();
      sleep(50000);

      return true;

    }
    if (选择环境状态) {
      日志收集器.添加("[亚马逊账号设置OTP] 步骤1 AMG 选环境成功");
      break;
    }
    sleep(2000);

  }
  return 选择环境状态;
}

function 亚马逊账号设置OTP_打开亚马逊APP() {
  var launched = false;
  var i = 0;
  for (i = 0; i < 3; i++) {
    var r = appLaunchEx("com.amazon.Amazon", "1");
    sleep(5000);
    if (r > 0) {
      日志收集器.添加("[亚马逊账号设置OTP] 步骤2 打开 亚马逊APP 成功（第 " + (i + 1) + " 次）");
      launched = true;
      break;
    }
    日志收集器.添加("[亚马逊账号设置OTP] 步骤2 appLaunchEx 失败（第 " + (i + 1) + " 次）");
  }
  //直接打开首页
  var 亚马逊APP首页识别图标 = 找图("亚马逊APP首页识别图标.png");
  //弹出了注册页面
  var 打开亚马逊跳转到登录页面图标 = 找图("打开亚马逊跳转到登录页面图标.png");

  if(亚马逊APP首页识别图标){
    日志收集器.添加("[亚马逊账号设置OTP] 亚马逊APP已准备就绪");
    return true;
  }

  if(打开亚马逊跳转到登录页面图标){
    var 亚马逊跳转到登录页面取消标志 = 找图("亚马逊跳转到登录页面取消标志.png");
    clickPoint(亚马逊跳转到登录页面取消标志.x, 亚马逊跳转到登录页面取消标志.y);
    sleep(3000);
    日志收集器.添加("[亚马逊账号设置OTP] 亚马逊APP已准备就绪");
    return true;
  }
  var 亚马逊APP图标 = 找图("亚马逊APP图标.png");
  sleep(1000);
  if (亚马逊APP图标) {
    clickPoint(亚马逊APP图标.x, 亚马逊APP图标.y);
    sleep(5000);
    日志收集器.添加("[亚马逊账号设置OTP] 步骤2 未识别 亚马逊首页 界面，尝试点击桌面图标");
  }

  //直接打开首页
  亚马逊APP首页识别图标 = 找图("亚马逊APP首页识别图标.png");
  //弹出了注册页面
  打开亚马逊跳转到登录页面图标 = 找图("打开亚马逊跳转到登录页面图标.png");

  if(亚马逊APP首页识别图标){
    日志收集器.添加("[亚马逊账号设置OTP] 亚马逊APP已准备就绪");
    return true;
  }

  if(打开亚马逊跳转到登录页面图标){
    var 亚马逊跳转到登录页面取消标志 = 找图("亚马逊跳转到登录页面取消标志.png");
    clickPoint(亚马逊跳转到登录页面取消标志.x, 亚马逊跳转到登录页面取消标志.y);
    sleep(3000);
    日志收集器.添加("[亚马逊账号设置OTP] 亚马逊APP已准备就绪");
    return true;
  }
  日志收集器.添加("[亚马逊账号设置OTP] 亚马逊APP打开异常~!! 请检查");
  return false;
}

function 亚马逊账号设置OTP_返回到HOME界面() {
  var FLAG = false;
  var i = 0;
  for (i = 0; i < 3; i++) {
    startEnv();
    sleep(3000);
    var success = home(); //agentEvent.pressKey("home");
    日志收集器.添加("[亚马逊账号设置OTP_返回到HOME界面，状态："+success+"] 被点击，等待8秒");
    sleep(8000);
    if (success) {
      FLAG = true;
      日志收集器.添加("[亚马逊账号设置OTP_返回到HOME界面] Home 键成功");
      break;
    }
    日志收集器.添加("[亚马逊账号设置OTP_返回到HOME界面] Home 键失败 " + (i + 1));
  }
  return FLAG;
}
