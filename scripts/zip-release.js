#!/usr/bin/env node

import { createWriteStream, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
function getVersion() {
  const packageJsonPath = resolve(__dirname, '../package.json');
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  return pkg.version;
}

async function createZip() {
  try {
    const version = getVersion();
    const outputDir = resolve(__dirname, '../releases');
    const outputPath = resolve(outputDir, `marginalia-${version}.zip`);
    const distPath = resolve(__dirname, '../dist');

    // Create releases directory if it doesn't exist
    mkdirSync(outputDir, { recursive: true });

    // Create write stream
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Listen for completion
    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✓ Created: releases/marginalia-${version}.zip`);
      console.log(`  Size: ${sizeInMB} MB (${archive.pointer()} bytes)`);
    });

    // Listen for errors
    archive.on('error', (err) => {
      throw err;
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Warning:', err.message);
      } else {
        throw err;
      }
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add the dist directory contents
    console.log(`Building marginalia-${version}.zip...`);
    archive.directory(distPath, false);

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error('Error creating release package:', error.message);
    process.exit(1);
  }
}

createZip();