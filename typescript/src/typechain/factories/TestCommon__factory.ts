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
import type { TestCommon, TestCommonInterface } from "../TestCommon";

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
        internalType: "address",
        name: "_updater",
        type: "address",
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
    name: "testIsUpdaterSignature",
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
  "0x60a060405234801561001057600080fd5b50604051610d87380380610d878339818101604052602081101561003357600080fd5b505160e081901b6001600160e01b03191660805263ffffffff16610d1e610069600039806105db52806106495250610d1e6000f3fe608060405234801561001057600080fd5b50600436106100a35760003560e01c80639d54f41911610076578063c19d93fb1161005b578063c19d93fb146102b3578063c4d66de8146102dc578063df034cd01461030f576100a3565b80639d54f419146102785780639fa6a6e3146102ab576100a3565b806319d9d21a146100a857806325605c021461017757806345630b1a1461023d5780638d3638f414610257575b600080fd5b610175600480360360a08110156100be57600080fd5b81359160208101918101906080810160608201356401000000008111156100e457600080fd5b8201836020820111156100f657600080fd5b8035906020019184600183028401116401000000008311171561011857600080fd5b91939092909160208101903564010000000081111561013657600080fd5b82018360208201111561014857600080fd5b8035906020019184600183028401116401000000008311171561016a57600080fd5b509092509050610340565b005b6102296004803603606081101561018d57600080fd5b8135916020810135918101906060810160408201356401000000008111156101b457600080fd5b8201836020820111156101c657600080fd5b803590602001918460018302840111640100000000831117156101e857600080fd5b91908080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525092955061059f945050505050565b604080519115158252519081900360200190f35b6102456105b4565b60408051918252519081900360200190f35b61025f610647565b6040805163ffffffff9092168252519081900360200190f35b6101756004803603602081101561028e57600080fd5b503573ffffffffffffffffffffffffffffffffffffffff1661066b565b6102456106b8565b6102bb6106be565b604051808260028111156102cb57fe5b815260200191505060405180910390f35b610175600480360360208110156102f257600080fd5b503573ffffffffffffffffffffffffffffffffffffffff166106e1565b610317610876565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b6002600054760100000000000000000000000000000000000000000000900460ff16600281111561036d57fe5b14156103da57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b604080516020601f860181900481028201810190925284815261041c918891883591889088908190840183828082843760009201919091525061089892505050565b801561046b575061046b86866001602002013584848080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525061089892505050565b801561047c57508435602086013514155b1561059757610489610930565b7f2c3f60bab4170347826231b75a920b5053941ddebc6eed6fd2c25721648b186f8686868686866040518087815260200186600260200280828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910182810360409081018252810186905290506020810160608201878780828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910184810383528581526020019050858580828437600083820152604051601f9091017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169092018290039a509098505050505050505050a15b505050505050565b60006105ac848484610898565b949350505050565b604080517fffffffff000000000000000000000000000000000000000000000000000000007f000000000000000000000000000000000000000000000000000000000000000060e01b166020808301919091527f4f5054494353000000000000000000000000000000000000000000000000000060248301528251600a818403018152602a909201909252805191012090565b7f000000000000000000000000000000000000000000000000000000000000000081565b6000805473ffffffffffffffffffffffffffffffffffffffff90921662010000027fffffffffffffffffffff0000000000000000000000000000000000000000ffff909216919091179055565b60015481565b600054760100000000000000000000000000000000000000000000900460ff1681565b600054610100900460ff16806106fa57506106fa61093a565b80610708575060005460ff16155b61075d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180610c99602e913960400191505060405180910390fd5b600054610100900460ff161580156107c357600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b600080547fffffffffffffffffffff0000000000000000000000000000000000000000ffff166201000073ffffffffffffffffffffffffffffffffffffffff851602177fffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffffffff16760100000000000000000000000000000000000000000000179055801561087257600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff1690555b5050565b60005462010000900473ffffffffffffffffffffffffffffffffffffffff1681565b6000806108a36105b4565b85856040516020018084815260200183815260200182815260200193505050506040516020818303038152906040528051906020012090506108e48161094b565b60005490915062010000900473ffffffffffffffffffffffffffffffffffffffff16610910828561099c565b73ffffffffffffffffffffffffffffffffffffffff161495945050505050565b610938610a36565b565b600061094530610a79565b15905090565b604080517f19457468657265756d205369676e6564204d6573736167653a0a333200000000602080830191909152603c8083019490945282518083039094018452605c909101909152815191012090565b60008151604114610a0e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e67746800604482015290519081900360640190fd5b60208201516040830151606084015160001a610a2c86828585610a7f565b9695505050505050565b600080547fffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffffffff16760200000000000000000000000000000000000000000000179055565b3b151590565b60007f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0821115610afa576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526022815260200180610c776022913960400191505060405180910390fd5b8360ff16601b1480610b0f57508360ff16601c145b610b64576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526022815260200180610cc76022913960400191505060405180910390fd5b600060018686868660405160008152602001604052604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa158015610bc0573d6000803e3d6000fd5b50506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0015191505073ffffffffffffffffffffffffffffffffffffffff8116610c6d57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f45434453413a20696e76616c6964207369676e61747572650000000000000000604482015290519081900360640190fd5b9594505050505056fe45434453413a20696e76616c6964207369676e6174757265202773272076616c7565496e697469616c697a61626c653a20636f6e747261637420697320616c726561647920696e697469616c697a656445434453413a20696e76616c6964207369676e6174757265202776272076616c7565a264697066735822122059ed1c68da947154b0d8ee57c44498657bb0f43b6baf583b610e4bcfb640978664736f6c63430007060033";

export class TestCommon__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _localDomain: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<TestCommon> {
    return super.deploy(_localDomain, overrides || {}) as Promise<TestCommon>;
  }
  getDeployTransaction(
    _localDomain: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_localDomain, overrides || {});
  }
  attach(address: string): TestCommon {
    return super.attach(address) as TestCommon;
  }
  connect(signer: Signer): TestCommon__factory {
    return super.connect(signer) as TestCommon__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): TestCommonInterface {
    return new utils.Interface(_abi) as TestCommonInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): TestCommon {
    return new Contract(address, _abi, signerOrProvider) as TestCommon;
  }
}
