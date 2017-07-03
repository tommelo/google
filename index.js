
/*
* The MIT License (MIT)
*
* Copyright (c) 2017 tommelo
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

'use strict';

var cheerio         = require('cheerio'),
    request         = require('request-promise'),
    Promise         = require('bluebird'),
    HttpsProxyAgent = require('https-proxy-agent'),    
    _               = require('lodash');

var settings = {
    host   : 'https://google.com',
    path   : '/search',        
    limit  : 10,
    proxied: false,
    proxy  : undefined    
}

var START_AT_PAGE    = 0,      // starts at page 0
    PAGE_LIMIT       = 10,     // google's page limit 
    URL_ELEMENT      = 'cite', // html tag to search
    FOLLOW_REDIRECTS = false;  // avoid honeypots

/**
 * Executes a request
 * 
 * @param  {Object} req      The request object
 * @return {Promise} promise The request promise
 */
var search = function(req) {
    return request(req);
}

/**
 * Executes a cheerio load
 * 
 * @param  {String} body The html body
 * @return {Object} $    The cheerio object
 */
var transform = function(body) {
    return cheerio.load(body);
}

/**
 * Scrapes the html body
 * 
 * @param  {Object}   $     The cheerio instance
 * @return {String[]} links An array of links
 */
var scrape = function($) {
    var links = [];
    $(URL_ELEMENT).each(function(i, element) {
        links.push($(element).text());
    });

    return links;
}

/**
 * The default constructor
 * 
 * @param {Object} options 
 */
function Google(options) {    
    var opt      = _.defaults(options || {}, settings);
    this.host    = opt.host;
    this.path    = opt.path;      
    this.limit   = opt.limit;
    this.proxied = opt.proxied;    
    this.proxy   = opt.proxy;
}

/**
 * Performs a Google search
 * 
 * @param  {String}  term    The term to search
 * @param  {Number}  limit   The result limit
 * @return {Promise} promise A promise to be executed
 */
Google.prototype.search = function(term, limit) {
    var promises = [],
        size     = limit || this.limit;
        
    for (var i = START_AT_PAGE; i < size; i += PAGE_LIMIT) {
        var req = {
            uri            : this.host + this.path,            
            qs             : { q: term, start: i },            
            transform      : transform,
            followRedirects: FOLLOW_REDIRECTS            
        }

        if (this.proxied === true) {
            var proxy = this.proxy;
            req.agent = new HttpsProxyAgent(proxy);            
        }
            
        var promise = search(req).then(scrape);
        promises.push(promise);
    }        

    return Promise.all(promises).then(function(links) {
        return [].concat.apply([], links);
    });    
}

module.exports = Google;