const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware')
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware')
const ignoredFiles = require('react-dev-utils/ignoredFiles')
const { resolve } = require('path')
const { spawn } = require('child_process')
const config = require('./webpack.config.dev')

const protocol = process.env.HTTPS === 'true' ? 'https' : 'http'
const host = process.env.HOST || '0.0.0.0'

module.exports = function (proxy, allowedHost, port) {
  console.log('proxy', proxy)
  return {
    compress: true,
    clientLogLevel: 'warning',
    watchContentBase: true,
    hot: true,
    quiet: false,
    progress: false,
    index: '/index.html',
    historyApiFallback: {
      disableDotRule: true,
      index: '/index.html',
      rewrites: [
        { from: /.+/, to: '/404.html' }
      ],
      htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
    },
    stats: {
      colors: true,
      chunks: false,
      children: false,
      hash: false,
      version: false,
      timings: false,
      assets: true,
      modules: false,
      reasons: false,
      source: false,
      errors: true,
      errorDetails: true,
      warnings: true,
      publicPath: false
    },
    public: allowedHost,
    proxy,
    before (app) {
      app.use(errorOverlayMiddleware())
      app.use(noopServiceWorkerMiddleware())
    },
    after(app) {
      const electronApp = spawn(
        'electron',
        [
          resolve(__dirname, '../index.js'),
          `--webpackPort=${port}`
        ],
        {
          shell: true,
          env: process.env,
          stdio: 'inherit',
          cwd: resolve(__dirname, '../')
        }
      )
      electronApp.on('close', code => process.exit(code))
      electronApp.on('error', spawnError => console.error(spawnError))
      process.on('close', code => electronApp.exit(code))
    }
  }
}
