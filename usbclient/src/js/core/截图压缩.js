/**
 * 上传前压缩：缩小宽度并保存为临时 JPG，减轻 multipart 体积与超时风险（依赖 ios-jslibs image.js）
 * @return 临时文件路径；失败或未启用则返回原路径
 */
function AMZ_截图压缩到临时文件(srcPath) {
  var p = String(srcPath || "").trim();
  if (p.length === 0) {
    return "";
  }
  if (typeof image === "undefined" || image == null || typeof image.readImage !== "function") {
    return p;
  }
  var img = null;
  var out = null;
  try {
    img = image.readImage(p);
    if (img == null) {
      return p;
    }
    var w = image.getWidth(img);
    var h = image.getHeight(img);
    var maxW = 1080;
    if (AMZ_CONFIG.screenshotMaxWidth != null && Number(AMZ_CONFIG.screenshotMaxWidth) > 0) {
      maxW = Number(AMZ_CONFIG.screenshotMaxWidth);
    }
    out = img;
    if (w > maxW && maxW > 0) {
      var nh = Math.max(1, Math.floor((h * maxW) / w));
      var scaled = image.scaleImage(img, maxW, nh);
      if (scaled != null) {
        image.recycle(img);
        img = null;
        out = scaled;
      }
    }
    var fmt = "webp";
    if (AMZ_CONFIG.screenshotFormat != null && String(AMZ_CONFIG.screenshotFormat).trim().length > 0) {
      fmt = String(AMZ_CONFIG.screenshotFormat).trim().toLowerCase();
    }
    if (fmt !== "webp" && fmt !== "jpg" && fmt !== "jpeg" && fmt !== "png") {
      fmt = "webp";
    }
    var ext = fmt === "jpeg" ? "jpg" : fmt;

    var base = p.replace(/\\/g, "/");
    var dir = "";
    var slash = base.lastIndexOf("/");
    if (slash >= 0) {
      dir = base.substring(0, slash + 1);
    }
    var tmp = dir + "amz_proc_" + new Date().getTime() + "." + ext;
    if (!image.saveTo(out, tmp)) {
      // 某些机型/版本可能不支持 webp 保存，自动回退 jpg
      var tmpJpg = dir + "amz_proc_" + new Date().getTime() + ".jpg";
      if (fmt !== "jpg" && image.saveTo(out, tmpJpg)) {
        return tmpJpg;
      }
      return p;
    }
    return tmp;
  } catch (e) {
    logw("截图压缩: " + e);
    return p;
  } finally {
    if (out != null) {
      image.recycle(out);
    } else if (img != null) {
      image.recycle(img);
    }
  }
}
