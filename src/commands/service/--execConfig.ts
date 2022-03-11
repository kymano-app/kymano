import path from 'path';
import startVm from '../../qemuCommands/startVm';
import isFileExist from '../../service/isFileExist';
import downloadAndExtract from './downloadAndExtract';
import getArch from './getArch';
import getOrCreateUserDriveAndFillConfigVars from './getOrCreateUserDriveAndFillConfigVars';
import getPlatform from './getPlatform';
import getQemuArch from './getQemuArch';
import getUserDataPath from './getUserDataPath';
import replaceVarsToDrivePathes from './replaceVarsToDrivePathes';
import sendMonitorCommand from './sendMonitorCommand';

const fs = require('fs').promises;
const tmp = require('tmp');

const execConfig = async (name: string, arch:string, config, firstStart, db: any) => {
  console.log('db:::::::::', db)
  const userDrivesDirectory = `${getUserDataPath()}/user_layers/${name.toLowerCase()}`;

  if (!isFileExist(userDrivesDirectory)) {
    await fs.mkdir(userDrivesDirectory, {
      recursive: true,
    });
  }

  let executionType = 'virtualization';
  if (arch !== getArch()) {
     executionType = 'emulation';
  }
  console.log('executionType::::::', executionType, arch, getArch())

  console.log('getPlatform()', getPlatform())
  console.log('config', config)

  const qemuVersion = config[getPlatform()].local[executionType].qemu;
  const qemuUrl = `https://github.com/kymano-app/qemu/releases/download/${qemuVersion}/qemu-${qemuVersion}-${getPlatform()}-${getArch()}.tgz`;
  const qemuDirectory = `${getUserDataPath()}/qemu/${qemuVersion}-${getPlatform()}-${getArch()}`;
  if (!isFileExist(qemuDirectory)) {
    await fs.mkdir(qemuDirectory, {
      recursive: true,
    });
  }
  const qemuBinary = path.join(
    qemuDirectory,
    `bin/qemu-system-${getQemuArch(arch)}`
  );
  console.log('qemuBinary:::', qemuBinary)

  if (!isFileExist(qemuBinary)) {
     await downloadAndExtract(qemuUrl, qemuDirectory);
  }

  console.log('qemu:::::::', qemuUrl, qemuDirectory, qemuBinary);

  const configVars = await getOrCreateUserDriveAndFillConfigVars(
    config[getPlatform()].local[executionType].drives,
    config[getPlatform()].local[executionType].snapshot,
    userDrivesDirectory,
    qemuDirectory,
    firstStart,
    db
  );
  console.log('configVars:::::::::::', configVars);
  const confparams = await replaceVarsToDrivePathes(
    config[getPlatform()].local[executionType].config,
    configVars
  );

  if (firstStart) {
    console.log('snapshot::::::', config[getPlatform()].local[executionType].snapshot)
    // start vm
    console.log('start');
    await startVm(confparams, qemuBinary);
    sendMonitorCommand("loadvm "+config[getPlatform()].local[executionType].snapshot.tag)
    console.log('ok');
  } else {
    await startVm(confparams, qemuBinary);
  }
};

export default async (configName: any, arch:string, config, firstStart, db: any) => {
  return Promise.resolve(await execConfig(configName, arch, config, firstStart, db));
};
