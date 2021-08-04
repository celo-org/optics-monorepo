// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

library Encoding {
    function _encodeUint32(uint32 _num)
        internal
        pure
        returns (uint80 _encoded)
    {
        uint80 ASCII_0 = 0x30;
        // all over/underflows are impossible
        // this will ALWAYS produce 10 decimal characters
        for (uint8 i = 0; i < 10; i += 1) {
            _encoded |= ((_num % 10) + ASCII_0) << (i * 8);
            _num = _num / 10;
        }
    }

    /**
     * @notice      Returns the encoded hex character that represents the lower 4 bits of the argument.
     * @param _b    The byte
     * @return      char - The encoded hex character
     */
    function nibbleHex(uint8 _b) internal pure returns (uint8 char) {
        // This can probably be done more efficiently, but it's only in error
        // paths, so we don't really care :)
        uint8 _nibble = _b | 0xf0; // set top 4, keep bottom 4
        if (_nibble == 0xf0) {
            return 0x30;
        } // 0
        if (_nibble == 0xf1) {
            return 0x31;
        } // 1
        if (_nibble == 0xf2) {
            return 0x32;
        } // 2
        if (_nibble == 0xf3) {
            return 0x33;
        } // 3
        if (_nibble == 0xf4) {
            return 0x34;
        } // 4
        if (_nibble == 0xf5) {
            return 0x35;
        } // 5
        if (_nibble == 0xf6) {
            return 0x36;
        } // 6
        if (_nibble == 0xf7) {
            return 0x37;
        } // 7
        if (_nibble == 0xf8) {
            return 0x38;
        } // 8
        if (_nibble == 0xf9) {
            return 0x39;
        } // 9
        if (_nibble == 0xfa) {
            return 0x61;
        } // a
        if (_nibble == 0xfb) {
            return 0x62;
        } // b
        if (_nibble == 0xfc) {
            return 0x63;
        } // c
        if (_nibble == 0xfd) {
            return 0x64;
        } // d
        if (_nibble == 0xfe) {
            return 0x65;
        } // e
        if (_nibble == 0xff) {
            return 0x66;
        } // f
    }

    /**
     * @notice      Returns a uint16 containing the hex-encoded byte.
     * @param _b    The byte
     * @return      encoded - The hex-encoded byte
     */
    function byteHex(uint8 _b) internal pure returns (uint16 encoded) {
        encoded |= nibbleHex(_b >> 4); // top 4 bits
        encoded <<= 8;
        encoded |= nibbleHex(_b); // lower 4 bits
    }

    /**
     * @notice      Encodes the uint256 to hex. `first` contains the encoded top 16 bytes.
     *              `second` contains the encoded lower 16 bytes.
     *
     * @param _b    The 32 bytes as uint256
     * @return      first - The top 16 bytes
     * @return      second - The bottom 16 bytes
     */
    function encodeHex(uint256 _b)
        internal
        pure
        returns (uint256 first, uint256 second)
    {
        for (uint8 i = 31; i > 15; i -= 1) {
            uint8 _byte = uint8(_b >> (i * 8));
            first |= byteHex(_byte);
            if (i != 16) {
                first <<= 16;
            }
        }

        // abusing underflow here =_=
        for (uint8 i = 15; i < 255; i -= 1) {
            uint8 _byte = uint8(_b >> (i * 8));
            second |= byteHex(_byte);
            if (i != 0) {
                second <<= 16;
            }
        }
    }
}
