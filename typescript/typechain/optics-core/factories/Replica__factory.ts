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
  "0x60a060405234801561001057600080fd5b506040516131e23803806131e28339818101604052602081101561003357600080fd5b505160e081901b6001600160e01b03191660805263ffffffff1661317961006960003980610ce85280610d7e52506131796000f3fe608060405234801561001057600080fd5b50600436106101985760003560e01c8063928bc4b2116100e3578063ba739a621161008c578063df034cd011610066578063df034cd0146105e9578063e7e7a7b71461061a578063f6d161021461066557610198565b8063ba739a62146105b8578063c19d93fb146105d9578063d88beda2146105e157610198565b8063a3f81d68116100bd578063a3f81d68146104e1578063ab91c7b0146104fe578063b31c01fb1461050657610198565b8063928bc4b21461042b578063961681dc146104d15780639fa6a6e3146104d957610198565b806339992668116101455780637022b58e1161011f5780637022b58e146103e557806371bfb7b8146103ed5780638d3638f41461040a57610198565b8063399926681461032757806345630b1a1461032f5780636188af0e1461033757610198565b80632bbd59ca116101765780632bbd59ca146102a25780632bef2892146102e0578063371d3071146102fd57610198565b806314cfabb31461019d57806319d9d21a146101b957806325e3beda14610288575b600080fd5b6101a561066d565b604080519115158252519081900360200190f35b610286600480360360a08110156101cf57600080fd5b81359160208101918101906080810160608201356401000000008111156101f557600080fd5b82018360208201111561020757600080fd5b8035906020019184600183028401116401000000008311171561022957600080fd5b91939092909160208101903564010000000081111561024757600080fd5b82018360208201111561025957600080fd5b8035906020019184600183028401116401000000008311171561027b57600080fd5b509092509050610699565b005b6102906108f6565b60408051918252519081900360200190f35b6102bf600480360360208110156102b857600080fd5b50356108fc565b604051808260028111156102cf57fe5b815260200191505060405180910390f35b6101a5600480360360208110156102f657600080fd5b5035610911565b6101a5600480360361044081101561031457600080fd5b5080359060208101906104200135610926565b610290610a46565b610290610a4c565b610286600480360361044081101561034e57600080fd5b81019060208101813564010000000081111561036957600080fd5b82018360208201111561037b57600080fd5b8035906020019184600183028401116401000000008311171561039d57600080fd5b91908080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525092955092935050506104008201359050610a61565b610286610aed565b6102906004803603602081101561040357600080fd5b5035610cd4565b610412610ce6565b6040805163ffffffff9092168252519081900360200190f35b6101a56004803603602081101561044157600080fd5b81019060208101813564010000000081111561045c57600080fd5b82018360208201111561046e57600080fd5b8035906020019184600183028401116401000000008311171561049057600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610d0a945050505050565b6104126113c2565b6102906113ce565b6101a5600480360360208110156104f757600080fd5b50356113d4565b6102906113fb565b6102866004803603606081101561051c57600080fd5b81359160208101359181019060608101604082013564010000000081111561054357600080fd5b82018360208201111561055557600080fd5b8035906020019184600183028401116401000000008311171561057757600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550611407945050505050565b6105c06116eb565b6040805192835260208301919091528051918290030190f35b6102bf611739565b61029061175a565b6105f1611761565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b6102866004803603608081101561063057600080fd5b5063ffffffff8135169073ffffffffffffffffffffffffffffffffffffffff602082013516906040810135906060013561177d565b610290611916565b60006106796001611922565b15801590610694575061069461068f6001611962565b6113d4565b905090565b600260345474010000000000000000000000000000000000000000900460ff1660028111156106c457fe5b141561073157604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b604080516020601f86018190048102820181019092528481526107739188918835918890889081908401838280828437600092019190915250611a0392505050565b80156107c257506107c286866001602002013584848080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250611a0392505050565b80156107d357508435602086013514155b156108ee576107e0611a95565b7f2c3f60bab4170347826231b75a920b5053941ddebc6eed6fd2c25721648b186f8686868686866040518087815260200186600260200280828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910182810360409081018252810186905290506020810160608201878780828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910184810383528581526020019050858580828437600083820152604051601f9091017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169092018290039a509098505050505050505050a15b505050505050565b613a9881565b60696020526000908152604090205460ff1681565b600061091e600183611a9f565b90505b919050565b60008060008581526069602052604090205460ff16600281111561094657fe5b146109b257604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f214d6573736167655374617475732e4e6f6e6500000000000000000000000000604482015290519081900360640190fd5b60006109e8858560208060200260405190810160405280929190826020800280828437600092019190915250879150611b1b9050565b90506109f3816113d4565b15610a39575050600083815260696020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001908117909155610a3f565b60009150505b9392505050565b60665481565b6065546000906106949063ffffffff16611bc6565b610a7383805190602001208383610926565b610ade57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600660248201527f2170726f76650000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b610ae783610d0a565b50505050565b600260345474010000000000000000000000000000000000000000900460ff166002811115610b1857fe5b1415610b8557604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b610b8f6001611922565b610bfa57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600860248201527f2170656e64696e67000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b600080610c076001611922565b90505b600081118015610c225750610c2261068f6001611962565b15610c5a57610c316001611c3b565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01610c0a565b81610cc657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600560248201527f2174696d65000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b610cce611a9d565b50603555565b60676020526000908152604090205481565b7f000000000000000000000000000000000000000000000000000000000000000081565b600080610d178382611d74565b90506000610d467fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316611d98565b90506000610d757fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008416611dd7565b905063ffffffff7f000000000000000000000000000000000000000000000000000000000000000016610dc97fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008516611e08565b63ffffffff1614610e3b57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f2164657374696e6174696f6e0000000000000000000000000000000000000000604482015290519081900360640190fd5b600160008381526069602052604090205460ff166002811115610e5a57fe5b14610ec657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600860248201527f2170656e64696e67000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b60685460ff16600114610f3a57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600a60248201527f217265656e7472616e7400000000000000000000000000000000000000000000604482015290519081900360640190fd5b606880547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00908116909155600083815260696020526040902080549091166002179055620d32e85a1015610ff157604080517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048083019190915260248201527f2167617300000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b600061101e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008516611e39565b9050606073ffffffffffffffffffffffffffffffffffffffff8216620cf8506110687fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008816611e4c565b6110937fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008916611e7c565b6110e86110c17fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008b16611ead565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016611f1e565b604051602401808463ffffffff16815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b8381101561113a578181015183820152602001611122565b50505050905090810190601f1680156111675780820380516001836020036101000a031916815260200191505b50604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529181526020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167f56d5d47500000000000000000000000000000000000000000000000000000000178152905182519297509550859450925090508083835b6020831061122f57805182527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe090920191602091820191016111f2565b6001836020036101000a03801982511681845116808217855250505050505090500191505060006040518083038160008787f1925050503d8060008114611292576040519150601f19603f3d011682016040523d82523d6000602084013e611297565b606091505b50909650905085156112d35760405184907fdc8a2c27342659cbe87c6c49e4515c64faa8c97ba6a2f260cbf33d84d7bd832090600090a261138c565b8173ffffffffffffffffffffffffffffffffffffffff168363ffffffff16857fdffcee52db78cb2d1f525b8d7edd630ea062884e733aa26c201d7ce1843eccab846040518080602001828103825283818151815260200191508051906020019080838360005b83811015611351578181015183820152602001611339565b50505050905090810190601f16801561137e5780820380516001836020036101000a031916815260200191505b509250505060405180910390a45b5050606880547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0016600117905550919392505050565b60655463ffffffff1681565b60355481565b600081815260676020526040812054806113f2576000915050610921565b42101592915050565b60006106946001611922565b600260345474010000000000000000000000000000000000000000900460ff16600281111561143257fe5b141561149f57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b60006114ab6001611922565b111561152d576114bb6001611f62565b831461152857604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601060248201527f6e6f7420656e64206f6620717565756500000000000000000000000000000000604482015290519081900360640190fd5b61159d565b826035541461159d57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601260248201527f6e6f742063757272656e74207570646174650000000000000000000000000000604482015290519081900360640190fd5b6115a8838383611a03565b61161357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f2175706461746572207369670000000000000000000000000000000000000000604482015290519081900360640190fd5b61161b611a9d565b606654600083815260676020526040902042909101905561163d600183611f9f565b5060655460408051602080825284518183015284518694889463ffffffff909116937f608828ad904a0c9250c09004ba7226efb08f35a5c815bb3f76b5a8a271cd08b2938893919283929083019185019080838360005b838110156116ac578181015183820152602001611694565b50505050905090810190601f1680156116d95780820380516001836020036101000a031916815260200191505b509250505060405180910390a4505050565b6000806116f86001611922565b15611720576117076001611962565b6000818152606760205260409020549092509050611735565b50506035546000818152606760205260409020545b9091565b60345474010000000000000000000000000000000000000000900460ff1681565b620cf85081565b60345473ffffffffffffffffffffffffffffffffffffffff1681565b600054610100900460ff1680611796575061179661200c565b806117a4575060005460ff16155b6117f9576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180613032602e913960400191505060405180910390fd5b600054610100900460ff1615801561185f57600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b6118688461201d565b6068805460017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff009091168117909155606580547fffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000001663ffffffff881617905560358490556000848152606760205260409020556066829055801561190f57600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff1690555b5050505050565b60006106946001611f62565b80546000906fffffffffffffffffffffffffffffffff70010000000000000000000000000000000082048116911661195a82826121b3565b949350505050565b600061196d826121cd565b156119d957604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600560248201527f456d707479000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b5080546fffffffffffffffffffffffffffffffff1660009081526001909101602052604090205490565b600080611a0e610a4c565b8585604051602001808481526020018381526020018281526020019350505050604051602081830303815290604052805190602001209050611a4f816121fc565b60345490915073ffffffffffffffffffffffffffffffffffffffff16611a75828561224d565b73ffffffffffffffffffffffffffffffffffffffff161495945050505050565b611a9d6122e7565b565b81546000906fffffffffffffffffffffffffffffffff165b835470010000000000000000000000000000000090046fffffffffffffffffffffffffffffffff168111611b0f576000818152600185016020526040902054831415611b07576001915050611b15565b600101611ab7565b50600090505b92915050565b8260005b6020811015611bbe57600183821c166000858360208110611b3c57fe5b602002015190508160011415611b825780846040516020018083815260200182815260200192505050604051602081830303815290604052805190602001209350611bb4565b838160405160200180838152602001828152602001925050506040516020818303038152906040528051906020012093505b5050600101611b1f565b509392505050565b6040805160e09290921b7fffffffff00000000000000000000000000000000000000000000000000000000166020808401919091527f4f5054494353000000000000000000000000000000000000000000000000000060248401528151808403600a018152602a909301909152815191012090565b80546000906fffffffffffffffffffffffffffffffff700100000000000000000000000000000000820481169116611c7382826121b3565b611cde57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600560248201527f456d707479000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b6fffffffffffffffffffffffffffffffff8116600090815260018501602052604090205492508215611d2f576fffffffffffffffffffffffffffffffff811660009081526001850160205260408120555b83547fffffffffffffffffffffffffffffffff00000000000000000000000000000000166001919091016fffffffffffffffffffffffffffffffff1617909255919050565b815160009060208401611d8f64ffffffffff85168284612328565b95945050505050565b600080611da48361237e565b6bffffffffffffffffffffffff1690506000611dbf84612392565b6bffffffffffffffffffffffff169091209392505050565b600061091e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316602460046123a6565b600061091e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316602860046123a6565b600061091e611e47836123c7565b6123f8565b600061091e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000083168260046123a6565b600061091e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316600460206123fb565b600061091e604c80611ee07fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008616612392565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000861692916bffffffffffffffffffffffff919091160360006125a6565b6060600080611f2c84612392565b6bffffffffffffffffffffffff1690506040519150819250611f51848360200161262c565b508181016020016040529052919050565b805470010000000000000000000000000000000090046fffffffffffffffffffffffffffffffff1660009081526001909101602052604090205490565b81546fffffffffffffffffffffffffffffffff8082167001000000000000000000000000000000009283900482166001019182169092029190911783558115611b15576fffffffffffffffffffffffffffffffff8116600090815260019390930160205260409092205590565b600061201730612758565b15905090565b600054610100900460ff1680612036575061203661200c565b80612044575060005460ff16155b612099576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180613032602e913960400191505060405180910390fd5b600054610100900460ff161580156120ff57600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b61210761275e565b603480547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff8416177fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff167401000000000000000000000000000000000000000017905580156121af57600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff1690555b5050565b60019103016fffffffffffffffffffffffffffffffff1690565b546fffffffffffffffffffffffffffffffff808216700100000000000000000000000000000000909204161090565b604080517f19457468657265756d205369676e6564204d6573736167653a0a333200000000602080830191909152603c8083019490945282518083039094018452605c909101909152815191012090565b600081516041146122bf57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e67746800604482015290519081900360640190fd5b60208201516040830151606084015160001a6122dd8682858561287c565b9695505050505050565b603480547fffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffff1674020000000000000000000000000000000000000000179055565b6000806123358484612a6a565b9050604051811115612345575060005b80612373577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000915050610a3f565b611d8f858585612adc565b60781c6bffffffffffffffffffffffff1690565b60181c6bffffffffffffffffffffffff1690565b60008160200360080260ff166123bd8585856123fb565b901c949350505050565b600061091e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316602c60206123fb565b90565b600060ff821661240d57506000610a3f565b61241684612392565b6bffffffffffffffffffffffff166124318460ff8516612a6a565b1115612510576124726124438561237e565b6bffffffffffffffffffffffff1661245a86612392565b6bffffffffffffffffffffffff16858560ff16612aef565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b838110156124d55781810151838201526020016124bd565b50505050905090810190601f1680156125025780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b60208260ff16111561256d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603a815260200180613082603a913960400191505060405180910390fd5b60088202600061257c8661237e565b6bffffffffffffffffffffffff169050600061259783612c4a565b91909501511695945050505050565b6000806125b28661237e565b6bffffffffffffffffffffffff1690506125cb86612c93565b6125df856125d98489612a6a565b90612a6a565b111561260e577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000091505061195a565b6126188186612a6a565b90506122dd8364ffffffffff168286612328565b600061263783612cbd565b61268c576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260288152602001806130bc6028913960400191505060405180910390fd5b61269583612ccf565b6126ea576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602b8152602001806130e4602b913960400191505060405180910390fd5b60006126f584612392565b6bffffffffffffffffffffffff16905060006127108561237e565b6bffffffffffffffffffffffff16905060006040519050848111156127355760206060fd5b8285848460045afa506122dd61274a87612d0c565b64ffffffffff168685612adc565b3b151590565b600054610100900460ff1680612777575061277761200c565b80612785575060005460ff16155b6127da576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e815260200180613032602e913960400191505060405180910390fd5b600054610100900460ff1615801561284057600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b61284a6001612d12565b801561287957600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff1690555b50565b60007f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a08211156128f7576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401808060200182810382526022815260200180612fef6022913960400191505060405180910390fd5b8360ff16601b148061290c57508360ff16601c145b612961576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806130606022913960400191505060405180910390fd5b600060018686868660405160008152602001604052604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa1580156129bd573d6000803e3d6000fd5b50506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0015191505073ffffffffffffffffffffffffffffffffffffffff8116611d8f57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f45434453413a20696e76616c6964207369676e61747572650000000000000000604482015290519081900360640190fd5b81810182811015611b1557604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f4f766572666c6f7720647572696e67206164646974696f6e2e00000000000000604482015290519081900360640190fd5b606092831b9190911790911b1760181b90565b60606000612afc86612d56565b9150506000612b0a86612d56565b9150506000612b1886612d56565b9150506000612b2686612d56565b91505083838383604051602001808061310f603591397fffffffffffff000000000000000000000000000000000000000000000000000060d087811b821660358401527f2077697468206c656e6774682030780000000000000000000000000000000000603b84015286901b16604a820152605001602161301182397fffffffffffff000000000000000000000000000000000000000000000000000060d094851b811660218301527f2077697468206c656e677468203078000000000000000000000000000000000060278301529290931b9091166036830152507f2e00000000000000000000000000000000000000000000000000000000000000603c82015260408051601d818403018152603d90920190529b9a5050505050505050505050565b7f80000000000000000000000000000000000000000000000000000000000000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9091011d90565b6000612c9e82612392565b612ca78361237e565b016bffffffffffffffffffffffff169050919050565b6000612cc882612e2a565b1592915050565b6000612cda82612d0c565b64ffffffffff1664ffffffffff1415612cf557506000610921565b6000612d0083612c93565b60405110199392505050565b60d81c90565b80546fffffffffffffffffffffffffffffffff166128795780547fffffffffffffffffffffffffffffffff0000000000000000000000000000000016600117815550565b600080601f5b600f8160ff161115612dbe5760ff600882021684901c612d7b81612e52565b61ffff16841793508160ff16601014612d9657601084901b93505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01612d5c565b50600f5b60ff8160ff161015612e245760ff600882021684901c612de181612e52565b61ffff16831792508160ff16600014612dfc57601083901b92505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01612dc2565b50915091565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000009081161490565b6000612e6460048360ff16901c612e82565b60ff161760081b62ffff0016612e7982612e82565b60ff1617919050565b600060f08083179060ff82161415612e9e576030915050610921565b8060ff1660f11415612eb4576031915050610921565b8060ff1660f21415612eca576032915050610921565b8060ff1660f31415612ee0576033915050610921565b8060ff1660f41415612ef6576034915050610921565b8060ff1660f51415612f0c576035915050610921565b8060ff1660f61415612f22576036915050610921565b8060ff1660f71415612f38576037915050610921565b8060ff1660f81415612f4e576038915050610921565b8060ff1660f91415612f64576039915050610921565b8060ff1660fa1415612f7a576061915050610921565b8060ff1660fb1415612f90576062915050610921565b8060ff1660fc1415612fa6576063915050610921565b8060ff1660fd1415612fbc576064915050610921565b8060ff1660fe1415612fd2576065915050610921565b8060ff1660ff1415612fe8576066915050610921565b5091905056fe45434453413a20696e76616c6964207369676e6174757265202773272076616c75652e20417474656d7074656420746f20696e646578206174206f6666736574203078496e697469616c697a61626c653a20636f6e747261637420697320616c726561647920696e697469616c697a656445434453413a20696e76616c6964207369676e6174757265202776272076616c756554797065644d656d566965772f696e646578202d20417474656d7074656420746f20696e646578206d6f7265207468616e20333220627974657354797065644d656d566965772f636f7079546f202d204e756c6c20706f696e74657220646572656654797065644d656d566965772f636f7079546f202d20496e76616c696420706f696e74657220646572656654797065644d656d566965772f696e646578202d204f76657272616e2074686520766965772e20536c696365206973206174203078a2646970667358221220b997f442025f388c19d3456d0668f22276282ab54bc5aa3d9290a8ffdd154cac64736f6c63430007060033";

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
