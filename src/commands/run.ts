import path from 'path';
import os from 'os';
import addOrUpdateMyLocalConfig from '../dataSource/config/addOrUpdateMyLocalConfig';
import processConfig from '../v1/processConfig';
import execConfig from './service/execConfig';
import axios from 'axios';
import downloadFile from './service/downloadFile';
import unPackTarGz from './service/unPackTarGz';
import getUserDataPath from './service/getUserDataPath';
import unZip from './service/unZip';
import getArch from './service/getArch';
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

const run = async (args: any[], db: any) => {
  const urlOrPath = args._[1];
  let runConfig = 'url';
  const splited = urlOrPath.split('/');

  if (/^([\w:]+)$/.test(urlOrPath)) {
    runConfig = 'alias';
  } else if (!isGithubOrHttps(splited[0]) || ['', '.'].includes(splited[0])) {
    runConfig = 'path';
  }

  if (runConfig === 'alias') {
    const resp = await axios.get('https://raw.githubusercontent.com/kymano-app/repo/master/aliases.yml');
    const doc = yaml.load(resp.data);
    const ymlUrl = doc.find((elem) => elem.name === 'fedora')['url'].split('/');
    const nameAndVersion = ymlUrl[2].split(':');
    console.log(nameAndVersion)
    const url = `https://github.com/${ymlUrl[0]}/${ymlUrl[1]}/archive/refs/heads/master.zip`
    const tmpFile = tmp.fileSync();
    const tmpDir = tmp.dirSync();
    await downloadFile(url, tmpFile.name);
    console.log('downloadFile ok = ', tmpFile.name)
    await unZip(tmpFile.name, tmpDir.name);
    console.log()
    const parsedConfig = await processConfig(
      `/${nameAndVersion[1]}`,
      `${tmpDir.name}/${ymlUrl[1]}-master/${nameAndVersion[0]}-${getArch()}/`
    );
    console.log('parsedConfig::', parsedConfig);
    await addOrUpdateMyLocalConfig(parsedConfig, db);
    await execConfig(parsedConfig.name, db);
    //const resp2 = await axios.get(ymlUrl);
    //const doc2 = yaml.load(resp2.data);
    //console.log(doc2);
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
    await addOrUpdateMyLocalConfig(parsedConfig, db);
    await execConfig(parsedConfig.name, db);
  }
};

export default async (args: any[], db: any) => {
  return Promise.resolve(await run(args, db));
};
