'use strict';

var expect = require('chai').expect;

describe('The user domain module', function() {

  function checkIndexResult(res) {
    return res.status === 200 && res.body.hits.total === 1 && res.body.hits.hits[0]._source.domains && res.body.hits.hits[0]._source.domains.length === 1;
  }

  before(function() {
    this.testEnv.writeDBConfigFile();
  });

  after(function() {
    this.testEnv.removeDBConfigFile();
  });

  describe('Basics tests (list users)', function() {
    beforeEach(function(done) {
      var self = this;
      this.mongoose = require('mongoose');
      this.connectMongoose(this.mongoose, function(err) {
        if (err) {
          done(err);
        }

        self.helpers.elasticsearch.saveTestConfiguration(function(err) {
          if (err) {
            return done(err);
          }
          self.User = self.helpers.requireBackend('core/db/mongo/models/user');
          self.Domain = self.helpers.requireBackend('core/db/mongo/models/domain');
          // self.helpers.requireBackend('core/db/mongo/models/community');
          // self.helpers.requireBackend('core/db/mongo/models/community-archive');
          done(err);
        });
      });
    });

    afterEach(function(done) {
      this.helpers.mongo.dropDatabase(done);
    });

    it('should return users which belong to the given domain when calling getUsersList', function(done) {
      var userFixtures = this.helpers.requireFixture('models/users.js')(this.User);
      var userDomain = this.helpers.requireBackend('core/user/domain');

      this.helpers.api.applyDomainDeployment('linagora_test_domain', function(err, models) {
        if (err) { return done(err); }

        var userWithoutDomain = userFixtures.newDummyUser(['foo@bar.com']);
        userWithoutDomain.save(function(err) {
          if (err) { done(err); }

          userDomain.getUsersList([models.domain], undefined, function(err, users) {
            expect(err).to.not.exist;
            expect(users).to.exist;
            expect(users.list.length).to.equal(4);
            done();
          });
        });
      });
    });

    it('should return an array where limit === size when calling getUsersList with limit option', function(done) {
      var userDomain = this.helpers.requireBackend('core/user/domain');

      this.helpers.api.applyDomainDeployment('linagora_test_domain', function(err, models) {
        if (err) { return done(err); }

        userDomain.getUsersList([models.domain], {limit: 2}, function(err, users) {
          expect(err).to.not.exist;
          expect(users).to.exist;
          expect(users.list.length).to.equal(2);
          done();
        });
      });
    });

    it('should return an array which contains the last 2 elements when calling getUsersList with offset option = 2 on domain members = 4', function(done) {
      var userDomain = this.helpers.requireBackend('core/user/domain');

      this.helpers.api.applyDomainDeployment('linagora_test_domain', function(err, models) {
        if (err) { return done(err); }

        userDomain.getUsersList([models.domain], {offset: 2}, function(err, users) {
          expect(err).to.not.exist;
          expect(users).to.exist;
          expect(users.list.length).to.equal(2);

          expect(users.list[0]._id).to.deep.equals(models.users[2]._id);
          expect(users.list[1]._id).to.deep.equals(models.users[3]._id);
          done();
        });
      });
    });

    it('should return the users which belong to a domain and which contain the search term', function(done) {
      var userDomain = this.helpers.requireBackend('core/user/domain');
      var self = this;

      this.helpers.api.applyDomainDeployment('linagora_test_domain', function(err, models) {
        if (err) { return done(err); }

        var ids = models.users.map(function(element) {
          return element._id;
        });

        self.helpers.elasticsearch.checkUsersDocumentsFullyIndexed(ids, checkIndexResult, function(err) {
          if (err) { return done(err); }

          userDomain.getUsersSearch([models.domain], {search: 'lng'}, function(err, users) {
            expect(err).to.not.exist;
            expect(users).to.exist;
            expect(users.list.length).to.equal(3);
            expect(users.list[0]._id).to.deep.equals(models.users[0]._id.toString());
            expect(users.list[1]._id).to.deep.equals(models.users[1]._id.toString());
            expect(users.list[2]._id).to.deep.equals(models.users[2]._id.toString());
            done();
          });
        });
      });
    });

    it('should return an error when calling getUsersList with a undefined domain', function(done) {
      var userDomain = this.helpers.requireBackend('core/user/domain');

      userDomain.getUsersList(undefined, undefined, function(err) {
        expect(err).to.exist;
        done();
      });
    });
  });

  describe('Tests cases (search users)', function() {
    var domain;

    var userDomain;

    var delphine;
    var philippe;

    before(function(done) {

      var self = this;
      this.mongoose = require('mongoose');
      this.connectMongoose(this.mongoose, function(err) {
        if (err) { done(err); }

        self.helpers.elasticsearch.saveTestConfiguration(function(err) {
          if (err) { return done(err); }

          self.helpers.api.applyDomainDeployment('linagora_test_cases', function(err, models) {
            if (err) { return done(err); }

            domain = models.domain;
            delphine = models.users[0];
            philippe = models.users[1];

            var ids = models.users.map(function(element) {
              return element._id;
            });
            self.helpers.elasticsearch.checkUsersDocumentsFullyIndexed(ids, checkIndexResult, function(err) {
              if (err) { return done(err); }
              self.mongoose.disconnect(done);
            });
          });
        });
      });
    });

    after(function(done) {
      this.helpers.mongo.dropDatabase(done);
    });

    beforeEach(function(done) {
      this.helpers.requireBackend('core/db/mongo/models/user');
      this.helpers.requireBackend('core/db/mongo/models/domain');
      userDomain = this.helpers.requireBackend('core/user/domain');

      this.mongoose = require('mongoose');
      this.connectMongoose(this.mongoose, done);
    });

    afterEach(function(done) {
      this.mongoose.disconnect(done);
    });

    it('should return only Delphine with request "Delp"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'Delp'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(delphine._id.toString());
        done();
      });
    });

    it('should return only Philippe with request "faso"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'faso'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(philippe._id.toString());
        done();
      });
    });

    it('should return only Delphine with request "yrel"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'yrel'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(delphine._id.toString());
        done();
      });
    });

    it('should return nothing with request "deckard"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'deckard'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(0);
        done();
      });
    });

    it('should return nothing with request "Rachel Mifasol"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'Rachel Mifasol'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(0);
        done();
      });
    });

    it('should return nothing with request "Delphine interne.com"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'Delphine interne.com'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(0);
        done();
      });
    });

    it('should return Delphine and Philippe with request "phi"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'phi'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(2);
        expect(users.list[0]._id).to.deep.equals(delphine._id.toString());
        expect(users.list[1]._id).to.deep.equals(philippe._id.toString());
        done();
      });
    });

    it('should return Delphine and Philippe with request "mi"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'mi'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(2);
        expect(users.list[0]._id).to.deep.equals(delphine._id.toString());
        expect(users.list[1]._id).to.deep.equals(philippe._id.toString());
        done();
      });
    });

    it('should return Delphine and Philippe with request "linagora"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'linagora'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(2);
        expect(users.list[0]._id).to.deep.equals(delphine._id.toString());
        expect(users.list[1]._id).to.deep.equals(philippe._id.toString());
        done();
      });
    });

    it('should return only Delphine with request "Delphine Doremi tyrell@linagora.fr"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'Delphine Doremi tyrell@linagora.fr'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(delphine._id.toString());
        done();
      });
    });

    it('should return only Delphine with request "Delphine Delphine Doremi"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'Delphine Delphine Doremi'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(delphine._id.toString());
        done();
      });
    });

    it('should return only Delphine with request "emi lin elp"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'emi lin elp'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(delphine._id.toString());
        done();
      });
    });

    it('should return only Delphine with request "Rémi"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'Rémi'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(delphine._id.toString());
        done();
      });
    });

    it('should return only Philippe with request "atty@li"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'atty@li'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(philippe._id.toString());
        done();
      });
    });

    it('should return only Delphine with request "DOREM"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'DOREM'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(delphine._id.toString());
        done();
      });
    });

    it('should return Delphine and Philippe with empty request', function(done) {

      userDomain.getUsersList([domain], undefined, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(2);
        expect(users.list[0]._id.toString()).to.deep.equals(delphine._id.toString());
        expect(users.list[1]._id.toString()).to.deep.equals(philippe._id.toString());
        done();
      });
    });

  });

  describe('Tests cases extra (search users)', function() {
    var domain;

    var userDomain;

    var user;

    before(function(done) {

      var self = this;
      this.mongoose = require('mongoose');
      this.connectMongoose(this.mongoose, function(err) {
        if (err) { done(err); }

        self.helpers.elasticsearch.saveTestConfiguration(function(err) {
          if (err) { return done(err); }

          userDomain = self.helpers.requireBackend('core/user/domain');

          self.helpers.api.applyDomainDeployment('linagora_test_cases_extra', function(err, models) {
            if (err) { return done(err); }

            domain = models.domain;
            user = models.users[0];

            self.helpers.elasticsearch.checkUsersDocumentsFullyIndexed([user._id], checkIndexResult, function(err) {
              if (err) { return done(err); }
              self.mongoose.disconnect(done);
            });
          });
        });
      });
    });

    after(function(done) {
      this.helpers.mongo.dropDatabase(done);
    });

    beforeEach(function(done) {
      this.mongoose = require('mongoose');
      this.connectMongoose(this.mongoose, done);
    });

    afterEach(function(done) {
      this.mongoose.disconnect(done);
    });

    it('should return the user with request "eeeeaaaaiic"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'eeeeaaaaiic'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(user._id.toString());
        done();
      });
    });

    it('should return the user with request "éèêëaàâäïîç"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'éèêëaàâäïîç'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(user._id.toString());
        done();
      });
    });

    it('should return the user with request "EEEEAAAAIIC"', function(done) {

      userDomain.getUsersSearch([domain], {search: 'EEEEAAAAIIC'}, function(err, users) {
        expect(err).to.not.exist;
        expect(users).to.exist;
        expect(users.list.length).to.equal(1);
        expect(users.list[0]._id).to.deep.equals(user._id.toString());
        done();
      });
    });

  });

  describe('Community tests', function() {
    let Collaboration;
    let domain;
    let domain2;
    let collaboration;

    let userDomain;

    let user1;
    let user2;
    let user3;
    let user4;

    let user12;
    let user22;
    let user32;
    let user42;

    before(function(done) {
      const self = this;

      this.mongoose = require('mongoose');
      this.connectMongoose(this.mongoose, function(err) {
        if (err) {
          done(err);
        }

        self.helpers.elasticsearch.saveTestConfiguration(function(err) {
          if (err) { return done(err); }

          Collaboration = require('../../../fixtures/db/mongo/models/collaboration');

          self.helpers.api.applyDomainDeployment('linagora_test_domain', function(err, models) {
            if (err) {
              return done(err);
            }

            domain = models.domain;
            user1 = models.users[0];
            user2 = models.users[1];
            user3 = models.users[2];
            user4 = models.users[3];

            self.helpers.api.applyDomainDeployment('linagora_test_domain2', function(err, models2) {
              if (err) {
                return done(err);
              }

              domain2 = models2.domain;
              user12 = models2.users[0];
              user22 = models2.users[1];
              user32 = models2.users[2];
              user42 = models2.users[3];

              self.helpers.api.createCollaboration('Collaboration', user1, domain, function(err, collaborationSaved) {
                if (err) {
                  return done(err);
                }

                Collaboration.update({ _id: collaborationSaved._id }, { $push: { domain_ids: domain2._id } }, function(err) {
                  if (err) {
                    return done(err);
                  }

                  self.helpers.api.addUsersInCollaboration(collaborationSaved, [user2, user3, user22], function(err, collaborationUpdated) {
                    if (err) {
                      return done(err);
                    }
                    collaboration = collaborationUpdated;
                    const ids = models.users.map(function(user) {
                      return user._id;
                    });

                    models2.users.forEach(function(user) {
                      ids.push(user._id);
                    });
                    self.helpers.elasticsearch.checkUsersDocumentsFullyIndexed(ids, checkIndexResult, function(err) {
                      if (err) {
                        return done(err);
                      }
                      self.mongoose.disconnect(done);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    after(function(done) {
      this.helpers.mongo.dropDatabase(done);
    });

    beforeEach(function(done) {
      this.helpers.requireBackend('core/db/mongo/models/user');
      this.helpers.requireBackend('core/db/mongo/models/domain');
      userDomain = this.helpers.requireBackend('core/user/domain');
      // Community = this.helpers.requireBackend('core/db/mongo/models/community');
      Collaboration = require('../../../fixtures/db/mongo/models/collaboration');

      this.mongoose = require('mongoose');
      this.connectMongoose(this.mongoose, done);
    });

    afterEach(function(done) {
      this.mongoose.disconnect(done);
    });

    describe('list users', function() {
      it('should return users in the two domains and not in the community', function(done) {
        userDomain.getUsersList([domain, domain2], { not_in_collaboration: collaboration }, function(err, users) {
          if (err) {
            return done(err);
          }
          expect(err).to.not.exist;
          expect(users).to.exist;
          expect(users.list).to.have.length(4);
          expect(users.total_count).to.equal(4);
          expect(users.list[0]._id.toString()).to.deep.equals(user12._id.toString());
          expect(users.list[1]._id.toString()).to.deep.equals(user32._id.toString());
          expect(users.list[2]._id.toString()).to.deep.equals(user4._id.toString());
          expect(users.list[3]._id.toString()).to.deep.equals(user42._id.toString());
          done();
        });
      });

      it('should return users in the two domains, not in the community and no pending membership', function(done) {
        Collaboration.update({ _id: collaboration._id }, { $push: { membershipRequests: { user: user12._id } } }, function(err) {
          if (err) {
            return done(err);
          }
          collaboration.membershipRequests.push({ user: user12._id });
          userDomain.getUsersList([domain, domain2], { not_in_collaboration: collaboration }, function(err, users) {
            if (err) {
              return done(err);
            }
            expect(err).to.not.exist;
            expect(users).to.exist;
            expect(users.list).to.have.length(3);
            expect(users.total_count).to.equal(3);
            expect(users.list[0]._id.toString()).to.deep.equals(user32._id.toString());
            expect(users.list[1]._id.toString()).to.deep.equals(user4._id.toString());
            expect(users.list[2]._id.toString()).to.deep.equals(user42._id.toString());
            done();
          });
        });
      });
    });

    describe('search users', function() {
      it('should return users in the two domains, not in the community and matching with search terms', function(done) {
        userDomain.getUsersSearch([domain, domain2], { search: 'linagora', not_in_collaboration: collaboration }, function(err, users) {
          if (err) {
            return done(err);
          }
          expect(err).to.not.exist;
          expect(users).to.exist;
          expect(users.list).to.have.length(2);
          expect(users.total_count).to.equal(2);
          expect(users.list[0]._id).to.deep.equals(user4._id.toString());
          expect(users.list[1]._id).to.deep.equals(user42._id.toString());
          done();
        });
      });

      it('should return users in the two domains, not in the community, no pending membership and ' +
      'matching with search terms', function(done) {
        Collaboration.update({ _id: collaboration._id }, { $push: { membershipRequests: { user: user4._id } } }, function(err) {
          if (err) {
            return done(err);
          }
          collaboration.membershipRequests.push({ user: user4._id });
          userDomain.getUsersSearch([domain, domain2], { search: 'linagora', not_in_collaboration: collaboration }, function(err, users) {
            if (err) {
              return done(err);
            }
            expect(err).to.not.exist;
            expect(users).to.exist;
            expect(users.list).to.have.length(1);
            expect(users.total_count).to.equal(1);
            expect(users.list[0]._id).to.deep.equals(user42._id.toString());
            done();
          });
        });
      });
    });
  });
});
