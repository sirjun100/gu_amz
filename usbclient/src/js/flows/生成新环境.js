function 生成新环境_开始执行(){
    生成新环境_返回到HOME界面()
    logd("[生成新环境] 步骤1 打开AMG并选择环境");
    if (!生成新环境_打开AMG并选择环境()) {
        throw new Error("步骤1 失败：打开 AMG 并选择环境");
    }
    logd("[生成新环境] 步骤2 完成；返回桌面");
    if (!生成新环境_返回到HOME界面()) {
        throw new Error("步骤2 后失败：无法返回主屏幕");
    }
    logd("[生成新环境] 步骤3 打开 亚马逊APP");
    if (!生成新环境_打开亚马逊APP()) {
        throw new Error("步骤3 失败：打开 亚马逊APP");
    }

    日志收集器.添加("[生成新环境] 步骤3/5 生成新环境_打开亚马逊首页并随机浏览");
    if (!生成新环境_打开亚马逊首页并随机浏览()) {
        throw new Error("步骤3 失败：打开亚马逊首页或检测未通过");
    }

    日志收集器.添加("[生成新环境] 步骤4/5 随机关键词搜索浏览");
    if (!生成新环境_搜索随机关键词浏览并加购()) {
        throw new Error("步骤4 失败：随机关键词浏览或加购");
    }

    日志收集器.添加("[生成新环境] 步骤5/5 生成新环境_在登录页面停留");
    if (!生成新环境_在登录页面停留()) {
        throw new Error("步骤4 失败：生成新环境_在登录页面停留");
    }
    return true;
}


function 生成新环境_AMG重命名环境() {

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



            // 日志收集器.添加("AMG-点击备份记录");
            // var 备份记录 = name("备份记录").getOneNodeInfo(5000);
            // 备份记录.clickCenter();
            // sleep(5000);

            // 日志收集器.添加("AMG-左滑动");
            // var AMG勾中图标 = name("checkmark").getOneNodeInfo(5000);
            // if(!AMG勾中图标){
            //   日志收集器.添加("没有找到【AMG勾中图标】图标，无法点击")
            //   return false;
            // }
            // var startX = AMG勾中图标.bounds.left-50;
            // var y = AMG勾中图标.bounds.top;
            // var endX =  AMG勾中图标.bounds.left-150;
            //
            // 日志收集器.添加("startX:"+startX+",endX:"+endX+",y:"+y);


            // swipeToPoint(startX, y, endX,y, 500);
            // sleep(5000);
            //
            // 日志收集器.添加("AMG-点击重命名");
            // var 重命名 =name("重命名").getOneNodeInfo(5000);
            // if(!重命名){
            //   日志收集器.添加("[注册亚马逊] 重命名按钮没找到");
            //   return false;
            // }
            // 重命名.clickCenter();
            // sleep(5000);

            // var 重命名输入框 =xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Alert']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='ScrollView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='CollectionView']/node[@type='Cell']/node[@type='TextField' and @index=0]").getOneNodeInfo(5000);
            // if(!重命名输入框){
            //   日志收集器.添加("[注册亚马逊] 重命名输入框没找到");
            //   return false;
            // }
            // for (var bi = 0; bi < 30; bi++) {
            //   ioHIDEvent("0x07", "0x2A", 0.1);
            // }

            // inputText(环境名字, 1000);
            // sleep(1000);
            //
            // 日志收集器.添加("AMG-点击确定按钮");
            // var 确定 =name("确定").getOneNodeInfo(5000);
            // if(!确定){
            //   日志收集器.添加("[注册亚马逊] 确定按钮没找到");
            //   return false;
            // }
            // 确定.clickCenter();
            // sleep(5000);

            return true;

        }
        if (选择环境状态) {
            日志收集器.添加("[注册亚马逊] 步骤1 AMG 选环境成功");
            break;
        }
        sleep(2000);

    }
    return 选择环境状态;
}


function 生成新环境_在登录页面停留(){
    日志收集器.添加("点击【菜单栏目个人中心图标】")
    var 菜单栏目个人中心图标 = 找图("菜单栏目个人中心图标.png");
    if (菜单栏目个人中心图标) {
        日志收集器.添加("已找到-点击【菜单栏目个人中心图标】")
        clickPoint(菜单栏目个人中心图标.x, 菜单栏目个人中心图标.y);
    } else {
        clickPoint(310, 1677);
    }
    sleep(随机区间(30000, 50000));

    var 菜单栏目个人中心图标2 = 找图("菜单栏目个人中心图标.png");
    if (菜单栏目个人中心图标2) {
        throw new Error("检查不到 个人中心图标，可能错误了！");
    }
    return true;
}

function 生成新环境_搜索随机关键词浏览并加购() {
    日志收集器.添加("[生成新环境] 步骤4 请求随机关键词");
    var rkPool = 运维接口.随机关键词(3);
    var keywords =
        rkPool != null && rkPool.keywords != null && rkPool.keywords.length > 0 ? rkPool.keywords : [];
    if (keywords.length === 0) {
        日志收集器.添加("[生成新环境] 步骤4 随机关键词接口无词");
        throw new Error("关键词库随机搜索浏览或加购: 无关键词");
    }
    日志收集器.添加("[生成新环境] 步骤4 候选词: " + keywords.join(", "));

    var rkOne = 运维接口.随机关键词(1);
    var pick = "";
    if (rkOne != null && rkOne.keywords != null && rkOne.keywords.length > 0) {
        pick = String(rkOne.keywords[0]).trim();
    }
    if (pick.length === 0) {
        pick = String(keywords[0]).trim();
    }
    日志收集器.添加("[生成新环境] 步骤4 选用关键词: " + pick);

    var 搜索输入框 = id("searchTextField").getOneNodeInfo(5000);
    if (!搜索输入框) {
        日志收集器.添加("[生成新环境] 步骤4 未找到搜索框 (name=search)");
        throw new Error("关键词库随机搜索浏览或加购: 未找到搜索框");
    }

    搜索输入框.clickCenter();
    sleep(随机区间(2000, 5000));
    逐字输入(pick);
    var s = pick;
    日志收集器.添加("[生成新环境] 步骤4 已逐字输入，长度 " + s.length);
    sleep(随机区间(2000, 4000));
    ioHIDEvent("0x07", "0x28", 0.2);
    sleep(随机区间(5000, 10000));

    var start_time = Date.now();
    var idx = 0;
    for (idx = 0; idx < 5; idx++) {
        日志收集器.添加("[生成新环境] 随机关键词浏览(第" + idx + "次)向下滑一次");
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
        日志收集器.添加("[生成新环境] 已在随机关键词页面停留" + 浏览分钟 + "分钟");
        if (浏览分钟 > 1) {
            break;
        }
    }
    日志收集器.添加("[生成新环境] 步骤4 完成");
    return true;
}

function 生成新环境_打开亚马逊首页并随机浏览() {

    日志收集器.添加("点击首页按钮")
    var 首页按钮 = name("Home").type("Button").getOneNodeInfo(5000);
    if (!首页按钮) {
        日志收集器.添加("没找到 [点击首页按钮]");
        clickPoint(99, 1694);
    } else {
        首页按钮.clickCenter();
    }
    sleep(随机区间(3000, 5000));



    var start_time = Date.now();
    var hi = 0;
    for (hi = 0; hi < 5; hi++) {
        日志收集器.添加("[生成新环境] 首页浏览(第" + hi + "次)向下滑一次");
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
        日志收集器.添加("[生成新环境] 已在首页停留" + 首页分钟 + "分钟");
        if (首页分钟 > 1) {
            break;
        }
    }
    日志收集器.添加("[生成新环境] 步骤3 完成");
    return true;
}

function 生成新环境_打开AMG并选择环境() {
    var 选择环境状态 = false;
    var attempt = 0;
    for (attempt = 0; attempt < 1; attempt++) {
        logd("[生成新环境] 步骤1 AMG 尝试 " + (attempt + 1) + "/3");
        var AMG应用图标按钮 = 找图("amg/AMG应用图标.png");
        if (AMG应用图标按钮) {
            clickPoint(AMG应用图标按钮.x, AMG应用图标按钮.y);
            sleep(3000);
            logd("判断当前页面");
            var AMG = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='NavigationBar']/node[@type='Button' and @index=0 and @label='AMG']").getOneNodeInfo(5000);
            if(AMG){
                logd("在环境列表页面");
                AMG.clickCenter();
                sleep(10000);
            }else{
                logd("在首页");
            }
            logd("AMG-点击一键新机");
            var 一键新机 = name("一键新机").getOneNodeInfo(5000);
            if(一键新机){
                一键新机.clickCenter();
            }else{
                clickPoint(184,636);
            }
            sleep(15000);
            return true;
        }
        if (选择环境状态) {
            logd("[生成新环境] 步骤1 AMG 选环境成功");
            break;
        }
        sleep(2000);
    }
    return 选择环境状态;
}

function 生成新环境_打开亚马逊APP() {
    var launched = false;
    var i = 0;
    for (i = 0; i < 3; i++) {
        var r = appLaunchEx("com.amazon.Amazon", "1");
        sleep(5000);
        if (r > 0) {
            logd("[生成新环境] 步骤2 打开 亚马逊APP 成功（第 " + (i + 1) + " 次）");
            launched = true;
            break;
        }
        logd("[生成新环境] 步骤2 appLaunchEx 失败（第 " + (i + 1) + " 次）");
    }
    //直接打开首页
    var 亚马逊APP首页识别图标 = 找图("亚马逊APP首页识别图标.png");
    //弹出了注册页面
    var 打开亚马逊跳转到登录页面图标 = 找图("打开亚马逊跳转到登录页面图标.png");
    if(亚马逊APP首页识别图标){
        logd("[生成新环境] 亚马逊APP已准备就绪");
        return true;
    }

    if(打开亚马逊跳转到登录页面图标){
        var 亚马逊跳转到登录页面取消标志 = 找图("亚马逊跳转到登录页面取消标志.png");
        clickPoint(亚马逊跳转到登录页面取消标志.x, 亚马逊跳转到登录页面取消标志.y);
        sleep(3000);
        logd("[生成新环境] 亚马逊APP已准备就绪");
        return true;
    }
    var 亚马逊APP图标 = 找图("亚马逊APP图标.png");
    sleep(1000);
    if (亚马逊APP图标) {
        clickPoint(亚马逊APP图标.x, 亚马逊APP图标.y);
        sleep(5000);
        logd("[生成新环境] 步骤2 未识别 亚马逊首页 界面，尝试点击桌面图标");
    }

    //直接打开首页
    亚马逊APP首页识别图标 = 找图("亚马逊APP首页识别图标.png");
    //弹出了注册页面
    打开亚马逊跳转到登录页面图标 = 找图("打开亚马逊跳转到登录页面图标.png");
    if(亚马逊APP首页识别图标){
        logd("[生成新环境] 亚马逊APP已准备就绪");
        return true;
    }
    if(打开亚马逊跳转到登录页面图标){
        var 亚马逊跳转到登录页面取消标志 = 找图("亚马逊跳转到登录页面取消标志.png");
        clickPoint(亚马逊跳转到登录页面取消标志.x, 亚马逊跳转到登录页面取消标志.y);
        sleep(3000);
        logd("[生成新环境] 亚马逊APP已准备就绪");
        return true;
    }
    logd("[生成新环境] 亚马逊APP打开异常~!! 请检查");
    return false;
}

function 生成新环境_返回到HOME界面() {
    var FLAG = false;
    var i = 0;
    for (i = 0; i < 3; i++) {
        startEnv();
        sleep(3000);
        var success = home(); //agentEvent.pressKey("home");
        logd("[生成新环境_返回到HOME界面，状态："+success+"] 被点击，等待8秒");
        sleep(8000);
        if (success) {
            FLAG = true;
            logd("[生成新环境_返回到HOME界面] Home 键成功");
            break;
        }
        logd("[生成新环境_返回到HOME界面] Home 键失败 " + (i + 1));
    }
    return FLAG;
}
