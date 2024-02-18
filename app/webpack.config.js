const path = require('path');
const autoprefixer = require('autoprefixer');

module.exports = {
  mode: 'development',
  entry: {
    base: './assets/js/base.js',
    'main-pipeline': './assets/js/main-pipeline/pipeline.js',
    invoices: './assets/js/costs-and-invoices/invoices_list.js',
    'invoice-uploader': './assets/js/invoice-uploader/invoice-uploader.js',
    costsheet: './assets/js/costsheet/costsheet.js',
  },

  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, './static'),
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.svg$/i,
        loader: 'svg-inline-loader',
      },
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
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
  watch: true,
};
