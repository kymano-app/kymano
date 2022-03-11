import { execCommand } from "../commands/service/execCommand";
import getArch from "../commands/service/getArch";
import getPlatform from "../commands/service/getPlatform";
import getUserDataPath from "../commands/service/getUserDataPath";
import { QEMU_DEFAULT } from "../consts";

const convert = async (importingPath: string, layerPath: string) => {
  try {
    const qemuImg = `${getUserDataPath()}/qemu/${QEMU_DEFAULT[getPlatform()]}-${getPlatform()}-${getArch()}/bin/qemu-img`;
    const response = await execCommand(
      ["convert", "-p", importingPath, "-O", "raw", layerPath],
      qemuImg,
      "pipe"
    );
    //convert -f parallels original.hds -O raw converted.raw
    console.log(response.toString());
  } catch (e) {
    console.log(e);
  }
};

export default async (importingPath: string, layerPath: string) => {
  return Promise.resolve(await convert(importingPath, layerPath));
};
