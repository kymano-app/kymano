import execCommand from "../commands/service/execCommand";
import getArch from "../commands/service/getArch";
import getPlatform from "../commands/service/getPlatform";
import getUserDataPath from "../commands/service/getUserDataPath";
import { QEMU_DEFAULT } from "../consts";

const getBackingLayerHash = async (imgpath: string, qemuDirectory: string) => {
  const qemuImg = `${getUserDataPath()}/qemu/${QEMU_DEFAULT[getPlatform()]}-${getPlatform()}-${getArch()}/bin/qemu-img`;

  try {
    const qemuInfo = await execCommand(
      ["info", imgpath, "--output=json"],
      qemuImg,
      'pipe'
    );

    const parsedResponse = JSON.parse(qemuInfo);
    console.log("parsedResponse", parsedResponse);
    if (parsedResponse["backing-filename"]) {
      const splited = parsedResponse["backing-filename"].split("/");
      return splited[splited.length - 1];
    }
  } catch (e) {
    console.log("ERR::::::::::::", e);
  }
  return undefined;
};

export default async (path: string, qemuDirectory: string) => {
  return Promise.resolve(await getBackingLayerHash(path, qemuDirectory));
};
