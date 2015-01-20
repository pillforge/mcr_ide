define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../package.json',
  '../config.json',
  '../TinyOSPopulate/NesC_XML_Generator',
  '../TinyOSPopulate/ParseDump',
  './Refresher',
  '../common/utils'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, config_json, NesC_XML_Generator, ParseDump, Refresher, utils) {
    "use strict";

    var ModelGenerator = function () {
      PluginBase.call(this);
      this.logger = LogManager.create('ModelGenerator');
    };

    ModelGenerator.prototype = Object.create(PluginBase.prototype);
    ModelGenerator.prototype.constructor = ModelGenerator;
    ModelGenerator.prototype.getName = function () {
      return "ModelGenerator";
    };
    ModelGenerator.prototype.getVersion = function () {
      return pjson.version;
    };
    ModelGenerator.prototype.getDefaultConfig = function () {
      return new PluginConfig();
    };

    ModelGenerator.prototype.main = function (callback) {
      var self = this;
      self.logger.info('main()');
      this.utils = new utils(this.core, this.META);

      var path = require('path');
      var nxg = new NesC_XML_Generator(config_json.platform || 'exp430');
      var name = self.core.getAttribute(self.activeNode, 'name');
      var current_obj_file = name + '.nc';

      self.utils.save_linked_components(self.activeNode, function(created_files) {
        nxg.getXML(path.resolve(current_obj_file), '', function (error, xml) {
          if (error !== null) {
            var err_msg = 'err in getXML';
            self.logger.error(err_msg + ': ' + error);
            self.result.setSuccess(false);
            self.createMessage(null, err_msg);
            callback(null, self.result);
          } else {
            var fs = require('fs');
            fs.writeFileSync('app_xml.xml.log', xml);
            var pd = new ParseDump();
            var app_json = pd.parse(null, xml);
            fs.writeFileSync('app_json.js.log', JSON.stringify(app_json, null, '  '));
            var r = new Refresher(self.core, self.META, app_json);
            r.update(self.activeNode, name, function () {
              self.save('Save Model Generator changes', function () {
                self.result.setSuccess(true);
                self.createMessage(null, 'Output file created');
                callback(null, self.result);
              });
            });
          }
          self.utils.remove_files(created_files);
        });
      });
    };

    return ModelGenerator;
  }
);
