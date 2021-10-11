import { OpticsContext, OpticsMessage } from '@optics-xyz/multi-provider';
import * as contexts from './registerContext';
import { printStatus } from './print';

const input: TraceInput[] = [
  {
    chain: 'polygon',
    context: contexts.mainnet,
    transactionHash:
      '0x6f46be8292ea5f04d056d3a1167e6e5b59416e3fdab14520eb402bf1d5f2db3a',
  },
];

traceMany(input).then(() => {
  console.log('DONE!');
});

interface TraceInput {
  chain: string;
  context: OpticsContext;
  transactionHash: string;
  messageHash?: string;
  leafIndex?: number;
}

async function traceMany(inputs: TraceInput[]) {
  for (let input of inputs) {
    const { context, chain, transactionHash } = input;
    await traceTransfer(context, chain, transactionHash);
  }
}

async function traceTransfer(
  context: OpticsContext,
  origin: string,
  transactionHash: string,
) {
  console.log(`Trace ${transactionHash} on ${origin}`);

  const message = await OpticsMessage.singleFromTransactionHash(
    context,
    origin,
    transactionHash,
  );

  console.log(`Leaf index: ${message.leafIndex}`);
  console.log(`Nonce: ${message.nonce}`);

  const status = await message.events();
  printStatus(context, status);
}
