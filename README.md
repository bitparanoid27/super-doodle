## The Project

The entire project is a Science experiment answering one question?

> When does streaming beats reading the whole file at once, and can I prove it with numbers?

It's my solution to the Stream Processing Workbench lab from thenodebook.com. I'm doing it to learn Node by building something, so some of the code is slower or plainer than it could be on purpose.

## Project Phases

| Phase                                    | status  |
| ---------------------------------------- | ------- |
| 0. Create project scaffolding            | Done    |
| 1. Generate large NDJSON data            | Done    |
| 2. Build the naive baseline              | Done    |
| 3. Add measurement utilities             | Done    |
| 4. Build source adapters                 | WIP     |
| 5. Build a line splitter transform       | Planned |
| 6. Build a filter DSL                    | Planned |
| 7. Add transform plugins                 | Planned |
| 8. Add a slow sink simulator             | Planned |
| 9. Add backpressure visualization        | Planned |
| 10. Make pipeline lifecycle explicit     | Planned |
| 11. Add abort and partial output cleanup | Planned |
| 12. Add compression                      | Planned |
| 13. Compare modes                        | Planned |

## Finished phases

### Phase 00 : Create the project

**Artifact**: A runnable project shell with predictable commands, paths, help behavior and failure behavior i.e. the skeleton of the CLI tool.

### Phase 01: NDJSON Generator

**Artifact:** a repeatable NDJSON workload, plus a generator report that later phases can cite.

Generates hypothetical web-server access logs, one JSON object per line.

```bash
npm run generate
```

With no flags, this is the same as:

```bash
npm run generate -- --rows 100 --payload-bytes 32 --seed 12345 --error-ratio 0.5 --output-path data/access.ndjson
```

#### Flags

| Flag              | Default              | Valid range        | Purpose                                        |
| ----------------- | -------------------- | ------------------ | ---------------------------------------------- |
| `--rows`          | 100                  | positive integer   | number of lines to generate                    |
| `--payload-bytes` | 32                   | 0 to 1,048,576     | size of the filler `payload` field in each row |
| `--seed`          | 12345                | 1 to 2,147,483,646 | seed for the random number generator           |
| `--error-ratio`   | 0.5                  | 0 to 1             | fraction of rows given a 5xx status            |
| `--output-path`   | `data/access.ndjson` | any writable path  | where the file is written                      |

Values outside these ranges throw before any file is touched.

#### How it works

1. A generator function (`function*`) yields one NDJSON line at a time.

#### Report

`reports/generator.json` contains the settings used, the output path, the line count, and the byte count.

#### Verifying a run

- `wc -l data/access.ndjson` equals the reported line count.
- `wc -c data/access.ndjson` equals the reported byte count.
- Running twice with the same flags produces identical files.

### Phase 02: Naive baseline

**Artifact:** a whole-file processor that deliberately keeps everything in memory, used as the control group the streaming version is measured against.

Reads an NDJSON file, keeps the rows that pass a filter, writes them to a new file, and reports what it cost.

```bash
npm run naive
```

With no flags, this is the same as:

```bash
npm run naive -- --input data/access.ndjson --output output/naive.ndjson --where "status >= 500"
```

#### Flags

| Flag       | Default               | Purpose                                                |
| ---------- | --------------------- | ------------------------------------------------------ |
| `--input`  | `data/access.ndjson`  | NDJSON file to read                                    |
| `--output` | `output/naive.ndjson` | where the matching rows are written                    |
| `--where`  | `status >= 500`       | filter: one clause of the form `field operator number` |

`--input` and `--output` are passed straight to the file functions with no checks of their own. A missing input file makes `readFile` throw, and the router reports it.

#### How it works

Reads the whole file into memory, splits it into lines, keeps the rows that pass the filter, and writes them out in one go.

#### `--where` filter

A filter is one condition like `status >= 500`: a field, an operator (`>=`, `>`, `<=`, `<`, `==`), and a number.

### Report

`reports/naive.json` contains:

| Key            | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| `rows`         | non-blank lines read from the input                           |
| `matches`      | rows that passed the filter                                   |
| `elapsed time` | run time in milliseconds                                      |
| `bytes`        | byte size of the kept rows                                    |
| `peak memory`  | highest resident memory (RSS) reached during the run, in KB.` |

`peak memory` is an absolute level for the whole process, including Node's own baseline of roughly 40 MB.

#### Measured results

Payload 1000 bytes, error ratio 0.4, default filter. One run each, not averaged.

| Rows    | Input size | Memory added by the run | Peak memory  |
| ------- | ---------- | ----------------------- | ------------ |
| 10,000  | 11.8 MB    | about 36 MB             |              |
| 100,000 | 118 MB     | about 350 MB            | about 369 MB |

Memory grows in step with the input, at about 3 times the file size. That growth is what the streaming version has to beat.

#### Verifying a run

- `rows` equals `wc -l` of the input.
- `matches` is close to `rows * error-ratio` for the default filter.
- `--error-ratio 0` gives exactly 0 matches.
- The match count for `status >= 500` plus the count for `status < 500` equals `rows`. (Using `>` and `<` leaves out rows with a status of exactly 500.)
- `wc -l output/naive.ndjson` equals `matches`.
- An unsupported operator throws instead of writing an empty file.

### Phase 03: Add measurement utilities

**Artifact:** One report shape shared by naive, stream, pressure, compression, abort, and comparison runs.

Report creation has been standardized, and modularized so reports of different functionalities are easy to compare.
