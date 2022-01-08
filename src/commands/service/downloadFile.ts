const fs = require("fs");
const axios = require("axios");
const ProgressBar = require("progress");

async function downloadFile(url: string, path: string) {
  const { data, headers } = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  const totalLength = parseInt(headers["content-length"], 10);

  const progress = new ProgressBar("downloading [:bar] :percent :etas", {
    width: 40,
    complete: "=",
    incomplete: " ",
    renderThrottle: 1,
    total: totalLength,
  });

  const writer = fs.createWriteStream(path);

  let length = 0;
  data.on("data", (chunk: string | any[]) => {
    length += chunk.length;
    progress.tick(chunk.length);
  });
  data.pipe(writer);

  return new Promise<void>((resolve, reject) => {
    writer.on("finish", () => {
      console.log("::::::::::::::::resolve();", length, totalLength);
      resolve();
    });

    data.on("error", () => {
      console.log("::::::::::::::::reject();");
      reject();
    });
  });
}

export default async (url: string, path: string) => {
  return Promise.resolve(await downloadFile(url, path));
};
