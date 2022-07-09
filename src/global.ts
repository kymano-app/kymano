export var globalSockets = {};
export var electronWindow = {};
export var messagesQueue = [];

export const pushMessagesQueue = (element: any) => {
    messagesQueue.push(element);
};

export const shiftMessagesQueue = () => {
  return messagesQueue.shift();
};
