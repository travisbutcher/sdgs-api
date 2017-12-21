let BOUNDARIES;

const GeoJSON = require('esri-to-geojson')
const request = require('request').defaults({gzip: true, json: true});
var outputFields = []
var esriJSON;
var filters = {"all":true,"geometry": true, "projection": true, "where": false, "offset": true}
var series_id;


module.exports = function (req, res, next) {
  console.log("getting field data")
  series_id = req.params.series_id;
  var sdgBaseURL = "https://unstats.un.org/SDGAPI/v1/sdg/Series/PivotData?seriesCode=SI_POV_DAY1&areaCode=792&pageSize=1"
  if(outputFields.length == 0){
    getDataFromURL(sdgBaseURL, (err, raw) => {
    if (err) return res.status(err.status_code).send(err);
      try{
        if (err) return res.status(err.status_code).send(err);
        outputFields = getMetaDataFields(raw.data[0])
        console.log(outputFields)
        getSpatialData(req,res,next)    
      }
      catch (e) {
        console.log(e);
      }
    })
  }
  else
      getSpatialData(req,res,next) 
}

function getSpatialData(req,res,next){
    const series_id = req.params.series_id;
    var boundary_url = 'https://services7.arcgis.com/gp50Ao2knMlOM89z/arcgis/rest/services/SDG_AREA/FeatureServer/0/query?'

    if(req.generateRenderer){
      filters.all = false
      filters.geometry = false
    }

    if(req.query){
      Object.keys(req.query).forEach(function(key) {
        var val = req.query[key];
        //Append all the keys to the json (Excpect Format and callback)
        if(key !== 'callback' && key !== 'where' && key !== 'f') //do not add callback as a parameter to the internal call
          //Add Any addtional Query Parameters to the ArcGIS Online Call
          boundary_url += "&" + key + "=" + val

        if(key==='outStatistics'){
          filters.all = false
          filters.geometry = false
        }
      });
    }

    //Ensure at least some parameters are set to get a proper dataset back for processing
    if(boundary_url.indexOf("quantization") === -1)
      boundary_url += "&quantizationParameters=" + '{"mode":"view","originPosition":"upperLeft","tolerance":19567.87924099992,"extent":{"type":"extent","xmin":-20037507.067161843,"ymin":-30240971.958386146,"xmax":20037507.067161843,"ymax":18422214.740178905,"spatialReference":{"wkid":102100,"latestWkid":3857}}}'

    if(boundary_url.indexOf("geometry") === -1)
      boundary_url += "&where=M49=792&resultRecordCount=1"

    if(boundary_url.toLowerCase().indexOf("outfields") === -1)
      boundary_url += "&outFields=*"

    if(boundary_url.indexOf('f=') === -1)
      boundary_url += "&f=json"
    console.log(boundary_url)


    getDataFromURL(boundary_url, (err, raw) => {
      if (err) return res.status(err.status_code).send(err);
      esriJSON = raw
      if(raw.features && raw.features.length !== 0){
        getData(req, next)
      }else{
        esriJSON = raw
        pushOutput(req,next)
      }
    });
}

function getMetaDataFields(data_element){
  var fields = []
  var addedFields = []
  Object.keys(data_element).forEach(function(key) {
    var val = data_element[key];
    //Parse the Year Information
    if(key==='years')
    {
      var years = JSON.parse(val);
      Object.keys(years).forEach(function(yearKey) {
          var nameKey = "year_" + years[yearKey]["year"].replace("[","").replace("]","")
          var field = {"name": nameKey,"type": "esriFieldTypeString","alias": nameKey,"sqlType": 'sqlTypeOther',"length": 2147483647,"domain": null,"defaultValue": null,"outName": nameKey}
          if(!addedFields.includes(nameKey)){
            fields.push(field)
            addedFields.push(nameKey)
          }
      });
    }
    else{
          //Add this as a field to the output
          var field = {"name": key,"type": "esriFieldTypeString","alias": key,"sqlType": 'sqlTypeOther',"length": 2147483647,"domain": null,"defaultValue": null,"outName": key}
          if(!addedFields.includes(key)){
            fields.push(field)
            addedFields.push(key)
          }
      }
  })

  return fields;
}

function pushOutput(req, next){
      console.log("running output")
      var output = esriJSON
      output["filtersApplied"] = filters
      output["metadata"] = {}
      output["metadata"]["idField"] = "OBJECTID"
      output["metadata"]["name"] = series_id
      output["metadata"]["description"] = "This will come from the SDG Metadata Service"
      output["metadata"]["geometryType"] = "Polygon"
      output["metadata"]["extent"] = esriJSON.extent ? esriJSON.extent : {"xmin" : -20037507.067161843, "ymin" : -30240971.958386146, "xmax" : 20037507.067161843, "ymax" : 18422214.740178905, "spatialReference" : {"wkid" : 102100, "latestWkid" : 3857}}
      output["metadata"]["spatialReference"] = esriJSON.spatialReference ? esriJSON.spatialReference : {"wkid" : 102100, "latestWkid" : 3857}
      var metaFields = esriJSON.fields.concat(outputFields)
      output["metadata"]["fields"] = metaFields
      if(esriJSON.transform) output["metadata"]["transform"] = esriJSON.transform
      output["capabilities"] = {"quantization": true}

      req.rawData = output;
      next()
}

function getData (req, next) {
  var sdgBaseURL = "https://unstats.un.org/SDGAPI/v1/sdg/Series/PivotData?seriesCode=" + series_id
  //do we need data with this request?
  if(esriJSON.features["geometry"] !== null){
    //Get a list of the M49 codes to grab from the data
    var m49 = []
    for (var x = 0, len = esriJSON.features.length; x < len; x++) {
      m49.push(esriJSON.features[x].attributes["M49"])
    }

    if(m49.length === 0)
    {
        req.rawData = esriJSON
        next();
    }

    sdgBaseURL += "&areaCode=" + m49.join() + "&pageSize=2000"
  }
  else{ 
     sdgBaseURL += "&areaCode=792&pageSize=1"
     console.log("just publish metadata")
   }

  getDataFromURL(sdgBaseURL, (err, raw) => {
    if (err) return res.status(err.status_code).send(err);

    try{
        if (err) return res.status(err.status_code).send(err);
        raw.data.forEach( (data_element) => {
          console.log(data_element)
          var geocode = data_element["geoAreaCode"]
          if(esriJSON.features){
            esriJSON.features.every((feature) => {
                if(feature["attributes"]["M49"] == geocode){
                  getFeatureValues(feature,data_element)
                  return false
                }
                else {
                  outputFields.forEach(function(field){
                    feature.attributes[field.name] = ""
                  })
                  return true;
                }
            });
          }
        })

        pushOutput(req, next)
      }
      catch (e) {
        console.log(e);
      }
    });
}

function getFeatureValues(feature, data_element){
  Object.keys(data_element).forEach(function(key) {
    var val = data_element[key];
    //Parse the Year Information
    if(key==='years')
    {
      var years = JSON.parse(val);
      Object.keys(years).forEach(function(yearKey) {
          var nameKey = "year_" + years[yearKey]["year"].replace("[","").replace("]","")
          feature.attributes[nameKey] = years[yearKey]["value"]
      });
    }
    else{
      feature.attributes[key] = val
    }
  })
}

function getDataFromURL (url, callback) {
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

