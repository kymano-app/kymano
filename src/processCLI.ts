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
    kymano.run(param, args);
  } else if (command === 'commit') {
    kymano.commit(param);
  } else if (command === 'convert') {
    kymano.importLayer(param);
  } else if (command === 'search') {
    kymano.search(param);
  } else if (command === 'commit-layer') {
    kymano.commitLayer(param);
  } else if (command === 'import') {
    kymano.importLayer(param);
  } else if (command === 'rm') {
    kymano.removeUserLayer(param);
  } else if (command === 'inspect') {
    kymano.inspectLayer(param);
  }
};

export default async (args: any[], db: any) => {
  return Promise.resolve(await processCLI(args, db));
};
