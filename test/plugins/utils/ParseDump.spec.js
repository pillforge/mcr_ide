describe('ParseDump', function () {
  'use strict';
  var testFixture = require('../../globals');
  var pd = testFixture.requirejs('project_src/plugins/utils/ParseDump');
  var fs = require('fs-extra');
  var path = require('path');
  var _ = require('lodash');
  var expect = testFixture.expect;
  var should = testFixture.should;
  require('chai').use(require('chai3-json-schema'));
  var schema = fs.readJsonSync(path.join(__dirname, 'NescUtil/AppSchema.json'));

  describe('populate interface definitions', function () {
    var scheduler_basicp_xml = fs.readFileSync(path.join(__dirname, 'ParseDump/SchedulerBasicP.nc.xml'));
    it('interface_parameters', function (done) {
      var idefs_json = pd.parse(scheduler_basicp_xml).interfacedefs;
      var mcu_sleep = idefs_json.McuSleep;
      expect(mcu_sleep.name).to.be.equal('McuSleep');
      expect(mcu_sleep.file_path).to.be.equal('tos/interfaces/McuSleep.nc');
      expect(mcu_sleep.functions[0].name).to.be.equal('sleep');
      expect(mcu_sleep.functions[0].event_command).to.be.equal('command');
      done();
    });
  });

  describe('#parse', function () {
    var scheduler_basicp_xml = fs.readFileSync(path.join(__dirname, 'ParseDump/SchedulerBasicP.nc.xml'));
    it('interface_parameters', function (done) {
      var app_json = pd.parse(scheduler_basicp_xml);
      app_json.calls = {};
      app_json.should.be.jsonSchema(schema);
      var ifaces = app_json.components.SchedulerBasicP.interface_types;
      var task_basic = _.find(ifaces, _.matchesProperty('name', 'TaskBasic'));
      expect(task_basic.interface_parameters).to.be.equal('uint8_t');
      done();
    });
    var amreceiverc_xml = fs.readFileSync(path.join(__dirname, 'ParseDump/AMReceiverC.nc.xml'));
    it('generic configuration parameters', function (done) {
      var app_json = pd.parse(amreceiverc_xml);
      app_json.calls = {};
      app_json.should.be.jsonSchema(schema);
      var parameters = app_json.components.AMReceiverC.parameters;
      expect(parameters).to.deep.equal(['unsigned char']);
      var instance_comp = app_json.instance_components['AlarmMilli32C.Transform'];
      var args = instance_comp.arguments;
      expect(args).to.be.equal('TMilli, uint32_t, T32khz, uint16_t, 5');
      var arbiter_instance_comp = app_json.instance_components.SendResourceC;
      args = arbiter_instance_comp.arguments;
      expect(args).to.be.equal('"RADIO_SEND_RESOURCE"');
      done();
    });
  });

});
