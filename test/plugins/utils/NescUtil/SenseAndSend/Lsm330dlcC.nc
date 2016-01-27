/*
 * App to test I2C with an accelerometer 
 * @author Addisu Z. Taddese (addisu.z.taddese@vanderbilt.edu)
 *
 */

#include "Lsm330dlc.h"
configuration Lsm330dlcC {
  provides{
    interface Read<Accel_t> as AccelRead;
    interface Read<Gyro_t> as GyroRead;
  }
}
implementation {
  components new Msp430UsciSpiA0C() as Spi;
  components MainC;
  components Lsm330dlcP;
  components HplMsp430GeneralIOC as GPIO;
  components SerialPrintfC;

  MainC.SoftwareInit -> Lsm330dlcP;
  Lsm330dlcP.SpiByte -> Spi;
  Lsm330dlcP.Msp430UsciConfigure <- Spi;
  Lsm330dlcP.SpiResource -> Spi;
  Lsm330dlcP.AccelCS -> GPIO.Port46;
  Lsm330dlcP.GyroCS -> GPIO.Port47;

  AccelRead = Lsm330dlcP.AccelRead;
  GyroRead = Lsm330dlcP.GyroRead;
}
