const replaceVarsToDrivePathes = async (config: any, configVars: any) => {
  const confparams: any[][] = [];
  config.forEach((data: any) => {
    const name = `-${Object.keys(data)[0]}`;
    let value = data[Object.keys(data)[0]];
    if (typeof value === 'string') {
      configVars.forEach((variable) => {
        const find = `\\$${variable[0]}`;
        const re = new RegExp(find, 'g');
        value = value.replace(re, variable[1]);
      });
    }
    confparams.push(name);
    confparams.push(value);
  });
  console.log(confparams)
  return confparams;
};

export default async (config: any, configVars: any) => {
  return Promise.resolve(await replaceVarsToDrivePathes(config, configVars));
};
