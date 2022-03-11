import AdmZip from 'adm-zip';
import axios from 'axios';
import { promises as fs } from 'fs';
import os from 'os';
import { read } from 'simple-yaml-import';

const merge = (ymlContent, config) => {
  const resultConfig = config || [];
  let mergedConfig;
  if (ymlContent) {
    const ymlContentInLowerCase = ymlContent.map((a) => a.toLowerCase());
    mergedConfig = resultConfig || [];
    mergedConfig = [...resultConfig, ...ymlContentInLowerCase];
  }
  return mergedConfig;
};

const formatConfig = (config) => {
  if (!config) return [];
  let formatedConfig = [];
  config.forEach((line) => {
    if (line.length > 0) {
      const newConfig = formatConfig(line);
      formatedConfig = [...formatedConfig, ...newConfig];
    } else {
      formatedConfig.push(line);
    }
  });
  return formatedConfig;
};

const addRequirements = (ymlContent, finalConfig) => {
  const finalConfigWithRequirements = finalConfig || {};

  [
    'minimumVersion',
    'memory',
    'cores',
    'disk',
    'arch',
    'resolutionX',
    'resolutionY',
  ].forEach((requirement) => {
    if (ymlContent[requirement]) {
      finalConfigWithRequirements[requirement] = ymlContent[requirement];
    }
  });

  if (ymlContent.cpu) {
    finalConfigWithRequirements.cpu = finalConfigWithRequirements.cpu || {};

    ['manufacturer', 'brand'].forEach((cpuParam) => {
      if (ymlContent.cpu[cpuParam]) {
        finalConfigWithRequirements.cpu[cpuParam] =
          finalConfigWithRequirements.cpu[cpuParam] || {};

        ['include', 'exclude'].forEach((incExcl) => {
          finalConfigWithRequirements.cpu[cpuParam][incExcl] = merge(
            ymlContent.cpu[cpuParam][incExcl],
            finalConfigWithRequirements.cpu[cpuParam][incExcl]
          );
        });
      }
    });
  }

  if (ymlContent.baseboard) {
    finalConfigWithRequirements.baseboard =
      finalConfigWithRequirements.baseboard || {};

    ['manufacturer', 'model'].forEach((baseboardParam) => {
      if (ymlContent.baseboard[baseboardParam]) {
        finalConfigWithRequirements.baseboard[baseboardParam] =
          finalConfigWithRequirements.baseboard[baseboardParam] || {};

        ['include', 'exclude'].forEach((incExcl) => {
          finalConfigWithRequirements.baseboard[baseboardParam][incExcl] =
            merge(
              ymlContent.baseboard[baseboardParam][incExcl],
              finalConfigWithRequirements.baseboard[baseboardParam][incExcl]
            );
        });
      }
    });
  }
  return finalConfigWithRequirements;
};

const getFromRemoteZip = async (ymlPath) => {
  const githubRepoName = ymlPath.split('/').slice(1, 3).join('/');
  const githubYmlPath = ymlPath.split('/').slice(3).join('/');

  const tmpDir = os.tmpdir();
  const zipData = await axios.get(
    `https://codeload.github.com/${githubRepoName}/zip/refs/heads/master`,
    {
      responseType: 'arraybuffer',
    }
  );
  const zip = new AdmZip(zipData.data);
  try {
    await fs.access(`${tmpDir}/${githubRepoName}`);
  } catch (error) {
    fs.mkdir(`${tmpDir}/${githubRepoName}`, { recursive: true });
  }
  zip.extractAllTo(`${tmpDir}/${githubRepoName}`, true);
  return read(`${tmpDir}/${githubRepoName}/repo-master/${githubYmlPath}`, {
    path: `${tmpDir}/${githubRepoName}/repo-master/`,
  });
};

const addConfig = (ymlContent, resultConfig, type) => {
  if (ymlContent[type]) {
    resultConfig[type] = resultConfig[type] || {};
    if (ymlContent[type].config) {
      resultConfig[type].config = resultConfig[type].config || [];
      resultConfig[type].config = [
        ...resultConfig[type].config,
        ...ymlContent[type].config,
      ];
    }

    resultConfig[type].config = formatConfig(resultConfig[type].config);
    if (ymlContent[type].configReplace) {
      Object.entries(ymlContent[type].configReplace).forEach(([key, value]) => {
        resultConfig[type].config[key] = value;
      });
    }

    if (ymlContent[type].open) {
      resultConfig[type].open = ymlContent[type].open;
    }

    if (ymlContent[type].qemu) {
      resultConfig[type].qemu = ymlContent[type].qemu;
    }

    if (ymlContent[type].message) {
      resultConfig[type].message = ymlContent[type].message;
    }

    if (ymlContent[type].drives) {
      const newDrives = formatConfig(ymlContent[type].drives);
      newDrives.forEach((drive) => {
        resultConfig[type].drives = resultConfig[type].drives || {};
        if (!resultConfig[type].drives[drive.name]) {
          resultConfig[type].drives[drive.name] = {};
          if (drive.layers) {
            resultConfig[type].drives[drive.name].layers = [];
          }
        }
        if (drive.type) {
          resultConfig[type].drives[drive.name].type = drive.type;
          console.log('drive::::::::', drive.type, drive.name, resultConfig[type].drives[drive.name])
        }
        if (drive.layers) {
          if (drive.strategy === 'replace') {
            resultConfig[type].drives[drive.name].layers = [...drive.layers];
          } else {
            resultConfig[type].drives[drive.name].layers = [
              ...resultConfig[type].drives[drive.name].layers,
              ...drive.layers,
            ];
          }
        } else if (drive.path) {
          resultConfig[type].drives[drive.name].path = drive.path;
        }
      });
    }

    if (ymlContent[type].snapshot) {
      resultConfig[type].snapshot = ymlContent[type].snapshot;
    }

  }
  return resultConfig[type];
};
const addTypes = (ymlContent, resultConfig) => {
  const resultConfigWithDisplayTypes = resultConfig || {};
  ['local', 'remote'].forEach((type) => {
    resultConfigWithDisplayTypes[type] = addVirtOrEmulation(
      ymlContent[type],
      resultConfigWithDisplayTypes[type]??{}
    );
  });
  return resultConfigWithDisplayTypes;
};

const addVirtOrEmulation = (ymlContent, resultConfig) => {
  console.log(ymlContent, resultConfig)
  const resultConfigWithDisplayTypes = resultConfig || {};
  ['virtualization', 'emulation'].forEach((type) => {
    if(ymlContent && type in ymlContent) {
      resultConfigWithDisplayTypes[type] = addConfig(
        ymlContent,
        resultConfigWithDisplayTypes ?? {},
        type
      )
    }
  });
  return resultConfigWithDisplayTypes;
};

const processYml = async (ymlPath, workingDir, prevFinalConfig = {}) => {
  let ymlContent;
  let finalConfig = {};
  console.log(ymlPath, workingDir);
  if (ymlPath.slice(0, 1) === '/') {
    ymlContent = read(workingDir + ymlPath, { path: workingDir });
    if (ymlContent.from) {
      finalConfig = await processYml(
        ymlContent.from,
        workingDir,
        prevFinalConfig
      );
    }
  } else if (ymlPath.split('/')[0] === 'github') {
    ymlContent = await getFromRemoteZip(ymlPath);
    if (ymlContent.from) {
      finalConfig = processYml(ymlContent.from, prevFinalConfig);
    }
  }

  // ['name', 'description', 'version', 'picture', 'releaseDescription'].forEach(
  //   (param) => {
  //     finalConfig[param] = ymlContent[param];
  //   }
  // );
  finalConfig.name = ymlContent.name;
  if (ymlContent.arch) finalConfig.arch = ymlContent.arch;
  if (ymlContent.description) finalConfig.description = ymlContent.description;
  if (ymlContent.version) finalConfig.version = ymlContent.version;
  if (ymlContent.picture) finalConfig.picture = ymlContent.picture;
  if (ymlContent.releaseDescription)
    finalConfig.releaseDescription = ymlContent.releaseDescription;

  if (ymlContent.requirements) {
    finalConfig.requirements = addRequirements(
      ymlContent.requirements,
      finalConfig.requirements
    );
  }

  if (ymlContent.macos) {
    finalConfig.macos = addTypes(ymlContent.macos, finalConfig.macos);
  }
  if (ymlContent.linux) {
    finalConfig.linux = addTypes(ymlContent.linux, finalConfig.linux);
  }
  if (ymlContent.windows) {
    finalConfig.windows = addTypes(ymlContent.windows, finalConfig.windows);
  }

  return finalConfig;
};

export default async (ymlPath, workingDir) => {
  return Promise.resolve(await processYml(ymlPath, workingDir));
};
