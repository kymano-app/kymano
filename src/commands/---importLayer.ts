import convert from '../qemuCommands/convert';
import isFileExist from '../service/isFileExist';
import getUserDataPath from './service/getUserDataPath';
const tmp = require('tmp');
const hasha = require('hasha');
const fsAsync = require('fs').promises;
const fs = require('fs');

export const importLayer = async (args: any[], db: any) => {
  const importingFilePath = args._[1];

  const layersPath = `${getUserDataPath()}/layers`;

  const tmpFile = tmp.fileSync();
  const layerFileTmp = tmpFile.name;

  if (!isFileExist(layersPath)) {
    await fsAsync.mkdir(layersPath, {
      recursive: true,
    });
  }

  await convert(importingFilePath, layerFileTmp);
  const fileHash = await hasha.fromFile(layerFileTmp, {
    algorithm: 'sha256',
  });

  // fs.copyFileSync(layerFileTmp, `${layersPath}/${fileHash}.qcow2`);
  // fs.unlinkSync(layerFileTmp);
  fs.renameSync(layerFileTmp, `${layersPath}/${fileHash}`);

  const row = db.prepare('SELECT * FROM layer_v1 WHERE hash = ?').get(fileHash);
  if (!row) {
    const sql = `INSERT INTO layer_v1 (hash, format) VALUES (?, ?)`;
    await db.prepare(sql).run(fileHash, 'qcow2');
  }
  console.log('fileHash:', fileHash);
};

export default async (args: any[], db: any) => {
  return Promise.resolve(await importLayer(args, db));
};
