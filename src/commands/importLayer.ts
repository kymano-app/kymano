import { v4 as uuidv4 } from 'uuid';
import convert from '../qemuCommands/convert';
import isFileExist from '../service/isFileExist';
import getUserDataPath from './service/getUserDataPath';

const hasha = require('hasha');
const fsAsync = require('fs').promises;
const fs = require('fs');

const importLayer = async (args: any[], db: any) => {
  const importingFilePath = args[5];
  const layersPath = `${getUserDataPath()}/layers`;

  const layerFileTmp = `${layersPath}/${uuidv4()}.tmp.qcow2`;

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
  fs.renameSync(layerFileTmp, `${layersPath}/${fileHash}.qcow2`);

  const row = db.prepare('SELECT * FROM layer_v1 WHERE hash = ?').get(fileHash);
  if (!row) {
    const sql = `INSERT INTO layer_v1 (hash, format) VALUES (?, ?)`;
    await db.prepare(sql).run(fileHash, 'qcow2');
  }
};

export default async (args: any[], db: any) => {
  return Promise.resolve(await importLayer(args, db));
};
