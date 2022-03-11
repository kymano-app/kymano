import path from "path";
import getArch from "../../commands/service/getArch";
import getPlatform from "../../commands/service/getPlatform";

const awaitSpawn = require("await-spawn");

const execCommand = async (params: any, qemuBinary: string, stdio: string) => {
  try {
    const mainPath = qemuBinary.split("/").slice(0, -2).join("/");

    let response;

    if (getPlatform() === 'linux') {
      let ld = path.join(mainPath, 'libs/ld-linux-x86-64.so.2');
      if (getArch() === 'arm64') {
        ld = path.join(mainPath, 'libs/ld-linux-aarch64.so.1');
      }

      console.log('execCommand::::::::::', 'LD_LIBRARY_PATH=', path.join(mainPath,"libs"),
      ...[ld, ...[qemuBinary, ...params]])

      response = await awaitSpawn(
        ld, [qemuBinary, ...params],
        {
          stdio: stdio,
          env: {
            ...process.env,
            LD_LIBRARY_PATH: path.join(
              mainPath,
              "libs"
            ),
          },
        }
      );
    }

    if (getPlatform() === 'macos') {
        console.log(...[qemuBinary, ...params])
        response = await awaitSpawn(
        qemuBinary, [...params],
        {
          stdio: stdio,
          env: {
            ...process.env,
            DYLD_LIBRARY_PATH: path.join(
              mainPath,
              "lib"
            ),
          },
        }
      );
    }

    if (getPlatform() === 'windows') {
      console.log(...[qemuBinary, ...params])
      response = await awaitSpawn(
        qemuBinary, [...params],
        {
          stdio: stdio
        }
      );
    }
    
    console.log('response', response)
    return response;
  } catch (error) {
    console.error(error);
  }
};

export default async (confparams: any, qemuBinary: string, stdio = 'inherit') => {
  return Promise.resolve(await execCommand(confparams, qemuBinary, stdio));
};
