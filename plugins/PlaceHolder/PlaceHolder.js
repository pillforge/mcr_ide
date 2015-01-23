define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../../package.json',
  './WebGMEAnalyzer'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, WebGMEAnalyzer) {
    "use strict";

    var PlaceHolder = function () {
      PluginBase.call(this);
      this.logger = LogManager.create('PlaceHolder');
    };

    PlaceHolder.prototype = Object.create(PluginBase.prototype);
    PlaceHolder.prototype.constructor = PlaceHolder;
    PlaceHolder.prototype.getName = function () {
      return "PlaceHolder";
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

      var wa = new WebGMEAnalyzer(self.core, self.META);
      var comps = wa.getComponents(self.activeNode, function (err, components) {
        if (err) {
          self.result.setSuccess(false);
          callback(null, self.result);
          return;
        }
        // console.log(components);

        self.result.setSuccess(true);
        callback(null, self.result);
      });

    };

    return PlaceHolder;
  }
);
