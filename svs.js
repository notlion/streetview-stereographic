define([

    "embr/core",
    "sv"

], function(core, sv){

    function StreetViewStereographic(canvas){
        this.gl = getGLContext(canvas);
    }

    function getGLContext(canvas){
        var gl = null;
        try{
            gl = canvas.getContext('experimental-webgl');
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
    }

    var requestAnimationFrame = window.webkitRequestAnimationFrame ||
                                window.mozRequestAnimationFrame    ||
                                window.oRequestAnimationFrame      ||
                                window.msRequestAnimationFrame     ||
                                function(callback, element){
                                    window.setTimeout(callback, 1000 / 60);
                                };

});
