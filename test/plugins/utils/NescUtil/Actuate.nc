interface Actuate<val_t> {
  command error_t write(val_t duty, bool dir);
}
