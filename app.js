var app = require("express").createServer();
var http = require("http");
var querystring = require("querystring");

var spoof_headers = {
    "referer": "http://maps.gstatic.com/intl/en_us/mapfiles/cb/googlepano.151.swf",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_2) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7"
};

function getTileUrlOptions(id, zoom, x, y){
    return {
        host: "cbk" + Math.floor(Math.random() * 4) + ".google.com",
        path: "/cbk?" + querystring.stringify({
            output: "tile",
            panoid: id,
            zoom: zoom,
            x: x,
            y: y
        }),
        port: 80,
        headers: spoof_headers
    };
}

app.get("/pano/:id/:zoom/:x/:y", function(req, res){

    var opts = getTileUrlOptions(req.params.id, req.params.zoom, req.params.x, req.params.y);

    // Grab Tile from Google ..
    http.get(opts, function(goog_res){
        res.writeHead(200, {
            "content-type": "image/jpeg",
            "access-control-allow-origin": "*"
        });
        goog_res.on("data", function(chunk){
            res.write(chunk, "binary"); // .. and Write to Client
        });
        goog_res.on("end", function(){
            res.end();
        });
    }).on("error", function(err){
        res.send("none", 404);
    });

});

app.listen(80);
