define([], function () {
  'use strict';
  return {

    readFileSync: function (o_json) {
      var path = require('path');
      var fs = require('fs');
      return fs.readFileSync(path.join(process.env.TOSROOT, o_json.file_path), {
        encoding: 'utf8'
      });
    },

    getFileName: function (file_path) {
      var path = require('path');
      return path.basename(file_path, path.extname(file_path));
    }
  }
});
