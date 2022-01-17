import { diff } from "deep-diff";
import deepmerge from "deepmerge";
import defaultLoggerConfig from "./default.logger.config";

/**
 * @template T
 * @typedef {T extends object ? {[P in keyof T]?: DeepPartial<T[P]>} : T} DeepPartial
 */

/** @typedef {DeepPartial<defaultLoggerConfig>} PartialLoggerConfig */

/**
 * @typedef {{
 * log: (...args: any[]) => void
 * warn: (...args: any[]) => void
 * error: (...args: any[]) => void
 * logWithTitle: (title: string, ...args: any[]) =>void
 * logDiff: (lhs: any, rhs: any) => void
 * }} LoggerSpaceMethods
 */

/** @typedef {Logger & {[K in keyof defaultLoggerConfig['spaces']]: LoggerSpaceMethods}} LoggerInstance */

class Logger {
  /** @param {PartialLoggerConfig} partialLoggerConfig */
  constructor(partialLoggerConfig) {
    /** @private */
    this._isEnabled = __DEV__;
    /** @type {typeof defaultLoggerConfig} */
    // @ts-ignore
    const loggerConfig = deepmerge(defaultLoggerConfig, partialLoggerConfig);
    /** @private */
    this._spaces = loggerConfig.spaces;
    for (const spaceName in loggerConfig.spaces) {
      /** @type {LoggerSpaceMethods} */
      this[spaceName] = {
        log: (...args) => this.log(spaceName, ...args),
        warn: (...args) => this.warn(spaceName, ...args),
        error: (...args) => this.error(spaceName, ...args),
        logWithTitle: (title, ...args) =>
          this.logWithTitle(spaceName, title, ...args),
        logDiff: (lhs, rhs) => this.logDiff(spaceName, lhs, rhs),
      };
    }
    /** @private */
    this._prevNavState = [];
  }

  static DEFAULT_CONFIG = defaultLoggerConfig;

  /** @private */
  _getTime() {
    const date = new Date();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();
    const hoursFormatted = hours < 10 ? `0${hours}` : hours;
    const minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;
    const secondsFormatted = seconds < 10 ? `0${seconds}` : seconds;
    const millisecondsFormatted =
      milliseconds < 10
        ? `00${milliseconds}`
        : milliseconds < 100
        ? `0${milliseconds}`
        : milliseconds;

    return `${hoursFormatted}:${minutesFormatted}:${secondsFormatted}.${millisecondsFormatted}`;
  }

  /** @private */
  _logDiff(lhs, rhs) {
    const kinds = {
      E: { color: "#2196f3", text: "changed:" },
      N: { color: "#4caf50", text: "added:" },
      D: { color: "#f44336", text: "deleted:" },
    };

    const getStyle = (kind) => `color: ${kinds[kind].color}; font-weight: bold`;

    const getText = (kind) => `%c${kinds[kind].text}`;

    const getFormattedPath = (path = []) =>
      path.reduce((accum, item) => {
        const result = typeof item === "string" ? `['${item}']` : `[${item}]`;

        return `${accum}${result}`;
      }, "");

    const getResult = (item) => {
      const result = [];

      switch (item.kind) {
        case "N":
          result.push(item.rhs);
          break;
        case "D":
          result.push(item.lhs);
          break;
        case "E":
          result.push(item.lhs, "->", item.rhs);
          break;
        case "A":
          return getResult({
            ...item.item,
            path: [...(item.path || []), item.index],
          });
      }

      return [
        getText(item.kind),
        getStyle(item.kind),
        `${getFormattedPath(item.path)}   `,
        ...result,
      ];
    };

    diff(lhs, rhs)?.forEach((item) => console.log(...getResult(item)));
  }

  /** @private */
  _logFormatted(method, space, title, messages) {
    const label = `%c${space.toUpperCase()} | ${this._getTime()}${
      title ? `  ${title}` : ""
    }`;
    const style = `${this._spaces[space].style} padding: 3px;`;

    if (!messages) {
      return method(label, style);
    }

    if (this._spaces[space].isCollapsed) {
      console.groupCollapsed(label, style);
    } else {
      console.group(label, style);
    }
    method(...messages);
    console.groupEnd();
  }

  /** @private */
  log(space, ...messages) {
    if (this._isEnabled && this._spaces[space].isEnabled) {
      const isFalsy = !messages[0];
      const isNumber = typeof messages[0] === "number";
      const isOneLineString =
        typeof messages[0] === "string" && messages[0].indexOf("\n") === -1;

      if (messages.length === 1 && (isFalsy || isOneLineString || isNumber)) {
        return this._logFormatted(console.log, space, messages[0], null);
      }

      this._logFormatted(console.log, space, null, messages);
    }
  }

  /** @private */
  logWithTitle(space, title, ...messages) {
    if (this._isEnabled && this._spaces[space].isEnabled) {
      this._logFormatted(console.log, space, title, messages);
    }
  }

  /** @private */
  warn(space, ...messages) {
    if (this._isEnabled && this._spaces[space].isEnabled) {
      console.warn(...messages);
    }
  }

  /** @private */
  error(space, ...messages) {
    if (this._isEnabled && this._spaces[space].isEnabled) {
      console.error(...messages);
    }
  }

  /** @private */
  logDiff(space, lhs, rhs) {
    if (this._isEnabled && this._spaces[space].isEnabled) {
      const groupLabel = `%c${space.toUpperCase()} | ${this._getTime()}`;
      const groupStyle = `${this._spaces[space].style} padding: 3px;`;

      if (this._spaces[space].isCollapsed) {
        console.groupCollapsed(groupLabel, groupStyle);
      } else {
        console.group(groupLabel, groupStyle);
      }

      this._logDiff(lhs, rhs);
      console.groupEnd();
    }
  }

  logNavState(currentNavState) {
    this.logDiff("navigation", this._prevNavState, currentNavState);
    this._prevNavState = currentNavState;
  }

  /**
   * @private
   * @param {string} query
   */
  _getLogRequestData = (query) => {
    const lines = query.split("\n");

    // Remove empty strings.
    if (/^ *$/.test(lines[0])) {
      lines.shift();
    }
    if (/^ *$/.test(lines[lines.length - 1])) {
      lines.pop();
    }

    // Remove left padding.
    const leftPadding = lines[0].length - lines[0].trimLeft().length;
    for (let i = 0; i < lines.length; i++) {
      lines[i] = lines[i].slice(leftPadding);
    }

    const method = lines[0].match(/\w+/)?.[0] || "";
    const requestName = lines[1].match(/\w+/)?.[0] || "";

    return {
      logTitle: `${method} - ${requestName}`,
      formattedRequest: lines.join("\n"),
    };
  };

  logRequest = (body) => {
    if (!__DEV__) {
      return;
    }

    const { logTitle, formattedRequest } = this._getLogRequestData(body.query);
    this.logWithTitle("network_request", logTitle, formattedRequest);
  };

  logResponse = (body, data) => {
    if (!__DEV__) {
      return;
    }

    const { logTitle } = this._getLogRequestData(body.query);
    this.logWithTitle("network_response", logTitle, data.data);
  };
}

export default Logger;
