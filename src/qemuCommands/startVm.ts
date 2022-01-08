import path from "path";
const { spawn } = require("child_process");

//const exec = util.promisify(require('child_process').exec);
var exec = require("child_process").exec;

const awaitSpawn = require("await-spawn");

const startVm = async (confparams: any, qemuBinary: string) => {
  try {
    // await spawn(qemu, confparams, { stdio: 'inherit' });
    // await awaitSpawn("chmod", ["+x", qemuBinary], { stdio: "inherit" });
    // await awaitSpawn("xattr", ["-cr", qemuBinary], { stdio: "inherit" });
    // const data = exec(
    //   [
    //     `DYLD_LIBRARY_PATH=${path.join(
    //       qemuBinary.split("/").slice(0, -2).join("/").replace(/ /g, "\\ "),
    //       "lib"
    //     )}`,
    //     qemuBinary.replace(/ /g, "\\ "),
    //     "-L",
    //     `${path
    //       .join(qemuBinary.split("/").slice(0, -2).join("/"), "share/qemu")
    //       .replace(/ /g, "\\ ")}`,
    //     ...confparams,
    //   ].join(" ")
    // );

    console.log(qemuBinary,
      ...[
        "-L",
        `${path.join(
          qemuBinary.split("/").slice(0, -2).join("/"),
          "share/qemu"
        )}`,
        ...confparams,
      ])
    const qemuProc = spawn(
      qemuBinary,
      [
        "-L",
        `${path.join(
          qemuBinary.split("/").slice(0, -2).join("/"),
          "share/qemu"
        )}`,
        ...confparams,
      ],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DYLD_LIBRARY_PATH: path.join(
            qemuBinary.split("/").slice(0, -2).join("/"),
            "lib"
          ),
        },
      }
    );
    // await exec(
    //   `osascript -e 'tell application "System Events"' -e 'set frontmost of every process whose unix id is ${qemuProc.pid} to true' -e 'end tell'`
    // );
  } catch (error) {
    console.error(error);
  }
};

export default async (confparams: any, qemuBinary: string) => {
  return Promise.resolve(await startVm(confparams, qemuBinary));
};
