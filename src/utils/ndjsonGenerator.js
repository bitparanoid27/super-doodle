// External modules imported here

// Internal modules importer here
import { lcg } from "./randomNumberGenerator.js";

/* NDJSON generator function is a generator type of fn. That yeilds one value at a time. */

function* ndjsonGenerator(settings) {
    let rows = settings["rows"];
    let ndjsonObject = {
        id: "",
        timeStamp: "",
        method: "",
        path: "",
        status: "",
        IP: "",
        "user-agent": "",
        payload: "",
    };
    let receivedPayload = Number(settings["payloadBytes"]);
    let receivedSeed = Number(settings["seed"]);
    let seededRandom = lcg(receivedSeed);

    let receivedErrorRatio = Number(settings["errorRatio"]);

    const availableMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
    const availablePaths = [
        "/",
        "/login",
        "/products",
        "/products/42",
        "/api/orders",
        "/cart",
    ];
    const availableUserAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1",
        "curl/8.4.0",
        "Googlebot/2.1",
    ];

    // for generating random payload of specified bytes
    const alphabets = [
        ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
        ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)),
        ...Array.from({ length: 10 }, (_, i) => i.toString()),
    ];
    const payloadGenerator = (num) => {
        let start = 0;
        let generatedPayload = "";
        while (start < num) {
            generatedPayload =
                generatedPayload +
                alphabets[Math.floor(seededRandom() * alphabets.length)];
            start = start + 1;
        }
        return generatedPayload;
    };

    const normalStatuses = [
        "200",
        "201",
        "202",
        "204",
        "301",
        "302",
        "304",
        "400",
        "401",
        "403",
        "404",
        "405",
        "409",
        "422",
        "429",
    ];
    const errorStatuses = ["500", "502", "503", "504"];
    const statusGenerator = () => {
        const spin = seededRandom();
        const choices =
            spin < receivedErrorRatio ? errorStatuses : normalStatuses;

        return choices[Math.floor(seededRandom() * choices.length)];
    };

    const generateRandomIp = () => {
        const testRanges = ["192.0.2", "198.51.100", "203.0.113"];
        const range =
            testRanges[Math.floor(seededRandom() * testRanges.length)];
        const lastOctet = Math.floor(seededRandom() * 254) + 1;

        return `${range}.${lastOctet}`;
    };

    let startTime = Date.parse("2026-01-01T00:00:00Z");
    let stepMS = 1000;

    for (let i = 1; i < rows + 1; i++) {
        ndjsonObject["id"] = i;
        ndjsonObject["timeStamp"] = new Date(
            startTime + i * stepMS
        ).toISOString();
        ndjsonObject["method"] =
            availableMethods[
                Math.floor(seededRandom() * availableMethods.length)
            ];

        ndjsonObject["path"] =
            availablePaths[Math.floor(seededRandom() * availablePaths.length)];
        ndjsonObject["user-agent"] =
            availableUserAgents[
                Math.floor(seededRandom() * availableUserAgents.length)
            ];

        ndjsonObject["status"] = statusGenerator();

        ndjsonObject["IP"] = generateRandomIp();
        ndjsonObject["payload"] = payloadGenerator(receivedPayload);

        let finalData = JSON.stringify(ndjsonObject) + "\n";
        yield finalData;
    }
}

export { ndjsonGenerator };
