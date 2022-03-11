import { Database } from "better-sqlite3";

const addConfig = async (config_: any, configName, db: Database, repoId: any, index: any, configVersion) => {
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

  const config = config_;
  config.requirements = config_.requirements || {};
  config.requirements.cpu = config_.requirements.cpu || {};
  config.requirements.cpu.manufacturer = config_.requirements.cpu.manufacturer || {};
  config.requirements.cpu.brand = config_.requirements.cpu.brand || {};
  config.requirements.baseboard = config_.requirements.baseboard || {};
  config.requirements.baseboard.manufacturer = config_.requirements.baseboard.manufacturer || {};
  config.requirements.baseboard.model = config_.requirements.baseboard.model || {};

  return await db.prepare(sql).run(
    repoId,
    index,
    configVersion,
    JSON.stringify(config.requirements.cpu.manufacturer.include || ["*"]),
    JSON.stringify(config.requirements.cpu.manufacturer.exclude || []),
    JSON.stringify(config.requirements.cpu.brand.include || ["*"]),
    JSON.stringify(config.requirements.cpu.brand.exclude || []),
    JSON.stringify(config.requirements.baseboard.manufacturer.include || ["*"]),
    JSON.stringify(config.requirements.baseboard.manufacturer.exclude || []),
    JSON.stringify(config.requirements.baseboard.model.include || ["*"]),
    JSON.stringify(config.requirements.baseboard.model.exclude || []),
    JSON.stringify(config.requirements.arch || ["*"]),
    JSON.stringify(config.requirements.resolutionX || ["*"]),
    JSON.stringify(config.requirements.resolutionY || ["*"]),
    config.requirements.memory || 0,
    config.requirements.cores || 0,
    config.requirements.disk || 0,
    parseFloat(config.requirements.minimumVersion || 0),
    configName,
    config.description || '',
    config.picture || '',
    config.releaseDescription || '',
    JSON.stringify({
      macos: config.macos,
      linux: config.linux,
      windows: config.windows,
    })
  );
};

export default async (config: any, configName, db: Database, repoId: any, index: any, configVersion) => {
  return Promise.resolve(await addConfig(config, configName, db, repoId, index, configVersion));
};
