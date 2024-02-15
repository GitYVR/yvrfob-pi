const evdev = require("evdev");
const reader = new evdev();
const { Gpio } = require('onoff');
const { ethers } = require('ethers');
const { CovalentClient } = require("@covalenthq/client-sdk");
require('dotenv').config()

const client = new CovalentClient(process.env.COVALENT_KEY);
const FOB_ABI = require("./FobABI.json");
const FOBNFT_ADDRESS = "0xc378418f2c30dfC73058a9d5018C3bA76910b31F";
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
const fobContract = new ethers.Contract(FOBNFT_ADDRESS, FOB_ABI, provider);
const fobCache = {}; // key: fobnumber, value: expiration

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

// Call once on start. Instantiates the fobCache
async function CallOnce_CreateFobCache() {
  try {
      for await (const resp of client.NftService.getTokenIdsForContractWithMetadata("eth-sepolia", FOBNFT_ADDRESS, {"withUncached": true})) {
          // decode base64 fob token_url and extract expiration
          let base64String = resp.nft_data.token_url.split(",")[1];
          let decodedString = Buffer.from(base64String, "base64");
          let jsonObject = JSON.parse(decodedString);
          fobCache[resp.nft_data.token_id] = jsonObject.expiration;
      }
      console.log("CallOnce_CreateFobCache success. Number fobs cached: " + Object.keys(fobCache).length);

  } catch (error) {
      console.log("CallOnce_CreateFobCache failed with: " + error.message);
  }
}

// Returns true of `expiration > now`, otherwise false
// We try 3 times to get the expiration:
//   1. local fobCache
//   2. Covalent `https://www.covalenthq.com/docs/api/nft/get-nft-token-ids-for-contract-with-metadata/`
//   3. Fob contract via direct blockchain read 
async function checkExpiration(key) {
  const now = BigInt(new Date().getTime()) / BigInt(1000);

  if ((key in fobCache) && (fobCache[key] > now)) {
      console.log("Got expiration from fobCache");
      return true;
  }

  try {
    const resp = await client.NftService.getNftMetadataForGivenTokenIdForContract("eth-sepolia", FOBNFT_ADDRESS, key, {"withUncached": true});
    if (resp.data.items[0].nft_data.token_url !== "") {
      let base64String = resp.data.items[0].nft_data.token_url.split(",")[1];
      let decodedString = Buffer.from(base64String, "base64");
      let jsonObject = JSON.parse(decodedString);

      if (jsonObject.expiration > now) {
        console.log("Got expiration from Covalent", key);
        fobCache[key] = jsonObject.expiration;
        return true;
      }
    } 
  } catch (error) {
    console.log("getNftMetadataForGivenTokenIdForContract failed with: " + error.message);
  }

  try {
    const expiration = await fobContract.idToExpiration(key);

    if (expiration > now) {
      console.log("Got expiration from fobContract");
      fobCache[key] = expiration;
      return true;
    }
  } catch (error) {
    console.log("fobContract.getExpiration failed with: " + error.message);
  }

  return false;
}

async function onReadKey(key) {
  console.log(`[FOB] ${key} detected`)
  try {
    const encryptedKey = BigInt(key) * BigInt(process.env.LARGEPRIME);
    if(await checkExpiration(encryptedKey)) {
      console.log("opening door");
      openDoor();
    }
    else {
      console.log("fob expired or not found");
    }
  } catch(e) {
    console.log('ERROR onReadKey', e);
  }
};

reader.open(
  "/dev/input/by-id/usb-Sycreader_RFID_Technology_Co.__Ltd_SYC_ID_IC_USB_Reader_08FF20140315-event-kbd"
);

reader.on("EV_KEY", function (data) {
  if (data.value !== 1) return;
  const key = data.code.substr(4);

  if (key === "ENTER") {
    onReadKey(curFob);
  }
});

console.log("ready!");
CallOnce_CreateFobCache();
