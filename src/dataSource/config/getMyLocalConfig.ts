import { Database } from 'better-sqlite3';

const getMyLocalConfig = async (name: string, db: Database) => {
  const data = await db
    .prepare('SELECT * FROM my_local_config WHERE name = ?')
    .get(name);
  console.log(data.config);
  return JSON.parse(data.config);
};

export default async (name: string, db: Database) => {
  return Promise.resolve(await getMyLocalConfig(name, db));
};
