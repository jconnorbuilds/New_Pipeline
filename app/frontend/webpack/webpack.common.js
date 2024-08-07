const Path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BundleTracker = require('webpack-bundle-tracker');

module.exports = {
  entry: {
    base: Path.resolve(__dirname, '../src/js/base.js'),
    pipeline: {
      import: Path.resolve(__dirname, '../src/js/main-pipeline/pipeline.js'),
    },
    'invoice-uploader': {
      import: Path.resolve(__dirname, '../src/js/invoice-uploader/invoice-uploader.js'),
    },
    'invoices-list': {
      import: Path.resolve(__dirname, '../src/js/invoices-list/invoices-list.js'),
    },
    costsheet: {
      import: Path.resolve(__dirname, '../src/js/costsheet/costsheet.js'),
    },
    'job-details': {
      import: Path.resolve(__dirname, '../src/js/job-details.js'),
    },
  },
  output: {
    path: Path.join(__dirname, '../build'),
    publicPath: '/static/',
  },
  externals: {
    jquery: 'jQuery',
    'datatables.net': 'DataTable',
  },
  optimization: {
    usedExports: true,
    splitChunks: {
      cacheGroups: {
        bootstrap: {
          reuseExistingChunk: true,
          chunks: 'all',
          test: /[\\/]node_modules[\\/]bootstrap[\\/]/i,
          name: 'bootstrap',
          filename: 'js/vendor.[name].js',
        },
        pipelineStyles: {
          reuseExistingChunk: true,
          chunks: (chunk) => {
            return [
              'invoices-list',
              'pipeline',
              'costsheet',
              'job-details',
              'base',
            ].includes(chunk.name);
          },
          type: 'css/mini-extract',
          name: 'styles_pipeline',
        },
        invoiceUploaderStyles: {
          reuseExistingChunk: true,
          chunks: (chunk) => {
            return chunk.name === 'invoice-uploader';
          },
          type: 'css/mini-extract',
          name: 'styles_invoice-uploader',
        },
      },
    },
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: Path.resolve(__dirname, '../static/'),
          to: './',
        },
        {
          from: Path.resolve(__dirname, '../static/'),
        },
      ],
    }),
    new BundleTracker({
      path: Path.join(__dirname, './../'),
      filename: 'webpack-stats.json',
    }),
  ],
  resolve: {
    alias: {
      '~': Path.resolve(__dirname, './'),
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: Path.resolve(__dirname, '../src'),
        exclude: '/node_modules/',
        loader: 'babel-loader',
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /\.(ttf|woff|woff2)(\?.*)?$/,
        type: 'asset/resource',
        generator: { filename: 'fonts/[name].[contenthash][ext]' },
      },
      {
        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg)(\?.*)?$/,
        type: 'asset/resource',
        generator: { filename: 'images/[name].[contenthash][ext]' },
      },
    ],
  },
};
