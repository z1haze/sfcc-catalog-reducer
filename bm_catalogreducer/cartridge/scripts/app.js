'use strict';

/**
 * @module app
 */

/**
 * Returns a view for the given name. The view is expected under the views directory.
 * If no view exists with this name or if no view name is specified, a default view is returned instead.
 *
 * @param  {string} viewName   The name of the view
 * @param  {object} parameters The parameters to pass to the view
 * @return {object/View}       The view object instance
 *
 * @example
 * // use an anonymous view
 * require('~/app').getView().render('path/to/template');
 *
 * // or use a named view
 * var product = dw.catalog.ProductMgr.getProduct('123456');
 * require('~/app').getView('Product', {
 *     product : product,
 *     showRecommendations : false
 * }).render('path/to/template');
 */
exports.getView = function (viewName, parameters) {
    var View;
    try {

        if (typeof viewName === 'string') {
            View = require('./views/' + viewName + 'View');
        } else {
            // use first argument as parameters if not a string
            // to allow for anonymous views
            parameters = viewName;
            View = require('./views/View');
        }
    } catch (e) {
        View = require('./views/View');
    }
    return new View(parameters || {});
};
