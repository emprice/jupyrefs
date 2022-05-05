const webpack = require('webpack');

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
  },
  resolve: {
    fallback: {
      zlib: require.resolve('browserify-zlib'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util/'),
      assert: require.resolve('assert/')
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    })
  ]
};

// vim: set ft=javascript:
