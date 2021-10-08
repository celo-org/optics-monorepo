import {OpticsContext, OpticsMessage} from '@optics-xyz/multi-provider';
import * as contexts from "./registerContext";
import {printStatus} from "./print";

const input: TraceInput[] = [
  {
    chain: 'kovan',
    context: contexts.dev,
    transactionHash:
      '0x39322e91cbfe18391f252f063231065adceda35fe8c1ebd2292c98d0a7d10a1f',
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

  const status = await message.events();
  printStatus(context, status);
}
