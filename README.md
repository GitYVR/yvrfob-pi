# yvrfob-pi
Fob reader on the raspberry pi. This service is managed by PM2 and handles unlocking the door on fob tap. 

Whenever someone taps the their fob on the door, this service will do the following:
1. check the fobCache
2. check Covalent
3. check the blockchain directly

The fob expiration lives in FobNFT contract deployed on Sepolia: https://github.com/ori-wagmi/DCTRLMEMBERSHIP. Users can register their fob at https://dctrl.wtf.

## How to run
To restart the fob service, run: `pm2 restart yvrfob`
See logs with: `pm2 log`
To see running pm2 services: `pm2 list`

Run locally by removing `reader` from the code and running `node index.js`. 

## .env
Rename `.env.example` and set the expected fields. `LARGEPRIME` is defined in dctrl.wtf