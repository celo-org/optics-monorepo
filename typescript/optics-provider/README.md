## Optics Provider

Optics Provider is a management system for
[ethers.js](https://docs.ethers.io/v5/) providers and signers that helps
developers connect to multiple networks simultaneously. It is part
of the [Optics](https://github.com/celo-org/optics-monorepo) project, but may
be useful to other multi-chain systems.

This package includes the `MultiProvider`, as well as an `OpticsContext` for
interacting with deployed Optics systems. The dev, staging, and mainnet Optics
systems have pre-built objects for quick development.

### Intended Usage

```ts
import * as ethers from 'ethers';
import { LedgerSigner } from '@ethersproject/hardware-wallets';

import { mainnet } from 'optics-provider';

// Set up providers and signers
// https://docs.ethers.io/v5/api/other/hardware/
const someEthersProvider = ethers.providers.WsProvider('...');
mainnet.registerProvider('ethereum', someEthersProvider);

const ledgerSigner = new LedgerSigner();
mainnet.registerSigner('ethereum', ledgerSigner);

// We have shortcuts for common provider/signer types
mainnet.registerRpcProvider('celo', 'https://forno.celo.org');
mainnet.registerWalletSigner('celo', '0xabcd...');

// Interact with the Optics Bridge
// Send ETH from ethereum to celo
await mainnet.sendNative(
    'ethereum', // source
    'celo',  // destination
    ethers.constants.WeiPerEther, // amount
    '0x1234...',  // recipient
);

// Send Tokens from celo to ethereum
await mainnet.send(
    'celo',  // source
    'ethereum', // destination
    { domain: 'ethereum', id: "0xabcd..."} // token information
    ethers.constants.WeiPerEther, // amount
    '0x1234...'  // recipient
    { gasLimit: 300_000 } // standard ethers tx overrides
);

// so easy.
```
