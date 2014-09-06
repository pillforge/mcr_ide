define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../package.json',
  '../TinyOSPopulate/NesC_XML_Generator'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, NesC_XML_Generator) {
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
            self.logger.error('err in getXML: ' + error);
            self.result.setSuccess(false);
            callback(error, self.result);
          } else {
            fs.writeFileSync(temp_output, xml);
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
