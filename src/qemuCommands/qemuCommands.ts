import path from "path";
import { execCommand } from "../commands/service/execCommand";
import getArch from "../commands/service/getArch";
import getPlatform from "../commands/service/getPlatform";
import getUserDataPath from "../commands/service/getUserDataPath";
import { QEMU_DEFAULT } from "../consts";
import isFileExist from "../service/isFileExist";

const spawn = require('await-spawn');
const fsAsync = require('fs').promises;

export class QemuCommands {
  readonly qemuImgBinPath: string;
  readonly userDataPath: string;

  constructor() {
    this.userDataPath = getUserDataPath();
    this.qemuImgBinPath = `${this.userDataPath}/qemu/qemu-img-${getPlatform()}-${getArch()}/bin/qemu-img`;
  }

  public commitLayer = async (layerPath: string) => {
    try {
      await spawn("chmod", ["+x", this.qemuImgBinPath], { stdio: "inherit" });
      await spawn("xattr", ["-cr", this.qemuImgBinPath], { stdio: "inherit" });
  
      const response = await execCommand(['commit', layerPath], this.qemuImgBinPath, 'pipe')
  
      console.log(response.toString(), layerPath);
    } catch (e) {
      console.log(e, layerPath);
    }
  };

  public getBackingLayerHash = async (imgpath: string) => {  
    try {
      const qemuInfo = await execCommand(
        ["info", imgpath, "--output=json"],
        this.qemuImgBinPath,
        'pipe'
      );
  
      const parsedResponse = JSON.parse(qemuInfo);
      console.log("parsedResponse", parsedResponse);
      if (parsedResponse["backing-filename"]) {
        const splited = parsedResponse["backing-filename"].split("/");
        return splited[splited.length - 1];
      }
    } catch (e) {
      console.log("ERR::::::::::::", e);
    }
    return undefined;
  }

  public changeBackingFile = async (
    backingFile: string,
    containerFile: string,
    qemuDirectory: string
  ) => {
    const qemuImg = `${qemuDirectory}/bin/qemu-img`;
    console.log('qemuImg:::;', qemuImg)
    
    let dir = path.dirname(containerFile)
    if (!isFileExist(dir)) {
      console.log('mkdir :::', dir);
      await fsAsync.mkdir(dir);
    }

    console.log("createLayer1", qemuImg, backingFile, containerFile);
    const cmd = [
      "rebase",
      "-f",
      "qcow2",
      "-F",
      "qcow2",
      "-u",
      "-b",
      backingFile,
      containerFile,
    ];
  
    const response = await execCommand(cmd, qemuImg, "pipe")
  };

  public convert = async (importingPath: string, layerPath: string) => {
    try {
      const qemuImg = `${getUserDataPath()}/qemu/${QEMU_DEFAULT[getPlatform()]}-${getPlatform()}-${getArch()}/bin/qemu-img`;
      const response = await execCommand(
        ["convert", "-p", importingPath, "-O", "raw", layerPath],
        qemuImg,
        "pipe"
      );
      //convert -f parallels original.hds -O raw converted.raw
      console.log(response.toString());
    } catch (e) {
      console.log(e);
    }
  };

  public createContainer = async (
    backingFile: string,
    containerFile: string
  ) => {

    let dir = path.dirname(containerFile)
    if (!isFileExist(dir)) {
      console.log('mkdir :::', dir);
      await fsAsync.mkdir(dir);
    }

    console.log("createLayer2", this.qemuImgBinPath, backingFile, containerFile);
    const cmd = [
      "create",
      "-f",
      "qcow2",
      "-F",
      "qcow2",
      "-b",
      backingFile,
      containerFile,
    ];

    const response = await execCommand(cmd, this.qemuImgBinPath, 'pipe')
  };

  public createImg = async (imgPath: string) => {
    try {
      if (getPlatform()==='macos') {
        await spawn("chmod", ["+x", this.qemuImgBinPath], { stdio: "inherit" });
        await spawn("xattr", ["-cr", this.qemuImgBinPath], { stdio: "inherit" });
      }
      const dir = path.dirname(imgPath);
      if (!isFileExist(dir)) {
        await fsAsync.mkdir(dir);
      }
      const response = await execCommand(['create', '-f', 'qcow2', `${imgPath}`, '4G'], this.qemuImgBinPath, "pipe")
  
      console.log('response::::::::', response.toString());
    } catch (e) {
      console.log('ERR::::::::::::', e);
    }
  };
  
  public startVm = (confparams: any, qemuBinary: string) => {
    //try {
      console.log('qemuBinary11::::::',qemuBinary);
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
      const resp = execCommand([
        "-L",
        share,
        ...confparams,
      ], qemuBinary, ['inherit', 'inherit', null]);
      console.log('resp.child1', resp.child.pid);
      return resp;

      // await exec(
      //   `osascript -e 'tell application "System Events"' -e 'set frontmost of every process whose unix id is ${qemuProc.pid} to true' -e 'end tell'`
      // );
    //} catch (error) {
      //console.error(error);
    //}
  }
}
