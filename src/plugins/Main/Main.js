define([ 'plugin/PluginConfig',
         'plugin/PluginBase',
         'project_src/plugins/utils/ModuleUtil',
         'project_src/plugins/utils/NescUtil',
         'project_src/plugins/utils/ImporterUtil'
], function (PluginConfig, PluginBase, ModuleUtil, NescUtil, ImporterUtil) {
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
    var target = self._getTarget(self.activeNode);

    if ( (self._currentConfig.goal === 'compileApp'|| self._currentConfig.goal === 'generateModule') && !target) {
      return callCallback('No target', false);
    }

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
      case 'generateModule':
        self.logger.info('generateModule');
        var module_util = new ModuleUtil(self);
        module_util.generateModule(self.activeNode, target)
          .then (function () {
            return self.save('Internal structure of a module is generated');
          })
          .then(function () {
            callCallback(null, true);
          });
        break;
      case 'compileApp':
        self.logger.info('compileApp');
        NescUtil.compileApp(self, self.activeNode, target)
          .then(function (tmp_path) {
            var name = self.core.getAttribute(self.activeNode, 'name');
            return NescUtil.addBlobs(self, path.join(tmp_path, 'build', target), name);
          })
          .then(function (download_url) {
            self.createMessage(self.activeNode, {
              download_url: download_url
            });
            callCallback(null, true);
          })
          .catch(function (error) {
            self.logger.error(error);
            callCallback(error, false);
          });
        break;
      case 'importApp':
        self.logger.info('importApp for', self._currentConfig.app_path);
        var importer_util = new ImporterUtil(self, self._currentConfig.target);
        importer_util.importAComponentFromPath(self._currentConfig.app_path)
          .then(function () {
            return self.save(self._currentConfig.app_path + ' ..imported');
          })
          .then(function () {
            callCallback(null, true);
          })
          .fail(function (error) {
            callCallback(error, false);
          });
        break;
      case 'importTos':
        self.logger.info('import Tos for', self._currentConfig.target);
        importer_util = new ImporterUtil(self, self._currentConfig.target);
        importer_util.importAllTosComponents()
          .then(function () {
            return self.save('Tos imported for ' + self._currentConfig.target);
          })
          .then(function () {
            callCallback(null, true);
          });
        break;
      default:
        self.logger.warn('No matching goal');
        return callCallback(null, true);
    }

    function callCallback (err, success) {
      self.result.setSuccess(success);
      callback(err, self.result);
    }

  };

  Main.prototype._getTarget = function (node) {
    var p = this.core.getParent(node);
    if (p) {
      return this.core.getAttribute(p, 'target');
    }
    return null;
  };

  return Main;
});
