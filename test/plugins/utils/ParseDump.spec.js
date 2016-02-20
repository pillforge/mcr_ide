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

  describe('#parse SchedulerBasicP', function() {
    var app_json;
    before(function (done) {
      var scheduler_basicp_xml = fs.readFileSync(path.join(__dirname, 'ParseDump/SchedulerBasicP.nc.xml'));
      app_json = pd.parse(scheduler_basicp_xml);
      app_json.calls = {};
      app_json.should.be.jsonSchema(schema);
      done();
    });
    it('components description', function (done) {
      var components_json = app_json.components;
      var schedul = components_json.SchedulerBasicP;
      expect(schedul.name).to.be.equal('SchedulerBasicP');
      expect(schedul.file_path).to.contain('tos/system/SchedulerBasicP.nc');
      expect(schedul.comp_type).to.be.equal('Module');
      expect(schedul.generic).to.be.equal(false);
      expect(schedul.safe).to.be.equal(true);
      done();
    });
    it('populate interface definitions interface_parameters', function (done) {
      var idefs_json = app_json.interfacedefs;
      var mcu_sleep = idefs_json.McuSleep;
      expect(mcu_sleep.name).to.be.equal('McuSleep');
      expect(mcu_sleep.file_path).to.contain('tos/interfaces/McuSleep.nc');
      expect(mcu_sleep.functions[0].name).to.be.equal('sleep');
      expect(mcu_sleep.functions[0].event_command).to.be.equal('command');
      done();
    });
    it('interface_parameters', function (done) {
      var ifaces = app_json.components.SchedulerBasicP.interface_types;
      var task_basic = _.find(ifaces, _.matchesProperty('name', 'TaskBasic'));
      expect(task_basic.interface_parameters).to.be.equal('uint8_t');
      done();
    });
  });

  describe('#parse AMReceiverC', function () {
    var app_json;
    before(function (done) {
      var amreceiverc_xml = fs.readFileSync(path.join(__dirname, 'ParseDump/AMReceiverC.nc.xml'));
      app_json = pd.parse(amreceiverc_xml);
      app_json.calls = {};
      app_json.should.be.jsonSchema(schema);
      done();
    });
    it('interfacedefs', function(done) {
      var funcs = app_json.interfacedefs.HplMsp430GeneralIO.functions;
      var set_resistor = _.find(funcs, ['name', 'setResistor']);
      var set_drive_strength = _.find(funcs, ['name', 'setDriveStrength']);
      expect(set_resistor.parameters).to.be.equal('uint8_t');
      expect(set_drive_strength.parameters).to.be.equal('uint8_t');
      done();
    });
    it('generic configuration parameters', function (done) {
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
