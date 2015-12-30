define(['Q', 'project_root/plugins/utils/NescUtils', 'path', 'fs-extra'],
function (Q, nesc_utils, path, fs) {

'use strict';

var obj = {
  generateModule: function (core, module_node) {
    return Q.fcall(function () {
      return obj._saveSource(core, module_node);
    })
    .then(function (file_path) {
      return Q.nfcall(nesc_utils.getAppJson, file_path);
    })
    .then(function (app_json) {
    });
  },
  _saveSource: function (core, module_node) {
    return Q.fcall(function () {
       var random_folder_name = Math.random().toString(36).substring(7);
       var tmp_path = path.join('/tmp', random_folder_name);
       var file_path = path.join(tmp_path, core.getAttribute(module_node, 'name'));
       file_path += '.nc';
       var src = core.getAttribute(module_node, 'source');
       fs.outputFileSync(file_path, src);
       return file_path;
    });
  }
};

return obj;

});
