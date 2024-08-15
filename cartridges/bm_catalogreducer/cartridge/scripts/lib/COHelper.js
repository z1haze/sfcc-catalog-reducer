const Transaction = require('dw/system/Transaction');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const Logger = require('dw/system/Logger');

const CUSTOM_OBJECT_TYPE = 'CatalogReducerDefinition';
const CUSTOM_OBJECT_ID = 'CatalogReducerInfoFromUI';

module.exports = {
    createCustomObject: function (details) {
        return Transaction.wrap(function () {
            const prevCOs = CustomObjectMgr.getAllCustomObjects(CUSTOM_OBJECT_TYPE);

            while (prevCOs.hasNext()) {
                CustomObjectMgr.remove(prevCOs.next());
            }

            prevCOs.close();

            const co = CustomObjectMgr.createCustomObject(CUSTOM_OBJECT_TYPE, CUSTOM_OBJECT_ID);

            co.custom.maxProductsPerCategory = details.NumberOfProducts;
            co.custom.maxVariantsPerMaster = details.NumberOfVariants;
            co.custom.onlineProducts = details.OnlineProducts;
            co.custom.orderableProducts = details.OrderableProducts;
            co.custom.exportImages = details.ExportImages;
            co.custom.productIDs = details.ProductIDs;
            co.custom.imageSizes = details.ImageSizes;
            co.custom.exportPricebooks = details.ExportPricebooks;
            co.custom.exportInventoryList = details.ExportInventoryList;
            co.custom.masterCatalogs = details.MasterCatalog;
            co.custom.storefrontCatalog = details.StorefrontCatalog;
            co.custom.state = "Getting to work...";

            return co;
        });
    },

    getCustomObject: function () {
        try {
            return CustomObjectMgr.getCustomObject(CUSTOM_OBJECT_TYPE, CUSTOM_OBJECT_ID);
        } catch (e) {
            Logger.error('Cannot fetch custom objects. Error:', e);
        }
    },

    setState: function (co, key, value) {
        if (empty(co)) {
            return;
        }

        Transaction.wrap(() => co.custom[key] = value);
    },

    removeCustomObject: function (co) {
        if (empty(co)) {
            return;
        }

        Transaction.wrap(() => CustomObjectMgr.remove(co));
    }
}
