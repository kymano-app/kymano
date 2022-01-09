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

  return new Promise<void>((resolve, reject) => {
    fs
    .createReadStream(path.resolve(file))
    .on('error', console.log)
    .pipe(tar.x({ C: dest, sync: true }))
    .on('entry', (entry) => {
      progress.tick(1);
    }).on('end', () => {
      console.log('::::::::::::::::: resolve readdirSync');
      fs.readdirSync(dest).forEach((file: any) => {
        console.log(':',file);
        console.log('::::::::::::::::: resolve', file, dest);
        resolve();
        fs.readdirSync(dest+'/'+file).forEach((file2: any) => {
          console.log('::',file2)
        });
      });
    }).on('error', (err) => {
      console.log('::::::::::::::::: error', err);
      reject();
    });
  });
}

export default async (file: string, dest: string) => {
  return Promise.resolve(await unPackTarGz(file, dest));
};
