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

    logd("开始执行脚本...")


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


main();