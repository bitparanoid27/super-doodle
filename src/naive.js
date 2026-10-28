// External modules imported here
import { parseArgs } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

// Internal modules imported here.
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
        console.log(`Default config selected \n 
            --input "data/access.ndjson", --output "output/naive.ndjson", --where "status >= 500"
            `);
    }

    const rcdInput = values.input ?? "access.ndjson";
    const rcdOutput = values.output ?? "naive.ndjson";
    const rcdCondition = values.where ?? "status >= 500";

    // use selected file switch
    let accessFileName = path.join(dataDirName, rcdInput);
    let outputFileName = path.join(outputDirName, rcdOutput);

    try {
        let initialMemoryUsg = Math.round(process.memoryUsage().rss / 1e6);
        let startTime = Date.now();

        const returnedData = await fs.readFile(accessFileName, {
            encoding: "utf8",
        });
        const dataArray = returnedData.split("\n");
        let rows = 0;
        let count = 0;
        let byteCount = 0;

        const matchedLines = [];
        let parts = rcdCondition.split(" ");
        if (parts.length !== 3)
            throw new Error("Invalid --where flag: ", rcdCondition);
        const [field, operator, rawValue] = parts;
        const value = Number(rawValue);

        for (const element of dataArray) {
            rows = rows + 1;
            if (element.trim() === "") continue;

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
                byteCount = byteCount + currByteCnt;
                count = count + 1;
                matchedLines.push(checkedElement);
            }
        }

        let finalString = "";
        for (const element of matchedLines) {
            let strData = JSON.stringify(element) + "\n";
            finalString = finalString + strData;
        }

        await fs.writeFile(outputFileName, finalString);
        let postMemoryUsg = Math.round(process.memoryUsage().rss / 1e6);

        let endTime = Date.now();
        let timeElapsed = endTime - startTime;

        let peakMemory = process.resourceUsage().maxRSS;

        const outputReportJSON = {
            rows: rows - 1,
            matches: count,
            "elapsed time": timeElapsed,
            bytes: byteCount,
            "peak memory": peakMemory,
        };

        // Save the report
        await fs.writeFile(reportFileName, JSON.stringify(outputReportJSON));
        console.log("Naive report saved at: ", reportFileName);
    } catch (error) {
        throw error;
    }
}

export { runNaive };
