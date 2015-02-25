define(['../common/Util'], function (Util) {
  "use strict";

  var ROOT_PATH = 'ROOT/';

  var AppImporterWorker = function (core, META, rootNode) {
    this.core = core;
    this.META = META;
    this.rootNode = rootNode;
    this.util = new Util(this.core, this.META);
  };

  // 
  AppImporterWorker.prototype.createApp = function (project_path, platform, next) {
    var self = this;
    var fs = require('fs');
    var path = require('path');
    var async = require('async');
    if (!fs.existsSync(path.join(project_path, 'Makefile'))) {
      return next('No Makefile');
    }

    async.parallel([
      function (callback) {
        console.log('do i work');
        self.util.loadNodes(self.rootNode, function (err, nodes) {
          if (err) {
            callback(err);
          } else {
            callback(null, nodes);
          }
        });
      },
      function (callback) {
        self.util.getAppJson(project_path, platform, function (err, app_json) {
          if (err) {
            callback(err);
          } else {
            // app_json = self.util.normalizeProjectPath(app_json, project_path, 'imported-apps');
            // path.join(project_path, 
            callback(null, app_json);
          }
        });
      }
    ],
    function (err, results) {
      if (err) {
        return next(err);
      }
      self.nodes = results[0];
      self.app_json = results[1];

      // console.log('results', results[1]);

      fs.writeFileSync('app_json.js.log', JSON.stringify(results[1], null, '  '));

      // self.createTosObjects(self.nodes, self.app_json, function () {
        next(null);
      // });

    });

  };

  AppImporterWorker.prototype.createTosObjects = function (nodes, app_json, next) {
    var self = this;
    var async = require('async');
    async.series([
      function createInterfaces(callback) {
        var interfacedefs = app_json.interfacedefs;
        var vals = Object.keys(interfacedefs).map(function (key) {
          return interfacedefs[key];
        });
        async.each(vals, function (interfacedef, callback) {
          var exist = nodes[ROOT_PATH + self.util.getPathWithoutExt(interfacedef.file_path)];
          if (!exist) {
            console.log('need to create', interfacedef);
            self.createInterfaceSync(interfacedef, nodes);
          }
          callback();
        }, function (err) {
          if (err) {
            console.log('err in createInterfaces');
            next('Err in AppImporterWorker.createInterfaces');
          } else {
            next();
          }
        });
      },
      function (callback) {

      }
    ],
    function (err, results) {
      next();
    });
  };


  AppImporterWorker.prototype.createInterfaceSync = function (interface_definition, nodes) {
    var self = this;
    var end_folder_node = self.mdSync(interface_definition.file_path, nodes);
    var interface_node = self.core.createNode({
      base: self.META.Interface_Definition,
      parent: end_folder_node
    });
    self.core.setAttribute(interface_node, 'name', interface_definition.name);
    self.core.setAttribute(interface_node, 'path', interface_definition.file_path);
    self.core.setAttribute(interface_node, 'source', interface_definition.file_path);

    TinyOSPopulate.prototype._getSource = function(path) {
      var p = require('path');
      return fs.readFileSync(p.join(process.env.TOSROOT, '/', path), {
        encoding: 'utf8'
      });
    };

  };

  AppImporterWorker.prototype.mdSync = function (component_path, nodes) {
    var self = this;
    var path = require('path');
    var dirs = self.util.getDirs(component_path);
    var curr_path = ROOT_PATH;
    var curr_node = self.rootNode;
    for (var i = 0; i < dirs.length; i++) {
      curr_path = path.join(curr_path, dirs[i]);
      if (!nodes[curr_path]) {
        var dir_node = self.core.createNode({
          base: self.META.Folder,
          parent: curr_node
        });
        self.core.setAttribute(dir_node, 'name', dirs[i]);
        nodes[curr_path] = dir_node;
      }
      curr_node = nodes[curr_path];
    }
    return curr_node;
  };

  AppImporterWorker.prototype.createInterfaces = function (interfacedefs, next) {
    var self = this;
    var async = require('async');
    var vals = Object.keys(interfacedefs).map(function (key) {
      return interfacedefs[key];
    });
    async.each(vals, function (interfacedef, callback) {

      callback();
    }, function (err) {
      if (err) {
        console.log('err in createInterfaces');
        next('Err in AppImporterWorker.createInterfaces');
      } else {
        next();
      }
    });
  };

  return AppImporterWorker;

});
