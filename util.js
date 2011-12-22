define(function(){

    "use strict";

    var PI_180 = Math.PI / 180;

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

        degreeToRadian: function(deg){
            return deg * PI_180;
        }

    };

});
