import path from "path";
import { pushQemuImgConvertingQueue } from "../../global";
import { getArch } from "./getArch";
import { getPlatform } from "./getPlatform";

const spawn = require("child_process").spawn;

export const execCommandWithProgress = async (params: any, qemuBinary: string, stdio: string) => {
  return await new Promise<void>((resolve, reject) => {
    const mainPath = qemuBinary.split("/").slice(0, -2).join("/");

    let child;

    if (getPlatform() === "linux") {
      let ld = path.join(mainPath, "libs/ld-linux-x86-64.so.2");
      if (getArch() === "arm64") {
        ld = path.join(mainPath, "libs/ld-linux-aarch64.so.1");
      }
      child = spawn(ld, [qemuBinary, ...params], {
        stdio: stdio,
        env: {
          ...process.env,
          LD_LIBRARY_PATH: path.join(mainPath, "libs"),
        },
      });
    }

    if (getPlatform() === "macos") {
      child = spawn(qemuBinary, [...params], {
        stdio: stdio,
        env: {
          ...process.env,
          DYLD_LIBRARY_PATH: path.join(mainPath, "lib"),
        },
      });
    }

    if (getPlatform() === "windows") {
      child = spawn(qemuBinary, [...params], {
        stdio: stdio,
      });
    }

    let prev = "";
    child.stdout.on("data", (data) => {
      const founded = data.toString().match(/([\d\.]+)\//);
      if (founded && founded !== prev) {
        pushQemuImgConvertingQueue(founded[1]);
        console.log(`src/commands/service/execCommandWithProgress.ts:43 founded`, founded[1]);
      }
      prev = founded;
      console.log(`src/commands/service/execCommandWithProgress.ts:43 data`, data.toString());
    });
    child.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
      pushQemuImgConvertingQueue("end");
      reject();
    });
    child.on("close", (code) => {
      pushQemuImgConvertingQueue("end");
      console.log(`child process exited with code ${code}`);
      resolve();
    });
  });
};
