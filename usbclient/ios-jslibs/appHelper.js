function AppHelperWrapper() {

}

let appHelper = new AppHelperWrapper();
/**
 * 设置助手请求超时时间
 * 适配EC iOS USB版本 9.19.0+
 * @param t 单位是毫秒 默认是300秒
 */
AppHelperWrapper.prototype.setHelperTimeout = function (t) {
    if (appHelperWrapper == null) {
        return;
    }
    appHelperWrapper.setTimeout(t)
};
/**
 * 开启端口转发
 * @param openApp 是否打开辅助助手app
 * @param remotePort 远程服务端口
 * @return {number} 转发到本电脑的端口号，小于等于0代表失败
 */
AppHelperWrapper.prototype.startForwardPort = function (openApp, remotePort) {
    if (appHelperWrapper == null) {
        return;
    }
    return appHelperWrapper.startForwardPort(openApp, remotePort);
};

/**
 * 关闭端口转发
 * @param localPort 本地被转发的端口
 * @return {boolean} true 代表成功 false代表失败
 */
AppHelperWrapper.prototype.closeForwardPort = function (localPort) {
    if (appHelperWrapper == null) {
        return;
    }
    return appHelperWrapper.closeForwardPort(localPort);
};

/**
 * 关闭所有端口转发
 * @return {boolean} true 代表成功 false代表失败
 */
AppHelperWrapper.prototype.closeAllForwardPort = function () {
    if (appHelperWrapper == null) {
        return;
    }
    return appHelperWrapper.closeAllForwardPort();
};
/**
 * 获取远程桥接的地址
 * @return {null|string} URL地址，不包含端口
 */
AppHelperWrapper.prototype.getBridgeIp = function () {
    if (appHelperWrapper == null) {
        return;
    }
    return appHelperWrapper.getBridgeIp();
};

/**
 * 打开URL
 * 支持 EC iOS 6.0.0+
 * @param openApp 是否打开辅助助手app
 * @param url 网址
 * @return {boolean} true 代表成功 false代表失败
 */
AppHelperWrapper.prototype.openUrl = function (openApp, url) {
    if (appHelperWrapper == null) {
        return;
    }
    return appHelperWrapper.openUrl(openApp, url);
};

/**
 * 设置剪贴板的值
 * 支持 EC iOS 6.0.0+
 * @param openApp 是否打开辅助助手app
 * @param content 内容
 * @return {boolean} true 成功，false 失败
 */
AppHelperWrapper.prototype.setPasteboard = function (openApp, content) {
    if (appHelperWrapper == null) {
        return false;
    }
    return appHelperWrapper.setPasteboard(openApp, content);
};

/**
 * 读取剪贴板的值
 * 支持 EC iOS 6.0.0+
 * @param openApp 是否打开辅助助手app
 * @return {null|string} 返回的数据
 */
AppHelperWrapper.prototype.getPasteboard = function (openApp) {
    if (appHelperWrapper == null) {
        return;
    }
    return appHelperWrapper.getPasteboard(openApp);
};
/**
 * 上传图片或者视频到相册中
 * 支持 EC iOS 6.0.0+
 * @param openApp 是否打开辅助助手app
 * @param path 电脑上的文件路径，可以是图片或者视频
 * @return {boolean} true 成功，false 失败
 */
AppHelperWrapper.prototype.uploadToAlbum = function (openApp, path) {
    if (appHelperWrapper == null) {
        return;
    }
    return appHelperWrapper.uploadToAlbum(openApp, path);
};
/**
 * 设置辅助应用app参数
 * @param bundleIdPrefix 辅助应用的bundleId前缀，多个用英文逗号,隔开
 * @param appHelperPort 辅助应用开放的端口，默认是18924，不知道可以写0
 * @return {*}
 */
AppHelperWrapper.prototype.setParam = function (bundleIdPrefix, appHelperPort) {
    if (appHelperWrapper == null) {
        return;
    }
    return appHelperWrapper.setParam(bundleIdPrefix, appHelperPort);
};

/**
 * 按照包名前缀查找并且运行程序
 * @param bundleIdPrefix app的 bundleID 前缀，多个用英文,逗号隔开
 * @return {boolean}| true代表成功
 */
AppHelperWrapper.prototype.appLaunchByPrefix = function (bundleIdPrefix) {
    if (appHelperWrapper == null) {
        return;
    }
    return appHelperWrapper.appLaunchByPrefix(bundleIdPrefix);
};

