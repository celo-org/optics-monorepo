/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  TestBridgeMessage,
  TestBridgeMessageInterface,
} from "../TestBridgeMessage";

const _abi = [
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_message",
        type: "bytes29",
      },
    ],
    name: "testAction",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_action",
        type: "bytes29",
      },
    ],
    name: "testActionType",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_transferAction",
        type: "bytes29",
      },
    ],
    name: "testAmnt",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_detailsAction",
        type: "bytes29",
      },
    ],
    name: "testDecimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_tokenId",
        type: "bytes29",
      },
    ],
    name: "testDomain",
    outputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_tokenId",
        type: "bytes29",
      },
    ],
    name: "testEvmId",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_transferAction",
        type: "bytes29",
      },
    ],
    name: "testEvmRecipient",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_name",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "_symbol",
        type: "bytes32",
      },
      {
        internalType: "uint8",
        name: "_decimals",
        type: "uint8",
      },
    ],
    name: "testFormatDetails",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_tokenId",
        type: "bytes29",
      },
      {
        internalType: "bytes29",
        name: "_action",
        type: "bytes29",
      },
    ],
    name: "testFormatMessage",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "testFormatRequestDetails",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
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
        name: "_id",
        type: "bytes32",
      },
    ],
    name: "testFormatTokenId",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_to",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "_amnt",
        type: "uint256",
      },
    ],
    name: "testFormatTransfer",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_tokenId",
        type: "bytes29",
      },
    ],
    name: "testId",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_action",
        type: "bytes29",
      },
    ],
    name: "testIsDetails",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_action",
        type: "bytes29",
      },
    ],
    name: "testIsRequestDetails",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_action",
        type: "bytes29",
      },
    ],
    name: "testIsTransfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_action",
        type: "bytes",
      },
      {
        internalType: "enum BridgeMessage.Types",
        name: "_t",
        type: "uint8",
      },
    ],
    name: "testIsValidAction",
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
    inputs: [
      {
        internalType: "bytes29",
        name: "_view",
        type: "bytes29",
      },
    ],
    name: "testIsValidMessageLength",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_view",
        type: "bytes29",
      },
    ],
    name: "testMessageType",
    outputs: [
      {
        internalType: "enum BridgeMessage.Types",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_message",
        type: "bytes29",
      },
    ],
    name: "testMsgType",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_view",
        type: "bytes29",
      },
    ],
    name: "testMustBeDetails",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_view",
        type: "bytes29",
      },
    ],
    name: "testMustBeMessage",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_view",
        type: "bytes29",
      },
    ],
    name: "testMustBeRequestDetails",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_view",
        type: "bytes29",
      },
    ],
    name: "testMustBeTokenId",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_view",
        type: "bytes29",
      },
    ],
    name: "testMustBeTransfer",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_detailsAction",
        type: "bytes29",
      },
    ],
    name: "testName",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_transferAction",
        type: "bytes29",
      },
    ],
    name: "testRecipient",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_detailsAction",
        type: "bytes29",
      },
    ],
    name: "testSymbol",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_message",
        type: "bytes29",
      },
    ],
    name: "testTokenId",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_action",
        type: "bytes29",
      },
    ],
    name: "testTryAsDetails",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_message",
        type: "bytes29",
      },
    ],
    name: "testTryAsMessage",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_action",
        type: "bytes29",
      },
    ],
    name: "testTryAsRequestDetails",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_tokenId",
        type: "bytes29",
      },
    ],
    name: "testTryAsTokenId",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes29",
        name: "_action",
        type: "bytes29",
      },
    ],
    name: "testTryAsTransfer",
    outputs: [
      {
        internalType: "bytes29",
        name: "",
        type: "bytes29",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5061257a806100206000396000f3fe608060405234801561001057600080fd5b50600436106102265760003560e01c80637954ec361161012a578063b45324c0116100bd578063bbf7cf851161008c578063cd9aeee611610071578063cd9aeee614610b02578063d07edd9714610b2b578063f0acfb9a14610b6a57610226565b8063bbf7cf8514610a84578063c1faa21e14610ac357610226565b8063b45324c01461090b578063b695f55f146109c7578063b834f17114610a06578063b90caa9f14610a4557610226565b80639740fab9116100f95780639740fab91461080f578063a09fc9f01461084e578063a613e4e31461088d578063b151a9ab146108cc57610226565b80637954ec36146106c35780638213d910146107025780638d31885a146107ad5780638f071d7e146107ec57610226565b8063472d3e59116101bd5780635abd082b1161018c57806365f079d71161017157806365f079d7146105c957806373738aad1461060857806379267b551461067057610226565b80635abd082b1461054b5780636487d6651461058a57610226565b8063472d3e591461047457806349880b66146104b35780635029539f1461050457806350e108f31461050c57610226565b80631d7cec2e116101f95780631d7cec2e146103625780632cef896e146103a157806335bf993b146103f65780633c5a73b81461043557610226565b8063046c241c1461022b5780630733236a1461029f5780630a09131e146102f75780631a028e2014610336575b600080fd5b61026a6004803603602081101561024157600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610bca565b604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000009092168252519081900360200190f35b6102de600480360360208110156102b557600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610bdd565b6040805163ffffffff9092168252519081900360200190f35b61026a6004803603602081101561030d57600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610c22565b61026a6004803603606081101561034c57600080fd5b508035906020810135906040013560ff16610c3a565b61026a6004803603602081101561037857600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610c51565b6103e0600480360360208110156103b757600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610c5c565b6040805160ff9092168252519081900360200190f35b61026a6004803603602081101561040c57600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610c67565b61026a6004803603602081101561044b57600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610c7f565b6103e06004803603602081101561048a57600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610c8a565b6104f2600480360360208110156104c957600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610c95565b60408051918252519081900360200190f35b61026a610cad565b6104f26004803603602081101561052257600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610cbc565b61026a6004803603602081101561056157600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610cd4565b6103e0600480360360208110156105a057600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610cdf565b61026a600480360360208110156105df57600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610cf7565b6106476004803603602081101561061e57600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610d02565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b6106af6004803603602081101561068657600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610d1a565b604080519115158252519081900360200190f35b61026a600480360360208110156106d957600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610d25565b6106af6004803603604081101561071857600080fd5b81019060208101813564010000000081111561073357600080fd5b82018360208201111561074557600080fd5b8035906020019184600183028401116401000000008311171561076757600080fd5b91908080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920191909152509295505050903560ff169150610d309050565b61026a600480360360208110156107c357600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610d74565b61026a6004803603604081101561080257600080fd5b5080359060200135610d7f565b6106af6004803603602081101561082557600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610d8b565b6104f26004803603602081101561086457600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610d96565b61026a600480360360208110156108a357600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610dae565b6104f2600480360360208110156108e257600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610db9565b6109526004803603604081101561092157600080fd5b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000081358116916020013516610dd1565b6040805160208082528351818301528351919283929083019185019080838360005b8381101561098c578181015183820152602001610974565b50505050905090810190601f1680156109b95780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b61026a600480360360208110156109dd57600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610df3565b6104f260048036036020811015610a1c57600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610dfe565b61026a60048036036020811015610a5b57600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610e16565b6106af60048036036020811015610a9a57600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610e21565b6106af60048036036020811015610ad957600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610e2c565b61026a60048036036040811015610b1857600080fd5b5063ffffffff8135169060200135610e37565b61064760048036036020811015610b4157600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610e43565b610ba960048036036020811015610b8057600080fd5b50357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000016610e5b565b60405180826005811115610bb957fe5b815260200191505060405180910390f35b6000610bd582610e66565b90505b919050565b6000816001610c10815b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000841690610e9b565b50610c1a8461101b565b949350505050565b6000816002610c3081610be7565b50610c1a84611059565b6000610c47848484611099565b90505b9392505050565b6000610bd582611103565b6000610bd582611184565b6000816002610c7581610be7565b50610c1a846111b5565b6000610bd58261124d565b6000610bd58261125b565b6000816003610ca381610be7565b50610c1a8461128b565b6000610cb76112c9565b905090565b6000816004610cca81610be7565b50610c1a84611315565b6000610bd582611353565b6000816004610ced81610be7565b50610c1a84611361565b6000610bd58261139f565b6000816001610d1081610be7565b50610c1a846113ad565b6000610bd5826113e9565b6000610bd58261141f565b6000610d4d826005811115610d4157fe5b64ffffffffff1661146c565b610d6b610d66836005811115610d5f57fe5b85906114de565b6114f9565b90505b92915050565b6000610bd582611522565b6000610d6b838361153c565b6000610bd582611598565b6000816004610da481610be7565b50610c1a846115b7565b6000610bd5826115c5565b6000816001610dc781610be7565b50610c1a84611612565b6060826001610ddf81610be7565b50610dea8585611650565b95945050505050565b6000610bd582611764565b6000816003610e0c81610be7565b50610c1a846117b1565b6000610bd5826117ef565b6000610bd5826117fd565b6000610bd58261181c565b6000610d6b8383611878565b6000816003610e5181610be7565b50610c1a846118c6565b6000610bd582611902565b6000610bd5610e74836115c5565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000001661193d565b6000610ea783836119b7565b611014576000610ec5610eb9856119d9565b64ffffffffff166119df565b9150506000610eda8464ffffffffff166119df565b604080517f5479706520617373657274696f6e206661696c65642e20476f742030780000006020808301919091527fffffffffffffffffffff0000000000000000000000000000000000000000000060b088811b8216603d8501527f2e20457870656374656420307800000000000000000000000000000000000000604785015285901b1660548301528251603e818403018152605e8301938490527f08c379a000000000000000000000000000000000000000000000000000000000909352606282018181528351608284015283519496509294508493839260a2019185019080838360005b83811015610fd9578181015183820152602001610fc1565b50505050905090810190601f1680156110065780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b5090919050565b600081600161102981610be7565b50610c1a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000851660006004611ab3565b600081600261106781610be7565b50610c1a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008516600060246001611ad4565b6000610c476110fe60006004878787604051602001808560058111156110bb57fe5b60f81b81526001018481526020018381526020018260ff1660f81b81526001019450505050506040516020818303038152906040526114de90919063ffffffff16565b6117ef565b600060416111327fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008416611b5a565b6bffffffffffffffffffffffff16141561117c5761117560035b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000841690611b6e565b9050610bd8565b610bd5611b94565b6000610bd57fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000831660246001611ab3565b60008160026111c381610be7565b50600060246111f37fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008716611b5a565b6bffffffffffffffffffffffff16039050600061120f86611184565b60ff1690506112437fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000871660248484611ad4565b9695505050505050565b6000610bd5610e7483611764565b6000610bd57fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008316826001611ab3565b600081600361129981610be7565b50610c1a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000851660016020611bb8565b6000610cb761131060006005604051602001808260058111156112e857fe5b60f81b81526001019150506040516020818303038152906040526114de90919063ffffffff16565b61124d565b600081600461132381610be7565b50610c1a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000851660216020611bb8565b6000610bd5610e7483611103565b600081600461136f81610be7565b50610c1a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000851660416001611ab3565b6000610bd5610e7483611522565b60008160016113bb81610be7565b50610c1a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000085166010611d26565b600060046113f68361125b565b60ff16148015610bd5575060045b61140d83611902565b600581111561141857fe5b1492915050565b6000604261144e7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008416611b5a565b6bffffffffffffffffffffffff16141561117c57611175600461114c565b6040805160248082018490528251808303909101815260449091019091526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167ff5b1bba9000000000000000000000000000000000000000000000000000000001790526114db90611d34565b50565b815160009060208401610dea64ffffffffff85168284611d55565b6000611504826113e9565b80611513575061151382611598565b80610bd55750610bd5826117fd565b600061152d8261181c565b1561117c57611175600261114c565b6000610d6b6115936000600386866040516020018084600581111561155d57fe5b60f81b815260010183815260200182815260200193505050506040516020818303038152906040526114de90919063ffffffff16565b611353565b600060056115a58361125b565b60ff16148015610bd557506005611404565b600081600461129981610be7565b600060246115f47fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008416611b5a565b6bffffffffffffffffffffffff16141561117c57611175600161114c565b600081600161162081610be7565b50610c1a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000851660046020611bb8565b606082600161165e81610be7565b50611668846114f9565b6116d357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600760248201527f21616374696f6e00000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b604080516002808252606082018352600092602083019080368337019050509050858160008151811061170257fe5b602002602001019062ffffff1916908162ffffff191681525050848160018151811061172a57fe5b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000009092166020928302919091019091015261124381611dab565b600060016117937fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008416611b5a565b6bffffffffffffffffffffffff16141561117c57611175600561114c565b60008160036117bf81610be7565b50610c1a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000851660216020611ab3565b6000610bd5610e748361141f565b6000600361180a8361125b565b60ff16148015610bd557506003611404565b60008061184a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008416611b5a565b6bffffffffffffffffffffffff16905060658114806118695750606681145b80610c4a575060251492915050565b6000610d6b6118c160008585604051602001808363ffffffff1660e01b8152600401828152602001925050506040516020818303038152906040526114de90919063ffffffff16565b610e66565b60008160036118d481610be7565b50610c1a7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008516600d611d26565b600061192f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000083166119d9565b60ff166005811115610bd557fe5b600061194882611dfb565b6119b357604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f56616c696469747920617373657274696f6e206661696c656400000000000000604482015290519081900360640190fd5b5090565b60008164ffffffffff166119ca846119d9565b64ffffffffff16149392505050565b60d81c90565b600080601f5b600f8160ff161115611a475760ff600882021684901c611a0481611e38565b61ffff16841793508160ff16601014611a1f57601084901b93505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff016119e5565b50600f5b60ff8160ff161015611aad5760ff600882021684901c611a6a81611e38565b61ffff16831792508160ff16600014611a8557601083901b92505b507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01611a4b565b50915091565b60008160200360080260ff16611aca858585611bb8565b901c949350505050565b600080611ae086611e68565b6bffffffffffffffffffffffff169050611af986611e7c565b611b0d85611b078489611ea6565b90611ea6565b1115611b3c577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000915050610c1a565b611b468186611ea6565b90506112438364ffffffffff168286611d55565b60181c6bffffffffffffffffffffffff1690565b60d81b7affffffffffffffffffffffffffffffffffffffffffffffffffffff9091161790565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000090565b600060ff8216611bca57506000610c4a565b611bd384611b5a565b6bffffffffffffffffffffffff16611bee8460ff8516611ea6565b1115611c9057611c2f611c0085611e68565b6bffffffffffffffffffffffff16611c1786611b5a565b6bffffffffffffffffffffffff16858560ff16611f18565b6040517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048201818152835160248401528351909283926044909101919085019080838360008315610fd9578181015183820152602001610fc1565b60208260ff161115611ced576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252603a815260200180612483603a913960400191505060405180910390fd5b600882026000611cfc86611e68565b6bffffffffffffffffffffffff1690506000611d1783612073565b91909501511695945050505050565b6000610d6b83836014611ab3565b80516a636f6e736f6c652e6c6f67602083016000808483855afa5050505050565b600080611d628484611ea6565b9050604051811115611d72575060005b80611da0577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000915050610c4a565b610dea8585856120bc565b6040516060906000611dc084602084016120cf565b90506000611dcd82611b5a565b6bffffffffffffffffffffffff1690506000611de883612147565b9184525082016020016040525092915050565b6000611e06826119d9565b64ffffffffff1664ffffffffff1415611e2157506000610bd8565b6000611e2c83611e7c565b60405110199392505050565b6000611e4a60048360ff16901c61215b565b60ff161760081b62ffff0016611e5f8261215b565b60ff1617919050565b60781c6bffffffffffffffffffffffff1690565b6000611e8782611b5a565b611e9083611e68565b016bffffffffffffffffffffffff169050919050565b81810182811015610d6e57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f4f766572666c6f7720647572696e67206164646974696f6e2e00000000000000604482015290519081900360640190fd5b60606000611f25866119df565b9150506000611f33866119df565b9150506000611f41866119df565b9150506000611f4f866119df565b915050838383836040516020018080612510603591397fffffffffffff000000000000000000000000000000000000000000000000000060d087811b821660358401527f2077697468206c656e6774682030780000000000000000000000000000000000603b84015286901b16604a820152605001602161246282397fffffffffffff000000000000000000000000000000000000000000000000000060d094851b811660218301527f2077697468206c656e677468203078000000000000000000000000000000000060278301529290931b9091166036830152507f2e00000000000000000000000000000000000000000000000000000000000000603c82015260408051601d818403018152603d90920190529b9a5050505050505050505050565b7f80000000000000000000000000000000000000000000000000000000000000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9091011d90565b606092831b9190911790911b1760181b90565b6000604051828111156120e25760206060fd5b506000805b845181101561213a5760008582815181106120fe57fe5b60200260200101519050612114818487016122c7565b5061211e81611b5a565b6bffffffffffffffffffffffff169290920191506001016120e7565b50610c1a600084836120bc565b6000612152826123f3565b60200292915050565b600060f08083179060ff82161415612177576030915050610bd8565b8060ff1660f1141561218d576031915050610bd8565b8060ff1660f214156121a3576032915050610bd8565b8060ff1660f314156121b9576033915050610bd8565b8060ff1660f414156121cf576034915050610bd8565b8060ff1660f514156121e5576035915050610bd8565b8060ff1660f614156121fb576036915050610bd8565b8060ff1660f71415612211576037915050610bd8565b8060ff1660f81415612227576038915050610bd8565b8060ff1660f9141561223d576039915050610bd8565b8060ff1660fa1415612253576061915050610bd8565b8060ff1660fb1415612269576062915050610bd8565b8060ff1660fc141561227f576063915050610bd8565b8060ff1660fd1415612295576064915050610bd8565b8060ff1660fe14156122ab576065915050610bd8565b8060ff1660ff14156122c1576066915050610bd8565b50919050565b60006122d283612427565b612327576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260288152602001806124bd6028913960400191505060405180910390fd5b61233083611dfb565b612385576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602b8152602001806124e5602b913960400191505060405180910390fd5b600061239084611b5a565b6bffffffffffffffffffffffff16905060006123ab85611e68565b6bffffffffffffffffffffffff16905060006040519050848111156123d05760206060fd5b8285848460045afa506112436123e5876119d9565b64ffffffffff1686856120bc565b60006020612419602061240585611b5a565b6bffffffffffffffffffffffff1690611ea6565b8161242057fe5b0492915050565b600061243282612439565b1592915050565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000908116149056fe2e20417474656d7074656420746f20696e646578206174206f666673657420307854797065644d656d566965772f696e646578202d20417474656d7074656420746f20696e646578206d6f7265207468616e20333220627974657354797065644d656d566965772f636f7079546f202d204e756c6c20706f696e74657220646572656654797065644d656d566965772f636f7079546f202d20496e76616c696420706f696e74657220646572656654797065644d656d566965772f696e646578202d204f76657272616e2074686520766965772e20536c696365206973206174203078a264697066735822122043e0e84af79ea726d88c879df7623bf51a37413e6f2c79d9f9948e155eabfe8664736f6c63430007060033";

export class TestBridgeMessage__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<TestBridgeMessage> {
    return super.deploy(overrides || {}) as Promise<TestBridgeMessage>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): TestBridgeMessage {
    return super.attach(address) as TestBridgeMessage;
  }
  connect(signer: Signer): TestBridgeMessage__factory {
    return super.connect(signer) as TestBridgeMessage__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): TestBridgeMessageInterface {
    return new utils.Interface(_abi) as TestBridgeMessageInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): TestBridgeMessage {
    return new Contract(address, _abi, signerOrProvider) as TestBridgeMessage;
  }
}
