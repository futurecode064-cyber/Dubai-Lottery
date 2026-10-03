import{createRequire as ___cr}from'node:module';const __filename='/tmp/dubai-lottery/index.mjs';const __dirname='/tmp/dubai-lottery';const require=___cr(__filename);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "node_modules/postgres-array/index.js"(exports) {
    "use strict";
    exports.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "node_modules/pg-types/lib/arrayParser.js"(exports, module) {
    var array = require_postgres_array();
    module.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "node_modules/postgres-date/index.js"(exports, module) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "node_modules/xtend/mutable.js"(exports, module) {
    module.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "node_modules/postgres-interval/index.js"(exports, module) {
    "use strict";
    var extend = require_mutable();
    module.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "node_modules/postgres-bytea/index.js"(exports, module) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "node_modules/pg-types/lib/textParsers.js"(exports, module) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module.exports = {
      init
    };
  }
});

// node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "node_modules/pg-int8/index.js"(exports, module) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module.exports = readInt8;
  }
});

// node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "node_modules/pg-types/lib/binaryParsers.js"(exports, module) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module.exports = {
      init
    };
  }
});

// node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "node_modules/pg-types/lib/builtins.js"(exports, module) {
    module.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "node_modules/pg-types/index.js"(exports) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports.getTypeParser = getTypeParser;
    exports.setTypeParser = setTypeParser;
    exports.arrayParser = arrayParser;
    exports.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/pg/lib/defaults.js"(exports, module) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      // SSL negotiation style: 'postgres' (traditional SSLRequest) or 'direct'
      sslnegotiation: void 0,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "node_modules/pg/lib/utils.js"(exports, module) {
    "use strict";
    var defaults2 = require_defaults();
    var nodeUtils = __require("util");
    var { isDate } = __require("util/types");
    var invalidDateDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Sending an invalid date to Postgres is deprecated and will throw an error in the next major version of pg. Ensure any Date object passed as a query parameter is valid.",
      "PG_INVALID_DATE"
    );
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (isNaN(val.getTime())) {
            invalidDateDeprecationNotice();
          }
          if (defaults2.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : cloneQueryConfig(config);
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    function cloneQueryConfig(config) {
      if (config == null) {
        return config;
      }
      return Object.defineProperties(Object.create(Object.getPrototypeOf(config)), Object.getOwnPropertyDescriptors(config));
    }
    var escapeIdentifier2 = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral2 = function(str) {
      let hasBackslash = false;
      let escaped = "'";
      if (str == null) {
        return "''";
      }
      if (typeof str !== "string") {
        return "''";
      }
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier: escapeIdentifier2,
      escapeLiteral: escapeLiteral2
    };
  }
});

// node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "node_modules/pg/lib/crypto/utils.js"(exports, module) {
    var nodeCrypto = __require("crypto");
    module.exports = {
      postgresMd5PasswordHash,
      randomBytes: randomBytes2,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes2(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "node_modules/pg/lib/crypto/cert-signatures.js"(exports, module) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https://github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    module.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "node_modules/pg/lib/crypto/sasl.js"(exports, module) {
    "use strict";
    var crypto = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto.sha256(clientKey);
      const clientSignature = await crypto.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "node_modules/pg/lib/type-overrides.js"(exports, module) {
    "use strict";
    var types2 = require_pg_types();
    function TypeOverrides2(userTypes) {
      this._types = userTypes || types2;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides2.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides2.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides2.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module.exports = TypeOverrides2;
  }
});

// node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "node_modules/pg-connection-string/index.js"(exports, module) {
    "use strict";
    function parse(str, options = {}) {
      if (str.charAt(0) === "/") {
        const config2 = str.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str, "postgres://base");
        } catch (e) {
          result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = (dummyHost ? "" : result.hostname).replace(/^\[(.+)\]$/, "$1");
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      if (config.sslnegotiation === "direct" && config.ssl === void 0) {
        config.ssl = true;
      }
      const fs = config.sslcert || config.sslkey || config.sslrootcert ? __require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs.readFileSync(config.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config.sslrootcert) {
              config.ssl.checkServerIdentity = function() {
              };
            } else {
              config.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config.sslmode);
            }
            break;
          }
          case "no-verify": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config) {
      const poolConfig = Object.entries(config).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str) {
      return toClientConfig(parse(str));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "node_modules/pg/lib/connection-parameters.js"(exports, module) {
    "use strict";
    var dns = __require("dns");
    var defaults2 = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (config[key]) {
        return config[key];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults2[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults2.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      const value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.sslnegotiation = val("sslnegotiation", config, "PGSSLNEGOTIATION");
        if (this.sslnegotiation !== void 0 && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
          throw new Error(
            `Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`
          );
        }
        if (this.sslnegotiation === "direct" && !this.ssl) {
          throw new Error("sslnegotiation=direct requires SSL to be enabled");
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        add(params, this, "sslnegotiation");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module.exports = ConnectionParameters;
  }
});

// node_modules/pg/lib/result.js
var require_result = __commonJS({
  "node_modules/pg/lib/result.js"(exports, module) {
    "use strict";
    var types2 = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result2 = class {
      constructor(rowMode, types3) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types3;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types2.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module.exports = Result2;
  }
});

// node_modules/pg/lib/query.js
var require_query = __commonJS({
  "node_modules/pg/lib/query.js"(exports, module) {
    "use strict";
    var { EventEmitter } = __require("events");
    var Result2 = require_result();
    var utils = require_utils();
    var Query2 = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result2(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result2(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && (connection.parsedStatements[this.name] !== void 0 || connection.submittedNamedStatements[this.name] !== void 0);
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
          if (this.name) {
            connection.submittedNamedStatements[this.name] = this.text;
          }
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          connection.close({ type: "S", name: this.name });
          connection.sync();
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module.exports = Query2;
  }
});

// node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "node_modules/pg-protocol/dist/messages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = void 0;
    exports.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports.noData = {
      name: "noData",
      length: 5
    };
    exports.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError2 = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports.DatabaseError = DatabaseError2;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports.NoticeMessage = NoticeMessage;
  }
});

// node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "node_modules/pg-protocol/dist/buffer-writer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer, 0, 0, this.offset);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      // Write an Int32 byte-length prefix immediately followed by the string's UTF-8
      // bytes. Postgres' Bind wire format prefixes every parameter with its length,
      // and doing it in one method computes Buffer.byteLength ONCE — the previous
      // `addInt32(Buffer.byteLength(s)).addString(s)` pairing scanned the string
      // three times (byteLength for the prefix, byteLength again inside addString,
      // then the encode), which is costly for large text parameters.
      addInt32PrefixedString(string) {
        const len = Buffer.byteLength(string);
        this.ensure(4 + len);
        const buffer = this.buffer;
        let offset = this.offset;
        buffer[offset++] = len >>> 24 & 255;
        buffer[offset++] = len >>> 16 & 255;
        buffer[offset++] = len >>> 8 & 255;
        buffer[offset++] = len >>> 0 & 255;
        buffer.write(string, offset, "utf-8");
        this.offset = offset + len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      /**
       * Appends an uninitialized block of {@link size} bytes to the buffer and returns its offset.
       */
      reserveUnsafe(size) {
        const offset = this.offset;
        this.ensure(size);
        this.offset += size;
        return offset;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
      clear() {
        this.offset = 5;
        this.headerPosition = 0;
      }
    };
    exports.Writer = Writer;
  }
});

// node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "node_modules/pg-protocol/dist/serializer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types2 = query2.types || emptyArray;
      const len = types2.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types2[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var writeValues = function(values, valueMapper, formatsOffset) {
      const len = values.length;
      for (let i = 0; i < len; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        let formatByte = 0;
        if (mappedVal == null) {
          writer.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          formatByte = 1;
          writer.addInt32(mappedVal.length);
          writer.add(mappedVal);
        } else {
          writer.addInt32PrefixedString(mappedVal);
        }
        const buf = writer.buffer;
        buf[formatsOffset++] = 0;
        buf[formatsOffset++] = formatByte;
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      const formatsOffset = writer.reserveUnsafe(len * 2);
      writer.addInt16(len);
      try {
        writeValues(values, config.valueMapper, formatsOffset);
      } catch (err) {
        writer.clear();
        throw err;
      }
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports.serialize = serialize;
  }
});

// node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "node_modules/pg-protocol/dist/buffer-reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++]) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports.BufferReader = BufferReader;
  }
});

// node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "node_modules/pg-protocol/dist/parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader } = this;
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader);
            break;
          case 65:
            message = parseNotificationMessage(reader);
            break;
          case 82:
            message = parseAuthenticationResponse(reader, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader);
            break;
          case 75:
            message = parseBackendKeyData(reader);
            break;
          case 69:
            message = parseErrorMessage(reader, "error");
            break;
          case 78:
            message = parseErrorMessage(reader, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader);
            break;
          case 71:
            message = parseCopyInMessage(reader);
            break;
          case 72:
            message = parseCopyOutMessage(reader);
            break;
          case 100:
            message = parseCopyData(reader, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports.Parser = Parser;
    var parseReadyForQueryMessage = (reader) => {
      const status = reader.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader) => {
      const text = reader.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
    };
    var parseCopyData = (reader, length) => {
      const chunk = reader.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
    var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
    var parseCopyMessage = (reader, messageName) => {
      const isBinary = reader.byte() !== 0;
      const columnCount = reader.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader) => {
      const processId = reader.int32();
      const channel = reader.cstring();
      const payload = reader.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader) => {
      const fieldCount = reader.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
      }
      return message;
    };
    var parseField = (reader) => {
      const name = reader.cstring();
      const tableID = reader.uint32();
      const columnID = reader.int16();
      const dataTypeID = reader.uint32();
      const dataTypeSize = reader.int16();
      const dataTypeModifier = reader.int32();
      const mode = reader.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader) => {
      const parameterCount = reader.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.uint32();
      }
      return message;
    };
    var parseDataRowMessage = (reader) => {
      const fieldCount = reader.int16();
      const fields = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        fields[i] = len === -1 ? null : reader.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
    };
    var parseParameterStatusMessage = (reader) => {
      const name = reader.cstring();
      const value = reader.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader) => {
      const processID = reader.int32();
      const secretKey = reader.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader, length) => {
      const code = reader.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader, name) => {
      const fields = {};
      let fieldType = reader.string(1);
      while (fieldType !== "\0") {
        fields[fieldType] = reader.cstring();
        fieldType = reader.string(1);
      }
      const messageValue = fields.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields.S;
      message.code = fields.C;
      message.detail = fields.D;
      message.hint = fields.H;
      message.position = fields.P;
      message.internalPosition = fields.p;
      message.internalQuery = fields.q;
      message.where = fields.W;
      message.schema = fields.s;
      message.table = fields.t;
      message.column = fields.c;
      message.dataType = fields.d;
      message.constraint = fields.n;
      message.file = fields.F;
      message.line = fields.L;
      message.routine = fields.R;
      return message;
    };
  }
});

// node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "node_modules/pg-protocol/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseError = exports.serialize = void 0;
    exports.parse = parse;
    var messages_1 = require_messages();
    Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
  }
});

// node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "node_modules/pg-cloudflare/dist/empty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {};
  }
});

// node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "node_modules/pg/lib/stream.js"(exports, module) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = __require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = __require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "node_modules/pg/lib/connection.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var stream = require_stream();
    var { getStream } = stream;
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection2 = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.submittedNamedStatements = {};
        this.ssl = config.ssl || false;
        this.sslNegotiation = config.sslNegotiation || "postgres";
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        if (this.sslNegotiation === "direct") {
          return this.stream.once("connect", function() {
            self.upgradeToSSL(host, reportStreamError);
          });
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      upgradeToSSL(host, reportStreamError) {
        const self = this;
        const options = {
          socket: self.stream,
          // tls.connect checks the server identity against `servername`, falling
          // back to `host` and then to 'localhost'. `servername` must stay unset
          // for IP addresses (see below), so `host` is needed to keep certificate
          // validation working when connecting to an IP address.
          host
        };
        if (self.ssl !== true) {
          Object.assign(options, self.ssl);
          if ("key" in self.ssl) {
            options.key = self.ssl.key;
          }
        }
        if (self.sslNegotiation === "direct") {
          options.ALPNProtocols = ["postgresql"];
        }
        const net = __require("net");
        if (net.isIP && net.isIP(host) === 0) {
          options.servername = host;
        }
        try {
          self.stream = stream.getSecureStream(options);
        } catch (err) {
          return self.emit("error", err);
        }
        self.attachListeners(self.stream);
        self.stream.on("error", reportStreamError);
        self.emit("sslconnect");
      }
      attachListeners(stream2) {
        parse(stream2, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module.exports = Connection2;
  }
});

// node_modules/split2/index.js
var require_split2 = __commonJS({
  "node_modules/split2/index.js"(exports, module) {
    "use strict";
    var { Transform } = __require("stream");
    var { StringDecoder } = __require("string_decoder");
    var kLast = /* @__PURE__ */ Symbol("last");
    var kDecoder = /* @__PURE__ */ Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module.exports = split;
  }
});

// node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "node_modules/pgpass/lib/helper.js"(exports, module) {
    "use strict";
    var path = __require("path");
    var Stream = __require("stream").Stream;
    var split = require_split2();
    var util = __require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "node_modules/pgpass/lib/index.js"(exports, module) {
    "use strict";
    var path = __require("path");
    var fs = __require("fs");
    var helper = require_helper();
    module.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module.exports.warnTo = helper.warnTo;
  }
});

// node_modules/pg/lib/client.js
var require_client = __commonJS({
  "node_modules/pg/lib/client.js"(exports, module) {
    var EventEmitter = __require("events").EventEmitter;
    var utils = require_utils();
    var nodeUtils = __require("util");
    var sasl = require_sasl();
    var TypeOverrides2 = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query2 = require_query();
    var defaults2 = require_defaults();
    var Connection2 = require_connection();
    var crypto = require_utils2();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client2 = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides2(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection2({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          sslNegotiation: this.connectionParameters.sslnegotiation,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this._sentQueryQueue = [];
        this.pipeline = Boolean(c.pipeline);
        this.binary = c.binary || defaults2.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._sentQueryQueue.forEach(enqueueError);
        this._sentQueryQueue.length = 0;
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            if (self.sslNegotiation !== "direct") {
              con.requestSsl();
            }
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        if (activeQuery.name) {
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client._queryQueue.indexOf(query) !== -1) {
          client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
        } else if (client._sentQueryQueue.indexOf(query) !== -1) {
          query.callback = () => {
          };
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.pipeline) {
          this._pulsePipelinedQueryQueue();
          return;
        }
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      _pulsePipelinedQueryQueue() {
        if (!this._connected || !this._queryable) {
          return;
        }
        while (this._queryQueue.length > 0) {
          const query = this._queryQueue.shift();
          this.hasExecuted = true;
          const queryError = query.submit(this.connection);
          if (queryError) {
            process.nextTick(() => {
              query.handleError(queryError, this.connection);
            });
            continue;
          }
          this._sentQueryQueue.push(query);
        }
        if (this.readyForQuery && !this._activeQuery && this._sentQueryQueue.length > 0) {
          this._activeQuery = this._sentQueryQueue.shift();
          this.readyForQuery = false;
        }
        if (!this._activeQuery && this._sentQueryQueue.length === 0 && this._queryQueue.length === 0 && this.hasExecuted) {
          this.emit("drain");
        }
      }
      query(config, values, callback) {
        let query;
        let result;
        if (config == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config.submit === "function") {
          result = query = config;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query2(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            } else if (this.pipeline) {
              this.connection.stream.destroy();
              return;
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (this.pipeline) {
          const portalQuery = typeof config.submit === "function" && !(query instanceof Query2) ? "Custom query classes such as pg-cursor and pg-query-stream are" : query.rows ? "The `rows` option is" : null;
          if (portalQuery) {
            process.nextTick(() => {
              query.handleError(new Error(`${portalQuery} not supported in pipeline mode`), this.connection);
            });
            return result;
          }
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0 && !this.pipeline) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (!this._queryable) {
          this.connection.stream.destroy();
        } else if (this.pipeline && (this._getActiveQuery() || this._sentQueryQueue.length > 0 || this._queryQueue.length > 0)) {
          this.once("drain", () => this.connection.end());
        } else if (this._getActiveQuery()) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client2.Query = Query2;
    module.exports = Client2;
  }
});

// node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "node_modules/pg-pool/index.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify2(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool2, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool2.log("additional client error after disconnection due to error", err);
        });
        pool2._remove(client);
        pool2.emit("error", err, client);
      };
    }
    var Pool2 = class extends EventEmitter {
      constructor(options, Client2) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client2 || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context = this;
        client.end(() => {
          context.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify2(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.connection.stream.destroy();
            } else if (!client.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client)).then(
                () => {
                  this._afterConnect(client, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client);
                  client.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
            if (idleIndex !== -1) {
              this._acquireClient(
                client,
                new PendingItem((err, client2, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify2(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify2(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify2(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module.exports = Pool2;
  }
});

// node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "node_modules/pg/lib/native/query.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var utils = require_utils();
    var NativeQuery = module.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      messageDetail: "detail",
      messageHint: "hint",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native && this.native.pq.resultErrorFields();
      if (fields) {
        for (const key in fields) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name] !== void 0) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "node_modules/pg/lib/native/client.js"(exports, module) {
    var nodeUtils = __require("util");
    var Native;
    try {
      Native = __require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides2 = require_type_overrides();
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client2 = module.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides2(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      this.pipeline = Boolean(config.pipeline);
      this._pipelineInFlight = false;
      const cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client2.Query = NativeQuery;
    util.inherits(Client2, EventEmitter);
    Client2.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client2.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client2.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client2.prototype.query = function(config, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0 && !this.pipeline) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client2.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      const doEnd = function() {
        self.native.end(function() {
          self._connected = false;
          self._errorAllQueries(new Error("Connection terminated"));
          process.nextTick(() => {
            self.emit("end");
            if (cb) cb();
          });
        });
      };
      if (this.pipeline && (this._pipelineInFlight || this._queryQueue.length > 0)) {
        this.once("drain", doEnd);
      } else {
        doEnd();
      }
      return result;
    };
    Client2.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client2.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this.pipeline && !initialConnection) {
        return this._pulsePipelinedQueryQueue();
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client2.prototype._pulsePipelinedQueryQueue = function() {
      if (!this._connected || this._pipelineInFlight) {
        return;
      }
      if (this._queryQueue.length === 0) {
        if (this.hasExecuted) {
          this.emit("drain");
        }
        return;
      }
      this._pipelineInFlight = true;
      const self = this;
      const queries = [];
      const nativeQueries = [];
      const utils = require_utils();
      while (this._queryQueue.length > 0) {
        const query = this._queryQueue.shift();
        this.hasExecuted = true;
        nativeQueries.push(query);
        const values = query.values ? query.values.map(utils.prepareValue) : null;
        const pipelineEntry = { text: query.text, name: query.name, arrayMode: query._arrayMode };
        if (values) {
          pipelineEntry.values = values;
        }
        if (query.name && this.namedQueries[query.name]) {
          pipelineEntry._alreadyPrepared = true;
        }
        queries.push(pipelineEntry);
      }
      this.native.pipeline(queries, function(err, results) {
        self._pipelineInFlight = false;
        if (err) {
          self._connected = false;
          self._queryable = false;
          for (let i = 0; i < nativeQueries.length; i++) {
            const q2 = nativeQueries[i];
            q2.native = self.native;
            q2.handleError(err);
          }
          self._errorAllQueries(err);
          self.emit("error", err);
          self.emit("end");
          return;
        }
        for (let i = 0; i < nativeQueries.length; i++) {
          const q2 = nativeQueries[i];
          const r = results[i];
          q2.native = self.native;
          if (r.err) {
            q2.handleError(r.err);
          } else {
            if (q2.name) {
              self.namedQueries[q2.name] = q2.text;
            }
            q2.state = "end";
            q2.emit("end", r.result);
            if (q2.callback) {
              q2.callback(null, r.result);
            }
          }
          setImmediate(function() {
            q2.emit("_done");
          });
        }
        self._pulsePipelinedQueryQueue();
      });
    };
    Client2.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client2.prototype.ref = function() {
    };
    Client2.prototype.unref = function() {
    };
    Client2.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client2.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
    Client2.prototype.isConnected = function() {
      return this._connected;
    };
    Client2.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "node_modules/pg/lib/native/index.js"(exports, module) {
    "use strict";
    module.exports = require_client2();
  }
});

// node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/pg/lib/index.js"(exports, module) {
    "use strict";
    var Client2 = require_client();
    var defaults2 = require_defaults();
    var Connection2 = require_connection();
    var Result2 = require_result();
    var utils = require_utils();
    var Pool2 = require_pg_pool();
    var TypeOverrides2 = require_type_overrides();
    var { DatabaseError: DatabaseError2 } = require_dist();
    var { escapeIdentifier: escapeIdentifier2, escapeLiteral: escapeLiteral2 } = require_utils();
    var poolFactory = (Client3) => {
      return class BoundPool extends Pool2 {
        constructor(options) {
          super(options, Client3);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults2;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection2;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError2;
      this.TypeOverrides = TypeOverrides2;
      this.escapeIdentifier = escapeIdentifier2;
      this.escapeLiteral = escapeLiteral2;
      this.Result = Result2;
      this.utils = utils;
    };
    var clientConstructor = Client2;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module.exports = new PG(clientConstructor);
    Object.defineProperty(module.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// index.mjs
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// node_modules/pg/esm/index.mjs
var import_lib = __toESM(require_lib2(), 1);
var Client = import_lib.default.Client;
var Pool = import_lib.default.Pool;
var Connection = import_lib.default.Connection;
var types = import_lib.default.types;
var Query = import_lib.default.Query;
var DatabaseError = import_lib.default.DatabaseError;
var escapeIdentifier = import_lib.default.escapeIdentifier;
var escapeLiteral = import_lib.default.escapeLiteral;
var Result = import_lib.default.Result;
var TypeOverrides = import_lib.default.TypeOverrides;
var defaults = import_lib.default.defaults;
var esm_default = import_lib.default;

// node_modules/@neon/functions/dist/lib/attach-database-pool.js
var IDLE_DISCONNECT_CODES = /* @__PURE__ */ new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "57P01"
]);
var attached = /* @__PURE__ */ new WeakSet();
var UNEXPECTED_POOL_ERROR = "attachDatabasePool: unexpected database pool error";
var REPORTER_THREW = "attachDatabasePool: onUnexpectedError threw";
var ALREADY_ATTACHED = "attachDatabasePool() was already called for this pool; this onUnexpectedError is ignored. Pass it on the first call.";
function isDatabasePool(value) {
  return typeof value === "object" && value !== null && "on" in value && typeof value.on === "function";
}
function isIdleDisconnect(err) {
  const code = "code" in err && typeof err.code === "string" ? err.code : void 0;
  return code !== void 0 && IDLE_DISCONNECT_CODES.has(code) || err.message === "Connection terminated unexpectedly";
}
function describeValue(value) {
  if (value === null) return "null";
  return typeof value;
}
function isPromise(value) {
  return typeof value === "object" && value !== null && "then" in value && typeof value.then === "function";
}
function requireDatabasePool(pool2) {
  if (isDatabasePool(pool2)) return pool2;
  if (typeof pool2 === "object" && pool2 !== null) throw new TypeError("attachDatabasePool() requires a node-postgres Pool with an on() method, got an object without one");
  throw new TypeError(`attachDatabasePool() requires a node-postgres Pool, got ${describeValue(pool2)}`);
}
function resolveOnUnexpectedError(options) {
  if (options === void 0) return;
  if (typeof options !== "object" || options === null) throw new TypeError(`attachDatabasePool() options must be an object, got ${describeValue(options)}`);
  if (!("onUnexpectedError" in options) || options.onUnexpectedError === void 0) return;
  const handler = options.onUnexpectedError;
  if (typeof handler !== "function") throw new TypeError(`attachDatabasePool() onUnexpectedError must be a function, got ${typeof handler}`);
  return (err) => handler(err);
}
function reportUnexpectedError(err, onUnexpectedError) {
  if (!onUnexpectedError) {
    console.error(UNEXPECTED_POOL_ERROR, err);
    return;
  }
  try {
    const result = onUnexpectedError(err);
    if (isPromise(result)) result.catch((reporterError) => {
      console.error(UNEXPECTED_POOL_ERROR, err);
      console.error(REPORTER_THREW, reporterError);
    });
  } catch (reporterError) {
    console.error(UNEXPECTED_POOL_ERROR, err);
    console.error(REPORTER_THREW, reporterError);
  }
}
function attachDatabasePool(pool2, options) {
  const databasePool = requireDatabasePool(pool2);
  const onUnexpectedError = resolveOnUnexpectedError(options);
  if (attached.has(databasePool)) {
    if (onUnexpectedError) console.warn(ALREADY_ATTACHED);
    return;
  }
  databasePool.on("error", (err) => {
    if (isIdleDisconnect(err)) return;
    reportUnexpectedError(err, onUnexpectedError);
  });
  attached.add(databasePool);
}

// ui-player.mjs
function playerPage() {
  return String.raw`<!doctype html><html lang="my"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#080e1c"><title>Dubai Lottery</title><style>
:root{color-scheme:dark;--bg:#080e1c;--panel:#111c30;--line:#26354d;--gold:#ffcf77;--muted:#a0afc8;--text:#eef3ff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 50% 0,#1c2740 0,transparent 650px),var(--bg);color:var(--text);font:14px/1.8 system-ui,"Noto Sans Myanmar",sans-serif}main{max-width:920px;margin:auto;padding:24px 20px 40px}button,input,select{font:inherit}button{cursor:pointer;border:0;border-radius:12px;padding:11px 16px;background:var(--gold);color:#251b09;font-weight:750}button:disabled{opacity:.45;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #ffe4ad;outline-offset:3px}input,select{width:100%;min-width:0;border:1px solid #34445e;border-radius:12px;padding:13px;background:#0b1426;color:#fff;margin:6px 0 14px}label{display:block;color:var(--muted);font-size:13px}.hidden{display:none!important}h1,h2,h3,p{margin:0}h1{font-size:25px;letter-spacing:-.7px;line-height:1.2}h2{font-size:18px;margin-bottom:14px}small,.muted{color:var(--muted)}.brand{display:flex;align-items:center;gap:12px}.brand-icon{height:46px;width:46px;display:grid;place-items:center;border:1px solid #7e683e;border-radius:14px;color:var(--gold);background:linear-gradient(135deg,#453821,#1b2132);font-size:27px;font-weight:800}.brand small{font-size:10px;letter-spacing:3px;color:var(--gold)}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:23px}.online{font-size:11px;color:#88daba}.online:before{content:'';display:inline-block;width:6px;height:6px;background:#74d5af;border-radius:50%;margin-right:6px}.ticker{display:flex;align-items:center;background:#151f30;border:1px solid #394259;border-radius:13px;overflow:hidden;min-width:0}.ticker-label{align-self:stretch;display:flex;align-items:center;flex-shrink:0;background:#2e2a25;color:var(--gold);padding:10px 12px;font-size:11px;font-weight:750;border-right:1px solid #4e4436}.ticker-window{overflow:hidden;flex:1;min-width:0;mask-image:linear-gradient(90deg,transparent,#000 15px,#000 calc(100% - 15px),transparent)}.ticker-track{display:flex;width:max-content;animation:ticker 38s linear infinite}.ticker-copy{white-space:nowrap;flex-shrink:0;padding:10px 32px;color:#e6d5b7;font-size:13px}.ticker:hover .ticker-track,.ticker:focus-within .ticker-track{animation-play-state:paused}.ticker-toggle{background:transparent;color:var(--gold);flex-shrink:0;padding:9px 12px;font-size:15px}.ticker.paused .ticker-track{animation-play-state:paused}@keyframes ticker{to{transform:translateX(-50%)}}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.section-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:25px 0 12px}.section-heading h2{margin:0}.eyebrow{font-size:10px;letter-spacing:2px;color:var(--gold);text-transform:uppercase}.lucky-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.lucky{--accent:#ffce78;--tint:#302b25;position:relative;overflow:hidden;text-align:center;border:1px solid #57482f;border-radius:18px;background:linear-gradient(160deg,var(--tint),#111b2d 65%);padding:18px 8px 15px;min-width:0}.lucky:nth-child(2){--accent:#b8a5ff;--tint:#292540;border-color:#493e6c}.lucky:nth-child(3){--accent:#79dfc8;--tint:#173831;border-color:#2a5a51}.lucky:before{content:'';position:absolute;top:0;left:25%;right:25%;height:2px;background:var(--accent)}.lucky h3{font-size:14px;font-weight:650;color:var(--accent);white-space:nowrap}.lucky .time{min-height:40px;font-size:11px;color:#acb9ce;margin:5px 0 13px}.lucky-number{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:clamp(25px,5.5vw,48px);font-weight:800;letter-spacing:3px;line-height:1.5;color:var(--accent);font-variant-numeric:tabular-nums;white-space:nowrap}.lucky-status{display:inline-block;margin-top:9px;padding:3px 8px;background:#ffffff08;border:1px solid #ffffff12;border-radius:20px;font-size:10px;color:var(--muted)}.lucky.published .lucky-status{color:var(--accent);border-color:var(--accent)}.result-date{display:block;min-height:19px;font-size:10px;color:var(--muted);margin-top:6px}.hint{font-size:11px;color:var(--muted);margin:10px 2px 20px}.tabs{display:flex;gap:6px;padding:5px;border:1px solid var(--line);border-radius:14px;background:#0c1628;margin:21px 0 14px}.tabs button{flex:1;padding:10px 5px;min-width:0;white-space:nowrap;border-radius:9px;color:var(--muted);background:transparent;font-size:12px}.tabs .on{color:#251b09;background:var(--gold);box-shadow:0 3px 14px #ffcf7718}.card{background:linear-gradient(130deg,#152139,#111b2f);border:1px solid var(--line);border-radius:19px;padding:22px;margin:14px 0}.markets{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:22px}.markets button{background:#0d172a;border:1px solid var(--line);color:var(--muted);padding:10px}.markets button b{display:block;font-size:19px;color:var(--text)}.markets button span{font-size:11px}.markets button.selected{border-color:#bd9450;background:#302c28}.markets button.selected b{color:var(--gold)}.play-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:16px}.play-heading h2{margin:0}.draw-state{font-size:11px;color:#8adeb9;background:#18382f;border-radius:20px;padding:4px 9px}.draw-state.closed{color:#ffb4bf;background:#392435}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.potential{display:flex;justify-content:space-between;align-items:center;border:1px dashed #4e493b;border-radius:12px;background:#242725;padding:12px 15px;margin:4px 0 16px;color:#c9bea9}.potential b{color:var(--gold);font-size:22px}.full{width:100%}.rules{font-size:11px;color:var(--muted);margin-top:10px;text-align:center}.entry{display:flex;justify-content:space-between;gap:12px;padding:13px 0;border-top:1px solid var(--line)}.good{color:#81e1b7}.error{color:#ffb0bd;margin-top:10px}.secondary{background:#24324a;color:var(--text)}.archive-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.archive-head h2{margin:0}.archive-head span{font-size:11px;color:var(--muted)}.result-day{border:1px solid var(--line);border-radius:14px;margin-top:12px;overflow:hidden;background:#0e182a}.result-day-title{display:flex;justify-content:space-between;padding:9px 13px;border-bottom:1px solid var(--line);background:#ffffff03;font-size:12px;color:#c4cfe0}.result-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.result-cell{text-align:center;min-width:0;padding:13px 6px;border-right:1px solid var(--line)}.result-cell:last-child{border-right:0}.result-cell small{display:block;font-size:10px}.result-cell strong{display:block;font:750 24px/1.6 ui-monospace,monospace;letter-spacing:2px;color:var(--gold)}.result-cell:nth-child(2) strong{color:#b8a5ff}.result-cell:nth-child(3) strong{color:#79dfc8}.archive-empty{padding:20px;text-align:center;color:var(--muted)}.archive-list{max-height:600px;overflow:auto}.profile{display:flex;justify-content:space-between;align-items:center;gap:15px;border-color:#3c4553;margin-top:24px}.profile-left{display:flex;gap:13px;align-items:center;min-width:0}.avatar{width:45px;height:45px;flex-shrink:0;display:grid;place-items:center;border-radius:50%;background:#2d3546;color:var(--gold);border:1px solid #4e5668;font-size:20px}.profile-name{font-size:16px;font-weight:700;overflow-wrap:anywhere}.balance{font-size:25px;color:var(--gold);font-weight:800}.balance small{font-size:11px}.profile-meta{font-size:10px;color:var(--muted)}.login{max-width:420px;margin:40px auto}.login h2{margin-bottom:5px}.login p{margin-bottom:22px}.login form{margin-top:18px}.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#243651;border:1px solid #536988;padding:12px 18px;border-radius:12px;max-width:92%;z-index:10;box-shadow:0 10px 40px #0008}.footer{text-align:center;font-size:10px;color:#73839e;margin-top:18px}.sync{color:var(--muted);font-size:10px}.sync.error{color:#ffb0bd}
@media(max-width:480px){main{padding:18px 12px 30px}h1{font-size:22px}.brand-icon{width:39px;height:39px}.online{font-size:10px}.lucky-grid{gap:7px}.lucky{border-radius:14px;padding:14px 3px 11px}.lucky h3{font-size:10px}.lucky .time{font-size:9px}.lucky-number{letter-spacing:1px}.lucky-status{font-size:9px;padding:2px 5px}.result-date{font-size:9px}.card{padding:16px}.section-heading h2{font-size:16px}.tabs button{font-size:10px;padding:10px 3px}.ticker-label{padding:10px 8px;font-size:10px}.ticker-copy{font-size:12px}.profile{gap:8px}.profile .secondary{font-size:11px;padding:9px}.balance{font-size:22px}.profile-left{gap:9px}.form-grid{gap:10px}.archive-head h2{font-size:16px}.archive-head span{font-size:9px}}@media(prefers-reduced-motion:reduce){.ticker-track{animation:none;display:block;width:auto}.ticker-copy{white-space:normal;display:block;padding:10px 14px}.ticker-copy[aria-hidden]{display:none}.ticker-toggle{display:none}}
</style></head><body><main><header><div class="brand"><div class="brand-icon" aria-hidden="true">D</div><div><h1>Dubai Lottery</h1><small>DAILY LUCKY DRAW</small></div></div><span class="online">နေ့စဉ် ကံစမ်းမယ်</span></header>
<div class="ticker" id="ticker"><span class="ticker-label">ထွက်ချိန်</span><div class="ticker-window"><div class="ticker-track"><span class="ticker-copy">2D (အဆ ၈၀) ထွက်ချိန် — နေ့စဉ် ညနေ ၆ နာရီ　 /　 3D (အဆ ၆၅၀) ထွက်ချိန် — နေ့စဉ် ည ၇ နာရီ　 /　 4D (အဆ ၆၀၀၀) ထွက်ချိန် — နေ့စဉ် ည ၈ နာရီ　 ·　 မြန်မာစံတော်ချိန်</span><span class="ticker-copy" aria-hidden="true">2D (အဆ ၈၀) ထွက်ချိန် — နေ့စဉ် ညနေ ၆ နာရီ　 /　 3D (အဆ ၆၅၀) ထွက်ချိန် — နေ့စဉ် ည ၇ နာရီ　 /　 4D (အဆ ၆၀၀၀) ထွက်ချိန် — နေ့စဉ် ည ၈ နာရီ　 ·　 မြန်မာစံတော်ချိန်</span></div></div><button id="pauseTicker" class="ticker-toggle" aria-label="ပြေးစာ ခဏရပ်ရန်" aria-pressed="false">Ⅱ</button></div>
<section id="login" class="card login"><div class="eyebrow">WELCOME BACK</div><h2>အကောင့်ဝင်မယ်</h2><p class="muted">သင့်အကောင့်နဲ့ ကံစမ်းမှုတွေကို စီမံပါ။</p><form id="lf"><label for="u">Username</label><input id="u" autocomplete="username" placeholder="သင့် Username" required maxlength="32"><label for="p">Password</label><input id="p" type="password" autocomplete="current-password" placeholder="သင့် Password" required minlength="12" maxlength="128"><button class="full">ဝင်မယ်</button><p id="le" class="error" role="alert"></p></form></section>
<div id="app" class="hidden"><div class="section-heading"><div><div class="eyebrow">DAILY RESULTS</div><h2>ဒီနေ့ရဲ့ Lucky Numbers</h2></div><span class="sync" id="sync" role="status">ချိတ်ဆက်နေသည်…</span></div>
<div class="lucky-grid" id="luckyGrid">
<article class="lucky" id="lucky2D"><h3>2D Lucky Number</h3><p class="time">ရလဒ်ထွက်ချိန် = ညနေ ၆ နာရီ</p><div class="lucky-number" id="luckyNumber2D" aria-label="2D random ဂဏန်း">00</div><span class="lucky-status" id="luckyStatus2D">နေ့စွဲ</span></article>
<article class="lucky" id="lucky3D"><h3>3D Lucky Number</h3><p class="time">ရလဒ်ထွက်ချိန် = ည ၇ နာရီ</p><div class="lucky-number" id="luckyNumber3D" aria-label="3D random ဂဏန်း">000</div><span class="lucky-status" id="luckyStatus3D">နေ့စွဲ</span></article>
<article class="lucky" id="lucky4D"><h3>4D Lucky Number</h3><p class="time">ရလဒ်ထွက်ချိန် = ည ၈ နာရီ</p><div class="lucky-number" id="luckyNumber4D" aria-label="4D random ဂဏန်း">0000</div><span class="lucky-status" id="luckyStatus4D">နေ့စွဲ</span></article></div>
<p class="hint">Lucky Number များသည် random ပြောင်းနေမည် ဖြစ်ပြီး Lucky Number ထွက်ချိန်တွင် ကွက်တိကျရောက်သည့် Number သည် Lucky Number ဖြစ်ပါသည်။ Lucky Number ထွက်ရှိပြီးသည့်အခါ ရလဒ်ကို ၈ နာရီကြာထိ ပြထားပေးမည်ဖြစ်သလို ထွက်ရှိပြီးသမျှ နေ့စဉ် result များကိုလည်း ရလဒ်များစာရင်းတွင် ဝင်ရောက်ကြည့်ရှုနိုင်ပါသည်။</p>
<div id="tabs" class="tabs"><button data-v="play">ကံစမ်းမယ်</button><button data-v="history">မှတ်တမ်း</button><button data-v="results">ရလဒ်များ</button><button data-v="wallet">Token</button><button data-v="limit">Limit</button></div>
<section id="play" class="card"><div class="markets"><button data-m="2D"><b>2D</b><span>ပေါက်ကြေး ၈၀ ဆ</span></button><button data-m="3D"><b>3D</b><span>ပေါက်ကြေး ၆၅၀ ဆ</span></button><button data-m="4D"><b>4D</b><span>ပေါက်ကြေး ၆၀၀၀ ဆ</span></button></div><div class="play-heading"><h2 id="mt">2D ကံစမ်းမယ်</h2><span id="drawState" class="draw-state">ဖွင့်ထား</span></div><div class="form-grid"><div><label for="num">ကံစမ်းမယ့် ဂဏန်း</label><input id="num" inputmode="numeric" autocomplete="off" placeholder="ဥပမာ 07" maxlength="2"></div><div><label for="stake">ထည့်မယ့် Token</label><input id="stake" type="number" min="1" max="100000" step="1" value="10"></div></div><div class="potential"><span>ပေါက်ပါက ပြန်ရမယ့် Token</span><b id="potential">—</b></div><button id="bet" class="full">အတည်ပြုပြီး ကံစမ်းမယ်</button><p class="rules" id="clock"></p><p class="rules">ပေါက်ကြေးမှာ မူလထိုးထားတဲ့ Token ပါဝင်ပါတယ်။</p><p id="be" class="error" role="alert"></p></section>
<section id="history" class="card hidden"><h2>ကံစမ်းမှတ်တမ်း</h2><div id="hl"></div></section>
<section id="wallet" class="card hidden"><h2>Token အဝင် / အထွက်</h2><div id="wl"></div></section>
<section id="limit" class="card hidden"><h2>သုံးစွဲမှုကန့်သတ်ချက်</h2><form id="pf"><label for="dl">နေ့စဉ် Token limit</label><input id="dl" type="number" min="1" max="1000000"><label for="bd">နားချိန်</label><select id="bd"><option value="0">မပြောင်းလဲပါ</option><option value="1">၁ ရက်</option><option value="7">၇ ရက်</option><option value="30">၃၀ ရက်</option></select><p id="bs" class="muted"></p><button>သိမ်းမယ်</button></form></section>
<section id="results" class="card"><div class="archive-head"><div><div class="eyebrow">RESULT HISTORY</div><h2>ထွက်ရှိပြီး ဂဏန်းများ</h2></div><span>ရက်စွဲအလိုက်</span></div><div id="rl" class="archive-list"></div></section>
<section id="profile" class="card profile"><div class="profile-left"><div id="avatar" class="avatar" aria-hidden="true">P</div><div><small>သင့်အကောင့်</small><div id="name" class="profile-name"></div><div class="balance"><span id="bal">0</span> <small>Token</small></div><div id="day" class="profile-meta"></div></div></div><button id="out" class="secondary">ထွက်မယ်</button></section>
</div><p class="footer">Dubai Lottery · မြန်မာစံတော်ချိန် (UTC +6:30)</p></main><div id="toast" class="toast hidden" role="status"></div><script>
'use strict';
const $=x=>document.getElementById(x),fmt=n=>Number(n).toLocaleString('en-US'),markets=['2D','3D','4D'],HOLD=8*60*60*1000;
let s=null,m='2D',tab='play',pending=null,busy=false,refreshing=false,serverBase=Date.now(),clockBase=performance.now();
const key=()=>crypto.randomUUID().replaceAll('-',''),mm=x=>String(x).replace(/[၀-၉]/g,c=>'၀၁၂၃၄၅၆၇၈၉'.indexOf(c));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const serverNow=()=>serverBase+(performance.now()-clockBase);
function toast(t){$('toast').textContent=t;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),4000)}
async function api(p,d){const r=await fetch('/api/'+p,{method:d?'POST':'GET',credentials:'same-origin',headers:d?{'Content-Type':'application/json','X-Lottery-Request':'1'}:{},body:d?JSON.stringify(d):undefined,signal:AbortSignal.timeout(20000)});const b=await r.json();if(!r.ok){const e=new Error(b.error||'Request failed');e.status=r.status;throw e}return b}
function show(v){tab=v;['play','history','wallet','limit'].forEach(x=>$(x).classList.toggle('hidden',x!==v));document.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v));if(v==='results')$('results').scrollIntoView({block:'start',behavior:'auto'})}
function login(){$('login').classList.remove('hidden');$('app').classList.add('hidden');s=null}
function draw(){return s?.draws.find(x=>x.day===s.day&&x.market===m)}
function isOpen(d){return d&&d.status==='open'&&Date.parse(d.cutoff)>serverNow()}
function updatePotential(){const d=draw(),n=mm($('num').value.trim()),stake=Number($('stake').value),valid=new RegExp('^[0-9]{'+m[0]+'}$').test(n)&&Number.isSafeInteger(stake)&&stake>0&&stake<=100000;$('potential').textContent=valid?fmt(stake*(d?.multiplier||0)):'—';$('bet').disabled=busy||!valid||!isOpen(d)||stake>Number(s?.account.balance||0)}
function entry(a,b){return '<div class="entry"><div>'+a+'</div><div style="text-align:right">'+b+'</div></div>'}
function latestHeld(market){const t=serverNow();return s?.draws.filter(d=>d.market===market&&d.status==='settled'&&d.result!=null&&Number.isFinite(Date.parse(d.settled_at))).sort((a,b)=>Date.parse(b.settled_at)-Date.parse(a.settled_at)).find(d=>t>=Date.parse(d.settled_at)&&t<Date.parse(d.settled_at)+HOLD)}
function randomNumber(market,previous){const max=10**Number(market[0]);const values=new Uint32Array(1);crypto.getRandomValues(values);let n=values[0]%max;if(String(n).padStart(Number(market[0]),'0')===previous)n=(n+1)%max;return String(n).padStart(Number(market[0]),'0')}
function renderLucky(advance=false){if(!s)return;for(const market of markets){const held=latestHeld(market),card=$('lucky'+market),num=$('luckyNumber'+market),wasPublished=card.classList.contains('published');card.classList.toggle('published',!!held);if(held){num.textContent=held.result;num.setAttribute('aria-label',market+' ထုတ်ပြန်ရလဒ် '+held.result);$('luckyStatus'+market).textContent=new Date(serverNow()+23400000).toISOString().slice(0,10)}else{if(advance||wasPublished||!num.dataset.started){num.textContent=randomNumber(market,num.textContent);num.dataset.started='1'}num.setAttribute('aria-label',market+' random ဂဏန်း၊ ရလဒ်မဟုတ်ပါ');$('luckyStatus'+market).textContent=new Date(serverNow()+23400000).toISOString().slice(0,10)}}}
function renderArchive(){const groups=new Map();for(const d of s.draws.filter(d=>d.status==='settled')){if(!groups.has(d.day))groups.set(d.day,{});groups.get(d.day)[d.market]=d}const days=[...groups.keys()].sort().reverse();$('rl').innerHTML=days.map(day=>'<article class="result-day"><div class="result-day-title"><b>'+esc(day)+'</b><span>ထုတ်ပြန်ရလဒ်</span></div><div class="result-columns">'+markets.map(market=>{const d=groups.get(day)[market];return '<div class="result-cell"><small>'+market+'</small><strong>'+esc(d?.result??'—')+'</strong></div>'}).join('')+'</div></article>').join('')||'<p class="archive-empty">ရလဒ်ထုတ်ပြန်ပြီးသည်နှင့် ဒီနေရာမှာ ပြပေးပါမယ်။</p>'}
function render(){if(!s)return;$('login').classList.add('hidden');$('app').classList.remove('hidden');$('name').textContent=s.account.username;$('avatar').textContent=s.account.username.slice(0,1).toUpperCase();$('bal').textContent=fmt(s.account.balance);$('day').textContent=s.day+' · မြန်မာစံတော်ချိန်';$('mt').textContent=m+' ကံစမ်းမယ်';document.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('selected',b.dataset.m===m));$('num').maxLength=Number(m[0]);$('num').placeholder='ဥပမာ '+String(7).padStart(Number(m[0]),'0');$('hl').innerHTML=s.bets.map(b=>entry('<b>'+esc(b.market)+' · '+esc(b.number)+'</b><br><small>'+esc(b.day)+' · #'+b.id+'</small>','<b>'+fmt(b.stake)+' Token</b><br><small class="'+(b.payout?'good':'')+'">'+(b.status!=='settled'?'စောင့်နေ':b.payout?'+'+fmt(b.payout):'မပေါက်')+'</small>')).join('')||'<p class="muted">ကံစမ်းမှတ်တမ်း မရှိသေးပါ။</p>';const names={entry:'ကံစမ်းမှု',win:'ပေါက်ကြေး',admin:'Token ဖြည့် / နုတ်'};$('wl').innerHTML=s.ledger.map(l=>entry('<b>'+esc(names[l.kind]||l.kind)+'</b><br><small>'+esc(l.note)+' · #'+l.id+'</small>','<b class="'+(l.delta>0?'good':'')+'">'+(l.delta>0?'+':'')+fmt(l.delta)+'</b><br><small>လက်ကျန် '+fmt(l.balance_after)+'</small>')).join('')||'<p class="muted">Token မှတ်တမ်း မရှိသေးပါ။</p>';if(document.activeElement!==$('dl'))$('dl').value=s.account.daily_limit;$('dl').max=s.account.daily_limit;$('bs').textContent=s.account.excluded_until?'နားချိန်: '+new Date(s.account.excluded_until).toLocaleString('en-GB',{timeZone:'Asia/Yangon'}):'';renderArchive();renderLucky();['play','history','wallet','limit'].forEach(x=>$(x).classList.toggle('hidden',x!==tab));document.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===tab));tick()}
async function refresh(){if(refreshing)return;refreshing=true;try{const next=await api('state');s=next;serverBase=Date.parse(s.server_time);clockBase=performance.now();$('sync').textContent='တိုက်ရိုက် ရလဒ်';$('sync').classList.remove('error');render()}catch(e){if(e.status===401)login();else{$('sync').textContent='ချိတ်ဆက်မှု စောင့်နေ';$('sync').classList.add('error')}}finally{refreshing=false}}
function tick(){if(!s)return;const d=draw(),l=d?Date.parse(d.cutoff)-serverNow():0,open=isOpen(d);$('drawState').textContent=open?'ထိုးခွင့်ဖွင့်ထား':'ထိုးခွင့်ပိတ်ထား';$('drawState').classList.toggle('closed',!open);$('clock').textContent=open?'ပိတ်ရန် '+Math.floor(l/3600000)+':'+String(Math.floor(l/60000)%60).padStart(2,'0')+':'+String(Math.floor(l/1000)%60).padStart(2,'0'):'ယနေ့ '+m+' ထိုးခွင့်ပိတ်ပြီးပါပြီ';renderLucky();updatePotential()}
$('pauseTicker').onclick=()=>{const paused=$('ticker').classList.toggle('paused');$('pauseTicker').textContent=paused?'▶':'Ⅱ';$('pauseTicker').setAttribute('aria-pressed',String(paused));$('pauseTicker').setAttribute('aria-label',paused?'ပြေးစာ ဆက်ဖွင့်ရန်':'ပြေးစာ ခဏရပ်ရန်')};
$('lf').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;$('le').textContent='';try{await api('login',{username:$('u').value,password:$('p').value});$('p').value='';await refresh()}catch(x){$('le').textContent=x.message}finally{e.submitter.disabled=false}};
$('out').onclick=async()=>{try{await api('logout',{})}catch{}login()};
$('tabs').onclick=e=>{const b=e.target.closest('[data-v]');if(b)show(b.dataset.v)};
$('play').onclick=e=>{const b=e.target.closest('[data-m]');if(b){m=b.dataset.m;pending=null;$('num').value='';render()}};
$('num').oninput=()=>{pending=null;updatePotential()};$('stake').oninput=()=>{pending=null;updatePotential()};
$('bet').onclick=async()=>{if(busy)return;const d=draw(),number=mm($('num').value.trim()),stake=Number($('stake').value);if(!isOpen(d))return;if(!confirm(m+' · '+number+' · '+fmt(stake)+' token နုတ်မည်။'))return;const q=pending||(pending={draw_id:d.id,number,stake,key:key()});busy=true;updatePotential();try{const r=await api('bet',q);pending=null;$('be').textContent='';toast('အတည်ပြုပြီး · #'+r.bet_id);await refresh()}catch(x){if(x.status<500)pending=null;$('be').textContent=x.message}finally{busy=false;updatePotential()}};
$('pf').onsubmit=async e=>{e.preventDefault();if(!confirm('ကန့်သတ်ချက်ကို သိမ်းမည်။ သတ်မှတ်ထားသောနားချိန်ကို အစောပိုင်း ပြန်ဖွင့်မရပါ။'))return;try{await api('preferences',{daily_limit:Number($('dl').value),break_days:Number($('bd').value)});toast('သိမ်းပြီးပါပြီ');await refresh()}catch(x){toast(x.message)}};
setInterval(()=>{if(document.visibilityState==='visible')tick()},1000);setInterval(()=>{if(document.visibilityState==='visible')renderLucky(true)},2000);setInterval(()=>{if(s&&document.visibilityState==='visible'&&!busy)refresh()},5000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){renderLucky(true);refresh()}});window.addEventListener('online',refresh);refresh();
</script></body></html>`;
}

// ui-admin.mjs
function adminPage() {
  return String.raw`<!doctype html><html lang="my"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dubai Lottery Admin</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#091122;color:#eef3ff;font:14px/1.8 system-ui,"Noto Sans Myanmar",sans-serif}main{max-width:1080px;margin:auto;padding:22px 16px}h1{font-size:25px;margin:0}h2{font-size:18px;margin:0 0 14px}p{margin:7px 0}.card{background:#141f36;border:1px solid #2b3b55;border-radius:17px;padding:20px;margin:16px 0}input,select,button{font:inherit;border-radius:10px;padding:11px}input,select{width:100%;min-width:0;background:#0c1629;color:#fff;border:1px solid #384963;margin:5px 0 12px}label{color:#aab8d0;font-size:12px;display:block}button{border:0;background:#ffd17a;color:#271b06;font-weight:750;cursor:pointer}button:disabled{opacity:.4;cursor:default}.secondary{background:#293b55;color:#fff}.hidden{display:none!important}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.grid .card{margin:0}.entry{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid #2d3b55}.muted,small{color:#a6b4cc}.error{color:#ffb0bd}.header,.account{display:flex;align-items:center;justify-content:space-between;gap:12px}.balance{color:#ffd17a;font-size:25px;font-weight:800}.badge{display:inline-block;padding:3px 8px;background:#253650;border-radius:7px;font-size:11px;color:#ffda99}.filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.stats{display:flex;gap:18px;padding:12px;background:#0e192d;border-radius:10px;margin:12px 0}.stats b{color:#ffd17a}.table-wrap{overflow:auto;max-height:480px}table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:12px}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #2b3b55}th{background:#17263e;color:#adc1df;position:sticky;top:0}.pager{display:flex;justify-content:space-between;align-items:center;margin-top:14px}.message{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:13px 18px;max-width:94%;border-radius:12px;border:1px solid #6981a3;background:#243853;z-index:10}.login{max-width:440px;margin:40px auto}.summary{font-size:12px;color:#b9c8df;border-left:3px solid #ffd17a;padding-left:12px}.full{width:100%}@media(max-width:700px){.grid{grid-template-columns:1fr}.filters{grid-template-columns:1fr 1fr}.card{padding:15px}h1{font-size:21px}.header{align-items:flex-start}.account{flex-wrap:wrap}}
</style></head><body><main><div class="header"><div><h1>Dubai Lottery Admin</h1><small>Accounts · Tokens · Betting reports</small></div><button id="out" class="secondary hidden">ထွက်မယ်</button></div>
<section id="login" class="card login"><h2>Admin Login</h2><form id="lf"><label for="u">Username</label><input id="u" autocomplete="username" required maxlength="32"><label for="p">Password</label><input id="p" type="password" autocomplete="current-password" required minlength="12" maxlength="128"><button class="full">ဝင်မယ်</button><p id="err" class="error" role="alert"></p></form></section>
<div id="app" class="hidden"><section class="card account"><div><b id="adminName"></b> <span id="adminLevel" class="badge"></span><p id="scope" class="muted"></p></div><div><small>သင့် Token လက်ကျန်</small><div class="balance" id="balance"></div></div></section>
<div class="grid"><section class="card"><h2>အကောင့်အသစ် ဖန်တီးမယ်</h2><form id="cf"><label for="level">အကောင့်အဆင့်</label><select id="level"></select><label for="nu">Username</label><input id="nu" required minlength="3" maxlength="32" autocomplete="off"><label for="np">Password (အနည်းဆုံး ၁၂ လုံး)</label><input id="np" type="password" required minlength="12" maxlength="128" autocomplete="new-password"><button>ဖန်တီးမယ်</button></form></section>
<section class="card"><h2>Token ဖြည့် / နုတ်</h2><p class="summary" id="transferHelp"></p><form id="af"><label for="au">လက်အောက်အကောင့်</label><select id="au" required></select><label for="delta">Token (+ ဖြည့် / − နုတ်)</label><input id="delta" type="number" step="1" required><label for="reason">စာရင်းအကြောင်းပြချက်</label><input id="reason" required minlength="5" maxlength="240"><button>အတည်ပြုမယ်</button></form></section></div>
<section id="resultPanel" class="card hidden"><h2>ရလဒ် ကြိုတင်သိမ်း / ထုတ်ပြန်မယ်</h2><p class="summary">2D ညနေ ၆ / 3D ည ၇ / 4D ည ၈ နာရီ (မြန်မာချိန်)။ ကြိုသိမ်းထားလျှင် သတ်မှတ်ချိန်မတိုင်မီ Player မမြင်ရပါ။ အတည်ပြုသိမ်းပြီး ဂဏန်းကို ပြန်ပြင်မရပါ။</p><form id="sf"><label for="draw">ပွဲစဉ်</label><select id="draw" required></select><label for="result">အနိုင်ရဂဏန်း</label><input id="result" inputmode="numeric" maxlength="4" required><p id="scheduleStatus" class="muted"></p><button id="saveResult">အတည်ပြုပြီး သိမ်းမယ်</button></form></section>
<section class="card"><h2>Player ကံစမ်းစာရင်း</h2><form id="filters"><div class="filters"><div><label for="reportDay">ရက်စွဲ</label><input id="reportDay" type="date" required></div><div><label for="reportMarket">အမျိုးအစား</label><select id="reportMarket"><option value="">အားလုံး</option><option>2D</option><option>3D</option><option>4D</option></select></div><div><label for="reportPlayer">Player</label><select id="reportPlayer"></select></div><div><label for="reportNumber">ဂဏန်း (အစသုညပါ)</label><input id="reportNumber" inputmode="numeric" maxlength="4" placeholder="ဥပမာ 07"></div><div><label for="reportSort">အများဆုံးအစဉ်</label><select id="reportSort"><option value="tokens">ထိုးထားသော Token အများဆုံး</option><option value="count">ကံစမ်းအကြိမ်ရေ အများဆုံး</option></select></div></div><button>စာရင်းကြည့်မယ်</button></form><p id="reportError" class="error"></p><div id="totals" class="stats"></div><h2>ဂဏန်းအလိုက် စုစုပေါင်း</h2><small>Filter နှင့်ကိုက်ညီသော ထိပ်ဆုံး ဂဏန်း ၁၀၀</small><div id="numbers" class="table-wrap"></div><h2 style="margin-top:24px">တစ်ဦးချင်း ကံစမ်းမှတ်တမ်း</h2><div id="bets" class="table-wrap"></div><div class="pager"><button id="prev" class="secondary">ရှေ့</button><span id="pageNo"></span><button id="next" class="secondary">နောက်</button></div></section>
<section class="card"><h2>လက်အောက်အကောင့်များ</h2><div id="users" class="table-wrap"></div></section><section class="card"><h2>သင့် Token မှတ်တမ်း</h2><div id="ledger" class="table-wrap"></div></section><section class="card"><h2>လုပ်ဆောင်မှုမှတ်တမ်း</h2><div id="audit" class="table-wrap"></div></section></div></main><div id="message" class="message hidden" role="status"></div><script>
'use strict';const $=x=>document.getElementById(x),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=n=>Number(n).toLocaleString('en-US'),key=()=>crypto.randomUUID().replaceAll('-',''),mm=x=>String(x).replace(/[၀-၉]/g,c=>'၀၁၂၃၄၅၆၇၈၉'.indexOf(c));
const labels={root:'Owner Admin',senior:'Senior Admin',master:'Master Admin',player:'Player'};let state=null,busy=false,pendingAdjust=null,page=1,pages=1;
function msg(t){$('message').textContent=t;$('message').classList.remove('hidden');setTimeout(()=>$('message').classList.add('hidden'),5000)}
async function api(p,d){const r=await fetch('/admin/api/'+p,{method:d?'POST':'GET',credentials:'same-origin',headers:d?{'Content-Type':'application/json','X-Lottery-Admin':'1'}:{},body:d?JSON.stringify(d):undefined});const b=await r.json();if(!r.ok){const e=new Error(b.error||'Request failed');e.status=r.status;throw e}return b}
function table(head,rows){return '<table><thead><tr>'+head.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+esc(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+(rows.length?'':'<p class="muted">မှတ်တမ်း မရှိသေးပါ။</p>')}
function options(id,items,empty=false){const old=$(id).value;$(id).innerHTML=(empty?'<option value="">အားလုံး</option>':'')+items.map(([v,l])=>'<option value="'+esc(v)+'">'+esc(l)+'</option>').join('');if([...$(id).options].some(o=>o.value===old))$(id).value=old}
function showLogin(){state=null;$('login').classList.remove('hidden');$('app').classList.add('hidden');$('out').classList.add('hidden')}
function resultSelection(){const d=state?.draws.find(x=>String(x.id)===$('draw').value);$('result').value=d?.scheduled_result||'';$('result').disabled=!!d?.scheduled_result;$('saveResult').disabled=busy||!d||!!d.scheduled_result;$('scheduleStatus').textContent=d?.scheduled_result?'ကြိုသိမ်းထားပြီး · '+d.scheduled_result+' · သတ်မှတ်ချိန်မှ ထုတ်ပြန်မည်။':d?'ထွက်ချိန် · '+new Date(d.cutoff).toLocaleString('en-GB',{timeZone:'Asia/Yangon'}):'မထုတ်ပြန်ရသေးသောပွဲ မရှိပါ။'}
async function refresh(){try{state=await api('state');$('login').classList.add('hidden');$('app').classList.remove('hidden');$('out').classList.remove('hidden');$('adminName').textContent=state.admin;$('adminLevel').textContent=labels[state.level];$('balance').textContent=fmt(state.balance);$('scope').textContent=state.level==='root'?'အကောင့်အားလုံးကို စီမံနိုင်သည်။':'မိမိလက်အောက်အကောင့်များကိုသာ ကြည့်နိုင်သည်။';$('transferHelp').textContent=state.level==='root'?'လက်အောက် Admin / Player အကောင့်များကို Token ဖြည့် / နုတ်နိုင်သည်။':'Token ဖြည့်ပေးလျှင် သင့်လက်ကျန်မှ နုတ်မည်။ ပြန်နုတ်ယူလျှင် သင့်လက်ကျန်ထဲ ပြန်ဝင်မည်။';options('level',state.create_levels.map(l=>[l,labels[l]]));options('au',state.users.filter(u=>u.can_adjust).map(u=>[u.id,u.username+' · '+labels[u.role==='player'?'player':u.admin_level]+' · '+fmt(u.balance)]));options('reportPlayer',state.users.filter(u=>u.role==='player').map(u=>[u.id,u.username]),true);$('resultPanel').classList.toggle('hidden',state.level!=='root');options('draw',state.draws.map(d=>[d.id,d.day+' · '+d.market+(d.scheduled_result?' · သိမ်းပြီး':'')]));resultSelection();if(!$('reportDay').value)$('reportDay').value=state.day;const names=Object.fromEntries(state.users.map(u=>[u.id,u.username]));$('users').innerHTML=table(['Username','အဆင့်','ဖန်တီးသူ','Token'],state.users.map(u=>[u.username,labels[u.role==='player'?'player':u.admin_level],names[u.parent_id]||state.admin,fmt(u.balance)]));$('ledger').innerHTML=table(['အချိန်','အကြောင်းပြချက်','အဝင်/အထွက်','လက်ကျန်'],state.ledger.map(l=>[new Date(l.created_at).toLocaleString('en-GB',{timeZone:'Asia/Yangon'}),l.note,fmt(l.delta),fmt(l.balance_after)]));$('audit').innerHTML=table(['အချိန်','လုပ်ဆောင်မှု','အသေးစိတ်'],state.audit.map(a=>[new Date(a.created_at).toLocaleString('en-GB',{timeZone:'Asia/Yangon'}),a.action,JSON.stringify(a.detail)]))}catch(e){if(e.status===401)showLogin();else msg(e.message)}}
async function report(){if(!state)return;$('reportError').textContent='';try{const params=new URLSearchParams({day:$('reportDay').value,market:$('reportMarket').value,player:$('reportPlayer').value,number:mm($('reportNumber').value.trim()),sort:$('reportSort').value,page:String(page)});const r=await api('bets?'+params);pages=r.pages;$('totals').innerHTML='<span>ကံစမ်းမှု <b>'+fmt(r.totals.entries)+'</b></span><span>Token စုစုပေါင်း <b>'+fmt(r.totals.tokens)+'</b></span>';$('numbers').innerHTML=table(['အမျိုးအစား','ဂဏန်း','အကြိမ်ရေ','Token'],r.groups.map(g=>[g.market,g.number,fmt(g.entries),fmt(g.tokens)]));$('bets').innerHTML=table(['Receipt','Player','ရက်စွဲ','အမျိုးအစား','ဂဏန်း','Token','ပေါက်ကြေး'],r.bets.map(b=>[b.id,b.username,b.day,b.market,b.number,fmt(b.stake),fmt(b.payout)]));$('pageNo').textContent=page+' / '+pages;$('prev').disabled=page<=1;$('next').disabled=page>=pages}catch(e){$('reportError').textContent=e.message}}
async function mutation(button,fn){if(busy)return;busy=true;button.disabled=true;try{await fn();await refresh()}catch(e){msg(e.message)}finally{busy=false;button.disabled=false;resultSelection()}}
$('lf').onsubmit=e=>{e.preventDefault();$('err').textContent='';mutation(e.submitter,async()=>{try{await api('login',{username:$('u').value,password:$('p').value});$('p').value='';await refresh();await report()}catch(x){$('err').textContent=x.message;throw x}})};
$('out').onclick=async()=>{try{await api('logout',{})}catch{}showLogin()};$('draw').onchange=resultSelection;
$('cf').onsubmit=e=>{e.preventDefault();mutation(e.submitter,async()=>{await api('create',{username:$('nu').value,password:$('np').value,level:$('level').value});$('nu').value='';$('np').value='';msg('အကောင့်ဖန်တီးပြီးပါပြီ။')})};
$('af').oninput=()=>pendingAdjust=null;$('af').onsubmit=e=>{e.preventDefault();const payload=pendingAdjust||(pendingAdjust={user_id:Number($('au').value),delta:Number($('delta').value),note:$('reason').value,key:key()});if(!confirm(fmt(payload.delta)+' Token ပြောင်းလဲမည်။'))return;mutation(e.submitter,async()=>{try{await api('adjust',payload);pendingAdjust=null;$('delta').value='';$('reason').value='';msg('Token စာရင်းပြင်ပြီးပါပြီ။')}catch(x){if(x.status<500)pendingAdjust=null;throw x}})};
$('sf').onsubmit=e=>{e.preventDefault();const result=mm($('result').value.trim());if(!confirm('ရလဒ် '+result+' ကို အတည်ပြုသိမ်းမည်။ ပြန်ပြင်မရပါ။ ထွက်ချိန်မှ Player များမြင်ရမည်။'))return;mutation(e.submitter,async()=>{await api('settle',{draw_id:Number($('draw').value),result});msg('ရလဒ် အတည်ပြုသိမ်းပြီးပါပြီ။')})};
$('filters').onsubmit=e=>{e.preventDefault();page=1;report()};$('prev').onclick=()=>{if(page>1){page--;report()}};$('next').onclick=()=>{if(page<pages){page++;report()}};refresh().then(report);
</script></body></html>`;
}

// schedule.mjs
var DRAW_TIMES = Object.freeze({ "2D": "11:30", "3D": "12:30", "4D": "13:30" });
function cutoffFor(day, market) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !DRAW_TIMES[market]) throw new Error("Invalid draw schedule");
  return /* @__PURE__ */ new Date(day + "T" + DRAW_TIMES[market] + ":00.000Z");
}

// admin-service.mjs
var adminLevel = (u) => u.admin_level || "root";
var childLevels = (u) => adminLevel(u) === "root" ? ["senior", "master", "player"] : adminLevel(u) === "senior" ? ["master", "player"] : ["player"];
var TREE = `WITH RECURSIVE team AS (SELECT id FROM users WHERE parent_id=$1 UNION ALL SELECT u.id FROM users u JOIN team t ON u.parent_id=t.id)`;
function adminService({ q: q2, one: one2, fail: fail2, int: int2, reqKey: reqKey2, strongUser: strongUser2, passOk: passOk2, passwordHash: passwordHash2, move: move2, ensureDay: ensureDay2, settle: settle2, now: now2, localDay: localDay2 }) {
  const root = (a) => {
    if (a.role !== "admin" || adminLevel(a) !== "root") fail2(403, "Owner Admin \u101E\u102C \u101C\u102F\u1015\u103A\u1006\u1031\u102C\u1004\u103A\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u101E\u100A\u103A\u104B");
  };
  async function visible(c, a) {
    if (adminLevel(a) === "root") return (await q2(c, "SELECT id FROM users WHERE id<>$1", [a.id])).rows.map((x) => x.id);
    return (await q2(c, TREE + " SELECT id FROM team", [a.id])).rows.map((x) => x.id);
  }
  async function create(c, a, data) {
    const level = data.level || "player";
    if (!childLevels(a).includes(level)) fail2(403, "\u1024\u1021\u1006\u1004\u1037\u103A account \u1000\u102D\u102F \u1016\u1014\u103A\u1010\u102E\u1038\u1001\u103D\u1004\u1037\u103A\u1019\u101B\u103E\u102D\u1015\u102B\u104B");
    if (!strongUser2(data.username) || !passOk2(data.password)) fail2(400, "Username / Password \u101E\u1010\u103A\u1019\u103E\u1010\u103A\u1001\u103B\u1000\u103A \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
    const h = await passwordHash2(data.password);
    let u;
    try {
      u = await one2(c, "INSERT INTO users(username,password,role,admin_level,parent_id) VALUES($1,$2,$3,$4,$5) RETURNING id", [data.username.toLowerCase(), h, level === "player" ? "player" : "admin", level === "player" ? null : level, a.id]);
    } catch (e) {
      if (e.code === "23505") fail2(409, "Username \u101B\u103E\u102D\u1015\u103C\u102E\u1038\u101E\u102C\u1038\u1015\u102B\u104B");
      throw e;
    }
    await q2(c, "INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)", [a.id, "create_user", JSON.stringify({ user_id: u.id, username: data.username.toLowerCase(), level, parent_id: a.id })]);
    return { id: u.id };
  }
  async function adjust(c, a, data) {
    const { user_id, delta, note, key } = data;
    if (!int2(user_id, 1, 2 ** 31) || !int2(delta, -1e9, 1e9) || !delta || typeof note !== "string" || note.trim().length < 5 || note.length > 240 || !reqKey2(key)) fail2(400, "Token \u1021\u1001\u103B\u1000\u103A\u1021\u101C\u1000\u103A \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
    const u = await one2(c, "SELECT * FROM users WHERE id=$1", [user_id]);
    if (!u || u.id === a.id || u.role === "admin" && adminLevel(u) === "root" || adminLevel(a) !== "root" && u.parent_id !== a.id) fail2(403, "\u1024 account \u1000\u102D\u102F Token \u1015\u103C\u1031\u102C\u1004\u103A\u1038\u101C\u1032\u1001\u103D\u1004\u1037\u103A\u1019\u101B\u103E\u102D\u1015\u102B\u104B");
    const ref = "adjust:" + a.id + ":" + key, old = await one2(c, "SELECT * FROM ledger WHERE ref=$1", [ref]);
    if (old) {
      if (old.user_id !== user_id || Number(old.delta) !== delta || old.note !== note) fail2(409, "Request key \u1000\u102D\u102F \u1019\u1010\u1030\u101E\u1031\u102C\u1021\u1001\u103B\u1000\u103A\u1021\u101C\u1000\u103A\u1016\u103C\u1004\u1037\u103A \u101E\u102F\u1036\u1038\u1015\u103C\u102E\u1038\u101E\u102C\u1038\u1015\u102B\u104B");
      return { duplicate: true };
    }
    if (adminLevel(a) !== "root") await move2(c, a.id, -delta, "transfer", ref + ":sender", note, a.id);
    await move2(c, user_id, delta, "admin", ref, note, a.id);
    await q2(c, "INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)", [a.id, "adjust", JSON.stringify({ user_id, delta, note, mode: adminLevel(a) === "root" ? "owner_adjustment" : "transfer" })]);
    return { duplicate: false };
  }
  async function schedule(c, a, data) {
    root(a);
    const { draw_id, result } = data;
    if (!int2(draw_id, 1, 2 ** 31)) fail2(400, "Draw \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
    await ensureDay2(c);
    const d = await one2(c, "SELECT * FROM draws WHERE id=$1 FOR UPDATE", [draw_id]);
    if (!d) fail2(404, "Draw \u1019\u1010\u103D\u1031\u1037\u1015\u102B\u104B");
    if (typeof result !== "string" || !new RegExp("^[0-9]{" + d.market[0] + "}$").test(result)) fail2(400, "\u1021\u1014\u102D\u102F\u1004\u103A\u101B\u1002\u100F\u1014\u103A\u1038\u1021\u101B\u1031\u1021\u1010\u103D\u1000\u103A \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
    if (d.status === "settled") {
      if (d.result === result) return { duplicate: true, published: true };
      fail2(409, "\u1011\u102F\u1010\u103A\u1015\u103C\u1014\u103A\u1015\u103C\u102E\u1038\u101E\u102C\u1038\u101B\u101C\u1012\u103A\u1000\u102D\u102F \u1015\u103C\u1014\u103A\u1015\u103C\u1004\u103A\u1019\u101B\u1015\u102B\u104B");
    }
    const old = await one2(c, "SELECT * FROM scheduled_results WHERE draw_id=$1", [draw_id]);
    if (old) {
      if (old.result !== result) fail2(409, "\u1021\u1010\u100A\u103A\u1015\u103C\u102F\u101E\u102D\u1019\u103A\u1038\u1011\u102C\u1038\u101E\u1031\u102C\u101B\u101C\u1012\u103A\u1000\u102D\u102F \u1015\u103C\u1014\u103A\u1015\u103C\u1004\u103A\u1019\u101B\u1015\u102B\u104B");
      await publishDue(c);
      return { duplicate: true };
    }
    await q2(c, "INSERT INTO scheduled_results(draw_id,result,actor,created_at) VALUES($1,$2,$3,$4)", [draw_id, result, a.id, now2()]);
    await q2(c, "INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)", [a.id, "schedule_result", JSON.stringify({ draw_id, publish_at: d.cutoff })]);
    await publishDue(c);
    return { ok: true, publish_at: d.cutoff };
  }
  async function publishDue(c) {
    const due = (await q2(c, `SELECT r.*,d.cutoff FROM scheduled_results r JOIN draws d ON d.id=r.draw_id WHERE d.status<>'settled' AND d.cutoff<=$1 ORDER BY d.cutoff,d.id FOR UPDATE OF d`, [now2()])).rows;
    for (const r of due) {
      await settle2(c, { id: r.actor }, { draw_id: r.draw_id, result: r.result, source: "\u1021\u1010\u100A\u103A\u1015\u103C\u102F\u101B\u101C\u1012\u103A" });
      const published = new Date(Math.max(new Date(r.created_at).getTime(), new Date(r.cutoff).getTime()));
      await q2(c, "UPDATE draws SET settled_at=$1 WHERE id=$2", [published, r.draw_id]);
    }
  }
  async function state(c, a) {
    await ensureDay2(c);
    await publishDue(c);
    const ids = await visible(c, a);
    const users = (await q2(c, "SELECT id,username,role,admin_level,parent_id,balance,active,daily_limit FROM users WHERE id=ANY($1::bigint[]) ORDER BY id", [ids])).rows.map((u) => ({ ...u, can_adjust: adminLevel(a) === "root" || u.parent_id === a.id }));
    const current = await one2(c, "SELECT balance FROM users WHERE id=$1", [a.id]);
    return { admin: a.username, level: adminLevel(a), balance: current.balance, create_levels: childLevels(a), day: localDay2(), users, ledger: (await q2(c, "SELECT id,delta,balance_after,kind,note,created_at FROM ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 100", [a.id])).rows, draws: adminLevel(a) === "root" ? (await q2(c, `SELECT d.id,d.day::text,d.market,d.status,d.cutoff,r.result AS scheduled_result FROM draws d LEFT JOIN scheduled_results r ON r.draw_id=d.id WHERE d.status<>'settled' ORDER BY d.day DESC,d.id LIMIT 100`)).rows : [], audit: (await q2(c, `SELECT * FROM audit WHERE $1::boolean OR (actor=ANY($2::bigint[]) AND action NOT IN ('schedule_result','settle')) ORDER BY id DESC LIMIT 200`, [adminLevel(a) === "root", [a.id, ...ids]])).rows };
  }
  async function report(c, a, params) {
    const ids = await visible(c, a), day = params.get("day") || localDay2(), market = params.get("market") || "", number = params.get("number") || "", player = Number(params.get("player") || 0), sort = params.get("sort") === "count" ? "entries" : "tokens", page = Number(params.get("page") || 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || market && !["2D", "3D", "4D"].includes(market) || number && !/^[0-9]{2,4}$/.test(number) || !int2(player, 0, 2 ** 31) || !int2(page, 1, 1e5)) fail2(400, "Filter \u1021\u1001\u103B\u1000\u103A\u1021\u101C\u1000\u103A \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
    if (player && !ids.includes(player)) fail2(403, "\u1024 Player \u1000\u102D\u102F \u1000\u103C\u100A\u1037\u103A\u1001\u103D\u1004\u1037\u103A\u1019\u101B\u103E\u102D\u1015\u102B\u104B");
    const args = [ids, day, market, number, player];
    const from = `FROM bets b JOIN users u ON u.id=b.user_id JOIN draws d ON d.id=b.draw_id WHERE u.role='player' AND u.id=ANY($1::bigint[]) AND d.day=$2::date AND ($3='' OR d.market=$3) AND ($4='' OR b.number=$4) AND ($5::bigint=0 OR b.user_id=$5)`;
    const totals = await one2(c, "SELECT COUNT(*)::bigint AS entries,COALESCE(SUM(b.stake),0)::bigint AS tokens " + from, args);
    const groups = (await q2(c, `SELECT d.market,b.number,COUNT(*)::bigint AS entries,SUM(b.stake)::bigint AS tokens ${from} GROUP BY d.market,b.number ORDER BY ${sort} DESC,d.market,b.number LIMIT 100`, args)).rows;
    const bets = (await q2(c, `SELECT b.id,u.username,d.day::text,d.market,b.number,b.stake,b.payout,b.created_at ${from} ORDER BY b.id DESC LIMIT 100 OFFSET $6`, [...args, (page - 1) * 100])).rows;
    return { day, totals, groups, bets, page, pages: Math.max(1, Math.ceil(Number(totals.entries) / 100)) };
  }
  return { create, adjust, schedule, publishDue, state, report };
}

// index.mjs
esm_default.types.setTypeParser(20, Number);
var derive = promisify(scrypt);
var pool = new esm_default.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 15e3, idleTimeoutMillis: 3e4 });
attachDatabasePool(pool);
var MM_OFFSET = 6.5 * 60 * 60 * 1e3;
var MULT = { "2D": 80, "3D": 650, "4D": 6e3 };
var MAX_BAL = 1e12;
var MAX_STAKE = 1e5;
var APIError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var fail = (s, m) => {
  throw new APIError(s, m);
};
var now = () => /* @__PURE__ */ new Date();
var iso = (d) => d.toISOString();
var sha = (s) => createHash("sha256").update(s).digest("hex");
var token = () => randomBytes(32).toString("base64url");
var q = (c, sql, args = []) => c.query(sql, args);
var one = async (c, sql, args = []) => (await q(c, sql, args)).rows[0];
var localDay = (d = now()) => new Date(d.getTime() + MM_OFFSET).toISOString().slice(0, 10);
var strongUser = (x) => typeof x === "string" && /^[A-Za-z0-9_.-]{3,32}$/.test(x);
var reqKey = (x) => typeof x === "string" && /^[A-Za-z0-9_-]{16,80}$/.test(x);
var int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
var passOk = (x) => typeof x === "string" && Array.from(x).length >= 12 && Array.from(x).length <= 128;
async function passwordHash(password, salt = randomBytes(16).toString("hex")) {
  if (!passOk(password)) fail(400, "Password \u1000\u102D\u102F \u1041\u1042\u2013\u1041\u1042\u1048 \u101C\u102F\u1036\u1038 \u101E\u1010\u103A\u1019\u103E\u1010\u103A\u1015\u102B\u104B");
  const out = await derive(password, Buffer.from(salt, "hex"), 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return salt + ":" + out.toString("hex");
}
async function passwordValid(password, saved) {
  try {
    const [salt, digest] = String(saved).split(":");
    const made = (await passwordHash(password, salt)).split(":")[1];
    return timingSafeEqual(Buffer.from(made, "hex"), Buffer.from(digest, "hex"));
  } catch {
    return false;
  }
}
var schema = [
  `CREATE TABLE IF NOT EXISTS users(
 id BIGSERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','player')), balance BIGINT NOT NULL DEFAULT 0 CHECK(balance BETWEEN 0 AND 1000000000000),
 active BOOLEAN NOT NULL DEFAULT TRUE, daily_limit BIGINT NOT NULL DEFAULT 100000 CHECK(daily_limit BETWEEN 1 AND 1000000),
 excluded_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS sessions(
 digest TEXT PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('player','admin')), expires BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS draws(
 id BIGSERIAL PRIMARY KEY, day DATE NOT NULL, market TEXT NOT NULL CHECK(market IN ('2D','3D','4D')),
 cutoff TIMESTAMPTZ NOT NULL, multiplier BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed','settled')),
 result TEXT, source TEXT, settled_at TIMESTAMPTZ, UNIQUE(day,market))`,
  `CREATE TABLE IF NOT EXISTS bets(
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), draw_id BIGINT NOT NULL REFERENCES draws(id),
 number TEXT NOT NULL, stake BIGINT NOT NULL CHECK(stake BETWEEN 1 AND 100000), multiplier BIGINT NOT NULL,
 payout BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL, request_key TEXT NOT NULL, UNIQUE(user_id,request_key))`,
  `CREATE TABLE IF NOT EXISTS ledger(
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), delta BIGINT NOT NULL,
 balance_after BIGINT NOT NULL, kind TEXT NOT NULL, ref TEXT NOT NULL UNIQUE, note TEXT NOT NULL,
 actor BIGINT NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS audit(
 id BIGSERIAL PRIMARY KEY, actor BIGINT NOT NULL REFERENCES users(id), action TEXT NOT NULL,
 detail JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS login_rate(
 key TEXT PRIMARY KEY, count INTEGER NOT NULL, started BIGINT NOT NULL)`
];
var initPromise;
async function initialize() {
  if (!initPromise) initPromise = (async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
    const c = await pool.connect();
    try {
      await q(c, "BEGIN");
      await q(c, "SELECT pg_advisory_xact_lock(907240611)");
      for (const s of schema) await q(c, s);
      await q(c, "ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_level TEXT");
      await q(c, "ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES users(id)");
      await q(c, "UPDATE users SET admin_level='root' WHERE role='admin' AND admin_level IS NULL");
      await q(c, "CREATE INDEX IF NOT EXISTS users_parent ON users(parent_id)");
      await q(c, "CREATE INDEX IF NOT EXISTS bets_draw_user ON bets(draw_id,user_id)");
      await q(c, "CREATE TABLE IF NOT EXISTS scheduled_results(draw_id BIGINT PRIMARY KEY REFERENCES draws(id),result TEXT NOT NULL,actor BIGINT NOT NULL REFERENCES users(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
      const n = process.env.LOTTERY_ADMIN_NAME, p = process.env.LOTTERY_ADMIN_PASSWORD;
      if (!!n !== !!p) throw new Error("Both LOTTERY_ADMIN_NAME and LOTTERY_ADMIN_PASSWORD are required together");
      if (n) {
        const exists = await one(c, "SELECT id FROM users WHERE role='admin' LIMIT 1");
        if (!exists) {
          if (!strongUser(n)) throw new Error("Invalid admin username");
          const h = await passwordHash(p);
          await q(c, "INSERT INTO users(username,password,role,admin_level) VALUES($1,$2,'admin','root')", [n.toLowerCase(), h]);
        }
      }
      await q(c, "UPDATE users SET parent_id=(SELECT id FROM users WHERE role='admin' AND admin_level='root' ORDER BY id LIMIT 1) WHERE role='player' AND parent_id IS NULL");
      await q(c, "COMMIT");
    } catch (e) {
      await q(c, "ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  })().catch((e) => {
    initPromise = void 0;
    throw e;
  });
  return initPromise;
}
async function ensureDay(c, d = now()) {
  const day = localDay(d);
  for (const [market, mult] of Object.entries(MULT)) {
    const cut = cutoffFor(day, market);
    await q(c, `INSERT INTO draws(day,market,cutoff,multiplier) VALUES($1,$2,$3,$4)
   ON CONFLICT(day,market) DO UPDATE SET cutoff=EXCLUDED.cutoff
   WHERE draws.status='open' AND draws.cutoff IS DISTINCT FROM EXCLUDED.cutoff`, [day, market, cut, mult]);
  }
  await q(c, "UPDATE draws SET status='closed' WHERE status='open' AND cutoff<=$1", [d]);
  return day;
}
async function rate(c, key, max = 12) {
  const t = Math.floor(Date.now() / 1e3), r = await one(c, "SELECT * FROM login_rate WHERE key=$1 FOR UPDATE", [key]);
  if (r && t - r.started < 900 && r.count >= max) fail(429, "\u1000\u103C\u102D\u102F\u1038\u1005\u102C\u1038\u1019\u103E\u102F\u1019\u103B\u102C\u1038\u1014\u1031\u1015\u102B\u101E\u100A\u103A\u104B \u1041\u1045 \u1019\u102D\u1014\u1005\u103A\u1021\u1000\u103C\u102C \u1015\u103C\u1014\u103A\u1005\u1019\u103A\u1038\u1015\u102B\u104B");
  await q(c, `INSERT INTO login_rate(key,count,started) VALUES($1,1,$2)
 ON CONFLICT(key) DO UPDATE SET count=CASE WHEN $2-login_rate.started>=900 THEN 1 ELSE login_rate.count+1 END,
 started=CASE WHEN $2-login_rate.started>=900 THEN $2 ELSE login_rate.started END`, [key, t]);
}
async function login(c, username, password, role, ip2) {
  const name = String(username ?? "").toLowerCase();
  await rate(c, "ip:" + ip2, 100);
  await rate(c, "login:" + role + ":" + name, 15);
  const u = await one(c, "SELECT * FROM users WHERE username=$1 AND role=$2", [name, role]);
  const valid = u && u.active && await passwordValid(password, u.password);
  if (!valid) return { invalid: true };
  await q(c, "DELETE FROM login_rate WHERE key=$1", ["login:" + role + ":" + name]);
  const raw = token();
  await q(c, "DELETE FROM sessions WHERE user_id=$1 OR expires<$2", [u.id, Math.floor(Date.now() / 1e3)]);
  await q(c, "INSERT INTO sessions(digest,user_id,kind,expires) VALUES($1,$2,$3,$4)", [sha(raw), u.id, role, Math.floor(Date.now() / 1e3) + 43200]);
  return raw;
}
async function auth(c, raw, role) {
  if (!raw) fail(401, "\u1015\u103C\u1014\u103A\u101C\u100A\u103A \u1021\u1000\u1031\u102C\u1004\u1037\u103A\u101D\u1004\u103A\u1015\u102B\u104B");
  const u = await one(c, `SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
 WHERE s.digest=$1 AND s.expires>$2 AND s.kind=$3 AND u.active=TRUE AND u.role=$3`, [sha(raw), Math.floor(Date.now() / 1e3), role]);
  if (!u) fail(401, "\u1015\u103C\u1014\u103A\u101C\u100A\u103A \u1021\u1000\u1031\u102C\u1004\u1037\u103A\u101D\u1004\u103A\u1015\u102B\u104B");
  return u;
}
function cookies(req) {
  return Object.fromEntries((req.headers.get("cookie") ?? "").split(";").map((x) => x.trim()).filter(Boolean).map((x) => {
    const i = x.indexOf("=");
    return i < 0 ? [x, ""] : [x.slice(0, i), x.slice(i + 1)];
  }));
}
var playerCookie = (v, del = false) => `lottery_session=${v}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${del ? 0 : 43200}; Secure`;
var adminCookie = (v, del = false) => `lottery_admin=${v}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${del ? 0 : 43200}; Secure`;
async function move(c, uid, delta, kind, ref, note, actor) {
  const u = await one(c, "SELECT * FROM users WHERE id=$1 FOR UPDATE", [uid]);
  if (!u || !u.active) fail(403, "Account \u1021\u101E\u102F\u1036\u1038\u1019\u1015\u103C\u102F\u1014\u102D\u102F\u1004\u103A\u1015\u102B\u104B");
  const b = Number(u.balance) + delta;
  if (b < 0 || b > MAX_BAL) fail(409, "Token \u101C\u1000\u103A\u1000\u103B\u1014\u103A \u1019\u101C\u102F\u1036\u101C\u1031\u102C\u1000\u103A\u1015\u102B \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A account limit \u1000\u103B\u1031\u102C\u103A\u101E\u103D\u102C\u1038\u1015\u102B\u101E\u100A\u103A\u104B");
  await q(c, "UPDATE users SET balance=$1 WHERE id=$2", [b, uid]);
  await q(c, "INSERT INTO ledger(user_id,delta,balance_after,kind,ref,note,actor) VALUES($1,$2,$3,$4,$5,$6,$7)", [uid, delta, b, kind, ref, note, actor]);
}
async function playerState(c, u) {
  const day = await ensureDay(c);
  await admins.publishDue(c);
  return {
    account: { id: u.id, username: u.username, balance: Number((await one(c, "SELECT balance FROM users WHERE id=$1", [u.id])).balance), daily_limit: Number(u.daily_limit), excluded_until: u.excluded_until },
    server_time: iso(now()),
    day,
    draws: (await q(c, "SELECT id,day::text,market,cutoff,multiplier,status,result,source,settled_at FROM draws ORDER BY day DESC,id LIMIT 90")).rows,
    bets: (await q(c, `SELECT b.id,b.number,b.stake,b.payout,b.created_at,d.day::text,d.market,d.status,d.result FROM bets b JOIN draws d ON d.id=b.draw_id WHERE b.user_id=$1 ORDER BY b.id DESC LIMIT 500`, [u.id])).rows,
    ledger: (await q(c, "SELECT id,delta,balance_after,kind,note,created_at FROM ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 500", [u.id])).rows
  };
}
async function place(c, u, data) {
  const { draw_id, number, stake, key } = data;
  if (!int(draw_id, 1, 2 ** 31) || !int(stake, 1, MAX_STAKE) || !reqKey(key)) fail(400, "\u1000\u1036\u1005\u1019\u103A\u1038\u1019\u103E\u102F\u1021\u1001\u103B\u1000\u103A\u1021\u101C\u1000\u103A \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
  const old = await one(c, "SELECT * FROM bets WHERE user_id=$1 AND request_key=$2", [u.id, key]);
  if (old) {
    if (Number(old.draw_id) !== draw_id || old.number !== number || Number(old.stake) !== stake) fail(409, "Request key \u1000\u102D\u102F \u1021\u1001\u103C\u102C\u1038 data \u1014\u1032\u1037 \u101E\u102F\u1036\u1038\u1015\u103C\u102E\u1038\u101E\u102C\u1038\u1015\u102B\u104B");
    return { bet_id: old.id, duplicate: true };
  }
  const locked = await one(c, "SELECT * FROM users WHERE id=$1 FOR UPDATE", [u.id]);
  if (locked.excluded_until && new Date(locked.excluded_until) > now()) fail(403, "\u101E\u1004\u1037\u103A account \u101E\u100A\u103A \u101A\u102C\u101A\u102E\u1014\u102C\u1038\u1001\u103B\u102D\u1014\u103A\u1010\u103D\u1004\u103A \u101B\u103E\u102D\u1015\u102B\u101E\u100A\u103A\u104B");
  const d = await one(c, "SELECT * FROM draws WHERE id=$1 FOR UPDATE", [draw_id]);
  if (!d) fail(404, "Draw \u1019\u1010\u103D\u1031\u1037\u1015\u102B\u104B");
  if (d.status !== "open" || now() >= new Date(d.cutoff)) fail(409, "\u1012\u102E Draw \u1015\u102D\u1010\u103A\u1015\u103C\u102E\u1038\u1015\u102B\u1015\u103C\u102E\u104B");
  const digits = Number(d.market[0]);
  if (typeof number !== "string" || !new RegExp("^[0-9]{" + digits + "}$").test(number)) fail(400, digits + " \u101C\u102F\u1036\u1038\u1010\u102D\u1010\u102D \u1002\u100F\u1014\u103A\u1038\u1011\u100A\u1037\u103A\u1015\u102B\u104B");
  const spent = Number((await one(c, `SELECT COALESCE(SUM(b.stake),0) total FROM bets b JOIN draws d ON d.id=b.draw_id WHERE b.user_id=$1 AND d.day=$2`, [u.id, d.day])).total);
  if (spent + stake > Number(locked.daily_limit)) fail(409, "\u1014\u1031\u1037\u1005\u1009\u103A token limit \u1000\u103B\u1031\u102C\u103A\u101E\u103D\u102C\u1038\u1015\u102B\u101E\u100A\u103A\u104B");
  const ins = await one(c, "INSERT INTO bets(user_id,draw_id,number,stake,multiplier,created_at,request_key) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id", [u.id, draw_id, number, stake, d.multiplier, now(), key]);
  await move(c, u.id, -stake, "entry", "bet:" + ins.id, d.market + " " + number, u.id);
  return { bet_id: ins.id, duplicate: false };
}
async function settle(c, admin, data) {
  const { draw_id, result, source } = data;
  if (!int(draw_id, 1, 2 ** 31) || typeof source !== "string" || source.trim().length < 5 || source.length > 240) fail(400, "\u101B\u101C\u1012\u103A\u1021\u1001\u103B\u1000\u103A\u1021\u101C\u1000\u103A \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
  const d = await one(c, "SELECT * FROM draws WHERE id=$1 FOR UPDATE", [draw_id]);
  if (!d) fail(404, "Draw \u1019\u1010\u103D\u1031\u1037\u1015\u102B\u104B");
  if (typeof result !== "string" || !new RegExp("^[0-9]{" + d.market[0] + "}$").test(result)) fail(400, "\u1021\u1014\u102D\u102F\u1004\u103A\u101B\u1002\u100F\u1014\u103A\u1038\u1021\u101B\u1031\u1021\u1010\u103D\u1000\u103A \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
  if (d.status === "settled") {
    if (d.result !== result || d.source !== source) fail(409, "\u1011\u102F\u1010\u103A\u1015\u103C\u1014\u103A\u1015\u103C\u102E\u1038\u101E\u102C\u1038\u101B\u101C\u1012\u103A\u1000\u102D\u102F \u1015\u103C\u1014\u103A\u1015\u103C\u1004\u103A\u101C\u102D\u102F\u1037\u1019\u101B\u1015\u102B\u104B");
    return { duplicate: true };
  }
  if (now() < new Date(d.cutoff)) fail(409, "\u1015\u102D\u1010\u103A\u1001\u103B\u102D\u1014\u103A\u1019\u1010\u102D\u102F\u1004\u103A\u1001\u1004\u103A \u101B\u101C\u1012\u103A\u1011\u102F\u1010\u103A\u1015\u103C\u1014\u103A\u101C\u102D\u102F\u1037\u1019\u101B\u1015\u102B\u104B");
  const ws = (await q(c, "SELECT * FROM bets WHERE draw_id=$1 AND number=$2 ORDER BY id FOR UPDATE", [draw_id, result])).rows;
  let total = 0;
  for (const b of ws) {
    const payout = Number(b.stake) * Number(b.multiplier);
    await move(c, Number(b.user_id), payout, "win", "win:" + b.id, d.market + " " + result, admin.id);
    await q(c, "UPDATE bets SET payout=$1 WHERE id=$2", [payout, b.id]);
    total += payout;
  }
  await q(c, "UPDATE draws SET status='settled',result=$1,source=$2,settled_at=$3 WHERE id=$4", [result, source, now(), draw_id]);
  await q(c, "INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)", [admin.id, "settle", JSON.stringify({ draw_id, result, source, winners: ws.length, total_payout: total })]);
  return { winners: ws.length, payout: total, duplicate: false };
}
var admins = adminService({ q, one, fail, int, reqKey, strongUser, passOk, passwordHash, move, ensureDay, settle, now, localDay });
async function preferences(c, u, data) {
  if (!int(data.daily_limit, 1, 1e6) || !int(data.break_days, 0, 365)) fail(400, "Limit \u1021\u1001\u103B\u1000\u103A\u1021\u101C\u1000\u103A \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
  const cur = await one(c, "SELECT * FROM users WHERE id=$1 FOR UPDATE", [u.id]);
  if (data.daily_limit > Number(cur.daily_limit)) fail(409, "\u1012\u102E\u1017\u102C\u1038\u101B\u103E\u1004\u103A\u1038\u1019\u103E\u102C daily limit \u1000\u102D\u102F \u101C\u103B\u103E\u1031\u102C\u1037\u1001\u103B\u1014\u102D\u102F\u1004\u103A\u1010\u102C\u1015\u1032 \u1016\u103C\u1005\u103A\u1015\u102B\u1010\u101A\u103A\u104B");
  let exp = cur.excluded_until ? new Date(cur.excluded_until) : null;
  if (data.break_days) {
    const n = new Date(Date.now() + data.break_days * 864e5);
    if (!exp || n > exp) exp = n;
  }
  await q(c, "UPDATE users SET daily_limit=$1,excluded_until=$2 WHERE id=$3", [data.daily_limit, exp, u.id]);
  await q(c, "INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)", [u.id, "preferences", JSON.stringify({ daily_limit: data.daily_limit, excluded_until: exp })]);
  return { ok: true };
}
async function body(req) {
  if (req.headers.get("content-type")?.split(";")[0] !== "application/json") fail(415, "JSON \u101C\u102D\u102F\u1021\u1015\u103A\u1015\u102B\u101E\u100A\u103A\u104B");
  const text = await req.text();
  if (!text || Buffer.byteLength(text) > 2e4) fail(413, "Request size \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
  try {
    const x = JSON.parse(text);
    if (!x || typeof x !== "object" || Array.isArray(x)) throw 0;
    return x;
  } catch {
    fail(400, "Request data \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
  }
}
var ip = (req) => (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim().slice(0, 100);
async function transaction(fn) {
  const c = await pool.connect();
  try {
    await q(c, "BEGIN");
    await q(c, "SELECT pg_advisory_xact_lock(907240612)");
    const r = await fn(c);
    await q(c, "COMMIT");
    return r;
  } catch (e) {
    await q(c, "ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
function headers(type = "application/json; charset=utf-8") {
  return new Headers({ "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer", "Strict-Transport-Security": "max-age=31536000", "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
}
var index_default = { async fetch(request) {
  await initialize();
  const url = new URL(request.url), path = url.pathname, h = headers();
  let status = 200, out;
  try {
    if (request.method === "GET" && path === "/") {
      h.set("Content-Type", "text/html; charset=utf-8");
      out = playerPage();
    } else if (request.method === "GET" && (path === "/admin" || path === "/admin/")) {
      h.set("Content-Type", "text/html; charset=utf-8");
      out = adminPage();
    } else if (request.method === "GET" && path === "/health") out = JSON.stringify({ ok: true, service: "dubai-lottery" });
    else if (request.method === "GET" && path === "/ready") {
      await pool.query("SELECT 1");
      out = JSON.stringify({ ok: true });
    } else if (request.method === "GET" && path === "/api/state") out = JSON.stringify(await transaction(async (c) => playerState(c, await auth(c, cookies(request).lottery_session, "player"))));
    else if (request.method === "GET" && path === "/admin/api/state") out = JSON.stringify(await transaction(async (c) => admins.state(c, await auth(c, cookies(request).lottery_admin, "admin"))));
    else if (request.method === "GET" && path === "/admin/api/bets") out = JSON.stringify(await transaction(async (c) => admins.report(c, await auth(c, cookies(request).lottery_admin, "admin"), url.searchParams)));
    else if (request.method === "POST") {
      const data = await body(request);
      if (path.startsWith("/api/") && request.headers.get("X-Lottery-Request") !== "1") fail(403, "Request origin \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
      if (path.startsWith("/admin/api/") && request.headers.get("X-Lottery-Admin") !== "1") fail(403, "Admin request origin \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
      if (path === "/api/login") {
        const raw = await transaction((c) => login(c, data.username, data.password, "player", ip(request)));
        if (raw?.invalid) fail(401, "Username \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A Password \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
        h.append("Set-Cookie", playerCookie(raw));
        out = JSON.stringify({ ok: true });
      } else if (path === "/admin/api/login") {
        const raw = await transaction((c) => login(c, data.username, data.password, "admin", ip(request)));
        if (raw?.invalid) fail(401, "Username \u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A Password \u1019\u1019\u103E\u1014\u103A\u1015\u102B\u104B");
        h.append("Set-Cookie", adminCookie(raw));
        out = JSON.stringify({ ok: true });
      } else if (path === "/api/logout") {
        const raw = cookies(request).lottery_session;
        await transaction((c) => q(c, "DELETE FROM sessions WHERE digest=$1", [sha(raw ?? "")]));
        h.append("Set-Cookie", playerCookie("", true));
        out = JSON.stringify({ ok: true });
      } else if (path === "/admin/api/logout") {
        const raw = cookies(request).lottery_admin;
        await transaction((c) => q(c, "DELETE FROM sessions WHERE digest=$1", [sha(raw ?? "")]));
        h.append("Set-Cookie", adminCookie("", true));
        out = JSON.stringify({ ok: true });
      } else out = JSON.stringify(await transaction(async (c) => {
        if (path === "/api/bet") {
          const u = await auth(c, cookies(request).lottery_session, "player");
          await ensureDay(c);
          return place(c, u, data);
        }
        if (path === "/api/preferences") {
          const u = await auth(c, cookies(request).lottery_session, "player");
          return preferences(c, u, data);
        }
        const a = await auth(c, cookies(request).lottery_admin, "admin");
        if (path === "/admin/api/create") return admins.create(c, a, data);
        if (path === "/admin/api/adjust") return admins.adjust(c, a, data);
        if (path === "/admin/api/settle") return admins.schedule(c, a, data);
        fail(404, "\u1019\u1010\u103D\u1031\u1037\u1015\u102B\u104B");
      }));
    } else fail(404, "\u1019\u1010\u103D\u1031\u1037\u1015\u102B\u104B");
  } catch (e) {
    if (e instanceof APIError) {
      status = e.status;
      out = JSON.stringify({ error: e.message });
    } else {
      status = 500;
      out = JSON.stringify({ error: "Server error. \u1015\u103C\u1014\u103A\u1005\u1019\u103A\u1038\u1015\u102B\u104B" });
      console.error("lottery_request_failed", { code: e.code ?? "internal" });
    }
  }
  return new Response(out, { status, headers: h });
} };
export {
  admins,
  auth,
  index_default as default,
  ensureDay,
  initialize,
  login,
  place,
  playerState,
  pool,
  transaction
};
