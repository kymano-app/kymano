import { isAbsolutePath } from "./isAbsolutePath";

export const addAbsolutePathForRunningDirectory = (directory: string) => {
  console.log('directory', directory, process.env.PWD);
  return isAbsolutePath(directory)
    ? directory
    : `${process.env.PWD}/${directory}`;
};