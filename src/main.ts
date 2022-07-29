import { Firebot } from "firebot-custom-scripts-types";
const localtunnel = require("localtunnel");

interface Params {
  rootUrl: string;
}

const script: Firebot.CustomScript<Params> = {
  getScriptManifest: () => {
    return {
      name: "localtunnel",
      description: "Creates a localtunnel reverse proxy connection for the internal Firebot web server",
      author: "zunderscore",
      version: "1.0",
      firebotVersion: "5",
    };
  },
  getDefaultParameters: () => {
    return {
      rootUrl: {
        type: "string",
        default: "https://localtunnel.me",
        description: "Root URL",
        secondaryDescription: "Enter the root URL for the localtunnel instance you wish to use (or the default of https://localtunnel.me)",
      },
    };
  },
  run: async ({ parameters, modules, firebot }) => {
    const { logger } = modules;
    logger.info(`Connecting to ${parameters.rootUrl} to create tunnel to http://locahost:${firebot.settings.getWebServerPort()}`);

    const tunnel = await localtunnel({ host: parameters.rootUrl, port: firebot.settings.getWebServerPort() });

    logger.info(`Tunnel URL ${tunnel.url} connected to http://locahost:${firebot.settings.getWebServerPort()}`);
  },
};

export default script;
