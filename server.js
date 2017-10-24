'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');

mongoose.Promise = global.Promise;

const {PORT, DATABASE_URL} = require('./config');
const {Blog} = require('./models');

const app = express();
app.use(bodyParser.json());
app.use(morgan('common'));

app.get('/blogs', (req, res) => {
  Blog
    .find()
    .then(blogs => {
      res.json({
        blogs: blogs.map((blog) =>
          blog.apiRepr())
      });
    })
    .catch(err => {
      console.err(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.get('/blogs/:id', (req, res) => {
  Blog
    .findById(req.params.id)
    .then(blog => {
      res.json(blog.apiRepr());
    })
    .catch(err => {
      console.err(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.post('/blogs', (req, res) => {
  const requiredFields = ['title', 'author', 'content'];
  for(let i=0; i<requiredFields.length; i++) {
    let field = requiredFields[i];
    if(!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).json({message: message});
    }
  }

  const {title, author, content} = req.body;
  const {firstName, lastName} = req.body.author;
  Blog 
    .create({
      title,
      author: {
        firstName,
        lastName
      },
      content
    })
    .then(blog => {
      res.location(`/blogs/${blog._id}`).status(201).json(blog.apiRepr());
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.put('/blogs/:id', (req, res) => {
  if(!(req.params.id && req.body.id && req.params.id === req.body.id)){
    const message = (`Request path id (${req.params.id}) and request body id ` +
    `(${req.body.id}) must match`);
    console.error(message);
    res.status(400).json({message: message});
  }
  
  const {id, title, author, content} = req.body;
  const toUpdate = {};
  const updateableFields = ['title', 'author', 'content'];
  
  updateableFields.forEach(field => {
    if(field in req.body){
      toUpdate[field] = req.body[field];
    }
  });

  Blog
    .findByIdAndUpdate(
      req.params.id, 
      {$set: toUpdate},
      {new: true})
    .then(blog => {
      console.log(blog);
      res.status(204).json(blog.apiRepr());
    })
    .catch(err => {
      res.status(500).json({message: 'Internal server error'});
    });
});

app.delete('/blogs/:id', (req, res) => {
  Blog
    .findByIdAndRemove(req.params.id)
    .then(blog => res.status(204).end())
    .catch(err => res.status(500).json({message: 'Internal server error'}));
});


app.use('*', function(req, res) {
  res.status(404).json({message: 'Not Found'});
});

let server;

function runServer(databaseUrl=DATABASE_URL, port=PORT) {

  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
        resolve();
      })
        .on('error', err => {
          mongoose.disconnect();
          reject(err);
        });
    });
  });
}

function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log('Closing server');
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

if (require.main === module) {
  runServer().catch(err => console.error(err));
}

module.exports = {app, runServer, closeServer};