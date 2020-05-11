'use strict';

const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const Logger = require('dw/system/Logger');
const Transaction = require('dw/system/Transaction');

const CUSTOM_OBJECT_TYPE = 'CatalogReducerDefinition';
const CUSTOM_OBJECT_ID = 'CatalogReducerInfoFromUI';

module.exports = {
    /**
     * Create a new custom object based on given details
     *
     * @param {Object} details
     */
    createCustomObject: function createCustomObject(details) {
        Transaction.wrap(function() {
            var prevCOs = CustomObjectMgr.getAllCustomObjects(CUSTOM_OBJECT_TYPE);
            while (prevCOs.hasNext()) {
                CustomObjectMgr.remove(prevCOs.next());
            }
            prevCOs.close();

            var co = CustomObjectMgr.createCustomObject(CUSTOM_OBJECT_TYPE, CUSTOM_OBJECT_ID);

            co.custom.numberProducts = details.NumberOfProducts;
            co.custom.onlineProducts = details.OnlineProducts;
            co.custom.exportImages = details.ExportImages;
            co.custom.zipAndMoveToInstance = details.ZipAndMove;
            co.custom.productIDs = details.ProductIDs;
            co.custom.imageSizes = details.ImageSizes;
            co.custom.masterCatalogs = details.MasterCatalog;
            co.custom.storefrontCatalog = details.StorefrontCatalog;
            co.custom.running = true; // mark CO as running
            co.custom.progress = 10; // mark export at 10 percent progression
        });
    },

    /**
     * Returns the first found custom object record.
     * As we should always have only one custom object at a time, it should always be the one we need for the export
     *
     * @returns {dw/object/CustomObject}
     */
    getCustomObject: function getCustomObject() {
        try {
            return CustomObjectMgr.getCustomObject(CUSTOM_OBJECT_TYPE, CUSTOM_OBJECT_ID);
        } catch (e) {
            Logger.error('Cannot fetch custom objects. Error:', e);
        }
    },

    /**
     * Set the progress value to the given custom object
     * In case the co has been created from the UI, it will show up in the Business Manager
     * Else, it can be used as debug values to understand when the job fails (if it fails)
     *
     * @param {dw/object/CustomObject} co
     * @param {Number} progressValue
     */
    setProgress: function setProgress(co, progressValue) {
        if (empty(co)) {
            return;
        }

        Transaction.wrap(function() {
            co.custom.progress = progressValue;
        });
    },

    /**
     * Set the running state to the given custom object
     * In case the co has been created from the UI, it will show up in the Business Manager
     * Else, it can be used as debug values to understand when the job fails (if it fails)
     *
     * @param {dw/object/CustomObject} co
     * @param {Boolean} runningState
     */
    setRunningState: function setProgress(co, runningState) {
        if (empty(co)) {
            return;
        }

        Transaction.wrap(function() {
            co.custom.running = runningState;
        });
    },

    /**
     * Get the progress slice for a catalog export
     * This is calculated based on the current progress state and the steps to be done after exports
     *
     * @param {dw/object/CustomObject} co
     * @param {Array} arrayofCatalogIDs
     *
     * @returns {Number}
     */
    getProgressCatalogSlice: function getProgressCatalogSlice(co, arrayofCatalogIDs) {
        if (empty(co) || empty(arrayofCatalogIDs)) {
            return 0;
        }

        // The remaining progress for catalogs is the total minus the current progress state
        var progressTotalForCatalogs = 100 - co.custom.progress;

        progressTotalForCatalogs -= [
            // If the export image step is required, the remaining progress for catalogs decrease
            co.custom.exportImages,
            // If the zip and move step is required, the remaining progress for catalogs decrease
            co.custom.zipAndMoveToInstance
        ].filter(function (val) {
            return val === true;
        }).length * 10;

        return progressTotalForCatalogs / arrayofCatalogIDs.length;
    },

    /**
     * Remove the given custom object in case that custom object has been created by the UI
     *
     * @param {dw/object/CustomObject} co
     */
    removeCustomObject: function removeCustomObject(co) {
        if (empty(co)) {
            return;
        }

        Transaction.wrap(function() {
            CustomObjectMgr.remove(co);
        });
    }
};
