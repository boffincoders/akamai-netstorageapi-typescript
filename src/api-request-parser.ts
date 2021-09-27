import _ from "lodash";
import xml2js from "xml2js";

class Parser {
  parser: xml2js.Parser;
  xmlPayload: string;
  constructor() {
    this.parser = new xml2js.Parser();
  }

  parse = (xmlPayload, callback) => {
    this.xmlPayload = xmlPayload;
    this.parser.parseString(this.xmlPayload, (err, results) => {
      if (err) {
        return callback(null, { message: this.xmlPayload.trim() });
      }

      const parsedResults = _.mergeWith({}, results, function (a, b) {
        let obj: any = {};
        Object.keys(b).forEach(function (key) {
          if (key === "$") {
            obj.attribs = b[key];
          } else if (_.isArray(b[key])) {
            obj[key] = _.map(b[key], "$");
          }
        });
        return obj;
      });
      return callback(null, parsedResults);
    });
  };

  parseAsync = async (xmlPayload) => {
    try {
      this.xmlPayload = xmlPayload;
      let results = await this.parser.parseStringPromise(this.xmlPayload);
      const parsedResults = _.mergeWith({}, results, function (a, b) {
        let obj: any = {};
        Object.keys(b).forEach(function (key) {
          if (key === "$") {
            obj.attribs = b[key];
          } else if (_.isArray(b[key])) {
            obj[key] = _.map(b[key], "$");
          }
        });
        return obj;
      });
      return { success: true, result: parsedResults };
    } catch (err) {
      return { success: false, result: this.xmlPayload.trim() };
    }
  };
}

export default Parser;
