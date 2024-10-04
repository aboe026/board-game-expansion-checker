# board-game-expansion-checker

Tool to check if any new expansions for board games are released.

## Requirements

- [NodeJS](https://nodejs.org)
- [VSCode](https://code.visualstudio.com/)

  - To enable [Editor SDK](https://yarnpkg.com/getting-started/editor-sdks), run

    ```sh
    yarn dlx @yarnpkg/sdks vscode
    ```

    Then in TypeScript file, simultaneously press

    `ctrl` + `shift` + `p`

    and choose option

    `Select TypeScript Version`

    then select value

    `Use Workspace Version`

## Install

To install dependencies, run

```sh
yarn install
```

## Custom Types

Some external modules do not contain typing information, either lacking it baked-in or not having a `@types/<mondule_name>` package. To provide typings for such repositories, add a `typings/<module_name>.d.ts` file with contents similar to:

```ts
declare module '<module_name>' {
  export function get(): string
  export function set(item: string): void
}
```

with appropriate declarations for exports of that module. If you don't know the exports (or don't want to take the time/effort to write them down), the file can simply contain:

```ts
declare module '<module_name>'
```

which will allow you to work with `<module_name>` as an `any` type within your code.

## Run

To execute source code, run

```sh
yarn start
```

The script takes the following environment variables:

| Name                       | Required | Default         | Description                                                                                                                   | Example(s)             |
| -------------------------- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| BGG_USERNAME               | Yes      |                 | The Board Game Geek username to scope owned games to.                                                                         | bond007                |
| EMAIL_TO                   | No       | `SMTP_USERNAME` | The email address to send emails to. Defaults to SMTP_USERNAME if not provided.                                               | james.bond@mi6.com     |
| EXPANSION_IGNORE_FILE_PATH | No       |                 | Path to file containing newline separated list of expansion names to ignore.                                                  | expansionsToIgnore.txt |
| GAME_IGNORE_FILE_PATH      | No       |                 | Path to file containing newline separated list of board game names to ignore.                                                 | gamesToIgnore.txt      |
| LOG_FILE_BACKUPS           | Yes      | 0               | The number of old log files to keep during log rolling (excluding the hot file).                                              | 5                      |
| LOG_FILE_MAX_SIZE_UNITS    | Yes      | M               | The units for the maximum log file size. Used in conjunction with LOG_FILE_MAX_SIZE_VALUE.                                    | G                      |
| LOG_FILE_MAX_SIZE_VALUE    | Yes      | 10              | The maximum size of the log file. Units specified with LOG_FILE_MAX_SIZE_UNITS.                                               | 3                      |
| LOG_FILE_NAME              | No       |                 | The name of a file to output logs to.                                                                                         | output.log             |
| LOG_LEVEL                  | Yes      | INFO            | The minimum granularity level of log messages that should be output. OFF < FATAL < ERROR < WARN < INFO < DEBUG < TRACE < ALL. | DEBUG                  |
| RETRY_WAIT_SECONDS         | Yes      | 5               | The amount of seconds to wait to retry a request if initially rejected for processing.                                        | 10                     |
| RETRY_ATTEMPTS             | Yes      | 5               | The amount of times to retry a request if rejected for processing.                                                            | 10                     |
| SMTP_HOST                  | No       |                 | The hostname of the SMTP server to use for sending emails.                                                                    | smtp.gmail.com         |
| SMTP_PASSWORD              | No       |                 | The password for authentication when sending emails.                                                                          | 007                    |
| SMTP_PORT                  | No       | 465             | The port of the SMTP server to use for sending emails.                                                                        | 587                    |
| SMTP_SECURE                | No       | true            | Set to true if SMTP_PORT is 465.                                                                                              | false                  |
| SMTP_TLS_CIPHERS           | No       |                 | The ciphers to use for TLS communication when sending emails.                                                                 | SSLv3                  |
| SMTP_USERNAME              | No       |                 | The username for authentication when sending emails.                                                                          | james.bond@mi6.com     |

## Build

To compile typescript into javascript, run

```sh
yarn build
```

To execute the compiled javascript, run

```sh
node build/index.js
```

## Lint

To lint code for programmatic and stylistic error detection, run

```sh
yarn lint
```

## ToDo

- Ability to filter on only "new" expansions (that haven't been found since last check)
- Email if new expansions found
- unit tests
- Wiremock func tests
- CI
