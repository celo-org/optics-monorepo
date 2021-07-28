/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
  BaseContract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import { TypedEventFilter, TypedEvent, TypedListener } from "./commons";

interface BridgeRouterInterface extends ethers.utils.Interface {
  functions: {
    "PRE_FILL_FEE_DENOMINATOR()": FunctionFragment;
    "PRE_FILL_FEE_NUMERATOR()": FunctionFragment;
    "canonicalToRepresentation(bytes32)": FunctionFragment;
    "enrollCustom(bytes,address)": FunctionFragment;
    "enrollRemoteRouter(uint32,bytes32)": FunctionFragment;
    "getCanonicalAddress(address)": FunctionFragment;
    "getLocalAddress(uint32,bytes32)": FunctionFragment;
    "handle(uint32,bytes32,bytes)": FunctionFragment;
    "initialize(address,address)": FunctionFragment;
    "liquidityProvider(bytes32)": FunctionFragment;
    "migrate(address)": FunctionFragment;
    "owner()": FunctionFragment;
    "preFill(bytes)": FunctionFragment;
    "renounceOwnership()": FunctionFragment;
    "representationToCanonical(address)": FunctionFragment;
    "send(address,uint256,uint32,bytes32)": FunctionFragment;
    "setXAppConnectionManager(address)": FunctionFragment;
    "tokenBeacon()": FunctionFragment;
    "transferOwnership(address)": FunctionFragment;
    "updateDetails(address,uint32)": FunctionFragment;
    "xAppConnectionManager()": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "PRE_FILL_FEE_DENOMINATOR",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "PRE_FILL_FEE_NUMERATOR",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "canonicalToRepresentation",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "enrollCustom",
    values: [BytesLike, string]
  ): string;
  encodeFunctionData(
    functionFragment: "enrollRemoteRouter",
    values: [BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getCanonicalAddress",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "getLocalAddress",
    values: [BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "handle",
    values: [BigNumberish, BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "initialize",
    values: [string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "liquidityProvider",
    values: [BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "migrate", values: [string]): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(functionFragment: "preFill", values: [BytesLike]): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "representationToCanonical",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "send",
    values: [string, BigNumberish, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "setXAppConnectionManager",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "tokenBeacon",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "updateDetails",
    values: [string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "xAppConnectionManager",
    values?: undefined
  ): string;

  decodeFunctionResult(
    functionFragment: "PRE_FILL_FEE_DENOMINATOR",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "PRE_FILL_FEE_NUMERATOR",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "canonicalToRepresentation",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "enrollCustom",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "enrollRemoteRouter",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getCanonicalAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getLocalAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "handle", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "initialize", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "liquidityProvider",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "migrate", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "preFill", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "representationToCanonical",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "send", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setXAppConnectionManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "tokenBeacon",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "updateDetails",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "xAppConnectionManager",
    data: BytesLike
  ): Result;

  events: {
    "OwnershipTransferred(address,address)": EventFragment;
    "TokenDeployed(uint32,bytes32,address)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "OwnershipTransferred"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "TokenDeployed"): EventFragment;
}

export class BridgeRouter extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  listeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter?: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): Array<TypedListener<EventArgsArray, EventArgsObject>>;
  off<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  on<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  once<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeListener<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeAllListeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): this;

  listeners(eventName?: string): Array<Listener>;
  off(eventName: string, listener: Listener): this;
  on(eventName: string, listener: Listener): this;
  once(eventName: string, listener: Listener): this;
  removeListener(eventName: string, listener: Listener): this;
  removeAllListeners(eventName?: string): this;

  queryFilter<EventArgsArray extends Array<any>, EventArgsObject>(
    event: TypedEventFilter<EventArgsArray, EventArgsObject>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEvent<EventArgsArray & EventArgsObject>>>;

  interface: BridgeRouterInterface;

  functions: {
    PRE_FILL_FEE_DENOMINATOR(overrides?: CallOverrides): Promise<[BigNumber]>;

    PRE_FILL_FEE_NUMERATOR(overrides?: CallOverrides): Promise<[BigNumber]>;

    canonicalToRepresentation(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    enrollCustom(
      _id: BytesLike,
      _custom: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    enrollRemoteRouter(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    getCanonicalAddress(
      _local: string,
      overrides?: CallOverrides
    ): Promise<[number, string] & { _domain: number; _id: string }>;

    "getLocalAddress(uint32,bytes32)"(
      _domain: BigNumberish,
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string] & { _token: string }>;

    "getLocalAddress(uint32,address)"(
      _domain: BigNumberish,
      _id: string,
      overrides?: CallOverrides
    ): Promise<[string] & { _token: string }>;

    handle(
      _origin: BigNumberish,
      _sender: BytesLike,
      _message: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "initialize(address,address)"(
      _tokenBeacon: string,
      _xAppConnectionManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    "initialize()"(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    liquidityProvider(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    migrate(
      _asset: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    owner(overrides?: CallOverrides): Promise<[string]>;

    preFill(
      _message: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    renounceOwnership(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    representationToCanonical(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<[number, string] & { domain: number; id: string }>;

    send(
      _token: string,
      _amnt: BigNumberish,
      _destination: BigNumberish,
      _recipient: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setXAppConnectionManager(
      _xAppConnectionManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    tokenBeacon(overrides?: CallOverrides): Promise<[string]>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    updateDetails(
      _token: string,
      _destination: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    xAppConnectionManager(overrides?: CallOverrides): Promise<[string]>;
  };

  PRE_FILL_FEE_DENOMINATOR(overrides?: CallOverrides): Promise<BigNumber>;

  PRE_FILL_FEE_NUMERATOR(overrides?: CallOverrides): Promise<BigNumber>;

  canonicalToRepresentation(
    arg0: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  enrollCustom(
    _id: BytesLike,
    _custom: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  enrollRemoteRouter(
    _domain: BigNumberish,
    _router: BytesLike,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  getCanonicalAddress(
    _local: string,
    overrides?: CallOverrides
  ): Promise<[number, string] & { _domain: number; _id: string }>;

  "getLocalAddress(uint32,bytes32)"(
    _domain: BigNumberish,
    _id: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  "getLocalAddress(uint32,address)"(
    _domain: BigNumberish,
    _id: string,
    overrides?: CallOverrides
  ): Promise<string>;

  handle(
    _origin: BigNumberish,
    _sender: BytesLike,
    _message: BytesLike,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "initialize(address,address)"(
    _tokenBeacon: string,
    _xAppConnectionManager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  "initialize()"(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  liquidityProvider(
    arg0: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  migrate(
    _asset: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  owner(overrides?: CallOverrides): Promise<string>;

  preFill(
    _message: BytesLike,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  renounceOwnership(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  representationToCanonical(
    arg0: string,
    overrides?: CallOverrides
  ): Promise<[number, string] & { domain: number; id: string }>;

  send(
    _token: string,
    _amnt: BigNumberish,
    _destination: BigNumberish,
    _recipient: BytesLike,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setXAppConnectionManager(
    _xAppConnectionManager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  tokenBeacon(overrides?: CallOverrides): Promise<string>;

  transferOwnership(
    newOwner: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  updateDetails(
    _token: string,
    _destination: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  xAppConnectionManager(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    PRE_FILL_FEE_DENOMINATOR(overrides?: CallOverrides): Promise<BigNumber>;

    PRE_FILL_FEE_NUMERATOR(overrides?: CallOverrides): Promise<BigNumber>;

    canonicalToRepresentation(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    enrollCustom(
      _id: BytesLike,
      _custom: string,
      overrides?: CallOverrides
    ): Promise<void>;

    enrollRemoteRouter(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    getCanonicalAddress(
      _local: string,
      overrides?: CallOverrides
    ): Promise<[number, string] & { _domain: number; _id: string }>;

    "getLocalAddress(uint32,bytes32)"(
      _domain: BigNumberish,
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    "getLocalAddress(uint32,address)"(
      _domain: BigNumberish,
      _id: string,
      overrides?: CallOverrides
    ): Promise<string>;

    handle(
      _origin: BigNumberish,
      _sender: BytesLike,
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    "initialize(address,address)"(
      _tokenBeacon: string,
      _xAppConnectionManager: string,
      overrides?: CallOverrides
    ): Promise<void>;

    "initialize()"(overrides?: CallOverrides): Promise<void>;

    liquidityProvider(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    migrate(_asset: string, overrides?: CallOverrides): Promise<void>;

    owner(overrides?: CallOverrides): Promise<string>;

    preFill(_message: BytesLike, overrides?: CallOverrides): Promise<void>;

    renounceOwnership(overrides?: CallOverrides): Promise<void>;

    representationToCanonical(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<[number, string] & { domain: number; id: string }>;

    send(
      _token: string,
      _amnt: BigNumberish,
      _destination: BigNumberish,
      _recipient: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    setXAppConnectionManager(
      _xAppConnectionManager: string,
      overrides?: CallOverrides
    ): Promise<void>;

    tokenBeacon(overrides?: CallOverrides): Promise<string>;

    transferOwnership(
      newOwner: string,
      overrides?: CallOverrides
    ): Promise<void>;

    updateDetails(
      _token: string,
      _destination: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    xAppConnectionManager(overrides?: CallOverrides): Promise<string>;
  };

  filters: {
    OwnershipTransferred(
      previousOwner?: string | null,
      newOwner?: string | null
    ): TypedEventFilter<
      [string, string],
      { previousOwner: string; newOwner: string }
    >;

    TokenDeployed(
      domain?: BigNumberish | null,
      id?: BytesLike | null,
      representation?: string | null
    ): TypedEventFilter<
      [number, string, string],
      { domain: number; id: string; representation: string }
    >;
  };

  estimateGas: {
    PRE_FILL_FEE_DENOMINATOR(overrides?: CallOverrides): Promise<BigNumber>;

    PRE_FILL_FEE_NUMERATOR(overrides?: CallOverrides): Promise<BigNumber>;

    canonicalToRepresentation(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    enrollCustom(
      _id: BytesLike,
      _custom: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    enrollRemoteRouter(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    getCanonicalAddress(
      _local: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "getLocalAddress(uint32,bytes32)"(
      _domain: BigNumberish,
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    "getLocalAddress(uint32,address)"(
      _domain: BigNumberish,
      _id: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    handle(
      _origin: BigNumberish,
      _sender: BytesLike,
      _message: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "initialize(address,address)"(
      _tokenBeacon: string,
      _xAppConnectionManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    "initialize()"(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    liquidityProvider(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    migrate(
      _asset: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<BigNumber>;

    preFill(
      _message: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    renounceOwnership(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    representationToCanonical(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    send(
      _token: string,
      _amnt: BigNumberish,
      _destination: BigNumberish,
      _recipient: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setXAppConnectionManager(
      _xAppConnectionManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    tokenBeacon(overrides?: CallOverrides): Promise<BigNumber>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    updateDetails(
      _token: string,
      _destination: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    xAppConnectionManager(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    PRE_FILL_FEE_DENOMINATOR(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    PRE_FILL_FEE_NUMERATOR(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    canonicalToRepresentation(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    enrollCustom(
      _id: BytesLike,
      _custom: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    enrollRemoteRouter(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    getCanonicalAddress(
      _local: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "getLocalAddress(uint32,bytes32)"(
      _domain: BigNumberish,
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    "getLocalAddress(uint32,address)"(
      _domain: BigNumberish,
      _id: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    handle(
      _origin: BigNumberish,
      _sender: BytesLike,
      _message: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "initialize(address,address)"(
      _tokenBeacon: string,
      _xAppConnectionManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    "initialize()"(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    liquidityProvider(
      arg0: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    migrate(
      _asset: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    preFill(
      _message: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    renounceOwnership(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    representationToCanonical(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    send(
      _token: string,
      _amnt: BigNumberish,
      _destination: BigNumberish,
      _recipient: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setXAppConnectionManager(
      _xAppConnectionManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    tokenBeacon(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    updateDetails(
      _token: string,
      _destination: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    xAppConnectionManager(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
