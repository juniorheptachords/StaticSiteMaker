
const path = require('path');
const fs = require('fs')
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const marked = require('marked');
const Twig = require("twig");
const SitemapPlugin = require('sitemap-webpack-plugin').default;
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');

// General env file
const env = require('./env.json');

// General config file
const config = require('./config.json');

// Path to src folder
const SRC_PATH = "./src/";

// Path to the md files
const MARKDOWN_FILE_DIR = "./src/data/";

// Path to the templates
const TEMPLATES_FILE_DIR = "./src/templates";

var glob = require("glob");

Array.prototype.flatMap = function(lambda) { 
    return Array.prototype.concat.apply([], this.map(lambda)); 
};

const entries = generateEntryObject();

// Parsing the datas
const posts = parseData();

// Making a map of the posts
const pagesUrls = generatePostsMap(posts)

// Building the HtmlPlugins
const htmlPlugins = posts.map(post => { return generateHtmlPlugin(post) });

// Building the SitemapPlugin
const sitemapPlugin = generateSitemapPlugin(posts);

module.exports = {
    entry: entries,
    
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        publicPath: env.root_path
    },
    
    module: {
        rules: [
            {
                test: /\.twig/,
                loader: "twig-loader",
            },
            {
                test: /\.md$/,
                loader: "raw-loader"
            },
            {
                test: /\.scss$/,
                use: [
                  MiniCssExtractPlugin.loader,
                  'css-loader',
                  'sass-loader'
                ],
            },
            {
                test: /\.(woff|png|jpg|gif)$/,
                use: [
                  {
                    loader: 'file-loader',
                    options: {
                        outputPath: 'public/fonts',
                    },
                  },
                ],
            },
        ],
    },
 
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: 'public/css/[name].[hash].css',
          chunkFilename: 'public/css/[id].[hash].css',
        }),
        new CopyPlugin([
          //{ from: './.htaccess', to: './' },
          { from: './vendor/', to: './public/', context: './src/assets/' },
          { from: './src/assets/vendor/*.css', to: './public/css/', flatten: true, },
          { from: './src/assets/vendor/*.js', to: './public/js/', flatten: true, },
          //{ from: './src/assets/manifest.json', to: './'},
        ]),
        new OptimizeCSSAssetsPlugin({})
    ]
    //.concat(generateExcludeAssetsPlugins())
    // We join our htmlPlugin array to the end
    // of our webpack plugins array.
    .concat(htmlPlugins)
    .concat(sitemapPlugin)
    .concat([
        // Adding preload meta to speed up things
        /*new PreloadWebpackPlugin(
            rel: 'preload',
            include: ['global']
        ),*/
        new ScriptExtHtmlWebpackPlugin({
            defaultAttribute: 'async',
            preload: /\.js$/,
        }),
        
        // Progressive Web App
        new SWPrecacheWebpackPlugin({
            cacheId: config.title,
            dontCacheBustUrlsMatching: /\.\w{8}\./,
            filename: 'service-worker.js',
            minify: true,
            navigateFallback: env.root_path + 'index.html',
            staticFileGlobsIgnorePatterns: [/\.map$/, /manifest\.json$/, /\.htaccess/, /\.DS_Store/]
        }),
        new WebpackPwaManifest(
            Object.assign(config.pwa, {
                start_url: '/',
                icons: [{
                    src: path.resolve(SRC_PATH +'assets/images/icon.png'),
                    sizes: [96, 128, 192, 256, 384, 512],
                    destination: 'public/icons'
                }]
            })
        ),
        // *** .htaccess rewrite rules
        {
          apply: (compiler) => {
            compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
                
                // htaccess in each language folder
                for (var language in config.languages) {
                    // skip loop if the property is from prototype
                    if (!config.languages.hasOwnProperty(language)) continue;

                    var lang_val = config.languages[language];
                    
                    var stream = fs.createWriteStream(path.resolve(__dirname, `dist/pages/${language}/.htaccess`), {'flags': 'w'});
                    stream.write(`ErrorDocument 404 ${env.root_path}pages/${language}/404.html`);
                    stream.end();
                }
                
                // General htaccess
                var stream = fs.createWriteStream(path.resolve(__dirname, 'dist/.htaccess'), {'flags': 'w'});

                stream.write('# *** Auto-generated rules *** \r\n\r\n');
                
                stream.write('RewriteEngine On \r\n\r\n');
                
                stream.write('<IfModule mod_rewrite.c>\r\n');
                stream.write('RewriteCond %{REQUEST_URI} /+[^\.]+$\r\n');
                stream.write('RewriteRule ^(.+[^/])$ %{REQUEST_URI}/ [R=301,L]\r\n');
                stream.write('</IfModule>\r\n\r\n');

                
                    
                // Rules for post types
                // TODO refactor 
                var i=0;
                for (var language in config.languages) {
                    // skip loop if the property is from prototype
                    if (!config.languages.hasOwnProperty(language)) continue;

                    var lang_val = config.languages[language];
                    
                    for (var post_type in config.post_types) {
                        // skip loop if the property is from prototype
                        if (!config.post_types.hasOwnProperty(post_type)) continue;

                        var obj = config.post_types[post_type];

                        if(i>0){
                            stream.write(`#Rule for ${post_type}  \r\n`);
                            stream.write(`RewriteRule ${language}/${obj.archive}/(.+[^/])/ pages/${language}/${post_type}-$1.html [NC,L]\r\n`);
                        }
                    }
                    i++;
                }
                stream.write('\r\n');
                
                
                i=0;
                for (var language in config.languages) {
                    // skip loop if the property is from prototype
                    if (!config.languages.hasOwnProperty(language)) continue;

                    var lang_val = config.languages[language];
                    
                    for (var post_type in config.post_types) {
                        // skip loop if the property is from prototype
                        if (!config.post_types.hasOwnProperty(post_type)) continue;

                        var obj = config.post_types[post_type];

                        if(i == 0){
                            stream.write(`#Rule for ${post_type}  \r\n`);
                            stream.write(`RewriteRule ${obj.archive}/(.+[^/])/ pages/${language}/${post_type}-$1.html [NC,L]\r\n`);
                        }
                    }
                    i++;
                    break;
                }
                stream.write('\r\n');
                
                i=0;
                for (var language in config.languages) {
                    // skip loop if the property is from prototype
                    if (!config.languages.hasOwnProperty(language)) continue;

                    var lang_val = config.languages[language];
                    
                    if(i>0){
                        stream.write(`#Rule for ${language}  \r\n`);
                        stream.write(`RewriteRule ^${language}/([^\.]+)/$ pages/${language}/page-$1.html \r\n`);
                        stream.write(`RewriteRule ^${language}/$ pages/${language}/index.html \r\n\r\n`);
                        
                    }
                    i++;
                }
                
                i=0;
                for (var language in config.languages) {
                    // skip loop if the property is from prototype
                    if (!config.languages.hasOwnProperty(language)) continue;

                    var lang_val = config.languages[language];
                    
                    if(i==0){
                        stream.write(`# Rule for ${language} \r\n`)
                        stream.write(`RewriteRule ^([^\.]+)/$ pages/${language}/page-$1.html \r\n`)
                        stream.write(`RewriteRule ^$ pages/${language}/index.html \r\n\r\n`)
                    }
                    i++;
                }
                
                
                stream.write('\r\n');
                //stream.write('ErrorDocument 404 /pages/404.html\r\n');
                
                stream.end('\r\n# ****************************');
            });
          }
        }
    ]),

    optimization: {
        nodeEnv: 'production',
        minimize: true,
    },
    
    mode: 'production'

};

/**
 * Generate an object for the entry config
 * It looks for every .js files on the /src folder
 * And also add some global ressources
 */
function generateEntryObject() {
  var ret = {};

  glob.sync("./src/*.js").forEach(function(path) {
    // you can define entry names mapped to [name] here
    ret[path.split('/').slice(-1)[0].split('.')[0]] = path;
  });

  ret['global'] = ['./src/assets/global.scss', './src/assets/global.js']
  //ret['sw'] = './src/assets/sw.js'

  return ret;
}


/**
 * Check if the given slug is of an archive page
 * @param slug The slug to test
 * @return boolean True if is an archive
 */
function isItArchive(slug){
    for (var key in config.post_types) {
        // skip loop if the property is from prototype
        if (!config.post_types.hasOwnProperty(key)) continue;

        var obj = config.post_types[key];
        
        if(obj.archive === slug){
            return true;
        }
    }
    return false;
}


/**
 * Find the post type corresponding to an archive slug
 * @param slug The slug to test
 * @return mixed The post type if found, False otherwise
 */
function getPostTypeFromArchiveSlug(slug){
    for (var key in config.post_types) {
        // skip loop if the property is from prototype
        if (!config.post_types.hasOwnProperty(key)) continue;

        var obj = config.post_types[key];
        
        if(obj.archive === slug){
            return key;
        }
    }
    return false;
}

/**
 * Generate an array of the archive pages of the given post type
 * @param post_type The post type
 * @return array The archive pages
 */
function generateArchiveArray(post_type, language){
    let archive = [];
    
    if(!config.languages.hasOwnProperty(language))
        return archive;
    
    fs
    // Read all Markdown files
    .readdirSync(MARKDOWN_FILE_DIR + language)
    .filter(filename => new RegExp(`${post_type}-(.+).md`,"g").test(filename))
    .map(item => {
        const page_name = item.split('.')[0];
        const name_array = page_name.split(/-(.+)/);
        
        const lang_key = Object.keys(config.languages)[0] == language ? '' : `${language}/`
        const link = env.root_path + lang_key +('page' === post_type ? '' : config.post_types[post_type].archive ) + '/' + name_array[1] + '/';

        const regex = /# (.+)/g;
        const title = fs.readFileSync(path.join(MARKDOWN_FILE_DIR + language, item))
        .toString()
        .match(regex)[0].replace('# ', '');

        archive.push({link: link, title: title});
    })
    
    return archive;
}


// **********************

function parseData(){
    let posts = []
    
    for (var folder in config.languages) {
        // skip loop if the property is from prototype
        if (!config.languages.hasOwnProperty(folder)) continue;
        
        fs
        // Read all Markdown files
        .readdirSync(MARKDOWN_FILE_DIR + folder)
        .filter(filename => /\.md$/.test(filename))
        .flatMap(item => {
            
            const filename      = item.split('.')[0];
            const filenameArray = filename.split(/-(.+)/);
            const postType      = filenameArray[0]
            const slug          = filenameArray[1]
            const isArchive     = "page" === postType && isItArchive(slug)
            const isHome        = filename === "home"
            const is404         = filename === "404"
            
            let url
            if(!is404){
                // Url
                const lang_key = Object.keys(config.languages)[0] == folder ? '' : `${folder}/`
                url = "home" === postType ?
                               `${env.domain}${lang_key}` :
                            "page" === postType ? 
                                `${env.domain}${lang_key}${slug}/` :
                                `${env.domain}${lang_key}${config.post_types[postType].archive}/${slug}/`
            }
            
            // Determining the right template
            let htmlFilename = `pages/${folder}/${filename}.html`;
            let template = `single-${postType}`;

            if(isHome){
                htmlFilename = `pages/${folder}/index.html`
                template = 'home'
            }else if(is404){
                htmlFilename = `pages/${folder}/404.html`
                template = '404'
            }
            
            // Archives, will be used in the Markdown and Twig as a variable
            let archives = [];
            if(isArchive){
                archives = generateArchiveArray(getPostTypeFromArchiveSlug(slug), folder);
            }  
            
            // Markdown content
            // Rendering Twig on the Mardown file so we can use Twig variables inside
            const content = fs.readFileSync(path.join(MARKDOWN_FILE_DIR + folder + "/", item)).toString()
           
            let renderedContent = Twig.twig({
                    data: content
                }).render({
                    assets_path: env.assets_path,
                    archives: archives,
                });
            
            // Converting markdown to HTML
            renderedContent = marked(renderedContent); 
            
            // Creating the post object
            const post = {
                filename:       item,
                type:           postType,
                slug:           slug,
                lang:           folder,
                isHome:         isHome,
                is404:          is404,
                isArchive:      isArchive,
                archives:       archives,
                template:       template,
                htmlFilename:   htmlFilename,
                content:        content,
                renderedContent: renderedContent,
                url: url
            }
            
            posts.push(post)
        })
    }
    
    return posts
}

/**
 * Determine the Twig template of a post
 * @param object post The post
 * return string The Twig template
 */
function getTwigTemplate(post){
    // For the home : 'home.twig' or 'single-page.twig' or 'single.twig'
    // For an archive : 'archive-thearchive.twig' or 'archive.twig'
    // For any other post : 'single-posttype.twig' or 'single.twig'
    return post.isHome ?
            fs.existsSync(`${TEMPLATES_FILE_DIR}/home.twig`) ? 
                    `${TEMPLATES_FILE_DIR}/home.twig` : fs.existsSync(`${TEMPLATES_FILE_DIR}/${post.template}.twig`) ?
                        `${TEMPLATES_FILE_DIR}/${post.template}.twig` : `${TEMPLATES_FILE_DIR}/single.twig` :
            post.isArchive ? 
                fs.existsSync(`${TEMPLATES_FILE_DIR}/archive-${post.slug}.twig`) ? 
                    `${TEMPLATES_FILE_DIR}/archive-${post.slug}.twig` : `${TEMPLATES_FILE_DIR}/archive.twig` :            
            fs.existsSync(`${TEMPLATES_FILE_DIR}/${post.template}.twig`) ? 
                `${TEMPLATES_FILE_DIR}/${post.template}.twig` : `${TEMPLATES_FILE_DIR}/single.twig`;
}

/**
 * Get translations of a post
 * @param object post The post
 * return object The translations
 */
function getPostTranslations(post){

    let locale_pagesUrls = JSON.parse(JSON.stringify(pagesUrls)) // Copying the urls object
    let current_page_languages;
    if(post.isHome){
        if(locale_pagesUrls['page']['home']){
            locale_pagesUrls['page']['home'][post.lang]['isCurrent'] = true
            current_page_languages = locale_pagesUrls['page']['home']
        }
    }
    else if(post.slug){
        if(locale_pagesUrls[post.type][post.slug.replace(/-/g,'_')]){
            locale_pagesUrls[post.type][post.slug.replace(/-/g,'_')][post.lang]['isCurrent'] = true
            current_page_languages = locale_pagesUrls[post.type][post.slug.replace(/-/g,'_')]
        }
    }

    // If current wasn't found, it might be because the post is a translation
    if(!current_page_languages){
        // Translations
        let translation_link
        const regex_i18n = /\[\/\/]: # "Original: (.+)"/
        const translation_match = post.content.match(regex_i18n);

        if(translation_match && translation_match[1]){
            translation_link = translation_match[1]
        }

        if(translation_link){
            const originalItemObject = getPostByFilename(posts, translation_link)
            if(originalItemObject){
                current_page_languages = locale_pagesUrls[post.type][originalItemObject.slug.replace(/-/g,'_')]
            }
        }
    }
    
    return current_page_languages
}


/**
 * Get the chunk of a post
 * @param object post The post
 * return string The chunk
 */
function getPostChunk(post){
    // Note : it is made on purpose that only 1 chunk is loaded in addition to the global
    // For the home : 'home' or none
    // For an archive : 'archive-thearchive' or 'archive' or none
    // For any other post : 'single-posttype' or 'single' or none
    
    return post.isHome ? 
            entries['home'] ? 'home' : '' : 
            post.isArchive ? 
                entries[`archive-${post.slug}`] ? 
                    `archive-${post.slug}` : 
                        entries['archive'] ? 'archive' : '' :
            entries[post.template] ? 
                post.template : entries["single"] ? 
                "single" : '';
}

/**
 * Get the SEO title of a post
 * @param object post The post
 * return string The title
 */
function getPostSEOTitle(post){
    // *** SEO title and description
    const regex_title = /<h1(.*?)>(.*?)<\/h1>/g;
    return meta_title = post.isHome ? config.title : [].concat(post.renderedContent.match(regex_title)).map(function(val){
       return val ? val.replace(/<h1(.*?)>/g,'').replace(/<\/h1>/g,'') : '';
    })[0] || config.title;
}

/**
 * Get the SEO description of a post
 * @param object post The post
 * return string The description
 */
function getPostSEODescription(post){
    const regex_description = /<p(.*?)>(.*?)<\/p>/g;
    const meta_description = post.isHome ? config.description : [].concat(post.renderedContent.match(regex_description)).map(function(val){
       return val ? val.replace(/<p(.*?)>/g,'').replace(/<\/p>/g,'') : '';
    })[0] || config.description;
}

/**
 * Get a post by filename
 * @param array Array of posts
 * @param string The filename
 * return object The post
 */
function getPostByFilename(posts, filename){
    return posts.filter(post => post.filename === filename)[0]
}
    
function generatePostsMap(posts) {
    let paths = {
                    page: {
                        home: {

                        }
                    }
                };
    let lang_index = 0;
    
    posts.map(post =>{
        // If the file is not like something-something and it is not the home or 404
        // then there is a problem
        if(!post.slug && !post.isHome && !post.is404){
            return;
        }

        // We don't list the 404
        if(post.is404){
            return;
        }
        
        // Title
        // can be either a comment or the first h1
        const regex_title = /\[\/\/]: # "Title: (.+)"/;
        const title_match = post.content.match(regex_title)
        let title = title_match && title_match[1] ? title_match[1] : null;
        if(!title){
            const regex_h1 = /# (.+)/;
            const h1_match = post.content.match(regex_h1)
            title = h1_match && h1_match[1] ? h1_match[1] : null;
        }

        // Translations
        let translation_link
        if(post.lang != Object.keys(config.languages)[0]){
            const regex_i18n = /\[\/\/]: # "Original: (.+)"/
            const translation_match = post.content.match(regex_i18n);

            if(translation_match && translation_match[1]){
                translation_link = translation_match[1]
            }
        }
        
        // The menu item has a title and a url
        let menuItem = {title: title, url: post.url}
        
        // If there is a link to the original page 
        // then put the menu item with the original item
        
        if(translation_link){
            const originalPost = getPostByFilename(posts, translation_link)
            
            if(originalPost){
                paths[originalPost.type][originalPost.slug.replace(/-/g,'_')][post.lang] = menuItem // Ajouter originalPost.slug.replace(/-/g,'_') dans le post en tant que alias
            }
        }
        else{
            // Otherwise create the tree to put the menu item in

            const slug_key = post.slug ? post.slug.replace(/-/g,'_') : ''

            if( "home" === post.type ){
                paths['page']['home'][post.lang] = menuItem
            }else{
                if(!paths[post.type]){
                    paths[post.type] = {}
                }
                if(!paths[post.type][slug_key]){
                    paths[post.type][slug_key] = {}
                }
                paths[post.type][slug_key][post.lang] = menuItem
            }
        }
    })
    
    return paths;
}


/**
 * Generate a HtmlPlugin for a fost
 * @param object post The post
 * return object The HtmlPlugin
 */
function generateHtmlPlugin(post){
    
    // Twig template
    const twigTemplate = getTwigTemplate(post);

    // Transaltions
    const postTranslations = getPostTranslations(post)

    // Chunk
    const chunk = getPostChunk(post)
    
    // SEO
    const seoTitle = getPostSEOTitle(post)
    const seoDescription = getPostSEODescription(post)
    
    return new HtmlWebpackPlugin({
        filename: post.htmlFilename,

        chunks: [chunk, 'global'],

        // Template to render 
        template: twigTemplate,

        // Minify the html
        minify: {collapseWhitespace: true},

        // *** Custom variables

        // Language
        lang: post.lang,
        // Language attribute
        lang_attribute: config.languages[post.lang],
        // SEO title
        meta_title: seoTitle,
        // SEO description
        meta_description: seoDescription,
        // Content from markdown file
        content: post.renderedContent,
        // The archives
        archives: post.archives,
        // Root path
        root_path: env.root_path,
        // Assets path
        assets_path: env.assets_path,
        // Is home
        is_home: post.isHome,
        // Pages list
        urls: pagesUrls,
        current_page_languages: postTranslations
    })
}

function generateSitemapPlugin(posts){
    let paths = []
    
    posts.map(post => { 
        if(post.slug){
            
            const lang_key = Object.keys(config.languages)[0] == post.lang ? '' : `${post.lang}/`    
    
            if("page" === post.type){
                paths.push(`${lang_key}${post.slug}/`);
            }else{
                paths.push(`${lang_key}${config.post_types[post.type].archive}/${post.slug}/`);
            }
        }
    })
    
    return new SitemapPlugin(env.domain, paths, {skipGzip: true})
}