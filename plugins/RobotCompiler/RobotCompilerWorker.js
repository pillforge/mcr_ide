define(['../common/Util', 'path'], function (Util, path) {
  "use strict";

  var RobotCompilerWorker = function (core, META, rootNode, logger) {
    this.core = core;
    this.META = META;
    this.rootNode = rootNode;
    this.logger = logger;
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

      var implementation_message_connections = [];
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
        var src_app_data = self.core.getAttribute(nodes[parent_of_src], 'app').split(' ')[1];
        var dst_app_data = self.core.getAttribute(nodes[parent_of_dst], 'app').split(' ')[1];
        implementation_message_connections.push(dst_app_data + '.Message -> ' + src_app_data + ';');
      }

      var fs = require('fs-extra');
      var folder = 'build/temp-rcw-hu';
      fs.removeSync(folder);
      fs.mkdirpSync(folder);

      for (var unit_id in units) {
        self.handleUnit(unit_id, units[unit_id], nodes, folder);
      }

      // generate robot app configuration
      var robot_name = self.core.getAttribute(robot_node, 'name');
      var headers = '';
      var implementation = '';
      for (var unit_id in units) {
        var app_data = self.core.getAttribute(nodes[unit_id], 'app').split(' ');
        var app_name = app_data[0];
        var file = fs.readFileSync(path.join(folder, app_name) + '.nc', 'utf8');
        var parsed = parse_file(file);

        //fix the orders
        headers = parsed.headers + headers;
        implementation += parsed.implementation;

      }

      implementation += implementation_message_connections.join('\n');

      var configuration = 'configuration ' + robot_name + ' {\n}';
      var robot_app_file = headers + configuration + '\nimplementation {\n'
        + implementation + '\n}';

      var makefile = 'COMPONENT=' + robot_name + '\n';
      makefile += 'include $(MAKERULES)';

      fs.writeFileSync(path.join(folder, robot_name) + '.nc', robot_app_file);
      fs.writeFileSync(path.join(folder, 'Makefile'), makefile);

      var make_cmd = "make " + 'exp430';
      var options = {};
      var exec = require('child_process').exec;
      var process = require('process');
      process.chdir(folder);
      exec(make_cmd, options, function (error, stdout, stderr) {
        self.logger.info('exec()');
        if (error !== null) {
          self.logger.error('exec make: ' + error);
          // self._cleanUp();
          process.chdir('../..');
          callback(error);
        } else {
          // return the app.c as downloadable
          self.logger.info('return binary');
          process.chdir('../..');
          // var appc_location = path.resolve('build', self.platform, 'app.c');
          // var appc_content = fs.readFileSync(appc_location, 'utf8');
          // self._cleanUp();
          callback(null, 'compiled in the folder: ' + folder + '/build/exp430');
        }
      });

      function parse_file (file) {
        var lines = file.split('\n');
        var rsl_arr = ['', '', ''];
        var curr = 0;
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.search('configuration') >= 0) {
            curr = 1;
            continue;
          }
          if (line.search('implementation') >= 0) {
            curr = 2;
            continue;
          }
          rsl_arr[curr] += line + '\n';
        }
        var last_occurence = rsl_arr[2].lastIndexOf('}');
        rsl_arr[2] = rsl_arr[2].substr(0, last_occurence);
        return {
          headers: rsl_arr[0],
          implementation: rsl_arr[2]
        };
      }

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
