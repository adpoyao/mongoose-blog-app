'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {Blog} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function generateBlogData(){
  return {
    title: faker.random.word(),
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    content: faker.random.words()
  };
}

function seedBlogData() {
  console.info('seeding blog data');
  const seedData = [];
  for(let i=1; i<=10; i++){
    seedData.push(generateBlogData());
  }
  return Blog.insertMany(seedData);
}

function tearDownDb() {
  console.info('tearing down blog data');
  return mongoose.connection.dropDatabase();
}

describe('Blog-App API resource', function() {
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return tearDownDb()
      .then(() => {
        return seedBlogData();
      });
  });

  afterEach(function() {
    // return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {
    it('should return all existing blog posts', function() {
      // strategy:
      // 1. Get back all blog posts by GET request to '/blogs'
      // 2. Res should have correct status (200) and datatype (array of object)
      // 3. # of blogs should be same between res and db
      let res;
      return chai.request(app)
        .get('/blogs')
        .then(function(_res){
          res = _res;
          res.should.have.status(200);
          res.should.be.json;          
          res.body.blogs.should.be.a('array');
          res.body.blogs.should.have.lengthOf.at.least(1);
          return Blog.count();
        })
        .then(function(numInDb){
          res.body.blogs.should.have.lengthOf(numInDb);
        });
    });

    it('should return specified or all blogs with correct fields', function() {
      //strategy:
      //1. Get back all blog posts by GET requests to '/blogs'
      //2. Ensure expected keys
      let resBlog;
      return chai.request(app)
        .get('/blogs')
        .then(function(res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.blogs.should.be.a('array');          
          res.body.blogs.should.have.length.of.at.least(1);
          res.body.blogs.forEach(function(blog) {
            blog.should.be.a('object');
            blog.should.include.keys(
              'id', 'title', 'author', 'created');
          });
          resBlog = res.body.blogs[0];
          return Blog.findById(resBlog.id);
        })
        .then(function(blog) { 
          resBlog.id.should.equal(blog.id);
          resBlog.title.should.equal(blog.title);
          resBlog.author.should.equal(blog.fullName);
          // let test = blog.fullName;
          // blog.fullName = test;
          // console.log('===blog.author.firstName2', blog.author.firstName2);
          // console.log('===blog.author.lastName2', blog.author.lastName2);     
          // console.log('===blog.author', blog.author);   
          resBlog.created.should.equal(blog.created.toISOString());
        });
    });
  });

  describe('POST endpoint', function() {
    // Strategy: 
    // Create a POST request with generated Data
    // Verify response with right keys and check for ID
    // Verify response with submitted Data
    it('should add a new blog', function() {
      const newBlog = generateBlogData();
      return chai.request(app)
        .post('/blogs')
        .send(newBlog)
        .then(function(res) {
          newBlog.id = res.body.id;
          newBlog.created = res.body.created;
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'id', 'title', 'author', 'content', 'created');
          res.body.id.should.not.be.null;
          res.body.created.should.not.be.null;            
          res.body.title.should.equal(newBlog.title);
          res.body.author.should.equal(`${newBlog.author.firstName} ${newBlog.author.lastName}`);
          res.body.content.should.equal(newBlog.content);
          return Blog.findById(res.body.id);
        })
        .then(function(blog) {
          newBlog.id.should.equal(blog.id);
          newBlog.title.should.equal(blog.title);
          `${newBlog.author.firstName} ${newBlog.author.lastName}`.should.equal(blog.fullName);
          newBlog.content.should.equal(blog.content);
          newBlog.created.should.equal(blog.created.toISOString());
        });
    });
  });

  describe('PUT endpoint', function() {
    //strategy:
    // 1. Create a new blog for updating
    // 2. Get existing blog from db and replace with new blog
    // 3. Prove blog return by request contains data we sent
    // 4. Prove blog in db is correctly updated
    it('should update fields with specified content', function() {
      const updateData = {
        title: faker.random.word(),
        author: {
          firstName: faker.name.firstName(),
          lastName: faker.name.lastName()
        },
        content: faker.random.words()
      };

      return Blog
        .findOne()
        .then(function(blog) {
          updateData.id = blog.id;
          return chai.request(app)
            .put(`/blogs/${blog.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(204);

          return Blog.findById(updateData.id);
        })
        .then(function(blog) {
          blog.id.should.equal(updateData.id);
          blog.title.should.equal(updateData.title);
          blog.content.should.equal(updateData.content);
        });
    });
  });
  
  describe('DELETE endpoint', function() {
    //Strategy:
    //Find a blog
    //Make delete request for that blog using its ID
    //Assert the response with right status code
    //Verify the blog with the ID doesn't exist in DB
    it('should delete a restaurant by id', function() {
      let blog;
      
      return Blog
        .findOne()
        .then(function(_blog) {
          blog = _blog;
          return chai.request(app)
            .delete(`/blogs/${blog.id}`);
        })
        .then(function(res){ 
          res.should.have.status(204);
          return Blog.findById(blog.id);
        })
        .then(function(_blog) {
          should.not.exist(_blog);
        });
    });
  });
});