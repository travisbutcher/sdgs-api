module.exports = function (req, res, next) {
  const originalUrl = req.originalUrl;
  const parts = originalUrl.split('/').filter( part => part !== '' && part !== 'sdgs' );

  let parsed = {};
  if (req.originalUrl.indexOf('FeatureServer') === -1) {
    parsed = parsePartsForJsonApi(originalUrl, parts, req.query);
  } else {
    parsed = {
      originalUrl,
      id: parts[1],
      type: parts[0]
    };
  }

  req.parsedParts = parsed;

  next();
}

function parsePartsForJsonApi(inUrl, parts, query) {

  if (inUrl.indexOf('?') === -1) {
    originalUrl = inUrl;
  } else {
    originalUrl = inUrl.substr(0,inUrl.indexOf('?'));
    if (query.include) {
      req.includes = query.include.split(',');
    }
  }

  const firstOne = parts[0];
  const lastOne = parts[parts.length-1];
  const secondToLastOne = parts[parts.length-2];

  let type = lastOne, id, filter, parentType, parentId;

  const len = parts.length;

  if (len === 1) {
    id = 'all';
    type = parts[0];
  } else {
    id = 'all';
    type = lastOne;
    parentId = secondToLastOne;

    if (lastOne === 'targets') {
      parentType = 'goals';
      filter = {field: 'goal_id', value: parentId};
    } else if (lastOne === 'indicators') {
      parentType = 'targets';
      filter = {field: 'target_id', value: parentId};
    } else if (lastOne === 'series') {
      parentType = 'indicators';
      filter = {field: 'indicator_id', value: parentId};
    } else {
      // id
      id = lastOne;
      type = secondToLastOne;
      parentId = parts[parts.indexOf(secondToLastOne)-1] || id;
      parentType = parts[parts.indexOf(secondToLastOne)-2] || type;
    }
  }

  return {
    originalUrl,
    parts,
    id,
    type,
    filter,
    parentId,
    parentType
  };
}
