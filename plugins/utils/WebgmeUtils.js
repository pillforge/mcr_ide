define(['./Constants', './NescUtils', './MetaMap', './PathUtils', './ModuleCalls'],
function (Constants, nesc_utils, m_map, path_utils, ModuleCalls) {

'use strict';

return {

  // set registry for 'calls' and 'tasks'
  // should be called only for 'modules'
  setRegistryCallsTasks: function (client, node, calls) {
    var all_info = this.convertJsonPassiveToActive(calls);
    client.core.setRegistry(node, 'calls', all_info);
    client.core.setRegistry(node, 'tasks', all_info.t_variables);
  },

  // the first argument should be plugin's this object
  getMetaNode: function (client, type, obj_json) {
    var name = '';
    switch (type) {
      case 'interface':
        name = nesc_utils.getBaseInterface();
        break;
      case 'component':
        name = nesc_utils.getBaseComp(obj_json);
        break;
      case 'up':
        name = nesc_utils.getBaseUP(obj_json);
        break;
    }
    return client.META[m_map[name]];
  },

  // the first argument should be plugin's this object
  // caches the created object in nodes and add its path in fwp
  // returns the existing or created WebGME object
  // Use ImporterUtil
  mkdirp: function (client, file_path, nodes, fwp, notes) {
    var path = require('path');
    var dirs = path.dirname(file_path).split(path.sep);
    if (dirs[0] !== 'tos') {
      if (dirs[0] === '.') {
        dirs = ['apps'];
        if (notes) {
          dirs.push(path.basename(notes.app_dir_path));
        }
      } else if (dirs[0] === '..') {
        dirs[0] = 'apps';
      } else {
        dirs.unshift('apps');
      }
    }
    var parent_node = client.rootNode;
    var curr_path = '';
    for (var i = 0; i < dirs.length; i++) {
      curr_path += (curr_path === '' ? '' : Constants.DELIMITER) + dirs[i];
      if (!nodes[curr_path]) {
        var dir_node = client.core.createNode({
          parent: parent_node,
          base: client.META[m_map.Folder]
        });
        client.core.setAttribute(dir_node, 'name', dirs[i]);
        nodes[curr_path] = dir_node;
        fwp[curr_path] = client.core.getPath(dir_node);
      }
      parent_node = nodes[curr_path];
    }
    return parent_node;
  },

  createHeaderFiles: function (client, include_paths, nodes, def_parent) {
    var fs = require('fs');
    var path = require('path');
    if (!include_paths) return;
    include_paths.forEach(function(p) {
      var files = fs.readdirSync(p);
      var parent = nodes['apps__' + path.basename(p)]; // TODO
      if (!parent) {
        parent = def_parent;
      }
      if (parent) {
        files.forEach(function(f) {
          if (path.extname(f) == '.h') {
            var f_content = fs.readFileSync(path.resolve(p, f), 'utf8');
            var h_node = client.core.createNode({
              parent: parent,
              base: client.META.Header_File
            });
            client.core.setAttribute(h_node, 'name', path.basename(f, '.h'));
            client.core.setAttribute(h_node, 'source', f_content);
          }
        });
      }
    });
  },

  // the first argument should be plugin's this object
  // calls the callback(next) with err and { MainC__Scheduler: {<WebGME obj>} }
  // paths_arr = [ {paths: c_wgme_paths, depth: 1 }, { paths: m_wgme_paths, depth: 2 } ];
  loadObjects: function (client, paths_arr, next) {
    var core = client.core;
    var async = require('async');
    var nodes = {};

    async.each(paths_arr, function (obj, callback) {
      async.forEachOf(obj.paths, function (value, key, callback) {
        load_and_store(value, key, obj.depth, callback);
      }, callback);
    }, function (err) {
      next(null, nodes);
    });

    function load_and_store (value, key, depth, callback) {
      core.loadByPath(client.rootNode, value, function (err, node) {
        nodes[key] = node;
        load_and_store_children(node, key, depth, callback);
      });
    }

    function load_and_store_children (node, prefix, depth, next) {
      if (depth < 1) return next();
      core.loadChildren(node, function (err, children) {
        async.each(children, function (child, callback) {
          var name = core.getAttribute(child, 'name');
          var store_name = [prefix, name].join(Constants.DELIMITER);
          nodes[store_name] = child;
          load_and_store_children(child, store_name, depth - 1, callback);
        }, next);
      });
    }
  },

  //
  // from:
  // {
  // "Timer0": {
  //   "startPeriodic": [
  //     [
  //       "call",
  //       "Boot",
  //       "booted"
  //     ]
  // --> to:
  // "evcmd": {
  //   "Boot": {
  //     "booted": [
  //       [
  //         "call",
  //         "Timer0",
  //         "startPeriodic"
  //       ],
  // TOBEREMOVED, check: > src > plugins > utils > NescUtil
  convertJsonPassiveToActive: function (from) {
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
            if (!to.tasks[fncall[1]].some(function (e) {
              return e.join() == new_call.join();
            })) {
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

    return to;

  }

};

});
