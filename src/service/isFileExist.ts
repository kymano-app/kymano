import fs from 'fs';

const isFileExist = (filepath: string) => {
  let flag = true;
  try {
    fs.accessSync(filepath, fs.constants.F_OK);
  } catch (e) {
    flag = false;
  }
  return flag;
};

export default (filepath: string) => {
  return isFileExist(filepath);
};
