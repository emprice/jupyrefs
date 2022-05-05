const prefix = 'jprefs';

export function makeClass(...parts: string[]): string {
  const allParts = [prefix, ...parts];
  return allParts.join('-');
}

// vim: set ft=typescript:
