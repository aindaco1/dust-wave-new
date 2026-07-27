const { version: packageVersion } = require("../../package.json");
const requestedVersion = String(
  process.env.DUST_WAVE_ASSET_VERSION
  || process.env.GITHUB_SHA
  || ""
).trim();
const version = /^[A-Za-z0-9._-]{1,64}$/.test(requestedVersion)
  ? requestedVersion
  : packageVersion;

module.exports = {
  version
};
