import { config } from "dotenv";
import fetch from "cross-fetch";
import { stagingCommunity } from '..';

config();

const privkey = process.env.PRIVKEY_LMAO;
if (!privkey) {
  throw new Error('set PRIVKEY_LMAO');
}

const rpc = process.env.KOVAN_RPC;
stagingCommunity.registerRpcProvider('kovan', rpc!);
stagingCommunity.registerWalletSigner('kovan', privkey);

async function doThing() {
  const address = await stagingCommunity.getAddress('kovan');
  if (!address) {
    throw new Error('no address');
  }

  const replica = await stagingCommunity.mustGetReplicaFor('alfajores', 'kovan');
  const S3_BUCKET_URL = 'https://optics-staging-community.s3.us-west-2.amazonaws.com/';
  const response = await fetch(`${S3_BUCKET_URL}alfajores_36`);
  
  const s3Data = await response.json();

  const processTx = await replica.callStatic.proveAndProcess(s3Data.message, s3Data.proof.path, s3Data.proof.index);

  console.log(processTx);

  // await processTx.wait(1);
  // console.log(processTx.hash);
}

doThing();
