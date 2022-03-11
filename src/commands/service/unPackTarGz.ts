import fs from 'fs';
import path from 'path';
import tar from 'tar';

const ProgressBar = require('progress');

async function unPackTarGz(file: string, dest: string) {
  let numberOfFiles = 0;
  const files: any[] = [];
  tar.t({
    file,
    sync: true,
    onentry: (entry) => {
      numberOfFiles += 1;
      console.log('entry::::::::::::', entry.path, entry.type)
      if (entry.type === 'File') {
        files.push(entry.path)
      }
    },
  });
  console.log('numberOfFiles::::::::::::', numberOfFiles, files)

  const progress = new ProgressBar('extracting [:bar] :percent :etas', {
    width: 40,
    complete: '=',
    incomplete: ' ',
    renderThrottle: 1,
    total: numberOfFiles,
  });

  console.log('::::::::::::::::: file, dest', file, dest);

  return new Promise<void>((resolve, reject) => {
    fs
    .createReadStream(path.resolve(file))
    .on('error', console.log)
    .pipe(tar.x({ C: dest, sync: true }))
    .on('entry', (entry) => {
      progress.tick(1);
    }).on('end', () => {
      console.log('::::::::::::::::: resolve readdirSync');
      resolve(files);
    }).on('error', (err) => {
      console.log('::::::::::::::::: error', err);
      reject();
    });
  });
}

export default async (file: string, dest: string) => {
  return Promise.resolve(await unPackTarGz(file, dest));
};
