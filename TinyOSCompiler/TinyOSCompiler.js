define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'logManager',
  '../package.json',
  '../config.json'
  ],
  function (PluginBase, PluginConfig, LogManager, pjson, config_json) {
    "use strict";

    var TinyOSCompiler = function () {
      PluginBase.call(this);
      this.logger = LogManager.create('TinyOSCompiler');
      this.platform = config_json.platform || 'exp430';
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
        LogManager.setLogLevel(LogManager.logLevels.DEBUG);

        self._compileTheApp(function(err) {
          if (err) {
            self.result.setSuccess(false);
          } else {
            self.result.setSuccess(true);
          }
          callback(err, self.result);
        });

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
        try {
          // create makefile
          var name = self.core.getAttribute(self.activeNode, 'name');
          var rules = "COMPONENT=" + name + "\n";
          rules += "include $(MAKERULES)\n";
          self._writeFileSync('Makefile', rules);

          // run make
          var make_cmd = "make " + self.platform;
          var options = {};
          var exec = require('child_process').exec;
          exec(make_cmd, options, function (error, stdout, stderr) {
            self.logger.info('exec()');
            if (error !== null) {
              self.logger.error('exec make_cmd');
              self._cleanUp();
              next(error);
            } else {
              // return the app.c as downloadable
              self.logger.info('return binary');
              self._cleanUp();
              next(null);
            }
          });

        } catch (e) {
          self.logger.error('_compileTheApp');
          self.logger.error(e);
          self._cleanUp();
        }


      });
    };

    TinyOSCompiler.prototype._writeFileSync = function(filename, content) {
      var self = this;
      var fs = require('fs');
      fs.writeFileSync(filename, content);
      self._toBeRemoved.push(filename);
    };

    TinyOSCompiler.prototype._cleanUp = function () {
      var fs = require('fs');
      this._removeSiblingFiles();
      // fs.rmdirSync('build');
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
      while (self._toBeRemoved.length > 0 ) {
        var rem = self._toBeRemoved.pop();
        fs.unlinkSync(rem);
      }
    };

    return TinyOSCompiler;
  }
);
