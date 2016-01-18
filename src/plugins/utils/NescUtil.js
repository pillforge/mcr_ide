define(['q', 'path', 'fs-extra', 'module'],
function (Q, path, fs, module) {

'use strict';

return {
  getAppJson: getAppJson,
  getMetaNodes: getMetaNodes,
  saveSourceAndDependencies: saveSourceAndDependencies,
  compileApp: compileApp,
  addBlobs: addBlobs,
  generateNescCode: generateNescCode,
  convertCalls: convertCalls
};

function getAppJson (file_path, target) {
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
    var parser_path = path.join(module.uri, '../../../../plugins/common/ParseDump');
    var pd = require(parser_path);
    var app_json = pd.parse(xml);
    app_json.calls = convertCalls(fs.readJsonSync(get_calls_file));
    return app_json;
  });
}

function getMetaNodes (context) {
  if (!context.META) {
    context.META = {};
    var metanodes = context.core.getAllMetaNodes(context.rootNode);
    Object.keys(metanodes).forEach(function (key) {
      var name = context.core.getAttribute(metanodes[key], 'name');
      context.META[name] = metanodes[key];
    });
  }
}

function saveSourceAndDependencies (context, node) {
  var core = context.core;
  getMetaNodes(context);
  var random_folder_name = Math.random().toString(36).substring(7);
  var tmp_path = path.join('/tmp', random_folder_name);
  var parent_node = core.getParent(node);
  return Q.nfcall(core.loadChildren, parent_node)
    .then(function (children) {
      children.forEach(function (child) {
        var file_path;
        var child_name = core.getAttribute(child, 'name');
        if (core.isTypeOf(child, context.META.Nesc_File)) {
          child_name += '.nc';
        } else if (core.isTypeOf(child, context.META.Header_File)) {
          child_name += '.h';
        }
        file_path = path.join(tmp_path, child_name);
        fs.outputFileSync(file_path, core.getAttribute(child, 'source'));
      });
      return tmp_path;
    });
}

function compileApp (context, node, target) {
  var core = context.core;
  return saveSourceAndDependencies(context, node)
    .then(function (tmp_path) {
      var node_name = core.getAttribute(node, 'name');
      _createMakefile(tmp_path, node_name);
      var execSync = require('child_process').execSync;
      var cmd = 'make ' + target;
      execSync(cmd, {
        cwd: tmp_path
      });
      return tmp_path;
    });
}

function _createMakefile (tmp_path, node_name) {
  var makefile_dot = _getDotTemplate('../NescUtil/Makefile.dot');
  fs.outputFileSync(path.join(tmp_path, 'Makefile'), makefile_dot({name: node_name}));
}

function addBlobs (context, directory, name) {
  var bc = context.blobClient;
  var artifact = bc.createArtifact(name);
  var files = {};
  fs.readdirSync(directory).forEach(function (file) {
    files[file] = fs.readFileSync(path.join(directory, file));
  });
  return artifact.addFiles(files)
    .then(function (hashes) {
      return bc.saveAllArtifacts();
    })
    .then(function (hashes) {
      return bc.getDownloadURL(hashes[0]);
    });
}

function generateNescCode (context, node) {
  var core = context.core;
  var configuration_dot = _getDotTemplate('../NescUtil/Configuration.dot');
  return Q.nfcall(core.loadChildren, node)
    .then(function (children) {
      var obj = {
        components: [],
        generic_components: []
      };
      children.forEach(function (child) {
        var name = core.getAttribute(child, 'name');
        var meta = core.getAttribute(core.getMetaType(child), 'name');
        if (['Configuration', 'Module'].indexOf(meta) > -1) {
          obj.components.push(name);
        } else if (['Generic_Configuration', 'Generic_Module'].indexOf(meta) > -1) {
          obj.generic_components.push({
            type: core.getAttribute(core.getBase(child), 'name'),
            parameters: core.getAttribute(child, 'parameters'),
            name: name
          });
        }
      });
      return configuration_dot(obj);
    });
}

function _getDotTemplate (template_path) {
  var dot = require('dot');
  dot.templateSettings.strip = false;
  template_path = path.join(module.uri, template_path);
  return dot.template(fs.readFileSync(template_path));
}

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
