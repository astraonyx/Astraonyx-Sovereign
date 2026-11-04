// scrape/module.js — Compatibility Bridge for Legacy Scrapers
const fs = require('fs');
const util = require('util');
const axios = require('axios');
const cheerio = require('cheerio');
const yts = require('yt-search');
const FormData = require('form-data');

const nativeFetch = globalThis.fetch;

module.exports = {
  modul: {
    axios,
    fs,
    fetch: nativeFetch,
    cheerio,
    util,
    yts,
    FormData,
    FileType: {
      fromBuffer: async () => ({ ext: 'bin', mime: 'application/octet-stream' }),
    },
    chalk: {
      red: (s) => s,
      green: (s) => s,
      blue: (s) => s,
      yellow: (s) => s,
      cyan: (s) => s,
      white: (s) => s,
      bold: (s) => s,
    },
    got: axios,
    proces: process,
    ytdl: null,
  },
};
