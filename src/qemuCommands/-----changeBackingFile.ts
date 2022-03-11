import { execCommand } from "../commands/service/execCommand"

const changeBackingFile = async (
  backingFile: string,
  containerFile: string,
  qemuDirectory: string
) => {
  const qemuImg = `${qemuDirectory}/bin/qemu-img`;
  console.log("createLayer", qemuImg, backingFile, containerFile);
  const cmd = [
    "rebase",
    "-f",
    "qcow2",
    "-F",
    "qcow2",
    "-u",
    "-b",
    backingFile,
    containerFile,
  ];

  const response = await execCommand(cmd, qemuImg, "pipe")
};

export default async (
  backingFile: string,
  layerFile: string,
  qemuDirectory: string
) => {
  return Promise.resolve(
    await changeBackingFile(backingFile, layerFile, qemuDirectory)
  );
};
