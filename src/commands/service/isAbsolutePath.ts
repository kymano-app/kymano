export const isAbsolutePath = (directory: string) => {
  return __dirname.split('/')[0] === directory.split('/')[0];
};