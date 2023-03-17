const File = require('dw/io/File');
const Logger = require('dw/system/Logger');

const Directories = require('~/cartridge/scripts/lib/Directories');

const DEFAULT_IMAGE_COUNT = 5;
const IMAGE_SIZES_REGEX = new RegExp('^(\\w+(=\\d)?,){1,}(\\w+(=\\d)?){1}$');
const DEFAULT_IMAGE_SIZES = ['large=' + DEFAULT_IMAGE_COUNT, 'medium=' + DEFAULT_IMAGE_COUNT, 'small=' + DEFAULT_IMAGE_COUNT, 'swatch=' + DEFAULT_IMAGE_COUNT];
const STATIC_FOLDER = File.SEPARATOR + 'static' + File.SEPARATOR;
const REGEX = new RegExp('http[s]?:\\/\\/.*\\/on\\/demandware\\.static\\/\\-\\/Sites\\-(.*)?\\/(.*)?\\/dw[a-z\\d-_]*\\/(.*)?', '');

function getImagePathDetails(imageURL) {
    const matches = imageURL.match(REGEX);

    // Matches should contains:
    // matches[0]: The full URL match
    // matches[1]: The catalog ID (first group)
    // matches[2]: The locale folder (second group)
    // matches[3]: The image path relative to the locale folder (third group)
    if (empty(matches) || matches.length < 4) {
        throw new Error('The regex does not matches correctly with the image URL ' + imageURL);
    }

    const imageFolderPath = matches[3];
    const imageFolderSlices = imageFolderPath.split(File.SEPARATOR);
    const imageName = imageFolderSlices.pop();
    const imageFolderPathWithoutImageName = imageFolderSlices.join(File.SEPARATOR);

    return {
        catalogID: matches[1],
        localeFolder: matches[2],
        imageFolderPathWithImageName: matches[3],
        imageFolderPathWithoutImageName: imageFolderPathWithoutImageName,
        imageName: imageName
    };
}

function imageAlreadyExists(imageFile) {
    if (empty(imageFile)) {
        return false;
    }

    return imageFile.exists();
}

module.exports = {
    exportImages: function (setsOfProducts, imageSizes, rootFolder) {
        if (setsOfProducts.size() === 0 || empty(rootFolder)) {
            return;
        }

        /**
         * Validate the image sizes being passed in
         */
        if (typeof imageSizes !== 'undefined') {
            const matches = imageSizes.match(IMAGE_SIZES_REGEX);

            if (!matches.length) {
                throw new Error('Image sizes field not valid');
            }
        } else {
            imageSizes = DEFAULT_IMAGE_SIZES;
        }

        // restructure the image sizes into objects
        imageSizes = imageSizes
            .split(',')
            .map(v => {
                const entry = v.split('=');

                return {
                    size: entry[0].trim(),
                    limit: entry.length === 2 ? entry[1] : DEFAULT_IMAGE_COUNT
                }
            });

        let itr = setsOfProducts.iterator();

        const catalogs = [];

        while (itr.hasNext()) {
            let set = itr.next();
            let productItr = set.iterator();

            while (productItr.hasNext()) {
                let p = productItr.next();

                imageSizes.forEach(function (obj) {
                    const imageSize = obj.size;
                    const limit = obj.limit;

                    [].some.call(p.getImages(imageSize), function (imageMedia, i) {
                        try {
                            const imageURL = imageMedia.getHttpURL().toString();
                            // Fetch the image path details from the image URL
                            const imagePathDetails = getImagePathDetails(imageURL);

                            if (catalogs.indexOf(imagePathDetails.catalogID) === -1) {
                                catalogs.push(imagePathDetails.catalogID);
                            }

                            // Construct the image target path based on the current root folder
                            // And the details from the current image URL
                            const imageTargetPath = [
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
                            const imageFile = new File(imageTargetPath + imagePathDetails.imageName);

                            if (imageAlreadyExists(imageFile)) {
                                return;
                            }

                            // Create potential missing directories
                            Directories.createDirectory(imageTargetPath);

                            // Then construct the source file folder structure to fetch the source image file
                            // Based on the matches done by the RegExp before
                            const sourceImageFile = new File([
                                File.CATALOGS,
                                imagePathDetails.catalogID,
                                imagePathDetails.localeFolder,
                                imagePathDetails.imageFolderPathWithImageName
                            ].join(File.SEPARATOR));

                            // Finally copy the image to the target path
                            Directories.copyTo(sourceImageFile, imageFile);

                            i++;

                            // only allow a max of n images per image type
                            if (i+1 >= limit) {
                                return true;
                            }
                        } catch (e) {
                            Logger.error('An error occurred during download of the image {0}: {1}', imageURL, e);
                        }
                    });
                });
            }
        }
    }
}