const { mkdirSync, writeFileSync } = require('fs')
const { resolve } = require('path')
const sharp = require('sharp')

const pngSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const icnsTypes = { 16: 'icp4', 32: 'icp5', 64: 'icp6', 128: 'ic07', 256: 'ic08', 512: 'ic09', 1024: 'ic10' }

// ICO directory entries store 256 as 0 and point at PNG-compressed images
function createIco (images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  const firstImageOffset = header.length + images.length * 16
  const entries = images.map(({ size, data }, index) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size % 256, 0)
    entry.writeUInt8(size % 256, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(firstImageOffset + images.slice(0, index).reduce((sum, image) => sum + image.data.length, 0), 12)
    return entry
  })

  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)])
}

// ICNS is a big-endian chunk container, every chunk holds a PNG image
function createIcns (images) {
  const chunks = images.map(({ type, data }) => {
    const chunkHeader = Buffer.alloc(8)
    chunkHeader.write(type, 0, 'ascii')
    chunkHeader.writeUInt32BE(data.length + 8, 4)
    return Buffer.concat([chunkHeader, data])
  })
  const fileHeader = Buffer.alloc(8)
  fileHeader.write('icns', 0, 'ascii')
  fileHeader.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4)

  return Buffer.concat([fileHeader, ...chunks])
}

async function generateIcons (input, output) {
  const resized = new Map(await Promise.all(
    pngSizes.map(async (size) => [size, await sharp(input).resize(size, size).png().toBuffer()])
  ))

  mkdirSync(resolve(output, 'icons/png'), { recursive: true })
  mkdirSync(resolve(output, 'icons/win'), { recursive: true })
  mkdirSync(resolve(output, 'icons/mac'), { recursive: true })

  pngSizes.forEach((size) => writeFileSync(resolve(output, `icons/png/${size}x${size}.png`), resized.get(size)))
  writeFileSync(resolve(output, 'icons/win/icon.ico'), createIco(icoSizes.map((size) => ({ size, data: resized.get(size) }))))
  writeFileSync(
    resolve(output, 'icons/mac/icon.icns'),
    createIcns(Object.entries(icnsTypes).map(([size, type]) => ({ type, data: resized.get(Number(size)) })))
  )
}

module.exports = { createIco, createIcns, generateIcons }
