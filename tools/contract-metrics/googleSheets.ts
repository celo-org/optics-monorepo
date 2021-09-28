import { GoogleSpreadsheet } from "google-spreadsheet";
import { TokenDeployDetails } from "./events";

// https://www.npmjs.com/package/google-spreadsheet
async function uploadDeployedTokens(
  credentialsFile: string,
  network: string,
  details: TokenDeployDetails
) {
  const credentials = require("./credentials.json");
  const doc = new GoogleSpreadsheet(
    "1tBRMjCtHsxzDw2SOy_q4hRatDNnC64ldZvhUXcqJJKs"
  );
  await doc.useServiceAccountAuth(credentials);
  await doc.loadInfo();

  let sheet;
  if (doc.sheetsByTitle.hasOwnProperty(network)) {
    sheet = doc.sheetsByTitle[network];
  } else {
    sheet = await doc.addSheet({
      title: network,
      headerValues: ["name", "symbol", "decimals", "address", "id", "domain"],
    });
  }

  let rows = await sheet.getRows();

  for (const key in details) {
    if (Object.prototype.hasOwnProperty.call(details, key)) {
      const token = details[key];

      const matchedRow = rows.findIndex(
        (element) => element.address === token.address
      );
      if (matchedRow != -1) {
        let row = rows[matchedRow];
        row.name = token.name ?? "undefined";
        row.symbol = token.symbol ?? "undefined";
        row.decimals = token.decimals ?? "undefined";
        row.save();
      } else {
        await sheet.addRow({
          name: token.name ?? "undefined",
          symbol: token.symbol ?? "undefined",
          decimals: token.decimals ?? "undefined",
          address: token.address,
          id: token.id,
          domain: token.domain,
        });
      }
    }
  }
}

export { uploadDeployedTokens };
