import { Database } from "better-sqlite3";
import fs from "fs";
import path from "path";
import { stringify } from "uuid";
import processConfig from "../../v1/processConfig";

const yaml = require('js-yaml');

export class DataSource {
  constructor(readonly db: Database) {
    this.db = db;
  }

  public addMyConfig = async (
    cli_alias: any,
    configName: string,
    config_id: any
  ) => {
    const lastInsertRowid = await this.addMyVmName(configName);
    return await this.db
      .prepare(
        `INSERT INTO my_config (cli_alias, config_version, config_id, my_vm_name_id) VALUES (?, ?, ?, ?)`
      )
      .run(cli_alias, "1", config_id, lastInsertRowid);
  };

  private addConfig = async (
    config_: any,
    configName: string,
    repoId: any,
    index: any,
    configVersion: string
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

    const config = config_;
    config.requirements = config_.requirements || {};
    config.requirements.cpu = config_.requirements.cpu || {};
    config.requirements.cpu.manufacturer =
      config_.requirements.cpu.manufacturer || {};
    config.requirements.cpu.brand = config_.requirements.cpu.brand || {};
    config.requirements.baseboard = config_.requirements.baseboard || {};
    config.requirements.baseboard.manufacturer =
      config_.requirements.baseboard.manufacturer || {};
    config.requirements.baseboard.model =
      config_.requirements.baseboard.model || {};

    return await this.db.prepare(sql).run(
      repoId,
      index,
      configVersion,
      JSON.stringify(config.requirements.cpu.manufacturer.include || ["*"]),
      JSON.stringify(config.requirements.cpu.manufacturer.exclude || []),
      JSON.stringify(config.requirements.cpu.brand.include || ["*"]),
      JSON.stringify(config.requirements.cpu.brand.exclude || []),
      JSON.stringify(
        config.requirements.baseboard.manufacturer.include || ["*"]
      ),
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
      config.description || "",
      config.picture || "",
      config.releaseDescription || "",
      JSON.stringify({
        macos: config.macos,
        linux: config.linux,
        windows: config.windows,
      })
    );
  };

  private addMyVmName = async (configName: string) => {
    const my_vm_name = await this.db
      .prepare(`SELECT name FROM my_vm_name ORDER BY id DESC`)
      .all();
    console.log(`my_vm_name:`, JSON.stringify(my_vm_name));
    let newNumber = 1;
    if (my_vm_name.length>0) {
      const myVmNameFiltered = my_vm_name.filter((name: string) =>
        new RegExp(`^${configName}-[0-9]+$`).test(name)
      );
      console.log("myVmNameFiltered", myVmNameFiltered);
      if (myVmNameFiltered.length > 0){
        const lastName = myVmNameFiltered[myVmNameFiltered.length - 1];
        const lastNameSplited = lastName.split("-");
        console.log("lastNameSplited", lastNameSplited);
        newNumber = parseInt(lastNameSplited[lastNameSplited.length - 1]) + 1;
      }
    }
    console.log("configName-newNumber", `${configName}-${newNumber}`);
    const { lastInsertRowid } = await this.db
      .prepare(`INSERT INTO my_vm_name (name) VALUES (?)`)
      .run(`${configName}-${newNumber}`);

    console.log("lastInsertRowid", lastInsertRowid);

    return lastInsertRowid;
  };

  public getConfigByCliAlias = async (alias: string) => {
    const my_config = await this.db
      .prepare(
        "SELECT config_id, config_version, config_history_id FROM my_config WHERE cli_alias = ? ORDER BY id DESC LIMIT 1"
      )
      .get(alias);
    if (my_config) {
      const config_v1 = await this.db
        .prepare(
          `SELECT config, name FROM config_v${my_config.config_version} WHERE id = ? LIMIT 1`
        )
        .get(my_config.config_id);
  
      if (my_config.config_history_id) {
        const config_history = await this.db
          .prepare(`SELECT config FROM config_history WHERE id = ? LIMIT 1`)
          .get(my_config.config_history_id);
  
        return [JSON.parse(config_history.config), config_v1.name];
      } else {
        return [JSON.parse(config_v1.config), config_v1.name];
      }
    }
    return [];
  }

  public getConfigIdByRepoUrlAndName = async (
    repoUrl: string,
    name: string
  ) => {
    let { id } = await this.db
      .prepare("SELECT id FROM repo_v1 WHERE url = ?")
      .get(repoUrl);
    const data = await this.db
      .prepare("SELECT id FROM config_v1 WHERE repo_id = ? AND name = ? ")
      .get(parseInt(id), name);
  
    return parseInt(data.id);
  }

  public selectOrInsertLayer = async (hash: string) => {
    const row = this.db.prepare('SELECT * FROM layer_v1 WHERE hash = ?').get(hash);
    if (!row) {
      const sql = `INSERT INTO layer_v1 (hash, format) VALUES (?, ?)`;
      await this.db.prepare(sql).run(hash, 'qcow2');
    }
  }

  public isVmNameAvailable = async (vmName: string) => {
    const exists = this.db
      .prepare(
        `SELECT my_config.id 
         FROM my_config 
         LEFT JOIN my_vm_name 
           ON my_vm_name.id = my_config.my_vm_name_id 
         WHERE my_vm_name.name = ?`
      )
      .get(vmName);
    if (exists) {
      return false;
    }
    return true;
  }

  public getMyLocalConfig = async (name: string) => {
    const data = await this.db
      .prepare(
        `SELECT my_local_config.config 
          FROM my_local_config 
          LEFT JOIN my_vm_name 
            ON my_vm_name.id = my_local_config.my_vm_name_id 
          WHERE my_vm_name.name = ?`
      )
      .get(name);
    console.log(data.config);
    return JSON.parse(data.config);
  }

  public addRepoWithConfigs = async (
    repoUrl: any,
    repoVersion: any,
    tmpRepoDir: any,
    configName: any
  ) => {
    const row = this.db
      .prepare('SELECT * FROM repo_v1 WHERE url = ?')
      .get(repoUrl);
    if (!row) {
      const sql = `INSERT INTO repo_v1 (url, version) VALUES (?, ?)`;
      const {lastInsertRowid} = await this.db.prepare(sql).run(
        repoUrl,
        repoVersion
      );
      console.log('lastInsertRowid', lastInsertRowid)
      const latest = yaml.load(fs.readFileSync(`${tmpRepoDir}/latest.yml`, 'utf8'));
      console.log(latest)
      await Promise.all(
        Object.entries(latest.configs).map(async ([configIndex, value]) => {
          console.log(configIndex, value)
          const [from, configVersion] = value.from.split(':');
          let parsedConfig = await processConfig(
            `/${configVersion}`,
            `${tmpRepoDir}/${from}/`
          );
          console.log('parsedConfig', parsedConfig)
          const info = await this.addConfig(parsedConfig, path.basename(from), lastInsertRowid, configIndex, configVersion)
          console.log('info::::::::', info)
        })
      )
    }
  };

  public createTables = async () => {
    await this.db.exec(`CREATE TABLE settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value TEXT NOT NULL
    )`);
  
    await this.db.exec(`CREATE TABLE repo_v1 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      url TEXT NOT NULL
    )`);
  
    await this.db.exec(`CREATE TABLE config_v1 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INT NOT NULL,
      'index' INT NOT NULL,
      version NUMERIC NOT NULL,
      cpu_manufacturer_include JSON HIDDEN,
      cpu_manufacturer_exclude JSON HIDDEN,
      cpu_brand_include JSON HIDDEN,
      cpu_brand_exclude JSON HIDDEN,
      baseboard_manufacturer_include JSON HIDDEN,
      baseboard_manufacturer_exclude JSON HIDDEN,
      baseboard_model_include JSON HIDDEN,
      baseboard_model_exclude JSON HIDDEN,
      arch JSON HIDDEN,
      resolutionX JSON HIDDEN,
      resolutionY JSON HIDDEN,
      memory INT NOT NULL,
      cores INT NOT NULL,
      disk INT NOT NULL,
      minimum_version NUMERIC NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      picture TEXT,
      releaseDescription TEXT,
      config JSON HIDDEN,
      previous_id INT default '0'
    )`);
  
    await this.db.exec(`CREATE TABLE config_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      releaseDescription TEXT NOT NULL,
      config TEXT NOT NULL,
      configSystemVersion TEXT NOT NULL,
      previous_id INT default '0'
    )`);
  
    await this.db.exec(`CREATE TABLE layer_v1 (
      hash TEXT PRIMARY KEY,
      url TEXT,
      format TEXT NOT NULL
    )`);
  
    await this.db.exec(`CREATE TABLE disk_v1 (
      hash TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      config_v1_id INT NOT NULL,
      path TEXT NOT NULL
    )`);
  
    await this.db.exec(`CREATE TABLE my_layer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disk_version TEXT NOT NULL,
      disk_hash TEXT NOT NULL,
      my_config_id INT NOT NULL,
      path TEXT NOT NULL
    )`);
  
    await this.db.exec(`CREATE TABLE my_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      my_vm_name_id INT NOT NULL,
      cli_alias TEXT,
      config_version INT NOT NULL,
      config_id INT NOT NULL,
      config_history_id INT
    )`);
  
    await this.db.exec(`CREATE TABLE my_local_config_layer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disk_version TEXT NOT NULL,
      disk_hash TEXT NOT NULL,
      my_config_config_id INT NOT NULL,
      path TEXT NOT NULL
    )`);
  
    await this.db.exec(`CREATE TABLE my_local_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      my_vm_name_id INT NOT NULL,
      config JSON HIDDEN
    )`);
  
    await this.db.exec(`CREATE TABLE my_vm_name (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )`);
  };

  public getTables = async () => {
     return await this.db.prepare(`SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='repo_v1'`).get().count;
  }
  
  public addOrUpdateMyLocalConfig = async (
    config: {
      name: any;
      arch: any;
      macos: any;
      linux: any;
      windows: any;
    },
  ) => {
    const my_local_config = this.db
      .prepare(
        `SELECT my_local_config.id 
                FROM my_local_config 
                LEFT JOIN my_vm_name 
                  ON my_vm_name.id = my_local_config.my_vm_name_id 
                WHERE my_vm_name.name = ?`
      )
      .get(config.name);
    console.log("my_local_config", my_local_config);
  
    if (!my_local_config) {
      const { lastInsertRowid } = await this.db
        .prepare(`INSERT INTO my_vm_name (name) VALUES (?)`)
        .run(config.name);
  
      const sql = `
        INSERT INTO my_local_config (
          my_vm_name_id,
          config
        )
        VALUES (?, json(?))`;
      console.log(sql);
      await this.db.prepare(sql).run(
        lastInsertRowid,
        JSON.stringify({
          arch: config.arch,
          macos: config.macos,
          linux: config.linux,
          windows: config.windows,
        })
      );
    } else {
      const sql = `UPDATE my_local_config SET config = json(?) WHERE my_vm_name_id = ?`;
      await this.db.prepare(sql).run(
        JSON.stringify({
          arch: config.arch,
          macos: config.macos,
          linux: config.linux,
          windows: config.windows,
        }),
        my_local_config.id
      );
    }
  };
}
