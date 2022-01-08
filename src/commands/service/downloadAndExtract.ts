import downloadFile from './downloadFile';
import unPackTarGz from './unPackTarGz';

const tmp = require('tmp');

async function downloadAndExtract(url: string, path: string) {
  const tmpobj = tmp.fileSync();
  console.log('url:::::::::::: ', url);
  console.log('File: ', tmpobj.name);
  console.log('Filedescriptor: ', tmpobj.fd);
  await downloadFile(url, tmpobj.name);
  console.log('downloadFile ok')
  await unPackTarGz(tmpobj.name, path);
  console.log('unPackTarGz ok')
  tmpobj.removeCallback();
}

export default async (url: string, path: string) => {
  return Promise.resolve(await downloadAndExtract(url, path));
};
