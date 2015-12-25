'use strict';
var testFixture = require('../../globals');

describe('ModuleUtil', function () {
  var module_util = testFixture.requirejs('project_src/plugins/utils/ModuleUtil');
  it('should have defined properties', function (done) {
    module_util.should.have.property('generateModule');
    done();
  });
});
