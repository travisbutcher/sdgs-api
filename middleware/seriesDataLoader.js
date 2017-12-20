let BOUNDARIES;

const GeoJSON = require('esri-to-geojson')
const request = require('request').defaults({gzip: true, json: true});


module.exports = function (req, res, next) {
    var filters = {"all":true,"geometry": true, "projection": true, "where": true, "offset": true}
    const series_id = req.params.series_id;
    var boundary_url = 'https://services7.arcgis.com/gp50Ao2knMlOM89z/arcgis/rest/services/SDG_AREA/FeatureServer/0/query?'

    if(req.generateRenderer){
      filters.all = false
      filters.geometry = false
    }

    if(req.query){
      Object.keys(req.query).forEach(function(key) {
        var val = req.query[key];
        //console.log("key:" + key + " value: " + val)
        //Append all the keys to the json (Excpect Format and callback)
        if(key !== 'callback') //do not add callback as a parameter to the internal call
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

    if(boundary_url.indexOf("where") === -1)
      boundary_url += "&where=M49=792&resultRecordCount=1"

    if(boundary_url.toLowerCase().indexOf("outfields") === -1)
      boundary_url += "&outFields=*"

    if(boundary_url.indexOf('f=') === -1)
      boundary_url += "&f=json"

    //console.log(boundary_url)
    getDataFromURL(boundary_url, (err, raw) => {
      if (err) return res.status(err.status_code).send(err);
      var fc = raw
      var output = fc //GeoJSON.fromEsri(fc)
      output["filtersApplied"] = filters
      output.metadata = {}
      output.metadata["idField"] = "OBJECTID"
      output.metadata["name"] = series_id
      output.metadata["description"] = "This will come from the SDG Metadata Service"
      output.metadata["geometryType"] = "Polygon"
      output.metadata["extent"] = raw.extent ? raw.extent : {"xmin" : -20037507.067161843, "ymin" : -30240971.958386146, "xmax" : 20037507.067161843, "ymax" : 18422214.740178905, "spatialReference" : {"wkid" : 102100, "latestWkid" : 3857}}
      output.metadata["spatialReference"] = raw.spatialReference ? raw.spatialReference : {"wkid" : 102100, "latestWkid" : 3857}
      if(raw.transform) output.metadata["transform"] = raw.transform
      output["capabilities"] = {"quantization": true}

      if(output.features.length !== 0){
        output.metadata["fields"] = output.fields
        getData(req,res, next, output)
      }else{
        //req.rawData = output
        //next()
      }
    });
}

function getData (req, res, next, output) {
  const series_id = req.params.series_id;
  const refarea = req.params.refarea;

  var sdgBaseURL = "https://unstats.un.org/SDGAPI/v1/sdg/Series/PivotData?seriesCode=" + series_id
  //do we need data with this request?
  if(output.features["geometry"] !== null){
    //Get a list of the M49 codes to grab from the data
    var m49 = []
    for (var x = 0, len = output.features.length; x < len; x++) {
      m49.push(output.features[x].attributes["M49"])
    }

    if(m49.length === 0)
    {
        req.rawData = output
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

        var sdgData = raw
        raw.data.forEach( (data_element) => {
          var geocode = data_element["geoAreaCode"]
          //Find the feature these results will be attached to
          var checkFeature;

          output.features.forEach((feature) => {
              //onsole.log("Attributes:" , feature, feature["attributes"])
              if(feature["attributes"]["M49"] == geocode){
                checkFeature = feature
              }
          }); 

          Object.keys(data_element).forEach(function(key) {
            var val = data_element[key];
            //Parse the Year Information
            if(key==='years')
            {
              var years = JSON.parse(val);
              Object.keys(years).forEach(function(yearKey) {
                  var nameKey = "year_" + years[yearKey]["year"].replace("[","").replace("]","")
                  var field = {"name": nameKey,"type": "esriFieldTypeString","alias": nameKey,"sqlType": 'sqlTypeOther',"length": 10,"domain": null,"defaultValue": null}
                  output.metadata["fields"].push(field)
                  checkFeature.attributes[nameKey] = years[yearKey]["value"]
              });
            }
            else{
              if(output.metadata["fields"]){
                  //Add this as a field to the output
                  var field = {"name": key,"type": "esriFieldTypeString","alias": key,"sqlType": 'sqlTypeOther',"length": 5000,"domain": null,"defaultValue": null}
                  output.metadata["fields"].push(field)
                  //Append the values into the attributes array
                  checkFeature.attributes[key] = val
              }
            }
          })
        })

        //Loop through the data
        req.rawData = output
        next();
      }
      catch (e) {
        console.log(e);
      }
    });
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

