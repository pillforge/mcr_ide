/**
 * This code is used for testing the miniature MCR board for our ICRA paper
 *
 * @auther Addisu Taddese
 * @date September 24 20014
 */

#include "SenseAndSend.h"

configuration SenseAndSendAppC {
}
implementation {
  components SenseAndSendC as App, MainC;
  components new AMSenderC(AM_SENSORDATAMSG);
  components new TimerMilliC() as Timer1;
  components ActiveMessageC;

  App.Boot -> MainC.Boot;
  App.AMSend -> AMSenderC;
  App.RadioControl -> ActiveMessageC;
  App.Packet -> ActiveMessageC;

  App.Timer -> Timer1;

  components Lsm330dlcC;
  App.AccelRead -> Lsm330dlcC.AccelRead;

}
