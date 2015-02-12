define(['../common/Util'], function (Util) {
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
            callback(null, 'loadNodes');
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

      next(null);
    });

  };

  return AppImporterWorker;

});
