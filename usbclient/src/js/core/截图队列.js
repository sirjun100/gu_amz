/**
 * failed_only 策略：过程截图在本地压缩入队，任务失败结案后再批量上传。
 */
var AMZ_截图队列 = {
  _items: [],

  /** 新任务开始时丢弃上一任务未上传的暂存（含临时文件） */
  开始任务: function () {
    this.丢弃();
  },

  丢弃: function () {
    for (var i = 0; i < this._items.length; i++) {
      var it = this._items[i];
      if (it.isTmp && typeof file !== "undefined" && file != null && typeof file.deleteAllFile === "function") {
        try {
          file.deleteAllFile(it.path);
        } catch (e) {}
      }
    }
    this._items = [];
  },

  /**
   * @param compressedPath 已压缩后的本地路径（通常 webp）
   * @param description 管理端展示的图片说明
   * @param isTmp 是否在丢弃/上传后删除文件
   */
  入队: function (compressedPath, description, isTmp) {
    var p = compressedPath != null ? String(compressedPath).trim() : "";
    if (p.length === 0) {
      return;
    }
    this._items.push({
      path: p,
      desc: description != null ? String(description).slice(0, 512) : "",
      isTmp: !!isTmp,
    });
  },

  /** 取出当前队列副本并清空列表（不删盘；由调用方上传后删临时文件） */
  取出全部: function () {
    var a = this._items.slice();
    this._items = [];
    return a;
  },
};
