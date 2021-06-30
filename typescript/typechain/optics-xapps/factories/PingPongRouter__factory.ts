/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  PingPongRouter,
  PingPongRouterInterface,
} from "../PingPongRouter";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_xAppConnectionManager",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint32",
        name: "domain",
        type: "uint32",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "matchId",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "count",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isPing",
        type: "bool",
      },
    ],
    name: "Received",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint32",
        name: "domain",
        type: "uint32",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "matchId",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "count",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isPing",
        type: "bool",
      },
    ],
    name: "Sent",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_domain",
        type: "uint32",
      },
      {
        internalType: "bytes32",
        name: "_router",
        type: "bytes32",
      },
    ],
    name: "enrollRemoteRouter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_origin",
        type: "uint32",
      },
      {
        internalType: "bytes32",
        name: "_sender",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "_message",
        type: "bytes",
      },
    ],
    name: "handle",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_destinationDomain",
        type: "uint32",
      },
    ],
    name: "initiatePingPongMatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
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
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_xAppConnectionManager",
        type: "address",
      },
    ],
    name: "setXAppConnectionManager",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "xAppConnectionManager",
    outputs: [
      {
        internalType: "contract XAppConnectionManager",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b506040516117ca3803806117ca8339818101604052602081101561003357600080fd5b50518060006100406100b0565b600080546001600160a01b0319166001600160a01b0383169081178255604051929350917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a350600280546001600160a01b0319166001600160a01b0392909216919091179055506100b4565b3390565b611707806100c36000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063715018a61161005b578063715018a6146102435780638da5cb5b1461024b578063b49c53a714610253578063f2fde38b1461027c57610088565b8063025ed0691461008d5780633339df96146100b257806341bdc8b5146100e357806356d5d47514610116575b600080fd5b6100b0600480360360208110156100a357600080fd5b503563ffffffff166102af565b005b6100ba61031b565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b6100b0600480360360208110156100f957600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16610337565b6101ce6004803603606081101561012c57600080fd5b63ffffffff8235169160208101359181019060608101604082013564010000000081111561015957600080fd5b82018360208201111561016b57600080fd5b8035906020019184600183028401116401000000008311171561018d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610426945050505050565b6040805160208082528351818301528351919283929083019185019080838360005b838110156102085781810151838201526020016101f0565b50505050905090810190601f1680156102355780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6100b061060d565b6100ba610724565b6100b06004803603604081101561026957600080fd5b5063ffffffff8135169060200135610740565b6100b06004803603602081101561029257600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16610801565b6002805463ffffffff74010000000000000000000000000000000000000000808304821660018181019093169091027fffffffffffffffff00000000ffffffffffffffffffffffffffffffffffffffff9093169290921790925561031683838360006109a2565b505050565b60025473ffffffffffffffffffffffffffffffffffffffff1681565b61033f610b0b565b73ffffffffffffffffffffffffffffffffffffffff1661035d610724565b73ffffffffffffffffffffffffffffffffffffffff16146103df57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b600280547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b606061043133610b0f565b61049c57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600860248201527f217265706c696361000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b83836104a88282610bba565b61051357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600e60248201527f2172656d6f746520726f75746572000000000000000000000000000000000000604482015290519081900360640190fd5b600061051f8582610bd9565b905061054c7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008216610bfd565b156105635761055b8782610c1d565b935050610604565b61058e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008216610c34565b1561059d5761055b8782610c3d565b604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600d60248201527f2176616c696420616374696f6e00000000000000000000000000000000000000604482015290519081900360640190fd5b50509392505050565b610615610b0b565b73ffffffffffffffffffffffffffffffffffffffff16610633610724565b73ffffffffffffffffffffffffffffffffffffffff16146106b557604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b6000805460405173ffffffffffffffffffffffffffffffffffffffff909116907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a3600080547fffffffffffffffffffffffff0000000000000000000000000000000000000000169055565b60005473ffffffffffffffffffffffffffffffffffffffff1690565b610748610b0b565b73ffffffffffffffffffffffffffffffffffffffff16610766610724565b73ffffffffffffffffffffffffffffffffffffffff16146107e857604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b63ffffffff909116600090815260016020526040902055565b610809610b0b565b73ffffffffffffffffffffffffffffffffffffffff16610827610724565b73ffffffffffffffffffffffffffffffffffffffff16146108a957604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b73ffffffffffffffffffffffffffffffffffffffff8116610915576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602681526020018061161c6026913960400191505060405180910390fd5b6000805460405173ffffffffffffffffffffffffffffffffffffffff808516939216917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e091a3600080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b60006109ad85610c4c565b90506000846109c5576109c08484610cce565b6109cf565b6109cf8484610d19565b90506109d9610d22565b73ffffffffffffffffffffffffffffffffffffffff1663d34686398784846040518463ffffffff1660e01b8152600401808463ffffffff16815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610a55578181015183820152602001610a3d565b50505050905090810190601f168015610a825780820380516001836020036101000a031916815260200191505b50945050505050600060405180830381600087803b158015610aa357600080fd5b505af1158015610ab7573d6000803e3d6000fd5b5050604080518681528815156020820152815163ffffffff808a1695508b1693507fc33c46696831ce09e40c8eb57b62d0d0cd48c408d38fa19f9a8ba3138415db10929181900390910190a3505050505050565b3390565b600254604080517f5190bc5300000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff848116600483015291516000939290921691635190bc5391602480820192602092909190829003018186803b158015610b8657600080fd5b505afa158015610b9a573d6000803e3d6000fd5b505050506040513d6020811015610bb057600080fd5b505190505b919050565b63ffffffff821660009081526001602052604090205481145b92915050565b815160009060208401610bf464ffffffffff85168284610dbe565b95945050505050565b600060015b610c0b83610e1f565b6002811115610c1657fe5b1492915050565b60606001610c2c848285610e5a565b949350505050565b60006002610c02565b60606000610c2c848285610e5a565b63ffffffff811660009081526001602052604090205480610bb557604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600760248201527f2172656d6f746500000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b606060025b8383604051602001808460ff1660f81b81526001018363ffffffff1660e01b81526004018281526020019350505050604051602081830303815290604052905092915050565b60606001610cd3565b600254604080517f9fa92f9d000000000000000000000000000000000000000000000000000000008152905160009273ffffffffffffffffffffffffffffffffffffffff1691639fa92f9d916004808301926020929190829003018186803b158015610d8d57600080fd5b505afa158015610da1573d6000803e3d6000fd5b505050506040513d6020811015610db757600080fd5b5051905090565b600080610dcb8484610f2a565b9050604051811115610ddb575060005b80610e09577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000915050610e18565b610e14858585610f9c565b9150505b9392505050565b6000610e4c7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316610faf565b60ff166002811115610bd357fe5b60606000610e897fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008416610fb5565b90506000610eb87fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008516610fe6565b604080518481528715156020820152815192935063ffffffff80851693908a16927faa15aa1b86193c9d924f48e0c48b3cba78f17e281109c7de2f865c5a1c3d7009928290030190a3610f1186861583856001016109a2565b5050604080516020810190915260008152949350505050565b81810182811015610bd357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f4f766572666c6f7720647572696e67206164646974696f6e2e00000000000000604482015290519081900360640190fd5b606092831b9190911790911b1760181b90565b60d81c90565b6000610bd37fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000831660016020611013565b6000610bd37fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316600160045b60008160200360080260ff1661102a858585611034565b901c949350505050565b600060ff821661104657506000610e18565b61104f846111df565b6bffffffffffffffffffffffff1661106a8460ff8516610f2a565b1115611149576110ab61107c856111f3565b6bffffffffffffffffffffffff16611093866111df565b6bffffffffffffffffffffffff16858560ff16611207565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b8381101561110e5781810151838201526020016110f6565b50505050905090810190601f16801561113b5780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b60208260ff1611156111a6576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603a815260200180611663603a913960400191505060405180910390fd5b6008820260006111b5866111f3565b6bffffffffffffffffffffffff16905060006111d083611362565b91909501511695945050505050565b60181c6bffffffffffffffffffffffff1690565b60781c6bffffffffffffffffffffffff1690565b60606000611214866113ab565b9150506000611222866113ab565b9150506000611230866113ab565b915050600061123e866113ab565b91505083838383604051602001808061169d603591397fffffffffffff000000000000000000000000000000000000000000000000000060d087811b821660358401527f2077697468206c656e6774682030780000000000000000000000000000000000603b84015286901b16604a820152605001602161164282397fffffffffffff000000000000000000000000000000000000000000000000000060d094851b811660218301527f2077697468206c656e677468203078000000000000000000000000000000000060278301529290931b9091166036830152507f2e00000000000000000000000000000000000000000000000000000000000000603c82015260408051601d818403018152603d90920190529b9a5050505050505050505050565b7f80000000000000000000000000000000000000000000000000000000000000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9091011d90565b600080601f5b600f8160ff1611156114135760ff600882021684901c6113d08161147f565b61ffff16841793508160ff166010146113eb57601084901b93505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff016113b1565b50600f5b60ff8160ff1610156114795760ff600882021684901c6114368161147f565b61ffff16831792508160ff1660001461145157601083901b92505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01611417565b50915091565b600061149160048360ff16901c6114af565b60ff161760081b62ffff00166114a6826114af565b60ff1617919050565b600060f08083179060ff821614156114cb576030915050610bb5565b8060ff1660f114156114e1576031915050610bb5565b8060ff1660f214156114f7576032915050610bb5565b8060ff1660f3141561150d576033915050610bb5565b8060ff1660f41415611523576034915050610bb5565b8060ff1660f51415611539576035915050610bb5565b8060ff1660f6141561154f576036915050610bb5565b8060ff1660f71415611565576037915050610bb5565b8060ff1660f8141561157b576038915050610bb5565b8060ff1660f91415611591576039915050610bb5565b8060ff1660fa14156115a7576061915050610bb5565b8060ff1660fb14156115bd576062915050610bb5565b8060ff1660fc14156115d3576063915050610bb5565b8060ff1660fd14156115e9576064915050610bb5565b8060ff1660fe14156115ff576065915050610bb5565b8060ff1660ff1415611615576066915050610bb5565b5091905056fe4f776e61626c653a206e6577206f776e657220697320746865207a65726f20616464726573732e20417474656d7074656420746f20696e646578206174206f666673657420307854797065644d656d566965772f696e646578202d20417474656d7074656420746f20696e646578206d6f7265207468616e20333220627974657354797065644d656d566965772f696e646578202d204f76657272616e2074686520766965772e20536c696365206973206174203078a26469706673582212207f0130df05e5a4d8e6cc3be5e20d21d9065d14f00f066189495a4bb90e2eb6c064736f6c63430007060033";

export class PingPongRouter__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _xAppConnectionManager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<PingPongRouter> {
    return super.deploy(
      _xAppConnectionManager,
      overrides || {}
    ) as Promise<PingPongRouter>;
  }
  getDeployTransaction(
    _xAppConnectionManager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_xAppConnectionManager, overrides || {});
  }
  attach(address: string): PingPongRouter {
    return super.attach(address) as PingPongRouter;
  }
  connect(signer: Signer): PingPongRouter__factory {
    return super.connect(signer) as PingPongRouter__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): PingPongRouterInterface {
    return new utils.Interface(_abi) as PingPongRouterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): PingPongRouter {
    return new Contract(address, _abi, signerOrProvider) as PingPongRouter;
  }
}
