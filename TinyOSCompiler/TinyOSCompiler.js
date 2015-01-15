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
      this.platform = config_json && config_json.platform || 'exp430';
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

        self._compileTheApp(function(err, data) {
          if (err) {
            self.result.setSuccess(false);
            callback(err, self.result);
          } else {
            self.createMessage(self.activeNode, {appc: data});
            self.result.setSuccess(true);
            // callback(null, self.result);
            var artifact = self.blobClient.createArtifact(self.projectName + "_src");
            artifact.addFile('app.c', data, function (e) {
              if (e) {
                console.log('err in artifact, fix for a quit code');
                self.result.setSuccess(false);
                callback(err, self.result);
              } else {
                self.blobClient.saveAllArtifacts(function (ee, hashes) {
                  if (ee) {
                    console.log('err in artifact saving, fix');
                    self.result.setSuccess(false);
                    callback(err, self.result);
                  } else {
                    self.logger.info('Artifacts are saved here:');
                    self.logger.info(hashes);
                    // result add hashes
                    for (var j = 0; j < hashes.length; j += 1) {
                      self.result.addArtifact(hashes[j]);
                    }
                    self.result.setSuccess(true);
                    callback(err, self.result);
                  }
                });
              }
            });
          }
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
      var path = require('path');

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
              self.logger.error('exec make: ' + error);
              self._cleanUp();
              next(error);
            } else {
              // return the app.c as downloadable
              self.logger.info('return binary');
              var appc_location = path.resolve('build', self.platform, 'app.c');
              var appc_content = fs.readFileSync(appc_location, 'utf8');
              self._cleanUp();
              next(null, appc_content);
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
          var base_obj = self.core.getBase(children[i]);
          var base_name = self.core.getAttribute(base_obj, 'name');
          var extension = '.nc';
          if (base_name === 'Header_File') extension = '.h';
          fs.writeFileSync(name + extension, src);
          self._toBeRemoved.push(name + extension);
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
