require.config({
    paths: {
        "embr": "lib/embr/src"
    }
});
require([
    "embr/core",
    "embr/material",
    "embr/Arcball",
    "util",
    "sv"
],
function(core, material, Arcball, util, sv){

    if(!window.requestAnimationFrame){
        window.requestAnimationFrame = (function(){
            return window.webkitRequestAnimationFrame ||
                   window.mozRequestAnimationFrame    ||
                   window.oRequestAnimationFrame      ||
                   window.msRequestAnimationFrame     ||
                   function(callback, element){
                       window.setTimeout(callback, 1000 / 60);
                   };
        })();
    }

    var start_locations = [
        "o=0,0,0,1&p=35.66007,139.69978", // Shibuya
        "o=0,0,0,1&z=1.865&p=35.65602,139.69716", // Tamagawa Dori, Shibuya
        "o=0,0,0,1&z=1.509&p=-23.61623,-46.59105", // Heliopolis
        "o=0,0,0,1&z=1.453&p=22.28687,114.19123", // Hong Kong Construction
        "o=0,0,0,1&p=22.27844,114.16438", // Hong Kong
        "o=0,0,0,1&p=33.93011,-118.28101", // LA 110
        "o=0,0,0,1&p=37.79071,-122.40561", // SF Chinatown
        "o=0,0,0,1&p=40.70911,-74.01057", // NYC Zuccotti
        "o=0,0,0,1&p=35.01639,135.68119", // Kyoto Arashiyama
        "o=0,0,0,1&p=25.03293,121.56480&z=1.553", // Taipei 101
        "o=0,0,0,1&z=1.435&p=38.67511,141.44689", // Minamisanriku
        "o=0,0,0,1&z=1.623&p=19.12395,-155.75757", // Hawaii Ocean View
        "o=0,0,0,1&z=1.361&p=23.64225,119.51382", // Siyu Township
        "o=0,0,0,1&z=1.591&p=35.69935,139.77133", // Akihabara
        "o=0,0,0,1&z=1.566&p=35.31670,139.53571", // Nara Daibutsu
        "o=0,0,0,1&z=1.505&mz=18&p=51.50187,-0.11538", // London Leake St
        "o=0,0,0,1&z=1.535&p=36.86184,-5.17948" // Setenil de las Bodegas
    ];


    // Get DOM Elements

    var left = document.getElementById("left")
    ,   right = document.getElementById("right")
    ,   canvas = document.getElementById("gl-canvas")
    ,   code = document.getElementById("code")
    ,   code_text = document.getElementById("code-text")
    ,   code_toggle = document.getElementById("code-toggle")
    ,   mapui = document.getElementById("mapui")
    ,   panoui = document.getElementById("panoui")
    ,   location = document.getElementById("location")
    ,   above = document.getElementById("above")
    ,   below = document.getElementById("below")
    ,   fullwindow_toggle = document.getElementById("fullwindow")
    ,   about = document.getElementById("about")
    ,   about_toggle = document.getElementById("about-toggle")
    ,   about_backdrop = document.getElementById("about-backdrop")
    ,   no_webgl = document.getElementById("no-webgl")
    ;


    // Setup GoogMaps

    var gm = google.maps;

    var gm_subdomains = [ "0", "1", "2", "3" ];
    var stamen_subdomains = [ "", "a.", "b.", "c.", "d." ];
    var maptype_providers = {
        "8bit": {
            name: "8-Bit",
            url: "http://mt{S}.google.com/vt/lyrs=8bit,m@174000000&z={Z}&x={X}&y={Y}",
            subdomains: gm_subdomains,
            min_zoom: 2,
            max_zoom: 17
        },
        "toner": {
            name: "Toner",
            url: "http://{S}tile.stamen.com/toner/{Z}/{X}/{Y}.png",
            subdomains: stamen_subdomains,
            min_zoom: 0,
            max_zoom: 20
        },
        "streetview": {
            name: "StreetView",
            url: "http://cbk{S}.google.com/cbk?output=overlay&cb_client=api&zoom={Z}&x={X}&y={Y}",
            subdomains: gm_subdomains,
            min_zoom: 2,
            max_zoom: 17
        }
    };

    function makeMapType(name){
        var provider = maptype_providers[name];
        return new gm.ImageMapType({
            "getTileUrl": function(coord, zoom){
                var i = (zoom + coord.x + coord.y) % provider.subdomains.length;
                return provider.url.replace("{S}", provider.subdomains[i])
                                   .replace("{Z}", zoom)
                                   .replace("{X}", coord.x)
                                   .replace("{Y}", coord.y);
            },
            "name": provider.name,
            "tileSize": new gm.Size(256, 256),
            "minZoom": provider.min_zoom,
            "maxZoom": provider.max_zoom
        });
    }

    var maptypes = {};
    for(var name in maptype_providers){
        maptypes[name] = makeMapType(name);
    }

    var map = new gm.Map(document.getElementById("map"), {
        center: new gm.LatLng(0, 0),
        zoom: 17,
        mapTypeControlOptions: {
            mapTypeIds: [ gm.MapTypeId.ROADMAP, gm.MapTypeId.HYBRID, "8bit", "toner" ]
        },
        mapTypeId: gm.MapTypeId.ROADMAP,
        streetViewControl: false,
        keyboardShortcuts: false
    });

    [ "8bit", "toner" ].forEach(function(name){
        map.mapTypes.set(name, maptypes[name]);
    });

    var pano_marker = new gm.Marker({
        map: map,
        icon: new gm.MarkerImage("img/arrow.png", new gm.Size(45, 28), new gm.Point(0, 0), new gm.Point(22, 10))
    });
    pano_marker.setHeading = function(heading){
        var n = 16;
        var i = Math.floor(heading / core.math.k2PI * n + 0.5) % n;
        var icon = this.getIcon();
        icon.origin.x = icon.size.width * (i % 4);
        icon.origin.y = icon.size.height * Math.floor(i / 4);
        this.setIcon(icon);
    };
    function updatePanoMarkerHeading(){
        var axis = new core.Vec3(0,-0.01,-1);
        var dir = arcball.orientation.toMat4().invert().mulVec3(axis);
        pano_marker.setHeading(Math.atan2(dir.y, dir.x) + Math.PI * 2.5);
    }
    var pos_marker = new gm.Marker({
        map: map,
        draggable: true,
        icon: new gm.MarkerImage("img/pegman.png", new gm.Size(30, 32), new gm.Point(0, 0), new gm.Point(15, 31))
    });
    pos_marker.setIconIndex = function(i){
        var icon = this.getIcon();
        icon.origin.x = icon.size.width * i;
        this.setIcon(icon);
    };
    var streetview = new gm.StreetViewService();
    var geocoder = new gm.Geocoder();

    gm.event.addListener(map, "click", function(e){
        pos_marker.setPosition(e.latLng);
    });
    gm.event.addListener(map, "maptypeid_changed", updateHash);
    gm.event.addListener(pos_marker, "position_changed", function(){
        requestPanoDataByLocation(pos_marker.getPosition(), 50);
        if(pos_marker.dragging){
            var pos = pos_marker.getPosition();
            if(pos.lng() >= pos_marker.last_lng)
                pos_marker.setIconIndex(1);
            else
                pos_marker.setIconIndex(2);
            pos_marker.last_lng = pos.lng();
        }
    });
    gm.event.addListener(pos_marker, "dragstart", function(e){
        map.overlayMapTypes.setAt(1, maptypes["streetview"]);
        pos_marker.last_lng = pos_marker.getPosition().lng();
        pos_marker.dragging = true;
    });
    gm.event.addListener(pos_marker, "dragend", function(e){
        map.overlayMapTypes.setAt(1, null);
        pos_marker.setIconIndex(0);
        pos_marker.dragging = false;
    });
    gm.event.addListener(map, "zoom_changed", function(e){
        updateHash();
    });

    function centerPanoMarker(){
        var data = loader.getPano();
        if(data && !map.getBounds().contains(data.location.latLng))
            map.panTo(data.location.latLng);
    }


    var pano_heading;
    var pending_pano_req;
    function requestPanoData(requestFn){
        if(!pending_pano_req){
            window.setTimeout(function(){
                pending_pano_req.call(pending_pano_req);
            }, 50);
        }
        pending_pano_req = requestFn;
    }
    function requestPanoDataByLocation(location, radius){
        requestPanoData(function(){
            streetview.getPanoramaByLocation(location, radius, onPanoData);
        });
    }
    function requestPanoDataById(id, callbackFn){
        requestPanoData(function(){
            streetview.getPanoramaById(id, function(){
                callbackFn.apply(callbackFn, arguments);
                onPanoData.apply(onPanoData, arguments);
            });
        });
    }
    function onPanoData(data, status){
        if(status == gm.StreetViewStatus.OK && loader){
            var pos = data.location.latLng;
            pano_marker.setPosition(pos);
            loader.setPano(data, function(){
                pano_heading = util.degreeToRadian(data.tiles.centerHeading);
                location.value = data.location.description.trim();
            });
            centerPanoMarker();
            updateHash();
        }
        pending_pano_req = null;
    }


    // Setup Dynamic Code Compilation

    var pano_shader_src_vert = [
        "uniform mat4 projection;",
        "attribute vec3 position;",
        "attribute vec2 texcoord;",
        "varying vec2 v_texcoord;",
        "void main(){",
            "v_texcoord = texcoord;",
            "gl_Position = projection * vec4(position, 1.);",
        "}"
    ].join("\n");
    var pano_shader_src_frag_initial = code_text.value.trim();

    var compressor = LZMA ? new LZMA("lib/lzma/lzma_worker.js") : null;
    var pano_shader_src_compressed;

    function tryShaderCompile(){
        try{
            pano_shader.compile(pano_shader_src_vert, code_text.value);
            pano_shader.link();
            code_text.classList.remove("error");

            console.log("Compile Successful!");

            var src_frag = code_text.value.trim();
            if(compressor && src_frag != pano_shader_src_frag_initial){
                pano_shader_src_compressed = null;
                compressor.compress(src_frag, 1, function(res){
                    pano_shader_src_compressed = util.byteArrayToHex(res);
                    updateHash();
                });
            }
        }
        catch(err){
            code_text.classList.add("error");
            console.error("Error compiling shader: " + err);
        }
    }

    code_text.addEventListener("keydown", function(e){
        e.stopPropagation();
        if(e.keyCode == 9){ // tab
            e.preventDefault();

            var start = code_text.selectionStart;
            var end = code_text.selectionEnd;

            code_text.value = code_text.value.substring(0, start) + "  " + code_text.value.substring(end, code_text.value.length);
            code_text.selectionStart = code_text.selectionEnd = start + 2;
            code_text.focus();
        }
    }, false);
    code_text.addEventListener("keyup", function(e){
        e.stopPropagation();
        if(e.keyCode == 37 || // left
           e.keyCode == 38 || // up
           e.keyCode == 39 || // right
           e.keyCode == 40)   // down
            return;

        tryShaderCompile();
    }, false);
    code_text.addEventListener("keypress", function(e){
        e.stopPropagation();
    }, false);


    // Search

    location.addEventListener("mousedown", function(e){
        if(location !== document.activeElement){
            e.preventDefault();
            location.focus();
            location.select();
        }
    }, false);
    location.addEventListener("keydown", function(e){
        e.stopPropagation();
        if(e.keyCode == 13){ // return
            e.preventDefault();
            searchAddress(location.value, function(loc){
                pos_marker.setPosition(loc);
            });
            location.blur();
        }
    }, false);
    location.addEventListener("keypress", function(e){
        e.stopPropagation();
    }, false);


    // Setup Code Toggle Animation

    var code_open = false;
    function setCodeOpen(open){
        code_open = open;
        code_toggle.setAttribute("class", code_open ? "open" : "shut");
        if(code_open){
            code.style.visibility = "visible";
            code.classList.remove("shut");
        }
        else{
            util.addTransitionEndListener(code, function(e){
                code.style.visibility = "hidden";
            }, true);
            code.classList.add("shut");
        }
        updateHash();
    }
    code_toggle.addEventListener("click", function(e){
        setCodeOpen(!code_open);
    }, false);


    // Setup Keyboard Driving

    document.addEventListener("keydown", function(e){
        if(loader && loader.getPano() && e.keyCode >= 37 && e.keyCode <= 40){
            var key_heading = (e.keyCode - 38) * (Math.PI / 2);
            var best_link, best_angle = Number.MAX_VALUE, angle;
            loader.getPano().links.forEach(function(link){
                angle = util.angleBetween(key_heading, util.degreeToRadian(link.heading));
                if(angle < Math.PI / 2 && angle < best_angle){
                    best_link = link;
                    best_angle = angle;
                }
            });
            if(best_link){
                requestPanoDataById(best_link.pano, function(data, status){
                    if(status == gm.StreetViewStatus.OK){
                        pos_marker.setPosition(data.location.latLng);
                        onPanoData(data, status);
                    }
                });
            }
        }
    }, false);


    // Replacement Map Zoom (can't disable just arrow keys)

    document.addEventListener("keypress", function(e){
        var key = String.fromCharCode(e.charCode);
        if(key == "-"){
            map.setZoom(map.getZoom() - 1);
        }
        if(key == "="){
            map.setZoom(map.getZoom() + 1);
            centerPanoMarker();
        }
    }, false);

    // Mouse Wheel Pano Zoom

    util.addMouseWheelListener(canvas, function(e){
        pano_zoom_goal = core.math.clamp(pano_zoom - e.delta * 0.0333, 0.5, 10);
        updateHash();
    });
    var pano_zoom = 1.8;
    var pano_zoom_goal = pano_zoom;


    // Arcball

    var arcball = new Arcball();
    arcball.inverted = true;
    var pano_orientation = core.Quat.identity();
    function onCanvasMouseDrag(e){
        arcball.drag(e.clientX, e.clientY);
        updatePanoMarkerHeading();
    }
    function onCanvasMouseUp(e){
        canvas.classList.remove("grabbing");
        canvas.removeEventListener("mousemove", onCanvasMouseDrag);
        document.removeEventListener("mouseup", onCanvasMouseUp);
        updateHash();
    }
    canvas.addEventListener("mousedown", function(e){
        e.preventDefault();
        canvas.classList.add("grabbing");
        arcball.down(e.clientX, e.clientY);
        canvas.addEventListener("mousemove", onCanvasMouseDrag);
        document.addEventListener("mouseup", onCanvasMouseUp, true);
    });

    above.addEventListener("click", function(e){
        e.preventDefault();
        arcball.orientation.reset();
        updatePanoMarkerHeading();
        updateHash();
    });
    below.addEventListener("click", function(e){
        e.preventDefault();
        arcball.orientation.reset().rotate(Math.PI, 1,0,0);
        updatePanoMarkerHeading();
        updateHash();
    });


    // Fullwindow

    var fullwindow = false;
    function setFullwindow(fw){
        if(fw !== fullwindow){
            fullwindow = fw;
            fullwindow_toggle.textContent = fullwindow ? "<" : ">";
            if(fullwindow)
                left.classList.add("full");
            else
                left.classList.remove("full");
            resize();
            updateHash();
        }
    }
    fullwindow_toggle.addEventListener("click", function(e){
        e.preventDefault();
        setFullwindow(!fullwindow);
    });


    // About

    about_backdrop.addEventListener("click", function(e){
        e.preventDefault();
        about.style.visibility = about_backdrop.style.visibility = "hidden";
    }, false);
    about_toggle.addEventListener("click", function(e){
        e.preventDefault();
        about.style.visibility = about_backdrop.style.visibility = "visible";
    }, false);


    function resize(){
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        arcball.center = new core.Vec2(canvas.width / 2, canvas.height / 2);
        arcball.radius = arcball.center.length();

        map.getDiv().style.height = (right.clientHeight - mapui.offsetHeight) + "px";

        about.style.left = (window.innerWidth - about.clientWidth) / 2 + "px";
        about.style.top = (window.innerHeight - about.clientHeight) / 2 + "px";
    }
    window.addEventListener("resize", resize, false);

    function searchAddress(address, callback){
        geocoder.geocode({ address: address }, function(res, status){
            if(status == gm.GeocoderStatus.OK){
                map.fitBounds(res[0].geometry.viewport);
                callback(res[0].geometry.location);
            }
        });
    }

    function updateHash(){
        var params = {
            "o": arcball.orientation.toArray().map(function(x){ return util.formatNumber(x, 3); }),
            "z": util.formatNumber(pano_zoom_goal, 3),
            "mz": map.getZoom().toFixed()
        };
        if(map.getMapTypeId() != gm.MapTypeId.ROADMAP){
            params["mt"] = map.getMapTypeId();
        }
        var loc;
        if(loader && loader.getPano() && (loc = loader.getPano().location)){
            params["p"] = [
                loc.latLng.lat().toFixed(5),
                loc.latLng.lng().toFixed(5)
            ];
        }
        if(fullwindow){
            params["fw"] = 1;
        }
        if(code_open){
            params["c"] = 1;
        }
        if(pano_shader_src_compressed){
            params["fs"] = pano_shader_src_compressed;
        }
        document.location.hash = util.stringifyParams(params);
    }
    function loadHash(){
        var params = util.parseUrlHash(document.location.hash);
        if(params.o && params.o.length === 4){
            arcball.orientation.set.apply(arcball.orientation, params.o.map(parseFloat));
            pano_orientation.setQuat(arcball.orientation);
            updatePanoMarkerHeading();
        }
        if(params.z){
            pano_zoom = pano_zoom_goal = parseFloat(params.z);
        }
        if(params.mz){
            map.setZoom(parseInt(params.mz));
        }
        if(params.mt){
            map.setMapTypeId(params.mt);
        }
        if(params.p && params.p.length === 2){
            var loc = new gm.LatLng(parseFloat(params.p[0]), parseFloat(params.p[1]));
            if(!isNaN(loc.lat()) && !isNaN(loc.lat())){
                map.panTo(loc);
                pos_marker.setPosition(loc);
                load_hash_pano_fetched = true;
            }
        }
        if(params.fw && params.fw == 1){
            setFullwindow(true);
        }
        if(params.c && params.c == 1){
            setCodeOpen(true);
        }
        if(params.fs && typeof(params.fs) == "string" && compressor){
            compressor.decompress(util.hexToByteArray(params.fs), function(res){
                code_text.value = res;
                tryShaderCompile();
            });
        }
    }
    var load_hash_pano_fetched = false;


    // Loop

    function refresh(){
        window.requestAnimationFrame(draw);
    }

    function draw(){
        refresh();

        var time = (Date.now() - start_time) / 1000;

        gl.viewport(0, 0, canvas.width, canvas.height);

        loader.framebuffer.bindTexture(0);
        pano_zoom = core.math.lerp(pano_zoom, pano_zoom_goal, 0.33);
        pano_orientation.slerp(arcball.orientation, 0.33).normalize();
        pano_shader.use({
            projection: projection,
            aspect: canvas.height / canvas.width,
            scale: Math.pow(pano_zoom, 3),
            transform: pano_orientation.toMat4().mul(new core.Mat4().rotate(pano_heading + Math.PI / 2, 0,0,1)),
            time: time,
            texture: 0
        });
        plane.draw(pano_shader);
    }
    var start_time = Date.now();


    // Setup GL

    var modelview = new core.Mat4();
    var projection = new core.Mat4().ortho(0, 1, 1, 0, -1, 1);

    // var gl = core.Util.glWrapContextWithErrorChecks(util.getGLContext(canvas));
    var gl = util.getGLContext(canvas);
    if(gl){
        var pano_shader = new core.Program(gl);
        var plane = core.Vbo.createPlane(gl, 0, 0, 1, 1);

        var loader = new sv.TileLoader(gl);

        tryShaderCompile();

        // Start Loop
        refresh();

        // Show Canvas
        canvas.style.display = "block";
    }
    else {
        // Show No-Webgl Error
        no_webgl.style.display = "block";
    }


    // Load Parameters from Hash

    if(document.location.hash)
        loadHash();
    if(!load_hash_pano_fetched){
        document.location.hash = start_locations[core.math.randInt(start_locations.length)];
        loadHash();
    }


    resize();

});
