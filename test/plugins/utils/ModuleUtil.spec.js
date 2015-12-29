'use strict';
var testFixture = require('../../globals');

describe('ModuleUtil', function () {

  var module_util = testFixture.requirejs('project_src/plugins/utils/ModuleUtil');
  var gmeConfig = testFixture.getGmeConfig();
  var gmeAuth;
  var storage;
  var projectName = 'ModuleUtilTest';
  var logger = testFixture.logger.fork('plugins/utils/ModuleUtil');
  var context;
  var project;
  var Q = testFixture.Q;
  var expect = testFixture.expect;

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
        context = result;
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

  it('the imported project should have apps, Blink and BlinkC objects', function (done) {
    Q.nfcall(context.core.loadChildren, context.rootNode)
      .then(function (children) {
        expect(children).not.to.equal(null);
        for (var i = children.length - 1; i >= 0; i--) {
          if ('apps' == context.core.getAttribute(children[i], 'name'))
            return Q.nfcall(context.core.loadChildren, children[i]);
        }
        return null;
      })
      .then(function (children) {
        expect(children).not.to.equal(null);
        for (var i = children.length - 1; i >= 0; i--) {
          if ('Blink' == context.core.getAttribute(children[i], 'name'))
            return Q.nfcall(context.core.loadChildren, children[i]);
        }
        return null;
      })
      .then(function (children) {
        expect(children).not.to.equal(null);
        var found = false;
        for (var i = children.length - 1; i >= 0; i--) {
          if ('BlinkC' == context.core.getAttribute(children[i], 'name'))
            found = true;
        }
        expect(found).to.equal(true);
      })
      .nodeify(done);
  });


});
