'use strict';

const chokidar = require('chokidar');
const equal = require('deep-equal');
const debug = require('debug')('beidou:plugin:webpack');
const helper = require('./lib/utils');
const entryLoader = require('./lib/loader/entry-loader');

module.exports = (agent) => {
  const logger = agent.coreLogger;
  helper.injectPlugin(agent);

  // start webpack server util agent ready
  agent.ready(() => {
    const config = agent.config.webpack;

    debug('create webpack server with config: %o', config);
    const webpackConfig = helper.getWebpackConfig(config, agent);

    debug('Webpack config: %O', webpackConfig);

    // const webpackServer = http.createServer(agent.callback());

    const port = webpackConfig.devServer.port;
    helper.startServer(webpackConfig, port, logger);
    // use port 6002 in default


    function watcher() {
      const updatedEntry = entryLoader(agent, webpackConfig.devServer);
      if (!equal(updatedEntry, webpackConfig.entry)) {
        webpackConfig.entry = updatedEntry;
        helper.restartServer(webpackConfig, port, logger);
        console.log('entry updated');
        debugger; // eslint-disable-line
      }
    }

    chokidar.watch(agent.config.client, {
      ignored: /(^|[/\\])\../,
      persistent: true,
    }).on('add', watcher)
      .on('addDir', watcher)
      .on('unlinkDir', watcher)
      .on('unlink', watcher);
    // webpackServer.on('listening', (err) => {
    //   /* istanbul ignore if */
    //   if (err) {
    //     logger.error('[Beidou Agent] webpack server start failed,', err);
    //     return;
    //   }
    //   const port = webpackServer.address().port;
    //   const msg = {
    //     port,
    //   };
    //   logger.info('webpack server start, listen on port: %s', port);

    //   process.send({ action: 'webpack-server-ready', to: 'app', data: msg });
    //   // tell worker process what the server port is
    //   process.on('message', (info) => {
    //     if (info.action === 'ask-for-webpack-server-port') {
    //       process.send({
    //         action: 'webpack-server-ready',
    //         to: 'app',
    //         data: { port: msg.port },
    //       });
    //     }
    //   });
    // });
    // webpackServer.on('error', (err) => {
    //   /* istanbul ignore next */ throw err;
    // });
  });
};
