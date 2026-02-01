module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        gitinfo: {
            commands: {}
        },
        uglify: {
            js: {
                files: {
                    'build/script.min.js': [
                        'src/lib/underscore-1.8.3.min.js',
                        'src/lib/angular-1.8.2.min.js',
                        'src/lib/angular-animate.1.8.2.min.js',
                        'src/lib/jquery-3.6.0.min.js',
                        'src/lib/jquery.base64.min.js',
                        'src/lib/velocity/velocity.1.5.2.min.js',
                        'src/lib/velocity/velocity.ui.5.0.4.min.js',
                        'src/lib/velocity/velocity.ui.angular.min.js',
                        'src/lib/gapi.js',
                        'src/main.js',
                        'src/concordTextModel.js',
                        'src/exportUtils.js',
                        'src/concord.js',
                        'src/concordUtils.js',
                        'src/notes/notes.js',
                        'src/notes/api.js',
                        'src/notes/noteCache.js'
                    ],
                    'build/init.min.js': ['sw.js', 'cache-polyfill.js']
                }
            }
        },
        cssmin: {
            target: {
                files: {
                    'build/css/style.min.css': ['css/concord.css'],
                    'build/css/768.min.css': ['css/768.css'],
                    'build/css/922.min.css': ['css/922.css'],
                    'build/css/main.min.css': ['css/main.css']
                }
            }
        },
        processhtml: {
            options: {
                data: {
                    version: '<%= gitinfo.local.branch.current.SHA %>'
                }
            },
            dist: {
                files: {
                    'build/index.html': ['index.html'],
                    'build/demo.html': ['demo.html']
                }
            }
        },
        copy: {
            main: {
                src: 'images/*',
                dest: 'build/'
            },
            favicon: {
                src: 'favicon.ico',
                dest: 'build/'
            },
            browserChecker: {
                src: 'src/bowser.min.js',
                dest: 'build/'
            },
            fonts: {
                src: 'css/fonts/**',
                dest: 'build/'
            },
            manifest: {
                src: 'manifest.json',
                dest: 'build/'
            },
            config: {
                src: 'config-prod.js', // For debugging src: 'config.js'
                dest: 'build/config.js'
            }
        },
        htmlmin: {
            // Task
            dist: {
                // Target
                options: {
                    // Target options
                    removeComments: true,
                    collapseWhitespace: true
                },
                files: {
                    // Dictionary of files
                    'build/index.html': 'index.html' // 'destination': 'source'
                }
            }
        },
        replace: {
            default: {
                src: ['build/init.min.js'],
                dest: 'build/init.min.js',
                replacements: [
                    {
                        from: 'VERSION_NUMBER',
                        to: '<%= gitinfo.local.branch.current.SHA %>'
                    }
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-processhtml');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-gitinfo'); //revision: <%= gitinfo.local.branch.current.SHA %>
    grunt.loadNpmTasks('grunt-text-replace');

    //unused
    //grunt.loadNpmTasks('grunt-contrib-htmlmin');

    grunt.registerTask('default', [
        'gitinfo',
        'uglify',
        'cssmin',
        'processhtml',
        'copy',
        'replace'
    ]);
};
