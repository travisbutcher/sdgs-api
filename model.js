/*
  model.js

  This file is required. It must export a class with at least one public function called `getData`

  Documentation: http://koopjs.github.io/docs/specs/provider/
*/
const request = require('request').defaults({gzip: true, json: true});
const config = require('config');

function Model (koop) {}

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

Model.prototype.getOneOrAllResourceJsonApi = function (req, callback) {
  const originalUrl = req._parsedUrl.pathname;
  const parts = originalUrl.split('/').filter( part => part !== '' );

  const secondToLastOne = parts[parts.length-2];
  const lastOne = parts[parts.length-1];

  let type, id, parent, shouldFilter = false, filterId;

  if (lastOne.indexOf('.') !== -1 || secondToLastOne === 'series') {
    type = secondToLastOne;
    id = lastOne;
  } else {
    type = lastOne;
    id = 'all';
    shouldFilter = true;
    filterId = secondToLastOne;
    parent = parts[parts.length-3];
  }

  getFromGithub({type: type, id: id}, (err, raw) => {
    if (err) return callback(err);

    let data = raw;

    if (shouldFilter) {
      // console.log(filterId);
      const parentField = `${singluarize(parent)}_id`;

      let filtered = {};

      Object.keys(raw).forEach( (key) => {
        // console.log('raw[key][parentField]', raw[key][parentField], 'filterId', filterId);
        if (raw[key][parentField] === filterId) {
          filtered[key] = raw[key];
        }
      });

      data = filtered;
    }

    const resource = translateToJSONAPI(type, req.query.sources, data);

    resource.meta = buildMeta(req, resource.data.length);

    callback(null, resource);
  });
}

Model.prototype.getAllResourceJsonApi = function (req, callback) {
  getFromGithub(req.params, (err, raw) => {
    if (err) return callback(err);
    const resource = translateToJSONAPI(req.params.type, req.query.sources, raw);

    resource.meta = buildMeta(req, resource.data.length);

    callback(null, resource);
  });
}

function getFromGithub (options, callback) {
  let id = options.id;
  if (!id || id === undefined) {
    id = 'all';
  }

  let url = `https://raw.githubusercontent.com/UNStats-SDGs/sdgs-data/master/${options.type}/${id}.json?raw=true`;
  // console.log(url);
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

function singluarize(str) {
  return str.substring(0, str.length - 1);
}

function translateToJSONAPI (type, sources, raw) {
  // chop off the 's' for the type
  const singularType = (type !== 'series') ? singluarize(type) : type;

  let data;

  if (raw.id === undefined) {
    data = [];

    Object.keys(raw).forEach((key) => {
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

Model.prototype.getData = function (req, callback) {
  const options = req.params
  options.type = options.host
  getFromGithub(options, (err, raw) => {
    if (err) return callback(err)
    const geojson = translate(raw, options)
    callback(null, geojson)
  })
}

function translate (input, options) {
  const type = (options.type !== 'series') ? singluarize(options.type) : options.type;

  return {
    type: 'FeatureCollection',
    features: formatFeatures(input, type)
  }
}

function formatFeatures (raw, type) {
  let data = [];
  let feature;

  if (raw.id === undefined) {
    Object.keys(raw).forEach((key) => {
      feature = {
        type: 'Feature',
        properties: getFeatureAttributes(raw[key], type)
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
    id: obj.id,
    description: obj.description
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

    // flatten sources
    // obj.sources.forEach( (source) => {
    //
    // });

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
  let requestUrl = `${req.protocol}://${req.hostname}${req.originalUrl}`;

  if (req.hostname === 'localhost') {
    requestUrl = `${req.protocol}://${req.hostname}:${process.env.PORT}${req.originalUrl}`;
    apiRoot = `${req.protocol}://${req.hostname}:${process.env.PORT}`;
  }

  let meta = {
    apiRoot: `${apiRoot}/sdgs`,
    request: requestUrl
  };

  if (len > 1) {
    meta.stats = { count: len }
  }

  return meta;
}

module.exports = Model
