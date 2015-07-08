define(['plugin/PluginBase', 'plugin/PluginConfig', 'path', '../utils/LoadObjects'],
function (PluginBase, PluginConfig, path, load_objects) {

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
  var app_path = path.resolve(process.env.TOSROOT, 'apps', 'Blink', 'BlinkAppC.nc');

  var cwp = core.getRegistry(self.rootNode, 'configuration_paths');
  var mwp = core.getRegistry(self.rootNode, 'module_paths');

  load_objects.loadComponents.call(self, cwp, mwp, function (nodes) {
    log.info(app_path);
    self.result.setSuccess(true);
    callback(null, self.result);
  });

};

return AppImporter;

});
