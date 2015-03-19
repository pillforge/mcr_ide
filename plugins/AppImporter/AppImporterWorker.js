define(['../common/Util', '../common/utils'], function (Util, utils) {
  "use strict";

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
            app_json = self.util.normalizeProjectPath(app_json, project_path, 'imported-apps');
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

      console.log('results', results);

      fs.writeFileSync('app_json.js.log', JSON.stringify(results[1], null, '  '));

      self.createTosObjects(self.nodes, self.app_json, function () {
        next(null);
      });

    });

  };

  AppImporterWorker.prototype.createTosObjects = function (nodes, app_json, next) {
    var self = this;
    var async = require('async');
    this.utils = new utils(this.core, this.META);
    async.series([
      function (callback) {
        var interfacedefs = app_json.interfacedefs;
        var vals = Object.keys(interfacedefs).map(function (key) {
          return interfacedefs[key];
        });
        async.each(vals, function (interfacedef, callback) {
          var exist = nodes['/' + self.utils.get_path_without_ext(interfacedef.file_path)];
          console.log(self.utils.get_path_without_ext(interfacedef.file_path));
          if (!exist) {
            console.log('need to create', interfacedef);
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

  AppImporterWorker.prototype.createInterfaces = function(interfacedefs, next) {
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
