'use strict';
var testFixture = require('../../globals');

describe('ModuleUtil', function () {

  var module_util = testFixture.requirejs('project_src/plugins/utils/ModuleUtil');
  var gmeConfig = testFixture.getGmeConfig();
  var gmeAuth;
  var storage;
  var projectName = 'ModuleUtilTest';
  var logger = testFixture.logger.fork('plugins/utils/ModuleUtil');
  var importResult;
  var project;
  var Q = testFixture.Q;

  this.timeout(40000);

  before(function (done) {
    testFixture.clearDBAndGetGMEAuth(gmeConfig, null)
      .then(function (gmeAuth_) {
        gmeAuth = gmeAuth_;
        storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth_);
        return storage.openDatabase();
      })
      .then(function () {
        return testFixture.importProject(storage, {
          projectSeed: 'test/seeds/Blink.json',
          projectName: projectName,
          gmeConfig: gmeConfig,
          logger: logger
        });
      })
      .then(function (result) {
        importResult = result;
        project = result.project;
      })
      .nodeify(done);
  });

  after(function (done) {
    Q.allDone([
      storage.closeDatabase(),
      gmeAuth.unload()
    ])
    .nodeify(done);
  });

  it('should have defined properties', function (done) {
    module_util.should.have.property('generateModule');
    done();
  });

});
