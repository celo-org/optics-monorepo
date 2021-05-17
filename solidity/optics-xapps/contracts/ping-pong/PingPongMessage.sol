// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@summa-tx/memview-sol/contracts/TypedMemView.sol";

library PingPongMessage {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    enum Types {
        Invalid, // 0
        Ping, // 1
        Pong // 2
    }

    // ============ Formatters ============

    /**
     * @notice Format a Ping volley
     * @param _count The number of volleys in this match
     * @return The encoded bytes message
     */
    function formatPing(uint256 _count) internal view returns (bytes memory) {
        // pack the count into a bytes message
        bytes29 _message = abi.encodePacked(_count).ref(0);

        // case the bytes as the enumerated message type
        return TypedMemView.clone(_message.castTo(uint40(Types.Ping)));
    }

    /**
     * @notice Format a Pong volley
     * @param _count The number of volleys in this match
     * @return The encoded bytes message
     */
    function formatPong(uint256 _count) internal view returns (bytes memory) {
        // pack the count into a bytes message
        bytes29 _message = abi.encodePacked(_count).ref(0);

        // case the bytes as the enumerated message type
        return TypedMemView.clone(_message.castTo(uint40(Types.Pong)));
    }

    // ============ Identifiers ============

    /**
     * @notice Get the type that the TypedMemView is cast to
     * @param _view The message
     * @return _type The type of the message (either Ping or Pong)
     */
    function messageType(bytes29 _view) internal pure returns (Types _type) {
        _type = Types(uint8(_view.typeOf()));
    }

    /**
     * @notice Determine whether the message contains a Ping volley
     * @param _view The message
     * @return True if the volley is Ping
     */
    function isPing(bytes29 _view) internal pure returns (bool) {
        return messageType(_view) == Types.Ping;
    }

    /**
     * @notice Determine whether the message contains a Pong volley
     * @param _view The message
     * @return True if the volley is Pong
     */
    function isPong(bytes29 _view) internal pure returns (bool) {
        return messageType(_view) == Types.Pong;
    }

    // ============ Getters ============

    /**
     * @notice Parse the volley count sent within a Ping or Pong message
     * @param _view The message
     * @return The count encoded in the message
     */
    function count(bytes29 _view) internal pure returns (uint256) {
        return uint256(_view.index(0, 32));
    }
}
