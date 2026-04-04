function HttpWrapper() {

}

var http = new HttpWrapper();
/**
 * 下载远程文件到本地,支持断点续传
 * <Br/>
 * 运行环境: 无限制
 *
 * @param remoteUrl 远程文件URL
 * @param file      要保存到本地的文件对象
 * @param timeout   下载超时，单位是毫秒
 * @param headers    头标志例如{"a":"11"}
 * @return {boolean} true 代表成功 false代表失败
 */
HttpWrapper.prototype.downloadFile = function (remoteUrl, file, timeout, headers) {
    if (httpWrapper == null) {
        return null;
    }
    return httpWrapper.downloadFile(remoteUrl, file, timeout, object2JsonString(headers));
};
/**
 * 下载远程文件到本地，支持断点续传，默认超时时间为30秒
 * <Br/>
 * 运行环境: 无限制
 *
 * @param remoteUrl 远程文件URL
 * @param file      要保存到本地的路径
 * @param headers    头标志例如{"a":"11"}
 * @return {boolean} true 代表成功 false代表失败
 */
HttpWrapper.prototype.downloadFileDefault = function (remoteUrl, file, headers) {
    if (httpWrapper == null) {
        return null;
    }
    return httpWrapper.downloadFileDefault(remoteUrl, file, object2JsonString(headers));
};
/**
 * Http GET 请求
 * <Br/>
 * 运行环境: 无限制
 * <Br/>
 * 兼容版本: Android 4.4 以上
 *
 * @param url     请求的URL
 * @param timeout 超时时间 单位毫秒
 * @param headers    头标志例如{"a":"11"}
 * @return {null|string} 请求后返回的字符串
 */
HttpWrapper.prototype.httpGetDefault = function (url, timeout, headers) {
    if (httpWrapper == null) {
        return null;
    }
    var x = httpWrapper.httpGetDefault(url, timeout, object2JsonString(headers));
    return javaString2string(x);
};
/**
 * Http GET 请求
 * <Br/>
 * 运行环境: 无限制
 *
 * @param url     请求的URL
 * @param params  参数Map表 例如 {"a":"1"} 这样的参数或者字符串
 * @param timeout 超时时间 单位毫秒
 * @param headers    头标志例如{"a":"11"}
 * @return {null|string} 请求后返回的字符串
 */
HttpWrapper.prototype.httpGet = function (url, params, timeout, headers) {
    if (httpWrapper == null) {
        return null;
    }
    let x = httpWrapper.httpGet(url, object2JsonString(params), timeout, object2JsonString(headers));
    return javaString2string(x);

};

/**
 * Http POST 请求
 * 运行环境: 无限制
 * @param url     请求的URL
 * @param params  参数，例如 {"a":"1"} 这样的参数或者字符串
 * @param files 要上传的文件，例如 {"file1":"/sdcard/a.txt"}
 * @param timeout 超时时间 单位毫秒
 * @param headers    头标志例如{"a":"11"}
 * @return {null|string} 请求后返回的字符串
 */
HttpWrapper.prototype.httpPost = function (url, params, files, timeout, headers) {
    if (httpWrapper == null) {
        return null;
    }
    var x = httpWrapper.httpPost(url, object2JsonString(params), object2JsonString(files), timeout, object2JsonString(headers));
    return javaString2string(x);
};

/**
 * Http POST 请求,底层是okhttp实现
 * 运行环境: 无限制
 * @param url     请求的URL
 * @param params  参数，例如 {"a":"1"} 这样的参数或者字符串
 * @param files 要上传的文件，例如 {"file1":"/sdcard/a.txt"}
 * @param timeout 超时时间 单位毫秒
 * @param headers    头标志例如{"a":"11"}
 * @return {null|string} 请求后返回的字符串
 */
HttpWrapper.prototype.httpPostEx = function (url, params, files, timeout, headers) {
    if (httpWrapper == null) {
        return null;
    }
    var x = httpWrapper.httpPostEx(url, object2JsonString(params), object2JsonString(files), timeout, object2JsonString(headers));
    return javaString2string(x);
};


/**
 * HTTP POST JSON数据
 * @param url  请求的URL
 * @param json json数据
 * @param timeout 超时时间 单位毫秒
 * @param headers    头标志例如{"a":"11"}
 * @return {null|string} 请求后返回的字符串
 */
HttpWrapper.prototype.postJSON = function (url, json, timeout, headers) {
    if (httpWrapper == null) {
        return null;
    }
    let x = httpWrapper.postJSON(url, object2JsonString(json), timeout, object2JsonString(headers));
    return javaString2string(x);
};


/**
 * HTTP 请求
 * <Br/>
 * 运行环境: 无限制
 *
 * @param param  map参数，包含的参数有<Br/>
 * url:字符串 请求的地址<Br/>
 * timeout:整型毫秒，超时时间<Br/>
 * method: POST ,GET,PUT 字符串，代表请求的方法<Br/>
 * proxy: 代理地址，map参数 包含主机和端口 例如 {"host":"11","port":111}<Br/>
 * followRedirects:是否自动跳转 true 或者 false<Br/>
 * requestBody: 请求的body体，如果是JSON，就是JSON字符串<Br/>
 * userAgent:字符串 HTTP 的UA <Br/>
 * ignoreContentType:是否忽略内容类型 true 或者 false <Br/>
 * ignoreHttpErrors:是否忽略错误 true 或者 false  <Br/>
 * maxBodySize : 整型，HTTP BODY最大值  <Br/>
 * referrer:字符串，请求来源  <Br/>
 * header:  HTTP 请求头，map参数,例如 {"UA":"test"} <Br/>
 * cookie: HTTP 请求Cookie，map参数, 例如 {"a":1} <Br/>
 * data:HTTP POST的数据，map参数, 例如 {"a":1} <Br/>
 * file:要上传的文件，集合参数，例如<Br/> [
 *                      {"key":"a1","fileName":"a.txt","filePath":"/sdcard/"},
 *                      {"key":"a1","fileName":"a.jpg","filePath":"/sdcard/","contentType":"image/jpg"}
 *                  ]<Br/>
 *                  其中contentType可有可无
 * responseCharset: 字符串，强制设置响应内容的编码集
 * @return {Response1|null} 对象或者null
 */
HttpWrapper.prototype.request = function (param) {
    if (httpWrapper == null || param == null) {
        return null;
    }
    let p = JSON.stringify(param);
    let x = httpWrapper.request(p);
    if (x == null || x == "") {
        return null;
    }
    try {
        return new Response1(JSON.parse(x));
    } catch (e) {
    }
    return null;

};
/**
 *
 * @param param
 * @return {Response1|null}
 */
HttpWrapper.prototype.requestEx = function (param) {
    if (httpWrapper == null || param == null) {
        return null;
    }
    var p = JSON.stringify(param);
    var x = httpWrapper.requestEx(p);
    if (x == null || x == "") {
        return null;
    }
    try {
        return new Response1(JSON.parse(x));
    } catch (e) {
    }
    return null;
};

function Response1(data) {
    this.cookie = {};
    this.header = {};
    this.charset = "";
    this.statusMessage = "";
    this.contentType = "";
    this.statusCode = 0;
    this.body = "";
    if (data != null) {
        this.cookie = data["cookie"];
        this.header = data["header"];
        this.charset = data["charset"];
        this.statusMessage = data["statusMessage"];
        this.contentType = data["contentType"];
        this.statusCode = data["statusCode"];
        this.body = data["body"];
    }
}


/**
 * 创建一个websocket
 * @param url 要连接的地址
 * @param header 参数头
 * @param type 类库类型，1 okhttp 2 javawebsocket
 * @return {null|WebSocket1} WebSocket对象
 */
HttpWrapper.prototype.newWebsocket = function (url, header, type) {
    var p = null;
    if (header != null) {
        p = JSON.stringify(header);
    }
    var ws = httpWrapper.websocket(url, p, type);
    return new WebSocket1(ws);
};


function WebSocket1(ws) {
    this.websocketClient = ws;
}


/**
 * 开始异步连接
 * @param timeout 链接超时时间
 * @return {boolean} true 代表成功 false代表失败
 */
WebSocket1.prototype.connect = function (timeout) {
    if (this.websocketClient != null) {
        return this.websocketClient.connect(timeout);
    }
    return false;
};


/**
 * EC 6.17.0+ [已过期]
 * 重置连接
 * @return {boolean} true 代表成功 false代表失败
 */
WebSocket1.prototype.reset = function () {
    if (this.websocketClient != null) {
        return this.websocketClient.reset();
    }
    return false;
};


/**
 * EC 6.17.0+ [已过期]
 * 开始同步重新链接
 * @return {boolean} true 代表链接成功 false代表失败
 */
WebSocket1.prototype.reconnectBlocking = function () {
    if (this.websocketClient != null) {
        return this.websocketClient.reconnectBlocking();
    }
    return false;
};


/**
 * EC 6.17.0+ [已过期]
 * 开始同步链接
 * @param timeout 链接超时时间 单位是毫秒
 * @return {boolean} true 代表链接成功 false代表失败
 */
WebSocket1.prototype.connectBlocking = function (timeout) {
    if (this.websocketClient != null) {
        return this.websocketClient.connectBlocking(timeout);
    }
    return false;
};


/**
 * 是否已经关闭
 * @return {boolean} true 代表已经关闭，false 未关闭
 */
WebSocket1.prototype.isClosed = function () {
    if (this.websocketClient != null) {
        return this.websocketClient.isClosed();
    }
    return true;
};


/**
 * 是否已经连接了
 * @return {boolean} true 代表已经连接，false 未连接
 */
WebSocket1.prototype.isConnected = function () {
    if (this.websocketClient != null) {
        return this.websocketClient.isConnected();
    }
    return false;
};


/**
 * 关闭链接
 */
WebSocket1.prototype.close = function () {
    this.websocketClient.close();
};

/**
 * 适用EC 6.17.0+
 * 设置自动重连
 * @param v true 代表自动重连
 */
WebSocket1.prototype.setAutoReconnect = function (v) {
    this.websocketClient.setAutoReconnect(v);
};
/**
 * 适用EC 6.17.0+
 * 在创建websocket链接类型=2的时候使用
 * 设置丢失链接超时时间
 * @param timeout 单位是秒
 */
WebSocket1.prototype.setConnectionLostTimeout = function (timeout) {
    this.websocketClient.setConnectionLostTimeout(timeout);
};


/**
 * 适用EC 6.17.0+
 * 在创建websocket链接类型=1的时候使用
 * 设置数据读取超时时间
 * @param timeout 单位是秒
 */
WebSocket1.prototype.setReadTimeout = function (timeout) {
    this.websocketClient.setReadTimeout(timeout);
};

/**
 * 适用EC 6.17.0+
 * 在创建websocket链接类型=1的时候使用
 * 设置数据写入超时时间
 * @param timeout 单位是秒
 */
WebSocket1.prototype.setWriteTimeout = function (timeout) {
    this.websocketClient.setWriteTimeout(timeout);
};


/**
 * 适用EC 6.17.0+
 * 在创建websocket链接类型=1的时候使用
 * 设置心跳超时时间
 * @param timeout 单位是秒
 */
WebSocket1.prototype.setPingInterval = function (timeout) {
    this.websocketClient.setPingInterval(timeout);
};


/**
 * 适用EC 6.17.0+
 * 在创建websocket链接类型=1的时候使用
 * 设置调用超时时间
 * @param timeout 单位是秒
 */
WebSocket1.prototype.setCallTimeout = function (timeout) {
    this.websocketClient.setCallTimeout(timeout);
};


/**
 * 发送文本消息
 * @param text 文本信息
 * @return true 代表成功，false 失败
 */
WebSocket1.prototype.sendText = function (text) {
    return this.websocketClient.sendText(text);
};
/**
 * 发送字节信息
 * @param bin
 * @return true 代表成功，false 失败
 */
WebSocket1.prototype.sendBinary = function (bin) {
    return this.websocketClient.sendBinary(bin);
};

/**
 * 当连接打开的时候事件回调
 * @param callback 回调函数
 */
WebSocket1.prototype.onOpen = function (callback) {
    this.websocketClient.setCallbackOnOpen(callback);
};
/**
 * 当有文本信息发送过来的时候回调
 * @param callback 回调函数
 */
WebSocket1.prototype.onText = function (callback) {
    this.websocketClient.setCallbackOnText(callback);
};
/**
 * 当关闭的时候回调
 * @param callback 回调函数
 */
WebSocket1.prototype.onClose = function (callback) {
    this.websocketClient.setCallbackOnClose(callback);
};
/**
 * 当发生错误的时候回调
 * @param callback 回调函数
 */
WebSocket1.prototype.onError = function (callback) {
    this.websocketClient.setCallbackOnError(callback);
};
/**
 * 当有二进制数据过来的时候回调
 * @param callback 回调函数
 */
WebSocket1.prototype.onBinary = function (callback) {
    this.websocketClient.setCallbackOnBinary(callback);
};




/**
 * 使用代理ipa请求http get请求，目前仅限于请求 127.0.0.1这样本机，因为不能请求外网
 * 适合改机软件的请求
 * 支持版本 EC USB 7.21.0+
 * @param url 地址 url
 * @param timeout 超时时间 单位是毫秒 例如10000
 * @return {null|string} 返回请求到的结果字符串
 */
HttpWrapper.prototype.agentHttpGetString = function (url, timeout) {
    if (httpWrapper == null) {
        return "";
    }
    return utilsWrapper.agentHttpGetString(url, timeout);
};

/**
 * 使用代理ipa请求http 发送json，目前仅限于请求 127.0.0.1这样本机，因为不能请求外网
 * 适合改机软件的请求
 * 支持版本 EC USB 7.21.0+
 * @param url 地址 url
 * @param timeout 超时时间 单位是毫秒 例如10000
 * @param dataMap js的map数据 例如 {"a":1}
 * @return {null|string} 返回请求到的结果字符串
 */
HttpWrapper.prototype.agentHttpPostJson = function (url, timeout, dataMap) {
    if (httpWrapper == null) {
        return "";
    }
    dataMap = JSON.stringify(dataMap)
    return utilsWrapper.agentHttpPostJson(url, timeout, dataMap);
};


/**
 * 使用代理ipa请求http ，目前仅限于请求 127.0.0.1这样本机，因为不能请求外网
 * 适合改机软件的请求
 * 支持版本 EC USB 8.16.0+
 * @param dataMap js的map数据 转发的数据 请看http.request的param参数表，除了不能上传文件，其他和http.request的param保持一致
 * @return {null|Response1} 返回的结果
 */
HttpWrapper.prototype.agentRequestEx = function (dataMap) {
    if (httpWrapper == null) {
        return null;
    }
    dataMap = JSON.stringify(dataMap)
    let x = utilsWrapper.agentRequestEx(dataMap);
    if (x == null || x == "") {
        return null;
    }
    try {
        return new Response1(JSON.parse(x));
    } catch (e) {
    }
    return null;
};
/**
 * 使用代理ipa转发http请求
 * 这个方法是从usb请求到代理ipa，然后再请求到主程序，再到外网地址，多次转发出去的
 *
 * 适合配合文件传输助手或者脱机版本主程序使用，例如获取手机的外网IP等
 * 手机需要安装传输助手或者脱机版本主程序
 * 支持版本 EC USB 8.16.0+
 * @param url 地址 url，脱机版本主程序的请求转发地址  http://127.0.0.1:18924/devapi/requestEx
 * @param timeout 超时时间 单位是毫秒 例如10000
 * @param dataMap js的map数据 转发的数据 请看http.request的param参数表，除了不能上传文件，其他和http.request的param保持一致
 * @return {null|Response1} 返回的结果
 */
HttpWrapper.prototype.agentForwardRequest = function (url, timeout, dataMap) {
    if (httpWrapper == null) {
        return null;
    }
    dataMap = JSON.stringify(dataMap)
    let x =  utilsWrapper.agentForwardRequest(url, timeout, dataMap);
    if (x == null || x == "") {
        return null;
    }
    try {
        return new Response1(JSON.parse(x));
    } catch (e) {
    }
    return null;
};

