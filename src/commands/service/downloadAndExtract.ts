import downloadFile from './downloadFile';
import unPackTarGz from './unPackTarGz';

const tmp = require('tmp');
const awaitSpawn = require("await-spawn");

async function downloadAndExtract(url: string, path: string, tmpobj) {
  
  console.log('url:::::::::::: ', url);
  console.log('File: ', tmpobj.name);
  console.log('Filedescriptor: ', tmpobj.fd);
  await downloadFile(url, tmpobj.name);
  console.log('downloadFile ok')
  await unPackTarGz(tmpobj.name, path);
  console.log('unPackTarGz ok')
  try {
    const response = await awaitSpawn('ls', ['-lt', path]);
    console.log('ls -l 1:::::>>>>>>>>>>',response.toString());
  } catch(e) {
    console.log('e:::', e)
  }
  //tmpobj.removeCallback();
  try {
    const response = await awaitSpawn('ls', ['-lt', path]);
    console.log('ls -l 2:::::>>>>>>>>>>',response.toString());
  } catch(e) {
    console.log('e:::', e)
  }
}

export default async (url: string, path: string, tmpobj) => {
  return Promise.resolve(await downloadAndExtract(url, path, tmpobj));
};
