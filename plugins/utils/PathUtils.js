define([], function () {
  'use strict';
  return {
    getFileName: function (file_path) {
      var path = require('path');
      return path.basename(file_path, path.extname(file_path));
    }
  }
});
