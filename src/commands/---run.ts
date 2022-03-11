import axios from 'axios';
import os from 'os';
import path from 'path';
import addMyConfig from '../dataSource/config/addMyConfig';
import addOrUpdateMyLocalConfig from '../dataSource/config/addOrUpdateMyLocalConfig';
import addRepoWithConfigs from '../dataSource/config/addRepoWithConfigs';
import getConfigByCliAlias from '../dataSource/config/getConfigByCliAlias';
import getConfigIdByRepoUrlAndName from '../dataSource/config/getConfigIdByRepoUrlAndName';
import getMyLocalConfig from '../dataSource/config/getMyLocalConfig';
import isVmNameAvailable from '../dataSource/config/isVmNameAvailable';
import processConfig from '../v1/processConfig';
import downloadFile from './service/downloadFile';
import execConfig from './service/execConfig';
import getArch from './service/getArch';
import unZip from './service/unZip';
const yaml = require('js-yaml');
const tmp = require('tmp');

const isAbsolutePath = (directory: string) => {
  return __dirname.split('/')[0] === directory.split('/')[0];
};
const addAbsolutePathForRunningDirectory = (directory: string) => {
  console.log('directory', directory, process.env.PWD);
  return isAbsolutePath(directory)
    ? directory
    : `${process.env.PWD}/${directory}`;
};
const isGithubOrHttps = (firstPart: string) => {
  return ['github', 'http', 'https'].includes(firstPart);
};

const run = async (urlOrPath: string, args: any[]) => {
  let arch = getArch();
  if (args.platform) {
    arch = args.platform;
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
    [parsedConfig, configName] = await getConfigByCliAlias(alias, db);

    let firstStart = false;
    if (!parsedConfig) {
      firstStart = true;
      const resp = await axios.get('https://raw.githubusercontent.com/kymano-app/repo/master/cli_aliases.yml');
      const doc = yaml.load(resp.data);
      const ymlUrl = doc.find((elem) => elem.name === alias)['url'].split('/');
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
      await addRepoWithConfigs(repoUrl, nameAndVersion[1], tmpRepoDir, configName, db);
      const configId = await getConfigIdByRepoUrlAndName(repoUrl, configName, db);
      await addMyConfig(alias, configName, db, configId);
    }

    console.log('parsedConfig:::::::::::', configName, parsedConfig);
    await execConfig(configName, arch, parsedConfig, firstStart, db);
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
    const vmNameAvailable = await isVmNameAvailable(parsedConfig.name, db);
    if (!vmNameAvailable) {
      console.log('Please select another name')
      process.exit(1);
    }
    await addOrUpdateMyLocalConfig(parsedConfig, db);
    const config = await getMyLocalConfig(parsedConfig.name, db);
    await execConfig(parsedConfig.name, arch, config, false, db);
  }
};

export default async (args: any[], db: any) => {
  return Promise.resolve(await run(args, db));
};
