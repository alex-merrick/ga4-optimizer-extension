/**
 * Generates favicon.ico, apple-touch-icon.png, and webmanifest icons
 * from the source logo (src/icons/ga4-optimizer-logo.png).
 *
 * Run: node scripts/generate-favicons.js
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SOURCE = path.join(__dirname, "..", "src", "icons", "ga4-optimizer-logo.png");
const OUT_DIR = path.join(__dirname, "..", "src");

async function generatePng(size, outputPath) {
    await sharp(SOURCE)
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputPath);
    console.log(`  Created: ${path.relative(process.cwd(), outputPath)} (${size}x${size})`);
}

/**
 * Build a multi-size .ico file.
 * ICO format: header (6 bytes) + directory entries (16 bytes each) + PNG image data.
 */
async function generateIco(sizes, outputPath) {
    const images = [];
    for (const size of sizes) {
        const buf = await sharp(SOURCE)
            .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
        images.push({ size, data: buf });
    }

    // ICO file structure
    const headerSize = 6;
    const dirEntrySize = 16;
    const dirSize = dirEntrySize * images.length;
    let dataOffset = headerSize + dirSize;

    // Header: reserved(2) + type(2, 1=ico) + count(2)
    const header = Buffer.alloc(headerSize);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type = ICO
    header.writeUInt16LE(images.length, 4); // image count

    const dirEntries = [];
    for (const img of images) {
        const entry = Buffer.alloc(dirEntrySize);
        entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width (0 = 256)
        entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height
        entry.writeUInt8(0, 2);  // color palette
        entry.writeUInt8(0, 3);  // reserved
        entry.writeUInt16LE(1, 4);  // color planes
        entry.writeUInt16LE(32, 6); // bits per pixel
        entry.writeUInt32LE(img.data.length, 8); // image data size
        entry.writeUInt32LE(dataOffset, 12);     // offset to image data
        dirEntries.push(entry);
        dataOffset += img.data.length;
    }

    const ico = Buffer.concat([header, ...dirEntries, ...images.map(i => i.data)]);
    fs.writeFileSync(outputPath, ico);
    console.log(`  Created: ${path.relative(process.cwd(), outputPath)} (sizes: ${sizes.join(", ")})`);
}

async function main() {
    console.log("Generating favicons from:", SOURCE);
    console.log("");

    // favicon.ico at site root (16, 32, 48 px - what Google and browsers look for)
    await generateIco([16, 32, 48], path.join(OUT_DIR, "favicon.ico"));

    // apple-touch-icon.png (180x180 - required by iOS/Safari)
    await generatePng(180, path.join(OUT_DIR, "apple-touch-icon.png"));

    // Webmanifest icons (192 and 512 are the standard PWA sizes)
    await generatePng(192, path.join(OUT_DIR, "icons", "icon-192.png"));
    await generatePng(512, path.join(OUT_DIR, "icons", "icon-512.png"));

    console.log("\nDone. Commit the generated files to your repo.");
}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
