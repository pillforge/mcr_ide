define([ 'plugin/PluginConfig'
       , 'plugin/PluginBase'
       , './TinyOSPopulaterWorker'
       ],
function (PluginConfig, PluginBase, TinyOSPopulaterWorker) {
  'use strict';

  /**
  * Initializes a new instance of TinyOSPopulater.
  * @class
  * @augments {PluginBase}
  * @classdesc This class represents the plugin TinyOSPopulater.
  * @constructor
  */
  var TinyOSPopulater = function () {
    // Call base class' constructor.
    PluginBase.call(this);
  };

  // Prototypal inheritance from PluginBase.
  TinyOSPopulater.prototype = Object.create(PluginBase.prototype);
  TinyOSPopulater.prototype.constructor = TinyOSPopulater;

  /**
  * Gets the name of the TinyOSPopulater.
  * @returns {string} The name of the plugin.
  * @public
  */
  TinyOSPopulater.prototype.getName = function () {
    return 'TinyOSPopulater';
  };

  /**
  * Gets the semantic version (semver.org) of the TinyOSPopulater.
  * @returns {string} The version of the plugin.
  * @public
  */
  TinyOSPopulater.prototype.getVersion = function () {
    return '0.1.0';
  };

  /**
  * Gets the description of the TinyOSPopulater.
  * @returns {string} The description of the plugin.
  * @public
  */
  TinyOSPopulater.prototype.getDescription = function () {
    return 'Populates TinyOS';
  };

  /**
  * Main function for the plugin to execute. This will perform the execution.
  * Notes:
  * - Always log with the provided logger.[error,warning,info,debug].
  * - Do NOT put any user interaction logic UI, etc. inside this method.
  * - callback always has to be called even if error happened.
  *
  * @param {function(string, plugin.PluginResult)} callback - the result callback
  */
  TinyOSPopulater.prototype.main = function (callback) {
    // Use self to access core, project, result, logger etc from PluginBase.
    // These are all instantiated at this point.
    var self = this;

    var tpw = new TinyOSPopulaterWorker(self.core, self.META, self.rootNode, self.logger);
    tpw.main(function (err) {
      if (err !== null) {
        self.logger.error(err);
        self.result.setSuccess(false);
      } else {
        self.result.setSuccess(true);
      }
      self.save('added obj', function (err) {
        callback(null, self.result);
      });
    });

  };

  return TinyOSPopulater;
});
