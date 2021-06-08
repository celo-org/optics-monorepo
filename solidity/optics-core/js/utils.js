/*
 * Gets the byte length of a hex string
 *
 * @param hexStr - the hex string
 * @return byteLength - length in bytes
 */
function getHexStringByteLength(hexStr) {
  let len = hexStr.length;

  // check for prefix, remove if necessary
  if (hexStr.slice(0, 2) == '0x') {
    len -= 2;
  }

  // divide by 2 to get the byte length
  return len / 2;
}

module.exports = {
  getHexStringByteLength,
};
