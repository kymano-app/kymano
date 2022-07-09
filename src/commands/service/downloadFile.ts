import { electronWindow, pushMessagesQueue } from "../../global";

const fs = require("fs");
const axios = require("axios");
const ProgressBar = require("progress");

async function downloadFile(
  url: string,
  path: string,
  myConfigId: Number,
  type: string,
  name: string
) {
  if (Object.keys(electronWindow).length) {
    electronWindow.global.webContents.send(
      "downloading-started",
      type,
      name,
      myConfigId
    );
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

    pushMessagesQueue(pct);

    if (!Object.keys(electronWindow).length) {
      console.log(
        `src/commands/service/downloadFile.ts:43 !Object.keys(electronWindow).length`
      );
      return;
    }

    electronWindow.global.webContents.send(
      "downloading",
      type,
      name,
      myConfigId,
      pct
    );
  });
  data.pipe(writer);

  return new Promise<void>((resolve, reject) => {
    writer.on("finish", () => {
      console.log("::::::::::::::::resolve();", length, totalLength);
      if (Object.keys(electronWindow).length) {
        electronWindow.global.webContents.send(
          "downloading-finished",
          type,
          name,
          myConfigId
        );
      }
      resolve();
    });

    data.on("error", () => {
      console.log("::::::::::::::::reject();");
      if (Object.keys(electronWindow).length) {
        electronWindow.global.webContents.send(
          "downloading-error",
          type,
          name,
          myConfigId
        );
      }
      reject();
    });
  });
}

export default async (
  url: string,
  path: string,
  myConfigId: Number,
  type: string,
  name: string
) => {
  return Promise.resolve(await downloadFile(url, path, myConfigId, type, name));
};
