define(['logManager', '../common/Util', 'path'], function (LogManager, Util, path) {
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
          // self.logger.warn(src + ' ' + dst);
          var parent_of_dst = get_parent_path(dst);
          if (!units[parent_of_dst].parameters)
            units[parent_of_dst].parameters = {};
          units[parent_of_dst].parameters[src] = dst;
        }
      }

      for (var msg_flow in msg_flows) {
        var msg_flow_node = nodes[msg_flow];
        var src = self.core.getPointerPath(msg_flow_node, 'src');
        var dst = self.core.getPointerPath(msg_flow_node, 'dst');
        var src_node = nodes[src];
        var dst_node = nodes[dst];
        var parent_of_src = get_parent_path(src);
        var parent_of_dst = get_parent_path(dst);
        if (!units[parent_of_dst].messages)
          units[parent_of_dst].messages = {};
        units[parent_of_dst].messages[src] = dst;
      }

      var fs = require('fs-extra');
      var folder = 'build/temp-rcw-hu';
      fs.removeSync(folder);
      fs.mkdirpSync(folder);

      for (var unit_id in units) {
        self.handleUnit(unit_id, units[unit_id], nodes, folder);
      }

      

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

  RobotCompilerWorker.prototype.handleUnit = function(unit_id, unit, nodes, folder) {
    var self = this;

    self.util.saveChildrenAsFiles(unit_id, nodes, folder);

    var port_connections = self.core.getAttribute(nodes[unit_id], 'port_connections');
    if (!port_connections) return false;

    for (var parameter in unit.parameters) {
      var src_id = parameter;
      var dst_id = unit.parameters[parameter];
      var value = self.core.getAttribute(nodes[src_id], 'value');
      var name = self.core.getAttribute(nodes[dst_id], 'name');
      updateTheLine('#define ' + name, '#define ' + name + ' ' + value, path.join(folder, port_connections));
    }

    for (var message in unit.messages) {
      var src_id = message;
      var dst_id = unit.messages[message];
      console.log('here', src_id, dst_id);
      var type_parameters = self.core.getAttribute(nodes[dst_id], 'type_parameters');
      var value = self.core.getAttribute(nodes[src_id], 'type_parameters');
      console.log(type_parameters);
      updateTheLine('#define ' + type_parameters, '#define ' + type_parameters + ' ' + value, path.join(folder, port_connections));
    }

    function updateTheLine(where, to, path) {
      var fs = require('fs');
      var file = fs.readFileSync(path, 'utf8');
      var re = new RegExp(where + ".*");
      file = file.replace(re, to);
      fs.writeFileSync(path, file);
    }

  };

  return RobotCompilerWorker;

});
