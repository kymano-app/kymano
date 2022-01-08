const splitForQuery = (line: string): string[] => {
  const arr = line
    .toLowerCase()
    .split(/\W/)
    .filter((word: string | any[]) => word.length > 0);
  const a1: string[] = [];
  const result = arr.map((elem) => {
    a1.push(elem);
    return `'${a1.join(' ')}*'`;
  });
  if (result.length > 0) {
    result.push(`${result[result.length - 1].slice(0, -2)}'`);
  }
  return result;
};
const splitForIncludeQuery = (line: string) => {
  return [...[`'*'`], ...splitForQuery(line)].join(',');
};
const splitForExcludeQuery = (line: string) => {
  return splitForQuery(line).join(',');
};

const getVmsFromConfig = async (
  db: {
    prepare: (arg0: string) => {
      (): any;
      new (): any;
      all: { (arg0: any, arg1: number, arg2: any): any; new (): any };
    };
  },
  version: undefined,
  sysInfo: {
    cpu: { manufacturer: string; brand: string; cores: any };
    osInfo: { arch: string };
    baseboard: { manufacturer: string; model: string };
    mem: { total: number };
  },
  mainDisplay: { currentResX: any; currentResY: any }
) => {
  const result = await db
    .prepare(
      `SELECT * FROM
      config_v1
      JOIN json_each(config_v1.arch) as arch
      JOIN json_each(config_v1.cpu_manufacturer_include) as cpu_manufacturer_include
      JOIN json_each(config_v1.cpu_manufacturer_exclude) as cpu_manufacturer_exclude
      JOIN json_each(config_v1.cpu_brand_include) as cpu_brand_include
      JOIN json_each(config_v1.cpu_brand_exclude) as cpu_brand_exclude
      JOIN json_each(config_v1.baseboard_manufacturer_include) as baseboard_manufacturer_include
      JOIN json_each(config_v1.baseboard_manufacturer_exclude) as baseboard_manufacturer_exclude
      JOIN json_each(config_v1.baseboard_model_include) as baseboard_model_include
      JOIN json_each(config_v1.baseboard_model_exclude) as baseboard_model_exclude
      JOIN json_each(config_v1.resolutionX) as resolutionX
      JOIN json_each(config_v1.resolutionY) as resolutionY
      WHERE
      minimum_version <= ? AND
      memory <= ? AND
      cores <= ? AND
      cpu_manufacturer_include.value IN (${splitForIncludeQuery(
        sysInfo.cpu.manufacturer
      )}) AND
      arch.value IN (${splitForIncludeQuery(sysInfo.osInfo.arch)}) AND
      cpu_manufacturer_exclude.value NOT IN (${splitForExcludeQuery(
        sysInfo.cpu.manufacturer
      )}) AND
      cpu_brand_include.value IN (${splitForIncludeQuery(
        sysInfo.cpu.brand
      )}) AND
      cpu_brand_exclude.value NOT IN (${splitForExcludeQuery(
        sysInfo.cpu.brand
      )}) AND
      baseboard_manufacturer_include.value IN (${splitForIncludeQuery(
        sysInfo.baseboard.manufacturer
      )}) AND
      baseboard_manufacturer_exclude.value NOT IN (${splitForExcludeQuery(
        sysInfo.baseboard.manufacturer
      )}) AND
      baseboard_model_include.value IN (${splitForIncludeQuery(
        sysInfo.baseboard.model
      )}) AND
      baseboard_model_exclude.value NOT IN (${splitForExcludeQuery(
        sysInfo.baseboard.model
      )}) AND
      resolutionX.value IN (${mainDisplay.currentResX}, '*') AND
      resolutionY.value IN (${mainDisplay.currentResY}, '*')
      GROUP BY config_v1.id
      `
    )
    .all(version, sysInfo.mem.total / 1024 / 1024, sysInfo.cpu.cores);

  return result;
};

export default async (
  db: any,
  sysInfo: any,
  version: any,
  mainDisplay: any
) => {
  return Promise.resolve(
    await getVmsFromConfig(db, sysInfo, version, mainDisplay)
  );
};
