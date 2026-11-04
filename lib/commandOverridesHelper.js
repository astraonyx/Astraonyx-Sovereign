// lib/commandOverridesHelper.js — Helper untuk membaca override command & fitur custom
const fs = require('fs');
const path = require('path');
const config = require('../config');

const OVERRIDES_FILE = path.resolve(__dirname, '..', config.paths.commandOverrides || './database/command_overrides.json');
const CUSTOM_FILE = path.resolve(__dirname, '..', config.paths.customFeatures || './database/custom_features.json');

function getCommandOverrides() {
  try {
    if (!fs.existsSync(OVERRIDES_FILE)) return {};
    const content = fs.readFileSync(OVERRIDES_FILE, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (_) {
    return {};
  }
}

function getCustomFeatures() {
  try {
    if (!fs.existsSync(CUSTOM_FILE)) return {};
    const content = fs.readFileSync(CUSTOM_FILE, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (_) {
    return {};
  }
}

function renderTemplate(template, data = {}) {
  let result = template;
  for (const [key, val] of Object.entries(data)) {
    result = result.split(key).join(String(val || ''));
  }
  return result;
}

module.exports = {
  getCommandOverrides,
  getCustomFeatures,
  renderTemplate,
};
