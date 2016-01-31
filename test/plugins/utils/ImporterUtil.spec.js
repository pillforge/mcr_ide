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
  var context;
  var core;

  var Q = testFixture.Q;

  var ImporterUtil = testFixture.requirejs('project_src/plugins/utils/ImporterUtil');
  var importer_util;
  var target = 'exp430';
  var path = require('path');

  before(function (done) {
    clearDbImportProjectSetContextAndCore().nodeify(done);
  });
  after(function (done) {
    Q.allDone([
      storage.closeDatabase(),
      gmeAuth.unload()
    ])
    .nodeify(done);
  });

  it('should have defined properties', function (done) {
    importer_util = new ImporterUtil(context, target);
    expect(importer_util).to.be.an('object');
    importer_util.should.have.property('importAComponentFromPath');
    importer_util.should.have.property('importAllTosComponents');
    importer_util.should.have.property('_getDirectories');
    importer_util.should.have.property('_getComponents');
    done();
  });

  describe('#importAComponentFromPath', function () {
    var registry_paths;
    var components;
    this.timeout(12000); // TODO
    before(function (done) {
      components = importer_util._getComponents(target);
      importer_util.importAComponentFromPath(components['MainC.nc'])
        .nodeify(done);
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
          children.should.have.length(9);
          var children_obj = {};
          children.forEach(function (child) {
            var type = core.getAttribute(core.getMetaType(child), 'name');
            children_obj[type] = children_obj[type] || [];
            children_obj[type].push(child);
          });
          children_obj.ConfigurationRef.should.have.length(2, 'ConfigurationRef');
          children_obj.ModuleRef.should.have.length(1, 'ModuleRef');
          children_obj.Link_Interface.should.have.length(2, 'Link_Interface');
          children_obj.Equate_Interface.should.have.length(2, 'Equate_Interface');


          return Q.all([
            load_end_points(children_obj.Link_Interface),
            load_end_points(children_obj.Equate_Interface),
            core.loadPointer(children_obj.ModuleRef[0], 'ref'),
            core.loadPointer(children_obj.Provides_Interface[0], 'interface')
          ])
          .then(function (result) {
            var links = result[0];
            var equates = result[1];
            var links_names = links.map(function (link) {
              var src_name = core.getAttribute(link[0], 'name');
              var dst_name = core.getAttribute(link[1], 'name');
              return [src_name, dst_name].join(' ');
            });
            links_names.should.contain('PlatformInit PlatformInit');
            links_names.should.contain('Scheduler Scheduler');
            var equate_names = equates.map(function (equate) {
              var src_name = core.getAttribute(equate[0], 'name');
              var dst_name = core.getAttribute(equate[1], 'name');
              return [src_name, dst_name].join(' ');
            });
            equate_names.should.contain('Boot Boot');
            equate_names.should.contain('SoftwareInit SoftwareInit');

            var realmainp_original_node = result[2];
            expect(realmainp_original_node).to.be.an('object');
            core.getAttribute(realmainp_original_node, 'name').should.be.equal('RealMainP');

            var boot_interface_node = result[3];
            expect(boot_interface_node).to.be.an('object');
            core.getAttribute(boot_interface_node, 'name').should.be.equal('Boot');
          });
        })
        .nodeify(done);
      function load_end_points(wires) {
        return Q.all(wires.map(function (wire) {
          return Q.all([
            core.loadPointer(wire, 'src'),
            core.loadPointer(wire, 'dst')
          ]);
        }));
      }
    });
    it('should create callgraph for RealMainP', function (done) {
      core.loadByPath(context.rootNode, registry_paths.components.RealMainP)
        .then(function (realmainp_node) {
          expect(realmainp_node).to.be.an('object');
          expect(core.getAttribute(realmainp_node, 'name')).to.be.equal('RealMainP');
          return core.loadChildren(realmainp_node);
        })
        .then(function (children) {
          children.should.have.length(12);
        })
        .nodeify(done);
    });
    it('should import only once', function (done) {
      var number_of_children = core.getChildrenRelids(context.rootNode).length;
      // importer_util = new ImporterUtil(context, target);
      importer_util.importAComponentFromPath(components['MainC.nc'])
        .then(function () {
          var number_of_children2 = core.getChildrenRelids(context.rootNode).length;
          expect(number_of_children).to.be.equal(number_of_children2);
        })
        .nodeify(done);
    });
    it('should import header files', function (done) {
      importer_util.importAComponentFromPath(path.join(__dirname, './NescUtil/SenseAndSend/SenseAndSendAppC.nc'))
        .then(function () {
          registry_paths = core.getRegistry(context.rootNode, 'paths');
          return core.loadByPath(context.rootNode, registry_paths.folders['/apps/SenseAndSend']);
        })
        .then(core.loadChildren)
        .then(function (children) {
          children.should.have.length(6);
        })
        .nodeify(done);
    });
    it('should save source for non-tos components', function (done) {
      core.loadByPath(context.rootNode, registry_paths.components.SenseAndSendAppC)
        .then(function (app_node) {
          var source = core.getAttribute(app_node, 'source');
          expect(source).to.be.a('string');
          source.should.have.length.above(0);
        })
        .nodeify(done);
    });
  });

  describe('import AMPacket', function () {
    before(function (done) {
      clearDbImportProjectSetContextAndCore()
        .then(function () {
          importer_util = new ImporterUtil(context, target);
        })
        .nodeify(done);
    });
    it('should import all tos components', function (done) {
      var comp_path = importer_util._getComponents()['AMPacket.nc'];
      importer_util.importAComponentFromPath(comp_path)
        .then(function () {
          var registry_paths = core.getRegistry(context.rootNode, 'paths');
          expect(registry_paths.interfacedefs.AMPacket).to.be.a('string');
        })
        .nodeify(done);
    });
  });

  describe.skip('import AMReceiverC', function () {
    before(function (done) {
      clearDbImportProjectSetContextAndCore()
        .then(function () {
          importer_util = new ImporterUtil(context, target);
        })
        .nodeify(done);
    });
    it('should import all tos components', function (done) {
      var comp_path = importer_util._getComponents()['AMReceiverC.nc'];
      importer_util.importAComponentFromPath(comp_path)
        .then(function () {
          var registry_paths = core.getRegistry(context.rootNode, 'paths');
          expect(registry_paths.interfacedefs.AMReceiverC).to.be.a('string');
        })
        .nodeify(done);
    });
  });

  describe.skip('#importAllTosComponents', function () {
    this.timeout(120000);
    before(function (done) {
      clearDbImportProjectSetContextAndCore()
        .then(function () {
          importer_util = new ImporterUtil(context, target);
        })
        .nodeify(done);
    });
    it('should import all tos components', function (done) {
      importer_util.importAllTosComponents()
        .then(function () {
          var registry_paths = core.getRegistry(context.rootNode, 'paths');
          expect(registry_paths).to.be.an('object');
          var importable_nesc_files = importer_util._getComponents();
          var importables_nesc_files_sorted = Object.keys(importable_nesc_files).map(function (e) {
            return e.split('.')[0];
          }).sort();
          var idefs_arr = Object.keys(registry_paths.interfacedefs);
          var comps_arr = Object.keys(registry_paths.components);
          var imported_nesc_files = idefs_arr.concat(comps_arr).sort();
          expect(importables_nesc_files_sorted).to.be.equal(imported_nesc_files);
          return core.loadByPath(context.rootNode, registry_paths.components.MainC);
        })
        .then(function (mainc_node) {
          expect(mainc_node).to.be.an('object');
        })
        .nodeify(done);
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

  function clearDbImportProjectSetContextAndCore () {
    return testFixture.clearDBAndGetGMEAuth(gmeConfig, null)
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
      });
  }

});
