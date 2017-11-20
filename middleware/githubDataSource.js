require('promise-hash');

const request = require('request').defaults({gzip: true, json: true});

module.exports = function (req, res, next) {
  const githubBaseUrl = 'https://unstats.un.org/SDGAPI/v1/sdg/Goal/Data?goal=1';
  const githubBaseUrlSuffix = '.json?raw=true';

  let lang = 'en';
  if (req.query && req.query.lang) {
    lang = req.query.lang;
  }


  const baseRequest = req.parsedParts.baseRequest;

  const githubRequestUrl = `${githubBaseUrl}/${baseRequest.type}/${lang}/${baseRequest.id}${githubBaseUrlSuffix}`;

  // do initial request
  getFromGithub(githubRequestUrl, (err, raw) => {

    if (err) return res.status(err.status_code).send(err);

    if (raw && raw !== undefined) {

      req.rawDataType = baseRequest.type;

      if (req.parsedParts.baseRequest.filter) {
        req.rawData = filterData(raw, req.parsedParts.baseRequest.filter);
      } else {
        req.rawData = raw;
      }

      // ?includes=
      if (req.parsedParts.includedRequests) {
        let promises = {}, promise, includeUrl;

        req.parsedParts.includedRequests.forEach( (inc) => {
          includeUrl = `${githubBaseUrl}/${inc.type}/${lang}/${inc.id}${githubBaseUrlSuffix}`;

          promise = new Promise( (resolve, reject) => {
            getFromGithub(includeUrl, (err, raw) => {
              if (err) return reject(err);
              let data = raw;
              if (inc.filter) {
                if (!inc.filter.value) {
                  inc.filter.value = req.rawData[inc.filter.field.preFilter];
                  inc.filter.field = inc.filter.field.postFilter;
                }
                data = filterData(raw, inc.filter);
              }
              resolve(data);
            });
          });

          promises[inc.type] = promise;
        });

        Promise.hash(promises)
          .then( (data) => {
            // console.log('included raw data: ', data);
            const includedData = processIncludedData(data);
            console.log('includedData', includedData);
            req.includedData = includedData;
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

function processIncludedData (response) {
  return Object.keys(response).map( (key) => {
    return {
      type: key,
      data: response[key]
    };
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
