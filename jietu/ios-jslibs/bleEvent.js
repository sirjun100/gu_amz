function BleEventWrapper() {

}

let bleEvent = new BleEventWrapper();
/**
 * 根据 iPhone 硬件标识符的前缀（忽略逗号后数字）返回缩放值
 * @returns {number} 浮点型 缩放比例
 */
BleEventWrapper.prototype.getIPhoneScale = function () {
    let ab = device.getDeviceMsg() + "";
    let id = null;
    try {
        id = JSON.parse(ab)["productType"]
    } catch (e) {
    }
    if (!id) return 2.00;
    // 提取前缀，例如 "iPhone12,1" -> "iPhone12"
    const prefix = id.split(',')[0];
    // 映射索引：根据你提供的代际逻辑
    const index = {
        "iPhone7": 1.95, // iPhone 6 Plus (7,1)
        "iPhone8": 2.00, // iPhone 6s 系列 (8,1 / 8,2)
        "iPhone9": 2.00, // iPhone 7 系列 (9,1 / 9,2)
        "iPhone10": 1.98, // iPhone 8/X 系列 (10,1 - 10,6)
        "iPhone11": 1.96, // iPhone XR / XS 系列 (11,x)
        "iPhone12": 1.96, // iPhone 11 系列 (12,x) -> 你的要求: iPhone12,1 结果为 1.96
        "iPhone13": 1.97, // iPhone 12 系列 (13,x)
        "iPhone14": 1.97, // iPhone 13 系列 (14,x)
        "iPhone15": 1.97, // iPhone 14 系列 (15,x)
        "iPhone16": 1.97, // iPhone 15 系列 (16,x)
        "iPhone17": 1.97  // iPhone 16 系列 (17,x)
    };

    // 返回对应值，若未匹配则默认返回 2.00
    return index[prefix] || 2.00;
}

/**
 * 强制刷新串口和mac的对应关系
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 * */
BleEventWrapper.prototype.forceRefreshSerialPort = function () {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.forceRefreshSerialPort();
}

/**
 * 设置鼠标补偿比率
 * 鼠标移动1单位，像素移动多少单位，这样的比率，默认是2.0
 * iPhone 6/7/8	375 x 667 设置为 2.0，标准 16:9，无安全区干扰。
 * iPhone 11 / XR	414 x 896	设置为 1.96	屏幕变长，系统加速补偿 Y 轴。
 * iPhone X/XS/11Pro	375 x 812	设置为 1.98	纵横比 19.5:9，存在微小加速。
 * iPhone 12/13/14/15	390 x 844	设置为 1.97	逻辑点数与 11 不同，加速曲线略有变动。
 * Plus / Max 系列	414 x 896 / 430 x 932 设置为1.94 ~ 1.95	屏幕最高，系统为了操作效率会大幅增加 Y 轴增益。
 * 适配EC iOS USB版本9.20.0+
 * @param x_scale x坐标系浮点数
 * @param y_scale x坐标系浮点数
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.setScale = function (x_scale, y_scale) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.setScale(x_scale, y_scale);
};


/**
 * 设置屏幕尺寸
 * 这个用来防止鼠标移动到屏幕外，导致鼠标偏移
 * 如果不知道屏幕尺寸，就使用截图后的图片的宽度和高度
 * 适配EC iOS USB版本9.20.0+
 * @param w 屏幕的宽度
 * @param h 屏幕的高度
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.setScreenSize = function (w, h) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.setScreenSize(w, h);
};
/**
 * 打开串口通信
 * 适配EC iOS USB版本9.20.0+
 * @param timeout 串口通信超时时间 单位是毫秒 默认是15秒
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.openSerial = function (timeout) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.openSerial(timeout);
};
/**
 * 设置串口超时
 * 适配EC iOS USB版本9.20.0+
 * @param out 串口通信超时时间 单位是毫秒 默认是15秒
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.setSerialTimeout = function (out) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.setSerialTimeout(out);
};
/**
 * 设置通信方式
 * 用来设置是通过串口还是通过网络和开发板通信
 * 默认是 串口
 * 适配EC iOS USB版本9.20.0+
 * @param tt 1 串口 2 网络
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.setSendCmdType = function (tt) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.setSendCmdType(tt);
};


/**
 * 设置网络信息
 * 方便开发板联网
 * 适配EC iOS USB版本9.20.0+
 * @param name WiFi名称
 * @param pwd WiFi 密码
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.setWifiInfo = function (name, pwd) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.setWifiInfo(name, pwd);
};
/**
 * 重启开发板
 * 相当于按了开发板的RST键
 * 适配EC iOS USB版本9.20.0+
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.resetBle = function () {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.resetBle();
};


/**
 * 关闭串口通信
 * 适配EC iOS USB版本9.20.0+
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.closeSerial = function () {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.closeSerial();
};


/**
 * 移动鼠标
 * 只移动鼠标，没有按下动作
 * 适配EC iOS USB版本9.20.0+
 * @param x X坐标
 * @param y Y坐标
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.mouseMove = function (x, y) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.mouseMove(x, y);
};


/**
 * 鼠标归零
 * 鼠标移动到0,0的右上角坐标
 * 适配EC iOS USB版本9.20.0+
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.resetZero = function () {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.resetZero();
};


/**
 * 按下坐标点
 * 适配EC iOS USB版本9.20.0+
 * @param x X坐标
 * @param y Y坐标
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.touchDown = function (x, y) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.touchDown(x, y);
};

/**
 * 移动坐标点
 * 适配EC iOS USB版本9.20.0+
 * @param x X坐标
 * @param y Y坐标
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.touchMove = function (x, y) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.touchMove(x, y);
};

/**
 * 抬起坐标点
 * 适配EC iOS USB版本9.20.0+
 * @param x X坐标
 * @param y Y坐标
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.touchUp = function (x, y) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.touchUp(x, y);
};


/**
 * 点击坐标点
 * 适配EC iOS USB版本9.20.0+
 * @param x X坐标
 * @param y Y坐标
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.clickPoint = function (x, y) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.clickPoint(x, y);
};
/**
 * 长按坐标
 * 适配EC iOS USB版本9.20.0+
 * @param x x坐标
 * @param y y坐标
 * @param delay 长按时间  毫秒
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.press = function (x, y, delay) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.press(x, y, delay)
};


/**
 * 双击坐标
 * 适配EC iOS USB版本9.20.0+
 * @param x X坐标
 * @param y Y坐标
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.doubleClickPoint = function (x, y) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.doubleClickPoint(x, y);
};


/**
 * 从一个坐标到另一个坐标的滑动
 * 适配EC iOS USB版本9.20.0+
 * @param startX 起始坐标的X轴值
 * @param startY 起始坐标的Y轴值
 * @param endX   结束坐标的X轴值
 * @param endY   结束坐标的Y轴值
 * @param duration 持续时长 单位毫秒
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.swipeToPoint = function (startX, startY, endX, endY, duration) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.swipeToPoint(startX, startY, endX, endY, duration);
};


/**
 * 多点触摸<br/>
 * 触摸参数: action :一般情况下 按下为0，弹起为1，移动为2<br/>
 * x: X坐标<br/>
 * y: Y坐标<br/>
 * pointer：设置第几个手指触摸点，分别是 1，2，3等，代表第n个手指<br/>
 * delay: 该动作延迟多少毫秒执行
 * 适配EC iOS USB版本9.20.0+
 * @param touch1 第1个手指的触摸点数组,例如：[{"action":0,"x":1,"y":1,"pointer":1,"delay":20},{"action":2,"x":1,"y":1,"pointer":1,"delay":20}]
 * @param timeout 多点触摸执行的超时时间，单位是毫秒
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.multiTouch = function (touch1, timeout) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    let x = JSON.stringify(touch1);
    return bleEventWrapper.multiTouch(x, timeout);
};

/**
 * 系统按键
 * 适配EC iOS USB版本9.20.0+
 * @param key 目前有 home,recents=最近的任务
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.systemKey = function (key) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.systemKey(key);
};


/**
 * 按键
 * 适配EC iOS USB版本9.20.0+
 * @param prefix 组合键，可以为空 alt=alt按键，ctrl=CTRL按键,gui=win或者command键，r_ctrl=右侧CTRL键，r_shift=右侧shift键，shift=shift键
 * @param code 整型，例如 65,ASCII码，参考 https://tool.oschina.net/commons?type=4
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.keyPress = function (prefix, code) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.keyPress(prefix, code);
};
/**
 * 字符按键
 * 适配EC iOS USB版本9.20.0+
 * @param prefix 组合键，可以为空 alt=alt按键，ctrl=CTRL按键,gui=win或者command键，r_ctrl=右侧CTRL键，r_shift=右侧shift键，shift=shift键
 * @param code 字符，例如 a
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.keyPressChar = function (prefix, code) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.keyPressChar(prefix, code);
};
/**
 * 开关软键盘
 * 实际在测试iphone7的系统上，蓝牙连接后，输入框无法弹出软键盘配合脱机主程序实现输入，可以试试这个方法，iPhone11没有这样问题，跟系统版本有关系
 * 如果你不用脱机主程序作为输入法，忽略这个方法
 * 适配EC iOS USB版本9.20.0+
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.toggleSoftKeyboard = function () {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.toggleSoftKeyboard();
};

/**
 * 设置步伐大小
 * 适配EC iOS USB版本9.20.0+
 * @param step 10 - 120 移动鼠标每一步最大的值，值越大移动越快默认是100
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.setStep = function (step) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.setStep(step);
};


/**
 * 点亮LED
 * 适配EC iOS USB版本 9.21.0+
 * @param num 循环点亮次数
 * @param lightToOff 从亮到灭过程的时间 单位毫秒
 * @param offToLight 从灭再到亮的过程时间 单位毫秒
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.light = function (num, lightToOff, offToLight) {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.light(num,lightToOff, offToLight);
};


/**
 * 显示蓝牙名称
 * 适配EC iOS USB版本 9.21.0+
 * 有助于能够搜索到
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.showBleName = function () {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.showBleName();
};


/**
 * 隐藏蓝牙名称
 * 防检测
 * 适配EC iOS USB版本 9.21.0+
 * @returns {string} null或者空字符串，代表成功，其他代表错误信息
 */
BleEventWrapper.prototype.hideBleName = function () {
    if (bleEventWrapper == null) {
        return "无实例";
    }
    return bleEventWrapper.hideBleName();
};