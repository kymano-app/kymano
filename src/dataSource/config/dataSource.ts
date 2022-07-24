import { Database } from "better-sqlite3";
import fs from "fs";
import path from "path";
import processConfig from "../../v1/processConfig";
import { splitForExcludeQuery, splitForIncludeQuery } from "./getVmsFromConfig";

const yaml = require("js-yaml");

export class DataSource {
  constructor(readonly db: Database) {
    this.db = db;
  }

  public addMyConfig = async (
    cli_alias: any,
    configName: string,
    config_id: any,
    drivesNames: any[],
    internal: boolean
  ) => {
    console.log(
      `src/dataSource/config/dataSource.ts:21 internal:`,
      internal,
      Number(internal)
    );
    const vmName = await this.getMyVmName(configName);

    const id = await this.db
      .prepare(
        `INSERT INTO my_config 
        (cli_alias, config_v, config_id, vm_name, disks, internal) 
        VALUES (?, ?, ?, ?, json(?), ?)`
      )
      .run(
        cli_alias,
        "1",
        config_id,
        vmName,
        JSON.stringify(drivesNames),
        Number(internal)
      ).lastInsertRowid;

    return [id, vmName];
  };

  public addConfig = async (
    config_: any,
    configName: string,
    repoId: any,
    index: any,
    configVersion: string,
    type: string
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
    config,
    type)
    VALUES (?, ?, ?, json(?), json(?), json(?), json(?), json(?), json(?), json(?), json(?), json(?), json(?), json(?), ?, ?, ?, ?, ?, ?, ?, ?, json(?), ?
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
      JSON.stringify(config.requirements.cpu.manufacturer.exclude || [""]),
      JSON.stringify(config.requirements.cpu.brand.include || ["*"]),
      JSON.stringify(config.requirements.cpu.brand.exclude || [""]),
      JSON.stringify(
        config.requirements.baseboard.manufacturer.include || ["*"]
      ),
      JSON.stringify(
        config.requirements.baseboard.manufacturer.exclude || [""]
      ),
      JSON.stringify(config.requirements.baseboard.model.include || ["*"]),
      JSON.stringify(config.requirements.baseboard.model.exclude || [""]),
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
      }),
      type
    );
  };

  public addConfigToHistory = async (
    version: string,
    name: any,
    releaseDescription: any,
    config: any,
    picture: string,
    previous_id: Number
  ) => {
    const sql = `INSERT INTO config_v1_history (
    version,
    name,
    releaseDescription,
    config,
    picture,
    previous_id)
    VALUES (?, ?, ?, ?, ?, ?)`;
    console.log(sql);
    const lastInsertRowid = await this.db
      .prepare(sql)
      .run(version, name, releaseDescription, config, picture, previous_id)
      .lastInsertRowid;

    return lastInsertRowid;
  };

  private getMyVmName = async (configName: string) => {
    const my_vm_names = await this.db
      .prepare(`SELECT vm_name FROM my_config ORDER BY id ASC`)
      .all();
    console.log(`my_vm_name:`, JSON.stringify(my_vm_names));
    console.log(`configName:`, configName);
    let newNumber = 1;
    if (my_vm_names.length > 0) {
      const myVmNameFiltered = my_vm_names.filter((row: string) =>
        new RegExp(`^${configName}-[0-9]+$`).test(row.vm_name)
      );
      console.log("myVmNameFiltered", myVmNameFiltered);
      if (myVmNameFiltered.length > 0) {
        const name = myVmNameFiltered[myVmNameFiltered.length - 1];
        const nameSplited = name.vm_name.split("-");
        console.log("nameSplited", nameSplited);
        newNumber = parseInt(nameSplited[nameSplited.length - 1]) + 1;
      }
    }
    // console.log("configName-newNumber", `${configName}-${newNumber}`);
    // const { lastInsertRowid } = await this.db
    //   .prepare(`INSERT INTO my_vm_name (name) VALUES (?)`)
    //   .run(`${configName}-${newNumber}`);

    // console.log("lastInsertRowid", lastInsertRowid);

    return `${configName}-${newNumber}`;
  };

  public getConfigByCliAlias = async (alias: string) => {
    const my_config = await this.db
      .prepare(
        `SELECT config_id, config_v, config_history_id 
      FROM my_config 
      WHERE cli_alias = ? 
      ORDER BY id DESC 
      LIMIT 1`
      )
      .get(alias);

    console.log("my_config:", JSON.stringify(my_config));

    if (my_config) {
      const config_v1 = await this.db
        .prepare(
          `SELECT config, name 
          FROM config_v${my_config.config_v} 
          WHERE id = ? 
          LIMIT 1`
        )
        .get(my_config.config_id);

      if (my_config.config_history_id) {
        const config_history = await this.db
          .prepare(`SELECT config FROM config_v1_history WHERE id = ? LIMIT 1`)
          .get(my_config.config_history_id);

        return [JSON.parse(config_history.config), config_v1.name];
      } else {
        return [JSON.parse(config_v1.config), config_v1.name];
      }
    }
    return [];
  };

  public getMyVmsWithoutInternals = async () => {
    const data = await this.db
      .prepare(
        `
        SELECT *
        FROM(
                SELECT vm_name,
                    my_config.id as my_vm_id,
                    config_v1.id as id,
                    'actual' as type,
                    config_v1.history_id as config_history_id,
                    picture,
                    releaseDescription,
                    config,
                    internal,
                    updated,
                    config_v1.version,
                    status,
                    pid
                FROM my_config
                    INNER JOIN config_v1 ON my_config.config_id = config_v1.id
                WHERE config_v1.type = 'searchable'
                UNION
                SELECT vm_name,
                    my_config.id as my_vm_id,
                    config_v1_history.id as id,
                    'history' as type,
                    config_v1_history.previous_id as config_history_id,
                    picture,
                    releaseDescription,
                    config,
                    internal,
                    updated,
                    config_v1_history.version,
                    status,
                    pid
                FROM my_config
                    INNER JOIN config_v1_history ON my_config.config_history_id = config_v1_history.id
            )
        WHERE internal = 0
        ORDER BY my_vm_id DESC`
      )
      .all();

    return data;
  };

  public getConfigById = async (id: Number) => {
    const data = await this.db
      .prepare("SELECT * FROM config_v1 WHERE id = ? ")
      .get(id);

    return data;
  };

  public getConfigByRepoIdAndIndex = async (repoId: Number, index: string) => {
    const data = await this.db
      .prepare("SELECT * FROM config_v1 WHERE repo_id = ? AND `index` = ?")
      .get(repoId, index);
    console.log("getConfigByRepoIdAndIndex", repoId, index);

    return data;
  };

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
  };

  public getConfigVersionByRepoUrl = async (repoUrl: string) => {
    console.log("getConfigVersionByRepoUrl", repoUrl);
    const row = await this.db
      .prepare(`SELECT id, version FROM repo_v1 WHERE url = ?`)
      .get(repoUrl);
    if (row) {
      return [row.id, row.version];
    }
    return [0, 0];
  };

  public insertRepo = async (repoUrl: string, version: string) => {
    console.log("insertRepo: ", repoUrl, version);
    const sql = `INSERT INTO repo_v1 (url, version) VALUES (?, ?)`;
    const lastInsertRowid = await this.db.prepare(sql).run(repoUrl, version)
      .lastInsertRowid;
    return lastInsertRowid;
  };

  public selectOrInsertLayer = async (hash: string) => {
    const row = this.db
      .prepare("SELECT * FROM layer_v1 WHERE hash = ?")
      .get(hash);
    if (!row) {
      const sql = `INSERT INTO layer_v1 (hash, format) VALUES (?, ?)`;
      await this.db.prepare(sql).run(hash, "qcow2");
    }
  };

  public insertMyDisk = async (name: string, extension: string) => {
    const sql = `INSERT INTO my_disk (name, extension) VALUES (?, ?)`;
    const diskId = await this.db.prepare(sql).run(name, extension).lastInsertRowid;
    return diskId;
  };

  public isVmNameAvailable = async (vmName: string) => {
    const exists = this.db
      .prepare(
        `SELECT id 
         FROM my_config 
         WHERE vm_name = ?`
      )
      .get(vmName);
    if (exists) {
      return false;
    }
    return true;
  };

  public getConfigByMyConfigId = async (myConfigId: Number) => {
    const data = await this.db
      .prepare(
        `SELECT name, config
          FROM my_config
              INNER JOIN config_v1 ON my_config.config_id = config_v1.id
          WHERE my_config.id = ?
          UNION
          SELECT name, config
          FROM my_config
              INNER JOIN config_v1_history ON my_config.config_history_id = config_v1_history.id
          WHERE my_config.id = ?`
      )
      .get(myConfigId, myConfigId);
    console.log(data);
    return [JSON.parse(data.config), data.name];
  };

  public getConfigHistoryByIdV1 = async (configHistoryId: Number) => {
    const data = await this.db
      .prepare(
        `SELECT *
          FROM config_v1_history 
          WHERE id = ?`
      )
      .all(configHistoryId);
    console.log(data);
    return data[0];
  };

  // public getMyLocalConfig = async (name: string) => {
  //   const data = await this.db
  //     .prepare(
  //       `SELECT my_local_config.config
  //         FROM my_local_config
  //         LEFT JOIN my_vm_name
  //           ON my_vm_name.id = my_local_config.my_vm_name_id
  //         WHERE my_vm_name.name = ?`
  //     )
  //     .get(name);
  //   console.log(data.config);
  //   return JSON.parse(data.config);
  // };

  public getMyConfigById = async (id: Number) => {
    const data = await this.db
      .prepare(
        `SELECT *
          FROM my_config
          WHERE id = ?`
      )
      .get(id);
    console.log(data);
    return data;
  };

  // public getUpdateMyConfigSockets = async (id: Number, sockets: string) => {
  //   await this.db
  //     .prepare(
  //       `UPDATE my_config SET sockets = ? WHERE id = ?`
  //     )
  //     .run(JSON.stringify(sockets), id);
  // };

  // public getUpdateMyLocalConfigSockets = async (id: Number, sockets: string) => {
  //   await this.db
  //     .prepare(
  //       `UPDATE my_local_config SET sockets = ? WHERE id = ?`
  //     )
  //     .run(JSON.stringify(sockets), id);
  // };

  public addRepoWithConfigs = async (
    repoUrl: any,
    repoVersion: any,
    tmpRepoDir: any,
    configName: any
  ) => {
    const row = this.db
      .prepare("SELECT * FROM repo_v1 WHERE url = ?")
      .get(repoUrl);
    if (!row) {
      const sql = `INSERT INTO repo_v1 (url, version) VALUES (?, ?)`;
      const { lastInsertRowid } = await this.db
        .prepare(sql)
        .run(repoUrl, repoVersion);
      console.log("lastInsertRowid", lastInsertRowid);
      const latest = yaml.load(
        fs.readFileSync(`${tmpRepoDir}/latest.yml`, "utf8")
      );
      console.log(latest);
      await Promise.all(
        Object.entries(latest.configs).map(async ([configIndex, value]) => {
          console.log(configIndex, value);
          const [from, configVersion] = value.from.split(":");
          let parsedConfig = await processConfig(
            `/${configVersion}`,
            `${tmpRepoDir}/${from}/`
          );
          console.log("parsedConfig", parsedConfig);
          const info = await this.addConfig(
            parsedConfig,
            path.basename(from),
            lastInsertRowid,
            configIndex,
            configVersion,
            value.type
          );
          console.log("info::::::::", info);
        })
      );
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
      type TEXT,
      history_v INT default '0',
      history_id INT default '0'
    )`);

    await this.db.exec(`CREATE TABLE config_v1_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      name TEXT NOT NULL,
      releaseDescription TEXT NOT NULL,
      picture TEXT NOT NULL,
      config TEXT NOT NULL,
      previous_v default '0',
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

    await this.db.exec(`CREATE TABLE my_disk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      extension TEXT NOT NULL,
      my_config_id INT
    )`);

    // await this.db.exec(`CREATE TABLE my_layer (
    //   id INTEGER PRIMARY KEY AUTOINCREMENT,
    //   disk_version TEXT NOT NULL,
    //   disk_hash TEXT NOT NULL,
    //   my_config_id INT NOT NULL,
    //   path TEXT NOT NULL
    // )`);

    await this.db.exec(`CREATE TABLE my_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cli_alias TEXT,
      config_v INT NOT NULL,
      config_id INT NOT NULL,
      config_history_v INT,
      config_history_id INT,
      internal INT default '0',
      updated INT default '0',
      vm_name TEXT,
      disks JSON HIDDEN,
      pid INT,
      status TEXT
    )`);

    // await this.db.exec(`CREATE TABLE my_local_config_layer (
    //   id INTEGER PRIMARY KEY AUTOINCREMENT,
    //   disk_version TEXT NOT NULL,
    //   disk_hash TEXT NOT NULL,
    //   my_local_config_id INT NOT NULL,
    //   path TEXT NOT NULL
    // )`);

    // await this.db.exec(`CREATE TABLE my_local_config (
    //   id INTEGER PRIMARY KEY AUTOINCREMENT,
    //   my_vm_name_id INT NOT NULL,
    //   config JSON HIDDEN,
    //   sockets JSON HIDDEN
    // )`);

    // // using in my_config and my_local_config
    // await this.db.exec(`CREATE TABLE my_vm_name (
    //   id INTEGER PRIMARY KEY AUTOINCREMENT,
    //   name TEXT NOT NULL
    // )`);
  };

  public getTables = async () => {
    return await this.db
      .prepare(
        `SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='repo_v1'`
      )
      .get().count;
  };

  public getVolumes = async () => {
    return await this.db.prepare(`SELECT * FROM layer_v1`).all();
  };

  public getMyDisks = async () => {
    return await this.db.prepare(`SELECT * FROM my_disk`).all();
  };

  public getMyVmDisks = async () => {
    return await this.db.prepare(`SELECT id, disks, vm_name FROM my_config`).all();
  };

  public changeVmName = async (name: any, id: any) => {
    console.log("name:", name, id);

    await this.db
      .prepare("UPDATE my_config SET vm_name = ? WHERE id = ?")
      .run(name, id);
  };

  public updateRepoVersion = async (repoId: Number, version: Number) => {
    await this.db
      .prepare("UPDATE repo_v1 SET version = ? WHERE id = ?")
      .run(version, repoId);
  };

  public updateConfigPreviousId = async (id: Number, previousId: Number) => {
    console.log(id, previousId);

    await this.db
      .prepare("UPDATE config_v1 SET history_id = ? WHERE id = ?")
      .run(previousId, id);
  };

  public changeConfigToPreviousIdInMyConfigV1 = async (
    configId: Number,
    newIdInHistory: Number
  ) => {
    console.log("changeConfigToPreviousIdInMyConfig", configId, newIdInHistory);

    await this.db
      .prepare(
        `UPDATE my_config
          SET config_history_id = ?,
              config_history_v = 1,
              config_id = 0,
              config_v = 0,
              updated = 1
          WHERE config_id = ?`
      )
      .run(newIdInHistory, configId);
  };

  public getLatestConfigByHistoryIdV1 = async (historyId: Number) => {
    let previous_id = historyId;
    do {
      const previous_id_obj = await this.db
        .prepare(`SELECT id FROM config_v1_history WHERE previous_id = ?`)
        .get(previous_id);
      console.log(
        `src/dataSource/config/dataSource.ts:622 previous_id_obj`,
        previous_id_obj
      );
      if (previous_id_obj) {
        previous_id = previous_id_obj.id;
      } else {
        break;
      }
      console.log(
        `src/dataSource/config/dataSource.ts:611 previous_id`,
        previous_id
      );
    } while (previous_id);

    console.log(
      `src/dataSource/config/dataSource.ts:634 previous_id`,
      previous_id
    );

    let config_id = await this.db
      .prepare(`SELECT id FROM config_v1 WHERE history_id = ?`)
      .get(previous_id).id;

    return this.getConfigById(config_id);
  };

  public updateConfigInMyConfig = async (myConfigId: Number) => {
    const config_history_id = await this.db
      .prepare(`SELECT config_history_id FROM my_config WHERE id = ?`)
      .get(myConfigId).config_history_id;
    console.log(
      `src/dataSource/config/dataSource.ts:605 config_history_id`,
      config_history_id
    );
    let previous_id = config_history_id;
    do {
      const previous_id_obj = await this.db
        .prepare(`SELECT id FROM config_v1_history WHERE previous_id = ?`)
        .get(previous_id);
      console.log(
        `src/dataSource/config/dataSource.ts:622 previous_id_obj`,
        previous_id_obj
      );
      if (previous_id_obj) {
        previous_id = previous_id_obj.id;
      } else {
        break;
      }
      console.log(
        `src/dataSource/config/dataSource.ts:611 previous_id`,
        previous_id
      );
    } while (previous_id);

    console.log(
      `src/dataSource/config/dataSource.ts:634 previous_id`,
      previous_id
    );

    let config_id = await this.db
      .prepare(`SELECT id FROM config_v1 WHERE history_id = ?`)
      .get(previous_id).id;

    console.log(
      `src/dataSource/config/dataSource.ts:631 config_id, myConfigId`,
      config_id,
      myConfigId
    );
    await this.db
      .prepare(
        `UPDATE my_config
          SET config_v = 1,
              config_id = ?,
              config_history_v = 0,
              config_history_id = 0,
              updated = 1
          WHERE id = ?`
      )
      .run(config_id, myConfigId);
  };

  public rollbackConfigInMyConfigV1 = async (
    myConfigId: Number,
    historyId: Number
  ) => {
    await this.db
      .prepare(
        `UPDATE my_config
          SET config_v = 0,
              config_id = 0,
              config_history_v = 1,
              config_history_id = ?,
              updated = 1
          WHERE id = ?`
      )
      .run(historyId, myConfigId);
  };

  public updatePidAndStatusInMyConfig = async (
    myConfigId: Number,
    pid: Number,
    status: string
  ) => {
    await this.db
      .prepare(
        `UPDATE my_config
          SET pid = ?,
              status = ?
          WHERE id = ?`
      )
      .run(pid, status, myConfigId);
  };

  public getHistoryIdFromConfigV1 = async (configId: Number) => {
    return await this.db
      .prepare(`SELECT history_id FROM config_v1 WHERE id = ?`)
      .get(configId).history_id;
  };

  public getPreviousIdFromConfigHistoryV1 = async (configHistoryId: Number) => {
    return await this.db
      .prepare(`SELECT previous_id FROM config_v1_history WHERE id = ?`)
      .get(configHistoryId).previous_id;
  };

  public getMyConfigForUpdate = async () => {
    return await this.db
      .prepare(`SELECT id FROM my_config WHERE config_history_id > 0`)
      .all();
  };

  public getVmsFromConfig = async (
    sysInfo,
    mainDisplay,
    kymanoVersion: any
  ) => {
    const result = await this.db
      .prepare(
        `SELECT *, config_v1.id as config_id
        FROM
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
        config_v1.type = 'searchable' AND
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
      .all(kymanoVersion, sysInfo.mem.total / 1024 / 1024, sysInfo.cpu.cores);

    return result;
  };

  // public addOrUpdateMyLocalConfig = async (config: {
  //   name: any;
  //   arch: any;
  //   macos: any;
  //   linux: any;
  //   windows: any;
  // }) => {
  //   const my_local_config = this.db
  //     .prepare(
  //       `SELECT my_local_config.id
  //               FROM my_local_config
  //               LEFT JOIN my_vm_name
  //                 ON my_vm_name.id = my_local_config.my_vm_name_id
  //               WHERE my_vm_name.name = ?`
  //     )
  //     .get(config.name);
  //   console.log("my_local_config", my_local_config);

  //   if (!my_local_config) {
  //     const { lastInsertRowid } = await this.db
  //       .prepare(`INSERT INTO my_vm_name (name) VALUES (?)`)
  //       .run(config.name);

  //     const sql = `
  //       INSERT INTO my_local_config (
  //         my_vm_name_id,
  //         config
  //       )
  //       VALUES (?, json(?))`;
  //     console.log(sql);
  //     const lastInsertRowidMyConfig = await this.db.prepare(sql).run(
  //       lastInsertRowid,
  //       JSON.stringify({
  //         arch: config.arch,
  //         macos: config.macos,
  //         linux: config.linux,
  //         windows: config.windows,
  //       })
  //     ).lastInsertRowid;
  //     return lastInsertRowidMyConfig;
  //   } else {
  //     const sql = `UPDATE my_local_config SET config = json(?) WHERE my_vm_name_id = ?`;
  //     await this.db.prepare(sql).run(
  //       JSON.stringify({
  //         arch: config.arch,
  //         macos: config.macos,
  //         linux: config.linux,
  //         windows: config.windows,
  //       }),
  //       my_local_config.id
  //     );
  //     return my_local_config.id;
  //   }
  // };
}
