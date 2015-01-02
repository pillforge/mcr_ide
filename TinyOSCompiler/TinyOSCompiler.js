define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../package.json',
  '../TinyOSPopulate/NesC_XML_Generator',
  '../TinyOSPopulate/ParseDump',
  '../ModelGenerator/Refresher'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, NesC_XML_Generator, ParseDump, Refresher) {
    "use strict";

    var TinyOSCompiler = function () {
      PluginBase.call(this);
      this.logger = LogManager.create('TinyOSCompiler');
      this.platform = 'exp430';
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
        var nxg = new NesC_XML_Generator(self.platform);

        LogManager.setLogLevel(LogManager.logLevels.DEBUG);

        var type = "compilation";
        // self.logger.info('type ' + self.getCurrentConfig().type);

        if (type == "compilation") {
          self._compileTheApp(function(err) {
            if (err) {
              self.result.setSuccess(false);
            } else {
              self.result.setSuccess(true);
            }
            callback(err, self.result);
            return;
          });
        } else if (type == "create_visuals") {
          // nxg.getDirectories(function (err, dirs) {
          //   console.log(dirs);
          // });

          var name = self.core.getAttribute(self.activeNode, 'name');
          var current_obj_file = name + '.nc';
          // var source_code = self.getCurrentConfig().source_code;

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
                // fs.writeFileSync('app_json.js', JSON.stringify(app_json));
                var r = new Refresher(self.core, self.META, app_json);
                r.update(self.activeNode, name, function () {
                  self.save('Save TinyOSCompiler changes', function () {
                    self.result.setSuccess(true);
                    self.createMessage(null, 'Output file created');
                    callback(null, self.result);
                  });
                });
              }
              // fs.unlinkSync(current_obj_file);
              self._removeSiblingFiles();
            });
          });

        }

      } catch (e) {
        self.logger.debug('catch: ' + e);
        self.result.setSuccess(false);
        callback(e, self.result);
      }

    };

    TinyOSCompiler.prototype._compileTheApp = function (next) {
      var self = this;
      var fs = require('fs');
      self._saveSiblingsAsFiles(self.activeNode, function () {
        self.logger.info('_compileTheApp()');

        // create makefile
        var name = self.core.getAttribute(self.activeNode, 'name');
        var rules = "COMPONENT=" + name + "\n";
        rules += "include $(MAKERULES)\n";
        fs.writeFileSync('Makefile', rules);

        // run make
        var make_cmd = "make " + self.platform;
        var options = {};
        var exec = require('child_process').exec;
        exec(make_cmd, options, function (error, stdout, stderr) {
          if (error !== null) {
            self.logger.error('exec make_cmd');
            next(error);
          } else {
            // return the app.c as downloadable
            self.logger.info('return binary');
            next(null);
          }
        });

      });
    };

    TinyOSCompiler.prototype._createVisuals = function (next) {
    };

    TinyOSCompiler.prototype._saveSiblingsAsFiles = function (node, next) {
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

    TinyOSCompiler.prototype._removeSiblingFiles = function () {
      var self = this;
      var fs = require('fs');
      for (var i = self._toBeRemoved.length - 1; i >= 0; i--) {
        fs.unlinkSync(self._toBeRemoved[i]);
      }
    };

    return TinyOSCompiler;
  }
);
