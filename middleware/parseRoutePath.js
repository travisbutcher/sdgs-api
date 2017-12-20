module.exports = function (req, res, next) {
  const baseUrl = `${req.baseUrl}${req.path}`;
  const parts = baseUrl.split('/').filter( part => part !== '' && part !== 'sdgs' );

  let parsed = {};
  if (baseUrl.indexOf('FeatureServer') === -1) {
    parsed = parsePartsForJsonApi(parts, req.query);
  } else {
    parsed = {
      baseRequest: {
        isFeatureServer: true,
        type: parts[0],
        id: parts[1]
      }
    };
  }

  req.parsedParts = parsed;

  // console.log('req.parsedParts', req.parsedParts);

  next();
}

function parsePartsForJsonApi (parts, query) {
  let obj = { baseElements: {}, baseRequest: {} }, typeName;

  parts.forEach( (part, index) => {

    if (part === 'goals' ||
        part === 'targets' ||
        part === 'indicators' ||
        part === 'series') {

      typeName = (part === 'series') ? 'series' : singluarize(part);
      obj.baseElements[part] = true;
      obj.baseElements[`${typeName}_id`] = parts[index+1];
      obj.baseRequest.type = part;
      obj.baseRequest.id = 'all';
    } else {
      obj.baseRequest.id = part;
    }

  });

  let filter, baseElements = obj.baseElements;
  if (obj.baseRequest.type === 'targets' && baseElements.goal_id !== undefined && baseElements.target_id === undefined) {
    filter = {};
    filter.field = 'goal_id';
    filter.value = baseElements.goal_id;
  } else if (obj.baseRequest.type === 'indicators' && baseElements.target_id !== undefined && baseElements.indicator_id === undefined) {
    filter = {};
    filter.field = 'target_id';
    filter.value = baseElements.target_id;
  } else if (obj.baseRequest.type === 'series' && baseElements.indicator_id !== undefined && baseElements.series_id === undefined) {
    filter = {};
    filter.field = 'indicator_id';
    filter.value = baseElements.indicator_id;
  }

  if (filter) {
    obj.baseRequest.filter = filter;
  }

  if (parts.length === 1) {
    obj.baseRequest.id = 'all';
  }

  if (query) {
    obj.baseQuery = query;

    if (query.include) {
      obj.includedRequests = getIncludedRequests(obj, query.include.split(','));
    }
  }

  return obj;
}

function validateIncludes (rawIncludes) {
  const validIncludes = ['goals', 'targets', 'indicators', 'series'];
  return rawIncludes
    .map( (include) => include.trim() )
    .filter( (include) => validIncludes.indexOf(include) > -1 );
}

function getIncludedRequests (baseObj, rawIncludes) {
  const includes = validateIncludes(rawIncludes);
  let requests = includes.map( (inc) => {
    let obj = {
      type: inc,
      id: 'all'
    };
    // console.log('inc', inc);
    const filter = getFilterForInclude(baseObj, inc);

    if (filter) {
      obj.filter = filter;
    }

    return obj;
  });

  return requests;
}

function getFilterForInclude (baseObj, inc) {

  const filter = getFieldFilterForInclude(inc, baseObj.baseElements);

  if (filter.field === undefined || filter.value === undefined) {
    return undefined;
  }

  console.log(`filter for ${inc}: `, filter);

  return filter;
}

function getFieldFilterForInclude (includeType, urlElements) {
  let field, value, filter;

  if (includeType === 'goals') {
    field = 'id';
    if (urlElements['indicator_id']) {
      value = urlElements['indicator_id'].substr(0, urlElements['indicator_id'].indexOf('.'));
    } else if (urlElements['target_id']) {
      value = urlElements['target_id'].substr(0, urlElements['target_id'].indexOf('.'));
    } else if (urlElements['series_id']) {
      field = { preFilter:'goal_id', postFilter: 'id' };
      value = false;
    } else if (urlElements['goal_id']) {
      value = urlElements['goal_id'];
    }
  } else if (includeType === 'targets') {
    if (urlElements['indicator_id']) {
      value = urlElements['indicator_id'].substr(0, urlElements['indicator_id'].lastIndexOf('.'));
      field = 'id';
    } else if (urlElements['target_id']) {
      field = 'id';
      value = urlElements['target_id'];
    } else if (urlElements['series_id']) {
      field = { preFilter:'target_id', postFilter: 'id' };
      value = false;
    } else if (urlElements['goal_id']) {
      field = 'goal_id';
      value = urlElements['goal_id'];
    }
  } else if (includeType === 'indicators') {
    if (urlElements['target_id']) {
      field = 'target_id';
      value = urlElements['target_id'];
    } else if (urlElements['goal_id']) {
      field = 'goal_id';
      value = urlElements['goal_id'];
    } else if (urlElements['series_id']) {
      field = { preFilter:'indicator_id', postFilter: 'id' };
      value = false;
    } else if (urlElements['indicator_id']) {
      field = 'id';
      value = urlElements['indicator_id'];
    }
  } else if (includeType === 'series') {
    if (urlElements['indicator_id']) {
      value = urlElements['indicator_id'];
      field = 'indicator_id';
    } else if (urlElements['series_id']) {
      field = 'id';
      value = urlElements['series_id'];
    } else if (urlElements['target_id']) {
      value = urlElements['target_id'];
      field = 'target_id';
    }
  }

  return {field, value};
}

function singluarize(str) {
  return str.substring(0, str.length - 1);
}
