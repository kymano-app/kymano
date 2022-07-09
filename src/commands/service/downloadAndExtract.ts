import downloadFile from './downloadFile';
import unPackTarGz from './unPackTarGz';

const tmp = require('tmp');

async function downloadAndExtract(url: string, path: string, myConfigId: Number, type: string, name: string) {
  const tmpobj = tmp.fileSync();
  console.log('downloadAndExtract:::::::::::: ', url, myConfigId, type, name);
  console.log('File: ', tmpobj.name);
  console.log('Filedescriptor: ', tmpobj.fd);
  await downloadFile(url, tmpobj.name, myConfigId, type, name);
  console.log('downloadFile ok')
  const files = await unPackTarGz(tmpobj.name, path, myConfigId);
  console.log('unPackTarGz ok')
  tmpobj.removeCallback();
  return files;
}

export default async (url: string, path: string, myConfigId: Number, type: string, name: string) => {
  return Promise.resolve(await downloadAndExtract(url, path, myConfigId, type, name));
};
