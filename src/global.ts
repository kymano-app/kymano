export var globalSockets = {};
export var electronWindow = {};
export var messagesQueue = [];
export var qemuImgConvertingQueue = [];
export var ip: string;
export var pids = [];
export var diskIds = [];
export var guestFsQueue = [];
export var guestFsQueue2 = [];
export var socketData = {};
export var cmdId = 0;
export var mounted = {};
export enum MessagesQueueType {
  QemuImgDownloading = 0,
  QemuImgUnpacking = 1,
  QemuDownloading = 2,
  QemuUnpacking = 3,
  LayerDownloading = 4,
  LayerUnpacking = 5,
  SnapshotDownloading = 6,
  SnapshotUnpacking = 7,
  RepoDownloading = 8,
  RepoUnpacking = 9,
}

export enum MessagesQueueStatus {
  Downloading = 0,
  Finished = 1,
}

export const pushQemuImgConvertingQueue = (element: any) => {
  qemuImgConvertingQueue.push(element);
};

export const shiftQemuImgConvertingQueue = () => {
  return qemuImgConvertingQueue.shift();
};

export const delFromDiskIds = (disk: string) => {
  diskIds = diskIds.filter((item) => item !== disk);
};
export const setIp = (newIp: string) => {
  ip = newIp;
};

export const pushGuestFsQueue = (element: any) => {
  guestFsQueue.push(element);
};

export const pushGuestFsQueue2 = (element: any) => {
  guestFsQueue2.push(element);
};

export const shiftGuestFsQueue = () => {
  return guestFsQueue.shift();
};

export const shiftGuestFsQueue2 = () => {
  return guestFsQueue2.shift();
};

export const shiftSocketData = (worker: string) => {
  if (!socketData[worker]) {
    console.log("!socketData[worker]", worker);
    socketData[worker] = [];
  }
  console.log("shiftSocketData", worker);
  return socketData[worker].shift();
};

export const cleanSocketData = (worker: string) => {
  socketData[worker] = [];
};

export const lenghtSocketData = (worker: string) => {
  if (!socketData[worker]) {
    return 0;
  }
  return socketData[worker].length;
};

export const pushSocketData = (worker: string, data: any) => {
  if (!socketData[worker]) {
    console.log("!socketData[worker]", worker);
    socketData[worker] = [];
  }
  console.log("add", data, worker);
  socketData[worker] = [...socketData[worker], ...data];
};

export const pushMessagesQueue = (queue: string, data: any) => {
  if (!messagesQueue[queue]) {
    messagesQueue[queue] = [];
  }
  messagesQueue[queue] = [...messagesQueue[queue], data];
};

export const cleanMessagesQueue = (queue: string) => {
  messagesQueue[queue] = [];
};

export const shiftMessagesQueue = (queue: string) => {
  if (!messagesQueue[queue]) {
    messagesQueue[queue] = [];
  }
  return messagesQueue[queue].shift();
};

export const getCmdId = () => {
  return cmdId++;
};
