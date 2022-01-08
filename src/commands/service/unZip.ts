var AdmZip = require("adm-zip");

const ProgressBar = require('progress');

async function unZip(file: string, dest: string) {
  var zip = new AdmZip(file);
  zip.extractAllTo(dest, /*overwrite*/ true);
}

export default async (file: string, dest: string) => {
  return Promise.resolve(await unZip(file, dest));
};
