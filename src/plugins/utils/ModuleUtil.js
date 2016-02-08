define(['q', 'project_src/plugins/utils/NescUtil', 'path', 'fs-extra'],
function (Q, nesc_util, path, fs) {

'use strict';

var ModuleUtil = function (context, registry_paths, nodes) {
  this._context = context;
  this._core = context.core;
  this._registry_paths = registry_paths;
  this._nodes = nodes;
  nesc_util.getMetaNodes(context);
};

ModuleUtil.prototype.generateModule = function(module_node, app_json) {
  this._module_node = module_node;
  this._module_name = this._core.getAttribute(module_node, 'name');
  this._cur_pos = {
    x: 40,
    y: 120,
    y_length: 5
  };
  if (!app_json) {
    return nesc_util.saveSourceAndDependencies(this._context, this._module_node)
      .then(function (tmp_path) {
        var file_path = path.join(tmp_path, this._module_name + '.nc');
        this._app_json = nesc_util.getAppJson(file_path, 'exp430');
        return this._generateModuleHelper();
      }.bind(this));
  } else {
    this._app_json = app_json;
    return this._generateModuleHelper();
  }
};

ModuleUtil.prototype._generateModuleHelper = function() {
  return this._deleteExistingObjects()
    .then(function () {
      var created_interfaces = this._generateInterfaces();
      if (this._app_json.components[this._module_name].comp_type === 'Module' &&
          !this._app_json.components[this._module_name].generic) { // TODO
        this._generateCallgraph(created_interfaces);
        this._generateVariables(created_interfaces);
      }
      return created_interfaces;
    }.bind(this))
    .catch(function (error) {
      console.log('_generateModuleHelper error', this._module_name, error);
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
  this._cur_pos.x += 60;
  this._cur_pos.y += 60;
  for (var variable in module_calls.variables) {
    if (variable.indexOf('__nesc_sillytask') > -1 ) continue;
    if (module_calls.t_variables.indexOf(variable) > -1 ) continue;
    var var_node = this._core.createNode({
      base: this._context.META.variable,
      parent: this._module_node
    });
    this._core.setAttribute(var_node, 'name', variable);
    this._core.setRegistry(var_node, 'position', {x: this._cur_pos.x, y: this._cur_pos.y});
    this._cur_pos.y += 60;
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
  if (!module_calls) {
    throw new Error(this._module_name + ' No app_json.calls');
  }
  var calls, from_node, i;
  for (var interf_name in module_calls.evcmd) {
    var interface_events = module_calls.evcmd[interf_name];
    for (var evnt in interface_events) {
      calls = interface_events[evnt];
      if (interf_name === '__function')
        from_node = created_interfaces[evnt];
      else from_node = created_interfaces[interf_name].childr[evnt];
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
    if (call_data[1] === 'TaskBasic') return; // TODO
    to_node = created_interfaces[call_data[1]].childr[call_data[2]];
  }
  var conn_node = this._core.createNode({
    base: this._context.META[call_data[0]],
    parent: this._module_node
  });
  this._core.setPointer(conn_node, 'src', from_node);
  this._core.setPointer(conn_node, 'dst', to_node);
};

ModuleUtil.prototype.generateInterfaces = function (node, comp_name, app_json) {
  this._module_node = node;
  this._app_json = app_json;
  this._cur_pos = {
    x: 40,
    y: 120,
    y_length: 5
  };
  var created_interfaces = {};
  this._app_json.components[comp_name].interface_types.forEach(function (interf) {
    var new_node = this._generateInterfaceCommon(interf);
    created_interfaces[interf.as] = {
      itself: new_node
    };
  }.bind(this));
  return created_interfaces;
};

ModuleUtil.prototype._generateInterfaceCommon = function(interf) {
  var base = this._context.META.Uses_Interface;
  if (interf.provided) base = this._context.META.Provides_Interface;
  var new_node = this._core.createNode({
    parent: this._module_node,
    base: base
  });
  this._core.setAttribute(new_node, 'name', interf.as);
  this._core.setAttribute(new_node, 'interface_parameters', interf.interface_parameters);
  if (this._registry_paths && this._nodes) { // TODO
    var interface_ref_node = this._nodes[this._registry_paths.interfacedefs[interf.name]];
    if (interface_ref_node) this._core.setPointer(new_node, 'interface', interface_ref_node);
  }
  this._core.setRegistry(new_node, 'position', {x: this._cur_pos.x, y: this._cur_pos.y});
  this._updateCurPos(this._app_json.interfacedefs[interf.name].functions.length);
  return new_node;
};

ModuleUtil.prototype._generateInterfaces = function () {
  var self = this;
  var created_interfaces = {};
  var interfaces = this._app_json.components[this._module_name].interface_types;
  interfaces.forEach(function (interf) {
    var new_node = this._generateInterfaceCommon(interf);
    var created_evcmd = nesc_util.generateEventsCommands(this._context, this._app_json.interfacedefs[interf.name].functions, new_node);
    created_interfaces[interf.as] = {
      itself: new_node,
      childr: created_evcmd
    };
  }.bind(this));
  var functions = this._app_json.components[this._module_name].function_declarations;
  functions.forEach(function (func) {
    var func_node = self._core.createNode({
      parent: self._module_node,
      base: self._context.META.Function_Declaration
    });
    self._core.setAttribute(func_node, 'name', func);
    self._core.setRegistry(func_node, 'position', {x: self._cur_pos.x, y: self._cur_pos.y});
    self._updateCurPos(5);
    created_interfaces[func] = func_node;
  });
  var tasks = [];
  if (this._app_json.calls[this._module_name])
    tasks = this._app_json.calls[this._module_name].t_variables;
  tasks.forEach(function (task) {
    var task_node = this._core.createNode({
      parent: this._module_node,
      base: this._context.META.Task
    });
    this._core.setAttribute(task_node, 'name', task);
    this._core.setRegistry(task_node, 'position', {x: this._cur_pos.x, y: this._cur_pos.y});
    this._updateCurPos(5);
    created_interfaces[task] = task_node;
  }.bind(this));
  return created_interfaces;
};

ModuleUtil.prototype._updateCurPos = function(object_length) {
  this._cur_pos.x += 200;
  this._cur_pos.y_length = Math.max(this._cur_pos.y_length, object_length);
  if (this._cur_pos.x >= 1000) {
    this._cur_pos.x = 40;
    this._cur_pos.y += 30 * this._cur_pos.y_length;
    this._cur_pos.y_length = 5;
  }
};

return ModuleUtil;

});
