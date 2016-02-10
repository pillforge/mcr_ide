describe('NescUtil', function () {
  'use strict';
  var testFixture = require('../../globals');
  var nesc_util = testFixture.requirejs('project_src/plugins/utils/NescUtil');
  var expect = testFixture.expect;
  var should = testFixture.should;
  var path = require('path');
  var fs = require('fs-extra');
  require('chai').use(require('chai3-json-schema'));
  var rimraf = testFixture.rimraf;

  var gmeConfig = testFixture.getGmeConfig();
  var gmeAuth;
  var logger = testFixture.logger.fork('plugins/utils/NescUtil');
  var storage;
  var projectName = 'NescUtilTest';
  var project;
  var context;
  var core;

  var Q = testFixture.Q;
  var sense_and_send_appc_node;

  this.timeout(4000);

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
      .then(setSenseNode)
      .nodeify(done);
  });
  after(function (done) {
    Q.allDone([
      storage.closeDatabase(),
      gmeAuth.unload()
    ])
    .then(function () {
      return Q.nfcall(rimraf, './test-tmp');
    })
    .nodeify(done);
  });

  function setSenseNode () {
    return Q.nfcall(context.core.loadChildren, context.rootNode)
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
          if (!found && 'SenseAndSendAppC' == context.core.getAttribute(children[i], 'name')) {
            found = true;
            sense_and_send_appc_node = children[i];
          }
        }
        expect(found).to.equal(true);
      });
  }

  it('should have defined properties', function (done) {
    expect(nesc_util).to.be.an('object');
    nesc_util.should.have.property('getAppJson');
    nesc_util.should.have.property('getMetaNodes');
    nesc_util.should.have.property('saveSourceAndDependencies');
    nesc_util.should.have.property('compileApp');
    nesc_util.should.have.property('addBlobs');
    nesc_util.should.have.property('generateNescCode');
    done();
  });

  describe('#getAppJson', function () {
    var app_json;
    before(function (done) {
      app_json = nesc_util.getAppJson(path.join(__dirname, 'NescUtil/SenseAndSend/SenseAndSendC.nc'), 'exp430');
      done();
    });

    it('should comply with the schema', function (done) {
      var schema = fs.readJsonSync(path.join(__dirname, 'NescUtil/AppSchema.json'));
      app_json.should.be.jsonSchema(schema);
      done();
    });

    it('should have SenseAndSendC component and interfaces', function (done) {
      app_json.components.should.have.property('SenseAndSendC');
      var sense_and_sendc_interfaces = app_json.components.SenseAndSendC.interface_types;
      sense_and_sendc_interfaces.should.have.length(6);
      done();
    });

    it('should work with MainC', function (done) {
      var app_json;
      try {
        app_json = nesc_util.getAppJson(path.join(process.env.TOSDIR, 'system/MainC.nc'), 'exp430');
      } catch (error) {
        logger.error(error);
        expect(error.stderr).to.not.exist();
      }
      done();
    });

    it('should work with SenseAndSendAppC', function (done) {
      var app_json;
      try {
        app_json = nesc_util.getAppJson(path.join(__dirname, 'NescUtil/SenseAndSend/SenseAndSendAppC.nc'), 'exp430');
        app_json.components.SenseAndSendAppC.file_path[0].should.not.be.equal('/');
        app_json.components.SenseAndSendAppC.file_path.should.contain('apps');
      } catch (error) {
        logger.error(error);
        expect(error.stderr).to.not.exist();
      }
      done();
    });
    it('should return null when Makefile does not exist for directory', function (done) {
      var app_json = nesc_util.getAppJson(path.join(__dirname, 'NescUtil'), 'exp430');
      expect(app_json).to.be.a('null');
      done();
    });
    it('should return correct Json from a directory', function (done) {
      var app_json = nesc_util.getAppJson(path.join(__dirname, 'NescUtil/SenseAndSend'), 'exp430');
      var schema = fs.readJsonSync(path.join(__dirname, 'NescUtil/AppSchema.json'));
      app_json.should.be.jsonSchema(schema);
      done();
    });
  });

  describe('#getMetaNodes', function () {
    it('should get META for context', function (done) {
      nesc_util.getMetaNodes(context);
      should.exist(context.META);
      expect(context.META).to.be.an('object');
      done();
    });
  });

  describe('#saveSourceAndDependencies', function () {
    it('should save source and dependencies to a temp folder', function (done) {
      nesc_util.saveSourceAndDependencies(context, sense_and_send_appc_node)
        .then(function (tmp_path) {
          expect(tmp_path).to.contain('tmp');
          [ 'SenseAndSendAppC.nc',
            'SenseAndSendC.nc',
            'SenseAndSend.h',
            'Lsm330dlcC.nc',
            'Lsm330dlcP.nc',
            'Lsm330dlc.h',
          ].map(function (file) {
            return path.join(tmp_path, file);
          }).forEach (function (file_path) {
            expect(fs.existsSync(file_path)).to.equal(true, file_path + ' should exist');
          });
        })
        .nodeify(done);
    });
  });

  describe('#compileApp', function () {
    it('should return compilation artifacts', function (done) {
      nesc_util.compileApp(context, sense_and_send_appc_node, 'exp430')
        .then(function (tmp_path) {
          expect(fs.existsSync(tmp_path)).to.equal(true, tmp_path + ' should exist');
          ['Makefile'].map(function (file) {
            return path.join(tmp_path, file);
          }).forEach(function (file_path) {
            expect(fs.existsSync(file_path)).to.equal(true, file_path + ' should exist');
          });
          var appc_path = path.join(tmp_path, 'build/exp430/app.c');
          expect(fs.existsSync(appc_path)).to.equal(true, appc_path + ' should exist');
        })
        .nodeify(done);
    });
  });

  describe('#addBlobs', function () {
    var server;
    var http = require('http');
    before(function (done) {
      server = testFixture.WebGME.standaloneServer(gmeConfig);
      server.start(function () {
        done();
      });
    });
    after(function (done) {
      server.stop(done);
    });
    var BlobClient = testFixture.requirejs('blob/BlobClient');
    it('should add blobs', function (done) {
      expect(BlobClient).to.be.an('function');
      context.blobClient = new BlobClient({
        logger: logger,
        server: '127.0.0.1',
        serverPort: gmeConfig.server.port,
        httpsecure: false
      });
      nesc_util.addBlobs(context, path.join(__dirname, 'NescUtil/SenseAndSend'), 'NescUtil')
        .then(function (url) {
          http.get(url, function (res) {
            expect(res.statusCode).to.equal(200);
            done();
          });
        });
    });
  });

  describe('#generateNescCode', function () {
    it('should generate configuration source code', function (done) {
      nesc_util.generateNescCode(context, sense_and_send_appc_node)
        .then(function (result) {
          expect(result).to.contain('Automatically generated file');
          expect(result).to.contain('configuration SenseAndSendAppC');
          expect(result).to.contain('components SenseAndSendC');
          expect(result).to.contain('Lsm330dlcC');
          expect(result).to.contain('components new TimerMilliC() as Timer0;');
          expect(result).to.contain('components new AMSenderC(AM_SENSORDATAMSG)');
          expect(result).to.contain('SenseAndSendC.Boot -> MainC.Boot;');
          expect(result).to.contain('SenseAndSendC.AccelRead -> Lsm330dlcC.AccelRead;');
          expect(result).to.contain('SenseAndSendC.AMSend -> AMSenderC.AMSend;');
          expect(result).to.contain('SenseAndSendC.Packet -> ActiveMessageC.Packet;');
          expect(result).to.contain('SenseAndSendC.RadioControl -> ActiveMessageC.RadioControl;');
          expect(result).to.contain('SenseAndSendC.Timer -> Timer0.Timer;');
        })
        .nodeify(done);
    });
    it('should generate uses/provides interfaces and equate wires', function (done) {
      Q.nfcall(context.core.loadByPath, context.rootNode, '/1117823861/146569445/1943146269')
        .then(function (mainc_node) {
          return nesc_util.generateNescCode(context, mainc_node);
        })
        .then(function (result) {
          expect(result).to.contain('provides interface Boot');
          expect(result).to.contain('uses interface Init as SoftwareInit');
          expect(result).to.contain('RealMainP.Boot');
          expect(result).to.contain(' = ');
        })
        .nodeify(done);
    });
  });

});
