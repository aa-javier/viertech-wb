"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

exports.Version =
exports.Utils =
exports.Exif =
exports.Node =
exports.Spam =
exports.Scraper =
exports.JID =
exports.Instance =
exports.Converter =
exports.Cooldown =
exports.Config =
exports.Proxy =
exports.Database =
exports.Client =
exports.Chiper =
exports.CryptoKey =
exports.VierApi =
exports.StickerPack =
exports.Poll = void 0;

const viertech_api_1 = require("@viertechjs/api");

exports.VierApi =
    viertech_api_1.VierApi ||
    viertech_api_1.default ||
    viertech_api_1;

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;

    var desc = Object.getOwnPropertyDescriptor(m, k);

    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = {
            enumerable: true,
            get: function() {
                return m[k];
            }
        };
    }

    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));

var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", {
        enumerable: true,
        value: v
    });
}) : function(o, v) {
    o["default"] = v;
});

var __importStar = (this && this.__importStar) || (function() {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o) {
            var ar = [];

            for (var k in o) {
                if (Object.prototype.hasOwnProperty.call(o, k)) {
                    ar[ar.length] = k;
                }
            }

            return ar;
        };

        return ownKeys(o);
    };

    return function(mod) {
        if (mod && mod.__esModule) {
            return mod;
        }

        var result = {};

        if (mod != null) {
            for (var k = ownKeys(mod), i = 0; i < k.length; i++) {
                if (k[i] !== "default") {
                    __createBinding(result, mod, k[i]);
                }
            }
        }

        __setModuleDefault(result, mod);
        return result;
    };
})();

var __importDefault = (this && this.__importDefault) || function(mod) {
    return (mod && mod.__esModule)
        ? mod
        : { "default": mod };
};

require("dotenv/config");

const node_fs_1 = __importDefault(require("node:fs"));
const path_1 = __importDefault(require("path"));

const CACHE_DIR = path_1.default.join(process.cwd(), ".cache");

if (!node_fs_1.default.existsSync(CACHE_DIR)) {
    node_fs_1.default.mkdirSync(CACHE_DIR, {
        recursive: true
    });
}

const cryptokey_js_1 = __importDefault(require("./utils/cryptokey.js"));
exports.CryptoKey = cryptokey_js_1.default;

const chiper_js_1 = __importDefault(require("./utils/chiper.js"));
exports.Chiper = chiper_js_1.default;

const connection_js_1 = __importDefault(require("./core/connection.js"));
exports.Client = connection_js_1.default;

const cooldown_js_1 = __importDefault(require("./utils/cooldown.js"));
exports.Cooldown = cooldown_js_1.default;

const converter_js_1 = __importDefault(require("./utils/converter.js"));
exports.Converter = converter_js_1.default;

const Database = __importStar(require("./database/index.js"));
exports.Database = Database;

const Proxy = __importStar(require("./proxy/index.js"));
exports.Proxy = Proxy;

const instance_js_1 = __importDefault(require("./core/instance.js"));
exports.Instance = instance_js_1.default;

const jid_helper_js_1 = __importDefault(require("./utils/jid-helper.js"));
exports.JID = jid_helper_js_1.default;

const sticker_pack_js_1 = require("./utils/sticker-pack.js");
exports.StickerPack = sticker_pack_js_1;

const poll_js_1 = require("./utils/poll.js");
exports.Poll = poll_js_1;

const scraper_js_1 = __importDefault(require("./utils/scraper.js"));

const spam_js_1 = __importDefault(require("./utils/spam.js"));
exports.Spam = spam_js_1.default;

const exif_js_1 = __importDefault(require("./utils/exif.js"));
exports.Exif = exif_js_1.default;

const Functions = __importStar(require("./utils/functions.js"));

const Node = __importStar(require("./core/node.js"));
exports.Node = Node;

const CONFIG_FILE = path_1.default.join(process.cwd(), "config.json");

const Config = node_fs_1.default.existsSync(CONFIG_FILE)
    ? JSON.parse(
        node_fs_1.default.readFileSync(CONFIG_FILE, "utf-8")
    )
    : {};

exports.Config = Config;

const PACKAGE_FILE = path_1.default.join(__dirname, "../package.json");

let Version = "0.0.0";

try {
    if (node_fs_1.default.existsSync(PACKAGE_FILE)) {
        const pkg = JSON.parse(
            node_fs_1.default.readFileSync(PACKAGE_FILE, "utf-8")
        );

        Version = String(pkg?.version || "0.0.0");
    }
} catch {
    Version = "0.0.0";
}

exports.Version = Version;

const Utils = {
    ...Functions
};

exports.Utils = Utils;

const Scraper = {
    ...scraper_js_1.default
};

exports.Scraper = Scraper;
