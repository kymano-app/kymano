import path from 'path';
import isFileExist from "../service/isFileExist";
import downloadAndExtract from "./service/downloadAndExtract";
import execCommand from "./service/execCommand";
import getUserDataPath from "./service/getUserDataPath";
const fs = require('fs').promises;

const spawn = require('await-spawn');

const inspectLayer = async (args: string[]) => {
  try {
    const layer = args._[1];
    const guestfsDirectory = `${getUserDataPath()}/guestfs/`;
    if (!isFileExist(guestfsDirectory)) {
      await fs.mkdir(guestfsDirectory, {
        recursive: true,
      });
    }
    const guestfsBinary = path.join(
      guestfsDirectory, `run`
    );
    console.log('guestfsBinary:::', guestfsBinary)
  
    const guestfsUrl = `https://github.com/kymano-app/libguestfs/releases/download/0.0.1/guestfs.tgz`;
    if (!isFileExist(guestfsBinary)) {
       await downloadAndExtract(guestfsUrl, guestfsDirectory);
    }
    // LIBGUESTFS_BACKEND_SETTINGS=force_tcg LIBGUESTFS_HV="/opt/local/bin/qemu-system-aarch64" LIBGUESTFS_PATH=/private/tmp/111/app DYLD_LIBRARY_PATH=./lib/.libs:/private/tmp/guestfs_7/libs ./run guestfish -a "/Users/oleg/Library/Application Support/kymano/user_layers/win11/system.qcow2" -i

    await spawn("chmod", ["+x", qemuImg], { stdio: "inherit" });
    await spawn("xattr", ["-cr", qemuImg], { stdio: "inherit" });

    const response = await execCommand(['commit', layerPath], qemuImg)

    console.log(response.toString(), layerPath);
  } catch (e) {
    console.log(e.stderr.toString(), layerPath);
  }
};

export default async (layerPath: string) => {
  return Promise.resolve(await inspectLayer(layerPath));
};
