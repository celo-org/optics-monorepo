import { ethers } from 'ethers';

export enum BridgeMessageTypes {
  INVALID = 0,
  TOKEN_ID,
  MESSAGE,
  TRANSFER,
  DETAILS,
  REQUEST_DETAILS,
}

export const typeToBytes = (type: number) => `0x0${type}`;

const TOKEN_ID_LEN = 36; // 4 bytes domain + 32 bytes id
const IDENTIFIER_LEN = 1;
const TRANSFER_LEN = 65; // 1 byte identifier + 32 bytes recipient + 32 bytes amount
const DETAILS_LEN = 66; // 1 byte identifier + 32 bytes name + 32 bytes symbol + 1 byte decimals
const REQUEST_DETAILS_LEN = 1; // 1 byte identifier

type TransferMessage = {
  type: BridgeMessageTypes.TRANSFER;
  recipient: number;
  amount: number;
}

type DetailsMessage = {
  type: BridgeMessageTypes.DETAILS;
  name: string;
  symbol: string;
  decimal: number;
}

type RequestDetailsMessage = {
  type: BridgeMessageTypes.REQUEST_DETAILS;
}

// /**
//      * @notice Asserts a message is of type `_t`
//      * @param _view The message
//      * @param _t The expected type
//      */
//  modifier typeAssert(bytes29 _view, Types _t) {
//   _view.assertType(uint40(_t));
//   _;
// }

// /**
// * @notice Checks that Action is valid type
// * @param _action The action
// * @return TRUE if action is valid
// */
// function isValidAction(bytes29 _action) internal pure returns (bool) {
//   return
//       isDetails(_action) ||
//       isRequestDetails(_action) ||
//       isTransfer(_action);
// }

// /**
// * @notice Checks that view is a valid message length
// * @param _view The bytes string
// * @return TRUE if message is valid
// */
// function isValidMessageLength(bytes29 _view) internal pure returns (bool) {
//   uint256 _len = _view.len();
//   return
//       _len == TOKEN_ID_LEN + TRANSFER_LEN ||
//       _len == TOKEN_ID_LEN + DETAILS_LEN ||
//       _len == TOKEN_ID_LEN + REQUEST_DETAILS_LEN;
// }

// /**
// * @notice Formats an action message
// * @param _tokenId The token ID
// * @param _action The action
// * @return The formatted message
// */
// function formatMessage(bytes29 _tokenId, bytes29 _action)
//   internal
//   view
//   typeAssert(_tokenId, Types.TokenId)
//   returns (bytes memory)
// {
//   require(isValidAction(_action), "!action");
//   bytes29[] memory _views = new bytes29[](2);
//   _views[0] = _tokenId;
//   _views[1] = _action;
//   return TypedMemView.join(_views);
// }

// /**
// * @notice Returns the type of the message
// * @param _view The message
// * @return The type of the message
// */
// function messageType(bytes29 _view) internal pure returns (Types) {
//   return Types(uint8(_view.typeOf()));
// }

// /**
// * @notice Checks that the message is of type Transfer
// * @param _action The message
// * @return True if the message is of type Transfer
// */
// function isTransfer(bytes29 _action) internal pure returns (bool) {
//   return
//       actionType(_action) == uint8(Types.Transfer) &&
//       messageType(_action) == Types.Transfer;
// }

// /**
// * @notice Checks that the message is of type Details
// * @param _action The message
// * @return True if the message is of type Details
// */
// function isDetails(bytes29 _action) internal pure returns (bool) {
//   return
//       actionType(_action) == uint8(Types.Details) &&
//       messageType(_action) == Types.Details;
// }

// /**
// * @notice Checks that the message is of type Details
// * @param _action The message
// * @return True if the message is of type Details
// */
// function isRequestDetails(bytes29 _action) internal pure returns (bool) {
//   return
//       actionType(_action) == uint8(Types.RequestDetails) &&
//       messageType(_action) == Types.RequestDetails;
// }

// Formats Transfer Message
function formatTransfer(to: string, amnt: number) {
  return ethers.utils.solidityPack(
    ['bytes1', 'bytes32', 'uint256'],
    [BridgeMessageTypes.TRANSFER, to, amnt]
  );
}

// Formats Details Message
function formatDetails(name: string, symbol: string, decimals: number) {
  return ethers.utils.solidityPack(
    ['bytes1', 'bytes32', 'bytes32', 'uint8'],
    [BridgeMessageTypes.DETAILS, name, symbol, decimals]
  );
}

// Formats Request Details message
function formatRequestDetails() {
  return ethers.utils.solidityPack(['bytes1'], [BridgeMessageTypes.REQUEST_DETAILS]);
}

// Formats the Token ID
function formatTokenId(domain: number, id: string) {
  return ethers.utils.solidityPack(['uint32', 'bytes32'], [domain, id]);
}
