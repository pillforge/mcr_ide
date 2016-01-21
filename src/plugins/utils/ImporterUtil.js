define(['project_src/plugins/utils/NescUtil', 'q', 'path', 'fs-extra'],
function (nesc_util, Q, path, fs) {

'use strict';

var ImporterUtil = function (context, target) {
  this._context = context;
  this._core = context.core;
  this._target = target;
  this._nodes = {};
  this._registry_paths = context.core.getRegistry(context.rootNode, 'paths') || {};
  this._registry_paths.interfacedefs = this._registry_paths.interfacedefs || {};
  this._registry_paths.folders = this._registry_paths.folders || {};
  nesc_util.getMetaNodes(context);
};

ImporterUtil.prototype.importAComponentFromPath = function (comp_path) {
  var app_json = nesc_util.getAppJson(comp_path, this._target);
  this._importInterfacedefs(app_json.interfacedefs);
  this._core.setRegistry(this._context.rootNode, 'paths', this._registry_paths);
};

ImporterUtil.prototype._importInterfacedefs = function (interfacedefs_json) {
  for (var interf_name in interfacedefs_json) {
    if (!this._registry_paths.interfacedefs[interf_name]) {
      var interf_json = interfacedefs_json[interf_name];
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
