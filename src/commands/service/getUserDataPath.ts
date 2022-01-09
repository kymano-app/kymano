import os from 'os';
import path from 'path';
const {env} = process;

export default () => {
  if (process.platform === 'darwin') {
    return path.join(path.join(os.homedir(), 'Library'), 'Application Support', 'kymano');
  }

  if (process.platform === 'win32') {
    return path.join(env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'kymano', 'Data');
  }

  return path.join(env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'kymano');
};