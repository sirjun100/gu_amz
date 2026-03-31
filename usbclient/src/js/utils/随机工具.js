/**
 * 区间随机整数 [min, max]（含边界）
 */
function 随机区间(min, max) {
  var a = Math.ceil(Number(min));
  var b = Math.floor(Number(max));
  if (b < a) {
    var t = a;
    a = b;
    b = t;
  }
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

/**
 * 按配置将「分钟」转为等待（演示模式用秒级短等）
 */
function 随机等待分钟(min分钟, max分钟) {
  if (AMZ_CONFIG.demoMode) {
    var sec = 随机区间(3, 12);
    logd("(演示模式) 本应等待 " + min分钟 + "-" + max分钟 + " 分钟，现为 " + sec + " 秒");
    AMZ_分段睡眠并维持心跳(sec * 1000);
    return;
  }
  var m = 随机区间(min分钟, max分钟);
  logd("等待 " + m + " 分钟");
  AMZ_分段睡眠并维持心跳(m * 60 * 1000);
}
