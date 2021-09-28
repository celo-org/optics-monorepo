export { MultiProvider } from './provider';
export {
  mainnet,
  dev,
  staging,
  OpticsContext,
  OpticsStatus,
  OpticsMessage,
  OpticsLifecyleEvent,
  Annotated,
} from './optics';

// intended usage
// import {mainnet} from 'optics-provider';

// mainnet.registerRpcProvider('celo', 'https://forno.celo.org');
// mainnet.registerRpcProvider('polygon', '...');
// mainnet.registerRpcProvider('ethereum', '...');
// mainnet.registerSigner('celo', ...);
// mainnet.registerSigner('polygon', ...);
// mainnet.registerSigner('ethereum', ...);

// mainnet.doWhatever
