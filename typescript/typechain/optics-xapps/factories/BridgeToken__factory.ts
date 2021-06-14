/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { BridgeToken, BridgeTokenInterface } from "../BridgeToken";

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
        name: "_from",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amnt",
        type: "uint256",
      },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
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
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amnt",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
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
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_newName",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "_newSymbol",
        type: "bytes32",
      },
      {
        internalType: "uint8",
        name: "_newDecimals",
        type: "uint8",
      },
    ],
    name: "setDetails",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
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
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50600061001b61006a565b600080546001600160a01b0319166001600160a01b0383169081178255604051929350917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a35061006e565b3390565b6117228061007d6000396000f3fe608060405234801561001057600080fd5b506004361061011b5760003560e01c8063715018a6116100b2578063a457c2d711610081578063d20cdd5f11610066578063d20cdd5f146103f8578063dd62ed3e14610424578063f2fde38b1461045f5761011b565b8063a457c2d714610386578063a9059cbb146103bf5761011b565b8063715018a61461030c5780638da5cb5b1461031457806395d89b41146103455780639dc29fac1461034d5761011b565b8063313ce567116100ee578063313ce56714610247578063395093511461026557806340c10f191461029e57806370a08231146102d95761011b565b806306fdde0314610120578063095ea7b31461019d57806318160ddd146101ea57806323b872dd14610204575b600080fd5b610128610492565b6040805160208082528351818301528351919283929083019185019080838360005b8381101561016257818101518382015260200161014a565b50505050905090810190601f16801561018f5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6101d6600480360360408110156101b357600080fd5b5073ffffffffffffffffffffffffffffffffffffffff8135169060200135610546565b604080519115158252519081900360200190f35b6101f2610563565b60408051918252519081900360200190f35b6101d66004803603606081101561021a57600080fd5b5073ffffffffffffffffffffffffffffffffffffffff813581169160208101359091169060400135610569565b61024f61060a565b6040805160ff9092168252519081900360200190f35b6101d66004803603604081101561027b57600080fd5b5073ffffffffffffffffffffffffffffffffffffffff8135169060200135610613565b6102d7600480360360408110156102b457600080fd5b5073ffffffffffffffffffffffffffffffffffffffff813516906020013561066e565b005b6101f2600480360360208110156102ef57600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16610724565b6102d761074c565b61031c610863565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b61012861087f565b6102d76004803603604081101561036357600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81351690602001356108fe565b6101d66004803603604081101561039c57600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81351690602001356109b0565b6101d6600480360360408110156103d557600080fd5b5073ffffffffffffffffffffffffffffffffffffffff8135169060200135610a25565b6102d76004803603606081101561040e57600080fd5b508035906020810135906040013560ff16610a39565b6101f26004803603604081101561043a57600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81358116916020013516610b53565b6102d76004803603602081101561047557600080fd5b503573ffffffffffffffffffffffffffffffffffffffff16610b8b565b60048054604080516020601f60027fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff61010060018816150201909516949094049384018190048102820181019092528281526060939092909183018282801561053c5780601f106105115761010080835404028352916020019161053c565b820191906000526020600020905b81548152906001019060200180831161051f57829003601f168201915b5050505050905090565b600061055a610553610d2c565b8484610d30565b50600192915050565b60035490565b6000610576848484610e77565b61060084610582610d2c565b6105fb856040518060600160405280602881526020016116366028913973ffffffffffffffffffffffffffffffffffffffff8a166000908152600260205260408120906105cd610d2c565b73ffffffffffffffffffffffffffffffffffffffff1681526020810191909152604001600020549190611049565b610d30565b5060019392505050565b60065460ff1690565b600061055a610620610d2c565b846105fb8560026000610631610d2c565b73ffffffffffffffffffffffffffffffffffffffff908116825260208083019390935260409182016000908120918c1681529252902054906110fa565b610676610d2c565b73ffffffffffffffffffffffffffffffffffffffff16610694610863565b73ffffffffffffffffffffffffffffffffffffffff161461071657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b6107208282611175565b5050565b73ffffffffffffffffffffffffffffffffffffffff1660009081526001602052604090205490565b610754610d2c565b73ffffffffffffffffffffffffffffffffffffffff16610772610863565b73ffffffffffffffffffffffffffffffffffffffff16146107f457604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b6000805460405173ffffffffffffffffffffffffffffffffffffffff909116907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a3600080547fffffffffffffffffffffffff0000000000000000000000000000000000000000169055565b60005473ffffffffffffffffffffffffffffffffffffffff1690565b60058054604080516020601f60027fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff61010060018816150201909516949094049384018190048102820181019092528281526060939092909183018282801561053c5780601f106105115761010080835404028352916020019161053c565b610906610d2c565b73ffffffffffffffffffffffffffffffffffffffff16610924610863565b73ffffffffffffffffffffffffffffffffffffffff16146109a657604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b61072082826112a8565b600061055a6109bd610d2c565b846105fb856040518060600160405280602581526020016116c860259139600260006109e7610d2c565b73ffffffffffffffffffffffffffffffffffffffff908116825260208083019390935260409182016000908120918d16815292529020549190611049565b600061055a610a32610d2c565b8484610e77565b610a41610d2c565b73ffffffffffffffffffffffffffffffffffffffff16610a5f610863565b73ffffffffffffffffffffffffffffffffffffffff1614610ae157604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b610aea836113f2565b8051610afe916004916020909101906114e1565b50610b08826113f2565b8051610b1c916005916020909101906114e1565b50600680547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660ff929092169190911790555050565b73ffffffffffffffffffffffffffffffffffffffff918216600090815260026020908152604080832093909416825291909152205490565b610b93610d2c565b73ffffffffffffffffffffffffffffffffffffffff16610bb1610863565b73ffffffffffffffffffffffffffffffffffffffff1614610c3357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015290519081900360640190fd5b73ffffffffffffffffffffffffffffffffffffffff8116610c9f576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260268152602001806115c86026913960400191505060405180910390fd5b6000805460405173ffffffffffffffffffffffffffffffffffffffff808516939216917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e091a3600080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b3390565b73ffffffffffffffffffffffffffffffffffffffff8316610d9c576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260248152602001806116a46024913960400191505060405180910390fd5b73ffffffffffffffffffffffffffffffffffffffff8216610e08576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806115ee6022913960400191505060405180910390fd5b73ffffffffffffffffffffffffffffffffffffffff808416600081815260026020908152604080832094871680845294825291829020859055815185815291517f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259281900390910190a3505050565b73ffffffffffffffffffffffffffffffffffffffff8316610ee3576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602581526020018061167f6025913960400191505060405180910390fd5b73ffffffffffffffffffffffffffffffffffffffff8216610f4f576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260238152602001806115836023913960400191505060405180910390fd5b610f5a838383611465565b610fa4816040518060600160405280602681526020016116106026913973ffffffffffffffffffffffffffffffffffffffff86166000908152600160205260409020549190611049565b73ffffffffffffffffffffffffffffffffffffffff8085166000908152600160205260408082209390935590841681522054610fe090826110fa565b73ffffffffffffffffffffffffffffffffffffffff80841660008181526001602090815260409182902094909455805185815290519193928716927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a3505050565b600081848411156110f2576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b838110156110b757818101518382015260200161109f565b50505050905090810190601f1680156110e45780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b505050900390565b60008282018381101561116e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601b60248201527f536166654d6174683a206164646974696f6e206f766572666c6f770000000000604482015290519081900360640190fd5b9392505050565b73ffffffffffffffffffffffffffffffffffffffff82166111f757604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f206164647265737300604482015290519081900360640190fd5b61120360008383611465565b60035461121090826110fa565b60035573ffffffffffffffffffffffffffffffffffffffff821660009081526001602052604090205461124390826110fa565b73ffffffffffffffffffffffffffffffffffffffff831660008181526001602090815260408083209490945583518581529351929391927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9281900390910190a35050565b73ffffffffffffffffffffffffffffffffffffffff8216611314576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602181526020018061165e6021913960400191505060405180910390fd5b61132082600083611465565b61136a816040518060600160405280602281526020016115a66022913973ffffffffffffffffffffffffffffffffffffffff85166000908152600160205260409020549190611049565b73ffffffffffffffffffffffffffffffffffffffff831660009081526001602052604090205560035461139d908261146a565b60035560408051828152905160009173ffffffffffffffffffffffffffffffffffffffff8516917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9181900360200190a35050565b606060005b60208160ff1610801561143d5750828160ff166020811061141457fe5b1a60f81b7fff000000000000000000000000000000000000000000000000000000000000001615155b1561144a576001016113f7565b60405191506040820160405280825282602083015250919050565b505050565b6000828211156114db57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601e60248201527f536166654d6174683a207375627472616374696f6e206f766572666c6f770000604482015290519081900360640190fd5b50900390565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282611517576000855561155d565b82601f1061153057805160ff191683800117855561155d565b8280016001018555821561155d579182015b8281111561155d578251825591602001919060010190611542565b5061156992915061156d565b5090565b5b80821115611569576000815560010161156e56fe45524332303a207472616e7366657220746f20746865207a65726f206164647265737345524332303a206275726e20616d6f756e7420657863656564732062616c616e63654f776e61626c653a206e6577206f776e657220697320746865207a65726f206164647265737345524332303a20617070726f766520746f20746865207a65726f206164647265737345524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e636545524332303a207472616e7366657220616d6f756e74206578636565647320616c6c6f77616e636545524332303a206275726e2066726f6d20746865207a65726f206164647265737345524332303a207472616e736665722066726f6d20746865207a65726f206164647265737345524332303a20617070726f76652066726f6d20746865207a65726f206164647265737345524332303a2064656372656173656420616c6c6f77616e63652062656c6f77207a65726fa26469706673582212203ec0fa804943dd1a7d50b6af6e96e87d6765f46c78e42300a04af6f5036a5a4a64736f6c63430007060033";

export class BridgeToken__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<BridgeToken> {
    return super.deploy(overrides || {}) as Promise<BridgeToken>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): BridgeToken {
    return super.attach(address) as BridgeToken;
  }
  connect(signer: Signer): BridgeToken__factory {
    return super.connect(signer) as BridgeToken__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): BridgeTokenInterface {
    return new utils.Interface(_abi) as BridgeTokenInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): BridgeToken {
    return new Contract(address, _abi, signerOrProvider) as BridgeToken;
  }
}
