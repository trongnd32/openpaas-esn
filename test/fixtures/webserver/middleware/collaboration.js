const collaborationModule = require('../../../../backend/core/collaboration');
const collaborationPermission = collaborationModule.permission;
require('../../db/mongo/models/collaboration');
const mongoose = require('mongoose');
const Collaboration = mongoose.model('Collaboration');
const activitystreamMW = require('../../../../backend/webserver/middleware/activitystream');

module.exports = {
  findStreamResource,
  filterWritableTargets,
  init
};

function init() {
  activitystreamMW.addStreamResourceFinder(findStreamResource);
  activitystreamMW.addStreamWritableFinder(filterWritableTargets);
}

function findStreamResource(req, res, next) {
    var uuid = req.params.uuid;

    Collaboration.getFromActivityStreamID(uuid, function(err, collaboration) {
      if (err) {
        return next(new Error('Error while searching the stream resource : ' + err.message));
      }

      if (!collaboration) {
        return next();
      }

      req.activity_stream = {
        objectType: 'activitystream',
        _id: uuid,
        target: {
          objectType: 'collaboration',
          object: collaboration
        }
      };
      next();
    });
  }

  function filterWritableTargets(req, res, next) {
    const inReplyTo = req.body.inReplyTo;

    if (inReplyTo) {
      return next();
    }

    const targets = req.body.targets;

    if (!targets || targets.length === 0) {
      return next();
    }

    const async = require('async');

    async.filter(targets,
      function(item, callback) {
        Collaboration.getFromActivityStreamID(item.id, function(err, collaboration) {

          if (err || !collaboration) {
            return callback(err, false);
          }

          collaborationPermission.canWrite(collaboration, {objectType: 'user', id: req.user.id}, callback);
        });
      },
      function(err, results) {
        if (!results || results.length === 0) {
          return next();
        }

        if (!req.message_targets) {
          req.message_targets = [];
        }

        req.message_targets = req.message_targets.concat(results);
        next();
      }
    );
  }
