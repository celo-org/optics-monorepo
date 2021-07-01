/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  Signer,
  utils,
  BigNumberish,
  Contract,
  ContractFactory,
  Overrides,
} from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { TestReplica, TestReplicaInterface } from "../TestReplica";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_localDomain",
        type: "uint32",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "oldRoot",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes32[2]",
        name: "newRoot",
        type: "bytes32[2]",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "signature2",
        type: "bytes",
      },
    ],
    name: "DoubleUpdate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes",
        name: "error",
        type: "bytes",
      },
    ],
    name: "ProcessError",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint32",
        name: "homeDomain",
        type: "uint32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "oldRoot",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "newRoot",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
    ],
    name: "Update",
    type: "event",
  },
  {
    inputs: [],
    name: "PROCESS_GAS",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "RESERVE_GAS",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_root",
        type: "bytes32",
      },
    ],
    name: "acceptableRoot",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "canConfirm",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "confirm",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "confirmAt",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "current",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_oldRoot",
        type: "bytes32",
      },
      {
        internalType: "bytes32[2]",
        name: "_newRoot",
        type: "bytes32[2]",
      },
      {
        internalType: "bytes",
        name: "_signature",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "_signature2",
        type: "bytes",
      },
    ],
    name: "doubleUpdate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "homeDomainHash",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_remoteDomain",
        type: "uint32",
      },
      {
        internalType: "address",
        name: "_updater",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "_current",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "_optimisticSeconds",
        type: "uint256",
      },
      {
        internalType: "uint32",
        name: "_nextToProcess",
        type: "uint32",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "localDomain",
    outputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "messages",
    outputs: [
      {
        internalType: "enum Replica.MessageStatus",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextPending",
    outputs: [
      {
        internalType: "bytes32",
        name: "_pending",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "_confirmAt",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextToProcess",
    outputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "optimisticSeconds",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_message",
        type: "bytes",
      },
    ],
    name: "process",
    outputs: [
      {
        internalType: "bool",
        name: "_success",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_leaf",
        type: "bytes32",
      },
      {
        internalType: "bytes32[32]",
        name: "_proof",
        type: "bytes32[32]",
      },
      {
        internalType: "uint256",
        name: "_index",
        type: "uint256",
      },
    ],
    name: "prove",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_message",
        type: "bytes",
      },
      {
        internalType: "bytes32[32]",
        name: "_proof",
        type: "bytes32[32]",
      },
      {
        internalType: "uint256",
        name: "_index",
        type: "uint256",
      },
    ],
    name: "proveAndProcess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_item",
        type: "bytes32",
      },
    ],
    name: "queueContains",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "queueEnd",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "queueLength",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "remoteDomain",
    outputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_newRoot",
        type: "bytes32",
      },
    ],
    name: "setCurrentRoot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "setFailed",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_message",
        type: "bytes",
      },
    ],
    name: "setMessagePending",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_remoteDomain",
        type: "uint32",
      },
    ],
    name: "setRemoteDomain",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_updater",
        type: "address",
      },
    ],
    name: "setUpdater",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "state",
    outputs: [
      {
        internalType: "enum Common.States",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "leaf",
        type: "bytes32",
      },
      {
        internalType: "bytes32[32]",
        name: "proof",
        type: "bytes32[32]",
      },
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "testBranchRoot",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "testHomeDomainHash",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_message",
        type: "bytes",
      },
    ],
    name: "testProcess",
    outputs: [
      {
        internalType: "bool",
        name: "_success",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "timestamp",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_oldRoot",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "_newRoot",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "_signature",
        type: "bytes",
      },
    ],
    name: "update",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "updater",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x60a060405234801561001057600080fd5b506040516134d63803806134d68339818101604052602081101561003357600080fd5b505160e081901b6001600160e01b03191660805263ffffffff1661346d61006960003980610ffb5280611062525061346d6000f3fe608060405234801561001057600080fd5b50600436106102265760003560e01c8063928bc4b21161012a578063b31c01fb116100bd578063bf30a55d1161008c578063d88beda211610071578063d88beda2146108cd578063df034cd0146108d5578063f6d161021461090657610226565b8063bf30a55d14610870578063c19d93fb146108c557610226565b8063b31c01fb146106ef578063b61c19e8146107a1578063b80777ea14610847578063ba739a621461084f57610226565b80639d54f419116100f95780639d54f4191461068f5780639fa6a6e3146106c2578063a3f81d68146106ca578063ab91c7b0146106e757610226565b8063928bc4b214610511578063961681dc146105b757806396ae1a89146105bf5780639868a2731461066557610226565b806339992668116101bd57806351d7bcd71161018c5780637022b58e116101715780637022b58e146104e457806371bfb7b8146104ec5780638d3638f41461050957610226565b806351d7bcd7146104135780636188af0e1461043657610226565b806339992668146103da57806345630b1a146103e2578063456d0672146103ea5780635146366e1461040b57610226565b806325e3beda116101f957806325e3beda1461033b5780632bbd59ca146103555780632bef289214610393578063371d3071146103b057610226565b8063016bcc351461022b578063146901db1461024a57806314cfabb31461025257806319d9d21a1461026e575b600080fd5b6102486004803603602081101561024157600080fd5b503561090e565b005b610248610925565b61025a61092f565b604080519115158252519081900360200190f35b610248600480360360a081101561028457600080fd5b81359160208101918101906080810160608201356401000000008111156102aa57600080fd5b8201836020820111156102bc57600080fd5b803590602001918460018302840111640100000000831117156102de57600080fd5b9193909290916020810190356401000000008111156102fc57600080fd5b82018360208201111561030e57600080fd5b8035906020019184600183028401116401000000008311171561033057600080fd5b50909250905061095b565b610343610bba565b60408051918252519081900360200190f35b6103726004803603602081101561036b57600080fd5b5035610bc0565b6040518082600281111561038257fe5b815260200191505060405180910390f35b61025a600480360360208110156103a957600080fd5b5035610bd5565b61025a60048036036104408110156103c757600080fd5b5080359060208101906104200135610bea565b610343610d0a565b610343610d10565b6103f2610d25565b6040805163ffffffff9092168252519081900360200190f35b610343610d31565b6102486004803603602081101561042957600080fd5b503563ffffffff16610d3b565b610248600480360361044081101561044d57600080fd5b81019060208101813564010000000081111561046857600080fd5b82018360208201111561047a57600080fd5b8035906020019184600183028401116401000000008311171561049c57600080fd5b91908080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525092955092935050506104008201359050610d72565b610248610dfe565b6103436004803603602081101561050257600080fd5b5035610fe7565b6103f2610ff9565b61025a6004803603602081101561052757600080fd5b81019060208101813564010000000081111561054257600080fd5b82018360208201111561055457600080fd5b8035906020019184600183028401116401000000008311171561057657600080fd5b91908080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525092955061101d945050505050565b6103f26116a5565b61025a600480360360208110156105d557600080fd5b8101906020810181356401000000008111156105f057600080fd5b82018360208201111561060257600080fd5b8035906020019184600183028401116401000000008311171561062457600080fd5b91908080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920191909152509295506116b1945050505050565b610343600480360361044081101561067c57600080fd5b50803590602081019061042001356116bc565b610248600480360360208110156106a557600080fd5b503573ffffffffffffffffffffffffffffffffffffffff166116fa565b610343611747565b61025a600480360360208110156106e057600080fd5b503561174d565b610343611774565b6102486004803603606081101561070557600080fd5b81359160208101359181019060608101604082013564010000000081111561072c57600080fd5b82018360208201111561073e57600080fd5b8035906020019184600183028401116401000000008311171561076057600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550611780945050505050565b610248600480360360208110156107b757600080fd5b8101906020810181356401000000008111156107d257600080fd5b8201836020820111156107e457600080fd5b8035906020019184600183028401116401000000008311171561080657600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550611a66945050505050565b610343611af0565b610857611af4565b6040805192835260208301919091528051918290030190f35b610248600480360360a081101561088657600080fd5b5063ffffffff813581169173ffffffffffffffffffffffffffffffffffffffff6020820135169160408201359160608101359160809091013516611b42565b610372611ce6565b610343611d09565b6108dd611d10565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b610343611d32565b600181815560009182526007602052604090912055565b61092d611d3e565b565b600061093b6002611d81565b1580159061095657506109566109516002611db9565b61174d565b905090565b6002600054760100000000000000000000000000000000000000000000900460ff16600281111561098857fe5b14156109f557604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b604080516020601f8601819004810282018101909252848152610a379188918835918890889081908401838280828437600092019190915250611e5a92505050565b8015610a865750610a8686866001602002013584848080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250611e5a92505050565b8015610a9757508435602086013514155b15610bb257610aa4610925565b7f2c3f60bab4170347826231b75a920b5053941ddebc6eed6fd2c25721648b186f8686868686866040518087815260200186600260200280828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910182810360409081018252810186905290506020810160608201878780828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910184810383528581526020019050858580828437600083820152604051601f9091017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169092018290039a509098505050505050505050a15b505050505050565b61271081565b60086020526000908152604090205460ff1681565b6000610be2600283611ef2565b90505b919050565b60008060008581526008602052604090205460ff166002811115610c0a57fe5b14610c7657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f214d6573736167655374617475732e4e6f6e6500000000000000000000000000604482015290519081900360640190fd5b6000610cac858560208060200260405190810160405280929190826020800280828437600092019190915250879150611f6e9050565b9050610cb78161174d565b15610cfd575050600083815260086020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001908117909155610d03565b60009150505b9392505050565b60055481565b6004546000906109569063ffffffff16612019565b60065463ffffffff1681565b6000610956610d10565b600480547fffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000001663ffffffff92909216919091179055565b610d8483805190602001208383610bea565b610def57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600660248201527f2170726f76650000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b610df88361101d565b50505050565b6002600054760100000000000000000000000000000000000000000000900460ff166002811115610e2b57fe5b1415610e9857604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b610ea26002611d81565b610f0d57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600860248201527f2170656e64696e67000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b600080610f1a6002611d81565b90505b600081118015610f355750610f356109516002611db9565b15610f6d57610f44600261208e565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01610f1d565b81610fd957604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600560248201527f2174696d65000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b610fe161092d565b50600155565b60076020526000908152604090205481565b7f000000000000000000000000000000000000000000000000000000000000000081565b60008061102a83826121c7565b905060006110597fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000083166121eb565b905063ffffffff7f0000000000000000000000000000000000000000000000000000000000000000166110ad7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000841661221c565b63ffffffff161461111f57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f2164657374696e6174696f6e0000000000000000000000000000000000000000604482015290519081900360640190fd5b60065463ffffffff82811691161461119857604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600960248201527f2173657175656e63650000000000000000000000000000000000000000000000604482015290519081900360640190fd5b6001845160208087019190912060009081526008909152604090205460ff1660028111156111c257fe5b1461122e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600860248201527f2170656e64696e67000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b60026008600061125f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000861661224d565b8152602081019190915260400160002080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660018360028111156112a157fe5b02179055506207c8305a101561131a57604080517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048083019190915260248201527f2167617300000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b60006113477fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000841661228c565b9050606073ffffffffffffffffffffffffffffffffffffffff82166207a1206113917fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000871661229f565b6113bc7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000088166122cf565b6114116113ea7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008a16612300565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016612371565b604051602401808463ffffffff16815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b8381101561146357818101518382015260200161144b565b50505050905090810190601f1680156114905780820380516001836020036101000a031916815260200191505b50604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529181526020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167f56d5d47500000000000000000000000000000000000000000000000000000000178152905182519297509550859450925090508083835b6020831061155857805182527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0909201916020918201910161151b565b6001836020036101000a03801982511681845116808217855250505050505090500191505060006040518083038160008787f1925050503d80600081146115bb576040519150601f19603f3d011682016040523d82523d6000602084013e6115c0565b606091505b50909550905084611665577f3c688a5f4cd6e38b537641d2b38bdf1f52e7da4d083c5c3b16a0847c1c7c642d816040518080602001828103825283818151815260200191508051906020019080838360005b8381101561162a578181015183820152602001611612565b50505050905090810190601f1680156116575780820380516001836020036101000a031916815260200191505b509250505060405180910390a15b5050600680547fffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000001660019290920163ffffffff1691909117905550919050565b60045463ffffffff1681565b6000610be28261101d565b60006116f2848460208060200260405190810160405280929190826020800280828437600092019190915250869150611f6e9050565b949350505050565b6000805473ffffffffffffffffffffffffffffffffffffffff90921662010000027fffffffffffffffffffff0000000000000000000000000000000000000000ffff909216919091179055565b60015481565b6000818152600760205260408120548061176b576000915050610be5565b42101592915050565b60006109566002611d81565b6002600054760100000000000000000000000000000000000000000000900460ff1660028111156117ad57fe5b141561181a57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b60006118266002611d81565b11156118a85761183660026123b5565b83146118a357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601060248201527f6e6f7420656e64206f6620717565756500000000000000000000000000000000604482015290519081900360640190fd5b611918565b826001541461191857604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601260248201527f6e6f742063757272656e74207570646174650000000000000000000000000000604482015290519081900360640190fd5b611923838383611e5a565b61198e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600760248201527f6261642073696700000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b61199661092d565b60055460008381526007602052604090204290910190556119b86002836123f2565b5060045460408051602080825284518183015284518694889463ffffffff909116937f608828ad904a0c9250c09004ba7226efb08f35a5c815bb3f76b5a8a271cd08b2938893919283929083019185019080838360005b83811015611a27578181015183820152602001611a0f565b50505050905090810190601f168015611a545780820380516001836020036101000a031916815260200191505b509250505060405180910390a4505050565b6000611a7282826121c7565b9050600160086000611aa57fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000851661224d565b8152602081019190915260400160002080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001836002811115611ae757fe5b02179055505050565b4290565b600080611b016002611d81565b15611b2957611b106002611db9565b6000818152600760205260409020549092509050611b3e565b50506001546000818152600760205260409020545b9091565b600054610100900460ff1680611b5b5750611b5b61245f565b80611b69575060005460ff16155b611bbe576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180613326602e913960400191505060405180910390fd5b600054610100900460ff16158015611c2457600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b600480547fffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000001663ffffffff8816179055611c5e6002612470565b60018481556000858152600760205260409020556005839055600680547fffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000001663ffffffff8416179055611cb0856124b5565b8015610bb257600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff169055505050505050565b600054760100000000000000000000000000000000000000000000900460ff1681565b6207a12081565b60005462010000900473ffffffffffffffffffffffffffffffffffffffff1681565b600061095660026123b5565b600080547fffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffffffff16760200000000000000000000000000000000000000000000179055565b80546000906fffffffffffffffffffffffffffffffff7001000000000000000000000000000000008204811691166116f2828261264a565b6000611dc482612664565b15611e3057604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600560248201527f456d707479000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b5080546fffffffffffffffffffffffffffffffff1660009081526001909101602052604090205490565b600080611e65610d10565b8585604051602001808481526020018381526020018281526020019350505050604051602081830303815290604052805190602001209050611ea681612693565b60005490915062010000900473ffffffffffffffffffffffffffffffffffffffff16611ed282856126e4565b73ffffffffffffffffffffffffffffffffffffffff161495945050505050565b81546000906fffffffffffffffffffffffffffffffff165b835470010000000000000000000000000000000090046fffffffffffffffffffffffffffffffff168111611f62576000818152600185016020526040902054831415611f5a576001915050611f68565b600101611f0a565b50600090505b92915050565b8260005b602081101561201157600183821c166000858360208110611f8f57fe5b602002015190508160011415611fd55780846040516020018083815260200182815260200192505050604051602081830303815290604052805190602001209350612007565b838160405160200180838152602001828152602001925050506040516020818303038152906040528051906020012093505b5050600101611f72565b509392505050565b6040805160e09290921b7fffffffff00000000000000000000000000000000000000000000000000000000166020808401919091527f4f5054494353000000000000000000000000000000000000000000000000000060248401528151808403600a018152602a909301909152815191012090565b80546000906fffffffffffffffffffffffffffffffff7001000000000000000000000000000000008204811691166120c6828261264a565b61213157604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600560248201527f456d707479000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b6fffffffffffffffffffffffffffffffff8116600090815260018501602052604090205492508215612182576fffffffffffffffffffffffffffffffff811660009081526001850160205260408120555b83547fffffffffffffffffffffffffffffffff00000000000000000000000000000000166001919091016fffffffffffffffffffffffffffffffff1617909255919050565b8151600090602084016121e264ffffffffff8516828461277e565b95945050505050565b6000610be27fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316602460046127d4565b6000610be27fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316602860046127d4565b600080612259836127f5565b6bffffffffffffffffffffffff169050600061227484612809565b6bffffffffffffffffffffffff169091209392505050565b6000610be261229a8361281d565b61284e565b6000610be27fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000083168260046127d4565b6000610be27fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000831660046020612851565b6000610be2604c806123337fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008616612809565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000861692916bffffffffffffffffffffffff919091160360006129fc565b606060008061237f84612809565b6bffffffffffffffffffffffff16905060405191508192506123a48483602001612a82565b508181016020016040529052919050565b805470010000000000000000000000000000000090046fffffffffffffffffffffffffffffffff1660009081526001909101602052604090205490565b81546fffffffffffffffffffffffffffffffff8082167001000000000000000000000000000000009283900482166001019182169092029190911783558115611f68576fffffffffffffffffffffffffffffffff8116600090815260019390930160205260409092205590565b600061246a30612bae565b15905090565b80546fffffffffffffffffffffffffffffffff166124b25780547fffffffffffffffffffffffffffffffff000000000000000000000000000000001660011781555b50565b600054610100900460ff16806124ce57506124ce61245f565b806124dc575060005460ff16155b612531576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180613326602e913960400191505060405180910390fd5b600054610100900460ff1615801561259757600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b600080547fffffffffffffffffffff0000000000000000000000000000000000000000ffff166201000073ffffffffffffffffffffffffffffffffffffffff851602177fffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffffffff16760100000000000000000000000000000000000000000000179055801561264657600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff1690555b5050565b60019103016fffffffffffffffffffffffffffffffff1690565b546fffffffffffffffffffffffffffffffff808216700100000000000000000000000000000000909204161090565b604080517f19457468657265756d205369676e6564204d6573736167653a0a333200000000602080830191909152603c8083019490945282518083039094018452605c909101909152815191012090565b6000815160411461275657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e67746800604482015290519081900360640190fd5b60208201516040830151606084015160001a61277486828585612bb4565b9695505050505050565b60008061278b8484612da2565b905060405181111561279b575060005b806127c9577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000915050610d03565b6121e2858585612e14565b60008160200360080260ff166127eb858585612851565b901c949350505050565b60781c6bffffffffffffffffffffffff1690565b60181c6bffffffffffffffffffffffff1690565b6000610be27fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316602c6020612851565b90565b600060ff821661286357506000610d03565b61286c84612809565b6bffffffffffffffffffffffff166128878460ff8516612da2565b1115612966576128c8612899856127f5565b6bffffffffffffffffffffffff166128b086612809565b6bffffffffffffffffffffffff16858560ff16612e27565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b8381101561292b578181015183820152602001612913565b50505050905090810190601f1680156129585780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b60208260ff1611156129c3576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603a815260200180613376603a913960400191505060405180910390fd5b6008820260006129d2866127f5565b6bffffffffffffffffffffffff16905060006129ed83612f82565b91909501511695945050505050565b600080612a08866127f5565b6bffffffffffffffffffffffff169050612a2186612fcb565b612a3585612a2f8489612da2565b90612da2565b1115612a64577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000009150506116f2565b612a6e8186612da2565b90506127748364ffffffffff16828661277e565b6000612a8d83612ff5565b612ae2576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260288152602001806133b06028913960400191505060405180910390fd5b612aeb83613007565b612b40576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602b8152602001806133d8602b913960400191505060405180910390fd5b6000612b4b84612809565b6bffffffffffffffffffffffff1690506000612b66856127f5565b6bffffffffffffffffffffffff1690506000604051905084811115612b8b5760206060fd5b8285848460045afa50612774612ba087613044565b64ffffffffff168685612e14565b3b151590565b60007f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0821115612c2f576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806132e36022913960400191505060405180910390fd5b8360ff16601b1480612c4457508360ff16601c145b612c99576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806133546022913960400191505060405180910390fd5b600060018686868660405160008152602001604052604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa158015612cf5573d6000803e3d6000fd5b50506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0015191505073ffffffffffffffffffffffffffffffffffffffff81166121e257604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f45434453413a20696e76616c6964207369676e61747572650000000000000000604482015290519081900360640190fd5b81810182811015611f6857604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f4f766572666c6f7720647572696e67206164646974696f6e2e00000000000000604482015290519081900360640190fd5b606092831b9190911790911b1760181b90565b60606000612e348661304a565b9150506000612e428661304a565b9150506000612e508661304a565b9150506000612e5e8661304a565b915050838383836040516020018080613403603591397fffffffffffff000000000000000000000000000000000000000000000000000060d087811b821660358401527f2077697468206c656e6774682030780000000000000000000000000000000000603b84015286901b16604a820152605001602161330582397fffffffffffff000000000000000000000000000000000000000000000000000060d094851b811660218301527f2077697468206c656e677468203078000000000000000000000000000000000060278301529290931b9091166036830152507f2e00000000000000000000000000000000000000000000000000000000000000603c82015260408051601d818403018152603d90920190529b9a5050505050505050505050565b7f80000000000000000000000000000000000000000000000000000000000000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9091011d90565b6000612fd682612809565b612fdf836127f5565b016bffffffffffffffffffffffff169050919050565b60006130008261311e565b1592915050565b600061301282613044565b64ffffffffff1664ffffffffff141561302d57506000610be5565b600061303883612fcb565b60405110199392505050565b60d81c90565b600080601f5b600f8160ff1611156130b25760ff600882021684901c61306f81613146565b61ffff16841793508160ff1660101461308a57601084901b93505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01613050565b50600f5b60ff8160ff1610156131185760ff600882021684901c6130d581613146565b61ffff16831792508160ff166000146130f057601083901b92505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff016130b6565b50915091565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000009081161490565b600061315860048360ff16901c613176565b60ff161760081b62ffff001661316d82613176565b60ff1617919050565b600060f08083179060ff82161415613192576030915050610be5565b8060ff1660f114156131a8576031915050610be5565b8060ff1660f214156131be576032915050610be5565b8060ff1660f314156131d4576033915050610be5565b8060ff1660f414156131ea576034915050610be5565b8060ff1660f51415613200576035915050610be5565b8060ff1660f61415613216576036915050610be5565b8060ff1660f7141561322c576037915050610be5565b8060ff1660f81415613242576038915050610be5565b8060ff1660f91415613258576039915050610be5565b8060ff1660fa141561326e576061915050610be5565b8060ff1660fb1415613284576062915050610be5565b8060ff1660fc141561329a576063915050610be5565b8060ff1660fd14156132b0576064915050610be5565b8060ff1660fe14156132c6576065915050610be5565b8060ff1660ff14156132dc576066915050610be5565b5091905056fe45434453413a20696e76616c6964207369676e6174757265202773272076616c75652e20417474656d7074656420746f20696e646578206174206f6666736574203078496e697469616c697a61626c653a20636f6e747261637420697320616c726561647920696e697469616c697a656445434453413a20696e76616c6964207369676e6174757265202776272076616c756554797065644d656d566965772f696e646578202d20417474656d7074656420746f20696e646578206d6f7265207468616e20333220627974657354797065644d656d566965772f636f7079546f202d204e756c6c20706f696e74657220646572656654797065644d656d566965772f636f7079546f202d20496e76616c696420706f696e74657220646572656654797065644d656d566965772f696e646578202d204f76657272616e2074686520766965772e20536c696365206973206174203078a2646970667358221220b1efdd7d5de87146d4f8de73367454bfb899d93d46e72821dbe0f528302d7d8264736f6c63430007060033";

export class TestReplica__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _localDomain: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<TestReplica> {
    return super.deploy(_localDomain, overrides || {}) as Promise<TestReplica>;
  }
  getDeployTransaction(
    _localDomain: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_localDomain, overrides || {});
  }
  attach(address: string): TestReplica {
    return super.attach(address) as TestReplica;
  }
  connect(signer: Signer): TestReplica__factory {
    return super.connect(signer) as TestReplica__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): TestReplicaInterface {
    return new utils.Interface(_abi) as TestReplicaInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): TestReplica {
    return new Contract(address, _abi, signerOrProvider) as TestReplica;
  }
}
