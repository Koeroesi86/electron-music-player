const { resolve } = require('path')
const { spawn } = require('child_process')

module.exports = function (host, port) {
  return {
    host,
    port,
    compress: true,
    hot: true,
    client: {
      logging: 'warn'
    },
    historyApiFallback: {
      disableDotRule: true,
      index: '/index.html',
      rewrites: [
        { from: /.+/, to: '/404.html' }
      ],
      htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
    },
    onListening () {
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
      process.on('exit', () => electronApp.kill())
    }
  }
}
