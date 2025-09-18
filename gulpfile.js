// Core
const { src, dest, watch, series, parallel } = require('gulp');
const gulp = require('gulp');

// Utilities
const cleanCSS = require('gulp-clean-css');
const sass = require('gulp-dart-sass');
const clean = require('gulp-clean');
const browserSync = require('browser-sync').create();
const rename = require('gulp-rename');
const imgopt = require('gulp-smushit');
const purgecss = require('gulp-purgecss');
const htmlmin = require('gulp-htmlmin');
const htmlreplace = require('gulp-html-replace');

// Load (and gently normalize) config
const cfg = require('./gulpconfig.json');
const paths = cfg.paths || {};

// Directories
const DIR = {
  src: 'src',
  dev: 'dev',   // local output served by BrowserSync
  dist: 'docs', // production output (GitHub Pages)
  node: paths.node || './node_modules'
};

// ============ Clean tasks ============
function cleanDev() {
  return src(`${DIR.dev}/*`, { read: false, allowEmpty: true }).pipe(clean());
}
function cleanDist() {
  return src(`${DIR.dist}/*`, { read: false, allowEmpty: true }).pipe(clean());
}

// ============ Dev asset tasks ============

function copyPeaks() {
  // copies src/peaks/**/* to dev/peaks
  return src(`${DIR.src}/peaks/**/*.*`, { allowEmpty: true })
    .pipe(dest(`${DIR.dev}/peaks`));
}

function copyJs() {
  return src(`${DIR.src}/js/**/*.*`).pipe(dest(`${DIR.dev}/js`));
}
function copyImg() {
  return src(`${DIR.src}/img/**/*.*`).pipe(dest(`${DIR.dev}/img`));
}
gulp.task('dist-assets', parallel(copyPeaks, copyJs, copyImg)); // keep task name for scripts

// Sass → CSS
gulp.task('sass', function sassTask() {
  return src(`${DIR.src}/scss/theme.scss`)
    .pipe(sass().on('error', sass.logError))
    .pipe(dest(`${DIR.dev}/css`));
});

// Minify + inject CSS
gulp.task('minify-css', function minifyCssTask() {
  return src(`${DIR.dev}/css/*.css`)
    .pipe(cleanCSS({ compatibility: 'ie8' }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(`${DIR.dev}/css`))
    .pipe(browserSync.stream({ match: '**/*.css' }));
});

// ============ Production tasks ============
gulp.task('copy-CNAME', function copyCNAME() {
  return src('./CNAME', { allowEmpty: true }).pipe(dest(`${DIR.dist}/`));
});

gulp.task('prod-copy', function prodCopy(done) {
  // Copy everything from dev → docs
  src(`${DIR.dev}/**/**.*`).pipe(dest(`${DIR.dist}/`));
  done();
});

// Minify HTML in docs
gulp.task('minify-html', function minHtml() {
  return src(`${DIR.dist}/*.html`)
    .pipe(htmlmin({ collapseWhitespace: false, removeComments: true }))
    .pipe(dest(`${DIR.dist}`));
});

// Replace CSS reference in docs HTML
gulp.task('inject-min-css', function injectCss(done) {
  src(`${DIR.dist}/**/*.html`)
    .pipe(
      htmlreplace({
        css: '/css/theme.min.css'
      })
    )
    .pipe(dest(`${DIR.dist}`));
  done();
});

// Purge unused CSS in production bundle
gulp.task('purgecss', function purgeCssTask() {
  return src(`${DIR.dist}/css/theme.min.css`)
    .pipe(
      purgecss({
        content: [`${DIR.dist}/**/*.html`],
        safelist: ['collapsed', 'collapse', 'active', 'show', 'collapsing']
      })
    )
    .pipe(dest(`${DIR.dist}/css`));
});

// Optional image optimization into docs
gulp.task('imgopt', function imgOptTask() {
  return src(`${DIR.src}/img/*.{jpg,png}`).pipe(imgopt()).pipe(dest(`${DIR.dist}/img`));
});

// ============ Vendor assets (Bootstrap/AOS) ============
gulp.task('copy-assets', function vendorAssets(done) {
  // JS (Bootstrap dist)
  src(`${DIR.node}/bootstrap/dist/js/**/*.*`).pipe(dest(`${DIR.dev}/js`));

  // Bootstrap SCSS sources for local customization
  src(`${DIR.node}/bootstrap/scss/**/*.scss`).pipe(dest(`${DIR.dev}/scss/assets/bootstrap`));

  // AOS CSS & JS
  src(`${DIR.node}/aos/dist/**/*.css`).pipe(dest(`${DIR.dev}/scss/assets/aos`));
  src(`${DIR.node}/aos/dist/**/*.js`).pipe(dest(`${DIR.dev}/js`));

  done();
});

// ============ BrowserSync (watch sources only) ============
gulp.task('browser-sync', function browserSyncTask(done) {
  browserSync.init({
    server: { baseDir: `./${DIR.dev}` },
    notify: false,
    files: [], // we control reloads manually to avoid storms
    // Debounce FS write storms (Eleventy, WSL, network drives)
    watchOptions: {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 80 }
    }
  });

  // Watch SOURCES → build → inject/reload
  watch(`${DIR.src}/scss/**/*.scss`, series('sass', 'minify-css')); // CSS inject only
  watch(`${DIR.src}/js/**/*.*`, series(copyJs, browserSync.reload)); // one reload
  watch(`${DIR.src}/img/**/*.*`, series(copyImg, browserSync.reload)); // one reload
  watch(`${DIR.src}/peaks/**/*.*`, series(copyPeaks, browserSync.reload));

  // If Eleventy writes HTML into dev/, BrowserSync will pick up changes
  // via reloads triggered by your Eleventy watch/serve (recommended).
  // If you want to copy raw HTML from src → dev, uncomment below:
  // function copyHtml() { return src(`${DIR.src}/**/*.html`).pipe(dest(`${DIR.dev}`)); }
  // watch(`${DIR.src}/**/*.html`, series(copyHtml, browserSync.reload));

  done();
});

// ============ Clean convenience ============
gulp.task('clean', cleanDev);
gulp.task('clean-dist', cleanDist);

// ============ Notes ============
// - Run `npm run dev` as suggested in scripts (Eleventy --watch to dev + gulp browser-sync).