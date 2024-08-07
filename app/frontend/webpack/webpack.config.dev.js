const Path = require('path');
const Webpack = require('webpack');
const { merge } = require('webpack-merge');
const StylelintPlugin = require('stylelint-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const autoprefixer = require('autoprefixer');

const common = require('./webpack.common.js');

module.exports = merge(common, {
  target: 'web',
  mode: 'development',
  devtool: 'inline-source-map',
  stats: { children: true },
  output: {
    filename: 'js/[name].js',
    chunkFilename: 'js/[name].[contenthash:5].js',
    publicPath: 'http://localhost:9091/',
  },

  devServer: {
    port: 9091,
    static: Path.resolve(__dirname, '../static'),
    devMiddleware: {
      writeToDisk: true,
    },
    headers: { 'Access-Control-Allow-Origin': '*' },
    watchFiles: ['templates/**/*', '(static||src)/styles/*.*css'],
  },
  plugins: [
    new Webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
      chunkFilename: 'css/[id].css',
    }),
    new ESLintPlugin({
      emitWarning: true,
      files: Path.resolve(__dirname, '../src'),
      configType: 'flat',
      eslintPath: 'eslint/use-at-your-own-risk',
    }),
    new StylelintPlugin(),
    new Webpack.optimize.ModuleConcatenationPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.html$/i,
        loader: 'html-loader',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.s?css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [[autoprefixer, 'postcss-preset-env']],
              },
            },
          },
          'sass-loader',
        ],
      },
    ],
  },
});
