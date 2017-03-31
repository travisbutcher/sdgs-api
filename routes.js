/*
  routes.js

  This file is an optional place to specify additional routes to be handled by this provider's controller
  Documentation: http://koopjs.github.io/docs/specs/provider/
*/
module.exports = [
  {
    path: '/sdgs',
    methods: [ 'get', 'post' ],
    handler: 'getResourceRootJSONAPI'
  },
  {
    path: '/sdgs/:type/:id?',
    methods: [ 'get', 'post' ],
    handler: 'getResourceJSONAPI'
  },
  {
    path: '/sdgs/:type/:id/:first_level/:first_level_id?/:second_level?/:second_level_id?/:third_level?/:third_level_id?',
    methods: [ 'get', 'post' ],
    handler: 'getResourceJSONAPI'
  }
];
