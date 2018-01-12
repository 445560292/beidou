'use strict';

const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const autoprefixer = require('autoprefixer');
const debug = require('debug')('beidou-plugin:webpack');
const entryLoader = require('../lib/loader/entry-loader');

module.exports = (app) => {
  const universal = app.config.isomorphic.universal;
  const dev = app.config.env !== 'prod';
  const outputPath = path.join(
    app.config.baseDir,
    app.config.webpack.outputPath
  );

  const devServer = {
    contentBase: false,
    noInfo: true,
    quiet: false,
    clientLogLevel: 'warning',
    lazy: false,
    watchOptions: {
      aggregateTimeout: 300,
      poll: true,
    },
    headers: { 'X-Custom-Header': 'yes' },
    stats: {
      colors: true,
      chunks: false,
    },
    publicPath: '/build',
    hot: true,
  };

  const webpackEntry = entryLoader(app, devServer);

  debug('entry auto load as below:\n%o', webpackEntry);


  const plugins = [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'manifest',
      filename: 'manifest.js',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(
        dev ? 'development' : 'production'
      ),
      __CLIENT__: true,
      __DEV__: dev,
      __SERVER__: false,
    }),
    new ExtractTextPlugin('[name].css'),
    new webpack.NoEmitOnErrorsPlugin(),
  ];

  if (universal) {
    plugins.push(new app.IsomorphicPlugin(universal));
  }

  if (dev) {
    plugins.push(new webpack.NamedModulesPlugin());
    plugins.push(new webpack.HotModuleReplacementPlugin());
  } else {
    plugins.push(
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
        },
      })
    );
  }

  const config = {
    devtool: dev ? 'eval' : false,
    context: app.config.baseDir,
    entry: webpackEntry,
    output: {
      path: outputPath,
      filename: '[name].js?[hash]',
      chunkFilename: '[name].js',
      publicPath: app.config.webpack.publicPath,
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              babelrc: false,
              presets: [require.resolve('babel-preset-beidou-client')],
            },
          },
        },
        {
          test: /\.s(c|a)ss$/,
          exclude: /node_modules/,
          use: ExtractTextPlugin.extract({
            fallback: require.resolve('style-loader'),
            use: [
              {
                loader: require.resolve('css-loader'),
                options: {
                  importLoaders: 1,
                  minimize: !dev,
                  sourceMap: dev,
                },
              },
              {
                loader: require.resolve('postcss-loader'),
                options: {
                  // Necessary for external CSS imports to work
                  ident: 'postcss',
                  plugins: () => [
                    require('postcss-flexbugs-fixes'),
                    autoprefixer({
                      browsers: [
                        '>1%',
                        'last 4 versions',
                        'Firefox ESR',
                        'not ie < 9',
                      ],
                      flexbox: 'no-2009',
                    }),
                  ],
                },
              },
              {
                loader: require.resolve('sass-loader'),
              },
            ],
          }),
        },
        {
          test: /\.(png|jpg|gif)$/,
          use: [
            {
              loader: require.resolve('url-loader'),
              options: {
                limit: 81920,
              },
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.json', '.js', '.jsx'],
    },
    plugins,
    devServer,
  };

  return config;
};
