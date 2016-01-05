define(['q', 'path', 'fs-extra', 'project_root/plugins/common/ParseDump'], function (Q, path, fs, pd) {

'use strict';

return {
  getAppJson: function (file_path, target) {
    return Q.fcall(function () {
      var execSync = require('child_process').execSync;
      var get_calls_file = '/tmp/' + Math.random().toString(36).substring(7) + '.json';
      var cmd = [
        'ncc',
        '-target=' + target,
        '-fnesc-dump=interfacedefs',
        '-fnesc-dump=components',
        '-fnesc-dump=interfaces',
        '-fsyntax-only',
        '-get-calls=' + get_calls_file,
        file_path
      ].join(' ');
      var app_json = pd.parse(execSync(cmd, {
        encoding: 'utf8'
      }));
      app_json.calls = fs.readJsonSync(get_calls_file);
      return app_json;
    });
  }
};

});
