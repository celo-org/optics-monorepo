import fs from 'fs';

export abstract class Contracts {
  readonly args: any;

  constructor(...args: any) {
    this.args = args;
  }

  abstract toObject(): Object;

  toJson(): string {
    return JSON.stringify(this.toObject());
  }

  toJsonPretty(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  saveJson(filepath: string) {
    fs.writeFileSync(filepath, this.toJsonPretty());
  }
}
