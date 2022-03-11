import path from "path";
import { execCommand } from "../commands/service/execCommand";
import getPlatform from "../commands/service/getPlatform";

export const startVm = async (confparams: any, qemuBinary: string) => {
  try {
    console.log('qemuBinary::::::',qemuBinary);
    let divider = `/`
    if (getPlatform() === 'windows') {
      divider = `\\`;
    }
    const mainPath = qemuBinary.split(divider).slice(0, -2).join(divider);
    let share = path.join(mainPath, 'share/qemu');
    if (getPlatform() === 'windows') {
       share = path.join(mainPath, 'share');
    }
    console.log('share::::::::::', share)
    await execCommand([
      "-L",
      share,
      ...confparams,
    ], qemuBinary, 'pipe')
    // await exec(
    //   `osascript -e 'tell application "System Events"' -e 'set frontmost of every process whose unix id is ${qemuProc.pid} to true' -e 'end tell'`
    // );
  } catch (error) {
    console.error(error);
  }
};