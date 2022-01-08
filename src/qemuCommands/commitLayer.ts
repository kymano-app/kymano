import path from "path";
import getArch from "../commands/service/getArch";
import getPlatform from "../commands/service/getPlatform";
import getUserDataPath from "../commands/service/getUserDataPath";

const spawn = require('await-spawn');

const commitLayer = async (layerPath: string) => {
  try {
    const qemuVersion = '6.2.0-gpu-sdl';
    const qemuDirectory = `${getUserDataPath()}/qemu/${qemuVersion}-${getPlatform()}-${getArch()}`;
    const qemuImg = `${qemuDirectory}/bin/qemu-img`;
    await spawn("chmod", ["+x", qemuImg], { stdio: "inherit" });
    await spawn("xattr", ["-cr", qemuImg], { stdio: "inherit" });
    const response = await spawn(
      qemuImg,
      ['commit', layerPath],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DYLD_LIBRARY_PATH: path.join(
            qemuImg.split("/").slice(0, -2).join("/"),
            "lib"
          ),
        },
      }
    );

    console.log(response.toString(), layerPath);
  } catch (e) {
    console.log(e.stderr.toString(), layerPath);
  }
};

export default async (layerPath: string) => {
  return Promise.resolve(await commitLayer(layerPath));
};
