define([ 'project_src/plugins/utils/NescUtil',
         'project_src/plugins/utils/ModuleUtil',
         'q', 'path', 'fs-extra', 'async', 'lodash'],
function (nesc_util, ModuleUtil, Q, path, fs, async, _) {

'use strict';

var ImporterUtil = function (context, target) {
  this._context = context;
  this._core = context.core;
  this._target = target;
  this._nodes = {};
  this._registry_paths = context.core.getRegistry(context.rootNode, 'paths') || {};
  this._registry_paths.interfacedefs = this._registry_paths.interfacedefs || {};
  this._registry_paths.folders = this._registry_paths.folders || {};
  this._registry_paths.components = this._registry_paths.components || {};
  nesc_util.getMetaNodes(context);
  this._areNodesLoaded = false;
};

ImporterUtil.prototype.importAComponentFromPath = function (comp_path, singular, dummy) {
  var deferred = Q.defer();
  var self = this;
  var is_directory = fs.lstatSync(comp_path).isDirectory();
  var dir_path = is_directory ? comp_path : path.dirname(comp_path);
  self._app_name = path.basename(dir_path);
  self._loadNodes().then(function () {

    var comp_name;
    if (!is_directory) {
      comp_name = path.basename(comp_path, path.extname(comp_path));
      if (self._doesExist(comp_path, comp_name)) return 'no appjson';
    } else {
      comp_name = self._getComponentName(dir_path);
    }
    if(self._registry_paths.components[comp_name]) {
      return 'exist';
    }

    self._app_json = nesc_util.getAppJson(comp_path, self._target, true);
    if (self._app_json === null) return 'no appjson';

    if (self._typeOfComponent(comp_path) === 'generic') {
      // Create a dummy non-generic component to fool nescc so we get calls graph
      return self._callImportAComponentWithDummy(comp_name);
    }

    self._importInterfacedefs(dir_path);

    if (!is_directory && self._app_json.interfacedefs[comp_name]) return;

    if (singular) singular = comp_name;
    return self._importComponents(dir_path, singular, dummy)
      .then(function () {
        self._importHeaderFiles(comp_name, dir_path, dummy);
        return 'regular';
      });
  })
  .then(function (kase) {
    if (kase === 'exist' || kase === 'no appjson') {
      deferred.resolve();
    } else {
      self._core.setRegistry(self._context.rootNode, 'paths', self._registry_paths);
      deferred.resolve(self._registry_paths);
    }
  })
  .fail(function (error) {
    deferred.reject(new Error(error));
  });
  return deferred.promise;
};

ImporterUtil.prototype._callImportAComponentWithDummy = function(comp_name) {
  var self = this;
  var deferred = Q.defer();
  var dummy_name = 'Dummy' + comp_name;
  var parameters = self._app_json.components[comp_name].parameters;
  var config_templ = nesc_util.getConfigurationTemplate();
  var config_content = config_templ({
    name: dummy_name,
    generic_components: [{
      type: comp_name,
      arguments: _.fill(new Array(parameters.length), 0).join(', '),
      name: comp_name
    }]
  });
  var dummy_dir = nesc_util.getTmp();
  var dummy_path = path.join(dummy_dir, dummy_name + '.nc');
  fs.outputFileSync(dummy_path, config_content);
  deferred.resolve(self.importAComponentFromPath(dummy_path, false, dummy_name));
  return deferred.promise;
};

ImporterUtil.prototype._getComponentName = function(dir_path) {
  var makefile_path = path.join(dir_path, 'Makefile');
  if (!fs.existsSync(makefile_path)) return null;
  var makefile_content = fs.readFileSync(makefile_path, 'utf8');
  var m = makefile_content.match(/COMPONENT=(\w+\b)/);
  if (m) return m[1];
  return null;
};

ImporterUtil.prototype._loadNodes = function () {
  var self = this;
  var deferred = Q.defer();
  if (this._areNodesLoaded) deferred.resolve();
  else {
    this._areNodesLoaded = true;
    async.forEachOf(this._registry_paths, function (value, key, callback) {
      async.forEachOf(value, function (v, k, c) {
        self._core.loadByPath(self._context.rootNode, v)
          .then(function (node) {
            self._nodes[v] = node;
            c();
          });
      }, callback);
    }, deferred.resolve);
  }
  return deferred.promise;
};

ImporterUtil.prototype._doesExist = function(comp_path, comp_name) {
  if (this._registry_paths.interfacedefs[comp_name] || this._registry_paths.components[comp_name])
    return true;
  return false;
};

ImporterUtil.prototype._typeOfComponent = function(comp_path) {
  var comp_name = path.basename(comp_path, path.extname(comp_path));
  if (this._app_json.interfacedefs[comp_name]) return 'interfacedef';
  if (this._app_json.components[comp_name]) {
    if (this._app_json.components[comp_name].generic) return 'generic';
    else return 'non-generic';
  }
  return null;
};

ImporterUtil.prototype.importAllTosComponents = function() {
  var self = this;
  var deferred = Q.defer();
  var components = self._getComponents();
  var m_components = Object.keys(components);
  m_components.unshift('AMQueueP.nc');
  var counter = 0;
  var length = m_components.length;
  async.eachSeries(m_components, function iterator(key, callback) {
    console.log(counter++ + '/' + length);
    self.importAComponentFromPath(components[key]).then(function () {
      callback();
    });
  }, deferred.resolve);
  return deferred.promise;
};

ImporterUtil.prototype._importHeaderFiles = function(comp_name, dir_path, dummy) {
  var self = this;
  if (dummy) return;
  var comp_node = self._nodes[self._registry_paths.components[comp_name]];
  if (!comp_node) comp_node = self._nodes[self._registry_paths.interfacedefs[comp_name]];
  if (!comp_node) {
    console.log('Something is wrong');
    throw new Error('_importHeaderFiles');
  }
  var parent = self._core.getParent(comp_node);
  if (self._core.getRegistry(parent, 'headers')) return;
  self._core.setRegistry(parent, 'headers', true);
  var files = fs.readdirSync(dir_path);
  files.forEach(function (file) {
    if (path.extname(file) === '.h') {
      var f_content = fs.readFileSync(path.resolve(dir_path, file), 'utf8');
      var h_node = self._core.createNode({
        parent: parent,
        base: self._context.META.Header_File
      });
      self._core.setAttribute(h_node, 'name', path.basename(file, '.h'));
      self._core.setAttribute(h_node, 'source', f_content);
    }
  });
};

ImporterUtil.prototype._importInterfacedefs = function (dir_path) {
  for (var interf_name in this._app_json.interfacedefs) {
    if (!this._registry_paths.interfacedefs[interf_name]) {
      var interf_json = this._app_json.interfacedefs[interf_name];
      var parent_node = this._mkdirp(interf_json.file_path);
      var base = this._context.META.Interface_Definition;
      var new_node = this._core.createNode({
        parent: parent_node,
        base: base
      });
      this._core.setAttribute(new_node, 'name', interf_name);
      this._saveSource(new_node, interf_json, dir_path);
      nesc_util.generateEventsCommands(this._context, interf_json.functions, new_node);
      this._registry_paths.interfacedefs[interf_name] = this._core.getPath(new_node);
      this._nodes[this._registry_paths.interfacedefs[interf_name]] = new_node;
    }
  }
};

ImporterUtil.prototype._saveSource = function(new_node, comp_json, dir_path) {
  var self = this;
  if (comp_json.file_path.indexOf('tos/') !== 0) {
    var file_path = comp_json.file_path;
    if (!file_path.match(/^[tos|apps]/)) {
      file_path = path.join('apps', self._app_name, file_path);
    }
    var p = path.resolve(dir_path, '..', path.relative('apps', file_path));
    var source = fs.readFileSync(p, {
      encoding: 'utf8'
    });
    self._core.setAttribute(new_node, 'source', source);
  }
};

ImporterUtil.prototype._importComponents = function(dir_path, single_comp, dummy) {
  var self = this;
  var keys = Object.keys(self._app_json.components);
  if (dummy) _.pull(keys, dummy);
  if (single_comp) keys = [single_comp];
  keys.forEach(function (c_name) {
    if (!self._registry_paths.components[c_name]) {
      var comp_json = self._app_json.components[c_name];
      var parent_node = self._mkdirp(comp_json.file_path);
      var type = (comp_json.generic ? 'Generic_' : '') + comp_json.comp_type;
      var base = self._context.META[type];
      var new_node = self._core.createNode({
        parent: parent_node,
        base: base
      });
      self._core.setAttribute(new_node, 'name', c_name);
      self._core.setAttribute(new_node, 'safe', comp_json.safe);
      self._saveSource(new_node, comp_json, dir_path);
      self._registry_paths.components[c_name] = self._core.getPath(new_node);
      self._nodes[self._registry_paths.components[c_name]] = new_node;
    }
  });
  return Q.all(keys.map(function (c_name) {
    var module_util = new ModuleUtil(self._context, self._registry_paths, self._nodes);
    var new_node = self._nodes[self._registry_paths.components[c_name]];
    var comp_json = self._app_json.components[c_name];
    if (new_node) {
      return module_util.generateModule(new_node, self._app_json)
        .then(function (created_interfaces) {
          if (comp_json.comp_type === 'Configuration') {
            self._importRefComponentsAndWirings(c_name, new_node, created_interfaces);
          }
        });
    } else {
      return Q.fcall(function () {});
    }
  }));
};

ImporterUtil.prototype._importRefComponentsAndWirings = function(c_name, node, created_interfaces) {
  var self = this;
  var created_components = {};
  created_components[c_name] = {};
  created_components[c_name].itself = node;
  created_components[c_name].childr = created_interfaces;
  var module_util = new ModuleUtil(self._context, self._registry_paths, self._nodes);
  var wirings = self._app_json.components[c_name].wiring;
  wirings.forEach(function (wire) {
    var src_end = get_end(wire.from);
    var dst_end = get_end(wire.to);
    if (src_end && dst_end) {
      var base = self._context.META.Link_Interface;
      if (c_name == wire.from.name || c_name == wire.to.name) {
        base = self._context.META.Equate_Interface;
      }
      var wire_node = self._core.createNode({
        parent: node,
        base: base
      });
      self._core.setPointer(wire_node, 'src', src_end);
      self._core.setPointer(wire_node, 'dst', dst_end);
      if (wire.from.cst) {
        self._core.setAttribute(wire_node, 'src_params', wire.from.cst);
      }
      if (wire.to.cst) {
        self._core.setAttribute(wire_node, 'dst_params', wire.to.cst);
      }
    } else {
      // TinySchedulerC-TaskBasic TODO
    }
  });
  function get_end (end_node_json) {
    var name = end_node_json.name;
    // To handle generic components
    if (end_node_json.name.includes('.')) {
      name = end_node_json.name.split('.')[1];
    }
    if (!created_components[name]) {
      var base = self._context.META.ConfigurationRef;
      var comp_name = path.basename(end_node_json.component_base, path.extname(end_node_json.component_base));
      if (self._app_json.components[comp_name].comp_type === 'Module') {
        base = self._context.META.ModuleRef;
      }
      var new_node = self._core.createNode({
        parent: node,
        base: base
      });
      self._core.setAttribute(new_node, 'name', name);
      if (self._app_json.instance_components[end_node_json.name]) {
        var args = self._app_json.instance_components[end_node_json.name].arguments;
        self._core.setAttribute(new_node, 'arguments', args);
      }
      var ref_node = self._nodes[self._registry_paths.components[comp_name]];
      if (ref_node) self._core.setPointer(new_node, 'ref', ref_node);
      created_components[name] = {
        itself: new_node,
        childr: module_util.generateInterfaces(new_node, comp_name, self._app_json)
      };
    }
    if (end_node_json.interface === 'TaskBasic') return null; // TODO
    return created_components[name].childr[end_node_json.interface].itself;
  }
};

ImporterUtil.prototype._mkdirp = function (file_path) {
  var self = this;
  if (!file_path.match(/^[tos|apps]/)) {
    file_path = path.join('apps', self._app_name, file_path);
  }
  var dirs = path.dirname(file_path).split(path.sep);
  var parent_node = self._context.rootNode;
  var curr_path = '';
  dirs.forEach(function (dir) {
    curr_path += '/' + dir;
    if (!self._registry_paths.folders[curr_path]) {
      var dir_node = self._core.createNode({
        parent: parent_node,
        base: self._context.META.Folder
      });
      self._core.setAttribute(dir_node, 'name', dir);
      self._registry_paths.folders[curr_path] = self._core.getPath(dir_node);
      self._nodes[self._registry_paths.folders[curr_path]] = dir_node;
    }
    parent_node = self._nodes[self._registry_paths.folders[curr_path]];
  });
  return parent_node;
};

ImporterUtil.prototype._getDirectories = function () {
  var spawnSync = require('child_process').spawnSync;
  var result = spawnSync('ncc', ['-v', '-target=' + this._target], {
    encoding: 'utf8'
  });
  var directories = result.stderr.split('\n')[0];
  return directories.split(' -I').slice(1);
};

ImporterUtil.prototype._getComponents = function () {
  var components = {};
  var dirs = this._getDirectories(this._target);
  dirs.forEach(function (dir) {
    if (fs.existsSync(dir)) {
      var files = fs.readdirSync(dir);
      files.forEach(function (file) {
        if (path.extname(file) === '.nc') {
          components[file] = components[file] || path.join(dir, file);
        }
      });
    }
  });
  return components;
};

return ImporterUtil;
});
