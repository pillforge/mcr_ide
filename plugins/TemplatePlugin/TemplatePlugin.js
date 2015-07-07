define(['plugin/PluginBase', 'plugin/PluginConfig'],
function (PluginBase, PluginConfig) {

'use strict';

var TemplatePlugin = function () {
  PluginBase.call(this);
};

TemplatePlugin.prototype = Object.create(PluginBase.prototype);
TemplatePlugin.prototype.constructor = TemplatePlugin;
TemplatePlugin.prototype.getName = function () {
  return "TemplatePlugin";
};
TemplatePlugin.prototype.getVersion = function () {
  return '0.0.0';
};

TemplatePlugin.prototype.main = function (callback) {
  self.result.setSuccess(true);
  callback(null, self.result);
};

return TemplatePlugin;

});
