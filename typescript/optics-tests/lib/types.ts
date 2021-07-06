export type Domain = number;
export type Address = string;
export type AddressBytes32 = string;
export type HexString = string;

export type Update = {
  oldRoot: string;
  newRoot: string;
  signature: string;
};

export type CallData = {
  to: Address;
  data: string;
};

export type FailureNotification = {
  domainCommitment: string;
  domain: number;
  updaterBytes32: string;
}

export type SignedFailureNotification = {
  failureNotification: FailureNotification;
  signature: string
}
