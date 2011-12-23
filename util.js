define(function(){

    "use strict";

    var M_PI = Math.PI;
    var M_PI_180 = M_PI / 180;
    var M_2PI = M_PI * 2;

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
