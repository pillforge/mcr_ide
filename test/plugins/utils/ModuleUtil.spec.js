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
    done();
  });

  describe('#generateModule', function () {

    var sense_and_sendc_children = {
      tasks: [],
      calls: [],
      posts: [],
      variables: [],
      reads: [],
      writes: []
    };
    var all_children;
    before(function (done) {
      module_util.generateModule()
        .then(function () {
          return Q.nfcall(context.core.loadChildren, sense_and_sendc_node);
        })
        .then(function (children) {
          all_children = children;
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
              case 'variable':
                sense_and_sendc_children.variables.push(child);
                break;
              case 'read':
                sense_and_sendc_children.reads.push(child);
                break;
              case 'write':
                sense_and_sendc_children.writes.push(child);
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

    it('should generate calls, signals, and posts between events, commands, and tasks', function (done) {
      sense_and_sendc_children.calls.should.have.length(6);
      sense_and_sendc_children.posts.should.have.length(1);
      done();
    });

    it('should create variables and their access patterns', function (done) {
      sense_and_sendc_children.variables.should.have.length(4);
      sense_and_sendc_children.writes.should.have.length(1);
      sense_and_sendc_children.reads.should.have.length(4);
      done();
    });

    it('should create each element in a different position', function (done) {
      var hasDuplicates = false;
      var a_name, b_name;
      all_children.filter(function (child) {
        return !core.isConnection(child);
      }).sort(function (a, b) {
        if (hasDuplicates) return 1;
        var p_a = core.getRegistry(a, 'position');
        var p_b = core.getRegistry(b, 'position');
        if (p_a.x == p_b.x && p_a.y == p_b.y) {
          hasDuplicates = true;
          a_name = core.getAttribute(a, 'name');
          b_name = core.getAttribute(b, 'name');
        }
        return 1;
      });
      hasDuplicates.should.equal(false, a_name + ' : ' + b_name);
      done();
    });
  });

});
