/**
 * task_type: search_click
 * 分步执行：任一步失败会 throw，由 任务主循环.js 截获并结案/切下一任务；任一步抛错时由「执行一条任务」截末屏上传。
 */
function 关键词广告点击流程(task) {
  var tid = task != null && task.id != null ? task.id : "?";
  try {


    日志收集器.添加("[关键词广告] 开始 task_id=" + tid);

    关键词广告点击流程_返回到HOME界面();

    日志收集器.添加("[关键词广告] 步骤1/5 打开 AMG 并选择环境");
    if (!关键词广告点击流程_打开AMG并选择环境()) {
      throw new Error("步骤1 失败：打开 AMG 并选择环境");
    }

    日志收集器.添加("[关键词广告] 步骤1 完成；返回桌面");
    关键词广告点击流程_返回到HOME界面();

    日志收集器.添加("[关键词广告] 步骤2/5 打开 Chrome");
    if (!关键词广告点击流程_打开Chrome浏览器()) {
      throw new Error("步骤2 失败：打开 Chrome 浏览器");
    }

    日志收集器.添加("[关键词广告] 步骤3/5 关键词广告点击流程_打开亚马逊首页并随机浏览");
    if (!关键词广告点击流程_打开亚马逊首页并随机浏览()) {
      throw new Error("步骤3 失败：打开亚马逊首页或检测未通过");
    }

    日志收集器.添加("[关键词广告] 步骤4/5 随机关键词搜索浏览");
    if (!关键词广告点击流程_搜索随机关键词浏览并加购()) {
      throw new Error("步骤4 失败：随机关键词浏览或加购");
    }

    日志收集器.添加("[关键词广告] 步骤5/5 关键词广告点击流程_搜索并点击目标任务广告");
    关键词广告点击流程_搜索并点击目标任务广告(task);

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
function 关键词广告点击流程_搜索并点击目标任务广告(task) {
  var p = (task != null && task.params) || {};
  var folderName = p.res_folder_name != null ? String(p.res_folder_name).trim() : "";
  var tid = task != null && task.id != null ? task.id : "?";

  日志收集器.添加(
    "[关键词广告] 步骤5 搜索并点击广告 keyword=" +
      (p.keyword || "") +
      " res_folder=" +
      folderName +
      " task_id=" +
      tid
  );

  var kw = String(p.keyword || "").trim();
  if (kw.length === 0) {
    throw new Error("关键词广告点击流程_搜索并点击目标任务广告: params.keyword 为空");
  }
  if (folderName.length === 0) {
    throw new Error("关键词广告点击流程_搜索并点击目标任务广告: params.res_folder_name 为空");
  }

  逐字输入(kw);
  sleep(随机区间(1000, 3000));
  ioHIDEvent("0x07", "0x28", 0.2);
  sleep(随机区间(5000, 8000));


  var listContent = readResString(folderName + "/filelist.txt");
  if (!listContent) {
    throw new Error("关键词广告点击流程_搜索并点击目标任务广告: 未找到资源清单文件 res/" + folderName + "/filelist.txt");
  }
  // 2. 按行分割，获取文件名数组
  var fileNames = listContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (fileNames.length === 0) {
    throw new Error("关键词广告点击流程_搜索并点击目标任务广告: 资源清单文件为空");
  }
  日志收集器.添加("[关键词广告] 步骤5 res 内共 " + fileNames.length + " 个文件: res/" + folderName + "/");



  var 任务详情开始时间 = Date.now();
  var 点击广告次数 = 0;

  while (true) {
    if (点击广告次数 >= 3) {
      logd("[关键词广告] 步骤5 已达最多点击次数 3，结束");
      break;
    }
    var 执行分钟 = 获取分钟的值(任务详情开始时间);
    if (执行分钟 > 点击广告次数 * 4 + 6) {
      logd("[关键词广告] 步骤5 超过时间预算（约 " + 执行分钟 + " 分钟），结束");
      break;
    }

    for (var i = 0; i < fileNames.length; i++) {
      var fileName = fileNames[i];
      var 广告图片 = 找图(folderName + "/" + fileName);
      if (广告图片) {
        for(var z=0;z<3;z++){
          clickPoint(广告图片.x, 广告图片.y);
          sleep(随机区间(4000, 8000));
          日志收集器.添加("[关键词广告] 步骤5 已点击图片模板->" + fileName);
          let 商品详情页检测标志 = nameMatch("Visit the Store.*").getOneNodeInfo(5000);
          if(商品详情页检测标志){
            break;
          }
        }

        if (true) {
          点击广告次数 = 点击广告次数 + 1;
          var asinReport = fileName.replace(".png", "");
          if (asinReport.length > 0) {
            var rep = 运维接口.上报目标ASIN点击(asinReport, kw);
            if (rep != null && rep.ok === true) {
              日志收集器.添加(
                "[关键词广告] ASIN 上报成功 " + asinReport + " total=" + rep.total_clicks + " today=" + rep.today_clicks
              );
            } else {
              日志收集器.添加("[关键词广告] ASIN 上报失败或异常 asin=" + asinReport);
            }
          } else {
            日志收集器.添加("[关键词广告] 未配置 target_asin/asin，跳过 ASIN 上报");
          }

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
              向上滑一次();
              sleep(随机区间(4000, 8000));
              var 回退按钮 = name("back").getOneNodeInfo(5000);
              if (回退按钮) {
                回退按钮.clickCenter();
                sleep(随机区间(4000, 8000));
              } else {
                日志收集器.添加("[关键词广告] 步骤5 未找到 back 节点，仍尝试回列表");
              }
              break;
            }
          }
        }
      } else {
        日志收集器.添加("[关键词广告] 没找到图片中的坐标->"+fileName);
      }
    }
    向下滑一次();
    sleep(随机区间(3000, 6000));
  }

  日志收集器.添加("[关键词广告] 步骤5 关键词广告点击流程_搜索并点击目标任务广告 完成");
}

function 关键词广告点击流程_搜索随机关键词浏览并加购() {
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

  var 搜索输入框 = name("search").getOneNodeInfo(5000);
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
    日志收集器.添加("[关键词广告] 随机关键词浏览(第"+idx+"次)向下滑一次");
    向下滑一次();
    sleep(随机区间(4000, 8000));
  }

  while (true) {
    var 选择2 = 随机选择([1, 2]);
    if (选择2 == 1) {
      向下滑一次();
      sleep(随机区间(4000, 8000));
    } else {
      向上滑一次();
      sleep(随机区间(4000, 8000));
    }

    var 浏览分钟 = 获取分钟的值(start_time);
    日志收集器.添加("[关键词广告] 已在随机关键词页面停留"+浏览分钟+"分钟");
    if (浏览分钟 > 2) {
      break;
    }
  }

  while (true) {
    var 搜索节点 = 找节点("search");
    if (搜索节点) {
      搜索节点.clickCenter();
      var bi = 0;
      sleep(随机区间(1000,2000));
      for (bi = 0; bi < s.length*1.5; bi++) {
        var result = ioHIDEvent("0x07", "0x2A", 0.2);
        if (result) {
          日志收集器.添加("[关键词广告] 步骤4 退格 " + (bi + 1) + "/" + s.length);
        }else{
          logd("回退失败");
        }
        sleep(300);
      }
      break;
    }else{
      logd("没有找到搜索节点啊，请看看");
    }
    向上滑一次();
    sleep(随机区间(4000, 8000));
  }

  日志收集器.添加("[关键词广告] 步骤4 完成");
  return true;
}

var AMZ_亚马逊首页URL = "https://www.amazon.com";
function 关键词广告点击流程_打开亚马逊首页并随机浏览() {
  var node = name("NTPHomeFakeOmniboxAccessibilityID").getOneNodeInfo(5000);
  if (node == null || node === undefined) {
    var addresNode = name("Address and search bar").getOneNodeInfo(5000);
    if (addresNode) {
      addresNode.clickCenter();
    }
  } else {
    node.clickCenter();
  }
  sleep(随机区间(600, 1200));
  日志收集器.添加("[关键词广告] 步骤3 输入网址: " + AMZ_亚马逊首页URL);
  AMZ_输入法尝试输入文本(AMZ_亚马逊首页URL);
  sleep(随机区间(800, 1500));
  var resultOpen = ioHIDEvent("0x07", "0x28", 0.2);
  logd("[关键词广告] 步骤3 ioHIDEvent 回车: " + resultOpen);
  日志收集器.添加("[关键词广告] 步骤3 已提交网址，等待加载");
  sleep(随机区间(4000, 6000));

  var 检测亚马逊搜索按钮 = name("search").getOneNodeInfo(5000)
  if (!检测亚马逊搜索按钮) {
    日志收集器.添加("[关键词广告] 步骤3 未检测到检测亚马逊搜索按钮");
    return false;
  }
  var 亚马逊检测账户未登录图标 =name('Sign in ›').getOneNodeInfo(5000);
  if(亚马逊检测账户未登录图标){
    日志收集器.添加("[关键词广告] 步骤3 检测到未登录，中止");
    return false;
  }

  // 检测亚马逊搜索按钮.clickCenter();
  // sleep(随机区间(1000, 3000));

  var start_time = Date.now();
  var hi = 0;
  for (hi = 0; hi < 5; hi++) {
    日志收集器.添加("[关键词广告] 首页浏览(第"+hi+"次)向下滑一次");
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
    日志收集器.添加("[关键词广告] 已在首页停留"+首页分钟+"分钟");
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

function 关键词广告点击流程_打开AMG并选择环境() {
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
    if (!关键词广告点击流程_返回到HOME界面()) {
      日志收集器.添加("[关键词广告] 步骤1 回桌面失败");
      return false;
    }
  }
  return 选择环境状态;
}

function 关键词广告点击流程_打开Chrome浏览器() {
  var launched = false;
  var i = 0;
  for (i = 0; i < 3; i++) {
    var r = appLaunchEx(AMZ_CONFIG.bundleIdChrome, "1");
    sleep(5000);
    if (r > 0) {
      日志收集器.添加("[关键词广告] 步骤2 打开 Chrome 成功（第 " + (i + 1) + " 次）");
      launched = true;
      break;
    }
    日志收集器.添加("[关键词广告] 步骤2 appLaunchEx 失败（第 " + (i + 1) + " 次）");
  }

  var Chrome新特性 = 找图("chrome/Chrome新特性.png");
  if(Chrome新特性){
    clickPoint(Chrome新特性.x, Chrome新特性.y);
    sleep(2000);
  }


  var chrome识别界面图标 = 找图("chrome/Chrome识别界面图标.png");

  if (!chrome识别界面图标) {
    日志收集器.添加("[关键词广告] 步骤2 未识别 Chrome 界面，尝试点击桌面图标");
    var Chrome应用 = 找图("chrome/Chrome应用图标.png");
    sleep(1000);
    if (Chrome应用) {
      clickPoint(Chrome应用.x, Chrome应用.y);
      sleep(2000);
      chrome识别界面图标 = 找图("chrome/Chrome识别界面图标.png");
    }
  }

  if (chrome识别界面图标) {
    日志收集器.添加("[关键词广告] 步骤2 Chrome 已就绪");
    return true;
  }
  日志收集器.添加("[关键词广告] 步骤2 无法确认 Chrome 界面");
  return false;
}

function 关键词广告点击流程_返回到HOME界面() {
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
