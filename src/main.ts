import { Firebot, ScriptModules } from "@crowbartools/firebot-custom-scripts-types";
import { Request, Response } from "express";
const localtunnel = require("localtunnel");

import {
    PLUGIN_NAME,
    DEFAULT_LOCALTUNNEL_ROOT_URL,
} from "./constants";

const packageInfo = require("../package.json");

let logger: ScriptModules["logger"];
let httpServer: ScriptModules["httpServer"];

const logDebug = (msg: string, ...meta: any[]) => logger.debug(`[${PLUGIN_NAME}] ${msg}`, ...meta);
const logInfo = (msg: string, ...meta: any[]) => logger.info(`[${PLUGIN_NAME}] ${msg}`, ...meta);
const logWarn = (msg: string, ...meta: any[]) => logger.warn(`[${PLUGIN_NAME}] ${msg}`, ...meta);
const logError = (msg: string, ...meta: any[]) => logger.error(`[${PLUGIN_NAME}] ${msg}`, ...meta);

let firebotPort: number;
let rootUrl: string;
let tunnel: any;
let tunnelRootUrl: string;

async function updateTunnel(): Promise<void> {
    logInfo(`Connecting to ${rootUrl} to create tunnel to http://locahost:${firebotPort}...`);

    tunnel = await localtunnel({
        host: rootUrl,
        port: firebotPort ?? 7472
    });
    tunnelRootUrl = tunnel.url.replace("http:", "https:");

    logInfo(`Tunnel URL ${tunnelRootUrl} connected to http://locahost:${firebotPort}`);
}

const script: Firebot.CustomScript<{
    rootUrl: string;
}> = {
    getScriptManifest: () => ({
        name: PLUGIN_NAME,
        description: packageInfo.description,
        author: packageInfo.author,
        version: packageInfo.version,
        firebotVersion: "5",
        startupOnly: true,
    }),
    getDefaultParameters: () => ({
        rootUrl: {
            type: "string",
            title: "Root URL",
            description: `Enter the root URL for the localtunnel instance you wish to use, or leave blank to use the default of ${DEFAULT_LOCALTUNNEL_ROOT_URL}`,
            default: "",
        },
    }),
    parametersUpdated: async (params) => {
        rootUrl = params.rootUrl?.length
            ? params.rootUrl
            : DEFAULT_LOCALTUNNEL_ROOT_URL;
        await updateTunnel();
    },
    run: async ({ parameters, modules, firebot }) => {
        ({ logger, httpServer } = modules);

        logInfo(`Starting ${PLUGIN_NAME} plugin...`);

        firebotPort = firebot.settings.getWebServerPort();
        rootUrl = parameters.rootUrl?.length
            ? parameters.rootUrl
            : DEFAULT_LOCALTUNNEL_ROOT_URL;
        await updateTunnel();

        logDebug("Registering HTTP routes...");
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

        logInfo("Plugin ready. Listening for events.");
    },
    stop: () => {
        logDebug(`Stopping ${PLUGIN_NAME} plugin...`);

        logDebug("Unregistering HTTP routes...");
        httpServer.unregisterCustomRoute("localtunnel", "status", "GET");
        httpServer.unregisterCustomRoute("localtunnel", "tunnel", "GET");
        httpServer.unregisterCustomRoute("localtunnel", "tunnel", "POST");
        httpServer.unregisterCustomRoute("localtunnel", "tunnel", "DELETE");
        
        logInfo("Plugin stopped");
    }
};

export default script;