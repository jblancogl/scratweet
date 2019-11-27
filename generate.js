const fg = require('fast-glob')
const path = require('path')
const utils = require('./utils.js')
const fs = require('fs').promises

async function main () {
  const dataFolder = path.join(process.cwd(), 'data')
  const isDataFolderCreated = await utils.fsExists(dataFolder)

  if (!isDataFolderCreated) {
    throw new Error('Data folder is not yet created')
  }

  const files = await fg(`${dataFolder}/**.json`)
  const nodes = []
  const edges = []

  for (const file of files) {
    const json = await fs.readFile(file)
    const data = await JSON.parse(json)

    nodes.push(data.username)
  }

  for (const file of files) {
    const json = await fs.readFile(file)
    const data = await JSON.parse(json)

    for (let record of data.following) {
      if (nodes.includes(record)) {
        edges.push({ from: record, to: data.username })
      }
    }
  }

  console.log(JSON.stringify({
    nodes: nodes,
    edges: edges
  }))
}

main(process)
  .then(() => {
    process.exit()
  })
  .catch((e) => {
    console.log(e)
    process.exit(-1)
  })
