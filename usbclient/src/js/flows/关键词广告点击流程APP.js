/**
 * task_type: search_click
 * 分步执行：任一步失败会 throw，由 任务主循环.js 截获并结案/切下一任务；任一步抛错时由「执行一条任务」截末屏上传。
 */
function 关键词广告点击流程APP版本(task) {
  var tid = task != null && task.id != null ? task.id : "?";
  try {

    日志收集器.添加("[关键词广告] 开始 task_id=" + tid);
    关键词广告点击APP版本_返回到HOME界面();

    日志收集器.添加("[关键词广告] 步骤1/5 打开 AMG 并选择环境");
    if (!关键词广告点击APP版本_打开AMG并选择环境()) {
      throw new Error("步骤1 失败：打开 AMG 并选择环境");
    }

    日志收集器.添加("[关键词广告] 步骤1 完成；返回桌面");
    关键词广告点击APP版本_返回到HOME界面();

    日志收集器.添加("[关键词广告] 步骤2/5 打开亚马逊APP");
    if (!关键词广告点击APP版本_打开亚马逊APP()) {
      throw new Error("步骤2 失败：打开 亚马逊APP");
    }

    日志收集器.添加("[关键词广告] 步骤2/5 登录亚马逊账号");
    if (!关键词广告点击APP版本_登录亚马逊账号()) {
      throw new Error("步骤2 失败：登录亚马逊账号");
    }

    日志收集器.添加("[关键词广告] 步骤3/5 关键词广告点击APP版本_打开亚马逊首页并随机浏览");
    if (!关键词广告点击APP版本_打开亚马逊首页并随机浏览()) {
      throw new Error("步骤3 失败：打开亚马逊首页或检测未通过");
    }

    日志收集器.添加("[关键词广告] 步骤4/5 随机关键词搜索浏览");
    if (!关键词广告点击APP版本_搜索随机关键词浏览并加购()) {
      throw new Error("步骤4 失败：随机关键词浏览或加购");
    }

    日志收集器.添加("[关键词广告] 步骤5/5 关键词广告点击APP版本_搜索并点击目标任务广告");
    关键词广告点击APP版本_搜索并点击目标任务广告(task);

    日志收集器.添加("[关键词广告] 全部步骤完成 task_id=" + tid);
  } finally {
    try {
      appKillByBundleIdEx(AMZ_CONFIG.bundleIdChrome);
      logd("[关键词广告] 已尝试关闭 Chrome");
    } catch (eKill) {
      logw("[关键词广告] 关闭 Chrome: " + eKill);
    }
  }
}

/**
 * @param {object} task 含 params.keyword、params.res_folder_name；可选 params.target_asin / params.asin 用于上报统计
 */

function 关键词广告点击APP版本_浏览详情页面(识别词) {

  //在这里上传识别词用于统计，未实现，AI请实现

  var 进入详情开始时间 = Date.now();
  for (var j = 0; j < 5; j++) {
    向下滑一次();
    sleep(随机区间(4000, 8000));
  }
  while (true) {
    var 选择的值 = 随机选择([1, 2]);
    if (选择的值 == 1) {
      向下滑一次();
      sleep(随机区间(4000, 8000));
    } else {
      向上滑一次();
      sleep(随机区间(4000, 8000));
    }

    var 详情执行分钟 = 获取分钟的值(进入详情开始时间);
    if (详情执行分钟 > 3) {
      var 回退按钮 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Button' and @index=0 and @label='Back']").getOneNodeInfo(5000);
      回退按钮.clickCenter();
      sleep(随机区间(3000, 5000))
      break;
    }
  }

  向下滑一次();
  sleep(随机区间(3000, 5000))
}

function 关键词广告点击APP版本_搜索并点击目标任务广告(task) {
  var 关键词 = 'black curtains';
  var 品牌 = 'MIULEE';
  var 价格列表 = ['13.99', '16.99'];
  日志收集器.添加("[关键词广告] 步骤5 搜索并点击广告 keyword=" + 关键词);

  日志收集器.添加("点击搜索框");
  var 搜索框 = name("searchTextView").getOneNodeInfo(5000);
  if (!搜索框) {
    日志收集器.添加("搜索框未找到,改用直接点击坐标");
    clickPoint(576, 152);
    sleep(随机区间(4000, 6000));
  } else {
    clickPoint(576, 152);
    搜索框.clickCenter();
    sleep(随机区间(4000, 6000))
  }

  日志收集器.添加("点击清除按钮");
  var 清除按钮 = 找图("清除关键词.png");
  if (!清除按钮) {
    日志收集器.添加("未找到清楚按钮，点击坐标760，152");
    clickPoint(760, 152);
    sleep(随机区间(2000, 3000));
  } else {
    日志收集器.添加("找到清楚按钮，点击清除按钮");
    clickPoint(清除按钮.x, 清除按钮.y);
    sleep(随机区间(2000, 3000));
  }

  日志收集器.添加("开始输入关键词");
  逐字输入(关键词);
  sleep(随机区间(1000, 3000));
  ioHIDEvent("0x07", "0x28", 0.2);
  sleep(随机区间(5000, 8000));

  var 任务详情开始时间 = Date.now();
  var 点击广告次数 = 0;


  日志收集器.添加("正在检测界面是否存在品牌======");
  var 是否有品牌默认有 = true
  var 品牌节点 = xpath("//node[@type='StaticText'][contains(@name, '" + 品牌 + "')]").getOneNodeInfo(5000);
  if (!品牌节点) {
    是否有品牌默认有 = false;
    日志收集器.添加("页面上不存在品牌，通过价格识别");
  } else {
    日志收集器.添加("页面上存在品牌，通过品牌识别");
  }

  while (true) {
    if (点击广告次数 >= 3) {
      日志收集器.添加("[关键词广告] 步骤5 已达最多点击次数 3，结束");
      break;
    }
    var 执行分钟 = 获取分钟的值(任务详情开始时间);
    if (执行分钟 > 点击广告次数 * 4 + 10) {
      日志收集器.添加("[关键词广告] 步骤5 超过时间预算（约 " + 执行分钟 + " 分钟），结束");
      break;
    }

    var 根节点 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other' and @index=0]").getOneNodeInfo(5000);
    //var 根节点 = name("Amazon.com : "+关键词).getOneNodeInfo(5000);
    if (!根节点) {
      日志收集器.添加("未找到根节点");
    }
    // 2. 锁定节点
    lockNode();
    // 3. 获取所有直接子节点（不包含孙子节点）
    let childCount = 根节点.childCount; // 获取子节点数量
    logd("父节点的直接子节点数量: " + childCount);
    // 4. 遍历所有直接子节点，筛选符合条件的
    let resultNodes = [];
    for (let i = 0; i < childCount; i++) {
      let child = 根节点.child(i); // 使用 child(index) 获取直接子节点
      if (child && child.type == "Other") {
        var bounds = child.bounds;
        if (bounds.top > 100 && bounds.bottom < 1800 && bounds.right <= 900 && bounds.right >= 700) {
          resultNodes.push(child);
          logd(`${child.name}: L=${bounds.left}, T=${bounds.top}, R=${bounds.right}, B=${bounds.bottom}`);
        }
      }
    }

    logd("共找到 " + resultNodes.length + " 个符合条件的直接子节点【已显示的节点】");
    for (let i = 0; i < resultNodes.length; i++) {
      var node = resultNodes[i];
      if (是否有品牌默认有) {
        var 名称节点 = node.getOneNodeInfo(xpath(".//node[@type='StaticText'][contains(@name, '" + 品牌 + "')]"), 5000);
        if (名称节点) {
          日志收集器.添加("商标已找到=【" + 名称节点.name + "】节点。");
          if (名称节点.name.contains("Sponsored")) {
            日志收集器.添加('检测到商标存在广告-有广告');
            名称节点.clickCenter();
            sleep(随机区间(4000, 8000));
            if (nameMatch("Visit the Store.*").getOneNodeInfo(5000)) {
              日志收集器.添加("成功进入到商品详情。开始浏览");
              点击广告次数 = 点击广告次数 + 1;
              关键词广告点击APP版本_浏览详情页面(名称节点.name);
            }
            break;
          } else {
            日志收集器.添加('没有检测到商标存在广告-无广告');
          }
        } else {
          日志收集器.添加('没找到名称节点');
        }
      } else {
        for (let j = 0; j <= 价格列表.length; j++) {
          var 价格 = 价格列表[j];
          日志收集器.添加("正在查找价格=【$" + 价格 + "】节点。");
          var 价格节点 = node.getOneNodeInfo(xpath(".//node[@type='StaticText'][@value='$" + 价格 + "']"), 2000);
          if (价格节点) {
            日志收集器.添加("已经找到价格节点=【$" + 价格 + "】节点。现在正在判断有没有广告");
            if (node.getOneNodeInfo(xpath(".//node[@type='StaticText'][contains(@name, 'Sponsored')]"), 2000)) {
              日志收集器.添加('检测到价格节点存在广告-有广告');
              node.clickCenter();
              sleep(随机区间(4000, 8000));
              if (nameMatch("Visit the Store.*").getOneNodeInfo(5000)) {
                日志收集器.添加("成功进入到商品详情。开始浏览");
                点击广告次数 = 点击广告次数 + 1;
                关键词广告点击APP版本_浏览详情页面(价格);
              }
              break;
            } else {
              日志收集器.添加('检测到价格节点不存在广告-无广告');
            }
          }
        }
      }
    }
    releaseNode();
    向下滑一次();
  }
  日志收集器.添加("[关键词广告] 步骤5 关键词广告点击APP版本_搜索并点击目标任务广告 完成");
}

function 关键词广告点击APP版本_搜索随机关键词浏览并加购() {
  日志收集器.添加("[关键词广告] 步骤4 请求随机关键词");
  var rkPool = 运维接口.随机关键词(3);
  var keywords =
    rkPool != null && rkPool.keywords != null && rkPool.keywords.length > 0 ? rkPool.keywords : [];
  if (keywords.length === 0) {
    日志收集器.添加("[关键词广告] 步骤4 随机关键词接口无词");
    throw new Error("关键词库随机搜索浏览或加购: 无关键词");
  }
  日志收集器.添加("[关键词广告] 步骤4 候选词: " + keywords.join(", "));

  var rkOne = 运维接口.随机关键词(1);
  var pick = "";
  if (rkOne != null && rkOne.keywords != null && rkOne.keywords.length > 0) {
    pick = String(rkOne.keywords[0]).trim();
  }
  if (pick.length === 0) {
    pick = String(keywords[0]).trim();
  }
  日志收集器.添加("[关键词广告] 步骤4 选用关键词: " + pick);

  var 搜索输入框 = id("searchTextField").getOneNodeInfo(5000);
  if (!搜索输入框) {
    日志收集器.添加("[关键词广告] 步骤4 未找到搜索框 (name=search)");
    throw new Error("关键词库随机搜索浏览或加购: 未找到搜索框");
  }

  搜索输入框.clickCenter();
  sleep(随机区间(2000, 5000));
  逐字输入(pick);
  var s = pick;
  日志收集器.添加("[关键词广告] 步骤4 已逐字输入，长度 " + s.length);
  sleep(随机区间(2000, 4000));
  ioHIDEvent("0x07", "0x28", 0.2);
  sleep(随机区间(5000, 10000));

  var start_time = Date.now();
  var idx = 0;
  for (idx = 0; idx < 5; idx++) {
    日志收集器.添加("[关键词广告] 随机关键词浏览(第" + idx + "次)向下滑一次");
    向下滑一次();
    sleep(随机区间(4000, 8000));
  }
  var 加购物车的总次数 = 随机选择([2, 3, 4]);
  var 加购物车的当前次数 = 0;
  while (true) {
    var 选择2 = 随机选择([1, 2]);
    if (选择2 == 1) {
      向下滑一次();
      sleep(随机区间(4000, 8000));
    } else {
      向上滑一次();
      sleep(随机区间(4000, 8000));
    }
    var 是否加购物车 = 随机选择([1, 2]);
    if (是否加购物车 == 2 && 加购物车的当前次数 < 加购物车的总次数) {
      日志收集器.添加("寻找购物车按钮，然后点击");
      var 心愿单图标 = 找图("心愿单图标.png");
      if (心愿单图标) {
        日志收集器.添加("找到合适的购物车按钮。执行点击");
        clickPoint(心愿单图标.x, 心愿单图标.y);
        加购物车的当前次数 = 加购物车的当前次数 + 1;
        sleep(随机区间(3000, 5000));
      } else {
        日志收集器.添加("为寻找到购物车按钮，不点击");
      }

      // //找节点方案
      // var 购物车所有按钮 = name('Heart to save an item to your list').getNodeInfo(5000);
      // for (let i =0;i<购物车所有按钮.length;i++){
      //   var 购物车按钮 = 购物车所有按钮[i];
      //   if(购物车按钮){
      //     var bounds = 购物车按钮.bounds;
      //     if (bounds.bottom>=600 && bounds.bottom<=1600) {
      //       日志收集器.添加("找到合适的购物车按钮。执行点击");
      //       购物车按钮.clickCenter();
      //       加购物车的当前次数 = 加购物车的当前次数 + 1;
      //       sleep(随机区间(3000, 5000));
      //     }
      //   }
      // }
    }
    var 浏览分钟 = 获取分钟的值(start_time);
    日志收集器.添加("[关键词广告] 已在随机关键词页面停留" + 浏览分钟 + "分钟");
    if (浏览分钟 > 4) {
      break;
    }
  }
  日志收集器.添加("[关键词广告] 步骤4 完成");
  return true;
}

function 关键词广告点击APP版本_打开亚马逊首页并随机浏览() {

  日志收集器.添加("点击首页按钮")
  var 首页按钮 = xpath("xpath\t//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Button' and @index=0 and @label='Home']").getOneNodeInfo(5000);
  if (!首页按钮) {
    throw new Error("没找到 [点击首页按钮]");
  }
  首页按钮.clickRandom();
  sleep(随机区间(3000, 5000));



  var start_time = Date.now();
  var hi = 0;
  for (hi = 0; hi < 5; hi++) {
    日志收集器.添加("[关键词广告] 首页浏览(第" + hi + "次)向下滑一次");
    向下滑一次();
    sleep(随机区间(4000, 6000));
  }

  while (true) {
    var 选择3 = 随机选择([1, 2]);
    if (选择3 == 1) {
      向下滑一次();
      sleep(随机区间(4000, 6000));
    } else {
      向上滑一次();
      sleep(随机区间(4000, 6000));
    }

    var 首页分钟 = 获取分钟的值(start_time);
    日志收集器.添加("[关键词广告] 已在首页停留" + 首页分钟 + "分钟");
    if (首页分钟 > 2) {
      break;
    }
  }

  while (true) {
    日志收集器.添加("[关键词广告] 首页正在滑行到最最顶端！！！");
    var 搜索节点首页 = 找节点("search");
    if (搜索节点首页) {
      break;
    }
    向上滑一次();
    sleep(随机区间(4000, 8000));
  }

  日志收集器.添加("[关键词广告] 步骤3 完成");
  return true;
}

function 关键词广告点击APP版本_打开AMG并选择环境() {
  var 选择环境状态 = false;
  var attempt = 0;
  for (attempt = 0; attempt < 3; attempt++) {
    logd("[关键词广告] 步骤1 AMG 尝试 " + (attempt + 1) + "/3");
    var AMG应用图标按钮 = 找图("amg/AMG应用图标.png");
    if (AMG应用图标按钮) {
      clickPoint(AMG应用图标按钮.x, AMG应用图标按钮.y);
      sleep(3000);
      var 备份记录按钮 = name("备份记录").getOneNodeInfo(5000);
      var 下一条按钮 = name("下一条").getOneNodeInfo(5000);
      if (备份记录按钮) {
        备份记录按钮.clickCenter();
        sleep(2000);
        下一条按钮 = name("下一条").getOneNodeInfo(5000);
      }
      if (下一条按钮) {
        下一条按钮 = name("下一条").getOneNodeInfo(5000);
        if (下一条按钮) {
          下一条按钮.clickCenter();
          sleep(6000);
          选择环境状态 = true;
        }
      }
    }
    if (选择环境状态) {
      日志收集器.添加("[关键词广告] 步骤1 AMG 选环境成功");
      break;
    }
    sleep(2000);
    if (!关键词广告点击APP版本_返回到HOME界面()) {
      日志收集器.添加("[关键词广告] 步骤1 回桌面失败");
      return false;
    }
  }
  return 选择环境状态;
}

function 关键词广告点击APP版本_登录亚马逊账号(task) {

  var 手机号码 = String(p.phone != null ? p.phone : "").trim();
  var 亚马逊账号密码 = String(p.password != null ? p.password : "").trim();

  日志收集器.添加("点击【菜单栏目个人中心图标】")
  var 菜单栏目个人中心图标 = 找图("菜单栏目个人中心图标.png");
  if (!菜单栏目个人中心图标) {
    throw new Error("没找到 [菜单栏目个人中心图标]");
  }
  clickPoint(菜单栏目个人中心图标.x, 菜单栏目个人中心图标.y);
  sleep(随机区间(2000, 3000));

  日志收集器.添加("点击【SIGN IN】");
  var Sign_in = 找可视化节点NAME("Sign in");
  if (!Sign_in) {
    throw new Error("没找到 [菜单栏目个人中心图标]");
  }
  Sign_in.clickRandom();
  sleep(随机区间(15000, 20000));


  日志收集器.添加("开始收入手机号=" + 手机号码)
  var 注册页面识别输入框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='TextField' and @index=2 and @label='Enter mobile number or email']").getOneNodeInfo(5000);
  if (!注册页面识别输入框) {
    throw new Error("没找到 [注册页面识别输入框]");
  }
  日志收集器.添加("点击识别输入框")
  注册页面识别输入框.clickRandom();
  sleep(随机区间(2000, 5000));
  逐字输入(手机号码);
  日志收集器.添加("手机号输入结束" + 手机号码)
  sleep(随机区间(2000, 5000));

  日志收集器.添加("点击继续注册按钮")
  var 继续按钮注册按钮 = name("Continue").getOneNodeInfo(5000);
  if (!继续按钮注册按钮) {
    throw new Error("没找到 [点击继续按钮注册按钮]");
  }
  继续按钮注册按钮.clickRandom();
  sleep(随机区间(3000, 5000));


  日志收集器.添加("进入输入密码流程=" + 亚马逊账号密码)
  var 亚马逊账号密码输入框 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='SecureTextField' and @index=7 and @label='Amazon password']").getOneNodeInfo(5000);
  if (!亚马逊账号密码输入框) {
    throw new Error("没找到 [亚马逊账号密码输入框]");
  }
  日志收集器.添加("点击亚马逊账号密码输入框")
  亚马逊账号密码输入框.clickRandom();
  sleep(随机区间(2000, 5000));
  逐字输入(亚马逊账号密码);
  日志收集器.添加("亚马逊账号密码结束结束=" + 亚马逊账号密码)
  sleep(随机区间(2000, 5000));


  日志收集器.添加("点击登录按钮")
  var 登录按钮 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Button' and @index=10 and @label='Sign in']").getOneNodeInfo(5000);
  if (!登录按钮) {
    throw new Error("没找到 [登录按钮]");
  }
  登录按钮.clickRandom();
  sleep(随机区间(3000, 5000));


  日志收集器.添加("进入输入OTP流程")
  var OTP输入框 = xpath(" //node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='TextField' and @index=6]").getOneNodeInfo(5000);
  if (!OTP输入框) {
    throw new Error("没找到 [OTP输入框]");
  }
  var OTP = 运维接口.获取亚马逊账号TOTP码(手机号码);
  日志收集器.添加("点击OTP输入框")
  OTP输入框.clickRandom();
  sleep(随机区间(2000, 5000));
  逐字输入(OTP);
  日志收集器.添加("OTP结束结束=" + OTP)
  sleep(随机区间(2000, 5000));


  日志收集器.添加("点击登录按钮")
  var 登录按钮 = xpath("node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Button' and @index=8 and @label='Sign in']").getOneNodeInfo(5000);
  if (!登录按钮) {
    throw new Error("没找到 [登录按钮]");
  }
  登录按钮.clickRandom();
  sleep(随机区间(10000, 15000));

  日志收集器.添加("检查账号登录是否成功");
  var 个人中心页面 = name("Your Orders").getOneNodeInfo(5000);
  if (!个人中心页面) {
    throw new Error("没找到 [个人中心页面，登录失败]");
  }
  日志收集器.添加("已跳转到个人中心页面，登录成功");




}



function 关键词广告点击APP版本_打开亚马逊APP() {
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

  if (亚马逊APP首页识别图标) {
    日志收集器.添加("[注册亚马逊] 亚马逊APP已准备就绪");
    return true;
  }

  if (打开亚马逊跳转到登录页面图标) {
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

  if (亚马逊APP首页识别图标) {
    日志收集器.添加("[注册亚马逊] 亚马逊APP已准备就绪");
    return true;
  }

  if (打开亚马逊跳转到登录页面图标) {
    var 亚马逊跳转到登录页面取消标志 = 找图("亚马逊跳转到登录页面取消标志.png");
    clickPoint(亚马逊跳转到登录页面取消标志.x, 亚马逊跳转到登录页面取消标志.y);
    sleep(3000);
    日志收集器.添加("[注册亚马逊] 亚马逊APP已准备就绪");
    return true;
  }
  日志收集器.添加("[注册亚马逊] 亚马逊APP打开异常~!! 请检查");
  return false;

}

function 关键词广告点击APP版本_返回到HOME界面() {
  var FLAG = false;
  var i = 0;
  for (i = 0; i < 3; i++) {
    var success = home();
    if (success) {
      FLAG = true;
      logd("[关键词广告] Home 键成功");
      break;
    }
    loge("[关键词广告] Home 键失败 " + (i + 1));
  }
  sleep(5000);
  return FLAG;
}
