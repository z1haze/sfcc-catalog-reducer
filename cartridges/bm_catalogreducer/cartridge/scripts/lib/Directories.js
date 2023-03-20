const File = require('dw/io/File');
const StringUtils = require('dw/util/StringUtils');
const System = require('dw/system/System');
const FileWriter = require('dw/io/FileWriter');
const Logger = require('dw/system/Logger');

const CATALOG_FILENAME = 'catalog.xml';
const FILE_ENCODING = 'UTF-8';
const VERSION = '23.3.1';

const FOLDER = function (folder) {
    return File.SEPARATOR + [
        File.IMPEX,
        'src',
        folder
    ].join(File.SEPARATOR);
};

const removeFile = function (file) {
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

const createDirectory = function (fullPath) {
    if (empty(fullPath)) {
        return undefined;
    }

    var f = new File(fullPath);
    if (!f.exists()) {
        f.mkdirs();
    }

    return fullPath;
}

const generateVersionFile = function (folderPath) {
    if (empty(folderPath)) {
        return undefined;
    }

    var versionFile = new File(folderPath + File.SEPARATOR + 'version.txt');
    var writer = new FileWriter(versionFile, FILE_ENCODING);

    try {
        writer.writeLine('###########################################');
        writer.writeLine('# Generated file, do not edit.');
        writer.writeLine('# Copyright (c) 2023 by Demandware, Inc.'); // is this necessary?
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

module.exports = {
    ROOT_FOLDER: FOLDER('instance'),

    getFileDepth: function (filePath) {
        if (empty(filePath)) {
            return 0;
        }

        filePath = filePath.replace(FOLDER('instance') + File.SEPARATOR, '');

        return filePath.split(File.SEPARATOR).length;
    },

    getLastModifiedDate: function (file) {
        if (empty(file)) {
            return '';
        }

        return new Date(file.lastModified());
    },

    getFileSize: function (file) {
        if (empty(file)) {
            return '';
        }

        let fileSize = file.length();
        let unity = 'kb';
        let divisor = 1000;

        if (fileSize > 1000000) {
            unity = 'mb';
            divisor = 1000000;
        }

        fileSize /= divisor;

        return fileSize.toFixed(2) + ' ' + unity;
    },

    prepareRootFolder: function (storefrontCatalogID) {
        if (empty(storefrontCatalogID)) {
            return undefined;
        }

        var formattedDate = StringUtils.formatCalendar(System.getCalendar(), 'MMddYYYYhhmmss');
        var directoryName = StringUtils.format('{0}_{1}', storefrontCatalogID, formattedDate);

        var directoryPath = [
            FOLDER('catalogreducer'),
            directoryName,
            'catalogs'
        ].join(File.SEPARATOR) + File.SEPARATOR;

        createDirectory(directoryPath);

        return {
            directoryName: directoryName,
            directoryPath: directoryPath
        };
    },

    createDirectory: createDirectory,

    copyTo: function (sourceFile, targetFile) {
        if (empty(targetFile) || empty(sourceFile) || !sourceFile.exists()) {
            return undefined;
        }

        sourceFile.copyTo(targetFile);
    },

    prepareCatalogFolder: function (rootFolderPath, catalogID) {
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

    removeFile: removeFile,

    zipFiles: function (inDir, outFile) {
        generateVersionFile(inDir.fullPath);

        // Then ZIP content of the zip directory
        inDir.zip(outFile);

        // Finally remove old folder
        removeFile(inDir);
    },

    FOLDER: FOLDER
}