define(['../common/NesC_XML_Generator', '../common/ParseDump'],
function (NXG, ParseDump) {

'use strict';

return {
  getAppJson: function (c_path, next) {
    var nxg = new NXG();
    nxg.getXML(c_path, '', function (err, xml) {
      console.log(c_path);
      if (err) {
        return next(err);
      } else {
        var app_json = ParseDump.parse(xml);
        return next(null, app_json);
      }
    });
  }
};

});
