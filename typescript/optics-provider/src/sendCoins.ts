import {
  BridgeRouter,
  BridgeRouter__factory,
  ERC20__factory,
} from "../../typechain/optics-xapps";
import * as ethers from "ethers";

const celoTokenAddr = "0x471EcE3750Da237f93B8E339c536989b8978a438";
const celoBridgeRouter = "0xf244eA81F715F343040569398A4E7978De656bf6";
const amount = ethers.constants.WeiPerEther.mul(100);
const privkey = process.env.PRIVKEY_LMAO;
if (!privkey) {
  throw new Error("set PRIVKEY_LMAO");
}

const celoRpc = "https://forno.celo.org";

async function doThing() {
  const celoProvider = new ethers.providers.JsonRpcProvider(celoRpc);
  const celoSigner = new ethers.Wallet(privkey!, celoProvider);

  // approve the bridge to spend your celo
  const token = ERC20__factory.connect(celoTokenAddr, celoSigner);
  let tx = await token.approve(celoBridgeRouter, ethers.constants.MaxUint256, {
    gasLimit: 100_000,
  });
  console.log("approving token spend");
  await tx.wait(1);

  // instruct the bridge to send
  const bridgeRouter = BridgeRouter__factory.connect(
    celoBridgeRouter,
    celoSigner
  );
  tx = await bridgeRouter.send(
    token.address,
    amount,
    6648936, // b'eth'
    celoSigner.address
  );
  console.log(`sendTx is ${tx.hash}`);
  await tx.wait(1);
}
