interface Config {
  mongoPort: number,
  mongoHost: string,
  mongoDatabase: string,
  listenPort: number,
  staticsPath: string
}

declare const config: Config;
export default config;

// vim: set ft=typescript:
