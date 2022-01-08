import createImg from '../../qemuCommands/createImg';
import createContainer from '../../qemuCommands/createContainer';
import getBackingLayerHash from '../../qemuCommands/getBackingLayerHash';
import isFileExist from '../../service/isFileExist';
import downloadLayer from '../downloadLayer';
import getUserDataPath from './getUserDataPath';

const getOrCreateUserDriveAndFillConfigVars = async (
  drives: any, userDrivesDirectory: string, qemuDirectory: string, db:any
) => {
  console.log('drives:::::::::::', drives)
  const configVars: any[][] = [];
  await Promise.all(
    Object.entries(drives).map(async ([driveName, driveData]) => {
      let  userDrivePath = `${userDrivesDirectory}/${driveName}.qcow2`;
      console.log('userDrivePath', userDrivePath);
      console.log('driveData:::::::::', driveData);
      if (!driveData.path && !driveData.layers) {
        console.log('!driveData.path && !driveData.layers');
        configVars.push([driveName, userDrivePath]);
        if (!isFileExist(userDrivePath)) {
          console.log('await createImg(userDrivePath);')
          await createImg(userDrivePath, qemuDirectory);
        }
      } else if (driveData.path) {
        console.log('riveData.path');
        configVars.push([driveName, driveData.path]);
      } else if (driveData.layers) {
        console.log('driveData.layers::::::::::::::', driveData.layers)
        let backingLayerHash;
        const lastLayerHash =
          driveData.layers[driveData.layers.length - 1].hash;
        if (isFileExist(userDrivePath)) {
          backingLayerHash = await getBackingLayerHash(userDrivePath, qemuDirectory);
        }
        console.log('downloadLayer')

        console.log('driveData.layers', driveData.layers)

        for (let i in driveData.layers) {
          let layer = driveData.layers[i];
          console.log('layer', layer)
            if (!isFileExist(`${getUserDataPath()}/layers/${layer.hash}`)) {
              await downloadLayer(layer.url, layer.hash, db);
              backingLayerHash = await getBackingLayerHash(userDrivePath, qemuDirectory);
            }
        }
        console.log('downloadLayer ok')
        console.log('driveData.type:::::::', driveData.type)
        console.log('backingLayerHash::::lastLayerHash::', backingLayerHash, lastLayerHash)

        if (driveData.type === 'system' && backingLayerHash !== lastLayerHash) {
          await createContainer(
            `${getUserDataPath()}/layers/${lastLayerHash}`,
            userDrivePath,
            qemuDirectory
          );
        } else if (driveData.type !== 'system') {
          userDrivePath = `${getUserDataPath()}/layers/${lastLayerHash}`;
        }
        console.log('userDrivePath:::::::::::', userDrivePath, driveData)
        configVars.push([driveName, userDrivePath]);
      }
    })
  );
  return configVars;
};

export default async (drives: any, userDrivesDirectory: string, qemuDirectory: string, db:any) => {
  return Promise.resolve(
    await getOrCreateUserDriveAndFillConfigVars(drives, userDrivesDirectory, qemuDirectory, db)
  );
};
