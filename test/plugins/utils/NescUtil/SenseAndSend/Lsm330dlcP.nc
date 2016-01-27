/**
 * lsm330dlc: Accelerometer and Gyroscope
 */

#include "Lsm330dlc.h"
#define NEW_PRINTF_SEMANTICS
#include "printf.h"

module Lsm330dlcP {
  uses {
    interface SpiByte;
    interface Resource as SpiResource;
    interface HplMsp430GeneralIO as AccelCS;
    interface HplMsp430GeneralIO as GyroCS;
  }
  provides {
    interface Read<Accel_t> as AccelRead;
    interface Read<Gyro_t> as GyroRead;
    interface Msp430UsciConfigure;
    interface Init;
  }
}

implementation {

  const msp430_usci_config_t msp430_usci_spi_accel_config = {
    /* Inactive high MSB-first 8-bit 3-pin master driven by SMCLK */
    /*ctl0 : UCCKPL | UCMSB | UCMST | UCSYNC,*/
    ctl0 : UCCKPH | UCMSB | UCMST | UCSYNC,
    ctl1 : UCSSEL__SMCLK,
    br0  : 32,      /* 32x Prescale, 1*2^19 (512 KiHz) */
    br1  : 0,
    mctl : 0,
    i2coa: 0
  };

  task void ReadGyroValues();
  task void ReadAccelValues();

  Accel_t accel; // 3 axes, 2 bytes each
  Gyro_t gyro; // 3 axes, 2 bytes each

  uint8_t state = 0;
  command error_t Init.init(){
    state = 0;
    printf("Booted\n");
    call AccelCS.set();
    call GyroCS.set();
    call SpiResource.request();
    return SUCCESS;
  }

  uint8_t readRegister(uint8_t addr){
    uint8_t rc;
    call SpiByte.write((1<<7) | (addr & 0x7f));
    rc =  call SpiByte.write(0);
    return rc;
  }

  uint8_t writeRegister(uint8_t addr, uint8_t val){
    uint8_t rc;
    call SpiByte.write((addr & 0x7f));
    rc = call SpiByte.write(val);
    return rc;
  }

  event void SpiResource.granted(){
    uint8_t who_am_i = 0;

    call GyroCS.clr();
    who_am_i = readRegister(WHO_AM_I_G);
    call GyroCS.set();

    if(who_am_i == LSM330DLC_DEVICE_ID){

      // Configure Accelerometer for 400 Hz, High resolution
      call AccelCS.clr();
      writeRegister(CTRL_REG1_A, ACC_400_Hz_A | xyz_en_A);
      call AccelCS.set();
      call AccelCS.clr();
      writeRegister(CTRL_REG4_A, HR_A | ACC_2G_A);
      call AccelCS.set();
      // Configure Gyro 

      /*call GyroCS.clr();*/
      /*writeRegister(CTRL_REG1_G, DRBW_1000 | LPen_G | xyz_en_G);*/
      /*call GyroCS.set();*/

    } else {
      // Try again
      call SpiResource.release();
      call SpiResource.request();
    }
  }

  command error_t AccelRead.read(){
    post ReadAccelValues();
    return SUCCESS;
  }
  command error_t GyroRead.read(){
    post ReadAccelValues();
    return SUCCESS;
  }

  task void ReadAccelValues(){
    // Read 6 bytes from accelerometer
    // This can be made more efficient by using the autoincrement
    call AccelCS.clr();
    accel.x = (int16_t)(((uint16_t) (readRegister(ACC_REG_OUT_X_H) << 8)) + readRegister(ACC_REG_OUT_X_L));
    accel.y = (int16_t)(((uint16_t) (readRegister(ACC_REG_OUT_Y_H) << 8)) + readRegister(ACC_REG_OUT_Y_L));
    accel.z = (int16_t)(((uint16_t) (readRegister(ACC_REG_OUT_Z_H) << 8)) + readRegister(ACC_REG_OUT_Z_L));
    call AccelCS.set();
    signal AccelRead.readDone(SUCCESS, accel);
  }

  task void ReadGyroValues(){
    // Read 6 bytes from accelerometer
    call GyroCS.clr();
    gyro.x = (readRegister(GYR_REG_OUT_X_H) << 8) + readRegister(GYR_REG_OUT_X_L);
    gyro.y = (readRegister(GYR_REG_OUT_Y_H) << 8) + readRegister(GYR_REG_OUT_Y_L);
    gyro.z = (readRegister(GYR_REG_OUT_Z_H) << 8) + readRegister(GYR_REG_OUT_Z_L);
    call GyroCS.set();
    signal GyroRead.readDone(SUCCESS, gyro);
  }

  async command const msp430_usci_config_t* Msp430UsciConfigure.getConfiguration() {
      return &msp430_usci_spi_accel_config;
  }

  default event void AccelRead.readDone(error_t err, Accel_t val){
  }

  default event void GyroRead.readDone(error_t err, Gyro_t val){
  }
}
