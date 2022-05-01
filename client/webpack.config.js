module.exports = {
  infrastructureLogging: {
    level: 'verbose',
    debug: true
  },
  module: {
    rules: [
      {
        test: /\.svg/,
        type: 'asset/source'
      },
      {
        test: /\.worker\.js/,
        type: 'asset/resource'
      }
    ]
  }
};

// vim: set ft=javascript:
