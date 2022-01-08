const add = async (db: { exec: (arg0: string) => void }) => {
  db.exec(`CREATE TABLE repo_v1 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    url TEXT NOT NULL,
    repoSystemVersion TEXT NOT NULL
  )`);

  db.exec(`CREATE TABLE config_v1 (
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

  db.exec(`CREATE TABLE config_v1_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    releaseDescription TEXT NOT NULL,
    config TEXT NOT NULL,
    configSystemVersion TEXT NOT NULL,
    previous_id INT default '0'
  )`);

  db.exec(`CREATE TABLE layer_v1 (
    hash TEXT PRIMARY KEY,
    url TEXT,
    format TEXT NOT NULL
  )`);

  db.exec(`CREATE TABLE disk_v1 (
    hash TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config_v1_id INT NOT NULL,
    path TEXT NOT NULL
  )`);

  db.exec(`CREATE TABLE my_layer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disk_version TEXT NOT NULL,
    disk_hash TEXT NOT NULL,
    my_config_id INT NOT NULL,
    path TEXT NOT NULL
  )`);

  db.exec(`CREATE TABLE my_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_version INT NOT NULL,
    config_id INT NOT NULL,
    config_history_version INT NOT NULL,
    config_history_id INT NOT NULL
  )`);

  db.exec(`CREATE TABLE my_local_config_layer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disk_version TEXT NOT NULL,
    disk_hash TEXT NOT NULL,
    my_config_config_id INT NOT NULL,
    path TEXT NOT NULL
  )`);

  db.exec(`CREATE TABLE my_local_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    config JSON HIDDEN
  )`);
};

export default async (db: any) => {
  return Promise.resolve(await add(db));
};
