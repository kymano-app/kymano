import getArch from "./getArch";

export const getExecutionType = (arch: string) => {
  if (arch !== getArch()) {
    return "emulation";
  }
  return "virtualization";
};
