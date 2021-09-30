import { OpticsContext, mainnet } from '@optics-xyz/multi-provider';
import { queryAnnotatedEvents } from '@optics-xyz/multi-provider/dist/optics/events';
import fs from 'fs';
import config from './config';

mainnet.registerRpcProvider('celo', config.celoRpc);
mainnet.registerRpcProvider('ethereum', config.ethereumRpc);
mainnet.registerRpcProvider('polygon', config.polygonRpc);

export const mainnets = ['ethereum', 'celo', 'polygon'];

monitorAll().then(() => {
  console.log('DONE!');
  process.exit();
});

async function monitorAll() {
  for (let network of mainnets) {
    const origin = network;
    const remotes = mainnets.filter((m) => m != origin);
    await monitor(mainnet, origin, remotes);
  }
}

async function getProcessedLogs(
  context: OpticsContext,
  remote: string,
  origin: string,
) {
  console.log('Get Process logs from ', remote, ' for ', origin);
  // get replica
  const originDomain = context.resolveDomain(origin);
  const remoteDomain = context.resolveDomain(remote);
  const replica = context.mustGetCore(remoteDomain).replicas.get(originDomain)!;
  // query process logs
  const processFilter = replica.contract.filters.Process();
  const logs = await queryAnnotatedEvents(
    context,
    remote,
    replica.contract,
    processFilter,
  );
  const logsWithChain = logs.map((log) => {
    return {
      chain: remote,
      replica: replica.contract.address,
      ...log,
    };
  });
  return logsWithChain;
}

async function getDispatchLogs(context: OpticsContext, origin: string) {
  console.log('Get Dispatch logs from ', origin);
  // get home
  const home = context.mustGetCore(origin).home;
  // query dispatch logs
  const dispatchFilter = home.filters.Dispatch();
  const logs = await queryAnnotatedEvents(
    context,
    origin,
    home,
    dispatchFilter,
  );
  const logsWithChain = logs.map((log) => {
    return {
      chain: origin,
      home: home.address,
      ...log,
    };
  });
  return logsWithChain;
}

async function writeUnprocessedMessages(
  processedLogs: any[],
  dispatchLogs: any[],
  origin: string,
) {
  const processedMessageHashes = processedLogs.map(
    (log: any) => log.args.messageHash,
  );
  const unprocessedMessages = dispatchLogs.filter(
    (log: any) => !processedMessageHashes.includes(log.args.messageHash),
  );

  const unprocessedDetails = [];
  for (let log of unprocessedMessages) {
    const transaction = await log.getTransaction();
    const args: any[] = log.args;
    unprocessedDetails.push({
      chain: origin,
      transactionHash: transaction.hash,
      messageHash: args[0],
      leafIndex: args[1].toNumber(),
    });
  }

  console.log(origin, 'Summary: ');
  console.log('   Num dispatched: ', dispatchLogs.length);
  console.log('   Num processed: ', processedLogs.length);
  console.log('   Num unprocessed: ', unprocessedMessages.length);
  fs.mkdirSync('unprocessed', { recursive: true });
  fs.writeFileSync(
    `unprocessed/${origin}.json`,
    JSON.stringify(unprocessedDetails, null, 2),
  );
}

async function monitor(
  context: OpticsContext,
  origin: string,
  remotes: string[],
) {
  console.log('Check ', origin);
  const dispatchLogs = await getDispatchLogs(context, origin);

  const processedLogs = [];
  for (let remote of remotes) {
    const logsWithChain = await getProcessedLogs(context, remote, origin);
    processedLogs.push(...logsWithChain);
  }

  await writeUnprocessedMessages(processedLogs, dispatchLogs, origin);
}
