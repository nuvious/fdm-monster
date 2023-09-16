import fs from "fs";
import dotenv from "dotenv";
import { LoggerService } from "@/handlers/logger";
import { isDocker } from "./is-docker";
import { AppConstants } from "@/server.constants";
import { join } from "path";

const logger = new LoggerService("Utils-Env", false);

export function getEnvOrDefault(key: any, defaultVal: any) {
  const val = process.env[key];
  if (!val?.length) return defaultVal;
  return val;
}

export function isTestEnvironment() {
  return process.env.NODE_ENV === AppConstants.defaultTestEnv;
}

export function isProductionEnvironment() {
  return process.env.NODE_ENV === AppConstants.defaultProductionEnv;
}

export function isPm2() {
  return "PM2_HOME" in process.env || "PM2_JSON_PROCESSING" in process.env || "PM2_CLI" in process.env;
}

export function isNodemon() {
  return "npm_lifecycle_script" in process.env && process.env.npm_lifecycle_script!.includes("nodemon");
}

export function isNode() {
  return "NODE" in process.env;
}

/**
 * Turn an object into an envfile string
 * Copied from https://github.com/bevry/envfile
 */
function stringifyDotEnv(obj: any) {
  let result = "";
  for (const [key, value] of Object.entries(obj)) {
    if (key) {
      const line = `${key}=${String(value)}`;
      result += line + "\n";
    }
  }
  return result;
}

/**
 * Write a new key-value to .env file
 * Note: assumes in Nodemon, pm2 or PKG mode.
 */
export function writeVariableToEnvFile(absoluteEnvPath: any, variableKey: any, jsonObject: any) {
  if (isDocker()) {
    logger.error("Tried to persist setting to .env in docker mode. Avoided that.");
    return;
  }
  const latestDotEnvConfig = dotenv.config();
  if (latestDotEnvConfig?.error?.code === "ENOENT") {
    logger.warn("Creating .env file for you as it was not found.");
  } else if (!!latestDotEnvConfig.error) {
    logger.error(JSON.stringify(latestDotEnvConfig.error));
    throw new Error(
      "Could not parse current .env file. Please ensure the file contains lines with each looking like 'MONGO=http://mongo/3pdf' and 'SERVER_PORT=4000' and so on."
    );
  }

  const newDotEnv = {
    ...latestDotEnvConfig.parsed,
    [variableKey]: jsonObject,
  };

  const dotEnvResult = stringifyDotEnv(newDotEnv);
  fs.writeFileSync(absoluteEnvPath, dotEnvResult);
}

export function verifyPackageJsonRequirements(rootPath: string) {
  const dirConts = fs.readdirSync(rootPath);
  const hasPackageJson = dirConts.includes("package.json");
  if (!hasPackageJson) {
    logger.error(`FAILURE. Could not find 'package.json' in root folder ${rootPath}`);
    return false;
  }

  logger.debug("✓ found 'package.json'");
  const packageName = require(join(rootPath, "package.json")).name;
  if (!packageName) {
    logger.error("X Could not find 'name' property in package.json file. Aborting FDM Server.");
    return false;
  }

  if (packageName.toLowerCase() !== "fdm-monster") {
    logger.error(
      `X property 'name' in package.json file didnt equal 'fdm-monster' (found: ${packageName.toLowerCase()}). Aborting FDM Server.`
    );
    return false;
  }

  logger.debug("✓ Correctly validated FDM package.json file!");
  return true;
}
