define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'fs',
  'path',
  'module',
  'util',
  './ParseDump'],
  function (PluginBase, PluginConfig, fs, path, module, util, ParseDump) {
    "use strict";

    var TinyOSPopulate = function () {
      PluginBase.call(this);
    };

    TinyOSPopulate.prototype = Object.create(PluginBase.prototype);
    TinyOSPopulate.prototype.constructor = TinyOSPopulate;
    TinyOSPopulate.prototype.getName = function() {
      return "TinyOS Populator";
    };
    TinyOSPopulate.prototype.getVersion = function () {
      return '0.1.1';
    };

    TinyOSPopulate.getDefaultConfig = function() {
      return new PluginConfig();
    };

    TinyOSPopulate.prototype.main = function (callback) {
      var self = this;
      self._wi("TinyOS Populate main");

      self._loadNodes(self.rootNode, function(err) {
        if (err) {
          self.result.setSuccess(false);
          callback(err, self.result);
        } else {
          self._wi("Nodes are loaded");
          
          try {
            
            var cwd = path.dirname(module.uri);
            self._wi(cwd);
            var pd = new ParseDump();
            var app_json = pd.parse(path.resolve(cwd, 'MainC.xml'));

            self._wi('app_json');
            self._wi(JSON.stringify(app_json, null, 2));
            
            self._populate(app_json);
            self.save();

            self.result.setSuccess(true);
            callback(null, self.result);

          } catch(error) {
            self._wi("Error in TinyOSPopulate Main");
            self._wi(error.stack);
            self.result.setSuccess(false);
            callback(error, self.result);
          }
          
        }
      });

      self._wi("TinyOSPopulate main end");
    };
    
    TinyOSPopulate.prototype._populate = function (app_json) {
      var self = this;
      self._objectPath = {};

      self._wi("Creating Interfaces");
      for (var key in app_json.interfaces) {
        self._createInterface(app_json.interfaces[key]);
      }

      self._wi("Creating Components");
      for (key in app_json.components) {
        self._createComponent(app_json.components[key]);
      }

      self._wi("Creating Uses & Provides Interfaces");
      // var node_cache_string = util.inspect(self._nodeCache, {
      //   showHidden: true,
      //   depth: 3
      // });
      // self._wi(node_cache_string);
      for (key in app_json.components) {
        self._createUsesProvidesInterfaces(app_json.components[key]);
      }

    };

    TinyOSPopulate.prototype._createUsesProvidesInterfaces = function (
      component) {
      var self = this;
      for (var i = component.interface_types.length - 1; i >= 0; i--) {
        var curr_interface = component.interface_types[i];
        self._wi("Creating uses/provides interface: " + curr_interface.name +
          " at " + component.file_path);
        var base = self.META.Uses_Interface;
        if (curr_interface.provided === 1)
          base = self.META.Provides_Interface;
        var interface_node = self.core.createNode({
          base: base,
          parent: self._nodeCache[self._objectPath[component.file_path]]
          // interface: 
        });
        self.core.setAttribute(interface_node, 'name', curr_interface.name);
        self._cacheNode(interface_node);
      }

    };

    TinyOSPopulate.prototype._createComponent = function (component) {
      var self = this;
      self._wi("Creating component: " + component.name);
      var parent_node = self._mkdir_p(path.dirname(component.file_path));
      var base = self.META.Configuration;
      if (component.comp_type == 'Module') base = self.META.Module;
      var component_node = self.core.createNode({
        base: base,
        parent: parent_node
      });
      self.core.setAttribute(component_node, 'name', component.name);
      self.core.setAttribute(component_node, 'safe', component.safe);
      self._cacheNode(component_node);
      self._storeObjectPath(component, component_node);
    };

    TinyOSPopulate.prototype._createInterface = function (curr_interface) {
      var self = this;
      self._wi("Creating interface: " + curr_interface.name);
      var parent_node = self._mkdir_p(path.dirname(curr_interface.file_path));
      var interface_node = self.core.createNode({
        base: self.META.Interface_Definition,
        parent: parent_node
      });
      self.core.setAttribute(interface_node, 'name', curr_interface.name);
      self._cacheNode(interface_node);
      self._storeObjectPath(curr_interface, interface_node);
    };

    TinyOSPopulate.prototype._storeObjectPath = function (component, node) {
      this._objectPath[component.file_path] = this.core.getPath(node);
    };

    /**
     * Make a directory in WebGME. At any directory level,
     * if the provided directory does not exist, it will be created.
     */
    TinyOSPopulate.prototype._mkdir_p = function (path) {
      var self = this;
      self._wi("Path: " + path);
      var dirs = path.split('/');
      var parent_node = self.rootNode;
      for (var i = 0; i < dirs.length; i++) {
        var dir_node = self._findNodeByName(parent_node, dirs[i]);
        if (!dir_node) {
          self._wi("Creating directory: " + dirs[i]);
          dir_node = self.core.createNode({
            base: self.META.Folder,
            parent: parent_node
          });
          self.core.setAttribute(dir_node, 'name', dirs[i]);
          self._cacheNode(dir_node);
        } else {
          self._wi("Skipping directory: " + dirs[i]);
        }
        parent_node = dir_node;
      }
      return parent_node;
    };

    // Tamas' implementation
    TinyOSPopulate.prototype._loadNodes = function (start_node, callback) {
      var self = this;
      self._nodeCache = {};

      var load = function(node, fn) {
        self.core.loadChildren(node, function(err, children) {
          if (err) {
            fn(err);
          } else {
            var recCalls = children.length;
            var error = null;

            if(recCalls === 0){
              fn(null);
            }

            for (var i = 0; i < children.length; i++) {
              self._nodeCache[self.core.getPath(children[i])] = children[i];
              load(children[i], load_err_handler);
            }

          }

          function load_err_handler(err) {
            error = error || err;
            if(--recCalls === 0) { //callback only on last child
              fn(error);
            }
          }

        });
      };

      load(start_node, callback);
    };

    // log messages to file and console at the same time
    TinyOSPopulate.prototype._wi = function (msg) {
      var self = this;
      self.logger.warn(msg);
      self.logger.info(msg);
    };

    TinyOSPopulate.prototype._getNodeName = function (node) {
      return this.core.getAttribute(node, 'name');
    };

    TinyOSPopulate.prototype._getNode = function (nodePath){
      //we check only our node cache
      return this._nodeCache[nodePath];
    };

    TinyOSPopulate.prototype._cacheNode = function (node) {
      this._nodeCache[this.core.getPath(node)] = node;
    };

    /**
     * Fetch the child nodes of a given node from the cache
     */
    TinyOSPopulate.prototype._getChildren = function (node) {
      var self = this;
      var children_paths = self.core.getChildrenPaths(node);
      var children = [];
      children_paths.forEach(function(child_path) {
        var child = self._getNode(child_path);
        if (child)
          children.push(child);
      });
      return children;
    };

    /**
     * Searches through the children of a given node and finds the first node that has
     * the specified name. If a node is not found, null is returned.
     * If the children argument is given, it will be used instead of fetching it using _getChildren. This is useful when
     * repeated calls to _findNodeByName need to be made.
     */
    TinyOSPopulate.prototype._findNodeByName = function (node, name,
      children) {
      var self = this;
      if (!children)
        children = this._getChildren(node);
      var result = null;
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (this._getNodeName(child) === name) {
          result = children[i];
          break;
        }
      }
      return result;
    };

    return TinyOSPopulate;
  }
);
