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
  var target = 'exp430';
  var path = require('path');
  var _ = require('lodash');

  var importer_util;
  before(function (done) {
    importProject().nodeify(done);
  });
  after(function (done) {
    Q.allDone([
      storage.closeDatabase(),
      gmeAuth.unload()
    ])
    .nodeify(done);
  });

  describe('ImporterUtil', function () {
    it('should have defined properties', function (done) {
      expect(importer_util).to.be.an('object');
      importer_util.should.have.property('importAComponentFromPath');
      importer_util.should.have.property('importAllTosComponents');
      importer_util.should.have.property('_getDirectories');
      importer_util.should.have.property('_getComponents');
      done();
    });
  });

  describe('import several different nesC components', function () {
    var component_paths;
    before(function(done) {
      importProject()
        .then(function () {
          component_paths = importer_util._getComponents();
        })
        .nodeify(done);
    });
    beforeEach(function (done) {
      importProject().nodeify(done);
    });
    it('SchedulerBasicP', function (done) {
      importer_util.importAComponentFromPath(component_paths['SchedulerBasicP.nc'])
        .then(function () {
          var registry_paths = core.getRegistry(context.rootNode, 'paths');
          return core.loadByPath(context.rootNode, registry_paths.components.SchedulerBasicP);
        })
        .then(function (scheduler_basic_node) {
          var safe = core.getAttribute(scheduler_basic_node, 'safe');
          safe.should.be.equal(true);
          return core.loadChildren(scheduler_basic_node);
        })
        .then(function (children) {
          var children_obj = getChildrenByType(children);
          var uniq_uses = _.uniq(children_obj.Uses_Interface.map(child => core.getAttribute(child, 'name')));
          expect(children_obj.Uses_Interface.length)
            .to.equal(uniq_uses.length, 'Uses_Interface objects with the same name');
          expect(children_obj.Provides_Interface.length)
            .to.be.equal(2, 'There should be 2 Provides_Interfaces');
          var task_basic_node = _.find(children_obj.Provides_Interface, function (o) {
            return core.getAttribute(o, 'name') === 'TaskBasic';
          });
          var iface_parameters = core.getAttribute(task_basic_node, 'interface_parameters');
          expect(iface_parameters).to.be.equal('uint8_t');
          children_obj.signal.should.have.length(2);
        })
        .nodeify(done);
    });
    it('Actuate - interface definition', function (done) {
      importer_util.importAComponentFromPath(path.join(__dirname, './NescUtil/Actuate.nc'))
        .then(function () {
          var registry_paths = core.getRegistry(context.rootNode, 'paths');
          return core.loadByPath(context.rootNode, registry_paths.interfacedefs.Actuate);
        })
        .then(function (actuate_node) {
          var source = core.getAttribute(actuate_node, 'source');
          expect(source).to.be.a('string');
          source.should.have.length.above(0);
        })
        .nodeify(done);
    });
    it('ActiveMessageC - configuration', function (done) {
      this.timeout(4000);
      importer_util.importAComponentFromPath(component_paths['ActiveMessageC.nc'], true)
        .then(function (registry_paths) {
          return core.loadByPath(context.rootNode, registry_paths.components.ActiveMessageC);
        })
        .then(function (activemessagec_node) {
          return core.loadChildren(activemessagec_node);
        })
        .then(function (children) {
          var packetfield = findChildByName(children, 'PacketRSSI');
          var packetstamp = findChildByName(children, 'PacketTimeStampMilli');
          expect(core.getAttribute(packetfield, 'arguments')).to.be.equal('uint8_t');
          expect(core.getAttribute(packetstamp, 'arguments')).to.be.equal('TMilli, uint32_t');
          // var messsagec = findChildByName(children, 'MessageC');
          // expect(messagec).to.not.equal(undefined);
        })
        .nodeify(done);
    });
    describe('DemoSensorC', function() {
      var registry_paths;
      it('DemoSensorC - generic configuration', function (done) {
        this.timeout(8000);
        importer_util.importAComponentFromPath(component_paths['DemoSensorC.nc'])
          .then(function (rp) {
            registry_paths = rp;
            expect(registry_paths.components.DummyDemoSensorC).to.be.equal(undefined);
            return core.loadByPath(context.rootNode, registry_paths.components.DemoSensorC);
          })
          .then(function (demosensorc_node) {
            var meta_name = core.getAttribute(core.getMetaType(demosensorc_node), 'name');
            expect(meta_name).to.be.equal('Generic_Configuration');
            return core.loadChildren(demosensorc_node);
          })
          .then(function (children) {
            expect(children).have.length(3);
            var demosensor = findChildByName(children, 'DemoSensor');
            return core.loadPointer(demosensor, 'ref');
          })
          .then(function (potentiometerc) {
            expect(potentiometerc).to.be.an('object');
            var meta_name = core.getAttribute(core.getMetaType(potentiometerc), 'name');
            expect(meta_name).to.be.equal('Generic_Configuration');
            return core.loadChildren(potentiometerc);
          })
          .then(function (children) {
            children.should.have.length(15);
          })
          .then(function () {
            return core.loadByPath(context.rootNode, registry_paths.components.Msp430Adc12P);
          })
          .then(function (node) {
            return core.loadChildren(node);
          })
          .then(function (children) {
            var arbiter_node = findChildByName(children, 'Arbiter');
            var args = core.getAttribute(arbiter_node, 'arguments');
            expect(args).to.be.equal('"Msp430Adc12C.Resource"');
          })
          .nodeify(done);
      });
    });
  });

  describe('#importAComponentFromPath', function () {
    var registry_paths;
    var components;
    this.timeout(12000); // TODO
    before(function (done) {
      importProject()
        .then(function () {
          components = importer_util._getComponents(target);
          return importer_util.importAComponentFromPath(components['MainC.nc']);
        })
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
          var children_obj = getChildrenByType(children);
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

  describe('import a component from a directory that includes Makefile', function () {
    this.timeout(8000);
    before(function (done) {
      importProject().nodeify(done);
    });
    it('imports SenseAndSend from Makefile', function (done) {
      importer_util.importAComponentFromPath(path.join(__dirname, './NescUtil/SenseAndSend/'))
        .then(function () {
          var registry_paths = core.getRegistry(context.rootNode, 'paths');
          expect(registry_paths.interfacedefs.Boot).to.be.a('string', 'Boot');
          expect(registry_paths.components.MainC).to.be.a('string', 'MainC');
        })
        .nodeify(done);
    });
  });

  describe('import AMPacket', function () {
    before(function (done) {
      importProject()
        .then(function () {
          importer_util = new ImporterUtil(context, target);
        })
        .nodeify(done);
    });
    it('should import AMPacket component', function (done) {
      var comp_path = importer_util._getComponents()['AMPacket.nc'];
      importer_util.importAComponentFromPath(comp_path)
        .then(function () {
          var registry_paths = core.getRegistry(context.rootNode, 'paths');
          expect(registry_paths.interfacedefs.AMPacket).to.be.a('string');
        })
        .nodeify(done);
    });
  });

  describe('import AMReceiverC (generic configuration)', function () {
    this.timeout(16000);
    before(function (done) {
      importProject()
        .then(function () {
          importer_util = new ImporterUtil(context, target);
        })
        .nodeify(done);
    });
    it('should import AMReceiverC component', function (done) {
      var comp_path = importer_util._getComponents()['AMReceiverC.nc'];
      importer_util.importAComponentFromPath(comp_path)
        .then(function () {
          var registry_paths = core.getRegistry(context.rootNode, 'paths');
          expect(registry_paths.components.AMReceiverC).to.be.a('string');
        })
        .nodeify(done);
    });
  });

  describe('import header files once', function () {
    this.timeout(16000);
    before(function (done) {
      importProject()
        .then(function () {
          importer_util = new ImporterUtil(context, target);
        })
        .nodeify(done);
    });
    it('should import header files once', function (done) {
      var comps = importer_util._getComponents();
      importer_util.importAComponentFromPath(comps['MainC.nc'])
        .then(function () {
          return importer_util.importAComponentFromPath(comps['AMQueueP.nc']);
        })
        .then(function () {
          var registry_paths = core.getRegistry(context.rootNode, 'paths');
          return core.loadByPath(context.rootNode, registry_paths.folders['/tos/system']);
        })
        .then(function (tos_system_node) {
          return core.loadChildren(tos_system_node);
        })
        .then(function (children) {
          var header_names = {};
          children.forEach(function (child) {
            if (core.isTypeOf(child, context.META.Header_File)) {
              var name = core.getAttribute(child, 'name');
              expect(header_names[name]).to.be.an('undefined', name);
              header_names[name] = true;
            }
          });
        })
        .nodeify(done);
    });
  });

  // Skipping this test because it takes too long
  describe.skip('#importAllTosComponents', function () {
    this.timeout(800000);
    before(function (done) {
      importProject()
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
          // expect(importables_nesc_files_sorted).to.be.equal(imported_nesc_files);
          imported_nesc_files.should.have.length.above(400);
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

  function findChildByName(children, name) {
    return _.find(children, function (child) {
      return core.getAttribute(child, 'name') === name;
    });
  }

  function getChildrenByType (children) {
    var children_obj = {};
    children.forEach(function (child) {
      var type = core.getAttribute(core.getMetaType(child), 'name');
      children_obj[type] = children_obj[type] || [];
      children_obj[type].push(child);
    });
    return children_obj;
  }

  function importProject() {
    return testFixture.clearDbImportProject({
        logger: logger,
        seed: 'src/seeds/Meta/Meta.json',
        projectName: projectName
      })
      .then(function (res) {
        gmeAuth = res.gmeAuth;
        storage = res.storage;
        context = res.result;
        core = context.core;
        importer_util = new ImporterUtil(context, target);
      });
  }

});
