var testFixture = require('../../globals');
describe('Main', function () {
  'use strict';
  var gmeConfig = testFixture.getGmeConfig(),
    expect = testFixture.expect,
    logger = testFixture.logger.fork('MainPlugin'),
    PluginCliManager = testFixture.WebGME.PluginCliManager,
    projectName = 'testProject',
    pluginName = 'Main',
    project,
    gmeAuth,
    storage,
    commitHash;

  var manager = new PluginCliManager(null, logger, gmeConfig);
  var pluginConfig = {};

  beforeEach(function (done) {
    testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
      .then(function (gmeAuth_) {
        gmeAuth = gmeAuth_;
        // This uses in memory storage. Use testFixture.getMongoStorage to persist test to database.
        storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
        return storage.openDatabase();
      })
      .then(function () {
        var importParam = {
          projectSeed: 'test/seeds/SenseAndSend.json',
          projectName: projectName,
          branchName: 'master',
          logger: logger,
          gmeConfig: gmeConfig
        };
        return testFixture.importProject(storage, importParam);
      })
      .then(function (importResult) {
        project = importResult.project;
        commitHash = importResult.commitHash;
        return project.createBranch('test', commitHash);
      })
      .nodeify(done);
  });

  after(function (done) {
    storage.closeDatabase()
      .then(function () {
        return gmeAuth.unload();
      })
      .nodeify(done);
  });

  it('should run plugin and update the module', function (done) {
    var context = {
      project: project,
      commitHash: commitHash,
      branchName: 'test',
      activeNode: '/1915602411/1141766090/2066943656',
    };
    manager.executePlugin(pluginName, pluginConfig, context, function (err, result) {
      expect(err).to.equal(null);
      expect(typeof result).to.equal('object');
      expect(result.success).to.equal(true);
      project.getBranchHash('test')
        .then(function (branchHash) {
          expect(branchHash).to.not.equal(commitHash);
        })
        .nodeify(done);
    });
  });

  it('should compile the app', function (done) {
    var context = {
      project: project,
      commitHash: commitHash,
      branchName: 'test',
      activeNode: '/1915602411/1141766090/1545383428',
    };
    manager.executePlugin(pluginName, pluginConfig, context, function (err, result) {
      expect(err).to.equal(null);
      expect(typeof result).to.equal('object');
      expect(result.success).to.equal(true);
      expect(result.messages).to.have.length.above(-1);
      project.getBranchHash('test')
        .then(function (branchHash) {
          expect(branchHash).to.equal(commitHash);
        })
        .nodeify(done);
    });
  });
});
