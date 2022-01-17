# log-manager

## Usage

Create custom loggerConfig in the project root for example. Add it to `.gitignore`. Modify it when needed.

```js
/** @type {import('log-manager').PartialLoggerConfig} */
const loggerConfig = {};

export default loggerConfig;
```

Create your logger instance somewhere and dynamically import your custom loggerConfig.

```js
import Logger from "log-manager";

let loggerConfig = {};

try {
  loggerConfig = require("path-to-your-logger-config").default;
} catch (error) {}

/** @type {import('log-manager').LoggerInstance} */
// @ts-ignore
const logger = new Logger(loggerConfig);

export default logger;
```

Import your logger instance anywhere and log everything.

```js
import logger from "path-to-your-logger";

logger.analytics.log("hello");
```
