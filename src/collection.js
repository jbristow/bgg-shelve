function luminance(color) {
    var noHashColor = "#" === color.charAt(0) ? color.substring(1, 7) : color, r = parseInt(noHashColor.substring(0, 2), 16), g = parseInt(noHashColor.substring(2, 4), 16), b = parseInt(noHashColor.substring(4, 6), 16), a = [ r, g, b ].map(function(v) {
        return v /= 255, .03928 >= v ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
    });
    return .2126 * a[0] + .7152 * a[1] + .0722 * a[2];
}

function getRandomColor() {
    var i, letters = "0123456789ABCDEF".split(""), color = "#";
    for (i = 0; 6 > i; i++) color += letters[Math.round(15 * Math.random())];
    return color;
}

function getTextColor(color) {
    for (var lumi_text, lumi_color = luminance(color), delta = 1118481, currText = 0, ratio = 0; 3 > ratio && 16777215 > currText; ) lumi_text = luminance(0 === currText ? "000000" : currText.toString(16)), 
    ratio = lumi_color > lumi_text ? (lumi_color + .05) / (lumi_text + .05) : (lumi_text + .05) / (lumi_color + .05), 
    currText += delta;
    return 0 === currText ? "#000000" : "#" + currText.toString(16);
}

function Shelf() {
    var self = this;
    return this.maxHeight = 12, this.maxWidth = 12, this.groundOffset = 0, this.thickness = .75, 
    this.stacks = [], this.width = function() {
        var sum = 0;
        return $(self.stacks).each(function(stack_i, stack) {
            sum += stack.maxWidth();
        }), sum;
    }, this.weight = 0, this.boxFits = function(box) {
        return self.width() + Math.ceil(box.width) < self.maxWidth;
    }, this.addStack = function(shelf, box) {
        var stack = new Stack();
        return self.stacks.push(stack), stack.addBox(shelf, box), stack;
    }, !0;
}

function Stack() {
    var self = this;
    return this.currHeight = function() {
        var out = 0;
        return $(self.boxes).each(function(box_i, box) {
            out += box.depth;
        }), out;
    }, this.boxes = [], this.boxFits = function(shelf, box) {
        return box.width <= self.maxWidth() && self.currHeight() + box.depth < shelf.maxHeight;
    }, this.addBox = function(shelf, box) {
        shelf.weight += box.weight, self.boxes.push(box), self.boxes.sort(function(a, b) {
            return a.width - b.width;
        });
    }, this.maxWidth = function() {
        return Math.max.apply(Math, self.boxes.map(function(box) {
            return box.width;
        }));
    }, !0;
}

function Box(item, v_item) {
    var width, length, depth, self = this;
    return this.name = item.name.$t, this.image = item.image, this.weight = Number(v_item.weight.value, 10), 
    this.color = getRandomColor(), this.text_color = getTextColor(self.color), width = Number(v_item.width.value, 10), 
    length = Number(v_item.length.value, 10), depth = Number(v_item.depth.value, 10), 
    length >= width && depth >= width ? (self.depth = width, depth > length ? (self.width = length, 
    self.length = depth) : (self.width = depth, self.length = length)) : width >= length && depth >= length ? (self.depth = length, 
    depth > width ? (self.width = width, self.length = depth) : (self.width = depth, 
    self.length = width)) : length >= depth && width >= depth ? (self.depth = depth, 
    length > width ? (self.width = width, self.length = length) : (self.width = length, 
    self.length = width)) : (console.log("Unexpected dimensions for " + self.name), 
    console.log("w: " + width), console.log("l: " + length), console.log("d: " + depth)), 
    !0;
}

function fetchGeekList(username, height, width, depth, getRes) {
    var url = "http://boardgamegeek.com/xmlapi2/collection?username=" + username + "&brief=0&version=1&own=1";
    console.log("Fetching " + url), http.get(url, function(res) {
        var xml = "";
        res.on("data", function(d) {
            xml += d.toString();
        }), res.on("end", function() {
            parseFileAndRun(xml, width, height, depth, username, getRes);
        });
    });
}

function parseFileAndRun(xml, shelf_width, shelf_height, shelf_depth, username, res) {
    var boxes, shelves, count, box, inserted, i, shelf, j, stack, htmlOutput, jsondata = JSON.parse(parser.toJson(xml, {
        object: !1,
        coerce: !0,
        trim: !0,
        sanitize: !1,
        arrayNotation: !0
    })), gameBoxArr = [], unstackable = [];
    for ($(jsondata.items.item).each(function(i_index, item) {
        (void 0 === item.version || item.version.length < 1) && unstackable.push({
            game: item.name.$t,
            reason: "No version information.",
            severity: "info"
        }), $(item.version).each(function(v_index, version) {
            var temp, v_item = version.item, box = new Box(item, v_item);
            box.width * box.length * box.depth <= 0 ? unstackable.push({
                game: box.name,
                reason: "Game box has zero volume.",
                severity: "warning"
            }) : box.length > 2 * shelf_depth && box.width > 2 * shelf_depth ? unstackable.push({
                game: box.name,
                reason: "Game box too deep for shelf.",
                severity: "danger"
            }) : box.length > 2 * shelf_depth ? (temp = box.length, box.length = box.width, 
            box.width = temp, gameBoxArr.push(box)) : gameBoxArr.push(box);
        });
    }), boxes = gameBoxArr.sort(function(a, b) {
        return b.name.localeCompare(a.name);
    }).sort(function(a, b) {
        return a.width === b.width ? a.depth === b.depth ? a.length - b.length : a.depth - b.depth : a.width - b.width;
    }), shelves = [], count = 0; boxes.length > 0; ) if (box = boxes.pop(), box.width > shelf_width) unstackable.push({
        game: box.name,
        reason: "Game box is too wide.",
        severity: "danger"
    }); else if (box.depth > shelf_height) unstackable.push({
        game: box.name,
        reason: "Game box is too tall.",
        severity: "danger"
    }); else {
        for (count += 1, inserted = !1, i = 0; i < shelves.length; i++) {
            for (shelf = shelves[i], j = 0; j < shelf.stacks.length; j++) if (stack = shelf.stacks[j], 
            stack.boxFits(shelf, box)) {
                inserted = !0, stack.addBox(shelf, box);
                break;
            }
            if (inserted) break;
            if (shelf.boxFits(box)) {
                shelf.addStack(shelf, box), inserted = !0;
                break;
            }
        }
        inserted || (shelf = new Shelf(), void 0 !== shelf_height && (shelf.maxHeight = shelf_height), 
        void 0 !== shelf_width && (shelf.maxWidth = shelf_width), shelves.push(shelf), shelf.addStack(shelf, box));
    }
    htmlOutput = jade.renderFile("resources/collection.jade", {
        shelves: shelves,
        username: username,
        unstackable: unstackable
    }), res.writeHead(200, {
        "Content-Type": "text/html"
    }), res.end(htmlOutput);
}

var $ = require("jquery").create(), jade = require("jade"), http = require("http"), parser = require("xml2json");

console.log("Starting node server..."), http.createServer(function(req, res) {
    var reqUrl = req.url, parsedReqUrl = require("url").parse(reqUrl, !0);
    fetchGeekList(parsedReqUrl.query.username, parsedReqUrl.query.height, parsedReqUrl.query.width, parsedReqUrl.query.depth, res);
}).listen(8888);
