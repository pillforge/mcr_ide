var testFixture = require('../../globals');
describe('ModuleUtil', function () {
  'use strict';
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
  var sense_and_sendc_node;

  var ModuleUtil = testFixture.requirejs('project_src/plugins/utils/ModuleUtil');
  var module_util;

  var fs = require('fs');
  var path = require('path');

  before(function (done) {
    testFixture.clearDBAndGetGMEAuth(gmeConfig, null)
      .then(function (gmeAuth_) {
        gmeAuth = gmeAuth_;
        storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth_);
        return storage.openDatabase();
      })
      .then(function () {
        return testFixture.importProject(storage, {
          projectSeed: 'test/seeds/SenseAndSend.json',
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

  it('should import a project with apps, SenseAndSend and SenseAndSendC objects', function (done) {
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
          if ('SenseAndSend' == context.core.getAttribute(children[i], 'name'))
            return Q.nfcall(context.core.loadChildren, children[i]);
        }
        return null;
      })
      .then(function (children) {
        expect(children).not.to.equal(null);
        var found = false;
        for (var i = children.length - 1; i >= 0; i--) {
          if (!found && 'SenseAndSendC' == context.core.getAttribute(children[i], 'name')) {
            found = true;
            sense_and_sendc_node = children[i];
            module_util = new ModuleUtil(context, sense_and_sendc_node);
          }
        }
        expect(found).to.equal(true);
      })
      .nodeify(done);
  });

  it('should have defined properties', function (done) {
    expect(module_util).to.be.an('object');
    module_util.should.have.property('generateModule');
    module_util.should.have.property('_saveSourceAndDependencies');
    module_util.should.have.property('_getMetaNodes');
    done();
  });

  describe('#generateModule', function () {

    var sense_and_sendc_children = {
      tasks: [],
      calls: [],
      posts: []
    };
    before(function (done) {
      module_util.generateModule()
        .then(function () {
          return Q.nfcall(context.core.loadChildren, sense_and_sendc_node);
        })
        .then(function (children) {
          children.forEach(function (child) {
            switch (core.getAttribute(core.getMetaType(child), 'name')) {
              case 'Task':
                sense_and_sendc_children.tasks.push(child);
                break;
              case 'call':
                sense_and_sendc_children.calls.push(child);
                break;
              case 'post':
                sense_and_sendc_children.posts.push(child);
                break;
            }
          });
        })
        .catch(function (error) {
          logger.error(error);
          expect(error.stderr).to.not.exist();
        })
        .nodeify(done);
    });

    it('should generate uses and provides interfaces', function (done) {
      var expected_interface_names = ['Boot', 'Timer', 'AccelRead', 'Packet', 'RadioControl', 'AMSend'];
      Q.nfcall(context.core.loadChildren, sense_and_sendc_node)
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
    var radio_control_node;
    it('should generate commands and events for interfaces', function (done) {
      Q.nfcall(context.core.loadChildren, sense_and_sendc_node)
        .then(function (children) {
          children.forEach(function (child) {
            switch (core.getAttribute(child, 'name')) {
              case 'Boot':
              boot_node = child;
              break;
              case 'RadioControl':
              radio_control_node = child;
              break;
            }
          });
          expect(boot_node).to.be.an('object');
          expect(radio_control_node).to.be.an('object');
        })
        .then(function () {
          return Q.nfcall(core.loadChildren, boot_node);
        })
        .then(function (children) {
          children.should.have.length(1);
          expect(core.getAttribute(children[0], 'name')).to.equal('booted');
          return Q.nfcall(core.loadChildren, radio_control_node);
        })
        .then(function (children) {
          children.should.have.length(4);
        })
        .nodeify(done);
    });

    it('should generate tasks', function (done) {
      sense_and_sendc_children.tasks.should.have.length(1);
      done();
    });

    xit('should generate calls, signals, and posts between events and commands', function (done) {
      sense_and_sendc_children.calls.should.have.length(6);
      sense_and_sendc_children.posts.should.have.length(1);
    });
  });

  describe('#_saveSourceAndDependencies', function () {
    it('should save source to a temp folder', function (done) {
      module_util._saveSourceAndDependencies()
        .then(function (tmp_path) {
          expect(tmp_path).to.contain('tmp');
          [ 'SenseAndSendC.nc',
            'SenseAndSend.h',
            'Lsm330dlc.h'
          ].map(function (file) {
            return path.join(tmp_path, file);
          }).forEach (function (file_path) {
            expect(fs.existsSync(file_path)).to.equal(true, file_path);
          });
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
