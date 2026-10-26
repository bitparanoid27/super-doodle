// External modules imported here.
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { once } from "node:events";
import { Buffer } from "node:buffer";

// Internal modules imported here.
import { lcg } from "./utils/randomNumberGenerator.js";
import { ndjsonGenerator } from "./utils/ndjsonGenerator.js";

//
let currentFilePath = import.meta.url; // give me current file path
let fileURL = fileURLToPath(currentFilePath); //strips out file:/// and returns me fileURL
let __dirname = path.dirname(fileURL); // returns me current directory name

let destinationDirPath = path.join(__dirname, "../", "data");
let reportsDirPath = path.join(__dirname, "../", "reports");

let reportFilePath = path.join(reportsDirPath, "generator.json");
await fs.mkdir(destinationDirPath, { recursive: true });
await fs.mkdir(reportsDirPath, { recursive: true });

// parseArgs sorts flags into values and commands into positionals.
// args inside parseArgs reads list of word which I want it to read.
// without it, process.argv.slice(2) would be read. Generate command would be received. And it would thrown an error

const runGenerate = async (args) => {
    const { values } = parseArgs({
        args,
        options: {
            rows: { type: "string" },
            "payload-bytes": { type: "string" },
            seed: { type: "string" },
            "error-ratio": { type: "string" },
            "output-path": { type: "string" },
        },
    });

    /* Default config setting if not arguments recieved */
    let valuesLen = Object.keys(values).length;
    if (valuesLen === 0) {
        console.log(
            "No flags set. Default generate config set \n --rows 100 --payload-bytes 32 --seed 12345 --error-ratio 0.5 --output-path data/access.ndjson \n"
        );
    }

    const rows = Number(values.rows ?? "100");
    const payloadBytes = Number(values["payload-bytes"] ?? "32");
    const seed = Number(values.seed ?? "12345");
    const errorRatio = Number(values["error-ratio"] ?? "0.25");
    const outputPath = values["output-path"] ?? "data/access.ndjson";

    //
    const finalDestination =
        outputPath === "data/access.ndjson" ? "access.ndjson" : outputPath;
    let destinationFilePath = path.join(destinationDirPath, outputPath);

    if (!Number.isInteger(rows) || rows < 1) {
        throw new Error(
            `--rows must be a whole number of 1 or more (got: "${values.rows}")`
        );
    }

    if (
        !Number.isInteger(payloadBytes) ||
        payloadBytes < 0 ||
        payloadBytes > 1048576
    ) {
        throw new Error(
            `--payload-bytes must be a whole number from 0 to 1048576 (got: "${values["payload-bytes"]}")`
        );
    }

    if (!Number.isInteger(seed) || seed < 1 || seed > 2147483646) {
        throw new Error(
            `--seed must be a whole number from 1 to 2147483646 (got: "${values.seed}")`
        );
    }

    if (Number.isNaN(errorRatio) || errorRatio < 0 || errorRatio > 1) {
        throw new Error(
            `--error-ratio must be a number from 0 to 1 (got: "${values["error-ratio"]}")`
        );
    }

    if (outputPath.trim() === "") {
        throw new Error(
            `--output-path cannot be empty (got: "${values["output-path"]}")`
        );
    }

    const settings = { rows, payloadBytes, seed, errorRatio, outputPath };

    // fileHandle creation

    const stream = createWriteStream(destinationFilePath);
    let lineCount = 0;
    let byteSize = 0;
    for (const rowValue of ndjsonGenerator(settings)) {
        lineCount = lineCount + 1;
        let currentByteCount = Buffer.byteLength(rowValue);
        byteSize = byteSize + currentByteCount;
        const ok = stream.write(rowValue);
        if (!ok) await once(stream, "drain");
        // console.log(`Row id: ${JSON.parse(rowValue)["id"]} and ok: ${ok} `);
    }
    stream.end();
    await once(stream, "finish");
    console.log("RSS MB:", Math.round(process.memoryUsage().rss / 1e6));
    console.log(
        `Lines generated: ${lineCount}, data size: ${byteSize / 1000} KB`
    );

    const reportData = {
        settings: settings,
        "output-path": destinationFilePath,
        "line-count": lineCount,
        "byte-count": byteSize,
    };

    await fs.writeFile(reportFilePath, JSON.stringify(reportData));
    console.log("Report saved");
    return settings;
};

export { runGenerate };
