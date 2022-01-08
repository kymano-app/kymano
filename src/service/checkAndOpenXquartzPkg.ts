import getExternalBinariesPath from './getExternalBinariesPath';
import isFileExist from './isFileExist';

const spawn = require('await-spawn');

const checkAndOpenXquartzPkg = async () => {
  try {
    const response = await spawn(`launchctl`, ['getenv', 'DISPLAY']);
    const display = response.toString();
    console.log('display', display);
    if (display.length < 3) {
      await spawn('open', [`${getExternalBinariesPath()}/XQuartz.pkg`]);
      do {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 500));
      } while (!isFileExist('/Library/LaunchAgents/org.xquartz.startx.plist'));
      console.log('launchctl load -w');
      await spawn('launchctl', [
        'load',
        '-w',
        '/Library/LaunchAgents/org.xquartz.startx.plist',
      ]);
    }
  } catch (e) {
    console.log(e);
  }
};

export default async () => {
  return Promise.resolve(await checkAndOpenXquartzPkg());
};
