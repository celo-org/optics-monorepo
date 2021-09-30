import { mainnet } from '@optics-xyz/multi-provider';
import config from './config';

import {
  AnnotatedSend,
  AnnotatedTokenDeployed,
  SendArgs,
  SendTypes,
  TokenDeployedArgs,
  TokenDeployedTypes,
} from '@optics-xyz/multi-provider/dist/optics/events/bridgeEvents';
import {
  OpticsContext,
  queryAnnotatedEvents,
} from '@optics-xyz/multi-provider/dist/optics';
import { TSContract } from '@optics-xyz/multi-provider/dist/optics/events/fetch';
import { ethers } from 'ethers';

export type TokenDetails = {
  name: string;
  symbol: string;
  decimals: number;
};

export type Deploy = AnnotatedTokenDeployed & { token: TokenDetails };
export type Send = AnnotatedSend & { token: TokenDetails };

export async function getDomainDeployedTokens(
  context: OpticsContext,
  nameOrDomain: string | number,
): Promise<Deploy[]> {
  const domain = context.resolveDomain(nameOrDomain);
  const router = context.mustGetBridge(domain).bridgeRouter;
  // get Send events
  const annotated = await queryAnnotatedEvents<
    TokenDeployedTypes,
    TokenDeployedArgs
  >(
    context,
    domain,
    router as TSContract<TokenDeployedTypes, TokenDeployedArgs>,
    router.filters.TokenDeployed(),
    context.mustGetDomain(domain).paginate?.from,
  );

  return await Promise.all(
    annotated.map(async (e: AnnotatedTokenDeployed) => {
      const deploy = e as any;

      const erc20 = await context.resolveCanonicalToken(
        domain,
        deploy.event.args.representation,
      );
      const [name, symbol, decimals] = await Promise.all([
        erc20.name(),
        erc20.symbol(),
        erc20.decimals(),
      ]);

      deploy.token = {};
      deploy.token.name = name;
      deploy.token.symbol = symbol;
      deploy.token.decimals = decimals;
      return deploy as Deploy;
    }),
  );
}

export async function getDeployedTokens(
  context: OpticsContext,
): Promise<Map<number, Deploy[]>> {
  const events = new Map();
  for (const domain of context.domainNumbers) {
    events.set(domain, await getDomainDeployedTokens(context, domain));
  }
  return events;
}

function prettyDeploy(context: OpticsContext, deploy: Deploy) {
  const {
    event: {
      args: { domain, id, representation },
    },
    token: { name, symbol, decimals },
  } = deploy;

  return { domain, id, representation, name, symbol, decimals };
}

export async function printDeployedTokens(
  context: OpticsContext,
): Promise<void> {
  const deployed = await getDeployedTokens(context);

  for (const [key, value] of deployed.entries()) {
    const trimmed = value.map((deploy) => prettyDeploy(context, deploy));
    console.log(`DOMAIN: ${key} ${context.resolveDomainName(key)}`);
    console.table(trimmed);
  }
}

export async function getDomainSends(
  context: OpticsContext,
  nameOrDomain: string | number,
): Promise<Send[]> {
  const domain = context.resolveDomain(nameOrDomain);
  const router = context.mustGetBridge(domain).bridgeRouter;
  // get Send events
  const annotated = await queryAnnotatedEvents<SendTypes, SendArgs>(
    context,
    domain,
    router as TSContract<SendTypes, SendArgs>,
    router.filters.Send(),
    context.mustGetDomain(domain).paginate?.from,
  );

  return await Promise.all(
    annotated.map(async (e: AnnotatedSend) => {
      const repr = e.event.args.token;
      const send = e as any;
      const erc20 = await context.resolveCanonicalToken(domain, repr);
      const [name, symbol, decimals] = await Promise.all([
        erc20.name(),
        erc20.symbol(),
        erc20.decimals(),
      ]);

      send.token = {};
      send.token.name = name;
      send.token.symbol = symbol;
      send.token.decimals = decimals;
      return send as Send;
    }),
  );
}

export async function getSends(
  context: OpticsContext,
): Promise<Map<number, Send[]>> {
  const events = new Map();
  for (const domain of context.domainNumbers) {
    console.log(
      `gettings sends for ${domain} ${context.resolveDomainName(domain)}`,
    );
    const sends = await getDomainSends(context, domain);
    console.log(`got sends for ${domain} ${context.resolveDomainName(domain)}`);
    events.set(domain, sends);
  }
  return events;
}

function prettySend(context: OpticsContext, send: Send) {
  const {
    token: { name, symbol, decimals },
    event: {
      args: { from, toDomain, toId, amount },
    },
  } = send;

  return {
    name,
    symbol,
    decimals,
    from,
    toDomain,
    toId,
    amount: ethers.utils.formatUnits(amount, decimals),
  };
}

export async function printSends(context: OpticsContext): Promise<void> {
  const sends = await getSends(context);

  for (const [key, value] of sends.entries()) {
    const trimmed = value.map((send) => prettySend(context, send));

    console.log(`DOMAIN: ${key} ${context.resolveDomainName(key)}`);
    console.table(trimmed);
  }
}

(async function main() {
  mainnet.registerRpcProvider('celo', config.celoRpc);
  mainnet.registerRpcProvider('ethereum', config.ethereumRpc);
  mainnet.registerRpcProvider('polygon', config.polygonRpc);
  await printDeployedTokens(mainnet);
  await printSends(mainnet);
})();
