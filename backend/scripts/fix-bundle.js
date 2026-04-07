#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '../build/main.js');
let code = fs.readFileSync(bundlePath, 'utf8');

// Remove the module.exports wrapper at the start
code = code.replace(/^var __defProp = [^;]+;\nvar __export = [^;]+;\n/m, '');
code = code.replace(/^Object\.defineProperty\(exports[^;]+;\n/gm, '');

// Remove "module.exports = {};" and similar
code = code.replace(/^module\.exports\s*=\s*\{\};\n/gm, '');

// Remove any remaining module/exports boilerplate
code = code.replace(/^__export\([^)]+\);\n/gm, '');

fs.writeFileSync(bundlePath, code, 'utf8');
console.log(`Fixed CommonJS wrapping in ${bundlePath}`);
