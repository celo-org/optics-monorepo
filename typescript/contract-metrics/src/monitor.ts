import {OpticsContext} from '@optics-xyz/multi-provider';
import {getEvents} from "@optics-xyz/multi-provider/dist/optics/events/fetch";
import * as contexts from "./registerContext";
import {logMonitorMetrics, writeUnprocessedMessages} from "./print";

export const mainnets = ['ethereum', 'celo', 'polygon'];

monitorAll().then(() => {
  console.log('DONE!');
  process.exit();
});

async function monitorAll() {
  for (let network of mainnets) {
    const origin = network;
    const remotes = mainnets.filter((m) => m != origin);
    await monitor(contexts.mainnet, origin, remotes);
  }
}

async function monitor(
  context: OpticsContext,
  origin: string,
  remotes: string[],
) {
  console.log('Check ', origin);
  console.log('Get Dispatch logs from ', origin);
  const home = context.mustGetCore(origin).home;
  const dispatchFilter = home.filters.Dispatch();
  const dispatchLogs = await getEvents(
      context,
      origin,
      home,
      dispatchFilter,
  );

  const processedLogs = [];
  for (let remote of remotes) {
    console.log('Get Process logs from ', remote, ' for ', origin);
    const replica = context.mustGetReplicaFor(origin, remote);
    const processFilter = replica.filters.Process();
    const processLogs = await getEvents(
        context,
        remote,
        replica,
        processFilter,
    );
    processedLogs.push(...processLogs);
  }

  const unprocessedDetails = await getUnprocessedDetails(origin, dispatchLogs, processedLogs);

  // console.log
  logMonitorMetrics(origin, dispatchLogs, processedLogs, unprocessedDetails);

  // write details to file
  await writeUnprocessedMessages(unprocessedDetails, origin);
}

async function getUnprocessedDetails(origin: string, dispatchLogs: any[], processedLogs: any[]) {
  const processedMessageHashes = processedLogs.map(
      (log: any) => log.args.messageHash,
  );
  const unprocessedMessages = dispatchLogs.filter(
      (log: any) => !processedMessageHashes.includes(log.args.messageHash),
  );
  const promises = unprocessedMessages.map(async (log) => {
    const transaction = await log.getTransaction();
    return {
      chain: origin,
      transactionHash: transaction.hash,
      messageHash: log.args[0],
      leafIndex: log.args[1].toNumber(),
    };
  });
  return Promise.all(promises);
}