const request = require('request').defaults({gzip: true, json: true});

module.exports = function (req, res, next) {
  console.log('req.parsedParts', req.parsedParts);

  const githubBaseUrl = 'https://raw.githubusercontent.com/UNStats-SDGs/sdgs-data/master';
  const githubBaseUrlSuffix = '.json?raw=true';

  req.initialRequestUrl = `${githubBaseUrl}/${req.parsedParts.type}/${req.parsedParts.id}${githubBaseUrlSuffix}`;

  // do initial request
  getFromGithub(req.initialRequestUrl, (err, raw) => {

    if (err) return res.status(err.status_code).send(err);

    if (raw && raw !== undefined) {

      req.rawDataType = req.parsedParts.type;

      if (req.parsedParts.filter) {
        req.rawData = filterData(raw, req.parsedParts.filter);
      } else {
        req.rawData = raw;
      }

      // ?includes=
      if (req.includes) {
        let promises = [], promise;

        req.includes.forEach( (inc) => {
          // console.log('inc', inc);
          let id = req.parsedParts.id;
          if (req.parsedParts.parentId || id === 'all') {
            id = req.parsedParts.parentId;
          }

          let filterField;
          if (inc === 'goals') {
            filterField = 'id';
          } else if (req.parsedParts.parentType) {
            const singularField = singluarize(req.parsedParts.parentType);
            filterField = `${singularField}_id`;
          }

          includeUrl = `${githubBaseUrl}/${inc}/all${githubBaseUrlSuffix}`;

          promise = new Promise( (resolve, reject) => {
            getFromGithub(includeUrl, (err, raw) => {
              if (err) return reject(err)
              console.log('filterField', filterField);
              console.log('id', id);
              const filteredIncluded = filterData(raw, {field: filterField, value: id});

              resolve(filteredIncluded);
            });
          });

          promises.push( promise );
        });

        Promise.all(promises)
          .then( (data) => {
            // console.log('included data: ', data);
            req.includedData = data.map( (inc) => {
              let obj = { data: inc };
              // console.log('inc', inc);
              const id = Object.keys(inc)[0];
              if (id.indexOf('_') !== -1) {
                // series
                obj.type = 'series';
              } else if (id.split('.').length === 2) {
                // target
                obj.type = 'targets';
              } else if (id.split('.').length === 3) {
                // indicator
                obj.type = 'indicators';
              } else {
                // otherwise it has to be a goal
                obj.type = 'goals';
              }
              return obj;
            });
            next();
          })
          .catch( (err) => {
            console.log('error including data: ', err);
            res.send(err);
          });
      } else {
        next();
      }
    }

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

function filterData (raw, filter) {
  let filtered = {};
  Object.keys(raw).forEach( (key) => {
    if (raw[key][filter.field] === filter.value) {
      filtered[key] = raw[key];
    }
  });
  return filtered;
}

function singluarize(str) {
  return str.substring(0, str.length - 1);
}
