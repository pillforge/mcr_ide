define(['../common/NesC_XML_Generator', '../common/ParseDump', 'path'],
function (NXG, ParseDump, path) {

'use strict';

return {

  getBaseInterface: function () {
    return 'Interface';
  },

  getBaseComp: function (c_json) {
    return ( c_json.generic ? 'Generic' : '' ) + c_json.comp_type;
  },

  getBaseUP: function (i_type) {
    if (i_type.provided) return 'Provides';
    return 'Uses';
  },

  isModule: function (c_json) {
    return c_json.comp_type === 'Module';
  },

  getAppJson: function (c_path, next) {
    var nxg = new NXG();
    var opts = '-I' + path.dirname(c_path);
    nxg.getXML(c_path, opts, function (err, xml) {
      if (err) {
        return next(err);
      } else {
        var app_json = ParseDump.parse(xml);
        return next(null, app_json);
      }
    });
  },

  getAppJsonFromMakeSync: function (d_path, target, calls_json_path) {
    var xml = this.getXmlSync(d_path, target, calls_json_path);
    if (xml === '') return {};
    var a_json = ParseDump.parse(xml);
    a_json.notes.app_dir_path = d_path;
    return a_json;
  },

  getXmlSync: function (d_path, target, calls_json_path) {
    var cmd = this.getNccFromMakeSync(d_path, target);
    var execSync = require('child_process').execSync;

    var n_cmd = [
      cmd,
      '-fnesc-dump=interfacedefs',
      '-fnesc-dump=interfaces',
      "'-fnesc-dump=referenced(interfaces,components,functions)'",
      "'-fnesc-dump=functions(!global())'",
      "'-fnesc-dump=components(wiring)'",
      '-fnesc-dump=wiring',
      '-fsyntax-only'
    ].join(' ');
    if (calls_json_path) {
      n_cmd += ' -get-calls=' + calls_json_path;
    }
    var res = '';
    try {
      res = execSync(n_cmd, {
        cwd: d_path,
        encoding: 'utf8'
      });
    } catch (e) {
      console.log('err:', e);
      res = '';
    }
    return res;
  },

  getNccFromMakeSync: function (d_path, target) {
    var execSync = require('child_process').execSync;
    return execSync('make -n ' + target + ' | grep ncc | tr -d "\\n"', {
      cwd: d_path,
      encoding: 'utf8'
    });
  },

  getIncludePathsMake: function (full_path) {
    var fs = require('fs');
    var makefile_path = path.join(full_path, 'Makefile');
    if (!fs.existsSync(makefile_path)) {
      return null;
    }
    var file = fs.readFileSync(makefile_path, 'utf8');

    var include_paths = file.match(/-I\S+/g);
    include_paths = include_paths || new Array();
    include_paths.push('...');
    if (include_paths !== null) {
      include_paths = include_paths.map(function(include_path) {
        return path.normalize(path.join(full_path, include_path.substr(2)));
      });
    }

    var component = null;
    var component_search = /COMPONENT=(\S+)/.exec(file);
    if (component_search !== null) {
      component = component_search[1];
    }

    return {
      component: component,
      include: include_paths
    };
  }

};

});
