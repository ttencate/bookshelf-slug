'use strict';
let chai = require('chai');
let expect = chai.expect;
let Post = require('./database/models/Post');
let User = require('./database/models/User');
let knex = require('./database').knex;
let bookshelf = require('./database').bookshelf;
let Promise = require('bluebird');

describe('bookshelf-slug', () => {
  let postId;
  let userId;
  before((done) => {
    knex.raw("delete from post")
      .then(() => knex.raw("delete from user"))
      .then(model => done())
      .catch(err => done(err));
  })
  it('should create a post with a unique slug, with default column name: slug', (done) => {
    new Post({
      user_id: 1,
      title: 'Fancy cats with hats',
      description: 'This is a funny post about cats with hats',
      content: 'Long content',
      posted_on: new Date(),
      updated_on: new Date()
    })
    .save()
    .then(function(model) {
      postId = model.get('id')
      expect(model.get('slug')).to.equal('fancy-cats-with-hats-this-is-a-funny-post-about-cats-with-hats')
      done();
    }).catch(err => done(err))

  });

  it('should update a existing post with a unique slug, with default column name: slug', (done) => {
    Post.forge({id: postId})
      .save({
        description: 'Post with pictures of dogs'
      })
      .then(model => {
        expect(model.get('slug')).to.equal('fancy-cats-with-hats-post-with-pictures-of-dogs')
        done();
      })
  });

  it('should create a new user with a unique slug, with specified column name: uniqueName', done => {
    User.forge({
      firstName: 'Donald',
      lastName: 'Duck',
      nickName: 'The duck',
      dob: new Date()
    })
    .save()
    .then(model => {
      expect(model.get('uniqueName')).to.equal('donald-duck-the-duck');
      userId = model.get('id')
      done();
    })
  });

  it('should update a existing user with a unique slug, with specified column name: uniqueName', (done) => {
    User.forge({id: userId})
      .save({
        firstName: 'Dolan'
      })
      .then(model => {
        expect(model.get('uniqueName')).to.equal('dolan-duck-the-duck')
        done();
      })
  });
  it('should create a unique slug with existing slug sources', function(done){
    User.forge({
      firstName: 'Dolan',
      lastName: 'Duck',
      nickName: 'The duck',
      dob: new Date()
    })
      .save()
      .then(model => {
        expect(model.get('uniqueName')).to.not.equal('dolan-duck-the-duck');
        done();
      })
  });

  let posts = [{
    title: 'Rediscover New York ',
    description: 'Dive deep into the unkown parts of New York',
    content: 'Long content'
  }, {
    title: 'Hiking through Europe',
    description: 'Hiking through Europe',
    content: 'Europe content bla'
  }, {
    title: 'Walking dead season 7 reveal',
    description: 'Previously on the walking dead',
    content: 'walking dead content'
  }]

  it('should work with transactions', function(done) {
    bookshelf.transaction((t) => {
      return User.forge({
        firstName: 'Theodore',
        lastName: 'Douglas',
        nickName: 'One true god',
        dob: new Date()
      })
      .save(null, {transacting: t})
      .tap(model => {
        expect(model.get('uniqueName')).to.equal('theodore-douglas-one-true-god')
        return Promise.map(posts, (post) => {
          return Post.forge(post).save({'user_id': model.get('id')}, {transacting: t})
        })
      })
    }).then(model => {
      return model
        .related('post')
        .fetch()
        .then(function(posts) {
          posts = posts.pluck('slug');
          expect(posts).to.include('rediscover-new-york-dive-deep-into-the-unkown-parts-of-new-york');
          expect(posts).to.include('hiking-through-europe-hiking-through-europe');
          expect(posts).to.include('walking-dead-season-7-reveal-previously-on-the-walking-dead');
          done();
        })
    })
  });

});
