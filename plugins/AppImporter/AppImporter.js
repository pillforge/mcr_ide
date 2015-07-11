define(['plugin/PluginBase', 'plugin/PluginConfig', 'path',
       '../utils/WebgmeUtils', '../utils/NescUtils'],
function (PluginBase, PluginConfig, path, wgme_utils, nesc_utils) {

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

  var cwp = core.getRegistry(self.rootNode, 'configuration_paths');
  var mwp = core.getRegistry(self.rootNode, 'module_paths');
  var fwp = core.getRegistry(self.rootNode, 'folder_paths');

  var paths_arr = [
    { paths: cwp, depth: 1 },
    { paths: mwp, depth: 2 },
    { paths: fwp, depth: 0 }
  ];

  var reg_obj = {
    cwp: cwp,
    mwp: mwp,
    fwp: fwp
  };

  log.info('', reg_obj);

  async.parallel([
    function (callback) {
      wgme_utils.loadObjects.call(self, paths_arr, callback);
    },
    function (callback) {
      nesc_utils.getAppJson(app_path, callback);
    }
  ],
  function (err, results) {
    if (err) {
      log.info(err);
      self.result.setSuccess(false);
      return callback(null, self.result);
    }

    self.run(results[1], results[0], reg_obj);

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

AppImporter.prototype.run = function (app_json, nodes, reg_obj) {
  var self = this;
  var core = self.core;
  // Create components
  var components = app_json.components;
  for (var c_name in components) {
    if ( nodes[c_name] === undefined ) {
      var comp_json = components[c_name];
      var parent = wgme_utils.mkdirp.call(self, comp_json.file_path, nodes, reg_obj.fwp);
      var base = wgme_utils.getMetaNode.call(self, nesc_utils.getBase(comp_json));
      var new_node = self.createNode(c_name, parent, base);
      core.setAttribute(new_node, 'safe', comp_json.safe);
      cache_and_register();
    }
  }

  function cache_and_register () {
    nodes[c_name] = new_node;

    if ( comp_json.comp_type === 'Configuration')
      var wp = reg_obj.cwp;
    else if ( comp_json.comp_type === 'Module')
      wp = reg_obj.mwp;
    wp[c_name] = core.getPath(new_node);

    core.setRegistry(new_node, 'nesc-dump', comp_json);
    // TODO: set call graph and tasks in registry
  }

};

AppImporter.prototype.createNode = function(name, parent, base) {
  var new_node = this.core.createNode({
    parent: parent,
    base: base
  });
  this.core.setAttribute(new_node, 'name', name);
  return new_node;
};

return AppImporter;

});
