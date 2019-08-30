const tuple = require('../../../../backend/core/tuple');
const collaborationModule = require('../../../../backend/core/collaboration');
const permission = collaborationModule.permission;
const query = collaborationModule.query;

module.exports = {
  getStreamsForUser,
  getCollaborationsForUser: getUserCollaborations
};

function collaborationToStream(collaboration) {
  return {
    uuid: collaboration.activity_stream.uuid,
    target: {
      objectType: 'collaboration',
      _id: collaboration._id,
      displayName: collaboration.title,
      id: 'urn:linagora.com:collaboration:' + collaboration._id,
      image: collaboration.avatar || ''
    }
  };
}

function getStreamsForUser(userId, options, callback) {
  getUserCollaborations(userId, options, (err, collaborations) => {
    if (err) {
      return callback(err);
    }

    callback(null, collaborations.map(collaborationToStream));
  });
}

function getUserCollaborations(user, options, callback) {
  let q = options || {};
  const params = {};

  if (typeof options === 'function') {
    callback = options;
    q = {};
  }

  if (!user) {
    return callback(new Error('User is required'));
  }

  const id = user._id || user;
  const done = function(err, result) {
    if (err) {
      return callback(err);
    }

    if (!result || result.length === 0) {
      return callback(null, []);
    }

    if (q.writable) {
      return permission.filterWritable(result, tuple.user(id), callback);
    }

    callback(null, result);
  };

  if (q.member) {
    params.members = { $elemMatch: { 'member.objectType': 'user', 'member.id': id } };
  }

  if (q.domainid) {
    params.domain_ids = q.domainid;
  }

  if (q.name) {
    params.title = q.name;
  }

  query('collaboration', params, done);
}
