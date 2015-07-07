define(['plugin/PluginBase', 'plugin/PluginConfig'],
function (PluginBase, PluginConfig) {

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
  this.result.setSuccess(true);
  callback(null, this.result);
};

return AppImporter;

});
