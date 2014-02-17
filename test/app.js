var st = require('node-static');
module.exports = function (done) {
    var root = __dirname;
//
// Create a node-static server instance to serve the './public' folder
//
    var file = new st.Server(root);

    var server = require('http').createServer(function (request, response) {
        request.addListener('end',function () {
            //
            // Serve files!
            //
            console.log('serving file...%s', request.url);

            file.serve(request, response);
        }).resume();
    }).listen(8080);
    console.log('started server for root ' + root);
    done(server);
};

if (process.argv[2] == 'run'){
    module.exports(function(){
        console.log('running');
    })
}