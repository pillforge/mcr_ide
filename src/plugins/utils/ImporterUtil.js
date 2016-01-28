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
  return this._importComponents(comp_path)
    .then(function () {
      this._core.setRegistry(this._context.rootNode, 'paths', this._registry_paths);
      this._importHeaderFiles(comp_path);
    }.bind(this));
};

ImporterUtil.prototype._importHeaderFiles = function(comp_path) {
  var self = this;
  var comp_name = path.basename(comp_path, path.extname(comp_path));
  var comp_node = self._nodes[self._registry_paths.components[comp_name]];
  var parent = self._core.getParent(comp_node);
  var dirname = path.dirname(comp_path);
  var files = fs.readdirSync(dirname);
  files.forEach(function (file) {
    if (path.extname(file) === '.h') {
      var f_content = fs.readFileSync(path.resolve(dirname, file), 'utf8');
      var h_node = self._core.createNode({
        parent: parent,
        base: self._context.META.Header_File
      });
      self._core.setAttribute(h_node, 'name', path.basename(file, '.h'));
      self._core.setAttribute(h_node, 'source', f_content);
    }
  });
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
      this._nodes[this._registry_paths.interfacedefs[interf_name]] = new_node;
    }
  }
};

ImporterUtil.prototype._importComponents = function(comp_path) {
  var self = this;
  Object.keys(self._app_json.components).forEach(function (c_name) {
    if (!self._registry_paths.components[c_name]) {
      var comp_json = self._app_json.components[c_name];
      var parent_node = self._mkdirp(comp_json.file_path);
      var base = self._context.META[comp_json.comp_type];
      var new_node = self._core.createNode({
        parent: parent_node,
        base: base
      });
      self._core.setAttribute(new_node, 'name', c_name);
      if (comp_json.file_path.indexOf('tos/') !== 0) {
        var p = path.resolve(comp_path, '../..', path.relative('apps', comp_json.file_path));
        var source = fs.readFileSync(p, {
          encoding: 'utf8'
        });
        self._core.setAttribute(new_node, 'source', source);
      }
      // TODO: set attributes
      self._registry_paths.components[c_name] = self._core.getPath(new_node);
      self._nodes[self._registry_paths.components[c_name]] = new_node;
    }
  });
  return Q.all(Object.keys(self._app_json.components).map(function (c_name) {
    var module_util = new ModuleUtil(self._context, self._registry_paths, self._nodes);
    var new_node = self._nodes[self._registry_paths.components[c_name]];
    var comp_json = self._app_json.components[c_name];
    if (new_node) {
      return module_util.generateModule(new_node, self._app_json)
        .then(function (created_interfaces) {
          if (comp_json.comp_type === 'Configuration') {
            self._importRefComponentsAndWirings(c_name, new_node, created_interfaces);
          }
        });
    }
  }));
};

ImporterUtil.prototype._importRefComponentsAndWirings = function(c_name, node, created_interfaces) {
  var self = this;
  var created_components = {};
  created_components[c_name] = {};
  created_components[c_name].itself = node;
  created_components[c_name].childr = created_interfaces;
  var module_util = new ModuleUtil(self._context, self._registry_paths, self._nodes);
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
    } else {
      // TinySchedulerC-TaskBasic TODO
    }
  });
  function get_end (end_node_json) {
    var name = end_node_json.name;
    // To handle generic components
    if (end_node_json.name.includes('.')) {
      name = end_node_json.name.split('.')[1];
    }
    if (!created_components[name]) {
      var base = self._context.META.ConfigurationRef;
      var comp_name = path.basename(end_node_json.component_base, path.extname(end_node_json.component_base));
      if (self._app_json.components[comp_name].comp_type === 'Module') {
        base = self._context.META.ModuleRef;
      }
      var new_node = self._core.createNode({
        parent: node,
        base: base
      });
      self._core.setAttribute(new_node, 'name', name);
      var ref_node = self._nodes[self._registry_paths.components[comp_name]];
      if (ref_node) self._core.setPointer(new_node, 'ref', ref_node);
      created_components[name] = {
        itself: new_node,
        childr: module_util.generateInterfaces(new_node, comp_name, self._app_json)
      };
    }
    if (end_node_json.interface === 'TaskBasic') return null; // TODO
    return created_components[name].childr[end_node_json.interface].itself;
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
      self._registry_paths.folders[curr_path] = self._core.getPath(dir_node);
      self._nodes[self._registry_paths.folders[curr_path]] = dir_node;
    }
    parent_node = self._nodes[self._registry_paths.folders[curr_path]];
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
