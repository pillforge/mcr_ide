define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../package.json',
  '../config.json',
  '../TinyOSPopulate/NesC_XML_Generator',
  '../TinyOSPopulate/ParseDump',
  '../ModelGenerator/Refresher'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, config_json, NesC_XML_Generator, ParseDump, Refresher) {
    "use strict";

    var AppImporter = function () {
      PluginBase.call(this);
      this.logger = LogManager.create('AppImporter');
      this.platform = config_json.platform || 'exp430';
    };

    AppImporter.prototype = Object.create(PluginBase.prototype);
    AppImporter.prototype.constructor = AppImporter;
    AppImporter.prototype.getName = function () {
      return "AppImporter";
    };
    AppImporter.prototype.getVersion = function () {
      return pjson.version;
    };
    AppImporter.prototype.getDefaultConfig = function () {
      return new PluginConfig();
    };

    AppImporter.prototype.main = function (callback) {
      var self = this;
      self.logger.info('main()');

      var fs = require('fs');
      var path = require('path');

      var nxg = new NesC_XML_Generator(self.platform);

      var filePath = '/home/hakan/Documents/tinyos-apps/Icra2015Expt/Base/Icra2015ExptBaseAppC.nc';
      var dirPath = path.dirname(filePath);
      var file = fs.readFileSync(filePath, 'utf8');

      var opts = '-I ' + dirPath;
      opts += ' -I /home/hakan/Documents/tinyos-apps/Icra2015Expt/include/';

      nxg.getXML(path.resolve(filePath), opts, function (error, xml) {
        if (error !== null) {
          var err_msg = 'err in getXML';
          self.logger.error(err_msg + ': ' + error);
          self.result.setSuccess(false);
          self.createMessage(null, err_msg);
          callback(error, self.result);
        } else {
          var pd = new ParseDump();
          var app_json = pd.parse(null, xml);
          var r = new Refresher(self.core, self.META, app_json);
          console.log(app_json);
          // r.update(self.activeNode, name, function () {
          //   self.save('Save Model Generator changes', function () {
          //     self.result.setSuccess(true);
          //     self.createMessage(null, '');
          //     callback(null, self.result);
          //   });
          // });
        }
      });

      self.result.setSuccess(true);
      callback(null, self.result);
    };

    return AppImporter;
  }
);
