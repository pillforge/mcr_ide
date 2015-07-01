define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'fs',
  'path',
  'module',
  'util',
  '../../package.json',
  '../common/ParseDump',
  '../common/NesC_XML_Generator'],
  function (PluginBase, PluginConfig, fs, path, module, util, pjson,
    ParseDump, NesC_XML_Generator) {
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
      return pjson.version;
    };

    TinyOSPopulate.prototype.getDefaultConfig = function() {
      return new PluginConfig();
    };

    TinyOSPopulate.prototype.main = function (callback) {
      var self = this;
      self._loadNodes(self.rootNode, function(err) {
        if (err) {
          self.result.setSuccess(false);
          callback(err, self.result);
        } else {
          self._wi("Nodes are loaded");
          try {
            var pd = new ParseDump();
            var nxg = new NesC_XML_Generator('exp430');
            self._objectPath = {};

            // keep created component's paths to save in registry
            // { MainC: '/497022377/1117940255/1637150336' }
            self._component_to_webgme_path = {};

            nxg.getDirectories(function(error, directories) {
              if (error !== null) {
                self._wi("Can't get platform directories");
                self.result.setSuccess(false);
                callback(error, self.result);
              } else {
                var components_paths = nxg.getComponents(directories);
                self._created_components = {};
                x(0);
              }
              var flag = true;
              function x(index) {
                if ( flag && index >= components_paths.length ) {
                  // flag = false;
                  self._wi("Completed");
                  self.core.setRegistry(self.rootNode, 'component_paths', self._component_to_webgme_path);
                  self.save('save populator finished', function(err) {
                    self.result.setSuccess(true);
                    callback(err, self.result);
                  });
                } else {
                  // components_paths[0] = '/home/hakan/Documents/mcr_ide/Icra2015ExptAppC.nc';
                  var path = require('path');
                  var component_name = path.basename(components_paths[index], '.nc');
                  if (self._created_components[component_name] === true) {
                    x(index+1);
                  } else {
                    nxg.getXML(components_paths[index], '', function(error, xml) {
                      if (error !== null) {
                        self._wi("Error in generating xml: " +
                          index + components_paths[index]);
                      } else {
                        self._wi(index + " " + components_paths[index] + " prog");
                        self._app_json = pd.parse(components_paths[index], xml);
                        // fs.writeFileSync('xml.log' + index + '.xml', xml);
                        // fs.writeFileSync('xml.log' + index + '.js',
                        //                  util.inspect(self._app_json, {
                        //                   showHidden: true,
                        //                   depth: 5
                        //                  }));
                        // self._wij(self._app_json);
                        // self._wi(xml);
                        self._populate();
                      }
                      x(index+1);
                    });

                  }
                }

              }
            });

          } catch(error) {
            self._wi("Error in TinyOSPopulate Main");
            self._wi(error.stack);
            self.result.setSuccess(false);
            callback(error, self.result);
          }
          
        }
      });

    };
    
    TinyOSPopulate.prototype._populate = function () {
      var self = this;

      self._wi("Creating Interfaces");
      for (var key in self._app_json.interfacedefs) {
        if (self._created_components[key]) continue;
        self._createInterface(self._app_json.interfacedefs[key]);
        self._created_components[key] = true;
      }

      self._wi("Creating Components");
      for (key in self._app_json.components) {
        if (self._created_components[key]) continue;
        self._createComponent(self._app_json.components[key]);
      }

      self._wi("Creating Uses & Provides Interfaces");
      for (key in self._app_json.components) {
        if (self._created_components[key]) continue;
        self._createUPInterfaces(self._app_json.components[key]);
      }

      self._wi("Creating Wirings");
      for (key in self._app_json.components) {
        if (self._created_components[key]) continue;
        // self._createWirings(self._app_json.components[key]);
        self._created_components[key] = true;
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
            if (wire.from.cst) {
              self.core.setAttribute(wiring_node, 'src_params',
                                   'cst:' + wire.from.cst);
            }
            if (wire.to.cst) {
              self.core.setAttribute(wiring_node, 'dst_params',
                                   'cst:' + wire.to.cst);
            }
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
          message("Wiring component is generic type");
          // v3
          var p = wc.component_base + wc.name + '_s';
          p = p.replace('.', '', 'g');
          if (p in created) {
          } else {
            created[p] = createWiringInstance(wc.name);
          }
          return created[p];
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

    TinyOSPopulate.prototype._createUPInterfaces = function (component) {
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

        var ref_interface_def = self._app_json.interfacedefs[curr_interface.name];
        var ref_fpath = ref_interface_def.file_path;
        self.core.setPointer(interface_node, 'interface',
                             self._nodeCache[self._objectPath[ref_fpath]]);

        self._createFunctionDeclarationsEventsCommands(interface_node, ref_interface_def);

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
      self.core.setAttribute(component_node, 'path', component.file_path);
      // self.core.setAttribute(component_node, 'source', self._getSource(component.file_path));
      self._cacheNode(component_node);
      self._storeObjectPath(component, component_node);

      // keep created component's paths to save in registry
      // { MainC: '/497022377/1117940255/1637150336' }
      self._component_to_webgme_path[component.name] = self.core.getPath(component_node);

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
      self.core.setAttribute(interface_node, 'path', curr_interface.file_path);

      self._createFunctionDeclarationsEventsCommands(interface_node, curr_interface);
      // self.core.setAttribute(interface_node, 'source', self._getSource(curr_interface.file_path));
      self._cacheNode(interface_node);
      self._storeObjectPath(curr_interface, interface_node);
    };

    TinyOSPopulate.prototype._createFunctionDeclarationsEventsCommands = function (parent_node, interfacedef_json) {
      var self = this;
      var created_nodes = {};
      for (var i = 0; i < interfacedef_json.functions.length; i++) {
        var funct = interfacedef_json.functions[i];
        var funct_base = funct.event_command == 'event' ? 'Event' : 'Command';
        var funct_dec_node = self.core.createNode({
          base: self.META[funct_base],
          parent: parent_node
        });
        self.core.setAttribute(funct_dec_node, 'name', funct.name);
        created_nodes[funct.name] = funct_dec_node;
        // var params = '';
        // for (var j = 0; j < funct.parameters.length; j++) {
        //   if (j > 0) params += ', ';
        //   params += funct.parameters[j];
        // }
        // declaration_list += 'async ' + funct.event_command + ' void ' + funct.name + '(' + params +'); ';
      }
      return created_nodes;
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

    TinyOSPopulate.prototype._getSource = function(path) {
      var p = require('path');
      return fs.readFileSync(p.join(process.env.TOSROOT, '/', path), {
        encoding: 'utf8'
      });
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
        depth: 5
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
