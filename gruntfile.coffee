module.exports = (grunt) ->

  filename = "leap.playback-<%= pkg.version %>"

  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")
    watch: {
      options: {
        livereload: true
      }
      css: {
        files: ['recorder/stylesheets/*.scss'],
        tasks: ['sass'],
        options: {
          spawn: false,
          livereload: true
        },
      },
      coffee: {
        files: ['recorder/javascripts/*.coffee'],
        tasks: ['coffee'],
        options: {
          spawn: false,
          livereload: true
        },
      },
      js: {
        files: ['src/*.js'],
        tasks: ['clean', 'concat', 'uglify', 'usebanner'],
        options: {
          spawn: false,
          livereload: true
        },
      },
      html: {
        files: ['recorder/*.html'],
        tasks: [],
        options: {
          spawn: false,
          livereload: true
        },
      },
    },
    sass: {
      build: {
        files: [{
          expand: true
          cwd: 'recorder/stylesheets'
          src: ['*.scss']
          dest: 'recorder/stylesheets'
          ext: '.css'
        }]
      }
    }
    coffee: {
      build: {
        files: [{
          expand: true
          cwd: 'recorder/javascripts'
          src: ['*.coffee']
          dest: 'recorder/javascripts'
          ext: '.js'
        }]
      }
    }
    concat: {
      build: {
        src: ['src/lib/*.js', 'src/recording.js', 'src/player.js'],
        dest: "build/#{filename}.js",
        options: {
          banner: ";(function( window, undefined ){ \n 'use strict';\n  // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode \n\n",
          footer: "}( window ));"
        }
      }
    }
    clean: {
      build: {
        src: ['./build/*']
      }
    }
    uglify: {
      build: {
        src: "build/#{filename}.js"
        dest: "build/#{filename}.min.js"
      }
    }
    usebanner: {
      build: {
        options: {
          banner:    '/*
                    \n * LeapJS Playback - v<%= pkg.version %> - <%= grunt.template.today(\"yyyy-mm-dd\") %>
                    \n * http://github.com/leapmotion/leapjs-playback/
                    \n *
                    \n * Copyright <%= grunt.template.today(\"yyyy\") %> LeapMotion, Inc
                    \n *
                    \n * Licensed under the Apache License, Version 2.0 (the "License");
                    \n * you may not use this file except in compliance with the License.
                    \n * You may obtain a copy of the License at
                    \n *
                    \n *     http://www.apache.org/licenses/LICENSE-2.0
                    \n *
                    \n * Unless required by applicable law or agreed to in writing, software
                    \n * distributed under the License is distributed on an "AS IS" BASIS,
                    \n * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                    \n * See the License for the specific language governing permissions and
                    \n * limitations under the License.
                    \n *
                    \n */
                    \n'
        }
        src: ["build/#{filename}.js", "build/#{filename}.min.js"]
      }
    },
    connect: {
      server: {
        options: {
          port: 4001,
          hostname: '*',
          keepalive: true
        }
      }
    }

  require('load-grunt-tasks')(grunt);

  grunt.registerTask('serve', [
    'connect'
  ]);

  grunt.registerTask('default', [
    'sass',
    'clean',
    'concat',
    'uglify',
    'usebanner'
  ]);