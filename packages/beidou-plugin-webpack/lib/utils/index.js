'use strict';

const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const colorz = require('colorz');
const { stringify } = require('q-i');
const boxen = require('boxen');
const debug = require('debug')('beidou:plugin:webpack');
const IsomorphicPlugin = require('../plugin/isomorphic');

exports.getWebpackConfig = (options, app) => {
  options = options || {};
  const eggLoader = app.loader;

  let webpackConfig = null;
  // custom config exists
  if (options.config && fs.existsSync(options.config)) {
    webpackConfig = eggLoader.loadFile(options.config);
  }

  if (!webpackConfig) {
    const defaultConfigPath = path.resolve(
      __dirname,
      '../../config/webpack.default.config.js'
    );
    webpackConfig = eggLoader.loadFile(defaultConfigPath);
  }
  if (!webpackConfig.devServer) {
    webpackConfig.devServer = {
      port: options.port || 6002,
      contentBase: false,
    };
  }

  const devServer = webpackConfig.devServer;
  if (!devServer.port) {
    devServer.port = options.port || 6002;
  }

  if (devServer.contentBase !== false) {
    app.logger.warn('if webpack.devServer.contentBase is not false may cause beidou server unreachable');
  }

  return webpackConfig;
};

exports.injectPlugin = (app) => {
  app.IsomorphicPlugin = IsomorphicPlugin;
};


let server = null;
let removeListener = null;
exports.startServer = (config, port, logger) => {
  if (server) {
    throw new Error('Multi webpack dev server instance found');
  }

  const compiler = webpack(config);
  server = new WebpackDevServer(compiler, config.devServer);
  server.listen(port, '0.0.0.0', (err) => {
    if (err) {
      logger.error('[Beidou Agent] webpack server start failed,', err);
      return;
    }
    logger.info('[webpack] webpack server start, listen on port: %s', port);
    exports.printEntry(config.entry);
    process.send({ action: 'webpack-server-ready', to: 'app', data: { port } });
    // tell worker process what the server port is
    const portMessageHandler = (info) => {
      if (info.action === 'ask-for-webpack-server-port') {
        process.send({
          action: 'webpack-server-ready',
          to: 'app',
          data: { port },
        });
      }
    };

    process.on('message', portMessageHandler);
    removeListener = function () {
      process.removeListener('message', portMessageHandler);
    };
  });
  return server;
};

exports.restartServer = function (config, port, logger) {
  logger.info('[webpack-dev-server] auto restart');
  server.close();
  server = null;
  removeListener && removeListener();
  exports.startServer(config, port, logger);
};

exports.printEntry = function (entry) {
  console.log(
    boxen(`${colorz.magenta('Auto Load Webpack Entry:')}\n\n${stringify(entry)}`, {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'yellow',
      float: 'left',
    })
  );
};
