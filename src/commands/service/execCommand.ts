import path from "path";
import { QemuLaunchException } from "../exceptions/qemuLaunchException";
import getArch from "./getArch";
import getPlatform from "./getPlatform";

const spawn = require('await-spawn');

export const execCommand =  (
  params: any,
  qemuBinary: string,
  stdio: string
) => {
    const mainPath = qemuBinary.split("/").slice(0, -2).join("/");

    if (getPlatform() === "linux") {
      let ld = path.join(mainPath, "libs/ld-linux-x86-64.so.2");
      if (getArch() === "arm64") {
        ld = path.join(mainPath, "libs/ld-linux-aarch64.so.1");
      }

      console.log(
        "execCommand::::::::::",
        "LD_LIBRARY_PATH=",
        path.join(mainPath, "libs"),
        ...[ld, ...[qemuBinary, ...params]]
      );

      return spawn(ld, [qemuBinary, ...params], {
        stdio: stdio,
        env: {
          ...process.env,
          LD_LIBRARY_PATH: path.join(mainPath, "libs"),
        },
      });
    }

    if (getPlatform() === "macos") {
      console.log("DYLD_LIBRARY_PATH", path.join(mainPath, "lib"));
      console.log(...[qemuBinary, ...params]);
      try {
        console.log('qemuBinary:::::', qemuBinary)

        return spawn(qemuBinary, [...params], {
          stdio: stdio,
          env: {
            ...process.env,
            DYLD_LIBRARY_PATH: path.join(mainPath, "lib"),
          },
        });
        //console.log('resp', resp)
        //return resp;
      } catch(e) {
        throw new QemuLaunchException(e.stderr.toString());
      }
    }

    if (getPlatform() === "windows") {
      console.log(...[qemuBinary, ...params]);
      return spawn(qemuBinary, [...params], {
        stdio: stdio,
      });
    }
};
