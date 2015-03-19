(function( cre, $, undefined ) {
	
	function init() {
		jQuery(document).ready(function(){
			
			//show "Simple" menu on page load, pulls cre.urls from creresources.isml
			var data = {cremenu: "Simple"}
			cre.util.showCREMenu(cre.urls.showCREMenu, data);
		
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
				} 
				else {
					var onlineprods = false;
				}
				
				var noofprods = jQuery("#noofprods").val();
				if (noofprods === "") {
					noofprods = 5;
				}
				else if (noofprods < 1) {
					noofprods = 1;
				}
				else if (noofprods > 20) {
					noofprods = 20;
				}
				
				var $form = jQuery(this),
					url = $form.attr('action'),
					prodids = jQuery("#prodids").val(),
					expmethod = jQuery("#expmethod").val(),
					data = {
						noofprods: noofprods,
						onlineprods: onlineprods,
						prodids: prodids,
						expmethod: expmethod
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