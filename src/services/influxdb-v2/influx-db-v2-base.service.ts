import { InfluxDB } from "@influxdata/influxdb-client";
import { AppConstants } from "../../server.constants";

export class InfluxDbV2BaseService {
  configService;
  logger;

  constructor({ configService, loggerFactory }) {
    this.configService = configService;
    this.logger = loggerFactory(InfluxDbV2BaseService.name);
  }

  isConfigValid() {
    const { bucket, org, url, token } = this.#getConfig();
    return bucket && org && url && token;
  }

  #getConfig() {
    return {
      url: this.configService.get(AppConstants.influxUrl),
      token: this.configService.get(AppConstants.influxToken),
      org: this.configService.get(AppConstants.influxOrg),
      bucket: this.configService.get(AppConstants.influxBucket),
    };
  }

  #getClient() {
    const { url, token } = this.#getConfig();
    return new InfluxDB({ url, token });
  }

  #getQueryApi() {
    const { org } = this.#getConfig();
    return this.#getClient().getQueryApi(org);
  }
}