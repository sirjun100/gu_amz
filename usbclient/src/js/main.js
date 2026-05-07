/**
 * usbclient/src/js 在设备上的目录，须以 / 结尾或留空。
 * 留空：请在 IDE 中将 src/js 下各模块与 main 合并/打包，或自行先 execScript 加载 任务主循环.js。
 */
var AMZ_SCRIPT_BASE = "";

function AMZ_启动亚马逊任务循环() {
    var base = AMZ_SCRIPT_BASE == null ? "" : String(AMZ_SCRIPT_BASE);
    if (base.length > 0) {
        var last = base.charAt(base.length - 1);
        if (last !== "/" && last !== "\\") {
            base = base + "/";
        }
        var loopPath = base + "任务主循环.js";
        if (typeof file !== "undefined" && file.exists && !file.exists(loopPath)) {
            loge("文件不存在: " + loopPath);
            return;
        }
        if (!execScript(1, loopPath)) {
            loge("execScript 失败: " + loopPath);
            return;
        }
    }
    if (typeof 亚马逊任务入口 !== "function") {
        loge("未定义 亚马逊任务入口：请设置 AMZ_SCRIPT_BASE 指向 src/js 目录，或将 任务主循环.js 与依赖一并合并进 main");
        return;
    }
    亚马逊任务入口();
}

function main() {
    //开始再这里编写代码了！！
    logd("检查自动化环境...")
    //如果自动化服务正常
    if (!autoServiceStart(3)) {
        logd("自动化服务启动失败，无法执行脚本")
        exit();
        return;
    }

    // 打开辅助触控（悬浮球）
    var result = setAssistiveTouch(true);
    logd("开启结果: " + result);
    sleep(2000);

    logd("开始执行脚本...");
    关键词广告点击APP版本_搜索随机关键词浏览并加购();
    // AMZ_启动亚马逊任务循环();
}

function 关键词广告点击APP版本_搜索并点击目标任务广告2(){
    logd(Date.now())
    // var 节点 = name("Amazon.com: Black Curtains").getOneNodeInfo(5000);
    // var 节点 = xpath("//node[@type=‘Other'][contains(@name, 'Amazon.com')]").getOneNodeInfo(5000);
    // var 节点 = xpath("//node[@type='Application']/node[@type='Window']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='WebView']/node[@type='WebView']/node[@type='WebView']/node[@type='Other']/node[@type='Other']/node[@type='Other']/node[@type='Other' and @index=0]").getOneNodeInfo(5000);
    if (!节点) {
        logw("未找到 Amazon.com : black curtains 节点");
        return;
    }
    // 2. 锁定节点
    lockNode();

    // 3. 获取所有直接子节点（不包含孙子节点）
    let childCount = 节点.childCount; // 获取子节点数量
    logd("父节点的直接子节点数量: " + childCount);

    // 4. 遍历所有直接子节点，筛选符合条件的
    let resultNodes = [];
    for (let i = 0; i < childCount; i++) {
        let child = 节点.child(i); // 使用 child(index) 获取直接子节点
        if (child) {
            var bounds = child.bounds;
            //bounds.top>0 && bounds.bottom<2000 &&
            if (bounds.right <= 900 && bounds.right>=700){
                resultNodes.push(child);
                logd(`${child.type}: L=${bounds.left}, T=${bounds.top}, R=${bounds.right}, B=${bounds.bottom}`);
            }
        }
    }

    logd(Date.now())
// 5. 释放节点
    releaseNode();
    // logd("共找到 " + resultNodes.length + " 个符合条件的直接子节点");
    // for(let i =0;i<resultNodes.length;i++){
    //   var node = resultNodes[i];
    //   var 名称节点 = node.getOneNodeInfo(xpath(".//node[@type='StaticText'][contains(@name, 'Joydeco')]"),5000);
    //   if(名称节点){
    //     日志收集器.添加("商标已找到=【"+名称节点.name+"】节点。");
    //     if(名称节点.name.contains("Sponsored")){
    //       日志收集器.添加('找到了广告');
    //     }else{
    //       日志收集器.添加('没找到广告');
    //     }
    //   }else{
    //     日志收集器.添加('没找到名称节点');
    //   }
}



function autoServiceStart(time) {
    for (let i = 0; i < time; i++) {
        if (isServiceOk()) {
            return true;
        }
        let started = startEnv();
        logd("第" + (i + 1) + "次启动服务结果: " + started + " " + getStartEnvMsg());
        if (isServiceOk()) {
            return true;
        }
    }
    return isServiceOk();
}


main();