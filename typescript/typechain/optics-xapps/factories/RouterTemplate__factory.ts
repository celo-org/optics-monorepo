/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  RouterTemplate,
  RouterTemplateInterface,
} from "../RouterTemplate";

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
        indexed: false,
        internalType: "uint256",
        name: "number",
        type: "uint256",
      },
    ],
    name: "TypeAReceived",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_destinationDomain",
        type: "uint32",
      },
      {
        internalType: "uint256",
        name: "_number",
        type: "uint256",
      },
    ],
    name: "dispatchTypeA",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
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
  "0x60806040523480156200001157600080fd5b506040516200191638038062001916833981810160405260208110156200003757600080fd5b505162000044816200004b565b50620003ac565b600054610100900460ff1680620000675750620000676200011b565b8062000076575060005460ff16155b620000b35760405162461bcd60e51b815260040180806020018281038252602e815260200180620018e8602e913960400191505060405180910390fd5b600054610100900460ff16158015620000df576000805460ff1961ff0019909116610100171660011790555b606580546001600160a01b0319166001600160a01b0384161790556200010462000139565b801562000117576000805461ff00191690555b5050565b60006200013330620001f760201b620009911760201c565b15905090565b600054610100900460ff1680620001555750620001556200011b565b8062000164575060005460ff16155b620001a15760405162461bcd60e51b815260040180806020018281038252602e815260200180620018e8602e913960400191505060405180910390fd5b600054610100900460ff16158015620001cd576000805460ff1961ff0019909116610100171660011790555b620001d7620001fd565b620001e1620002a5565b8015620001f4576000805461ff00191690555b50565b3b151590565b600054610100900460ff1680620002195750620002196200011b565b8062000228575060005460ff16155b620002655760405162461bcd60e51b815260040180806020018281038252602e815260200180620018e8602e913960400191505060405180910390fd5b600054610100900460ff16158015620001e1576000805460ff1961ff0019909116610100171660011790558015620001f4576000805461ff001916905550565b600054610100900460ff1680620002c15750620002c16200011b565b80620002d0575060005460ff16155b6200030d5760405162461bcd60e51b815260040180806020018281038252602e815260200180620018e8602e913960400191505060405180910390fd5b600054610100900460ff1615801562000339576000805460ff1961ff0019909116610100171660011790555b600062000345620003a8565b603380546001600160a01b0319166001600160a01b038316908117909155604051919250906000907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a3508015620001f4576000805461ff001916905550565b3390565b61152c80620003bc6000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063715018a61161005b578063715018a6146101d45780638da5cb5b146101dc578063b49c53a7146101e4578063f2fde38b1461020d57610088565b80631984a3301461008d5780633339df96146100b857806341bdc8b5146100e957806356d5d4751461011c575b600080fd5b6100b6600480360360408110156100a357600080fd5b5063ffffffff8135169060200135610240565b005b6100c061034a565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b6100b6600480360360208110156100ff57600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16610366565b6100b66004803603606081101561013257600080fd5b63ffffffff8235169160208101359181019060608101604082013564010000000081111561015f57600080fd5b82018360208201111561017157600080fd5b8035906020019184600183028401116401000000008311171561019357600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610455945050505050565b6100b66105fb565b6100c0610712565b6100b6600480360360408110156101fa57600080fd5b5063ffffffff813516906020013561072e565b6100b66004803603602081101561022357600080fd5b503573ffffffffffffffffffffffffffffffffffffffff166107ef565b600061024b8361099b565b9050600061025883610a1d565b9050610262610a62565b73ffffffffffffffffffffffffffffffffffffffff1663d34686398584846040518463ffffffff1660e01b8152600401808463ffffffff16815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b838110156102de5781810151838201526020016102c6565b50505050905090810190601f16801561030b5780820380516001836020036101000a031916815260200191505b50945050505050600060405180830381600087803b15801561032c57600080fd5b505af1158015610340573d6000803e3d6000fd5b5050505050505050565b60655473ffffffffffffffffffffffffffffffffffffffff1681565b61036e610afe565b73ffffffffffffffffffffffffffffffffffffffff1661038c610712565b73ffffffffffffffffffffffffffffffffffffffff161461040e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b606580547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b61045e33610b02565b6104c957604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600860248201527f217265706c696361000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b82826104d58282610bab565b61054057604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600e60248201527f2172656d6f746520726f75746572000000000000000000000000000000000000604482015290519081900360640190fd5b600061054c8482610bca565b90506105797fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008216610bee565b1561058c5761058781610c0d565b6105f3565b604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600d60248201527f2176616c696420616374696f6e00000000000000000000000000000000000000604482015290519081900360640190fd5b505050505050565b610603610afe565b73ffffffffffffffffffffffffffffffffffffffff16610621610712565b73ffffffffffffffffffffffffffffffffffffffff16146106a357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b60335460405160009173ffffffffffffffffffffffffffffffffffffffff16907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a3603380547fffffffffffffffffffffffff0000000000000000000000000000000000000000169055565b60335473ffffffffffffffffffffffffffffffffffffffff1690565b610736610afe565b73ffffffffffffffffffffffffffffffffffffffff16610754610712565b73ffffffffffffffffffffffffffffffffffffffff16146107d657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b63ffffffff909116600090815260976020526040902055565b6107f7610afe565b73ffffffffffffffffffffffffffffffffffffffff16610815610712565b73ffffffffffffffffffffffffffffffffffffffff161461089757604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b73ffffffffffffffffffffffffffffffffffffffff8116610903576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260268152602001806114136026913960400191505060405180910390fd5b60335460405173ffffffffffffffffffffffffffffffffffffffff8084169216907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a3603380547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b803b15155b919050565b63ffffffff81166000908152609760205260409020548061099657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600760248201527f2172656d6f746500000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b604080517f0100000000000000000000000000000000000000000000000000000000000000602082015260218082019390935281518082039093018352604101905290565b606554604080517f9fa92f9d000000000000000000000000000000000000000000000000000000008152905160009273ffffffffffffffffffffffffffffffffffffffff1691639fa92f9d916004808301926020929190829003018186803b158015610acd57600080fd5b505afa158015610ae1573d6000803e3d6000fd5b505050506040513d6020811015610af757600080fd5b5051905090565b3390565b606554604080517f5190bc5300000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff848116600483015291516000939290921691635190bc5391602480820192602092909190829003018186803b158015610b7957600080fd5b505afa158015610b8d573d6000803e3d6000fd5b505050506040513d6020811015610ba357600080fd5b505192915050565b63ffffffff821660009081526097602052604090205481145b92915050565b815160009060208401610be564ffffffffff85168284610c75565b95945050505050565b60006001610bfb83610cd6565b6001811115610c0657fe5b1492915050565b6000610c3a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316610d11565b6040805182815290519192507f2b51a16951b17b51a53e06c3041d704232f26354acf317a5b7bfeab23f4ca629919081900360200190a15050565b600080610c828484610da0565b9050604051811115610c92575060005b80610cc0577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000915050610ccf565b610ccb858585610e12565b9150505b9392505050565b6000610d037fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316610e25565b60ff166001811115610bc457fe5b6000610d1c82610bee565b610d71576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180611439602e913960400191505060405180910390fd5b610bc47fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000831660006020610e2b565b81810182811015610bc457604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f4f766572666c6f7720647572696e67206164646974696f6e2e00000000000000604482015290519081900360640190fd5b606092831b9190911790911b1760181b90565b60d81c90565b600060ff8216610e3d57506000610ccf565b610e4684610fd6565b6bffffffffffffffffffffffff16610e618460ff8516610da0565b1115610f4057610ea2610e7385610fea565b6bffffffffffffffffffffffff16610e8a86610fd6565b6bffffffffffffffffffffffff16858560ff16610ffe565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b83811015610f05578181015183820152602001610eed565b50505050905090810190601f168015610f325780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b60208260ff161115610f9d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603a815260200180611488603a913960400191505060405180910390fd5b600882026000610fac86610fea565b6bffffffffffffffffffffffff1690506000610fc783611159565b91909501511695945050505050565b60181c6bffffffffffffffffffffffff1690565b60781c6bffffffffffffffffffffffff1690565b6060600061100b866111a2565b9150506000611019866111a2565b9150506000611027866111a2565b9150506000611035866111a2565b9150508383838360405160200180806114c2603591397fffffffffffff000000000000000000000000000000000000000000000000000060d087811b821660358401527f2077697468206c656e6774682030780000000000000000000000000000000000603b84015286901b16604a820152605001602161146782397fffffffffffff000000000000000000000000000000000000000000000000000060d094851b811660218301527f2077697468206c656e677468203078000000000000000000000000000000000060278301529290931b9091166036830152507f2e00000000000000000000000000000000000000000000000000000000000000603c82015260408051601d818403018152603d90920190529b9a5050505050505050505050565b7f80000000000000000000000000000000000000000000000000000000000000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9091011d90565b600080601f5b600f8160ff16111561120a5760ff600882021684901c6111c781611276565b61ffff16841793508160ff166010146111e257601084901b93505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff016111a8565b50600f5b60ff8160ff1610156112705760ff600882021684901c61122d81611276565b61ffff16831792508160ff1660001461124857601083901b92505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0161120e565b50915091565b600061128860048360ff16901c6112a6565b60ff161760081b62ffff001661129d826112a6565b60ff1617919050565b600060f08083179060ff821614156112c2576030915050610996565b8060ff1660f114156112d8576031915050610996565b8060ff1660f214156112ee576032915050610996565b8060ff1660f31415611304576033915050610996565b8060ff1660f4141561131a576034915050610996565b8060ff1660f51415611330576035915050610996565b8060ff1660f61415611346576036915050610996565b8060ff1660f7141561135c576037915050610996565b8060ff1660f81415611372576038915050610996565b8060ff1660f91415611388576039915050610996565b8060ff1660fa141561139e576061915050610996565b8060ff1660fb14156113b4576062915050610996565b8060ff1660fc14156113ca576063915050610996565b8060ff1660fd14156113e0576064915050610996565b8060ff1660fe14156113f6576065915050610996565b8060ff1660ff141561140c576066915050610996565b5091905056fe4f776e61626c653a206e6577206f776e657220697320746865207a65726f20616464726573734d65737361676554656d706c6174652f6e756d6265723a2076696577206d757374206265206f66207479706520412e20417474656d7074656420746f20696e646578206174206f666673657420307854797065644d656d566965772f696e646578202d20417474656d7074656420746f20696e646578206d6f7265207468616e20333220627974657354797065644d656d566965772f696e646578202d204f76657272616e2074686520766965772e20536c696365206973206174203078a2646970667358221220b177251be8109cc30e4a50f6387ddf01e37e75431b97c801234f3dda177ec19a64736f6c63430007060033496e697469616c697a61626c653a20636f6e747261637420697320616c726561647920696e697469616c697a6564";

export class RouterTemplate__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _xAppConnectionManager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<RouterTemplate> {
    return super.deploy(
      _xAppConnectionManager,
      overrides || {}
    ) as Promise<RouterTemplate>;
  }
  getDeployTransaction(
    _xAppConnectionManager: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_xAppConnectionManager, overrides || {});
  }
  attach(address: string): RouterTemplate {
    return super.attach(address) as RouterTemplate;
  }
  connect(signer: Signer): RouterTemplate__factory {
    return super.connect(signer) as RouterTemplate__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): RouterTemplateInterface {
    return new utils.Interface(_abi) as RouterTemplateInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): RouterTemplate {
    return new Contract(address, _abi, signerOrProvider) as RouterTemplate;
  }
}
