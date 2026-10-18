const path = require('path')
const webpack = require('webpack')
const StaticSiteGeneratorPlugin = require('static-site-generator-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const appConfig = require('./appConfig')
const cache = require('./cache')

function recursiveIssuer (m) {
  if (m.issuer) {
    return recursiveIssuer(m.issuer)
  } else {
    for (let chunk of m._chunks) {
      return chunk['name']
    }
    return false
  }
}

const createConfig = ({ name, entry, target, resolveFallback, plugins }) => ({
  name,
  mode: 'production',
  entry: { [name]: entry },
  output: {
    pathinfo: true,
    libraryTarget: 'umd',
    path: path.resolve(__dirname, '../build'),
    publicPath: './',
    globalObject: 'this',
    filename: '[name].js'
  },
  target,
  cache: {
    type: 'filesystem',
    cacheDirectory: cache.webpack,
    version: process.env.NODE_ENV || 'development',
    buildDependencies: {
      config: [__filename, require.resolve('./cache'), require.resolve('./appConfig')]
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          cacheDirectory: cache.babel
        }
      },
      // {
      //   test: /\.(svg|png|jpg|webm|mp4|woff|woff2|ttf|eot)$/,
      //   loader: 'url-loader'
      // },
      // fonts/fonts/components/player-home/fonts/fonts/open-sans-regular.woff2
      // http://localhost:3000/assets/components/player-home/fonts/fonts/open-sans-regular.woff2
      {
        test: /\.(woff(2)?|ttf|eot)$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name]-[hash].[ext]',
            useRelativePath: true,
            outputPath: 'bundle/',
            publicPath: 'fonts/'
          }
        }]
      },
      {
        test: /\.(svg|png|jpg|webm|mp4)$/,
        loader: 'file-loader',
        options: {
          name: '[name]-[hash].[ext]',
          useRelativePath: true,
          outputPath: 'bundle/',
          publicPath: 'bundle/'
        }
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'style-loader', // creates style nodes from JS strings
            options: {
              injectType: 'singletonStyleTag'
            }
          },
          // {
          //   loader: MiniCssExtractPlugin.loader,
          //   options: {
          //     // you can specify a publicPath here
          //     // by default it use publicPath in webpackOptions.output
          //     // publicPath: '../'
          //   }
          // },
          {
            loader: 'css-loader', // translates CSS into CommonJS
            options: {
              importLoaders: 1,
              modules: {
                namedExport: false,
                exportLocalsConvention: 'as-is',
                localIdentName: (process.env.NODE_ENV === 'production' ? '[sha1:hash:hex:4]' : '[name]__[local]')
              }
            }
          },
          {
            loader: 'sass-loader' // compiles Sass to CSS
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    fallback: resolveFallback
  },
  // optimization: {
  //   splitChunks: {
  //     cacheGroups: {
  //       clientStyles: {
  //         name: 'clientStyle',
  //         test: (m, c, entry = 'client') => m.constructor.name === 'CssModule' && recursiveIssuer(m) === entry,
  //         chunks: 'all',
  //         enforce: true
  //       },
  //       htmlGeneratorStyles: {
  //         name: 'htmlGeneratorStyle',
  //         test: (m, c, entry = 'htmlGenerator') => m.constructor.name === 'CssModule' && recursiveIssuer(m) === entry,
  //         chunks: 'all',
  //         enforce: true
  //       }
  //     }
  //   }
  // },
  plugins
})

// The client runs in the sandboxed renderer (no Node.js), the HTML generator runs in Node.js during the build.
const config = [
  createConfig({
    name: 'client',
    entry: path.resolve(__dirname, '../client/app.tsx'),
    target: 'web',
    resolveFallback: { path: require.resolve('path-browserify') },
    plugins: []
  }),
  createConfig({
    name: 'htmlGenerator',
    entry: path.resolve(__dirname, '../client/htmlGenerator.tsx'),
    target: 'node',
    plugins: [
      new StaticSiteGeneratorPlugin({
        entry: 'htmlGenerator',
        paths: appConfig.paths,
        locals: appConfig.locals
      })
    ]
  })
]

module.exports = config
