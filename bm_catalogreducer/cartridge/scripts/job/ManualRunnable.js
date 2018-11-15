'use strict';

const ArrayList = require('dw/util/ArrayList');
const Logger = require('dw/system/Logger');
const Status = require('dw/system/Status');

const Catalogs = require('~/cartridge/scripts/lib/Catalogs');
const COHelper = require('~/cartridge/scripts/lib/COHelper');
const Directories = require('~/cartridge/scripts/lib/Directories');
const Images = require('~/cartridge/scripts/lib/Images');

var catalogReducerDefinition;
var catalogStructureDetails;
var arrayofCatalogIDs;
var catalogIDsIterator;
var rootDirectoryObj;
var progressSlice;

module.exports = {
    beforeStep: function() {
        catalogReducerDefinition = COHelper.getCustomObject();
        if (empty(catalogReducerDefinition)) {
            Logger.error('Error: No Custom Object found');
            return new Status(Status.ERROR);
        }

        var storefrontCatalogID = catalogReducerDefinition.custom.storefrontCatalog;
        var masterCatalogs = catalogReducerDefinition.custom.masterCatalogs.split(',');
        Logger.info('Starting Export of Storefront Catalog: {0} and master catalogs {1}', storefrontCatalogID, masterCatalogs.join(','));

        try {
            catalogStructureDetails = Catalogs.createCatalogStructure(
                catalogReducerDefinition.custom.numberProducts,
                catalogReducerDefinition.custom.onlineProducts,
                storefrontCatalogID,
                catalogReducerDefinition.custom.productIDs
            );
        } catch (e) {
            Logger.error('Error: Cannot search for products:' + e);
            return new Status(Status.ERROR);
        }

        if (empty(catalogStructureDetails)) {
            Logger.error('Error: The product search fails. Check error logs.');
            return new Status(Status.ERROR);
        }

        if (empty(catalogStructureDetails.storefrontCatalog) || empty(catalogStructureDetails.storeFrontProductList)) {
            Logger.error('Error: Creation of Product Iterator Failed.');
            return new Status(Status.ERROR);
        }

        arrayofCatalogIDs = Catalogs.createArrayOfCatalogIDs(storefrontCatalogID, masterCatalogs);
        catalogIDsIterator = new ArrayList(arrayofCatalogIDs).iterator();
        rootDirectoryObj = Directories.prepareRootFolder(storefrontCatalogID);
        COHelper.setProgress(catalogReducerDefinition, 20);
        progressSlice = COHelper.getProgressCatalogSlice(catalogReducerDefinition, arrayofCatalogIDs);
    },

    getTotalCount: function() {
        return arrayofCatalogIDs.length;
    },

    read: function() {
        if(catalogIDsIterator.hasNext()) {
            return catalogIDsIterator.next();
        }
    },

    process: function(catalogID) {
        return catalogID;
    },

    write: function(catalogs) {
        [].forEach.call(catalogs, function (catalogID) {
            Catalogs.exportCatalog(catalogID, rootDirectoryObj, catalogStructureDetails.storeFrontProductIterator);
            COHelper.setProgress(catalogReducerDefinition, catalogReducerDefinition.custom.progress + progressSlice);
        });
    },

    afterStep: function(success) {
        if (!success) {
            return new Status(Status.ERROR);
        }

        Images.exportImages(catalogReducerDefinition.custom.exportImages, catalogStructureDetails.storeFrontProductList, catalogReducerDefinition.custom.imageSizes, rootDirectoryObj.directortyPath);
        Directories.zipFiles(catalogReducerDefinition.custom.zipAndMoveToInstance, arrayofCatalogIDs, rootDirectoryObj.directoryName);
        Logger.info('All Catalogs Exported');

        COHelper.setRunningState(catalogReducerDefinition, false);
        COHelper.setProgress(catalogReducerDefinition, 100);
        Logger.info('Deleting the Custom Object.');
        COHelper.removeCustomObject(catalogReducerDefinition);
        return new Status(!success ? Status.ERROR : Status.OK);
    }
};
