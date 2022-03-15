import { AliasException } from './commands/exceptions/aliasException';
import { DataSource } from './dataSource/config/dataSource';
import { Kymano, QemuCommands } from './index';

const processCLI = async (args: any[], db: any) => {

  const dataSource = new DataSource(db)
  const kymano = new Kymano(dataSource, new QemuCommands());
  const command = args._[0];
  const param = args._[1];

  const rows = await dataSource.getTables();
  console.log("rows::::::::", rows)
  if (rows === 0) {
    await dataSource.createTables();
  }

  if (command === 'run') {
    try {
      await kymano.run(param, args);
    } catch (e) {
      if (e instanceof AliasException) {
        console.log(`${e}`);
      }
    }
  } else if (command === 'commit') {
    await kymano.commit(param);
  } else if (command === 'convert') {
    await kymano.importLayer(param);
  } else if (command === 'search') {
    await kymano.search(param);
  } else if (command === 'commit-layer') {
    await kymano.commitLayer(param);
  } else if (command === 'import') {
    await kymano.importLayer(param);
  } else if (command === 'rm') {
    await kymano.removeUserLayer(param);
  } else if (command === 'inspect') {
    await kymano.inspectLayer(param);
  }
};

export default async (args: any[], db: any) => {
  return Promise.resolve(await processCLI(args, db));
};
