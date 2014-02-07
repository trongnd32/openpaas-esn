'use strict';

var passport = require('passport');
var config = require('../core').config('default');

passport.serializeUser(function(user, done) {
  if (user && user.emails && user.emails.length && user.emails[0] && user.emails[0].value) {
    return done(null, user.emails[0].value);
  }
  return done(new Error('Unable to serialize a session without email'));
});
passport.deserializeUser(function(username, done) {
  done(null, { id: username });
});

if (config.auth && config.auth.strategies) {
  config.auth.strategies.forEach(function(auth) {
    try {
      passport.use(auth, require('./auth/' + auth).strategy);
    } catch (err) {
      console.log('Can not load the ' + auth + ' strategy:', err);
    }
  });
}
