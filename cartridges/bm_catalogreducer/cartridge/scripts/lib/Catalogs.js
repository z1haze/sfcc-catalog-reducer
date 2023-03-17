const CatalogMgr = require('dw/catalog/CatalogMgr');
const HTTPClient = require('dw/net/HTTPClient');
const URLUtils = require('dw/web/URLUtils');
const Logger = require('dw/system/Logger');
const Status = require('dw/system/Status');

const utils = require('~/cartridge/scripts/util');
const Directories = require('~/cartridge/scripts/lib/Directories');

const CATALOGS_LIST_URL = 'ViewChannelCatalogList_52-ListAll';
const TIMEOUT = 50000;

module.exports = {
    getAllCatalogs: function () {
        const httpClient = new HTTPClient();

        httpClient.setTimeout(TIMEOUT);
        httpClient.setRequestHeader('Cookie', utils.copyCookies());
        httpClient.open('GET', URLUtils.https(CATALOGS_LIST_URL).toString());
        httpClient.send();

        const res = httpClient.text;
        const catalogRegExp = new RegExp("class=\"catalog\".*?</a>", 'g');
        const catalogNamesAll = res.match(catalogRegExp);

        return {
            catalogs: [].map.call(catalogNamesAll, catalogName =>
                catalogName.replace('class="catalog">', '').replace('</a>', ''))
                .filter(catalogName => !empty(catalogName)),

            storefrontCatalogID: CatalogMgr.getSiteCatalog().getID()
        };
    },

    createArrayOfCatalogIDs: function (storefrontCatalogID, masterCatalogs) {
        if (!empty(masterCatalogs)) {
            masterCatalogs.push(storefrontCatalogID);
            return masterCatalogs;
        }

        return [storefrontCatalogID];
    },

    exportCatalog: function (catalogId, rootDirectoryObj, setsOfProducts) {
        const catalog = CatalogMgr.getCatalog(catalogId);
        const itr = setsOfProducts.iterator();

        let count = 1;

        while (itr.hasNext()) {
            let set = itr.next();
            let productsIterator = set.iterator();
            let catalogFolderObj = Directories.prepareCatalogFolder(rootDirectoryObj.directoryPath, catalogId);

            let result = dw.system.Pipelet('ExportCatalog').execute({
                Catalog: catalog,
                ExportFile: catalogFolderObj.catalogFilePath.replace('catalog.xml', 'catalog_' + count + '.xml'),
                Products: productsIterator
            });

            if (!result.Status || result.Status.getStatus() !== Status.OK) {
                Logger.error('Cannot export catalog {0}. Error code: {1}. Error mesage: {2}', catalogId + '_' + count, result.ErrorCode, result.ErrorMsg);

                return false;
            }

            count++;
        }

        Logger.info('Catalog {0} successfully exported', catalogId);

        return true;
    }
}