define(['Q', 'project_root/plugins/utils/NescUtils', 'project_root/plugins/utils/WebgmeUtils', 'path', 'fs-extra'],
function (Q, nesc_utils, wgme_utils, path, fs) {

'use strict';

var module_name;

var obj = {
  generateModule: function (context, module_node) {
    return Q.fcall(function () {
      return obj._saveSource(context.core, module_node);
    })
    .then(function (file_path) {
      return Q.nfcall(nesc_utils.getAppJson, file_path);
    })
    .then(function (app_json) {
      var comp_json = app_json.components[module_name];
    });
  },
  _saveSource: function (core, module_node) {
    return Q.fcall(function () {
       var random_folder_name = Math.random().toString(36).substring(7);
       var tmp_path = path.join('/tmp', random_folder_name);
       module_name = core.getAttribute(module_node, 'name');
       var file_path = path.join(tmp_path, module_name);
       file_path += '.nc';
       var src = core.getAttribute(module_node, 'source');
       fs.outputFileSync(file_path, src);
       return file_path;
    });
  },
  _getMetaNodes: function (context) {
    return Q.fcall(function () {
      if (!context.META) {
        context.META = {};
        var metanodes = context.core.getAllMetaNodes(context.rootNode);
        Object.keys(metanodes).forEach(function (key) {
          var name = context.core.getAttribute(metanodes[key], 'name');
          context.META[name] = metanodes[key];
        });
      }
    });
  }
};

return obj;

});
