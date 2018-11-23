'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var dns = require('dns');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGOLAB_URI);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});

//Ryan: build the main app below

//define mongoose schema
let urlSchema = mongoose.Schema({
  'original_url': String,
  'short_url': String
});

//define mongoose model
let URL = mongoose.model('URL',urlSchema,'URLs');

let validURLRegExp = new RegExp("https*:\/\/(www.)?[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}(\/[a-zA-Z0-9-_%?=&@;:$.+!*'()]*)*","i");

//define db create/save function
function createAndSaveURL(urlToSave,done) {
  
  //first check that URL matches expected regexp pattern
  let matches = validURLRegExp.exec(urlToSave) ;
  if (matches.length == 0 || matches[0] != urlToSave) 
    return done('invalid');
  
  //now check that URL actually works
  let hostname = urlToSave.match(/https*:\/\/(www.)?[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}/i); 
  
  //found match
  if (hostname[0] != '') //redefine hostname string to drop the http(s):// part
    hostname = hostname[0].substr(urlToSave.indexOf('://')+3,hostname[0].length-1) ;
    
  return dns.lookup(hostname, function(err,data) {
    if (err) {
      return done('invalid') ;
    }
    else {
       let url = URL.find({},function(err,data) {
    
        let count = data.length ;
        let url = new URL({'original_url': urlToSave, 'short_url': count+1});
        //console.log('count = ' + count) ;

        url.save(function(err,data) {
           if (err) return done(err) ;
          else return done(null,data) ;
        }) ;
        
      });
  
      return url;
    
    }
  
});
    
}

//define POST behavior
app.route('/api/shorturl/new').post(function(req,res) {
  createAndSaveURL(req.body.url,function(err,data) {
    if (err) {
      if (err == 'invalid') return res.json({'error': 'Invalid URL'});
      else return console.log(err) ;
    }
    else
      return res.json({'original_data': data['original_url'],'short_url': data['short_url']}); 
  });
  
}) ;

//find urls matching short_url
function findExistingURL(shortURL,done) {
  
  let result = URL.findOne({'short_url': shortURL}, function(err,url) {
    if (err) return done(err) ;
    else {
      //console.log('found result = ' + url + ',' + shortURL);
      //console.log(typeof shortURL);
      return done(null,url) ;
    }
  }) ;
  
}

//define GET behavior
app.get('/api/shorturl/:url',function(req,res) {
  
  let urlString = req.params.url;
  //console.log(typeof urlString);
  
  findExistingURL(urlString,function(err,url) {
    if (err) console.log(err) ;
    else {
      //console.log(url);
      return res.redirect(url['original_url']);
    }
  }) ;
      
});
