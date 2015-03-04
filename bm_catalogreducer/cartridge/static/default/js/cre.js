(function( cre, $, undefined ) {
	
	function init() {
		jQuery(document).ready(function(){
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
					
				//jQuery(".cre-table").hide();
				//jQuery("#cre-table-"+id).show();
				
				
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
		}	
	};
	
}( window.cre = window.cre || {}, jQuery ));