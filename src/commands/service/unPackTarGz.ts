import fs from "fs";
import path from "path";
import tar from "tar";
import { electronWindow } from "../../global";

const ProgressBar = require("progress");

async function unPackTarGz(file: string, dest: string, myConfigId: Number) {
  let numberOfFiles = 0;
  const files: any[] = [];
  tar.t({
    file,
    sync: true,
    onentry: (entry) => {
      numberOfFiles += 1;
      console.log("entry::::::::::::", entry.path, entry.type);
      if (entry.type === "File") {
        files.push(entry.path);
      }
    },
  });
  console.log("numberOfFiles::::::::::::", numberOfFiles, files);

  const progress = new ProgressBar("extracting [:bar] :percent :etas", {
    width: 40,
    complete: "=",
    incomplete: " ",
    renderThrottle: 1,
    total: numberOfFiles,
  });

  console.log("::::::::::::::::: file, dest", file, dest);

  return new Promise<void>((resolve, reject) => {

    const percent = [];
    let num = 0;
    fs.createReadStream(path.resolve(file))
      .on("error", console.log)
      .pipe(tar.x({ C: dest, sync: true }))
      .on("entry", (entry) => {
        progress.tick(1);
        num++;
        if (!Object.keys(electronWindow).length) {
          return;
        }
        const pct = Number(((num / numberOfFiles) * 100).toFixed(0));
        if (percent[pct]) {
          return;
        }
        percent[pct] = 1;
        if (Object.keys(electronWindow).length) {
          electronWindow.global.webContents.send("response-cmd", myConfigId, pct);
        }
      })
      .on("end", () => {
        console.log("::::::::::::::::: resolve readdirSync");
        resolve(files);
      })
      .on("error", (err) => {
        console.log("::::::::::::::::: error", err);
        reject();
      });
  });
}

export default async (file: string, dest: string, myConfigId: Number) => {
  return Promise.resolve(await unPackTarGz(file, dest, myConfigId));
};
