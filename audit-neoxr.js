const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const skip = new Set(['node_modules', '.git'])
const hits = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue

    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(file)
      continue
    }

    if (!/\.(js|json|md|yml|yaml|txt)$/i.test(entry.name)) continue

    const text = fs.readFileSync(file, 'utf8')
    text.split(/\r?\n/).forEach((line, index) => {
      if (/neoxr/i.test(line)) {
        hits.push({
          file: path.relative(root, file),
          line: index + 1,
          text: line.trim()
        })
      }
    })
  }
}

walk(root)

for (const hit of hits) {
  console.log(`${hit.file}:${hit.line}: ${hit.text}`)
}

console.log(`\nTotal Neoxr references: ${hits.length}`)
