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
  var core;

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
        core = context.core;
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

    before(function (done) {
      module_util.generateModule().nodeify(done);
    });

    it('should generate uses and provides interfaces', function (done) {
      var expected_interface_names = ['Boot', 'Timer0', 'Timer1', 'Timer2', 'Leds'];
      Q.nfcall(context.core.loadChildren, blinkC_node)
        .then(function (children) {
          var actual_interface_names = children.filter(function (child) {
            return core.isTypeOf(child, context.META.Interface_Type);
          }).map(function (interf) {
            return core.getAttribute(interf, 'name');
          });
          actual_interface_names.sort().should.deep.equal(expected_interface_names.sort());
        })
        .nodeify(done);
    });

    var boot_node;
    var timer0_node;
    it('should generate commands and events for interfaces', function (done) {
      Q.nfcall(context.core.loadChildren, blinkC_node)
        .then(function (children) {
          children.forEach(function (child) {
            switch (core.getAttribute(child, 'name')) {
              case 'Boot':
              boot_node = child;
              break;
              case 'Timer0':
              timer0_node = child;
              break;
            }
          });
        })
        .then(function () {
          return Q.nfcall(core.loadChildren, boot_node);
        })
        .then(function (children) {
          children.should.have.length(1);
          return Q.nfcall(core.loadChildren, timer0_node);
        })
        .then(function (children) {
          children.should.have.length(11);
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
