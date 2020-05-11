'use strict';

const File = require('dw/io/File');
const Pipeline = require('dw/system/Pipeline');
const Status = require('dw/system/Status');

const app = require('~/cartridge/scripts/app');
const guard = require('~/cartridge/scripts/guard');
const Catalogs = require('~/cartridge/scripts/lib/Catalogs');
const COHelper = require('~/cartridge/scripts/lib/COHelper');
const Directories = require('~/cartridge/scripts/lib/Directories');

function menu() {
    app.getView().render('application/UI/menu');
}

function deleteDirectoryFolder() {
    var httpParameterMap = request.httpParameterMap;

    if (httpParameterMap.isParameterSubmitted('dir')) {
        Directories.removeFile(httpParameterMap.dir.stringValue);
    }

    app.getView().render('application/UI/deletedirectory');
}

function catalogFileList() {
    app.getView({
        RootDirectory: new File(Directories.ROOT_FOLDER)
    }).render('application/UI/catalogfiles');
}

function getAllCatalogs() {
    app.getView({
        CatalogDetails: Catalogs.getAllCatalogs()
    }).render('application/UI/allcatalogs');
}

function getCOJson() {
    app.getView({
        CatalogReducerInfo: COHelper.getCustomObject()
    }).render('application/UI/customobjectjson');
}

function exportJob() {
    var httpParameterMap = request.httpParameterMap;
    var parameters = {
        NumberOfProducts: httpParameterMap.noofprods.intValue,
        OnlineProducts: httpParameterMap.onlineprods.booleanValue,
        ProductIDs: httpParameterMap.prodids.stringValue,
        MasterCatalog: httpParameterMap.mastercat.stringValue,
        StorefrontCatalog: httpParameterMap.storefrontcat.stringValue,
        ExportImages: httpParameterMap.exportimages.booleanValue,
        ZipAndMove: httpParameterMap.zipandmove.booleanValue,
        ImageSizes: httpParameterMap.imagesizes.stringValue
    };

    COHelper.createCustomObject(parameters);
    var result = Pipeline.execute('CatalogExporter-ExportJob');
    if (result.hasOwnProperty('Status') && result.Status.getStatus() !== Status.OK) {
        app.getView().render('application/UI/exportError');
        return;
    }

    app.getView().render('application/UI/exportSuccess');
}

exports.Menu = guard.httpsGet(menu);
exports.DeleteDirectoryFolder = guard.httpsPost(deleteDirectoryFolder);
exports.CatalogFileList = guard.httpsPost(catalogFileList);
exports.GetAllCatalogs = guard.httpsPost(getAllCatalogs);
exports.GetCOJson = guard.httpsGet(getCOJson);
exports.ExportJob = guard.httpsPost(exportJob);
