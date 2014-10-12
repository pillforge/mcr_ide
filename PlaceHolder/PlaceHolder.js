define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../package.json'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson) {
    "use strict";

    var PlaceHolder = function () {
      PluginBase.call(this);
      this.logger = LogManager.create('PlaceHolder');
    };

    PlaceHolder.prototype = Object.create(PluginBase.prototype);
    PlaceHolder.prototype.constructor = PlaceHolder;
    PlaceHolder.prototype.getName = function () {
      return "TinyOS Compiler";
    };
    PlaceHolder.prototype.getVersion = function () {
      return pjson.version;
    };
    PlaceHolder.prototype.getDefaultConfig = function () {
      return new PluginConfig();
    };

    PlaceHolder.prototype.main = function (callback) {
      var self = this;
      self.logger.info('main()');

      // self.result.setSuccess(true);
      callback(null, self.result);
    };

    return PlaceHolder;
  }
);
