/**
 * Display the page
 */
module.exports.Menu = function () {
    const ISML = require('dw/template/ISML');

    ISML.renderTemplate('application/UI/menu');
};

/**
 * Display catalogs UI
 */
module.exports.GetAllCatalogs = function () {
    const ISML = require('dw/template/ISML');
    const Catalogs = require('~/cartridge/scripts/lib/Catalogs');

    ISML.renderTemplate('application/UI/allcatalogs', {
        CatalogDetails: Catalogs.getAllCatalogs()
    });
};

/**
 * Display the recent exports UI
 */
module.exports.ShowExports = function () {
    const File = require('dw/io/File');
    const ISML = require('dw/template/ISML');
    const Directories = require('~/cartridge/scripts/lib/Directories');

    ISML.renderTemplate('application/UI/catalogfiles', {
        RootDirectory: new File(Directories.ROOT_FOLDER)
    });
};

/**
 * Execute the catalog reducer job
 */
module.exports.ExportJob = function () {
    const COHelper = require('~/cartridge/scripts/lib/COHelper');
    const httpParameterMap = request.httpParameterMap;

    const parameters = {
        NumberOfProducts: httpParameterMap.noofprods.intValue,
        OnlineProducts: httpParameterMap.onlineprods.booleanValue,
        OrderableProducts: httpParameterMap.orderableprods.booleanValue,
        ProductIDs: httpParameterMap.prodids.stringValue,
        MasterCatalog: httpParameterMap.mastercat.stringValue,
        StorefrontCatalog: httpParameterMap.storefrontcat.stringValue,
        ExportImages: httpParameterMap.exportimages.booleanValue,
        ImageSizes: httpParameterMap.imagesizes.stringValue,
        ExportPricebooks: httpParameterMap.exportpricebooks.booleanValue,
        ExportInventoryList: httpParameterMap.exportinventorylist.booleanValue
    };

    const co = COHelper.createCustomObject(parameters);

    /**
     * Not documented, but it works to start the job
     */
    dw.system.Pipelet('RunJobNow').execute({
        JobName: 'ManualCatalogReducerExport'
    });

    response.setStatus(200);
    response.getWriter().print(co.custom.state);
};


/**
 * Get the current state of an export job
 */
module.exports.CheckJobStatus = function () {
    const COHelper = require('~/cartridge/scripts/lib/COHelper');
    const co = COHelper.getCustomObject();

    response.setStatus(200);
    response.getWriter().print(co ? co.custom.state : '');
};

module.exports.Menu.public = true;
module.exports.GetAllCatalogs.public = true;
module.exports.ShowExports.public = true;
module.exports.ExportJob.public = true;
module.exports.CheckJobStatus.public = true;
