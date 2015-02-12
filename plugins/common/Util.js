define(
  ['fs',
  'path',
  'async',
  './NesC_XML_Generator',
  './ParseDump'
  ],
  function (fs, path, async, NesC_XML_Generator, ParseDump) {
  "use strict";

  var Util = function (core, META) {
    this.core = core;
    this.META = META;
    this.debug = false;
  };

  Util.prototype.normalizeProjectPath = function(app_json, project_path, prefix) {
    var tos_path = process.env.TOSROOT;
    var project_prefix_dir = path.dirname(project_path);
    if (project_path.search(tos_path) === 0)
      project_prefix_dir = path.dirname(project_path.substr(tos_path.length+1));
    var re = new RegExp(project_prefix_dir, 'g');
    return JSON.parse(JSON.stringify(app_json).replace(re, prefix));
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

  Util.prototype.loadNodes = function (start_node, next) {
    var self = this;

    var name = self.core.getAttribute(start_node, 'name');
    load(start_node, name, function (err) {
      if (err) {
        next(err);
      } else {
        next();
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
            var curr_path_log = path_log + ' > ' + self.core.getAttribute(child, 'name');
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

  return Util;

});
