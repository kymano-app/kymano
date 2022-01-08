import path from 'path';

const getExternalBinariesPath = (): string => {
  let dirPath;
  if (process.env.NODE_ENV === 'production') {
    dirPath = path.join(process.resourcesPath, 'externalBinaries/');
  } else {
    dirPath = path.join(
      __dirname.split('/').slice(0, -3).join('/'),
      'externalBinaries/'
    );
  }
  console.log('dirPath', dirPath);

  return dirPath;
};

export default (): string => {
  return getExternalBinariesPath();
};
