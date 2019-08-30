const mongoose = require('mongoose');
const baseCollaboration = require('../../../../../backend/core/db/mongo/models/base-collaboration');
const ObjectId = mongoose.Schema.ObjectId;

var collaborationJSON = {
  title: {type: String, required: true, trim: true},
  description: {type: String, trim: true},
  type: {type: String, trim: true, required: true, default: 'open'},
  status: String,
  avatar: ObjectId,
  membershipRequests: [
    {
      user: {type: ObjectId, ref: 'User'},
      workflow: {type: String, required: true},
      timestamp: {
        creation: {type: Date, default: Date.now}
      }
    }
  ]
};

const CollaborationSchema = baseCollaboration(collaborationJSON, 'collaboration');

module.exports = mongoose.model('Collaboration', CollaborationSchema);
