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

  getAppJsonFromMakeSync: function (d_path, target) {
    var xml = this.getXmlSync(d_path, target);
    var a_json = ParseDump.parse(xml);
    a_json.notes.app_dir_path = d_path;
    return a_json;
  },

  getXmlSync: function (d_path, target) {
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
    return execSync(n_cmd, {
      cwd: d_path,
      encoding: 'utf8'
    });
  },

  getNccFromMakeSync: function (d_path, target) {
    var execSync = require('child_process').execSync;
    return execSync('make -n ' + target + ' | grep ncc | tr -d "\\n"', {
      cwd: d_path,
      encoding: 'utf8'
    });
  }

};

});
