const fs = require("fs");

export async function joinFiles(name1: string, name2: string) {
  console.log(name1, name2);
  return new Promise<void>((resolve) => {
    console.log("joinFiles", name1, name2);
    // open destination file for appending
    var w = fs.createWriteStream(name1, { flags: "a" });
    // open source file for reading
    var r = fs.createReadStream(name2);

    w.on("close", function () {
      console.log("finish!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", name1);
      resolve();
    });
    w.on("error", function (err: any) {
      console.log("err!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", err);
      resolve();
    });
    r.pipe(w);
  });
}
