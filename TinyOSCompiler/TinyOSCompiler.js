define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../package.json',
  '../TinyOSPopulate/NesC_XML_Generator',
  '../TinyOSPopulate/ParseDump',
  './Refresher'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, NesC_XML_Generator, ParseDump, Refresher) {
    "use strict";

    var TinyOSCompiler = function () {
      PluginBase.call(this);
      this.logger = LogManager.create('TinyOSCompiler');
    };

    TinyOSCompiler.prototype = Object.create(PluginBase.prototype);
    TinyOSCompiler.prototype.constructor = TinyOSCompiler;
    TinyOSCompiler.prototype.getName = function () {
      return "TinyOS Compiler";
    };
    TinyOSCompiler.prototype.getVersion = function () {
      return pjson.version;
    };
    TinyOSCompiler.prototype.getDefaultConfig = function () {
      return new PluginConfig();
    };

    TinyOSCompiler.prototype.main = function (callback) {
      try {
        var self = this;
        var exec = require('child_process').exec;
        var fs = require('fs');
        var path = require('path');
        var nxg = new NesC_XML_Generator('exp430');

        LogManager.setLogLevel(LogManager.logLevels.DEBUG);

        var source_code = self.getCurrentConfig().source_code;
        var temp_input = 'temp.nc';
        var temp_output = 'temp.log';
        fs.writeFileSync(temp_input, source_code);
        self.logger.debug('save ' + temp_input);

        nxg.getXML(path.resolve(temp_input), function (error, xml) {
          if (error !== null) {
            var err_msg = 'err in getXML';
            self.logger.error(err_msg + ': ' + error);
            self.result.setSuccess(false);
            self.createMessage(null, err_msg);
            callback(null, self.result);
          } else {
            var pd = new ParseDump();
            var app_json = pd.parse(null, xml);
            fs.writeFileSync(temp_output, JSON.stringify(app_json));

            var r = new Refresher(self.core);
            r.updateComponent(self.activeNode, app_json.components.temp);

            // self._createComponent(self._app_json.components[key]);
            // self._createUPInterfaces(self._app_json.components[key]);
            // self._createWirings(self._app_json.components[key]);

            self.save('Save TinyOSCompiler changes', function () {
              self.result.setSuccess(true);
              self.createMessage(null, 'Output file created');
              callback(null, self.result);
            });

          }
          fs.unlinkSync(temp_input);
        });

      } catch (e) {
        self.logger.debug('catch: ' + e);
        self.result.setSuccess(false);
        callback(e, self.result);
      }

    }

    return TinyOSCompiler;
  }
);
