import path from 'path';
import isFileExist from '../service/isFileExist';
import downloadAndExtract from './service/downloadAndExtract';
import getUserDataPath from './service/getUserDataPath';

const hasha = require('hasha');
const fsAsync = require('fs').promises;
const fs = require('fs');
const tmp = require('tmp');

const downloadLayer = async (url: string, hash: string, db: any) => {
  const layersPath = `${getUserDataPath()}/layers`;
  //const layerFileTmp = `${layersPath}/${uuidv4()}.tmp.qcow2`;

  console.log('downloadLayer:::::::;', url, hash)

  if (!isFileExist(layersPath)) {
    await fsAsync.mkdir(layersPath, {
      recursive: true,
    });
  }

  let fileHash
  let i = 0;
  const tmpDir = tmp.dirSync();
  const layerFileTmp = path.join(tmpDir.name, getFileNameFromUrl(url));
  let imgPath = layerFileTmp;
  console.log('layerFileTmp::::::::', layerFileTmp)
  do {
    await downloadAndExtract(url, tmpDir.name)
    console.log('downloadAndExtract:::::::::::::::::', );
    const info = path.join(layerFileTmp, 'info');
    console.log('info:::::::::::::::::', info);
    if (isFileExist(info)) {
      console.log('isFileExist:::::::::::::::::', info);
      var newUrl = fs.readFileSync(info, 'utf8');
      console.log('newUrl:::::::', newUrl)
      await downloadAndExtract(newUrl, tmpDir.name);
      console.log('joinFiles:::::::', newUrl)
      const file1 = path.join(tmpDir.name, getFileNameFromUrl(url), getFileNameFromUrl(url));
      const file2 = path.join(tmpDir.name, getFileNameFromUrl(newUrl), getFileNameFromUrl(newUrl))
      imgPath = file1;
      await joinFiles(file1, file2);
      console.log('joinFiles ok :::::::')
      fileHash = await hasha.fromFile(file1, {
        algorithm: 'sha256',
      });
      console.log('fileHash:::::::', fileHash)

    } else {

      console.log('fileHash1:::::::')

      fileHash = await hasha.fromFile((layerFileTmp), {
        algorithm: 'sha256',
      });
    }
    i++;
  } while(hash !== fileHash && i < 3);

  console.log('imgPath:::::::::::;', imgPath)
  fs.renameSync(imgPath, `${layersPath}/${fileHash}`);

  // fs.unlinkSync(layerFileTmp);

  const row = db.prepare('SELECT * FROM layer_v1 WHERE hash = ?').get(fileHash);
  if (!row) {
    const sql = `INSERT INTO layer_v1 (hash, format) VALUES (?, ?)`;
    await db.prepare(sql).run(fileHash, 'qcow2');
  }
};

const getFileNameFromUrl = (url: string) =>  {
  const urlSplit = url.split('/');
  return urlSplit[urlSplit.length-1].replaceAll('.tgz', '');
}

async function joinFiles(name1: string, name2: string) {
  console.log(name1, name2)
  return new Promise<void>(resolve => {
      // open destination file for appending
      var w = fs.createWriteStream(name1, {flags: 'a'});
      // open source file for reading
      var r = fs.createReadStream(name2);

      w.on('close', function() {
        console.log('finish!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
        resolve();
      });
      r.pipe(w);
  })
}

export default async (url: string, hash: string, db: any) => {
  return Promise.resolve(await downloadLayer(url, hash, db));
};
