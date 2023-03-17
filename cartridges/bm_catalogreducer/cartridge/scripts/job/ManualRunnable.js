'use strict';

const Status = require('dw/system/Status');
const File = require('dw/io/File');

const COHelper = require('~/cartridge/scripts/lib/COHelper');
const Reducer = require('~/cartridge/scripts/lib/Reducer');
const Catalogs = require('~/cartridge/scripts/lib/Catalogs');
const Directories = require('~/cartridge/scripts/lib/Directories');
const Images = require('~/cartridge/scripts/lib/Images');

let catalogReducer;
let catalogIdsIterator;

module.exports = {
    beforeStep: function () {
        catalogReducer = new Reducer(COHelper.getCustomObject());
        COHelper.setState(catalogReducer.getCO(), 'state', 'Gathering products...');
        catalogReducer.generateReducedCatalog();
        catalogIdsIterator = new dw.util.ArrayList(catalogReducer.getConfig().arrayOfCatalogIds).iterator();
    },

    getTotalCount: function () {
        return catalogReducer.getConfig().arrayOfCatalogIds.length;
    },

    read: function () {
        if (catalogIdsIterator.hasNext()) {
            return catalogIdsIterator.next();
        }
    },

    process: function (catalogId: String) {
        return catalogId
    },

    write: function (catalogIds: dw.util.List) {
        COHelper.setState(catalogReducer.getCO(), 'state', 'Writing Catalogs...');
        const config = catalogReducer.getConfig();
        catalogIds.toArray().forEach(catalogId => Catalogs.exportCatalog(catalogId, config.rootDirectoryObj, catalogReducer.getSets()));

        if (catalogReducer.getConfig().exportImages) {
            COHelper.setState(catalogReducer.getCO(), 'state', 'Writing Images...');
            Images.exportImages(catalogReducer.getSets(), config.imageSizes, config.rootDirectoryObj.directoryPath);
        }

        COHelper.setState(catalogReducer.getCO(), 'state', 'Zipping catalog contents...');
        Directories.zipFiles(
            new File(File.IMPEX + '/src/catalogreducer/' + config.rootDirectoryObj.directoryName),
            new File(File.IMPEX + '/src/instance/' + config.rootDirectoryObj.directoryName + '.zip')
        );
    },

    afterStep: function () {
        COHelper.setState(catalogReducer.getCO(), 'state', 'Cleaning up...');
        Directories.removeFile(new File(File.IMPEX + '/src/catalogreducer/' + catalogReducer.getConfig().rootDirectoryObj.directoryName));
        COHelper.removeCustomObject(catalogReducer.getCO());

        return new Status(Status.OK);
    }
}
