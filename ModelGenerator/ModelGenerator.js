define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../package.json',
  '../config.json',
  '../TinyOSPopulate/NesC_XML_Generator',
  '../TinyOSPopulate/ParseDump',
  './Refresher'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, config_json, NesC_XML_Generator, ParseDump, Refresher) {
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

      var path = require('path');
      var nxg = new NesC_XML_Generator(config_json.platform || 'exp430');
      var name = self.core.getAttribute(self.activeNode, 'name');
      var current_obj_file = name + '.nc';

      self._saveSiblingsAsFiles(self.activeNode, function () {
        nxg.getXML(path.resolve(current_obj_file), function (error, xml) {
          if (error !== null) {
            var err_msg = 'err in getXML';
            self.logger.error(err_msg + ': ' + error);
            self.result.setSuccess(false);
            self.createMessage(null, err_msg);
            callback(null, self.result);
          } else {
            var pd = new ParseDump();
            var app_json = pd.parse(null, xml);
            var r = new Refresher(self.core, self.META, app_json);
            r.update(self.activeNode, name, function () {
              self.save('Save Model Generator changes', function () {
                self.result.setSuccess(true);
                self.createMessage(null, 'Output file created');
                callback(null, self.result);
              });
            });
          }
          self._removeSiblingFiles();
        });
      });

    };

    ModelGenerator.prototype._saveSiblingsAsFiles = function (node, next) {
      var self = this;
      var fs = require('fs');
      self._toBeRemoved = [];
      // get siblings
      var parent = self.core.getParent(node);
      self.core.loadChildren(parent, function (err, children) {
        if (err) return;
        for (var i = children.length - 1; i >= 0; i--) {
          // check if the child is conf or module then save it.
          var src = self.core.getAttribute(children[i], 'source');
          var name = self.core.getAttribute(children[i], 'name');
          fs.writeFileSync(name + '.nc', src);
          self._toBeRemoved.push(name + '.nc');
        }
        next();
      });
    };

    ModelGenerator.prototype._removeSiblingFiles = function () {
      var self = this;
      var fs = require('fs');
      for (var i = self._toBeRemoved.length - 1; i >= 0; i--) {
        fs.unlinkSync(self._toBeRemoved[i]);
      }
    };

    return ModelGenerator;
  }
);
