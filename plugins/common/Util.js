define(
  ['fs',
  'path',
  './NesC_XML_Generator',
  './ParseDump'
  ],
  function (fs, path, NesC_XML_Generator, ParseDump) {
  "use strict";

  var Util = function (core, META) {
    this.core = core;
    this.META = META;
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

  Util.prototype.loadNodes = function () {
    console.info('loadNodes');
  };

  return Util;
});
