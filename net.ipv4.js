// ip stuff
var net = require('net');

exports.ip2long = function(ip) {
   var res = false;
   if(net.isIPv4(ip)) {
      var i = ip.split('.');
      with(Math) {
         res = (i[0] * pow(256, 3)) + (i[1] * pow(256, 2)) + (i[2] * pow(256,1)) + (i[3] * pow(256,0));
      }
   }
   return res;
};

exports.long2ip = function(lo) {
   var res = false;
   with(Math) {
      var res = floor(lo / pow(256, 3)) + '.' + 
                floor((lo % pow(256, 3)) / pow(256, 2)) + '.' +
                floor(((lo % pow(256, 3)) % pow(256, 2)) / pow(256, 1)) + '.' +
                floor((((lo % pow(256, 3)) % pow(256, 2)) % pow(256, 1)) / pow(256, 0));
   }

   return res;
}

exports.getLastIp = function(lo, mask) {
   return lo + (Math.pow(2, (32 - mask)) - 1);
}

exports.ipInRange = function(ip, range) {
   var iprange = range.split('/');
   var netip = exports.ip2long(iprange[0]);
   var lastip = exports.getLastIp( netip, iprange[1]);
   var longip = exports.ip2long(ip);

   if(lastip >= longip && netip <= longip) {
      return true;
   }

   return false;
};

