from m5stack import *
from m5stack_ui import *
from uiflow import *
from m5ui import M5ChartGraph, M5BarGraph
from IoTcloud.AWS import AWS
import time
from libs.json_py import *
import unit


screen = M5Screen()
screen.clean_screen()
screen.set_screen_bg_color(0xFFFFFF)
Watering_0 = unit.get(unit.WATERING, unit.PORTB)


moisture = None



bargraph0 = M5BarGraph(20, 59, 280, 30, 0, 500, M5BarGraph.HORIZON, False, 0x0288FB, 0xFFFFFF)
graph0 = M5ChartGraph(20, 104, 280, 120, 144, 0, 500, M5ChartGraph.LINE, 0x0288fb, 0xffffff, 0.5, 5)
label0 = M5Label('label0', x=20, y=18, color=0x000, font=FONT_MONT_38, parent=None)



def fun_M5StackWatering_cloud_watering001_pump_(topic_data):
  global moisture
  Watering_0.set_pump_status(1)
  wait(10)
  Watering_0.set_pump_status(0)
  pass

def buttonB_wasPressed():
  global moisture
  Watering_0.set_pump_status(1)
  wait(10)
  Watering_0.set_pump_status(0)
  pass
btnB.wasPressed(buttonB_wasPressed)


Watering_0.set_pump_status(0)
screen.set_screen_brightness(50)
aws = AWS(things_name='M5StackWatering001', host='a1j3ua5k30vuoa-ats.iot.ap-northeast-1.amazonaws.com', port=8883, keepalive=60, cert_file_path="/flash/res/watering-cert.pem.crt", private_key_path="/flash/res/watering-private.pem.key")
aws.subscribe(str('M5StackWatering/cloud/watering001/pump'), fun_M5StackWatering_cloud_watering001_pump_)
aws.start()
while True:
  moisture = 2100 - (Watering_0.get_adc_value())
  label0.set_text(str(moisture))
  bargraph0.addSample(moisture)
  graph0.addSample(moisture)
  aws.publish(str('M5StackWatering/devices/watering001/moisture'),str((py_2_json({'moisture':moisture}))))
  wait(600)
  wait_ms(2)
