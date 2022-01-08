import path from 'path';

const getRepoListDir = (): string => {
  let dirPath;
  if (process.env.NODE_ENV === 'production') {
    dirPath = path.join(__dirname.split('/').slice(0, -2).join('/'), 'base/');
  } else {
    dirPath = path.join(
      __dirname.split('/').slice(0, -3).join('/'),
      'release/app/base/'
    );
  }

  return dirPath;
};

export default (): string => {
  return getRepoListDir();
};
