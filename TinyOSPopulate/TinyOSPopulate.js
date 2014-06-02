define(
  ['plugin/PluginBase',
  'plugin/PluginConfig',
  'fs',
  'path',
  'module',
  './ParseDump'],
  function (PluginBase, PluginConfig, fs, path, module, ParseDump) {
    "use strict";

    var TinyOSPopulate = function () {
      PluginBase.call(this);
    };

    TinyOSPopulate.prototype = Object.create(PluginBase.prototype);
    TinyOSPopulate.prototype.constructor = TinyOSPopulate;
    TinyOSPopulate.prototype.getName = function() {
      return "TinyOS Populator";
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
            var tos_comps = pd.parse(path.resolve(cwd, 'MainC.xml'));

            // console.dir(tos_comps);
            // self._wi(JSON.stringify(tos_comps, null, 2));
            
            self._populate(tos_comps);
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

    /**
     * Make a directory in WebGME. At any directory level,
     * if the provided directory does not exist, it will be created.
     */
    TinyOSPopulate.prototype._mkdir_p = function (tos_dir) {
      var self = this;
      self._wi("Tos dir " + tos_dir);
      var dirs = tos_dir.split('/');
      var par_node = self.rootNode;
      for (var i = 0; i < dirs.length; i++) {
        var dir_node = self._findNodeByName(par_node, dirs[i]);
        if (!dir_node){
          self._wi("Creating directory: " + dirs[i]);
          dir_node = self.core.createNode({
            base:self.META.Folder,
            parent:par_node
          });
          self.core.setAttribute(dir_node, 'name', dirs[i]);
          self._cacheNode(dir_node);
        } else {
          self._wi("Skipping directory: " + dirs[i]);
        }
        par_node = dir_node;
      }

    };    
    
    TinyOSPopulate.prototype._populate = function (tos_comps) {
      var self = this;

      // #1
      // Folder structure
      for (var comp in tos_comps) {
        self._wi("Creating component: " + comp);
        // Mirror the structure of the file_path of the component in WebGME
        var tos_dir = path.dirname(tos_comps[comp].file_path);
        self._mkdir_p(tos_dir);
      }

      // #2
      // Create the app, if the input is for an application
      // For now, just assume the application has the word "AppC" in their
      //   configuration files
      for (comp in tos_comps) {
        if (comp.toLowerCase().indexOf('appc') > 0) {
          c("Create App for " + comp);
          self._createApp(tos_comps[comp]);
        }
      }




      function c(msg) {
        self._wi(msg);
      }
    };

    TinyOSPopulate.prototype._createApp = function (component) {
      var self = this;

      var app_node = self.core.createNode({
        base: self.META.App,
        parent: self.rootNode
      });
      var name = component.name.substring(0,
                                component.name.toLowerCase().indexOf('appc'));
      self.core.setAttribute(app_node, 'name', name);
      self._cacheNode(app_node);

      var app_configuration_node = self.core.createNode({
        base: self.META.Configuration,
        parent: app_node
      });
      self.core.setAttribute(app_configuration_node, 'name', component.name);
      self._cacheNode(app_configuration_node);
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
