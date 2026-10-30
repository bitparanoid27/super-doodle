// External modules imported here
import { parseArgs } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

// Internal modules imported here.
import { Counter } from "./utils/measurement.js";

const fileURL = fileURLToPath(import.meta.url);
let __dirname = path.dirname(fileURL);
const dataDirName = path.join(__dirname, "../", "data");
const outputDirName = path.join(__dirname, "../", "output");
const reportDirName = path.join(__dirname, "../", "reports");

let reportFileName = path.join(reportDirName, "naive.json");

await fs.mkdir(dataDirName, { recursive: true });
await fs.mkdir(outputDirName, { recursive: true });
await fs.mkdir(reportDirName, { recursive: true });

async function runNaive(args) {
    const { values } = parseArgs({
        args,
        options: {
            input: { type: "string" },
            output: { type: "string" },
            where: { type: "string" },
        },
    });

    let valuesLen = Object.keys(values).length;
    if (valuesLen === 0) {
        console.log(
            `Default config set: \n --input "data/access.ndjson", --output "output/naive.ndjson", --where "status >= 500"`
        );
    }

    const rcdInput = values.input ?? "access.ndjson";
    const rcdOutput = values.output ?? "naive.ndjson";
    const rcdCondition = values.where ?? "status >= 500";

    // use selected file switch
    let accessFileName = path.join(dataDirName, rcdInput);
    let outputFileName = path.join(outputDirName, rcdOutput);

    // Counter
    const run = new Counter("naive");
    run.start();
    run.reading("started");
    let measurementReport;

    try {
        // updating fileSize
        const { size } = await fs.stat(accessFileName);
        run.inputBytes = size;

        const returnedData = await fs.readFile(accessFileName, {
            encoding: "utf8",
        });
        // reading after readfile
        run.reading("post read file");

        const dataArray = returnedData.split("\n");
        run.reading("post split file");

        const matchedLines = [];
        let parts = rcdCondition.split(" ");
        if (parts.length !== 3)
            throw new Error("Invalid --where flag: ", rcdCondition);
        const [field, operator, rawValue] = parts;
        const value = Number(rawValue);

        for (const element of dataArray) {
            if (element.trim() === "") continue;
            // counts
            run.countRow();

            let checkedElement = JSON.parse(element);

            let selectedCondition;
            if (operator === ">=") {
                selectedCondition = Number(checkedElement[field]) >= value;
            } else if (operator === ">") {
                selectedCondition = Number(checkedElement[field]) > value;
            } else if (operator === "<=") {
                selectedCondition = Number(checkedElement[field]) <= value;
            } else if (operator === "<") {
                selectedCondition = Number(checkedElement[field]) < value;
            } else if (operator === "==") {
                selectedCondition = Number(checkedElement[field]) == value;
            } else {
                console.log(`Unsupported operation: ${rcdCondition}`);
                return;
            }

            if (selectedCondition) {
                let currByteCnt = Buffer.byteLength(
                    JSON.stringify(checkedElement)
                );

                run.countMatch();
                matchedLines.push(checkedElement);
            }
        }

        run.reading("post file loop");

        let finalString = "";
        for (const element of matchedLines) {
            let strData = JSON.stringify(element) + "\n";
            finalString = finalString + strData;
        }

        run.outputBytes = Buffer.byteLength(finalString);

        await fs.writeFile(outputFileName, finalString);
        // reading

        run.reading("finished");
        run.status = "ok";
    } catch (error) {
        run.status = "error";
        throw error;
    } finally {
        run.stop();
        measurementReport = {
            mode: run.mode,
            status: run.status,
            input: { path: accessFileName, bytes: run.inputBytes },
            output: { path: outputFileName, bytes: run.outputBytes },
            counts: { rows: run.counts, matches: run.matches },
            timing: {
                startedAt: run.startedAt,
                endedAt: run.endedAt,
                elapsedTimeMS: run.elapsedTimeMS,
            },
            memory: {
                peakRssKb: run.peakMemory,
                readings: run.memoryReadings,
            },
        };

        await fs.writeFile(reportFileName, JSON.stringify(measurementReport));
    }
}

export { runNaive };
