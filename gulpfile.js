'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');

var linted_files = 'plugins/TinyOSPopulater/*.js';

gulp.task('lint', function () {
  return gulp.src(linted_files)
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('watch', function () {
  gulp.watch(linted_files, ['lint']);
});

gulp.task('default', ['lint', 'watch']);
