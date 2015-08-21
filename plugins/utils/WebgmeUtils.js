define(['./Constants', './NescUtils', './MetaMap', './PathUtils', './ModuleCalls'],
function (Constants, nesc_utils, m_map, path_utils, ModuleCalls) {

'use strict';

return {

  // set registry for 'calls' and 'tasks'
  // should be called only for 'modules'
  setRegistryCallsTasks: function (client, node, c_json, notes, calls) {
    var mc = new ModuleCalls();
    var source = path_utils.readFileSync(c_json, notes);
    // var all_calls = mc.getCalls(source);
    var tasks = mc.getTasks(source);
    // if (client.core.getAttribute(node, 'name') == 'BlinkC') {
    //   console.log('allcalls: ', JSON.stringify(all_calls, null, '  '));
    //   console.log('just calls', JSON.stringify(calls, null, '  '));
    //   console.log('converted', JSON.stringify(this.convertJsonPassiveToActive(calls), null, '  '));
    // }
    client.core.setRegistry(node, 'calls', this.convertJsonPassiveToActive(calls));
    client.core.setRegistry(node, 'tasks', tasks);
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
  mkdirp: function (client, file_path, nodes, fwp) {
    var path = require('path');
    var dirs = path.dirname(file_path).split(path.sep);
    // A possible WebGME bug
    if (dirs[0] === '.') {
      dirs = ['apps'];
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
  convertJsonPassiveToActive: function (from) {
    var to = {
      evcmd: {},
      tasks: {}
    };

    for (var iname in from) {
      if (iname.indexOf('__variables') < 0) continue;
      for (var fname in from[iname]) {
        var a_fn = from[iname][fname];
        for (var i = a_fn.length - 1; i >= 0; i--) {
          var fncall = a_fn[i];
          to.evcmd[fncall[1]] = to.evcmd[fncall[1]] || {};
          to.evcmd[fncall[1]][fncall[2]] = to.evcmd[fncall[1]][fncall[2]] || [];
          to.evcmd[fncall[1]][fncall[2]].push([fncall[0], iname, fname]);
        }
      }
    }

    return to;

  }

};

});
