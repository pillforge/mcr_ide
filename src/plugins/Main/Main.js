define(['plugin/PluginConfig', 'plugin/PluginBase', 'project_src/plugins/utils/ModuleUtil'],
function (PluginConfig, PluginBase, ModuleUtil) {
  'use strict';

  /**
   * Initializes a new instance of Main.
   * @class
   * @augments {PluginBase}
   * @classdesc This class represents the plugin Main.
   * @constructor
   */
  var Main = function () {
    PluginBase.call(this);
  };

  Main.prototype = Object.create(PluginBase.prototype);
  Main.prototype.constructor = Main;

  /**
   * @returns {string} The name of the plugin.
   * @public
   */
  Main.prototype.getName = function () {
    return 'Main';
  };

  /**
   * @returns {string} The version of the plugin.
   * @public
   */
  Main.prototype.getVersion = function () {
    return '0.1.0';
  };

  /**
   * @param {function(string, plugin.PluginResult)} callback - the result callback
   */
  Main.prototype.main = function (callback) {
    var self = this;
    var node = self.activeNode;
    if (self.core.isTypeOf(node, self.META.Module)) {
      var module_util = new ModuleUtil(self, node);
      module_util.generateModule()
        .then (function () {
          self.save('Internal structure of a module is generated', function (err) {
            if (err) {
              return callback(err, self.result);
            }
            self.result.setSuccess(true);
            callback(null, self.result);
          });
        });
    } else {
      self.result.setSuccess(true);
      callback(null, self.result);
    }

  };

  return Main;
});
