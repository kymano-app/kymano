import execCommand from "../commands/service/execCommand";
import getArch from "../commands/service/getArch";
import getPlatform from "../commands/service/getPlatform";
import getUserDataPath from "../commands/service/getUserDataPath";
import { QEMU_DEFAULT } from "../consts";

const spawn = require('await-spawn');

const commitLayer = async (layerPath: string) => {
  try {
    const qemuImg = `${getUserDataPath()}/qemu/${QEMU_DEFAULT[getPlatform()]}-${getPlatform()}-${getArch()}/bin/qemu-img`;
    await spawn("chmod", ["+x", qemuImg], { stdio: "inherit" });
    await spawn("xattr", ["-cr", qemuImg], { stdio: "inherit" });

    const response = await execCommand(['commit', layerPath], qemuImg)

    console.log(response.toString(), layerPath);
  } catch (e) {
    console.log(e.stderr.toString(), layerPath);
  }
};

export default async (layerPath: string) => {
  return Promise.resolve(await commitLayer(layerPath));
};
