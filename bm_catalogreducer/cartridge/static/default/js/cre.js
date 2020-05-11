(function( cre, $, undefined ) {
    function init() {
        jQuery(document).ready(function() {
            var $cache = {};
            $cache.body = $('body');

            //show exported catalogs in the Recent Catalog Export table
            cre.util.showCatalogFileList(cre.urls.showCatalogFileList);
            //removed code here

            //refresh exported catalog list on refresh button click
            $cache.body.on("click", "#catalog-list-refresh", function(e) {
                cre.util.showCatalogFileList(cre.urls.showCatalogFileList);
            });

            //expand catalog directory to show all catalog XML files
            $cache.body.on("click", ".catalog-directory-link", function(e) {
                e.preventDefault();
                var $self = $(this);
                var $tr = $self.parents('tr');
                var thisPath = $tr.attr('data-parentpath') + $tr.attr('data-filename') + '/';
                var $children = $cache.body.find('#cat-files-table tr.inner[data-parentpath="' + thisPath + '"]');
                var $icon = $self.find("i");

                //change the arrow direction
                if ($icon.hasClass('fa-folder-open')) {
                    $self.find("i").removeClass('fa-folder-open');
                    $self.find("i").addClass('fa-folder');

                    if ($children.length > 0) {
                        // Close all open children
                        $cache.body.find('#cat-files-table tr.inner[data-parentpath^="' + thisPath + '"]').hide();
                        var $directoryChildren = $cache.body.find('#cat-files-table tr.directory.inner[data-parentpath^="' + thisPath + '"]');
                        $directoryChildren.find("i").removeClass('fa-folder-open');
                        $directoryChildren.find("i").addClass('fa-folder');
                    }
                } else {
                    $self.find("i").removeClass('fa-folder');
                    $self.find("i").addClass('fa-folder-open');
                    $children.show();
                }
            });

            //ensure custom object is not already running
            cre.util.getCustomObjectStatus(cre.urls.getCustomObjectJson);

            //grab initial cre-catalogs-div HTML content for refresh purpose
            var loadingCatalogsHTML = jQuery('#cre-catalogs-div').html();

            //show all catalogs in the menu and disable export catalog button until done
            jQuery('button#export-catalog-btn').prop('disabled', true);
            if (localStorage && localStorage.getItem('creAllCatalogs')) {
                //check if 10 minutes has passed to retrieve catalog list again
                var oldDate = Date.parse(localStorage.getItem('creAllCatalogsDate'));
                var newDate = new Date();
                if ((newDate - oldDate) > 600000) {
                    cre.util.showAllCatalogs(cre.urls.showAllCatalogs);
                } else {
                    jQuery('#cre-catalogs-div').html(localStorage.getItem('creAllCatalogs'));
                    jQuery('button#export-catalog-btn').prop('disabled', false);
                }
            } else {
                cre.util.showAllCatalogs(cre.urls.showAllCatalogs);
            }
            //refresh all catalogs on refresh catalogs link click
            $cache.body.on("click", "#all-catalogs-refresh", function(e) {
                jQuery('#cre-catalogs-div').html(loadingCatalogsHTML);
                jQuery('button#export-catalog-btn').prop('disabled', true);
                cre.util.showAllCatalogs(cre.urls.showAllCatalogs);
            });

            //Delete a catalog directory
            $cache.body.on("click", ".delete-directory-folder", function(e) {
                var directory = $(this).attr('data-filepath');
                var del = confirm("Are you sure you want to delete " + directory + "?");
                if (del == true) {
                    var data = {
                        dir: directory
                    }
                    cre.util.deleteDirectoryFolder(cre.urls.deleteDirectoryFolder, data);
                }
            });

            //Show CSV product ids textarea when specific products will be included
            $cache.body.on("change", "input#csvprods", function(e) {
                jQuery("#csv-prods-row").toggle();
                var value = jQuery("#noofprods").val();
                //disable export button if # of prods is 0 or empty
                if (!jQuery("#csvprods").prop('checked')) {
                    if ((value === "") || (value < 1)) {
                        jQuery('button#export-catalog-btn').prop('disabled', true);
                        jQuery("#noofprods-error").html("Number of products cannot be less than 1, unless at least 1 product ID is provided");
                    }
                } else if (jQuery("#csvprods").prop('checked')) {
                    if (cre.util.inProgress) {
                        jQuery('button#export-catalog-btn').prop('disabled', true);
                    } else {
                        if (((value === "") || (value < 1)) && (jQuery("#prodids").val().length > 0)) {
                            jQuery('button#export-catalog-btn').prop('disabled', false);
                            jQuery("#noofprods-error").html("");
                        }
                    }
                }
            });



            //Show export image sizes
            $cache.body.on("change", "input#exportimages", function(e) {
                jQuery("#images-size-row").toggle();
                var value = jQuery("#imagesizes").val();
                //disable export button if # of prods is 0 or empty
                if (!jQuery("#exportimages").prop('checked')) {
                    if (value.length === 0) {
                        jQuery("#imagesizes").val('large,medium,small,swatch');
                    }
                } else if (jQuery("#exportimages").prop('checked')) {
                    if (cre.util.inProgress) {
                        jQuery('button#export-catalog-btn').prop('disabled', true);
                    } else {
                        if (((value === "") || (value.length < 1))) {
                            jQuery('button#export-catalog-btn').prop('disabled', false);
                            jQuery("#imagesizes-error").html("Please provide at least one image size");
                        }
                    }
                }
            });

            //check value of number of products input field
            $cache.body.on("keyup", "#noofprods", function(e) {
                e.preventDefault();
                var value = jQuery(this).val();
                var msg = "";
                if (cre.util.inProgress) {
                    jQuery('button#export-catalog-btn').prop('disabled', true);
                } else {
                    if (value === "") {
                        msg = "";
                        if (jQuery("#prodids").val().length < 1) {
                            jQuery('button#export-catalog-btn').prop('disabled', true);
                        }
                    } else if (value < 1) {
                        if (jQuery("#csvprods").prop('checked')) {
                            if (jQuery("#prodids").val().length > 0) {
                                msg = "";
                            } else {
                                msg = "Number of products cannot be less than 1, unless at least 1 product ID is provided";
                                jQuery('button#export-catalog-btn').prop('disabled', true);
                            }
                        } else {
                            msg = "Number of products cannot be less than 1, unless at least 1 product ID is provided";
                            jQuery('button#export-catalog-btn').prop('disabled', true);
                        }
                    } else if (value > 10) {
                        msg = "Number of products cannot be more than 10";
                    } else {
                        jQuery('button#export-catalog-btn').prop('disabled', false);
                        msg = "";
                    }
                    jQuery("#noofprods-error").html(msg);
                }
            });

            //if number of products is blank or zero, on change of adding a product ID, it should be valid
            $cache.body.on("keyup", "#prodids", function(e) {
                if (cre.util.inProgress) {
                    jQuery('button#export-catalog-btn').prop('disabled', true);
                } else {
                    if ((jQuery("#noofprods").val() === '') || (jQuery("#noofprods").val() == 0)) {
                        if (jQuery("#prodids").val().length > 0) {
                            jQuery("#noofprods-error").html(''); //remove any message
                            jQuery("#noofprods").val(0); //replace value to 0
                            jQuery('button#export-catalog-btn').prop('disabled', false);
                        } else {
                            jQuery('button#export-catalog-btn').prop('disabled', true);
                            jQuery("#noofprods-error").html('Number of products cannot be less than 1, unless at least 1 product ID is provided');
                        }
                    }
                }
            });

            //if number of products input field is blank
            $cache.body.on("blur", "#noofprods", function(e) {
                e.preventDefault();
                var value = jQuery(this).val();
                if ((value === "") && (jQuery("#prodids").val().length < 1)) {
                    jQuery("#noofprods-error").html("Number of products cannot be empty");
                }
            });

            jQuery("form#catalogreducerform").submit(function (e) {
                e.preventDefault();
                var valid = true; //for form validation

                //check for master catalog selection
                if ((jQuery("input[name=mastercat]:checked").length > 0)) {
                    var mastercat = "";
                    jQuery("input[name=mastercat]:checked").each(function() {
                        mastercat += $(this).val() + ",";
                    });
                    //remove last comma on master category list
                    mastercat = mastercat.slice(0, -1);
                } else {
                    var mastercat = "";
                }

                //mark storefront catalog id
                var storefrontcat = jQuery("input[name=storefrontcat]:checked").val();

                if (jQuery("#onlineprods").prop('checked')) {
                    var onlineprods = true;
                } else {
                    var onlineprods = false;
                }

                var exportimages = false;
                if (jQuery("#exportimages").prop('checked')) {
                    exportimages = true;
                }

                var zipandmove = false;
                if (jQuery("#zipandmove").prop('checked')) {
                    zipandmove = true;
                }

                var noofprods = jQuery("#noofprods").val();
                if (noofprods === "") {
                    if (jQuery("#prodids").val().length > 0) {
                        jQuery("#noofprods").val(0);
                        noofprods = 0;
                    } else {
                        jQuery("#noofprods").val(5);
                        noofprods = 5;
                    }
                } else if (noofprods < 1) {
                    if (jQuery("#prodids").val().length > 0) {
                        jQuery("#noofprods").val(0);
                        noofprods = 0;
                    } else {
                        jQuery("#noofprods").val(1);
                        noofprods = 1;
                    }
                } else if (noofprods > 10) {
                    jQuery("#noofprods").val(10);
                    noofprods = 10;
                }

                //if specific products to be included set in prodids variable
                var prodids = '';
                if (jQuery("#csvprods").prop('checked')) {
                    if (jQuery("#prodids").val().length > 0) {
                        prodids = jQuery("#prodids").val();
                        jQuery("#csv-error").html('');
                    } else {
                        valid = false;
                        jQuery("#csv-error").html('Please input at least 1 product ID!');
                    }
                }

                //if export images is checked, we need to provide sizes
                var imagesizes = '';
                if (jQuery("#exportimages").prop('checked')) {
                    if (jQuery("#imagesizes").val().length > 0) {
                        imagesizes = jQuery("#imagesizes").val();
                        jQuery("#imagesizes-error").html('');
                    } else {
                        valid = false;
                        jQuery("#imagesizes-error").html('Please input at least 1 image size!');
                    }
                }

                var $form = jQuery(this),
                    url = $form.attr('action'),
                    prodids = prodids,
                    storefrontcat = storefrontcat,
                    data = {
                        noofprods: noofprods,
                        onlineprods: onlineprods,
                        exportimages: exportimages,
                        zipandmove: zipandmove,
                        prodids: prodids,
                        imagesizes: imagesizes,
                        mastercat: mastercat,
                        storefrontcat: storefrontcat
                    }

                if (valid) {
                    cre.util.runCREJob(url, data);
                    cre.util.getCustomObjectStatus(cre.urls.getCustomObjectJson);
                    setInterval(function() {
                        cre.util.getCustomObjectStatus(cre.urls.getCustomObjectJson);
                    }, 10000);
                }
            });
        });
    }
    init();

}( window.cre = window.cre || {}, jQuery ));

(function( cre, $, undefined ) {

    cre.util = {

        //to monitor progress of job if already started
        inProgress : false,

        showAllCatalogs : function (url) {
            var u = url;
            jQuery.post(u).done(function(response) {
                var response = jQuery.trim(response);
                if (localStorage) {
                    localStorage.setItem('creAllCatalogs', response);
                    var date = new Date();
                    localStorage.setItem('creAllCatalogsDate', date);
                    jQuery('#cre-catalogs-div').html(localStorage.getItem('creAllCatalogs'));
                } else {
                    jQuery('#cre-catalogs-div').html(response);
                }
                // check if export job is currently running
                if (cre.util.inProgress) {
                    jQuery('button#export-catalog-btn').prop('disabled', true);
                } else {
                    jQuery('button#export-catalog-btn').prop('disabled', false);
                }
            });
        },
        showCatalogFileList : function (url) {
            var u = url;
            jQuery.post(u).done(function(response) {
                var $response = jQuery(jQuery.trim(response));
                jQuery('#cre-catalogfilelist-div').html($response);
            });
        },
        showCatalogDirectoryFiles : function (url, data, i) {
            var u = url,
                d = data,
                i = i;
            jQuery.post(u, d).done(function(response) {
                var response = jQuery.trim(response);
                jQuery('#directory-files-cell-'+i).html(response);
            });
        },
        deleteDirectoryFolder : function (url, data) {
            var u = url,
                d = data;
            jQuery.post(u, d).done(function(response) {
                cre.util.showCatalogFileList(cre.urls.showCatalogFileList);
            });
        },
        runCREJob : function (url, data) {
            var u = url,
                d = data;
            jQuery.post(u, d).done(function(response) {
                jQuery('#export-catalog-btn').prop('disabled', true);
                jQuery('#export-progress-div').fadeIn(500);
            });
        },
        getCustomObjectStatus : function (url) {
            var u = url;
            jQuery.getJSON(u, function(data) {
                if (data.running) {
                    cre.util.inProgress = true;
                    var progress = data.progress;
                    jQuery('#export-progress-div').fadeIn(500);
                    jQuery('#export-progress-complete').animate({
                        width: progress+'%'
                    }, 500);
                    jQuery('#export-progress-complete').html(progress + '%');
                    if (data.progress == 100) {
                        jQuery('#export-progress-text').html('Complete');
                    } else {
                        jQuery('#export-progress-text').html('Running');
                    }
                    jQuery('#export-catalog-btn').prop('disabled', true);
                } else {
                    if (cre.util.inProgress == true) {
                        jQuery('#export-progress-complete').animate({
                            width: '100%'
                        }, 500);
                        jQuery('#export-progress-complete').html('100%');
                        jQuery('#export-progress-text').html('Complete');
                        jQuery('#export-progress-div').fadeOut(500);
                        jQuery('#export-catalog-btn').prop('disabled', false);
                        cre.util.inProgress = false;
                        cre.util.showCatalogFileList(cre.urls.showCatalogFileList);
                    }
                }
            })
        }
    };

}( window.cre = window.cre || {}, jQuery ));
