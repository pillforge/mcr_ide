describe('NescUtil', function () {
  'use strict';
  var testFixture = require('../../globals');
  var nesc_util = testFixture.requirejs('project_src/plugins/utils/NescUtil');
  var expect = testFixture.expect;
  var path = require('path');
  var fs = require('fs-extra');
  require('chai').use(require('chai3-json-schema'));

  it('should have defined properties', function (done) {
    expect(nesc_util).to.be.an('object');
    nesc_util.should.have.property('getAppJson');
    done();
  });

  describe('#getAppJson', function () {
    var app_json;
    before(function (done) {
      nesc_util.getAppJson(path.join(__dirname, 'NescUtil/BlinkC.nc'), 'exp430')
        .then(function (ajson) {
          app_json = ajson;
        })
        .nodeify(done);
    });

    it('should comply with the schema', function (done) {
      var schema = fs.readJsonSync(path.join(__dirname, 'NescUtil/AppSchema.json'));
      app_json.should.be.jsonSchema(schema);
      done();
    });

    it('should have BlinkC component', function (done) {
      app_json.components.should.have.property('BlinkC');
      done();
    });

    it('should have BlinkC interfaces', function (done) {
      var blinkc_interfaces = app_json.components.BlinkC.interface_types;
      blinkc_interfaces.should.have.length(5);
      done();
    });
  });

});
