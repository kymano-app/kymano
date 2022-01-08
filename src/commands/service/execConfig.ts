import getMyLocalConfig from '../../dataSource/config/getMyLocalConfig';
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

const fs = require('fs').promises;

const execConfig = async (name: string, db: any) => {
  const userDrivesDirectory = `${getUserDataPath()}/user_layers/${name.toLowerCase()}`;

  if (!isFileExist(userDrivesDirectory)) {
    await fs.mkdir(userDrivesDirectory, {
      recursive: true,
    });
  }

  const config = await getMyLocalConfig(name, db);

  const qemuVersion = config[getPlatform()].local.qemu;
  const qemuUrl = `https://github.com/kymano-app/qemu/releases/download/${qemuVersion}/qemu-${qemuVersion}-${getPlatform()}-${getArch()}.tgz`;
  const qemuDirectory = `${getUserDataPath()}/qemu/${qemuVersion}-${getPlatform()}-${getArch()}`;
  if (!isFileExist(qemuDirectory)) {
    await fs.mkdir(qemuDirectory, {
      recursive: true,
    });
  }
  const qemuBinary = path.join(
    qemuDirectory,
    `bin/qemu-system-${getQemuArch(config.arch)}`
  );

  if (!isFileExist(qemuBinary)) {
    await downloadAndExtract(qemuUrl, qemuDirectory);
  }

  console.log('qemu:::::::', qemuUrl, qemuDirectory, qemuBinary);

  const configVars = await getOrCreateUserDriveAndFillConfigVars(
    config[getPlatform()].local.drives,
    userDrivesDirectory,
    qemuDirectory,
    db
  );
  console.log('configVars:::::::::::', configVars);
  const confparams = await replaceVarsToDrivePathes(
    config[getPlatform()].local.config,
    configVars
  );

  await startVm(confparams, qemuBinary);
};

export default async (config: any, db: any) => {
  return Promise.resolve(await execConfig(config, db));
};
