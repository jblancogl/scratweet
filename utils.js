const fs = require('fs').promises
const fsConstants = require('fs').constants

module.exports.fsExists = async function fsExists (path) {
  let exists = true

  try {
    await fs.access(path, fsConstants.F_OK)
  } catch (e) {
    exists = false
  }

  return exists
}