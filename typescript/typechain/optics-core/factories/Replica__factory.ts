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
import type { Replica, ReplicaInterface } from "../Replica";

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
        internalType: "bytes32",
        name: "messageHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "sequence",
        type: "uint32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "returnData",
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
        internalType: "bytes32",
        name: "messageHash",
        type: "bytes32",
      },
    ],
    name: "ProcessSuccess",
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
  "0x60a060405234801561001057600080fd5b506040516131393803806131398339818101604052602081101561003357600080fd5b505160e081901b6001600160e01b03191660805263ffffffff166130d061006960003980610d115280610da752506130d06000f3fe608060405234801561001057600080fd5b50600436106101a35760003560e01c80638d3638f4116100ee578063b31c01fb11610097578063c19d93fb11610071578063c19d93fb14610641578063d88beda214610649578063df034cd014610651578063f6d1610214610682576101a3565b8063b31c01fb14610519578063ba739a62146105cb578063bf30a55d146105ec576101a3565b80639fa6a6e3116100c85780639fa6a6e3146104ec578063a3f81d68146104f4578063ab91c7b014610511576101a3565b80638d3638f414610436578063928bc4b21461043e578063961681dc146104e4576101a3565b806339992668116101505780636188af0e1161012a5780636188af0e146103635780637022b58e1461041157806371bfb7b814610419576101a3565b8063399926681461033257806345630b1a1461033a578063456d067214610342576101a3565b80632bbd59ca116101815780632bbd59ca146102ad5780632bef2892146102eb578063371d307114610308576101a3565b806314cfabb3146101a857806319d9d21a146101c457806325e3beda14610293575b600080fd5b6101b061068a565b604080519115158252519081900360200190f35b610291600480360360a08110156101da57600080fd5b813591602081019181019060808101606082013564010000000081111561020057600080fd5b82018360208201111561021257600080fd5b8035906020019184600183028401116401000000008311171561023457600080fd5b91939092909160208101903564010000000081111561025257600080fd5b82018360208201111561026457600080fd5b8035906020019184600183028401116401000000008311171561028657600080fd5b5090925090506106b6565b005b61029b610913565b60408051918252519081900360200190f35b6102ca600480360360208110156102c357600080fd5b5035610919565b604051808260028111156102da57fe5b815260200191505060405180910390f35b6101b06004803603602081101561030157600080fd5b503561092e565b6101b0600480360361044081101561031f57600080fd5b5080359060208101906104200135610943565b61029b610a63565b61029b610a69565b61034a610a7e565b6040805163ffffffff9092168252519081900360200190f35b610291600480360361044081101561037a57600080fd5b81019060208101813564010000000081111561039557600080fd5b8201836020820111156103a757600080fd5b803590602001918460018302840111640100000000831117156103c957600080fd5b91908080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525092955092935050506104008201359050610a8a565b610291610b16565b61029b6004803603602081101561042f57600080fd5b5035610cfd565b61034a610d0f565b6101b06004803603602081101561045457600080fd5b81019060208101813564010000000081111561046f57600080fd5b82018360208201111561048157600080fd5b803590602001918460018302840111640100000000831117156104a357600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610d33945050505050565b61034a611420565b61029b61142c565b6101b06004803603602081101561050a57600080fd5b5035611432565b61029b611459565b6102916004803603606081101561052f57600080fd5b81359160208101359181019060608101604082013564010000000081111561055657600080fd5b82018360208201111561056857600080fd5b8035906020019184600183028401116401000000008311171561058a57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550611465945050505050565b6105d3611749565b6040805192835260208301919091528051918290030190f35b610291600480360360a081101561060257600080fd5b5063ffffffff813581169173ffffffffffffffffffffffffffffffffffffffff6020820135169160408201359160608101359160809091013516611797565b6102ca61194e565b61029b61196f565b610659611976565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b61029b611992565b6000610696600161199e565b158015906106b157506106b16106ac60016119de565b611432565b905090565b600260035474010000000000000000000000000000000000000000900460ff1660028111156106e157fe5b141561074e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b604080516020601f86018190048102820181019092528481526107909188918835918890889081908401838280828437600092019190915250611a7f92505050565b80156107df57506107df86866001602002013584848080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250611a7f92505050565b80156107f057508435602086013514155b1561090b576107fd611b11565b7f2c3f60bab4170347826231b75a920b5053941ddebc6eed6fd2c25721648b186f8686868686866040518087815260200186600260200280828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910182810360409081018252810186905290506020810160608201878780828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910184810383528581526020019050858580828437600083820152604051601f9091017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169092018290039a509098505050505050505050a15b505050505050565b613a9881565b600a6020526000908152604090205460ff1681565b600061093b600183611b1b565b90505b919050565b6000806000858152600a602052604090205460ff16600281111561096357fe5b146109cf57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f214d6573736167655374617475732e4e6f6e6500000000000000000000000000604482015290519081900360640190fd5b6000610a05858560208060200260405190810160405280929190826020800280828437600092019190915250879150611b979050565b9050610a1081611432565b15610a565750506000838152600a6020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001908117909155610a5c565b60009150505b9392505050565b60065481565b6005546000906106b19063ffffffff16611c42565b60075463ffffffff1681565b610a9c83805190602001208383610943565b610b0757604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600660248201527f2170726f76650000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b610b1083610d33565b50505050565b600260035474010000000000000000000000000000000000000000900460ff166002811115610b4157fe5b1415610bae57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b610bb8600161199e565b610c2357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600860248201527f2170656e64696e67000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b600080610c30600161199e565b90505b600081118015610c4b5750610c4b6106ac60016119de565b15610c8357610c5a6001611cb7565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01610c33565b81610cef57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600560248201527f2174696d65000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b610cf7611b19565b50600455565b60086020526000908152604090205481565b7f000000000000000000000000000000000000000000000000000000000000000081565b600080610d408382611df0565b90506000610d6f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316611e14565b90506000610d9e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008416611e53565b905063ffffffff7f000000000000000000000000000000000000000000000000000000000000000016610df27fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008516611e84565b63ffffffff1614610e6457604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f2164657374696e6174696f6e0000000000000000000000000000000000000000604482015290519081900360640190fd5b60016000838152600a602052604090205460ff166002811115610e8357fe5b14610eef57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600860248201527f2170656e64696e67000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b60095460ff16600114610f6357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600a60248201527f217265656e7472616e7400000000000000000000000000000000000000000000604482015290519081900360640190fd5b600980547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff009081169091556000838152600a60205260409020805490911660021790556007805463ffffffff60018401167fffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000909116179055620d32e85a101561104f57604080517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048083019190915260248201527f2167617300000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b600061107c7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008516611eb5565b9050606073ffffffffffffffffffffffffffffffffffffffff8216620cf8506110c67fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008816611ec8565b6110f17fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008916611ef8565b61114661111f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008b16611f29565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016611f9a565b604051602401808463ffffffff16815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b83811015611198578181015183820152602001611180565b50505050905090810190601f1680156111c55780820380516001836020036101000a031916815260200191505b50604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529181526020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167f56d5d47500000000000000000000000000000000000000000000000000000000178152905182519297509550859450925090508083835b6020831061128d57805182527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe09092019160209182019101611250565b6001836020036101000a03801982511681845116808217855250505050505090500191505060006040518083038160008787f1925050503d80600081146112f0576040519150601f19603f3d011682016040523d82523d6000602084013e6112f5565b606091505b50909650905085156113315760405184907fdc8a2c27342659cbe87c6c49e4515c64faa8c97ba6a2f260cbf33d84d7bd832090600090a26113ea565b8173ffffffffffffffffffffffffffffffffffffffff168363ffffffff16857fdffcee52db78cb2d1f525b8d7edd630ea062884e733aa26c201d7ce1843eccab846040518080602001828103825283818151815260200191508051906020019080838360005b838110156113af578181015183820152602001611397565b50505050905090810190601f1680156113dc5780820380516001836020036101000a031916815260200191505b509250505060405180910390a45b5050600980547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0016600117905550919392505050565b60055463ffffffff1681565b60045481565b6000818152600860205260408120548061145057600091505061093e565b42101592915050565b60006106b1600161199e565b600260035474010000000000000000000000000000000000000000900460ff16600281111561149057fe5b14156114fd57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b6000611509600161199e565b111561158b576115196001611fde565b831461158657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601060248201527f6e6f7420656e64206f6620717565756500000000000000000000000000000000604482015290519081900360640190fd5b6115fb565b82600454146115fb57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601260248201527f6e6f742063757272656e74207570646174650000000000000000000000000000604482015290519081900360640190fd5b611606838383611a7f565b61167157604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600760248201527f6261642073696700000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b611679611b19565b600654600083815260086020526040902042909101905561169b60018361201b565b5060055460408051602080825284518183015284518694889463ffffffff909116937f608828ad904a0c9250c09004ba7226efb08f35a5c815bb3f76b5a8a271cd08b2938893919283929083019185019080838360005b8381101561170a5781810151838201526020016116f2565b50505050905090810190601f1680156117375780820380516001836020036101000a031916815260200191505b509250505060405180910390a4505050565b600080611756600161199e565b1561177e5761176560016119de565b6000818152600860205260409020549092509050611793565b50506004546000818152600860205260409020545b9091565b600054610100900460ff16806117b057506117b0612088565b806117be575060005460ff16155b611813576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180612f89602e913960400191505060405180910390fd5b600054610100900460ff1615801561187957600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b61188285612099565b61188c6001612227565b600980547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660019081179091556005805463ffffffff808a167fffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000092831617909255600487905560008781526008602052604090209290925560068590556007805491851691909216179055801561090b57600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff169055505050505050565b60035474010000000000000000000000000000000000000000900460ff1681565b620cf85081565b60035473ffffffffffffffffffffffffffffffffffffffff1681565b60006106b16001611fde565b80546000906fffffffffffffffffffffffffffffffff7001000000000000000000000000000000008204811691166119d6828261226c565b949350505050565b60006119e982612286565b15611a5557604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600560248201527f456d707479000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b5080546fffffffffffffffffffffffffffffffff1660009081526001909101602052604090205490565b600080611a8a610a69565b8585604051602001808481526020018381526020018281526020019350505050604051602081830303815290604052805190602001209050611acb816122b5565b60035490915073ffffffffffffffffffffffffffffffffffffffff16611af18285612306565b73ffffffffffffffffffffffffffffffffffffffff161495945050505050565b611b196123a0565b565b81546000906fffffffffffffffffffffffffffffffff165b835470010000000000000000000000000000000090046fffffffffffffffffffffffffffffffff168111611b8b576000818152600185016020526040902054831415611b83576001915050611b91565b600101611b33565b50600090505b92915050565b8260005b6020811015611c3a57600183821c166000858360208110611bb857fe5b602002015190508160011415611bfe5780846040516020018083815260200182815260200192505050604051602081830303815290604052805190602001209350611c30565b838160405160200180838152602001828152602001925050506040516020818303038152906040528051906020012093505b5050600101611b9b565b509392505050565b6040805160e09290921b7fffffffff00000000000000000000000000000000000000000000000000000000166020808401919091527f4f5054494353000000000000000000000000000000000000000000000000000060248401528151808403600a018152602a909301909152815191012090565b80546000906fffffffffffffffffffffffffffffffff700100000000000000000000000000000000820481169116611cef828261226c565b611d5a57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600560248201527f456d707479000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b6fffffffffffffffffffffffffffffffff8116600090815260018501602052604090205492508215611dab576fffffffffffffffffffffffffffffffff811660009081526001850160205260408120555b83547fffffffffffffffffffffffffffffffff00000000000000000000000000000000166001919091016fffffffffffffffffffffffffffffffff1617909255919050565b815160009060208401611e0b64ffffffffff851682846123e1565b95945050505050565b600080611e2083612437565b6bffffffffffffffffffffffff1690506000611e3b8461244b565b6bffffffffffffffffffffffff169091209392505050565b600061093b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000083166024600461245f565b600061093b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000083166028600461245f565b600061093b611ec383612480565b6124b1565b600061093b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000831682600461245f565b600061093b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316600460206124b4565b600061093b604c80611f5c7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000861661244b565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000861692916bffffffffffffffffffffffff9190911603600061265f565b6060600080611fa88461244b565b6bffffffffffffffffffffffff1690506040519150819250611fcd84836020016126e5565b508181016020016040529052919050565b805470010000000000000000000000000000000090046fffffffffffffffffffffffffffffffff1660009081526001909101602052604090205490565b81546fffffffffffffffffffffffffffffffff8082167001000000000000000000000000000000009283900482166001019182169092029190911783558115611b91576fffffffffffffffffffffffffffffffff8116600090815260019390930160205260409092205590565b600061209330612811565b15905090565b600054610100900460ff16806120b257506120b2612088565b806120c0575060005460ff16155b612115576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180612f89602e913960400191505060405180910390fd5b600054610100900460ff1615801561217b57600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b600380547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff8416177fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff1674010000000000000000000000000000000000000000179055801561222357600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff1690555b5050565b80546fffffffffffffffffffffffffffffffff166122695780547fffffffffffffffffffffffffffffffff000000000000000000000000000000001660011781555b50565b60019103016fffffffffffffffffffffffffffffffff1690565b546fffffffffffffffffffffffffffffffff808216700100000000000000000000000000000000909204161090565b604080517f19457468657265756d205369676e6564204d6573736167653a0a333200000000602080830191909152603c8083019490945282518083039094018452605c909101909152815191012090565b6000815160411461237857604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e67746800604482015290519081900360640190fd5b60208201516040830151606084015160001a61239686828585612817565b9695505050505050565b600380547fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff1674020000000000000000000000000000000000000000179055565b6000806123ee8484612a05565b90506040518111156123fe575060005b8061242c577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000915050610a5c565b611e0b858585612a77565b60781c6bffffffffffffffffffffffff1690565b60181c6bffffffffffffffffffffffff1690565b60008160200360080260ff166124768585856124b4565b901c949350505050565b600061093b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316602c60206124b4565b90565b600060ff82166124c657506000610a5c565b6124cf8461244b565b6bffffffffffffffffffffffff166124ea8460ff8516612a05565b11156125c95761252b6124fc85612437565b6bffffffffffffffffffffffff166125138661244b565b6bffffffffffffffffffffffff16858560ff16612a8a565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b8381101561258e578181015183820152602001612576565b50505050905090810190601f1680156125bb5780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b60208260ff161115612626576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603a815260200180612fd9603a913960400191505060405180910390fd5b60088202600061263586612437565b6bffffffffffffffffffffffff169050600061265083612be5565b91909501511695945050505050565b60008061266b86612437565b6bffffffffffffffffffffffff16905061268486612c2e565b612698856126928489612a05565b90612a05565b11156126c7577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000009150506119d6565b6126d18186612a05565b90506123968364ffffffffff1682866123e1565b60006126f083612c58565b612745576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260288152602001806130136028913960400191505060405180910390fd5b61274e83612c6a565b6127a3576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602b81526020018061303b602b913960400191505060405180910390fd5b60006127ae8461244b565b6bffffffffffffffffffffffff16905060006127c985612437565b6bffffffffffffffffffffffff16905060006040519050848111156127ee5760206060fd5b8285848460045afa5061239661280387612ca7565b64ffffffffff168685612a77565b3b151590565b60007f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0821115612892576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526022815260200180612f466022913960400191505060405180910390fd5b8360ff16601b14806128a757508360ff16601c145b6128fc576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526022815260200180612fb76022913960400191505060405180910390fd5b600060018686868660405160008152602001604052604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa158015612958573d6000803e3d6000fd5b50506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0015191505073ffffffffffffffffffffffffffffffffffffffff8116611e0b57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f45434453413a20696e76616c6964207369676e61747572650000000000000000604482015290519081900360640190fd5b81810182811015611b9157604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f4f766572666c6f7720647572696e67206164646974696f6e2e00000000000000604482015290519081900360640190fd5b606092831b9190911790911b1760181b90565b60606000612a9786612cad565b9150506000612aa586612cad565b9150506000612ab386612cad565b9150506000612ac186612cad565b915050838383836040516020018080613066603591397fffffffffffff000000000000000000000000000000000000000000000000000060d087811b821660358401527f2077697468206c656e6774682030780000000000000000000000000000000000603b84015286901b16604a8201526050016021612f6882397fffffffffffff000000000000000000000000000000000000000000000000000060d094851b811660218301527f2077697468206c656e677468203078000000000000000000000000000000000060278301529290931b9091166036830152507f2e00000000000000000000000000000000000000000000000000000000000000603c82015260408051601d818403018152603d90920190529b9a5050505050505050505050565b7f80000000000000000000000000000000000000000000000000000000000000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9091011d90565b6000612c398261244b565b612c4283612437565b016bffffffffffffffffffffffff169050919050565b6000612c6382612d81565b1592915050565b6000612c7582612ca7565b64ffffffffff1664ffffffffff1415612c905750600061093e565b6000612c9b83612c2e565b60405110199392505050565b60d81c90565b600080601f5b600f8160ff161115612d155760ff600882021684901c612cd281612da9565b61ffff16841793508160ff16601014612ced57601084901b93505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01612cb3565b50600f5b60ff8160ff161015612d7b5760ff600882021684901c612d3881612da9565b61ffff16831792508160ff16600014612d5357601083901b92505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01612d19565b50915091565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000009081161490565b6000612dbb60048360ff16901c612dd9565b60ff161760081b62ffff0016612dd082612dd9565b60ff1617919050565b600060f08083179060ff82161415612df557603091505061093e565b8060ff1660f11415612e0b57603191505061093e565b8060ff1660f21415612e2157603291505061093e565b8060ff1660f31415612e3757603391505061093e565b8060ff1660f41415612e4d57603491505061093e565b8060ff1660f51415612e6357603591505061093e565b8060ff1660f61415612e7957603691505061093e565b8060ff1660f71415612e8f57603791505061093e565b8060ff1660f81415612ea557603891505061093e565b8060ff1660f91415612ebb57603991505061093e565b8060ff1660fa1415612ed157606191505061093e565b8060ff1660fb1415612ee757606291505061093e565b8060ff1660fc1415612efd57606391505061093e565b8060ff1660fd1415612f1357606491505061093e565b8060ff1660fe1415612f2957606591505061093e565b8060ff1660ff1415612f3f57606691505061093e565b5091905056fe45434453413a20696e76616c6964207369676e6174757265202773272076616c75652e20417474656d7074656420746f20696e646578206174206f6666736574203078496e697469616c697a61626c653a20636f6e747261637420697320616c726561647920696e697469616c697a656445434453413a20696e76616c6964207369676e6174757265202776272076616c756554797065644d656d566965772f696e646578202d20417474656d7074656420746f20696e646578206d6f7265207468616e20333220627974657354797065644d656d566965772f636f7079546f202d204e756c6c20706f696e74657220646572656654797065644d656d566965772f636f7079546f202d20496e76616c696420706f696e74657220646572656654797065644d656d566965772f696e646578202d204f76657272616e2074686520766965772e20536c696365206973206174203078a2646970667358221220b7f7fb5870cb374ae8e06ac516fb3cc103c9aac189c31e966a995f7a525a8ae864736f6c63430007060033";

export class Replica__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _localDomain: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<Replica> {
    return super.deploy(_localDomain, overrides || {}) as Promise<Replica>;
  }
  getDeployTransaction(
    _localDomain: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_localDomain, overrides || {});
  }
  attach(address: string): Replica {
    return super.attach(address) as Replica;
  }
  connect(signer: Signer): Replica__factory {
    return super.connect(signer) as Replica__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ReplicaInterface {
    return new utils.Interface(_abi) as ReplicaInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): Replica {
    return new Contract(address, _abi, signerOrProvider) as Replica;
  }
}
