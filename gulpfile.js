const gulp = require('gulp');
const { build } = require('./scripts/gulp-icons-build');

// Build task
gulp.task('build', (done) => {
    build();
    done();
});

// Default task
gulp.task('default', gulp.series('build'));
