define([

    "embr/core",
    "sv"

], function(core, sv){

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
            img.onload = function(){
                if(callback)
                    callback(img);
            };
            img.src = src;
        },

        requestAnimationFrame: (function(){
            return window.requestAnimationFrame       ||
                   window.webkitRequestAnimationFrame ||
                   window.mozRequestAnimationFrame    ||
                   window.oRequestAnimationFrame      ||
                   window.msRequestAnimationFrame     ||
                   function(callback, element){
                       window.setTimeout(callback, 1000 / 60);
                   };
        })(),

        cancelAnimationFrame: (function(){
            return window.cancelRequestAnimationFrame       ||
                   window.webkitCancelRequestAnimationFrame ||
                   window.mozCancelRequestAnimationFrame    ||
                   window.oCancelRequestAnimationFrame      ||
                   window.msCancelRequestAnimationFrame     ||
                   clearTimeout
        })()

    };

});
