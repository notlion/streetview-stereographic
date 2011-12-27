define(function(){

    "use strict";

    var M_PI = Math.PI;
    var M_PI_180 = M_PI / 180;
    var M_2PI = M_PI * 2;

    var events_transition_end = [
        "webkitTransitionEnd",
        "transitionend",
        "MSTransitionEnd",
        "oTransitionEnd"
    ];

    var events_mouse_wheel = [
        "mousewheel",
        "DOMMouseScroll"
    ];

    // Listen for multiple events and remove all listeners after the first responds
    function addMultiEventListener(element, events, callback, once){
        function onEvent(e){
            if(once){
                events.forEach(function(event){
                    element.removeEventListener(event, onEvent);
                });
            }
            callback(e);
        }
        events.forEach(function(event){
            element.addEventListener(event, onEvent);
        });
    }

    return {

        getGLContext: function(canvas){
            var gl = null;
            try{
                gl = canvas.getContext("experimental-webgl");
            }
            catch(err){
                console.error(err);
            }
            if(gl){
                console.log([
                    "GL Context Created",
                    gl.getParameter(gl.VERSION),
                    gl.getParameter(gl.VENDOR),
                    gl.getParameter(gl.RENDERER),
                    gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
                ].join(" – "));
                return gl;
            }
        },

        loadImage: function(src, callback){
            var img = new Image();
            img.crossOrigin = "anonymous"; // Appease the x-domain gods
            if(callback){
                img.onload = function(){
                    callback(null, img);
                };
                img.onerror = function(){
                    callback(err, img);
                };
            }
            img.src = src;
            return img;
        },

        addTransitionEndListener: function(element, callback, once){
            addMultiEventListener(element, events_transition_end, callback, once);
        },

        addMouseWheelListener: function(element, callback){
            addMultiEventListener(element, events_mouse_wheel, function(e){
                if(e.wheelDelta) // Webkit
                    e.delta = event.wheelDelta / 120;
                else if(e.detail) // Firefox
                    e.delta = -e.detail;
                callback(e);
            }, false);
        },

        degreeToRadian: function(deg){
            return deg * M_PI_180;
        },

        angleBetween: function(h1, h2){
            while(h1 < 0)     h1 += M_2PI;
            while(h1 > M_2PI) h1 -= M_2PI;
            while(h2 < 0)     h2 += M_2PI;
            while(h2 > M_2PI) h2 -= M_2PI;
            var a = Math.abs(h1 - h2);
            return a > M_PI ? M_2PI - a : a;
        }

    };

});
