import semver from "semver";
import { LoggerService } from "@/handlers/logger";
import { AppConstants } from "../server.constants";

export class ServerReleaseService {
  airGapped = null; // Connection error
  /*
   * @type {GithubService}
   */
  githubService;
  #synced = false;
  #installedReleaseFound = null;
  #updateAvailable = null;
  #latestRelease = null;
  #installedRelease = null;
  /**
   * @type {LoggerService}
   */
  #logger = new LoggerService("ServerReleaseService");
  #serverVersion;

  constructor({ serverVersion, githubService }) {
    this.#serverVersion = serverVersion;
    this.githubService = githubService;
  }

  getState() {
    return {
      airGapped: this.airGapped,
      latestRelease: this.#latestRelease,
      installedRelease: this.#installedRelease,
      serverVersion: this.#serverVersion,
      installedReleaseFound: this.#installedReleaseFound,
      updateAvailable: this.#updateAvailable,
      synced: this.#synced,
    };
  }

  /**
   * Connection-safe acquire data about the installed and latest releases.
   * @returns {Promise<*|null>}
   */
  async syncLatestRelease(): Promise<any | null> {
    if (!(await this.githubService.wasAuthenticated())) {
      return;
    }
    const owner = AppConstants.orgName;
    const repo = AppConstants.serverRepoName;
    const response = await this.githubService.getReleases(owner, repo);
    const latestResponse = await this.githubService.getLatestRelease(owner, repo);
    this.#synced = true;
    const releases = response.data;
    const latestRelease = latestResponse.data;

    // Connection timeout results in airGapped state
    this.airGapped = !releases?.length;
    if (!releases?.length) {
      this.#logger.warn("Latest release check failed because releases from github empty");
      return;
    }

    const currentlyInstalledRelease = this.#serverVersion;
    this.#installedRelease = {
      tag_name: currentlyInstalledRelease,
    };
    this.#latestRelease = latestRelease;

    this.#installedReleaseFound = !!currentlyInstalledRelease;
    if (!this.#installedReleaseFound) {
      this.#updateAvailable = false;
      return;
    }

    // If the installed release is unknown/unstable, no update should be triggered
    const lastTagIsNewer = semver.gt(this.#latestRelease.tag_name, this.#installedRelease.tag_name, true);
    this.#updateAvailable = this.#installedReleaseFound && lastTagIsNewer;
  }

  /**
   * Logs whether a firmware update is ready
   */
  logServerVersionState() {
    const latestReleaseState = this.getState();
    const latestRelease = latestReleaseState?.latestRelease;
    const latestReleaseTag = latestRelease?.tag_name;

    if (!latestReleaseTag) {
      // Tests only, silence it
      return;
    }

    const packageVersion = this.#serverVersion;
    if (!this.#installedReleaseFound) {
      this.#logger.log(
        `\x1b[36mCurrent release tag not found in github releases.\x1b[0m
    Here's github's latest released: \x1b[32m${latestReleaseTag}\x1b[0m
    Here's your release tag: \x1b[32m${packageVersion}\x1b[0m
    Thanks for using FDM Monster!`
      );
      return;
    } else {
      this.#logger.log(
        `\x1b[36mCurrent release was found in github releases.\x1b[0m
    Here's github's latest released: \x1b[32m${latestReleaseTag}\x1b[0m
    Here's your release tag: \x1b[32m${packageVersion}\x1b[0m
    Thanks for using FDM Monster!`
      );
    }

    if (!!packageVersion && latestReleaseState.updateAvailable) {
      if (!!this.airGapped) {
        this.#logger.warn(`Installed release: ${packageVersion}. Skipping update check (air-gapped/disconnected from internet)`);
      } else {
        this.#logger.log(`Update available! New version: ${latestReleaseTag} (prerelease: ${latestRelease.prerelease})`);
      }
    } else if (!packageVersion) {
      return this.#logger.error(
        "Cant check release as package.json version environment variable is not set. Make sure FDM Server is run from a 'package.json' or NPM context."
      );
    } else {
      return this.#logger.log(`Installed release: ${packageVersion}. You are up to date!`);
    }
  }
}