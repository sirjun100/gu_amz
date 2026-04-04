/**
 * 打开 AMG：在当前屏幕（通常为 SpringBoard）用 res/AMG.png 找图并点击中心。
 * 模板路径：AMZ_SCRIPT_BASE/res/<launchIconFileName>，缺省 AMG.png（见 AMZ_CONFIG.amg）。
 * 依赖：EasyClick image.readImage、image.findImageEx、global Rect；AMZ_RES下文件路径、AMZ_取全屏区域、AMZ_同步BLE与截屏坐标系、AMZ_尝试点击坐标
 */

function 打开AMG() {
  AMZ_执行标准步骤("打开AMG", function (attemptIndex) {
    日志收集器.添加("步骤: AMG 找图打开 attempt=" + (attemptIndex + 1));

    // 1. 申请权限
    let req = startEnv();
    if (!req) {
      logd("申请权限失败");
      return;
    }
    sleep(1000);

    // 2. 读取模板
    let templateImg = readResAutoImage("AMG.png");
    if (templateImg == null) {
      logd("读取模板图片失败");
      return;
    }

    // 3. 截屏
    let screenImg = image.captureFullScreen();
    if (screenImg == null) {
      logd("截屏失败");
      image.recycle(templateImg);
      return;
    }

    // 4. 透明找图
    // 参数说明: (大图, 小图, x1, y1, x2, y2, threshold, limit)
    let points = image.findImageByColor(screenImg, templateImg, 0, 0, 0, 0, 0.8, 1);
    logd("找图结果: " + JSON.stringify(points));

    // 5. 处理结果并点击
    if (points && points.length > 0) {
      for (let i = 0; i < points.length; i++) {
        let point = points[i];
        logd("找到坐标: (" + point.x + ", " + point.y + ")");
        clickPoint(point.x, point.y);
      }
    } else {
      logd("未找到图片");
    }

  });
}
