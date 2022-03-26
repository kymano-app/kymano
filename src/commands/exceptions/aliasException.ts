export class AliasException {
  message: string;
  constructor(readonly alias: string) {
    this.message = `Can't find the ${this.alias}`;
  }
}
