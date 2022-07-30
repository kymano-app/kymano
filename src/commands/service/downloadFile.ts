import { electronWindow, MessagesQueueStatus, MessagesQueueType, pushMessagesQueue } from "../../global";

const fs = require("fs");
const axios = require("axios");
const ProgressBar = require("progress");

export async function downloadFile(
  url: string,
  path: string,
  myConfigId: Number,
  type: string,
  name: string,
  messagesQueueType: MessagesQueueType,
  part: number = 0
) {
  if (Object.keys(electronWindow).length) {
    electronWindow.global.webContents.send("downloading-started", type, name, myConfigId);
  }

  const { data, headers } = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  let totalLength = parseInt(headers["content-length"], 10);
  if (!totalLength) {
    totalLength = 1;
  }
  console.log("totalLength:::::::::", totalLength);

  const progress = new ProgressBar("downloading [:bar] :percent :etas :rate", {
    width: 40,
    complete: "=",
    incomplete: " ",
    renderThrottle: 1,
    total: totalLength,
  });

  const writer = fs.createWriteStream(path);
  const percent = [];

  let length = 0;
  data.on("data", (chunk: string | any[]) => {
    if (!chunk.length) {
      return;
    }
    length += chunk.length;
    progress.tick(chunk.length);

    const pct = Number(((length / totalLength) * 100).toFixed(0));
    if (percent[pct]) {
      return;
    }
    percent[pct] = 1;

    let text;
    let partText = part > 1 ? ` (part ${part})` : "";
    //let partText = `(${part})`;
    if (messagesQueueType === MessagesQueueType.LayerDownloading) {
      text = `Downloading${partText} ${name} layer`;
    }
    if (messagesQueueType === MessagesQueueType.QemuImgDownloading) {
      text = `Downloading${partText} qemu-img ${name}`;
    }
    if (messagesQueueType === MessagesQueueType.QemuDownloading) {
      text = `Downloading${partText} qemu ${name}`;
    }
    if (messagesQueueType === MessagesQueueType.SnapshotDownloading) {
      text = `Downloading${partText} ${name} snapshot`;
    }
    if (messagesQueueType === MessagesQueueType.RepoDownloading) {
      text = `Downloading${partText} ${name} repo`;
    }
    pushMessagesQueue(myConfigId, { pct: pct, text: text });

    if (Object.keys(electronWindow).length) {
      electronWindow.global.webContents.send("downloading", type, name, myConfigId, pct);
    }
  });
  data.pipe(writer);

  return new Promise<void>((resolve, reject) => {
    writer.on("finish", () => {
      console.log("::::::::::::::::resolve();", length, totalLength);
      if (Object.keys(electronWindow).length) {
        electronWindow.global.webContents.send("downloading-finished", type, name, myConfigId);
      }
      resolve();
    });

    data.on("error", () => {
      console.log("::::::::::::::::reject();");
      if (Object.keys(electronWindow).length) {
        electronWindow.global.webContents.send("downloading-error", type, name, myConfigId);
      }
      reject();
    });
  });
}
