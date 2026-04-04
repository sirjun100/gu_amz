function ImeApiWrapper() {

}


let imeApi = new ImeApiWrapper();


/**
 * 转发输入法服务
 * 适配EC iOS USB 9.20.0+
 * 这样就不用开启代理服务了，如果转发就要开启代理服务转发
 * @returns {string} null或者空代表成功，其他代表错误消息
 */
ImeApiWrapper.prototype.forwardImeServer = function () {
    if (imeApiWrapper == null) {
        return "无实例";
    }
    let result = imeApiWrapper.forwardImeServer();
    if (result == null || result == undefined || result == "") {
        return null;
    }
    return result + "";
};
/**
 * 关闭输入法转发服务
 * 适配EC iOS USB 9.20.0+
 * @returns {string} null或者空代表成功，其他代表错误消息
 */
ImeApiWrapper.prototype.closeForwardImeServer = function () {
    if (imeApiWrapper == null) {
        return "无实例";
    }
    let result = imeApiWrapper.closeForwardImeServer();
    if (result == null || result == undefined || result == "") {
        return null;
    }
    return result + "";
};


/**
 * 输入法状态是否可用
 * 适配EC iOS USB版 6.37.0+
 * @return {boolean} true 代表可用  false 代表不可用
 */
ImeApiWrapper.prototype.isOk = function () {
    if (imeApiWrapper == null) {
        return false;
    }
    return imeApiWrapper.isOk();
};

/**
 * 输入字符串
 * 适配EC iOS USB版 6.37.0+
 * @param content 字符串
 * @returns {null|string} 如果为空，代表输入不成功，如果不为空，代表输入的数据
 */
ImeApiWrapper.prototype.input = function (content) {
    if (imeApiWrapper == null) {
        return "";
    }
    if (content == null || content == undefined || content == "") {
        return "";
    }
    let result = imeApiWrapper.input(content);
    if (result == null || result == undefined || result == "") {
        return "";
    }
    try {
        return JSON.parse(result)["data"]
    } catch (e) {
    }
    return "";
};


/**
 * 粘贴字符串，复制到剪切板后再插入到输入框
 * 适配EC iOS USB版 6.37.0+
 * @param content 字符串,如果为空，直接使用剪切板数据
 * @returns {null|string} 如果为空，代表不成功，如果不为空，代表输入的数据
 */
ImeApiWrapper.prototype.paste = function (content) {
    if (imeApiWrapper == null) {
        return "";
    }
    let result = imeApiWrapper.paste(content);
    if (result == null || result == undefined || result == "") {
        return "";
    }
    try {
        return JSON.parse(result)["data"]
    } catch (e) {

    }
    return "";
};


/**
 * 删除输入框的字符串
 * 适配EC iOS USB版 6.37.0+
 * @returns {null|string} 如果为空，代表输入框无数据，如果不为空，代表输入框剩余数据
 */
ImeApiWrapper.prototype.pressDel = function () {
    if (imeApiWrapper == null) {
        return "";
    }
    let result = imeApiWrapper.pressDel();
    if (result == null || result == undefined || result == "") {
        return "";
    }
    try {
        return JSON.parse(result)["data"]
    } catch (e) {
    }
    return "";
};

/**
 * 回车键
 * 适配EC iOS USB版 6.37.0+
 * @returns {boolean} true 代表成功 false 代表失败
 */
ImeApiWrapper.prototype.pressEnter = function () {
    if (imeApiWrapper == null) {
        return false;
    }
    let result = imeApiWrapper.pressReturn();
    if (result == null || result == undefined || result == "") {
        return false;
    }
    try {
        return JSON.parse(result)["code"] == 0
    } catch (e) {
    }
    return false;
};

/**
 * 隐藏键盘
 * 适配EC iOS USB版 6.37.0+
 * @returns {boolean} true 代表成功 false 代表失败
 */
ImeApiWrapper.prototype.dismiss = function () {
    if (imeApiWrapper == null) {
        return false;
    }
    let result = imeApiWrapper.dismiss();
    if (result == null || result == undefined || result == "") {
        return false;
    }
    try {
        return JSON.parse(result)["code"] == 0
    } catch (e) {
    }
    return false;
};

/**
 * 复制输入框的数据到剪切板
 * 适配EC iOS USB版 6.37.0+
 * @returns {null|string} 如果为空，代表输入框无数据，如果不为空，代表输入框剩余数据，并且已经复制到剪切板了
 */
ImeApiWrapper.prototype.copyToClipboard = function () {
    if (imeApiWrapper == null) {
        return "";
    }
    let result = imeApiWrapper.copyToClipboard();
    if (result == null || result == undefined || result == "") {
        return "";
    }
    try {
        return JSON.parse(result)["data"]
    } catch (e) {
    }
    return "";
};


/**
 * 切换到其他键盘
 * 这个是返回结果后，等待2秒切换
 * 适配EC iOS USB版 6.37.0+
 * @returns {boolean} true 代表成功 false 代表失败
 */
ImeApiWrapper.prototype.changeKeyboard = function () {
    if (imeApiWrapper == null) {
        return false;
    }
    let result = imeApiWrapper.changeKeyboard();
    if (result == null || result == undefined || result == "") {
        return false;
    }
    try {
        return JSON.parse(result)["code"] == 0
    } catch (e) {
    }
    return false;
};
/**
 * 清空输入框的内容
 * 适配EC iOS USB版 6.37.0+
 * @returns {boolean} true 代表成功 false 代表失败
 */
ImeApiWrapper.prototype.removeAllContent = function () {
    if (imeApiWrapper == null) {
        return false;
    }
    let result = imeApiWrapper.removeAllContent();
    if (result == null || result == undefined || result == "") {
        return false;
    }
    try {
        let data = JSON.parse(result)["data"]
        if (data == null || data == undefined || data == "") {
            return true;
        }
    } catch (e) {
    }
    return false;
};

/**
 * 读取剪切板的数据
 * 适配EC iOS USB版 6.37.0+
 * @returns {null|string} 剪切板的数据
 */
ImeApiWrapper.prototype.getClipboard = function () {
    if (imeApiWrapper == null) {
        return null;
    }
    let result = imeApiWrapper.getClipboard();
    if (result == null || result == undefined || result == "") {
        return null;
    }
    try {
        return JSON.parse(result)["data"]
    } catch (e) {
    }
    return null;
};
/**
 * 设置剪切板数据
 * 适配EC iOS USB版 6.37.0+
 * @param content 字符串
 * @param type 1 代表是普通的字符串，2 代表是URL数据
 * @returns {boolean} true 代表设置成功  false 代表失败
 */
ImeApiWrapper.prototype.setClipboard = function (content, type) {
    if (imeApiWrapper == null) {
        return false;
    }
    type = type + ""
    let result = imeApiWrapper.setClipboard(content, type);
    if (result == null || result == undefined || result == "") {
        return false;
    }

    try {
        return JSON.parse(result)["code"] == 0
    } catch (e) {
    }
    return false;
};

/**
 * 打开URL链接
 * 适配EC iOS USB版 6.37.0+
 * @param url url地址,例如  http://baidu.com 之类的数据
 * @returns {boolean} true 代表设置成功  false 代表失败
 */
ImeApiWrapper.prototype.openUrl = function (url) {
    if (imeApiWrapper == null) {
        return false;
    }
    let result = imeApiWrapper.openUrl(url);
    if (result == null || result == undefined || result == "") {
        return false;
    }
    try {
        return JSON.parse(result)["code"] == 0
    } catch (e) {
    }
    return false;
};


/**
 * 获取输入框数据
 * 适配EC iOS USB版 6.37.0+
 * @returns {null|string} 空代表无数据或者未获取到，有数据代表获取到了
 */
ImeApiWrapper.prototype.getText = function () {
    if (imeApiWrapper == null) {
        return "";
    }
    let result = imeApiWrapper.getText();
    if (result == null || result == undefined || result == "") {
        return "";
    }
    try {
        return JSON.parse(result)["data"]
    } catch (e) {
    }
    return "";
};
