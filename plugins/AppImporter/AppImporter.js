define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  './AppImporterWorker',
  '../../config.json'
  ],
  function (PluginBase, PluginConfig, AppImporterWorker, config_json) {
    "use strict";

    var AppImporter = function () {
      PluginBase.call(this);
    };
    AppImporter.prototype = Object.create(PluginBase.prototype);
    AppImporter.prototype.constructor = AppImporter;
    AppImporter.prototype.getName = function () {
      return "AppImporter";
    };
    AppImporter.prototype.getVersion = function () {
      return '0.0.0';
    };

    AppImporter.prototype.main = function (callback) {
      var self = this;
      // var project_path = '/home/hakan/Documents/tinyos-apps/Icra2015Expt/Base/';
      var project_path = '/home/hakan/Documents/tinyos-apps/SenseAndSend/modular/';
      var platform = config_json.platform || 'exp430';
      var aiw = new AppImporterWorker(self.core, self.META, self.rootNode);
      aiw.createApp(project_path, platform, function (err) {
        if (err) {
          return callback(err, self.result);
        }
        self.save('saving', function () {
          self.result.setSuccess(true);
          callback(null, self.result);
        });
      });
    };

    return AppImporter;
});
