import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { LoadOptions } from 'js-yaml';

export interface IOptions extends LoadOptions {
  /**
   * List of extensions to use for directory imports. Defaults to `['.yml', '.yaml']`.
   */
  ext?: string[];
  /**
   * Whether `safeLoad` or `load` should be used when loading YAML files via *js-yaml*. Defaults to `true`.
   */
  safe?: boolean;

  path: string;
}

function absolute(options: {
    file: string;
    cwd: string;
  }): string {
    return path.join(options.cwd, options.file);
  }

export function getSchema(
    cwd: string,
    options?: IOptions | null,
    schemas: yaml.Schema[] = [yaml.DEFAULT_SAFE_SCHEMA]
  ): yaml.Schema {
    const opts = Object.assign({ ext: ['.yml'] }, options);
  
    const types = [
      new yaml.Type('!import', {
        kind: 'scalar',
        resolve(file) {
          return typeof file === 'string';
        },
        construct(file) {
          return read(absolute({ file, cwd }), opts, schemas);
        }
      })
    ];
    const schema = yaml.Schema.create(schemas, types);
    return schema;
}

export function read(
  input: string,
  options: IOptions,
  schemas?: yaml.Schema[]
): any {
  const cwd = options.path;

  console.log('readFileSync', input + '.yml');
  const src = fs.readFileSync(input + '.yml', 'utf8');
  console.log('src', src);

  const opts = Object.assign({ safe: true }, options);

  return yaml[opts.safe ? 'safeLoad' : 'load'](src, {
    ...opts,
    filename: input,
    schema: getSchema(cwd, opts, schemas)
  });
}
