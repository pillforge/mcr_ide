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
      app_json.calls = convertCalls(fs.readJsonSync(get_calls_file));
      return app_json;
    });
  }
};

function convertCalls (calls) {
  var converted_calls = {};
  for (var key in calls) {
    var from = calls[key];
    var to = {
      evcmd: {},
      tasks: {},
      variables: {},
      t_variables: []
    };
    for (var iname in from) {
      if (iname.indexOf('__variables') > -1) {
        for (var vname in from[iname]) {
          if (vname.indexOf('__nesc_sillytask_') < 0) {
            to.variables[vname] = from[iname][vname];
          } else {
            to.t_variables.push(vname.substr('__nesc_sillytask_'.length));
          }
        }
        continue;
      }
      for (var fname in from[iname]) {
        var a_fn = from[iname][fname];
        for (var i = a_fn.length - 1; i >= 0; i--) {
          var fncall = a_fn[i];
          var new_call = [fncall[0], iname, fname];
          if (fname === 'postTask') {
            new_call = ['post', iname];
          }
          if (fncall[2] === 'runTask') {
            to.tasks[fncall[1]] = to.tasks[fncall[1]] || [];
            if (!to.tasks[fncall[1]].some(test)) {
              to.tasks[fncall[1]].push(new_call);
            }
          } else {
            to.evcmd[fncall[1]] = to.evcmd[fncall[1]] || {};
            to.evcmd[fncall[1]][fncall[2]] = to.evcmd[fncall[1]][fncall[2]] || [];
            to.evcmd[fncall[1]][fncall[2]].push(new_call);
          }
        }
      }
    }
    converted_calls[key] = to;
  }
  return converted_calls;
  function test (e) {
    return e.join() == new_call.join();
  }
}

});
