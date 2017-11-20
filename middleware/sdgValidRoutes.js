const isPositiveInteger = require('is-positive-integer');

module.exports = function (req, res, next) {
  
  let validation = { isValid: true };

  const type = req.params.type;

  if (type === 'goals') {
    console.log(req.params)
    validation = true; // validateGoals(req.params.id);
  } else if (type === 'targets') {

  } else if (type === 'indicators') {

  } else if (type === 'series') {

  }
  next();

  /*if (validation.isValid) {
    next();
  } else {
    res
      .status(validation.error.code)
      .send(validation.error);
  }*/
}

function validateGoals(id) {
  let response = {
    isValid: true,
    error: {
      message: 'error',
      code: 500
    }
  };
  return response;

  if (isPositiveInteger(parseInt(id))) {
    const num = parseInt(id);
    if (num > 0 && num < 18) {
      response.isValid = true;
    } else {
      response.error.message = `Goal id of '${id}' is not valid. Goal id must be between 1 and 17`;
      response.error.code = 404;
    }
  } else {
    if (id === 'all') {
      response.isValid = true;
    } else {
      response.error.message = `Goal id of '${id}' is not valid`;
      response.error.code = 404;
    }
  }
  return response;
}
