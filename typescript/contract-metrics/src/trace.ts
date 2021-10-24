import {OpticsContext, OpticsMessage} from '@optics-xyz/multi-provider';
import * as contexts from "./registerContext";
import {printStatus} from "./print";

const input: TraceInput[] = [
  {
    chain: 'kovan',
    context: contexts.dev,
    transactionHash:
      '',
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

  const messages = await OpticsMessage.fromTransactionHash(
    context,
    origin,
    transactionHash,
  );

  for (let message of messages) {
    const status = await message.events();
    const destination = context.resolveDomainName(message.destination);
    console.log("Message to ", destination);
    printStatus(context, status);
  }
}
