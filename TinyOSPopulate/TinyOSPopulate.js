define(['plugin/PluginBase', 'plugin/PluginConfig', 'fs', 'path','module', './parsedump'],
       function (PluginBase, PluginConfig, fs, path, module, ParseDump) {
    "use strict";

    var TinyOSPopulate = function () {
        PluginBase.call(this);
    };

    TinyOSPopulate.prototype = Object.create(PluginBase.prototype);
    TinyOSPopulate.prototype.constructorr = TinyOSPopulate;
    TinyOSPopulate.prototype.getName = function(){
        return "TinyOS Populator";
    };

    TinyOSPopulate.getDefaultConfig = function () {
        return new PluginConfig();
    };

    //helper functions created by Tamas ;)
    //this function loads the children of your workflow allowing your plugin to run synchronously
    TinyOSPopulate.prototype._loadNodes = function(start_node,callback){
        //we load the whole subtree of the active node
        var self = this;
        self._nodeCache = {};
        var load = function(node, fn){
            self.core.loadChildren(node,function(err,children){
                if(err){
                    fn(err)
                } else {
                    var recCalls = children.length,
                    error = null; //error

                    if(recCalls === 0){
                        fn(null);
                    }

                    for(var i=0;i<children.length;i++){
                        self._nodeCache[self.core.getPath(children[i])] = children[i];
                        load(children[i], function(err){
                            error = error || err;
                            if(--recCalls === 0){//callback only on last child
                                fn(error);
                            }
                        });
                    }
                }
            });
        };

        load(start_node, callback);
    };

    TinyOSPopulate.prototype._getNodeName = function(node) {
        return this.core.getAttribute(node, 'name');
    };

    TinyOSPopulate.prototype._getNode = function(nodePath){
        //we check only our node cache
        return this._nodeCache[nodePath];
    };

    TinyOSPopulate.prototype._cacheNode = function(node) {
        this._nodeCache[this.core.getPath(node)] = node;
    };
    

    /**
     * Fetch the child nodes of a given node from the cache
     */
    TinyOSPopulate.prototype._getChildren = function(node) {
        var self = this;
        var children_paths = self.core.getChildrenPaths(node);
        var children = [];
        children_paths.forEach(function(child_path){
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
    TinyOSPopulate.prototype._findNodeByName = function (node, name, children) {
        var self = this;
        if (!children)
            children = this._getChildren(node);
        var result = null;
        for (var i = 0; i < children.length; i++){
            var child = children[i];
            if (this._getNodeName(child) === name){
                result = children[i];
                break;
            }
        }
        return result;
    };

    /**
     * Make a directory in WebGME. At any directory level, if the provided directory does not exist, it will be created.
     */
    TinyOSPopulate.prototype._mkdir_p = function(tos_dir) {
        var self = this;
        console.log("Tos dir " + tos_dir);
        var dirs = tos_dir.split('/');
        var par_node = self.rootNode;
        for (var i = 0; i < dirs.length; i++){
            var dir_node = self._findNodeByName(par_node, dirs[i]);
            if (!dir_node){
                console.log("Creating directory: " + dirs[i]);
                var dir_node = self.core.createNode({base:self.META['Folder'], parent:par_node});
                self.core.setAttribute(dir_node, 'name', dirs[i]);
                self._cacheNode(dir_node);
            } else {
                console.log("Skipping directory: " + dirs[i]);
            }
            par_node = dir_node;
        }

    };
    
    TinyOSPopulate.prototype._populate = function(tos_comps) {
        var self = this;
        for (var comp in tos_comps){
            console.log("Creating component: " + comp);
            // Mirror the structure of the file_path of the component in WebGME
            var tos_dir = path.dirname(tos_comps[comp].file_path);
            self._mkdir_p(tos_dir);
            console.log("tos_dir: " + tos_dir);
        }
    };
    

    TinyOSPopulate.prototype.main = function (callback) {
        var self = this;
        console.log("Test Plugin");
        var cwd = path.dirname(module.uri);
        self._loadNodes(self.rootNode, function(err){
            if (err){
                console.log("Error loading nodes");
            } else
                console.log("Loaded Nodes");
            var pd = new ParseDump();
            var tos_comps = pd.parse(path.resolve(cwd, 'MainC.xml'));
            console.log(JSON.stringify(tos_comps, null ,2));
            // Create tos directory
            self._populate(tos_comps);
            self.save();
            callback(null, self.result);
        })
    };

    return TinyOSPopulate;
});
