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
        "o=0,0,0,1&p=54.21050,-2.36962&z=1.656&mt=hybrid", // Ribblehead Viaduct
        "o=0,0,0,1&p=35.66007,139.69978", // Shibuya
        "o=0,0,0,1&p=-23.61071,-46.59209", // Heliopolis
        "o=0,0,0,1&p=22.33605,114.18748", // Kowloon
        "o=0,0,0,1&p=22.27844,114.16438", // Hong Kong
        "o=0,0,0,1&p=33.93011,-118.28101", // LA 110
        "o=0,0,0,1&p=37.79071,-122.40561", // SF Chinatown
        "o=0,0,0,1&p=40.70911,-74.01057", // NYC Zuccotti
        "o=0,0,0,1&p=35.01639,135.68119", // Kyoto Arashiyama
        "o=0,0,0,1&p=25.03293,121.56480&z=1.553" // Taipei 101
    ];


    // Get DOM Elements

    var left = document.getElementById("left");
    var right = document.getElementById("right");
    var canvas = document.getElementById("gl-canvas");
    var code = document.getElementById("code");
    var code_toggle = document.getElementById("code-toggle");
    var mapui = document.getElementById("mapui");
    var panoui = document.getElementById("panoui");
    var location = document.getElementById("location");
    var above = document.getElementById("above");
    var below = document.getElementById("below");
    var fullwindow_toggle = document.getElementById("fullwindow");
    var about = document.getElementById("about");
    var about_toggle = document.getElementById("about-toggle");
    var about_backdrop = document.getElementById("about-backdrop");


    // Setup GoogMaps

    var gm = google.maps;
    var map = new gm.Map(document.getElementById("map"), {
        center: new gm.LatLng(0, 0),
        zoom: 17,
        mapTypeId: gm.MapTypeId.ROADMAP,
        streetViewControl: false,
        keyboardShortcuts: false
    });
    var pano_marker = new gm.Marker({
        map: map,
        icon: new gm.MarkerImage("img/pano_marker.png", new gm.Size(14, 14), new gm.Point(0, 0), new gm.Point(7, 7))
    });
    var pano_arrow = new gm.Polyline({
        map: map,
        clickable: false,
        strokeColor: "#444",
        strokeWeight: 4,
        geodesic: true
    });
    var pos_marker = new gm.Marker({
        map: map,
        draggable: true,
        raiseOnDrag: false
    });
    var streetview = new gm.StreetViewService();
    var geocoder = new gm.Geocoder();

    gm.event.addListener(map, "click", function(e){
        pos_marker.setPosition(e.latLng);
    });
    gm.event.addListener(map, "maptypeid_changed", updateHash);
    gm.event.addListener(pos_marker, "position_changed", function(){
        streetview.getPanoramaByLocation(pos_marker.getPosition(), 50, onPanoData);
        updatePanoArrow();
    });
    gm.event.addListener(pano_marker, "position_changed", updatePanoArrow);
    gm.event.addListener(map, "zoom_changed", function(e){
        updateHash();
    });

    function updatePanoArrow(){
        var p1 = pano_marker.getPosition();
        var p2 = pos_marker.getPosition();
        if(p1 && p2){
            pano_arrow.setPath(new gm.MVCArray(
                (map.getBounds().contains(p1) && map.getBounds().contains(p2)) ? [ p1, p2 ] : []
            ));
        }
    }

    function centerPanoMarker(){
        var data = loader.getPano();
        if(data && !map.getBounds().contains(data.location.latLng))
            map.panTo(data.location.latLng);
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
    var pano_shader_src_frag_initial = code.value.trim();

    function tryShaderCompile(){
        try{
            pano_shader.compile(pano_shader_src_vert, code.value);
            pano_shader.link();
            code.classList.remove("error");
            if(code.value.trim() != pano_shader_src_frag_initial)
                updateHash();
            console.log("Compile Successful!");
        }
        catch(err){
            code.classList.add("error");
            console.error("Error compiling shader: " + err);
        }
    }

    code.addEventListener("keydown", function(e){
        e.stopPropagation();
        if(event.keyCode == 9){ // tab
            e.preventDefault();

            var start = code.selectionStart;
            var end = code.selectionEnd;

            code.value = code.value.substring(0, start) + "    " + code.value.substring(end, code.value.length);
            code.selectionStart = code.selectionEnd = start + 4;
            code.focus();
        }
    }, false);
    code.addEventListener("keyup", function(e){
        e.stopPropagation();
        if(event.keyCode == 37 || // left
           event.keyCode == 38 || // up
           event.keyCode == 39 || // right
           event.keyCode == 40)   // down
            return;

        tryShaderCompile();
    }, false);
    code.addEventListener("keypress", function(e){
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
    code_toggle.addEventListener("click", function(e){
        code_open = !code_open;
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
    }, false);


    // Setup Keyboard Driving

    document.addEventListener("keydown", function(e){
        var data = loader.getPano();
        if(data && e.keyCode >= 37 && e.keyCode <= 40){
            var key_heading = (e.keyCode - 38) * (Math.PI / 2);
            var best_link, best_angle = Number.MAX_VALUE, angle;
            data.links.forEach(function(link){
                angle = util.angleBetween(key_heading, util.degreeToRadian(link.heading));
                if(angle < Math.PI / 2 && angle < best_angle){
                    best_link = link;
                    best_angle = angle;
                }
            });
            if(best_link){
                streetview.getPanoramaById(best_link.pano, function(data, status){
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
        updateHash();
    });
    below.addEventListener("click", function(e){
        e.preventDefault();
        arcball.orientation.reset().rotate(Math.PI, 1,0,0);
        updateHash();
    });


    // Fullwindow

    var fullwindow = false;
    fullwindow_toggle.addEventListener("click", function(e){
        e.preventDefault();
        fullwindow_toggle.textContent = (fullwindow = !fullwindow) ? "halfwindow" : "fullwindow";
        resize();
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


    // Setup GL

    // var gl = core.Util.glWrapContextWithErrorChecks(util.getGLContext(canvas));
    var gl = util.getGLContext(canvas);

    var pano_shader = new core.Program(gl);
    var plane = core.Vbo.createPlane(gl, 0, 0, 1, 1);

    var modelview = new core.Mat4();
    var projection = new core.Mat4().ortho(0, 1, 1, 0, -1, 1);

    var loader = new sv.TileLoader(gl);

    tryShaderCompile();


    function onPanoData(data, status){
        if(status == gm.StreetViewStatus.OK){
            var ll = data.location.latLng;
            pano_marker.setPosition(ll);
            loader.setPano(data, function(){
                pano_heading = util.degreeToRadian(data.tiles.centerHeading);
                location.value = data.location.description.trim();
            });
            centerPanoMarker();
            updateHash();
        }
    }
    var pano_heading = 0;

    function searchAddress(address, callback){
        geocoder.geocode({ address: address }, function(res, status){
            if(status == gm.GeocoderStatus.OK){
                map.fitBounds(res[0].geometry.viewport);
                callback(res[0].geometry.location);
            }
        });
    }

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

    function resize(){
        left.style.width = fullwindow ? "100%" : "50%";

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        right.style.width = (window.innerWidth - left.offsetWidth) + "px";
        map.getDiv().style.height = (right.clientHeight - mapui.offsetHeight) + "px";

        about.style.left = (window.innerWidth - about.clientWidth) / 2 + "px";
        about.style.top = (window.innerHeight - about.clientHeight) / 2 + "px";

        arcball.center = new core.Vec2(canvas.width / 2, canvas.height / 2);
        arcball.radius = arcball.center.length();
    }

    function updateHash(){
        var params = {
            "o": arcball.orientation.toArray().map(function(x){ return x.toFixed(3); }),
            "z": pano_zoom_goal.toFixed(3),
            "mz": map.getZoom().toFixed()
        };
        if(map.getMapTypeId() != gm.MapTypeId.ROADMAP){
            params["mt"] = map.getMapTypeId();
        }
        var data = loader.getPano();
        if(data && data.location){
            params["p"] = [
                data.location.latLng.lat().toFixed(5),
                data.location.latLng.lng().toFixed(5)
            ];
        }
        document.location.hash = util.stringifyParams(params);
    }
    function loadHash(){
        var params = util.parseUrlHash(document.location.hash);
        if(params.o && params.o.length === 4){
            arcball.orientation.set.apply(arcball.orientation, params.o.map(parseFloat));
            pano_orientation.setQuat(arcball.orientation);
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
    }
    var load_hash_pano_fetched = false;


    // Load Parameters from Hash

    if(document.location.hash)
        loadHash();
    if(!load_hash_pano_fetched){
        document.location.hash = start_locations[core.math.randInt(start_locations.length)];
        loadHash();
    }


    // Layout and begin Draw Loop

    window.addEventListener("resize", resize, false);
    resize();
    refresh();

});
