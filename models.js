'use strict';

const mongoose = require('mongoose');

const blogSchema = mongoose.Schema({
  title: {type: String, required: true},
  author: {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true}
  },
  content: {type: String, required: true},
  created: {type: Date, default: Date.now}
});

blogSchema.virtual('fullName').get(function() {
  return `${this.author.firstName} ${this.author.lastName}`;
// }).set(function(str) {
//   const [first, last] = str.split(' ');
//   this.author.firstName2 = first;
//   this.author.lastName2 = last;
});

blogSchema.methods.apiRepr = function() {
  return {
    id: this._id,
    title: this.title,
    author: this.fullName,
    content: this.content,
    created: this.created
  };
};

const Blog = mongoose.model('Blog', blogSchema);

module.exports = {Blog};