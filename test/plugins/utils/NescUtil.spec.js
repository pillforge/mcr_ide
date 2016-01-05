'use strict';
var testFixture = require('../../globals');

describe('NescUtil', function () {

  var nesc_util = testFixture.requirejs('project_src/plugins/utils/NescUtil');
  var expect = testFixture.expect;
  var path = require('path');

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
    it('should have BlinkC component', function (done) {
      expect(app_json).to.be.an('object');
      app_json.should.have.property('components');
      app_json.components.should.have.property('BlinkC');
      done();
    });
    it('should have BlinkC interfaces', function (done) {
      var blinkc_json = app_json.components.BlinkC;
      blinkc_json.should.have.property('interface_types');
      var blinkc_interfaces = blinkc_json.interface_types;
      blinkc_interfaces.should.have.length(5);
      done();
    });
  });

});
