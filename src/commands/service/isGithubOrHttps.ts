export const isGithubOrHttps = (firstPart: string) => {
  return ['github', 'http', 'https'].includes(firstPart);
};