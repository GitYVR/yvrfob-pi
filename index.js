const evdev = require("evdev");
const reader = new evdev();
reader.open(
  "/dev/input/by-id/usb-Sycreader_RFID_Technology_Co.__Ltd_SYC_ID_IC_USB_Reader_08FF20140315-event-kbd"
);

let curFob = "";

const onReadKey = (key) => {
  // TODO: Read from Polygon node?
  console.log("KEY DETECTED", key);
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
