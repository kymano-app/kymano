const os = require('os');

export default () => {
  switch (os.platform()) {
    case 'darwin':
      return 'macos';
    case 'linux':
      return 'linux';
    case 'win32':
      return 'win';
    default:
      return 'unknown';
  }
};
