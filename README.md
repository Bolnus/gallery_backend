# Gallery backend

This is a backend part of Gallery project. Frontend part lives [here](https://github.com/Bolnus/gallery_rtx). 
The app is able to serve images in a specified directory to clients via HTTP as gallery with albums and images. All images are converted to .webp format before sending.
Albums data is stored in a mongodb database. The albums can be searched through their names and tags.

## Preinst

Software required:
- MongoDB 7.0.5
- npm 10.2.4
- NodeJS 20.11.0

## Installation

1. Run `npm install` in the root project directory. 
2. Copy `.env.template` file contents to a new `.env` file. In the new file you will most likely want to setup the following:
- GALLERY_SRC_LOCATION is your directory with albums which will be used as source.
- GALLERY_CASH_LOCATION is the location where cash images will be stored once they have been compressed.

## Execute

In the project directory run `npm start`. To add your images to database from the source directory specified in `.env` file post the following request (using Insomnia, Postman or other test software):

### POST `http://localhost:3000/gallery/init`
