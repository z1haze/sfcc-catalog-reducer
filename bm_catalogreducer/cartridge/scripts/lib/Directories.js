'use strict';

const File = require('dw/io/File');
const FileWriter = require('dw/io/FileWriter');
const Logger = require('dw/system/Logger');
const StringUtils = require('dw/util/StringUtils');
const System = require('dw/system/System');

const FOLDER = function (folder) {
    return File.SEPARATOR + [
        File.IMPEX,
        'src',
        folder
    ].join(File.SEPARATOR);
};

const CATALOG_FILENAME = 'catalog.xml';
const FILE_ENCODING = 'UTF-8';
const VERSION = '17.8.3';


/**
 * Remove the given file and all its children if the given file is a directory
 * The file input can be either an instance of the dw/io/File class or the path to the file (String)
 *
 * @param {dw/io/File|String} file
 */
function removeFile(file) {
    if (empty(file)) {
        return undefined;
    }

    if (typeof file === 'string') {
        file = new File(file);
    }

    if (!file.exists()) {
        return;
    }

    if (file.isDirectory()) {
        [].forEach.call(file.listFiles(), removeFile);
    }

    file.remove();
}

/**
 * Generate the version file used by SFCC during Site import\
 *
 * @param {String} folderPath
 */
function generateVersionFile(folderPath) {
    if (empty(folderPath)) {
        return undefined;
    }

    var versionFile = new File(folderPath + File.SEPARATOR + 'version.txt');
    var writer = new FileWriter(versionFile, FILE_ENCODING);

    try {
        writer.writeLine('###########################################');
        writer.writeLine('# Generated file, do not edit.');
        writer.writeLine('# Copyright (c) 2017 by Demandware, Inc.');
        writer.writeLine('###########################################');
        writer.writeLine(VERSION);
    } catch (e) {
        Logger.error('An error occurred during version file generation: {0}', e);
    } finally {
        if (!empty(writer)) {
            writer.close();
        }
    }
}

/**
 * Create any missing directory in the given path
 *
 * @param {String} fullPath
 */
function createDirectory(fullPath) {
    if (empty(fullPath)) {
        return undefined;
    }

    var f = new File(fullPath);
    if (!f.exists()) {
        f.mkdirs();
    }

    return fullPath;
}

/**
 * Copy the given source file to the given target file
 *
 * @param {dw/io/File} sourceFile
 * @param {dw/io/File} targetFile
 */
function copyTo(sourceFile, targetFile) {
    if (empty(targetFile) || empty(sourceFile) || !sourceFile.exists()) {
        return undefined;
    }

    sourceFile.copyTo(targetFile);
}

module.exports = {
    ROOT_FOLDER: FOLDER('catalog'),
    INSTANCE_FOLDER: FOLDER('instance'),

    /**
     * Return the current file depth regarding the {ROOT_FOLDER}
     *
     * @param {String} filePath
     *
     * @returns {Integer}
     */
    getFileDepth: function(filePath) {
        if (empty(filePath)) {
            return 0;
        }

        filePath = filePath.replace(FOLDER('catalog') + File.SEPARATOR, '');
        return filePath.split(File.SEPARATOR).length;
    },

    /**
     * Return the current file size
     *
     * @param {dw/io/File} file
     *
     * @returns {String}
     */
    getFileSize: function(file) {
        if (empty(file)) {
            return '';
        }

        var fileSize = file.length();
        var unity = 'kb';
        var divisor = 1000;

        if (fileSize > 1000000) {
            unity = 'mb';
            divisor = 1000000;
        }

        fileSize /= divisor;
        return fileSize.toFixed(2) + ' ' + unity;
    },

    /**
     * Return parent folder path of the given file path
     *
     * @param {String} filePath
     *
     * @returns {String}
     */
    getParentFolderPath: function(filePath) {
        if (empty(filePath)) {
            return '';
        }

        var filePathSlices = filePath.split(File.SEPARATOR);
        // Remove the current folder/file name
        filePathSlices.pop();
        return filePathSlices.join(File.SEPARATOR) + File.SEPARATOR;
    },

    /**
     * Return the last modified date of the given file
     *
     * @param {dw/io/File} file
     *
     * @returns {Date}
     */
    getLastModifiedDate: function(file) {
        if (empty(file)) {
            return '';
        }

        return new Date(file.lastModified());
    },

    /**
     * Prepare the root folder for the export. The root folder will be relative to IMPEX/src/catalog
     *
     * @param {String} storefrontCatalogID
     *
     * @returns {Object}
     */
    prepareRootFolder: function(storefrontCatalogID) {
        if (empty(storefrontCatalogID)) {
            return undefined;
        }

        var formattedDate = StringUtils.formatCalendar(System.getCalendar(), 'MMddYYYYhhmmss');
        var directoryName = StringUtils.format('{0}_{1}', storefrontCatalogID, formattedDate);

        var directoryPath = [
            FOLDER('catalog'),
            directoryName,
            'catalogs'
        ].join(File.SEPARATOR) + File.SEPARATOR;

        createDirectory(directoryPath);

        return {
            directoryName: directoryName,
            directortyPath: directoryPath
        };
    },
    /**
     * Prepare the catalog folder for the export. The root folder will be relative to IMPEX/src/catalog/{rootFolder}/{catalogID}
     *
     * @param {String} rootFolderPath
     * @param {String} catalogID
     *
     * @returns {Object}
     */
    prepareCatalogFolder: function(rootFolderPath, catalogID) {
        if (empty(rootFolderPath) || empty(catalogID)) {
            return;
        }

        var directoryPath = [
            rootFolderPath,
            catalogID,
            File.SEPARATOR
        ].join('');

        createDirectory(directoryPath);

        var catalogFilePath = [
            directoryPath,
            CATALOG_FILENAME
        ].join('');
        return {
            directoryPath: catalogFilePath,
            // need to export the catalog path relative to the IMPEX/src/ path
            catalogFilePath: catalogFilePath.replace([
                File.IMPEX,
                File.SEPARATOR,
                'src',
                File.SEPARATOR
            ].join(''), '')
        };
    },

    /**
     * Zip the content of the root path in a Zip file relative to the IMPEX/src/instance folder
     * Note: The ZIP file has the same name as the root folder (relative to IMPEX/src/catalog)
     *
     * @param {Boolean} zipAndMoveToInstance
     * @param {Array} arrayofCatalogIDs
     * @param {String} rootFolderName
     * @param {Boolean} isGlobalZip
     */
    zipFiles: function(zipAndMoveToInstance, arrayofCatalogIDs, rootFolderName) {
        if (zipAndMoveToInstance !== true || empty(arrayofCatalogIDs) || empty(rootFolderName)) {
            return;
        }

        // Generate the version.txt file used by SFCC in ZIP files
        var rootFolder = [
            FOLDER('catalog'),
            rootFolderName
        ].join(File.SEPARATOR);

        generateVersionFile(rootFolder);

        // Construct the ZIP file
        var zipFolder = new File(rootFolder);
        var zipFile = new File([
            FOLDER('instance'),
            File.SEPARATOR,
            rootFolderName,
            '.zip'
        ].join(''));

        // Then ZIP content of the zip directory
        zipFolder.zip(zipFile);

        // Finally remove old folder
        removeFile(zipFolder);
    },

    createDirectory: createDirectory,
    copyTo: copyTo,
    removeFile: removeFile
};
