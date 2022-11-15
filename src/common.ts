export const extName = 'jupyrefs';

export function makeName(...parts: string[]): string {
  const allParts = [extName, ...parts];
  return allParts.join(':');
}

export function makeClass(...parts: string[]): string {
  const allParts = [extName, ...parts];
  return allParts.join('-');
}

export function makeId(...parts: string[]): string {
  const allParts = [extName, ...parts];
  return allParts.join('-');
}

// vim: set ft=typescript:
