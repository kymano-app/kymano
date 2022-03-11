import axios from 'axios';
import fs from "fs";
import os from 'os';
import path from "path";
import { DataSource } from "../dataSource/config/dataSource";
import { QemuCommands } from '../qemuCommands/qemuCommands';
import isFileExist from "../service/isFileExist";
import processConfig from "../v1/processConfig";
import { addAbsolutePathForRunningDirectory } from "./service/addAbsolutePathForRunningDirectory";
import downloadAndExtract from "./service/downloadAndExtract";
import downloadFile from "./service/downloadFile";
import getArch from "./service/getArch";
import getPlatform from "./service/getPlatform";
import getQemuArch from "./service/getQemuArch";
import getUserDataPath from "./service/getUserDataPath";
import { isGithubOrHttps } from "./service/isGithubOrHttps";
import { recursiveDowload } from "./service/recursiveDowload";
import replaceVarsToDrivePathes from "./service/replaceVarsToDrivePathes";
import sendMonitorCommand from "./service/sendMonitorCommand";
import unZip from "./service/unZip";

const fsAsync = require('fs').promises;
const hasha = require('hasha');
const tmp = require('tmp');
const spawn = require('await-spawn');
const yaml = require('js-yaml');

export class Kymano {
  readonly layersPath: string;
  readonly userDrivesDirectory: string;
  readonly userDataPath: string;
  readonly qemuPath: string;
  readonly qemuImgPath: string;
  readonly qemuImgBinPath: string;

constructor(readonly dataSource: DataSource, readonly qemuCommands: QemuCommands) {
    this.dataSource = dataSource;
    this.qemuCommands = qemuCommands;
    this.userDataPath = getUserDataPath();
    this.userDrivesDirectory = `${this.userDataPath}/user_layers`;
    this.layersPath = `${this.userDataPath}/layers`;
    this.qemuPath = `${this.userDataPath}/qemu`;
    this.qemuImgPath = `${this.userDataPath}/qemu/qemu-img-${getPlatform()}-${getArch()}`;
    this.qemuImgBinPath = `${this.qemuImgPath}/bin/qemu-img`;
  }
  
  private init = async () => {
    if (!isFileExist(this.userDataPath)) {
      await fsAsync.mkdir(this.userDataPath, {
      recursive: true,
      });
    }
    if (!isFileExist(this.layersPath)) {
      await fsAsync.mkdir(this.layersPath);
    }
    if (!isFileExist(this.userDrivesDirectory)) {
      await fsAsync.mkdir(this.userDrivesDirectory);
    }
    if (!isFileExist(this.qemuPath)) {
      await fsAsync.mkdir(this.qemuPath);
    }
    console.log('this.qemuImgPath:::::::::;')
    if (!isFileExist(this.qemuImgPath)) {
      await fsAsync.mkdir(this.qemuImgPath);
      await downloadAndExtract(`https://github.com/kymano-app/qemu/releases/download/qemu-img/qemu-img-${getPlatform()}-${getArch()}.tgz`, this.qemuPath);
   }
  }

  public removeUserLayer = async (vmAndDisk: string) => { 
    await this.init(); 
    const vmName = vmAndDisk.split('/')[0];
    const diskName = vmAndDisk.split('/')[1];
    const driveFile = `${getUserDataPath()}/user_layers/${vmName}/${diskName}.qcow2`;
  
    fs.unlinkSync(driveFile);
  };

  public inspectLayer = async (layer: string) => {
    await this.init();
    console.log(`inspectLayer: ${layer}`);
  };

  public search = async (name: string) => {
    await this.init();
      console.log(`search: ${name}`);
  };
  
  public commit = async (vmAndDisk: string) => {
    await this.init();
    const vmName = vmAndDisk.split("/")[0];
    const diskName = vmAndDisk.split("/")[1];
    const layersPath = `${getUserDataPath()}/layers`;
    const driveFile = `${getUserDataPath()}/user_layers/${vmName}/${diskName}.qcow2`;
    const fileHash = await hasha.fromFile(driveFile, { algorithm: "sha256" });
    const layerFile = `${layersPath}/${fileHash}`;

    try {
      await fsAsync.access(layersPath);
    } catch (error) {
      await fsAsync.mkdir(layersPath, {
        recursive: true,
      });
    }

    fs.copyFileSync(driveFile, layerFile);
    fs.unlinkSync(driveFile);

    this.dataSource.selectOrInsertLayer(fileHash);
    console.log("fileHash", fileHash);
  }

  public commitLayer = async (hash: string) => {
    await this.init();

    const layerPath = `${this.layersPath}/${hash}`;

    const backingLayerHash = await this.qemuCommands.getBackingLayerHash(layerPath);
    const backingLayerPath = `${this.layersPath}/${backingLayerHash}`;

    const tmpBackingFile = `${backingLayerPath}.tmp`;
    fs.copyFileSync(backingLayerPath, tmpBackingFile);
    console.log('backingFile', backingLayerPath);

    await this.qemuCommands.commitLayer(layerPath);

    const newBackingFileHash = await hasha.fromFile(backingLayerPath, {
      algorithm: 'sha256',
    });
    console.log('newBackingFileHash', newBackingFileHash);
    fs.copyFileSync(
      backingLayerPath,
      `${getUserDataPath()}/layers/${newBackingFileHash}`
    );
    fs.unlinkSync(backingLayerPath);
    fs.copyFileSync(tmpBackingFile, backingLayerPath);
    fs.unlinkSync(tmpBackingFile);

    this.dataSource.selectOrInsertLayer(newBackingFileHash);
  }

  public run = async (urlOrPath: string, args: any) => {
    await this.init();
    let arch = getArch();
    if (args["platform"]) {
      arch = args["platform"];
    }
  
    let runConfig = 'url';
    const splited = urlOrPath.split('/');
  
    if (/^([\w:\-]+)$/.test(urlOrPath)) {
      runConfig = 'alias';
    } else if (!isGithubOrHttps(splited[0]) || ['', '.'].includes(splited[0])) {
      runConfig = 'path';
    }
  
    if (runConfig === 'alias') {
      const alias = urlOrPath;
      let parsedConfig;
      let configName;
      [parsedConfig, configName] = await this.dataSource.getConfigByCliAlias(alias);
  
      let firstStart = false;
      if (!parsedConfig) {
        firstStart = true;
        const resp = await axios.get('https://raw.githubusercontent.com/kymano-app/repo/master/cli_aliases.yml');
        const doc = yaml.load(resp.data);
        const ymlUrl = doc.find((elem: any) => elem.name === alias)['url'].split('/');
        const nameAndVersion = ymlUrl[2].split(':');
        console.log('nameAndVersion:::;',nameAndVersion)
        const url = `https://github.com/${ymlUrl[0]}/${ymlUrl[1]}/archive/refs/heads/master.zip`
        const tmpFile = tmp.fileSync();
        const tmpDir = tmp.dirSync();
        await downloadFile(url, tmpFile.name);
        console.log('downloadFile ok = ', tmpFile.name)
        await unZip(tmpFile.name, tmpDir.name);
        console.log()
        const tmpRepoDir = `${tmpDir.name}/${ymlUrl[1]}-master`
        const repoUrl = `https://github.com/${ymlUrl[0]}/${ymlUrl[1]}`;
        configName = `${nameAndVersion[0]}-${arch}`
  
        parsedConfig = await processConfig(
          `/${nameAndVersion[1]}`,
          `${tmpRepoDir}/${nameAndVersion[0]}-${arch}/`
        );
        await this.dataSource.addRepoWithConfigs(repoUrl, nameAndVersion[1], tmpRepoDir, configName);
        const configId = await this.dataSource.getConfigIdByRepoUrlAndName(repoUrl, configName);
        console.log(`configId: ${configId}`);
        await this.dataSource.addMyConfig(alias, configName, configId);
      }
  
      console.log('parsedConfig:::::::::::', configName, parsedConfig);
      await this.execConfig(configName, arch, parsedConfig, firstStart);
    }
  
    if (runConfig === 'path') {
      let directory = path.dirname(urlOrPath);
  
      if (urlOrPath.slice(0, 2) === './') {
        directory = path.dirname(urlOrPath.slice(2, urlOrPath.length));
      }
      const parsedConfig = await processConfig(
        `/${path.basename(urlOrPath)}`,
        addAbsolutePathForRunningDirectory(directory)
      );
      console.log('parsedConfig::', parsedConfig);
      console.log('os.platform::', os.platform());
  
      // addMyLocalConfig(parsedConfig, db);
      const vmNameAvailable = await this.dataSource.isVmNameAvailable(parsedConfig.name);
      if (!vmNameAvailable) {
        console.log('Please select another name')
        process.exit(1);
      }
      await this.dataSource.addOrUpdateMyLocalConfig(parsedConfig);
      const config = await this.dataSource.getMyLocalConfig(parsedConfig.name);
      await this.execConfig(parsedConfig.name, arch, config, false);
    }
  };

  private execConfig = async (name: string, arch:string, config:any, firstStart:boolean) => {
    const userDrivesDirectory = `${getUserDataPath()}/user_layers/${name.toLowerCase()}`;
  
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
      await fsAsync.mkdir(qemuDirectory, {
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
  
    const configVars = await this.getOrCreateUserDriveAndFillConfigVars(
      config[getPlatform()].local[executionType].drives,
      config[getPlatform()].local[executionType].snapshot,
      userDrivesDirectory,
      qemuDirectory,
      firstStart
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
      await this.qemuCommands.startVm(confparams, qemuBinary);
      sendMonitorCommand("loadvm "+config[getPlatform()].local[executionType].snapshot.tag)
      console.log('ok');
    } else {
      await this.qemuCommands.startVm(confparams, qemuBinary);
    }
  };

    /**
   * Some method documentation
   */
  private getOrCreateUserDriveAndFillConfigVars = async (
    drives: any, snapshot: any, userDrivesDirectory: string, qemuDirectory: string, firstStart: boolean
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
            await this.qemuCommands.createImg(userDrivePath);
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
            backingLayerHash = await this.qemuCommands.getBackingLayerHash(userDrivePath);
          }
          console.log('isFileExist(userDrivePath)', userDrivePath, isFileExist(userDrivePath))
  
          console.log('driveData.layers', driveData.layers)
  
          for (let i in driveData.layers) {
            let layer = driveData.layers[i];
            console.log('layer', layer, `${getUserDataPath()}/layers/${layer.hash}`)
              if (!isFileExist(`${getUserDataPath()}/layers/${layer.hash}`)) {
                await this.downloadLayer(layer.url, layer.hash);
                // ??????????????????????????? backingLayerHash = await getBackingLayerHash(userDrivePath, qemuDirectory);
              }
          }
          console.log('downloadLayer ok')
          console.log('driveData.type:::::::', driveData.type)
          console.log('backingLayerHash::::lastLayerHash::', backingLayerHash, lastLayerHash)
  
          if (driveData.type === 'system' && backingLayerHash !== lastLayerHash) {
            if (snapshot && firstStart) {
              console.log('userDrivePath', userDrivePath, userDrivesDirectory)
              const tmpDir = tmp.dirSync();
              const files = await downloadAndExtract(snapshot.url, tmpDir.name)
              console.log('files:::::::::::', files)
              fs.renameSync(path.join(tmpDir.name, files[0]), userDrivePath);
              await this.qemuCommands.changeBackingFile(`${getUserDataPath()}/layers/${lastLayerHash}`, userDrivePath, qemuDirectory)
            } else {
              await this.qemuCommands.createContainer(
                `${getUserDataPath()}/layers/${lastLayerHash}`,
                userDrivePath
              );
            }
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

  private downloadLayer = async (url: string, hash: string) => {
    const layersPath = `${getUserDataPath()}/layers`;
    //const layerFileTmp = `${layersPath}/${uuidv4()}.tmp.qcow2`;
  
    console.log('downloadLayer:::::::;', url, hash)
  
    if (!isFileExist(layersPath)) {
      await fsAsync.mkdir(layersPath, {
        recursive: true,
      });
    }
  
    const imgPath = await recursiveDowload(url);
    console.log('imgPath:::::::::::;', imgPath)
    fs.renameSync(imgPath, `${layersPath}/${hash}`);
  
    // fs.unlinkSync(layerFileTmp);
  
    this.dataSource.selectOrInsertLayer(hash);
  }

  public importLayer = async (importingFilePath: string) => {
    await this.init();
    
    const layerFileTmp = tmp.fileSync().name;

    await this.qemuCommands.convert(importingFilePath, layerFileTmp);
    const fileHash = await hasha.fromFile(layerFileTmp, {
      algorithm: "sha256",
    });

    // fs.copyFileSync(layerFileTmp, `${layersPath}/${fileHash}.qcow2`);
    // fs.unlinkSync(layerFileTmp);
    fs.renameSync(layerFileTmp, `${this.layersPath}/${fileHash}`);

    this.dataSource.selectOrInsertLayer(fileHash);
    console.log("fileHash:", fileHash);
  }
}
