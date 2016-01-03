define(['Q', 'project_root/plugins/utils/NescUtils', 'project_root/plugins/utils/WebgmeUtils', 'path', 'fs-extra'],
function (Q, nesc_utils, wgme_utils, path, fs) {

'use strict';

var ModuleUtil = function (context, module_node) {
  this._context = context;
  this._core = context.core;
  this._module_node = module_node;
  this._module_name = context.core.getAttribute(module_node, 'name');
};

ModuleUtil.prototype.generateModule = function() {
  return Q.fcall(function () {
    this._getMetaNodes();
    return this._saveSource();
  }.bind(this))
  .then(function (file_path) {
    return Q.nfcall(nesc_utils.getAppJson, file_path);
  })
  .then(function (app_json) {
    this._app_json = app_json;
    this._generateInterfaces();
  }.bind(this));
};

ModuleUtil.prototype._generateInterfaces = function() {
  return Q.fcall(function () {
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
  }.bind(this));
};

ModuleUtil.prototype._generateEventsCommands = function(interf_name, interf_node) {
  return Q.fcall(function () {
    this._app_json.interfacedefs[interf_name].functions.forEach(function (func) {
      var base = func.event_command = 'event' ? 'Event' : 'Command';
      var new_node = this._core.createNode({
        parent: interf_node,
        base: this._context.META[base]
      });
      this._core.setAttribute(new_node, 'name', func.name);
      var x = base == 'Event' ? 500 : 20;
      this._core.setRegistry(new_node, 'position', {x: x, y: 50});
    }.bind(this));
  }.bind(this));
};

ModuleUtil.prototype._saveSource = function() {
  return Q.fcall(function () {
    var random_folder_name = Math.random().toString(36).substring(7);
    var tmp_path = path.join('/tmp', random_folder_name);
    var file_path = path.join(tmp_path, this._module_name + '.nc');
    fs.outputFileSync(file_path, this._core.getAttribute(this._module_node, 'source'));
    return file_path;
  }.bind(this));
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
