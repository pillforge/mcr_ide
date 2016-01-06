define(['q', 'path', 'fs-extra', 'project_root/plugins/common/ParseDump'],
function (Q, path, fs, pd) {

'use strict';

return {
  getAppJson: function (file_path, target) {
    return Q.fcall(function () {
      var execSync = require('child_process').execSync;
      var get_calls_file = '/tmp/' + Math.random().toString(36).substring(7) + '.json';
      var cmd = [
        'ncc',
        '-target=' + target,
        '-fnesc-dump=components',
        '-fnesc-dump=interfacedefs',
        '-fnesc-dump=interfaces',
        '-fsyntax-only',
        '-get-calls=' + get_calls_file,
        file_path
      ].map(function (e) { return "'" + e + "'"; }).join(' ');
      var xml = execSync(cmd, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      var app_json = pd.parse(xml);
      app_json.calls = fs.readJsonSync(get_calls_file);
      return app_json;
    });
  }
};

});
