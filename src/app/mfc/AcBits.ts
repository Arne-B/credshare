export class AcBits {
  block?: number;

  c1?: boolean;
  c2?: boolean;
  c3?: boolean;


  constructor(block: number, c1: boolean, c2: boolean, c3: boolean) {
    this.block = block;
    this.c1 = c1;
    this.c2 = c2;
    this.c3 = c3;
  }

  public matches = (bits: Partial<AcBits>): boolean => this.c1 === bits.c1 && this.c2 === bits.c2 && this.c3 === bits.c3;

  private dataDesc = (b: AcBits) => {
    switch (true) {
      case b.matches({ c1: false, c2: false, c3: false }):
        return 'read AB; write AB; increment AB; decrement transfer restore AB';
      case b.matches({ c1: false, c2: true, c3: false }):
        return 'read AB';
      case b.matches({ c1: true, c2: false, c3: false }):
        return 'read AB; write B';
      case b.matches({ c1: true, c2: true, c3: false }):
        return 'read AB; write B; increment B; decrement transfer restore AB';
      case b.matches({ c1: false, c2: false, c3: true }):
        return 'read AB; decrement transfer restore AB';
      case b.matches({ c1: false, c2: true, c3: true }):
        return 'read B; write B';
      case b.matches({ c1: true, c2: false, c3: true }):
        return 'read B';
      case b.matches({ c1: true, c2: true, c3: true }):
        return 'read never; write never; increment never; decrement transfer restore never';
      default:
        return 'Invalid ACs';
    }
  };

  private trailerDesc = (b: AcBits) => {
    switch (true) {
      case b.matches({ c1: false, c2: false, c3: false }):
        return 'write A by A; read ACCESS by A; read/write B by A';
      case b.matches({ c1: false, c2: true, c3: false }):
        return 'read ACCESS by A; read B by A';
      case b.matches({ c1: true, c2: false, c3: false }):
        return 'write A by B; read ACCESS by AB; write B by B';
      case b.matches({ c1: true, c2: true, c3: false }):
        return 'read ACCESS by AB';
      case b.matches({ c1: false, c2: false, c3: true }):
        return 'write A by A; read/write ACCESS by A; read/write B by A';
      case b.matches({ c1: false, c2: true, c3: true }):
        return 'write A by B; read ACCESS by AB; write ACCESS by B; write B by B';
      case b.matches({ c1: true, c2: false, c3: true }):
        return 'read ACCESS by AB; write ACCESS by B';
      case b.matches({ c1: true, c2: true, c3: true }):
        return 'read ACCESS by AB';
      default:
        return 'Invalid ACs';
    }
  };

  public description = () => {
    if (this.block != undefined && this.block < 3) {
      return this.dataDesc(this);
    }

    if (this.block != undefined && this.block == 3) {
      return this.trailerDesc(this);
    }

    return 'Invalid block!';
  };

  public static createAll(acs: number[]): AcBits[] {
    return [0, 1, 2, 3].map(b => AcBits.create(acs, b));
  }

  public static create(acs: number[], block: number): AcBits {

    if(!acs || acs.length < 3) {
      throw new Error('Acs must have at least 3 bytes.');
    }

    const byte6: number = acs[0];
    const byte7: number = acs[1];
    const byte8: number = acs[2];

    if(block < 0 || block >3) {
      throw new Error('Only blocks 0-3 are valid.');
    }

    const c1 = AcBits.isBitSet(byte7, 4 + block);
    const _c1 = AcBits.isBitSet(byte6, 0 + block);

    const c2 = AcBits.isBitSet(byte8, 0 + block);
    const _c2 = AcBits.isBitSet(byte6, 4 + block);

    const c3 = AcBits.isBitSet(byte8, 4 + block);
    const _c3 = AcBits.isBitSet(byte7, 0 + block);

    if( c1 === _c1 || c2 === _c2 || c3 === _c3 ) {
      throw new Error('Invalid access bits. Complements do not match.');
    }

    return new AcBits(block, c1, c2, c3);
  }

  private static isBitSet(value: number, bit: number): boolean {
    return (value & (1 << bit)) > 0;
  }
}
