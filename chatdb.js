/**
* nChat - Implementation of a simple chat feature using NodeJS and MongoDB
* License - MIT License (http://hr.mit-license.org/)
**/

GLOBAL.DEBUG = true;

/**
* Import all required modules.
**/
var http = require('http');
var url = require('url');
var test = require("assert");
var fs = require('fs');
var io = require('socket.io');

/* Handling older versions of Node */
var sys = require(process.binding('natives').util ? 'util' : 'sys');

/* If user requests undefined path, send 404. */
var send404 = function(res){                   
	res.writeHead(404, {
    'Content-Type' : 'text/plain'
	});
    res.write('404:Not Found');
    res.end(); //End output
};

/* Require components for MongoDB */
var Db = require('./lib/mongodb').Db;
var	Connection = require('./lib/mongodb').Connection;
var Server = require('./lib/mongodb').Server;
// BSON = require('./lib/mongodb').BSONPure;
var	BSON = require('./lib/mongodb').BSONNative;

var host = 'localhost';
var port = '27017';

sys.puts("Connecting to " + host + ":" + port);

/* Connect to MongoDB server  */
var db = new Db('chat', new Server(host, port, {}), {});

/* Create Node HTTP Server */
var server = http.createServer(function(req, res){
    var path,mime;
    path = url.parse(req.url).pathname;    
    switch (path){                         
        case '/':                           
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.write('<h1>Welcome. Check out the <a href="/chat.html">chat feature</a>.</h1>');
            res.end();
            break;
	    case '/json.js':                  
            mime = 'text/javascript';
            break;
        case '/chat.html':                    
            mime = 'text/html';
            break;
        default:
            send404(res);
    }
    /*Create our fileServer with mime set from above switch case */
    fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res);
        res.writeHead(200, {
            'Content-Type': mime
        });
        res.write(data, 'utf8');
        res.end();
    });
});
server.listen(8000);                      

/* Start Socket.IO to listen on the specified server object */
var socket = io.listen(server);         

/* Array of taken nicknames on chat */
var namearray = new Array();

/* Function to check if key exists in array */
function contains(a, obj) {
  var i = a.length;
  while (i--) {
    if (a[i] === obj) {
      return true;
    }
  }
  return false;
}

/* Function to remove key from array */
function removeByElement(arrayName,arrayElement)
{
	for(var i=0; i<arrayName.length;i++ )
   	{ 
  		if(arrayName[i].toLowerCase() === arrayElement.toLowerCase())
  		arrayName.splice(i,1); 
  	} 
}

/* Open Connection to DB - Lazy */
db.open(function(err, db) { 
/* When Socket.IO receives a connection, and a message from client. */    
socket.on('connection', function(client) {  
    client.on('message',function(msg) {    
        switch(msg.msg) {

        	case '1' : /* Client joins chatroom */
        		if(contains(namearray,msg.name)) {
                	client.send({
	                    err : ' Nick already taken ! '
                	});         	
                	console.log('err!');
        		}
        		else {
        			namearray.push(msg.name);
	        		client.broadcast({
	            		name: msg.name , 
	                    help : ' just joined the chatroom '
	                });
	                client.send({
	                    name: msg.name , 
	                    help : ' just joined the chatroom '
	                });           
	            }
                break;

            case '0' :  /* Client left chatrrom */
        		client.broadcast({
            		name: msg.name , 
                    help : ' just left the chatroom'
                });
                client.send({
                    name: msg.name , 
                    help : ' just left the chatroom'
                });  
                removeByElement(namearray,msg.name);
                break;    

            case 'help' : /* Client asked for help */
            	client.broadcast({
            		name: msg.name , 
                    help : ' is asking for help, oooh :P'
                });
                client.send({
                    name: msg.name , 
                    help : ' is asking for help, oooh :P'
                });           
                break;

            default : /* Client sends a message */     
            	console.log(msg);      
                client.broadcast({
                	name : msg.name ,
                    msg  : msg.msg
                });
                client.send({
                    name : msg.name ,
                    msg  : msg.msg
                });
                /* Get ready to store connection in DB  */
                var msgname = msg.name;
                var msgmsg = msg.msg;
                var date = new Date();
                	  db.collection('test', function(err, collection) {
                	 	collection.insert({'name' : msgname ,'msg' : msgmsg, 'time' : date.getTime()}, function(docs) {
				        	// Count the number of records
				        	/*collection.count(function(err, count) {
				        	sys.puts("There are " + count + " records.");
				        	});*/
				       }); // end collection.insert
					 }); // end db.collection
				
        }               // end switch 
        });             // end client.on
    });                 // end socket.on
});                     // end db.open
