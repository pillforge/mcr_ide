define(['logManager', '../common/Util'], function (LogManager, Util) {
  "use strict";

  var RobotCompilerWorker = function (core, META, rootNode) {
    this.core = core;
    this.META = META;
    this.rootNode = rootNode;
    this.logger = LogManager.create('RobotCompilerWorker');
    this.util = new Util(this.core, this.META, this.rootNode);
  };

  RobotCompilerWorker.prototype.compileRobot = function(robot_node_id, callback) {
    var self = this;
    self.util.loadNodesId(robot_node_id, function (err, nodes, robot_node) {
      self.logger.warn('err loadNodesId ' + err);

      var children = self.core.getChildrenPaths(robot_node);
      var units = populate(children, self.META.Unit);
      var argument_rs = populate(children, self.META.Argument_R);
      var input_flows = populate(children, self.META.Input_Flow);
      var msg_flows = populate(children, self.META.Message_Flow);

      for (var input_flow in input_flows) {
      }


      // self.handleUnit('/187823436/1419722536/1652068488', nodes);

      callback();

      function populate (children, type) {
        var obj = {};
        children.forEach(function (child_id) {
          var child = nodes[child_id];
          if (self.core.isTypeOf(child, type))
            obj[child_id] = child;
        });
        return obj;
      }

    });
  };

  RobotCompilerWorker.prototype.handleUnit = function(unit_id, nodes) {
    
  };

  return RobotCompilerWorker;

});
