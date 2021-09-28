export { BridgeContracts } from './contracts/BridgeContracts';
export { CoreContracts } from './contracts/CoreContracts';

export {
  TransferMessage,
  DetailsMessage,
  RequestDetailsMessage,
} from './messages/BridgeMessage';

export {
  OpticsMessage,
  OpticsStatus,
  MessageStatus,
} from './messages/OpticsMessage';

export type { ResolvedTokenInfo, TokenIdentifier } from './tokens';
export { tokens, testnetTokens } from './tokens';

export type { OpticsDomain } from './domains';
export { mainnetDomains, devDomains, stagingDomains } from './domains';

export type {
  AnnotatedLifecycleEvent,
  OpticsLifecyleEvent,
  Annotated,
} from './events';
export {
  queryAnnotatedEvents,
  annotate,
  annotateEvent,
  annotateEvents,
} from './events';

export { OpticsContext, mainnet, dev, staging } from './OpticsContext';
