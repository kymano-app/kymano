import getUserDataPath from "./service/getUserDataPath";

const hasha = require("hasha");
const fsAsync = require("fs").promises;
const fs = require("fs");

const commit = async (args: any[], db: any) => {
  const vmAndDisk = args._[1];
  const vmName = vmAndDisk.split("/")[0];
  const diskName = vmAndDisk.split("/")[1];
  const layersPath = `${getUserDataPath()}/layers`;
  const driveFile = `${getUserDataPath()}/user_layers/${vmName}/${diskName}.qcow2`;
  const fileHash = await hasha.fromFile(driveFile, { algorithm: "sha256" });
  const layerFile = `${layersPath}/${fileHash}`;

  try {
    await fsAsync.access(layersPath);
  } catch (error) {
    await fsAsync.mkdir(layersPath, {
      recursive: true,
    });
  }

  fs.copyFileSync(driveFile, layerFile);
  fs.unlinkSync(driveFile);

  const row = db.prepare("SELECT * FROM layer_v1 WHERE hash = ?").get(fileHash);
  if (!row) {
    const sql = `INSERT INTO layer_v1 (hash, format) VALUES (?, ?)`;
    await db.prepare(sql).run(fileHash, "qcow2");
  }
  console.log("fileHash", fileHash);
};

export default async (args: any[], db: any) => {
  return Promise.resolve(await commit(args, db));
};
