function Yolov8AgentWrapper() {

}

let yolov8Agent = new Yolov8AgentWrapper();

function Yolov8AgentUtil(instance) {
    this.yolov8AgentId = instance;
}

/**
 * 获取YOLOV8错误消息
 * 适配EC 9.0.0+
 * @return {string} 字符串
 */
Yolov8AgentUtil.prototype.getErrorMsg = function () {
    return ocrAgentWrapper.yolo_getYolov8ErrorMsg(this.yolov8AgentId);
}

/**
 * 获取 yolov8 默认配置
 * 适配EC 9.0.0+
 * @param model_name 模型名称 默认写  yolov8s-640 即可
 * @param input_size yolov8训练时候的imgsz参数，默认写640即可
 * @param box_thr 检测框系数，默认写0.25即可
 * @param iou_thr 输出系数，，默认写0.35 即可
 * @param bind_cpu 是否绑定CPU，选项为ALL,BIG,LITTLE 三个,默认写ALL
 * @param use_vulkan_compute 是否启用硬件加速，1是，0否
 * @param obj_names JSON数组，训练的时候分类名称例如 ["star","common","face"]
 * @return {null|JSON} 数据
 */
Yolov8AgentUtil.prototype.getDefaultConfig = function (model_name, input_size, box_thr, iou_thr, bind_cpu, use_vulkan_compute, obj_names) {
    if ((typeof obj_names) == "string") {
        obj_names = obj_names.split(",");
    }
    let data = {
        "name": "yolov8s-640",
        "input_size": 640,
        "box_thr": 0.25,
        "iou_thr": 0.35,
        "ver": 8,
        "bind_cpu": "ALL",
        "use_vulkan_compute": 0,
        "input_name": "in0",
        "names": [],
        "outputs": [{
            "name": "out0", "stride": 0, "anchors": [0, 0]
        }]
    }
    data["name"] = model_name;
    data["names"] = obj_names;
    data["input_size"] = input_size;
    data["box_thr"] = box_thr;
    data["iou_thr"] = iou_thr;
    data["num_thread"] = 4;
    data["use_vulkan_compute"] = use_vulkan_compute;
    data["bind_cpu"] = bind_cpu;
    return data;
}
/**
 * ONNX的配置选项
 * @param obj_names obj_names JSON数组，可以不写的情况下，onnx从模型中获取，训练的时候分类名称例如 ["star","common","face"]
 * @param input_width 训练的图片尺寸宽度，写0 就是onnx自己提取
 * @param input_height 训练的图片尺寸高度，写0 就是onnx自己提取
 * @param confThreshold 指在ONNX模型推理过程中用于确定检测目标的最小置信度阈值
 * @param iouThreshold 阈值在ONNX模型中用于确定检测框的重叠程度，通常用于非极大值抑制（NMS）过程中
 * @param numThread 线程数量 一般为cpu个数的一般，如果不知道 不写即可
 * @return {JSON}
 */
Yolov8AgentUtil.prototype.getOnnxConfig = function (obj_names, input_width, input_height, confThreshold, iouThreshold, numThread) {
    if ((typeof obj_names) == "string") {
        obj_names = obj_names.split(",");
    }
    let data = {
        "names": [], "confThreshold": 0.35, "iouThreshold": 0.55, "imgWidth": 0, "imgHeight": 0, "numThread": 0
    }
    data["imgWidth"] = input_width;
    data["imgHeight"] = input_height;
    data["iouThreshold"] = iouThreshold;
    data["confThreshold"] = confThreshold;
    data["numThread"] = numThread;
    if (obj_names != null && obj_names.length > 0) {
        data["names"] = obj_names;
    }
    return data;
}

/**
 * 初始化yolov8模型
 * 具体如何生成param和bin文件，请参考文件的yolo使用章节，通过yolo的pt转成ncnn的param、bin文件,
 * 对于onnx模型，binPath参数写null即可，paramPath是onnx文件路径
 * 适配EC 9.0.0
 * @param map 参数表 ncnn参考 getDefaultConfig函数获取默认的参数，onnx参考getOnnxConfig函数
 * @param paramPath param文件路径
 * @param binPath bin文件路径
 * @return {boolean} true代表成功 false代表失败
 */
Yolov8AgentUtil.prototype.initYoloModel = function (map, paramPath, binPath) {
    if (map == null) {
        return false;
    }
    let data = JSON.stringify(map);
    return ocrAgentWrapper.yolo_initYoloModel(this.yolov8AgentId, data, paramPath, binPath);
}


/**
 * 检测图片
 * 适配EC 9.0.0+
 * 返回数据例如
 * [{"name":"heart","confidence":0.92,"left":957,"top":986,"right":1050,"bottom":1078}]
 * name: 代表是分类，confidence:代表可信度，left,top,right,bottom代表结果坐标选框
 * @param image AutoImage对象
 * @param obj_names JSON数组，不写代表不过滤，写了代表只取填写的分类
 * @return {null|string} 字符串数据
 */
Yolov8AgentUtil.prototype.detectImage = function (image, obj_names) {
    if (image == null) {
        return null;
    }
    if (obj_names == null || obj_names == undefined) {
        obj_names = "[]"
    } else {
        obj_names = JSON.stringify(obj_names)
    }
    return ocrAgentWrapper.yolo_detectImage(this.yolov8AgentId, image.uuid, obj_names);
}


/**
 * 释放yolov8资源
 * 适配EC 9.0.0+
 * @return {boolean}
 */
Yolov8AgentUtil.prototype.release = function () {
    return ocrAgentWrapper.yolo_releaseYolo(this.yolov8AgentId);
}

/**
 * 初始化yolov8实例
 * 适配EC 9.0.0+
 * @return  {Yolov8AgentUtil} 实例对象
 */
Yolov8AgentWrapper.prototype.newYolov8 = function () {
    let instance = ocrAgentWrapper.yolo_newYolov8();
    return new Yolov8AgentUtil(instance)
}

/**
 * 释放所有yolo实例
 * @return {*}
 */
Yolov8AgentWrapper.prototype.releaseAll = function () {
    return ocrAgentWrapper.yolo_releaseAllYolo();
}



/**
 * 初始化yolov8实例( onnx 版本)
 * @return  {Yolov8AgentUtil} 实例对象
 */
Yolov8AgentWrapper.prototype.newYolov8Onxx = function () {
    let instance = ocrAgentWrapper.yolo_newOnnxYolov8();
    return new Yolov8AgentUtil(instance)
}


Yolov8AgentWrapper.prototype.newYolov8Onnx = function () {
    let instance = ocrAgentWrapper.yolo_newOnnxYolov8();
    return new Yolov8AgentUtil(instance)
}
