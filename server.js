require('dotenv').config();

// clean shutdown on `cntrl + c`
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

// Initialize Koop
const Koop = require('koop');
const koop = new Koop();

// const cache = require('koop-cache-memory');
// koop.register(cache);

// Install the Sample Provider
const provider = require('./')
koop.register(provider)

// Start listening for HTTP traffic
// const config = require('config')
// Set port for configuration or fall back to default
const port = process.env.PORT || 3000;

// if (!process.env.API_ROOT) {
//   process.env.API_ROOT = `http://localhost:${port}`;
// }

koop.server.listen(port, (err) => {

  const message = `

  SDG API listening on ${port}
  For more docs visit: https://koopjs.github.io/docs/specs/provider/

  Try it out in your browser: http://localhost:${port}/sdgs/goals/1
  Or on the command line: curl --silent http://localhost:${port}/sample/FeatureServer/0/query?returnCountOnly=true

  Press control + c to exit
  `
  console.log(message)
});
