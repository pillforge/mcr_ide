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
    this.debug = true;
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
      var include = include_paths.join(' ');
    }

    var component = null;
    var component_search = /COMPONENT=(\S+)/.exec(file);
    if (component_search !== null) {
      var component = component_search[1];
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
      self.core.loadChildren(node, function (err, children) {
        if (err) {
          if (self.debug) console.log('Cannot load nodes at', path_log);
          next_next('Cannot load nodes');
        } else {
          async.eachSeries(children, function (child, callback) {
            var curr_path_log = path_log + ' > ' + self.core.getAttribute(child, 'name');
            if (self.debug) console.log(curr_path_log);
            load(child, curr_path_log, function (errr) {
              if (errr) {
                callback(errr);
              } else {
                callback();
              }
            });
          }, function (err) {
            if (err) {
              if (self.debug) console.log('async err at', path_log, err);
              next_next(err);
            } else {
              next_next();
            }
            // next_next();
          });
        }
      });
    }

  };

  return Util;

});
