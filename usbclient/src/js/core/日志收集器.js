/**
 * 收集单行日志，最终组成 log_lines JSON 数组上报；
 * 结案前须调用 追加上报摘要（生成 AMZ_REPORT 行，见 客户端上报日志约定.md）
 */
var 日志收集器 = {
  _buf: [],

  添加: function (s) {
    var line = String(s)
      .replace(/\r\n/g, " ")
      .replace(/\n/g, "\\n")
      .trim();
    if (line.length === 0) {
      line = "(空行)";
    }
    this._buf.push(line);
    logd("[任务] " + line);
  },

  取全部: function () {
    return this._buf.slice();
  },

  清空: function () {
    this._buf = [];
  },

  /**
   * @param status "success" | "failed"
   * @param opt { error?: string, environment?: string, finished_at?: string }
   */
  追加上报摘要: function (status, opt) {
    opt = opt || {};
    var st = status === "success" || status === true ? "success" : "failed";
    var o = {
      status: st,
      environment: opt.environment != null && String(opt.environment).length > 0 ? String(opt.environment) : 获取运行环境名称(),
      finished_at:
        opt.finished_at != null && String(opt.finished_at).length > 0
          ? String(opt.finished_at)
          : 日志收集器._isoNow(),
    };
    if (st === "failed" && opt.error != null && String(opt.error).length > 0) {
      o.error = String(opt.error).slice(0, 2000);
    }
    var line = "AMZ_REPORT " + JSON.stringify(o);
    this._buf.push(line);
    logd("[AMZ_REPORT] " + line);
  },

  _isoNow: function () {
    try {
      return new Date().toISOString();
    } catch (e) {
      return "";
    }
  },
};
