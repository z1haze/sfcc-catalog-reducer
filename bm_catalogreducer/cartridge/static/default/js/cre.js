(function( cre, $, undefined ) {
	
	function init() {
		jQuery(document).ready(function(){
			
			//show "Simple" menu on page load, pulls cre.urls from creresources.isml
			var data = {cremenu: "Simple"}
			cre.util.showCREMenu(cre.urls.showCREMenu, data);
			
			//show all catalogs in the menu and disable export catalog button until done
			jQuery('button#export-catalog-btn').prop('disabled', true);
			cre.util.showAllCatalogs(cre.urls.showAllCatalogs);
			
			//check value of number of products input field
			jQuery("body").on("keyup", "#noofprods", function(e) {
				e.preventDefault();
				var value = jQuery(this).val();
				var msg = "";
				if (value === "") {
					msg = "";
				} else if (value < 1) {
					msg = "Number of products cannot be less than 1";
				} else if (value > 20) {
					msg = "Number of products cannot be more than 20";
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
		
			jQuery("body").on("click", "a.switch_link", function(e) {
				e.preventDefault();
				var id = jQuery(this).attr("id");
				var url = jQuery(this).attr('href');
				jQuery(".switch_link_span").each(function(i, v) {
					var iid = jQuery(this).attr('id').replace("infobox_item-","");
					jQuery(this).html('<a href="'+url+'" class="switch_link" id="'+iid+'">'+iid+'</a>');
					jQuery(this).removeClass("switch_link");
				});
				jQuery("#infobox_item-"+id).html(id).addClass("switch_link");
				
				var data = {
					cremenu: id
				};
				
				cre.util.showCREMenu(url, data);
				
			});
			
			jQuery("form#catalogreducerform").submit(function (e) {
				e.preventDefault();
				
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
				} else if (noofprods > 20) {
					jQuery("#noofprods").val(20);
					noofprods = 20;
				}
				
				var mastercat = "";
				jQuery("input[name=mastercat]:checked").each(function() {
					mastercat += $(this).val() + ",";
				});
				//remove last comma on master category list
				mastercat = mastercat.slice(0, -1);
				
				var $form = jQuery(this),
					url = $form.attr('action'),
					prodids = jQuery("#prodids").val(),
					expmethod = jQuery("#expmethod").val(),
					storefrontcat = jQuery("input[name=storefrontcat]:checked").val(),
					data = {
						noofprods: noofprods,
						onlineprods: onlineprods,
						prodids: prodids,
						expmethod: expmethod,
						mastercat: mastercat,
						storefrontcat: storefrontcat
					}
				cre.util.runCREJob(url, data);
			});
		});
	}
	init();

}( window.cre = window.cre || {}, jQuery ));

(function( cre, $, undefined ) {
	
	cre.util = {
	
		showCREMenu : function (url, data) {
			var u = url,
				d = data;
			jQuery.post(u, d).done(function(response) {
				var $response = jQuery(jQuery.trim(response));
				jQuery('#cre-menu-div').html($response);
			});
		},
		showAllCatalogs : function (url) {
			var u = url;
			jQuery.post(u).done(function(response) {
				var $response = jQuery(jQuery.trim(response));
				jQuery('#cre-catalogs-div').html($response);
				jQuery('button#export-catalog-btn').prop('disabled', false);
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