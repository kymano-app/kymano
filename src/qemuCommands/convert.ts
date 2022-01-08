import getExternalBinariesPath from "../service/getExternalBinariesPath";

const spawn = require('await-spawn');

const convert = async (importingPath: string, layerPath: string) => {
  try {
    const response = await spawn(
      `${getExternalBinariesPath()}sysroot-macOS-arm64/bin/qemu-img`,
      ['convert', importingPath, '-O', 'qcow2', layerPath]
    );
    console.log(response.toString());
  } catch (e) {
    console.log(e.stderr.toString());
  }
};

export default async (importingPath: string, layerPath: string) => {
  return Promise.resolve(await convert(importingPath, layerPath));
};
