export default (arch: string) => {
  switch (arch) {
    case 'arm64':
      return 'aarch64';
    case 'x86_64':
      return 'x86_64';
    default:
      return 'unknown';
  }
};
