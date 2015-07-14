define(['plugin/PluginBase', 'plugin/PluginConfig', 'path',
       '../utils/WebgmeUtils', '../utils/NescUtils',
       '../utils/Constants',
       '../TinyOSWiringPopulater/TinyOSWiringPopulater'],
function (PluginBase, PluginConfig, path, wgme_utils, nesc_utils, Constants, twp) {

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
  return '0.0.0';
};

AppImporter.prototype.main = function (callback) {
  var self = this;
  var core = self.core;
  var log = self.logger;
  var async = require('async');
  var save = true;

  var app_path = path.resolve(process.env.TOSROOT, 'apps', 'Blink', 'BlinkAppC.nc');
  var reg_obj = self.getRegistry();
  var paths_arr = [
    { paths: reg_obj.iwp, depth: 0 },
    { paths: reg_obj.cwp, depth: 1 },
    { paths: reg_obj.mwp, depth: 2 },
    { paths: reg_obj.fwp, depth: 0 }
  ];

  async.parallel([
    function (callback) {
      wgme_utils.loadObjects(self, paths_arr, callback);
    },
    function (callback) {
      nesc_utils.getAppJson(app_path, callback);
    }
  ],
  function (err, results) {
    if (err) {
      log.info(err);
      self.result.setSuccess(false);
      return callback(err, self.result);
    }

    self.run(results[1], results[0], reg_obj);
    self.setRegistry(reg_obj);

    var fs = require('fs-extra');
    fs.outputJsonSync('temp/BlinkAppC.json', results[1], {spaces: 2});

    if (save) {
      self.save('save', function (err) {
        call_callback(true);
      });
    } else call_callback(true);

  });

  function call_callback (success) {
    self.result.setSuccess(success);
    callback(null, self.result);
  }

};

// keep nodes and reg_obj updated with the new nodes
AppImporter.prototype.run = function (app_json, nodes, reg_obj) {
  var self = this;
  var core = self.core;

  // Create interfaces
  var interfacedefs = app_json.interfacedefs;
  for (var i_name in interfacedefs) {
    if ( nodes[i_name] === undefined ) {
      var i_json = interfacedefs[i_name];
      var parent = wgme_utils.mkdirp(self, i_json.file_path, nodes, reg_obj.fwp);
      var base = wgme_utils.getMetaNode(self, 'interface');
      var new_node = self.createNode(i_name, parent, base);
      // TODO: _createFunctionDeclarationsEventsCommands
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

  // Create wirings for configurations
  var components = app_json.components;
  for (var c_name in components) {
    create_wire_configuration(c_name, nodes[c_name], components[c_name].wiring);
  }

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
