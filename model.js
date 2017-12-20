/*
  model.js

  This file is required. It must export a class with at least one public function called `getData`

  Documentation: http://koopjs.github.io/docs/specs/provider/
*/
const request = require('request').defaults({gzip: true, json: true});

function Model (koop) {}

/**
  ~ BEGIN ~
  JSON API
*/

/**
 * This function adds one to its input.
 * @param {number} input any number
 * @returns {number} that number, plus one.
 */
Model.prototype.getResourceRootJsonApi = function (req, callback) {
  let resourceRoot = `${req.protocol}://${req.hostname}/sdgs`;
  let requestUrl = `${req.protocol}://${req.hostname}${req._parsedUrl.pathname}`;

  if (req.hostname === 'localhost') {
    requestUrl = `${req.protocol}://${req.hostname}:${process.env.PORT}${req._parsedUrl.pathname}`;
    resourceRoot = `${req.protocol}://${req.hostname}:${process.env.PORT}/sdgs`;
  }

  const resource = {
    goals: {
      collection: `${resourceRoot}/goals`,
      object: `${resourceRoot}/goals/{:id}`
    },
    targets: {
      collection: `${resourceRoot}/targets`,
      object: `${resourceRoot}/targets/{:id}`
    },
    indicators: {
      collection: `${resourceRoot}/indicators?{sources}`,
      object: `${resourceRoot}/indicators/{:id}{sources}`
    },
    series: {
      collection: `${resourceRoot}/series`,
      object: `${resourceRoot}/series/{:id}`
    },
    params: {
      sources: 'boolean. returns detailed metadata for indicator(s)'
    }
  };

  callback(null, resource);
}

Model.prototype.getResourceJsonApi = function (req, callback) {
  console.log("getResourceJsonApi")
  const data = req.rawData;
  const resource = translateToJSONAPI(req.rawDataType, req.query.sources, data);
  resource.meta = buildMeta(req, resource.data.length);

  if (req.includedData) {
    resource.included =
      req.includedData.map( (include) => {
        return translateToJSONAPI(include.type, req.query.sources, include.data);
      })
      // flatten arrays
      .reduce( (acc,cur) => acc.concat(cur.data), []);
  }

  callback(null, resource);
}

function singluarize(str) {
  return 'serie'//str.substring(0, str.length - 1);
}

function translateToJSONAPI (type, sources, raw) {
  console.log("translateToJSONAPI")
  // chop off the 's' for the type
  const singularType = 'serie' //(type !== 'series') ? singluarize(type) : type;

  let data;

  if (raw.id === undefined) {
    data = [];

    Object.keys(raw).forEach((key) => {
      //console.log(key)
      data.push({
        id: raw[key].id,
        type: singularType,
        attributes: getJsonApiAttributes(raw[key], sources, singularType)
      });
    });
  } else {
    data = {
      id: raw.id,
      type: singularType,
      attributes: getJsonApiAttributes(raw, sources, singularType)
    }
  }

  return { data: data };
}

function getJsonApiAttributes (obj, sources, type) {
  let atts = {
    id: obj.id,
    description: obj.description
  };

  if (type === 'goal') {
    atts.title = obj.title;
    atts.colorInfo = obj.color_info;
    atts.icon_url = obj.icon_url
  } else if (type === 'target') {
    atts.goal_id = obj.goal_id;
  } else if (type === 'indicator') {
    atts.goal_id = obj.goal_id;
    atts.target_id = obj.target_id;

    if (sources === 'true') {
      atts.sources = obj.sources;
    }
  } else if (type === 'series') {
    atts.indicator_id = obj.indicator_id;
    atts.target_id = obj.target_id;
    atts.goal_id = obj.goal_id;
    atts.is_official = obj.is_official;
    atts.show = obj.show;

    // TODO: snatch geometry for countries

  }

  return atts;
}

function buildMeta (req, len) {

  let apiRoot = `${req.protocol}://${req.hostname}`;
  let requestUrl = `${req.protocol}://${req.hostname}${req.baseUrl}`;

  if (req.hostname === 'localhost') {
    requestUrl = `${req.protocol}://${req.hostname}:${process.env.PORT}${req.baseUrl}`;
    apiRoot = `${req.protocol}://${req.hostname}:${process.env.PORT}`;
  }

  let meta = {
    apiRoot: `${apiRoot}/sdgs`,
    request: requestUrl,
    queryParameters: {}
  };

  if (len > 1) {
    meta.stats = { count: len }
  }

  if (req.query) {
    meta.queryParameters = req.query;
  }

  if (req.messages) {
    meta.messages = req.messages;
  }

  return meta;
}

/**
  ~ END ~
  JSON API
*/

/**
  ~ BEGIN ~
  Core Koop - /FeatureServer/0 routes with support for Esri JSON & GeoJSON (f=geojson)
*/

Model.prototype.getData = function (req, callback) {
  const data = req.rawData;
  const resource = data
  callback(null, resource);
}

function translate (input, options) {
  return {
    type: 'FeatureCollection',
    features:  input.features,
    filtersApplied: {all: true}
  }
}

function formatFeatures (raw, type, geometry) {
  let data = [];
  let feature;

  if (raw.id === undefined) {
    console.log('processing raw')
    Object.keys(raw).forEach((key) => {
      feature = {
        "type": "Feature",
        "id":  parseInt(raw[key].id),
        "properties": raw[key].properties,
        "geometry": raw[key].geometry
      };

      data.push( feature );
    });
  } else {
    data.push({
      type: 'Feature',
      properties: getFeatureAttributes(raw, type)
    });
  }

  return data;
}

function getFeatureAttributes (obj, type) {
  let atts = {
    id: obj.properties.id
  };

  if (type === 'goal') {
    atts.title = obj.title;
    atts.colorInfoRgb = obj.color_info.rgb.join(',');
    atts.colorInfoHex = obj.color_info.hex;
  } else if (type === 'target') {
    atts.goal_id = obj.goal_id;
  } else if (type === 'indicator') {
    atts.goal_id = obj.goal_id;
    atts.target_id = obj.target_id;
  } else if (type === 'series') {
    /*atts.indicator_id = obj.indicator_id;
    atts.target_id = obj.target_id;
    atts.goal_id = obj.goal_id;
    atts.is_official = obj.is_official;
    atts.show = obj.show;*/
  }

  return obj.properties;// Object.assign(atts, obj);
}

/**
  ~ END ~
  Core Koop
*/

module.exports = Model
