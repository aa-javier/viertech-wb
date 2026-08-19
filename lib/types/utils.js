"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.pkg = void 0;

const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_FILE = path.resolve(
  __dirname,
  "../../package.json"
);

let pkg = {
  name: "@viertechjs/wb",
  version: "0.0.0",
  description: "VierTech WhatsApp Bot toolkit for Baileys"
};

try {
  if (fs.existsSync(PACKAGE_FILE)) {
    const data = JSON.parse(
      fs.readFileSync(PACKAGE_FILE, "utf8")
    );

    pkg = {
      ...pkg,
      ...data
    };
  }
} catch (error) {
  // Jangan bikin seluruh package gagal hanya karena metadata gagal dibaca.
}

exports.pkg = pkg;
