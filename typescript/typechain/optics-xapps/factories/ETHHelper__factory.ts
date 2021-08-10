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
    inputs: [],
    name: "bridge",
    outputs: [
      {
        internalType: "contract BridgeRouter",
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
        internalType: "bytes32",
        name: "_to",
        type: "bytes32",
      },
    ],
    name: "sendTo",
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
    name: "sendToEVMLike",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "weth",
    outputs: [
      {
        internalType: "contract IWeth",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x60c060405234801561001057600080fd5b5060405161045d38038061045d8339818101604052604081101561003357600080fd5b5080516020909101516001600160601b0319606083811b821660805282901b1660a0526040805163095ea7b360e01b81526001600160a01b038084166004830152600019602483015291519184169163095ea7b39160448082019260009290919082900301818387803b1580156100a957600080fd5b505af11580156100bd573d6000803e3d6000fd5b50505050505060805160601c60a05160601c6103626100fb6000398061023e52806102e052508061014152806101fb52806102bc52506103626000f3fe60806040526004361061005a5760003560e01c80633fc8cef3116100435780633fc8cef3146100ad578063e78cea92146100eb578063ec93e5f0146101005761005a565b806303c1d2831461005f5780632e96d5a31461008a575b600080fd5b6100886004803603604081101561007557600080fd5b5063ffffffff813516906020013561013f565b005b610088600480360360208110156100a057600080fd5b503563ffffffff166102a5565b3480156100b957600080fd5b506100c26102ba565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b3480156100f757600080fd5b506100c26102de565b6100886004803603604081101561011657600080fd5b50803563ffffffff16906020013573ffffffffffffffffffffffffffffffffffffffff16610302565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff1663d0e30db0346040518263ffffffff1660e01b81526004016000604051808303818588803b1580156101a757600080fd5b505af11580156101bb573d6000803e3d6000fd5b5050604080517f1cabf08f00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff7f00000000000000000000000000000000000000000000000000000000000000008116600483015234602483015263ffffffff881660448301526064820187905291517f00000000000000000000000000000000000000000000000000000000000000009092169450631cabf08f9350608480820193506000929182900301818387803b15801561028957600080fd5b505af115801561029d573d6000803e3d6000fd5b505050505050565b6102b7816102b233610313565b61013f565b50565b7f000000000000000000000000000000000000000000000000000000000000000081565b7f000000000000000000000000000000000000000000000000000000000000000081565b61030f826102b283610313565b5050565b73ffffffffffffffffffffffffffffffffffffffff169056fea264697066735822122061b315277abc4e9f46d4349b574b2844d0d574591ddabb9685c85e0c8fa7b34964736f6c63430007060033";

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
