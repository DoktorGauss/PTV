jQuery.fn.highlight = function(pat) {

 var index = 1;

 function innerHighlight(node, pat) {
  var skip = 0;
  if (node.nodeType == 3) {
   var pos = node.data.toUpperCase().indexOf(pat);
   // we have a hit and we haven't yet added the highlight
   if (pos >= 0 && !$(node.parentNode).hasClass("highlight")) {
    var spannode = document.createElement('span');
    spannode.className = 'highlight';
    spannode.id = 'highlight' + index;
	index = index + 1;
	var middlebit = node.splitText(pos);
    var endbit = middlebit.splitText(pat.length);
    var middleclone = middlebit.cloneNode(true);
    spannode.appendChild(middleclone);
    middlebit.parentNode.replaceChild(spannode, middlebit);
    skip = 1;
   }
  }
  else if (node.nodeType == 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {
   for (var i = 0; i < node.childNodes.length; ++i) {
    i += innerHighlight(node.childNodes[i], pat);
   }
  }
  return skip;
 }
 return this.each(function() {
  innerHighlight(this, pat.toUpperCase());
 });
};

jQuery.fn.removeHighlight = function() {
 function newNormalize(node) {
    for (var i = 0, children = node.childNodes, nodeCount = children.length; i < nodeCount; i++) {
        var child = children[i];
        if (child.nodeType == 1) {
            newNormalize(child);
            continue;
        }
        if (child.nodeType != 3) { continue; }
        var next = child.nextSibling;
        if (next == null || next.nodeType != 3) { continue; }
        var combined_text = child.nodeValue + next.nodeValue;
        new_node = node.ownerDocument.createTextNode(combined_text);
        node.insertBefore(new_node, child);
        node.removeChild(child);
        node.removeChild(next);
        i--;
        nodeCount--;
    }
 }

 return this.find("span.highlight").each(function() {
    var thisParent = this.parentNode;
    thisParent.replaceChild(this.firstChild, this);
    newNormalize(thisParent);
 }).end();
};

// Main entry for search after document has been loaded
$(document).ready(function () {
	
	// pointer for currently highlighted hit
	var index = 1;
	var previous = 0;
	
	// jumps to highlight
	function jumpToHighlight() {
		// remove previous highlight
		var previousHighlightId = "#highlight" + previous;
		if($(previousHighlightId).length) {
			$(previousHighlightId).removeClass("highlightActive");
		} 
		// jump to highlight
		var highlightId = "#highlight" + index;
		if($(highlightId).length) {
			$('html, body').scrollTop($(highlightId).offset().top);
			$(highlightId).addClass("highlightActive");
			previous = index;
		} 		
	}
	
	// retrieves parameter from parent's URL
	function getParameterByName(name) {
		var parentURL = parent.document.location.href;
		var match = RegExp('[?&]' + name + '=([^&]*)').exec(parentURL);				
		return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}
	
	function getNumberOfHighlights() {
		return $(".highlight").length;
	}
	
	
	function handleSampleLinks() {
		$("code").each(function(index) {
			var code = $(this);
			var sample = $(this).data("sample");
			if(sample) {
				$.ajax({ 
					url: "/dashboard/Content/Resources/samples/" + sample + "/index.html",
					type: 'GET',
					success: function( data ){
						code.append( $("<div>").text(data).html());
						Prism.highlightElement(code[0]);
					},
					error: function( data ) {
						code.append( $("<div>").text("Could not load sample. Check link: " + sample).html());
					}
				});
			}
		});
		$("a").each(function(index) {
			var ref = $(this);
			var sample = $(this).data("sample");
			if(sample) {
				ref.attr("href", "/dashboard/Content/Samples/" + sample + "/index.htm");
				ref.attr("target", "_self");
			}
		});
	}	
	
	function keyHandler(e){
		if (e.keyCode == 40 && e.ctrlKey) { 
			if (index < numberOfHighlights) {
				index = index + 1;
				jumpToHighlight();
			}
		} else if (e.keyCode == 38 && e.ctrlKey) { 
			if (index > 1) {
				index = index - 1;
				jumpToHighlight();
			}			
		} else if (e.keyCode == 27) {
			$('body').removeHighlight();
		}
	}
	
	// Get 'Highlight' parameter, make highlights
	// and jump to first hit
	var selection = getParameterByName("Highlight");
	var numberOfHighlights = 0;
	if(selection) {
		$('body').highlight(selection);
		numberOfHighlights = getNumberOfHighlights();
		// bind ctrl-down for next hit,
		// escape for removing highlights
		$(parent.document).keydown(keyHandler);
		$(document).keydown(keyHandler);
		// jump to first hit
		jumpToHighlight();		
	}
	
	handleSampleLinks();
	
});