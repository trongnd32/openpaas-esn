'use strict';

const expect = require('chai').expect;
const request = require('supertest');
const fs = require('fs-extra');
const async = require('async');

describe('The email API', function() {

  let webserver;
  let User;
  let user;
  const password = 'secret';
  const email = 'foo@bar.com';
  let EMailMsg, Collaboration, TimelineEntry, fixtures;

  const saveCollabration = function(collaboration, done) {
    const c = new Collaboration(collaboration);

    c.members = [{
      member: {
        id: user._id,
        objectType: 'user'
      }
    }];

    return c.save(function(err, saved) {
      if (err) {
        return done(err);
      }
      collaboration = saved;

      return done(null, saved);
    });
  };

  beforeEach(function(done) {
    const self = this;

    this.mongoose = require('mongoose');
    this.testEnv.initCore(function() {
      User = self.helpers.requireBackend('core/db/mongo/models/user');
      EMailMsg = self.helpers.requireBackend('core/db/mongo/models/emailmessage');
      // Community = self.helpers.requireBackend('core/db/mongo/models/community');
      Collaboration = require('../../fixtures/db/mongo/models/collaboration');
      TimelineEntry = self.helpers.requireBackend('core/db/mongo/models/timelineentry');
      // self.helpers.requireBackend('core/collaboration');
      webserver = self.helpers.requireBackend('webserver').webserver;
      fixtures = self.helpers.requireFixture('models/users.js')(User);
      const collaborationModule = self.helpers.requireBackend('core/collaboration');
      const collaborationModuleTest = require('../../fixtures/backend/collaboration');
      const objectType = 'collaboration';

      collaborationModule.registerCollaborationLib(objectType, collaborationModuleTest);
      collaborationModule.registerCollaborationModel(objectType, 'Collaboration');
      user = fixtures.newDummyUser([email], password);
      user.save(function(err, saved) {
        if (err) {
          return done(err);
        }
        user._id = saved._id;

        return done();
      });
    });
  });

  afterEach(function(done) {
    this.helpers.mongo.dropDatabase(done);
  });

  describe('POST /api/email', function() {

    it('should create email in messages from incoming eml', function(done) {
      const self = this;
      let collaboration = { title: 'node.js' };

      async.series([
        function(callback) {
          saveCollabration(collaboration, function(err, saved) {
            if (err) {
              return callback(err);
            }
            collaboration = saved;

            return callback();
          });
        },
        function() {
          self.helpers.api.loginAsUser(webserver.application, email, password, function(err, loggedInAsUser) {
            if (err) {
              return done(err);
            }

            const file = self.testEnv.fixtures + '/emails/simple.eml';
            const email = fs.readFileSync(file, 'utf8');
            const req = loggedInAsUser(request(webserver.application).post('/api/messages/email'));

            req.query({ objectType: 'activitystream', id: collaboration.activity_stream.uuid });
            req.set('Content-Type', 'message/rfc822');
            req.send(email);
            req.expect(201);
            req.end(function(err, res) {
              expect(err).to.not.exist;
              expect(res.body).to.exist;
              EMailMsg.find(function(err, result) {
                if (err) {
                  return done(err);
                }

                function findHeader(doc, name) {
                  const headers = doc.headers.filter(function(h) {
                    return (h[0] === name);
                  }).map(function(h) {
                    return h[1];
                  });

                  return headers;
                }

                expect(result).to.exist;
                expect(result.length).to.equal(1);
                expect(result[0].objectType).to.equal('email');
                expect(result[0].shares).to.exist;
                expect(result[0].shares.length).to.equal(1);
                expect(result[0].shares[0].objectType).to.equal('activitystream');
                expect(result[0].shares[0].id).to.equal(collaboration.activity_stream.uuid);
                const subjectHeaders = findHeader(result[0], 'subject');

                expect(subjectHeaders).to.have.length(1);
                expect(subjectHeaders[0]).to.equal('Chuck!');
                expect(result[0].body.text).to.equal('Google, c\'est le seul endroit où tu peux taper Chuck Norris...');
                const toHeaders = findHeader(result[0], 'to');

                expect(toHeaders).to.have.length(1);
                expect(toHeaders[0]).to.equal('Bruce Willis <to@open-paas.org>');
                const fromHeaders = findHeader(result[0], 'from');

                expect(fromHeaders).to.have.length(1);
                expect(fromHeaders[0]).to.equal('Chuck Norris <from@open-paas.org>');

                process.nextTick(function() {
                  TimelineEntry.find({}, function(err, results) {
                    expect(results).to.exist;
                    expect(results.length).to.equal(1);
                    expect(results[0].verb).to.equal('post');
                    expect(results[0].target).to.exist;
                    expect(results[0].target.length).to.equal(1);
                    expect(results[0].target[0].objectType).to.equal('activitystream');
                    expect(results[0].target[0]._id).to.equal(collaboration.activity_stream.uuid);
                    expect(results[0].object).to.exist;
                    expect(results[0].object.objectType).to.equal('email');
                    expect(results[0].object.id).to.equal(res.body._id);
                    expect(results[0].actor).to.exist;
                    expect(results[0].actor.objectType).to.equal('user');
                    expect(results[0].actor.id).to.equal(user.id);
                    done();
                  });
                });
              });
            });
          });
        }],
        function(err) {
          done(err);
        }
      );
    });

    it('should create email in messages from incoming eml (text+html eml)', function(done) {
      const self = this;
      let collaboration = { title: 'node.js' };

      async.series([
        function(callback) {
          saveCollabration(collaboration, function(err, saved) {
            if (err) {
              return callback(err);
            }
            collaboration = saved;

            return callback();
          });
        },
        function() {
          self.helpers.api.loginAsUser(webserver.application, email, password, function(err, loggedInAsUser) {
            if (err) {
              return done(err);
            }

            const file = self.testEnv.fixtures + '/emails/textandhtml.eml';
            const email = fs.readFileSync(file, 'utf8');
            const req = loggedInAsUser(request(webserver.application).post('/api/messages/email'));

            req.query({ objectType: 'activitystream', id: collaboration.activity_stream.uuid });
            req.set('Content-Type', 'message/rfc822');
            req.send(email);
            req.expect(201);
            req.end(function(err, res) {
              expect(err).to.not.exist;
              expect(res.body).to.exist;
              EMailMsg.find(function(err, result) {
                if (err) {
                  return done(err);
                }

                function findHeader(doc, name) {
                  const headers = doc.headers.filter(function(h) {
                    return (h[0] === name);
                  }).map(function(h) {
                    return h[1];
                  });

                  return headers;
                }

                expect(result).to.exist;
                expect(result.length).to.equal(1);
                expect(result[0].objectType).to.equal('email');
                expect(result[0].shares).to.exist;
                expect(result[0].shares.length).to.equal(1);
                expect(result[0].shares[0].objectType).to.equal('activitystream');
                expect(result[0].shares[0].id).to.equal(collaboration.activity_stream.uuid);
                expect(result[0].body.text).to.equal('Hello,\n\nSeems complete to me...\n\nExcept that the \'actions\' fields is an array containing one or more URLs.\nSo I think that the \'acknowledged\' fieId corresponding to these actions being triggered is not enough, because we can only remember that 1 action has been chosen by the user.\nIf all actions are mutually exclusive, it\'s ok.\nBut if more than one action can be triggered I think that the \'acknowledged\' field should be moved as a field of an action.\n\n\nLe 22/09/2014 18:09, Michael Bailly a ï¿½crit :\n> Hi,\n>\n> I posted a refine of the proposal on jira : > https://ci.open-paas.org/jira/browse/OR-552?focusedCommentId=11014&page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-11014\n>\n> The main things I added are the target, parentId, read & acknowledged > fields.\n>\n> WDYT ?\n>\n\n-- \nSignature\nGraham CROSMARIE\nR&D Engineer\nLinagora GSO ï¿½ www.linagora.com <http://www.linagora.com>\n');
                expect(result[0].body.html).to.equal('<html>\n  <head>\n    <meta http-equiv="content-type" content="text/html; charset=utf-8" />\n  </head>\n  <body bgcolor="#FFFFFF" text="#000000">\n    Hello,<br>\n    <br>\n    Seems complete to me...<br>\n    <br>\n    Except that the \'actions\' fields is an array containing one or more\n    URLs.<br>\n    So I think that the \'acknowledged\' fieId corresponding to these\n    actions being triggered is not enough, because we can only remember\n    that 1 action has been chosen by the user.<br>\n    If all actions are mutually exclusive, it\'s ok.<br>\n    But if more than one action can be triggered I think that the\n    \'acknowledged\' field should be moved as a field of an action.<br>\n    <br>\n    <br>\n    <div class="moz-cite-prefix">Le 22/09/2014 18:09, Michael Bailly a\n      ï¿½critï¿½:<br>\n    </div>\n    <blockquote cite="mid:542049D1.1080504@linagora.com" type="cite">Hi,\n      <br>\n      <br>\n      I posted a refine of the proposal on jira :\n<a class="moz-txt-link-freetext" href="https://ci.open-paas.org/jira/browse/OR-552?focusedCommentId=11014&amp;page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-11014">https://ci.open-paas.org/jira/browse/OR-552?focusedCommentId=11014&amp;page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-11014</a><br>\n      <br>\n      The main things I added are the target, parentId, read &amp;\n      acknowledged fields.\n      <br>\n      <br>\n      WDYT ?\n      <br>\n      <br>\n    </blockquote>\n    <br>\n    <div class="moz-signature">-- <br>\n      <meta http-equiv="content-type" content="text/html; charset=utf-8" />\n      <title>Signature</title>\n      <style type="text/css">\n\n</style>\n      <div id="container">\n        <div id="mainContent"> Graham CROSMARIE<br>\n          R&amp;D Engineer<br>\n          Linagora GSO ï¿½ <a href="http://www.linagora.com">www.linagora.com</a><br>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>\n');

                const subjectHeaders = findHeader(result[0], 'subject');

                expect(subjectHeaders).to.have.length(1);
                expect(subjectHeaders[0]).to.equal('Re: User notification data model proposal 2');

                const toHeaders = findHeader(result[0], 'to');

                expect(toHeaders).to.have.length(1);
                expect(toHeaders[0]).to.equal('Michael Bailly <mbailly@linagora.com>, Laurent DUBOIS <ldubois@linagora.com>, Christophe HAMERLING <chamerling@linagora.com>, Stephen LE MAISTRE <slemaistre@linagora.com>, Romain PIGNOLET <rpignolet@linagora.com>, Philipp KEWISCH <pkewisch@linagora.com>');

                const fromHeaders = findHeader(result[0], 'from');

                expect(fromHeaders).to.have.length(1);
                expect(fromHeaders[0]).to.equal('Graham Crosmarie <gcrosmarie@linagora.com>');

                process.nextTick(function() {
                  TimelineEntry.find({}, function(err, results) {
                    expect(results).to.exist;
                    expect(results.length).to.equal(1);
                    expect(results[0].verb).to.equal('post');
                    expect(results[0].target).to.exist;
                    expect(results[0].target.length).to.equal(1);
                    expect(results[0].target[0].objectType).to.equal('activitystream');
                    expect(results[0].target[0]._id).to.equal(collaboration.activity_stream.uuid);
                    expect(results[0].object).to.exist;
                    expect(results[0].object.objectType).to.equal('email');
                    expect(results[0].object.id).to.equal(res.body._id);
                    expect(results[0].actor).to.exist;
                    expect(results[0].actor.objectType).to.equal('user');
                    expect(results[0].actor.id).to.equal(user.id);
                    done();
                  });
                });
              });
            });
          });
        }],
        function(err) {
          done(err);
        }
      );
    });

    it('should create email in messages from incoming eml (outlook 2010)', function(done) {
      const self = this;
      let collaboration = {title: 'node.js'};

      async.series([
        function(callback) {
          saveCollabration(collaboration, function(err, saved) {
            if (err) {
              return callback(err);
            }
            collaboration = saved;

            return callback();
          });
        },
        function() {
          self.helpers.api.loginAsUser(webserver.application, email, password, function(err, loggedInAsUser) {
            if (err) {
              return done(err);
            }

            const file = self.testEnv.fixtures + '/emails/outlook2010.eml';
            const email = fs.readFileSync(file, 'utf8');
            const req = loggedInAsUser(request(webserver.application).post('/api/messages/email'));

            req.query({ objectType: 'activitystream', id: collaboration.activity_stream.uuid });
            req.set('Content-Type', 'message/rfc822');
            req.send(email);
            req.expect(201);
            req.end(function(err, res) {
              expect(err).to.not.exist;
              expect(res.body).to.exist;
              EMailMsg.find(function(err, result) {
                if (err) {
                  return done(err);
                }

                function findHeader(doc, name) {
                  const headers = doc.headers.filter(function(h) {
                    return (h[0] === name);
                  }).map(function(h) {
                    return h[1];
                  });

                  return headers;
                }

                expect(result).to.exist;
                expect(result.length).to.equal(1);
                expect(result[0].objectType).to.equal('email');
                expect(result[0].shares).to.exist;
                expect(result[0].shares.length).to.equal(1);
                expect(result[0].shares[0].objectType).to.equal('activitystream');
                expect(result[0].shares[0].id).to.equal(collaboration.activity_stream.uuid);

                const subjectHeaders = findHeader(result[0], 'subject');

                expect(subjectHeaders).to.have.length(1);
                expect(subjectHeaders[0]).to.equal('test');
                expect(result[0].body.text).to.equal('test\n\n');
                expect(result[0].body.html).to.match(/>test<o:p><\/o:p><\/span><\/p><\/div><\/body><\/html>/);

                const toHeaders = findHeader(result[0], 'to');

                expect(toHeaders).to.have.length(1);
                expect(toHeaders[0]).to.equal('<mbailly@linagora.com>, <slemaistre@linagora.com>');

                const fromHeaders = findHeader(result[0], 'from');

                expect(fromHeaders).to.have.length(1);
                expect(fromHeaders[0]).to.equal('"Choura Sleh" <schoura@linagora.com>');

                expect(result[0].attachments).to.exist;
                expect(result[0].attachments.length).to.equal(1);

                const attachment = result[0].attachments[0];

                expect(attachment.contentType).to.equal('image/png');
                expect(attachment.name).to.equal('default_profile.png');
                expect(attachment.length).to.equal(634);
                expect(attachment._id).to.exist;

                process.nextTick(function() {
                  TimelineEntry.find({}, function(err, results) {
                    expect(results).to.exist;
                    expect(results.length).to.equal(1);
                    expect(results[0].verb).to.equal('post');
                    expect(results[0].target).to.exist;
                    expect(results[0].target.length).to.equal(1);
                    expect(results[0].target[0].objectType).to.equal('activitystream');
                    expect(results[0].target[0]._id).to.equal(collaboration.activity_stream.uuid);
                    expect(results[0].object).to.exist;
                    expect(results[0].object.objectType).to.equal('email');
                    expect(results[0].object.id).to.equal(res.body._id);
                    expect(results[0].actor).to.exist;
                    expect(results[0].actor.objectType).to.equal('user');
                    expect(results[0].actor.id).to.equal(user.id);
                    done();
                  });
                });
              });
            });
          });
        }],
        function(err) {
          done(err);
        }
      );
    });

    it('should send back 400 is stream is not found', function(done) {
      const self = this;

      async.series([
        function(callback) {
          saveCollabration({ title: 'Node.js' }, callback);
        },
        function() {
          self.helpers.api.loginAsUser(webserver.application, email, password, function(err, loggedInAsUser) {
            if (err) {
              return done(err);
            }

            const file = self.testEnv.fixtures + '/emails/simple.eml';
            const email = fs.readFileSync(file, 'utf8');
            const req = loggedInAsUser(request(webserver.application).post('/api/messages/email'));

            req.query({ objectType: 'activitystream', id: '123' });
            req.set('Content-Type', 'message/rfc822');
            req.send(email);
            req.expect(400);
            req.end(function(err) {
              expect(err).to.not.exist;
              done();
            });
          });
        }],
        function(err) {
          done(err);
        }
      );
    });
  });
});
