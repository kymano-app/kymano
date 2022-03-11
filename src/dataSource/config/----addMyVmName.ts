import { Database } from "better-sqlite3";

const addMyVmName = async (configName: string, db: Database) => {
  const my_vm_name = await db
    .prepare(`SELECT name FROM my_vm_name ORDER BY id DESC`)
    .get();
  console.log(my_vm_name);
  let newNumber = 1;
  if (my_vm_name) {
    const myVmNameFiltered = my_vm_name.filter((name) =>
      new RegExp(`^${configName}-[0-9]+$`).test(name)
    );
    console.log("myVmNameFiltered", myVmNameFiltered);
    const lastName = myVmNameFiltered[myVmNameFiltered.length - 1];
    const lastNameSplited = lastName.split("-");
    console.log("lastNameSplited", lastNameSplited);
    newNumber = parseInt(lastNameSplited[lastNameSplited.length - 1]) + 1;
  }
  console.log("configName-newNumber", `${configName}-${newNumber}`);
  const { lastInsertRowid } = await db
    .prepare(`INSERT INTO my_vm_name (name) VALUES (?)`)
    .run(`${configName}-${newNumber}`);

  console.log("lastInsertRowid", lastInsertRowid);

  return lastInsertRowid;
};

export default async (configName: string, db: Database) => {
  return Promise.resolve(await addMyVmName(configName, db));
};
