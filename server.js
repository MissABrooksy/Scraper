const express = require('express');
const logger = require('morgan');
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const PORT = process.env.PORT || 3000;

// Require all models
const db = require('./models');

// Initialize Express
const app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger('dev'));
// Parse request body as JSON
app.use(express.urlencoded({extended: true}));
app.use(express.json());
// Make public a static folder
app.use(express.static('public'));

// Connect to the Mongo DB
mongoose.connect('mongodb://localhost/scaperdb', {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

// When the server starts, create and save a new User document to the db
// The "unique" rule in the User model's schema will prevent duplicate users from being added to the server


// Routes

// Route for retrieving all Notes from the db
app.get('/api/scrape', async function(req, res) {
  // Find all Notes

  // Make a request via axios to grab the HTML body from the site of your choice
  const response = await axios.get('https://www.wtnh.com/');

  // Load the response data into cheerio and then select the data of
  // interest from the html using cheerio selectors, putting the results in a results array.
  const $ = cheerio.load(response.data);

  const result = [];

  $('h3.article-list__article-title').each(function(i, element) {
    const title = $(element).children('a').text();

    const link = $(element).children('a').attr('href');

    result.push({
      title: title.replace(/^\n\s+/, '').replace(/\n\s+$/, ''),
      link: link,
    });
  });
  db.Articles.create(result, function(err, result) {
    res.json(result);
  });
});

// Route for retrieving all Users from the db
app.get('/user', function(req, res) {
  // Find all Users
  db.User.find({})
      .then(function(dbUser) {
      // If all Users are successfully found, send them back to the client
        res.json(dbUser);
      })
      .catch(function(err) {
      // If an error occurs, send the error back to the client
        res.json(err);
      });
});

// Route for saving a new Note to the db and associating it with a User
app.post('/submit', function(req, res) {
  // Create a new Note in the db
  db.Note.create(req.body)
      .then(function(dbNote) {
      // If a Note was created successfully, find one User (there's only one) and push the new Note's _id to the User's `notes` array
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
        return db.User.findOneAndUpdate({}, {$push: {notes: dbNote._id}}, {new: true});
      })
      .then(function(dbUser) {
      // If the User was updated successfully, send it back to the client
        res.json(dbUser);
      })
      .catch(function(err) {
      // If an error occurs, send it back to the client
        res.json(err);
      });
});

// Route to get all User's and populate them with their notes
app.get('/populateduser', function(req, res) {
  // Find all users
  db.User.find({})
  // Specify that we want to populate the retrieved users with any associated notes
      .populate('notes')
      .then(function(dbUser) {
      // If able to successfully find and associate all Users and Notes, send them back to the client
        res.json(dbUser);
      })
      .catch(function(err) {
      // If an error occurs, send it back to the client
        res.json(err);
      });
});

// Set the app to listen on PORT
app.listen(PORT, function() {
  console.log('App running on http://localhost:%s', PORT);
});
