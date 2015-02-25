define([], function () {
  "use strict";

  var RobotCompilerWorker = function (core, META, rootNode) {
    this.core = core;
    this.META = META;
    this.rootNode = rootNode;
  };

  RobotCompilerWorker.prototype.compileRobot = function(robot_node_id, callback) {
    
    callback();
  };

  return RobotCompilerWorker;

});
