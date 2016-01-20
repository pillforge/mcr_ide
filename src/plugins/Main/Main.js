define([ 'plugin/PluginConfig',
         'plugin/PluginBase',
         'project_src/plugins/utils/ModuleUtil',
         'project_src/plugins/utils/NescUtil'
], function (PluginConfig, PluginBase, ModuleUtil, NescUtil) {
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
    var path = require('path');

    // if (!self._currentConfig) self._currentConfig = {};

    switch (self._currentConfig.goal) {
      case 'generateNescCode':
        self.logger.info('generateNescCode');
        NescUtil.generateNescCode(self, self.activeNode)
          .then(function (result) {
            self.createMessage(self.activeNode, {
              src: result
            });
            return callCallback(null, true);
          });
        break;
      default:
        return callCallback(null, true);
    }

    // if (self.core.isTypeOf(self.activeNode, self.META.Module)) {
    //   self.logger.info('Running #generateModule');
    //   var module_util = new ModuleUtil(self, self.activeNode);
    //   module_util.generateModule()
    //     .then (function () {
    //       self.save('Internal structure of a module is generated', function (err) {
    //         if (err) {
    //           return callback(err, self.result);
    //         }
    //         callCallback(null, true);
    //       });
    //     });
    // } else if (self.core.isTypeOf(self.activeNode, self.META.Configuration)){
    //   self.logger.info('Running #compileApp');
    //   NescUtil.compileApp(self, self.activeNode, 'exp430')
    //     .then(function (tmp_path) {
    //       var name = self.core.getAttribute(self.activeNode, 'name');
    //       return NescUtil.addBlobs(self, path.join(tmp_path, 'build/exp430'), name);
    //     })
    //     .then(function (download_url) {
    //       self.createMessage(self.activeNode, {
    //         download_url: download_url
    //       });
    //       callCallback(null, true);
    //     })
    //     .catch(function (error) {
    //       self.logger.error(error);
    //       callCallback(error, false);
    //     });
    // } else {
    //   callCallback(null, true);
    // }

    function callCallback (err, success) {
      self.result.setSuccess(success);
      callback(err, self.result);
    }

  };

  return Main;
});
