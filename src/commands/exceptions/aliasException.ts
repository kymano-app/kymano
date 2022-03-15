export class AliasException {
  constructor(readonly alias: string) {}
  public toString = (): string => {
    return `Can't find the ${this.alias}`;
  };
}
