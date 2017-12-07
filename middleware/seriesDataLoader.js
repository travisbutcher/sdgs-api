let BOUNDARIES;

const GeoJSON = require('esri-to-geojson')
const request = require('request').defaults({gzip: true, json: true});

module.exports = function (req, res, next) {
    console.log(req.query)
    var boundary_url = 'https://services7.arcgis.com/gp50Ao2knMlOM89z/arcgis/rest/services/SDG_AREA/FeatureServer/0/query?where=1=1&outFields=*'
    //if(req.query !== {}) {
      if(req.query.geometry) {
        boundary_url += '&f=json'
        if(req.query.quantizationParameters) boundary_url +='&quantizationParameters=' + req.query.quantizationParameters
        boundary_url += '&geometry=' + req.query.geometry
        boundary_url += '&returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometryType=esriGeometryEnvelope&inSR=102100&outFields=*&outSR=102100'
      } else boundary_url += '&f=json&returnGeometry=false'

    console.log(boundary_url)
    getFromGithub(boundary_url, (err, raw) => {
      if (err) return res.status(err.status_code).send(err);
      var fc = raw

      var output
      var output = GeoJSON.fromEsri(fc)
      output.filtersApplied = {}
      output.filtersApplied["all"] = true
      output.metadata = {}
      output.metadata["transform"] = raw.transform
      output["capabilities"] = {}
      output.capabilities["quantization"] = true
      console.log(output.capabilities)
      req.rawData = output
      next();
    });
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
      req.rawData = BOUNDARIES //.features;
  next();
/*
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
        console.log(BOUNDARIES.features[0])
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
    console.log(features)
    console.log("end data checks")
    next();*/
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
        status_code: 500
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
