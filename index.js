require("dotenv/config")
const axios = require("axios");

const Airtable = require('airtable');
const base = new Airtable({ apiKey: process.env.APITABLE_TOKEN }).base(process.env.APITABLE_SPREADSHEET_TOKEN);

const TIME_TO_RUN = 1000 * 60  // 1 Minute
const BTC_CURRENCY_URL = "https://blockchain.info/ticker";
const TABLE_NAME = 'BTC Table'
const MAX_RECORD_OBJECTS = 10;

let cachedRates = [];

async function getCurrencyBTCRate() {
  let resp = await axios.default.get(BTC_CURRENCY_URL);
  let { data } = resp;
  return data.USD['15m'];
}

function getCurrentDatetime() {
  let currentdate = new Date();
  let datetime = currentdate.getDate() + "/"
    + (currentdate.getMonth() + 1) + "/"
    + currentdate.getFullYear() + "     "
    + currentdate.getHours() + ":"
    + currentdate.getMinutes()
  return datetime;
}

setInterval(() => {

  getCurrencyBTCRate().then(currentCurrency => {

    let currentDatetime = getCurrentDatetime();
    let isErrorOccurred = false;
    let fieldsToWrite = [];
    let recordObject = { "fields": { "Time": currentDatetime, "Rates": currentCurrency } }
    fieldsToWrite.push(recordObject);

    // If there are no cached records
    if (cachedRates.length == 0) {
      base(TABLE_NAME).create(fieldsToWrite, function (err, records) {
        if (err) {  // Add record to the cache if the insertion failed 
          console.log(err);
          cachedRates.push(recordObject);
        }
      });
    }
    // If there are cached records try to add them all
    else {
      while (cachedRates.length && !isErrorOccurred) {
        // According to the docs we can add up to 10 record objects
        while (fieldsToWrite.length <= MAX_RECORD_OBJECTS && cachedRates.length) {
          let cachedRecoredToAdd = cachedRates.shift();
          fieldsToWrite.push(cachedRecoredToAdd);
        }

        base(TABLE_NAME).create(fieldsToWrite, function (err, records) {
          if (err) {
            isErrorOccurred = true;
            cachedRates.unshift(...fieldsToWrite);
          } else {
            fieldsToWrite = []
          }

        });
      }
    }
  })
}, TIME_TO_RUN)
