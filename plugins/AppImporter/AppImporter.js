define(['plugin/PluginBase', 'plugin/PluginConfig', 'path', '../utils/LoadObjects', '../utils/NescUtils'],
function (PluginBase, PluginConfig, path, load_objects, nesc_utils) {

'use strict';

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
  var core = self.core;
  var log = self.logger;
  var async = require('async');

  var app_path = path.resolve(process.env.TOSROOT, 'apps', 'Blink', 'BlinkAppC.nc');

  var cwp = core.getRegistry(self.rootNode, 'configuration_paths');
  var mwp = core.getRegistry(self.rootNode, 'module_paths');

  async.parallel([
    function (callback) {
      load_objects.loadComponents.call(self, cwp, mwp, callback);
    },
    function (callback) {
      nesc_utils.getAppJson(app_path, callback);
    }
  ],
  function (err, results) {
    if (err) {
      log.info(err);
      return callback(null, self.result);
    }
    self._nodes = results[0];
    self._app_json = results[1];
    self.result.setSuccess(true);
    callback(null, self.result);
  });

};

return AppImporter;

});
