/*
* L.TileOverlay is used to display the tiles as an overlay
*/
L.TileOverlay = function(){
	var tileOverlay = new L.GridLayer();
	tileOverlay.createTile = function(coords) {
		var tile = document.createElement('canvas'),
			ctx = tile.getContext('2d');
		tile.width = tile.height = 256;

		// transparent chessboard
		if((coords.x+coords.y)%2 == 0) {
			ctx.fillStyle = 'rgba(255,255,255, 0.07)';
		} else {
			ctx.fillStyle = 'rgba(  0,  0,  0, 0.07)';
		}
		ctx.fillRect(0, 0, 255, 255);

		// print tile coords
		ctx.fillStyle = 'rgba(255,255,255, 0.75)';
		ctx.fillRect(40, 108, 175, 40);
		ctx.fillStyle = 'black';
		ctx.fillText('zoom: ' + coords.z + ', x: ' + coords.x + ', y: ' + coords.y, 45, 133);
		
		// draw tile borders
		ctx.strokeStyle = 'rgba(127,  0,  0, 0.05)';
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(255, 0);
		ctx.lineTo(255, 255);
		ctx.lineTo(0, 255);
		ctx.closePath();
		ctx.stroke();
		return tile;
	}
	return tileOverlay;
}
