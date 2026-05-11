function 生成新环境_开始执行(){
    while (true){
        try{
            生成新环境_返回到HOME界面()
            logd("[注册亚马逊] 步骤1 打开AMG并选择环境");
            if (!生成新环境_打开AMG并选择环境(task)) {
                throw new Error("步骤1 失败：打开 AMG 并选择环境");
            }
            logd("[注册亚马逊] 步骤2 完成；返回桌面");
            if (!生成新环境_返回到HOME界面()) {
                throw new Error("步骤2 后失败：无法返回主屏幕");
            }
            logd("[注册亚马逊] 步骤3 打开 亚马逊APP");``
            if (!生成新环境_打开亚马逊APP()) {
                throw new Error("步骤3 失败：打开 亚马逊APP");
            }
            sleep(随机区间(60000,75000));
        } catch (err) {
            var msg = err != null ? String(err) : "unknown error";
            loge("任务失败: " + msg);
        }
    }
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
            logd("[注册亚马逊] 步骤2 打开 亚马逊APP 成功（第 " + (i + 1) + " 次）");
            launched = true;
            break;
        }
        logd("[注册亚马逊] 步骤2 appLaunchEx 失败（第 " + (i + 1) + " 次）");
    }
    //直接打开首页
    var 亚马逊APP首页识别图标 = 找图("亚马逊APP首页识别图标.png");
    //弹出了注册页面
    var 打开亚马逊跳转到登录页面图标 = 找图("打开亚马逊跳转到登录页面图标.png");
    if(亚马逊APP首页识别图标){
        logd("[注册亚马逊] 亚马逊APP已准备就绪");
        return true;
    }

    if(打开亚马逊跳转到登录页面图标){
        var 亚马逊跳转到登录页面取消标志 = 找图("亚马逊跳转到登录页面取消标志.png");
        clickPoint(亚马逊跳转到登录页面取消标志.x, 亚马逊跳转到登录页面取消标志.y);
        sleep(3000);
        logd("[注册亚马逊] 亚马逊APP已准备就绪");
        return true;
    }
    var 亚马逊APP图标 = 找图("亚马逊APP图标.png");
    sleep(1000);
    if (亚马逊APP图标) {
        clickPoint(亚马逊APP图标.x, 亚马逊APP图标.y);
        sleep(5000);
        logd("[注册亚马逊] 步骤2 未识别 亚马逊首页 界面，尝试点击桌面图标");
    }

    //直接打开首页
    亚马逊APP首页识别图标 = 找图("亚马逊APP首页识别图标.png");
    //弹出了注册页面
    打开亚马逊跳转到登录页面图标 = 找图("打开亚马逊跳转到登录页面图标.png");
    if(亚马逊APP首页识别图标){
        logd("[注册亚马逊] 亚马逊APP已准备就绪");
        return true;
    }
    if(打开亚马逊跳转到登录页面图标){
        var 亚马逊跳转到登录页面取消标志 = 找图("亚马逊跳转到登录页面取消标志.png");
        clickPoint(亚马逊跳转到登录页面取消标志.x, 亚马逊跳转到登录页面取消标志.y);
        sleep(3000);
        logd("[注册亚马逊] 亚马逊APP已准备就绪");
        return true;
    }
    logd("[注册亚马逊] 亚马逊APP打开异常~!! 请检查");
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