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
        return 'read AB;';
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
}
