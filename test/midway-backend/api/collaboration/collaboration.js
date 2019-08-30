'use strict';

const expect = require('chai').expect;
const request = require('supertest');
const async = require('async');

describe('The collaborations API', function() {
  let webserver;

  beforeEach(function(done) {
    const self = this;

    this.mongoose = require('mongoose');
    this.testEnv.initCore(function() {
      webserver = self.helpers.requireBackend('webserver').webserver;
      done();
    });
    require('../../../fixtures/db/mongo/models/collaboration');
    const collaborationModule = require('../../../../backend/core/collaboration');
    const collaborationModuleTest = require('../../../fixtures/backend/collaboration');
    const objectType = 'collaboration';

    collaborationModule.registerCollaborationLib(objectType, collaborationModuleTest);
    collaborationModule.registerCollaborationModel(objectType, 'Collaboration');
  });

  afterEach(function(done) {
    this.helpers.mongo.dropDatabase(done);
  });

  describe('GET /api/collaborations/membersearch', function() {

    beforeEach(function(done) {
      const self = this;

      this.helpers.api.applyDomainDeployment('collaborationMembers', function(err, models) {
        if (err) { return done(err); }
        self.domain = models.domain;
        self.user = models.users[0];
        self.user2 = models.users[1];
        self.user3 = models.users[2];
        self.models = models;
        done();
      });
    });

    afterEach(function(done) {
      const self = this;

      self.helpers.api.cleanDomainDeployment(self.models, done);
    });

    it('should 401 when not logged in', function(done) {
      this.helpers.api.requireLogin(webserver.application, 'get', '/api/collaborations/membersearch?objectType=user&id=123456789', done);
    });

    it('should 400 when req.query.objectType is not set', function(done) {
      const self = this;

      self.helpers.api.loginAsUser(webserver.application, this.user2.emails[0], 'secret', function(err, loggedInAsUser) {
        if (err) { return done(err); }

        const req = loggedInAsUser(request(webserver.application).get('/api/collaborations/membersearch?id=' + self.user3._id));

        req.expect(400);
        done();
      });
    });

    it('should 400 when req.query.id is not set', function(done) {
      const self = this;

      self.helpers.api.loginAsUser(webserver.application, this.user2.emails[0], 'secret', function(err, loggedInAsUser) {
        if (err) { return done(err); }

        const req = loggedInAsUser(request(webserver.application).get('/api/collaborations/membersearch?objectType=collaboration'));

        req.expect(400);
        done();
      });
    });

    it('should find all the collaborations where the given tuple is a member of', function(done) {
      const self = this;
      const tuple = {
        objectType: 'email',
        id: 'alice@email.com'
      };

      self.helpers.api.addMembersInCollaboration(self.models.communities[1], [tuple], err => {
        if (err) {
          return done(err);
        }

        self.helpers.api.loginAsUser(webserver.application, self.user.emails[0], 'secret', (err, loggedInAsUser) => {
          if (err) { return done(err); }

          const req = loggedInAsUser(
            request(webserver.application)
              .get(`/api/collaborations/membersearch?objectType=${tuple.objectType}&id=${tuple.id}`)
          );

          req.expect(200);
          req.end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(1);
            expect(res.body[0]._id).to.equal(self.models.communities[1].id);
            done();
          });
        });
      });
    });

    it('should find all the visible collaborations where the given tuple is a member of', function(done) {
      const self = this;
      const aliceTuple = {
        objectType: 'email',
        id: 'alice@email.com'
      };
      const tuples = [aliceTuple];

      function test() {
        self.helpers.api.loginAsUser(webserver.application, self.models.users[3].emails[0], 'secret', (err, loggedInAsUser) => {
          if (err) { return done(err); }

          const req = loggedInAsUser(request(webserver.application).get(`/api/collaborations/membersearch?objectType=${aliceTuple.objectType}&id=${aliceTuple.id}`));

          req.expect(200);
          req.end((err, res) => {
            expect(err).to.not.exist;
            expect(res.body).to.exist;
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(1);
            expect(res.body[0]._id).to.equal(self.models.communities[2].id);
            done();
          });
        });
      }

      async.parallel([
        callback => self.helpers.api.addMembersInCollaboration(self.models.communities[1], tuples, callback),
        callback => self.helpers.api.addMembersInCollaboration(self.models.communities[2], tuples, callback)
      ], err => {
        if (err) {
          return done(err);
        }

        return test();
      });
    });
  });

  describe('GET /api/collaborations/writable', function() {

    beforeEach(function(done) {
      const self = this;

      this.helpers.api.applyDomainDeployment('openAndPrivateCommunities', function(err, models) {
        if (err) { return done(err); }
        self.models = models;
        const jobs = models.users.map(function(user) {
          return function(done) {
            user.domains.push({ domain_id: self.models.domain._id });
            user.save(done);
          };
        });

        async.parallel(jobs, done);
      });
    });

    it('should return 401 if user is not authenticated', function(done) {
      this.helpers.api.requireLogin(webserver.application, 'get', '/api/collaborations/writable', done);
    });

    it('should return the list of collaborations the user can write into', function(done) {
      const self = this;
      const correctIds = [self.models.communities[0].id, self.models.communities[1].id, self.models.communities[3].id];

      self.helpers.api.loginAsUser(webserver.application, self.models.users[2].emails[0], 'secret', function(err, loggedInAsUser) {
        if (err) {
          return done(err);
        }
        const req = loggedInAsUser(request(webserver.application).get('/api/collaborations/writable'));

        req.expect(200);
        req.end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.be.an.array;
          expect(res.body).to.have.length(correctIds.length);
          res.body.forEach(function(returnedCollaboration) {
            expect(correctIds).to.contain(returnedCollaboration._id);
          });
          done();
        });
      });
    });
  });
});
