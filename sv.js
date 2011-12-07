define([ "embr/core" ], function(core){

    return {

        getTileUrl: function(pano, zoom, x, y){
            return "http://cbk" + Math.floor(Math.random() * 4) + ".google.com/cbk?output=tile" +
                   "&panoid=" + pano + "&zoom=" + zoom + "&x=" + x + "&y=" + y;
        },

        getPanoDimensions: function(data, zoom){
            var size = new core.Vec2(data.tiles.worldSize.width, data.tiles.worldSize.height);

            var aspect = size.y / size.x;

            var tiles_x = Math.pow(2, zoom);
            var tiles_y = Math.ceil(tiles_x * aspect);

            var tiles_width = tiles_x * data.tiles.tileSize.width;
            while(size.x > tiles_width){
                size.scale(0.5);
            }

            return {
                size: size,
                tiles: new core.Vec2(tiles_x, tiles_y)
            };
        }

    };

});
