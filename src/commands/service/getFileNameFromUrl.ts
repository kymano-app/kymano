export const getFileNameFromUrl = (url: string) => {
  const urlSplit = url.split("/");
  return urlSplit[urlSplit.length - 1].replaceAll(".tgz", "");
};
