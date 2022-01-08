import commit from './commands/commit';
import commitLayer from './commands/commitLayer';
import importLayer from './commands/importLayer';
import removeUserLayer from './commands/removeUserLayer';
import run from './commands/run';

const processCLI = async (args: any[], db: any) => {

  const command = args._[0];

  if (command === 'run') {
    run(args, db);
  } else if (command === 'commit') {
    commit(args, db);
  } else if (command === 'commit-layer') {
    commitLayer(args, db);
  } else if (command === 'import') {
    importLayer(args, db);
  } else if (command === 'rm') {
    removeUserLayer(args, db);
  }
};

export default async (args: any[], db: any) => {
  return Promise.resolve(await processCLI(args, db));
};
