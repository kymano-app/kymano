import path from "path";
import { MessagesQueueType } from "../../global";
import { isFileExist } from "../../service/isFileExist";
import { downloadAndExtract } from "./downloadAndExtract";
import { getFileNameFromUrl } from "./getFileNameFromUrl";
import { joinFiles } from "./joinFiles";

const fs = require("fs");
const tmp = require("tmp");

export const recursiveDownload = async (
  url: string,
  firstFile: string = "",
  driveName: string,
  myConfigId: Number,
  type: string,
  name: string,
  part: number = 1
) => {
  console.log(`src/commands/service/recursiveDowload.ts:19 recursiveDownload`, part);
  const tmpDir = tmp.dirSync();

  console.log("recursiveDowload::::::::::::::", url, firstFile);
  const unpackedDowloadedTmp = path.join(tmpDir.name, getFileNameFromUrl(url));
  console.log("layerFileTmp::::::::", unpackedDowloadedTmp);
  await downloadAndExtract(url, tmpDir.name, myConfigId, type, name, MessagesQueueType.LayerDownloading, part);

  console.log("readFileSync:::", unpackedDowloadedTmp);

  if (!isFileExist(unpackedDowloadedTmp)) {
    console.log("!!!!!!!!!!!!unpackedDowloadedTmp");
  }
  let [newQcow2] = fs.readdirSync(unpackedDowloadedTmp).filter((file: any) => {
    console.log(file);
    return (
      path.extname(file) === ".qcow2" ||
      path.extname(file) === ".fd" ||
      path.extname(file) === ".img"
    );
  });
  newQcow2 = path.join(unpackedDowloadedTmp, newQcow2);
  console.log("qcow2::::::::::", newQcow2);
  if (firstFile) {
    await joinFiles(firstFile, newQcow2);
  } else {
    firstFile = newQcow2;
  }

  const next = path.join(unpackedDowloadedTmp, "next");
  if (isFileExist(next)) {
    console.log("readFileSync:", next);
    var newUrl = fs.readFileSync(next, "utf8").trim();
    await recursiveDownload(newUrl, firstFile, driveName, myConfigId, type, name, ++part);
  }
  // } else {
  //   console.log('fileHash1:::::::')
  //   fileHash = await hasha.fromFile((unpackedDowloadedTmp), {
  //     algorithm: 'sha256',
  //   });
  // }

  return firstFile;
};
