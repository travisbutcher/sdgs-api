let BOUNDARIES;

const request = require('request').defaults({gzip: true, json: true});

module.exports = function (req, res, next) {

  if (!BOUNDARIES) {
    console.log('no boundaries!');
    const boundary_url = 'https://raw.githubusercontent.com/UNStats-SDGs/sdgs-data/master/series/geometry/all.json';

    getFromGithub(boundary_url, (err, raw) => {
      if (err) return res.status(err.status_code).send(err);

      BOUNDARIES = raw;
      getData(req, res, next);
    });
  } else {
    getData(req, res, next);
  }
}

function getData (req, res, next) {

  const series_id = req.params.series_id;
  const refarea = req.params.refarea;

  const githubBaseUrl = 'https://raw.githubusercontent.com/UNStats-SDGs/sdgs-data/master/series/data';
  const githubBaseUrlSuffix = '.json?raw=true';

  const githubRequestUrl = `${githubBaseUrl}/${series_id}${githubBaseUrlSuffix}`

  getFromGithub(githubRequestUrl, (err, raw) => {

    if (err) return res.status(err.status_code).send(err);

    // console.log(raw);
    raw.features.forEach( (feature) => {
      feature.geometry = BOUNDARIES[feature.properties.REF_AREA]
    });

    req.rawData = raw;

    next();

  });
}

function getFromGithub (url, callback) {
  request(url,  (err, res, body) => {
    if (err || (res.statusCode > 400 && res.statusCode < 600)) {
      return callback({
        message: 'error requesting data from GitHub',
        github_request_url: url,
        status_code: res.statusCode
      });
    }
    callback(null, body);
  });
}
