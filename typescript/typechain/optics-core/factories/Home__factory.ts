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
import type { Home, HomeInterface } from "../Home";

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
        indexed: true,
        internalType: "uint256",
        name: "leafIndex",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint64",
        name: "destinationAndSequence",
        type: "uint64",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "messageHash",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "latestUpdatedRoot",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "message",
        type: "bytes",
      },
    ],
    name: "Dispatch",
    type: "event",
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
        internalType: "bytes32",
        name: "oldRoot",
        type: "bytes32",
      },
      {
        indexed: false,
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
    name: "ImproperUpdate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "updater",
        type: "address",
      },
    ],
    name: "NewUpdater",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "updaterManager",
        type: "address",
      },
    ],
    name: "NewUpdaterManager",
    type: "event",
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
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "updater",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "reporter",
        type: "address",
      },
    ],
    name: "UpdaterSlashed",
    type: "event",
  },
  {
    inputs: [],
    name: "MAX_MESSAGE_BODY_BYTES",
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
    name: "count",
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
    inputs: [
      {
        internalType: "uint32",
        name: "_destinationDomain",
        type: "uint32",
      },
      {
        internalType: "bytes32",
        name: "_recipientAddress",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "_messageBody",
        type: "bytes",
      },
    ],
    name: "enqueue",
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
    name: "improperUpdate",
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
        internalType: "contract IUpdaterManager",
        name: "_updaterManager",
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
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "root",
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
        name: "",
        type: "uint32",
      },
    ],
    name: "sequences",
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
    inputs: [
      {
        internalType: "address",
        name: "_updaterManager",
        type: "address",
      },
    ],
    name: "setUpdaterManager",
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
    inputs: [],
    name: "suggestUpdate",
    outputs: [
      {
        internalType: "bytes32",
        name: "_current",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "_new",
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
    name: "tree",
    outputs: [
      {
        internalType: "uint256",
        name: "count",
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
        name: "_currentRoot",
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
  {
    inputs: [],
    name: "updaterManager",
    outputs: [
      {
        internalType: "contract IUpdaterManager",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x60a060405234801561001057600080fd5b50604051612f90380380612f908339818101604052602081101561003357600080fd5b505160e081901b6001600160e01b03191660805263ffffffff16612f1d610073600039806109775280610abf5280610f9d52806113ee5250612f1d6000f3fe608060405234801561001057600080fd5b50600436106101a35760003560e01c80639d54f419116100ee578063c4d66de811610097578063ebf0c71711610071578063ebf0c7171461066e578063f2fde38b14610676578063f6d16102146106a9578063fd54b228146106b1576101a3565b8063c4d66de81461057b578063d3468639146105ae578063df034cd014610666576101a3565b8063ab91c7b0116100c8578063ab91c7b014610498578063b31c01fb146104a0578063c19d93fb14610552576101a3565b80639d54f419146104555780639df6c8e1146104885780639fa6a6e314610490576101a3565b8063522ae002116101505780638da5cb5b1161012a5780638da5cb5b1461033f5780638e4e30e0146103705780639776120e14610422576101a3565b8063522ae00214610327578063715018a61461032f5780638d3638f414610337576101a3565b80632bef2892116101815780632bef2892146102cd57806336e104de146102fe57806345630b1a1461031f576101a3565b806306661abd146101a857806319d9d21a146101c25780632752e0f414610291575b600080fd5b6101b06106b9565b60408051918252519081900360200190f35b61028f600480360360a08110156101d857600080fd5b81359160208101918101906080810160608201356401000000008111156101fe57600080fd5b82018360208201111561021057600080fd5b8035906020019184600183028401116401000000008311171561023257600080fd5b91939092909160208101903564010000000081111561025057600080fd5b82018360208201111561026257600080fd5b8035906020019184600183028401116401000000008311171561028457600080fd5b5090925090506106bf565b005b6102b4600480360360208110156102a757600080fd5b503563ffffffff1661091c565b6040805163ffffffff9092168252519081900360200190f35b6102ea600480360360208110156102e357600080fd5b5035610935565b604080519115158252519081900360200190f35b610306610948565b6040805192835260208301919091528051918290030190f35b6101b0610970565b6101b06109a0565b61028f6109a6565b6102b4610abd565b610347610ae1565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b6102ea6004803603606081101561038657600080fd5b8135916020810135918101906060810160408201356401000000008111156103ad57600080fd5b8201836020820111156103bf57600080fd5b803590602001918460018302840111640100000000831117156103e157600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610afd945050505050565b61028f6004803603602081101561043857600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16610d50565b61028f6004803603602081101561046b57600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16610e04565b610347610e94565b6101b0610eb1565b6101b0610eb7565b61028f600480360360608110156104b657600080fd5b8135916020810135918101906060810160408201356401000000008111156104dd57600080fd5b8201836020820111156104ef57600080fd5b8035906020019184600183028401116401000000008311171561051157600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610ec3945050505050565b61055a611061565b6040518082600281111561056a57fe5b815260200191505060405180910390f35b61028f6004803603602081101561059157600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16611082565b61028f600480360360608110156105c457600080fd5b63ffffffff823516916020810135918101906060810160408201356401000000008111156105f157600080fd5b82018360208201111561060357600080fd5b8035906020019184600183028401116401000000008311171561062557600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550611295945050505050565b61034761150b565b6101b0611527565b61028f6004803603602081101561068c57600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16611533565b6101b06116d5565b6101b06116e1565b60205490565b600260865474010000000000000000000000000000000000000000900460ff1660028111156106ea57fe5b141561075757604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b604080516020601f860181900481028201810190925284815261079991889188359188908890819084018382808284376000920191909152506116e792505050565b80156107e857506107e886866001602002013584848080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920191909152506116e792505050565b80156107f957508435602086013514155b1561091457610806611779565b7f2c3f60bab4170347826231b75a920b5053941ddebc6eed6fd2c25721648b186f8686868686866040518087815260200186600260200280828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910182810360409081018252810186905290506020810160608201878780828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910184810383528581526020019050858580828437600083820152604051601f9091017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169092018290039a509098505050505050505050a15b505050505050565b61011b6020526000908152604090205463ffffffff1681565b6000610942605383611855565b92915050565b60008061095560536118c5565b1561096c5760875491506109696053611905565b90505b9091565b600061099b7f0000000000000000000000000000000000000000000000000000000000000000611942565b905090565b61080081565b6109ae6119b7565b73ffffffffffffffffffffffffffffffffffffffff166109cc610ae1565b73ffffffffffffffffffffffffffffffffffffffff1614610a4e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b60e95460405160009173ffffffffffffffffffffffffffffffffffffffff16907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a360e980547fffffffffffffffffffffffff0000000000000000000000000000000000000000169055565b7f000000000000000000000000000000000000000000000000000000000000000081565b60e95473ffffffffffffffffffffffffffffffffffffffff1690565b6000600260865474010000000000000000000000000000000000000000900460ff166002811115610b2a57fe5b1415610b9757604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b610ba28484846116e7565b610c0d57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f2175706461746572207369670000000000000000000000000000000000000000604482015290519081900360640190fd5b6087548414610c7d57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601460248201527f6e6f7420612063757272656e7420757064617465000000000000000000000000604482015290519081900360640190fd5b610c88605384611855565b610d4557610c94611779565b7f6844fd5e21c932b5197b78ac11bf96e2eaa4e882dd0c88087060cf2065c04ab28484846040518084815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610d01578181015183820152602001610ce9565b50505050905090810190601f168015610d2e5780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a1506001610d49565b5060005b9392505050565b610d586119b7565b73ffffffffffffffffffffffffffffffffffffffff16610d76610ae1565b73ffffffffffffffffffffffffffffffffffffffff1614610df857604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b610e01816119bb565b50565b61011c5473ffffffffffffffffffffffffffffffffffffffff163314610e8b57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600f60248201527f21757064617465724d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b610e0181611aa9565b61011c5473ffffffffffffffffffffffffffffffffffffffff1681565b60875481565b600061099b60536118c5565b600260865474010000000000000000000000000000000000000000900460ff166002811115610eee57fe5b1415610f5b57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b610f66838383610afd565b15610f705761105c565b6000610f7c6053611b22565b905082811415610f8c5750610f92565b50610f70565b8160878190555081837f000000000000000000000000000000000000000000000000000000000000000063ffffffff167f608828ad904a0c9250c09004ba7226efb08f35a5c815bb3f76b5a8a271cd08b2846040518080602001828103825283818151815260200191508051906020019080838360005b83811015611021578181015183820152602001611009565b50505050905090810190601f16801561104e5780820380516001836020036101000a031916815260200191505b509250505060405180910390a45b505050565b60865474010000000000000000000000000000000000000000900460ff1681565b605254610100900460ff168061109b575061109b611c5b565b806110a9575060525460ff16155b6110fe576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180612e98602e913960400191505060405180910390fd5b605254610100900460ff1615801561116457605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b61116c611c6c565b611175826119bb565b61011c54604080517fdf034cd0000000000000000000000000000000000000000000000000000000008152905160009273ffffffffffffffffffffffffffffffffffffffff169163df034cd0916004808301926020929190829003018186803b1580156111e157600080fd5b505afa1580156111f5573d6000803e3d6000fd5b505050506040513d602081101561120b57600080fd5b5051905061121881611d8f565b6040805173ffffffffffffffffffffffffffffffffffffffff8316815290517f9e5f57e4ee5f9eeac3131028d48f19d80820ce6fa93c4c66cc82a3e2b9837c329181900360200190a150801561129157605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff1690555b5050565b600260865474010000000000000000000000000000000000000000900460ff1660028111156112c057fe5b141561132d57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b6108008151111561139f57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6d736720746f6f206c6f6e670000000000000000000000000000000000000000604482015290519081900360640190fd5b63ffffffff808416600090815261011b602052604081208054808416600181019094167fffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000009091161790556114177f00000000000000000000000000000000000000000000000000000000000000003384888888611f24565b8051602082012090915061142c600082611ffa565b61143f611437611527565b605390612102565b508061144b878561216f565b67ffffffffffffffff16600161145f6106b9565b037f212a0c695ace91176d2e6d1ba9200ae05dbe3e8b58f2b310103eb27777b13504608754866040518083815260200180602001828103825283818151815260200191508051906020019080838360005b838110156114c85781810151838201526020016114b0565b50505050905090810190601f1680156114f55780820380516001836020036101000a031916815260200191505b50935050505060405180910390a4505050505050565b60865473ffffffffffffffffffffffffffffffffffffffff1681565b600061099b6000612189565b61153b6119b7565b73ffffffffffffffffffffffffffffffffffffffff16611559610ae1565b73ffffffffffffffffffffffffffffffffffffffff16146115db57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b73ffffffffffffffffffffffffffffffffffffffff8116611647576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526026815260200180612e506026913960400191505060405180910390fd5b60e95460405173ffffffffffffffffffffffffffffffffffffffff8084169216907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a360e980547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b600061099b6053611905565b60205481565b6000806116f2610970565b85856040516020018084815260200183815260200182815260200193505050506040516020818303038152906040528051906020012090506117338161219c565b60865490915073ffffffffffffffffffffffffffffffffffffffff1661175982856121ed565b73ffffffffffffffffffffffffffffffffffffffff161495945050505050565b611781612287565b61011c54604080517f5b3c2cbf000000000000000000000000000000000000000000000000000000008152336004820152905173ffffffffffffffffffffffffffffffffffffffff90921691635b3c2cbf9160248082019260009290919082900301818387803b1580156117f457600080fd5b505af1158015611808573d6000803e3d6000fd5b505060865460405133935073ffffffffffffffffffffffffffffffffffffffff90911691507f98064af315f26d7333ba107ba43a128ec74345f4d4e6f2549840fe092a1c8bce90600090a3565b81546000906fffffffffffffffffffffffffffffffff165b835470010000000000000000000000000000000090046fffffffffffffffffffffffffffffffff168111610d455760008181526001850160205260409020548314156118bd576001915050610942565b60010161186d565b80546000906fffffffffffffffffffffffffffffffff7001000000000000000000000000000000008204811691166118fd82826122c8565b949350505050565b805470010000000000000000000000000000000090046fffffffffffffffffffffffffffffffff1660009081526001909101602052604090205490565b6040805160e09290921b7fffffffff00000000000000000000000000000000000000000000000000000000166020808401919091527f4f5054494353000000000000000000000000000000000000000000000000000060248401528151808403600a018152602a909301909152815191012090565b3390565b6119c4816122e2565b611a2f57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f21636f6e747261637420757064617465724d616e616765720000000000000000604482015290519081900360640190fd5b61011c805473ffffffffffffffffffffffffffffffffffffffff83167fffffffffffffffffffffffff0000000000000000000000000000000000000000909116811790915560408051918252517f958d788fb4c373604cd4c73aa8c592de127d0819b49bb4dc02c8ecd666e965bf9181900360200190a150565b6086805473ffffffffffffffffffffffffffffffffffffffff83167fffffffffffffffffffffffff0000000000000000000000000000000000000000909116811790915560408051918252517f9e5f57e4ee5f9eeac3131028d48f19d80820ce6fa93c4c66cc82a3e2b9837c329181900360200190a150565b80546000906fffffffffffffffffffffffffffffffff700100000000000000000000000000000000820481169116611b5a82826122c8565b611bc557604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600560248201527f456d707479000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b6fffffffffffffffffffffffffffffffff8116600090815260018501602052604090205492508215611c16576fffffffffffffffffffffffffffffffff811660009081526001850160205260408120555b83547fffffffffffffffffffffffffffffffff00000000000000000000000000000000166001919091016fffffffffffffffffffffffffffffffff1617909255919050565b6000611c66306122e2565b15905090565b605254610100900460ff1680611c855750611c85611c5b565b80611c93575060525460ff16155b611ce8576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180612e98602e913960400191505060405180910390fd5b605254610100900460ff16158015611d4e57605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b611d566122e8565b611d5e6123fa565b8015610e0157605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff16905550565b605254610100900460ff1680611da85750611da8611c5b565b80611db6575060525460ff16155b611e0b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180612e98602e913960400191505060405180910390fd5b605254610100900460ff16158015611e7157605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b611e7961258a565b608680547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff8416177fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff1674010000000000000000000000000000000000000000179055801561129157605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff1690555050565b6060868686868686604051602001808763ffffffff1660e01b81526004018681526020018563ffffffff1660e01b81526004018463ffffffff1660e01b815260040183815260200182805190602001908083835b60208310611fb557805182527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe09092019160209182019101611f78565b6001836020036101000a038019825116818451168082178552505050505050905001965050505050505060405160208183030381529060405290509695505050505050565b602082015463ffffffff1161207057604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601060248201527f6d65726b6c6520747265652066756c6c00000000000000000000000000000000604482015290519081900360640190fd5b6020820180546001019081905560005b60208110156120ff5781600116600114156120ac57828482602081106120a257fe5b0155506112919050565b8381602081106120b857fe5b0154836040516020018083815260200182815260200192505050604051602081830303815290604052805190602001209250600282816120f457fe5b049150600101612080565b50fe5b81546fffffffffffffffffffffffffffffffff8082167001000000000000000000000000000000009283900482166001019182169092029190911783558115610942576fffffffffffffffffffffffffffffffff8116600090815260019390930160205260409092205590565b63ffffffff1660209190911b67ffffffff00000000161790565b600061094282612197612676565b612b37565b604080517f19457468657265756d205369676e6564204d6573736167653a0a333200000000602080830191909152603c8083019490945282518083039094018452605c909101909152815191012090565b6000815160411461225f57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e67746800604482015290519081900360640190fd5b60208201516040830151606084015160001a61227d86828585612bf5565b9695505050505050565b608680547fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff1674020000000000000000000000000000000000000000179055565b60019103016fffffffffffffffffffffffffffffffff1690565b3b151590565b605254610100900460ff16806123015750612301611c5b565b8061230f575060525460ff16155b612364576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180612e98602e913960400191505060405180910390fd5b605254610100900460ff16158015611d5e57605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790558015610e0157605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff16905550565b605254610100900460ff16806124135750612413611c5b565b80612421575060525460ff16155b612476576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180612e98602e913960400191505060405180910390fd5b605254610100900460ff161580156124dc57605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b60006124e66119b7565b60e980547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff8316908117909155604051919250906000907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a3508015610e0157605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff16905550565b605254610100900460ff16806125a357506125a3611c5b565b806125b1575060525460ff16155b612606576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180612e98602e913960400191505060405180910390fd5b605254610100900460ff1615801561266c57605280547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b611d5e6053612dec565b61267e612e30565b600081527fad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb560208201527fb4c11951957c6f8f642c4af61cd6b24640fec6dc7fc607ee8206a99e92410d3060408201527f21ddb9a356815c3fac1026b6dec5df3124afbadb485c9ba5a3e3398a04b7ba8560608201527fe58769b32a1beaf1ea27375a44095a0d1fb664ce2dd358e7fcbfb78c26a1934460808201527f0eb01ebfc9ed27500cd4dfc979272d1f0913cc9f66540d7e8005811109e1cf2d60a08201527f887c22bd8750d34016ac3c66b5ff102dacdd73f6b014e710b51e8022af9a196860c08201527fffd70157e48063fc33c97a050f7f640233bf646cc98d9524c6b92bcf3ab56f8360e08201527f9867cc5f7f196b93bae1e27e6320742445d290f2263827498b54fec539f756af6101008201527fcefad4e508c098b9a7e1d8feb19955fb02ba9675585078710969d3440f5054e06101208201527ff9dc3e7fe016e050eff260334f18a5d4fe391d82092319f5964f2e2eb7c1c3a56101408201527ff8b13a49e282f609c317a833fb8d976d11517c571d1221a265d25af778ecf8926101608201527f3490c6ceeb450aecdc82e28293031d10c7d73bf85e57bf041a97360aa2c5d99c6101808201527fc1df82d9c4b87413eae2ef048f94b4d3554cea73d92b0f7af96e0271c691e2bb6101a08201527f5c67add7c6caf302256adedf7ab114da0acfe870d449a3a489f781d659e8becc6101c08201527fda7bce9f4e8618b6bd2f4132ce798cdc7a60e7e1460a7299e3c6342a579626d26101e08201527f2733e50f526ec2fa19a22b31e8ed50f23cd1fdf94c9154ed3a7609a2f1ff981f6102008201527fe1d3b5c807b281e4683cc6d6315cf95b9ade8641defcb32372f1c126e398ef7a6102208201527f5a2dce0a8a7f68bb74560f8f71837c2c2ebbcbf7fffb42ae1896f13f7c7479a06102408201527fb46a28b6f55540f89444f63de0378e3d121be09e06cc9ded1c20e65876d36aa06102608201527fc65e9645644786b620e2dd2ad648ddfcbf4a7e5b1a3a4ecfe7f64667a3f0b7e26102808201527ff4418588ed35a2458cffeb39b93d26f18d2ab13bdce6aee58e7b99359ec2dfd96102a08201527f5a9c16dc00d6ef18b7933a6f8dc65ccb55667138776f7dea101070dc8796e3776102c08201527f4df84f40ae0c8229d0d6069e5c8f39a7c299677a09d367fc7b05e3bc380ee6526102e08201527fcdc72595f74c7b1043d0e1ffbab734648c838dfb0527d971b602bc216c9619ef6103008201527f0abf5ac974a1ed57f4050aa510dd9c74f508277b39d7973bb2dfccc5eeb0618d6103208201527fb8cd74046ff337f0a7bf2c8e03e10f642c1886798d71806ab1e888d9e5ee87d06103408201527f838c5655cb21c6cb83313b5a631175dff4963772cce9108188b34ac87c81c41e6103608201527f662ee4dd2dd7b2bc707961b1e646c4047669dcb6584f0d8d770daf5d7e7deb2e6103808201527f388ab20e2573d171a88108e79d820e98f26c0b84aa8b2f4aa4968dbb818ea3226103a08201527f93237c50ba75ee485f4c22adf2f741400bdf8d6a9cc7df7ecae576221665d7356103c08201527f8448818bb4ae4562849e949e17ac16e0be16688e156b5cf15e098c627c0056a96103e082015290565b6020820154600090815b6020811015612bed57600182821c166000868360208110612b5e57fe5b015490508160011415612ba15780856040516020018083815260200182815260200192505050604051602081830303815290604052805190602001209450612be3565b84868460208110612bae57fe5b602002015160405160200180838152602001828152602001925050506040516020818303038152906040528051906020012094505b5050600101612b41565b505092915050565b60007f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0821115612c70576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526022815260200180612e766022913960400191505060405180910390fd5b8360ff16601b1480612c8557508360ff16601c145b612cda576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526022815260200180612ec66022913960400191505060405180910390fd5b600060018686868660405160008152602001604052604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa158015612d36573d6000803e3d6000fd5b50506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0015191505073ffffffffffffffffffffffffffffffffffffffff8116612de357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f45434453413a20696e76616c6964207369676e61747572650000000000000000604482015290519081900360640190fd5b95945050505050565b80546fffffffffffffffffffffffffffffffff16610e015780547fffffffffffffffffffffffffffffffff0000000000000000000000000000000016600117815550565b604051806104000160405280602090602082028036833750919291505056fe4f776e61626c653a206e6577206f776e657220697320746865207a65726f206164647265737345434453413a20696e76616c6964207369676e6174757265202773272076616c7565496e697469616c697a61626c653a20636f6e747261637420697320616c726561647920696e697469616c697a656445434453413a20696e76616c6964207369676e6174757265202776272076616c7565a26469706673582212201cb59fa5647e64f1a487775e240579bd4096620bb6990d095f6032153604c17764736f6c63430007060033";

export class Home__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _localDomain: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<Home> {
    return super.deploy(_localDomain, overrides || {}) as Promise<Home>;
  }
  getDeployTransaction(
    _localDomain: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_localDomain, overrides || {});
  }
  attach(address: string): Home {
    return super.attach(address) as Home;
  }
  connect(signer: Signer): Home__factory {
    return super.connect(signer) as Home__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): HomeInterface {
    return new utils.Interface(_abi) as HomeInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): Home {
    return new Contract(address, _abi, signerOrProvider) as Home;
  }
}
