define([

    "embr/core",
    "embr/material",
    "util"

], function(core, mat, util){

    "use strict";

    function getPanoDimensions(data, zoom){
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

    function TileCoord(pano, zoom, x, y){
        this.pano = pano;
        this.zoom = zoom;
        this.x = x;
        this.y = y;
    }
    TileCoord.prototype = {
        getKey: function(){
            return [ this.pano, this.zoom, this.x, this.y ].join(",");
        },
        getUrl: function(){
            return "http://cbk" + Math.floor(Math.random() * 4) + ".google.com/cbk?output=tile" +
                   "&panoid=" + this.pano +
                   "&zoom=" + this.zoom.toFixed() +
                   "&x=" + this.x.toFixed() +
                   "&y=" + this.y.toFixed();
        }
    };

    function TileLoader(gl){
        var max_open_requests = 4;
        var max_zoom = 2;

        var tiles_by_id = {};
        var queued_coords;
        var num_open_requests = 0;

        var callbacks_by_id = {};

        var pano_data;
        var pano_zoom = -1;
        var pano_dims;

        var process_queue_timeout;

        var framebuffer = this.framebuffer = new core.Fbo(gl, 2048, 2048, [{
            filter_min: gl.LINEAR,
            filter_mag: gl.LINEAR,
            wrap_s: gl.REPEAT,
            wrap_t: gl.MIRRORED_REPEAT
        }]);
        var plane = core.Vbo.createPlane(gl, 0, 0, 1, 1);
        var material = new mat.ColorMaterial(gl, { flags: { use_texture: true } });
        material.use({ texture: 0, color: new core.Vec4(1, 1, 1, 1) });
        var projection = new core.Mat4();

        var loader = this;

        function Tile(coord){
            this.coord = coord;
            this.id = coord.getKey();
            this.cancelled = false;
        }
        Tile.prototype = {
            load: function(){
                var tile = this;
                util.loadImage(this.coord.getUrl(), function(err, img){
                    if(err){
                        console.error(err);
                    }
                    else if(!tile.cancelled){
                        // console.log("Tile loaded:", tile.id);
                        tile.texture = new core.Texture(gl);
                        tile.texture.setDataWithElement(img, {
                            filter_min: gl.LINEAR,
                            filter_mag: gl.LINEAR
                        });
                        loader.draw();
                    }
                    onTileLoadComplete(tile);
                });
                num_open_requests++;
            },
            draw: function(){
                if(this.texture && this.coord.zoom === pano_zoom){
                    this.texture.bind(0);
                    material.use({
                        projection: projection,
                        modelview: new core.Mat4().translate(this.coord.x, this.coord.y, 0)
                    });
                    plane.draw(material);
                }
            },
            dispose: function(){
                if(this.texture)
                    this.texture.dispose();
                this.cancelled = true;
            }
        };

        function onTileLoadComplete(tile){
            // Notify any 0-Zoom tile load callbacks
            if(tile.coord.zoom === 0 && tile.coord.pano in callbacks_by_id){
                callbacks_by_id[tile.coord.pano]();
                delete callbacks_by_id[tile.coord.pano];
            }

            // Move to the next zoom level if possible
            if(--num_open_requests === 0 && queued_coords.length === 0 && pano_zoom < max_zoom){
                loader.setZoom(pano_zoom + 1);
                loader.resetQueue();
            }

            // Wait a second before loading the next pano
            if(process_queue_timeout)
                window.clearTimeout(process_queue_timeout);

            var delay = pano_zoom === 1 ? 150 : 0;

            process_queue_timeout = window.setTimeout(function(){
                process_queue_timeout = 0;
                loader.processQueue();
            }, delay);
        }

        this.resetQueue = function(){
            queued_coords = [];
            var img, coord, coord_id, x, y;
            for(y = pano_dims.tiles.y; --y >= 0;){
                for(x = pano_dims.tiles.x; --x >= 0;){
                    queued_coords.push(new TileCoord(pano_data.location.pano, pano_zoom, x, y));
                }
            }
        };

        this.processQueue = function(){
            var tile;
            while(num_open_requests < max_open_requests && queued_coords.length > 0){
                tile = new Tile(queued_coords.shift());
                tiles_by_id[tile.id] = tile;
                tile.load();
            }
        };

        this.setPano = function(data, callback){
            if(pano_data && data.location.pano == pano_data.location.pano)
                return;

            pano_data = data;

            if(callback)
                callbacks_by_id[data.location.pano] = callback;

            this.setZoom(0);
            this.resetQueue();
            this.processQueue();
        };

        this.getPano = function(){
            return pano_data;
        };

        this.setZoom = function(zoom){
            zoom = Math.min(max_zoom, zoom);
            if(zoom !== pano_zoom){
                pano_zoom = zoom;
                pano_dims = getPanoDimensions(pano_data, pano_zoom);

                // console.log("Zoom:", pano_zoom, pano_dims);

                var w = pano_dims.size.x / pano_data.tiles.tileSize.width;
                var h = pano_dims.size.y / pano_data.tiles.tileSize.height;
                projection.reset().ortho(0, w, 0, h, -1, 1);

                this.clearTiles();
            }
        };

        this.clearTiles = function(){
            for(var id in tiles_by_id){
                tiles_by_id[id].dispose();
                delete tiles_by_id[id];
            }
        };

        this.draw = function(){
            framebuffer.bind();
            gl.viewport(0, 0, framebuffer.width, framebuffer.height);
            for(var id in tiles_by_id){
                tiles_by_id[id].draw();
            }
            framebuffer.unbind();
        };
    }

    return { TileCoord: TileCoord
           , TileLoader: TileLoader
           };

});
