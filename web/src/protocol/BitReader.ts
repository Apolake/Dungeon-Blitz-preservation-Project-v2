export class BitReader {
  private data: Uint8Array;
  private bitIndex: number = 0;

  constructor(data: Uint8Array | ArrayBuffer) {
    this.data = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.bitIndex = 0;
  }

  public readBit(): number {
    const byteIndex = Math.floor(this.bitIndex / 8);
    const bitOffset = this.bitIndex & 7;
    if (byteIndex >= this.data.length) {
      return 0;
    }
    const bit = (this.data[byteIndex] >>> (7 - bitOffset)) & 1;
    this.bitIndex++;
    return bit;
  }

  public read_method_15(): boolean {
    return this.readBit() === 1;
  }

  public read_method_20(bitCount: number): number {
    let val = 0;
    while (bitCount > 0) {
      const byteIndex = Math.floor(this.bitIndex / 8);
      const bitOffset = this.bitIndex & 7;
      const bitsLeftInByte = 8 - bitOffset;
      const bitsToRead = Math.min(bitCount, bitsLeftInByte);

      const mask = (1 << bitsToRead) - 1;
      const shift = bitsLeftInByte - bitsToRead;
      const currentByte = byteIndex < this.data.length ? this.data[byteIndex] : 0;
      const extracted = (currentByte >>> shift) & mask;

      val = (val << bitsToRead) | extracted;
      this.bitIndex += bitsToRead;
      bitCount -= bitsToRead;
    }
    return val;
  }

  public read_method_6(bitCount: number): number {
    return this.read_method_20(bitCount);
  }

  public read_method_26(): string {
    const length = this.read_method_20(16);
    const raw = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      raw[i] = this.read_method_20(8);
    }
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(raw);
  }

  public read_method_4(): number {
    const prefix = this.read_method_20(4);
    const bitsToUse = (prefix + 1) * 2;
    return this.read_method_20(bitsToUse);
  }

  public read_method_9(): number {
    const prefix = this.read_method_20(4);
    const bitsToUse = (prefix + 1) * 2;
    return this.read_method_20(bitsToUse);
  }

  public read_method_45(): number {
    const isNegative = this.readBit() === 1;
    const val = this.read_method_4();
    return isNegative ? -val : val;
  }

  public read_method_706(): number {
    const isNegative = this.readBit() === 1;
    const prefix = this.read_method_20(3);
    const bitLength = (prefix + 1) * 2;
    const value = this.read_method_20(bitLength);
    return isNegative ? -value : value;
  }

  public read_method_739(): number {
    const isNegative = this.readBit() === 1;
    const prefix = this.read_method_20(3);
    const bitLength = (prefix + 1) * 2;
    const value = this.read_method_20(bitLength);
    return isNegative ? -value : value;
  }

  public remainingBits(): number {
    return Math.max(0, this.data.length * 8 - this.bitIndex);
  }
}
