define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  '../../package.json',
  ],
  function (PluginBase, PluginConfig, pjson) {
    "use strict";

    var TinyOSCompiler = function () {
      PluginBase.call(this);
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
        var path = require('path');
        var fs = require('fs');
        self.build_path = path.join(process.cwd(), 'temp', 'temp_build');

        self._compileTheApp(function(err) {
          if (err) {
            self.result.setSuccess(false);
            callback(err, self.result);
          } else {
            var artifact = self.blobClient.createArtifact(self.projectName + "_src");
            var p_name = self.core.getAttribute(self.core.getParent(self.activeNode), 'name');
            var build_path = path.join(self.build_path, p_name, 'build/exp430');
            var files_list = fs.readdirSync(build_path);
            var files = {};
            for (var i = files_list.length - 1; i >= 0; i--) {
              files[files_list[i]] = fs.readFileSync(path.resolve(build_path, files_list[i]));
            }
            artifact.addFiles(files, function (error, hashes) {
              if (error) {
                console.log('err in artifact, fix for a quit code');
                self.result.setSuccess(false);
                callback(err, self.result);
              } else {
                self.blobClient.saveAllArtifacts( function (error, hashes) {
                  if (error) {
                    console.log('err in artifact saving, fix');
                    self.result.setSuccess(false);
                    callback(err, self.result);
                  } else {
                    for (var j = hashes.length - 1; j >= 0; j--) {
                      self.result.addArtifact(hashes[j]);
                    }
                    self.createMessage(self.activeNode, {
                      download_url: self.blobClient.getDownloadURL(hashes[0])
                    });
                    console.log('download_url', self.blobClient.getDownloadURL(hashes[0]));
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
      var execSync = require('child_process').execSync;

      self._saveFolders(self.activeNode, function () {

        self.logger.info('_compileTheApp()');
        try {
          // create makefile
          var name = self.core.getAttribute(self.activeNode, 'name');
          var p_name = self.core.getAttribute(self.core.getParent(self.activeNode), 'name');
          var includes = self.core.getAttribute(self.activeNode, 'include');
          includes = includes.trim().split(/\W+/).join(' -I../');
          var rules = "COMPONENT=" + name + "\n";
          rules += 'CFLAGS+=-I../' + includes + '\n';
          rules += "include $(MAKERULES)\n";
          fs.writeFileSync(path.join(self.build_path, p_name, 'Makefile'), rules);

          var cmd = 'make ' + self.platform;

          execSync(cmd, {
            cwd: path.join(self.build_path, p_name),
            stdio: 'inherit'
          });
          next(null);

        } catch (e) {
          self.logger.error('_compileTheApp');
          self.logger.error(e);
        }


      });
    };

    TinyOSCompiler.prototype._saveFolders = function(node, next) {
      var self = this;
      var path = require('path');
      var fs = require('fs-extra');
      var async = require('async');
      var wfp = self.core.getRegistry(self.rootNode, 'folder_paths');
      var include_folders = self.core.getAttribute(node, 'include');
      include_folders = include_folders.trim().split(/\W+/);
      var parent_name = self.core.getAttribute(self.core.getParent(node), 'name');
      include_folders.push(parent_name);
      async.each(include_folders, function (folder_name, callback) {
        var f_path = path.join(self.build_path, folder_name);
        fs.mkdirpSync(f_path);
        var w_path = wfp['apps__' + folder_name]; // TODO: find the folder
        if (w_path) {
          self.core.loadByPath(self.rootNode, w_path, function (err, node) {
            if (err) {
              console.log('load by path err', err);
              callback(err);
            } else {
              self._saveFiles(node, f_path, callback);
            }
          });
        } else {
          callback();
        }
      }, function (err) {
        next();
      });
    };

    TinyOSCompiler.prototype._saveFiles = function(node, f_path, next) {
      var self = this;
      var path = require('path');
      var fs = require('fs-extra');
      self.core.loadChildren(node, function (err, children) {
        if (err) return next();
        for (var i = children.length - 1; i >= 0; i--) {
          var src = self.core.getAttribute(children[i], 'source');
          var name = self.core.getAttribute(children[i], 'name');
          var base_obj = self.core.getBase(children[i]);
          var base_name = self.core.getAttribute(base_obj, 'name');
          var extension = '.nc';
          if (base_name === 'Header_File') extension = '.h';
          fs.writeFileSync(path.join(f_path, name) + extension, src);
        }
        next();
      });
    };

    return TinyOSCompiler;
  }
);
