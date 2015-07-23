define(['plugin/PluginBase', 'plugin/PluginConfig', 'path',
       '../utils/WebgmeUtils', '../utils/NescUtils',
       '../utils/Constants',
       '../TinyOSWiringPopulater/TinyOSWiringPopulater',
       '../TinyOSPopulate/TinyOSPopulate'],
function (PluginBase, PluginConfig, path, wgme_utils, nesc_utils, Constants, twp, top) {

'use strict';

var AppImporter = function () {
  PluginBase.call(this);
};

AppImporter.prototype = Object.create(PluginBase.prototype);
AppImporter.prototype.constructor = AppImporter;
AppImporter.prototype.getName = function () {
  return "AppImporter";
};
AppImporter.prototype.getVersion = function () {
  return '0.0.1';
};

AppImporter.prototype.main = function (callback) {
  var self = this;

  var config = {
    app_path: self._currentConfig.app_path,
    recursive: self._currentConfig.recursive,
    save: true
  };

  var reg_obj = self.getRegistry();
  var paths_arr = [
    { paths: reg_obj.iwp, depth: 0 },
    { paths: reg_obj.cwp, depth: 1 },
    { paths: reg_obj.mwp, depth: 2 },
    { paths: reg_obj.fwp, depth: 0 }
  ];

  self.importApps(reg_obj, config, config.app_path, paths_arr, function (err) {
    call_callback(true);
  });

  function call_callback (success) {
    self.result.setSuccess(success);
    if (config.save) {
      self.save('', function () {
        callback(null, self.result);
      });
    } else callback(null, self.result);
  }

};

AppImporter.prototype.importApps = function (reg_obj, config, a_path, paths_arr, next) {
  var self = this;
  var fs = require('fs');
  var path = require('path');
  var async = require('async');
  if (config.recursive && fs.statSync(a_path).isDirectory()) {
    var dirs = fs.readdirSync(a_path);
    async.eachSeries(dirs, function (file, callback) {
      var b_path = path.resolve(a_path, file);
      if (fs.statSync(b_path).isDirectory()) {
        self.importApps(reg_obj, config, b_path, paths_arr, callback);
      } else callback();
    }, function (err) {
      self.importApp(reg_obj, a_path, paths_arr, next);
    });
  } else {
    self.importApp(reg_obj, a_path, paths_arr, next);
  }
};

AppImporter.prototype.importApp = function (reg_obj, a_path, paths_arr, next) {
  var self = this;
  var fs = require('fs');
  var path = require('path');
  var stats = fs.statSync(a_path);
  if (stats.isFile()) {
    nesc_utils.getAppJson(a_path, function (err, app_json) {
      self.run(app_json, nodes, reg_obj, paths_arr, next);
    });
  } else if (stats.isDirectory()) {
    if (fs.existsSync(path.resolve(a_path, 'Makefile'))) {
      self.logger.info('Being imported', a_path);
      var app_json = nesc_utils.getAppJsonFromMakeSync(a_path, 'exp430');
      wgme_utils.loadObjects(self, paths_arr, function (err, nodes) {
        self.run(app_json, nodes, reg_obj, paths_arr, function () {
          self.setRegistry(reg_obj);
          self.save('import ' + a_path, next);
        });
      });
    } else {
      next();
    }
  }
};

// keep nodes and reg_obj updated with the new nodes
AppImporter.prototype.run = function (app_json, nodes, reg_obj, paths_arr, next) {
  var self = this;
  var core = self.core;
  var async = require('async');

  // Create interfaces
  var interfacedefs = app_json.interfacedefs;
  for (var i_name in interfacedefs) {
    if ( nodes[i_name] === undefined ) {
      var i_json = interfacedefs[i_name];
      var parent = wgme_utils.mkdirp(self, i_json.file_path, nodes, reg_obj.fwp);
      var base = wgme_utils.getMetaNode(self, 'interface');
      var new_node = self.createNode(i_name, parent, base);
      // TODO: _createFunctionDeclarationsEventsCommands
      top.prototype._createFunctionDeclarationsEventsCommands.call(self, new_node, i_json);
      reg_obj.iwp[i_name] = core.getPath(new_node);
      nodes[i_name] = new_node;
    }
  }

  // Create components
  var components = app_json.components;
  for (var c_name in components) {
    if ( nodes[c_name] === undefined ) {
      var comp_json = components[c_name];
      var parent = wgme_utils.mkdirp(self, comp_json.file_path, nodes, reg_obj.fwp);
      var base = wgme_utils.getMetaNode(self, 'component', comp_json);
      var new_node = self.createNode(c_name, parent, base);
      core.setAttribute(new_node, 'safe', comp_json.safe);
      cache_and_register();
      create_up();
    }
  }

  // We load all nodes for every new configuration due to a WebGME bug: TODO when it is fixed
  async.forEachOf(components, function (value, key, callback) {
    wgme_utils.loadObjects(self, paths_arr, function (err, new_nodes) {
      nodes = new_nodes;
      create_wire_configuration(key, nodes[key], value.wiring);
      callback();
    });
  }, function (err) {

    // Create tasks for modules
    var tn = twp.prototype.createTasks.call(self, reg_obj.mwp);
    for (var tn_i in tn) {
      nodes[tn_i] = tn[tn_i];
    }

    // Create module calls
    self._nodes = nodes;
    twp.prototype.createModuleCalls.call(self, reg_obj.mwp);

    next();
  });


  function create_wire_configuration (c_name, node, wirings) {
    self._nodes = nodes;
    twp.prototype.wireConfiguration.call(self, c_name, node, wirings);
  }

  function create_up () {
    for (var i = comp_json.interface_types.length - 1; i >= 0; i--) {
      var ci_json = comp_json.interface_types[i];
      var parent = nodes[c_name];
      var base = wgme_utils.getMetaNode(self, 'up', ci_json);
      var up_node = self.createNode(ci_json.as, parent, base);
      core.setPointer(up_node, 'interface', nodes[ci_json.name]);
      nodes[[c_name, ci_json.as].join(Constants.DELIMITER)] = up_node;
      // TODO: _createFunctionDeclarationsEventsCommands
      var ec = top.prototype._createFunctionDeclarationsEventsCommands.call(self, up_node, app_json.interfacedefs[ci_json.name]);
      for (var ec_i in ec) {
        nodes[[c_name, ci_json.as, ec_i].join(Constants.DELIMITER)] = ec[ec_i];
      }
    }
  }

  function cache_and_register () {
    if ( comp_json.comp_type === 'Configuration')
      var wp = reg_obj.cwp;
    else if ( comp_json.comp_type === 'Module')
      wp = reg_obj.mwp;
    wp[c_name] = core.getPath(new_node);
    nodes[c_name] = new_node;
    core.setRegistry(new_node, 'nesc-dump', comp_json);
    // TODO: set call graph and tasks in registry
    wgme_utils.setRegistryCallsTasks(self, new_node, comp_json, app_json.notes);
  }

};

AppImporter.prototype.joinPath = function () {
  return Array.prototype.join.call(arguments, Constants.DELIMITER);
};

AppImporter.prototype.createNode = function(name, parent, base) {
  var new_node = this.core.createNode({
    parent: parent,
    base: base
  });
  this.core.setAttribute(new_node, 'name', name);
  return new_node;
};

AppImporter.prototype.getRegistry = function () {
  return {
    iwp: this.core.getRegistry(this.rootNode, 'interface_paths') || {},
    cwp: this.core.getRegistry(this.rootNode, 'configuration_paths') || {},
    mwp: this.core.getRegistry(this.rootNode, 'module_paths') || {},
    fwp: this.core.getRegistry(this.rootNode, 'folder_paths') || {}
  };
};

AppImporter.prototype.setRegistry = function (reg_obj) {
  this.core.setRegistry(this.rootNode, 'interface_paths', reg_obj.iwp);
  this.core.setRegistry(this.rootNode, 'configuration_paths', reg_obj.cwp);
  this.core.setRegistry(this.rootNode, 'module_paths', reg_obj.mwp);
  this.core.setRegistry(this.rootNode, 'folder_paths', reg_obj.fwp);
};

return AppImporter;

});
