#ifndef SENSEANDSEND_H_3ROYNNVF
#define SENSEANDSEND_H_3ROYNNVF

typedef nx_struct Accel_t {
  nx_int16_t x;
  nx_int16_t y;
  nx_int16_t z;
} Accel_t;

typedef Accel_t Gyro_t;

typedef nx_struct SensorDataMsg{
  Accel_t sensor_data;
} SensorDataMsg;

enum {
  AM_SENSORDATAMSG = 6,
};


#endif /* end of include guard: SENSEANDSEND_H_3ROYNNVF */
