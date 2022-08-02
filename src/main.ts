import { Request, Response } from "express";
import { Firebot } from "firebot-custom-scripts-types";
const localtunnel = require("localtunnel");

interface Params {
  rootUrl: string;
}

let tunnel: any;
let tunnelRootUrl: string;

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
        default: "",
        description: "Root URL",
        secondaryDescription: "Enter the root URL for the localtunnel instance you wish to use, or leave blank to use the default of https://localtunnel.me",
      },
    };
  },
  run: async ({ parameters, modules, firebot }) => {
    const { logger, httpServer } = modules;
    const port = firebot.settings.getWebServerPort();
    const rootUrl = parameters.rootUrl || "https://localtunnel.me";

    logger.info(`[localtunnel] Connecting to ${rootUrl} to create tunnel to http://locahost:${port}...`);

    tunnel = await localtunnel({ host: rootUrl, port: port });
    tunnelRootUrl = tunnel.url.replace("http:", "https:");

    logger.info(`[localtunnel] Tunnel URL ${tunnelRootUrl} connected to http://locahost:${port}`);

    httpServer.unregisterCustomRoute("localtunnel", "status", "GET");
    httpServer.unregisterCustomRoute("localtunnel", "tunnel", "GET");
    httpServer.unregisterCustomRoute("localtunnel", "tunnel", "POST");
    httpServer.unregisterCustomRoute("localtunnel", "tunnel", "DELETE");

    httpServer.registerCustomRoute("localtunnel", "status", "GET", async function (req: Request, res: Response) {
      res.send({
        status: "localtunnel Plugin is running",
        tunnelConnected: !tunnel.closed,
        tunnelRootUrl: tunnel.closed !== true ? tunnelRootUrl : null
      });
    });

    httpServer.registerCustomRoute("localtunnel", "tunnel", "GET", async function (req: Request, res: Response) {
      res.redirect(`${tunnelRootUrl}/integrations/localtunnel/status`);
    });

    httpServer.registerCustomRoute("localtunnel", "tunnel", "POST", async function (req: Request, res: Response) {
      try {
        await new Promise((resolve, reject) => tunnel.open((err: string) => (err ? reject(err) : resolve(tunnel))));
        tunnelRootUrl = tunnel.url.replace("http:", "https:");
      } catch (error) {
        res.statusCode = 500;
        res.send({
          result: "Failed to open tunnel",
          error: error
        });
      }

      res.send({
        result: "Tunnel opened",
        tunnelConnected: !tunnel.closed,
        tunnelRootUrl: tunnel.closed !== true ? tunnelRootUrl : null
      });
    });

    httpServer.registerCustomRoute("localtunnel", "tunnel", "DELETE", async function (req: Request, res: Response) {
      try {
        tunnel.close();
      } catch (error) {
        res.statusCode = 500;
        res.send({
          result: "Failed to close tunnel",
          error: error
        });
      }

      res.send({
        result: "Tunnel closed",
        tunnelConnected: !tunnel.closed,
        tunnelRootUrl: tunnel.closed !== true ? tunnelRootUrl : null
      });
    });
  }
};

export default script;
