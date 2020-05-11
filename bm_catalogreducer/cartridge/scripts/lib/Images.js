'use strict';

const File = require('dw/io/File');
const Logger = require('dw/system/Logger');

const Directories = require('~/cartridge/scripts/lib/Directories');

const STATIC_FOLDER = File.SEPARATOR + 'static' + File.SEPARATOR;
// https://regex101.com/r/vKo24g/4
const REGEX = new RegExp('http[s]?:\\/\\/.*\\/on\\/demandware\\.static\\/\\-\\/Sites\\-(.*)?\\/(.*)?\\/dw[a-z\\d-_]*\\/(.*)?', '');
const DEFAULT_IMAGE_SIZES = ['large', 'medium', 'small', 'swatch'];

/**
 * Check if the given file exists or not
 *
 * @param {dw/io/File} imageFile
 *
 * @returns {Boolean}
 */
function imageAlreadyExists(imageFile) {
    if (empty(imageFile)) {
        return false;
    }

    return imageFile.exists();
}

/**
 * Returns the image path details from the given image URL
 *
 * @param {String} imageURL
 *
 * @returns {Object}
 */
function getImagePathDetails(imageURL) {
    var matches = imageURL.match(REGEX);

    // Matches should contains:
    // matches[0]: The full URL match
    // matches[1]: The catalog ID (first group)
    // matches[2]: The locale folder (second group)
    // matches[3]: The image path relative to the locale folder (third group)
    if (empty(matches) || matches.length < 4) {
        throw new Error('The regex does not matches correctly with the image URL ' + imageURL);
    }

    var imageFolderPath = matches[3];
    var imageFolderSlices = imageFolderPath.split(File.SEPARATOR);
    var imageName = imageFolderSlices.pop();
    var imageFolderPathWithoutImageName = imageFolderSlices.join(File.SEPARATOR);

    return {
        catalogID: matches[1],
        localeFolder: matches[2],
        imageFolderPathWithImageName: matches[3],
        imageFolderPathWithoutImageName: imageFolderPathWithoutImageName,
        imageName: imageName
    };
}

module.exports = {
    /**
     * Export images related to the searched products
     * For each product, we will export given image sizes and move them in the folder of the catalog where those images are actually stored.
     *
     * @param {Boolean} exportImages
     * @param {Array} storeFrontProductList
     * @param {String} imageSizes
     * @param {String} rootFolder
     */
    exportImages: function(exportImagesFlag, storeFrontProductList, imageSizes, rootFolder) {
        if (exportImagesFlag !== true || empty(storeFrontProductList) || empty(rootFolder)) {
            return;
        }

        imageSizes = typeof imageSizes !== 'undefined' && !empty(imageSizes) ? imageSizes.split(',') : DEFAULT_IMAGE_SIZES;

        [].forEach.call(storeFrontProductList, function(p) {
            imageSizes.forEach(function(imageSize) {
                imageSize = imageSize.trim();

                [].forEach.call(p.getImages(imageSize), function(imageMedia) {
                    try {
                        var imageURL = imageMedia.getHttpURL().toString();
                        // Fetch the image path details from the image URL
                        var imagePathDetails = getImagePathDetails(imageURL);

                        // Construct the image target path based on the current root folder
                        // And the details from the current image URL
                        var imageTargetPath = [
                            rootFolder,
                            imagePathDetails.catalogID,
                            STATIC_FOLDER,
                            imagePathDetails.localeFolder,
                            File.SEPARATOR,
                            imagePathDetails.imageFolderPathWithoutImageName,
                            File.SEPARATOR
                        ].join('');

                        // Check if the image already exists in the target folder
                        // If yes, skip the rest of the logic
                        var imageFile = new File(imageTargetPath + imagePathDetails.imageName);
                        if (imageAlreadyExists(imageFile)) {
                            return;
                        }

                        // Create potential missing directories
                        Directories.createDirectory(imageTargetPath);

                        // Then construct the source file folder structure to fetch the source image file
                        // Based on the matches done by the RegExp before
                        var sourceImageFile = new File([
                            File.CATALOGS,
                            imagePathDetails.catalogID,
                            imagePathDetails.localeFolder,
                            imagePathDetails.imageFolderPathWithImageName
                        ].join(File.SEPARATOR));

                        // Finally copy the image to the target path
                        Directories.copyTo(sourceImageFile, imageFile);
                    } catch (e) {
                        Logger.error('An error occurred during download of the image {0}: {1}', imageURL, e);
                    }
                });
            });
        });
    }
};
