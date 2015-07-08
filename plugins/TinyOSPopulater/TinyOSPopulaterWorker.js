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

  /**
  * Entry point for the TinyOSPopulaterWorker
  *   to create WebGME representation of TinyOS from scratch.
  * main is assumed to be called for only empty projects with the meta.
  * There are two caches.
  *   1. obj_cache: Assumed to reference all Folder, Interface,
  *      Configuration and Module WebGME objects by their path in the project.
  *      obj_cache = {
  *        '/tos/system/MainC': object,
  *        ...
  *      }
  *   2. component_cache: Reference to WebGME paths of TinyOS components
  *      and interfaces.
  *      component_cache = {
  *        'MainC': '/1302555751/137789942/1892742494',
  *        ...
  *      }
  */
  TinyOSPopulaterWorker.prototype.main = function(next) {
    this.necessary_meta = ['folder', 'interface-definition', 'configuration', 'module'];
    if (!this._isMetaValid())
      return next('Meta is not valid');
    var self = this;
    self.obj_cache = {};
    self.component_cache = {};
    self.counter = {
      populate: 0,
      error: 0,
      exist: 0,
      interface_def: 0,
      component: 0
    };
    self.nxg = new NesC_XML_Generator();
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

  /**
  * Creates the folder structure.
  * Populates each component if they're not already created.
  */
  TinyOSPopulaterWorker.prototype._populateTos = function(components_paths, next) {
    var self = this;
    var async = require('async');
    self._createFolders(components_paths);
    components_paths.length = 1;
    async.eachSeries(components_paths, function (component_path, callback) {
      if (!self.component_cache[self.getComponentName(component_path)]) {
        self._populateComponent(component_path, function (error) {
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

  // Populates the component and its dependent components
  TinyOSPopulaterWorker.prototype._populateComponent = function(component_path, next) {
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
        self._populateInterfaceDefinitions(app_json.interfacedefs);
        self._populateComponents(app_json.components);
        self.counter.populate++;
        next(null);
      }
    });
  };

  TinyOSPopulaterWorker.prototype._populateComponents = function (components) {
    var self = this;
    for (var key in components) {
      var component = components[key];
      if (self.component_cache[component.name]) continue;
      var component_node = self.core.createNode({
        base: self._getComponentType(component.comp_type),
        parent: self._getFolderWebGMEObject(component.file_path)
      });
      self.core.setAttribute(component_node, 'name', component.name);
      self.component_cache[component.name] = self.core.getPath(component_node);
      self.counter.component++;
    }
  };

  TinyOSPopulaterWorker.prototype._getComponentType = function (type) {
    if (type === 'Configuration') return this.META.configuration;
    if (type === 'Module') return this.META.module;
    throw new Error('Unknown type');
  };

  // Populates the interface definitions
  TinyOSPopulaterWorker.prototype._populateInterfaceDefinitions = function(interfacedefs) {
    var self = this;
    for (var key in interfacedefs) {
      var interface_def = interfacedefs[key];
      if (self.component_cache[interface_def.name]) continue;
      var interface_node = self.core.createNode({
        base: self.META['interface-definition'],
        parent: self._getFolderWebGMEObject(interface_def.file_path)
      });
      self.core.setAttribute(interface_node, 'name', interface_def.name);
      var declaration_list = '';
      for (var i = 0; i < interface_def.functions.length; i++) {
        var funct = interface_def.functions[i];
        var params = '';
        for (var j = 0; j < funct.parameters.length; j++) {
          if (j > 0) params += ', ';
          params += funct.parameters[j];
        }
        declaration_list += 'async ' + funct.event_command + ' void ' + funct.name + '(' + params +'); ';
      }
      self.core.setAttribute(interface_node, 'declaration-list', declaration_list);
      self.component_cache[interface_def.name] = self.core.getPath(interface_node);
      self.counter.interface_def++;
    }
  };

  // return the WebGME folder object for the current file_path
  // for '/tos/system/ArbitratedReadStreamC.nc' returns '/tos/system/' Folder object.
  TinyOSPopulaterWorker.prototype._getFolderWebGMEObject = function(file_path) {
    return this.obj_cache['/' + this.getDirectory(file_path)];
  };

  TinyOSPopulaterWorker.prototype.getAppJson = function(component_path, next) {
    var self = this;
    self.nxg.getXML(component_path, '', function(error, xml) {
      if (error !== null) {
        next(error);
      } else {
        var app_json = ParseDump.parse(xml);
        next(null, app_json);
      }
    });
  };

  TinyOSPopulaterWorker.prototype._createFolders = function(components_paths) {
    var self = this;
    var meta_folder = this.META.folder;
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
            base: meta_folder,
            parent: curr_node
          });
          self.core.setAttribute(dir_node, 'name', dir);
          self.obj_cache[obj_cache_path] = dir_node;
        }
        curr_node = self.obj_cache[obj_cache_path];
      });
    });
  };

  TinyOSPopulaterWorker.prototype._isMetaValid = function() {
    var self = this;
    return self.necessary_meta.every(function (meta) {
      return self.META[meta] !== undefined;
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
