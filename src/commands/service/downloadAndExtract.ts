import { MessagesQueueType } from "../../global";
import { downloadFile } from "./downloadFile";
import unPackTarGz from "./unPackTarGz";

const tmp = require("tmp");

export async function downloadAndExtract(
  url: string,
  path: string,
  myConfigId: Number,
  type: string,
  name: string,
  messagesQueueType: MessagesQueueType,
  part: number = 0
) {
  const tmpobj = tmp.fileSync();
  console.log("downloadAndExtract:::::::::::: ", url, myConfigId, type, name);
  console.log("File: ", tmpobj.name);
  console.log("Filedescriptor: ", tmpobj.fd);
  await downloadFile(url, tmpobj.name, myConfigId, type, name, messagesQueueType, part);
  console.log("downloadFile ok");
  const files = await unPackTarGz(tmpobj.name, path, myConfigId);
  console.log("unPackTarGz ok");
  tmpobj.removeCallback();
  return files;
}
