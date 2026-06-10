import firebot, { Plugin } from "@crowbartools/firebot-types";
const localtunnel = require("localtunnel");

import {
    PLUGIN_NAME,
    DEFAULT_LOCALTUNNEL_ROOT_URL,
    PLUGIN_ID,
} from "./constants";

const packageInfo = require("../package.json");

let firebotPort: number;
let rootUrl: string = DEFAULT_LOCALTUNNEL_ROOT_URL;
let tunnel: any;
let tunnelRootUrl: string;

async function updateTunnel(): Promise<void> {
    firebot.logger.info(`Connecting to ${rootUrl} to create tunnel to http://locahost:${firebotPort}...`);

    tunnel = await localtunnel({
        host: rootUrl,
        port: firebotPort ?? 7472
    });
    tunnelRootUrl = tunnel.url.replace("http:", "https:");

    firebot.logger.info(`Tunnel URL ${tunnelRootUrl} connected to http://locahost:${firebotPort}`);
}

async function updateParams(rootUrl: string) {
    rootUrl = rootUrl?.length
        ? rootUrl
        : DEFAULT_LOCALTUNNEL_ROOT_URL;
    await updateTunnel();
}

const plugin: Plugin<{
    rootUrl: string;
}> = {
    manifest: {
        name: PLUGIN_NAME,
        description: packageInfo.description,
        author: packageInfo.author,
        version: packageInfo.version,
        repo: "https://github.com/zunderscore/firebot-plugin-localtunnel",
        icon: {
            type: "font-awesome",
            name: "fa-globe",
            color: "#1D4ED8"
        }
    },
    parametersSchema: [
        {
            name: "rootUrl",
            type: "string",
            title: "Root URL",
            description: `Enter the root URL for the localtunnel instance you wish to use, or leave blank to use the default of ${DEFAULT_LOCALTUNNEL_ROOT_URL}`,
            default: "",
        }
    ],
    registers: {
        httpRoutes: {
            prefix: PLUGIN_ID,
            routes: [
                {
                    path: "/status",
                    method: "GET",
                    handler: (_, res) => {
                        res.send({
                            status: "localtunnel Plugin is running",
                            tunnelConnected: !tunnel.closed,
                            tunnelRootUrl: tunnel.closed !== true ? tunnelRootUrl : null
                        });
                    }
                },
                {
                    path: "/tunnel",
                    method: "GET",
                    handler: (_, res) => {
                        res.redirect(`${tunnelRootUrl}/plugins/${PLUGIN_ID}/status`);
                    }
                },
                {
                    path: "/tunnel",
                    method: "POST",
                    handler: async (_, res) => {
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
                    }
                },
                {
                    path: "/tunnel",
                    method: "DELETE",
                    handler: (_, res) => {
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
                    }
                }
            ]
        }
    },
    onLoad: async ({ parameters }) => {
        firebotPort = firebot.settings.getSetting("WebServerPort");
        await updateParams(parameters.rootUrl);
    },
    onParameterUpdate: async ({ parameters }) => {
        await updateParams(parameters.rootUrl);
    }
}

export default plugin;