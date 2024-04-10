from m5stack import *
from m5stack_ui import *
from uiflow import *
from IoTcloud.AWS import AWS
from libs.json_py import *
import time
import unit


screen = M5Screen()
screen.clean_screen()
screen.set_screen_bg_color(0xFFFFFF)
Watering_0 = unit.get(unit.WATERING, unit.PORTB)






label0 = M5Label('label0', x=60, y=55, color=0x000, font=FONT_MONT_14, parent=None)


Watering_0.set_pump_status(0)
aws = AWS(things_name='M5StackWatering001', host='a1j3ua5k30vuoa-ats.iot.ap-northeast-1.amazonaws.com', port=8883, keepalive=60, cert_file_path="/flash/res/watering-cert.pem.crt", private_key_path="/flash/res/watering-private.pem.key")
aws.start()
while True:
  label0.set_text(str(Watering_0.get_adc_value()))
  aws.publish(str('/M5StackWatering/watering001/moisture'),str((py_2_json({'moisture':(Watering_0.get_adc_value())}))))
  if (Watering_0.get_adc_value()) < 1000:
    Watering_0.set_pump_status(0)
  else:
    Watering_0.set_pump_status(0)
  wait(600)
  wait_ms(2)
