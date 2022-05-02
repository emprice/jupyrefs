import * as path from 'path';

const config = {
  mongoPort: 27017,
  mongoHost: 'mongodb://localhost',
  mongoDatabase: 'sample_airbnb',
  listenPort: 5000,
  staticsPath: path.normalize('../sandbox')
};

export default config;

// vim: set ft=javascript:
