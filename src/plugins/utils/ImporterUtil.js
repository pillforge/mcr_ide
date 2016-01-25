define([ 'project_src/plugins/utils/NescUtil',
         'project_src/plugins/utils/ModuleUtil',
         'q', 'path', 'fs-extra'],
function (nesc_util, ModuleUtil, Q, path, fs) {

'use strict';

var ImporterUtil = function (context, target) {
  this._context = context;
  this._core = context.core;
  this._target = target;
  this._nodes = {};
  this._registry_paths = context.core.getRegistry(context.rootNode, 'paths') || {};
  this._registry_paths.interfacedefs = this._registry_paths.interfacedefs || {};
  this._registry_paths.folders = this._registry_paths.folders || {};
  this._registry_paths.components = this._registry_paths.components || {};
  nesc_util.getMetaNodes(context);
};

ImporterUtil.prototype.importAComponentFromPath = function (comp_path) {
  this._app_json = nesc_util.getAppJson(comp_path, this._target, true);
  this._importInterfacedefs();
  return this._importComponents()
    .then(function () {
      this._core.setRegistry(this._context.rootNode, 'paths', this._registry_paths);
    }.bind(this));
};

ImporterUtil.prototype._importInterfacedefs = function () {
  for (var interf_name in this._app_json.interfacedefs) {
    if (!this._registry_paths.interfacedefs[interf_name]) {
      var interf_json = this._app_json.interfacedefs[interf_name];
      var parent_node = this._mkdirp(interf_json.file_path);
      var base = this._context.META.Interface_Definition;
      var new_node = this._core.createNode({
        parent: parent_node,
        base: base
      });
      this._core.setAttribute(new_node, 'name', interf_name);
      nesc_util.generateEventsCommands(this._context, interf_json.functions, new_node);
      this._registry_paths.interfacedefs[interf_name] = this._core.getPath(new_node);
    }
  }
};

ImporterUtil.prototype._importComponents = function() {
  var self = this;
  return Q.all(Object.keys(this._app_json.components).map(function (c_name) {
    if (!self._registry_paths.components[c_name]) {
      var module_util = new ModuleUtil(self._context);
      var comp_json = self._app_json.components[c_name];
      var parent_node = self._mkdirp(comp_json.file_path);
      var base = self._context.META[comp_json.comp_type];
      var new_node = self._core.createNode({
        parent: parent_node,
        base: base
      });
      self._core.setAttribute(new_node, 'name', c_name);
      // TODO: set attributes
      self._registry_paths.components[c_name] = self._core.getPath(new_node);
      return module_util.generateModule(new_node, self._app_json)
        .then(function (created_interfaces) {
          if (comp_json.comp_type === 'Configuration') {
            self._importRefComponentsAndWirings(c_name, new_node, created_interfaces);
          }
        });
    } else {
      return Q.fcall(function () {});
    }
  }));
};

ImporterUtil.prototype._importRefComponentsAndWirings = function(c_name, node, created_interfaces) {
  var self = this;
  var created_components = {};
  created_components[c_name] = {};
  created_components[c_name].itself = node;
  created_components[c_name].childr = created_interfaces;
  var wirings = self._app_json.components[c_name].wiring;
  wirings.forEach(function (wire) {
    var src_end = get_end(wire.from);
    var dst_end = get_end(wire.to);
    if (src_end && dst_end) {
      var base = self._context.META.Link_Interface;
      if (c_name == wire.from.name || c_name == wire.to.name) {
        base = self._context.META.Equate_Interface;
      }
      var wire_node = self._core.createNode({
        parent: node,
        base: base
      });
      self._core.setPointer(wire_node, 'src', src_end);
      self._core.setPointer(wire_node, 'dst', dst_end);
    }
  });
  function get_end (end_node_json) {
    var name = end_node_json.name;
    if (end_node_json.name.includes('.')) {
      name = end_node_json.name.split('.')[0];
    }
    if (!created_components[name]) {
      var base = self._context.META.ConfigurationRef;
      if (self._app_json.components[name].comp_type === 'Module') {
        base = self._context.META.ModuleRef;
      }
      var new_node = self._core.createNode({
        parent: node,
        base: base
      });
      self._core.setAttribute(new_node, 'name', name);
      created_components[name] = {};
      created_components[name].itself = new_node;
    }
    return created_components[name].itself;
  }
};

ImporterUtil.prototype._mkdirp = function (file_path) {
  var self = this;
  var dirs = path.dirname(file_path).split(path.sep);
  var parent_node = self._context.rootNode;
  var curr_path = '';
  dirs.forEach(function (dir) {
    curr_path += '/' + dir;
    if (!self._registry_paths.folders[curr_path]) {
      var dir_node = self._core.createNode({
        parent: parent_node,
        base: self._context.META.Folder
      });
      self._core.setAttribute(dir_node, 'name', dir);
      self._nodes[curr_path] = dir_node;
      self._registry_paths.folders[curr_path] = self._core.getPath(dir_node);
    }
    parent_node = self._nodes[curr_path];
  });
  return parent_node;
};

ImporterUtil.prototype._getDirectories = function () {
  var spawnSync = require('child_process').spawnSync;
  var result = spawnSync('ncc', ['-v', '-target=' + this._target], {
    encoding: 'utf8'
  });
  var directories = result.stderr.split('\n')[0];
  return directories.split(' -I').slice(1);
};

ImporterUtil.prototype._getComponents = function () {
  var components = {};
  var dirs = this._getDirectories(this._target);
  dirs.forEach(function (dir) {
    if (fs.existsSync(dir)) {
      var files = fs.readdirSync(dir);
      files.forEach(function (file) {
        if (path.extname(file) === '.nc') {
          components[file] = components[file] || path.join(dir, file);
        }
      });
    }
  });
  return components;
};

return ImporterUtil;
});
