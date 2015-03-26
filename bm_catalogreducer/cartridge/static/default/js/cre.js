(function( cre, $, undefined ) {
	
	function init() {
		jQuery(document).ready(function(){
			
			//show exported catalogs in the Recent Catalog Export table
			cre.util.showCatalogFileList(cre.urls.showCatalogFileList);
			setInterval(function() {
				cre.util.showCatalogFileList(cre.urls.showCatalogFileList);
			}, 10000);
			//refresh exported catalog list on refresh button click
			jQuery("body").on("click", "#catalog-list-refresh", function(e) {
				cre.util.showCatalogFileList(cre.urls.showCatalogFileList);
			});
			
			//show all catalogs in the menu and disable export catalog button until done
			jQuery('button#export-catalog-btn').prop('disabled', true);
			if (localStorage && localStorage.getItem('creAllCatalogs')) {
				jQuery('#cre-catalogs-div').html(localStorage.getItem('creAllCatalogs'));
				jQuery('button#export-catalog-btn').prop('disabled', false);
			} else {
				cre.util.showAllCatalogs(cre.urls.showAllCatalogs);
			}
			
			//Show CSV product ids textarea when specific products will be included 
			jQuery("body").on("change", "input#csvprods", function(e) {
				jQuery("#csv-prods-row").toggle();
			});
			
			//check value of number of products input field
			jQuery("body").on("keyup", "#noofprods", function(e) {
				e.preventDefault();
				var value = jQuery(this).val();
				var msg = "";
				if (value === "") {
					msg = "";
				} else if (value < 1) {
					msg = "Number of products cannot be less than 1";
				} else if (value > 10) {
					msg = "Number of products cannot be more than 10";
				} else {
					msg = "";
				}
				jQuery("#noofprods-error").html(msg);
			});
			
			//if number of products input field is blank
			jQuery("body").on("blur", "#noofprods", function(e) {
				e.preventDefault();
				var value = jQuery(this).val();
				if (value === "") {
					jQuery("#noofprods-error").html("Number of products cannot be empty");
				}
			});
			
			jQuery("form#catalogreducerform").submit(function (e) {
				e.preventDefault();
				var valid = false; // for form validation
				
				//check for master and storefront catalog selection
				if ((jQuery("input[name=mastercat]:checked").length > 0) && (jQuery("input[name=storefrontcat]:checked").length > 0)) {
					var mastercat = "";
					jQuery("input[name=mastercat]:checked").each(function() {
						mastercat += $(this).val() + ",";
					});
					//remove last comma on master category list
					mastercat = mastercat.slice(0, -1);
					
					var storefrontcat = jQuery("input[name=storefrontcat]:checked").val();
					jQuery("#catalogs-error").html('');
					valid = true;
				} else {
					if ((jQuery("input[name=mastercat]:checked").length < 1) && (jQuery("input[name=storefrontcat]:checked").length < 1)) {
						jQuery("#catalogs-error").html('Please select at least 1 master catalog and the storefront catalog!');
					} else if (jQuery("input[name=mastercat]:checked").length < 1) {
						jQuery("#catalogs-error").html('Please select at least 1 master catalog!');
					} else if (jQuery("input[name=storefrontcat]:checked").length < 1) {
						jQuery("#catalogs-error").html('Please select the storefront catalog!');
					}
				}
				
				if (jQuery("#onlineprods").prop('checked')) {
					var onlineprods = true;
				} else {
					var onlineprods = false;
				}
				
				var noofprods = jQuery("#noofprods").val();
				if (noofprods === "") {
					jQuery("#noofprods").val(5);
					noofprods = 5;
				} else if (noofprods < 1) {
					jQuery("#noofprods").val(1);
					noofprods = 1;
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
				
				var $form = jQuery(this),
					url = $form.attr('action'),
					prodids = prodids,
					storefrontcat = storefrontcat,
					data = {
						noofprods: noofprods,
						onlineprods: onlineprods,
						prodids: prodids,
						mastercat: mastercat,
						storefrontcat: storefrontcat
					}
				
				if (valid) {
					cre.util.runCREJob(url, data);
				}
			});
		});
	}
	init();

}( window.cre = window.cre || {}, jQuery ));

(function( cre, $, undefined ) {
	
	cre.util = {
	
		showAllCatalogs : function (url) {
			var u = url;
			jQuery.post(u).done(function(response) {
				var response = jQuery.trim(response);
				if (localStorage) {
					localStorage.setItem('creAllCatalogs', response);
					jQuery('#cre-catalogs-div').html(localStorage.getItem('creAllCatalogs'));
				} else {
					jQuery('#cre-catalogs-div').html(response);
				}
				jQuery('button#export-catalog-btn').prop('disabled', false);
			});
		},
		showCatalogFileList : function (url) {
			var u = url;
			jQuery.post(u).done(function(response) {
				var $response = jQuery(jQuery.trim(response));
				jQuery('#cre-catalogfilelist-div').html($response);
			});
		},
		runCREJob : function (url, data) {
			var u = url,
				d = data;
			jQuery.post(u, d).done(function(response) {
				jQuery('#exportFinishMessageTbl').show();
				var $response = jQuery(jQuery.trim(response));
				jQuery('#exportFinishMessage').html($response);
			});
		}	
	};
	
}( window.cre = window.cre || {}, jQuery ));