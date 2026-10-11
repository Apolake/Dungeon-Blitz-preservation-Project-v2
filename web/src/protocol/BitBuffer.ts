export class BitBuffer {
  private bits: number[] = [];

  constructor() {}

  public writeBit(bit: number): void {
    this.bits.push(bit & 1);
  }

  public write_method_15(flag: boolean): void {
    this.write_method_11(flag ? 1 : 0, 1);
  }

  public write_method_11(value: number, bitCount: number): void {
    for (let i = bitCount - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1);
    }
  }

  public write_method_6(value: number, bitCount: number): void {
    this.write_method_11(value, bitCount);
  }

  public write_method_20(bitCount: number, value: number): void {
    this.write_method_11(value, bitCount);
  }

  public write_method_26(val: string): void {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(val || "");
    const length = Math.min(encoded.length, 65535);
    this.write_method_11(length, 16);
    for (let i = 0; i < length; i++) {
      this.write_method_11(encoded[i], 8);
    }
  }

  public write_method_13(...vals: string[]): void {
    const val = vals.join(" ");
    this.write_method_26(val);
  }

  public write_method_4(val: number): void {
    const bitsNeeded = val > 0 ? 32 - Math.clz32(val) : 1;
    const bitsToUse = Math.max(2, (bitsNeeded + 1) & ~1);
    const prefix = Math.floor(bitsToUse / 2) - 1;
    this.write_method_11(prefix, 4);
    this.write_method_11(val, bitsToUse);
  }

  public write_method_9(val: number): void {
    let bitlen = val > 0 ? 32 - Math.clz32(val) : 1;
    if (bitlen % 2 !== 0) bitlen += 1;
    const prefix = Math.floor(bitlen / 2) - 1;
    this.write_method_11(prefix, 4);
    this.write_method_11(val, bitlen);
  }

  public write_method_91(val: number): void {
    const bitsNeeded = val > 0 ? 32 - Math.clz32(val) : 1;
    const bitsToUse = Math.max(2, (bitsNeeded + 1) & ~1);
    const n = Math.floor(bitsToUse / 2) - 1;
    this.write_method_11(n, 3);
    this.write_method_11(val, bitsToUse);
  }

  public write_method_45(val: number): void {
    if (val < 0) {
      this.write_method_11(1, 1);
      this.write_method_4(-val);
    } else {
      this.write_method_11(0, 1);
      this.write_method_4(val);
    }
  }

  public write_method_739(val: number): void {
    if (val < 0) {
      this.write_method_11(1, 1);
      this.write_method_91(-val);
    } else {
      this.write_method_11(0, 1);
      this.write_method_91(val);
    }
  }

  public toUint8Array(): Uint8Array {
    while (this.bits.length % 8 !== 0) {
      this.bits.push(0);
    }
    const byteLength = this.bits.length / 8;
    const out = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; i++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        byte = (byte << 1) | this.bits[i * 8 + b];
      }
      out[i] = byte;
    }
    return out;
  }

  public toPacket(pktId: number): Uint8Array {
    const payload = this.toUint8Array();
    const packet = new Uint8Array(4 + payload.length);
    packet[0] = (pktId >>> 8) & 0xff;
    packet[1] = pktId & 0xff;
    packet[2] = (payload.length >>> 8) & 0xff;
    packet[3] = payload.length & 0xff;
    packet.set(payload, 4);
    return packet;
  }
}
