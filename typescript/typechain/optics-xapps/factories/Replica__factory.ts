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
        name: "nonce",
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
    name: "committedRoot",
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
        name: "_committedRoot",
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
  "0x60a060405234801561001057600080fd5b5060405161293c38038061293c8339818101604052602081101561003357600080fd5b505160e081901b6001600160e01b03191660805263ffffffff166128d361006960003980610a0d5280610a4552506128d36000f3fe608060405234801561001057600080fd5b50600436106101365760003560e01c80638d3638f4116100b2578063b31c01fb11610081578063d88beda211610066578063d88beda214610529578063df034cd014610531578063e7e7a7b71461056257610136565b8063b31c01fb1461046f578063c19d93fb1461052157610136565b80638d3638f414610383578063928bc4b2146103a4578063961681dc1461044a578063a3f81d681461045257610136565b806339992668116101095780636188af0e116100ee5780636188af0e146102b057806367a6771d1461035e57806371bfb7b81461036657610136565b806339992668146102a057806345630b1a146102a857610136565b806319d9d21a1461013b57806325e3beda1461020a5780632bbd59ca14610224578063371d307114610262575b600080fd5b610208600480360360a081101561015157600080fd5b813591602081019181019060808101606082013564010000000081111561017757600080fd5b82018360208201111561018957600080fd5b803590602001918460018302840111640100000000831117156101ab57600080fd5b9193909290916020810190356401000000008111156101c957600080fd5b8201836020820111156101db57600080fd5b803590602001918460018302840111640100000000831117156101fd57600080fd5b5090925090506105ad565b005b61021261080c565b60408051918252519081900360200190f35b6102416004803603602081101561023a57600080fd5b5035610812565b6040518082600281111561025157fe5b815260200191505060405180910390f35b61028c600480360361044081101561027957600080fd5b5080359060208101906104200135610827565b604080519115158252519081900360200190f35b610212610947565b61021261094d565b61020860048036036104408110156102c757600080fd5b8101906020810181356401000000008111156102e257600080fd5b8201836020820111156102f457600080fd5b8035906020019184600183028401116401000000008311171561031657600080fd5b91908080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525092955092935050506104008201359050610967565b6102126109f3565b6102126004803603602081101561037c57600080fd5b50356109f9565b61038b610a0b565b6040805163ffffffff9092168252519081900360200190f35b61028c600480360360208110156103ba57600080fd5b8101906020810181356401000000008111156103d557600080fd5b8201836020820111156103e757600080fd5b8035906020019184600183028401116401000000008311171561040957600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610a2f945050505050565b61038b6110e1565b61028c6004803603602081101561046857600080fd5b50356110ed565b6102086004803603606081101561048557600080fd5b8135916020810135918101906060810160408201356401000000008111156104ac57600080fd5b8201836020820111156104be57600080fd5b803590602001918460018302840111640100000000831117156104e057600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550611116945050505050565b610241611366565b610212611389565b610539611390565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b6102086004803603608081101561057857600080fd5b5063ffffffff8135169073ffffffffffffffffffffffffffffffffffffffff60208201351690604081013590606001356113b2565b6002600054760100000000000000000000000000000000000000000000900460ff1660028111156105da57fe5b141561064757604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b604080516020601f8601819004810282018101909252848152610689918891883591889088908190840183828082843760009201919091525061154992505050565b80156106d857506106d886866001602002013584848080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525061154992505050565b80156106e957508435602086013514155b15610804576106f66115e1565b7f2c3f60bab4170347826231b75a920b5053941ddebc6eed6fd2c25721648b186f8686868686866040518087815260200186600260200280828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910182810360409081018252810186905290506020810160608201878780828437600083820152601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01690910184810383528581526020019050858580828437600083820152604051601f9091017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169092018290039a509098505050505050505050a15b505050505050565b613a9881565b60356020526000908152604090205460ff1681565b60008060008581526035602052604090205460ff16600281111561084757fe5b146108b357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f214d6573736167655374617475732e4e6f6e6500000000000000000000000000604482015290519081900360640190fd5b60006108e98585602080602002604051908101604052809291908260208002808284376000920191909152508791506115eb9050565b90506108f4816110ed565b1561093a575050600083815260356020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001908117909155610940565b60009150505b9392505050565b60325481565b6031546000906109629063ffffffff16611696565b905090565b61097983805190602001208383610827565b6109e457604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600660248201527f2170726f76650000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b6109ed83610a2f565b50505050565b60015481565b60346020526000908152604090205481565b7f000000000000000000000000000000000000000000000000000000000000000081565b600080610a3c838261170b565b905063ffffffff7f000000000000000000000000000000000000000000000000000000000000000016610a907fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316611731565b63ffffffff1614610b0257604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f2164657374696e6174696f6e0000000000000000000000000000000000000000604482015290519081900360640190fd5b6000610b2f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316611762565b9050600160008281526035602052604090205460ff166002811115610b5057fe5b14610bbc57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600760248201527f2170726f76656e00000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b60335460ff16600114610c3057604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600a60248201527f217265656e7472616e7400000000000000000000000000000000000000000000604482015290519081900360640190fd5b603380547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00908116909155600082815260356020526040902080549091166002179055620d32e85a1015610ce757604080517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048083019190915260248201527f2167617300000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b6000610d147fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000084166117a1565b9050606073ffffffffffffffffffffffffffffffffffffffff8216620cf850610d5e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000087166117b4565b610d897fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000088166117e4565b610dde610db77fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008a16611815565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016611886565b604051602401808463ffffffff16815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b83811015610e30578181015183820152602001610e18565b50505050905090810190601f168015610e5d5780820380516001836020036101000a031916815260200191505b50604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529181526020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167f56d5d47500000000000000000000000000000000000000000000000000000000178152905182519297509550859450925090508083835b60208310610f2557805182527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe09092019160209182019101610ee8565b6001836020036101000a03801982511681845116808217855250505050505090500191505060006040518083038160008787f1925050503d8060008114610f88576040519150601f19603f3d011682016040523d82523d6000602084013e610f8d565b606091505b5090955090508415610fc95760405183907fdc8a2c27342659cbe87c6c49e4515c64faa8c97ba6a2f260cbf33d84d7bd832090600090a26110ac565b73ffffffffffffffffffffffffffffffffffffffff821661100b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000086166118ca565b63ffffffff16847fdffcee52db78cb2d1f525b8d7edd630ea062884e733aa26c201d7ce1843eccab846040518080602001828103825283818151815260200191508051906020019080838360005b83811015611071578181015183820152602001611059565b50505050905090810190601f16801561109e5780820380516001836020036101000a031916815260200191505b509250505060405180910390a45b5050603380547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055509092915050565b60315463ffffffff1681565b6000818152603460205260408120548061110b576000915050611111565b42101590505b919050565b6002600054760100000000000000000000000000000000000000000000900460ff16600281111561114357fe5b14156111b057604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f6661696c65642073746174650000000000000000000000000000000000000000604482015290519081900360640190fd5b600154831461122057604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601260248201527f6e6f742063757272656e74207570646174650000000000000000000000000000604482015290519081900360640190fd5b61122b838383611549565b61129657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600c60248201527f2175706461746572207369670000000000000000000000000000000000000000604482015290519081900360640190fd5b61129e6115e9565b6032546000838152603460209081526040808320429094019093556001859055603154835182815285518184015285518795899563ffffffff909416947f608828ad904a0c9250c09004ba7226efb08f35a5c815bb3f76b5a8a271cd08b29489949384938401928601918190849084905b8381101561132757818101518382015260200161130f565b50505050905090810190601f1680156113545780820380516001836020036101000a031916815260200191505b509250505060405180910390a4505050565b600054760100000000000000000000000000000000000000000000900460ff1681565b620cf85081565b60005462010000900473ffffffffffffffffffffffffffffffffffffffff1681565b600054610100900460ff16806113cb57506113cb6118fb565b806113d9575060005460ff16155b61142e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e81526020018061278c602e913960400191505060405180910390fd5b600054610100900460ff1615801561149457600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b61149d8461190c565b6033805460017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff009091168117909155603180547fffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000001663ffffffff88161790558381556000848152603460205260409020556032829055801561154257600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff1690555b5050505050565b60008061155461094d565b858560405160200180848152602001838152602001828152602001935050505060405160208183030381529060405280519060200120905061159581611aa1565b60005490915062010000900473ffffffffffffffffffffffffffffffffffffffff166115c18285611af2565b73ffffffffffffffffffffffffffffffffffffffff161495945050505050565b6115e9611b8c565b565b8260005b602081101561168e57600183821c16600085836020811061160c57fe5b6020020151905081600114156116525780846040516020018083815260200182815260200192505050604051602081830303815290604052805190602001209350611684565b838160405160200180838152602001828152602001925050506040516020818303038152906040528051906020012093505b50506001016115ef565b509392505050565b6040805160e09290921b7fffffffff00000000000000000000000000000000000000000000000000000000166020808401919091527f4f5054494353000000000000000000000000000000000000000000000000000060248401528151808403600a018152602a909301909152815191012090565b81516000906020840161172664ffffffffff85168284611bcf565b925050505b92915050565b600061172b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000831660286004611c2e565b60008061176e83611c4f565b6bffffffffffffffffffffffff169050600061178984611c63565b6bffffffffffffffffffffffff169091209392505050565b600061172b6117af83611c77565b611ca8565b600061172b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316826004611c2e565b600061172b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000831660046020611cab565b600061172b604c806118487fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008616611c63565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000861692916bffffffffffffffffffffffff91909116036000611e56565b606060008061189484611c63565b6bffffffffffffffffffffffff16905060405191508192506118b98483602001611ee8565b508181016020016040529052919050565b600061172b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000831660246004611c2e565b600061190630612014565b15905090565b600054610100900460ff168061192557506119256118fb565b80611933575060005460ff16155b611988576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602e81526020018061278c602e913960400191505060405180910390fd5b600054610100900460ff161580156119ee57600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff909116610100171660011790555b600080547fffffffffffffffffffff0000000000000000000000000000000000000000ffff166201000073ffffffffffffffffffffffffffffffffffffffff851602177fffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffffffff167601000000000000000000000000000000000000000000001790558015611a9d57600080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ff1690555b5050565b604080517f19457468657265756d205369676e6564204d6573736167653a0a333200000000602080830191909152603c8083019490945282518083039094018452605c909101909152815191012090565b60008151604114611b6457604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e67746800604482015290519081900360640190fd5b60208201516040830151606084015160001a611b828682858561201a565b9695505050505050565b600080547fffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffffffff16760200000000000000000000000000000000000000000000179055565b600080611bdc8484612208565b9050604051811115611bec575060005b80611c1a577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000915050610940565b611c2585858561227a565b95945050505050565b60008160200360080260ff16611c45858585611cab565b901c949350505050565b60781c6bffffffffffffffffffffffff1690565b60181c6bffffffffffffffffffffffff1690565b600061172b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316602c6020611cab565b90565b600060ff8216611cbd57506000610940565b611cc684611c63565b6bffffffffffffffffffffffff16611ce18460ff8516612208565b1115611dc057611d22611cf385611c4f565b6bffffffffffffffffffffffff16611d0a86611c63565b6bffffffffffffffffffffffff16858560ff1661228d565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b83811015611d85578181015183820152602001611d6d565b50505050905090810190601f168015611db25780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b60208260ff161115611e1d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603a8152602001806127dc603a913960400191505060405180910390fd5b600882026000611e2c86611c4f565b6bffffffffffffffffffffffff1690506000611e47836123e8565b91909501511695945050505050565b600080611e6286611c4f565b6bffffffffffffffffffffffff169050611e7b86612431565b611e8f85611e898489612208565b90612208565b1115611ebe577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000915050611ee0565b611ec88186612208565b9050611edc8364ffffffffff168286611bcf565b9150505b949350505050565b6000611ef38361245b565b611f48576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260288152602001806128166028913960400191505060405180910390fd5b611f518361246d565b611fa6576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602b81526020018061283e602b913960400191505060405180910390fd5b6000611fb184611c63565b6bffffffffffffffffffffffff1690506000611fcc85611c4f565b6bffffffffffffffffffffffff1690506000604051905084811115611ff15760206060fd5b8285848460045afa50611b82612006876124aa565b64ffffffffff16868561227a565b3b151590565b60007f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0821115612095576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806127496022913960400191505060405180910390fd5b8360ff16601b14806120aa57508360ff16601c145b6120ff576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806127ba6022913960400191505060405180910390fd5b600060018686868660405160008152602001604052604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa15801561215b573d6000803e3d6000fd5b50506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0015191505073ffffffffffffffffffffffffffffffffffffffff8116611c2557604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f45434453413a20696e76616c6964207369676e61747572650000000000000000604482015290519081900360640190fd5b8181018281101561172b57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f4f766572666c6f7720647572696e67206164646974696f6e2e00000000000000604482015290519081900360640190fd5b606092831b9190911790911b1760181b90565b6060600061229a866124b0565b91505060006122a8866124b0565b91505060006122b6866124b0565b91505060006122c4866124b0565b915050838383836040516020018080612869603591397fffffffffffff000000000000000000000000000000000000000000000000000060d087811b821660358401527f2077697468206c656e6774682030780000000000000000000000000000000000603b84015286901b16604a820152605001602161276b82397fffffffffffff000000000000000000000000000000000000000000000000000060d094851b811660218301527f2077697468206c656e677468203078000000000000000000000000000000000060278301529290931b9091166036830152507f2e00000000000000000000000000000000000000000000000000000000000000603c82015260408051601d818403018152603d90920190529b9a5050505050505050505050565b7f80000000000000000000000000000000000000000000000000000000000000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9091011d90565b600061243c82611c63565b61244583611c4f565b016bffffffffffffffffffffffff169050919050565b600061246682612584565b1592915050565b6000612478826124aa565b64ffffffffff1664ffffffffff141561249357506000611111565b600061249e83612431565b60405110199392505050565b60d81c90565b600080601f5b600f8160ff1611156125185760ff600882021684901c6124d5816125ac565b61ffff16841793508160ff166010146124f057601084901b93505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff016124b6565b50600f5b60ff8160ff16101561257e5760ff600882021684901c61253b816125ac565b61ffff16831792508160ff1660001461255657601083901b92505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0161251c565b50915091565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000009081161490565b60006125be60048360ff16901c6125dc565b60ff161760081b62ffff00166125d3826125dc565b60ff1617919050565b600060f08083179060ff821614156125f8576030915050611111565b8060ff1660f1141561260e576031915050611111565b8060ff1660f21415612624576032915050611111565b8060ff1660f3141561263a576033915050611111565b8060ff1660f41415612650576034915050611111565b8060ff1660f51415612666576035915050611111565b8060ff1660f6141561267c576036915050611111565b8060ff1660f71415612692576037915050611111565b8060ff1660f814156126a8576038915050611111565b8060ff1660f914156126be576039915050611111565b8060ff1660fa14156126d4576061915050611111565b8060ff1660fb14156126ea576062915050611111565b8060ff1660fc1415612700576063915050611111565b8060ff1660fd1415612716576064915050611111565b8060ff1660fe141561272c576065915050611111565b8060ff1660ff1415612742576066915050611111565b5091905056fe45434453413a20696e76616c6964207369676e6174757265202773272076616c75652e20417474656d7074656420746f20696e646578206174206f6666736574203078496e697469616c697a61626c653a20636f6e747261637420697320616c726561647920696e697469616c697a656445434453413a20696e76616c6964207369676e6174757265202776272076616c756554797065644d656d566965772f696e646578202d20417474656d7074656420746f20696e646578206d6f7265207468616e20333220627974657354797065644d656d566965772f636f7079546f202d204e756c6c20706f696e74657220646572656654797065644d656d566965772f636f7079546f202d20496e76616c696420706f696e74657220646572656654797065644d656d566965772f696e646578202d204f76657272616e2074686520766965772e20536c696365206973206174203078a264697066735822122018732c383e614a1affb8e7539549bd404eb695b1d3f8a895b99531b3ad4ee55564736f6c63430007060033";

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
