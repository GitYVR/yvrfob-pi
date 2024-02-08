const evdev = require("evdev");
const reader = new evdev();
const { Gpio } = require('onoff');
const { ethers } = require('ethers');
require('dotenv').config()

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

const FOB_ABI = require("./FobABI.json");
const FOBNFT_ADDRESS = "0xc378418f2c30dfC73058a9d5018C3bA76910b31F";
const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia.publicnode.com");
const fobContract = new ethers.Contract(FOBNFT_ADDRESS, FOB_ABI, provider);

const onReadKey = async (key) => {
  console.log(`[FOB] ${key} detected`)
  try {
    const encryptedKey = BigInt(key) * BigInt(process.env.LARGEPRIME);
    const expiration = await fobContract.idToExpiration(encryptedKey);
    const now = new Date().getTime();
    if ((expiration * BigInt(1000)) > BigInt(now)) {
      console.log("opening door");
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
