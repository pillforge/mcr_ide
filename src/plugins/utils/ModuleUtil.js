define(['q', 'project_src/plugins/utils/NescUtil', 'path', 'fs-extra'],
function (Q, nesc_util, path, fs) {

'use strict';

var ModuleUtil = function (context, module_node) {
  this._context = context;
  this._core = context.core;
  this._module_node = module_node;
  this._module_name = context.core.getAttribute(module_node, 'name');
  this._getMetaNodes();
};

ModuleUtil.prototype.generateModule = function() {
  return this._saveSourceAndDependencies()
    .then(function (tmp_path) {
      var file_path = path.join(tmp_path, this._module_name + '.nc');
      return nesc_util.getAppJson(file_path, 'exp430');
    }.bind(this))
    .then(function (app_json) {
      this._app_json = app_json;
      this._generateInterfaces();
      this._generateCallgraph();
    }.bind(this));
};

ModuleUtil.prototype._generateCallgraph = function() {
};

ModuleUtil.prototype._generateInterfaces = function() {
  var interfaces = this._app_json.components[this._module_name].interface_types;
  interfaces.forEach(function (interf) {
    var base = this._context.META.Uses_Interface;
    if (interf.provided) base = this._context.META.Provides_Interface;
    var new_node = this._core.createNode({
      parent: this._module_node,
      base: base
    });
    this._core.setAttribute(new_node, 'name', interf.as);
    this._generateEventsCommands(interf.name, new_node);
  }.bind(this));
};

ModuleUtil.prototype._generateEventsCommands = function(interf_name, interf_node) {
  this._app_json.interfacedefs[interf_name].functions.forEach(function (func) {
    var base = func.event_command == 'event' ? 'Event' : 'Command';
    var new_node = this._core.createNode({
      parent: interf_node,
      base: this._context.META[base]
    });
    this._core.setAttribute(new_node, 'name', func.name);
    var x = base == 'Event' ? 500 : 20;
    this._core.setRegistry(new_node, 'position', {x: x, y: 50});
  }.bind(this));
};

ModuleUtil.prototype._saveSourceAndDependencies = function() {
  var deferred = Q.defer();
  var random_folder_name = Math.random().toString(36).substring(7);
  var tmp_path = path.join('/tmp', random_folder_name);
  var file_path = path.join(tmp_path, this._module_name + '.nc');
  fs.outputFileSync(file_path, this._core.getAttribute(this._module_node, 'source'));
  this._saveParentsHeaders(tmp_path)
    .then(function () {
      return deferred.resolve(tmp_path);
    });
  return deferred.promise;
};

ModuleUtil.prototype._saveParentsHeaders = function(tmp_path) {
  var deferred = Q.defer();
  var parent_node = this._core.getParent(this._module_node);
  Q.nfcall(this._core.loadChildren, parent_node)
    .then(function (children) {
      children.forEach(function (child) {
        if (this._core.isTypeOf(child, this._context.META.Header_File)) {
          var child_name = this._core.getAttribute(child, 'name');
          var file_path = path.join(tmp_path, child_name + '.h');
          fs.outputFileSync(file_path, this._core.getAttribute(child, 'source'));
        }
      }.bind(this));
      deferred.resolve(tmp_path);
    }.bind(this))
    .catch(function (error) {
      return deferred.reject(error);
    });
  return deferred.promise;
};

ModuleUtil.prototype._getMetaNodes = function() {
  return Q.fcall(function () {
    if (!this._context.META) {
      this._context.META = {};
      var metanodes = this._core.getAllMetaNodes(this._context.rootNode);
      Object.keys(metanodes).forEach(function (key) {
        var name = this._core.getAttribute(metanodes[key], 'name');
        this._context.META[name] = metanodes[key];
      }.bind(this));
    }
  }.bind(this));
};

return ModuleUtil;

});
