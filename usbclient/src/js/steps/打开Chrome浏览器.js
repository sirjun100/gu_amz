/** 使用全局 appLaunch 打开 Chrome（默认 com.google.chrome.ios，可配置覆盖） */
function 打开Chrome浏览器() {
  AMZ_执行标准步骤("打开Chrome浏览器",function (attemptIndex) {
    日志收集器.添加(String("步骤: 打开Chrome浏览器(attempt=" + (attemptIndex + 1) + ", TODO: openUrl/地址栏输入)"));
    //AMZ_按包名启动应用(AMZ_CONFIG.bundleIdChrome,"步骤: 打开Chrome浏览器(attempt=" + (attemptIndex + 1) + ", TODO: openUrl/地址栏输入)");
    var r = appLaunchEx(AMZ_CONFIG.bundleIdChrome,"1");
    logd("appLaunch(\"" + AMZ_CONFIG.bundleIdChrome + "\") => " + r);
    sleep(2000);
  })
}
