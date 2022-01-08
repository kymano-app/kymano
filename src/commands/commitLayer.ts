import commitLayerCommand from '../qemuCommands/commitLayer';
import getBackingLayerHash from '../qemuCommands/getBackingLayerHash';
import getUserDataPath from './service/getUserDataPath';

const spawn = require('await-spawn');

const hasha = require('hasha');
const fsAsync = require('fs').promises;
const fs = require('fs');

const commitLayer = async (args: any[], db: any) => {
  const hash = args._[1];
  const layersPath = `${getUserDataPath()}/layers`;
  const layerPath = `${layersPath}/${hash}.qcow2`;

  const backingLayerHash = await getBackingLayerHash(layerPath);
  const backingLayerPath = `${layersPath}/${backingLayerHash}.qcow2`;

  const tmpBackingFile = `${backingLayerPath}.tmp`;
  fs.copyFileSync(backingLayerPath, tmpBackingFile);
  console.log('backingFile', backingLayerPath);

  await commitLayerCommand(layerPath);

  const newBackingFileHash = await hasha.fromFile(backingLayerPath, {
    algorithm: 'sha256',
  });
  console.log('newBackingFileHash', newBackingFileHash);
  fs.copyFileSync(
    backingLayerPath,
    `${getUserDataPath()}/layers/${newBackingFileHash}.qcow2`
  );
  fs.unlinkSync(backingLayerPath);
  fs.copyFileSync(tmpBackingFile, backingLayerPath);
  fs.unlinkSync(tmpBackingFile);

  const row = db
    .prepare('SELECT * FROM layer_v1 WHERE hash = ?')
    .get(newBackingFileHash);
  if (!row) {
    const sql = `INSERT INTO layer_v1 (hash, format) VALUES (?, ?)`;
    await db.prepare(sql).run(newBackingFileHash, 'qcow2');
  }
};

export default async (args: any[], db: any) => {
  return Promise.resolve(await commitLayer(args, db));
};
