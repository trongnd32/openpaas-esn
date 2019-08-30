'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var esPlugin = require('./elasticsearch');
var userListener = require('../../../user/listener');
var elasticSearch = require('../../../elasticsearch/listeners');
var logger = require('../../../logger');

function applyUserPlugins() {
  User.schema.plugin(esPlugin(userListener.getOptions()));
}
module.exports.applyUserPlugins = applyUserPlugins;

function applyPlugins() {
  applyUserPlugins();
}
module.exports.applyPlugins = applyPlugins;

function patchFindOneAndUpdate() {
  var find = User.findOneAndUpdate;

  User.findOneAndUpdate = function() {
    var callback = arguments[arguments.length - 1];
    var cb = function(err, result) {
      if (err) {
        return callback(err);
      }

      elasticSearch.index(result, userListener.getOptions(), function(indexErr, indexResult) {
        if (indexErr) {
          logger.error('Error while indexing data', indexErr);
        }

        if (indexResult) {
          logger.debug('Data indexed', indexResult);
        }

        callback(err, result);
      });
    };
    arguments[arguments.length - 1] = cb;
    find.apply(this, arguments);
  };
}
module.exports.patchFindOneAndUpdate = patchFindOneAndUpdate;
