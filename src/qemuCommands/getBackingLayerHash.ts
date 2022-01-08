import path from "path";

const spawn = require("await-spawn");

const getBackingLayerHash = async (imgpath: string, qemuDirectory) => {
  const qemuImg = `${qemuDirectory}/bin/qemu-img`;
  try {
    const qemuInfo = await spawn(qemuImg, ["info", imgpath, "--output=json"], {
      stdio: "inherit",
      env: {
        ...process.env,
        DYLD_LIBRARY_PATH: path.join(
          qemuImg.split("/").slice(0, -2).join("/"),
          "lib"
        ),
      },
    });
    console.log(
      "qemuInfo::::::::::::",
      qemuImg,
      ["info", imgpath, "--output=json"],
      "DYLD_LIBRARY_PATH",
      path.join(qemuImg.split("/").slice(0, -2).join("/"), "lib")
    );
    const parsedResponse = JSON.parse(qemuInfo.toString());
    if (parsedResponse["backing-filename"]) {
      return /^.*?([\w]+)\.[\w]+$/.exec(parsedResponse["backing-filename"])![1];
    }
  } catch (e) {
    console.log(e.stderr);
  }
  return undefined;
};

export default async (path: string, qemuDirectory) => {
  return Promise.resolve(await getBackingLayerHash(path, qemuDirectory));
};
