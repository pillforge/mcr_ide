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
