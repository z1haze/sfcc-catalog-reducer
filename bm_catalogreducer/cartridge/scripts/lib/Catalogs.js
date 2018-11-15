'use strict';

const ArrayList = require('dw/util/ArrayList');
const CatalogMgr = require('dw/catalog/CatalogMgr');
const HTTPClient = require('dw/net/HTTPClient');
const Logger = require('dw/system/Logger');
const Pipeline = require('dw/system/Pipeline');
const ProductMgr = require('dw/catalog/ProductMgr');
const Status = require('dw/system/Status');
const URLUtils = require('dw/web/URLUtils');

const Directories = require('~/cartridge/scripts/lib/Directories');

const VARIATION_LIMIT = 25;
const QUOTA_LIMIT = 20000;
const TIMEOUT = 50000;
const CATALOGS_LIST_URL = 'ViewChannelCatalogList_52-ListAll';
var HIT_QUOTA = false;

module.exports = {
    /**
     * Returns the full list of master catalog IDs on the current instance and the current storefront catalog ID
     *
     * @returns {Object}
     */
    getAllCatalogs: function() {
        var cookies = request.getHttpCookies();
        var newCookies = '';

        //Loop through LoginAgent response and set cookies for new HTTPClient call
        for each(var cookie in cookies) {
            if (newCookies.length > 0) {
                newCookies += ';';
            }

            newCookies += cookie.getName() + '=' + cookie.getValue();
        }

        var httpClient = new HTTPClient();
        httpClient.setTimeout(TIMEOUT);
        httpClient.setRequestHeader('Cookie', newCookies);

        var response = '';
        var url = URLUtils.https(CATALOGS_LIST_URL);
        httpClient.open('GET', url);
        httpClient.send();

        if (httpClient.statusCode === 200) {
            response = httpClient.text;
        }
        else {
            Logger.error('Error with HTTPClient request! Returned status code: {0}', httpClient.statusCode);
        }

        var catalogRegExp = new RegExp("class=\"catalog\".*?</a>", 'g');
        var catalogNamesAll = response.match(catalogRegExp);

        return {
            catalogs: [].map.call(catalogNamesAll, function getCatalog(catalogName) {
                return catalogName.replace('class="catalog">', '').replace('</a>', '');
            }).filter(function cleanEmptyValues(catalogName) {
                return !empty(catalogName)
            }),
            storefrontCatalogID: CatalogMgr.getSiteCatalog().getID()
        };
    },

    /**
     * Create an array of catalog IDs based on the save master catalogs and the storefront catalog selected in the UI
     *
     * @param {String} storefrontCatalogID
     * @param {Array} masterCatalogs
     *
     * @returns {Array}
     */
    createArrayOfCatalogIDs: function(storefrontCatalogID, masterCatalogs) {
        if (!empty(masterCatalogs)) {
            masterCatalogs.push(storefrontCatalogID);
            return masterCatalogs;
        }

        return [storefrontCatalogID];
    },

    /**
     * Create the whole catalog structure to export. This will recursively open the storefront catalog and fetch products to export
     *
     * @param {Number} numberofProducts
     * @param {Boolean} onlineProducts
     * @param {String} storefrontCatalogID
     * @param {Array} productIDs
     *
     * @returns {Object}
     */
    createCatalogStructure: function(numberofProducts, onlineProducts, storefrontCatalogID, productIDs) {
        var storefrontCatalog = CatalogMgr.getCatalog(storefrontCatalogID);
        var rootCategory = storefrontCatalog.getRoot();
        var rootSubCategories  = rootCategory.getSubCategories();
        var productExportList = new ArrayList();

        try {
            //Calls Recursive function to work through Catalog Structure to get products of all categories
            productExportList = getProductsfromSubCategories(rootSubCategories, productExportList, numberofProducts, onlineProducts);

            //Assign User defined Products to correct Array for Exporting
            if (!empty(productIDs)) {
                assignSpecificProductstoArrays(productIDs.split(','), productExportList);
            }

            Logger.info('Found {0} products to export', productExportList.size());

            return {
                storefrontCatalog: storefrontCatalog,
                storeFrontProductIterator: productExportList.iterator(),
                storeFrontProductList: productExportList
            };
        }
        catch (e) {
            Logger.error('Fails to create the catalog structure. Error: {0}', e.getMessage());
        }

        return;
    },

    /**
     * Do the catalog export by calling the {CatalogExporter-Catalog} pipeline for the given {catalogID}
     *
     * @param {String} catalogID
     * @param {Object} rootDirectoryObj
     * @param {dw/util/Iterator} storeFrontProductIterator
     *
     * @returns {Boolean}
     */
    exportCatalog: function(catalogID, rootDirectoryObj, storeFrontProductIterator) {
        var catalog = CatalogMgr.getCatalog(catalogID);
        var catalogFolderObj = Directories.prepareCatalogFolder(rootDirectoryObj.directortyPath, catalogID);

        var result = Pipeline.execute('CatalogExporter-Catalog', {
            Catalog     : catalog,
            ExportFile  : catalogFolderObj.catalogFilePath,
            Products    : storeFrontProductIterator
        });

        if (result.hasOwnProperty('Status') && result.Status.getStatus() !== Status.OK) {
            Logger.info('Catalog {0} successfully exported', catalogID);
            return true;
        } else {
            Logger.error('Cannot export catalog {0}. Error code: {1}. Error mesage: {2}', catalogID, result.ErrorCode, result.ErrorMsg);
            return false;
        }
    }
};

/**
 * Function will recursively call itself to get through all subcategories of a catalog and grab Products for each category
 *
 * @param {dw/util/Collection} rootSubCategories
 * @param {dw/util/Collection} productExportList
 * @param {Number} numberofProducts
 * @param {Boolean} onlineProducts
 *
 * @returns {dw/util/Collection}
 */
function getProductsfromSubCategories(rootSubCategories, productExportList, numberofProducts, onlineProducts) {
    [].some.call(rootSubCategories, function(subCategory) {
        if (subCategory.getSubCategories().length > 0) {
            getProductsfromSubCategories(subCategory.getSubCategories(), productExportList, numberofProducts, onlineProducts);
        } else {
            var products;

            if (onlineProducts == true) {
                products = subCategory.getOnlineProducts().iterator();
            }
            else {
                products = subCategory.getProducts().iterator();
            }

             var count = 0;

            while(products.hasNext() && numberofProducts > count) {
                var product = products.next();
                if (product.isMaster() === true || product.isProductSet() === true || product.isBundle() === true) {
                    //Called to get all products that make up a complex type
                    getAllProductsofComplexType(product, productExportList, onlineProducts);
                }

                if (!productExportList.contains(product)) {
                    quotaProtection(productExportList, product);
                }

                count++;

                // If the quota has been reached, skip the rest of the loop
                if (HIT_QUOTA === true) {
                    break;
                }
            }

            // If the quota has been reached, skip the rest of the loop
            if (HIT_QUOTA === true) {
                return true;
            }
        }

        return false;
    });

    return productExportList;
}

/**
 * Function takes the specified ProductIDs and adds the product object to the array if it is not already added.
 *
 * @param {dw/util/Collection} specificProductIDArrayList
 * @param {dw/util/Collection} productExportList
 *
 * @returns
 */
function assignSpecificProductstoArrays(specificProductIDArrayList, productExportList) {
    [].some.call(specificProductIDArrayList, function(productID) {
        var product = ProductMgr.getProduct(productID);

        if (product.isMaster() === true || product.isProductSet() === true || product.isBundle() === true) {
            //Handle Master's Variations
            getAllProductsofComplexType(product, productExportList, false);
        }

        if (!productExportList.contains(product)) {
           quotaProtection(productExportList, product);
        }

        // If the quota has been reached, skip the rest of the loop
        if (HIT_QUOTA === true) {
            return true;
        }

        return false;
    });
}

/**
 * This function gets all the products for complex Product Types(Masters,ProductSets,Bundles) and adds them to the correct export Array
 *
 * @param {dw/catalog/Product} product
 * @param {dw/util/Collection} productExportList
 * @param {Boolean} onlineProducts
 *
 * @returns
 */
function getAllProductsofComplexType(product, productExportList, onlineProducts) {
    var productCollection = productTypeCollection(product);
    var count = 0;

    [].some.call(productCollection, function(supportingProduct) {
        if (supportingProduct.isMaster() === true || supportingProduct.isProductSet() === true || supportingProduct.isBundle() === true) {
            //Handle Master's Variations
            getAllProductsofComplexType(supportingProduct, productExportList, onlineProducts);
        } else {
            if(onlineProducts === true && supportingProduct.isOnline() === true && !productExportList.contains(supportingProduct)) {
                quotaProtection(productExportList, supportingProduct);
            } else if(!productExportList.contains(supportingProduct)) {
                quotaProtection(productExportList, supportingProduct);
            }
        }

        count++;

        // If the quota has been reached, skip the rest of the loop
        if (HIT_QUOTA === true) {
            return true;
        }

        //This limits variations of a master to 25 variations
        if (product.isMaster() === true && count == VARIATION_LIMIT) {
            return true;
        }
        return false;
    });
}

/**
 * Get the collection of Products for Complex Product Types
 *
 * @param {dw/catalog/Product} product
 *
 * @returns {dw/util/Collection}
 */
function productTypeCollection(product) {
    var productCollection;

     if (product.isMaster() === true) {
         productCollection = product.getVariants();
     } else if (product.isProductSet() === true) {
          productCollection = product.getProductSetProducts();
     } else if(product.isBundle() === true) {
         productCollection = product.getBundledProducts();
     }

     return productCollection;
}

/**
 * Function ensures 20000 collection size quota limit is not violated, will stop at 20k regardless
 *
 * @param {dw/util/Collection} productExportList
 * @param {dw/catalog/Product} product
 */
function quotaProtection(productExportList, product) {
    if (productExportList.size() === QUOTA_LIMIT - 1) {
        HIT_QUOTA = true;
        Logger.error('{0} quota limit reached for api.dw.util.collectionSize. Stopping product collection.', QUOTA_LIMIT);
    }

    productExportList.push(product);
}
