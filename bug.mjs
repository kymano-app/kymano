import fs from 'fs';
import path from 'path';
import tar from 'tar';
import tmp from 'tmp';

const getFileNameFromUrl = (url) =>  {
  const urlSplit = url.split('/');
  return urlSplit[urlSplit.length-1].replaceAll('.tgz', '');
}

const recursiveDowload = async (
  url,
  tmpDir,
  tmpobj,
  firstFile
) => {
  console.log('recursiveDowload')
  const unpackedDowloadedTmp = path.join(tmpDir.name, getFileNameFromUrl(url));  
  
  console.log('path.resolve(url)', path.resolve(url), tmpDir.name)
  await new Promise((resolve) => {
    fs
    .createReadStream(path.resolve(url))
    .on('error', (err)=>{
      console.log('::::::::::ERR', err)
    })
    .pipe(tar.x({ C: tmpDir.name, sync: true }))
    .on('finish', () => {
      console.log('::::::::::::::::: resolve readdirSync');
      resolve();
    });
  });

  console.log("readFileSync:::", unpackedDowloadedTmp);

  let [newQcow2] = fs.readdirSync(unpackedDowloadedTmp).filter((file) => {
    console.log('file:::::::::', file);
    return path.extname(file) === ".qcow2";
  });
  newQcow2 = path.join(unpackedDowloadedTmp, newQcow2);
  console.log("qcow2::::::::::", newQcow2);
  if (firstFile) {
    //await joinFiles(firstFile, newQcow2);
  } else {
    firstFile = newQcow2;
  }

  const next = path.join(unpackedDowloadedTmp, "next");
  console.log("readFileSync:", next);
  var newUrl = fs.readFileSync(next, "utf8").trim();
  console.log('newUrl', newUrl)
  await recursiveDowload(newUrl, tmpDir, tmpobj, firstFile);

  return firstFile;
};

(async () => {
  const tmpDir = tmp.dirSync();
  const tmpobj = tmp.fileSync();
  await recursiveDowload('/private/tmp/tmp-fedora35-workstation-x86_64-1.tgz', tmpDir, tmpobj);
})().catch(e => {
  console.log('e', e)
});