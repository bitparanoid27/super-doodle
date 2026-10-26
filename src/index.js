#!/usr/bin/env node
// Shebang line above makes code runnable without typing node infront. Add bin obj to pkj.json
// link it via npm link now to execute this file just run dev.

// Internal modules imported here
import { runGenerate } from "./generate.js";

const HELP_TEXT = `
npm <command>
Usage:

workbench                                     display all available commands
npm run workbench                             display all available commands
npm run help | npm run <command> -- --help    display all available commands
npm run generate                              generate NDJSON data for project 
npm run split-check                           I don't know at this moment.
npm run naive                                 run the readFile function based setup
npm run stream                                run the stream based setup
npm run pressure                              run a slow write to simulate a destination can't keep up with the source. 
npm run compare                               compare readFile vs stream based approach.


Available commands:

    $ npm run generate -- --rows 1000 --payload-bytes 32 
    - Creates repeatable NDJSON for small test runs.

    $ npm run naive -
    Measures the whole-file implementation first.

    $ npm run stream -- --where "status >= 500" 
    - Runs the streaming path with a real filter.

    $ npm run pressure -- --slow-write-ms 5 
    - Makes drain timing and buffer growth visible.

    $ npm run compare 
    - Checks output parity and report differences. 
    
Available flags: 
    
    --rows                  Allows to generate <rows> amounts of NDJSON data. 
    For e.g. --rows 1000 generates 1000 rows of NDJSON data. 
    By default if no number is provided 100 rows of NDJSON data is generated. 

    --seed                  inital value for generating random values

    --help                  Display all available commands. 
    
    --slow-write-ms         Simulates a slow writing destination file. 
    
    --payload-bytes         Generate payload of specified bytes.
    For e.g. --payload-bytes 32 every NDJSON row will have 32 bytes of data. 
    Specify a higher amount to simulate a heavy file instead of adding 1000s row. 
    For e.g. --payload-bytes 3200 every row will be of 3200 bytes i.e. more heavy file with 1000 rows only. 

    Default paths:
        data      data/access.ndjson    generated test data (input)
        output    output/               processed results
        reports   reports/              measurements (the evidence)

                `;

const supportedCommands = [
    "workbench",
    "help",
    "naive",
    "split-check",
    "stream",
    "compare",
    "report",
    "generate",
    "pressure",
];

const supportedFlags = [
    "help",
    "rows",
    "payload-bytes",
    "where",
    "slow-write-ms",
    "seed",
    "error-ratio",
    "output-path",
];

const overView = async () => {
    let receivedCommand = process.argv[2];
    let receivedFlag = process.argv[3];

    // Testing
    const rest = process.argv.slice(3);

    let receivedCommandLowerCase = receivedCommand.toLowerCase();
    let strippedRecievedFlag = receivedFlag?.toLowerCase().slice(2);

    if (!supportedCommands.includes(receivedCommandLowerCase)) {
        process.exitCode = 1;
        return console.error(
            "Unknown command received. \n Try npm run workbench to sell all available commands."
        );
    }

    if (
        strippedRecievedFlag !== undefined &&
        !supportedFlags.includes(strippedRecievedFlag)
    ) {
        process.exitCode = 1;
        return console.error(
            "Unknown flag received.\n Try npm run workbench to see all commands and flags."
        );
    }

    if (
        receivedCommandLowerCase === "workbench" ||
        receivedCommandLowerCase === "help" ||
        strippedRecievedFlag === "help"
    ) {
        console.log(HELP_TEXT);
        process.exitCode = 0;
        return;
    }

    console.log(`${receivedCommandLowerCase}: is not built and wired`);
    try {
        if (receivedCommandLowerCase === "generate") {
            await runGenerate(rest);
        }
    } catch (error) {
        console.error(`${error.message}`);
        process.exitCode = 1;
    }
};
await overView();
