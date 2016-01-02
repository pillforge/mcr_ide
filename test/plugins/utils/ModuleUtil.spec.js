'use strict';
var testFixture = require('../../globals');

describe('ModuleUtil', function () {

  var gmeConfig = testFixture.getGmeConfig();
  var gmeAuth;
  var logger = testFixture.logger.fork('plugins/utils/ModuleUtil');
  var storage;
  var projectName = 'ModuleUtilTest';
  var project;
  var context;

  var Q = testFixture.Q;

  var expect = testFixture.expect;
  var blinkC_node;

  var ModuleUtil = testFixture.requirejs('project_src/plugins/utils/ModuleUtil');
  var module_util;

  var fs = require('fs');

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

  it('should import a project with apps, Blink and BlinkC objects', function (done) {
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
          if (!found && 'BlinkC' == context.core.getAttribute(children[i], 'name')) {
            found = true;
            blinkC_node = children[i];
            module_util = new ModuleUtil(context, blinkC_node);
          }
        }
        expect(found).to.equal(true);
      })
      .nodeify(done);
  });

  it('should have defined properties', function (done) {
    expect(module_util).to.be.an('object');
    module_util.should.have.property('generateModule');
    module_util.should.have.property('_saveSource');
    module_util.should.have.property('_getMetaNodes');
    done();
  });

  describe('#generateModule', function () {
    var nesc_utils = testFixture.requirejs('project_root/plugins/utils/NescUtils');
    var blinkc_json;
    before(function (done) {
      module_util._saveSource(context.core, blinkC_node)
        .then(function (file_path) {
          return Q.nfcall(nesc_utils.getAppJson, file_path);
        })
        .then(function (app_json) {
          blinkc_json = app_json;
        })
        .nodeify(done);
    });

    xit('should generate uses and provides interfaces', function (done) {
      module_util.generateModule(context, blinkC_node)
        .then(function () {
          return Q.nfcall(context.core.loadChildren, blinkC_node);
        })
        .then(function (children) {
          for (var i = children.length - 1; i >= 0; i--) {
            console.log(context.core.getAttribute(children[i], 'name'));
          }
        })
        .nodeify(done);
    });
  });

  describe('#_saveSource', function () {
    it('should save source to a temp folder', function (done) {
      module_util._saveSource()
        .then(function (tmp_path) {
          expect(tmp_path).to.contain('tmp');
          expect(fs.existsSync(tmp_path)).to.equal(true);
        })
        .nodeify(done);
    });
  });

  describe('#_getMetaNodes', function () {
    it('should get meta nodes', function (done) {
      module_util._getMetaNodes(context)
        .then(function () {
          expect(context.META).to.be.an('object');
        })
        .nodeify(done);
    });
  });

});
