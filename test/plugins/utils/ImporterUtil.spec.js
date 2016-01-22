describe('ImporterUtil', function () {
  'use strict';
  var testFixture = require('../../globals');
  var expect = testFixture.expect;
  var should = testFixture.should;

  var gmeConfig = testFixture.getGmeConfig();
  var gmeAuth;
  var logger = testFixture.logger.fork('plugins/utils/ImporterUtil');
  var storage;
  var projectName = 'ImporterUtilTest';
  var project;
  var context;
  var core;

  var Q = testFixture.Q;

  var ImporterUtil = testFixture.requirejs('project_src/plugins/utils/ImporterUtil');
  var importer_util;
  var target = 'exp430';
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
          projectSeed: 'src/seeds/Meta/Meta.json',
          projectName: projectName,
          gmeConfig: gmeConfig,
          logger: logger
        });
      })
      .then(function (result) {
        context = result;
        core = context.core;
        project = result.project;
        importer_util = new ImporterUtil(context, target);
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
    expect(importer_util).to.be.an('object');
    importer_util.should.have.property('importAComponentFromPath');
    importer_util.should.have.property('_getDirectories');
    importer_util.should.have.property('_getComponents');
    done();
  });

  describe('#importAComponentFromPath', function () {
    var registry_paths;
    var components;
    before(function (done) {
      components = importer_util._getComponents(target);
      importer_util.importAComponentFromPath(components['MainC.nc']);
      done();
    });
    it('should have registeries', function (done) {
      registry_paths = core.getRegistry(context.rootNode, 'paths');
      expect(registry_paths).to.be.an('object');
      done();
    });
    it('should import interfacedefs', function (done) {
      core.loadChildren(context.rootNode)
        .then(function (children) {
          children.should.have.length(3);
          return core.loadByPath(context.rootNode, registry_paths.interfacedefs.Boot);
        })
        .then(function (boot_node) {
          expect(core.getAttribute(boot_node, 'name')).to.be.equal('Boot');
          expect(core.getAttribute(core.getMetaType(boot_node), 'name'), 'Interface_Definition');
          return core.loadChildren(boot_node);
        })
        .then(function (children) {
          children.should.have.length(1);
          expect(core.getAttribute(children[0], 'name')).to.be.equal('booted');
        })
        .catch(function (error) {
          logger.error('err', error);
          expect(error).to.not.exist();
        })
        .nodeify(done);
    });
    it('should import components', function (done) {
      core.loadByPath(context.rootNode, registry_paths.components.MainC)
        .then(function (mainc_node) {
          expect(mainc_node).to.be.an('object');
          expect(core.getAttribute(mainc_node, 'name')).to.be.equal('MainC');
          return core.loadChildren(mainc_node);
        })
        .then(function (children) {
          children.should.have.length(2);
        })
        .nodeify(done);
    });
    it('should import only once', function (done) {
      var number_of_children = core.getChildrenRelids(context.rootNode).length;
      importer_util = new ImporterUtil(context, target);
      importer_util.importAComponentFromPath(components['MainC.nc']);
      var number_of_children2 = core.getChildrenRelids(context.rootNode).length;
      expect(number_of_children).to.be.equal(number_of_children2);
      done();
    });
  });

  describe('#_getDirectories', function () {
    it('should get directories', function (done) {
      var directories = importer_util._getDirectories();
      expect(directories).to.include(path.join(process.env.TOSDIR, 'platforms/exp430'));
      done();
    });
  });

  describe('#_getComponents', function () {
    it('should get components paths', function (done) {
      var components = importer_util._getComponents();
      expect(components).to.include.keys('MainC.nc');
      expect(components['MainC.nc']).to.include(path.join(process.env.TOSDIR, 'system/MainC.nc'));
      done();
    });
  });

});
