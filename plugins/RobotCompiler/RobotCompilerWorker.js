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
        var input_flow_node = nodes[input_flow];
        var src = self.core.getPointerPath(input_flow_node, 'src');
        var dst = self.core.getPointerPath(input_flow_node, 'dst');
        var src_node = nodes[src];
        var dst_node = nodes[dst];
        if (self.core.isTypeOf(dst_node, self.META.Port)) {
          self.logger.warn(src + ' ' + dst);
          var parent_of_dst = get_parent_path(dst);
          if (!units[parent_of_dst].parameters)
            units[parent_of_dst].parameters = {};
          units[parent_of_dst].parameters[src] = dst;
        }
      }

      self.handleUnit(units['/187823436/1419722536/1652068488'], nodes);

      callback();

      function populate (children, type) {
        var obj = {};
        children.forEach(function (child_id) {
          var child = nodes[child_id];
          if (self.core.isTypeOf(child, type))
            obj[child_id] = {
              obj: child
            }
        });
        return obj;
      }

      function get_parent_path (path) {
        return path.substr(0, path.lastIndexOf('/'));
      }

    });
  };

  RobotCompilerWorker.prototype.handleUnit = function(unit, nodes) {
    console.log(unit);
  };

  return RobotCompilerWorker;

});
