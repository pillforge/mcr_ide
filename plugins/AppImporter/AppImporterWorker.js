define(['../common/Util'], function (Util) {
  "use strict";

  var AppImporterWorker = function (core, META) {
    this.core = core;
    this.META = META;
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
        self.util.loadNodes();
        callback(null, 'loadNodes');
      },
      function (callback) {
        self.util.getAppJson(project_path, platform, function (err, app_json) {
          if (err) {
            callback(err);
          } else {
            callback(null, app_json);
          }
        });
      }
    ],
    function (err, results) {
      if (err) {
        return next(err);
      }
      next(null);
    });

  };

  return AppImporterWorker;

});
