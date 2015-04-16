define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  '../../package.json',
  '../common/NesC_XML_Generator',
  '../common/ParseDump'
  ],
  function (PluginBase, PluginConfig, pjson, NesC_XML_Generator, ParseDump) {
    "use strict";

    var PlaceHolder = function () {
      PluginBase.call(this);
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

      self.getAppJson(function (err, result) {
        console.log(JSON.stringify(result, null, ' '));
        self.result.setSuccess(true);
        callback(null, self.result);
      });

    };

    PlaceHolder.prototype.getAppJson = function (next) {
      var self = this;
      var nxg = new NesC_XML_Generator('exp430');
      var pd = new ParseDump();
      // var component_path = process.env.TOSDIR + '/system/MainC.nc';
      var component_path = process.env.TOSDIR + '/platforms/exp430/ActiveMessageC.nc';
      nxg.getXML(component_path, '', function(error, xml) {
        if (error !== null) {
          next(error);
        } else {
          // console.log(xml);
          var app_json = pd.parse(component_path, xml);
          next(null, app_json);
        }
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
