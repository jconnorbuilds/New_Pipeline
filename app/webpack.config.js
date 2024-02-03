const path = require('path');
const autoprefixer = require('autoprefixer');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    'main-pipeline': './assets/js/main-pipeline/pipeline.js',
    invoices: './assets/js/invoices/invoices_list.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, './static'),
  },
  devtool: 'inline-source-map',
  plugins: [
    new HtmlWebpackPlugin({
      filename: '../templates/pipeline/pipeline.html',
      template: './assets/html/pipeline.html',
      chunks: ['main-pipeline'],
    }),
    new HtmlWebpackPlugin({
      filename: '../templates/pipeline/invoices_list.html',
      template: './assets/html/invoices_list.html',
      chunks: ['invoices'],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(scss|css)$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [autoprefixer],
              },
            },
          },
          {
            loader: 'sass-loader',
          },
        ],
      },
    ],
  },
};
