// ==================== 配置区域 ====================
const CONFIG = {
    // 截图格式和质量
    type: "1",           // "1": JPG方式1, "2": JPG方式2, "3": PNG格式
    quality: 100,        // 图片质量：type=1时支持1/50/100；type=2时支持1-100；PNG格式无效

    // 流式截图配置（提高连续截图效率）
    useStream: true,     // 是否使用流式截图（推荐）
    streamDelay: 20,     // 流式截图间隔（毫秒）

    // 保存配置
    saveToSandbox: true, // 保存到沙盒目录（默认）
    saveToRes: false,    // 是否直接保存到res目录（需要文件操作权限）
    fileName: "screenshot_" + new Date().getTime(), // 文件名前缀
    fileFormat: "png",   // 保存文件格式："jpg" 或 "png"

    // 截图区域（全屏或指定区域）
    region: {
        x: 0,           // 起始X坐标（0为全屏）
        y: 0,           // 起始Y坐标
        ex: 0,          // 终点X坐标（0为全屏）
        ey: 0           // 终点Y坐标
    }
};

function main() {
    //开始再这里编写代码了！！
    logd("检查自动化环境...")
    //如果自动化服务正常
    if (!autoServiceStart(3)) {
        logd("自动化服务启动失败，无法执行脚本")
        exit();
        return;
    }


    logd("=== iOS USB截图工具启动 ===");

    // 1. 启动环境
    logd("启动环境...");
    startEnv();
    sleep(2000);

    // 使用通用截图函数
    let screenshot = image.captureFullScreen();
    if (screenshot) {
        let path = file.getSandBoxFilePath("screenshot.png");
        image.saveTo(screenshot, path);
        image.recycle(screenshot);
        logd("截图成功: " + path);
    }


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