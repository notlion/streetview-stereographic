main-built.js:
	node lib/r.js -o name=main out=main-built.js \
		baseUrl=. \
		paths.embr=lib/embr/src \
		useStrict=true \
		preserveLicenseComments=false

clean:
	rm -rf main-built.js
