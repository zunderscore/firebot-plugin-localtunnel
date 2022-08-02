# localtunnel Plugin for Firebot

## Setup

1. Copy the `localtunnel.js` file into your Firebot profile's `scripts` folder (e.g. `%appdata%\Firebot\v5\profiles\Main Profile\scripts`)
2. Go to Settings > Scripts in Firebot
3. Click on "Manage Startup Scripts"
4. Click "Add New Script"
5. Select the `localtunnel.js` file from the dropdown list
6. Click "Save"

## Usage

When Firebot loads, the localtunnel plugin will automatically load and create a tunnel. You can either view the Firebot log or go to `http://localhost:7472/integrations/localtunnel/status` to view the status of the tunnel and get the tunnel's root URL.

## API

The following additonal API endpoints are available:

- `GET /integrations/localtunnel/tunnel`
  - Redirects to the status URL above, but using the tunnel root URL instead of `localhost` (e.g. `https://tunnel-url-example.localtunnel.me/integrations/localtunnel/status`)
- `POST /integrations/localtunnel/tunnel`
  - Opens a tunnel if one is not already open
- `DELETE /integrations/localtunnel/tunnel`
  - Closes an open tunnel