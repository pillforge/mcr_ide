define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../../package.json',
  '../common/NesC_XML_Generator'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, NesC_XML_Generator) {
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

      self.getDirectories(function () {
        self.result.setSuccess(true);
        callback(null, self.result);
      });

    };

    PlaceHolder.prototype.getDirectories = function (next) {
      var nxg = new NesC_XML_Generator('exp430');
      nxg.getDirectories(function(error, directories) {
        if (error !== null) {
          self._wi("Can't get platform directories");
        } else {
          var components_paths = nxg.getComponents(directories);
          console.log('directories');
          console.log(directories);
          console.log('components_paths');
          console.log(components_paths);
        }
        next();
      });
    };

    return PlaceHolder;
  }
);
