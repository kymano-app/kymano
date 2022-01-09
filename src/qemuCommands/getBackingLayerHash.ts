import path from "path";
import execCommand from "../commands/service/execCommand";

const spawn = require("await-spawn");

const getBackingLayerHash = async (imgpath: string, qemuDirectory:string) => {
  const qemuImg = `${qemuDirectory}/bin/qemu-img`;
  try {
    // const qemuInfo = await spawn(qemuImg, ["info", imgpath, "--output=json"], {
    //   stdio: "inherit",
    //   env: {
    //     ...process.env,
    //     DYLD_LIBRARY_PATH: path.join(
    //       qemuImg.split("/").slice(0, -2).join("/"),
    //       "lib"
    //     ),
    //   },
    // });
    const qemuInfo = await execCommand(["info", imgpath, "--output=json"], qemuImg)

    const parsedResponse = JSON.parse(qemuInfo.toString());
    if (parsedResponse["backing-filename"]) {
      return /^.*?([\w]+)\.[\w]+$/.exec(parsedResponse["backing-filename"])![1];
    }
  } catch (e) {
    console.log(e.stderr);
  }
  return undefined;
};

export default async (path: string, qemuDirectory:string) => {
  return Promise.resolve(await getBackingLayerHash(path, qemuDirectory));
};
