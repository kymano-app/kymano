export interface IOptions {
  /**
   * List of extensions to use for directory imports. Defaults to `['.yml', '.yaml']`.
   */
  option1?: string[];
  /**
   * Whether `safeLoad` or `load` should be used when loading YAML files via *js-yaml*. Defaults to `true`.
   */
  option2?: boolean;

  option3: string;
}
