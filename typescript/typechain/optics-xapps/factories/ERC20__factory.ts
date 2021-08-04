/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { ERC20, ERC20Interface } from "../ERC20";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
    ],
    name: "allowance",
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
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "approve",
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
        internalType: "address",
        name: "_account",
        type: "address",
      },
    ],
    name: "balanceOf",
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
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseAllowance",
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
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_addedValue",
        type: "uint256",
      },
    ],
    name: "increaseAllowance",
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
    inputs: [],
    name: "totalSupply",
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
        internalType: "address",
        name: "_recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "transfer",
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
        internalType: "address",
        name: "_sender",
        type: "address",
      },
      {
        internalType: "address",
        name: "_recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
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
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5061096d806100206000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c806370a082311161005b57806370a0823114610170578063a457c2d7146101a3578063a9059cbb146101dc578063dd62ed3e1461021557610088565b8063095ea7b31461008d57806318160ddd146100da57806323b872dd146100f45780633950935114610137575b600080fd5b6100c6600480360360408110156100a357600080fd5b5073ffffffffffffffffffffffffffffffffffffffff8135169060200135610250565b604080519115158252519081900360200190f35b6100e2610266565b60408051918252519081900360200190f35b6100c66004803603606081101561010a57600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81358116916020810135909116906040013561026c565b6100c66004803603604081101561014d57600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81351690602001356102e2565b6100e26004803603602081101561018657600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16610325565b6100c6600480360360408110156101b957600080fd5b5073ffffffffffffffffffffffffffffffffffffffff813516906020013561034d565b6100c6600480360360408110156101f257600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81351690602001356103a9565b6100e26004803603604081101561022b57600080fd5b5073ffffffffffffffffffffffffffffffffffffffff813581169160200135166103b6565b600061025d3384846103ee565b50600192915050565b60025490565b6000610279848484610535565b6102d884336102d3856040518060600160405280602881526020016108a26028913973ffffffffffffffffffffffffffffffffffffffff8a1660009081526001602090815260408083203384529091529020549190610705565b6103ee565b5060019392505050565b33600081815260016020908152604080832073ffffffffffffffffffffffffffffffffffffffff87168452909152812054909161025d9185906102d390866107b6565b73ffffffffffffffffffffffffffffffffffffffff1660009081526020819052604090205490565b600061025d33846102d3856040518060600160405280602581526020016109136025913933600090815260016020908152604080832073ffffffffffffffffffffffffffffffffffffffff8d1684529091529020549190610705565b600061025d338484610535565b73ffffffffffffffffffffffffffffffffffffffff918216600090815260016020908152604080832093909416825291909152205490565b73ffffffffffffffffffffffffffffffffffffffff831661045a576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260248152602001806108ef6024913960400191505060405180910390fd5b73ffffffffffffffffffffffffffffffffffffffff82166104c6576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602281526020018061085a6022913960400191505060405180910390fd5b73ffffffffffffffffffffffffffffffffffffffff808416600081815260016020908152604080832094871680845294825291829020859055815185815291517f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259281900390910190a3505050565b73ffffffffffffffffffffffffffffffffffffffff83166105a1576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260258152602001806108ca6025913960400191505060405180910390fd5b73ffffffffffffffffffffffffffffffffffffffff821661060d576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260238152602001806108376023913960400191505060405180910390fd5b610618838383610831565b6106628160405180606001604052806026815260200161087c6026913973ffffffffffffffffffffffffffffffffffffffff86166000908152602081905260409020549190610705565b73ffffffffffffffffffffffffffffffffffffffff808516600090815260208190526040808220939093559084168152205461069e90826107b6565b73ffffffffffffffffffffffffffffffffffffffff8084166000818152602081815260409182902094909455805185815290519193928716927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a3505050565b600081848411156107ae576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b8381101561077357818101518382015260200161075b565b50505050905090810190601f1680156107a05780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b505050900390565b60008282018381101561082a57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601b60248201527f536166654d6174683a206164646974696f6e206f766572666c6f770000000000604482015290519081900360640190fd5b9392505050565b50505056fe45524332303a207472616e7366657220746f20746865207a65726f206164647265737345524332303a20617070726f766520746f20746865207a65726f206164647265737345524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e636545524332303a207472616e7366657220616d6f756e74206578636565647320616c6c6f77616e636545524332303a207472616e736665722066726f6d20746865207a65726f206164647265737345524332303a20617070726f76652066726f6d20746865207a65726f206164647265737345524332303a2064656372656173656420616c6c6f77616e63652062656c6f77207a65726fa2646970667358221220ca8462f7bc6d55e6ef7d182c95d6ee0eee40dcca8d142cc030f2e10c21fe19d564736f6c63430007060033";

export class ERC20__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ERC20> {
    return super.deploy(overrides || {}) as Promise<ERC20>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): ERC20 {
    return super.attach(address) as ERC20;
  }
  connect(signer: Signer): ERC20__factory {
    return super.connect(signer) as ERC20__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ERC20Interface {
    return new utils.Interface(_abi) as ERC20Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): ERC20 {
    return new Contract(address, _abi, signerOrProvider) as ERC20;
  }
}
