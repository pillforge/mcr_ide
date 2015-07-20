define([], function () {
  'use strict';
  return {

    readFileSync: function (o_json, notes) {
      var path = require('path');
      var fs = require('fs');
      var f_path = path.join(process.env.TOSROOT, o_json.file_path);
      if (!fs.existsSync(f_path) && notes.app_dir_path) {
        f_path = path.join(notes.app_dir_path, o_json.file_path);
      }
      if (fs.existsSync(f_path))
        return fs.readFileSync(f_path, {
          encoding: 'utf8'
        });
      return '';
    },

    getFileName: function (file_path) {
      var path = require('path');
      return path.basename(file_path, path.extname(file_path));
    }
  }
});
