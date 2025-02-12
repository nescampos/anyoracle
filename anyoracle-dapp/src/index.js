// XXX even though ethers is not used in the code below, it's very likely
// it will be used by any DApp, so we are already including it here
const { ethers } = require("ethers");
const http = require('http');

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

async function emit_notice(data) {
  try {
    const notice_payload = { payload: data.payload };
    const response = await fetch(rollup_server + "/notice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notice_payload),
    });

    if (response.status === 201 || response.status === 200) {
      console.log("Notice emitted successfully with data:", data);
    } else {
      console.error(`Failed to emit notice with data: ${JSON.stringify(data)}. Status code: ${response.status}`);
    }
  } catch (error) {
    console.error("Error emitting notice:", error);
  }
}


async function handle_advance(data) {
  try {
    // Convert hex payload to string
    const payloadHex = data.payload;
    const payloadStr = Buffer.from(payloadHex.slice(2), 'hex').toString('utf8');
    const payload = JSON.parse(payloadStr);
    console.log("Payload:", payload);

    // Check if the method is increment and counter value exists
    if ('type' in payload && 'currency_name' in payload) {
      if (payload.type == "crypto") {
        if('to_currency' in payload) {
          const options = {
            hostname: 'api.coingecko.com/api/v3',
            path: '/simple/price?ids='+payload.currency_name+'&vs_currencies='+payload.to_currency,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x_cg_api_key': process.env.COINGECKO_API_KEY
            },
          };
          let data = '';

          const request = http.request(options, (response) => {
            // Set the encoding, so we don't get log to the console a bunch of gibberish binary data
            response.setEncoding('utf8');

            // As data starts streaming in, add each chunk to "data"
            response.on('data', (chunk) => {
              data += chunk;
            });

            // The whole response has been received. Print out the result.
            response.on('end', () => {
              console.log(data);
            });
          });

          // Log errors if any occur
          request.on('error', (error) => {
            console.log("Error querying the crypto rate.");
            return "reject";
          });

          // End the request
          request.end();

          //Fetching data
          try {
            const responseJSON = JSON.parse(data);
            const valueFromResponse = responseJSON[payload.currency_name][payload.to_currency];

            const newPayload = {
              "from_asset":payload.currency_name,
              "to_asset":payload.to_currency,
              "value": int.parse(valueFromResponse)
            };

            let hexData = Buffer.from(newPayload).toString('hex')
            await emit_notice({ payload: hexData });
            return "accept";
          } catch {
            console.log("Error fetching the crypto rate.");
            return "reject";
          }
          
        } else {
          console.log("To query the value of the coin, enter the 'to_currency' param to compare (usd/eur,etc.)");
          return "reject";
        }
      }
      else {
        console.log("Currency type not supported");
        return "reject";
      }
    } else {
      console.log("Invalid currency type");
      return "reject";
    }
  } catch (error) {
    console.error("Error processing payload:", error);
    return "reject";
  }
}

var handlers = {
  advance_state: handle_advance,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();
