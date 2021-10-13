import { mainnet } from './registerContext';
import config from './config';

import {
  AnnotatedSend,
  AnnotatedTokenDeployed,
  TokenDeployedArgs,
  TokenDeployedTypes,
} from '@optics-xyz/multi-provider/dist/optics/events/bridgeEvents';
import {
  OpticsContext,
  queryAnnotatedEvents,
} from '@optics-xyz/multi-provider/dist/optics';
import { TSContract } from '@optics-xyz/multi-provider/dist/optics/events/fetch';
// import { ethers } from 'ethers';
import { uploadDeployedTokens } from './googleSheets';

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

export async function persistDeployedTokens(
  context: OpticsContext,
  credentials: string
): Promise <void> {
  const deployed = await getDeployedTokens(context);
  for(let domain of deployed.keys()){
    let domainName = context.resolveDomainName(domain)
    const tokens = deployed.get(domain)
    uploadDeployedTokens(domainName!, tokens!, credentials)
  }
  //
}

(async function main() {
  await persistDeployedTokens(mainnet, config.googleCredentialsFile)
})();
