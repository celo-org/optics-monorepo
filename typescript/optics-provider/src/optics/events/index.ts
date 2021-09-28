import { TransactionReceipt } from '@ethersproject/abstract-provider';

export type {
  AnnotatedDispatch,
  AnnotatedUpdate,
  AnnotatedProcess,
  AnnotatedLifecycleEvent,
  OpticsLifecyleEvent,
  DispatchEvent,
  ProcessEvent,
  UpdateEvent,
  UpdateArgs,
  UpdateTypes,
  ProcessArgs,
  ProcessTypes,
  DispatchArgs,
  DispatchTypes,
} from './opticsEvents';

export type {
  SendTypes,
  SendArgs,
  SendEvent,
  TokenDeployedTypes,
  TokenDeployedArgs,
  TokenDeployedEvent,
  AnnotatedSend,
  AnnotatedTokenDeployed,
} from './bridgeEvents';

export type Annotated<T> = {
  // What domain did it occur on?
  domain: number;

  // Receipt for the tx where it occurred
  receipt: TransactionReceipt;

  // event name
  name?: string;

  // The event
  event: T;
};

export {
  queryAnnotatedEvents,
  annotate,
  annotateEvent,
  annotateEvents,
} from './fetch';
