#!/usr/local/bin/node
///////////////////////////////////////////////////////////////////////
// Simple munin-node server
// Written by Harald Nesland
///////////////////////////////////////////////////////////////////////

// Settings
var allowedHosts = ['192.168.5.0/24', /192\.168\.5\.\d+/];
var pluginPath = '/etc/munin/plugins/';
var MUNIN_LIBDIR = '/usr/share/munin/';
var tcpPort = 4949;

// TLS settings
// Create private key: openssl genrsa -out server-key.pem 1024
// Create a cert sign request: openssl req -new -key server-key.pem -out server-csr.pem
// Self-sign cert with csr: openssl x509 -req -in server-csr.pem -signkey server-key.pem -out server-cert.pem
// (Or send CSR to your CA etc)
// This will force TLS/SSL. Node-js does not support STARTTLS.
var useTLS = false;
var tlsOptions = { keyFile: 'server-key.pem', certFile: 'server-cert.pem' };




// Node-server
var net = require('net');
var os = require('os');
var fs = require('fs');
var spawn = require('child_process').spawn;
net.ipv4 = require('./net.ipv4.js');

// Enum plugins
var availablePlugins = {};
fs.readdir(pluginPath, function(err, files) {
   for(var n in files) {
      availablePlugins[files[n]] = true;
   }
});

// Socket listener
var muninNodeHandler = function(s) {
   var remoteAddress = '0.0.0.0';
   if(s.remoteAddress) {
      remoteAddress = s.remoteAddress;
   } else if(s.socket.remoteAddress) {
      remoteAddress = s.socket.remoteAddress;
   }
   var allowHost = false;
   for(var _i = 0; _i < allowedHosts.length; _i++) {
      var iprange = allowedHosts[_i];
      if(typeof iprange == 'function') {
         if( iprange.exec(remoteAddress) != null ) {
            console.log("Host allowed by " + iprange);
            allowHost = true;
         }
      } else {
         if(net.ipv4.ipInRange(remoteAddress, iprange)) {
            console.log("Host allowed by " + iprange);
            allowHost = true;
         }
      }
   }

   if(!allowHost) {
      s.destroy();
      return;
   }

   s.write("# munin node on " + os.hostname() + " via nodejs\n");

   s.on("data", function(data) {
      var commandMatch = /^(\S+)\s(.*)/;
      var commandResult;

      if(commandResult = commandMatch.exec(data)) {
         var command = commandResult[1];
         switch(command) {

            case 'STARTTLS':
               s.write('# Shhhhhhhhhhhhhhhiiiiiiiiieeeeeeeeeeeet\n');
               s.destroy();
               return;
            break;

            case "cap":
               s.write("cap multigraph\n");
               break;
            
            case "list":
               for(var plugin in availablePlugins) {
                  s.write(plugin + " ");
               }
               s.write("\n");
               break;
            
            case "nodes":
               s.write(os.hostname() + "\n.\n");
               break;

            case "autoconf":
            case "detect":
            case "fetch":
            case "config":
               var plugin = commandResult[2];
               if(plugin in availablePlugins) {
                  console.log("Executing: " + pluginPath + plugin + " " + command);
                  var pluginProc = spawn(pluginPath + plugin, [command], {MUNIN_LIBDIR:MUNIN_LIBDIR});
                  pluginProc.stdout.on('data', function(pluginLine) {
                     s.write(pluginLine);
                  });
                  pluginProc.on('exit', function(code) {
                     s.write(".\n"); 
                  });
               } else {
                  s.write("# Unknown service\n.\n");
               }
               break;
            
            case "version":
               s.write("munin node on " + os.hostname() + " version: 1.4.4 compatible\n");
               break;
            
            case "quit":
               s.destroy();
               break;

            default:
               s.write("# Unknown command. Try cap, list, nodes, config, fetch, version or quit\n");
               break;
         }
      }
   });
};

if(useTLS) {
   var tls = require('tls');
   var options = {key: fs.readFileSync(tlsOptions.keyFile), cert: fs.readFileSync(tlsOptions.certFile)};
   var server = tls.createServer(options, muninNodeHandler);
} else {
   var server = net.createServer(muninNodeHandler);
}

server.listen(tcpPort,'0.0.0.0');

