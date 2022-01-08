import { Database } from 'better-sqlite3';

const add = async (
  config: {
    version: any;
    requirements: {
      cpu: {
        manufacturer: { include: any; exclude: any };
        brand: { include: any; exclude: any };
      };
      baseboard: {
        manufacturer: { include: any; exclude: any };
        model: { include: any; exclude: any };
      };
      arch: any;
      resolutionX: any;
      resolutionY: any;
      memory: any;
      cores: any;
      disk: any;
      minimumVersion: string;
    };
    name: any;
    description: any;
    picture: any;
    releaseDescription: any;
    macos: any;
    linux: any;
    win: any;
  },
  db: Database,
  repoId: any,
  index: any
) => {
  const sql = `INSERT INTO config_v1 (
  repo_id,
  'index',
  version,
  cpu_manufacturer_include,
  cpu_manufacturer_exclude,
  cpu_brand_include,
  cpu_brand_exclude,
  baseboard_manufacturer_include,
  baseboard_manufacturer_exclude,
  baseboard_model_include,
  baseboard_model_exclude,
  arch,
  resolutionX,
  resolutionY,
  memory,
  cores,
  disk,
  minimum_version,
  name,
  description,
  picture,
  releaseDescription,
  config)
  VALUES (?, ?, ?, json(?), json(?), json(?), json(?), json(?), json(?), json(?), json(?), json(?), json(?), json(?), ?, ?, ?, ?, ?, ?, ?, ?, json(?)
  )`;
  console.log(sql);
  await db.prepare(sql).run(
    repoId,
    index,
    config.version,
    JSON.stringify(config.requirements.cpu.manufacturer.include || ['*']),
    JSON.stringify(config.requirements.cpu.manufacturer.exclude || []),
    JSON.stringify(config.requirements.cpu.brand.include || ['*']),
    JSON.stringify(config.requirements.cpu.brand.exclude || []),
    JSON.stringify(config.requirements.baseboard.manufacturer.include || ['*']),
    JSON.stringify(config.requirements.baseboard.manufacturer.exclude || []),
    JSON.stringify(config.requirements.baseboard.model.include || ['*']),
    JSON.stringify(config.requirements.baseboard.model.exclude || []),
    JSON.stringify(config.requirements.arch || ['*']),
    JSON.stringify(config.requirements.resolutionX || ['*']),
    JSON.stringify(config.requirements.resolutionY || ['*']),
    config.requirements.memory,
    config.requirements.cores,
    config.requirements.disk,
    parseFloat(config.requirements.minimumVersion),
    config.name,
    config.description,
    config.picture,
    config.releaseDescription,
    JSON.stringify({
      macos: config.macos,
      linux: config.linux,
      win: config.win,
    })
  );
};

export default async (config: any, db: Database, repoId: any, index: any) => {
  return Promise.resolve(await add(config, db, repoId, index));
};
