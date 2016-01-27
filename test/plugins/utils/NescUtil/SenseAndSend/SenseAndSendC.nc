#define CC1101_PA CC1101_PA_PLUS_10
#include "SenseAndSend.h"
#define NEW_PRINTF_SEMANTICS
#include "printf.h"

module SenseAndSendC {
  uses {
    interface Boot;
    interface Read<Accel_t> as AccelRead;
    interface AMSend;
    interface Timer<TMilli>;
    interface SplitControl as RadioControl;
    interface Packet;
  }


}
implementation {

  message_t packet;
  Accel_t data;
  uint8_t to_send_addr = 1;
  uint8_t sample_rate = 100;

  event void Boot.booted(){
    call RadioControl.start();
    /*call Timer.startPeriodic(sample_rate);*/
  }

  event void Timer.fired(){
    call AccelRead.read();
  }

  task void sendTask();

  task void sendTask() {
    SensorDataMsg* rcm = (SensorDataMsg*) call Packet.getPayload(&packet, sizeof(SensorDataMsg));
    rcm->sensor_data = data;
    call AMSend.send(to_send_addr, &packet, sizeof(SensorDataMsg));
  }

  event void RadioControl.startDone(error_t err){
    if(err == SUCCESS)
      call Timer.startPeriodic(sample_rate);
    else
      call RadioControl.start();
  }

  event void AccelRead.readDone(error_t err, Accel_t val){
    data = val;
    post sendTask();
  }

  event void RadioControl.stopDone(error_t err){ }

  event void AMSend.sendDone(message_t* bufPtr, error_t error) { }

}
