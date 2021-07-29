/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { ETHHelper, ETHHelperInterface } from "../ETHHelper";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_weth",
        type: "address",
      },
      {
        internalType: "address",
        name: "_bridge",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "uint32",
        name: "_domain",
        type: "uint32",
      },
    ],
    name: "send",
    outputs: [],
    stateMutability: "payable",
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
        internalType: "address",
        name: "_to",
        type: "address",
      },
    ],
    name: "sendTo",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

const _bytecode =
  "0x60c060405234801561001057600080fd5b506040516104b73803806104b78339818101604052604081101561003357600080fd5b5080516020909101516001600160601b0319606083811b821660805282901b1660a0526040805163095ea7b360e01b81526001600160a01b038084166004830152600019602483015291519184169163095ea7b39160448082019260009290919082900301818387803b1580156100a957600080fd5b505af11580156100bd573d6000803e3d6000fd5b50505050505060805160601c60a05160601c6103b86100ff6000398061011552806102805250806094528061015152806101ff52806102bc52506103b86000f3fe6080604052600436106100295760003560e01c80632e96d5a31461002e5780638cfc3cf414610053575b600080fd5b6100516004803603602081101561004457600080fd5b503563ffffffff16610092565b005b6100516004803603604081101561006957600080fd5b50803563ffffffff16906020013573ffffffffffffffffffffffffffffffffffffffff166101fd565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663d0e30db0346040518263ffffffff1660e01b81526004016000604051808303818588803b1580156100fa57600080fd5b505af115801561010e573d6000803e3d6000fd5b50505050507f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff16631cabf08f7f0000000000000000000000000000000000000000000000000000000000000000348461017b33610369565b6040518563ffffffff1660e01b8152600401808573ffffffffffffffffffffffffffffffffffffffff1681526020018481526020018363ffffffff168152602001828152602001945050505050600060405180830381600087803b1580156101e257600080fd5b505af11580156101f6573d6000803e3d6000fd5b5050505050565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663d0e30db0346040518263ffffffff1660e01b81526004016000604051808303818588803b15801561026557600080fd5b505af1158015610279573d6000803e3d6000fd5b50505050507f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff16631cabf08f7f000000000000000000000000000000000000000000000000000000000000000034856102e686610369565b6040518563ffffffff1660e01b8152600401808573ffffffffffffffffffffffffffffffffffffffff1681526020018481526020018363ffffffff168152602001828152602001945050505050600060405180830381600087803b15801561034d57600080fd5b505af1158015610361573d6000803e3d6000fd5b505050505050565b73ffffffffffffffffffffffffffffffffffffffff169056fea26469706673582212205a1d60b173f276b9b0bcda6d8721fa3ab54d1f4b6fde8605c6c965923d5d8c7864736f6c63430007060033";

export class ETHHelper__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _weth: string,
    _bridge: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ETHHelper> {
    return super.deploy(_weth, _bridge, overrides || {}) as Promise<ETHHelper>;
  }
  getDeployTransaction(
    _weth: string,
    _bridge: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_weth, _bridge, overrides || {});
  }
  attach(address: string): ETHHelper {
    return super.attach(address) as ETHHelper;
  }
  connect(signer: Signer): ETHHelper__factory {
    return super.connect(signer) as ETHHelper__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ETHHelperInterface {
    return new utils.Interface(_abi) as ETHHelperInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ETHHelper {
    return new Contract(address, _abi, signerOrProvider) as ETHHelper;
  }
}
