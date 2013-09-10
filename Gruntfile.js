module.exports = function(grunt) {

  var pkg = grunt.file.readJSON('package.json');
  var styles = ['app.css'];
  var scripts = [
      'js/fnSetFilteringDelay.js',
      'js/app.js'
  ];

  grunt.initConfig({
    less: {
      dev: {
        files: {
          'dist/app.css': 'less/source.less'
        }
      },
      prod: {
        options: {
          yuicompress: true
        },
        files: {
          'dist/app.min.css': 'less/source.less'
        }
      }
    },
    jade: {
      dev: {
        files: {
          'index.html': ['jade/index.jade']
        },
        options: {
          pretty: true,
          data: {
            dev: true,
            version: pkg.version,
            scripts: scripts,
            styles: styles
          }
        }
      },
      prod: {
        files: {
          'index.html': ['jade/index.jade']
        },
        options: {
          data: {
            version: pkg.version,
            scripts: ['app.min.js'],
            styles: ['app.min.css']
          }
        }
      }
    },
    watch: {
      css: {
        files: '**/*.less',
        tasks: ['less:dev'],
      },
      jade: {
        files: '**/*.jade',
        tasks: ['jade:dev'],
      },
      js: {
        files: ['js/**'],
        tasks: ['copy']
      }
    },
    copy: {
      main: {
        src: scripts,
        dest: 'dist/'
      },
    },
    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: scripts,
        dest: 'dist/app.js'
      }
    },
    uglify: {
      app: {
        files: {
          'dist/app.min.js': ['dist/app.js']
        }
      }
    },
    connect: {
      uses_defaults: {}
    }
  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jade');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('default', ['less:prod', 'jade:prod', 'concat', 'uglify', 'copy']);
  grunt.registerTask('dev', ['less:dev', 'jade:dev', 'copy', 'connect', 'watch']);
  grunt.registerTask('prod', ['default', 'connect', 'watch']);
};
