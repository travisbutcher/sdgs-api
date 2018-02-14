let BOUNDARIES;

const GeoJSON = require('esri-to-geojson')
const request = require('request').defaults({gzip: true, json: true});
const esriService = "https://services7.arcgis.com/gp50Ao2knMlOM89z/arcgis/rest/services/SDG_M49_PT/FeatureServer/0"
const sdgBaseURL = "https://unstats.un.org/SDGAPI/v1/sdg/Series/PivotData"
var outputFields = []
var outEsriFields = []

module.exports = function (req, res, next) {
  try{
    var series_id = req.params.series_id;
    
    if(outputFields.length == 0 && outEsriFields.length == 0){
      getDataFromURL(sdgBaseURL + "?seriesCode=SI_POV_DAY1&areaCode=792&pageSize=1", (err, raw) => {
        if (err) return res.status(err.status_code).send(err);
        outputFields = getMetaDataFields(raw.data[0])
        //Get the field data from ArcGIS Online Feature Service
        getDataFromURL(esriService + "?f=json", (err, raw) => {
          if (err) return res.status(err.status_code).send(err);

          outEsriFields = raw["fields"].concat(outputFields)
          getSpatialData(req,res,next)
        })
      })
    }
    else
        getSpatialData(req,res,next) 
  }
  catch (e) {
    console.log(e);
  }
}

function getSpatialData(req,res,next){
  try{
    const series_id = req.params.series_id;
    var boundary_url = esriService + "/query?f=json"
    var addedParam = false
    var filters = {"all":true,"geometry": true, "projection": true, "where": false, "offset": true}

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
    //if(boundary_url.indexOf("quantization") === -1)
    //  boundary_url += "&quantizationParameters=" + '{"mode":"view","originPosition":"upperLeft","tolerance":19567.87924099992,"extent":{"type":"extent","xmin":-20037507.067161843,"ymin":-30240971.958386146,"xmax":20037507.067161843,"ymax":18422214.740178905,"spatialReference":{"wkid":102100,"latestWkid":3857}}}'

    if(boundary_url.indexOf("where") === -1)
      boundary_url += "&where=1=1"

    if(boundary_url.toLowerCase().indexOf("outfields") === -1)
      boundary_url += "&outFields=*"

    getDataFromURL(boundary_url, (err, raw) => {
      if (err) return res.status(err.status_code).send(err);
      if(raw.features && raw.features.length !== 0){
        getData(req, next, raw, filters,series_id)
      }else{
        pushOutput(req,next,raw, filters,series_id)
      }
    });
    }
    catch (e) {
      console.log(e);
    }
}

function getMetaDataFields(data_element){
  try{
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
          var field = {"name": nameKey,"type": "esriFieldTypeDouble","alias": nameKey,"sqlType": 'sqlTypeFloat',"domain": null,"defaultValue": null,"outName": nameKey}
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

  return fields;    }
    catch (e) {
      console.log(e);
    }
}

function pushOutput(req, next, esriJSON, filters, series_id){
  try{
      var output = esriJSON
      output["filtersApplied"] = filters
      output["layers"] = [{"id":0,"name":series_id,"parentLayerId":-1,"defaultVisibility":true,"subLayerIds":null,"minScale":0,"maxScale":0,"spatialReference" : {"wkid" : 102100, "latestWkid" : 3857}}]
      output["extent"] = {"xmin" : -20037507.067161843, "ymin" : -30240971.958386146, "xmax" : 20037507.067161843, "ymax" : 18422214.740178905, "spatialReference" : {"wkid" : 102100, "latestWkid" : 3857}}
      output["metadata"] = {}
      output["metadata"]["idField"] = "OBJECTID"
      output["metadata"]["name"] = series_id
      output["metadata"]["description"] = "This provides informmation for the Sustainable Development Goals related to series " + series_id
      output["metadata"]["geometryType"] = "Point"
      output["metadata"]["extent"] = {"xmin" : -20037507.067161843, "ymin" : -30240971.958386146, "xmax" : 20037507.067161843, "ymax" : 18422214.740178905, "spatialReference" : {"wkid" : 102100, "latestWkid" : 3857}}
      output["metadata"]["spatialReference"] = esriJSON.spatialReference ? esriJSON.spatialReference : {"wkid" : 102100, "latestWkid" : 3857}
      output["metadata"]["fields"] = outEsriFields
      if(esriJSON.transform) output["metadata"]["transform"] = esriJSON.transform
      //output["capabilities"] = {"quantization": true}
      req.rawData = output;
      next()
    }
    catch (e) {
      console.log(e);
    }
}

function getData (req, next, esriJSON, filters, series_id) {

  try{
    //do we need data with this request?
    if(esriJSON.features){
        //Get a list of the M49 codes to grab from the data
        var m49 = []
        esriJSON.features.forEach((feature) => {
        m49.push(feature.attributes["M49"])
      })

      if(m49.length === 0)
      {
        req.rawData = esriJSON
        next();
      }
    }     
  } catch (e) {
  console.log(e);
  }

  getDataFromURL(sdgBaseURL + "?seriesCode="+series_id +"&areaCode=" + m49.join() + "&pageSize=2000", (err, raw) => {
    if (err) return res.status(err.status_code).send(err);

    try{
        raw.data.forEach( (data_element) => {
          var geocode = data_element["geoAreaCode"]
            if(esriJSON.features){
              esriJSON.features.every((feature) => {
                  if(feature["attributes"]["M49"] == geocode){
                    Object.keys(data_element).forEach(function(key) {
                      var val = data_element[key];
                      //Parse the Year Information
                      if(key==='years')
                      {
                        var years = JSON.parse(val);
                        Object.keys(years).forEach(function(yearKey) {
                            var nameKey = "year_" + years[yearKey]["year"].replace("[","").replace("]","")
                            feature.attributes[nameKey] = parseFloat(years[yearKey]["value"])
                        });
                      }
                      else{
                        feature.attributes[key] = val
                      }
                    })
                    return false
                  }
                  else {
                      return true;
                  }
              });
            }
        })

        pushOutput(req, next, esriJSON, filters,series_id)
      } catch (e) {
        console.log(e);
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

