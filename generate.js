const fg = require('fast-glob')
const path = require('path')
const utils = require('./utils.js')
const fs = require('fs').promises
const Graph = require("@dagrejs/graphlib").Graph
const dot = require('graphlib-dot')

async function main() {
  const dataFolder = path.join(process.cwd(), 'data', '_data')
  const isDataFolderCreated = await utils.fsExists(dataFolder)

  if (!isDataFolderCreated) {
    throw new Error('Data folder is not yet created')
  }

  const g = new Graph()
  const files = await fg(`${dataFolder}/**.json`)

  for (const file of files) {
    const json = await fs.readFile(file)
    const data = await JSON.parse(json)

    g.setNode(data.username)
  }

  for (const file of files) {
    const json = await fs.readFile(file)
    const data = await JSON.parse(json)

    for (let record of data.following) {
      if (g.hasNode(record)) {
        g.setEdge(record, data.username)
      }
    }
  }

  console.log(dot.write(g))
}

main(process)
  .then(() => {
    process.exit()
  })
  .catch((e) => {
    console.log(e)
    process.exit(-1)
  })
