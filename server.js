require('dotenv').config();
//var fs = require('fs');

// clean shutdown on `cntrl + c`
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

const express = require('express');
const app = express();
const router = express.Router();
const path = require('path');

// Initialize Koop
const Koop = require('koop');
const koop = new Koop();

const sdgValidRoutes = require('./middleware/sdgValidRoutes.js');
const parseRoutePath = require('./middleware/parseRoutePath.js');
const githubDataSource = require('./middleware/githubDataSource.js');
const seriesDataLoader = require('./middleware/seriesDataLoader.js');

//var key = fs.readFileSync('encryption/private.key');
//var cert = fs.readFileSync( 'encryption/primary.cer' );
//var ca = fs.readFileSync( 'encryption/intermediate.crt' );

const isNotFeatureServerRoute = function(path, middleware) {
  return function(req, res, next) {
      if (req.path.indexOf('FeatureServer') !== -1) {
      return next();
    } else {
      return middleware(req, res, next);
    }
  };
};

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
app.use(
  isNotFeatureServerRoute(
    '/sdgs/:type/:id?/:first_level?/:first_level_id?/:second_level?/:second_level_id?/:third_level?/:third_level_id?',
    githubDataSource
  )
);

// series data loader
app.use('/sdgs/series/:series_id/FeatureServer', seriesDataLoader);

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
