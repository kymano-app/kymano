import path from 'path';
import isFileExist from '../../service/isFileExist';
import downloadAndExtract from './downloadAndExtract';
import { getFileNameFromUrl } from './getFileNameFromUrl';
import getUserDataPath from './getUserDataPath';

const hasha = require('hasha');
const fsAsync = require('fs').promises;
const fs = require('fs');
const tmp = require('tmp');
const awaitSpawn = require("await-spawn");

const ______________recursiveDowload = async (url: string, firstFile: string) => {
  const tmpDir = tmp.dirSync();

  console.log('recursiveDowload::::::::::::::', url, firstFile)
  const unpackedDowloadedTmp = path.join(tmpDir.name, getFileNameFromUrl(url));
  console.log('layerFileTmp::::::::', unpackedDowloadedTmp)
  await downloadAndExtract(url, tmpDir.name)

  console.log('readFileSync:::', unpackedDowloadedTmp)

  if (!isFileExist(unpackedDowloadedTmp)) {
    console.log('!!!!!!!!!!!!unpackedDowloadedTmp')
  }
  let [newQcow2] = fs.readdirSync(unpackedDowloadedTmp).filter((file: any) => {console.log(file); return path.extname(file) === '.qcow2' || path.extname(file) === '.fd' || path.extname(file) === '.img'});
  newQcow2 = path.join(unpackedDowloadedTmp, newQcow2);
  console.log('qcow2::::::::::', newQcow2)
  if (firstFile) {
    await joinFiles(firstFile, newQcow2);
  } else {
    firstFile = newQcow2;
  }

  const next = path.join(unpackedDowloadedTmp, 'next');
  if (isFileExist(next)) {
    console.log('readFileSync:', next)
    var newUrl = fs.readFileSync(next, 'utf8').trim();
    await recursiveDowload(newUrl, firstFile)
  }
  // } else {
  //   console.log('fileHash1:::::::')
  //   fileHash = await hasha.fromFile((unpackedDowloadedTmp), {
  //     algorithm: 'sha256',
  //   });
  // }

  return firstFile;
}

const __________downloadLayer = async (url: string, hash: string, db: any) => {
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

  const row = db.prepare('SELECT * FROM layer_v1 WHERE hash = ?').get(hash);
  if (!row) {
    const sql = `INSERT INTO layer_v1 (hash, format) VALUES (?, ?)`;
    await db.prepare(sql).run(hash, 'qcow2');
  }
};

const ________getFileNameFromUrl = (url: string) =>  {
  const urlSplit = url.split('/');
  return urlSplit[urlSplit.length-1].replaceAll('.tgz', '');
}

async function ____________joinFiles(name1: string, name2: string) {
  console.log(name1, name2)
  return new Promise<void>(resolve => {
    console.log('joinFiles', name1, name2)
      // open destination file for appending
      var w = fs.createWriteStream(name1, {flags: 'a'});
      // open source file for reading
      var r = fs.createReadStream(name2);

      w.on('close', function() {
        console.log('finish!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', name1)
        resolve();
      });
      w.on('error', function(err) {
        console.log('err!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', err)
        resolve();
      });
      r.pipe(w);
  })
}

export default async (url: string, hash: string, db: any) => {
  return Promise.resolve(await downloadLayer(url, hash, db));
};
