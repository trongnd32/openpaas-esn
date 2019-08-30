'use strict';

var FROM_HEADER = 'x-esn-email-to-reply-from';
var TO_HEADER = 'x-esn-email-to-reply-to';

module.exports = function(dependencies, lib) {

  function canReplyTo(req, res, next) {
    var to = req.query.to || req.headers[TO_HEADER];
    if (!to) {
      return res.status(400).json({error: {status: 400, message: 'Bad Request', details: 'to query parameter is required'}});
    }

    if (!req.user) {
      return res.status(400).json({error: {status: 400, message: 'Bad Request', details: 'request user is required'}});
    }

    lib.getReplyTo(to, req.user, function(err, replyTo) {
      if (err) {
        return res.status(500).json({error: {status: 500, message: 'Server Error', details: err.message}});
      }

      if (!replyTo) {
        return res.status(404).json({error: {status: 404, message: 'Not found', details: 'Can not get message from recipient address'}});
      }

      lib.canReply(replyTo, req.user, function(err, reply) {
        if (err) {
          return res.status(500).json({error: {status: 500, message: 'Server Error', details: err.message}});
        }
        if (!reply) {
          return res.status(403).json({error: {status: 403, message: 'Forbidden', details: 'User does not have enough rights to reply to the message'}});
        }
        req.replyTo = replyTo;

        return next();
      });
    });
  }

  function loadUser(req, res, next) {
    var user = req.query.from || req.headers[FROM_HEADER];

    if (!user) {
      return res.status(400).json({error: {status: 400, message: 'Bad Request', details: 'User query parameter is required'}});
    }

    lib.getUser(user, function(err, u) {
      if (err) {
        return res.status(500).json({error: {status: 500, message: 'Server Error', details: err.message}});
      }

      if (!u) {
        return res.status(404).json({error: {status: 404, message: 'Not found', details: 'No such user ' + user}});
      }
      req.user = u;
      next();
    });
  }

  return {
    loadUser: loadUser,
    canReplyTo: canReplyTo
  };

};
