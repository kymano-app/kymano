import path from "path";

const spawn = require('await-spawn');

const createImg = async (imgPath: string, qemuDirectory: string) => {
  try {
    const qemuImg = `${qemuDirectory}/bin/qemu-img`;
    await spawn("chmod", ["+x", qemuImg], { stdio: "inherit" });
    await spawn("xattr", ["-cr", qemuImg], { stdio: "inherit" });
    const response = await spawn(
      qemuImg,
      ['create', '-f', 'qcow2', `${imgPath}`, '100G'],
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
    console.log('response::::::::', response.toString());
  } catch (e) {
    console.log('ERR::::::::::::', e);
  }
};

export default async (path: string, qemuDirectory: string) => {
  return Promise.resolve(await createImg(path, qemuDirectory));
};
