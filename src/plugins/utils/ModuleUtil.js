define(['q', 'project_src/plugins/utils/NescUtil', 'path', 'fs-extra'],
function (Q, nesc_util, path, fs) {

'use strict';

var ModuleUtil = function (context, module_node) {
  this._context = context;
  this._core = context.core;
  this._module_node = module_node;
  this._module_name = context.core.getAttribute(module_node, 'name');
  this._getMetaNodes();
};

ModuleUtil.prototype.generateModule = function() {
  return this._saveSourceAndDependencies()
    .then(function (tmp_path) {
      var file_path = path.join(tmp_path, this._module_name + '.nc');
      return nesc_util.getAppJson(file_path, 'exp430');
    }.bind(this))
    .then(function (app_json) {
      this._app_json = app_json;
      return this._deleteExistingObjects();
    }.bind(this))
    .then(function () {
      var created_interfaces = this._generateInterfaces();
      this._generateCallgraph(created_interfaces);
      this._generateVariables(created_interfaces);
    }.bind(this));
};

ModuleUtil.prototype._deleteExistingObjects = function() {
  return Q.nfcall(this._core.loadChildren, this._module_node)
    .then(function (children) {
      children.forEach(function (child) {
        this._core.deleteNode(child);
      }.bind(this));
    }.bind(this));
};

ModuleUtil.prototype._generateVariables = function(created_interfaces) {
  var module_calls = this._app_json.calls[this._module_name];
  for (var variable in module_calls.variables) {
    if (variable.indexOf('__nesc_sillytask') > -1 ) continue;
    if (module_calls.t_variables.indexOf(variable) > -1 ) continue;
    var var_node = this._core.createNode({
      base: this._context.META.variable,
      parent: this._module_node
    });
    this._core.setAttribute(var_node, 'name', variable);
    var access_list = module_calls.variables[variable];
    var new_list = {};
    var access, key;
    for (var access_key in access_list) {
      access = access_list[access_key];
      key = [access[0], access[1]].join('__');
      new_list[key] = new_list[key] || access[2];
      if (new_list[key].indexOf(access[2]) < 0)
        new_list[key] = 'readwrite';
    }
    var from_node;
    for (key in new_list) {
      access = key.split('__').concat(new_list[key]);
      if (access[1] === 'runTask')
        from_node = created_interfaces[access[0]];
      else from_node = created_interfaces[access[0]].childr[access[1]];
      var access_node = this._core.createNode({
        base: this._context.META[access[2]] || this._context.META.read, // when a variable is accessed via its address, the access returns empty
        parent: this._module_node
      });
      this._core.setPointer(access_node, 'src', from_node);
      this._core.setPointer(access_node, 'dst', var_node);
    }
  }
};

ModuleUtil.prototype._generateCallgraph = function(created_interfaces) {
  var module_calls = this._app_json.calls[this._module_name];
  var calls, from_node, i;
  for (var interf_name in module_calls.evcmd) {
    var interface_events = module_calls.evcmd[interf_name];
    for (var evnt in interface_events) {
      calls = interface_events[evnt];
      from_node = created_interfaces[interf_name].childr[evnt];
      for (i = calls.length - 1; i >= 0; i--) {
        this._generateConnection(from_node, calls[i], created_interfaces);
      }
    }
  }
  for (var task_name in module_calls.tasks) {
    calls = module_calls.tasks[task_name];
    from_node = created_interfaces[task_name];
    for (i = calls.length - 1; i >= 0; i--) {
      this._generateConnection(from_node, calls[i], created_interfaces);
    }
  }
};

ModuleUtil.prototype._generateConnection = function(from_node, call_data, created_interfaces) {
  var to_node;
  if (call_data[0] == 'post') {
    to_node = created_interfaces[call_data[1]];
  } else {
    to_node = created_interfaces[call_data[1]].childr[call_data[2]];
  }
  var conn_node = this._core.createNode({
    base: this._context.META[call_data[0]],
    parent: this._module_node
  });
  this._core.setPointer(conn_node, 'src', from_node);
  this._core.setPointer(conn_node, 'dst', to_node);
};

ModuleUtil.prototype._generateInterfaces = function() {
  var created_interfaces = {};
  var interfaces = this._app_json.components[this._module_name].interface_types;
  interfaces.forEach(function (interf) {
    var base = this._context.META.Uses_Interface;
    if (interf.provided) base = this._context.META.Provides_Interface;
    var new_node = this._core.createNode({
      parent: this._module_node,
      base: base
    });
    this._core.setAttribute(new_node, 'name', interf.as);
    var created_evcmd = this._generateEventsCommands(interf.name, new_node);
    created_interfaces[interf.as] = {
      itself: new_node,
      childr: created_evcmd
    };
  }.bind(this));
  var tasks = this._app_json.calls[this._module_name].t_variables;
  tasks.forEach(function (task) {
    var task_node = this._core.createNode({
      parent: this._module_node,
      base: this._context.META.Task
    });
    this._core.setAttribute(task_node, 'name', task);
    created_interfaces[task] = task_node;
  }.bind(this));
  return created_interfaces;
};

ModuleUtil.prototype._generateEventsCommands = function(interf_name, interf_node) {
  var created_nodes = {};
  this._app_json.interfacedefs[interf_name].functions.forEach(function (func) {
    var base = func.event_command == 'event' ? 'Event' : 'Command';
    var new_node = this._core.createNode({
      parent: interf_node,
      base: this._context.META[base]
    });
    this._core.setAttribute(new_node, 'name', func.name);
    var x = base == 'Event' ? 500 : 20;
    this._core.setRegistry(new_node, 'position', {x: x, y: 50});
    created_nodes[func.name] = new_node;
  }.bind(this));
  return created_nodes;
};

ModuleUtil.prototype._saveSourceAndDependencies = function() {
  var deferred = Q.defer();
  var random_folder_name = Math.random().toString(36).substring(7);
  var tmp_path = path.join('/tmp', random_folder_name);
  var file_path = path.join(tmp_path, this._module_name + '.nc');
  fs.outputFileSync(file_path, this._core.getAttribute(this._module_node, 'source'));
  this._saveParentsHeaders(tmp_path)
    .then(function () {
      return deferred.resolve(tmp_path);
    });
  return deferred.promise;
};

ModuleUtil.prototype._saveParentsHeaders = function(tmp_path) {
  var deferred = Q.defer();
  var parent_node = this._core.getParent(this._module_node);
  Q.nfcall(this._core.loadChildren, parent_node)
    .then(function (children) {
      children.forEach(function (child) {
        if (this._core.isTypeOf(child, this._context.META.Header_File)) {
          var child_name = this._core.getAttribute(child, 'name');
          var file_path = path.join(tmp_path, child_name + '.h');
          fs.outputFileSync(file_path, this._core.getAttribute(child, 'source'));
        }
      }.bind(this));
      deferred.resolve(tmp_path);
    }.bind(this))
    .catch(function (error) {
      return deferred.reject(error);
    });
  return deferred.promise;
};

ModuleUtil.prototype._getMetaNodes = function() {
  return Q.fcall(function () {
    if (!this._context.META) {
      this._context.META = {};
      var metanodes = this._core.getAllMetaNodes(this._context.rootNode);
      Object.keys(metanodes).forEach(function (key) {
        var name = this._core.getAttribute(metanodes[key], 'name');
        this._context.META[name] = metanodes[key];
      }.bind(this));
    }
  }.bind(this));
};

return ModuleUtil;

});
