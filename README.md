# Static Site Maker

The static site maker allows to generate a static site using Markdown files as data, Twig for templating, and Sass for the styling. It also produce all the necessary to work as a Progressive Web App.

## Getting started

First download or clone this repository.
Then install npm modules:
```npm install```
Then generate the static site by runing:
```npm run build```
This repository is ready to use, so if you run this command after cloning the project it will generate a Hello World site.


## How to use

### Folder structure

```
.
├── dist                    # The builded static site files
├── src                     # Sources
│   ├── assets              # Any assets for the pages
│   ├── data                # The datas folder
│   │    └── en             # Folder for the english datas
│   │    └── fr             # Folder for the french datas 
│   │    └── ...             
│   └── templates           # Unit tests
└── env.json
└── config.json

```

At the root of the project there are 2 files: env.json and config.json . Those files let you define your project configuration.

* The ```dist``` folder will contain the builded files. So you can just copy the files in this fodler to your server.
* The ```src``` folder contain the sources files to generate the static site.
* The ```assets``` folder contain the Sass, Javascript, images, fonts, etc, files.
* The ```data``` folder contain languages folders, like ```en``` or any language. Then inside this folder you will find the Markdown files.
* The ```templates``` folder contain the Twig files

### Files naming convention

This project is inspired by Wordpress. The files must follow a precise naming convention.

#### Pages
For regular pages:
* Markdown files must be like ```page-{slug}.md```
* The template used will be either ```single-page.twig``` or ```single.twig```

For the homepage:
* Markdown file must be ```home.md```
* The template used will be either ```home.twig``` or ```single-page.twig``` or ```single.twig```

#### Post types
You can create any type of post like in Wordpress. First configure it in the ```config.json``` file. Then:
* Markdown file must be like ```{posttype}-{slug}.md```
* The template used will be either ```single-{posttype}.twig``` or ```single.twig```

##### Archives
Every post can have an archive page. This page will provide a variable conataining the list of the existing posts.
* Markdown file must be like ```page-{archiveslug}.md```
* The template used will be either ```archive-{archiveslug}.twig``` or ```archive.twig```

### 404
* Markdown file must be ```404.md```
* The template used will be ```404.twig```

## Internationalization 
When defining multiple languages you can link pages together.

To link a page or a post in a secondary language to the main language, add this at the top of the ```.md``` file: ```[//]: # "Original: {filename}.md" ```
```{filename}.md``` is the filename of the post to link to in the main language.
The main language is the one at the first position in the array of languages in ```config.json```.
