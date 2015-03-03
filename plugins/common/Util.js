define(
  ['fs-extra',
  'path',
  'async',
  './NesC_XML_Generator',
  './ParseDump'
  ],
  function (fs, path, async, NesC_XML_Generator, ParseDump) {
  "use strict";

  var Util = function (core, META, rootNode) {
    this.core = core;
    this.META = META;
    this.rootNode = rootNode;
    this.debug = false;
  };

  // /home/user/.../MainC.nc returns /home/user/.../MainC
  Util.prototype.getPathWithoutExt = function (component_path) {
    return path.join(
      path.dirname(component_path),
      path.basename(component_path, path.extname(component_path))
      );
  };

  // 'imported-apps/modular/Message.nc' returns [ 'imported-apps', 'modular' ]
  Util.prototype.getDirs = function (component_path) {
    var ext = path.extname(component_path);
    var dirs = '';
    if (ext === '') dirs = component_path;
    if (ext === '.nc') dirs = path.dirname(component_path);
    return dirs.split('/');
  };

  Util.prototype.getAppJson = function (full_path, platform, next) {
    var self = this;
    var nxg = new NesC_XML_Generator(platform);
    var opts = '';
    if (fs.statSync(full_path).isDirectory()) {
      var makefile_data = self.getMakefile(full_path);
      if (!makefile_data || makefile_data.component === null) {
        return next('No Makefile or no specified component');
      }
      opts = makefile_data.include + ' -I' + full_path;
      full_path = path.join(full_path, makefile_data.component + '.nc');
    }

    nxg.getXML(full_path, opts, function (err, xml) {
      if (err) {
        return next('Cannot get XML');
      } else {
        if (self.debug) fs.writeFileSync('app_xml.xml.log', xml);
        var pd = new ParseDump();
        var app_json = pd.parse(null, xml);
        return next(null, app_json);
      }
    });
  };

  Util.prototype.getMakefile = function (full_path) {
    var makefile_path = path.join(full_path, 'Makefile');
    if (!fs.existsSync(makefile_path)) {
      return null;
    }
    var file = fs.readFileSync(makefile_path, 'utf8');

    var include = '';
    var include_paths = file.match(/-I\S+/g);
    if (include_paths !== null) {
      include_paths = include_paths.map(function(include_path) {
        return '-I' + path.normalize(path.join(full_path, include_path.substr(2)));
      });
      include = include_paths.join(' ');
    }

    var component = null;
    var component_search = /COMPONENT=(\S+)/.exec(file);
    if (component_search !== null) {
      component = component_search[1];
    }

    return {
      component: component,
      include: include
    };
  };

  Util.prototype.loadNodesId = function (node_id, callback) {
    var self = this;
    self.core.loadByPath(self.rootNode, node_id, function (err, node) {
      if (err) {
        callback(err);
      } else {
        self.loadNodes(node, function (err, nodes) {
          if (err) {
            callback(err);
          } else {
            callback(null, nodes, node);
          }
        });
      }
    });
  };

  Util.prototype.loadNodes = function (start_node, next) {
    var self = this;

    var cached_nodes = {};
    var name = self.core.getAttribute(start_node, 'name');
    load(start_node, name, function (err) {
      if (err) {
        next(err);
      } else {
        next(null, cached_nodes);
      }
    });

    function load(node, path_log, next_next) {
      if (self.debug) console.log('load', path_log);
      self.core.loadChildren(node, function (err, children) {
        if (err) {
          if (self.debug) console.log('Cannot load nodes at', path_log);
          next_next('Cannot load nodes');
        } else {
          if (self.debug) console.log(path_log, 'have', children.length, 'children');
          var error_occured = false;
          async.eachSeries(children, function (child, callback) {
            var curr_path_log = path_log + '/' + self.core.getAttribute(child, 'name');
            cached_nodes[curr_path_log] = child;
            cached_nodes[self.core.getPath(child)] = child;
            if (self.debug) console.log(curr_path_log);
            load(child, curr_path_log, function (errr) {
              if (errr) {
                if (self.debug) console.log('Error occured', curr_path_log, errr);
                if (!error_occured) {
                  error_occured = true;
                  callback(errr);
                }
              } else {
                if (self.debug) console.log('Completed', curr_path_log);
                callback();
              }
            });
          }, function (err) {
            if (self.debug) console.log('Children finished', path_log, 'err', err);
            if (err) {
              if (self.debug) console.log('async err at', path_log, err);
              next_next(err);
            } else {
              next_next();
            }
          });
        }
      });
    }
  };

  Util.prototype.normalizeProjectPath = function(app_json, project_path, prefix) {
    var tos_path = process.env.TOSROOT;
    var project_prefix_dir = path.dirname(project_path);
    if (project_path.search(tos_path) === 0)
      project_prefix_dir = path.dirname(project_path.substr(tos_path.length+1));
    var re = new RegExp(project_prefix_dir, 'g');
    return JSON.parse(JSON.stringify(app_json).replace(re, prefix));
  };

  Util.prototype.saveChildrenAsFiles = function (node_id, nodes, folder) {
    var self = this;
    var children = self.core.getChildrenPaths(nodes[node_id]);
    for (var i = children.length - 1; i >= 0; i--) {
      var child_node = nodes[children[i]];
      var src = self.core.getAttribute(child_node, 'source');
      var name = self.core.getAttribute(child_node, 'name');
      var extension = '.nc';
      if (self.core.isTypeOf(child_node, self.META.Header_File))
          extension = '.h';
      fs.writeFileSync(path.join(folder, name) + extension, src);
    }
  };

  return Util;

});
