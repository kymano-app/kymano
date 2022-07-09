const os = require('os');

export const getArch = () => {
  switch (os.arch()) {
    case 'arm64':
      return 'arm64';
    case 'x64':
      return 'x86_64';
    default:
      return 'unknown';
  }
};
