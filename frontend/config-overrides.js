const webpack = require('webpack');
const path = require('path');

module.exports = function override(config) {
  config.resolve = {
    ...config.resolve,
    fallback: {
      ...config.resolve.fallback,
      stream: require.resolve('stream-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      zlib: require.resolve('browserify-zlib'),
      buffer: require.resolve('buffer'),
      process: require.resolve('process/browser.js'),
    },
    extensions: [...(config.resolve.extensions || []), '.mjs'],
  };

  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser.js',
    }),
  ];

  // Enable support for .mjs files in node_modules
  config.module.rules.push({
    test: /\.m?js$/,
    include: /node_modules/,
    type: 'javascript/auto',
  });

  return config;
};
