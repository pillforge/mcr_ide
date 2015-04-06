define(['../common/NesC_XML_Generator'], function (NesC_XML_Generator) {
  'use strict';

  var TinyOSPopulaterWorker = function (core, META, rootNode, logger) {
    this.core = core;
    this.META = META;
    this.rootNode = rootNode;
    this.logger = logger;
    this.logger.info('TinyOSPopulaterWorker constructor');
  };

  TinyOSPopulaterWorker.prototype.main = function(next) {
    var self = this;
    self.obj_cache = {};
    var nxg = new NesC_XML_Generator();
    nxg.getComponentsPaths(function (error, components_paths) {
      if (error !== null) {
        next(error);
      } else {
        self.createFolders(components_paths);
        next(null);
      }
    });
  };

  TinyOSPopulaterWorker.prototype.createFolders = function(components_paths) {
    var self = this;
    var directories = components_paths
      .map(self.normalizeFilePath)
      .filter(function (item, index, arr) {
        return arr.indexOf(item) === index;
    });
    directories.forEach(function (directory) {
      var curr_node = self.rootNode;
      var obj_cache_path = '';
      var dirs = directory.split('/');
      dirs.forEach(function (dir) {
        obj_cache_path += '/' + dir;
        if (!self.obj_cache[obj_cache_path]) {
          var dir_node = self.core.createNode({
            base: self.META.Folder,
            parent: curr_node
          });
          self.core.setAttribute(dir_node, 'name', dir);
          self.obj_cache[obj_cache_path] = dir_node;
        }
        curr_node = self.obj_cache[obj_cache_path];
      });
    });
  };


  // The methods below can be used as utils. TODO: To be exported.

  // /home/user/Documents/tinyos/tos/system/MainC.nc returns tos/system/MainC
  TinyOSPopulaterWorker.prototype.normalizeFilePath = function(file_path) {
    var path = require('path');
    var tos_path = process.env.TOSROOT;
    var file_dir = path.dirname(file_path);
    if (file_path.search(tos_path) === 0)
      file_dir = path.dirname(file_path.substr(tos_path.length+1));
    return file_dir;
  };

  return TinyOSPopulaterWorker;

});
