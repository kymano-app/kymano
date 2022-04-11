import fs from 'fs';
import path from 'path';
import getUserDataPath from './commands/service/getUserDataPath';
import { DataSource } from './dataSource/config/dataSource';
import { Kymano, QemuCommands } from './index';
const pjson = require('../package.json');

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

  const userDataPath = getUserDataPath();

  if (command === 'run') {
    try {
      const response = await kymano.run(param, args);
      fs.writeFileSync(path.join(userDataPath, 'kymano_cli.pid'), response[0].child.pid.toString());
      await response;
    } catch (e) {
      console.log(`error: ${e.message}`);
    }
  } else if (command === 'run-vm') {
    await kymano.runVm(param);
  } else if (command === 'create-vm') {
    await kymano.createVm(param);
  } else if (command === 'update') {
    await kymano.update();
  } else if (command === 'list') {
    await kymano.configListForCli();
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
  } else if (command === 'version') {
    await kymano.getVersion();
  }
};

export default async (args: any[], db: any) => {
  return Promise.resolve(await processCLI(args, db));
};
