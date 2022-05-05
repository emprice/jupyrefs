export const extName = 'jupyrefs';

export function makeClass(...parts: string[]): string {
  const allParts = [extName, ...parts];
  return allParts.join('-');
}

// vim: set ft=typescript:
