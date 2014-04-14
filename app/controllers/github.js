require('../models/repo');//invoke it?

var GitHubApi = require("github");
var markdown = require("markdown").markdown;


var mongoose = require('mongoose'),
    Repo = mongoose.model('Repo'),
    _ = require('lodash');


// Add new repo to database
exports.addRepo = function(req, res, callback){
    console.log('controllers/github.js::addRepo');

    var repo = new Repo();
    repo.reponame = req.body.reponame;
    repo.username = req.body.username;
    repo.downloads = 0;
    repo.added_time = new Date().getTime();

    console.log('new repo to save: ');
    console.dir(repo);

    repo.save(function(err) {
        if (err) {
            console.log('error attempting to save new repo');

            callback('error attempting to save new repo');
        } else {
            console.log('added new repo to database');

            callback(null, 'Successfully added repository');
        }
    });

};



console.log( markdown.toHTML( "Hello *World*!" ) );

var github = new GitHubApi({
    // required
    version: "3.0.0",
    // optional
    debug: true,
    protocol: "https",
    //host: "api.github.com",
    //pathPrefix: "/api/v3", // for some GHEs
    timeout: 5000
});

// OAuth2 Key/Secret
github.authenticate({
    type: "oauth",
    key: "64be49db1055afb28914",
    secret: "a7b513953467c7db28f05b8722724d355b2647c2"
});


exports.getRepo = function(repoName, callback){

    

    github.repos.getReadme({
        user: "columbiagsapp",               
        repo: repoName,   

    }, function(err, readme){
        if(err){
            callback("Github API error: get readme");
        }else{
            console.log('\n\n\nreadme for repo: ' + repoName);
            
            //convert pacinfo.content base64 encoded into string
            var readme_md = new Buffer(readme.content, 'base64').toString();
            
            console.dir(readme_md);

            var readme_html = markdown.toHTML( readme_md );


            //get the pacinfo.json file to
            //return other metadata
            github.repos.getContent({
                user: "columbiagsapp",               
                repo: repoName,
                path: "pacinfo.json",     

            }, function(err, pacinfo){
                if(err){
                    //if no pacinfo.json file, callback without a url
                    callback(null, readme_html);
                }else{
                    

                    //convert pacinfo.content base64 encoded into string
                    var pacinfo_json = new Buffer(pacinfo.content, 'base64').toString();
                    pacinfo_json = JSON.parse(pacinfo_json);//convert to JSON object

                    console.log('\n\n\n\n\n\n\nURL: ' + pacinfo_json.url);

                    callback(null, readme_html, pacinfo_json.url);
                }
            });
        }
    });

}



exports.getRepos = function(callback){
    var returned = false;//flag set true once callback called



    Repo.find().exec(function(err, repos_array){

        if(err){
            callback("Database error: find() repositories from database");
        }else{
            console.log('returned ' + repos_array.length + ' repos');

            var count = 0;
            var repos_count = repos_array.length;


            console.log('\n\n\nTHIS IS THE REPOS ARRAY:\n\n\n');

            //console.log('\n\n\n\nTHIS IS THE repos_array.length: '+ repos_array.length + '\n\n\n\n');
            var callback_array = [];

            for(var r = 0; r < repos_array.length; r++){
                (function(r) {

                    console.log('r: ' + r + ' username: ' + repos_array[r].username + ' reponame: ' + repos_array[r].reponame);

                    github.repos.get({
                        user: repos_array[r].username,               
                        repo: repos_array[r].reponame
                    }, function(err, repo){

                        if(err){
                            console.log('err: ' + err);
                        }else{

                            github.repos.getContent({
                                user: repos_array[r].username,               
                                repo: repos_array[r].reponame,
                                path: "cloudinfo.json",     

                            }, function(err, info){
                                if(err){
                                    //if no pacinfo.json file, do nothing
                                    console.log('no pacinfo.json file');

                                }else{
                                    //convert pacinfo.content base64 encoded into string
                                    var info_json = new Buffer(info.content, 'base64').toString();
                                    info_json = JSON.parse(info_json);//convert to JSON object

                                    //push the result into the callback array
                                    callback_array.push( repo );

                                    //add db info to repo
                                    callback_array[callback_array.length-1].db = repos_array[r];

                                    //add pacinfo attribute to repo
                                    callback_array[callback_array.length-1].info = info_json;
                                }

                                count++;

                                if(count >= repos_count){
                                    returned = true;

                                    console.log('calling back with callback array:');
                                    console.dir(callback_array);

                                    callback(null, callback_array);
                                }
                            });//end of github.repos.getContent()

                        }//no err on github.repos.get()
                    });//end of github.repos.get()

                })(r);//end of anonymous function
                    
            }//end for all repos

            //if doesn't return after 15s, send error
            setTimeout(function(){
                if(returned == false){
                    callback("Github API error: repo timeout");
                }
            }, 15000);

        }//end if no err on db find()
    });



/*

	github.repos.getFromOrg({
    		org: "columbiagsapp",
            per_page: "10000"
	}, function(err, repos_array) {
        var count = 0;
        var repos_count = repos_array.length;

        if(err){
            callback("Github API error: get repositories from organization");
        }else{
		


		console.log('\n\n\nTHIS IS THE REPOS ARRAY:\n\n\n');
		console.dir(repos_array);

            //console.log('\n\n\n\nTHIS IS THE repos_array.length: '+ repos_array.length + '\n\n\n\n');
            var callback_array = [];

       		for(var r = 0; r < repos_array.length; r++){
                (function(r) {

                    github.repos.getContent({
                        user: "columbiagsapp",               
                        repo: repos_array[r].name,
                        path: "pacinfo.json",     

                    }, function(err, pacinfo){
                        if(err){
                            //if no pacinfo.json file, do nothing
                        }else{
                            callback_array.push( repos_array[r] );

                            //convert pacinfo.content base64 encoded into string
                            var pacinfo_json = new Buffer(pacinfo.content, 'base64').toString();
                            pacinfo_json = JSON.parse(pacinfo_json);//convert to JSON object

                            //add pacinfo attribute to repo
                            callback_array[callback_array.length-1].pacinfo = pacinfo_json;
                        }
                        count++;

                        if(count >= repos_count){
                            returned = true;
                            callback(null, callback_array);
                        }
                    });
                })(r);//end of anonymous function
                    
            }//end for all repos

            //if doesn't return after 15s, send error
            setTimeout(function(){
                if(returned == false){
                    callback("Github API error: repo timeout");
                }
            }, 15000);

        }//end if no err

	});

*/


}//end export getRepos
