const SettingsModel = require("../models/ServerSettings.js");
const Constants = require("../constants/server-settings.constants");
const { validateInput } = require("../handlers/validators");
const { serverSettingsUpdateRules, frontendSettingsUpdateRules } = require("./validators/settings-service.validation");
const {
  printerFileCleanSettingKey,
  getDefaultPrinterFileCleanSettings,
  getDefaultWhitelistIpAddresses,
  serverSettingKey, frontendSettingKey,
} = require("../constants/server-settings.constants");

class SettingsService {
  async getOrCreate() {
    let settings = await SettingsModel.findOne();
    if (!settings) {
      const defaultSettings = new SettingsModel(Constants.getDefaultSettings());
      await defaultSettings.save();

      // Return to upper layer
      return defaultSettings;
    } else {
      // Perform patch of settings
      settings = this.#migrateSettingsRuntime(settings);

      return SettingsModel.findOneAndUpdate({ _id: settings.id }, settings, { new: true });
    }
  }

  /**
   * Patch the given settings object manually - runtime migration strategy
   * @param knownSettings
   * @returns {*}
   */
  #migrateSettingsRuntime(knownSettings) {
    const doc = knownSettings; // alias _doc also works
    if (!doc[printerFileCleanSettingKey]) {
      doc[printerFileCleanSettingKey] = getDefaultPrinterFileCleanSettings();
    }

    // Server settings exist, but need updating with new ones if they don't exist.
    if (!doc.timeout) {
      doc.timeout = Constants.getDefaultTimeout();
    }
    if (!doc.server) {
      doc.server = Constants.getDefaultServerSettings();
    }
    if (!doc.server.whitelistedIpAddresses?.length) {
      doc.server.whitelistedIpAddresses = getDefaultWhitelistIpAddresses();
    }
    if (!doc.frontend) {
      doc.frontend = Constants.getDefaultFrontendSettings();
    }

    return knownSettings;
  }

  async setRegistrationEnabled(enabled = true) {
    const settingsDoc = await this.getOrCreate();
    settingsDoc.server.registration = enabled;

    return SettingsModel.findOneAndUpdate({ _id: settingsDoc._id }, settingsDoc, {
      new: true,
    });
  }

  async setLoginRequired(enabled = true) {
    const settingsDoc = await this.getOrCreate();
    settingsDoc[serverSettingKey].loginRequired = enabled;

    return SettingsModel.findOneAndUpdate({ _id: settingsDoc._id }, settingsDoc, {
      new: true,
    });
  }

  async setWhitelist(enabled, ipAddresses) {
    const settingsDoc = await this.getOrCreate();
    const settings = settingsDoc[serverSettingKey];
    settings.whitelistEnabled = enabled;
    settings.whitelistedIpAddresses = ipAddresses;

    return SettingsModel.findOneAndUpdate({ _id: settingsDoc._id }, settingsDoc, {
      new: true,
    });
  }

  async updateFrontendSettings(patchUpdate) {
    const validatedInput = await validateInput({
      [frontendSettingKey]: patchUpdate
    }, frontendSettingsUpdateRules);
    const settingsDoc = await this.getOrCreate();

    return SettingsModel.findOneAndUpdate({ _id: settingsDoc._id }, validatedInput, {
      new: true,
    });
  }

  async update(patchUpdate) {
    const validatedInput = await validateInput(patchUpdate, serverSettingsUpdateRules);
    const settingsDoc = await this.getOrCreate();

    return SettingsModel.findOneAndUpdate({ _id: settingsDoc._id }, validatedInput, {
      new: true,
    });
  }
}

module.exports = SettingsService;