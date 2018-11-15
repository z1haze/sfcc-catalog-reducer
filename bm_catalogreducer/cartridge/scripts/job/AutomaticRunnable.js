'use strict';

const ArrayList = require('dw/util/ArrayList');
const CatalogMgr = require('dw/catalog/CatalogMgr');
const Logger = require('dw/system/Logger');
const Status = require('dw/system/Status');

const Catalogs = require('~/cartridge/scripts/lib/Catalogs');
const Directories = require('~/cartridge/scripts/lib/Directories');
const Images = require('~/cartridge/scripts/lib/Images');

var catalogReducerDefinition;
var catalogStructureDetails;
var arrayofCatalogIDs;
var catalogIDsIterator;
var rootDirectoryObj;
var progressSlice;
var parameters = {};

module.exports = {
    beforeStep: function(args) {
        parameters = args;

        // If the step is disabled, abort
        if (['true', true].indexOf(parameters.isDisabled) > -1) {
            return new Status(Status.OK);
        }

        var storefrontCatalogID = parameters.storefrontCatalogID;
        if (empty(storefrontCatalogID)) {
            storefrontCatalogID = CatalogMgr.getSiteCatalog().getID();
        }
        var masterCatalogs = !empty(parameters.masterCatalogIDs) ? parameters.masterCatalogIDs.split(',') : [];
        var productIDs = !empty(parameters.productIDs) ? parameters.productIDs.split(',') : [];
        Logger.info('Starting Export of Storefront Catalog: {0} and master catalogs {1}', storefrontCatalogID, masterCatalogs.join(','));

        try {
            catalogStructureDetails = Catalogs.createCatalogStructure(
                parameters.numberProducts,
                parameters.onlineProducts,
                storefrontCatalogID,
                productIDs
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
        });
    },

    afterStep: function(success) {
        if (!success) {
            return new Status(Status.ERROR);
        }

        Images.exportImages(!empty(parameters.imageSizes), catalogStructureDetails.storeFrontProductList, parameters.imageSizes, rootDirectoryObj.directortyPath);
        Directories.zipFiles(parameters.zipAndMoveToInstance, arrayofCatalogIDs, rootDirectoryObj.directoryName);
        Logger.info('All Catalogs Exported');
        return new Status(!success ? Status.ERROR : Status.OK);
    }
};
