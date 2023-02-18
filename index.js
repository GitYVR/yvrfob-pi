const axios = require('axios')
const evdev = require("evdev");
const reader = new evdev();
const { Gpio } = require('onoff');

const openDoor = () => {
  try {
    const pin = new Gpio(17, 'out');
    pin.writeSync(1);
    setTimeout(() => {
      pin.writeSync(0);
    }, 500);
  } catch (e) {
    console.log('Unable to connect with GPIO, running in simulation mode');
  }
};

reader.open(
  "/dev/input/by-id/usb-Sycreader_RFID_Technology_Co.__Ltd_SYC_ID_IC_USB_Reader_08FF20140315-event-kbd"
);

let curFob = "";

const onReadKey = async (key) => {
  console.log(`[FOB] ${key} detected`)
  try {
    const resp = await axios.get(`https://fobs.dctrl.wtf/fob/valid?fob_key=${key}`)
    if (resp.data.valid) {
      openDoor();
    }
  } catch(e) {
    console.log('ERROR onReadKey', e);
  }
};

reader.on("EV_KEY", function (data) {
  if (data.value !== 1) return;
  const key = data.code.substr(4);

  if (key === "ENTER") {
    onReadKey(curFob);
    curFob = "";
  } else {
    curFob += key;
  }
});
