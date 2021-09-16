/*
 * Converts address to Bytes32
 *
 * @param address - the address
 * @return The address as bytes32
 */
export function toBytes32(address: string): string {
  return '0x' + '00'.repeat(12) + address.slice(2);
}
