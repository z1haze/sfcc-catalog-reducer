const ArrayList = require('dw/util/ArrayList');
const CatalogMgr = require('dw/catalog/CatalogMgr');
const LinkedHashSet = require('dw/util/LinkedHashSet');
const Transaction = require('dw/system/Transaction');
const ProductMgr = require('dw/catalog/ProductMgr');

const Catalogs = require('~/cartridge/scripts/lib/Catalogs');
const Directories = require('~/cartridge/scripts/lib/Directories');
const Class = require("~/cartridge/scripts/util/Class").Class;

const COLLECTION_SIZE_QUOTA = 20000;

const Reducer = Class.extend({
    init: function (co: dw.object.CustomObject) {
        if (empty(co)) {
            return new Error('No Custom Object found');
        }

        /**
         * The custom object for the reducer
         *
         * @type {dw.object.CustomObject}
         */
        this._co = co;

        this._config = {
            storefrontCatalogId: co.custom.storefrontCatalog,
            masterCatalogIds: co.custom.masterCatalogs.split(','),
            maxProductsPerCategory: co.custom.numberProducts,
            onlineOnly: co.custom.onlineProducts,
            specificProductIds: co.custom.productIDs instanceof String ? co.custom.productIDs.split(',') : [],
            exportImages: co.custom.exportImages,
            imageSizes: co.custom.imageSizes,
            exportPricebooks: co.custom.exportPricebooks,
            exportInventoryList: co.custom.exportInventoryList
        };

        this._config.arrayOfCatalogIds = Catalogs.createArrayOfCatalogIDs(this._config.storefrontCatalogId, this._config.masterCatalogIds);
        this._config.rootDirectoryObj = Directories.prepareRootFolder(this._config.storefrontCatalogId);

        /**
         * Because SFCC has a hard quota limit at 20,000 elements,
         * we needed a way to generate catalogs larger than a size
         * of 20,000. The solution was to create a list of sets.
         *
         * A known caveat to this is that even though a Set is
         * guaranteed unique elements, because we have to split the
         * results amongst a series of Sets, we cannot guarantee
         * that every element across all Sets will be unique.
         *
         * @type {dw.util.ArrayList<Set<dw.catalog.Product>>}
         */
        this._setsOfProducts = new ArrayList();

        /**
         *
         * @type {dw.util.LinkedHashSet<Product>}
         */
        this._currentSet = new LinkedHashSet();
    },

    /**
     * Get the configuration for the reducer instance
     *
     * @returns {*|{specificProductIds: (dw.order.ShippingOrderItem|string[]|*[]), storefrontCatalogId: *, onlineOnly: *, maxProductsPerCategory: *}}
     */
    getConfig: function () {
        return this._config;
    },

    /**
     * Get the custom object passed into the instance
     *
     * @returns {dw.object.CustomObject}
     */
    getCO: function () {
        return this._co;
    },

    /**
     * Gets the List of Sets of products
     *
     * @returns {dw.util.ArrayList<dw.util.Set<dw.catalog.Product>>}
     */
    getSets: function () {
        return this._setsOfProducts;
    },

    /**
     * Get the current set to add products
     *
     * @returns {dw.util.LinkedHashSet<dw.catalog.Product>}
     */
    getCurrentSet: function () {
        return this._currentSet;
    },

    /**
     * Generates the reduced catalog data
     */
    generateReducedCatalog: function () {
        const storefrontCatalog = CatalogMgr.getCatalog(this.getConfig().storefrontCatalogId);
        const rootCategory = storefrontCatalog.getRoot();

        this.addCategory(rootCategory);

        // add the final set the sets of products
        // the addCategory recursion will add previous ones
        this.getSets().add(this.getCurrentSet());

        if (this.getConfig().specificProductIds.length > 0) {
            const products = new LinkedHashSet(
                new ArrayList(
                    Transaction.wrap(() => this.getConfig().specificProductIds.map((pid) => ProductMgr.getProduct(pid)))
                )
            );

            /**
             * Add the specifically requested products.
             * The reason for the * -1 stuff is to guarantee
             * that the max count is not reached
             */
            this.addProducts(products, (products.size() * -1));
        }
    },

    /**
     *
     * @param {dw.catalog.Category} category
     */
    addCategory: function (category: dw.catalog.Category) {
        const subCategories = this.onlineOnly
            ? category.getOnlineSubCategories()
            : category.getSubCategories();

        [].forEach.call(subCategories, (category) => this.addCategory(category));

        const products = this.onlineOnly
            ? category.getOnlineProducts()
            : category.getProducts();

        this.addProducts(products, 0);
    },

    /**
     *
     * @param {dw.util.Collection} products
     * @param {Number} currentCount
     */
    addProducts: function (products: dw.util.Collection, currentCount: Number) {
        [].some.call(products, (product) => {
            if (
                product.isMaster()
                || product.isProductSet()
                || product.isBundle()
            ) {
                this.addProducts(productTypeCollection(product), currentCount);
            }

            if (this.getCurrentSet().size() === COLLECTION_SIZE_QUOTA) {
                this.getSets().add(this.getCurrentSet());
                this._currentSet = new LinkedHashSet();
            }

            this.getCurrentSet().add(product);

            currentCount++;

            if (currentCount >= this.getConfig().maxProductsPerCategory) {
                return true;
            }
        });
    }
});

/**
 * Helper function go get a collection of products based on the type of product
 *
 * @param {dw.catalog.Product} product
 * @returns {dw.util.Collection<dw.catalog.Variant>|dw.util.Collection<dw.catalog.Product>}
 */
function productTypeCollection(product: dw.catalog.Product) {
    if (product.isMaster()) {
        return product.getVariants();
    }

    if (product.isProductSet()) {
        return product.getProductSetProducts();
    }

    if (product.isBundle()) {
        return product.getBundledProducts();
    }
}

module.exports = Reducer;
