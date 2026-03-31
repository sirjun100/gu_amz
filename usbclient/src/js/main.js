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
    logd("开始执行脚本...")

    if (!netcardProcessor()) {
        return;
    }

    AMZ_启动亚马逊任务循环();
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

function netcardProcessor() {
    logd("开始进行卡密验证")
    // 官方自带的卡密系统
    // appId 和 appSecret的值 请到 http://uc.ieasyclick.com/ 进行注册后提卡
    let appId = "";
    let appSecret = "";
    let uiparam = readAllUIConfig();
    let cardNo = "";
    try {
        cardNo = uiparam["cardNo"]
    } catch (e) {
    }

    if (cardNo == null || cardNo == undefined || cardNo.length <= 0) {
        loge("请输入卡密")
        exit()
        return false;
    }
    let inited = ecNetCard.netCardInit(appId, appSecret, "2")
    logd("inited card => " + JSON.stringify(inited));
    let bind = ecNetCard.netCardBind(cardNo)
    let bindResult = false;
    if (bind != null && bind != undefined && bind["code"] == 0) {
        logd("卡密绑定成功")
        let leftDays = bind['data']['leftDays'] + "天";
        logd("剩余时间：" + leftDays);
        logd("激活时间：" + bind['data']['startTime'])
        logd("过期时间：" + bind['data']['expireTime'])
        bindResult = true;
        logd("卡密剩余时间:" + leftDays)
    } else {
        if (bind == null || bind == undefined) {
            loge("卡密绑定失败,无返回值 ")
            let msg = "卡密绑定失败,无返回值"
            loge(msg)
        } else {
            let msg = "卡密绑定失败: " + bind["msg"]
            loge(msg)
        }
    }
    return bindResult;
}

main();