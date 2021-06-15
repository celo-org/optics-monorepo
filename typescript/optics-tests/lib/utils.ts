/*
 * Gets the byte length of a hex string
 *
 * @param hexStr - the hex string
 * @return byteLength - length in bytes
 */
export function getHexStringByteLength(hexStr: string) {
  let len = hexStr.length;

  // check for prefix, remove if necessary
  if (hexStr.slice(0, 2) == '0x') {
    len -= 2;
  }

  // divide by 2 to get the byte length
  return len / 2;
}

/*
 * Converts address to Bytes32
 *
 * @param address - the address
 * @return The address as bytes32
 */
export function toBytes32(address: string): string {
  return '0x' + '00'.repeat(12) + address.slice(2);
}
