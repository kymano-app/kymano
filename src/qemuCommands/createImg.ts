import execCommand from "../commands/service/execCommand";
import getPlatform from "../commands/service/getPlatform";

const spawn = require('await-spawn');

const createImg = async (imgPath: string, qemuDirectory: string) => {
  try {
    const qemuImg = `${qemuDirectory}/bin/qemu-img`;
    if (getPlatform()==='macos') {
      await spawn("chmod", ["+x", qemuImg], { stdio: "inherit" });
      await spawn("xattr", ["-cr", qemuImg], { stdio: "inherit" });
    }
    const response = await execCommand(['create', '-f', 'qcow2', `${imgPath}`, '100G'], qemuImg)

    console.log('response::::::::', response.toString());
  } catch (e) {
    console.log('ERR::::::::::::', e);
  }
};

export default async (path: string, qemuDirectory: string) => {
  return Promise.resolve(await createImg(path, qemuDirectory));
};
