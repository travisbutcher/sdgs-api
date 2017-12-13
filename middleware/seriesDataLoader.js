let BOUNDARIES;

const GeoJSON = require('esri-to-geojson')
const request = require('request').defaults({gzip: true, json: true});

module.exports = function (req, res, next) {
    console.log(req.query)
    const series_id = req.params.series_id;
    var boundary_url = 'https://services7.arcgis.com/gp50Ao2knMlOM89z/arcgis/rest/services/SDG_AREA/FeatureServer/0/query?' //?f=geojson

    if(req.query){
      Object.keys(req.query).forEach(function(key) {
        var val = req.query[key];
        //console.log("key:" + key + " value: " + val)
        //Append all the keys to the json (Excpect Format and callback)
        if(key !== 'callback') //key === 'f' || 
          boundary_url += "&" + key + "=" + val
      });
    }

    //Do not return the Geometry unless it is requested
    if(boundary_url.indexOf("quantization") === -1)
      boundary_url += "&quantizationParameters=" + '{"mode":"view","originPosition":"upperLeft","tolerance":19567.87924099992,"extent":{"type":"extent","xmin":-20037507.067161843,"ymin":-30240971.958386146,"xmax":20037507.067161843,"ymax":18422214.740178905,"spatialReference":{"wkid":102100,"latestWkid":3857}}}'

    if(boundary_url.indexOf("where") === -1)
      boundary_url += "&where=1=1"

    if(boundary_url.toLowerCase().indexOf("outfields") === -1)
      boundary_url += "&outFields=*"

    if(boundary_url.indexOf('f=') === -1)
      boundary_url += "&f=json"

    console.log(boundary_url)
    getArcGISOnlineGeometry(boundary_url, (err, raw) => {
      if (err) return res.status(err.status_code).send(err);
      var fc = raw
      var output = fc// GeoJSON.fromEsri(fc)
      console.log("this is the output:" + output)
      output["filtersApplied"] = {"all": true}
      output.metadata = {}
      output.metadata["name"] = series_id
      output.metadata["description"] = "This will come from the SDG Metadata Service"
      output.metadata["extent"] = raw.extent ? raw.extent : {"xmin" : -20037507.067161843, "ymin" : -30240971.958386146, "xmax" : 20037507.067161843, "ymax" : 18422214.740178905, "spatialReference" : {"wkid" : 102100, "latestWkid" : 3857}}
      output.metadata["spatialReference"] = raw.spatialReference ? raw.spatialReference : {"wkid" : 102100, "latestWkid" : 3857}
      if(raw.transform) output.metadata["transform"] = raw.transform
      output["capabilities"] = {"quantization": true}
      console.log(output.metadata)
      console.log(output.capabilities)
      console.log(output.filtersApplied)
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

function getArcGISOnlineGeometry (url, callback) {
  request(url,  (err, res, body) => {
    if (err || (res.statusCode > 400 && res.statusCode < 600)) {
      return callback({
        message: 'error requesting data from ArcGIS Online',
        request_url: url,
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
