'use strict';

const activitystreams = require('../../core/activitystreams');
const collaborationMiddleware = require('../../../test/fixtures/webserver/middleware/collaboration');
const streamsFinder = require('composable-middleware')();
const writableFinder = require('composable-middleware')();

const addStreamResourceFinder = function(finder) {
  if (finder) {
    streamsFinder.use(finder);
  }
};

module.exports.addStreamResourceFinder = addStreamResourceFinder;
addStreamResourceFinder(collaborationMiddleware.findStreamResource);

module.exports.findStreamResource = streamsFinder;

const addStreamWritableFinder = function(finder) {

  if (finder) {
    writableFinder.use(finder);
  }
};

module.exports.addStreamWritableFinder = addStreamWritableFinder;
addStreamWritableFinder(collaborationMiddleware.filterWritableTargets);

module.exports.filterWritableTargets = writableFinder;

module.exports.isValidStream = function(req, res, next) {
  const objectType = req.query.objectType || req.query.objectType;

  if (!objectType) {
    return res.status(400).json({ error: { status: 400, message: 'Bad request', details: 'objectType is mandatory' } });
  }

  const id = req.query.id;

  if (!id) {
    return res.status(400).json({ error: { status: 400, message: 'Bad request', details: 'ID is mandatory' } });
  }

  activitystreams.getUserStreams(req.user, null, function(err, streams) {
    if (err) {
      return res.status(500).json({ error: { status: 500, message: 'Bad request', details: err.message } });
    }

    if (!streams) {
      return res.status(400).json({ error: { status: 400, message: 'Bad request', details: 'User does not have any linked activitystream' } });
    }

    const belongs = streams.some(function(stream) {

      return stream.uuid === id;
    });

    if (belongs) {
      req.activitystream = { uuid: id, objectType };

      return next();
    }
    res.status(400).json({ error: { status: 400, message: 'Bad request', details: 'User does not have access to the ativitystream ' + id } });
  });
};
