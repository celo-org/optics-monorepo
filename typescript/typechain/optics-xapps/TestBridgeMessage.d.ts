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
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import { TypedEventFilter, TypedEvent, TypedListener } from "./commons";

interface TestBridgeMessageInterface extends ethers.utils.Interface {
  functions: {
    "testAction(bytes29)": FunctionFragment;
    "testActionType(bytes29)": FunctionFragment;
    "testAmnt(bytes29)": FunctionFragment;
    "testDecimals(bytes29)": FunctionFragment;
    "testDomain(bytes29)": FunctionFragment;
    "testEvmId(bytes29)": FunctionFragment;
    "testEvmRecipient(bytes29)": FunctionFragment;
    "testFormatDetails(bytes32,bytes32,uint8)": FunctionFragment;
    "testFormatMessage(bytes29,bytes29)": FunctionFragment;
    "testFormatRequestDetails()": FunctionFragment;
    "testFormatTokenId(uint32,bytes32)": FunctionFragment;
    "testFormatTransfer(bytes32,uint256)": FunctionFragment;
    "testId(bytes29)": FunctionFragment;
    "testIsDetails(bytes29)": FunctionFragment;
    "testIsRequestDetails(bytes29)": FunctionFragment;
    "testIsTransfer(bytes29)": FunctionFragment;
    "testIsValidAction(bytes29)": FunctionFragment;
    "testIsValidMessageLength(bytes29)": FunctionFragment;
    "testMessageType(bytes29)": FunctionFragment;
    "testMsgType(bytes29)": FunctionFragment;
    "testMustBeDetails(bytes29)": FunctionFragment;
    "testMustBeMessage(bytes29)": FunctionFragment;
    "testMustBeRequestDetails(bytes29)": FunctionFragment;
    "testMustBeTokenId(bytes29)": FunctionFragment;
    "testMustBeTransfer(bytes29)": FunctionFragment;
    "testName(bytes29)": FunctionFragment;
    "testRecipient(bytes29)": FunctionFragment;
    "testSymbol(bytes29)": FunctionFragment;
    "testTokenId(bytes29)": FunctionFragment;
    "testTryAsDetails(bytes29)": FunctionFragment;
    "testTryAsMessage(bytes29)": FunctionFragment;
    "testTryAsRequestDetails(bytes29)": FunctionFragment;
    "testTryAsTokenId(bytes29)": FunctionFragment;
    "testTryAsTransfer(bytes29)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "testAction",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testActionType",
    values: [BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "testAmnt", values: [BytesLike]): string;
  encodeFunctionData(
    functionFragment: "testDecimals",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testDomain",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testEvmId",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testEvmRecipient",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testFormatDetails",
    values: [BytesLike, BytesLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "testFormatMessage",
    values: [BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testFormatRequestDetails",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "testFormatTokenId",
    values: [BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testFormatTransfer",
    values: [BytesLike, BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "testId", values: [BytesLike]): string;
  encodeFunctionData(
    functionFragment: "testIsDetails",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testIsRequestDetails",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testIsTransfer",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testIsValidAction",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testIsValidMessageLength",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testMessageType",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testMsgType",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testMustBeDetails",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testMustBeMessage",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testMustBeRequestDetails",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testMustBeTokenId",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testMustBeTransfer",
    values: [BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "testName", values: [BytesLike]): string;
  encodeFunctionData(
    functionFragment: "testRecipient",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testSymbol",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testTokenId",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testTryAsDetails",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testTryAsMessage",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testTryAsRequestDetails",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testTryAsTokenId",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "testTryAsTransfer",
    values: [BytesLike]
  ): string;

  decodeFunctionResult(functionFragment: "testAction", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "testActionType",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "testAmnt", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "testDecimals",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "testDomain", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "testEvmId", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "testEvmRecipient",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testFormatDetails",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testFormatMessage",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testFormatRequestDetails",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testFormatTokenId",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testFormatTransfer",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "testId", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "testIsDetails",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testIsRequestDetails",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testIsTransfer",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testIsValidAction",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testIsValidMessageLength",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testMessageType",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testMsgType",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testMustBeDetails",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testMustBeMessage",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testMustBeRequestDetails",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testMustBeTokenId",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testMustBeTransfer",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "testName", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "testRecipient",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "testSymbol", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "testTokenId",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testTryAsDetails",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testTryAsMessage",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testTryAsRequestDetails",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testTryAsTokenId",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testTryAsTransfer",
    data: BytesLike
  ): Result;

  events: {};
}

export class TestBridgeMessage extends BaseContract {
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

  interface: TestBridgeMessageInterface;

  functions: {
    testAction(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testActionType(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<[number]>;

    testAmnt(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    testDecimals(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<[number]>;

    testDomain(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<[number]>;

    testEvmId(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testEvmRecipient(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testFormatDetails(
      _name: BytesLike,
      _symbol: BytesLike,
      _decimals: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testFormatMessage(
      _tokenId: BytesLike,
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testFormatRequestDetails(overrides?: CallOverrides): Promise<[string]>;

    testFormatTokenId(
      _domain: BigNumberish,
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testFormatTransfer(
      _to: BytesLike,
      _amnt: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testId(_tokenId: BytesLike, overrides?: CallOverrides): Promise<[string]>;

    testIsDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    testIsRequestDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    testIsTransfer(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    testIsValidAction(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    testIsValidMessageLength(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    testMessageType(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<[number]>;

    testMsgType(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<[number]>;

    testMustBeDetails(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testMustBeMessage(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testMustBeRequestDetails(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testMustBeTokenId(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testMustBeTransfer(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testName(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testRecipient(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testSymbol(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testTokenId(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testTryAsDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testTryAsMessage(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testTryAsRequestDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testTryAsTokenId(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;

    testTryAsTransfer(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<[string]>;
  };

  testAction(_message: BytesLike, overrides?: CallOverrides): Promise<string>;

  testActionType(
    _action: BytesLike,
    overrides?: CallOverrides
  ): Promise<number>;

  testAmnt(
    _transferAction: BytesLike,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  testDecimals(
    _detailsAction: BytesLike,
    overrides?: CallOverrides
  ): Promise<number>;

  testDomain(_tokenId: BytesLike, overrides?: CallOverrides): Promise<number>;

  testEvmId(_tokenId: BytesLike, overrides?: CallOverrides): Promise<string>;

  testEvmRecipient(
    _transferAction: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testFormatDetails(
    _name: BytesLike,
    _symbol: BytesLike,
    _decimals: BigNumberish,
    overrides?: CallOverrides
  ): Promise<string>;

  testFormatMessage(
    _tokenId: BytesLike,
    _action: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testFormatRequestDetails(overrides?: CallOverrides): Promise<string>;

  testFormatTokenId(
    _domain: BigNumberish,
    _id: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testFormatTransfer(
    _to: BytesLike,
    _amnt: BigNumberish,
    overrides?: CallOverrides
  ): Promise<string>;

  testId(_tokenId: BytesLike, overrides?: CallOverrides): Promise<string>;

  testIsDetails(
    _action: BytesLike,
    overrides?: CallOverrides
  ): Promise<boolean>;

  testIsRequestDetails(
    _action: BytesLike,
    overrides?: CallOverrides
  ): Promise<boolean>;

  testIsTransfer(
    _action: BytesLike,
    overrides?: CallOverrides
  ): Promise<boolean>;

  testIsValidAction(
    _action: BytesLike,
    overrides?: CallOverrides
  ): Promise<boolean>;

  testIsValidMessageLength(
    _view: BytesLike,
    overrides?: CallOverrides
  ): Promise<boolean>;

  testMessageType(_view: BytesLike, overrides?: CallOverrides): Promise<number>;

  testMsgType(_message: BytesLike, overrides?: CallOverrides): Promise<number>;

  testMustBeDetails(
    _view: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testMustBeMessage(
    _view: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testMustBeRequestDetails(
    _view: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testMustBeTokenId(
    _view: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testMustBeTransfer(
    _view: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testName(
    _detailsAction: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testRecipient(
    _transferAction: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testSymbol(
    _detailsAction: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testTokenId(_message: BytesLike, overrides?: CallOverrides): Promise<string>;

  testTryAsDetails(
    _action: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testTryAsMessage(
    _message: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testTryAsRequestDetails(
    _action: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testTryAsTokenId(
    _tokenId: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  testTryAsTransfer(
    _action: BytesLike,
    overrides?: CallOverrides
  ): Promise<string>;

  callStatic: {
    testAction(_message: BytesLike, overrides?: CallOverrides): Promise<string>;

    testActionType(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<number>;

    testAmnt(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testDecimals(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<number>;

    testDomain(_tokenId: BytesLike, overrides?: CallOverrides): Promise<number>;

    testEvmId(_tokenId: BytesLike, overrides?: CallOverrides): Promise<string>;

    testEvmRecipient(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testFormatDetails(
      _name: BytesLike,
      _symbol: BytesLike,
      _decimals: BigNumberish,
      overrides?: CallOverrides
    ): Promise<string>;

    testFormatMessage(
      _tokenId: BytesLike,
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testFormatRequestDetails(overrides?: CallOverrides): Promise<string>;

    testFormatTokenId(
      _domain: BigNumberish,
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testFormatTransfer(
      _to: BytesLike,
      _amnt: BigNumberish,
      overrides?: CallOverrides
    ): Promise<string>;

    testId(_tokenId: BytesLike, overrides?: CallOverrides): Promise<string>;

    testIsDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<boolean>;

    testIsRequestDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<boolean>;

    testIsTransfer(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<boolean>;

    testIsValidAction(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<boolean>;

    testIsValidMessageLength(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<boolean>;

    testMessageType(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<number>;

    testMsgType(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<number>;

    testMustBeDetails(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testMustBeMessage(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testMustBeRequestDetails(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testMustBeTokenId(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testMustBeTransfer(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testName(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testRecipient(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testSymbol(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testTokenId(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testTryAsDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testTryAsMessage(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testTryAsRequestDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testTryAsTokenId(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;

    testTryAsTransfer(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {};

  estimateGas: {
    testAction(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testActionType(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testAmnt(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testDecimals(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testDomain(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testEvmId(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testEvmRecipient(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testFormatDetails(
      _name: BytesLike,
      _symbol: BytesLike,
      _decimals: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testFormatMessage(
      _tokenId: BytesLike,
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testFormatRequestDetails(overrides?: CallOverrides): Promise<BigNumber>;

    testFormatTokenId(
      _domain: BigNumberish,
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testFormatTransfer(
      _to: BytesLike,
      _amnt: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testId(_tokenId: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;

    testIsDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testIsRequestDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testIsTransfer(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testIsValidAction(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testIsValidMessageLength(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testMessageType(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testMsgType(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testMustBeDetails(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testMustBeMessage(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testMustBeRequestDetails(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testMustBeTokenId(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testMustBeTransfer(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testName(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testRecipient(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testSymbol(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testTokenId(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testTryAsDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testTryAsMessage(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testTryAsRequestDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testTryAsTokenId(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    testTryAsTransfer(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    testAction(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testActionType(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testAmnt(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testDecimals(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testDomain(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testEvmId(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testEvmRecipient(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testFormatDetails(
      _name: BytesLike,
      _symbol: BytesLike,
      _decimals: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testFormatMessage(
      _tokenId: BytesLike,
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testFormatRequestDetails(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testFormatTokenId(
      _domain: BigNumberish,
      _id: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testFormatTransfer(
      _to: BytesLike,
      _amnt: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testId(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testIsDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testIsRequestDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testIsTransfer(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testIsValidAction(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testIsValidMessageLength(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testMessageType(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testMsgType(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testMustBeDetails(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testMustBeMessage(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testMustBeRequestDetails(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testMustBeTokenId(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testMustBeTransfer(
      _view: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testName(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testRecipient(
      _transferAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testSymbol(
      _detailsAction: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testTokenId(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testTryAsDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testTryAsMessage(
      _message: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testTryAsRequestDetails(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testTryAsTokenId(
      _tokenId: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    testTryAsTransfer(
      _action: BytesLike,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
