function ImageAgentWrapper() {

}

var imageAgent = new ImageAgentWrapper();
/**
 * 设置图色模块初始化参数，可用于多分辨率兼容
 * @param param
 */
ImageAgentWrapper.prototype.setInitParam = function (param) {
    if (imageAgentWrapper == null) {
        return;
    }
    imageAgentWrapper.setInitParam(JSON.stringify(param));
};


/**
 * 抓取全屏，格式是JPG
 * 适配EC USB版 iOS 5.0.0+
 * @param ext 扩展参数，可以调整截图的方式和质量，可以分别是
 *  type: 1 代表截图 jpg格式的方式1
 *        2 代表截图 jpg格式方式2
 *        3 代表png格式，png不支持质量参数 ，根据自己机器情况调用
 *  quality: 图片质量，type=1的时候，支持 1， 50， 100，三种不同的质量标准
 *      当type =2 的时候，支持1-100图片质量
 * @return {null|AutoImage}
 */
ImageAgentWrapper.prototype.captureFullScreenEx = function (ext) {
    if (imageAgentWrapper == null) {
        return null;
    }
    if (ext == null || ext == undefined) {
        ext = {"type": "1", "quality": 99};
    }
    let uuid = imageAgentWrapper.captureFullScreenEx(JSON.stringify(ext));
    if (uuid != null && uuid != "") {
        return new AutoImage(uuid);
    }
    return null;
};


/**
 * 抓取全屏，格式是JPG
 * @return {null|AutoImage}
 */
ImageAgentWrapper.prototype.captureFullScreen = function () {
    if (imageAgentWrapper == null) {
        return null;
    }
    let uuid = imageAgentWrapper.captureFullScreen();
    if (uuid != null && uuid != "") {
        return new AutoImage(uuid);
    }
    return null;
};


/**
 * 在图片中找到颜色和color完全相等的点，；如果没有找到，则返回null。
 *
 * @param image1 图片
 * @param color     要寻找的颜色
 * @param threshold 找色时颜色相似度取值为 0.0 ~ 1.0
 * @param x 区域的X起始坐标
 * @param y 区域的Y起始坐标
 * @param ex 终点X坐标
 * @param ey 终点Y坐标
 * @param limit 限制个数
 * @param orz 方向，分别从1-8
 * @return {null|PointIndex[]} PointIndex 坐标点数组或者null
 */
ImageAgentWrapper.prototype.findColor = function (image1, color, threshold, x, y, ex, ey, limit, orz) {
    if (imageAgentWrapper == null || image1 == null) {
        return null;
    }

    color = this.convertFirstColorArrayToString2(color);
    let res = imageAgentWrapper.findColor(image1.uuid, color, threshold, x, y, ex - x, ey - y, limit, orz);
    if (res == null || res == "") {
        return null;
    }

    try {
        let d = JSON.parse(res);
        let x1 = [];
        for (let i = 0; i < d.length; i++) {
            x1.push(new PointIndex(d[i]));
        }
        return x1;
    } catch (e) {

    }
    return null;

};

/**
 * 找非色
 * 在图片中找到颜色和color完全不相等的点，如果没有找到，则返回null。
 * 适配EC iOS 6.30.0+
 * @param image1 图片
 * @param color 要寻找的颜色，用ec工具可以生成
 * @param threshold 找色时颜色相似度取值为 0.0 ~ 1.0
 * @param x 区域的X起始坐标
 * @param y 区域的Y起始坐标
 * @param ex 终点X坐标
 * @param ey 终点Y坐标
 * @param limit 限制个数
 * @param orz 方向，分别从1-8
 * @return {null|PointIndex[]}  PointIndex 坐标点数组或者null
 */
ImageAgentWrapper.prototype.findNotColor = function (image1, color, threshold, x, y, ex, ey, limit, orz) {
    if (imageAgentWrapper == null || image1 == null) {
        return null;
    }

    color = this.convertFirstColorArrayToString2(color);
    let res = imageAgentWrapper.findNotColor(image1.uuid, color, threshold, x, y, ex - x, ey - y, limit, orz, true);
    if (res == null || res == "") {
        return null;
    }
    try {
        let d = JSON.parse(res);
        let x1 = [];
        for (let i = 0; i < d.length; i++) {
            x1.push(new PointIndex(d[i]));
        }
        return x1;
    } catch (e) {

    }
    return null;
};
ImageAgentWrapper.prototype.setFindColorImageMode = function (ext) {

}

/**
 * 在当前屏幕中找到颜色和color完全相等的点，如果没有找到，则返回null。
 * @param color     要寻找的颜色
 * @param threshold 找色时颜色相似度取值为 0.0 ~ 1.0
 * @param x 区域的X起始坐标
 * @param y 区域的Y起始坐标
 * @param ex 终点X坐标
 * @param ey 终点Y坐标
 * @param limit 限制个数
 * @param orz 方向，分别从1-8
 * @return {null|PointIndex[]}  PointIndex 坐标点数组或者null
 */
ImageAgentWrapper.prototype.findColorEx = function (color, threshold, x, y, ex, ey, limit, orz) {
    if (imageAgentWrapper == null) {
        return null;
    }
    color = this.convertFirstColorArrayToString2(color);
    let res = imageAgentWrapper.findColorEx(color, threshold, x, y, ex - x, ey - y, limit, orz);
    if (res == null || res == "") {
        return null;
    }
    try {
        let d = JSON.parse(res);
        let x1 = [];
        for (let i = 0; i < d.length; i++) {
            x1.push(new PointIndex(d[i]));
        }
        return x1;
    } catch (e) {
    }
    return null;
};


/**
 * 多点找色，找到所有符合标准的点，类似于按键精灵的多点找色
 * <p>
 * 整张图片都找不到时返回null
 *
 * @param image1      要找色的图片
 * @param firstColor 第一个点的颜色
 * @param threshold 找色时颜色相似度取值为 0.0 ~ 1.0
 * @param points     字符串类似这样 6|1|0x969696-0x000010,1|12|0x969696,-4|0|0x969696
 * @param x 区域的X起始坐标
 * @param y 区域的Y起始坐标
 * @param ex 终点X坐标
 * @param ey 终点Y坐标
 * @param limit 限制个数
 * @param orz 方向，分别从1-8
 * @return {null|Point[]}  Point 坐标点数组或者null
 */
ImageAgentWrapper.prototype.findMultiColor = function (image1, firstColor, points, threshold, x, y, ex, ey, limit, orz) {
    if (imageAgentWrapper == null || image1 == null) {
        return null;
    }
    firstColor = this.convertFirstColorArrayToString(firstColor);
    points = this.convertMultiColorArrayToString(points);
    let res = imageAgentWrapper.findMultiColor(image1.uuid, firstColor, points, threshold, x, y, ex - x, ey - y, limit, orz);
    if (res == null || res == "") {
        return null;
    }
    try {
        let d = JSON.parse(res);
        let x1 = [];
        for (let i = 0; i < d.length; i++) {
            x1.push(new Point(d[i]));
        }
        return x1;
    } catch (e) {

    }
    return null;

};


/**
 * 多点找色，找到所有符合标准的点，自动抓取当前屏幕的图片，类似于按键精灵的多点找色
 * <p>
 * 整张图片都找不到时返回null
 * @param firstColor 第一个点的颜色
 * @param threshold  找色时颜色相似度取值为 0.0 ~ 1.0
 * @param points     字符串类似这样 6|1|0x969696-0x000010,1|12|0x969696,-4|0|0x969696
 * @param x 区域的X起始坐标
 * @param y 区域的Y起始坐标
 * @param ex 终点X坐标
 * @param ey 终点Y坐标
 * @param limit 限制个数
 * @param orz 方向，分别从1-8
 * @return {null|Point[]} Point 坐标点数组或者null
 */
ImageAgentWrapper.prototype.findMultiColorEx = function (firstColor, points, threshold, x, y, ex, ey, limit, orz) {
    //String firstColor, String points, float threshold, int x, int y, int w, int h
    if (imageAgentWrapper == null) {
        return null;
    }
    firstColor = this.convertFirstColorArrayToString(firstColor);
    points = this.convertMultiColorArrayToString(points);
    let res = imageAgentWrapper.findMultiColorEx(firstColor, points, threshold, x, y, ex - x, ey - y, limit, orz);
    if (res == null || res == "") {
        return null;
    }
    try {
        let d = JSON.parse(res);
        let x1 = [];
        for (let i = 0; i < d.length; i++) {
            x1.push(new Point(d[i]));
        }
        return x1;
    } catch (e) {
    }
    return null;
};


/**
 * 单点或者多点比色，找到所有符合标准的点，如果都符合返回true，否则是false
 * @param image1 图片
 * @param points     字符串类似这样 6|1|0x969696-0x000010,2|3|0x969696-0x000010
 * @param threshold  找色时颜色相似度取值为 0.0 ~ 1.0
 * @param x 区域的X起始坐标，默认填写0全屏查找
 * @param y 区域的Y起始坐标，默认填写0全屏查找
 * @param ex 终点X坐标，默认填写0全屏查找
 * @param ey 终点Y坐标，默认填写0全屏查找
 * @return {boolean} true代表找到了 false代表未找到
 */
ImageAgentWrapper.prototype.cmpColor = function (image1, points, threshold, x, y, ex, ey) {
    if (imageAgentWrapper == null || image1 == null) {
        return false;
    }
    points = this.convertMultiColorArrayToString(points);
    let index = imageAgentWrapper.cmpColor(image1.uuid, points, threshold, x, y, ex - x, ey - y);
    return index !== -1;

};


/**
 * 单点或者多点比色，找到所有符合标准的点，默认自己截图，如果都符合返回true，否则是false
 * @param points     字符串类似这样 6|1|0x969696-0x000010,2|3|0x969696-0x000010
 * @param threshold  找色时颜色相似度取值为 0.0 ~ 1.0
 * @param x 区域的X起始坐标，默认填写0全屏查找
 * @param y 区域的Y起始坐标，默认填写0全屏查找
 * @param ex 终点X坐标，默认填写0全屏查找
 * @param ey 终点Y坐标，默认填写0全屏查找
 * @return {boolean} true代表找到了 false代表未找到
 */
ImageAgentWrapper.prototype.cmpColorEx = function (points, threshold, x, y, ex, ey) {
    if (imageAgentWrapper == null) {
        return -1;
    }
    points = this.convertMultiColorArrayToString(points);
    let index = imageAgentWrapper.cmpColorEx(points, threshold, x, y, ex - x, ey - y);
    if (index === -1) {
        return false;
    }
    return true;
};


/**
 * 多点或者多点数组比色，找到所有符合标准的点，依次查找，如果找到就返回当前points的索引值，如果返回-1，说明都没有找到
 * @param image1 图片
 * @param points     数组类似这样 ["6|1|0x969696-0x000010,1|12|0x969696,-4|0|0x969696","6|1|0x969696"]
 * @param threshold  找色时颜色相似度取值为 0.0 ~ 1.0
 * @param x 区域的X起始坐标，默认填写0全屏查找
 * @param y 区域的Y起始坐标，默认填写0全屏查找
 * @param ex 终点X坐标，默认填写0全屏查找
 * @param ey 终点Y坐标，默认填写0全屏查找
 * @return {number} 如果找到就返回当前points的索引值，如果返回-1，说明都没有找到
 */
ImageAgentWrapper.prototype.cmpMultiColor = function (image1, points, threshold, x, y, ex, ey) {
    if (imageAgentWrapper == null || image1 == null) {
        return -1;
    }

    if (points != null) {
        // "6|1|0x969696-0x000010,1|12|0x969696,-4|0|0x969696","6|1|0x969696"
        // 类似这样的字符串 直接 转成数组的 JSON
        if ((typeof points) == "string") {
            return imageAgentWrapper.cmpMultiColor(image1.uuid, JSON.stringify([points]), threshold, x, y, ex - x, ey - y);
        }
        //走老的逻辑
        if ((typeof points[0]) == "string") {
            if (/#|0x/.test(points[0])) {
                return imageAgentWrapper.cmpMultiColor(image1.uuid, JSON.stringify(points), threshold, x, y, ex - x, ey - y);
            }
        }
        let newPoint = [];
        for (let i = 0; i < points.length; i++) {
            newPoint[i] = this.convertMultiCmpColorArrayToString(points[i]);
        }
        return imageAgentWrapper.cmpMultiColor(image1.uuid, JSON.stringify(newPoint), threshold, x, y, ex - x, ey - y);
    }
    return -1;

};


/**
 * 多点或者多点数组比色，找到所有符合标准的点，自动截屏，依次查找，如果找到就返回当前points的索引值，如果返回-1，说明都没有找到
 * @param points     数组类似这样 ["6|1|0x969696-0x000010,1|12|0x969696,-4|0|0x969696","6|1|0x969696"]
 * @param threshold  找色时颜色相似度取值为 0.0 ~ 1.0
 * @param x 区域的X起始坐标，默认填写0全屏查找
 * @param y 区域的Y起始坐标，默认填写0全屏查找
 * @param ex 终点X坐标，默认填写0全屏查找
 * @param ey 终点Y坐标，默认填写0全屏查找
 * @return {number} 如果找到就返回当前points的索引值，如果返回-1，说明都没有找到
 */
ImageAgentWrapper.prototype.cmpMultiColorEx = function (points, threshold, x, y, ex, ey) {
    if (imageAgentWrapper == null) {
        return -1;
    }
    if (points != null) {
        // "6|1|0x969696-0x000010,1|12|0x969696,-4|0|0x969696","6|1|0x969696"
        // 类似这样的字符串 直接 转成数组的 JSON
        if ((typeof points) == "string") {
            return imageAgentWrapper.cmpMultiColorEx(JSON.stringify([points]), threshold, x, y, ex - x, ey - y);
        }
        //走老的逻辑
        if ((typeof points[0]) == "string") {
            if (/#|0x/.test(points[0])) {
                return imageAgentWrapper.cmpMultiColorEx(JSON.stringify(points), threshold, x, y, ex - x, ey - y);
            }
        }
        let newPoint = [];
        for (let i = 0; i < points.length; i++) {
            newPoint[i] = this.convertMultiCmpColorArrayToString(points[i]);
        }
        return imageAgentWrapper.cmpMultiColorEx(JSON.stringify(newPoint), threshold, x, y, ex - x, ey - y);
    }
    return -1;
};

/**
 * 取得图片的base64字符串
 * 适配 EC iOS USB版本 6.26.0+
 * @param img 图片对象
 * @return {null|string} base64的数据
 */
ImageAgentWrapper.prototype.toBase64 = function (img) {
    if (img == null) {
        return 0;
    }
    return imageAgentWrapper.toBase64(img.uuid);
};

/**
 * 取得宽度
 * @param img 图片对象
 * @return {number}
 */
ImageAgentWrapper.prototype.getWidth = function (img) {
    if (img == null) {
        return 0;
    }
    return imageAgentWrapper.getWidth(img.uuid);
};

/**
 * 取得高度
 * @param img 图片对象
 * @return {number}
 */
ImageAgentWrapper.prototype.getHeight = function (img) {
    if (img == null) {
        return 0;
    }
    return imageAgentWrapper.getHeight(img.uuid);
};


/**
 * 剪切图片
 * @param img 图片对象
 * @param x x起始坐标
 * @param y y起始坐标
 * @param ex 终点X坐标
 * @param ey 终点Y坐标
 * @return {null|AutoImage} 对象或者null
 */
ImageAgentWrapper.prototype.clip = function (img, x, y, ex, ey) {
    if (img == null) {
        return null;
    }
    var xd = imageAgentWrapper.clip(img.uuid, x, y, ex - x, ey - y);
    if (xd != null && xd != "") {
        return new AutoImage(javaString2string(xd));
    }
    return null;
};


/**
 * 取得图片的某个点的颜色值
 * @param img 图片对象
 * @param x x坐标点
 * @param y y坐标点
 * @return {number} 颜色值
 */
ImageAgentWrapper.prototype.pixel = function (img, x, y) {
    if (img == null) {
        return 0;
    }
    return imageAgentWrapper.pixel(img.uuid, x, y);
};


/**
 * 将整型的颜色值转成16进制RGB字符串
 * @param color 整型值
 * @return {null|string} 颜色字符串
 */
ImageAgentWrapper.prototype.argb = function (color) {
    if (color == null) {
        return null;
    }
    return imageAgentWrapper.argb(color);
};


/**
 * 是否被回收了
 * @param img 图片对象
 * @return {boolean} true代表已经被回收了
 */
ImageAgentWrapper.prototype.isRecycled = function (img) {
    if (img == null) {
        return false;
    }
    try {
        let d = img.getClass();
        if (d == "class android.graphics.Bitmap") {
            return img.isRecycled();
        }
    } catch (e) {
    }
    if (img.uuid == null) {
        return false;
    }

    return imageAgentWrapper.isRecycled(img.uuid);
};
/**
 * 回收所有图片
 * 适合 EC iOS 7.16.0+
 * @return {boolean} true代表成功
 */
ImageAgentWrapper.prototype.recycleAllImage = function () {
    imageAgentWrapper.recycleAllImage();
    return true;
}
/**
 * 回收图片
 * @param img 图片对象
 * @return {boolean}
 */
ImageAgentWrapper.prototype.recycle = function (img) {
    if (img == null) {
        return false;
    }
    try {
        let d = img.getClass();
        if (d == "class android.graphics.Bitmap") {
            img.recycle();
            return true;
        }
    } catch (e) {
    }

    if (img.uuid == null) {
        return false;
    }

    imageAgentWrapper.recycle(img.uuid);
    return true;
};


/**
 * 对AutoImage图片进行二值化
 * @param img AutoImage图片对象
 * @param threshold 二值化系数，0 ~ 255
 * @return {null|AutoImage} 对象或者null
 */
ImageAgentWrapper.prototype.binaryzation = function (img, threshold) {
    if (img == null) {
        return null;
    }
    var xd = imageAgentWrapper.binaryzation(img.uuid, threshold);
    if (xd != null && xd != "") {
        return new AutoImage(javaString2string(xd));
    }
    return null;
};

/**
 * 将图片数据拉到中控环境中
 * @param img autoimage对象，这个对象是在手机中
 * @return {null|AutoImage}
 */
ImageAgentWrapper.prototype.pullImageToCenter = function (img) {
    if (img == null) {
        return null;
    }
    var xd = imageAgentWrapper.pullImageToCenter(img.uuid);
    if (xd != null && xd != "") {
        return new AutoImage(javaString2string(xd));
    }
    return null;
};
/**
 * 将中控图片数据推送到手机环境中
 * @param img autoimage对象，这个对象是在中控中
 * @return {null|AutoImage}
 */
ImageAgentWrapper.prototype.pushImageToAgent = function (img) {
    if (img == null) {
        return null;
    }
    var xd = imageAgentWrapper.pushImageToAgent(img.uuid);
    if (xd != null && xd != "") {
        return new AutoImage(javaString2string(xd));
    }
    return null;
};
/**
 * 读取在路径path的图片文件并返回一个{@link AutoImage}对象。如果文件不存在或者文件无法解码则返回null。
 * @param path 图片路径
 * @return {null|AutoImage} 对象或者null
 */
ImageAgentWrapper.prototype.readImage = function (path) {
    if (res == null) {
        return false;
    }
    let xd = imageAgentWrapper.readImage(path);
    if (xd != null && xd != "") {
        return new AutoImage(javaString2string(xd));
    }
    return null;
};
/**
 * 读取在IEC res 文件夹中的图片文件并返回一个{@link AutoImage}对象。如果文件不存在或者文件无法解码则返回null。
 * @param res 图片路径
 * @return {null|AutoImage} 对象或者null
 */
ImageAgentWrapper.prototype.readResAutoImage = function (res) {
    if (res == null) {
        return false;
    }
    let xd = imageAgentWrapper.readResAutoImage(res);
    if (xd != null && xd != "") {
        return new AutoImage(javaString2string(xd));
    }
    return null;
};


function OCRAgentWrapper() {

}

let ocrAgent = new OCRAgentWrapper();

/**
 * 初始化OCR模块
 * @param map map参数表
 * key分别为：
 * type : OCR类型，值分别为 appleVision = ios自带的Vision模块
 * 如果类型是 appleVision, 参数设置为 : {"type":"appleVision","level":"fast","languages":"zh-Hans,en-US"}<Br/>
 * level: fast,代表快速的，accurate:代表精准的
 * languages: 识别的语言，默认是zh-Hans,en-US中文简体和英文，
 * 支持的有 ["en-US", "fr-FR", "it-IT", "de-DE", "es-ES", "pt-BR", "zh-Hans", "zh-Hant"]
 * @return {boolean} 布尔型 成功或者失败
 */
OCRAgentWrapper.prototype.initOcr = function (map) {
    if (map == null) {
        return ocrAgentWrapper.setInitOcr("{}");
    }
    return ocrAgentWrapper.initOcr(JSON.stringify(map));
};


/**
 * 设置OCR实现方式
 * @param type 值分别为 tess = ocrLite = ocrLite 模块
 * @return {boolean} 成功或者失败
 */
OCRAgentWrapper.prototype.setOcrType = function (type) {
    return ocrAgentWrapper.setOcrType(type);
};


/**
 * 释放OCR占用的资源
 * @return {boolean} 成功或者失败
 */
OCRAgentWrapper.prototype.releaseAll = function () {
    return ocrAgentWrapper.releaseAll();
};

/**
 * 释放OCR占用的资源
 * @return {boolean} 成功或者失败
 */
OCRAgentWrapper.prototype.releaseAllEx = function () {
    return ocrAgentWrapper.ocr_releaseAll();
};
/**
 * 获取错误消息
 * @return {string} null代表没有错误
 */
OCRAgentWrapper.prototype.getErrorMsg = function () {
    return ocrAgentWrapper.getErrorMsg();
};


/**
 * 对图片进行进行OCR，返回的是JSON数据，其中数据类似于与：
 *
 * [{
 *    "label": "奇趣装扮三阶盘化",
 *    "confidence": 0.48334712,
 *    "x": 11,
 *    "y": 25,
 *    "width": 100,
 *    "height": 100
 * }]
 *  <br/>
 *  label: 代表是识别的文字
 *  confidence：代表识别的准确度
 *  x: 代表X开始坐标
 *  Y: 代表Y开始坐标
 *  width: 代表宽度
 *  height: 代表高度
 * @param img autoimage对象
 * @param timeout 超时时间 单位毫秒
 * @param extra 扩展参数，map形式，例如 {"token":"xxx"}
 * @return {null|JSON} JSON对象
 */
OCRAgentWrapper.prototype.ocrImage = function (img, timeout, extra) {
    if (img == null) {
        return null;
    }
    let d = ocrAgentWrapper.ocrImage(img.uuid, timeout, JSON.stringify(extra));
    if (d != null && d != "") {
        return JSON.parse(d);
    }
    return d;
};

function OcrInstAgent(s) {
    this.ocrId = s;
}

/**
 * 生成一个ocr实例
 * @return {OcrInstAgent|null}
 */
OCRAgentWrapper.prototype.newOcr = function () {
    // ocrId 是实例的id
    let ocrId = ocrAgentWrapper.ocr_newOcr();
    if (ocrId == null || ocrId == undefined) {
        return null;
    }
    let ins = new OcrInstAgent(ocrId);
    return ins;
}

/**
 * 初始化OCR模块
 * @param map map参数表
 * key分别为：<br/>
 * type : OCR类型，值分别为paddleNcnnOcrV5=ncnn版本的paddleocr， ocrLite = ocrLite, paddleLiteOcr=paddleLite appleVision = ios自带的Vision模块<br/>
 * ##### 如果类型是 appleVision, 参数设置为 : {"ocrType":"appleVision","level":"fast","languages":"zh-Hans,en-US"}<br/>
 * - level: fast,代表快速的，accurate:代表精准的
 * - languages: 识别的语言，默认是zh-Hans,en-US中文简体和英文，
 * - 支持的有 ["en-US", "fr-FR", "it-IT", "de-DE", "es-ES", "pt-BR", "zh-Hans", "zh-Hant"]
 * ###### 如果类型是 paddleLiteOcr = paddleLite，paddleOnnxOcr = onnxrntime的ppocr-v5的模型实现， 注意 由于onnxruntime和paddlelite冲突，使用onnx重写了paddlelite底层实现,
 * - 参数设置为 {"ocrType":"paddleLiteOcr","cpuThreadNum":2}
 *  - cpuThreadNum 使用的CPU线程数，如果不知道 不写即可，-1 代表全部cpu数量，-2 代表cpu数量的一半
 *  - modelPath： 模型路径，如果是外部路径例如 /sdcard/models/代表是sdcard下面的，默认自带有模型 不写这一项即可
 *  - labelPath: 训练的文字标签文件路径，可以是外部的 例如 /sdcard/labels/ppocr_keys_v1.txt，默认自带有模型 不写这一项即可
 *  - detModelFilename: 检测模型文件名，onnx 结尾的文件名称，放到 modelPath 参数的路径下，默认自带有模型 不写这一项即可
 *  - recModelFilename: 识别模型文件名，onnx 结尾的文件名称，放到 modelPath 参数的路径下，默认自带有模型 不写这一项即可
 *  - clsModelFilename: 分类模型文件名，onnx 结尾的文件名称，放到 modelPath 参数的路径下，默认自带有模型 不写这一项即可
 *  - padding 图像外接白框，用于提升识别率，文字框没有正确框住所有文字时，增加此值。默认 10。
 *  - boxThresh 图像中文字部分和背景部分分割阈值。值越大，文字部分会越小。取值范围：[0, 1]，默认值为0.3。
 *  - boxScoreThresh 文本检测所得框是否保留的阈值，值越大，召回率越低。取值范围：[0, 1]，默认值为0.5。
 *  - unClipRatio 控制文本检测框的大小，值越大，检测框整体越大。取值范围：[1.6, 2.0]，默认值为 1.6。
 *  - doAngle 1启用(1)/禁用(0) 文字方向检测，只有图片倒置的情况下(旋转90~270度的图片)，才需要启用文字方向检测，默认1
 *  - mostAngle 启用(1)/禁用(0) 角度投票(整张图片以最大可能文字方向来识别)，当禁用文字方向检测时，此项也不起作用，默认1
 *  - maxSideLen 如果输入图像的最大边大于max_side_len，则会按宽高比，将最大边缩放到max_side_len。默认为 960
 * ### 如果类型是 paddleNcnnOcrV5，参数设置如下
 * - numThread: 线程数量，-1 等于全部，-2 等于设备CPU的一半，0代表不设置，识别速度可以用这个值调整
 * - modelsDir: 模型的路径文件路径。默认不写就使用自带的
 * - padding: 图像外接白框，用于提升识别率，文字框没有正确框住所有文字时，增加此值。默认 32，识别速度可以用这个值调整
 * - maxSideLen 如果输入图像的最大边大于max_side_len，则会按宽高比，将最大边缩放到max_side_len。默认为 640，识别速度可以用这个值调整
 * - keysName: 训练的文字标签文件名称，可以是外部的 例如 keys.txt，默认自带有模型 不写这一项即可
 * - detName: 检测模型文件名，param 结尾的文件名称，放到 modelsDir 参数的路径下，名字叫det.param就写det，不用带param后缀，默认自带有模型 不写这一项即可
 * - recName: 识别模型文件名，onnx 结尾的文件名称，放到 modelsDir 参数的路径下，名字叫rec.param就写det，不用带param后缀，默认自带有模型 不写这一项即可
 * ### 如果类型是 ocrLite
 *  - 参数设置为 : {"ocrType":"ocrLite","numThread":2,"padding":10,"maxSideLen":0}<br/>
 *  - numThread: 线程数量。 <br/>
 *  - padding: 图像预处理，在图片外周添加白边，用于提升识别率，文字框没有正确框住所有文字时，增加此值。<br/>
 *  - maxSideLen: 按图片最长边的长度，此值为0代表不缩放，例：1024，如果图片长边大于1024则把图像整体缩小到1024再进行图像分割计算，如果图片长边小于1024则不缩放，如果图片长边小于32，则缩放到32。<br/>
 * @return {boolean} 布尔型 成功或者失败
 */
OcrInstAgent.prototype.initOcr = function (map) {
    if (map == null) {
        return ocrAgentWrapper.ocr_setInitOcr(this.ocrId, null);
    }
    return ocrAgentWrapper.ocr_setInitOcr(this.ocrId, JSON.stringify(map));
};



/**
 * 获取错误消息
 * @return {string} null代表没有错误
 */
OcrInstAgent.prototype.getErrorMsg = function () {
    return ocrAgentWrapper.ocr_getErrorMsg(this.ocrId);
};

OcrInstAgent.prototype.releaseAll = function () {
    return ocrAgentWrapper.ocr_release(this.ocrId);
};

OcrInstAgent.prototype.release = function () {
    return ocrAgentWrapper.ocr_release(this.ocrId);
};
/**
 * ocr识别图像
 * @param img AutoImage对象
 * @param timeout 超时时间
 * @param extra 参数JSON 默认写 {}
 * @return {null|JSON} JSON对象
 */
OcrInstAgent.prototype.ocrImage = function (img, timeout, extra) {
    if (img == null) {
        return null;
    }
    if (extra == null || extra == undefined) {
        extra = {};
    }
    let d = ocrAgentWrapper.ocr_ocrImage(this.ocrId, img.uuid, timeout, JSON.stringify(extra));
    try {
        if (d != null && d != "") {
            return JSON.parse(d);
        }
        return d;
    } catch (e) {

    }
    return null;

};



ImageAgentWrapper.prototype.convertFirstColorArrayToString = function (arr) {
    if (arr) {
        if (typeof arr == "string") {

            return arr;
        }
        if (arr[1] == null || arr[1].length <= 0 || "" == arr[1]) {
            return arr[0];
        }
        return arr[0] + "-" + arr[1];
    }
    return null;
}

ImageAgentWrapper.prototype.convertMultiColorArrayToString = function (arr) {
    if (arr) {
        if (typeof arr == "string") {
            return arr;
        }
        //转换成类似的字符串 6|1|0x969696-0x000010,1|12|0x969696,-4|0|0x969696
        let length = arr.length;
        let result = "";
        for (let i = 0; i < length; i = i + 4) {
            if (result.length > 0) {
                result = result + ","
            }
            let p = arr[i + 3];
            if (p == null || p.length <= 0 || "" == p) {
                result = result + arr[i] + "|" + arr[i + 1] + "|" + arr[i + 2];
            } else {
                result = result + arr[i] + "|" + arr[i + 1] + "|" + arr[i + 2] + "-" + arr[i + 3];
            }

        }
        return result;
    }
    return null;
}

ImageAgentWrapper.prototype.convertFirstColorArrayToString2 = function (arr) {
    if (arr) {
        if (typeof arr == "string") {
            return arr;
        }
        //转换成类似的字符串 0x969696-0x000010,0x969696,0x969696
        let length = arr.length;
        let result = "";
        for (let i = 0; i < length; i = i + 2) {
            if (result.length > 0) {
                result = result + ","
            }
            let p = arr[i + 1];
            if (p == null || p.length <= 0 || "" == p) {
                result = result + arr[i];
            } else {
                result = result + arr[i] + "-" + arr[i + 1];
            }

        }
        return result;
    }
    return null;
}


ImageAgentWrapper.prototype.convertMultiCmpColorArrayToString = function (arr) {
    if (arr) {
        if (typeof arr == "string") {
            return arr;
        }
        //转换成类似的字符串 6|1|0x969696-0x000010,1|12|0x969696,-4|0|0x969696
        let length = arr.length;
        let result = [];
        for (let i = 0; i < length; i = i + 4) {
            let p = arr[i + 3];
            if (p == null || p.length <= 0 || "" == p) {
                let tmp = arr[i] + "|" + arr[i + 1] + "|" + arr[i + 2];
                result.push(tmp)
            } else {
                let tmp = arr[i] + "|" + arr[i + 1] + "|" + arr[i + 2] + "-" + arr[i + 3];
                result.push(tmp)
            }
        }
        return result;
    }
    return null;
}

/**
 * 通过颜色找图，支持透明图，这个不需要处理话opencv
 * 整张图片都找不到时返回null
 * @param image1     大图片
 * @param template  小图片（模板）
 * @param x         找图区域 x 起始坐标
 * @param y         找图区域 y 起始坐标
 * @param ex 终点X坐标
 * @param ey 终点Y坐标
 * @param threshold 图片相似度。取值范围为0~1的浮点数。默认值为0.9。
 * @param limit 限制结果的数量，如果要找到1个，就填写1，如果是多个请填写多个
 * @return {null|Point[]} Point 坐标点数组或者null
 */
ImageAgentWrapper.prototype.findImageByColor = function (image1, template, x, y, ex, ey, threshold, limit) {
    if (imageAgentWrapper == null || image1 == null || template == null) {
        return null;
    }
    let res = imageAgentWrapper.findImageByColor(image1.uuid, template.uuid, x, y, ex - x, ey - y, threshold, limit);
    if (res == null || res == "") {
        return null;
    }
    try {
        let d = JSON.parse(res);
        let x1 = [];
        for (let i = 0; i < d.length; i++) {
            x1.push(new Point(d[i]));
        }
        return x1;
    } catch (e) {
    }
    return null;

};

/**
 * 通过颜色找图，支持透明图，这个不需要处理话opencv
 * <p>
 * 整张图片都找不到时返回null
 * @param image1     大图片
 * @param template  小图片（模板）
 * @param x         找图区域 x 起始坐标
 * @param y         找图区域 y 起始坐标
 * @param ex 终点X坐标
 * @param ey 终点Y坐标
 * @param limit 限制结果的数量，如果要找到1个，就填写1，如果是多个请填写多个
 * @param extra 扩展函数，map结构例如<Br/>
 * {"firstColorOffset":"#101010","firstColorThreshold":1.0,"firstColorOffset":"#101010","otherColorThreshold":0.9,"cmpColorSucThreshold":1.0}
 * <Br/>firstColorOffset: 第一个匹配到的颜色偏色,例如 #101010 <Br/>
 * firstColorThreshold: 第一个匹配到的颜色偏色系数，例如 0.9<Br/>
 * firstColorOffset: 剩下需要找的颜色 偏色,例如 #101010<Br/>
 * otherColorThreshold: 剩下需要找的颜色 偏色系数，例如 0.9<Br/>
 * cmpColorSucThreshold: 成功匹配多少个颜色系数 就认为是成功的，例如 0.9 = 90%个点<Br/>
 * startX: 第一个点从哪里开始找的X坐标<Br/>
 * startY: 第一个点从哪里开始找的Y坐标<Br/>
 * @return {null|Point[]} Point 坐标点数组或者null
 */
ImageAgentWrapper.prototype.findImageByColorEx = function (image1, template, x, y, ex, ey, limit, extra) {
    if (imageAgentWrapper == null || image1 == null || template == null) {
        return;
    }
    if (extra) {
        extra = JSON.stringify(extra);
    }
    let res = imageAgentWrapper.findImageByColorEx(image1.uuid, template.uuid, x, y, ex - x, ey - y, limit, extra);
    if (res == null || res == "") {
        return null;
    }
    try {
        let d = JSON.parse(res);
        let x1 = [];
        for (let i = 0; i < d.length; i++) {
            x1.push(new Point(d[i]));
        }
        return x1;
    } catch (e) {

    }
    return null;

};


/**
 * 旋转图片
 * @param img 图片对象
 * @param degree 度数，0代表home键在下竖屏模式，-90代表逆时针旋转90度，home键在右，90度代表顺时针旋转90度，home键在左
 * @return {null|AutoImage}
 */
ImageAgentWrapper.prototype.rotateImage = function (img, degree) {
    if (img == null) {
        return null;
    }
    let uuid = imageAgentWrapper.rotateImage(img.uuid, degree);
    if (uuid != null && uuid != "") {
        return new AutoImage(uuid);
    }
    return null;
};


/**
 * 自适应二值化，使用了opencv的adaptiveThreshold函数实现
 * 适配 EC USB 7.16.0+
 * @param img AutoImage图片对象
 * @param map MAP 参数
 *  diameter : 去噪直径 参考opencv的bilateralFilter函数
 *  adaptiveMethod：自适应二值化方式分别是0和1 ，ADAPTIVE_THRESH_MEAN_C=0，ADAPTIVE_THRESH_GAUSSIAN_C = 1
 *  blockSize：计算单位是像素的邻域块，邻域块取多大，就由这个值作决定，3，5，7这样的奇数
 *  c: 偏移值调整量，
 *  {
 *   "diameter":20,
 *   "adaptiveMethod":1,
 *   "c":9,"blockSize":51}
 * @return {null|AutoImage}
 */
ImageAgentWrapper.prototype.binaryzationEx = function (img, map) {
    if (img == null) {
        return null;
    }
    var xd = imageAgentWrapper.binaryzationEx(img.uuid, JSON.stringify(map));
    if (xd != null && xd != undefined && xd != "") {
        return new AutoImage(javaString2string(xd));
    }
    return null;
};
/**
 * 灰度图片
 * 适配EC iOS USB版本 8.18.0+
 * @param img
 * @return {null|AutoImage}
 */
ImageAgentWrapper.prototype.gray = function (img) {
    if (img == null) {
        return null;
    }
    var xd = imageAgentWrapper.gray(img.uuid);
    if (xd != null && xd != undefined && xd != "") {
        return new AutoImage(javaString2string(xd));
    }
    return null;
};

/**
 * 切换图片存储模式为opencv的mat格式
 * 适合EC iOS 7.16.0+
 * 切换后抓图、读取图片、找图、找色等都会切换到mat格式，速度更快内存更少
 * 如果让图片格式切换请参考 imageToMatFormat和matToImageFormat两个函数
 * @param use 1 是 0 否
 * @return {boolean}  true 成功 false 失败
 */
ImageAgentWrapper.prototype.useOpencvMat = function (use) {
    if (imageAgentWrapper == null) {
        return false;
    }
    return imageAgentWrapper.useOpencvMat(use);
};

/**
 * 转换Mat存储格式
 * 适合 EC iOS 7.16.0+
 * @param img {AutoImage} 图片对象
 * @return {null|AutoImage} MAT存储格式的AutoImage 对象或者null
 */
ImageAgentWrapper.prototype.imageToMatFormat = function (img) {
    if (img == null) {
        return null;
    }
    let xd = imageAgentWrapper.imageToMatFormat(img.uuid);
    if (xd != null && xd != undefined && xd != "") {
        return new AutoImage(javaString2string(xd));
    }
    return null;
};

ImageAgentWrapper.prototype.toRectList = function (res) {
    if (res == null || res == "") {
        return null;
    }
    try {
        let ps = JSON.parse(res);
        if (ps == null) {
            return null;
        }
        let d = [];
        for (let i = 0; i < ps.length; i++) {
            d.push(new Rect(ps[i]));
        }
        return d;
    } catch (e) {

    }
    return null;
};
/**
 * 转换普通image存储格式
 * 适合 EC iOS 7.16.0+
 * @param img {AutoImage} 图片对象
 * @return {null|AutoImage} 普通存储格式的AutoImage 对象或者null
 */
ImageAgentWrapper.prototype.matToImageFormat = function (img) {
    if (img == null) {
        return null;
    }
    let xd = imageAgentWrapper.matToImageFormat(img.uuid);
    if (xd != null && xd != undefined && xd != "") {
        return new AutoImage(javaString2string(xd));
    }
    return null;
};


/**
 * 找图。在大图片image中查找小图片template的位置（模块匹配），找到时返回位置坐标区域(Rect)，找不到时返回null。
 * 适合 EC iOS 7.16.0+
 * @param image1     大图片
 * @param template  小图片（模板）
 * @param x         找图区域 x 起始坐标
 * @param y         找图区域 y 起始坐标
 * @param ex 终点X坐标
 * @param ey 终点Y坐标
 * @param weakThreshold  图片相似度。取值范围为0~1的浮点数。默认值为0.9。
 * @param threshold 图片相似度。取值范围为0~1的浮点数。默认值为0.9。
 * @param limit 限制结果的数量，如果要找到1个，就填写1，如果是多个请填写多个
 * @param method 0: TM_SQDIFF平方差匹配法,1: TM_SQDIFF_NORMED归一化平方差匹配方法,2: TM_CCORR相关匹配法,3: TM_CCORR_NORMED归一化相关匹配法,4: TM_CCOEFF系数匹配法,5: TM_CCOEFF_NORMED归一化系数匹配法
 * @return {null|Rect[]} 区域坐标对象数组或者null
 */
ImageAgentWrapper.prototype.findImage = function (image1, template, x, y, ex, ey, weakThreshold, threshold, limit, method) {
    if (imageAgentWrapper == null || image1 == null || template == null) {
        return null;
    }
    let res = imageAgentWrapper.findImage(image1.uuid, template.uuid, x, y, ex - x, ey - y, weakThreshold, threshold, limit, method);
    return this.toRectList(res);
};


/**
 * OpenCV模板匹配封装
 * 适合 EC iOS 7.16.0+
 * @param image1         大图片
 * @param template      小图片（模板）
 * @param weakThreshold 图片相似度。取值范围为0~1的浮点数。默认值为0.9。
 * @param threshold     图片相似度。取值范围为0~1的浮点数。默认值为0.9。
 * @param rect          找图区域。参见findColor函数关于 rect 的说明
 * @param maxLevel      默认为-1，一般而言不必修改此参数。不加此参数时该参数会根据图片大小自动调整。找图算法是采用图像金字塔进行的, level参数表示金字塔的层次,
 *                      level越大可能带来越高的找图效率，但也可能造成找图失败（图片因过度缩小而无法分辨）或返回错误位置。因此，除非您清楚该参数的意义并需要进行性能调优，否则不需要用到该参数。
 * @param limit 限制结果的数量，如果要找到1个，就填写1，如果是多个请填写多个
 * @param method 0: TM_SQDIFF平方差匹配法,1: TM_SQDIFF_NORMED归一化平方差匹配方法,2: TM_CCORR相关匹配法,3: TM_CCORR_NORMED归一化相关匹配法,4: TM_CCOEFF系数匹配法,5: TM_CCOEFF_NORMED归一化系数匹配法
 * @return {null|Match[]} 匹配到的集合
 */
ImageAgentWrapper.prototype.matchTemplate = function (image1, template, weakThreshold, threshold, rect, maxLevel, limit, method) {
    if (imageAgentWrapper == null || image1 == null || template == null) {
        return null;
    }
    let drect = rect == null ? null : rect.toJSONString();
    let res = imageAgentWrapper.matchTemplate(image1.uuid, template.uuid, weakThreshold, threshold, drect, maxLevel, limit, method);
    if (res == null || res == undefined || res == "") {
        return null;
    }
    try {
        let d = JSON.parse(res);
        let x = [];
        for (let i = 0; i < d.length; i++) {
            x.push(new Match(d[i]));
        }
        return x;
    } catch (e) {
    }
    return null;

};



