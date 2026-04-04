/** TODO: 在 AMG 内按配置顺序点选环境 */
function 按顺序选择环境() {

  AMZ_执行标准步骤("AMG选择环境", function () {
    var 备份记录节点 = name("备份记录").getOneNodeInfo(5000);
    if(备份记录节点){
      日志收集器.添加('找到了 备份记录 节点,点击')
      备份记录节点.clickCenter();
    }else{

      var 下一条节点 = name("下一条").getOneNodeInfo(5000);
      下一条节点.clickCenter();
      日志收集器.添加('点击了 [下一条]')
      sleep(8000);
      return;
    }
    sleep(1000);
    var 下一条节点2 = name("下一条").getOneNodeInfo(5000);
    下一条节点2.clickCenter();
    日志收集器.添加('点击了 [下一条]')
    sleep(6000);
    return;
  });
}
