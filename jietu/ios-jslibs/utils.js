function UtilsWrapper() {

}


var utils = new UtilsWrapper();


/**
 * 文件的MD5
 * @param filePath 文件路径
 * @return {null|string} 文件MD5字符串或者null
 */
UtilsWrapper.prototype.fileMd5 = function (filePath) {
    if (utilsWrapper == null) {
        return null;
    }
    let x = utilsWrapper.fileMd5(filePath);
    return javaString2string(x);
};
/**
 * 数据计算出来的MD5
 * @param data 数据
 * @return {null|string} 数据MD5字符串或者null
 */
UtilsWrapper.prototype.dataMd5 = function (data) {
    if (utilsWrapper == null) {
        return null;
    }
    let x = utilsWrapper.dataMd5(data);
    return javaString2string(x);
};


/**
 * 取得某个范围的随机值
 * @param min 最小值
 * @param max 最大值
 * @return {number} 在min和max中间的值, 包含最大和最小值
 */
UtilsWrapper.prototype.getRangeInt = function (min, max) {
    if (utilsWrapper == null) {
        return null;
    }
    return utilsWrapper.getRangeInt(min, max);
};
/**
 * 设置剪贴板文本
 * @param text 文本
 * @return {boolean}
 */
UtilsWrapper.prototype.setClipboardText = function (text) {
    if (utilsWrapper == null) {
        return null;
    }
    return utilsWrapper.setClipboardText(text);
};


/**
 * 读取剪贴板文本
 * @return {null|string}
 */
UtilsWrapper.prototype.getClipboardText = function () {
    if (utilsWrapper == null) {
        return null;
    }
    return javaString2string(utilsWrapper.getClipboardText());
};


/**
 * 解压文件
 * 将zip文件解压到一个文件夹中
 * 适合EC iOS 6.46.0+
 * @param zipFile 目标zip文件的路径
 * @param passwd 目标ip文件密码
 * @param destDir 要解压到的目标文件夹
 * @param fileNameEncode 文件名的编码，Windows压缩的写GBK，其他平台都是UTF-8
 * @return {boolean} true 代表成功  false代表失败
 */
UtilsWrapper.prototype.unzipWithEncode = function (zipFile, passwd, destDir, fileNameEncode) {
    if (utilsWrapper == null) {
        return null;
    }
    return utilsWrapper.unzip2(zipFile, passwd, destDir, fileNameEncode);
};

/**
 * 将zip文件解压到一个文件夹中
 * @param zipFile 目标zip文件的路径
 * @param passwd 目标ip文件密码
 * @param destDir 要解压到的目标文件夹
 * @return {boolean} true 代表成功  false代表失败
 */
UtilsWrapper.prototype.unzip = function (zipFile, passwd, destDir) {
    if (utilsWrapper == null) {
        return null;
    }
    return utilsWrapper.unzip(zipFile, passwd, destDir);
};
/**
 * 将多个文件压缩成一个zip文件
 * @param zipFile 目标zip文件的路径
 * @param passwd 目标ip文件密码
 * @param files 要压缩的文件或者文件夹，文件数组例如: ["/sdcard/a.txt","/sdcard/bb/"]
 * @return {boolean} true 代表成功  false代表失败
 */
UtilsWrapper.prototype.zip = function (zipFile, passwd, files) {
    if (utilsWrapper == null) {
        return null;
    }
    return utilsWrapper.zip(zipFile, passwd, JSON.stringify(files));
};


/**
 * 从zip文件中读取数据
 * @param zipFile zip文件的路径
 * @param passwd zip文件密码
 * @param filePathInZip 文件在zip中的路径，例如 a/b.txt
 * @return {string} 解析后的字符串
 */
UtilsWrapper.prototype.readFileInZip = function (zipFile, passwd, filePathInZip) {
    if (utilsWrapper == null) {
        return null;
    }
    return utilsWrapper.readFileInZip(zipFile, passwd, filePathInZip);
};

/**
 * 数据存储类
 */
function StoragesWrapper() {

}

var storages = new StoragesWrapper();
/**
 * 创建存储对象
 * @param name 存储对象名称
 * @return {StorageApiWrapper} 存储对象实例
 */
StoragesWrapper.prototype.create = function (name) {
    return new StorageApiWrapper(name);
}

function StorageApiWrapper(name) {
    this.name = name;
    storageWrapper.init(this.name);
}

/**
 * 清空存储
 * @return {boolean} true成功 false 失败
 */
StorageApiWrapper.prototype.clear = function () {
    return storageWrapper.clear(this.name);
}
/**
 * 是否包含某个key
 * @param key 键
 * @return {boolean} true成功 false 失败
 */
StorageApiWrapper.prototype.contains = function (key) {
    return storageWrapper.contains(this.name, key);
}
/**
 * 移出key对应的值
 * @param key 键
 * @return {boolean} true成功 false 失败
 */
StorageApiWrapper.prototype.remove = function (key) {
    return storageWrapper.remove(this.name, key);
}
/**
 * 存储字符串
 * @param key 键
 * @param value 字符串
 * @return {bool} true成功 false 失败
 */
StorageApiWrapper.prototype.putString = function (key, value) {
    return storageWrapper.putString(this.name, key, value);
}
/**
 * 存储整型数据
 * @param key 键
 * @param value 整型数据
 * @return {boolean} true成功 false 失败
 */
StorageApiWrapper.prototype.putInt = function (key, value) {
    return storageWrapper.putInt(this.name, key, value);
}
/**
 * 存储布尔型数据
 * @param key 键
 * @param value 布尔型数据
 * @return {boolean} true成功 false 失败
 */
StorageApiWrapper.prototype.putBoolean = function (key, value) {
    return storageWrapper.putBoolean(this.name, key, value);
}
/**
 * 存储浮点型数据
 * @param key 键
 * @param value 浮点型数据
 * @return {boolean} true成功 false 失败
 */
StorageApiWrapper.prototype.putFloat = function (key, value) {
    return storageWrapper.putFloat(this.name, key, value);
}

/**
 * 获取字符串数据
 * @param key 键
 * @param defaultValue 默认值
 * @return {string} 字符串
 */
StorageApiWrapper.prototype.getString = function (key, defaultValue) {
    return storageWrapper.getString(this.name, key, defaultValue);
}

/**
 * 获取整型数据
 * @param key 键
 * @param defaultValue 默认值
 * @return {string} 整型
 */
StorageApiWrapper.prototype.getInt = function (key, defaultValue) {
    return storageWrapper.getInt(this.name, key, defaultValue);
}
/**
 * 获取布尔型数据
 * @param key 键
 * @param defaultValue 默认值
 * @return {string} 布尔型
 */
StorageApiWrapper.prototype.getBoolean = function (key, defaultValue) {
    return storageWrapper.getBoolean(this.name, key, defaultValue);
}
/**
 * 获取浮点型数据
 * @param key 键
 * @param defaultValue 默认值
 * @return {string} 浮点型
 */
StorageApiWrapper.prototype.getFloat = function (key, defaultValue) {
    return storageWrapper.getFloat(this.name, key, defaultValue);
}


/**
 * 获取所有的key
 * @return {string} JSON字符串
 */
StorageApiWrapper.prototype.keys = function () {
    return storageWrapper.keys(this.name);
}


/**
 * 获取所有的key和值
 * @return {string} JSON字符串
 */
StorageApiWrapper.prototype.all = function () {
    return storageWrapper.all(this.name);
}

/**
 * 播放mp3
 * 适配EC USB 7.16.0+
 * @param path 文件路径 电脑上的mp3文件
 * @param volume 音量大小 0 - 100
 * @param queue 是否是队列模式播放，选择否，代表立刻播放
 * @param stopWhenScriptEnd 脚本结束后 就不播放
 * @return {boolean} true代表播放成功 false代表失败
 */
UtilsWrapper.prototype.playMp3 = function (path, volume, queue, stopWhenScriptEnd) {
    if (utilsWrapper == null) {
        return null;
    }
    return utilsWrapper.playMp3(path, volume, queue, stopWhenScriptEnd);
};


/**
 * 停止播放mp3
 * 适配EC USB 7.16.0+
 * @return {boolean} true代表成功 false代表失败
 */
UtilsWrapper.prototype.stopMp3 = function () {
    if (utilsWrapper == null) {
        return null;
    }
    return utilsWrapper.stopMp3();
};

/**
 * 请求相册权限
 * 第一次请求会有弹窗权限，请允许，或者去手机设置-拉倒最底部，找到 runner 代理 app,进入勾选允许照片权限
 * 注意: 这些都是异步的，防止卡住不能模拟点击，请忽略返回值
 * 支持版本 EC USB 7.18.0+
 * @return {boolean} true 代表成功 false 代表失败
 */
UtilsWrapper.prototype.requestPhotoAuthorization = function () {
    if (utilsWrapper == null) {
        return false;
    }
    return utilsWrapper.requestPhotoAuthorization();
};

/**
 * 清空相册中的图片
 * 调用时候会有弹窗确定，请模拟点击删除按钮
 * 注意: 这些都是异步的，防止卡住不能模拟点击，请忽略返回值
 * 支持版本 EC USB 7.18.0+
 * @return {boolean} true 代表成功 false 代表失败
 */
UtilsWrapper.prototype.deleteAllPhotos = function () {
    if (utilsWrapper == null) {
        return false;
    }
    return utilsWrapper.deleteAllPhotos();
};

/**
 * 清空相册中的视频
 * 调用时候会有弹窗确定，请模拟点击删除按钮
 * 注意: 这些都是异步的，防止卡住不能模拟点击，请忽略返回值
 * 支持版本 EC USB 7.18.0+
 * @return {boolean} true 代表成功 false 代表失败
 */
UtilsWrapper.prototype.deleteAllVideos = function () {
    if (utilsWrapper == null) {
        return false;
    }
    return utilsWrapper.deleteAllVideos();
};


/**
 * 发送文件到agent runner存储目录
 * @param filePath 本地文件路径
 * @param fileName 保存的文件名称
 * @return {string} 发送完成后，远程文件路径
 */
UtilsWrapper.prototype.uploadAgentFile = function (filePath, fileName) {
    if (utilsWrapper == null) {
        return "";
    }
    return utilsWrapper.uploadAgentFile(filePath, fileName);
};
/**
 * 删除代理ipa内部存储的文件
 * @param filePath 文件路径
 * @return {boolean|*} true 代表成功
 */
UtilsWrapper.prototype.deleteAgentFile = function (filePath) {
    if (utilsWrapper == null) {
        return "";
    }
    return ocrAgentWrapper.yolo_deleteFile(filePath);
};


/**
 * 上传图片到远程agent中，并且转换为autoimage对象
 * 这个对象是在手机中，只能使用imageAgent模块，或者ocrAgent、yoloAgent三个模块操作
 * @param filePath 文件路径
 * @return {AutoImage|null}
 */
UtilsWrapper.prototype.uploadToAutoImage = function (filePath) {
    if (utilsWrapper == null) {
        return null;
    }
    let id = utilsWrapper.uploadToAutoImage(filePath);
    if (id == null || id == undefined || id == "") {
        return null;
    }
    return new AutoImage(id);
};



