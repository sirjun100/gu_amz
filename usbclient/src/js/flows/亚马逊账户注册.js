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

function 亚马逊账户注册(task) {
  var tid = task != null && task.id != null ? task.id : "?";
  try {
    日志收集器.添加("[注册亚马逊] 开始 task_id=" + tid);

    // 日志收集器.添加("[注册亚马逊] 任务开始先回到HOME界面");
    // if (!返回到HOME界面()){
    //   throw new Error("步骤0 后失败：无法返回主屏幕");
    // }
    //
    // 日志收集器.添加("[注册亚马逊] 步骤1/5 打开 AMG 并选择环境");
    // if (!打开AMG并选择环境(task)) {
    //   throw new Error("步骤1 失败：打开 AMG 并选择环境");
    // }

    日志收集器.添加("[注册亚马逊] 步骤1 完成；返回桌面");
    if (!返回到HOME界面()) {
      throw new Error("步骤1 后失败：无法返回主屏幕");
    }
    日志收集器.添加("[注册亚马逊] 步骤2/5 打开 亚马逊APP");
    if (!打开亚马逊APP()) {
      throw new Error("步骤2 失败：打开 亚马逊APP");
    }
    日志收集器.添加("[注册亚马逊] 步骤3/5 执行注册流程");
    开始注册(task);

    日志收集器.添加("[注册亚马逊] 步骤4/5 设置二步验证");
    设置二步验证(task);

    日志收集器.添加("[注册亚马逊] 步骤5/5 设置默认地址");
    设置默认地址(task);
    日志收集器.添加("[注册亚马逊] 全部步骤完成 task_id=" + tid);
  } finally {
    try {
      appKillByBundleIdEx(AMZ_CONFIG.bundleIdChrome);
      logd("[注册亚马逊] 已尝试关闭");
    } catch (eKill) {
      logw("[注册亚马逊] 关闭 Chrome: " + eKill);
    }
  }
}


function 设置默认地址(task){
  var p = (task != null && task.params) || {};
  var 地址1 = String(p.address_snapshot.address_line1 != null ? p.address_snapshot.address_line1 : "1355 COUNTRY OAKS LN").trim();
  var _phone = String(p.phone != null ? p.phone : "").trim();
  地址1 = 地址1.substring(0, 15);

  //地址按钮标志.png
  日志收集器.添加("找地址菜单【Your Addresses】并点击");
  var 亚马逊地址菜单 = undefined;
  for(let i=0;i<3;i++){
    sleep(随机区间(5000, 8000));
    亚马逊地址菜单 = 找图('亚马逊地址菜单.png');
    if (亚马逊地址菜单) {
      break;
    }
    向下滑一次();
  }
  if(!亚马逊地址菜单){
    日志收集器.添加("[注册亚马逊-设置默认地址] 没有找到[添加一个新地址]");
    throw new Error("没有找到添加一个新地址");
  }
  clickPoint(亚马逊地址菜单.x,亚马逊地址菜单.y);
  sleep(随机区间(7000, 10000));


  日志收集器.添加("点击添加一个新地址");
  var 添加一个新地址 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Link']/node[@type='Link']/node[@type='StaticText' and @index=0 and @label='Add a new address']").getOneNodeInfo(5000);
  if(!添加一个新地址){
    日志收集器.添加("[注册亚马逊-设置默认地址] 没有找到[添加一个新地址]");
    throw new Error("没有找到[添加一个新地址]");
  }
  添加一个新地址.clickRandom();
  sleep(随机区间(7000, 10000));

  ///////////////////////////////地址设置界面
  向下滑一次();
  sleep(随机区间(4000, 6000));
  日志收集器.添加("开始输入地址");
  //街道地址输入框.png
  var 街道地址输入框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other' and @index=16]").getOneNodeInfo(5000);
  if(!街道地址输入框){
    日志收集器.添加("[注册亚马逊-设置默认地址] 没有找到[街道地址输入框]");
    throw new Error("没有找到[街道地址输入框]");
  }
  街道地址输入框.clickRandom();
  sleep(随机区间(1000, 3000));
  逐字输入(地址1);
  sleep(随机区间(3000, 5000));


  日志收集器.添加("点击联想");
  var 街道地址联想 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='TextField' and @index=20]").getOneNodeInfo(5000);
  if(!街道地址联想){
    日志收集器.添加("[注册亚马逊-设置默认地址] 没有找到[街道地址联想]");
    throw new Error("没有找到[街道地址联想]");
  }
  街道地址联想.clickRandom();

  sleep(随机区间(3000, 5000));


  日志收集器.添加("点击默认地址复选框");
  var 设置为默认地址复选框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Switch' and @index=0]").getOneNodeInfo(5000);
  if(!设置为默认地址复选框){
    日志收集器.添加("[注册亚马逊-设置默认地址] 没有找到[设置为默认地址复选框]");
    throw new Error("没有找到[设置为默认地址复选框]");
  }
  设置为默认地址复选框.clickRandom();
  sleep(随机区间(1000, 3000));


  //添加地址按钮.png
  日志收集器.添加("点击添加地址按钮");
  var 添加地址按钮 = name("Add address").getOneNodeInfo(5000);
  if(!添加地址按钮){
    日志收集器.添加("[注册亚马逊-设置默认地址] 没有找到[添加地址按钮]");
    throw new Error("没有找到[添加地址按钮]");
  }
  添加地址按钮.clickRandom();
  sleep(随机区间(10000, 15000));


  //地址已保存图标.png
  var 地址已保存图标 = name("Address saved").getOneNodeInfo(5000);
  if(!地址已保存图标){
    日志收集器.添加("[注册亚马逊-设置默认地址] 没有找到[地址已保存图标]");
    throw new Error("没有找到[地址已保存图标]");
  }
  地址已保存图标.clickRandom();

  日志收集器.添加("地址添加成功");
  运维接口.亚马逊账号标记地址成功(_phone);

}

function 设置二步验证(task) {
  var p = (task != null && task.params) || {};
  var 手机接码网址 = String(p.sms_link != null ? p.sms_link : "").trim();
  var _phone = String(p.phone != null ? p.phone : "").trim();

  日志收集器.添加("找【Yor Account】图片并点击");
  var 账号设置图标 = undefined;
  for(let i=0;i<3;i++){
    sleep(随机区间(5000, 8000));
    账号设置图标 = 找图("账号设置图标.png");
    if (账号设置图标) {
      break;
    }
    向下滑一次();

  }
  if(!账号设置图标){
    日志收集器.添加("[注册亚马逊-设置二步验证] 没有找到设置账号设置按钮");
    throw new Error("没有找到设置账号设置按钮");
  }
  clickPoint(账号设置图标.x,账号设置图标.y);
  sleep(随机区间(8000, 12000));


  日志收集器.添加("找【Login & security】图片并点击");
  var 登录与安全 = undefined;
  for(let i=0;i<3;i++){
    sleep(随机区间(5000, 8000));
    // 登录与安全 = 找节点("Login & security");
    登录与安全 = 找图("Login & security.png");
    if(!登录与安全){
      var 登录与安全2 = 找图("Login & security2.png");
      登录与安全 = 登录与安全2;
    }
    if (登录与安全) {
      break;
    }
    向下滑一次();

  }
  if(!登录与安全){
    日志收集器.添加("[注册亚马逊-设置二步验证] 没有找到账号与安全按钮");
    throw new Error("没有找到账号与安全按钮");
  }
  clickPoint(登录与安全.x,登录与安全.y);
  sleep(随机区间(8000, 12000));

  日志收集器.添加("找开启二步按钮【Turn on】并点击");
  var 开启二步验证按钮 = undefined;
  for(let i=0;i<3;i++){
    sleep(随机区间(5000, 8000));
    开启二步验证按钮 = 找图("二步验证TurnOn开关.png");
    if (开启二步验证按钮) {
      break;
    }
    向下滑一次();
  }
  if(!开启二步验证按钮){
    日志收集器.添加("[注册亚马逊-设置二步验证] 没有找到开启二步验证按钮");
    throw new Error("没有找到开启二步验证按钮");
  }
  clickPoint(开启二步验证按钮.x,开启二步验证按钮.y);
  sleep(随机区间(10000, 15000));

  日志收集器.添加("可能跳继续按钮，检测一下，检测到就点击");
  var 继续按钮 = xpath('//node[@type=\'Application\']/node[@type=\'Window\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'WebView\']/node[@type=\'WebView\']/node[@type=\'WebView\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Other\']/node[@type=\'Button\' and @index=5 and @label=\'Continue\']').getOneNodeInfo(5000);
  if(继续按钮){
    继续按钮.clickRandom();
    sleep(随机区间(10000, 15000));
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
    日志收集器.添加("[注册亚马逊-设置二步验证] 没有找到[Verify OTP and continue]");
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

    var ywei = 运维接口.获取亚马逊账号TOTP码(_phone);
    var 拉取结果日志 = "";
    try {
      拉取结果日志 = JSON.stringify(ywei);
    } catch (e1) {
      拉取结果日志 = String(ywei);
    }
    日志收集器.添加("获取TOTP结果 " + 拉取结果日志);

    file.deleteAllFile(totp截图路径);
    if (totp上传结果 && totp上传结果.totp_code) {
      OTP验证码 = String(totp上传结果.totp_code);
      break;
    }
    if (ywei && ywei.totp_code) {
      OTP验证码 = String(ywei.totp_code);
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

  日志收集器.添加("最后的设置，开启二步验证-勾选复选框");
  var 不在此浏览器验证OTP的复选框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other' and @index=0 and @label='Amazon Two-Step Verification']").getOneNodeInfo(5000);
  if (!不在此浏览器验证OTP的复选框) {
    throw new Error("没找到 [不在此浏览器验证OTP的复选框]");
  }
  不在此浏览器验证OTP的复选框.clickRandom();
  sleep(随机区间(1000, 3000));
  日志收集器.添加("点击开启开关-点击按钮");
  //开启二步验证的按钮.png
  var 开启二步验证的按钮 = name("Got it. Turn on Two-Step Verification").getOneNodeInfo(5000);
  if (!开启二步验证的按钮) {
    throw new Error("没找到 [开启二步验证的按钮]");
  }
  开启二步验证的按钮.clickRandom();
  sleep(随机区间(10000, 15000));
  // TOTP开启成功的标志.png
  var TOTP开启成功的标志 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='StaticText' and @index=0 and @label='Two-Step Verification (2SV) Settings']").getOneNodeInfo(5000);
  if (!TOTP开启成功的标志) {
    throw new Error("没找到 [TOTP开启成功的标志]");
  }
  运维接口.亚马逊账号标记TOTP成功(_phone);
  日志收集器.添加("二步验证开启成功，现在回退到个人信息页面");
  //回到个人信息页回退按钮.png
  var 回到个人信息页回退按钮 = name("Your Account").getOneNodeInfo(5000);
  if (!回到个人信息页回退按钮) {
    throw new Error("没找到 [TOTP开启成功的标志]");
  }
  回到个人信息页回退按钮.clickRandom();
  sleep(随机区间(8000, 10000));
}

/**
 * @param {object} task 含 params.keyword、params.res_folder_name；可选 params.target_asin / params.asin 用于上报统计
 */
function 开始注册(task) {
  var p = (task != null && task.params) || {};

  var 手机号码 = String(p.phone != null ? p.phone : "").trim();
  var 手机接码网址 = String(p.sms_link != null ? p.sms_link : "").trim();
  var 名字 = String(p.account_username != null ? p.account_username : "").trim();
  var 密码 = String(p.account_password != null ? p.account_password : "").trim();
  /** 可选：勾选「绑定邮箱接码库」时由服务端下发，用于 Outlook/Hotmail 登录与收信 */
  var 邮箱账号 = String(p.email != null ? p.email : "").trim();
  var 邮箱登录密码 = String(p.email_password != null ? p.email_password : "").trim();
  var 邮箱接码地址 = String(p.email_code_link != null ? p.email_code_link : "").trim();

  var _tid = task != null && task.id != null ? task.id : "?";
  var _taskNumId = task != null && task.id != null ? Number(task.id) : 0;
  日志收集器.添加(
    "[注册亚马逊-参数] task_id=" +
      _tid +
      " phone_pool_id=" +
      (p.phone_pool_id != null ? p.phone_pool_id : "-") +
      " email_pool_id=" +
      (p.email_pool_id != null ? p.email_pool_id : "-")
  );

  日志收集器.添加("点击【菜单栏目个人中心图标】")
  var 菜单栏目个人中心图标 = 找图("菜单栏目个人中心图标.png");
  if (!菜单栏目个人中心图标) {
    throw new Error("没找到 [菜单栏目个人中心图标]");
  }
  clickPoint(菜单栏目个人中心图标.x, 菜单栏目个人中心图标.y);
  sleep(随机区间(2000, 3000));

  日志收集器.添加("点击【个人中心注册按钮】")
  var 个人中心注册按钮 = 找图("个人中心注册按钮.png");
  if (!个人中心注册按钮) {
    个人中心注册按钮 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='ScrollView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Button' and @index=2 and @label='Create account']").getOneNodeInfo(5000);
    if (!个人中心注册按钮) {
      throw new Error("没找到 [个人中心注册按钮]");
    }
    个人中心注册按钮.clickCenter();
  }else{
    clickPoint(个人中心注册按钮.x, 个人中心注册按钮.y);
  }
  sleep(随机区间(9000, 15000));

  日志收集器.添加("开始收入手机号="+手机号码)
  var 注册页面识别输入框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='TextField' and @index=2 and @label='Enter mobile number or email']").getOneNodeInfo(5000);
  if (!注册页面识别输入框) {
    throw new Error("没找到 [注册页面识别输入框]");
  }
  日志收集器.添加("点击识别输入框")
  注册页面识别输入框.clickRandom();
  sleep(随机区间(2000, 5000));
  逐字输入(手机号码);
  日志收集器.添加("手机号输入结束"+手机号码)
  sleep(随机区间(2000, 5000));


  日志收集器.添加("点击继续注册按钮")
  var 继续按钮注册按钮 = name("Continue").getOneNodeInfo(5000);
  if (!继续按钮注册按钮) {
    throw new Error("没找到 [点击继续按钮注册按钮]");
  }
  继续按钮注册按钮.clickRandom();
  sleep(随机区间(3000, 5000));

  日志收集器.添加("点击继续创建一个账号按钮[Proceed to create an account]")
  var 创建一个账号按钮 = name("Proceed to create an account").getOneNodeInfo(5000);
  if (!创建一个账号按钮) {
    throw new Error("没找到 [创建一个账号按钮]");
  }
  创建一个账号按钮.clickRandom();
  sleep(随机区间(3000, 5000));

  日志收集器.添加("输入名字->"+名字)
  var 名字输入框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='TextField' and @index=10]").getOneNodeInfo(5000);
  if (!名字输入框) {
    throw new Error("没找到 [名字输入框]");
  }
  名字输入框.clickRandom();
  sleep(随机区间(1000, 3000));
  逐字输入(名字);
  sleep(随机区间(1000, 3000));

  日志收集器.添加("输入密码->"+密码)
  var 密码输入框 = name("Password").getOneNodeInfo(5000);
  if (!密码输入框) {
    throw new Error("没找到 [密码输入框]");
  }
  密码输入框.clickRandom();
  sleep(随机区间(1000, 3000));
  逐字输入(密码);
  sleep(随机区间(1000, 3000));

  日志收集器.添加("找键盘并点击DONE")
  var 键盘Done图标 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Toolbar']/node[@type='Other']/node[@type='Other']/node[@type='Button' and @index=2 and @label='Done']").getOneNodeInfo(5000) //找图("键盘Done图标.png");
  if (!键盘Done图标) {
    throw new Error("没找到 [键盘Done图标]");
  }else{
    键盘Done图标.clickCenter();
  }
  sleep(随机区间(1000, 3000));


  日志收集器.添加("点击发送验证码【Verify mobile number】")
  var 验证手机按钮 = name("Verify mobile number").getOneNodeInfo(5000);
  if (!验证手机按钮) {
    throw new Error("没找到 [验证手机按钮]");
  }
  验证手机按钮.clickRandom();
  sleep(随机区间(3000, 5000));



  var 确认提交按钮 = name("Confirm").getOneNodeInfo(5000);
  while(确认提交按钮){
    日志收集器.添加("[注册亚马逊-人工验证码] 截屏上传 task_id=" + _taskNumId);
    var 验证码截图路径 = typeof AMZ_截屏保存到临时文件 === "function" ? AMZ_截屏保存到临时文件() : "";
    if (!验证码截图路径 || String(验证码截图路径).length === 0) {
      throw new Error("人工验证码：无法截屏");
    }
    var 人工码上传 = 运维接口.上传人工验证码截图(_taskNumId, 验证码截图路径);
    file.deleteAllFile(验证码截图路径);
    if (
        人工码上传 == null ||
        人工码上传.ok !== true ||
        人工码上传.session_id == null ||
        isNaN(Number(人工码上传.session_id))
    ) {
      日志收集器.添加("[注册亚马逊-人工验证码] 上传失败 " + JSON.stringify(人工码上传));
      throw new Error("人工验证码截图上传失败");
    }
    var 人工码会话Id = Number(人工码上传.session_id);
    var 人工码截止 = Date.now() + 60000;
    var 人工点击列表 = null;
    while (Date.now() < 人工码截止) {
      var 人工轮询 = 运维接口.获取人工验证码点击结果(_taskNumId, 人工码会话Id)
      if (
          人工轮询 != null &&
          String(人工轮询.status || "") === "done" &&
          人工轮询.clicks != null &&
          人工轮询.clicks.length > 0
      ) {
        人工点击列表 = 人工轮询.clicks;
        break;
      }
      sleep(3000);
    }
    if (人工点击列表 == null || 人工点击列表.length === 0) {
      日志收集器.添加("[注册亚马逊-人工验证码] 1 分钟内未收到坐标");
      throw new Error("人工验证码超时（1 分钟未收到坐标）");
    }
    for (var hci = 0; hci < 人工点击列表.length; hci++) {
      var hpt = 人工点击列表[hci];
      var hx = hpt != null && hpt.x != null ? Number(hpt.x) : NaN;
      var hy = hpt != null && hpt.y != null ? Number(hpt.y) : NaN;
      if (isNaN(hx) || isNaN(hy)) {
        continue;
      }
      clickPoint(hx, hy);
      sleep(800);
    }
    //循环点击之后,点击confirm按钮
    日志收集器.添加("点击确认验证码");
    确认提交按钮.clickRandom();
    sleep(3000);
    //再次获取一下这个按钮，只有这个按钮消失了，验证码才算过了。
    确认提交按钮 = name("Confirm").getOneNodeInfo(5000);
    if(!确认提交按钮){
      日志收集器.添加("完整验证");
    }else{
      日志收集器.添加("验证失败----继续");
    }
  }

  sleep(随机区间(5000,8000));

  日志收集器.添加("判断是否到了手机验证码界面");
  //循环点击之后,点击confirm按钮
  var 创建你的亚马逊账户 = name("Verify OTP Button").getOneNodeInfo(5000);
  if (!创建你的亚马逊账户) {
    throw new Error("没找到 [创建你的亚马逊账户]");
  }

  日志收集器.添加("获取验证码->"+手机接码网址);
  var 验证码 = AMZ_轮询接码链接取验证码(手机接码网址, 120);
  if (!验证码 || String(验证码).length !== 6) {
    日志收集器.添加("[注册亚马逊-开始注册] 手机短信超时或无效");
    throw new Error("手机短信验证码超时或无效");
  }
  日志收集器.添加("验证码->"+验证码);

  var 验证码输入框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='TextField' and @index=4]").getOneNodeInfo(5000);
  if (!验证码输入框) {
    throw new Error("没找到 [验证码输入框]");
  }
  验证码输入框.clickRandom();
  sleep(随机区间(1000, 3000));
  逐字输入(验证码);
  sleep(随机区间(1000, 3000));

  日志收集器.添加("开始点击按钮【Verify OTP Button】->");
  创建你的亚马逊账户.clickRandom();
  sleep(随机区间(10000, 15000));

  日志收集器.添加("检查账号注册是否成功");
  var 个人中心页面 = name("Your Orders").getOneNodeInfo(5000);
  if (!个人中心页面) {
    throw new Error("没找到 [个人中心页面]");
  }
  日志收集器.添加("已跳转到注册页面，账号注册成功");
  运维接口.亚马逊账号上报引导(task.id);
}

function 打开AMG并选择环境(task) {
  var p = (task != null && task.params) || {};
  var 环境名字 = String(p.env_name != null ? p.env_name : "").trim();
  日志收集器.添加("环境名字->"+环境名字);
  var 选择环境状态 = false;
  var attempt = 0;
  for (attempt = 0; attempt < 1; attempt++) {
    logd("[注册亚马逊] 步骤1 AMG 尝试 " + (attempt + 1) + "/3");
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
      sleep(20000);

      日志收集器.添加("AMG-点击备份记录");
      var 备份记录 = name("备份记录").getOneNodeInfo(5000);
      备份记录.clickCenter();
      sleep(5000);

      日志收集器.添加("AMG-左滑动");
      var AMG勾中图标 = name("checkmark").getOneNodeInfo(5000);
      if(!AMG勾中图标){
        日志收集器.添加("没有找到【AMG勾中图标】图标，无法点击")
        return false;
      }
      var startX = AMG勾中图标.bounds.left-50;
      var y = AMG勾中图标.bounds.top;
      var endX =  AMG勾中图标.bounds.left-150;

      日志收集器.添加("startX:"+startX+",endX:"+endX+",y:"+y);


      swipeToPoint(startX, y, endX,y, 500);
      sleep(5000);

      日志收集器.添加("AMG-点击重命名");
      var 重命名 =name("重命名").getOneNodeInfo(5000);
      if(!重命名){
        日志收集器.添加("[注册亚马逊] 重命名按钮没找到");
        return false;
      }
      重命名.clickCenter();
      sleep(5000);

      var 重命名输入框 =xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Alert']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='ScrollView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='CollectionView']/node[@type='Cell']/node[@type='TextField' and @index=0]").getOneNodeInfo(5000);
      if(!重命名输入框){
        日志收集器.添加("[注册亚马逊] 重命名输入框没找到");
        return false;
      }

      for (var bi = 0; bi < 30; bi++) {
        var result = ioHIDEvent("0x07", "0x2A", 0.1);
        if (result) {
          日志收集器.添加("执行退格键");
        }else{
          logd("回退失败");
        }
      }

      inputText(环境名字, 1000);
      sleep(1000);

      日志收集器.添加("AMG-点击确定按钮");
      var 确定 =name("确定").getOneNodeInfo(5000);
      if(!确定){
        日志收集器.添加("[注册亚马逊] 确定按钮没找到");
        return false;
      }
      确定.clickCenter();
      sleep(5000);

      return true;

    }
    if (选择环境状态) {
      日志收集器.添加("[注册亚马逊] 步骤1 AMG 选环境成功");
      break;
    }
    sleep(2000);
    if (!返回到HOME界面()) {
      日志收集器.添加("[注册亚马逊] 步骤1 回桌面失败");
      return false;
    }
  }
  return 选择环境状态;
}

function 打开亚马逊APP() {
  var launched = false;
  var i = 0;
  for (i = 0; i < 3; i++) {
    var r = appLaunchEx("com.amazon.Amazon", "1");
    sleep(5000);
    if (r > 0) {
      日志收集器.添加("[注册亚马逊] 步骤2 打开 亚马逊APP 成功（第 " + (i + 1) + " 次）");
      launched = true;
      break;
    }
    日志收集器.添加("[注册亚马逊] 步骤2 appLaunchEx 失败（第 " + (i + 1) + " 次）");
  }


  //直接打开首页
  var 亚马逊APP首页识别图标 = 找图("亚马逊APP首页识别图标.png");
  //弹出了注册页面
  var 打开亚马逊跳转到登录页面图标 = 找图("打开亚马逊跳转到登录页面图标.png");

  if(亚马逊APP首页识别图标){
    日志收集器.添加("[注册亚马逊] 亚马逊APP已准备就绪");
    return true;
  }

  if(打开亚马逊跳转到登录页面图标){
    var 亚马逊跳转到登录页面取消标志 = 找图("亚马逊跳转到登录页面取消标志.png");
    clickPoint(亚马逊跳转到登录页面取消标志.x, 亚马逊跳转到登录页面取消标志.y);
    sleep(3000);
    日志收集器.添加("[注册亚马逊] 亚马逊APP已准备就绪");
    return true;
  }
  var 亚马逊APP图标 = 找图("亚马逊APP图标.png");
  sleep(1000);
  if (亚马逊APP图标) {
    clickPoint(亚马逊APP图标.x, 亚马逊APP图标.y);
    sleep(5000);
    日志收集器.添加("[注册亚马逊] 步骤2 未识别 亚马逊首页 界面，尝试点击桌面图标");
  }

  //直接打开首页
  亚马逊APP首页识别图标 = 找图("亚马逊APP首页识别图标.png");
  //弹出了注册页面
  打开亚马逊跳转到登录页面图标 = 找图("打开亚马逊跳转到登录页面图标.png");

  if(亚马逊APP首页识别图标){
    日志收集器.添加("[注册亚马逊] 亚马逊APP已准备就绪");
    return true;
  }

  if(打开亚马逊跳转到登录页面图标){
    var 亚马逊跳转到登录页面取消标志 = 找图("亚马逊跳转到登录页面取消标志.png");
    clickPoint(亚马逊跳转到登录页面取消标志.x, 亚马逊跳转到登录页面取消标志.y);
    sleep(3000);
    日志收集器.添加("[注册亚马逊] 亚马逊APP已准备就绪");
    return true;
  }
  日志收集器.添加("[注册亚马逊] 亚马逊APP打开异常~!! 请检查");
  return false;

}

function 返回到HOME界面() {
  var FLAG = false;
  var i = 0;
  for (i = 0; i < 3; i++) {
    var success = agentEvent.pressKey("home");
    if (success) {
      FLAG = true;
      logd("[注册亚马逊] Home 键成功");
      break;
    }
    loge("[注册亚马逊] Home 键失败 " + (i + 1));
  }
  return FLAG;
}
