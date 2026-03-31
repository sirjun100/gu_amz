/** 使用全局 appLaunch(bundleId) 打开 AMG（Bundle ID 见 AMZ_CONFIG.bundleIdAmg） */
function 打开AMG() {
  var ok = AMZ_确保AMG已打开();
  if (!ok) {
    throw new Error("打开 AMG 失败：包名启动+涂色校验+图标兜底均未成功");
  }
}
