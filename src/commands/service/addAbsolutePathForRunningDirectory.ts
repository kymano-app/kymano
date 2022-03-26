import { isAbsolutePath } from "./isAbsolutePath";

export const addAbsolutePathForRunningDirectory = (directory: string) => {
  const PWD = process.env.PWD ?? process.cwd();
  console.log('directory', directory, PWD);
  return isAbsolutePath(directory)
    ? directory
    : `${PWD}/${directory}`;
};