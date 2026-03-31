function EcNetCardWrapper() {
    this.version = "1.0.0"
}

let ecNetCard = new EcNetCardWrapper();

/**
 * [网络验证]初始化卡密
 * 提卡网址 [http://uc.ieasyclick.com]
 * 适配版本 EC iOS 中控 6.12.0+
 * @param appId 应用的appId，用户中心后台获取
 * @param appSecret 应用的密钥，用户中心后台获取
 * @param deviceIdType 卡密授权id类型，1代表是使用设备id，2代表是ecid，6.29.0新增的参数
 * @return {null|JSON} 返回JSON对象,{"code":0,"msg":"",}
 */
EcNetCardWrapper.prototype.netCardInit = function (appId, appSecret, deviceIdType) {
    this.setErrorCallback(function (code, msg) {
        loge("网络验证错误:" + code + " " + msg)
        exit()
    })
    let x = utilsWrapper.netCardInit(appId, appSecret, "" + deviceIdType)
    if (x == null || x == undefined || x == "") {
        return null;
    }
    return JSON.parse(x);
};

/**
 * 设置错误提示回调
 * @param back 回调函数
 */
EcNetCardWrapper.prototype.setErrorCallback = function (back) {
    utilsWrapper.setErrorCallback(back)
};

/**
 * [网络验证]绑定卡密
 * 提卡网址 [http://uc.ieasyclick.com]
 * 适配版本 EC iOS 中控 6.12.0+
 * @param cardNo 卡号，用户中心后台获取
 * @return {null|JSON} 返回JSON对象,{"code":0,"msg":"",}
 */
EcNetCardWrapper.prototype.netCardBind = function (cardNo) {
    let x = utilsWrapper.netCardBind(cardNo)
    if (x == null || x == undefined || x == "") {
        return null;
    }
    return JSON.parse(x);
}


/**
 * [网络验证]解绑卡密
 * 提卡网址 [http://uc.ieasyclick.com]
 * 适配版本 EC iOS 中控 6.12.0+
 * @param cardNo 卡号，用户中心后台获取
 * @param password 解绑密码 ，如果设置过解绑密码 需要填写
 * @return {null|JSON} 返回JSON对象,{"code":0,"msg":"",}
 */
EcNetCardWrapper.prototype.netCardUnbind = function (cardNo, password) {
    let x = utilsWrapper.netCardUnbind(cardNo, password)
    if (x == null || x == undefined || x == "") {
        return null;
    }
    return JSON.parse(x);
}


/**
 * [网络验证-远程变量]获取远程变量
 * 提卡网址 [http://uc.ieasyclick.com]
 * 适配版本 EC iOS 中控 6.12.0+
 * @param key 远程变量名称
 * @return {null|JSON} 返回JSON对象,{"code":0,"msg":""}
 */
EcNetCardWrapper.prototype.netCardGetCloudVar = function (key) {
    let x = utilsWrapper.netCardGetCloudVar(key)
    if (x == null || x == undefined || x == "") {
        return null;
    }
    return JSON.parse(x);
}

/**
 * [网络验证-远程变量]更新远程变量
 * 提卡网址 [http://uc.ieasyclick.com]
 * 适配版本 EC iOS 中控 6.12.0+
 * @param key 远程变量名称
 * @param value 远程变量内容
 * @return {null|JSON} 返回JSON对象,{"code":0,"msg":""}
 */
EcNetCardWrapper.prototype.netCardUpdateCloudVar = function (key, value) {
    let x = utilsWrapper.netCardUpdateCloudVar(key, value)
    if (x == null || x == undefined || x == "") {
        return null;
    }
    return JSON.parse(x);
}