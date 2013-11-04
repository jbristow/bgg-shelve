var $ = require("jquery").create();

var jade = require("jade");

var http = require("http");

var parser = require("xml2json");

function stringWithPadding(input, n) {
    output = input.substring(0, n);
    for (var i = output.length; i < n; i++) {
        output += "_";
    }
    return output;
}

function findMaxNameLength(boxes) {
    var output = 0;
    $(boxes).each(function(i, box) {
        output = Math.max(output, box.name.length);
    });
    return output;
}

function luminance(color) {
    var noHashColor = color.charAt(0) === "#" ? color.substring(1, 7) : color;
    var r = parseInt(noHashColor.substring(0, 2), 16);
    var g = parseInt(noHashColor.substring(2, 4), 16);
    var b = parseInt(noHashColor.substring(4, 6), 16);
    var a = [ r, g, b ].map(function(v) {
        v /= 255;
        return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
    });
    return a[0] * .2126 + a[1] * .7152 + a[2] * .0722;
}

function getRandomColor() {
    var letters = "0123456789ABCDEF".split("");
    var color = "#";
    for (var i = 0; i < 6; i++) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}

function getTextColor(color) {
    var lumi_color = luminance(color);
    var delta = 1118481;
    var currText = 0;
    var lumi_text;
    var ratio = 0;
    while (ratio < 10 && currText < 16777215) {
        lumi_text = luminance(currText === 0 ? "000000" : currText.toString(16));
        if (lumi_color > lumi_text) {
            ratio = (lumi_color + .05) / (lumi_text + .05);
        } else {
            ratio = (lumi_text + .05) / (lumi_color + .05);
        }
        currText += delta;
    }
    return currText === 0 ? "#000000" : "#" + currText.toString(16);
}

function Shelf() {
    var self = this;
    this.maxHeight = 12;
    this.maxWidth = 12;
    this.groundOffset = 0;
    this.thickness = .75;
    this.stacks = [];
    this.width = function() {
        var sum = 0;
        $(self.stacks).each(function(stack_i, stack) {
            sum += stack.maxWidth();
        });
        return sum;
    };
    this.weight = 0;
    this.boxFits = function(box) {
        return self.width() + Math.ceil(box.width) < self.maxWidth;
    };
    this.addStack = function(shelf, box) {
        var stack = new Stack();
        self.stacks.push(stack);
        stack.addBox(shelf, box);
        return stack;
    };
    return true;
}

function Stack() {
    var self = this;
    this.currHeight = function() {
        var out = 0;
        $(self.boxes).each(function(box_i, box) {
            out += box.depth;
        });
        return out;
    };
    this.boxes = [];
    this.boxFits = function(shelf, box) {
        return box.width <= self.maxWidth() && self.currHeight() + box.depth < shelf.maxHeight;
    };
    this.addBox = function(shelf, box) {
        shelf.weight += box.weight;
        self.boxes.push(box);
        self.boxes.sort(function(a, b) {
            return a.width - b.width;
        });
    };
    this.maxWidth = function() {
        return Math.max.apply(Math, self.boxes.map(function(box) {
            return box.width;
        }));
    };
    return true;
}
function Box() {
	var self = this;

}

function fetchGeekList(username, height, width, depth, getRes) {
http.get("http://boardgamegeek.com/xmlapi2/collection?username="+username+"&brief=0&version=1&owned=1", function(res) {
	var xml = "";
    res.on("data", function(d) {
    	xml += d.toString();
    });
    res.on("end", function(){
    	parseFileAndRun(xml, width, height, depth, username, getRes);
    });
});
}

function parseFileAndRun(xml, shelf_width, shelf_height, shelf_depth, username, res) {
    var jsondata = JSON.parse(parser.toJson(xml,{
    	object: false,
    	coerce: true,
    	trim: true,
    	arrayNotation: true
    }));
    var gameBoxArr = [];
    var unstackable = [];
    $(jsondata.items.item).each(function(i_index, item) {
        $(item.version).each(function(v_index, version) {
        	var v_item = version.item;
            gameBox = {
                name: item.name.$t,
                image: item.image,
                weight: Number(v_item.weight.value, 10),
                color: getRandomColor()
            };
            var width = Number(v_item.width.value, 10);
            var length = Number(v_item.length.value, 10);
            var depth = Number(v_item.depth.value, 10);
            gameBox.text_color = getTextColor(gameBox.color);
            if (width <= length && width <= depth) {
                gameBox.depth = width;
                if (length < depth) {
                    gameBox.width = length;
                    gameBox.length = depth;
                } else {
                    gameBox.width = depth;
                    gameBox.length = length;
                }
            } else if (length <= width && length <= depth) {
                gameBox.depth = length;
                if (width < depth) {
                    gameBox.width = width;
                    gameBox.length = depth;
                } else {
                    gameBox.width = depth;
                    gameBox.length = width;
                }
            } else if (depth <= length && depth <= width) {
                gameBox.depth = depth;
                if (width < length) {
                    gameBox.width = width;
                    gameBox.length = length;
                } else {
                    gameBox.width = length;
                    gameBox.length = width;
                }
            } else {
                console.log("Unexpected dimensions for " + gameBox.name);
                console.log("w: " + width);
                console.log("l: " + length);
                console.log("d: " + depth);
            }
            if (width * length * depth <= 0) {
				unstackable.push({game: gameBox.name, reason: "Game box has zero volume."});
			} else if (gameBox.length > shelf_depth * 2 && gameBox.width > shelf_depth * 2) {
				unstackable.push({game: gameBox.name, reason: "Game box too deep for shelf."});
			} else if (gameBox.length > shelf_depth * 2) {
				var temp = gameBox.length;
				gameBox.length = gameBox.width;
				gameBox.width = temp;
                gameBoxArr.push(gameBox);
            } else {
                gameBoxArr.push(gameBox);
            } 
        });
    });
    var boxes = gameBoxArr.sort(function(a, b) {
    if (a.width === b.width) {
    	if (a.depth === b.depth) {
    		return a.length - b.length;
    	}
    	return a.depth - b.depth;
    } else {
    return a.width - b.width;
    }
    });
    var shelves = [];
    var count = 0;
    while (boxes.length > 0) {
        var box = boxes.pop();
        if (box.width > shelf_width) {
				unstackable.push({game: box.name, reason: "Game box is too wide."});
				continue;
        } 
        if (box.depth > shelf_height) {
				unstackable.push({game: box.name, reason: "Game box is too tall."});
				continue;
		}
        count += 1;
        var inserted = false;
        for (var i = 0; i < shelves.length; i++) {
            var shelf = shelves[i];
            for (var j = 0; j < shelf.stacks.length; j++) {
                var stack = shelf.stacks[j];
                if (stack.boxFits(shelf, box)) {
                    inserted = true;
                    stack.addBox(shelf, box);
                    break;
                } else {}
            }
            if (inserted) {
                break;
            } else if (shelf.boxFits(box)) {
                shelf.addStack(shelf, box);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            var shelf = new Shelf();
            if (shelf_height !== undefined) {
            	shelf.maxHeight = shelf_height;
            }
            if (shelf_width !== undefined) {
            	shelf.maxWidth = shelf_width;
            }
            shelves.push(shelf);
            shelf.addStack(shelf, box);
        }
    }
    var htmlOutput = jade.renderFile("collection.jade", {
            shelves: shelves,
            username: username,
            unstackable: unstackable
        });
        res.writeHead(200, {
            "Content-Type": "text/html"
        });
        res.end(htmlOutput);


}
console.log("STarting server...");
    http.createServer(function(req, res) {
    	reqUrl = req.url;
    	parsedReqUrl = require('url').parse(reqUrl, true);

console.log(parsedReqUrl);

fetchGeekList(parsedReqUrl.query.username, parsedReqUrl.query.height, parsedReqUrl.query.width, parsedReqUrl.query.depth, res);
		
    }).listen(8888);

