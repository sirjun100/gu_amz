function NodeAgentWrapper() {

}

var nodeAgent = new NodeAgentWrapper();
/**
 * 设置获取节点的基础参数，这个参数可以有效减少获取节点的数量和消耗的时间
 * @param ext 是一个map，例如 {"visibleFilter":100}
 *  visibleFilter 1 代表不管visible是true还是false都获取，2 代表只获取 visible=true的节点
 *  labelFilter 1 代表不管label是否有值都获取，2 代表只获取label有值的节点
 *  boundsFilter 1 代表不过滤 2 bounds 区域属性x,y,w,h都小于0就被过滤
 *  maxDepth 代表要获取节点的层级，建议  1 - 500
 *  maxChildCount 最大获取子节点数量，0代表不限制
 * @return {boolean} true 成功，false 失败
 */
NodeAgentWrapper.prototype.setFetchNodeParam = function (ext) {
    if (nodeAgentWrapper == null) {
        return false;
    }
    return nodeAgentWrapper.setFetchNodeParam(JSON.stringify(ext));
}

/**
 * 通过选择器 获取第一个节点信息
 * @param selectors 选择器
 * @param timeout 超时时间
 * @return {null|NodeInfo} 对象或者null
 */
NodeAgentWrapper.prototype.getOneNodeInfo = function (selectors, timeout) {
    if (nodeAgentWrapper == null) {
        return null;
    }
    var d = nodeAgentWrapper.getOneNodeInfo(selectors.toJSONString(), timeout);
    if (d == null || d == "") {
        return null;
    }
    try {
        d = JSON.parse(d);
        return new NodeInfo(d);
    } catch (e) {

    }
    return null;
};

/**
 * 通过选择器 获取某个节点下的 第一个节点信息
 * 适配版本 EC iOS 中控 5.0.0+
 * @param nodeInfo 节点对象
 * @param selectors 选择器
 * @param timeout
 * @return {null|NodeInfo} 对象或者null
 */
NodeAgentWrapper.prototype.getOneChildNodeInfo = function (nodeInfo, selectors, timeout) {
    if (nodeAgentWrapper == null || nodeInfo == null) {
        return null;
    }
    var d = nodeAgentWrapper.getOneNodeInfoForNode(nodeInfo.nid, selectors.toJSONString(), timeout);
    if (d == null || d == "") {
        return null;
    }
    try {
        d = JSON.parse(d);
        return new NodeInfo(d);
    } catch (e) {

    }
    return null;
};


/**
 * 通过选择器获取节点信息
 * @param selectors 节点选择器
 * timeout 超时时间，单位毫秒
 * @return {null|NodeInfo[]} 节点信息集合 节点对象的信息
 */
NodeAgentWrapper.prototype.getNodeInfo = function (selectors, timeout) {
    if (nodeAgentWrapper == null) {
        return;
    }
    var d = nodeAgentWrapper.getNodeInfo(selectors.toJSONString(), timeout);
    return nodeInfoArray(d);
};

/**
 * 通过选择器 获取某个节点下的 节点信息
 * 适配版本 EC iOS 中控 5.0.0+
 * @param nodeInfo 节点对象
 * @param selectors 选择器
 * @param timeout
 * @return {null|NodeInfo[]} NodeInfo 数组
 */
NodeAgentWrapper.prototype.getChildNodeInfo = function (nodeInfo, selectors, timeout) {
    if (nodeAgentWrapper == null || nodeInfo == null) {
        return null;
    }
    var d = nodeAgentWrapper.getNodeInfoForNode(nodeInfo.nid, selectors.toJSONString(), timeout);
    return nodeInfoArray(d);
};

/**
 * 锁定当前节点，锁定后，后面就算界面刷新，但是节点还是老的信息，需要和releaseNode进行配合才能进行解锁
 * 适配版本 EC iOS 中控 5.0.0+
 */
NodeAgentWrapper.prototype.lockNode = function () {
    if (nodeAgentWrapper == null) {
        return null;
    }
    nodeAgentWrapper.lockNode();
};
/**
 * 释放节点的锁，释放后，当界面刷新的时候，节点信息会变成最新的
 * 适配版本 EC iOS 中控 5.0.0+
 */
NodeAgentWrapper.prototype.releaseNode = function () {
    if (nodeAgentWrapper == null) {
        return null;
    }
    nodeAgentWrapper.releaseNode();
};

/**
 *
 * @return {null|string}
 */
NodeAgentWrapper.prototype.dumpXml = function () {
    if (nodeAgentWrapper == null) {
        return null;
    }
   return nodeAgentWrapper.dumpXml();
};



/**
 * 在当前节点前面的兄弟节点
 * @param nodeInfo NodeInfo 节点对象
 * @return {null|NodeInfo[]} 数组 选择到的节点集合
 */
NodeAgentWrapper.prototype.previousSiblings = function (nodeInfo) {
    if (nodeAgentWrapper == null || nodeInfo == null) {
        return null;
    }
    var d = nodeAgentWrapper.getPreviousSiblingNodeInfo(nodeInfo.nid);
    return nodeInfoArray(d);
};

/**
 * 在当前节点前面的兄弟节点
 * @param nodeInfo NodeInfo 节点对象
 * @return   {null|NodeInfo[]} 数组 选择到的节点集合
 */
NodeAgentWrapper.prototype.nextSiblings = function (nodeInfo) {
    if (nodeAgentWrapper == null || nodeInfo == null) {
        return null;
    }
    var d = nodeAgentWrapper.getNextSiblingNodeInfo(nodeInfo.nid);
    return nodeInfoArray(d);
};
/**
 * 当前节点的所有兄弟节点
 * @param nodeInfo NodeInfo 节点对象
 * @return   {null|NodeInfo[]} 数组 选择到的节点集合
 */
NodeAgentWrapper.prototype.siblings = function (nodeInfo) {
    if (nodeAgentWrapper == null || nodeInfo == null) {
        return null;
    }
    var d = nodeAgentWrapper.getSiblingNodeInfo(nodeInfo.nid);
    return nodeInfoArray(d);
};


/**
 * 取得所有子节点
 * @param nodeInfo NodeInfo 节点对象
 * @return   {null|NodeInfo[]} 数组 选择到的节点集合
 */
NodeAgentWrapper.prototype.allChildren = function (nodeInfo) {
    if (nodeAgentWrapper == null) {
        return null;
    }
    var d = nodeAgentWrapper.getNodeInfoAllChildren(nodeInfo.nid);
    return nodeInfoArray(d);
};

/**
 * 取得父级
 * @param nodeInfo NodeInfo 节点对象
 * @return {null|NodeInfo} NodeInfo 对象|null
 */
NodeAgentWrapper.prototype.parent = function (nodeInfo) {
    if (nodeAgentWrapper == null || nodeInfo == null) {
        return null;
    }
    var d = nodeAgentWrapper.getNodeInfoParent(nodeInfo.nid);
    if (d == null || d == "") {
        return null;
    }
    try {
        d = JSON.parse(d);
        return new NodeInfo(d);
    }catch (e){
    }
    return null;
};

/**
 * 取得单个子节点
 * @param nodeInfo NodeInfo 节点对象
 * @param index 子节点的索引
 * @return {null|NodeInfo} NodeInfo 对象|null
 */
NodeAgentWrapper.prototype.child = function (nodeInfo, index) {
    if (nodeAgentWrapper == null || nodeInfo == null) {
        return null;
    }
    var d = nodeAgentWrapper.getNodeInfoChild(nodeInfo.nid, index);
    if (d == null || d == "") {
        return null;
    }
    try {
        d = JSON.parse(d);
        return new NodeInfo(d);
    }catch (e){
    }
    return null;
};


