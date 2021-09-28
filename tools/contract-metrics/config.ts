import * as dotenv from "dotenv";
dotenv.config();

export default {
  CeloRpc: process.env.CELO_RPC ?? "",
  EthereumRpc: process.env.ETHEREUM_RPC ?? "",
  PolygonRpc: process.env.POLYGON_RPC ?? "",
  GoogleCredentialsFile:
    process.env.GOOGLE_CREDENTIALS_FILE ?? "./credentials.json",
  Networks: {
    6648936: { name: "ethereum", deployedAt: 13187674 },
    1667591279: { name: "celo", deployedAt: 8712249 },
    1886350457: { name: "polygon", deployedAt: 18895794 },
  },
};
