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
    hot: false,
    port: 9091,
    devMiddleware: {
      writeToDisk: true,
    },
  },
  plugins: [
    new Webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name]-[contenthash:3].css',
    }),
    // new ESLintPlugin({
    //   extensions: 'js',
    //   emitWarning: true,
    //   files: Path.resolve(__dirname, '../src'),
    // }),
    new StylelintPlugin({
      files: Path.join('src', '**/*.s?(a|c)ss'),
      fix: true,
    }),
    new Webpack.optimize.ModuleConcatenationPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.html$/i,
        loader: 'html-loader',
      },
      {
        test: /\.js$/,
        include: Path.resolve(__dirname, '../src'),
        loader: 'babel-loader',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.s?css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          // 'style-loader',
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
                plugins: [autoprefixer],
              },
            },
          },
          'sass-loader',
        ],
      },
    ],
  },
});
