const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

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
      assert: require.resolve('assert/'),
      fs: false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/pdfjs-dist/web/images/*.svg',
          to({ context, absoluteFilename }) {
            return 'pdfjs/[name][ext]';
          }
        }
      ]
    })
  ]
};

// vim: set ft=javascript:
