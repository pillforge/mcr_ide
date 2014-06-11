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
      return '0.1.2';
    };

    TinyOSPopulate.prototype.getDefaultConfig = function() {
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
            self._app_json = app_json;

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
      for (var key in app_json.interfacedefs) {
        self._createInterface(app_json.interfacedefs[key]);
      }

      self._wi("Creating Components");
      for (key in app_json.components) {
        self._createComponent(app_json.components[key]);
      }

      self._wi("Creating Uses & Provides Interfaces");
      for (key in app_json.components) {
        self._createUPInterfaces(app_json.components[key], app_json);
      }

      self._wi("Creating Wirings");
      for (key in app_json.components) {
        self._createWirings(app_json.components[key]);
      }

    };

    TinyOSPopulate.prototype._createWirings = function(component) {
      var self = this;
      self._wi("Creating wirings for " + component.name);
      var created = {};
      for (var i = component.wiring.length - 1; i >= 0; i--) {
        var wire = component.wiring[i];
        var fc = getWiringComponent(wire.from);
        var tc = getWiringComponent(wire.to);
        var base_type = self.META.Link_Interface;
        if (fc && Array.isArray(fc)) {
          fc = fc[0];
          base_type = self.META.Equate_Interface;
        }
        if (tc && Array.isArray(tc)) {
          tc = tc[0];
          base_type = self.META.Equate_Interface;
        }
        if (fc && tc) {
          var fi = getWiringInterface(fc, wire.from.interface);
          var ti = getWiringInterface(tc, wire.to.interface);
          if (fi && ti) {
            self._wi("Creating wiring ... " +
                     component.name + " " + wire.to.interface);
            var wiring_node = self.core.createNode({
              base: base_type,
              parent: self._getObjectByPath(component.file_path),
            });
            self.core.setPointer(wiring_node, 'src', fi);
            self.core.setPointer(wiring_node, 'dst', ti);
            self._cacheNode(wiring_node);
          }
        }
      }

      function getWiringInterface(c, c_interface) {
        var c_ids = self.core.getChildrenRelids(c);
        var interface_node = null;
        for (var i = c_ids.length - 1; i >= 0; i--) {
          var interf_child = self.core.getChild(c, c_ids[i]);
          var interface_name = self.core.getAttribute(interf_child, 'name');
          if (interface_name == c_interface) return interf_child;
        }
        return null;
      }

      function getWiringComponent(wc) {
        if (component.file_path === wc.component_base) {
          message("Wiring component is component itself");
          return [self._getObjectByPath(component.file_path), 'equate'];
        }
        if (wc.component_base in created) {
          message("Wiring component is already created");
          return created[wc.component_base];
        }
        if (self._app_json.components[get_name(wc.component_base)].generic) {
          message("Skipping wiring component: generic type");
          return createWiringInstance(wc.name);
        }
        created[wc.component_base] = self._createWiringComponent(
                                                    component.file_path, wc);
        return created[wc.component_base];

        function message(msg) {
          self._wi(msg + ": " + wc.component_base + " - " + wc.interface);
        }

        function createWiringInstance(name) {
          message("Creating wiring component instance");
          var x = self._app_json.instance_components[name];
          var wiring_component = self.core.createNode({
            base: self._getObjectByPath(x.base),
            parent: self._getObjectByPath(component.file_path)
          });
          var n = name.split('.');
          self.core.setAttribute(wiring_component, 'name', n[n.length-1]);
          self._cacheNode(wiring_component);
          return wiring_component;
        }
      }

      function get_name(c_path) {
        return path.basename(c_path, '.nc');
      }

    };

    TinyOSPopulate.prototype._createWiringComponent = function(parent_p, f) {
      var self = this;
      self._wi("Creating wiring component: " +
               f.component_base + " - " + f.interface);
      var wiring_component = self.core.createNode({
        base: self._getObjectByPath(f.component_base),
        parent: self._getObjectByPath(parent_p)
      });
      self._cacheNode(wiring_component);
      return wiring_component;
    };

    TinyOSPopulate.prototype._createUPInterfaces = function (
      component, app_json) {
      var self = this;
      for (var i = component.interface_types.length - 1; i >= 0; i--) {
        var curr_interface = component.interface_types[i];
        self._wi("Creating uses/provides interface: " + curr_interface.as +
          " at " + component.file_path);
        var base = self.META.Uses_Interface;
        if (curr_interface.provided === 1)
          base = self.META.Provides_Interface;
        var interface_node = self.core.createNode({
          base: base,
          parent: self._nodeCache[self._objectPath[component.file_path]],
        });
        self.core.setAttribute(interface_node, 'name', curr_interface.as);

        if (curr_interface.argument_type) {
        self.core.setAttribute(interface_node, 'type_arguments',
                               curr_interface.argument_type);
        }

        var ref_fpath = app_json.interfacedefs[curr_interface.name].file_path;
        self.core.setPointer(interface_node, 'interface',
                             self._nodeCache[self._objectPath[ref_fpath]]);
        self._cacheNode(interface_node);
      }

    };

    TinyOSPopulate.prototype._createComponent = function (component) {
      var self = this;
      self._wi("Creating component: " + component.name);
      var parent_node = self._mkdir_p(path.dirname(component.file_path));
      var component_node = self.core.createNode({
        base: getBase(),
        parent: parent_node
      });
      self.core.setAttribute(component_node, 'name', component.name);
      self.core.setAttribute(component_node, 'safe', component.safe);
      self._cacheNode(component_node);
      self._storeObjectPath(component, component_node);

      function getBase() {
        if (component.comp_type == 'Module') {
          return component.generic ?
            self.META.Generic_Module : self.META.Module;
        }
        return component.generic ?
          self.META.Generic_Configuration : self.META.Configuration;
      }
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

    TinyOSPopulate.prototype._getObjectByPath = function(path) {
      return this._nodeCache[this._objectPath[path]];
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

    TinyOSPopulate.prototype._wij = function(obj) {
      var node_cache_string = util.inspect(obj, {
        showHidden: true,
        depth: 3
      });
      this._wi(node_cache_string);
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
     * Searches through the children of a given node and finds the first node
     * that has
     * the specified name. If a node is not found, null is returned.
     * If the children argument is given, it will be used instead of fetching
     * it using _getChildren. This is useful when
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
