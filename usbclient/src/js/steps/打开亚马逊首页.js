/**
 * Chrome 中打开 amazon.com：
 * 1) name(accessibilityId).getOneNodeInfo 点击 Google 新标签页假 omnibox（AMZ_CONFIG.chrome）；
 * 2) 可选 tapOmniboxBeforeUrlInput 再点地址栏；
 * 3) 输入 https://www.amazon.com 并回车；
 * 4) 随机等待 10～15 秒（分段 sleep 以利心跳）。
 */
var AMZ_亚马逊首页URL = "https://www.amazon.com";
function 打开亚马逊首页() {
  AMZ_执行标准步骤("打开亚马逊首页", function () {
    var node = name("NTPHomeFakeOmniboxAccessibilityID").getOneNodeInfo(5000); // 需要实际探查类名
    node.clickCenter();
    sleep(随机区间(600, 1200));
    日志收集器.添加("输入网址: " + AMZ_亚马逊首页URL);
    AMZ_输入法尝试输入文本(AMZ_亚马逊首页URL);
    sleep(随机区间(800, 1500));
    let result = ioHIDEvent("0x07", "0x28", 0.2);
    logd("ioHIDEvent 结果: " + result);
    日志收集器.添加("已提交网址，等待页面加载 10～15 秒");
    var loadWait = 随机区间(10000, 15000);
  });
}
