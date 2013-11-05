bgg-shelve
==========

Create a naiively-optimized shelf layout of your [BoardGameGeek](http://boardgamegeek.com/) collection.

Installation
------------

Install [node](http://nodejs.org/).

Install dependencies:

    npm install jade
    npm install jquery
    npm install uglify-js
    npm install xml2json

Running
-------

Start the server:

    node src/collection.js
  
Navigate to your shelving solution using your favorite web browser.  Remember to replace "{bgg-username}" with your BoardGameGeek username.  (this example assumes a [standard Expedit shelf](http://www.ikea.com/us/en/catalog/products/30265126/)):

    http://localhost:8888/?username={bgg-username}&height=13.1875&width=13.1875&depth=15.375
    
Screenshots
-----------
<img src="/screenshots/Screen Shot 2013-11-04 at 7.03.50 PM.png" width="200"/> <img src="/screenshots/Screen Shot 2013-11-04 at 7.08.42 PM.png" width="200"/>
    
Known Issues
------------

* For each item in your collection you need to specify what version you own.  Without this information, there is no size/weight information associated with your collection.
* The BGG xml api is VERY slow.

Future Development
------------------

* Add more information to display.
* Better error handling.
* Rudimentary caching.
* Common shelf size selections.
* Web form interface.
* Better asynchronicity.

