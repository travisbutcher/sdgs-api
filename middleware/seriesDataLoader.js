let BOUNDARIES;

const request = require('request').defaults({gzip: true, json: true});

module.exports = function (req, res, next) {

  if (!BOUNDARIES) {
    console.log('no boundaries!');
    const boundary_url = 'https://services7.arcgis.com/gp50Ao2knMlOM89z/arcgis/rest/services/SDG_AREA/FeatureServer/0/query?f=geojson&returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometry=%7B%22xmin%22%3A-20037508.342788905%2C%22ymin%22%3A-20037508.342779063%2C%22xmax%22%3A20037508.342779063%2C%22ymax%22%3A20037508.342788905%2C%22spatialReference%22%3A%7B%22wkid%22%3A102100%2C%22latestWkid%22%3A3857%7D%7D&geometryType=esriGeometryEnvelope&inSR=102100&outFields=*&outSR=102100&resultType=tile&quantizationParameters=%7B%22mode%22%3A%22view%22%2C%22originPosition%22%3A%22upperLeft%22%2C%22tolerance%22%3A78271.51696399994%2C%22extent%22%3A%7B%22type%22%3A%22extent%22%2C%22xmin%22%3A-180.00000543699997%2C%22ymin%22%3A-89.90000152599998%2C%22xmax%22%3A180.0000000000001%2C%22ymax%22%3A83.62741851600003%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%2C%22latestWkid%22%3A4326%7D%7D%7D'
    getFromGithub(boundary_url, (err, raw) => {
      if (err) return res.status(err.status_code).send(err);
      BOUNDARIES = raw;
      console.log(raw.features[0])
      getData(req, res, next);
    });
  } else {
    getData(req, res, next);
  }
}

function getData (req, res, next) {

  const series_id = req.params.series_id;
  const refarea = req.params.refarea;

  //const githubBaseUrl = 'https://raw.githubusercontent.com/UNStats-SDGs/sdgs-data/master/series/data';
  const githubBaseUrl = 'https://unstats.un.org/SDGAPI/v1/sdg/Series/Data?seriesCode';
  const githubBaseUrlSuffix = '.json?raw=true';

  const githubRequestUrl = `${githubBaseUrl}=${series_id}`

  getFromGithub(githubRequestUrl, (err, raw) => {

    if (err) return res.status(err.status_code).send(err);

try{

  features = []
  let i = 0
    raw.data.forEach( (data_element) => {
      i++
      feature = {
        id:  i,
        type: "Feature"
      }

      data_element.geometry = null
      data_element.goal =  null
      data_element.indicator = null
      data_element.target = null
      data_element.footnotes = null
      data_element.attributes= null
      data_element.dimensions= null
      for (var x = 0, len = BOUNDARIES.features.length; x < len; x++) {
        if(data_element.geoAreaCode == BOUNDARIES.features[x].properties["M49"]){
          feature.geometry = BOUNDARIES.features[x].geometry
          break;
        }
      }

      feature.properties = data_element
      if(feature.geometry == null){
        feature.geometry = BOUNDARIES.features[0].geometry
      }
      features.push(feature)
    });

    req.rawData = features;
    console.log("end data checks")
    next();
  }catch (e) {
  console.log(e);
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
/*
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

    console.log(raw)
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
}*/
