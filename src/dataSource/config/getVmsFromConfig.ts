const splitForQuery = (line: string): string[] => {
  const arr = line
    .toLowerCase()
    .split(/\W/)
    .filter((word: string | any[]) => word.length > 0);
  const a1: string[] = [];
  const result = arr.map((elem) => {
    a1.push(elem);
    return `'${a1.join(' ')}*'`;
  });
  if (result.length > 0) {
    result.push(`${result[result.length - 1].slice(0, -2)}'`);
  }
  return result;
};

export const splitForExcludeQuery = (line: string) => {
  return splitForQuery(line).join(',');
};

export const splitForIncludeQuery = (line: string) => {
  return [...[`'*'`], ...splitForQuery(line)].join(',');
};
