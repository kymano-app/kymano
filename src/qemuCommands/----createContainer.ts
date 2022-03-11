import { execCommand } from "../commands/service/execCommand";

const spawn = require("await-spawn");

const createContainer = async (
  backingFile: string,
  containerFile: string,
  qemuDirectory: string
) => {
  const qemuImg = `${qemuDirectory}/bin/qemu-img`;
  console.log("createLayer", qemuImg, backingFile, containerFile);
  const cmd = [
    "create",
    "-f",
    "qcow2",
    "-F",
    "qcow2",
    "-b",
    backingFile,
    containerFile,
  ];

  const response = await execCommand(cmd, qemuImg, 'pipe')
};

export default async (
  backingFile: string,
  layerFile: string,
  qemuDirectory: string
) => {
  return Promise.resolve(
    await createContainer(backingFile, layerFile, qemuDirectory)
  );
};
