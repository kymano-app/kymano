import fs from 'fs';
import path from 'path';
import tar from 'tar';

const ProgressBar = require('progress');

async function unPackTarGz(file: string, dest: string) {
  let numberOfFiles = 0;
  tar.t({
    file,
    sync: true,
    onentry: () => {
      numberOfFiles += 1;
    },
  });
  console.log('numberOfFiles::::::::::::', numberOfFiles)

  const progress = new ProgressBar('extracting [:bar] :percent :etas', {
    width: 40,
    complete: '=',
    incomplete: ' ',
    renderThrottle: 1,
    total: numberOfFiles,
  });

  console.log('::::::::::::::::: file, dest', file, dest);

  const data = fs
    .createReadStream(path.resolve(file))
    .on('error', console.log)
    .pipe(tar.x({ C: dest }))
    .on('entry', (entry) => {
      progress.tick(1);
    });

    console.log('::::::::::::::::: return'), file;

  return new Promise<void>((resolve, reject) => {
    data.on('end', () => {
      console.log('::::::::::::::::: resolve', file);
      resolve();
    });

    data.on('error', (err) => {
      console.log('::::::::::::::::: error', err);
      reject();
    });
  });
}

export default async (file: string, dest: string) => {
  return Promise.resolve(await unPackTarGz(file, dest));
};
