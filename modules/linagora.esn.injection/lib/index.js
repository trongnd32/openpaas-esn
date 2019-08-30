'use strict';

function injectLib(dependencies) {
  var domainModule = dependencies('domain');

  var lib = {};

  lib.inject = function(tuple, injections, callback) {
    if (!tuple.objectType || !tuple.id) {
      return callback(new Error('Injection target should be a valid pair objectType/objectId.'));
    }

    if (tuple.objectType === 'domain') {
      domainModule.load(tuple.id, function(err, domain) {
        if (err) {
          return callback(err);
        }
        domain.injections = domain.injections.concat(injections);
        domain.save(callback);
      });
    } else {
      return callback(new Error('Unsupported injection target type.'));
    }
  };

  lib.removeInjections = function(application, target, callback) {
    if (!target.objectType || !target.id) {
      return callback(new Error('Injection target should be a valid pair objectType/objectId.'));
    }

    if (target.objectType === 'domain') {
      domainModule.load(target.id, function(err, domain) {
        if (err) {
          return callback(err);
        }
        var otherTargetInjections = domain.injections.filter(function(injection) {
          return injection.source.id + '' !== application.id;
        });
        domain.injections = otherTargetInjections;
        domain.save(callback);
      });
    } else {
      return callback(new Error('Unsupported injection target type.'));
    }
  };

  return lib;
}

module.exports = injectLib;
