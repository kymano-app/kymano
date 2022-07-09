import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";
import { read } from "simple-yaml-import";
import si from "systeminformation";
import { DataSource } from "../dataSource/config/dataSource";
import { electronWindow, globalSockets } from "../global";
import { QemuCommands } from "../qemuCommands/qemuCommands";
import { fileHash, hash } from "../service/hash";
import isFileExist from "../service/isFileExist";
import processConfig from "../v1/processConfig";
import { AliasException } from "./exceptions/aliasException";
import { addAbsolutePathForRunningDirectory } from "./service/addAbsolutePathForRunningDirectory";
import downloadAndExtract from "./service/downloadAndExtract";
import downloadFile from "./service/downloadFile";
import { getArch } from "./service/getArch";
import { getExecutionType } from "./service/getExecutionType";
import getPlatform from "./service/getPlatform";
import getQemuArch from "./service/getQemuArch";
import { getUserDataPath } from "./service/getUserDataPath";
import { isGithubOrHttps } from "./service/isGithubOrHttps";
import { recursiveDownload } from "./service/recursiveDowload";
import replaceVarsToDrivePathes from "./service/replaceVarsToDrivePathes";
import unZip from "./service/unZip";

const config = require("../../config");
const fsAsync = require("fs").promises;
const tmp = require("tmp");
const spawn = require("await-spawn");
const yaml = require("js-yaml");
const pjson = require("../../package.json");

export class Kymano {
  readonly layersPath: string;
  readonly userDrivesDirectoryVm: string;
  readonly userDrivesDirectoryDisk: string;
  readonly userDataPath: string;
  readonly qemuPath: string;
  readonly qemuImgPath: string;
  readonly qemuImgBinPath: string;

  constructor(
    readonly dataSource: DataSource,
    readonly qemuCommands: QemuCommands
  ) {
    this.dataSource = dataSource;
    this.qemuCommands = qemuCommands;
    this.userDataPath = getUserDataPath();
    this.userDrivesDirectoryVm = `${this.userDataPath}/user_layers/vm`;
    this.userDrivesDirectoryDisk = `${this.userDataPath}/user_layers/disk`;
    this.layersPath = `${this.userDataPath}/layers`;
    this.qemuPath = `${this.userDataPath}/qemu`;
    this.qemuImgPath = `${
      this.userDataPath
    }/qemu/qemu-img-${getPlatform()}-${getArch()}`;
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
    if (!isFileExist(this.userDrivesDirectoryVm)) {
      await fsAsync.mkdir(this.userDrivesDirectoryVm, {
        recursive: true,
      });
    }
    if (!isFileExist(this.userDrivesDirectoryDisk)) {
      await fsAsync.mkdir(this.userDrivesDirectoryDisk, {
        recursive: true,
      });
    }
    if (!isFileExist(this.qemuPath)) {
      await fsAsync.mkdir(this.qemuPath);
    }
    if (!isFileExist(this.qemuImgPath)) {
      await fsAsync.mkdir(this.qemuImgPath);
      await downloadAndExtract(
        `https://github.com/kymano-app/qemu/releases/download/qemu-img/qemu-img-${getPlatform()}-${getArch()}.tgz`,
        this.qemuPath,
        0,
        "qemu-img",
        `${getPlatform()}-${getArch()}`
      );
    }
    console.log("init ok");
  };

  public removeUserLayer = async (vmAndDisk: string) => {
    await this.init();
    const vmName = vmAndDisk.split("/")[0];
    const diskName = vmAndDisk.split("/")[1];
    const driveFile = `${this.userDrivesDirectoryVm}/${vmName}-${diskName}`;

    fs.unlinkSync(driveFile);
  };

  public inspectLayer = async (layer: string) => {
    await this.init();
    console.log(`inspectLayer: ${layer}`);
  };

  public getVersion = async () => {
    await this.init();
    console.log(`Kymano ${pjson.version}`);
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
    const driveFile = `${getUserDataPath()}/user_layers/vm/${vmName}-${diskName}`;
    const fileHash_ = await fileHash(driveFile);
    const layerFile = `${layersPath}/${fileHash_}`;

    try {
      await fsAsync.access(layersPath);
    } catch (error) {
      await fsAsync.mkdir(layersPath, {
        recursive: true,
      });
    }

    fs.copyFileSync(driveFile, layerFile);
    fs.unlinkSync(driveFile);

    this.dataSource.selectOrInsertLayer(fileHash_);
    console.log("fileHash", fileHash_);
  };

  public configListForIde = async () => {
    await this.init();
    const result = await this.getVmsFromConfig(pjson.version);
    return result;
  };

  public configListForCli = async () => {
    await this.init();
    let result = await this.getVmsFromConfig(pjson.version);
    result = result.map((elem) => [elem.name, elem.config_id]);
    console.log(result);
    return result;
  };

  public update = async () => {
    await this.init();

    console.log("config", config.mainRepo);
    const response = await axios.get(config.mainRepo);
    const reposJson = yaml.load(response.data);
    console.log("reposJson", reposJson.repos);
    let repoId = 0;
    let version = 0;
    for (const repo of reposJson.repos) {
      [repoId, version] = await this.dataSource.getConfigVersionByRepoUrl(
        repo.url
      );
      console.log("version: ", repo.url, version);
      if (!version) {
        console.log("!version");
        repoId = await this.dataSource.insertRepo(repo.url, repo.version);
      }
      if (version < repo.version) {
        console.log("version < repo.version: ", repo, version);
        const ymlUrl = repo.url.split("/");
        const tmpRepoDir = await this.downloadAndExtract(ymlUrl[1], ymlUrl[2]);
        //console.log('nameAndVersion', nameAndVersion);
        console.log("tmpRepoDir", tmpRepoDir);
        const latestRepo = read(path.join(tmpRepoDir, "latest"), {
          path: tmpRepoDir,
        });
        console.log("latestRepo", latestRepo);
        await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          Object.entries(latestRepo.configs).map(async ([index, _]) => {
            console.log(`type: ${latestRepo.configs[index].type}`);
            console.log("config:", latestRepo.configs[index]);

            if (
              latestRepo.configs[index].type === "searchable" ||
              latestRepo.configs[index].type === "internal"
            ) {
              console.log(`config parsing start`);
              const repoAndYmlVersion =
                latestRepo.configs[index].from.split(":");
              console.log(`repoAndYmlVersion`, repoAndYmlVersion);
              console.log(`index`, index);
              console.log(`repoId`, repoId);

              const config = await (async () => {
                try {
                  console.log(
                    `config parsing try ymlPath`,
                    latestRepo.configs[index].from
                  );
                  return await processConfig(
                    `${repoAndYmlVersion[0]}/${repoAndYmlVersion[1]}`,
                    tmpRepoDir
                  );
                } catch (error) {
                  console.log("error::::::::", error.message);
                  return undefined;
                }
              })();

              console.log("config::::::::", config);

              if (!config) {
                console.log("!!!empty config");
                return;
              }

              const prevConfig = await (async () => {
                try {
                  console.log(
                    `config parsing try ymlPath`,
                    latestRepo.configs[index].from
                  );
                  return await this.dataSource.getConfigByRepoIdAndIndex(
                    repoId,
                    index
                  );
                } catch (error) {
                  console.log("error::::::::", error.message);
                  return undefined;
                }
              })();
              console.log("prevConfig::::::", prevConfig);

              if (!prevConfig) {
                await this.dataSource.addConfig(
                  config,
                  repoAndYmlVersion[0].substring(1),
                  repoId,
                  index,
                  latestRepo.configs[index].version,
                  latestRepo.configs[index].type
                );
              } else {
                const idInHistory = await this.dataSource.addConfigToHistory(
                  prevConfig.version,
                  prevConfig.name,
                  prevConfig.releaseDescription,
                  prevConfig.config,
                  prevConfig.picture,
                  prevConfig.history_id
                );
                this.dataSource.updateConfigPreviousId(
                  prevConfig.id,
                  Number(idInHistory)
                );
                this.dataSource.changeConfigToPreviousIdInMyConfigV1(
                  prevConfig.id,
                  Number(idInHistory)
                );
              }
              await this.dataSource.updateRepoVersion(repoId, repo.version);
            }
          })
        );
      }
    }
  };

  public getVmsFromConfig = async (kymanoVersion: string) => {
    await this.init();
    const valueObject = {
      cpu: "manufacturer, brand, cores",
      mem: "total",
      osInfo: "platform, release, arch",
      baseboard: "model, manufacturer",
      graphics: "displays",
    };

    const sysInfo = await si.get(valueObject);
    const mainDisplay = sysInfo.graphics.displays.filter(
      (display: { main: boolean }) => display.main === true
    )[0];

    const result = await this.dataSource.getVmsFromConfig(
      sysInfo,
      mainDisplay,
      kymanoVersion
    );
    return result;
  };

  public commitLayer = async (hash: string) => {
    await this.init();

    const layerPath = `${this.layersPath}/${hash}`;

    const backingLayerHash = await this.qemuCommands.getBackingLayerHash(
      layerPath
    );
    const backingLayerPath = `${this.layersPath}/${backingLayerHash}`;

    const tmpBackingFile = `${backingLayerPath}.tmp`;
    fs.copyFileSync(backingLayerPath, tmpBackingFile);
    console.log("backingFile", backingLayerPath);

    await this.qemuCommands.commitLayer(layerPath);

    const newBackingFileHash = await fileHash(backingLayerPath);
    console.log("newBackingFileHash", newBackingFileHash);
    fs.copyFileSync(
      backingLayerPath,
      `${getUserDataPath()}/layers/${newBackingFileHash}`
    );
    fs.unlinkSync(backingLayerPath);
    fs.copyFileSync(tmpBackingFile, backingLayerPath);
    fs.unlinkSync(tmpBackingFile);

    this.dataSource.selectOrInsertLayer(newBackingFileHash);
  };

  private downloadAndExtract = async (userName: string, repoName: string) => {
    const url = `https://github.com/${userName}/${repoName}/archive/refs/heads/master.zip`;
    console.log("url", url);
    const tmpFile = tmp.fileSync();
    const tmpDir = tmp.dirSync();
    await downloadFile(url, tmpFile.name, 0, "repo", repoName);
    console.log("downloadFile ok = ", tmpFile.name);
    await unZip(tmpFile.name, tmpDir.name);
    const tmpRepoDir = `${tmpDir.name}/${repoName}-master`;
    return tmpRepoDir;
  };

  public createVm = async (configId: Number) => {
    const config = await this.dataSource.getConfigById(configId);
    console.log("config111:::::::::::", config);
    const nameAndArch = config.name.split("-");
    console.log("nameAndArch:::::::::::", nameAndArch);
    const drivesNames = this.getDrivesNamesFromConfig(
      JSON.parse(config.config),
      nameAndArch[nameAndArch.length - 1]
    );
    console.log("drivesNames:::::::::::", drivesNames);
    const [myConfigId, vmName] = await this.dataSource.addMyConfig(
      "",
      config.name,
      config.id,
      drivesNames,
      config.type === "internal"
    );
    console.log("myConfigId", myConfigId);
    return myConfigId;
  };

  public getMyVmsWithoutInternals = async () => {
    const myVms = await this.dataSource.getMyVmsWithoutInternals();
    console.log(`src/commands/kymano.ts:352 myVms`, myVms);
    return myVms;
  };

  public runVm = async (myConfigId: Number) => {
    console.log("runVm myConfigId", myConfigId);

    const [config, name] = await this.dataSource.getConfigByMyConfigId(
      myConfigId
    );
    const nameAndArch = name.split("-");
    const arch = nameAndArch[nameAndArch.length - 1];
    console.log("runVm myConfigId", myConfigId);
    console.log("runVm config", config);
    console.log("runVm myConfigId", myConfigId);
    const resp = await this.execConfig(
      myConfigId,
      arch,
      config,
      true,
      "remote"
    );
    await this.dataSource.updatePidAndStatusInMyConfig(
      myConfigId,
      resp[0].child.pid,
      "launched"
    );
    return [resp[0]];
  };

  public getDrivesNamesFromMyConfigId = async (myConfigId: Number) => {
    const [config, name] = await this.dataSource.getConfigByMyConfigId(
      myConfigId
    );
    const nameAndArch = name.split("-");
    const arch = nameAndArch[nameAndArch.length - 1];
    console.log("getDrivesNamesFromConfig:::", config, arch);
    return this.getDrivesNamesFromConfig(config, arch);
  };

  public getMyConfigById = async (id: Number) => {
    const conf = await this.dataSource.getMyConfigById(id);

    return conf;
  };

  private getDrivesNamesFromConfig = (config, arch) => {
    console.log("getDrivesNamesFromConfig:::", config, arch);
    const executionType = getExecutionType(arch);
    const drives = config[getPlatform()].local[executionType].drives;
    const drivesNames: any[] = [];
    Object.entries(drives).forEach(([driveName, drive]) => {
      if (drive.type && drive.type != "bios") {
        drivesNames.push(driveName);
      }
    });
    return drivesNames;
  };

  public run = async (urlOrPath: string, args: any) => {
    await this.init();
    let arch = getArch();
    if (args["platform"]) {
      arch = args["platform"];
    }

    console.log("arch:", arch);
    console.log("urlOrPath:", urlOrPath);

    let runConfig = "url";
    const splited = urlOrPath.split("/");

    if (/^([\w:\-]+)$/.test(urlOrPath)) {
      runConfig = "alias";
    } else if (!isGithubOrHttps(splited[0]) || ["", "."].includes(splited[0])) {
      runConfig = "path";
    }
    console.log("runConfig:", runConfig);

    if (runConfig === "alias") {
      const alias = urlOrPath;
      //let parsedConfig;
      let configName;
      // [parsedConfig, configName] = await this.dataSource.getConfigByCliAlias(alias);

      console.log("alias:", alias);
      let firstStart = false;
      // if (!parsedConfig) {
      firstStart = true;
      const resp0 = await axios.get(
        "https://raw.githubusercontent.com/kymano-app/repo/master/cli_aliases.yml"
      );
      const doc = yaml.load(resp0.data);
      console.log("doc:", doc);
      const findAlias = doc.find((elem: any) => elem.name === alias);
      if (!findAlias) {
        console.log("!findAlias");
        throw new AliasException(alias);
      }

      const ymlUrl = findAlias["url"].split("/");
      const nameAndVersion = ymlUrl[2].split(":");
      const tmpRepoDir = await this.downloadAndExtract(ymlUrl[0], ymlUrl[1]);
      const repoUrl = `https://github.com/${ymlUrl[0]}/${ymlUrl[1]}`;
      configName = `${nameAndVersion[0]}-${arch}`;
      const parsedConfig = await processConfig(
        `/${nameAndVersion[1]}`,
        `${tmpRepoDir}/${nameAndVersion[0]}-${arch}/`
      );
      await this.dataSource.addRepoWithConfigs(
        repoUrl,
        nameAndVersion[1],
        tmpRepoDir,
        configName
      );
      const configId = await this.dataSource.getConfigIdByRepoUrlAndName(
        repoUrl,
        configName
      );
      console.log(`configId: ${configId}`);

      const drivesNames = this.getDrivesNamesFromConfig(parsedConfig, arch);
      const [myConfigId, vmName] = await this.dataSource.addMyConfig(
        alias,
        configName,
        configId,
        drivesNames,
        false
      );
      // }

      console.log("parsedConfig:::::::::::", vmName, parsedConfig);
      const resp = await this.execConfig(
        myConfigId,
        arch,
        parsedConfig,
        firstStart,
        "remote"
      );
      return [resp[0]];
    }

    if (runConfig === "path") {
      let directory = path.dirname(urlOrPath);

      if (urlOrPath.slice(0, 2) === "./") {
        directory = path.dirname(urlOrPath.slice(2, urlOrPath.length));
      }

      console.log("directory:", directory);

      const parsedConfig = await processConfig(
        `/${path.basename(urlOrPath)}`,
        addAbsolutePathForRunningDirectory(directory)
      );
      console.log("parsedConfig::", parsedConfig);
      console.log("os.platform::", os.platform());

      // addMyLocalConfig(parsedConfig, db);
      const vmNameAvailable = await this.dataSource.isVmNameAvailable(
        parsedConfig.name
      );
      if (!vmNameAvailable) {
        console.log("Please select another name");
        process.exit(1);
      }
      // const myLocalConfigId = await this.dataSource.addOrUpdateMyLocalConfig(
      //   parsedConfig
      // );
      // const config = await this.dataSource.getMyLocalConfig(parsedConfig.name);
      // console.log("execConfig");
      const resp = await this.execConfig(
        parsedConfig.name,
        arch,
        parsedConfig,
        false,
        "local"
      );
      return [resp[0]];
    }
  };

    private execConfig = async (
    myConfigId: any,
    arch: string,
    config: any,
    firstStart: boolean,
    myConfigType: string
  ) => {
    console.log("execConfig");

    const executionType = getExecutionType(arch);

    console.log("executionType::::::", executionType, arch, getArch());

    console.log("getPlatform()", getPlatform());
    console.log(
      "config:::::::::",
      config[getPlatform()].local[executionType].config
    );

    let sockets = {};
    // if (myConfigType === "local") {
    //   sockets = await this.dataSource.getMyLocalConfigSockets(myConfigId);
    // } else {
    //   sockets = await this.dataSource.getMyConfigSockets(myConfigId);
    // }

    for (
      let i = 0;
      i < config[getPlatform()].local[executionType].config.length;
      i++
    ) {
      let configLine = config[getPlatform()].local[executionType].config[i];
      //for (let configLine of config[getPlatform()].local[executionType].config) {
      const key = Object.keys(configLine)[0];
      console.log("configLine key", key);
      console.log("configLine", configLine[key]);
      if (typeof configLine[key] !== "string") {
        continue;
      }
      const found = configLine[key].match(/socket\[name=(\w+)\]/i);
      if (found) {
        console.log("found::::::::::", found[0], found[1]);
        if (!sockets[found[1]]) {
          const tmpobj = tmp.fileSync();
          console.log("new socket", tmpobj.name);
          sockets[found[1]] = `${tmpobj.name}.sock`;
          config[getPlatform()].local[executionType].config[i][key] =
            configLine[key].replace(found[0], sockets[found[1]]);
        }
      }
    }
    console.log("sockets::", sockets);
    if (myConfigType === "local") {
      globalSockets["local"] = globalSockets["local"] || {};
      globalSockets["local"][myConfigId] = sockets;
      //await this.dataSource.getUpdateMyLocalConfigSockets(myConfigId, sockets);
    } else {
      //await this.dataSource.getUpdateMyConfigSockets(myConfigId, sockets);
      globalSockets["remote"] = globalSockets["remote"] || {};
      globalSockets["remote"][myConfigId] = sockets;
    }
    console.log("globalSockets::", globalSockets);

    console.log(
      "config[getPlatform()].local[executionType].config",
      config[getPlatform()].local[executionType].config
    );

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
    console.log("qemuBinary:::::::::", qemuBinary);

    if (!isFileExist(qemuBinary)) {
      await downloadAndExtract(qemuUrl, qemuDirectory, myConfigId);
    }

    console.log("qemu:::::::", qemuUrl, qemuDirectory, qemuBinary);

    const configVars = await this.getOrCreateUserDriveAndFillConfigVars(
      config[getPlatform()].local[executionType].drives,
      config[getPlatform()].local[executionType].snapshot,
      this.userDrivesDirectoryVm,
      qemuDirectory,
      firstStart,
      myConfigId
    );
    console.log("configVars:::::::::::", configVars);
    const confparams = await replaceVarsToDrivePathes(
      config[getPlatform()].local[executionType].config,
      configVars
    );

    if (firstStart) {
      console.log(
        "snapshot::::::",
        config[getPlatform()].local[executionType].snapshot
      );
      // start vm
      console.log("start");
      const resp = this.qemuCommands.startVm(confparams, qemuBinary);
      console.log("pid::", resp.child.pid);
      return [resp];
      //sendMonitorCommand("loadvm "+config[getPlatform()].local[executionType].snapshot.tag)
      //console.log('ok');
    } else {
      const resp = this.qemuCommands.startVm(confparams, qemuBinary);
      console.log("pid::", resp.child.pid);
      return [resp];
    }
  };

  private getOrCreateUserDriveAndFillConfigVars = async (
    drives: any,
    snapshot: any,
    userDrivesDirectory: string,
    qemuDirectory: string,
    firstStart: boolean,
    myConfigId: Number
  ) => {
    console.log("drives:::::::::::", drives);
    const configVars: any[][] = [];
    await Promise.all(
      Object.entries(drives).map(async ([driveName, driveData]) => {
        let userDrivePath = `${userDrivesDirectory}/${myConfigId}-${driveName}`;
        console.log("userDrivePath", userDrivePath);
        console.log("driveData:::::::::", driveData);
        console.log("driveData!", !driveData.path, !driveData.layers);
        if (!driveData.path && !driveData.layers) {
          console.log("!driveData.path && !driveData.layers");
          configVars.push([driveName, userDrivePath]);
          if (!isFileExist(userDrivePath)) {
            console.log("await createImg(userDrivePath);");
            await this.qemuCommands.createImg(userDrivePath);
          }
        } else if (driveData.path) {
          console.log("riveData.path");
          configVars.push([driveName, driveData.path]);
        } else if (driveData.layers) {
          console.log("driveData.layers::::::::::::::", driveData.layers);
          let backingLayerHash;
          const lastLayerHash =
            driveData.layers[driveData.layers.length - 1].hash;
          if (isFileExist(userDrivePath)) {
            backingLayerHash = await this.qemuCommands.getBackingLayerHash(
              userDrivePath
            );
          }
          console.log(
            "isFileExist(userDrivePath)",
            userDrivePath,
            isFileExist(userDrivePath)
          );

          console.log("driveData.layers", driveData.layers);

          for (let i in driveData.layers) {
            let layer = driveData.layers[i];
            console.log(
              "layer",
              layer,
              `${getUserDataPath()}/layers/${layer.hash}`
            );
            if (!isFileExist(`${getUserDataPath()}/layers/${layer.hash}`)) {
              await this.downloadLayer(
                layer.url,
                layer.hash,
                driveName,
                myConfigId
              );
              // ??????????????????????????? backingLayerHash = await getBackingLayerHash(userDrivePath, qemuDirectory);
            }
          }
          console.log("downloadLayer ok");
          console.log("driveData.type:::::::", driveData.type);
          console.log(
            "backingLayerHash::::lastLayerHash::",
            backingLayerHash,
            lastLayerHash
          );

          if (
            driveData.type === "system" &&
            backingLayerHash !== lastLayerHash
          ) {
            if (snapshot && firstStart) {
              console.log(
                "userDrivePath",
                userDrivePath,
                myConfigId,
                userDrivesDirectory
              );
              const tmpDir = tmp.dirSync();
              const files = await downloadAndExtract(
                snapshot.url,
                tmpDir.name,
                myConfigId
              );
              console.log("files:::::::::::", files);
              fs.renameSync(path.join(tmpDir.name, files[0]), userDrivePath);
              await this.qemuCommands.changeBackingFile(
                `${getUserDataPath()}/layers/${lastLayerHash}`,
                userDrivePath,
                qemuDirectory
              );
            } else {
              await this.qemuCommands.createContainer(
                `${getUserDataPath()}/layers/${lastLayerHash}`,
                userDrivePath
              );
            }
          } else if (driveData.type !== "system") {
            userDrivePath = `${getUserDataPath()}/layers/${lastLayerHash}`;
          }
          console.log("userDrivePath:::::::::::", userDrivePath, driveData);
          configVars.push([driveName, userDrivePath]);
        }
      })
    );
    return configVars;
  };

  private downloadLayer = async (
    url: string,
    hash: string,
    driveName: string,
    myConfigId: Number
  ) => {
    const layersPath = `${getUserDataPath()}/layers`;
    //const layerFileTmp = `${layersPath}/${uuidv4()}.tmp.qcow2`;

    console.log("downloadLayer:::::::;", url, hash);

    if (!isFileExist(layersPath)) {
      await fsAsync.mkdir(layersPath, {
        recursive: true,
      });
    }

    const imgPath = await recursiveDownload(url, "", driveName, myConfigId, 'layer', driveName);
    console.log("imgPath:::::::::::;", imgPath);
    fs.renameSync(imgPath, `${layersPath}/${hash}`);

    // fs.unlinkSync(layerFileTmp);

    this.dataSource.selectOrInsertLayer(hash);
  };

  public importDisk = async (importingFilePath: string, name: string) => {
    console.log("importingFilePath", importingFilePath);

    await this.init();

    const fileTmp = tmp.fileSync().name;

    await this.qemuCommands.convert(importingFilePath, fileTmp);
    const diskId = await this.dataSource.insertMyDisk(name);
    const diskPath = `${this.userDrivesDirectoryDisk}/${diskId}`;
    console.log("diskPath", diskPath);

    fs.renameSync(fileTmp, diskPath);

    console.log("diskPath:", diskPath);

    return diskPath;
  };

  public importLayer = async (importingFilePath: string) => {
    await this.init();

    const layerFileTmp = tmp.fileSync().name;

    await this.qemuCommands.convert(importingFilePath, layerFileTmp);
    const fileHash = await hash(tmp.fileSync().name);
    const layersPath = `${this.layersPath}/${fileHash}`;

    // fs.copyFileSync(layerFileTmp, `${layersPath}/${fileHash}.qcow2`);
    // fs.unlinkSync(layerFileTmp);
    fs.renameSync(layerFileTmp, layersPath);

    this.dataSource.selectOrInsertLayer(fileHash);
    console.log("layersPath:", layersPath);

    return layersPath;
  };
}
