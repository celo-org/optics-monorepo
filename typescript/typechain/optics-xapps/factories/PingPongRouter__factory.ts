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
    outputs: [],
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
  "0x60806040523480156200001157600080fd5b5060405162001a4338038062001a43833981810160405260208110156200003757600080fd5b505162000044816200004b565b50620003ac565b600054610100900460ff1680620000675750620000676200011b565b8062000076575060005460ff16155b620000b35760405162461bcd60e51b815260040180806020018281038252602e81526020018062001a15602e913960400191505060405180910390fd5b600054610100900460ff16158015620000df576000805460ff1961ff0019909116610100171660011790555b606580546001600160a01b0319166001600160a01b0384161790556200010462000139565b801562000117576000805461ff00191690555b5050565b60006200013330620001f760201b6200090c1760201c565b15905090565b600054610100900460ff1680620001555750620001556200011b565b8062000164575060005460ff16155b620001a15760405162461bcd60e51b815260040180806020018281038252602e81526020018062001a15602e913960400191505060405180910390fd5b600054610100900460ff16158015620001cd576000805460ff1961ff0019909116610100171660011790555b620001d7620001fd565b620001e1620002a5565b8015620001f4576000805461ff00191690555b50565b3b151590565b600054610100900460ff1680620002195750620002196200011b565b8062000228575060005460ff16155b620002655760405162461bcd60e51b815260040180806020018281038252602e81526020018062001a15602e913960400191505060405180910390fd5b600054610100900460ff16158015620001e1576000805460ff1961ff0019909116610100171660011790558015620001f4576000805461ff001916905550565b600054610100900460ff1680620002c15750620002c16200011b565b80620002d0575060005460ff16155b6200030d5760405162461bcd60e51b815260040180806020018281038252602e81526020018062001a15602e913960400191505060405180910390fd5b600054610100900460ff1615801562000339576000805460ff1961ff0019909116610100171660011790555b600062000345620003a8565b603380546001600160a01b0319166001600160a01b038316908117909155604051919250906000907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a3508015620001f4576000805461ff001916905550565b3390565b61165980620003bc6000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063715018a61161005b578063715018a6146101ce5780638da5cb5b146101d6578063b49c53a7146101de578063f2fde38b1461020757610088565b8063025ed0691461008d5780633339df96146100b257806341bdc8b5146100e357806356d5d47514610116575b600080fd5b6100b0600480360360208110156100a357600080fd5b503563ffffffff1661023a565b005b6100ba61028a565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b6100b0600480360360208110156100f957600080fd5b503573ffffffffffffffffffffffffffffffffffffffff166102a6565b6100b06004803603606081101561012c57600080fd5b63ffffffff8235169160208101359181019060608101604082013564010000000081111561015957600080fd5b82018360208201111561016b57600080fd5b8035906020019184600183028401116401000000008311171561018d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610395945050505050565b6100b0610576565b6100ba61068d565b6100b0600480360360408110156101f457600080fd5b5063ffffffff81351690602001356106a9565b6100b06004803603602081101561021d57600080fd5b503573ffffffffffffffffffffffffffffffffffffffff1661076a565b606780547fffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000008116600163ffffffff928316818101909316919091179092556102858383836000610916565b505050565b60655473ffffffffffffffffffffffffffffffffffffffff1681565b6102ae610a7f565b73ffffffffffffffffffffffffffffffffffffffff166102cc61068d565b73ffffffffffffffffffffffffffffffffffffffff161461034e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b606580547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b61039e33610a83565b61040957604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600860248201527f217265706c696361000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b82826104158282610b2c565b61048057604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600e60248201527f2172656d6f746520726f75746572000000000000000000000000000000000000604482015290519081900360640190fd5b600061048c8482610b4b565b90506104b97fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008216610b6f565b156104cd576104c88682610b8f565b61056e565b6104f87fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008216610b9c565b15610507576104c88682610ba5565b604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600d60248201527f2176616c696420616374696f6e00000000000000000000000000000000000000604482015290519081900360640190fd5b505050505050565b61057e610a7f565b73ffffffffffffffffffffffffffffffffffffffff1661059c61068d565b73ffffffffffffffffffffffffffffffffffffffff161461061e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b60335460405160009173ffffffffffffffffffffffffffffffffffffffff16907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a3603380547fffffffffffffffffffffffff0000000000000000000000000000000000000000169055565b60335473ffffffffffffffffffffffffffffffffffffffff1690565b6106b1610a7f565b73ffffffffffffffffffffffffffffffffffffffff166106cf61068d565b73ffffffffffffffffffffffffffffffffffffffff161461075157604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b63ffffffff909116600090815260666020526040902055565b610772610a7f565b73ffffffffffffffffffffffffffffffffffffffff1661079061068d565b73ffffffffffffffffffffffffffffffffffffffff161461081257604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b73ffffffffffffffffffffffffffffffffffffffff811661087e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602681526020018061156e6026913960400191505060405180910390fd5b60335460405173ffffffffffffffffffffffffffffffffffffffff8084169216907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a3603380547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b803b15155b919050565b600061092185610bb2565b9050600084610939576109348484610c34565b610943565b6109438484610c7f565b905061094d610c88565b73ffffffffffffffffffffffffffffffffffffffff1663d34686398784846040518463ffffffff1660e01b8152600401808463ffffffff16815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b838110156109c95781810151838201526020016109b1565b50505050905090810190601f1680156109f65780820380516001836020036101000a031916815260200191505b50945050505050600060405180830381600087803b158015610a1757600080fd5b505af1158015610a2b573d6000803e3d6000fd5b5050604080518681528815156020820152815163ffffffff808a1695508b1693507fc33c46696831ce09e40c8eb57b62d0d0cd48c408d38fa19f9a8ba3138415db10929181900390910190a3505050505050565b3390565b606554604080517f5190bc5300000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff848116600483015291516000939290921691635190bc5391602480820192602092909190829003018186803b158015610afa57600080fd5b505afa158015610b0e573d6000803e3d6000fd5b505050506040513d6020811015610b2457600080fd5b505192915050565b63ffffffff821660009081526066602052604090205481145b92915050565b815160009060208401610b6664ffffffffff85168284610d24565b95945050505050565b600060015b610b7d83610d85565b6002811115610b8857fe5b1492915050565b6001610285838284610dc0565b60006002610b74565b6000610285838284610dc0565b63ffffffff81166000908152606660205260409020548061091157604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600760248201527f2172656d6f746500000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b606060025b8383604051602001808460ff1660f81b81526001018363ffffffff1660e01b81526004018281526020019350505050604051602081830303815290604052905092915050565b60606001610c39565b606554604080517f9fa92f9d000000000000000000000000000000000000000000000000000000008152905160009273ffffffffffffffffffffffffffffffffffffffff1691639fa92f9d916004808301926020929190829003018186803b158015610cf357600080fd5b505afa158015610d07573d6000803e3d6000fd5b505050506040513d6020811015610d1d57600080fd5b5051905090565b600080610d318484610e7c565b9050604051811115610d41575060005b80610d6f577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000915050610d7e565b610d7a858585610eee565b9150505b9392505050565b6000610db27fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316610f01565b60ff166002811115610b4557fe5b6000610ded7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316610f07565b90506000610e1c7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008416610f38565b604080518481528615156020820152815192935063ffffffff80851693908916927faa15aa1b86193c9d924f48e0c48b3cba78f17e281109c7de2f865c5a1c3d7009928290030190a3610e758585158385600101610916565b5050505050565b81810182811015610b4557604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f4f766572666c6f7720647572696e67206164646974696f6e2e00000000000000604482015290519081900360640190fd5b606092831b9190911790911b1760181b90565b60d81c90565b6000610b457fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000831660016020610f65565b6000610b457fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316600160045b60008160200360080260ff16610f7c858585610f86565b901c949350505050565b600060ff8216610f9857506000610d7e565b610fa184611131565b6bffffffffffffffffffffffff16610fbc8460ff8516610e7c565b111561109b57610ffd610fce85611145565b6bffffffffffffffffffffffff16610fe586611131565b6bffffffffffffffffffffffff16858560ff16611159565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b83811015611060578181015183820152602001611048565b50505050905090810190601f16801561108d5780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b60208260ff1611156110f8576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603a8152602001806115b5603a913960400191505060405180910390fd5b60088202600061110786611145565b6bffffffffffffffffffffffff1690506000611122836112b4565b91909501511695945050505050565b60181c6bffffffffffffffffffffffff1690565b60781c6bffffffffffffffffffffffff1690565b60606000611166866112fd565b9150506000611174866112fd565b9150506000611182866112fd565b9150506000611190866112fd565b9150508383838360405160200180806115ef603591397fffffffffffff000000000000000000000000000000000000000000000000000060d087811b821660358401527f2077697468206c656e6774682030780000000000000000000000000000000000603b84015286901b16604a820152605001602161159482397fffffffffffff000000000000000000000000000000000000000000000000000060d094851b811660218301527f2077697468206c656e677468203078000000000000000000000000000000000060278301529290931b9091166036830152507f2e00000000000000000000000000000000000000000000000000000000000000603c82015260408051601d818403018152603d90920190529b9a5050505050505050505050565b7f80000000000000000000000000000000000000000000000000000000000000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9091011d90565b600080601f5b600f8160ff1611156113655760ff600882021684901c611322816113d1565b61ffff16841793508160ff1660101461133d57601084901b93505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01611303565b50600f5b60ff8160ff1610156113cb5760ff600882021684901c611388816113d1565b61ffff16831792508160ff166000146113a357601083901b92505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01611369565b50915091565b60006113e360048360ff16901c611401565b60ff161760081b62ffff00166113f882611401565b60ff1617919050565b600060f08083179060ff8216141561141d576030915050610911565b8060ff1660f11415611433576031915050610911565b8060ff1660f21415611449576032915050610911565b8060ff1660f3141561145f576033915050610911565b8060ff1660f41415611475576034915050610911565b8060ff1660f5141561148b576035915050610911565b8060ff1660f614156114a1576036915050610911565b8060ff1660f714156114b7576037915050610911565b8060ff1660f814156114cd576038915050610911565b8060ff1660f914156114e3576039915050610911565b8060ff1660fa14156114f9576061915050610911565b8060ff1660fb141561150f576062915050610911565b8060ff1660fc1415611525576063915050610911565b8060ff1660fd141561153b576064915050610911565b8060ff1660fe1415611551576065915050610911565b8060ff1660ff1415611567576066915050610911565b5091905056fe4f776e61626c653a206e6577206f776e657220697320746865207a65726f20616464726573732e20417474656d7074656420746f20696e646578206174206f666673657420307854797065644d656d566965772f696e646578202d20417474656d7074656420746f20696e646578206d6f7265207468616e20333220627974657354797065644d656d566965772f696e646578202d204f76657272616e2074686520766965772e20536c696365206973206174203078a264697066735822122067fc81281286f4e09321d40ef1febb02b5fcf01d0354db2fe04f48d7730c7d7464736f6c63430007060033496e697469616c697a61626c653a20636f6e747261637420697320616c726561647920696e697469616c697a6564";

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
