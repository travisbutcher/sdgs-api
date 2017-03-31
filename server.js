require('dotenv').config();

// clean shutdown on `cntrl + c`
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

const express = require('express');
const app = express();
const router = express.Router();

// Initialize Koop
const Koop = require('koop');
const koop = new Koop();

const sdgValidRoutes = require('./middleware/sdgValidRoutes.js');
const githubGetter = require('./middleware/githubGetter.js');
const parseRoutePath = require('./middleware/parseRoutePath.js')

// TODO: ask Daniel for help implementing this
// const cache = require('koop-cache-memory');
// koop.register(cache);

// Register the SDG Provider with Koop
const provider = require('./')
koop.register(provider)

// Start listening for HTTP traffic
// Set port for configuration or fall back to default
const port = process.env.PORT || 3000;

// validate route for Goals when specifying an :id
app.use('/sdgs/:type/:id', sdgValidRoutes);

// parse the route path & params and append to `req` object
app.use('/sdgs/:type/:id?', parseRoutePath);

// pre-load data from Github and append to `req` object
app.use('/sdgs/:type/:id?/:first_level?/:first_level_id?/:second_level?/:second_level_id?/:third_level?/:third_level_id?', githubGetter);

app.use(koop.server);

app.listen(port, (err) => {

  const message = `

  SDG API listening on ${port}
  For more docs visit: https://koopjs.github.io/docs/specs/provider/

  Try it out in your browser: http://localhost:${port}/sdgs/goals/1
  Or on the command line: curl --silent http://localhost:${port}/sample/FeatureServer/0/query?returnCountOnly=true

  Press control + c to exit
  `
  console.log(message)
});
