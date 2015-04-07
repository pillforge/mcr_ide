define([ '../common/NesC_XML_Generator'
       , '../common/ParseDump'
       ],
function (NesC_XML_Generator, ParseDump) {
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
    self.counter = {
      populate: 0,
      error: 0,
      exist: 0,
      interface_def: 0,
      component: 0
    };
    self.nxg = new NesC_XML_Generator();
    self.pd = new ParseDump();
    self.nxg.getComponentsPaths(function (error, components_paths) {
      if (error !== null) {
        next(error);
      } else {
        self._populateTos(components_paths, function (error) {
          self.logger.info('', self.component_cache);
          self.logger.info('', self.counter);
          if (error) next(error);
          else {
            next(null);
          }
        });
      }
    });
  };

  TinyOSPopulaterWorker.prototype._populateTos = function(components_paths, next) {
    var self = this;
    var async = require('async');
    self.component_cache = {};
    self.createFolders(components_paths);
    // components_paths.length = 1;
    async.eachSeries(components_paths, function (component_path, callback) {
      if (!self.component_cache[self.getComponentName(component_path)]) {
        self.populateComponent(component_path, function (error) {
          if (error) callback(error);
          else callback();
        });
      } else {
        self.logger.info('Component exists:', component_path);
        self.counter.exist++;
        callback();
      }
    }, function (err) {
      if (err) {
        next(err);
      } else {
        next(null);
      }
    });
  };

  TinyOSPopulaterWorker.prototype.populateComponent = function(component_path, next) {
    var self = this;
    self.logger.info('Populating component:', component_path);
    self.getAppJson(component_path, function (error, app_json) {
      if (error !== null) {
        self.logger.error(error);
        self.logger.info('Component is skipped due to an error');
        self.counter.error++;
        next();
      }
      else {
        self.populateInterfaceDefinitions(app_json.interfacedefs);
        self.populateComponents(app_json.components);
        self.counter.populate++;
        next(null);
      }
    });
  };

  TinyOSPopulaterWorker.prototype.populateComponents = function (components) {
    var self = this;
    for (var key in components) {
      var component = components[key];
      if (self.component_cache[component.name]) continue;
      var component_node = self.core.createNode({
        base: self.META[component.comp_type],
        parent: self.obj_cache['/' + self.getDirectory(component.file_path)]
      });
      self.core.setAttribute(component_node, 'name', component.name);
      self.component_cache[component.name] = true;
      self.counter.component++;
    }
  };

  TinyOSPopulaterWorker.prototype.populateInterfaceDefinitions = function(interfacedefs) {
    var self = this;
    for (var key in interfacedefs) {
      var interface_def = interfacedefs[key];
      if (self.component_cache[interface_def.name]) continue;
      var interface_node = self.core.createNode({
        base: self.META.Interface,
        parent: self.obj_cache['/' + self.getDirectory(interface_def.file_path)]
      });
      self.core.setAttribute(interface_node, 'name', interface_def.name);
      self.component_cache[interface_def.name] = true;
      self.counter.interface_def++;
    }
  };

  TinyOSPopulaterWorker.prototype.getAppJson = function(component_path, next) {
    var self = this;
    self.nxg.getXML(component_path, '', function(error, xml) {
      if (error !== null) {
        next(error);
      } else {
        var app_json = self.pd.parse(component_path, xml);
        next(null, app_json);
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
  // '/home/hakan/Documents/tinyos/tos/system/TinySchedulerC.nc' returns 'TinySchedulerC'
  TinyOSPopulaterWorker.prototype.getComponentName = function (file_path) {
    var path = require('path');
    return path.basename(file_path, '.nc');
  };

  // 'tos/interfaces/ResourceRequested.nc' returns 'tos/interfaces'
  TinyOSPopulaterWorker.prototype.getDirectory = function (file_path) {
    var path = require('path');
    return path.dirname(file_path);
  };

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
