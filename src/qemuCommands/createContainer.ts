import path from "path";
import execCommand from "../commands/service/execCommand";

const spawn = require("await-spawn");

const createContainer = async (
  backingFile: string,
  containerFile: string,
  qemuDirectory: string
) => {
  // backingFile = backingFile
  // containerFile = containerFile
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

  // const response = await spawn(qemuImg, cmd, {
  //   stdio: "inherit",
  //   env: {
  //     ...process.env,
  //     DYLD_LIBRARY_PATH: path.join(
  //       qemuImg.split("/").slice(0, -2).join("/"),
  //       "lib"
  //     ),
  //   },
  // });
  const response = await execCommand(cmd, qemuImg)

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
