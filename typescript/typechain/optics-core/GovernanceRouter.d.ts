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

interface GovernanceRouterInterface extends ethers.utils.Interface {
  functions: {
    "callLocal(tuple[])": FunctionFragment;
    "callRemote(uint32,tuple[])": FunctionFragment;
    "domains(uint256)": FunctionFragment;
    "exitRecovery()": FunctionFragment;
    "governor()": FunctionFragment;
    "governorDomain()": FunctionFragment;
    "handle(uint32,bytes32,bytes)": FunctionFragment;
    "inRecovery()": FunctionFragment;
    "initialize(address,address)": FunctionFragment;
    "initiateRecoveryTimelock()": FunctionFragment;
    "localDomain()": FunctionFragment;
    "recoveryActiveAt()": FunctionFragment;
    "recoveryManager()": FunctionFragment;
    "recoveryTimelock()": FunctionFragment;
    "routers(uint32)": FunctionFragment;
    "setRouter(uint32,bytes32)": FunctionFragment;
    "setRouterLocal(uint32,bytes32)": FunctionFragment;
    "setXAppConnectionManager(address)": FunctionFragment;
    "transferGovernor(uint32,address)": FunctionFragment;
    "transferRecoveryManager(address)": FunctionFragment;
    "xAppConnectionManager()": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "callLocal",
    values: [{ to: BytesLike; data: BytesLike }[]]
  ): string;
  encodeFunctionData(
    functionFragment: "callRemote",
    values: [BigNumberish, { to: BytesLike; data: BytesLike }[]]
  ): string;
  encodeFunctionData(
    functionFragment: "domains",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "exitRecovery",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "governor", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "governorDomain",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "handle",
    values: [BigNumberish, BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "inRecovery",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "initialize",
    values: [string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "initiateRecoveryTimelock",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "localDomain",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "recoveryActiveAt",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "recoveryManager",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "recoveryTimelock",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "routers",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "setRouter",
    values: [BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "setRouterLocal",
    values: [BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "setXAppConnectionManager",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "transferGovernor",
    values: [BigNumberish, string]
  ): string;
  encodeFunctionData(
    functionFragment: "transferRecoveryManager",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "xAppConnectionManager",
    values?: undefined
  ): string;

  decodeFunctionResult(functionFragment: "callLocal", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "callRemote", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "domains", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "exitRecovery",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "governor", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "governorDomain",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "handle", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "inRecovery", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "initialize", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "initiateRecoveryTimelock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "localDomain",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "recoveryActiveAt",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "recoveryManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "recoveryTimelock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "routers", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setRouter", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setRouterLocal",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setXAppConnectionManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferGovernor",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferRecoveryManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "xAppConnectionManager",
    data: BytesLike
  ): Result;

  events: {
    "ExitRecovery(address)": EventFragment;
    "InitiateRecovery(address,uint256)": EventFragment;
    "SetRouter(uint32,bytes32,bytes32)": EventFragment;
    "TransferGovernor(uint32,uint32,address,address)": EventFragment;
    "TransferRecoveryManager(address,address)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "ExitRecovery"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "InitiateRecovery"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SetRouter"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "TransferGovernor"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "TransferRecoveryManager"): EventFragment;
}

export class GovernanceRouter extends BaseContract {
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

  interface: GovernanceRouterInterface;

  functions: {
    callLocal(
      _calls: { to: BytesLike; data: BytesLike }[],
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    callRemote(
      _destination: BigNumberish,
      _calls: { to: BytesLike; data: BytesLike }[],
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    domains(arg0: BigNumberish, overrides?: CallOverrides): Promise<[number]>;

    exitRecovery(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    governor(overrides?: CallOverrides): Promise<[string]>;

    governorDomain(overrides?: CallOverrides): Promise<[number]>;

    handle(
      _origin: BigNumberish,
      _sender: BytesLike,
      _message: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    inRecovery(overrides?: CallOverrides): Promise<[boolean]>;

    initialize(
      _xAppConnectionManager: string,
      _recoveryManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    initiateRecoveryTimelock(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    localDomain(overrides?: CallOverrides): Promise<[number]>;

    recoveryActiveAt(overrides?: CallOverrides): Promise<[BigNumber]>;

    recoveryManager(overrides?: CallOverrides): Promise<[string]>;

    recoveryTimelock(overrides?: CallOverrides): Promise<[BigNumber]>;

    routers(arg0: BigNumberish, overrides?: CallOverrides): Promise<[string]>;

    setRouter(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setRouterLocal(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setXAppConnectionManager(
      _xAppConnectionManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    transferGovernor(
      _newDomain: BigNumberish,
      _newGovernor: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    transferRecoveryManager(
      _newRecoveryManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    xAppConnectionManager(overrides?: CallOverrides): Promise<[string]>;
  };

  callLocal(
    _calls: { to: BytesLike; data: BytesLike }[],
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callRemote(
    _destination: BigNumberish,
    _calls: { to: BytesLike; data: BytesLike }[],
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  domains(arg0: BigNumberish, overrides?: CallOverrides): Promise<number>;

  exitRecovery(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  governor(overrides?: CallOverrides): Promise<string>;

  governorDomain(overrides?: CallOverrides): Promise<number>;

  handle(
    _origin: BigNumberish,
    _sender: BytesLike,
    _message: BytesLike,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  inRecovery(overrides?: CallOverrides): Promise<boolean>;

  initialize(
    _xAppConnectionManager: string,
    _recoveryManager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  initiateRecoveryTimelock(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  localDomain(overrides?: CallOverrides): Promise<number>;

  recoveryActiveAt(overrides?: CallOverrides): Promise<BigNumber>;

  recoveryManager(overrides?: CallOverrides): Promise<string>;

  recoveryTimelock(overrides?: CallOverrides): Promise<BigNumber>;

  routers(arg0: BigNumberish, overrides?: CallOverrides): Promise<string>;

  setRouter(
    _domain: BigNumberish,
    _router: BytesLike,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setRouterLocal(
    _domain: BigNumberish,
    _router: BytesLike,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setXAppConnectionManager(
    _xAppConnectionManager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  transferGovernor(
    _newDomain: BigNumberish,
    _newGovernor: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  transferRecoveryManager(
    _newRecoveryManager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  xAppConnectionManager(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    callLocal(
      _calls: { to: BytesLike; data: BytesLike }[],
      overrides?: CallOverrides
    ): Promise<void>;

    callRemote(
      _destination: BigNumberish,
      _calls: { to: BytesLike; data: BytesLike }[],
      overrides?: CallOverrides
    ): Promise<void>;

    domains(arg0: BigNumberish, overrides?: CallOverrides): Promise<number>;

    exitRecovery(overrides?: CallOverrides): Promise<void>;

    governor(overrides?: CallOverrides): Promise<string>;

    governorDomain(overrides?: CallOverrides): Promise<number>;

    handle(
      _origin: BigNumberish,
      _sender: BytesLike,
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    inRecovery(overrides?: CallOverrides): Promise<boolean>;

    initialize(
      _xAppConnectionManager: string,
      _recoveryManager: string,
      overrides?: CallOverrides
    ): Promise<void>;

    initiateRecoveryTimelock(overrides?: CallOverrides): Promise<void>;

    localDomain(overrides?: CallOverrides): Promise<number>;

    recoveryActiveAt(overrides?: CallOverrides): Promise<BigNumber>;

    recoveryManager(overrides?: CallOverrides): Promise<string>;

    recoveryTimelock(overrides?: CallOverrides): Promise<BigNumber>;

    routers(arg0: BigNumberish, overrides?: CallOverrides): Promise<string>;

    setRouter(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    setRouterLocal(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    setXAppConnectionManager(
      _xAppConnectionManager: string,
      overrides?: CallOverrides
    ): Promise<void>;

    transferGovernor(
      _newDomain: BigNumberish,
      _newGovernor: string,
      overrides?: CallOverrides
    ): Promise<void>;

    transferRecoveryManager(
      _newRecoveryManager: string,
      overrides?: CallOverrides
    ): Promise<void>;

    xAppConnectionManager(overrides?: CallOverrides): Promise<string>;
  };

  filters: {
    ExitRecovery(
      recoveryManager?: null
    ): TypedEventFilter<[string], { recoveryManager: string }>;

    InitiateRecovery(
      recoveryManager?: string | null,
      endBlock?: null
    ): TypedEventFilter<
      [string, BigNumber],
      { recoveryManager: string; endBlock: BigNumber }
    >;

    SetRouter(
      domain?: BigNumberish | null,
      previousRouter?: null,
      newRouter?: null
    ): TypedEventFilter<
      [number, string, string],
      { domain: number; previousRouter: string; newRouter: string }
    >;

    TransferGovernor(
      previousGovernorDomain?: null,
      newGovernorDomain?: null,
      previousGovernor?: string | null,
      newGovernor?: string | null
    ): TypedEventFilter<
      [number, number, string, string],
      {
        previousGovernorDomain: number;
        newGovernorDomain: number;
        previousGovernor: string;
        newGovernor: string;
      }
    >;

    TransferRecoveryManager(
      previousRecoveryManager?: string | null,
      newRecoveryManager?: string | null
    ): TypedEventFilter<
      [string, string],
      { previousRecoveryManager: string; newRecoveryManager: string }
    >;
  };

  estimateGas: {
    callLocal(
      _calls: { to: BytesLike; data: BytesLike }[],
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    callRemote(
      _destination: BigNumberish,
      _calls: { to: BytesLike; data: BytesLike }[],
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    domains(arg0: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;

    exitRecovery(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    governor(overrides?: CallOverrides): Promise<BigNumber>;

    governorDomain(overrides?: CallOverrides): Promise<BigNumber>;

    handle(
      _origin: BigNumberish,
      _sender: BytesLike,
      _message: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    inRecovery(overrides?: CallOverrides): Promise<BigNumber>;

    initialize(
      _xAppConnectionManager: string,
      _recoveryManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    initiateRecoveryTimelock(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    localDomain(overrides?: CallOverrides): Promise<BigNumber>;

    recoveryActiveAt(overrides?: CallOverrides): Promise<BigNumber>;

    recoveryManager(overrides?: CallOverrides): Promise<BigNumber>;

    recoveryTimelock(overrides?: CallOverrides): Promise<BigNumber>;

    routers(arg0: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;

    setRouter(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setRouterLocal(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setXAppConnectionManager(
      _xAppConnectionManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    transferGovernor(
      _newDomain: BigNumberish,
      _newGovernor: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    transferRecoveryManager(
      _newRecoveryManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    xAppConnectionManager(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    callLocal(
      _calls: { to: BytesLike; data: BytesLike }[],
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    callRemote(
      _destination: BigNumberish,
      _calls: { to: BytesLike; data: BytesLike }[],
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    domains(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    exitRecovery(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    governor(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    governorDomain(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    handle(
      _origin: BigNumberish,
      _sender: BytesLike,
      _message: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    inRecovery(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    initialize(
      _xAppConnectionManager: string,
      _recoveryManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    initiateRecoveryTimelock(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    localDomain(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    recoveryActiveAt(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    recoveryManager(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    recoveryTimelock(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    routers(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    setRouter(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setRouterLocal(
      _domain: BigNumberish,
      _router: BytesLike,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setXAppConnectionManager(
      _xAppConnectionManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    transferGovernor(
      _newDomain: BigNumberish,
      _newGovernor: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    transferRecoveryManager(
      _newRecoveryManager: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    xAppConnectionManager(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
